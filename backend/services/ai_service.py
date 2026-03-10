"""
Groq AI service for generating code explanations and architecture summaries.
"""
import os
from groq import Groq
from typing import Dict, List, Any, Optional

_client: Optional[Groq] = None


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


def _chat(system: str, user: str, max_tokens: int = 1024) -> str:
    """Send a single chat request to Groq."""
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=max_tokens,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"[AI Error: {str(e)}]"


def generate_architecture_summary(
    language_stats: Dict[str, int],
    parsed_files: List[Dict[str, Any]],
    graph_stats: Dict[str, Any],
) -> str:
    """Generate a high-level architecture summary of the project."""
    # Build context
    file_list = []
    for f in parsed_files[:40]:  # Limit context
        funcs = f.get("functions", [])
        classes = f.get("classes", [])
        # Handle both list-of-dicts and list-of-strings
        func_names = ", ".join(fn["name"] if isinstance(fn, dict) else str(fn) for fn in funcs[:5])
        class_names = ", ".join(cl["name"] if isinstance(cl, dict) else str(cl) for cl in classes[:5])
        file_list.append(
            f"  - {f['path']} ({f['language']}, {f['line_count']} lines)"
            + (f" | functions: {func_names}" if func_names else "")
            + (f" | classes: {class_names}" if class_names else "")
        )

    context = f"""
Project Statistics:
- Languages: {', '.join(f'{lang}: {count} files' for lang, count in language_stats.items())}
- Total files: {graph_stats.get('total_nodes', 0)}
- Total dependencies: {graph_stats.get('total_edges', 0)}
- Critical modules: {', '.join(str(m) for m in graph_stats.get('critical_modules', []))}

File structure:
{chr(10).join(file_list)}
"""

    system = """You are an expert software architect. Analyze codebases and provide clear, 
concise architectural summaries. Be specific about patterns, responsibilities, and structure.
Keep responses focused and under 300 words."""

    user = f"""Analyze this codebase and provide:
1. **Project Type**: What kind of application is this?
2. **Architecture Pattern**: What architectural pattern does it follow?
3. **Key Components**: What are the main components and their responsibilities?
4. **Technology Stack**: What frameworks/libraries are used?
5. **Entry Points**: Where does execution begin?

Codebase data:
{context}"""

    return _chat(system, user, max_tokens=600)


def explain_module(file_data: Dict[str, Any]) -> str:
    """Generate explanation for a single module/file."""
    content_preview = file_data.get("content_preview", "")[:2000]
    functions = file_data.get("functions", [])
    classes = file_data.get("classes", [])

    func_list = ", ".join([f["name"] for f in functions[:10]])
    class_list = ", ".join([c["name"] for c in classes[:5]])

    system = """You are a senior developer explaining code to a colleague. 
Be concise, specific, and technical. Focus on WHAT this module does and WHY it exists.
Keep response under 150 words."""

    user = f"""Explain this {file_data.get('language', 'code')} module:

File: {file_data.get('path', 'unknown')}
Functions: {func_list or 'none'}
Classes: {class_list or 'none'}

Code preview:
```
{content_preview}
```

Provide a 2-3 sentence explanation of what this module does and its role in the system."""

    return _chat(system, user, max_tokens=200)


def explain_function(func_name: str, func_code: str, file_path: str) -> str:
    """Generate explanation for a specific function."""
    system = """You are a senior developer. Explain what a function does clearly and concisely.
Include: purpose, parameters, return value, and any important side effects.
Keep under 100 words."""

    user = f"""Explain this function from {file_path}:

```
{func_code[:1500]}
```"""

    return _chat(system, user, max_tokens=200)


def answer_question(
    question: str,
    parsed_files: List[Dict[str, Any]],
    graph_data: Dict[str, Any],
) -> str:
    """Answer a natural language question about the codebase."""
    # Build relevant context
    file_summaries = []
    for f in parsed_files[:30]:
        funcs = f.get("functions", [])
        classes = f.get("classes", [])
        func_names = ", ".join(fn["name"] if isinstance(fn, dict) else str(fn) for fn in funcs[:8])
        class_names = ", ".join(cl["name"] if isinstance(cl, dict) else str(cl) for cl in classes[:4])
        file_summaries.append(
            f"{f['path']}: {func_names}" + (f" | {class_names}" if class_names else "")
        )

    context = "\n".join(file_summaries)

    system = """You are an expert code analyst. Answer questions about codebases accurately.
Reference specific files and functions when relevant. Be direct and technical.
If you don't know, say so. Keep response under 300 words."""

    user = f"""Question: {question}

Codebase structure:
{context}

Critical modules: {', '.join(str(m) for m in graph_data.get('stats', {}).get('critical_modules', []))}

Answer the question based on the codebase structure above."""

    return _chat(system, user, max_tokens=500)


def generate_module_summaries(
    parsed_files: List[Dict[str, Any]],
    max_files: int = 15,
) -> Dict[str, str]:
    """Generate summaries for the most important modules."""
    # Sort by complexity: files with most functions/classes first
    sorted_files = sorted(
        parsed_files,
        key=lambda f: len(f.get("functions", [])) + len(f.get("classes", [])) * 2,
        reverse=True,
    )

    summaries = {}
    for file_data in sorted_files[:max_files]:
        path = file_data["path"]
        if file_data.get("functions") or file_data.get("classes"):
            summaries[path] = explain_module(file_data)

    return summaries
