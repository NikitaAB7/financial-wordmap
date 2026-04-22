import { memo, type MutableRefObject } from 'react';
import { type MapNode, type ClusterType, type NodeHighlight } from '@/types';

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
  news: 'hsla(38, 95%, 60%, 0.6)',
  assets: 'hsla(180, 70%, 50%, 0.6)',
  sectors: 'hsla(152, 70%, 45%, 0.6)',
  stocks: 'hsla(270, 60%, 65%, 0.6)',
};

// Enhanced glow for hover states
const CLUSTER_HSL_GLOW_INTENSE: Record<ClusterType, string> = {
  news: 'hsla(38, 100%, 65%, 0.9)',
  assets: 'hsla(180, 80%, 55%, 0.9)',
  sectors: 'hsla(152, 80%, 50%, 0.9)',
  stocks: 'hsla(270, 70%, 70%, 0.9)',
};

// Topic sentiment colors
const SENTIMENT_COLORS = {
  positive: 'hsl(152, 70%, 45%)',
  negative: 'hsl(0, 70%, 55%)',
  neutral: 'hsl(38, 70%, 55%)',
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
  topicHighlights?: Map<string, NodeHighlight>;
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
  topicHighlights,
}: MapNodesProps) {
  return (
    <g>
      {nodes.map((node, index) => {
        if (!isNodeVisible(node)) return null;
        const highlighted = isNodeHighlighted(node);
        const isHovered = hoveredNode === node.id;
        const isSelected = selectedNode === node.id;
        const dimmed = (activeHighlight || searchQuery.trim()) && !highlighted;
        
        // Staggered entrance animation delay based on cluster and index
        const clusterOrder = { news: 0, assets: 1, sectors: 2, stocks: 3 };
        const staggerDelay = (clusterOrder[node.cluster] * 0.15) + (index * 0.008);
        
        // Check for topic highlight
        const topicHighlight = topicHighlights?.get(node.id);
        const hasTopicHighlight = !!topicHighlight;
        const topicSentimentColor = topicHighlight 
          ? SENTIMENT_COLORS[topicHighlight.sentiment] 
          : null;
        const topicIntensity = topicHighlight?.intensity ?? 0;

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
            style={{ 
              cursor: 'pointer', 
              transition: 'opacity 0.3s ease',
              animation: `nodeEnter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${staggerDelay}s both`
            }}
            opacity={dimmed ? 0.1 : 1}
          >
            {/* Topic highlight ring - pulsing animation for news-driven highlights */}
            {hasTopicHighlight && !dimmed && (
              <>
                <circle 
                  cx={node.x} 
                  cy={node.y} 
                  r={node.size + 8 + topicIntensity * 6} 
                  fill="none"
                  stroke={topicSentimentColor!}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  opacity={0.6}
                >
                  <animate 
                    attributeName="r" 
                    from={String(node.size + 4)} 
                    to={String(node.size + 14 + topicIntensity * 8)} 
                    dur="3s" 
                    repeatCount="indefinite" 
                  />
                  <animate 
                    attributeName="opacity" 
                    from="0.7" 
                    to="0.1" 
                    dur="3s" 
                    repeatCount="indefinite" 
                  />
                </circle>
                {/* Second ring for stronger topics */}
                {topicIntensity > 0.5 && (
                  <circle 
                    cx={node.x} 
                    cy={node.y} 
                    r={node.size + 4} 
                    fill="none"
                    stroke={topicSentimentColor!}
                    strokeWidth={2}
                    opacity={0.4}
                  >
                    <animate 
                      attributeName="r" 
                      from={String(node.size + 2)} 
                      to={String(node.size + 12)} 
                      dur="2s" 
                      repeatCount="indefinite" 
                    />
                    <animate 
                      attributeName="opacity" 
                      from="0.5" 
                      to="0" 
                      dur="2s" 
                      repeatCount="indefinite" 
                    />
                  </circle>
                )}
              </>
            )}
            
            {isSelected && (
              <>
                {/* Outer pulsing ring */}
                <circle cx={node.x} cy={node.y} r={node.size + 12} fill="none"
                  stroke={CLUSTER_HSL_GLOW[node.cluster]} strokeWidth={1}>
                  <animate attributeName="r" from={String(node.size + 6)} to={String(node.size + 24)} dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.7" to="0" dur="2.5s" repeatCount="indefinite" />
                </circle>
                {/* Inner pulse */}
                <circle cx={node.x} cy={node.y} r={node.size + 8} fill="none"
                  stroke={CLUSTER_HSL_GLOW_INTENSE[node.cluster]} strokeWidth={2}>
                  <animate attributeName="r" from={String(node.size + 4)} to={String(node.size + 16)} dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.9" to="0" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </>
            )}

            {/* Enhanced hover glow with multiple layers */}
            {(isHovered || isSelected) && (
              <>
                {/* Soft outer glow */}
                <circle
                  cx={node.x} cy={node.y} r={node.size + 10}
                  fill="none" stroke={CLUSTER_HSL_GLOW[node.cluster]}
                  strokeWidth={4} opacity={0.3}
                  style={{ filter: 'blur(4px)' }}
                />
                {/* Crisp inner ring */}
                <circle
                  cx={node.x} cy={node.y} r={node.size + 5}
                  fill="none" stroke={CLUSTER_HSL_GLOW_INTENSE[node.cluster]}
                  strokeWidth={2} filter={`url(#glow-${node.cluster})`}
                />
                {/* Bright accent ring */}
                <circle
                  cx={node.x} cy={node.y} r={node.size + 3}
                  fill="none" stroke={CLUSTER_HSL[node.cluster]}
                  strokeWidth={1.5} opacity={0.8}
                />
              </>
            )}

            <circle
              cx={node.x} cy={node.y} r={node.size}
              fill={(isHovered || isSelected) ? CLUSTER_HSL_DIM[node.cluster] : 'hsla(220, 18%, 7%, 0.85)'}
              stroke={hasTopicHighlight && !dimmed ? topicSentimentColor! : CLUSTER_HSL[node.cluster]}
              strokeWidth={hasTopicHighlight && !dimmed ? 2.5 : ((isHovered || isSelected) ? 2.5 : 1)}
              style={{ 
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: (isHovered || isSelected) ? `drop-shadow(0 0 8px ${CLUSTER_HSL_GLOW[node.cluster]})` : 'none'
              }}
            />

            <text
              x={node.x} y={node.sublabel ? node.y - 4 : node.y + 1}
              textAnchor="middle" dominantBaseline="middle"
              fill={(isHovered || isSelected) ? CLUSTER_HSL[node.cluster] : 'hsl(210, 20%, 80%)'}
              fontSize={node.size > 30 ? 11 : node.size > 22 ? 9 : 7.5}
              fontFamily="'Inter', sans-serif"
              fontWeight={(isHovered || isSelected) ? 700 : 500}
              letterSpacing={(isHovered || isSelected) ? '0.02em' : '0'}
              style={{ 
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
                pointerEvents: 'none',
                textShadow: (isHovered || isSelected) ? `0 0 12px ${CLUSTER_HSL_GLOW[node.cluster]}` : 'none'
              }}
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
            
            {/* Topic indicator badge */}
            {hasTopicHighlight && !dimmed && (
              <g>
                <circle
                  cx={node.x + node.size * 0.7}
                  cy={node.y - node.size * 0.7}
                  r={5}
                  fill={topicSentimentColor!}
                  stroke="hsl(220, 18%, 7%)"
                  strokeWidth={1}
                />
                <text
                  x={node.x + node.size * 0.7}
                  y={node.y - node.size * 0.7 + 0.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={6}
                  fontWeight="bold"
                  fontFamily="'JetBrains Mono', monospace"
                  style={{ pointerEvents: 'none' }}
                >
                  {topicHighlight.headline_count > 9 ? '9+' : topicHighlight.headline_count}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

export default memo(MapNodesComponent);
