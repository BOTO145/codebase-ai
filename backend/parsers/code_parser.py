"""
Code parser: extracts functions, classes, imports, and relationships.
Uses regex-based parsing as a reliable cross-language approach.
"""
import re
from typing import Dict, List, Any, Optional


def parse_python(content: str, filepath: str) -> Dict[str, Any]:
    """Parse Python file for functions, classes, imports."""
    functions = []
    classes = []
    imports = []

    lines = content.splitlines()

    # Extract imports
    import_pattern = re.compile(r'^(?:from\s+([\w.]+)\s+import|import\s+([\w.,\s]+))', re.MULTILINE)
    for match in import_pattern.finditer(content):
        module = match.group(1) or match.group(2)
        if module:
            imports.append(module.strip().split(",")[0].strip())

    # Extract functions
    func_pattern = re.compile(r'^(\s*)def\s+(\w+)\s*\(([^)]*)\)', re.MULTILINE)
    for match in func_pattern.finditer(content):
        indent = len(match.group(1))
        name = match.group(2)
        params = match.group(3)
        line_num = content[:match.start()].count('\n') + 1

        # Get docstring
        rest = content[match.end():]
        docstring = ""
        doc_match = re.match(r'\s*:\s*\n\s+["\'"\'\'\'](.*?)["\'"\'\'\']\s*', rest, re.DOTALL)
        if doc_match:
            docstring = doc_match.group(1).strip()[:200]

        functions.append({
            "name": name,
            "params": params,
            "line": line_num,
            "indent_level": indent // 4,
            "docstring": docstring,
            "is_method": indent > 0,
        })

    # Extract classes
    class_pattern = re.compile(r'^class\s+(\w+)(?:\(([^)]*)\))?', re.MULTILINE)
    for match in class_pattern.finditer(content):
        name = match.group(1)
        bases = match.group(2) or ""
        line_num = content[:match.start()].count('\n') + 1
        classes.append({
            "name": name,
            "bases": [b.strip() for b in bases.split(",") if b.strip()],
            "line": line_num,
        })

    return {"functions": functions, "classes": classes, "imports": imports}


def parse_javascript(content: str, filepath: str) -> Dict[str, Any]:
    """Parse JS/TS file for functions, classes, imports."""
    functions = []
    classes = []
    imports = []

    # Extract imports
    import_pattern = re.compile(r"import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]", re.MULTILINE)
    require_pattern = re.compile(r"require\(['\"]([^'\"]+)['\"]\)")
    for match in import_pattern.finditer(content):
        imports.append(match.group(1))
    for match in require_pattern.finditer(content):
        imports.append(match.group(1))

    # Extract functions (various patterns)
    patterns = [
        re.compile(r'(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)', re.MULTILINE),
        re.compile(r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>', re.MULTILINE),
        re.compile(r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(([^)]*)\)', re.MULTILINE),
    ]
    seen_funcs = set()
    for pattern in patterns:
        for match in pattern.finditer(content):
            name = match.group(1)
            if name in seen_funcs:
                continue
            seen_funcs.add(name)
            params = match.group(2) if len(match.groups()) > 1 else ""
            line_num = content[:match.start()].count('\n') + 1
            functions.append({
                "name": name,
                "params": params,
                "line": line_num,
                "indent_level": 0,
                "docstring": "",
                "is_method": False,
            })

    # Extract classes
    class_pattern = re.compile(r'class\s+(\w+)(?:\s+extends\s+(\w+))?', re.MULTILINE)
    for match in class_pattern.finditer(content):
        name = match.group(1)
        base = match.group(2) or ""
        line_num = content[:match.start()].count('\n') + 1
        classes.append({
            "name": name,
            "bases": [base] if base else [],
            "line": line_num,
        })

    return {"functions": functions, "classes": classes, "imports": imports}


def parse_file(file_data: Dict[str, Any]) -> Dict[str, Any]:
    """Parse a single file and return extracted symbols."""
    lang = file_data.get("language", "")
    content = file_data.get("content", "")
    filepath = file_data.get("path", "")

    try:
        if lang == "python":
            result = parse_python(content, filepath)
        elif lang in ("javascript", "typescript"):
            result = parse_javascript(content, filepath)
        else:
            result = {"functions": [], "classes": [], "imports": []}
    except Exception as e:
        result = {"functions": [], "classes": [], "imports": [], "error": str(e)}

    return result


def parse_all_files(files: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Parse all files and attach parsed data."""
    results = []
    for file_data in files:
        parsed = parse_file(file_data)
        results.append({
            "path": file_data["path"],
            "name": file_data["name"],
            "language": file_data["language"],
            "line_count": file_data["line_count"],
            "functions": parsed.get("functions", []),
            "classes": parsed.get("classes", []),
            "imports": parsed.get("imports", []),
            # Truncate content for AI context
            "content_preview": file_data["content"][:3000],
        })
    return results
