import re
import string

import pytest

from app.core.config_validator import (
    ConfigValidationError,
    ConfigValidator,
    check_config_security,
)
from app.core.config import settings


class TestValidateSecretKey:
    def test_short_key_returns_error(self):
        valid, errors = ConfigValidator.validate_secret_key("short")
        assert valid is False
        assert any("长度不足" in e for e in errors)

    def test_weak_pattern_password(self):
        valid, errors = ConfigValidator.validate_secret_key("password")
        assert valid is False
        assert any("弱密钥模式" in e for e in errors)

    def test_weak_pattern_secret(self):
        valid, errors = ConfigValidator.validate_secret_key("secret")
        assert valid is False
        assert any("弱密钥模式" in e for e in errors)

    def test_weak_pattern_123456(self):
        valid, errors = ConfigValidator.validate_secret_key("123456")
        assert valid is False
        assert any("弱密钥模式" in e for e in errors)

    def test_weak_pattern_qwerty(self):
        valid, errors = ConfigValidator.validate_secret_key("qwerty")
        assert valid is False
        assert any("弱密钥模式" in e for e in errors)

    def test_weak_pattern_admin(self):
        valid, errors = ConfigValidator.validate_secret_key("admin")
        assert valid is False
        assert any("弱密钥模式" in e for e in errors)

    def test_weak_pattern_change(self):
        valid, errors = ConfigValidator.validate_secret_key("change")
        assert valid is False
        assert any("弱密钥模式" in e for e in errors)

    def test_weak_pattern_default(self):
        valid, errors = ConfigValidator.validate_secret_key("default")
        assert valid is False
        assert any("弱密钥模式" in e for e in errors)

    def test_weak_pattern_test(self):
        valid, errors = ConfigValidator.validate_secret_key("test")
        assert valid is False
        assert any("弱密钥模式" in e for e in errors)

    def test_weak_pattern_example(self):
        valid, errors = ConfigValidator.validate_secret_key("example")
        assert valid is False
        assert any("弱密钥模式" in e for e in errors)

    def test_low_entropy_only_lowercase(self):
        key = "a" * 40
        valid, errors = ConfigValidator.validate_secret_key(key)
        assert valid is False
        assert any("复杂度不足" in e for e in errors)

    def test_low_entropy_only_digits(self):
        key = "1" * 40
        valid, errors = ConfigValidator.validate_secret_key(key)
        assert valid is False
        assert any("复杂度不足" in e for e in errors)

    def test_low_entropy_two_categories(self):
        key = "ab12" * 10
        valid, errors = ConfigValidator.validate_secret_key(key)
        assert valid is False
        assert any("复杂度不足" in e for e in errors)

    def test_valid_key_with_three_categories(self):
        key = "Ab1" * 15
        valid, errors = ConfigValidator.validate_secret_key(key)
        assert valid is True
        assert errors == []

    def test_valid_key_with_all_categories(self):
        key = "Aa1!Bb2@Cc3#Dd4$Ee5%Ff6^Gg7&Hh8*Ij9("
        valid, errors = ConfigValidator.validate_secret_key(key)
        assert valid is True
        assert errors == []

    def test_key_with_weak_substring_still_passes(self):
        key = "MyPassword!2345678901234567890Xy"
        valid, errors = ConfigValidator.validate_secret_key(key)
        assert valid is True

    def test_min_length_boundary(self):
        key = "Aa1!" * 8
        valid, errors = ConfigValidator.validate_secret_key(key)
        assert valid is True

    def test_one_char_below_min_length(self):
        key = "Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!A"
        valid, errors = ConfigValidator.validate_secret_key(key)
        assert valid is False
        assert any("长度不足" in e for e in errors)


class TestValidateDatabaseUrl:
    def test_weak_password_password(self):
        valid, errors = ConfigValidator.validate_database_url(
            "postgresql://user:password@localhost/db"
        )
        assert valid is False
        assert any("password" in e for e in errors)

    def test_weak_password_123456(self):
        valid, errors = ConfigValidator.validate_database_url(
            "postgresql://user:123456@localhost/db"
        )
        assert valid is False
        assert any("123456" in e for e in errors)

    def test_weak_password_admin(self):
        valid, errors = ConfigValidator.validate_database_url(
            "postgresql://user:admin@localhost/db"
        )
        assert valid is False
        assert any("admin" in e for e in errors)

    def test_weak_password_postgres(self):
        valid, errors = ConfigValidator.validate_database_url(
            "postgresql://user:postgres@localhost/db"
        )
        assert valid is False
        assert any("postgres" in e for e in errors)

    def test_weak_password_changeme(self):
        valid, errors = ConfigValidator.validate_database_url(
            "postgresql://user:changeme@localhost/db"
        )
        assert valid is False
        assert any("changeme" in e for e in errors)

    def test_missing_ssl_postgresql(self):
        valid, errors = ConfigValidator.validate_database_url(
            "postgresql://user:StrongP@ss!@localhost/db"
        )
        assert valid is False
        assert any("postgres" in e for e in errors)

    def test_with_ssl_postgresql(self):
        valid, errors = ConfigValidator.validate_database_url(
            "postgresql://user:StrongP@ss!@localhost/db?sslmode=require"
        )
        assert valid is False
        assert any("postgres" in e for e in errors)

    def test_sqlite_url_no_ssl_check(self):
        valid, errors = ConfigValidator.validate_database_url(
            "sqlite+aiosqlite:///./test.db"
        )
        assert valid is True
        assert errors == []

    def test_multiple_weak_passwords(self):
        valid, errors = ConfigValidator.validate_database_url(
            "postgresql://admin:admin@localhost/db"
        )
        assert valid is False
        assert len(errors) >= 2


class TestValidateProductionSettings:
    def test_debug_true_raises_error(self, monkeypatch):
        monkeypatch.setattr(settings, "DEBUG", True)
        monkeypatch.setattr(settings, "SECRET_KEY", "Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!")
        monkeypatch.setattr(
            settings,
            "DATABASE_URL",
            "sqlite+aiosqlite:///./test.db",
        )
        with pytest.raises(ConfigValidationError, match="DEBUG"):
            ConfigValidator.validate_production_settings()

    def test_weak_secret_key_raises_error(self, monkeypatch):
        monkeypatch.setattr(settings, "DEBUG", False)
        monkeypatch.setattr(settings, "SECRET_KEY", "password")
        monkeypatch.setattr(
            settings,
            "DATABASE_URL",
            "sqlite+aiosqlite:///./test.db",
        )
        with pytest.raises(ConfigValidationError, match="SECRET_KEY"):
            ConfigValidator.validate_production_settings()

    def test_weak_db_password_raises_error(self, monkeypatch):
        monkeypatch.setattr(settings, "DEBUG", False)
        monkeypatch.setattr(settings, "SECRET_KEY", "Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!")
        monkeypatch.setattr(
            settings,
            "DATABASE_URL",
            "postgresql://user:password@localhost/db?sslmode=require",
        )
        with pytest.raises(ConfigValidationError, match="数据库密码"):
            ConfigValidator.validate_production_settings()

    def test_weak_minio_access_key_raises_error(self, monkeypatch):
        monkeypatch.setattr(settings, "DEBUG", False)
        monkeypatch.setattr(settings, "SECRET_KEY", "Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!")
        monkeypatch.setattr(
            settings,
            "DATABASE_URL",
            "sqlite+aiosqlite:///./test.db",
        )
        monkeypatch.setattr(settings, "MINIO_ACCESS_KEY", "minioadmin")
        with pytest.raises(ConfigValidationError, match="MinIO Access Key"):
            ConfigValidator.validate_production_settings()

    def test_weak_minio_secret_key_raises_error(self, monkeypatch):
        monkeypatch.setattr(settings, "DEBUG", False)
        monkeypatch.setattr(settings, "SECRET_KEY", "Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!")
        monkeypatch.setattr(
            settings,
            "DATABASE_URL",
            "sqlite+aiosqlite:///./test.db",
        )
        monkeypatch.setattr(settings, "MINIO_ACCESS_KEY", "strongaccesskey")
        monkeypatch.setattr(settings, "MINIO_SECRET_KEY", "password")
        with pytest.raises(ConfigValidationError, match="MinIO Secret Key"):
            ConfigValidator.validate_production_settings()

    def test_valid_production_settings_passes(self, monkeypatch):
        monkeypatch.setattr(settings, "DEBUG", False)
        monkeypatch.setattr(settings, "SECRET_KEY", "Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!")
        monkeypatch.setattr(
            settings,
            "DATABASE_URL",
            "sqlite+aiosqlite:///./test.db",
        )
        monkeypatch.setattr(settings, "MINIO_ACCESS_KEY", "strongaccesskey")
        monkeypatch.setattr(settings, "MINIO_SECRET_KEY", "strongsecretkey123!")
        ConfigValidator.validate_production_settings()


class TestValidateDevelopmentSettings:
    def test_weak_key_only_warns(self, monkeypatch):
        monkeypatch.setattr(settings, "SECRET_KEY", "password")
        ConfigValidator.validate_development_settings()

    def test_valid_key_no_warning(self, monkeypatch):
        monkeypatch.setattr(settings, "SECRET_KEY", "Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!")
        ConfigValidator.validate_development_settings()


class TestGenerateSecureSecretKey:
    def test_default_length(self):
        key = ConfigValidator.generate_secure_secret_key()
        assert len(key) == 64

    def test_custom_length(self):
        key = ConfigValidator.generate_secure_secret_key(length=32)
        assert len(key) == 32

    def test_randomness(self):
        key1 = ConfigValidator.generate_secure_secret_key()
        key2 = ConfigValidator.generate_secure_secret_key()
        assert key1 != key2

    def test_contains_expected_characters(self):
        alphabet = set(string.ascii_letters + string.digits + string.punctuation)
        key = ConfigValidator.generate_secure_secret_key(length=256)
        for ch in key:
            assert ch in alphabet


class TestCheckConfigSecurity:
    def test_debug_enabled_returns_issues(self, monkeypatch):
        monkeypatch.setattr(settings, "DEBUG", True)
        monkeypatch.setattr(settings, "SECRET_KEY", "Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!")
        monkeypatch.setattr(
            settings,
            "DATABASE_URL",
            "sqlite+aiosqlite:///./test.db",
        )
        is_secure, issues = check_config_security()
        assert is_secure is False
        assert any("DEBUG" in i for i in issues)

    def test_weak_secret_key_returns_issues(self, monkeypatch):
        monkeypatch.setattr(settings, "DEBUG", False)
        monkeypatch.setattr(settings, "SECRET_KEY", "password")
        monkeypatch.setattr(
            settings,
            "DATABASE_URL",
            "sqlite+aiosqlite:///./test.db",
        )
        is_secure, issues = check_config_security()
        assert is_secure is False
        assert len(issues) > 0

    def test_weak_db_password_returns_issues(self, monkeypatch):
        monkeypatch.setattr(settings, "DEBUG", False)
        monkeypatch.setattr(settings, "SECRET_KEY", "Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!")
        monkeypatch.setattr(
            settings,
            "DATABASE_URL",
            "postgresql://user:password@localhost/db",
        )
        is_secure, issues = check_config_security()
        assert is_secure is False
        assert any("数据库密码" in i for i in issues)

    def test_secure_config_returns_true(self, monkeypatch):
        monkeypatch.setattr(settings, "DEBUG", False)
        monkeypatch.setattr(settings, "SECRET_KEY", "Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!")
        monkeypatch.setattr(
            settings,
            "DATABASE_URL",
            "sqlite+aiosqlite:///./test.db",
        )
        is_secure, issues = check_config_security()
        assert is_secure is True
        assert issues == []

    def test_returns_tuple(self, monkeypatch):
        monkeypatch.setattr(settings, "DEBUG", False)
        monkeypatch.setattr(settings, "SECRET_KEY", "Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!")
        monkeypatch.setattr(
            settings,
            "DATABASE_URL",
            "sqlite+aiosqlite:///./test.db",
        )
        result = check_config_security()
        assert isinstance(result, tuple)
        assert len(result) == 2
        assert isinstance(result[0], bool)
        assert isinstance(result[1], list)
