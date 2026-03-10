import os
import zipfile
import shutil
import chardet
from pathlib import Path
from typing import Dict, List, Any

SUPPORTED_EXTENSIONS = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".c": "c",
    ".h": "c",
    ".hpp": "cpp",
    ".ino": "cpp",
    ".cs": "csharp",
    ".rb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
    ".lua": "lua",
}

IGNORE_DIRS = {
    "node_modules", ".git", "__pycache__", ".pytest_cache",
    "dist", "build", ".next", "venv", ".env", "coverage",
    ".idea", ".vscode", "vendor", "target",
}

MAX_FILE_SIZE = 500 * 1024  # 500KB per file
MAX_FILES = 300


def extract_zip(zip_path: str, extract_to: str) -> str:
    """Extract zip and return the root directory."""
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_to)

    # Find the root directory (skip __MACOSX etc)
    entries = [
        e for e in os.listdir(extract_to)
        if not e.startswith("__") and not e.startswith(".")
    ]
    if len(entries) == 1 and os.path.isdir(os.path.join(extract_to, entries[0])):
        return os.path.join(extract_to, entries[0])
    return extract_to


def read_file_safe(filepath: str) -> str | None:
    """Read a file safely, detecting encoding."""
    try:
        size = os.path.getsize(filepath)
        if size > MAX_FILE_SIZE:
            return None
        with open(filepath, "rb") as f:
            raw = f.read()
        detected = chardet.detect(raw)
        encoding = detected.get("encoding") or "utf-8"
        return raw.decode(encoding, errors="replace")
    except Exception:
        return None


def scan_directory(root_dir: str) -> Dict[str, Any]:
    """
    Scan directory and return structured file data.
    Returns: { files, language_stats, file_tree, total_files, total_lines }
    """
    files = []
    language_stats: Dict[str, int] = {}
    file_tree = []
    total_lines = 0
    file_count = 0

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Prune ignored directories
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]

        rel_dir = os.path.relpath(dirpath, root_dir)

        for filename in sorted(filenames):
            if file_count >= MAX_FILES:
                break

            ext = Path(filename).suffix.lower()
            lang = SUPPORTED_EXTENSIONS.get(ext)
            if not lang:
                continue

            abs_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(abs_path, root_dir)

            content = read_file_safe(abs_path)
            if content is None:
                continue

            lines = content.splitlines()
            line_count = len(lines)
            total_lines += line_count

            language_stats[lang] = language_stats.get(lang, 0) + 1

            file_data = {
                "path": rel_path,
                "name": filename,
                "language": lang,
                "extension": ext,
                "content": content,
                "line_count": line_count,
                "size": os.path.getsize(abs_path),
            }
            files.append(file_data)
            file_count += 1

    return {
        "files": files,
        "language_stats": language_stats,
        "total_files": file_count,
        "total_lines": total_lines,
        "root_dir": root_dir,
    }
