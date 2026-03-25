import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { nodes, edges, clusterMeta, type MapNode, type ClusterType } from '@/data/financialMapData';

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
  const [selectedCluster, setSelectedCluster] = useState<ClusterType | null>(null);

  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const connected = new Set<string>([hoveredNode]);
    edges.forEach(e => {
      if (e.from === hoveredNode) connected.add(e.to);
      if (e.to === hoveredNode) connected.add(e.from);
    });
    return connected;
  }, [hoveredNode]);

  const isNodeVisible = useCallback((node: MapNode) => {
    if (selectedCluster && node.cluster !== selectedCluster) return false;
    return true;
  }, [selectedCluster]);

  const isNodeHighlighted = useCallback((node: MapNode) => {
    if (!hoveredNode) return true;
    return connectedNodes.has(node.id);
  }, [hoveredNode, connectedNodes]);

  const isEdgeHighlighted = useCallback((from: string, to: string) => {
    if (!hoveredNode) return false;
    return (from === hoveredNode || to === hoveredNode);
  }, [hoveredNode]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, MapNode>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, []);

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
      <div className="absolute top-6 left-8 z-10">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          FINANCIAL WORD MAP
        </h1>
        <p className="font-mono text-xs text-muted-foreground mt-1 tracking-widest">
          REAL-TIME MARKET SIGNAL TOPOLOGY
        </p>
      </div>

      {/* Cluster legend */}
      <div className="absolute top-6 right-8 z-10 flex gap-4">
        {(Object.keys(clusterMeta) as ClusterType[]).map(key => (
          <button
            key={key}
            onClick={() => setSelectedCluster(prev => prev === key ? null : key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all font-mono text-[10px] tracking-widest uppercase ${
              selectedCluster === key
                ? 'border-foreground/30 bg-secondary'
                : selectedCluster
                  ? 'border-border/50 opacity-40 hover:opacity-70'
                  : 'border-border hover:border-foreground/20'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CLUSTER_HSL[key] }}
            />
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
          const dimmed = hoveredNode && !highlighted;

          return (
            <line
              key={i}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke={highlighted ? CLUSTER_HSL[fromNode.cluster] : 'hsla(210, 15%, 30%, 0.2)'}
              strokeWidth={highlighted ? 2 : 0.8}
              opacity={dimmed ? 0.08 : highlighted ? 0.8 : 0.15}
              style={{ transition: 'all 0.3s ease' }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          if (!isNodeVisible(node)) return null;
          const highlighted = isNodeHighlighted(node);
          const isHovered = hoveredNode === node.id;
          const dimmed = hoveredNode && !highlighted;

          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer', transition: 'opacity 0.3s ease' }}
              opacity={dimmed ? 0.15 : 1}
            >
              {/* Glow ring */}
              {isHovered && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size + 8}
                  fill="none"
                  stroke={CLUSTER_HSL_GLOW[node.cluster]}
                  strokeWidth={2}
                  filter={`url(#glow-${node.cluster})`}
                />
              )}

              {/* Node background */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.size}
                fill={isHovered ? CLUSTER_HSL_DIM[node.cluster] : 'hsla(220, 18%, 7%, 0.8)'}
                stroke={CLUSTER_HSL[node.cluster]}
                strokeWidth={isHovered ? 2 : 1}
                style={{ transition: 'all 0.3s ease' }}
              />

              {/* Label */}
              <text
                x={node.x}
                y={node.sublabel ? node.y - 4 : node.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isHovered ? CLUSTER_HSL[node.cluster] : 'hsl(210, 20%, 80%)'}
                fontSize={node.size > 30 ? 10 : node.size > 24 ? 9 : 8}
                fontFamily="'Inter', sans-serif"
                fontWeight={isHovered ? 700 : 500}
                style={{ transition: 'fill 0.3s ease' }}
              >
                {node.label}
              </text>

              {/* Sublabel */}
              {node.sublabel && (
                <text
                  x={node.x}
                  y={node.y + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="hsla(210, 15%, 50%, 0.7)"
                  fontSize={7}
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {node.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredNode && (() => {
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
              className="fixed bottom-8 left-8 z-20 rounded-lg border border-border bg-card p-4 shadow-2xl max-w-xs"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: CLUSTER_HSL[node.cluster] }}
                />
                <span className="font-display text-sm font-semibold text-foreground">
                  {node.label}
                </span>
                <span className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase ml-auto">
                  {clusterMeta[node.cluster].label}
                </span>
              </div>
              {connectedLabels.length > 0 && (
                <div className="font-mono text-[10px] text-muted-foreground leading-relaxed">
                  <span className="text-secondary-foreground">Links → </span>
                  {connectedLabels.join(' · ')}
                </div>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Bottom status bar */}
      <div className="absolute bottom-6 right-8 font-mono text-[10px] text-muted-foreground tracking-wider flex gap-6">
        <span>{nodes.length} NODES</span>
        <span>{edges.length} CONNECTIONS</span>
        <span>4 CLUSTERS</span>
      </div>
    </div>
  );
}
