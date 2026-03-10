"""
Graph router: returns graph data for visualization.
"""
from fastapi import APIRouter, HTTPException
from routers.upload import jobs

router = APIRouter()


@router.get("/graph/{job_id}")
async def get_graph(job_id: str):
    """Get the dependency graph for a completed job."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["status"] != "complete":
        raise HTTPException(400, "Analysis not yet complete")

    return job["result"]["graph"]


@router.get("/graph/{job_id}/node/{node_id:path}")
async def get_node_detail(job_id: str, node_id: str):
    """Get detailed info for a specific node."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["status"] != "complete":
        raise HTTPException(400, "Analysis not yet complete")

    result = job["result"]
    graph = result["graph"]

    # Find node
    node = next((n for n in graph["nodes"] if n["id"] == node_id), None)
    if not node:
        raise HTTPException(404, "Node not found")

    # Find module summary
    summary = result["module_summaries"].get(node_id, "")

    # Find connected nodes
    connected_to = [l["target"] for l in graph["links"] if l["source"] == node_id]
    connected_from = [l["source"] for l in graph["links"] if l["target"] == node_id]

    return {
        **node,
        "summary": summary,
        "imports": connected_to,
        "imported_by": connected_from,
    }
