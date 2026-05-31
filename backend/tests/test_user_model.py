from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import bcrypt

from app.models.user import User, UserRole


def _make_user(**overrides) -> User:
    defaults = dict(
        email="test@example.com",
        username="testuser",
        hashed_password="irrelevant",
        security_question="pet name?",
        hashed_security_answer=bcrypt.hashpw(
            "Fluffy".encode(), bcrypt.gensalt()
        ).decode(),
        role=UserRole.TEACHER,
        login_count=0,
        failed_login_attempts=0,
        token_version=1,
        failed_reset_attempts=0,
    )
    defaults.update(overrides)
    return User(**defaults)


class TestIsLocked:
    def test_locked_until_in_future(self):
        user = _make_user(
            locked_until=datetime.now(timezone.utc) + timedelta(minutes=10)
        )
        assert user.is_locked() is True

    def test_locked_until_in_past(self):
        user = _make_user(
            locked_until=datetime.now(timezone.utc) - timedelta(minutes=10)
        )
        assert user.is_locked() is False

    def test_locked_until_is_none(self):
        user = _make_user(locked_until=None)
        assert user.is_locked() is False

    def test_locked_until_naive_datetime_future(self):
        user = _make_user(
            locked_until=datetime.now() + timedelta(minutes=10)
        )
        assert user.is_locked() is True

    def test_locked_until_naive_datetime_past(self):
        user = _make_user(
            locked_until=datetime.now(timezone.utc) - timedelta(hours=1)
        )
        assert user.is_locked() is False


class TestRecordLogin:
    def test_updates_last_login_at(self):
        user = _make_user()
        before = datetime.now(timezone.utc)
        user.record_login("127.0.0.1")
        assert user.last_login_at is not None
        assert user.last_login_at >= before

    def test_updates_last_login_ip(self):
        user = _make_user()
        user.record_login("192.168.1.1")
        assert user.last_login_ip == "192.168.1.1"

    def test_increments_login_count(self):
        user = _make_user(login_count=3)
        user.record_login()
        assert user.login_count == 4

    def test_resets_failed_login_attempts(self):
        user = _make_user(failed_login_attempts=4)
        user.record_login()
        assert user.failed_login_attempts == 0

    def test_resets_locked_until(self):
        user = _make_user(
            locked_until=datetime.now(timezone.utc) + timedelta(minutes=30)
        )
        user.record_login()
        assert user.locked_until is None

    def test_ip_address_defaults_to_none(self):
        user = _make_user()
        user.record_login()
        assert user.last_login_ip is None


class TestRecordFailedLogin:
    def test_increments_failed_login_attempts(self):
        user = _make_user(failed_login_attempts=2)
        user.record_failed_login()
        assert user.failed_login_attempts == 3

    def test_locks_after_five_attempts(self):
        user = _make_user(failed_login_attempts=4)
        user.record_failed_login()
        assert user.failed_login_attempts == 5
        assert user.locked_until is not None
        assert user.locked_until > datetime.now(timezone.utc)

    def test_does_not_lock_before_five_attempts(self):
        user = _make_user(failed_login_attempts=3)
        user.record_failed_login()
        assert user.failed_login_attempts == 4
        assert user.locked_until is None

    def test_lock_duration_is_thirty_minutes(self):
        user = _make_user(failed_login_attempts=4)
        before = datetime.now(timezone.utc)
        user.record_failed_login()
        expected_min = before + timedelta(minutes=30)
        assert user.locked_until >= expected_min - timedelta(seconds=5)

    def test_already_locked_still_increments(self):
        user = _make_user(failed_login_attempts=6)
        user.record_failed_login()
        assert user.failed_login_attempts == 7


class TestIncrementTokenVersion:
    def test_increments_by_one(self):
        user = _make_user(token_version=3)
        user.increment_token_version()
        assert user.token_version == 4

    def test_increments_from_default(self):
        user = _make_user(token_version=1)
        user.increment_token_version()
        assert user.token_version == 2


class TestIsResetLocked:
    def test_reset_locked_until_in_future(self):
        user = _make_user(
            reset_locked_until=datetime.now(timezone.utc) + timedelta(minutes=10)
        )
        assert user.is_reset_locked() is True

    def test_reset_locked_until_in_past(self):
        user = _make_user(
            reset_locked_until=datetime.now(timezone.utc) - timedelta(minutes=10)
        )
        assert user.is_reset_locked() is False

    def test_reset_locked_until_is_none(self):
        user = _make_user(reset_locked_until=None)
        assert user.is_reset_locked() is False


class TestRecordFailedResetAttempt:
    def test_increments_failed_reset_attempts(self):
        user = _make_user(failed_reset_attempts=2)
        user.record_failed_reset_attempt()
        assert user.failed_reset_attempts == 3

    def test_locks_after_five_attempts(self):
        user = _make_user(failed_reset_attempts=4)
        user.record_failed_reset_attempt()
        assert user.failed_reset_attempts == 5
        assert user.reset_locked_until is not None
        assert user.reset_locked_until > datetime.now(timezone.utc)

    def test_does_not_lock_before_five_attempts(self):
        user = _make_user(failed_reset_attempts=3)
        user.record_failed_reset_attempt()
        assert user.failed_reset_attempts == 4
        assert user.reset_locked_until is None


class TestResetResetLock:
    def test_resets_failed_reset_attempts(self):
        user = _make_user(failed_reset_attempts=5)
        user.reset_reset_lock()
        assert user.failed_reset_attempts == 0

    def test_resets_reset_locked_until(self):
        user = _make_user(
            reset_locked_until=datetime.now(timezone.utc) + timedelta(minutes=30)
        )
        user.reset_reset_lock()
        assert user.reset_locked_until is None


class TestVerifySecurityAnswer:
    def test_correct_answer(self):
        user = _make_user()
        with patch("app.core.security.verify_password", return_value=True) as mock_verify:
            assert user.verify_security_answer("Fluffy") is True
            mock_verify.assert_called_once_with("Fluffy", user.hashed_security_answer)

    def test_incorrect_answer(self):
        user = _make_user()
        with patch("app.core.security.verify_password", return_value=False) as mock_verify:
            assert user.verify_security_answer("Wrong") is False
            mock_verify.assert_called_once_with("Wrong", user.hashed_security_answer)
