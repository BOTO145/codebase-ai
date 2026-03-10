import { useEffect, useState } from 'react'
import { pollJob } from '../utils/api'
import './ProcessingPage.css'

const STEP_LABELS = {
  uploading:      { label: 'Uploading file…',              step: 0 },
  extracting:     { label: 'Extracting archive…',          step: 1 },
  scanning:       { label: 'Scanning files…',              step: 2 },
  parsing:        { label: 'Parsing syntax trees…',        step: 3 },
  building_graph: { label: 'Building dependency graph…',   step: 4 },
  analyzing:      { label: 'AI architecture analysis…',    step: 5 },
  summarizing:    { label: 'Generating module summaries…', step: 6 },
  complete:       { label: 'Analysis complete',            step: 7 },
}

const TOTAL_STEPS = 7

export default function ProcessingPage({ jobId, filename, onComplete, onError }) {
  const [status, setStatus] = useState('uploading')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let stopped = false

    const poll = async () => {
      if (stopped) return
      try {
        const job = await pollJob(jobId)
        if (stopped) return

        setStatus(job.status)
        setProgress(job.progress || 0)

        if (job.status === 'complete') {
          stopped = true
          setTimeout(() => onComplete(job.result), 600)
          return
        }
        if (job.status === 'error') {
          stopped = true
          onError(job.error || 'Analysis failed')
          return
        }
      } catch (e) {
        if (!stopped) onError(e.message)
        stopped = true
      }
    }

    poll() // immediate first poll
    const interval = setInterval(poll, 1500)

    return () => {
      stopped = true
      clearInterval(interval)
    }
  }, [jobId])

  const stepInfo = STEP_LABELS[status] || STEP_LABELS['uploading']
  const currentStep = stepInfo.step

  return (
    <div className="processing-page">
      <div className="processing-card panel fade-in">
        {/* Header */}
        <div className="proc-header">
          <div className="proc-title-row">
            <span className="proc-spinner">
              {status !== 'complete' ? <SpinnerRing /> : <CheckIcon />}
            </span>
            <div>
              <h2>Analyzing Codebase</h2>
              <p className="proc-filename mono dim">{filename}</p>
            </div>
          </div>
        </div>

        <hr className="divider" />

        {/* Progress bar */}
        <div className="proc-progress-wrap">
          <div className="proc-progress-bar">
            <div
              className="proc-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="proc-progress-pct mono">{progress}%</span>
        </div>

        {/* Step list */}
        <div className="proc-steps">
          {Object.entries(STEP_LABELS).filter(([k]) => k !== 'complete').map(([key, { label, step }]) => {
            const done    = currentStep > step
            const active  = currentStep === step
            const pending = currentStep < step
            return (
              <div key={key} className={`proc-step ${done ? 'done' : ''} ${active ? 'active' : ''} ${pending ? 'pending' : ''}`}>
                <span className="proc-step-dot">
                  {done ? '✓' : active ? '·' : '○'}
                </span>
                <span className="proc-step-label">{label}</span>
              </div>
            )
          })}
        </div>

        <hr className="divider" />

        {/* Status line */}
        <div className="proc-status-line">
          <span className={`proc-current-label ${status === 'error' ? 'err' : 'pulse'}`}>
            {stepInfo.label}
          </span>
        </div>
      </div>
    </div>
  )
}

function SpinnerRing() {
  return (
    <svg className="spinner" width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="var(--border-hi)" strokeWidth="2"/>
      <path d="M12 3 A9 9 0 0 1 21 12" stroke="var(--text)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  )
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
