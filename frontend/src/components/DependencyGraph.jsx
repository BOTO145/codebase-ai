import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import './DependencyGraph.css'

const LANG_COLORS = {
  python:     '#3b82f6',
  javascript: '#eab308',
  typescript: '#06b6d4',
  java:       '#f97316',
  go:         '#00add8',
  rust:       '#f97316',
  default:    '#666666',
}

export default function DependencyGraph({ graphData, onNodeClick, selectedNode }) {
  const svgRef = useRef(null)
  const simRef = useRef(null)
  const [filter, setFilter] = useState('all')
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (!graphData || !svgRef.current) return
    renderGraph()
    return () => { simRef.current?.stop() }
  }, [graphData, filter])

  // Highlight selected node
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('.node-circle')
      .attr('stroke', d => d.id === selectedNode?.id ? '#ffffff' : 'transparent')
      .attr('stroke-width', d => d.id === selectedNode?.id ? 2 : 0)
  }, [selectedNode])

  function renderGraph() {
    const container = svgRef.current.parentElement
    const W = container.clientWidth
    const H = container.clientHeight

    // Filter nodes
    let nodes = [...graphData.nodes]
    let links = [...graphData.links]

    if (filter !== 'all') {
      nodes = nodes.filter(n => n.language === filter)
      const nodeIds = new Set(nodes.map(n => n.id))
      links = links.filter(l => nodeIds.has(l.source.id || l.source) && nodeIds.has(l.target.id || l.target))
    }

    // Clone for d3 mutation
    const nodesCopy = nodes.map(n => ({ ...n }))
    const linksCopy = links.map(l => ({ ...l }))

    // Clear
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', W)
      .attr('height', H)

    // Zoom
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        setZoom(+event.transform.k.toFixed(2))
      })
    svg.call(zoomBehavior)

    const g = svg.append('g')

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#333')

    // Simulation
    const sim = d3.forceSimulation(nodesCopy)
      .force('link', d3.forceLink(linksCopy).id(d => d.id).distance(90).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(22))

    simRef.current = sim

    // Links
    const link = g.append('g').attr('class', 'links')
      .selectAll('line')
      .data(linksCopy)
      .join('line')
      .attr('class', 'graph-link')
      .attr('marker-end', 'url(#arrow)')

    // Node groups
    const node = g.append('g').attr('class', 'nodes')
      .selectAll('g')
      .data(nodesCopy)
      .join('g')
      .attr('class', 'graph-node')
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0)
            d.fx = null; d.fy = null
          })
      )
      .on('click', (_, d) => onNodeClick(d))

    // Node circles — size by complexity
    node.append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => Math.max(8, Math.min(20, 8 + Math.sqrt(d.complexity || 0) * 1.2)))
      .attr('fill', d => LANG_COLORS[d.language] || LANG_COLORS.default)
      .attr('fill-opacity', 0.85)

    // Critical node ring
    const criticals = new Set(graphData.stats?.critical_modules || [])
    node.filter(d => criticals.has(d.id))
      .append('circle')
      .attr('class', 'node-critical-ring')
      .attr('r', d => Math.max(10, Math.min(22, 10 + Math.sqrt(d.complexity || 0) * 1.2)))
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '3,3')

    // Node labels
    node.append('text')
      .attr('class', 'node-label')
      .attr('dy', d => Math.max(10, Math.min(22, 10 + Math.sqrt(d.complexity || 0) * 1.2)) + 10)
      .attr('text-anchor', 'middle')
      .text(d => d.label.replace(/\.[^.]+$/, '').slice(-18))

    // Tick
    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Initial fit
    setTimeout(() => {
      svg.transition().duration(400)
        .call(zoomBehavior.transform, d3.zoomIdentity.translate(W * 0.1, H * 0.1).scale(0.85))
    }, 600)
  }

  const languages = ['all', ...new Set(graphData?.nodes?.map(n => n.language) || [])]

  return (
    <div className="dep-graph-wrap">
      {/* Controls */}
      <div className="graph-controls">
        <div className="graph-filters">
          {languages.map(lang => (
            <button
              key={lang}
              className={`graph-filter-btn ${filter === lang ? 'active' : ''}`}
              onClick={() => setFilter(lang)}
            >
              {lang === 'all' ? 'All' : lang}
            </button>
          ))}
        </div>
        <div className="graph-zoom-label mono dim">×{zoom}</div>
      </div>

      {/* SVG */}
      <svg ref={svgRef} className="graph-svg" />

      {/* Legend */}
      <div className="graph-legend">
        {Object.entries(LANG_COLORS).filter(([k]) => k !== 'default').map(([lang, color]) => (
          <div key={lang} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            <span className="legend-label">{lang}</span>
          </div>
        ))}
        <div className="legend-item">
          <span className="legend-ring" />
          <span className="legend-label">critical</span>
        </div>
      </div>

      {/* Stats overlay */}
      {graphData?.stats && (
        <div className="graph-stats">
          <span className="mono">{graphData.stats.total_nodes} nodes</span>
          <span className="mono">{graphData.stats.total_edges} edges</span>
        </div>
      )}
    </div>
  )
}
