import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.ai import AIService, TOOL_EXECUTOR, SYSTEM_PROMPT, MODULE_GUIDES


class TestGetModuleTag:
    def test_course_tools(self):
        for tool in (
    "create_course",
    "list_courses",
    "get_course",
    "update_course",
     "delete_course"):
            assert AIService._get_module_tag(tool) == "course"

    def test_student_tools(self):
        for tool in (
    "create_student",
    "list_students",
    "get_student",
    "update_student",
     "delete_student"):
            assert AIService._get_module_tag(tool) == "student"

    def test_data_tools(self):
        for tool in (
    "get_dashboard_stats",
    "get_course_statistics",
    "get_student_statistics",
     "get_monthly_trends"):
            assert AIService._get_module_tag(tool) == "data"

    def test_lesson_plan_tools(self):
        for tool in (
    "create_lesson_plan",
    "list_lesson_plans",
    "get_lesson_plan",
    "update_lesson_plan",
    "publish_lesson_plan",
     "delete_lesson_plan"):
            assert AIService._get_module_tag(tool) == "lesson_plan"

    def test_resource_tools(self):
        for tool in ("list_resources", "get_resource", "update_resource", "delete_resource"):
            assert AIService._get_module_tag(tool) == "resource"

    def test_notification_tools(self):
        for tool in (
    "list_notifications",
    "get_notification",
    "mark_notification_read",
    "mark_all_notifications_read",
     "delete_notification"):
            assert AIService._get_module_tag(tool) == "notification"

    def test_unknown_tool_returns_empty(self):
        assert AIService._get_module_tag("unknown_tool") == ""
        assert AIService._get_module_tag("") == ""
        assert AIService._get_module_tag("random_name") == ""


class TestBuildMessages:
    @pytest.mark.asyncio
    async def test_system_prompt_included(self):
        db = AsyncMock()
        mock_msg = MagicMock()
        mock_msg.role = "user"
        mock_msg.content = "hello"
        mock_msg.tool_calls = None
        mock_msg.tool_call_id = None
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_msg]
        db.execute.return_value = mock_result

        messages = await AIService._build_messages(db, "conv-1")

        assert messages[0]["role"] == "system"
        assert messages[0]["content"] == SYSTEM_PROMPT

    @pytest.mark.asyncio
    async def test_module_guide_injected(self):
        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        db.execute.return_value = mock_result

        messages = await AIService._build_messages(db, "conv-1", module="course")

        assert MODULE_GUIDES["course"] in messages[0]["content"]
        assert messages[0]["content"] == SYSTEM_PROMPT + "\n\n" + MODULE_GUIDES["course"]

    @pytest.mark.asyncio
    async def test_unknown_module_no_guide(self):
        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        db.execute.return_value = mock_result

        messages = await AIService._build_messages(db, "conv-1", module="unknown_module")

        assert messages[0]["content"] == SYSTEM_PROMPT

    @pytest.mark.asyncio
    async def test_tool_calls_json_parsed(self):
        db = AsyncMock()
        tool_calls_json = json.dumps(
            [{"id": "tc1", "function": {"name": "create_course", "arguments": "{}"}, "type": "function"}])

        mock_user_msg = MagicMock()
        mock_user_msg.role = "user"
        mock_user_msg.content = "create a course"
        mock_user_msg.tool_calls = None
        mock_user_msg.tool_call_id = None

        mock_asst_msg = MagicMock()
        mock_asst_msg.role = "assistant"
        mock_asst_msg.content = "ok"
        mock_asst_msg.tool_calls = tool_calls_json
        mock_asst_msg.tool_call_id = None

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_user_msg, mock_asst_msg]
        db.execute.return_value = mock_result

        messages = await AIService._build_messages(db, "conv-1")

        asst_entry = messages[2]
        assert asst_entry["role"] == "assistant"
        assert asst_entry["tool_calls"] == json.loads(tool_calls_json)

    @pytest.mark.asyncio
    async def test_invalid_json_tool_calls_skipped(self):
        db = AsyncMock()
        mock_msg = MagicMock()
        mock_msg.role = "assistant"
        mock_msg.content = "response"
        mock_msg.tool_calls = "not valid json{{{"
        mock_msg.tool_call_id = None

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_msg]
        db.execute.return_value = mock_result

        messages = await AIService._build_messages(db, "conv-1")

        asst_entry = messages[1]
        assert asst_entry["role"] == "assistant"
        assert "tool_calls" not in asst_entry

    @pytest.mark.asyncio
    async def test_tool_role_message(self):
        db = AsyncMock()
        mock_msg = MagicMock()
        mock_msg.role = "tool"
        mock_msg.content = '{"success": true}'
        mock_msg.tool_calls = None
        mock_msg.tool_call_id = "call_abc"

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_msg]
        db.execute.return_value = mock_result

        messages = await AIService._build_messages(db, "conv-1")

        tool_entry = messages[1]
        assert tool_entry["role"] == "tool"
        assert tool_entry["content"] == '{"success": true}'
        assert tool_entry["tool_call_id"] == "call_abc"

    @pytest.mark.asyncio
    async def test_user_message(self):
        db = AsyncMock()
        mock_msg = MagicMock()
        mock_msg.role = "user"
        mock_msg.content = "hello world"
        mock_msg.tool_calls = None
        mock_msg.tool_call_id = None

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_msg]
        db.execute.return_value = mock_result

        messages = await AIService._build_messages(db, "conv-1")

        assert messages[1] == {"role": "user", "content": "hello world"}


class TestSaveMessage:
    @pytest.mark.asyncio
    async def test_save_message_basic(self):
        db = MagicMock()
        db.execute = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        msg = MagicMock()
        msg.id = "msg-1"
        msg.conversation_id = "conv-1"
        msg.role = "user"
        msg.content = "hello"
        msg.tool_calls = None
        msg.tool_call_id = None
        msg.module_tag = None

        async def mock_refresh(obj):
            obj.id = "msg-1"

        db.flush = AsyncMock()
        db.refresh = AsyncMock(side_effect=mock_refresh)

        with patch("app.services.ai.AIMessage") as MockAIMessage:
            MockAIMessage.return_value = msg
            await AIService._save_message(db, "conv-1", "user", "hello")

            MockAIMessage.assert_called_once_with(
                conversation_id="conv-1",
                role="user",
                content="hello",
                tool_calls=None,
                tool_call_id=None,
                module_tag=None,
            )
            db.add.assert_called_once_with(msg)
            db.flush.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_save_message_with_tool_calls(self):
        db = MagicMock()
        db.execute = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        msg = MagicMock()
        async def mock_refresh(obj):
            pass
        db.flush = AsyncMock()
        db.refresh = AsyncMock(side_effect=mock_refresh)

        with patch("app.services.ai.AIMessage") as MockAIMessage:
            MockAIMessage.return_value = msg
            await AIService._save_message(
                db, "conv-1", "assistant", "response",
                tool_calls='[{"id": "tc1"}]',
                tool_call_id="call_1",
                module_tag="course",
            )

            MockAIMessage.assert_called_once_with(
                conversation_id="conv-1",
                role="assistant",
                content="response",
                tool_calls='[{"id": "tc1"}]',
                tool_call_id="call_1",
                module_tag="course",
            )


class TestGetOrCreateConversation:
    @pytest.mark.asyncio
    async def test_existing_conversation_returned(self):
        db = AsyncMock()
        existing_conv = MagicMock()
        existing_conv.id = "conv-existing"
        existing_conv.title = "existing conversation"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing_conv
        db.execute.return_value = mock_result

        result = await AIService._get_or_create_conversation(db, "user-1", "conv-existing", "hello")

        assert result is existing_conv
        assert result.id == "conv-existing"

    @pytest.mark.asyncio
    async def test_new_conversation_created(self):
        db = AsyncMock()

        first_result = MagicMock()
        first_result.scalar_one_or_none.return_value = None
        db.execute.return_value = first_result

        new_conv = MagicMock()
        new_conv.id = "conv-new"
        new_conv.title = "新会话1 [2025-01-01 00:00:00]"

        db.add = MagicMock()
        db.commit = AsyncMock()

        async def mock_refresh(obj):
            obj.id = "conv-new"

        db.refresh = AsyncMock(side_effect=mock_refresh)

        with patch.object(AIService, "_get_next_session_number", new_callable=AsyncMock, return_value=1) as _:
            with patch("app.services.ai.AIConversation") as MockConvClass:
                MockConvClass.return_value = new_conv
                result = await AIService._get_or_create_conversation(db, "user-1", None, "hello")

                assert result.id == "conv-new"
                MockConvClass.assert_called_once()
                call_kwargs = MockConvClass.call_args
                assert call_kwargs.kwargs["user_id"] == "user-1"
                assert "新会话" in call_kwargs.kwargs["title"]

    @pytest.mark.asyncio
    async def test_no_conversation_id_creates_new(self):
        db = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result

        new_conv = MagicMock()
        new_conv.id = "conv-new-2"

        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        with patch.object(AIService, "_get_next_session_number", new_callable=AsyncMock, return_value=1):
            with patch("app.services.ai.AIConversation") as MockConvClass:
                MockConvClass.return_value = new_conv
                result = await AIService._get_or_create_conversation(db, "user-1", None, "hello")

                assert result is new_conv


class TestGetConversations:
    @pytest.mark.asyncio
    async def test_returns_conversation_schema_list(self):
        db = AsyncMock()

        conv = MagicMock()
        conv.id = "conv-1"
        conv.title = "test conversation"
        conv.module = "course"
        conv.created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
        conv.updated_at = datetime(2025, 1, 2, tzinfo=timezone.utc)

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [conv]
        db.execute.return_value = mock_result

        result = await AIService.get_conversations(db, "user-1")

        assert len(result) == 1
        assert result[0].id == "conv-1"
        assert result[0].title == "test conversation"
        assert result[0].module == "course"

    @pytest.mark.asyncio
    async def test_empty_conversations(self):
        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        db.execute.return_value = mock_result

        result = await AIService.get_conversations(db, "user-1")

        assert result == []


class TestGetConversationMessages:
    @pytest.mark.asyncio
    async def test_returns_messages(self):
        db = AsyncMock()

        conv = MagicMock()
        conv.id = "conv-1"
        conv.user_id = "user-1"

        first_result = MagicMock()
        first_result.scalar_one_or_none.return_value = conv

        msg = MagicMock()
        msg.id = "msg-1"
        msg.conversation_id = "conv-1"
        msg.role = "user"
        msg.content = "hello"
        msg.tool_calls = None
        msg.tool_call_id = None
        msg.module_tag = None
        msg.created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)

        second_result = MagicMock()
        second_result.scalars.return_value.all.return_value = [msg]

        db.execute.side_effect = [first_result, second_result]

        result = await AIService.get_conversation_messages(db, "conv-1", "user-1")

        assert len(result.data) == 1
        assert result.data[0].id == "msg-1"
        assert result.data[0].role == "user"

    @pytest.mark.asyncio
    async def test_nonexistent_conversation_returns_empty(self):
        db = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result

        result = await AIService.get_conversation_messages(db, "nonexistent", "user-1")

        assert result.data == []


class TestDeleteConversation:
    @pytest.mark.asyncio
    async def test_success_returns_true(self):
        db = AsyncMock()

        conv = MagicMock()
        conv.soft_delete = MagicMock()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = conv
        db.execute.return_value = mock_result
        db.commit = AsyncMock()

        result = await AIService.delete_conversation(db, "conv-1", "user-1")

        assert result is True
        conv.soft_delete.assert_called_once()
        db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_not_found_returns_false(self):
        db = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result

        result = await AIService.delete_conversation(db, "nonexistent", "user-1")

        assert result is False


class TestRenameConversation:
    @pytest.mark.asyncio
    async def test_success_returns_true(self):
        db = AsyncMock()

        conv = MagicMock()
        conv.title = "old title"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = conv
        db.execute.return_value = mock_result
        db.commit = AsyncMock()

        result = await AIService.rename_conversation(db, "conv-1", "user-1", "new title")

        assert result is True
        assert conv.title == "new title"

    @pytest.mark.asyncio
    async def test_not_found_returns_false(self):
        db = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result

        result = await AIService.rename_conversation(db, "nonexistent", "user-1", "new title")

        assert result is False

    @pytest.mark.asyncio
    async def test_title_truncated_to_100_chars(self):
        db = AsyncMock()

        conv = MagicMock()
        conv.title = "old"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = conv
        db.execute.return_value = mock_result
        db.commit = AsyncMock()

        long_title = "x" * 200
        result = await AIService.rename_conversation(db, "conv-1", "user-1", long_title)

        assert result is True
        assert conv.title == "x" * 100


class TestChat:
    @pytest.mark.asyncio
    async def test_raises_value_error_no_api_key(self):
        db = AsyncMock()
        request = MagicMock()
        request.conversation_id = None
        request.message = "hello"
        request.module = None
        request.stream = False

        with patch("app.services.ai_config.AIConfigService.get_effective_config", new_callable=AsyncMock, return_value=None):
            with pytest.raises(ValueError, match="NO_API_KEY"):
                await AIService.chat(db, "user-1", request, stream=False)


class TestNonStreamChat:
    @pytest.mark.asyncio
    async def test_normal_response(self):
        db = AsyncMock()
        conversation = MagicMock()
        conversation.id = "conv-1"

        messages = [{"role": "system", "content": "prompt"}, {"role": "user", "content": "hello"}]
        effective_config = {
            "api_key": "test-key",
            "api_base": "https://api.test.com/v1",
            "model": "test-model",
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": "Hi there!",
                    "tool_calls": None,
                }
            }]
        }

        with patch("app.services.ai.httpx.AsyncClient") as MockClient:
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client_instance

            with patch.object(AIService, "_save_message", new_callable=AsyncMock) as _:
                result = await AIService._non_stream_chat(db, "user-1", conversation, messages, effective_config)

                assert result.message == "Hi there!"
                assert result.conversation_id == "conv-1"

    @pytest.mark.asyncio
    async def test_api_error_raises_value_error(self):
        db = AsyncMock()
        conversation = MagicMock()
        conversation.id = "conv-1"

        messages = [{"role": "system", "content": "prompt"}]
        effective_config = {
            "api_key": "test-key",
            "api_base": "https://api.test.com/v1",
            "model": "test-model",
        }

        mock_response = MagicMock()
        mock_response.status_code = 500

        with patch("app.services.ai.httpx.AsyncClient") as MockClient:
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client_instance

            with pytest.raises(ValueError, match="AI服务调用失败"):
                await AIService._non_stream_chat(db, "user-1", conversation, messages, effective_config)

    @pytest.mark.asyncio
    async def test_tool_calls_execution(self):
        db = AsyncMock()
        conversation = MagicMock()
        conversation.id = "conv-1"

        messages = [{"role": "system", "content": "prompt"},
            {"role": "user", "content": "list courses"}]
        effective_config = {
            "api_key": "test-key",
            "api_base": "https://api.test.com/v1",
            "model": "test-model",
        }

        tool_call_obj = {
            "id": "call_1",
            "function": {
                "name": "list_courses",
                "arguments": "{}",
            },
            "type": "function",
        }

        first_response = MagicMock()
        first_response.status_code = 200
        first_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": "",
                    "tool_calls": [tool_call_obj],
                }
            }]
        }

        second_response = MagicMock()
        second_response.status_code = 200
        second_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": "Here are your courses",
                    "tool_calls": None,
                }
            }]
        }

        with patch("app.services.ai.httpx.AsyncClient") as MockClient:
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(side_effect=[first_response, second_response])
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client_instance

            with patch.object(AIService, "_save_message", new_callable=AsyncMock) as _:
                with patch("app.services.ai.TOOL_EXECUTOR", {"list_courses": AsyncMock(return_value={"items": [], "total": 0})}) as _:
                    result = await AIService._non_stream_chat(db, "user-1", conversation, messages, effective_config)

                    assert result.message == "Here are your courses"
                    assert result.module_tag == "course"


class TestToolExecutor:
    def test_all_expected_tool_names_present(self):
        expected_tools = [
    "create_course",
    "list_courses",
    "get_course",
    "update_course",
    "delete_course",
    "create_student",
    "list_students",
    "get_student",
    "update_student",
    "delete_student",
    "get_dashboard_stats",
    "get_course_statistics",
    "get_student_statistics",
    "get_monthly_trends",
    "create_lesson_plan",
    "list_lesson_plans",
    "get_lesson_plan",
    "update_lesson_plan",
    "publish_lesson_plan",
    "delete_lesson_plan",
    "list_resources",
    "get_resource",
    "update_resource",
    "delete_resource",
    "list_notifications",
    "get_notification",
    "mark_notification_read",
    "mark_all_notifications_read",
    "delete_notification",
     ]
        for tool_name in expected_tools:
            assert tool_name in TOOL_EXECUTOR, f"Missing tool: {tool_name}"

    def test_tool_executor_count(self):
        assert len(TOOL_EXECUTOR) == 29

    def test_all_executors_are_async(self):
        import asyncio
        for name, func in TOOL_EXECUTOR.items():
            assert asyncio.iscoroutinefunction(func), f"{name} is not async"
