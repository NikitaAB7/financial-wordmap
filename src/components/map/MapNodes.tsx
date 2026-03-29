import { memo, type MutableRefObject } from 'react';
import { type MapNode, type ClusterType } from '@/types';

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

interface MapNodesProps {
  nodes: MapNode[];
  isNodeVisible: (node: MapNode) => boolean;
  isNodeHighlighted: (node: MapNode) => boolean;
  hoveredNode: string | null;
  selectedNode: string | null;
  activeHighlight: string | null;
  searchQuery: string;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  isPanning: MutableRefObject<boolean>;
}

function MapNodesComponent({
  nodes,
  isNodeVisible,
  isNodeHighlighted,
  hoveredNode,
  selectedNode,
  activeHighlight,
  searchQuery,
  onHover,
  onClick,
  isPanning,
}: MapNodesProps) {
  return (
    <g>
      {nodes.map(node => {
        if (!isNodeVisible(node)) return null;
        const highlighted = isNodeHighlighted(node);
        const isHovered = hoveredNode === node.id;
        const isSelected = selectedNode === node.id;
        const dimmed = (activeHighlight || searchQuery.trim()) && !highlighted;

        return (
          <g
            key={node.id}
            onMouseEnter={() => onHover(node.id)}
            onMouseLeave={() => onHover(null)}
            onClick={(e) => {
              if (isPanning.current) return;
              e.stopPropagation();
              onClick(node.id);
            }}
            style={{ cursor: 'pointer', transition: 'opacity 0.3s ease' }}
            opacity={dimmed ? 0.1 : 1}
          >
            {isSelected && (
              <circle cx={node.x} cy={node.y} r={node.size + 12} fill="none"
                stroke={CLUSTER_HSL_GLOW[node.cluster]} strokeWidth={1}>
                <animate attributeName="r" from={String(node.size + 6)} to={String(node.size + 20)} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
            )}

            {(isHovered || isSelected) && (
              <circle
                cx={node.x} cy={node.y} r={node.size + 6}
                fill="none" stroke={CLUSTER_HSL_GLOW[node.cluster]}
                strokeWidth={1.5} filter={`url(#glow-${node.cluster})`}
              />
            )}

            <circle
              cx={node.x} cy={node.y} r={node.size}
              fill={(isHovered || isSelected) ? CLUSTER_HSL_DIM[node.cluster] : 'hsla(220, 18%, 7%, 0.85)'}
              stroke={CLUSTER_HSL[node.cluster]}
              strokeWidth={(isHovered || isSelected) ? 2 : 0.8}
              style={{ transition: 'all 0.3s ease' }}
            />

            <text
              x={node.x} y={node.sublabel ? node.y - 4 : node.y + 1}
              textAnchor="middle" dominantBaseline="middle"
              fill={(isHovered || isSelected) ? CLUSTER_HSL[node.cluster] : 'hsl(210, 20%, 80%)'}
              fontSize={node.size > 30 ? 10 : node.size > 22 ? 8.5 : 7}
              fontFamily="'Inter', sans-serif"
              fontWeight={(isHovered || isSelected) ? 700 : 500}
              style={{ transition: 'fill 0.3s ease', pointerEvents: 'none' }}
            >
              {node.label}
            </text>

            {node.sublabel && (
              <text
                x={node.x} y={node.y + 9}
                textAnchor="middle" dominantBaseline="middle"
                fill="hsla(210, 15%, 50%, 0.7)" fontSize={6}
                fontFamily="'JetBrains Mono', monospace"
                style={{ pointerEvents: 'none' }}
              >
                {node.sublabel}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export default memo(MapNodesComponent);
