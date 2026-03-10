const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function uploadProject(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/api/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function pollJob(jobId) {
  const res = await fetch(`${BASE}/api/job/${jobId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function askQuestion(jobId, question) {
  const res = await fetch(`${BASE}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, question }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getNodeDetail(jobId, nodeId) {
  const res = await fetch(`${BASE}/api/graph/${jobId}/node/${encodeURIComponent(nodeId)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function checkHealth() {
  try {
    const res = await fetch(`${BASE}/health`)
    return res.ok
  } catch {
    return false
  }
}
