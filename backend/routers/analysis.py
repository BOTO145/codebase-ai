"""
Analysis router: natural language Q&A about the codebase.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from routers.upload import jobs
from services.ai_service import answer_question, explain_function

router = APIRouter()


class QuestionRequest(BaseModel):
    job_id: str
    question: str


class FunctionRequest(BaseModel):
    job_id: str
    function_name: str
    file_path: str


@router.post("/ask")
async def ask_question(req: QuestionRequest):
    """Ask a natural language question about the analyzed codebase."""
    job = jobs.get(req.job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["status"] != "complete":
        raise HTTPException(400, "Analysis not yet complete")

    result = job["result"]
    answer = answer_question(
        req.question,
        result["parsed_files"],
        result["graph"],
    )
    return {"answer": answer}


@router.post("/explain-function")
async def explain_func(req: FunctionRequest):
    """Get AI explanation for a specific function."""
    job = jobs.get(req.job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["status"] != "complete":
        raise HTTPException(400, "Analysis not yet complete")

    # Find the file and function
    result = job["result"]
    target_file = None
    for f in result["parsed_files"]:
        if f["path"] == req.file_path:
            target_file = f
            break

    if not target_file:
        raise HTTPException(404, "File not found")

    # Find function code (use name as context)
    func_code = f"# Function: {req.function_name}\n# From: {req.file_path}\n# (source not available in summary)"

    explanation = explain_function(req.function_name, func_code, req.file_path)
    return {"explanation": explanation}
