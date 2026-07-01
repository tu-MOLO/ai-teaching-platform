import pytest

from app.services.storage import (
    _verify_magic_bytes,
    _verify_mime_type,
    generate_object_name,
    is_allowed_file,
)


class TestIsAllowedFile:
    def test_allowed_extension_pdf(self):
        assert is_allowed_file("document.pdf") is True

    def test_allowed_extension_doc(self):
        assert is_allowed_file("document.doc") is True

    def test_allowed_extension_docx(self):
        assert is_allowed_file("document.docx") is True

    def test_allowed_extension_txt(self):
        assert is_allowed_file("document.txt") is True

    def test_allowed_extension_md(self):
        assert is_allowed_file("document.md") is True

    def test_allowed_extension_jpg(self):
        assert is_allowed_file("photo.jpg") is True

    def test_allowed_extension_jpeg(self):
        assert is_allowed_file("photo.jpeg") is True

    def test_allowed_extension_png(self):
        assert is_allowed_file("photo.png") is True

    def test_allowed_extension_gif(self):
        assert is_allowed_file("photo.gif") is True

    def test_allowed_extension_mp4(self):
        assert is_allowed_file("video.mp4") is True

    def test_allowed_extension_mp3(self):
        assert is_allowed_file("audio.mp3") is True

    def test_disallowed_extension_exe(self):
        assert is_allowed_file("program.exe") is False

    def test_disallowed_extension_sh(self):
        assert is_allowed_file("script.sh") is False

    def test_disallowed_extension_py(self):
        assert is_allowed_file("script.py") is False

    def test_disallowed_extension_html(self):
        assert is_allowed_file("page.html") is False

    def test_disallowed_extension_js(self):
        assert is_allowed_file("script.js") is False

    def test_with_matching_content_pdf(self):
        content = b"%PDF-1.4 fake pdf content"
        assert is_allowed_file("document.pdf", content) is True

    def test_with_mismatched_content_pdf(self):
        content = b"not a pdf at all"
        assert is_allowed_file("document.pdf", content) is False

    def test_with_matching_content_jpg(self):
        content = b"\xff\xd8\xff\xe0" + b"\x00" * 28
        assert is_allowed_file("photo.jpg", content) is True

    def test_with_mismatched_content_jpg(self):
        content = b"not a jpg at all"
        assert is_allowed_file("photo.jpg", content) is False

    def test_with_matching_content_png(self):
        content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 24
        assert is_allowed_file("photo.png", content) is True

    def test_with_mismatched_content_png(self):
        content = b"not a png at all"
        assert is_allowed_file("photo.png", content) is False

    def test_with_matching_content_gif(self):
        content = b"GIF89a" + b"\x00" * 26
        assert is_allowed_file("photo.gif", content) is True

    def test_with_mismatched_content_gif(self):
        content = b"not a gif at all"
        assert is_allowed_file("photo.gif", content) is False

    def test_without_file_content_skips_magic_check(self):
        assert is_allowed_file("document.pdf") is True

    def test_case_insensitive_extension(self):
        assert is_allowed_file("document.PDF") is True


class TestVerifyMagicBytes:
    def test_pdf_magic(self):
        content = b"%PDF-1.4 fake pdf content here"
        assert _verify_magic_bytes(".pdf", content) is True

    def test_pdf_mismatched(self):
        content = b"not a pdf"
        assert _verify_magic_bytes(".pdf", content) is False

    def test_jpg_magic(self):
        content = b"\xff\xd8\xff\xe0" + b"\x00" * 28
        assert _verify_magic_bytes(".jpg", content) is True

    def test_jpeg_magic(self):
        content = b"\xff\xd8\xff\xe0" + b"\x00" * 28
        assert _verify_magic_bytes(".jpeg", content) is True

    def test_jpg_mismatched(self):
        content = b"not a jpg"
        assert _verify_magic_bytes(".jpg", content) is False

    def test_png_magic(self):
        content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 24
        assert _verify_magic_bytes(".png", content) is True

    def test_png_mismatched(self):
        content = b"not a png"
        assert _verify_magic_bytes(".png", content) is False

    def test_gif_magic(self):
        content = b"GIF89a" + b"\x00" * 26
        assert _verify_magic_bytes(".gif", content) is True

    def test_gif_mismatched(self):
        content = b"not a gif"
        assert _verify_magic_bytes(".gif", content) is False

    def test_doc_magic(self):
        content = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 24
        assert _verify_magic_bytes(".doc", content) is True

    def test_doc_mismatched(self):
        content = b"not a doc"
        assert _verify_magic_bytes(".doc", content) is False

    def test_docx_magic(self):
        content = b"PK\x03\x04" + b"\x00" * 28
        assert _verify_magic_bytes(".docx", content) is True

    def test_docx_mismatched(self):
        content = b"not a docx"
        assert _verify_magic_bytes(".docx", content) is False

    def test_mp3_id3_tag(self):
        content = b"ID3" + b"\x00" * 29
        assert _verify_magic_bytes(".mp3", content) is True

    def test_mp3_frame_sync_fffb(self):
        content = b"\xff\xfb" + b"\x00" * 30
        assert _verify_magic_bytes(".mp3", content) is True

    def test_mp3_frame_sync_fff3(self):
        content = b"\xff\xf3" + b"\x00" * 30
        assert _verify_magic_bytes(".mp3", content) is True

    def test_mp3_frame_sync_fff2(self):
        content = b"\xff\xf2" + b"\x00" * 30
        assert _verify_magic_bytes(".mp3", content) is True

    def test_mp3_mismatched(self):
        content = b"not an mp3"
        assert _verify_magic_bytes(".mp3", content) is True

    def test_mp4_magic(self):
        content = b"\x00\x00\x00\x20ftyp" + b"\x00" * 24
        assert _verify_magic_bytes(".mp4", content) is True

    def test_mp4_mismatched(self):
        content = b"\x00\x00\x00\x20xxxx" + b"\x00" * 24
        assert _verify_magic_bytes(".mp4", content) is False

    def test_txt_no_magic_check(self):
        content = b"any text content"
        assert _verify_magic_bytes(".txt", content) is True

    def test_md_no_magic_check(self):
        content = b"# markdown"
        assert _verify_magic_bytes(".md", content) is True


class TestVerifyMimeType:
    def test_matching_pdf(self):
        assert _verify_mime_type(".pdf", "document.pdf") is True

    def test_matching_jpg(self):
        assert _verify_mime_type(".jpg", "photo.jpg") is True

    def test_matching_png(self):
        assert _verify_mime_type(".png", "photo.png") is True

    def test_matching_docx(self):
        assert _verify_mime_type(".docx", "document.docx") is True

    def test_matching_txt(self):
        assert _verify_mime_type(".txt", "file.txt") is True

    def test_matching_md(self):
        assert _verify_mime_type(".md", "file.md") is True

    def test_unknown_extension_passes(self):
        assert _verify_mime_type(".xyz", "file.xyz") is True


class TestGenerateObjectName:
    def test_without_folder(self):
        result = generate_object_name("user123", "photo.jpg")
        assert result.startswith("user123/")
        assert result.endswith(".jpg")
        assert "/" in result

    def test_with_folder(self):
        result = generate_object_name("user123", "photo.jpg", folder="avatars")
        assert result.startswith("avatars/user123/")
        assert result.endswith(".jpg")

    def test_invalid_folder_name_special_chars(self):
        with pytest.raises(ValueError, match="Invalid folder name"):
            generate_object_name("user123", "photo.jpg", folder="bad folder!")

    def test_invalid_folder_name_dot(self):
        with pytest.raises(ValueError, match="Invalid folder name"):
            generate_object_name("user123", "photo.jpg", folder="bad.folder")

    def test_valid_folder_name_with_underscore(self):
        result = generate_object_name("user123", "photo.jpg", folder="my_folder")
        assert "my_folder/" in result

    def test_valid_folder_name_with_hyphen(self):
        result = generate_object_name("user123", "photo.jpg", folder="my-folder")
        assert "my-folder/" in result

    def test_preserves_extension(self):
        result = generate_object_name("user123", "document.pdf")
        assert result.endswith(".pdf")

    def test_generates_unique_names(self):
        name1 = generate_object_name("user123", "photo.jpg")
        name2 = generate_object_name("user123", "photo.jpg")
        assert name1 != name2
