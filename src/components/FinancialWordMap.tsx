import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, X, RotateCcw, Loader2 } from 'lucide-react';
import { type MapNode, type ClusterType } from '@/types';
import NodeDetailPanel from './NodeDetailPanel';
import { useForceLayout } from '@/hooks/useForceLayout';
import { usePanZoom } from '@/hooks/usePanZoom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMapData } from '@/hooks/useMapData';
import MapEdges from './map/MapEdges';
import MapNodes from './map/MapNodes';
import MapTooltip from './map/MapTooltip';

// Static cluster metadata (could also be fetched from API)
const clusterMeta: Record<ClusterType, { label: string; color: string }> = {
  news: { label: 'NEWS & SENTIMENT', color: 'hsl(38, 92%, 50%)' },
  assets: { label: 'ASSET CLASSES', color: 'hsl(180, 70%, 45%)' },
  sectors: { label: 'SECTORS', color: 'hsl(152, 60%, 40%)' },
  stocks: { label: 'STOCKS', color: 'hsl(270, 60%, 55%)' },
};

const CLUSTER_HSL: Record<ClusterType, string> = {
  news: 'hsl(38, 95%, 60%)',
  assets: 'hsl(180, 70%, 50%)',
  sectors: 'hsl(152, 70%, 45%)',
  stocks: 'hsl(270, 60%, 65%)',
};

export default function FinancialWordMap() {
  const isMobile = useIsMobile();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch map data from API
  const { data: mapData, isLoading, error } = useMapData();
  const rawNodes = mapData?.nodes ?? [];
  const edges = mapData?.edges ?? [];

  // Force-directed layout
  const layoutNodes = useForceLayout(rawNodes, edges);

  // Pan & zoom
  const { transform, handlers, resetView, isPanning } = usePanZoom(0.3, 4);

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
    return new Set(layoutNodes.filter(n => n.label.toLowerCase().includes(q)).map(n => n.id));
  }, [searchQuery, layoutNodes]);

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

  const nodeMap = useMemo(() => {
    const map = new Map<string, MapNode>();
    layoutNodes.forEach(n => map.set(n.id, n));
    return map;
  }, [layoutNodes]);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="relative w-full h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="font-mono text-sm text-muted-foreground">Loading market data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="relative w-full h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-6">
          <p className="font-display font-bold text-lg text-destructive">Failed to load data</p>
          <p className="font-mono text-sm text-muted-foreground">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-mono text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden select-none">
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
      <div className={`absolute top-3 left-3 z-10 ${isMobile ? '' : 'top-5 left-6'}`}>
        <h1 className={`font-display font-bold tracking-tight text-foreground ${isMobile ? 'text-sm' : 'text-xl'}`}>
          FINANCIAL WORD MAP
        </h1>
        {!isMobile && (
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5 tracking-widest">
            REAL-TIME MARKET SIGNAL TOPOLOGY
          </p>
        )}
      </div>

      {/* Search bar */}
      <div className={`absolute z-10 ${isMobile ? 'top-3 right-3 left-auto' : 'top-5 left-1/2 -translate-x-1/2'}`}>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
          searchFocused ? 'border-primary/50 bg-card shadow-lg' : 'border-border bg-card/60'
        }`} style={{ width: isMobile ? 160 : 260 }}>
          <Search size={13} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search…"
            className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none w-full font-mono"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          )}
          {!searchQuery && !isMobile && (
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
      <div className={`absolute z-10 flex gap-1.5 ${
        isMobile ? 'bottom-14 left-3 right-3 justify-center flex-wrap' : 'top-5 right-6'
      }`}>
        {(Object.keys(clusterMeta) as ClusterType[]).map(key => (
          <button
            key={key}
            onClick={() => setSelectedCluster(prev => prev === key ? null : key)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-all font-mono tracking-widest uppercase ${
              isMobile ? 'text-[7px]' : 'text-[9px]'
            } ${
              selectedCluster === key
                ? 'border-foreground/30 bg-secondary'
                : selectedCluster
                  ? 'border-border/50 opacity-40 hover:opacity-70'
                  : 'border-border hover:border-foreground/20'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CLUSTER_HSL[key] }} />
            {isMobile ? clusterMeta[key].label.split(' ')[0] : clusterMeta[key].label}
          </button>
        ))}
      </div>

      {/* Reset zoom button */}
      <button
        onClick={resetView}
        className={`absolute z-10 p-2 rounded-lg border border-border bg-card/80 hover:bg-card text-muted-foreground hover:text-foreground transition-all ${
          isMobile ? 'bottom-14 right-3' : 'bottom-12 right-6'
        }`}
        title="Reset view"
      >
        <RotateCcw size={14} />
      </button>

      {/* SVG Map with pan/zoom */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        {...handlers}
        style={{ touchAction: 'none' }}
      >
        <svg
          viewBox="0 0 1120 960"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ transform, transformOrigin: '0 0' }}
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

          <MapEdges
            edges={edges}
            nodeMap={nodeMap}
            isNodeVisible={isNodeVisible}
            isEdgeHighlighted={isEdgeHighlighted}
            activeHighlight={activeHighlight}
            searchQuery={searchQuery}
            searchMatches={searchMatches}
          />

          <MapNodes
            nodes={layoutNodes}
            isNodeVisible={isNodeVisible}
            isNodeHighlighted={isNodeHighlighted}
            hoveredNode={hoveredNode}
            selectedNode={selectedNode}
            activeHighlight={activeHighlight}
            searchQuery={searchQuery}
            onHover={setHoveredNode}
            onClick={handleNodeClick}
            isPanning={isPanning}
          />
        </svg>
      </div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredNode && !selectedNode && (
          <MapTooltip
            hoveredNode={hoveredNode}
            nodeMap={nodeMap}
            edges={edges}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      {/* Detail Panel (includes news and concalls) */}
      <AnimatePresence>
        {selectedNodeData && (
          <NodeDetailPanel
            node={selectedNodeData}
            connectedLabels={selectedConnectedLabels}
            onClose={() => setSelectedNode(null)}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      {/* Bottom status bar */}
      {!isMobile && (
        <div className="absolute bottom-5 right-6 font-mono text-[9px] text-muted-foreground tracking-wider flex gap-5">
          <span>{layoutNodes.length} NODES</span>
          <span>{edges.length} CONNECTIONS</span>
          <span>4 CLUSTERS</span>
        </div>
      )}
    </div>
  );
}
