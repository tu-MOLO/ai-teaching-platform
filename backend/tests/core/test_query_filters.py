import pytest

from app.core.query_filters import (
    OptimisticLockError,
    SoftDeleteFilter,
    check_version_and_update,
    include_deleted,
)


class TestSoftDeleteFilter:
    def test_default_enabled(self):
        SoftDeleteFilter.enable()
        assert SoftDeleteFilter.is_enabled() is True

    def test_disable(self):
        SoftDeleteFilter.disable()
        assert SoftDeleteFilter.is_enabled() is False
        SoftDeleteFilter.enable()

    def test_enable(self):
        SoftDeleteFilter.disable()
        SoftDeleteFilter.enable()
        assert SoftDeleteFilter.is_enabled() is True

    def test_is_enabled_returns_bool(self):
        result = SoftDeleteFilter.is_enabled()
        assert isinstance(result, bool)


class TestIncludeDeleted:
    def test_disables_filter_inside_context(self):
        SoftDeleteFilter.enable()
        with include_deleted():
            assert SoftDeleteFilter.is_enabled() is False
        assert SoftDeleteFilter.is_enabled() is True

    def test_re_enables_after_exception(self):
        SoftDeleteFilter.enable()
        with pytest.raises(RuntimeError):
            with include_deleted():
                assert SoftDeleteFilter.is_enabled() is False
                raise RuntimeError("test error")
        assert SoftDeleteFilter.is_enabled() is True

    def test_nested_context(self):
        SoftDeleteFilter.enable()
        with include_deleted():
            assert SoftDeleteFilter.is_enabled() is False
            with include_deleted():
                assert SoftDeleteFilter.is_enabled() is False
            assert SoftDeleteFilter.is_enabled() is False
        assert SoftDeleteFilter.is_enabled() is True


class TestOptimisticLockError:
    def test_default_message(self):
        err = OptimisticLockError()
        assert err.message == "数据已被其他用户修改，请刷新后重试"
        assert str(err) == "数据已被其他用户修改，请刷新后重试"

    def test_custom_message(self):
        err = OptimisticLockError(message="自定义消息")
        assert err.message == "自定义消息"

    def test_expected_version(self):
        err = OptimisticLockError(expected_version=3)
        assert err.expected_version == 3

    def test_actual_version(self):
        err = OptimisticLockError(actual_version=5)
        assert err.actual_version == 5

    def test_both_versions(self):
        err = OptimisticLockError(expected_version=3, actual_version=5)
        assert err.expected_version == 3
        assert err.actual_version == 5


class TestCheckVersionAndUpdate:
    def _make_model(self, version=1):
        model = type("FakeModel", (), {"version": version})()
        model.increment_version = lambda: setattr(model, "version", model.version + 1)
        return model

    def test_matching_version_updates_fields(self):
        model = self._make_model(version=2)
        model.name = "old"
        result = check_version_and_update(model, 2, {"name": "new"})
        assert result is True
        assert model.name == "new"

    def test_matching_version_increments_version(self):
        model = self._make_model(version=2)
        check_version_and_update(model, 2, {})
        assert model.version == 3

    def test_mismatched_version_raises_error(self):
        model = self._make_model(version=5)
        with pytest.raises(OptimisticLockError) as exc_info:
            check_version_and_update(model, 3, {})
        assert exc_info.value.expected_version == 3
        assert exc_info.value.actual_version == 5

    def test_update_only_existing_fields(self):
        model = self._make_model(version=1)
        model.name = "old"
        check_version_and_update(model, 1, {"name": "new", "nonexistent": "value"})
        assert model.name == "new"
        assert not hasattr(model, "nonexistent")

    def test_empty_update_data(self):
        model = self._make_model(version=1)
        result = check_version_and_update(model, 1, {})
        assert result is True
        assert model.version == 2
