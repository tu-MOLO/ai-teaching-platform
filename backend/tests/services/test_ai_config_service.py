from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.ai_config import AIConfigService


class TestGetUserConfig:
    @pytest.mark.asyncio
    async def test_with_existing_config(self):
        db = AsyncMock()

        config = MagicMock()
        config.provider = "openai"
        config.provider_name = "OpenAI"
        config.api_base = "https://api.openai.com/v1"
        config.model = "gpt-4o"
        config.api_key_encrypted = "encrypted_key_data"
        config.is_active = True

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = config
        db.execute.return_value = mock_result

        with patch("app.services.ai_config.decrypt_api_key", return_value="sk-real-key") as mock_decrypt, \
             patch("app.services.ai_config.mask_api_key", return_value="sk-r****-key") as mock_mask:
            result = await AIConfigService.get_user_config(db, "user-1")

            mock_decrypt.assert_called_once_with("encrypted_key_data")
            mock_mask.assert_called_once_with("sk-real-key")
            assert result.provider == "openai"
            assert result.api_key == "sk-r****-key"
            assert result.is_user_configured is True

    @pytest.mark.asyncio
    async def test_without_config_returns_defaults(self):
        db = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result

        with patch("app.services.ai_config.settings") as mock_settings:
            mock_settings.BIGMODEL_API_BASE = "https://open.bigmodel.cn/api/paas/v4"
            mock_settings.BIGMODEL_MODEL = "glm-4.7-flash"
            mock_settings.BIGMODEL_API_KEY = "global-api-key"

            with patch("app.services.ai_config.mask_api_key", return_value="glob****key"):
                result = await AIConfigService.get_user_config(db, "user-1")

                assert result.provider == "zhipu"
                assert result.is_user_configured is False
                assert result.is_active is True

    @pytest.mark.asyncio
    async def test_existing_config_no_encrypted_key(self):
        db = AsyncMock()

        config = MagicMock()
        config.provider = "deepseek"
        config.provider_name = "DeepSeek"
        config.api_base = "https://api.deepseek.com/v1"
        config.model = "deepseek-chat"
        config.api_key_encrypted = None
        config.is_active = True

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = config
        db.execute.return_value = mock_result

        result = await AIConfigService.get_user_config(db, "user-1")

        assert result.provider == "deepseek"
        assert result.api_key is None
        assert result.is_user_configured is True


class TestSaveConfig:
    @pytest.mark.asyncio
    async def test_creates_new_config(self):
        db = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result
        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        config_update = MagicMock()
        config_update.provider = "openai"
        config_update.provider_name = "OpenAI"
        config_update.api_base = "https://api.openai.com/v1"
        config_update.model = "gpt-4o"
        config_update.api_key = "sk-new-key"

        with patch("app.services.ai_config.encrypt_api_key", return_value="encrypted_new_key") as mock_encrypt, \
             patch.object(AIConfigService, "get_user_config", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(provider="openai", is_user_configured=True)
            await AIConfigService.save_config(db, "user-1", config_update)

            mock_encrypt.assert_called_once_with("sk-new-key")
            db.add.assert_called_once()
            db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_updates_existing_config(self):
        db = AsyncMock()

        existing_config = MagicMock()
        existing_config.provider = "zhipu"
        existing_config.provider_name = None
        existing_config.api_base = "https://open.bigmodel.cn/api/paas/v4"
        existing_config.model = "glm-4.7-flash"
        existing_config.api_key_encrypted = None

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing_config
        db.execute.return_value = mock_result
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        config_update = MagicMock()
        config_update.provider = "deepseek"
        config_update.provider_name = "DeepSeek"
        config_update.api_base = "https://api.deepseek.com/v1"
        config_update.model = "deepseek-chat"
        config_update.api_key = "ds-new-key"

        with patch("app.services.ai_config.encrypt_api_key", return_value="encrypted_ds_key"), \
             patch.object(AIConfigService, "get_user_config", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(provider="deepseek")
            await AIConfigService.save_config(db, "user-1", config_update)

            assert existing_config.provider == "deepseek"
            assert existing_config.provider_name == "DeepSeek"
            assert existing_config.api_base == "https://api.deepseek.com/v1"
            assert existing_config.model == "deepseek-chat"

    @pytest.mark.asyncio
    async def test_empty_api_key_sets_none(self):
        db = AsyncMock()

        existing_config = MagicMock()
        existing_config.provider = "zhipu"
        existing_config.provider_name = None
        existing_config.api_base = "https://open.bigmodel.cn/api/paas/v4"
        existing_config.model = "glm-4.7-flash"
        existing_config.api_key_encrypted = "old_encrypted"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing_config
        db.execute.return_value = mock_result
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        config_update = MagicMock()
        config_update.provider = None
        config_update.provider_name = None
        config_update.api_base = None
        config_update.model = None
        config_update.api_key = ""

        with patch.object(AIConfigService, "get_user_config", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(provider="zhipu")
            await AIConfigService.save_config(db, "user-1", config_update)

            assert existing_config.api_key_encrypted is None

    @pytest.mark.asyncio
    async def test_encrypts_api_key(self):
        db = AsyncMock()

        existing_config = MagicMock()
        existing_config.provider = "zhipu"
        existing_config.provider_name = None
        existing_config.api_base = "https://open.bigmodel.cn/api/paas/v4"
        existing_config.model = "glm-4.7-flash"
        existing_config.api_key_encrypted = None

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing_config
        db.execute.return_value = mock_result
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        config_update = MagicMock()
        config_update.provider = None
        config_update.provider_name = None
        config_update.api_base = None
        config_update.model = None
        config_update.api_key = "my-secret-key"

        with patch("app.services.ai_config.encrypt_api_key", return_value="encrypted_secret") as mock_encrypt, \
             patch.object(AIConfigService, "get_user_config", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(provider="zhipu")
            await AIConfigService.save_config(db, "user-1", config_update)

            mock_encrypt.assert_called_once_with("my-secret-key")
            assert existing_config.api_key_encrypted == "encrypted_secret"


class TestResetConfig:
    @pytest.mark.asyncio
    async def test_deletes_config_returns_defaults(self):
        db = AsyncMock()

        config = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = config
        db.execute.return_value = mock_result
        db.delete = AsyncMock()
        db.commit = AsyncMock()

        with patch.object(AIConfigService, "get_user_config", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(provider="zhipu", is_user_configured=False)
            result = await AIConfigService.reset_config(db, "user-1")

            db.delete.assert_called_once_with(config)
            db.commit.assert_awaited_once()
            assert result.is_user_configured is False

    @pytest.mark.asyncio
    async def test_no_config_still_returns_defaults(self):
        db = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result

        with patch.object(AIConfigService, "get_user_config", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(provider="zhipu", is_user_configured=False)
            result = await AIConfigService.reset_config(db, "user-1")

            assert result.is_user_configured is False


class TestTestConnection:
    @pytest.mark.asyncio
    async def test_200_success(self):
        db = AsyncMock()
        test_request = MagicMock()
        test_request.api_key = "test-key"
        test_request.api_base = "https://api.test.com/v1"
        test_request.model = "test-model"

        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch("app.services.ai_config.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await AIConfigService.test_connection(db, "user-1", test_request)

            assert result.success is True
            assert "成功" in result.message

    @pytest.mark.asyncio
    async def test_429_rate_limit(self):
        db = AsyncMock()
        test_request = MagicMock()
        test_request.api_key = "test-key"
        test_request.api_base = "https://api.test.com/v1"
        test_request.model = "test-model"

        mock_response = MagicMock()
        mock_response.status_code = 429

        with patch("app.services.ai_config.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await AIConfigService.test_connection(db, "user-1", test_request)

            assert result.success is True
            assert "速率限制" in result.message

    @pytest.mark.asyncio
    async def test_401_auth_failure(self):
        db = AsyncMock()
        test_request = MagicMock()
        test_request.api_key = "bad-key"
        test_request.api_base = "https://api.test.com/v1"
        test_request.model = "test-model"

        mock_response = MagicMock()
        mock_response.status_code = 401

        with patch("app.services.ai_config.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await AIConfigService.test_connection(db, "user-1", test_request)

            assert result.success is False
            assert "认证失败" in result.message

    @pytest.mark.asyncio
    async def test_other_http_error(self):
        db = AsyncMock()
        test_request = MagicMock()
        test_request.api_key = "test-key"
        test_request.api_base = "https://api.test.com/v1"
        test_request.model = "test-model"

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {"error": {"message": "Internal Server Error"}}

        with patch("app.services.ai_config.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await AIConfigService.test_connection(db, "user-1", test_request)

            assert result.success is False
            assert "连接失败" in result.message

    @pytest.mark.asyncio
    async def test_timeout_exception(self):
        db = AsyncMock()
        test_request = MagicMock()
        test_request.api_key = "test-key"
        test_request.api_base = "https://api.test.com/v1"
        test_request.model = "test-model"

        with patch("app.services.ai_config.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await AIConfigService.test_connection(db, "user-1", test_request)

            assert result.success is False
            assert "超时" in result.message

    @pytest.mark.asyncio
    async def test_general_exception(self):
        db = AsyncMock()
        test_request = MagicMock()
        test_request.api_key = "test-key"
        test_request.api_base = "https://api.test.com/v1"
        test_request.model = "test-model"

        with patch("app.services.ai_config.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=Exception("connection refused"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await AIConfigService.test_connection(db, "user-1", test_request)

            assert result.success is False
            assert "连接失败" in result.message

    @pytest.mark.asyncio
    async def test_no_test_request_uses_effective_config(self):
        db = AsyncMock()

        with patch.object(AIConfigService, "get_effective_config", new_callable=AsyncMock) as mock_effective:
            mock_effective.return_value = {
                "api_key": "effective-key",
                "api_base": "https://effective.api/v1",
                "model": "effective-model",
            }

            mock_response = MagicMock()
            mock_response.status_code = 200

            with patch("app.services.ai_config.httpx.AsyncClient") as MockClient:
                mock_client = AsyncMock()
                mock_client.post = AsyncMock(return_value=mock_response)
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                MockClient.return_value = mock_client

                result = await AIConfigService.test_connection(db, "user-1", None)

                mock_effective.assert_awaited_once_with(db, "user-1")
                assert result.success is True

    @pytest.mark.asyncio
    async def test_no_api_key_returns_failure(self):
        db = AsyncMock()

        with patch.object(AIConfigService, "get_effective_config", new_callable=AsyncMock) as mock_effective:
            mock_effective.return_value = None

            result = await AIConfigService.test_connection(db, "user-1", None)

            assert result.success is False
            assert "未配置" in result.message


class TestGetEffectiveConfig:
    @pytest.mark.asyncio
    async def test_user_config_with_key(self):
        db = AsyncMock()

        config = MagicMock()
        config.api_key_encrypted = "encrypted_data"
        config.api_base = "https://api.openai.com/v1"
        config.model = "gpt-4o"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = config
        db.execute.return_value = mock_result

        with patch("app.services.ai_config.decrypt_api_key", return_value="sk-real-key") as mock_decrypt:
            result = await AIConfigService.get_effective_config(db, "user-1")

            mock_decrypt.assert_called_once_with("encrypted_data")
            assert result["api_key"] == "sk-real-key"
            assert result["api_base"] == "https://api.openai.com/v1"
            assert result["model"] == "gpt-4o"

    @pytest.mark.asyncio
    async def test_no_user_config_falls_back_to_global(self):
        db = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result

        with patch("app.services.ai_config.settings") as mock_settings:
            mock_settings.BIGMODEL_API_KEY = "global-key"
            mock_settings.BIGMODEL_API_BASE = "https://open.bigmodel.cn/api/paas/v4"
            mock_settings.BIGMODEL_MODEL = "glm-4.7-flash"

            result = await AIConfigService.get_effective_config(db, "user-1")

            assert result["api_key"] == "global-key"
            assert result["api_base"] == "https://open.bigmodel.cn/api/paas/v4"
            assert result["model"] == "glm-4.7-flash"

    @pytest.mark.asyncio
    async def test_no_key_at_all_returns_none(self):
        db = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result

        with patch("app.services.ai_config.settings") as mock_settings:
            mock_settings.BIGMODEL_API_KEY = ""

            result = await AIConfigService.get_effective_config(db, "user-1")

            assert result is None

    @pytest.mark.asyncio
    async def test_user_config_no_encrypted_key_falls_back(self):
        db = AsyncMock()

        config = MagicMock()
        config.api_key_encrypted = None
        config.api_base = "https://api.openai.com/v1"
        config.model = "gpt-4o"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = config
        db.execute.return_value = mock_result

        with patch("app.services.ai_config.settings") as mock_settings:
            mock_settings.BIGMODEL_API_KEY = "global-fallback-key"
            mock_settings.BIGMODEL_API_BASE = "https://open.bigmodel.cn/api/paas/v4"
            mock_settings.BIGMODEL_MODEL = "glm-4.7-flash"

            result = await AIConfigService.get_effective_config(db, "user-1")

            assert result["api_key"] == "global-fallback-key"
