import asyncio
import io
from datetime import timedelta
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.services.storage import (
    LocalFileStorage,
    MinIOStorage,
    generate_object_name,
    get_storage,
)


class TestLocalFileStorage:
    @pytest.fixture
    def storage(self, tmp_path):
        s = LocalFileStorage.__new__(LocalFileStorage)
        s.base_path = tmp_path
        return s

    def test_upload_file_with_bytes(self, storage):
        data = b"hello world"
        storage.upload_file(data, "test/file.txt")
        saved = (storage.base_path / "test" / "file.txt").read_bytes()
        assert saved == data

    def test_upload_file_with_file_like_object(self, storage):
        file_obj = io.BytesIO(b"file content")
        storage.upload_file(file_obj, "test/obj.bin")
        saved = (storage.base_path / "test" / "obj.bin").read_bytes()
        assert saved == b"file content"

    def test_upload_file_path_traversal_dotdot(self, storage):
        with pytest.raises(ValueError, match="path traversal"):
            storage.upload_file(b"data", "../etc/passwd")

    def test_upload_file_path_traversal_resolve_escape(self, storage):
        with pytest.raises(ValueError, match="path traversal"):
            storage.upload_file(b"data", "foo/../../etc/passwd")

    def test_download_file_to_memory(self, storage):
        data = b"download me"
        storage.upload_file(data, "test/dl.txt")
        result = storage.download_file("test/dl.txt")
        assert result == data

    def test_download_file_to_file_path(self, storage, tmp_path):
        data = b"save to file"
        storage.upload_file(data, "test/save.txt")
        dest_dir = tmp_path / "output"
        dest_dir.mkdir()
        dest = dest_dir / "saved.txt"
        result = storage.download_file("test/save.txt", str(dest))
        assert isinstance(result, Path)
        assert dest.read_bytes() == data

    def test_download_file_nonexistent_raises(self, storage):
        with pytest.raises(FileNotFoundError, match="File not found"):
            storage.download_file("no/such/file.txt")

    def test_delete_file_existing(self, storage):
        storage.upload_file(b"to delete", "test/del.txt")
        assert storage.file_exists("test/del.txt")
        storage.delete_file("test/del.txt")
        assert not storage.file_exists("test/del.txt")

    def test_delete_file_nonexisting(self, storage):
        storage.delete_file("no/such/file.txt")

    def test_get_file_url_format(self, storage):
        url = storage.get_file_url("test/file.txt")
        assert url == "/api/v1/resources/file/test/file.txt"

    def test_file_exists_true(self, storage):
        storage.upload_file(b"exists", "test/exist.txt")
        assert storage.file_exists("test/exist.txt") is True

    def test_file_exists_false(self, storage):
        assert storage.file_exists("no/such/file.txt") is False

    def test_upload_file_async(self, storage):
        data = b"async upload"
        result = asyncio.run(storage.upload_file_async(data, "test/async_up.txt"))
        assert result is None
        assert (storage.base_path / "test" / "async_up.txt").read_bytes() == data

    def test_download_file_async(self, storage):
        data = b"async download"
        storage.upload_file(data, "test/async_dl.txt")
        result = asyncio.run(storage.download_file_async("test/async_dl.txt"))
        assert result == data


class TestMinIOStorageInitMinio:
    @patch("app.services.storage.Minio")
    @patch("app.services.storage.settings")
    def test_init_minio_success(self, mock_settings, mock_minio_cls):
        mock_settings.MINIO_ENDPOINT = "localhost:9000"
        mock_settings.MINIO_ACCESS_KEY = "key"
        mock_settings.MINIO_SECRET_KEY = "secret"
        mock_settings.MINIO_SECURE = False
        mock_settings.MINIO_REGION = "us-east-1"
        mock_settings.MINIO_BUCKET_NAME = "test-bucket"

        mock_client = MagicMock()
        mock_client.list_buckets.return_value = []
        mock_client.bucket_exists.return_value = True
        mock_minio_cls.return_value = mock_client

        s = MinIOStorage()
        result = s._init_minio()

        assert result is True
        assert s._minio_available is True
        assert s.client is mock_client
        assert s.bucket_name == "test-bucket"

    @patch("app.services.storage.Minio")
    @patch("app.services.storage.settings")
    def test_init_minio_failure(self, mock_settings, mock_minio_cls):
        mock_settings.MINIO_ENDPOINT = "localhost:9000"
        mock_settings.MINIO_ACCESS_KEY = "key"
        mock_settings.MINIO_SECRET_KEY = "secret"
        mock_settings.MINIO_SECURE = False
        mock_settings.MINIO_REGION = "us-east-1"
        mock_settings.MINIO_BUCKET_NAME = "test-bucket"

        mock_minio_cls.side_effect = Exception("connection failed")

        s = MinIOStorage()
        result = s._init_minio()

        assert result is False
        assert s._minio_available is False
        assert s.client is None


class TestMinIOStorageCheckConnection:
    @patch.object(MinIOStorage, "_init_minio", return_value=True)
    def test_check_connection_not_initialized(self, mock_init):
        s = MinIOStorage()
        assert s._check_connection() is True
        mock_init.assert_called_once()

    def test_check_connection_not_available(self):
        s = MinIOStorage()
        s._initialized = True
        s._minio_available = False
        assert s._check_connection() is False

    def test_check_connection_available(self):
        s = MinIOStorage()
        s._initialized = True
        s._minio_available = True
        s.client = MagicMock()
        s.client.list_buckets.return_value = []
        assert s._check_connection() is True

    def test_check_connection_lost(self):
        s = MinIOStorage()
        s._initialized = True
        s._minio_available = True
        s.client = MagicMock()
        s.client.list_buckets.side_effect = Exception("connection lost")
        assert s._check_connection() is False
        assert s._minio_available is False
        assert s.client is None


class TestMinIOStorageGetFallback:
    @patch.object(LocalFileStorage, "__init__", return_value=None)
    def test_get_fallback_storage_returns_local(self, mock_init):
        s = MinIOStorage()
        fallback = s._get_fallback_storage()
        assert isinstance(fallback, LocalFileStorage)

    @patch.object(LocalFileStorage, "__init__", return_value=None)
    def test_get_fallback_storage_cached(self, mock_init):
        s = MinIOStorage()
        f1 = s._get_fallback_storage()
        f2 = s._get_fallback_storage()
        assert f1 is f2
        assert mock_init.call_count == 1


class TestMinIOStorageUploadFile:
    @patch.object(MinIOStorage, "_check_connection", return_value=False)
    @patch.object(MinIOStorage, "_get_fallback_storage")
    def test_upload_file_fallback_to_local(self, mock_fallback, mock_check):
        mock_local = MagicMock()
        mock_local.upload_file.return_value = None
        mock_fallback.return_value = mock_local

        s = MinIOStorage()
        s.upload_file(b"data", "test.txt")

        mock_local.upload_file.assert_called_once_with(b"data", "test.txt", None, None)

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    def test_upload_file_bytes(self, mock_check):
        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"
        mock_result = MagicMock()
        mock_result.etag = "abc123"
        s.client.put_object.return_value = mock_result

        result = s.upload_file(b"hello", "test.txt", content_type="text/plain")

        assert result is mock_result
        call_kwargs = s.client.put_object.call_args
        assert call_kwargs.kwargs["bucket_name"] == "bucket"
        assert call_kwargs.kwargs["object_name"] == "test.txt"
        assert call_kwargs.kwargs["length"] == 5
        assert call_kwargs.kwargs["content_type"] == "text/plain"

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    def test_upload_file_path(self, mock_check, tmp_path):
        file_path = tmp_path / "upload.txt"
        file_path.write_text("path content")

        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"
        mock_result = MagicMock()
        mock_result.etag = "etag1"
        s.client.put_object.return_value = mock_result

        result = s.upload_file(str(file_path), "test.txt")

        assert result is mock_result

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    def test_upload_file_object(self, mock_check):
        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"
        mock_result = MagicMock()
        mock_result.etag = "etag2"
        s.client.put_object.return_value = mock_result

        file_obj = io.BytesIO(b"stream data")
        result = s.upload_file(file_obj, "test.txt")

        assert result is mock_result

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    @patch.object(MinIOStorage, "_get_fallback_storage")
    def test_upload_file_s3error_fallback(self, mock_fallback, mock_check):
        from minio.error import S3Error

        mock_local = MagicMock()
        mock_local.upload_file.return_value = None
        mock_fallback.return_value = mock_local

        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"
        s.client.put_object.side_effect = S3Error(
            "NoSuchBucket", "msg", "res", "req_id", None, None
        )

        s.upload_file(b"data", "test.txt")

        mock_local.upload_file.assert_called_once_with(
            b"data", "test.txt", "application/octet-stream", None
        )


class TestMinIOStorageDownloadFile:
    @patch.object(MinIOStorage, "_check_connection", return_value=False)
    @patch.object(MinIOStorage, "_get_fallback_storage")
    def test_download_file_fallback_to_local(self, mock_fallback, mock_check):
        mock_local = MagicMock()
        mock_local.download_file.return_value = b"data"
        mock_fallback.return_value = mock_local

        s = MinIOStorage()
        s.download_file("test.txt")

        mock_local.download_file.assert_called_once_with("test.txt", None)

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    def test_download_file_to_memory(self, mock_check):
        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"

        mock_response = MagicMock()
        mock_response.read.return_value = b"downloaded"
        s.client.get_object.return_value = mock_response

        result = s.download_file("test.txt")

        assert result == b"downloaded"
        mock_response.close.assert_called_once()
        mock_response.release_conn.assert_called_once()

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    def test_download_file_to_path(self, mock_check):
        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"

        result = s.download_file("test.txt", "/tmp/out.txt")

        s.client.fget_object.assert_called_once_with(
            bucket_name="bucket", object_name="test.txt", file_path="/tmp/out.txt"
        )
        assert isinstance(result, Path)


class TestMinIOStorageDeleteFile:
    @patch.object(MinIOStorage, "_check_connection", return_value=False)
    @patch.object(MinIOStorage, "_get_fallback_storage")
    def test_delete_file_fallback_to_local(self, mock_fallback, mock_check):
        mock_local = MagicMock()
        mock_fallback.return_value = mock_local

        s = MinIOStorage()
        s.delete_file("test.txt")

        mock_local.delete_file.assert_called_once_with("test.txt")

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    def test_delete_file_minio(self, mock_check):
        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"

        s.delete_file("test.txt")

        s.client.remove_object.assert_called_once_with(bucket_name="bucket", object_name="test.txt")


class TestMinIOStorageDeleteFiles:
    @patch.object(MinIOStorage, "_check_connection", return_value=False)
    @patch.object(MinIOStorage, "_get_fallback_storage")
    def test_delete_files_fallback_to_local(self, mock_fallback, mock_check):
        mock_local = MagicMock()
        mock_fallback.return_value = mock_local

        s = MinIOStorage()
        s.delete_files(["a.txt", "b.txt"])

        assert mock_local.delete_file.call_count == 2

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    def test_delete_files_minio(self, mock_check):
        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"
        s.client.remove_objects.return_value = []

        s.delete_files(["a.txt", "b.txt"])

        s.client.remove_objects.assert_called_once()


class TestMinIOStorageGetFileUrl:
    @patch.object(MinIOStorage, "_check_connection", return_value=False)
    @patch.object(MinIOStorage, "_get_fallback_storage")
    def test_get_file_url_fallback(self, mock_fallback, mock_check):
        mock_local = MagicMock()
        mock_local.get_file_url.return_value = "/api/v1/resources/file/test.txt"
        mock_fallback.return_value = mock_local

        s = MinIOStorage()
        url = s.get_file_url("test.txt")

        mock_local.get_file_url.assert_called_once_with("test.txt")
        assert url == "/api/v1/resources/file/test.txt"

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    def test_get_file_url_minio(self, mock_check):
        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"
        s.client.presigned_get_object.return_value = "http://minio:9000/bucket/test.txt?X-Amz-..."

        url = s.get_file_url("test.txt", expires=timedelta(hours=2))

        s.client.presigned_get_object.assert_called_once_with(
            bucket_name="bucket", object_name="test.txt", expires=timedelta(hours=2)
        )
        assert "minio" in url


class TestMinIOStorageGetUploadUrl:
    @patch.object(MinIOStorage, "_check_connection", return_value=False)
    def test_get_upload_url_unavailable_raises(self, mock_check):
        s = MinIOStorage()
        with pytest.raises(RuntimeError, match="MinIO is not available"):
            s.get_upload_url("test.txt")

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    def test_get_upload_url_minio(self, mock_check):
        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"
        s.client.presigned_put_object.return_value = "http://minio:9000/bucket/test.txt?upload"

        url = s.get_upload_url("test.txt")

        s.client.presigned_put_object.assert_called_once()
        assert "upload" in url


class TestMinIOStorageFileExists:
    @patch.object(MinIOStorage, "_check_connection", return_value=False)
    @patch.object(MinIOStorage, "_get_fallback_storage")
    def test_file_exists_fallback(self, mock_fallback, mock_check):
        mock_local = MagicMock()
        mock_local.file_exists.return_value = True
        mock_fallback.return_value = mock_local

        s = MinIOStorage()
        assert s.file_exists("test.txt") is True
        mock_local.file_exists.assert_called_once_with("test.txt")

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    def test_file_exists_minio_true(self, mock_check):
        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"
        s.client.stat_object.return_value = MagicMock()

        assert s.file_exists("test.txt") is True

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    @patch.object(MinIOStorage, "_get_fallback_storage")
    def test_file_exists_minio_s3error_fallback(self, mock_fallback, mock_check):
        from minio.error import S3Error

        mock_local = MagicMock()
        mock_local.file_exists.return_value = False
        mock_fallback.return_value = mock_local

        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"
        s.client.stat_object.side_effect = S3Error("NoSuchKey", "msg", "res", "req_id", None, None)

        assert s.file_exists("test.txt") is False
        mock_local.file_exists.assert_called_once_with("test.txt")


class TestMinIOStorageGetFileInfo:
    @patch.object(MinIOStorage, "_check_connection", return_value=False)
    def test_get_file_info_unavailable_raises(self, mock_check):
        s = MinIOStorage()
        with pytest.raises(RuntimeError, match="MinIO is not available"):
            s.get_file_info("test.txt")

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    def test_get_file_info_minio(self, mock_check):
        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"

        mock_stat = MagicMock()
        mock_stat.object_name = "test.txt"
        mock_stat.size = 1024
        mock_stat.etag = "etag123"
        mock_stat.content_type = "text/plain"
        mock_stat.last_modified = "2025-01-01"
        mock_stat.metadata = {}
        s.client.stat_object.return_value = mock_stat

        info = s.get_file_info("test.txt")
        assert info["object_name"] == "test.txt"
        assert info["size"] == 1024
        assert info["etag"] == "etag123"


class TestMinIOStorageListFiles:
    @patch.object(MinIOStorage, "_check_connection", return_value=False)
    def test_list_files_unavailable_returns_empty(self, mock_check):
        s = MinIOStorage()
        result = s.list_files()
        assert result == []

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    def test_list_files_minio(self, mock_check):
        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"

        mock_obj = MagicMock()
        mock_obj.object_name = "a.txt"
        mock_obj.size = 100
        mock_obj.etag = "e1"
        mock_obj.last_modified = "2025-01-01"
        mock_obj.is_dir = False
        s.client.list_objects.return_value = [mock_obj]

        result = s.list_files(prefix="a", recursive=True)
        assert len(result) == 1
        assert result[0]["object_name"] == "a.txt"
        assert result[0]["size"] == 100


class TestMinIOStorageCopyFile:
    @patch.object(MinIOStorage, "_check_connection", return_value=False)
    def test_copy_file_unavailable_raises(self, mock_check):
        s = MinIOStorage()
        with pytest.raises(RuntimeError, match="MinIO is not available"):
            s.copy_file("src.txt", "dst.txt")

    @patch.object(MinIOStorage, "_check_connection", return_value=True)
    def test_copy_file_minio(self, mock_check):
        s = MinIOStorage()
        s.client = MagicMock()
        s.bucket_name = "bucket"
        mock_result = MagicMock()
        s.client.copy_object.return_value = mock_result

        result = s.copy_file("src.txt", "dst.txt")
        assert result is mock_result
        s.client.copy_object.assert_called_once()


class TestGetStorage:
    def test_returns_minio_storage(self):
        import app.services.storage as storage_mod

        original = storage_mod._storage_instance
        storage_mod._storage_instance = None
        try:
            instance = get_storage()
            assert isinstance(instance, MinIOStorage)
        finally:
            storage_mod._storage_instance = original

    def test_returns_cached_instance(self):
        import app.services.storage as storage_mod

        original = storage_mod._storage_instance
        mock_instance = MagicMock()
        storage_mod._storage_instance = mock_instance
        try:
            instance = get_storage()
            assert instance is mock_instance
        finally:
            storage_mod._storage_instance = original


class TestGenerateObjectName:
    def test_with_folder(self):
        result = generate_object_name("user123", "doc.pdf", folder="resources")
        assert result.startswith("resources/user123/")
        assert result.endswith(".pdf")

    def test_without_folder(self):
        result = generate_object_name("user123", "doc.pdf")
        assert result.startswith("user123/")
        assert result.endswith(".pdf")

    def test_invalid_folder_name_raises(self):
        with pytest.raises(ValueError, match="Invalid folder name"):
            generate_object_name("user123", "doc.pdf", folder="bad folder!")

    def test_folder_with_special_chars_raises(self):
        with pytest.raises(ValueError, match="Invalid folder name"):
            generate_object_name("user123", "doc.pdf", folder="a/b")

    def test_folder_with_valid_chars(self):
        result = generate_object_name("u1", "f.txt", folder="my-folder_v2")
        assert result.startswith("my-folder_v2/u1/")
