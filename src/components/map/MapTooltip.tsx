import { memo } from 'react';
import { motion } from 'framer-motion';
import { type MapNode, type MapEdgeCompat, type ClusterType } from '@/types';

// Static cluster metadata
const clusterMeta: Record<ClusterType, { label: string }> = {
  news: { label: 'NEWS & SENTIMENT' },
  assets: { label: 'ASSET CLASSES' },
  sectors: { label: 'SECTORS' },
  stocks: { label: 'STOCKS' },
};

const CLUSTER_HSL: Record<ClusterType, string> = {
  news: 'hsl(38, 95%, 60%)',
  assets: 'hsl(180, 70%, 50%)',
  sectors: 'hsl(152, 70%, 45%)',
  stocks: 'hsl(270, 60%, 65%)',
};

interface MapTooltipProps {
  hoveredNode: string;
  nodeMap: Map<string, MapNode>;
  edges: MapEdgeCompat[];
  isMobile: boolean;
}

function MapTooltipComponent({ hoveredNode, nodeMap, edges, isMobile }: MapTooltipProps) {
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
      className={`fixed z-20 rounded-lg border border-border bg-card/95 backdrop-blur-md p-3 shadow-2xl ${
        isMobile ? 'bottom-16 left-3 right-3' : 'bottom-8 left-6 max-w-xs'
      }`}
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
      <div className="font-mono text-[8px] text-muted-foreground/50 mt-1">Click for details & news</div>
    </motion.div>
  );
}

export default memo(MapTooltipComponent);
