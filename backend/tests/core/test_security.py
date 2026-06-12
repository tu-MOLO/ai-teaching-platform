from datetime import timedelta

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token,
)


class TestPasswordHashing:
    def test_hash_and_verify(self):
        password = "SecurePass123!"
        hashed = get_password_hash(password)
        assert hashed != password
        assert verify_password(password, hashed)

    def test_wrong_password(self):
        hashed = get_password_hash("SecurePass123!")
        assert not verify_password("WrongPassword", hashed)

    def test_hash_is_unique_per_call(self):
        password = "SecurePass123!"
        h1 = get_password_hash(password)
        h2 = get_password_hash(password)
        assert h1 != h2


class TestTokenCreation:
    def test_create_access_token(self):
        token = create_access_token(subject="user-1")
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_access_token_with_expiry(self):
        token = create_access_token(subject="user-1", expires_delta=timedelta(minutes=5))
        payload = decode_token(token)
        assert payload is not None
        assert payload.sub == "user-1"
        assert payload.type == "access"

    def test_create_access_token_with_version(self):
        token = create_access_token(subject="user-1", token_version="42")
        payload = decode_token(token)
        assert payload.jti == "42"

    def test_create_refresh_token(self):
        token = create_refresh_token(subject="user-1")
        payload = decode_token(token)
        assert payload is not None
        assert payload.sub == "user-1"
        assert payload.type == "refresh"

    def test_create_refresh_token_with_version(self):
        token = create_refresh_token(subject="user-1", token_version="7")
        payload = decode_token(token)
        assert payload.jti == "7"


class TestTokenDecoding:
    def test_decode_valid_token(self):
        token = create_access_token(subject="user-1")
        payload = decode_token(token)
        assert payload is not None
        assert payload.sub == "user-1"

    def test_decode_invalid_token(self):
        payload = decode_token("invalid.token.here")
        assert payload is None

    def test_decode_empty_token(self):
        payload = decode_token("")
        assert payload is None


class TestTokenVerification:
    def test_verify_valid_access_token(self):
        token = create_access_token(subject="user-1")
        user_id = verify_token(token, token_type="access")
        assert user_id == "user-1"

    def test_verify_wrong_type(self):
        token = create_access_token(subject="user-1")
        user_id = verify_token(token, token_type="refresh")
        assert user_id is None

    def test_verify_expired_token(self):
        token = create_access_token(subject="user-1", expires_delta=timedelta(seconds=-1))
        user_id = verify_token(token, token_type="access")
        assert user_id is None

    def test_verify_refresh_token(self):
        token = create_refresh_token(subject="user-1")
        user_id = verify_token(token, token_type="refresh")
        assert user_id == "user-1"