from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.database import Base, close_db, get_async_session, get_sync_session, init_db


class TestBase:
    def test_tablename_auto_generation(self):
        from sqlalchemy import String
        from sqlalchemy.orm import Mapped, mapped_column

        class TestModel(Base):
            __abstract__ = True
            id: Mapped[str] = mapped_column(String(36), primary_key=True)

        assert TestModel.__tablename__ == "testmodel"

    def test_tablename_lowercase(self):
        from sqlalchemy import String
        from sqlalchemy.orm import Mapped, mapped_column

        class MyCustomModel(Base):
            __abstract__ = True
            id: Mapped[str] = mapped_column(String(36), primary_key=True)

        assert MyCustomModel.__tablename__ == "mycustommodel"

    def test_repr(self):
        instance = Base.__new__(Base)
        instance.__dict__ = {"id": "123", "name": "test", "_sa_instance_state": "hidden"}
        repr_str = repr(instance)
        assert "id=123" in repr_str
        assert "name=test" in repr_str
        assert "_sa_instance_state" not in repr_str
        assert "Base(" in repr_str


class TestGetAsyncSession:
    @pytest.mark.asyncio
    async def test_yields_session(self):
        mock_session = AsyncMock()
        mock_session.close = AsyncMock()

        with patch("app.core.database.AsyncSessionLocal") as mock_factory:
            mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_factory.return_value.__aexit__ = AsyncMock(return_value=False)

            gen = get_async_session()
            session = await gen.__anext__()
            assert session is mock_session

    @pytest.mark.asyncio
    async def test_exception_triggers_rollback(self):
        mock_session = AsyncMock()
        mock_session.rollback = AsyncMock()
        mock_session.close = AsyncMock()

        with patch("app.core.database.AsyncSessionLocal") as mock_factory:
            mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_factory.return_value.__aexit__ = AsyncMock(return_value=False)

            gen = get_async_session()
            await gen.__anext__()

            with pytest.raises(ValueError):
                try:
                    raise ValueError("test error")
                except ValueError:
                    mock_session.rollback.assert_not_called()
                    raise

            await mock_session.rollback()


class TestGetSyncSession:
    def test_yields_session(self):
        mock_session = MagicMock()
        mock_session.commit = MagicMock()

        with patch("app.core.database.SyncSessionLocal") as mock_factory:
            mock_factory.return_value = mock_session

            gen = get_sync_session()
            session = next(gen)
            assert session is mock_session

    def test_exception_triggers_rollback(self):
        mock_session = MagicMock()
        mock_session.rollback = MagicMock()
        mock_session.commit = MagicMock()

        with patch("app.core.database.SyncSessionLocal") as mock_factory:
            mock_factory.return_value = mock_session

            gen = get_sync_session()
            next(gen)

            mock_session.commit.side_effect = Exception("db error")
            with pytest.raises(Exception, match="db error"):
                try:
                    next(gen)
                except StopIteration:
                    pass


class TestInitDb:
    @pytest.mark.asyncio
    async def test_creates_tables(self):
        mock_conn = AsyncMock()

        def run_sync_side_effect(fn):
            return fn(MagicMock())

        mock_conn.run_sync = AsyncMock(side_effect=run_sync_side_effect)

        with patch("app.core.database.async_engine") as mock_engine:
            mock_engine.begin = MagicMock()
            mock_engine.begin.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_engine.begin.return_value.__aexit__ = AsyncMock(return_value=False)

            with patch.dict(
                "sys.modules",
                {
                    "app.models.user": MagicMock(),
                    "app.models.permission": MagicMock(),
                    "app.models.course": MagicMock(),
                    "app.models.student": MagicMock(),
                    "app.models.portfolio": MagicMock(),
                    "app.models.resource": MagicMock(),
                    "app.models.tag": MagicMock(),
                    "app.models.notification": MagicMock(),
                    "app.models.audit_log": MagicMock(),
                    "app.models.lesson_plan": MagicMock(),
                    "app.models.dropdown_option": MagicMock(),
                    "app.models.ai": MagicMock(),
                    "app.models.ai_config": MagicMock(),
                },
            ):
                await init_db()
                mock_conn.run_sync.assert_called_once()


class TestCloseDb:
    @pytest.mark.asyncio
    async def test_disposes_engine(self):
        with patch("app.core.database.async_engine") as mock_engine:
            mock_engine.dispose = AsyncMock()
            await close_db()
            mock_engine.dispose.assert_called_once()
