from unittest.mock import AsyncMock, MagicMock

import pytest

from app.schemas.tag import TagCreate, TagUpdate
from app.services.tags import TagService


class TestGetTagByName:
    @pytest.mark.asyncio
    async def test_found(self):
        mock_db = AsyncMock()
        mock_tag = MagicMock()
        mock_tag.name = "Python"
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_tag
        mock_db.execute.return_value = mock_result

        result = await TagService.get_tag_by_name(mock_db, "Python")
        assert result is mock_tag
        assert result.name == "Python"

    @pytest.mark.asyncio
    async def test_not_found(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        result = await TagService.get_tag_by_name(mock_db, "NonExistent")
        assert result is None


class TestGetTagsByIds:
    @pytest.mark.asyncio
    async def test_returns_matching_tags(self):
        mock_db = AsyncMock()
        tag1 = MagicMock()
        tag1.id = "tag-1"
        tag1.name = "Python"
        tag2 = MagicMock()
        tag2.id = "tag-2"
        tag2.name = "AI"

        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [tag1, tag2]
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute.return_value = mock_result

        result = await TagService.get_tags_by_ids(mock_db, ["tag-1", "tag-2"])
        assert len(result) == 2
        assert result[0].id == "tag-1"
        assert result[1].id == "tag-2"

    @pytest.mark.asyncio
    async def test_empty_ids_returns_empty(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute.return_value = mock_result

        result = await TagService.get_tags_by_ids(mock_db, [])
        assert result == []


class TestTagServiceIntegration:
    @pytest.mark.asyncio
    async def test_create_tag_with_real_db(self, db_session):
        tag_data = TagCreate(name="Python", description="Python编程语言", color="#3776ab")
        tag = await TagService.create_tag(db_session, tag_data)
        assert tag is not None
        assert tag.name == "Python"
        assert tag.description == "Python编程语言"
        assert tag.color == "#3776ab"
        assert tag.is_deleted is False

    @pytest.mark.asyncio
    async def test_get_tags_with_real_db(self, db_session):
        tag_data = TagCreate(name="AI", description="人工智能", color="#ff6600")
        await TagService.create_tag(db_session, tag_data)

        tags = await TagService.get_tags(db_session)
        assert len(tags) >= 1

    @pytest.mark.asyncio
    async def test_count_tags_with_real_db(self, db_session):
        initial_count = await TagService.count_tags(db_session)

        tag_data = TagCreate(name="Math", description="数学", color="#00ff00")
        await TagService.create_tag(db_session, tag_data)

        new_count = await TagService.count_tags(db_session)
        assert new_count == initial_count + 1

    @pytest.mark.asyncio
    async def test_get_tag_by_id_with_real_db(self, db_session):
        tag_data = TagCreate(name="Physics", description="物理", color="#0000ff")
        created = await TagService.create_tag(db_session, tag_data)

        tag = await TagService.get_tag_by_id(db_session, created.id)
        assert tag is not None
        assert tag.name == "Physics"

    @pytest.mark.asyncio
    async def test_get_tag_by_id_returns_none_for_nonexistent(self, db_session):
        tag = await TagService.get_tag_by_id(db_session, "nonexistent-id")
        assert tag is None

    @pytest.mark.asyncio
    async def test_get_tag_by_name_with_real_db(self, db_session):
        tag_data = TagCreate(name="Chemistry", description="化学", color="#ff0000")
        await TagService.create_tag(db_session, tag_data)

        tag = await TagService.get_tag_by_name(db_session, "Chemistry")
        assert tag is not None
        assert tag.name == "Chemistry"

    @pytest.mark.asyncio
    async def test_get_tag_by_name_returns_none_for_nonexistent(self, db_session):
        tag = await TagService.get_tag_by_name(db_session, "NonExistentTag")
        assert tag is None

    @pytest.mark.asyncio
    async def test_update_tag_with_real_db(self, db_session):
        tag_data = TagCreate(name="Biology", description="生物", color="#00ff00")
        created = await TagService.create_tag(db_session, tag_data)

        update_data = TagUpdate(description="生物学", color="#008800")
        updated = await TagService.update_tag(db_session, created.id, update_data)
        assert updated is not None
        assert updated.description == "生物学"
        assert updated.color == "#008800"
        assert updated.name == "Biology"

    @pytest.mark.asyncio
    async def test_update_tag_returns_none_for_nonexistent(self, db_session):
        update_data = TagUpdate(name="Nothing")
        result = await TagService.update_tag(db_session, "nonexistent-id", update_data)
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_tag_with_real_db(self, db_session):
        tag_data = TagCreate(name="History", description="历史", color="#cc9900")
        created = await TagService.create_tag(db_session, tag_data)

        result = await TagService.delete_tag(db_session, created.id)
        assert result is True

        tag = await TagService.get_tag_by_id(db_session, created.id)
        assert tag is None

    @pytest.mark.asyncio
    async def test_delete_tag_returns_false_for_nonexistent(self, db_session):
        result = await TagService.delete_tag(db_session, "nonexistent-id")
        assert result is False

    @pytest.mark.asyncio
    async def test_get_tags_by_ids_with_real_db(self, db_session):
        tag1 = await TagService.create_tag(db_session, TagCreate(name="Tag1", color="#111111"))
        tag2 = await TagService.create_tag(db_session, TagCreate(name="Tag2", color="#222222"))

        tags = await TagService.get_tags_by_ids(db_session, [tag1.id, tag2.id])
        assert len(tags) == 2
        tag_names = {t.name for t in tags}
        assert "Tag1" in tag_names
        assert "Tag2" in tag_names

    @pytest.mark.asyncio
    async def test_get_tags_by_ids_empty_list(self, db_session):
        tags = await TagService.get_tags_by_ids(db_session, [])
        assert tags == []
