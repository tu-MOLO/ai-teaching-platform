from app.core.security import decrypt_api_key, encrypt_api_key, mask_api_key


class TestEncryptApiKey:
    def test_roundtrip_non_empty_string(self):
        original = "sk-abc123xyz456"
        encrypted = encrypt_api_key(original)
        assert encrypted != original
        decrypted = decrypt_api_key(encrypted)
        assert decrypted == original

    def test_roundtrip_long_key(self):
        original = "sk-proj-abcdefghijklmnopqrstuvwxyz0123456789ABCDEF"
        encrypted = encrypt_api_key(original)
        decrypted = decrypt_api_key(encrypted)
        assert decrypted == original

    def test_empty_string_returns_empty(self):
        encrypted = encrypt_api_key("")
        assert encrypted == ""

    def test_non_empty_string_returns_non_empty(self):
        encrypted = encrypt_api_key("some-key")
        assert encrypted != ""
        assert len(encrypted) > 0

    def test_different_inputs_different_outputs(self):
        enc1 = encrypt_api_key("key-one")
        enc2 = encrypt_api_key("key-two")
        assert enc1 != enc2


class TestDecryptApiKey:
    def test_roundtrip(self):
        original = "my-secret-key-12345"
        encrypted = encrypt_api_key(original)
        decrypted = decrypt_api_key(encrypted)
        assert decrypted == original

    def test_empty_string_returns_empty(self):
        decrypted = decrypt_api_key("")
        assert decrypted == ""

    def test_decrypt_preserves_special_chars(self):
        original = "key/with+special=chars&more!"
        encrypted = encrypt_api_key(original)
        decrypted = decrypt_api_key(encrypted)
        assert decrypted == original


class TestMaskApiKey:
    def test_short_key_returns_asterisks(self):
        assert mask_api_key("abc") == "****"

    def test_key_exactly_8_chars_returns_asterisks(self):
        assert mask_api_key("12345678") == "****"

    def test_long_key_masks_middle(self):
        result = mask_api_key("abcdefghijklmnop")
        assert result == "abcd****mnop"

    def test_long_key_preserves_first_and_last_four(self):
        key = "sk-proj-1234567890abcdef"
        result = mask_api_key(key)
        assert result.startswith("sk-p")
        assert result.endswith("cdef")
        assert "****" in result

    def test_empty_string_returns_asterisks(self):
        assert mask_api_key("") == "****"

    def test_key_9_chars(self):
        result = mask_api_key("123456789")
        assert result == "1234****6789"
