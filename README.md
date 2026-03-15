# Codebase AI

> Understand any codebase in minutes — dependency graphs, AI explanations, interactive navigation.

![Stack](https://img.shields.io/badge/FastAPI-Python-blue) ![Stack](https://img.shields.io/badge/React-D3.js-yellow) ![Stack](https://img.shields.io/badge/Groq-Llama4-purple) ![Stack](https://img.shields.io/badge/Docker-Compose-lightblue)

---

## Demo
<p align="center">
  <a href="https://youtu.be/U9ZRDy9utqk">
    <img src="https://img.youtube.com/vi/U9ZRDy9utqk/maxresdefault.jpg" width="700">
  </a>
</p>

<p align="center">
</p>

## What It Does

Upload a zipped project → the system parses every file, builds a dependency graph, and uses AI to generate plain-English explanations of your architecture, modules, and functions.

**Features (v1)**
- Dependency graph with D3.js force simulation (zoomable, filterable, draggable)
- Language detection: Python, JavaScript, TypeScript, Java, Go, Rust, and more
- AI architecture summary (Groq / Llama 4 Scout)
- Per-module AI summaries for the most important files
- Node detail panel: functions, classes, imports, complexity score
- Critical module detection via PageRank
- Natural language Q&A ("Where is authentication implemented?")
- Complexity heatmap via node sizing

---

## Quick Start

### 1. Prerequisites
- Docker + Docker Compose
- A [Groq API key](https://console.groq.com/)

### 2. Clone & configure

```bash
git clone https://github.com/BOTO145/codebase-ai
cd codebase-ai
cp .env.example .env
# Edit .env and set your GROQ_API_KEY
```

### 3. Start

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

### 4. Use it

1. Zip your project: `zip -r myproject.zip myproject/`
2. Open http://localhost:3000
3. Drop the zip file
4. Wait ~30–60 seconds for analysis
5. Explore the graph, read summaries, ask questions

---

## Project Structure

```
codebase-ai/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── main.py                  # FastAPI app
│   ├── routers/
│   │   ├── upload.py            # Upload + pipeline orchestration
│   │   ├── analysis.py          # Q&A endpoints
│   │   └── graph.py             # Graph data endpoints
│   ├── services/
│   │   ├── scanner.py           # File system scanner
│   │   ├── graph_builder.py     # NetworkX dependency graph
│   │   └── ai_service.py        # Groq AI integration
│   └── parsers/
│       └── code_parser.py       # Multi-language parser
└── frontend/
    └── src/
        ├── App.jsx              # Page router
        ├── components/
        │   ├── UploadPage.jsx   # Upload UI
        │   ├── ProcessingPage.jsx # Progress screen
        │   ├── Dashboard.jsx    # Main layout
        │   ├── DependencyGraph.jsx # D3 graph
        │   ├── NodePanel.jsx    # Node detail sidebar
        │   └── AskPanel.jsx     # AI Q&A chat
        └── utils/api.js         # API client
```

---

## Pipeline

```
Upload ZIP
    ↓
Extract → Scan files (up to 300 files, 500KB each)
    ↓
Parse syntax (Python regex + JS/TS patterns)
    ↓
Build NetworkX DiGraph (nodes = files, edges = imports)
    ↓
Compute PageRank, complexity scores, critical modules
    ↓
Send to Groq (Llama 4 Scout) → architecture summary
    ↓
Generate per-module summaries for top 15 files
    ↓
Return JSON → React renders graph + panels
```

---

## Supported Languages

| Language   | Parsing | Dependency resolution |
|------------|---------|----------------------|
| Python     | ✅ Full  | ✅ import / from…import |
| JavaScript | ✅ Full  | ✅ import / require   |
| TypeScript | ✅ Full  | ✅ import             |
| Java       | ⚡ Basic | — |
| Go         | ⚡ Basic | — |
| Rust       | ⚡ Basic | — |

---

## Roadmap (v2)

- [ ] Git URL ingestion (clone + analyze)
- [ ] Log & stack trace analysis
- [ ] OpenAPI spec understanding
- [ ] Execution flow animation
- [ ] Security vulnerability detection
- [ ] Redis job queue (replace in-memory store)
- [ ] PostgreSQL persistence
- [ ] Authentication

---

## Environment Variables

| Variable      | Required | Description |
|---------------|----------|-------------|
| `GROQ_API_KEY` | ✅       | Your Groq API key |

---

## Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Backend   | FastAPI, Python 3.11 |
| Parsing   | Regex-based AST extraction |
| Graph     | NetworkX (DiGraph, PageRank) |
| AI        | Groq — `meta-llama/llama-4-scout-17b-16e-instruct` |
| Frontend  | React 18, Vite |
| Vis       | D3.js v7 (force simulation) |
| Fonts     | Inter (UI), JetBrains Mono (code) |
| Infra     | Docker Compose |
