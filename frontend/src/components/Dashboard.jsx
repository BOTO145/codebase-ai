import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import DependencyGraph from './DependencyGraph'
import NodePanel from './NodePanel'
import AskPanel from './AskPanel'
import './Dashboard.css'

const TABS = ['GRAPH', 'OVERVIEW', 'ASK']

export default function Dashboard({ jobId, result, onReset }) {
  const [tab, setTab] = useState('GRAPH')
  const [selectedNode, setSelectedNode] = useState(null)
  const [sidebarTab, setSidebarTab] = useState('node')

  const handleNodeClick = (node) => {
    setSelectedNode(node)
    setSidebarTab('node')
  }

  return (
    <div className="dashboard">
      {/* Top bar */}
      <header className="dash-topbar">
        <div className="dash-logo">
          <span className="dash-logo-text mono">[ CODEBASE AI ]</span>
        </div>

        <div className="dash-project-info">
          <span className="mono dim">{result.project_name || 'Project'}</span>
          <div className="dash-lang-tags">
            {Object.entries(result.language_stats || {}).map(([lang, count]) => (
              <span key={lang} className={`tag ${lang}`}>{lang} {count}</span>
            ))}
          </div>
        </div>

        <div className="dash-meta">
          <span className="mono dim">{result.total_files} files</span>
          <span className="mono dim">{result.total_lines?.toLocaleString()} lines</span>
          <button className="btn" onClick={onReset}>← New</button>
        </div>
      </header>

      <hr className="divider" />

      {/* Tab bar */}
      <div className="dash-tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`dash-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
        {result.graph?.stats?.critical_modules?.length > 0 && (
          <div className="dash-critical-hint">
            <span className="dim mono" style={{ fontSize: 10 }}>
              Critical: {result.graph.stats.critical_modules.map(m => m.split(/[/\\]/).pop()).join(', ')}
            </span>
          </div>
        )}
      </div>

      <hr className="divider" />

      {/* Main content */}
      <div className="dash-body">
        {tab === 'GRAPH' && (
          <div className="dash-graph-layout">
            {/* Graph area */}
            <div className="dash-graph-area">
              <DependencyGraph
                graphData={result.graph}
                onNodeClick={handleNodeClick}
                selectedNode={selectedNode}
              />
            </div>

            {/* Right sidebar */}
            <div className="dash-sidebar panel">
              <div className="sidebar-tabs">
                <button
                  className={`sidebar-tab ${sidebarTab === 'node' ? 'active' : ''}`}
                  onClick={() => setSidebarTab('node')}
                >
                  Node
                </button>
                <button
                  className={`sidebar-tab ${sidebarTab === 'ask' ? 'active' : ''}`}
                  onClick={() => setSidebarTab('ask')}
                >
                  Ask AI
                </button>
              </div>
              <hr className="divider" />
              <div className="sidebar-content">
                {sidebarTab === 'node' ? (
                  selectedNode ? (
                    <NodePanel
                      jobId={jobId}
                      node={selectedNode}
                      moduleSummaries={result.module_summaries}
                      onClose={() => setSelectedNode(null)}
                    />
                  ) : (
                    <div className="sidebar-empty">
                      <p className="dim" style={{ fontSize: 12 }}>
                        Click any node on the graph to inspect it.
                      </p>
                    </div>
                  )
                ) : (
                  <AskPanel jobId={jobId} />
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'OVERVIEW' && (
          <div className="dash-overview fade-in">
            <OverviewPanel result={result} />
          </div>
        )}

        {tab === 'ASK' && (
          <div className="dash-ask-full fade-in">
            <AskPanel jobId={jobId} />
          </div>
        )}
      </div>
    </div>
  )
}

function OverviewPanel({ result }) {
  const { architecture_summary, module_summaries, graph } = result

  return (
    <div className="overview">
      {/* Architecture summary */}
      <section className="ov-section panel">
        <div className="ov-section-header">
          <h3>ARCHITECTURE SUMMARY</h3>
          <span className="tag">AI</span>
        </div>
        <hr className="divider" />
        <div className="ov-arch-text">
          <ReactMarkdown>{architecture_summary}</ReactMarkdown>
        </div>
      </section>

      {/* Graph stats */}
      <section className="ov-section panel">
        <div className="ov-section-header">
          <h3>GRAPH METRICS</h3>
        </div>
        <hr className="divider" />
        <div className="ov-metrics">
          <MetricItem label="Nodes"       value={graph?.stats?.total_nodes} />
          <MetricItem label="Edges"       value={graph?.stats?.total_edges} />
          <MetricItem label="Density"     value={graph?.stats?.density} />
          <MetricItem label="Components"  value={graph?.stats?.connected_components} />
          <MetricItem label="DAG"         value={graph?.stats?.is_dag ? 'Yes' : 'No'} />
        </div>
      </section>

      {/* Module summaries */}
      {Object.keys(module_summaries || {}).length > 0 && (
        <section className="ov-section panel">
          <div className="ov-section-header">
            <h3>MODULE SUMMARIES</h3>
            <span className="tag">AI</span>
          </div>
          <hr className="divider" />
          <div className="ov-modules">
            {Object.entries(module_summaries).map(([path, summary]) => (
              <div key={path} className="ov-module">
                <span className="mono ov-module-path">{path}</span>
                <div className="ov-module-summary"><ReactMarkdown>{summary}</ReactMarkdown></div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function MetricItem({ label, value }) {
  return (
    <div className="metric-item">
      <span className="metric-label">{label}</span>
      <span className="metric-value mono">{value ?? '—'}</span>
    </div>
  )
}