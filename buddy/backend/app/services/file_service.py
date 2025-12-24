import uuid

# In-memory store for files (as in the original code)
FILE_STORE = {}

def save_file(content: str, filename: str) -> str:
    fid = str(uuid.uuid4())
    FILE_STORE[fid] = {"content": content, "filename": filename}
    return fid

def get_file_content(file_id: str) -> str:
    if file_id in FILE_STORE:
        return FILE_STORE[file_id]["content"]
    return None
