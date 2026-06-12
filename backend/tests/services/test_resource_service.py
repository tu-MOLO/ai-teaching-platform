import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.resources import ResourceService
from app.core.exceptions import AuthorizationException


class TestCreateResource:
    @pytest.mark.asyncio
    @patch("app.services.resources.get_storage")
    @patch("app.services.resources.generate_object_name")
    async def test_successful_creation(self, mock_gen_name, mock_get_storage):
        mock_gen_name.return_value = "resources/user1/abc.pdf"
        mock_storage = AsyncMock()
        mock_storage.upload_file_async = AsyncMock()
        mock_get_storage.return_value = mock_storage

        mock_db = AsyncMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        mock_resource_data = MagicMock()
        mock_resource_data.name = "Test Resource"
        mock_resource_data.description = "A test"
        mock_resource_data.tag_ids = []

        mock_file = MagicMock()
        mock_file.seek = MagicMock()
        mock_file.tell = MagicMock(return_value=1024)

        await ResourceService.create_resource(
            mock_db, mock_resource_data, mock_file, "test.pdf", "user-1"
        )

        mock_storage.upload_file_async.assert_called_once()
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.services.resources.get_storage")
    @patch("app.services.resources.generate_object_name")
    async def test_with_tag_ids(self, mock_gen_name, mock_get_storage):
        mock_gen_name.return_value = "resources/user1/abc.pdf"
        mock_storage = AsyncMock()
        mock_storage.upload_file_async = AsyncMock()
        mock_get_storage.return_value = mock_storage

        mock_db = AsyncMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        mock_resource_data = MagicMock()
        mock_resource_data.name = "Tagged Resource"
        mock_resource_data.description = None
        mock_resource_data.tag_ids = ["tag-1", "tag-2"]

        mock_file = MagicMock()
        mock_file.seek = MagicMock()
        mock_file.tell = MagicMock(return_value=512)

        with patch.object(ResourceService, "_get_tags_by_ids", new_callable=AsyncMock) as mock_get_tags:
            mock_get_tags.return_value = [MagicMock(), MagicMock()]
            await ResourceService.create_resource(
                mock_db, mock_resource_data, mock_file, "tagged.pdf", "user-1"
            )
            mock_get_tags.assert_called_once_with(mock_db, ["tag-1", "tag-2"])

    @pytest.mark.asyncio
    @patch("app.services.resources.get_storage")
    @patch("app.services.resources.generate_object_name")
    async def test_upload_failure_raises(self, mock_gen_name, mock_get_storage):
        mock_gen_name.return_value = "resources/user1/abc.pdf"
        mock_storage = AsyncMock()
        mock_storage.upload_file_async = AsyncMock(side_effect=Exception("upload failed"))
        mock_get_storage.return_value = mock_storage

        mock_db = AsyncMock()
        mock_db.rollback = AsyncMock()

        mock_resource_data = MagicMock()
        mock_resource_data.name = "Fail Resource"
        mock_resource_data.description = None
        mock_resource_data.tag_ids = []

        mock_file = MagicMock()
        mock_file.seek = MagicMock()
        mock_file.tell = MagicMock(return_value=100)

        with pytest.raises(Exception, match="upload failed"):
            await ResourceService.create_resource(
                mock_db, mock_resource_data, mock_file, "fail.pdf", "user-1"
            )
        mock_db.rollback.assert_called_once()


class TestGetResourceFileUrl:
    @pytest.mark.asyncio
    @patch("app.services.resources.get_storage")
    async def test_minio_mode_returns_presigned_url(self, mock_get_storage):
        from app.services.storage import MinIOStorage
        mock_storage = MagicMock(spec=MinIOStorage)
        mock_storage.get_file_url.return_value = "https://minio.example.com/presigned-url"
        mock_get_storage.return_value = mock_storage

        mock_resource = MagicMock()
        mock_resource.file_path = "resources/user1/abc.pdf"
        mock_resource.id = "res-1"

        result = await ResourceService.get_resource_file_url(mock_resource)
        assert result == "https://minio.example.com/presigned-url"

    @pytest.mark.asyncio
    @patch("app.services.resources.get_storage")
    async def test_local_storage_mode_returns_api_path(self, mock_get_storage):
        from app.services.storage import LocalFileStorage
        mock_storage = MagicMock(spec=LocalFileStorage)
        mock_get_storage.return_value = mock_storage

        mock_resource = MagicMock()
        mock_resource.file_path = "resources/user1/abc.pdf"
        mock_resource.id = "res-1"

        with patch("app.services.resources.settings") as mock_settings:
            mock_settings.API_V1_STR = "/api/v1"
            result = await ResourceService.get_resource_file_url(mock_resource)
        assert result == "/api/v1/resources/res-1/file"


class TestDownloadResource:
    @pytest.mark.asyncio
    @patch("app.services.resources.get_storage")
    async def test_success(self, mock_get_storage):
        mock_storage = AsyncMock()
        mock_storage.download_file_async = AsyncMock()
        mock_get_storage.return_value = mock_storage

        mock_db = AsyncMock()
        mock_resource = MagicMock()
        mock_resource.file_path = "resources/user1/abc.pdf"

        with patch.object(ResourceService, "get_resource_by_id", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_resource
            result = await ResourceService.download_resource(mock_db, "res-1", "/tmp/abc.pdf")
        assert result == "/tmp/abc.pdf"

    @pytest.mark.asyncio
    async def test_not_found_raises_value_error(self):
        mock_db = AsyncMock()

        with patch.object(ResourceService, "get_resource_by_id", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = None
            with pytest.raises(ValueError, match="Resource not found"):
                await ResourceService.download_resource(mock_db, "nonexistent", "/tmp/x.pdf")


class TestGetResourceFileContent:
    @pytest.mark.asyncio
    async def test_no_user_id_raises_authorization(self):
        mock_db = AsyncMock()
        with pytest.raises(AuthorizationException):
            await ResourceService.get_resource_file_content(mock_db, "res-1", "")

    @pytest.mark.asyncio
    async def test_not_found_raises_value_error(self):
        mock_db = AsyncMock()
        with patch.object(ResourceService, "get_resource_by_id", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = None
            with pytest.raises(ValueError, match="Resource not found"):
                await ResourceService.get_resource_file_content(mock_db, "nonexistent", "user-1")

    @pytest.mark.asyncio
    @patch("app.services.resources.get_storage")
    async def test_success_returns_tuple(self, mock_get_storage):
        mock_storage = AsyncMock()
        mock_storage.download_file_async = AsyncMock(return_value=b"file content")
        mock_get_storage.return_value = mock_storage

        mock_db = AsyncMock()
        mock_resource = MagicMock()
        mock_resource.file_path = "resources/user1/doc.pdf"
        mock_resource.file_name = "doc.pdf"

        with patch.object(ResourceService, "get_resource_by_id", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_resource
            result = await ResourceService.get_resource_file_content(mock_db, "res-1", "user-1")

        assert isinstance(result, tuple)
        assert len(result) == 3
        assert result[0] is mock_resource
        assert result[1] == b"file content"
        assert result[2] == "doc.pdf"


class TestBuildResourceFilters:
    @pytest.mark.asyncio
    async def test_keyword_escaping(self):
        from app.schemas.resource import ResourceSearchParams
        from sqlalchemy import select
        from app.models.resource import Resource

        params = ResourceSearchParams(keyword="test%value_test")
        query = select(Resource).where(Resource.is_deleted == False)  # noqa: E712
        result = await ResourceService._build_resource_filters(query, params)

        compiled = result.compile(compile_kwargs={"literal_binds": True})
        compiled_str = str(compiled)
        assert "\\%" in compiled_str or "escape" in compiled_str.lower()

    @pytest.mark.asyncio
    async def test_tag_ids_filter(self):
        from app.schemas.resource import ResourceSearchParams
        mock_query = MagicMock()
        mock_query.where.return_value = mock_query
        mock_query.join.return_value = mock_query
        mock_query.group_by.return_value = mock_query

        params = ResourceSearchParams(tag_ids=["tag-1", "tag-2"])
        await ResourceService._build_resource_filters(mock_query, params)
        mock_query.join.assert_called_once()

    @pytest.mark.asyncio
    async def test_file_type_filter(self):
        from app.schemas.resource import ResourceSearchParams
        mock_query = MagicMock()
        mock_query.where.return_value = mock_query

        params = ResourceSearchParams(file_type="pdf")
        await ResourceService._build_resource_filters(mock_query, params)
        assert mock_query.where.call_count >= 1

    @pytest.mark.asyncio
    async def test_user_id_filter(self):
        from app.schemas.resource import ResourceSearchParams
        mock_query = MagicMock()
        mock_query.where.return_value = mock_query

        params = ResourceSearchParams(user_id="user-1")
        await ResourceService._build_resource_filters(mock_query, params)
        assert mock_query.where.call_count >= 1
