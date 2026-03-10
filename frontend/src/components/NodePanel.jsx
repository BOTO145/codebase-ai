import { useState, useEffect } from 'react'
import { getNodeDetail } from '../utils/api'
import './NodePanel.css'

export default function NodePanel({ jobId, node, moduleSummaries, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!node) return
    setLoading(true)
    getNodeDetail(jobId, node.id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [node?.id])

  if (!node) return null

  const summary = moduleSummaries?.[node.id] || detail?.summary || ''
  const data = detail || node

  return (
    <div className="node-panel panel fade-in">
      {/* Header */}
      <div className="np-header">
        <div className="np-title-row">
          <span className={`tag ${node.language}`}>{node.language}</span>
          <span className="np-filename mono">{node.label}</span>
        </div>
        <button className="np-close btn" onClick={onClose}>✕</button>
      </div>

      <hr className="divider" />

      {/* Stats row */}
      <div className="np-stats">
        <StatItem label="Lines"     value={node.line_count} />
        <StatItem label="Functions" value={node.function_count} />
        <StatItem label="Classes"   value={node.class_count} />
        <StatItem label="Imports"   value={data.imports?.length || node.out_degree} />
        <StatItem label="ImportedBy" value={data.imported_by?.length || node.in_degree} />
        <StatItem label="Complexity" value={node.complexity?.toFixed(1) || '—'} />
      </div>

      <hr className="divider" />

      {/* Path */}
      <div className="np-section">
        <span className="np-section-label">PATH</span>
        <span className="mono np-path">{node.id}</span>
      </div>

      {/* AI Summary */}
      {(loading || summary) && (
        <>
          <hr className="divider" />
          <div className="np-section">
            <span className="np-section-label">AI SUMMARY</span>
            {loading ? (
              <span className="dim pulse" style={{ fontSize: 12 }}>Generating…</span>
            ) : (
              <p className="np-summary">{summary}</p>
            )}
          </div>
        </>
      )}

      {/* Functions */}
      {node.functions?.length > 0 && (
        <>
          <hr className="divider" />
          <div className="np-section">
            <span className="np-section-label">FUNCTIONS ({node.functions.length})</span>
            <div className="np-symbol-list">
              {node.functions.map(fn => (
                <span key={fn} className="np-symbol mono">fn {fn}</span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Classes */}
      {node.classes?.length > 0 && (
        <>
          <hr className="divider" />
          <div className="np-section">
            <span className="np-section-label">CLASSES ({node.classes.length})</span>
            <div className="np-symbol-list">
              {node.classes.map(cl => (
                <span key={cl} className="np-symbol mono">class {cl}</span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Import relationships */}
      {data.imports?.length > 0 && (
        <>
          <hr className="divider" />
          <div className="np-section">
            <span className="np-section-label">IMPORTS ({data.imports.length})</span>
            <div className="np-dep-list">
              {data.imports.slice(0, 8).map(imp => (
                <span key={imp} className="mono dim np-dep">→ {shortenPath(imp)}</span>
              ))}
            </div>
          </div>
        </>
      )}

      {data.imported_by?.length > 0 && (
        <>
          <hr className="divider" />
          <div className="np-section">
            <span className="np-section-label">IMPORTED BY ({data.imported_by.length})</span>
            <div className="np-dep-list">
              {data.imported_by.slice(0, 8).map(imp => (
                <span key={imp} className="mono dim np-dep">← {shortenPath(imp)}</span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatItem({ label, value }) {
  return (
    <div className="stat-item">
      <span className="stat-value mono">{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function shortenPath(p) {
  const parts = p.split(/[/\\]/)
  if (parts.length <= 3) return p
  return '…/' + parts.slice(-2).join('/')
}
