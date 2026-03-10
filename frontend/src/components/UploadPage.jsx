import { useState, useRef, useCallback } from 'react'
import { uploadProject } from '../utils/api'
import './UploadPage.css'

export default function UploadPage({ onJobStarted, initialError }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(initialError || null)
  const inputRef = useRef()

  const handleFile = useCallback((f) => {
    if (!f) return
    if (!f.name.endsWith('.zip')) {
      setError('Only .zip files are supported')
      return
    }
    setError(null)
    setFile(f)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    handleFile(f)
  }, [handleFile])

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const { job_id } = await uploadProject(file)
      onJobStarted(job_id, file.name)
    } catch (e) {
      setError(e.message || 'Upload failed')
      setUploading(false)
    }
  }

  return (
    <div className="upload-page">
      {/* Header */}
      <header className="upload-header">
        <div className="logo">
          <span className="logo-bracket">[</span>
          <span className="logo-text">CODEBASE AI</span>
          <span className="logo-bracket">]</span>
        </div>
        <p className="tagline">Understand any codebase in minutes.</p>
      </header>

      {/* Drop zone */}
      <div
        className={`drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !file && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {!file ? (
          <>
            <div className="drop-icon">
              <UploadIcon />
            </div>
            <p className="drop-title">Drop your project zip here</p>
            <p className="drop-sub">or click to browse</p>
            <div className="drop-formats">
              <span className="tag">ZIP</span>
              <span className="drop-formats-note">Python · JavaScript · TypeScript · Java · Go · Rust</span>
            </div>
          </>
        ) : (
          <div className="file-ready">
            <div className="file-icon"><FileIcon /></div>
            <div className="file-info">
              <span className="file-name mono">{file.name}</span>
              <span className="file-size dim">{(file.size / 1024).toFixed(0)} KB</span>
            </div>
            <button
              className="btn btn-clear"
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="upload-error fade-in">
          <span className="err">⚠ {error}</span>
        </div>
      )}

      {/* CTA */}
      <div className="upload-actions">
        <button
          className="btn primary btn-analyze"
          disabled={!file || uploading}
          onClick={handleUpload}
        >
          {uploading ? (
            <><SpinnerIcon /> Uploading…</>
          ) : (
            <>Analyze Project →</>
          )}
        </button>
      </div>

      {/* Features */}
      <div className="feature-grid">
        {FEATURES.map(f => (
          <div key={f.label} className="feature-item">
            <span className="feature-icon">{f.icon}</span>
            <span className="feature-label">{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: '⬡', label: 'Dependency Graph' },
  { icon: '◈', label: 'AI Explanations' },
  { icon: '⟳', label: 'Call Graphs' },
  { icon: '⌬', label: 'Architecture Map' },
  { icon: '⊙', label: 'Critical Modules' },
  { icon: '◻', label: 'Q&A Interface' },
]

function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17,8 12,3 7,8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
    </svg>
  )
}
