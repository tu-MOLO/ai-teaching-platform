"""
本地存储 → MinIO 文件迁移工具

将本地 storage/ 目录下的文件批量上传到 MinIO 对象存储。

用法:
    python scripts/migrate_local_to_minio.py [--dry-run] [--prefix <prefix>]

选项:
    --dry-run     仅列出待迁移文件，不实际执行上传
    --prefix      仅迁移指定前缀的文件（如 "resources/"）

环境变量（与 MinIO 配置共用）:
    MINIO_ENDPOINT:    MinIO 服务地址
    MINIO_ACCESS_KEY:  MinIO 访问密钥
    MINIO_SECRET_KEY:  MinIO 秘密密钥
    MINIO_BUCKET_NAME: MinIO 存储桶名称
    MINIO_SECURE:      是否使用 HTTPS（默认 false）
"""
import argparse
import asyncio
import os
import sys
from pathlib import Path
from typing import Optional

# 确保 backend 目录在 sys.path 中
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.core.logging import get_logger
from app.services.storage import LocalFileStorage, MinIOStorage

logger = get_logger(__name__)


async def migrate_files(
    storage_dir: str,
    prefix: Optional[str] = None,
    dry_run: bool = False,
) -> tuple[int, int, list[str]]:
    """
    将本地存储文件迁移到 MinIO。

    Args:
        storage_dir: 本地存储根目录
        prefix: 仅迁移指定前缀的文件
        dry_run: 仅列出，不执行上传

    Returns:
        (成功数, 失败数, 失败文件列表)
    """
    base_path = Path(storage_dir)
    if not base_path.exists():
        logger.error(f"存储目录不存在: {base_path}")
        return 0, 0, []

    # 收集待迁移文件
    files_to_migrate: list[tuple[str, Path]] = []
    for file_path in base_path.rglob("*"):
        if file_path.is_file():
            relative_path = str(file_path.relative_to(base_path)).replace("\\", "/")

            # 跳过 .gitkeep 等特殊文件
            if file_path.name == ".gitkeep":
                continue

            # 前缀过滤
            if prefix and not relative_path.startswith(prefix):
                continue

            files_to_migrate.append((relative_path, file_path))

    if not files_to_migrate:
        logger.info("没有需要迁移的文件")
        return 0, 0, []

    total_size = sum(f.stat().st_size for _, f in files_to_migrate)
    logger.info("=" * 60)
    logger.info(
        f"找到 {len(files_to_migrate)} 个文件待迁移，总计 {total_size / 1024 / 1024:.1f} MB"
    )
    logger.info("=" * 60)

    if dry_run:
        logger.info("=== DRY RUN 模式，仅列出文件 ===")
        for relative_path, file_path in files_to_migrate:
            size_kb = file_path.stat().st_size / 1024
            logger.info(f"  {relative_path} ({size_kb:.1f} KB)")
        return len(files_to_migrate), 0, []

    # 初始化 MinIO 客户端
    minio_storage = MinIOStorage()
    if not minio_storage._init_minio():
        logger.error("MinIO 连接失败，无法执行迁移")
        return 0, len(files_to_migrate), [f[0] for f in files_to_migrate]

    # 执行迁移
    success = 0
    failed = 0
    failed_files: list[str] = []

    for i, (relative_path, file_path) in enumerate(files_to_migrate, 1):
        try:
            file_size = file_path.stat().st_size
            size_display = f"{file_size / 1024:.1f} KB"

            logger.info(f"[{i}/{len(files_to_migrate)}] 上传 {relative_path} ({size_display})")

            # 检测 MIME 类型
            import mimetypes
            content_type, _ = mimetypes.guess_type(str(file_path))

            # 使用 MinIOStorage 直接上传（绕过降级逻辑）
            if minio_storage.client and minio_storage.bucket_name:
                minio_storage.ensure_bucket_exists()
                minio_storage.client.fput_object(
                    bucket_name=minio_storage.bucket_name,
                    object_name=relative_path,
                    file_path=str(file_path),
                    content_type=content_type or "application/octet-stream",
                )
                success += 1
                logger.info(f"  ✓ {relative_path}")
            else:
                raise RuntimeError("MinIO client not ready")

        except Exception as e:
            logger.error(f"  ✗ {relative_path}: {e}")
            failed += 1
            failed_files.append(relative_path)

    logger.info("=" * 60)
    logger.info(f"迁移完成: 成功 {success}, 失败 {failed}")
    if failed_files:
        logger.info(f"失败文件:\n  " + "\n  ".join(failed_files))
    logger.info("=" * 60)

    return success, failed, failed_files


async def verify_files(storage_dir: str, prefix: Optional[str] = None):
    """迁移后验证：对比本地和 MinIO 文件"""
    base_path = Path(storage_dir)
    minio_storage = MinIOStorage()

    logger.info("\n=== 迁移验证 ===")
    if not minio_storage._init_minio():
        logger.error("MinIO 连接失败，无法验证")
        return

    not_found = []
    size_mismatch = []

    for file_path in base_path.rglob("*"):
        if file_path.is_file() and file_path.name != ".gitkeep":
            relative_path = str(file_path.relative_to(base_path)).replace("\\", "/")
            if prefix and not relative_path.startswith(prefix):
                continue

            try:
                exists = minio_storage.file_exists(relative_path)
                if not exists:
                    not_found.append(relative_path)
                    logger.warning(f"  缺失: {relative_path}")
                else:
                    info = minio_storage.get_file_info(relative_path)
                    local_size = file_path.stat().st_size
                    if info["size"] != local_size:
                        size_mismatch.append(relative_path)
                        logger.warning(
                            f"  大小不匹配: {relative_path} "
                            f"(本地={local_size}, MinIO={info['size']})"
                        )
            except Exception as e:
                not_found.append(relative_path)
                logger.warning(f"  验证失败 {relative_path}: {e}")

    logger.info(
        f"验证完成: 缺失 {len(not_found)} 个, "
        f"大小不匹配 {len(size_mismatch)} 个"
    )


def main():
    parser = argparse.ArgumentParser(description="本地存储 → MinIO 文件迁移工具")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="仅列出待迁移文件，不执行上传",
    )
    parser.add_argument(
        "--prefix",
        default=None,
        help="仅迁移指定前缀的文件（如 resources/）",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="迁移后验证文件完整性",
    )
    parser.add_argument(
        "--storage-dir",
        default="./storage",
        help="本地存储目录路径（默认 ./storage）",
    )
    args = parser.parse_args()

    if not settings.MINIO_ACCESS_KEY or not settings.MINIO_SECRET_KEY:
        print("=" * 60)
        print("  本地存储 → MinIO 文件迁移工具")
        print("=" * 60)
        print()
        print("需要先配置 MinIO 环境变量:")
        print("  MINIO_ENDPOINT=localhost:9000")
        print("  MINIO_ACCESS_KEY=your-key")
        print("  MINIO_SECRET_KEY=your-secret")
        print("  MINIO_BUCKET_NAME=ai-teaching")
        print()
        print("迁移命令示例:")
        print("  python scripts/migrate_local_to_minio.py --dry-run")
        print("  python scripts/migrate_local_to_minio.py")
        print("  python scripts/migrate_local_to_minio.py --verify")
        sys.exit(0)

    asyncio.run(migrate_files(args.storage_dir, args.prefix, args.dry_run))

    if not args.dry_run and args.verify:
        asyncio.run(verify_files(args.storage_dir, args.prefix))


if __name__ == "__main__":
    main()
