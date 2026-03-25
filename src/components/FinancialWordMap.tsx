import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { nodes, edges, clusterMeta, type MapNode, type ClusterType } from '@/data/financialMapData';
import NodeDetailPanel from './NodeDetailPanel';

const CLUSTER_HSL: Record<ClusterType, string> = {
  news: 'hsl(38, 95%, 60%)',
  assets: 'hsl(180, 70%, 50%)',
  sectors: 'hsl(152, 70%, 45%)',
  stocks: 'hsl(270, 60%, 65%)',
};

const CLUSTER_HSL_DIM: Record<ClusterType, string> = {
  news: 'hsla(38, 95%, 60%, 0.15)',
  assets: 'hsla(180, 70%, 50%, 0.15)',
  sectors: 'hsla(152, 70%, 45%, 0.15)',
  stocks: 'hsla(270, 60%, 65%, 0.15)',
};

const CLUSTER_HSL_GLOW: Record<ClusterType, string> = {
  news: 'hsla(38, 95%, 60%, 0.5)',
  assets: 'hsla(180, 70%, 50%, 0.5)',
  sectors: 'hsla(152, 70%, 45%, 0.5)',
  stocks: 'hsla(270, 60%, 65%, 0.5)',
};

export default function FinancialWordMap() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !searchFocused) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchQuery('');
        setSelectedNode(null);
        searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchFocused]);

  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    return new Set(nodes.filter(n => n.label.toLowerCase().includes(q)).map(n => n.id));
  }, [searchQuery]);

  const activeHighlight = hoveredNode || selectedNode;

  const connectedNodes = useMemo(() => {
    if (!activeHighlight) return new Set<string>();
    const connected = new Set<string>([activeHighlight]);
    edges.forEach(e => {
      if (e.from === activeHighlight) connected.add(e.to);
      if (e.to === activeHighlight) connected.add(e.from);
    });
    return connected;
  }, [activeHighlight]);

  const isNodeVisible = useCallback((node: MapNode) => {
    if (selectedCluster && node.cluster !== selectedCluster) return false;
    return true;
  }, [selectedCluster]);

  const isNodeHighlighted = useCallback((node: MapNode) => {
    if (searchQuery.trim()) return searchMatches.has(node.id);
    if (!activeHighlight) return true;
    return connectedNodes.has(node.id);
  }, [activeHighlight, connectedNodes, searchQuery, searchMatches]);

  const isEdgeHighlighted = useCallback((from: string, to: string) => {
    if (!activeHighlight) return false;
    return (from === activeHighlight || to === activeHighlight);
  }, [activeHighlight]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, MapNode>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode(prev => prev === nodeId ? null : nodeId);
  }, []);

  const selectedNodeData = selectedNode ? nodeMap.get(selectedNode) : null;
  const selectedConnectedLabels = useMemo(() => {
    if (!selectedNode) return [];
    return edges
      .filter(e => e.from === selectedNode || e.to === selectedNode)
      .map(e => {
        const otherId = e.from === selectedNode ? e.to : e.from;
        return nodeMap.get(otherId)?.label || '';
      });
  }, [selectedNode, nodeMap]);

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Header */}
      <div className="absolute top-5 left-6 z-10">
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          FINANCIAL WORD MAP
        </h1>
        <p className="font-mono text-[10px] text-muted-foreground mt-0.5 tracking-widest">
          REAL-TIME MARKET SIGNAL TOPOLOGY
        </p>
      </div>

      {/* Search bar */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
          searchFocused ? 'border-primary/50 bg-card shadow-lg' : 'border-border bg-card/60'
        }`} style={{ width: 260 }}>
          <Search size={13} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search nodes…"
            className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none w-full font-mono"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          )}
          {!searchQuery && (
            <span className="font-mono text-[9px] text-muted-foreground border border-border rounded px-1 py-0.5">/</span>
          )}
        </div>
        {searchQuery.trim() && (
          <div className="font-mono text-[9px] text-muted-foreground text-center mt-1">
            {searchMatches.size} match{searchMatches.size !== 1 ? 'es' : ''}
          </div>
        )}
      </div>

      {/* Cluster legend */}
      <div className="absolute top-5 right-6 z-10 flex gap-2">
        {(Object.keys(clusterMeta) as ClusterType[]).map(key => (
          <button
            key={key}
            onClick={() => setSelectedCluster(prev => prev === key ? null : key)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all font-mono text-[9px] tracking-widest uppercase ${
              selectedCluster === key
                ? 'border-foreground/30 bg-secondary'
                : selectedCluster
                  ? 'border-border/50 opacity-40 hover:opacity-70'
                  : 'border-border hover:border-foreground/20'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CLUSTER_HSL[key] }} />
            {clusterMeta[key].label}
          </button>
        ))}
      </div>

      {/* SVG Map */}
      <svg
        viewBox="0 0 1120 960"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {(Object.keys(CLUSTER_HSL) as ClusterType[]).map(cluster => (
            <filter key={cluster} id={`glow-${cluster}`}>
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const fromNode = nodeMap.get(edge.from);
          const toNode = nodeMap.get(edge.to);
          if (!fromNode || !toNode) return null;
          if (!isNodeVisible(fromNode) || !isNodeVisible(toNode)) return null;

          const highlighted = isEdgeHighlighted(edge.from, edge.to);
          const dimmed = (activeHighlight && !highlighted) || (searchQuery.trim() && (!searchMatches.has(edge.from) && !searchMatches.has(edge.to)));

          const dx = toNode.x - fromNode.x;
          const dy = toNode.y - fromNode.y;
          const len = Math.sqrt(dx * dx + dy * dy);

          return (
            <g key={i}>
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={highlighted ? CLUSTER_HSL[fromNode.cluster] : 'hsla(210, 15%, 30%, 0.2)'}
                strokeWidth={highlighted ? 2 : 0.6}
                opacity={dimmed ? 0.05 : highlighted ? 0.8 : 0.12}
                style={{ transition: 'all 0.3s ease' }}
              />
              {/* Animated flow particle */}
              {!dimmed && (
                <circle r={highlighted ? 2.5 : 1.2} fill={CLUSTER_HSL[fromNode.cluster]} opacity={highlighted ? 0.9 : 0.3}>
                  <animateMotion
                    dur={`${2 + (len / 200)}s`}
                    repeatCount="indefinite"
                    path={`M${fromNode.x},${fromNode.y} L${toNode.x},${toNode.y}`}
                  />
                </circle>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          if (!isNodeVisible(node)) return null;
          const highlighted = isNodeHighlighted(node);
          const isHovered = hoveredNode === node.id;
          const isSelected = selectedNode === node.id;
          const dimmed = (activeHighlight || searchQuery.trim()) && !highlighted;

          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleNodeClick(node.id)}
              style={{ cursor: 'pointer', transition: 'opacity 0.3s ease' }}
              opacity={dimmed ? 0.1 : 1}
            >
              {/* Pulse ring for selected */}
              {isSelected && (
                <>
                  <circle cx={node.x} cy={node.y} r={node.size + 12} fill="none"
                    stroke={CLUSTER_HSL_GLOW[node.cluster]} strokeWidth={1}>
                    <animate attributeName="r" from={String(node.size + 6)} to={String(node.size + 20)} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                </>
              )}

              {/* Glow ring */}
              {(isHovered || isSelected) && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size + 6}
                  fill="none"
                  stroke={CLUSTER_HSL_GLOW[node.cluster]}
                  strokeWidth={1.5}
                  filter={`url(#glow-${node.cluster})`}
                />
              )}

              {/* Node background */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.size}
                fill={(isHovered || isSelected) ? CLUSTER_HSL_DIM[node.cluster] : 'hsla(220, 18%, 7%, 0.85)'}
                stroke={CLUSTER_HSL[node.cluster]}
                strokeWidth={(isHovered || isSelected) ? 2 : 0.8}
                style={{ transition: 'all 0.3s ease' }}
              />

              {/* Label */}
              <text
                x={node.x}
                y={node.sublabel ? node.y - 4 : node.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={(isHovered || isSelected) ? CLUSTER_HSL[node.cluster] : 'hsl(210, 20%, 80%)'}
                fontSize={node.size > 30 ? 10 : node.size > 22 ? 8.5 : 7}
                fontFamily="'Inter', sans-serif"
                fontWeight={(isHovered || isSelected) ? 700 : 500}
                style={{ transition: 'fill 0.3s ease', pointerEvents: 'none' }}
              >
                {node.label}
              </text>

              {/* Sublabel */}
              {node.sublabel && (
                <text
                  x={node.x}
                  y={node.y + 9}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="hsla(210, 15%, 50%, 0.7)"
                  fontSize={6}
                  fontFamily="'JetBrains Mono', monospace"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredNode && !selectedNode && (() => {
          const node = nodeMap.get(hoveredNode);
          if (!node) return null;
          const connections = edges.filter(e => e.from === hoveredNode || e.to === hoveredNode);
          const connectedLabels = connections.map(e => {
            const otherId = e.from === hoveredNode ? e.to : e.from;
            return nodeMap.get(otherId)?.label || '';
          });

          return (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="fixed bottom-8 left-6 z-20 rounded-lg border border-border bg-card/95 backdrop-blur-md p-3 shadow-2xl max-w-xs"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CLUSTER_HSL[node.cluster] }} />
                <span className="font-display text-xs font-semibold text-foreground">{node.label}</span>
                <span className="font-mono text-[8px] text-muted-foreground tracking-wider uppercase ml-auto">
                  {clusterMeta[node.cluster].label}
                </span>
              </div>
              {connectedLabels.length > 0 && (
                <div className="font-mono text-[9px] text-muted-foreground leading-relaxed">
                  <span className="text-secondary-foreground">Links → </span>
                  {connectedLabels.join(' · ')}
                </div>
              )}
              <div className="font-mono text-[8px] text-muted-foreground/50 mt-1">Click for details</div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedNodeData && (
          <NodeDetailPanel
            node={selectedNodeData}
            connectedLabels={selectedConnectedLabels}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </AnimatePresence>

      {/* Bottom status bar */}
      <div className="absolute bottom-5 right-6 font-mono text-[9px] text-muted-foreground tracking-wider flex gap-5">
        <span>{nodes.length} NODES</span>
        <span>{edges.length} CONNECTIONS</span>
        <span>4 CLUSTERS</span>
      </div>
    </div>
  );
}
