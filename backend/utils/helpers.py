import uuid
import os


def generate_file_id() -> str:
    return str(uuid.uuid4())


def get_temp_path(file_id: str, original_filename: str) -> str:
    ext = os.path.splitext(original_filename)[1]
    return os.path.join("/tmp", f"{file_id}{ext}")


def clean_temp_file(file_path: str) -> None:
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"Failed to clean temp file {file_path}: {e}")