import { memo } from 'react';
import { type MapNode, type MapEdgeCompat, type ClusterType } from '@/types';

const CLUSTER_HSL: Record<ClusterType, string> = {
  news: 'hsl(38, 95%, 60%)',
  assets: 'hsl(180, 70%, 50%)',
  sectors: 'hsl(152, 70%, 45%)',
  stocks: 'hsl(270, 60%, 65%)',
};

interface MapEdgesProps {
  edges: MapEdgeCompat[];
  nodeMap: Map<string, MapNode>;
  isNodeVisible: (node: MapNode) => boolean;
  isEdgeHighlighted: (from: string, to: string) => boolean;
  activeHighlight: string | null;
  searchQuery: string;
  searchMatches: Set<string>;
}

function MapEdgesComponent({
  edges,
  nodeMap,
  isNodeVisible,
  isEdgeHighlighted,
  activeHighlight,
  searchQuery,
  searchMatches,
}: MapEdgesProps) {
  return (
    <g>
      {edges.map((edge, i) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return null;
        if (!isNodeVisible(fromNode) || !isNodeVisible(toNode)) return null;

        const highlighted = isEdgeHighlighted(edge.from, edge.to);
        const dimmed = (activeHighlight && !highlighted) || (searchQuery.trim() && (!searchMatches.has(edge.from) && !searchMatches.has(edge.to)));
        const len = Math.sqrt((toNode.x - fromNode.x) ** 2 + (toNode.y - fromNode.y) ** 2);

        return (
          <g key={i}>
            <line
              x1={fromNode.x} y1={fromNode.y}
              x2={toNode.x} y2={toNode.y}
              stroke={highlighted ? CLUSTER_HSL[fromNode.cluster] : 'hsla(210, 15%, 30%, 0.2)'}
              strokeWidth={highlighted ? 2 : 0.6}
              opacity={dimmed ? 0.05 : highlighted ? 0.8 : 0.12}
              style={{ transition: 'all 0.3s ease' }}
            />
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
    </g>
  );
}

export default memo(MapEdgesComponent);
