"""
Upload router: handles zip file uploads and kicks off analysis pipeline.
"""
import os
import uuid
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import aiofiles

from services.scanner import extract_zip, scan_directory
from parsers.code_parser import parse_all_files
from services.graph_builder import build_dependency_graph
from services.ai_service import (
    generate_architecture_summary,
    generate_module_summaries,
)

router = APIRouter()

# In-memory job store (use Redis in production)
jobs: dict = {}


@router.post("/upload")
async def upload_project(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Upload a zip file and start analysis."""
    if not file.filename.endswith(".zip"):
        raise HTTPException(400, "Only .zip files are supported")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "uploading", "progress": 0, "error": None}

    # Save uploaded file
    tmp_dir = tempfile.mkdtemp(prefix=f"codebase_ai_{job_id}_")
    zip_path = os.path.join(tmp_dir, "upload.zip")

    try:
        async with aiofiles.open(zip_path, "wb") as f:
            content = await file.read()
            await f.write(content)
    except Exception as e:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(500, f"Upload failed: {e}")

    # Start background processing
    background_tasks.add_task(process_project, job_id, zip_path, tmp_dir)

    return {"job_id": job_id, "status": "processing"}


@router.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """Poll job status."""
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    return jobs[job_id]


async def process_project(job_id: str, zip_path: str, tmp_dir: str):
    """Full processing pipeline run in background."""
    import logging
    logger = logging.getLogger("pipeline")
    logger.setLevel(logging.DEBUG)

    try:
        logger.info(f"[{job_id[:8]}] Starting pipeline, zip={zip_path}")

        # Step 1: Extract
        jobs[job_id] = {"status": "extracting", "progress": 10, "error": None}
        extract_dir = os.path.join(tmp_dir, "extracted")
        os.makedirs(extract_dir)
        root_dir = extract_zip(zip_path, extract_dir)
        logger.info(f"[{job_id[:8]}] Extracted to root_dir={root_dir}")

        # Step 2: Scan files
        jobs[job_id] = {"status": "scanning", "progress": 25, "error": None}
        scan_result = scan_directory(root_dir)
        logger.info(f"[{job_id[:8]}] Scan done: {scan_result['total_files']} files, langs={scan_result['language_stats']}")

        if scan_result["total_files"] == 0:
            # Give a helpful diagnosis
            all_files = []
            for dirpath, dirnames, filenames in os.walk(root_dir):
                dirnames[:] = [d for d in dirnames if d not in {"node_modules", ".git", "__pycache__"}]
                all_files.extend(filenames)
            total_found = len(all_files)
            exts = list({os.path.splitext(f)[1].lower() for f in all_files if os.path.splitext(f)[1]})[:10]
            jobs[job_id] = {
                "status": "error",
                "progress": 0,
                "error": (
                    f"No supported source files found. "
                    f"Found {total_found} total files with extensions: {', '.join(exts) or 'none'}. "
                    f"Supported: .py .js .ts .cpp .c .h .ino .java .go .rs .cs .rb .php .swift .kt"
                ),
            }
            return

        # Step 3: Parse syntax
        jobs[job_id] = {"status": "parsing", "progress": 40, "error": None}
        parsed_files = parse_all_files(scan_result["files"])
        logger.info(f"[{job_id[:8]}] Parsed {len(parsed_files)} files")

        # Step 4: Build graph
        jobs[job_id] = {"status": "building_graph", "progress": 60, "error": None}
        graph_data = build_dependency_graph(parsed_files)
        logger.info(f"[{job_id[:8]}] Graph: {graph_data['stats']}")

        # Step 5: AI analysis
        jobs[job_id] = {"status": "analyzing", "progress": 75, "error": None}
        logger.info(f"[{job_id[:8]}] Starting AI architecture summary")
        architecture_summary = generate_architecture_summary(
            scan_result["language_stats"],
            parsed_files,
            graph_data["stats"],
        )
        logger.info(f"[{job_id[:8]}] Architecture summary done ({len(architecture_summary)} chars)")

        # Step 6: Module summaries
        jobs[job_id] = {"status": "summarizing", "progress": 88, "error": None}
        logger.info(f"[{job_id[:8]}] Starting module summaries")
        module_summaries = generate_module_summaries(parsed_files)
        logger.info(f"[{job_id[:8]}] Module summaries done: {len(module_summaries)} modules")

        # Strip content from final result (too large)
        for pf in parsed_files:
            pf.pop("content_preview", None)

        # Done
        jobs[job_id] = {
            "status": "complete",
            "progress": 100,
            "error": None,
            "result": {
                "language_stats": scan_result["language_stats"],
                "total_files": scan_result["total_files"],
                "total_lines": scan_result["total_lines"],
                "graph": graph_data,
                "parsed_files": parsed_files,
                "architecture_summary": architecture_summary,
                "module_summaries": module_summaries,
                "project_name": os.path.basename(root_dir),
            },
        }

        logger.info(f"[{job_id[:8]}] Pipeline COMPLETE")

    except Exception as e:
        import traceback
        logger.error(f"[{job_id[:8]}] Pipeline FAILED: {e}")
        logger.error(traceback.format_exc())
        jobs[job_id] = {"status": "error", "progress": 0, "error": str(e)}
    finally:
        # Cleanup
        shutil.rmtree(tmp_dir, ignore_errors=True)
