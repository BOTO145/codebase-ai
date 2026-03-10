"""
Builds dependency graph using NetworkX.
Nodes = modules/files, Edges = import relationships.
"""
import os
import networkx as nx
from typing import Dict, List, Any


def build_dependency_graph(parsed_files: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Build a dependency graph from parsed file data.
    Returns graph data formatted for D3.js force simulation.
    """
    G = nx.DiGraph()

    # Build a lookup: module_name -> file_path
    module_map: Dict[str, str] = {}
    for f in parsed_files:
        path = f["path"]
        # Register various ways to reference this file
        base = os.path.splitext(path)[0]
        module_map[base.replace("/", ".")] = path
        module_map[base.replace("\\", ".")] = path
        module_map[os.path.basename(base)] = path
        G.add_node(path, **{
            "label": os.path.basename(path),
            "language": f["language"],
            "line_count": f["line_count"],
            "functions": [fn["name"] for fn in f.get("functions", [])],
            "classes": [cl["name"] for cl in f.get("classes", [])],
            "function_count": len(f.get("functions", [])),
            "class_count": len(f.get("classes", [])),
        })

    # Add edges from imports
    for f in parsed_files:
        source = f["path"]
        for imp in f.get("imports", []):
            # Try to resolve import to a file in the project
            target = _resolve_import(imp, module_map)
            if target and target != source:
                G.add_edge(source, target)

    # Compute graph metrics
    try:
        pagerank = nx.pagerank(G, alpha=0.85)
    except Exception:
        pagerank = {n: 1.0 for n in G.nodes()}

    in_degree = dict(G.in_degree())
    out_degree = dict(G.out_degree())

    # Calculate complexity score (heuristic)
    complexity_scores = {}
    for node in G.nodes():
        node_data = G.nodes[node]
        score = (
            node_data.get("line_count", 0) * 0.01 +
            node_data.get("function_count", 0) * 2 +
            node_data.get("class_count", 0) * 3 +
            in_degree.get(node, 0) * 1.5 +
            out_degree.get(node, 0) * 1.0
        )
        complexity_scores[node] = round(score, 2)

    # Build D3-compatible node/link structure
    nodes = []
    for node in G.nodes():
        data = G.nodes[node]
        nodes.append({
            "id": node,
            "label": data.get("label", node),
            "language": data.get("language", "unknown"),
            "line_count": data.get("line_count", 0),
            "function_count": data.get("function_count", 0),
            "class_count": data.get("class_count", 0),
            "functions": data.get("functions", []),
            "classes": data.get("classes", []),
            "pagerank": round(pagerank.get(node, 0), 4),
            "in_degree": in_degree.get(node, 0),
            "out_degree": out_degree.get(node, 0),
            "complexity": complexity_scores.get(node, 0),
        })

    links = []
    for source, target in G.edges():
        links.append({"source": source, "target": target})

    # Find critical modules (top pagerank)
    sorted_nodes = sorted(nodes, key=lambda n: n["pagerank"], reverse=True)
    critical_modules = [str(n["id"]) for n in sorted_nodes[:5] if n.get("id")]

    # Graph stats
    stats = {
        "total_nodes": G.number_of_nodes(),
        "total_edges": G.number_of_edges(),
        "critical_modules": critical_modules,
        "is_dag": nx.is_directed_acyclic_graph(G),
        "density": round(nx.density(G), 4),
    }

    try:
        # Find connected components
        undirected = G.to_undirected()
        components = list(nx.connected_components(undirected))
        stats["connected_components"] = len(components)
    except Exception:
        stats["connected_components"] = 1

    return {
        "nodes": nodes,
        "links": links,
        "stats": stats,
    }


def _resolve_import(imp: str, module_map: Dict[str, str]) -> str | None:
    """Try to resolve an import string to a known file path."""
    # Try direct match
    if imp in module_map:
        return module_map[imp]

    # Try last component (e.g., "utils" from "myapp.utils")
    parts = imp.split(".")
    for i in range(len(parts), 0, -1):
        key = ".".join(parts[:i])
        if key in module_map:
            return module_map[key]

    # Try basename match
    basename = parts[-1]
    if basename in module_map:
        return module_map[basename]

    return None
