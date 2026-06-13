"""
文件存储服务模块
封装MinIO客户端，提供文件上传、下载、删除等功能
"""
import asyncio
import io
import mimetypes
import re
from datetime import timedelta
from pathlib import Path
from typing import BinaryIO, Optional, Union

from minio import Minio
from minio.error import S3Error
from minio.helpers import ObjectWriteResult
from minio.deleteobjects import DeleteObject
from minio.commonconfig import CopySource

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class LocalFileStorage:
    """
    本地文件存储服务类
    提供本地文件存储的封装
    """

    def __init__(self) -> None:
        """初始化本地文件存储"""
        self.base_path = Path("./storage")
        self.base_path.mkdir(exist_ok=True, parents=True)
        logger.info(f"Local storage initialized at: {self.base_path}")

    def upload_file(self, file_data, object_name, content_type=None, metadata=None):
        """上传文件到本地存储"""
        file_path = self.base_path / object_name
        if '..' in object_name:
            raise ValueError("Invalid object name: path traversal detected")
        resolved = file_path.resolve()
        if not str(resolved).startswith(str(self.base_path.resolve())):
            raise ValueError("Invalid object name: path traversal detected")
        file_path.parent.mkdir(exist_ok=True, parents=True)

        if isinstance(file_data, bytes):
            with open(file_path, 'wb') as f:
                f.write(file_data)
        else:
            file_data.seek(0)
            with open(file_path, 'wb') as f:
                f.write(file_data.read())

        logger.info(f"Uploaded file: {object_name}")
        return None

    async def upload_file_async(self, file_data, object_name, content_type=None, metadata=None):
        """异步上传文件到本地存储"""
        return await asyncio.to_thread(
            self.upload_file, file_data, object_name, content_type, metadata
        )

    async def download_file_async(self, object_name, file_path=None):
        """异步从本地存储下载文件"""
        return await asyncio.to_thread(
            self.download_file, object_name, file_path
        )

    def download_file(self, object_name, file_path=None):
        """从本地存储下载文件"""
        source_path = self.base_path / object_name
        if not source_path.exists():
            raise FileNotFoundError(f"File not found: {object_name}")

        if file_path:
            import shutil
            shutil.copy2(source_path, file_path)
            return Path(file_path)
        else:
            with open(source_path, 'rb') as f:
                return f.read()

    def delete_file(self, object_name):
        """从本地存储删除文件"""
        file_path = self.base_path / object_name
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Deleted file: {object_name}")

    def get_file_url(self, object_name, expires=None):
        """获取文件的URL"""
        return f"/api/v1/resources/file/{object_name}"

    def file_exists(self, object_name):
        """检查文件是否存在"""
        return (self.base_path / object_name).exists()


class MinIOStorage:
    """
    MinIO存储服务类
    提供对象存储的封装，支持自动降级到本地存储
    使用延迟初始化模式避免启动时连接超时
    """

    def __init__(self) -> None:
        """初始化存储，但不立即连接MinIO"""
        self.client: Optional[Minio] = None
        self.bucket_name: Optional[str] = None
        self._local_fallback: Optional[LocalFileStorage] = None
        self._initialized = False
        self._minio_available = False

    def _init_minio(self) -> bool:
        """
        尝试初始化MinIO连接（延迟初始化）

        Returns:
            是否成功初始化
        """
        if self._initialized:
            return self._minio_available

        self._initialized = True

        try:
            # 设置socket超时，避免连接挂起
            import urllib3
            timeout = urllib3.Timeout(connect=3.0, read=5.0)

            self.client = Minio(
                endpoint=settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE,
                region=settings.MINIO_REGION,
                http_client=urllib3.PoolManager(
                    timeout=timeout,
                    maxsize=10,
                    retries=urllib3.Retry(
                        total=2,
                        backoff_factor=0.5,
                        status_forcelist=[500, 502, 503, 504]
                    )
                )
            )
            self.bucket_name = settings.MINIO_BUCKET_NAME

            # 快速测试连接是否可用（使用短超时）
            self.client.list_buckets()

            self._minio_available = True
            self.ensure_bucket_exists()
            logger.info("MinIO storage initialized successfully")
            return True

        except Exception as e:
            logger.warning(
                f"MinIO connection failed: {e}. Will use local file storage as fallback.")
            self.client = None
            self.bucket_name = None
            self._minio_available = False
            return False

    def _get_fallback_storage(self):
        """
        获取降级存储实例

        Returns:
            LocalFileStorage实例
        """
        if self._local_fallback is None:
            self._local_fallback = LocalFileStorage()
            logger.info("Switched to local file storage fallback")
        return self._local_fallback

    def _check_connection(self) -> bool:
        """
        检查MinIO连接是否可用

        Returns:
            连接是否可用
        """
        # 如果从未初始化过，尝试初始化
        if not self._initialized:
            return self._init_minio()

        # 如果已初始化但MinIO不可用，不再重试
        if not self._minio_available:
            return False

        # 测试连接
        try:
            if self.client is None:
                return False
            self.client.list_buckets()
            return True
        except Exception as e:
            logger.warning(f"MinIO connection lost: {e}. Switching to local file storage.")
            self.client = None
            self.bucket_name = None
            self._minio_available = False
            return False

    def ensure_bucket_exists(self) -> None:
        """确保存储桶存在，不存在则创建"""
        if self.client is None or not self._minio_available:
            return

        try:
            if self.bucket_name is None:
                raise RuntimeError("Storage bucket is not set")
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"Created bucket: {self.bucket_name}")
        except Exception as e:
            logger.error(f"Failed to ensure bucket exists: {e}")
            raise

    def _prepare_upload_stream(
        self,
        file_data: Union[bytes, BinaryIO, str, Path],
        content_type: Optional[str] = None,
    ) -> tuple[BinaryIO, int, bool, str]:
        """准备上传的文件流，返回(流, 大小, 是否需要关闭, 内容类型)"""
        file_stream: BinaryIO
        if isinstance(file_data, (str, Path)):
            file_path = Path(file_data)
            file_size = file_path.stat().st_size
            file_stream = open(file_path, "rb")
            should_close = True
            if not content_type:
                content_type, _ = mimetypes.guess_type(str(file_path))
        elif isinstance(file_data, bytes):
            file_size = len(file_data)
            file_stream = io.BytesIO(file_data)
            should_close = True
        else:
            file_stream = file_data
            current_pos = file_stream.tell()
            file_stream.seek(0, 2)
            file_size = file_stream.tell() - current_pos
            file_stream.seek(current_pos)
            should_close = False

        if not content_type:
            content_type = "application/octet-stream"

        return file_stream, file_size, should_close, content_type

    def _do_minio_upload(
        self,
        file_stream: BinaryIO,
        file_size: int,
        object_name: str,
        content_type: str,
        metadata: Optional[dict],
        should_close: bool,
    ) -> ObjectWriteResult:
        """执行MinIO上传并清理资源"""
        if self.client is None:
            raise RuntimeError("Storage client is not initialized")
        if self.bucket_name is None:
            raise RuntimeError("Storage bucket is not set")
        result = self.client.put_object(
            bucket_name=self.bucket_name,
            object_name=object_name,
            data=file_stream,
            length=file_size,
            content_type=content_type,
            metadata=metadata or {},
        )
        if should_close:
            file_stream.close()
        return result

    def upload_file(
        self,
        file_data: Union[bytes, BinaryIO, str, Path],
        object_name: str,
        content_type: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> Optional[ObjectWriteResult]:
        """
        上传文件到MinIO或本地存储

        Args:
            file_data: 文件数据（字节、文件对象或文件路径）
            object_name: 对象名称（存储路径）
            content_type: 内容类型（MIME类型）
            metadata: 元数据字典

        Returns:
            ObjectWriteResult: 写入结果（MinIO模式）或None（本地模式）

        Raises:
            S3Error: MinIO操作错误
        """
        if not self._check_connection():
            logger.info(f"Using local storage fallback for upload: {object_name}")
            return self._get_fallback_storage().upload_file(file_data, object_name, content_type, metadata)

        if self.client is None:
            raise RuntimeError("Storage client is not initialized")
        if self.bucket_name is None:
            raise RuntimeError("Storage bucket is not set")

        try:
            file_stream, file_size, should_close, content_type = self._prepare_upload_stream(
                file_data, content_type
            )
            result = self._do_minio_upload(
                file_stream, file_size, object_name, content_type, metadata, should_close
            )
            logger.info(f"Uploaded file: {object_name}, etag: {result.etag}")
            return result
        except S3Error as e:
            logger.error(
                f"Failed to upload file {object_name} to MinIO: {e}. Falling back to local storage.")
            return self._get_fallback_storage().upload_file(file_data, object_name, content_type, metadata)
        except Exception as e:
            logger.error(
                f"Unexpected error uploading file {object_name}: {e}. Falling back to local storage.")
            return self._get_fallback_storage().upload_file(file_data, object_name, content_type, metadata)

    async def upload_file_async(
        self,
        file_data: Union[bytes, BinaryIO, str, Path],
        object_name: str,
        content_type: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> Optional[ObjectWriteResult]:
        """异步上传文件到MinIO或本地存储"""
        return await asyncio.to_thread(
            self.upload_file, file_data, object_name, content_type, metadata
        )

    async def download_file_async(
        self,
        object_name: str,
        file_path: Optional[Union[str, Path]] = None
    ) -> Union[bytes, Path]:
        """异步从MinIO或本地存储下载文件"""
        return await asyncio.to_thread(
            self.download_file, object_name, file_path
        )

    def download_file(
        self,
        object_name: str,
        file_path: Optional[Union[str, Path]] = None
    ) -> Union[bytes, Path]:
        """
        从MinIO或本地存储下载文件

        Args:
            object_name: 对象名称
            file_path: 本地保存路径（如果提供则保存到文件，否则返回字节）

        Returns:
            字节数据或保存的文件路径

        Raises:
            S3Error: MinIO操作错误
            FileNotFoundError: 文件不存在
        """
        # 检查连接，如果失败则降级到本地存储
        if not self._check_connection():
            logger.info(f"Using local storage fallback for download: {object_name}")
            return self._get_fallback_storage().download_file(object_name, file_path)

        if self.client is None:
            raise RuntimeError("Storage client is not initialized")
        if self.bucket_name is None:
            raise RuntimeError("Storage bucket is not set")

        try:
            if file_path:
                # 下载到文件
                self.client.fget_object(
                    bucket_name=self.bucket_name,
                    object_name=object_name,
                    file_path=str(file_path)
                )
                logger.info(f"Downloaded file to: {file_path}")
                return Path(file_path)
            else:
                # 下载到内存
                response = self.client.get_object(
                    bucket_name=self.bucket_name,
                    object_name=object_name
                )
                data = response.read()
                response.close()
                response.release_conn()
                logger.info(f"Downloaded file: {object_name}, size: {len(data)} bytes")
                return data

        except S3Error as e:
            logger.error(
                f"Failed to download file {object_name} from MinIO: {e}. Trying local storage.")
            # MinIO失败时尝试本地存储
            return self._get_fallback_storage().download_file(object_name, file_path)
        except Exception as e:
            logger.error(
                f"Unexpected error downloading file {object_name}: {e}. Trying local storage.")
            return self._get_fallback_storage().download_file(object_name, file_path)

    def delete_file(self, object_name: str) -> None:
        """
        从MinIO或本地存储删除文件

        Args:
            object_name: 对象名称

        Raises:
            S3Error: MinIO操作错误
        """
        # 检查连接
        if not self._check_connection():
            logger.info(f"Using local storage fallback for delete: {object_name}")
            self._get_fallback_storage().delete_file(object_name)
            return

        if self.client is None:
            raise RuntimeError("Storage client is not initialized")
        if self.bucket_name is None:
            raise RuntimeError("Storage bucket is not set")

        try:
            self.client.remove_object(
                bucket_name=self.bucket_name,
                object_name=object_name
            )
            logger.info(f"Deleted file from MinIO: {object_name}")
        except S3Error as e:
            logger.error(
                f"Failed to delete file {object_name} from MinIO: {e}. Trying local storage.")
            # MinIO失败时尝试本地存储
            self._get_fallback_storage().delete_file(object_name)
        except Exception as e:
            logger.error(
                f"Unexpected error deleting file {object_name}: {e}. Trying local storage.")
            self._get_fallback_storage().delete_file(object_name)

    def _delete_from_minio(self, object_names: list[str]) -> None:
        """从MinIO批量删除文件"""
        if self.client is None:
            raise RuntimeError("Storage client is not initialized")
        if self.bucket_name is None:
            raise RuntimeError("Storage bucket is not set")
        delete_object_list = [DeleteObject(name) for name in object_names]
        errors = self.client.remove_objects(
            self.bucket_name,
            delete_object_list,
        )
        for error in errors:
            logger.error(f"Failed to delete {error.name}: {error.code}")
        logger.info(f"Deleted {len(object_names)} files from MinIO")

    def _delete_from_local(self, object_names: list[str]) -> None:
        """从本地存储批量删除文件"""
        for object_name in object_names:
            self._get_fallback_storage().delete_file(object_name)

    def delete_files(self, object_names: list[str]) -> None:
        """
        批量删除文件

        Args:
            object_names: 对象名称列表

        Raises:
            S3Error: MinIO操作错误
        """
        if not self._check_connection():
            logger.info("Using local storage fallback for batch delete")
            self._delete_from_local(object_names)
            return

        if self.client is None:
            raise RuntimeError("Storage client is not initialized")
        if self.bucket_name is None:
            raise RuntimeError("Storage bucket is not set")

        try:
            self._delete_from_minio(object_names)
        except S3Error as e:
            logger.error(f"Failed to delete files from MinIO: {e}. Trying local storage.")
            self._delete_from_local(object_names)
        except Exception as e:
            logger.error(f"Unexpected error deleting files: {e}. Trying local storage.")
            self._delete_from_local(object_names)

    async def delete_file_async(self, object_name):
        """异步从MinIO或本地存储删除文件"""
        return await asyncio.to_thread(self.delete_file, object_name)

    def get_file_url(
        self,
        object_name: str,
        expires: timedelta = timedelta(hours=1)
    ) -> str:
        """
        获取文件的预签名URL

        Args:
            object_name: 对象名称
            expires: URL有效期

        Returns:
            预签名URL或本地URL

        Raises:
            S3Error: MinIO操作错误
        """
        # 检查连接
        if not self._check_connection():
            logger.info(f"Using local storage fallback for get_file_url: {object_name}")
            return self._get_fallback_storage().get_file_url(object_name)

        if self.client is None:
            raise RuntimeError("Storage client is not initialized")
        if self.bucket_name is None:
            raise RuntimeError("Storage bucket is not set")

        try:
            url = self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                expires=expires
            )
            return url
        except S3Error as e:
            logger.error(
                f"Failed to generate presigned URL for {object_name}: {e}. Using local URL.")
            return self._get_fallback_storage().get_file_url(object_name)
        except Exception as e:
            logger.error(
                f"Unexpected error generating URL for {object_name}: {e}. Using local URL.")
            return self._get_fallback_storage().get_file_url(object_name)

    def get_upload_url(
        self,
        object_name: str,
        expires: timedelta = timedelta(hours=1),
        content_type: Optional[str] = None
    ) -> str:
        """
        获取上传文件的预签名URL

        Args:
            object_name: 对象名称
            expires: URL有效期
            content_type: 内容类型

        Returns:
            预签名上传URL

        Raises:
            S3Error: MinIO操作错误
        """
        # 检查连接
        if not self._check_connection():
            logger.warning(f"Cannot generate upload URL in local storage mode for: {object_name}")
            raise RuntimeError("MinIO is not available, cannot generate presigned upload URL")

        if self.client is None:
            raise RuntimeError("Storage client is not initialized")
        if self.bucket_name is None:
            raise RuntimeError("Storage bucket is not set")

        try:
            url = self.client.presigned_put_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                expires=expires
            )
            return url
        except S3Error as e:
            logger.error(f"Failed to generate presigned upload URL for {object_name}: {e}")
            raise

    def file_exists(self, object_name: str) -> bool:
        """
        检查文件是否存在

        Args:
            object_name: 对象名称

        Returns:
            文件是否存在
        """
        # 检查连接
        if not self._check_connection():
            return self._get_fallback_storage().file_exists(object_name)

        if self.client is None:
            raise RuntimeError("Storage client is not initialized")
        if self.bucket_name is None:
            raise RuntimeError("Storage bucket is not set")

        try:
            self.client.stat_object(
                bucket_name=self.bucket_name,
                object_name=object_name
            )
            return True
        except S3Error:
            # 尝试本地存储
            return self._get_fallback_storage().file_exists(object_name)
        except Exception as e:
            logger.error(f"Error checking file existence for {object_name}: {e}")
            # 尝试本地存储
            return self._get_fallback_storage().file_exists(object_name)

    def get_file_info(self, object_name: str) -> dict:
        """
        获取文件信息

        Args:
            object_name: 对象名称

        Returns:
            文件信息字典

        Raises:
            S3Error: MinIO操作错误
        """
        # 检查连接
        if not self._check_connection():
            logger.warning(f"Cannot get file info in local storage mode for: {object_name}")
            raise RuntimeError("MinIO is not available, cannot get file info")

        if self.client is None:
            raise RuntimeError("Storage client is not initialized")
        if self.bucket_name is None:
            raise RuntimeError("Storage bucket is not set")

        try:
            stat = self.client.stat_object(
                bucket_name=self.bucket_name,
                object_name=object_name
            )
            return {
                "object_name": stat.object_name,
                "size": stat.size,
                "etag": stat.etag,
                "content_type": stat.content_type,
                "last_modified": stat.last_modified,
                "metadata": stat.metadata
            }
        except S3Error as e:
            logger.error(f"Failed to get file info for {object_name}: {e}")
            raise

    def list_files(
        self,
        prefix: Optional[str] = None,
        recursive: bool = False
    ) -> list[dict]:
        """
        列出存储桶中的文件

        Args:
            prefix: 前缀过滤
            recursive: 是否递归列出

        Returns:
            文件信息列表
        """
        # 检查连接
        if not self._check_connection():
            logger.warning("Cannot list files in local storage mode")
            return []

        if self.client is None:
            raise RuntimeError("Storage client is not initialized")
        if self.bucket_name is None:
            raise RuntimeError("Storage bucket is not set")

        try:
            objects = self.client.list_objects(
                bucket_name=self.bucket_name,
                prefix=prefix,
                recursive=recursive
            )

            return [
                {
                    "object_name": obj.object_name,
                    "size": obj.size,
                    "etag": obj.etag,
                    "last_modified": obj.last_modified,
                    "is_dir": obj.is_dir
                }
                for obj in objects
            ]
        except S3Error as e:
            logger.error(f"Failed to list files: {e}")
            raise

    def copy_file(
        self,
        source_object: str,
        dest_object: str
    ) -> ObjectWriteResult:
        """
        复制文件

        Args:
            source_object: 源对象名称
            dest_object: 目标对象名称

        Returns:
            ObjectWriteResult: 写入结果

        Raises:
            S3Error: MinIO操作错误
        """
        # 检查连接
        if not self._check_connection():
            logger.warning(
                f"Cannot copy file in local storage mode: {source_object} -> {dest_object}")
            raise RuntimeError("MinIO is not available, cannot copy file")

        if self.client is None:
            raise RuntimeError("Storage client is not initialized")
        if self.bucket_name is None:
            raise RuntimeError("Storage bucket is not set")

        try:
            result = self.client.copy_object(
                bucket_name=self.bucket_name,
                object_name=dest_object,
                source=CopySource(self.bucket_name, source_object)
            )
            logger.info(f"Copied file from {source_object} to {dest_object}")
            return result
        except S3Error as e:
            logger.error(f"Failed to copy file from {source_object} to {dest_object}: {e}")
            raise


# 全局存储实例 - 延迟初始化模式
_storage_instance: Optional[Union[MinIOStorage, LocalFileStorage]] = None


def get_storage():
    """
    获取存储服务实例（延迟初始化）

    Returns:
        存储服务实例
    """
    global _storage_instance
    if _storage_instance is None:
        try:
            _storage_instance = MinIOStorage()
            logger.info("Storage initialized (MinIO with local fallback)")
        except Exception as e:
            logger.error(f"Failed to initialize storage: {e}. Using local file storage only.")
            _storage_instance = LocalFileStorage()
    return _storage_instance


# 为了向后兼容，提供一个直接访问的storage变量
# 但实际使用时应该在运行时调用get_storage()
storage = None


def generate_object_name(
    user_id: str,
    file_name: str,
    folder: Optional[str] = None
) -> str:
    """
    生成对象存储路径

    Args:
        user_id: 用户ID
        file_name: 原始文件名
        folder: 文件夹名称

    Returns:
        对象存储路径
    """
    import uuid

    if folder and not re.match(r'^[a-zA-Z0-9_-]+$', folder):
        raise ValueError(
            "Invalid folder name: only alphanumeric characters, underscores and hyphens are allowed")

    ext = Path(file_name).suffix
    unique_name = f"{uuid.uuid4().hex}{ext}"

    # 构建路径
    if folder:
        return f"{folder}/{user_id}/{unique_name}"
    return f"{user_id}/{unique_name}"


MAGIC_BYTES_MAP = {
    '.pdf': b'%PDF',
    '.jpg': b'\xff\xd8\xff',
    '.jpeg': b'\xff\xd8\xff',
    '.png': b'\x89PNG\r\n\x1a\n',
    '.gif': b'GIF',
    '.doc': b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1',
    '.docx': b'PK\x03\x04',
    '.mp3': None,
    '.mp4': None,
    '.txt': None,
    '.md': None,
}


def _verify_magic_bytes(ext: str, file_content: bytes) -> bool:
    """
    验证文件魔数（magic bytes）是否匹配扩展名

    Args:
        ext: 文件扩展名
        file_content: 文件内容

    Returns:
        校验通过返回True，否则返回False
    """
    header = file_content[:32]
    magic = MAGIC_BYTES_MAP.get(ext)

    if magic is not None:
        if not header.startswith(magic):
            if ext == '.mp3':
                # mp3魔数校验：ID3 tag 或 frame sync
                if header[:3] == b'ID3' or header[:2] in (b'\xff\xfb', b'\xff\xf3', b'\xff\xf2'):
                    pass
                else:
                    return False
            else:
                return False

    if ext == '.mp4':
        # mp4 ftyp检查
        if b'ftyp' not in header[4:8]:
            return False

    return True


ALLOWED_MIME_TYPES = {
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '.txt': ['text/plain'],
    '.md': ['text/markdown', 'text/plain'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.mp4': ['video/mp4'],
    '.mp3': ['audio/mpeg'],
}


def _verify_mime_type(ext: str, filename: str) -> bool:
    """
    验证文件的MIME类型是否匹配扩展名

    Args:
        ext: 文件扩展名
        filename: 文件名

    Returns:
        校验通过返回True，否则返回False
    """
    guessed_type, _ = mimetypes.guess_type(filename)
    if guessed_type:
        expected = ALLOWED_MIME_TYPES.get(ext)
        if expected and guessed_type not in expected:
            return False
    return True


def is_allowed_file(filename: str, file_content: bytes = None) -> bool:
    """
    检查文件是否允许上传

    验证步骤：
        1. 检查扩展名是否在允许列表中
        2. 检查文件魔数是否匹配
        3. 检查MIME类型是否匹配

    Args:
        filename: 文件名
        file_content: 文件内容（可选，用于魔数和MIME校验）

    Returns:
        允许上传返回True，否则返回False
    """
    ext = Path(filename).suffix.lower()

    # 1. 检查扩展名
    if ext not in settings.ALLOWED_EXTENSIONS:
        return False

    if file_content is not None:
        # 2. 检查魔数
        if not _verify_magic_bytes(ext, file_content):
            return False

        # 3. 检查MIME类型
        if not _verify_mime_type(ext, filename):
            return False

    return True
