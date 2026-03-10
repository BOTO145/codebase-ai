import { useState } from 'react'
import UploadPage from './components/UploadPage'
import ProcessingPage from './components/ProcessingPage'
import Dashboard from './components/Dashboard'

export default function App() {
  const [page, setPage] = useState('upload')
  const [jobId, setJobId] = useState(null)
  const [filename, setFilename] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleJobStarted = (id, name) => {
    setJobId(id)
    setFilename(name)
    setError(null)
    setPage('processing')
  }

  const handleComplete = (res) => {
    setResult(res)
    setPage('dashboard')
  }

  const handleError = (msg) => {
    setError(msg)
    setPage('upload')
  }

  const handleReset = () => {
    setPage('upload')
    setJobId(null)
    setResult(null)
    setError(null)
  }

  return (
    <>
      {page === 'upload' && (
        <UploadPage
          onJobStarted={handleJobStarted}
          initialError={error}
        />
      )}
      {page === 'processing' && (
        <ProcessingPage
          jobId={jobId}
          filename={filename}
          onComplete={handleComplete}
          onError={handleError}
        />
      )}
      {page === 'dashboard' && result && (
        <Dashboard
          jobId={jobId}
          result={result}
          onReset={handleReset}
        />
      )}
    </>
  )
}
