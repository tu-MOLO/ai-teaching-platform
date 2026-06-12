import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.exceptions import AlreadyExistsException

from app.services.dropdown_options import DropdownOptionService
from app.schemas.dropdown_option import DropdownOptionCreate, DropdownOptionUpdate


class TestListGroupedOptions:
    @pytest.mark.asyncio
    async def test_grouping_by_group_key(self):
        mock_db = AsyncMock()

        opt1 = MagicMock()
        opt1.group_key = "grade"
        opt2 = MagicMock()
        opt2.group_key = "grade"
        opt3 = MagicMock()
        opt3.group_key = "subject"

        with patch.object(DropdownOptionService, "list_options", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = [opt1, opt2, opt3]
            result = await DropdownOptionService.list_grouped_options(mock_db, active_only=False)

        assert "grade" in result
        assert "subject" in result
        assert len(result["grade"]) == 2
        assert len(result["subject"]) == 1

    @pytest.mark.asyncio
    async def test_empty_options(self):
        mock_db = AsyncMock()

        with patch.object(DropdownOptionService, "list_options", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = []
            result = await DropdownOptionService.list_grouped_options(mock_db, active_only=True)

        assert result == {}


class TestUpdateOption:
    @pytest.mark.asyncio
    async def test_duplicate_value_detection_raises_value_error(self):
        mock_db = AsyncMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        existing_option = MagicMock()
        existing_option.id = "opt-1"
        existing_option.group_key = "grade"
        existing_option.value = "Grade 1"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = MagicMock()
        mock_db.execute = AsyncMock(return_value=mock_result)

        mock_option_in = MagicMock()
        mock_option_in.model_dump.return_value = {"value": "Grade 2"}
        mock_option_in.value = "Grade 2"

        with patch.object(DropdownOptionService, "get_option", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = existing_option
            with pytest.raises(AlreadyExistsException):
                await DropdownOptionService.update_option(mock_db, "opt-1", mock_option_in)

    @pytest.mark.asyncio
    async def test_not_found_returns_none(self):
        mock_db = AsyncMock()

        mock_option_in = MagicMock()

        with patch.object(DropdownOptionService, "get_option", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = None
            result = await DropdownOptionService.update_option(mock_db, "nonexistent", mock_option_in)

        assert result is None


class TestDropdownOptionServiceIntegration:
    @pytest.mark.asyncio
    async def test_create_option_with_real_db(self, db_session):
        option_in = DropdownOptionCreate(
            group_key="grade",
            label="一年级",
            value="grade_1",
            sort_order=1,
        )
        option = await DropdownOptionService.create_option(db_session, option_in)
        assert option is not None
        assert option.group_key == "grade"
        assert option.label == "一年级"
        assert option.value == "grade_1"
        assert option.is_active is True

    @pytest.mark.asyncio
    async def test_create_option_duplicate_value_raises_error(self, db_session):
        option_in = DropdownOptionCreate(
            group_key="grade",
            label="二年级",
            value="grade_2",
        )
        await DropdownOptionService.create_option(db_session, option_in)

        duplicate_in = DropdownOptionCreate(
            group_key="grade",
            label="二年级重复",
            value="grade_2",
        )
        with pytest.raises(AlreadyExistsException):
            await DropdownOptionService.create_option(db_session, duplicate_in)

    @pytest.mark.asyncio
    async def test_list_options_with_real_db(self, db_session):
        option_in = DropdownOptionCreate(
            group_key="subject",
            label="数学",
            value="math",
        )
        await DropdownOptionService.create_option(db_session, option_in)

        options = await DropdownOptionService.list_options(db_session, group_key="subject")
        assert len(options) >= 1
        assert all(o.group_key == "subject" for o in options)

    @pytest.mark.asyncio
    async def test_list_options_all_groups(self, db_session):
        option_in = DropdownOptionCreate(
            group_key="semester",
            label="第一学期",
            value="semester_1",
        )
        await DropdownOptionService.create_option(db_session, option_in)

        options = await DropdownOptionService.list_options(db_session)
        assert len(options) >= 1

    @pytest.mark.asyncio
    async def test_get_option_with_real_db(self, db_session):
        option_in = DropdownOptionCreate(
            group_key="grade",
            label="三年级",
            value="grade_3",
        )
        created = await DropdownOptionService.create_option(db_session, option_in)

        option = await DropdownOptionService.get_option(db_session, created.id)
        assert option is not None
        assert option.label == "三年级"

    @pytest.mark.asyncio
    async def test_get_option_returns_none_for_nonexistent(self, db_session):
        option = await DropdownOptionService.get_option(db_session, "nonexistent-id")
        assert option is None

    @pytest.mark.asyncio
    async def test_update_option_with_real_db(self, db_session):
        option_in = DropdownOptionCreate(
            group_key="grade",
            label="四年级旧",
            value="grade_4_old",
        )
        created = await DropdownOptionService.create_option(db_session, option_in)

        update_data = DropdownOptionUpdate(label="四年级新")
        updated = await DropdownOptionService.update_option(db_session, created.id, update_data)
        assert updated is not None
        assert updated.label == "四年级新"

    @pytest.mark.asyncio
    async def test_update_option_duplicate_value_raises_error(self, db_session):
        await DropdownOptionService.create_option(db_session, DropdownOptionCreate(
            group_key="grade", label="五年级", value="grade_5",
        ))
        created = await DropdownOptionService.create_option(db_session, DropdownOptionCreate(
            group_key="grade", label="六年级", value="grade_6",
        ))

        update_data = DropdownOptionUpdate(value="grade_5")
        with pytest.raises(AlreadyExistsException):
            await DropdownOptionService.update_option(db_session, created.id, update_data)

    @pytest.mark.asyncio
    async def test_update_option_returns_none_for_nonexistent(self, db_session):
        update_data = DropdownOptionUpdate(label="不存在")
        result = await DropdownOptionService.update_option(db_session, "nonexistent-id", update_data)
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_option_with_real_db(self, db_session):
        option_in = DropdownOptionCreate(
            group_key="grade",
            label="七年级",
            value="grade_7",
        )
        created = await DropdownOptionService.create_option(db_session, option_in)

        result = await DropdownOptionService.delete_option(db_session, created.id)
        assert result is True

        option = await DropdownOptionService.get_option(db_session, created.id)
        assert option is None

    @pytest.mark.asyncio
    async def test_delete_option_returns_false_for_nonexistent(self, db_session):
        result = await DropdownOptionService.delete_option(db_session, "nonexistent-id")
        assert result is False

    @pytest.mark.asyncio
    async def test_list_grouped_options_with_real_db(self, db_session):
        await DropdownOptionService.create_option(db_session, DropdownOptionCreate(
            group_key="grouped_grade", label="一年级", value="g1",
        ))
        await DropdownOptionService.create_option(db_session, DropdownOptionCreate(
            group_key="grouped_grade", label="二年级", value="g2",
        ))
        await DropdownOptionService.create_option(db_session, DropdownOptionCreate(
            group_key="grouped_subject", label="语文", value="chinese",
        ))

        grouped = await DropdownOptionService.list_grouped_options(db_session, active_only=True)
        assert "grouped_grade" in grouped
        assert "grouped_subject" in grouped
        assert len(grouped["grouped_grade"]) == 2
        assert len(grouped["grouped_subject"]) == 1

    @pytest.mark.asyncio
    async def test_count_options_with_real_db(self, db_session):
        initial_count = await DropdownOptionService.count_options(db_session, group_key="count_grade")

        await DropdownOptionService.create_option(db_session, DropdownOptionCreate(
            group_key="count_grade", label="一年级", value="cg1",
        ))

        new_count = await DropdownOptionService.count_options(db_session, group_key="count_grade")
        assert new_count == initial_count + 1

    @pytest.mark.asyncio
    async def test_count_options_all_groups(self, db_session):
        await DropdownOptionService.create_option(db_session, DropdownOptionCreate(
            group_key="count_all", label="选项", value="ca1",
        ))

        count = await DropdownOptionService.count_options(db_session)
        assert count >= 1
