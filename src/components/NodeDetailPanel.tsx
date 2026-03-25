import { motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { type MapNode, type ClusterType, nodeDetails, clusterMeta } from '@/data/financialMapData';

const CLUSTER_HSL: Record<ClusterType, string> = {
  news: 'hsl(38, 95%, 60%)',
  assets: 'hsl(180, 70%, 50%)',
  sectors: 'hsl(152, 70%, 45%)',
  stocks: 'hsl(270, 60%, 65%)',
};

interface NodeDetailPanelProps {
  node: MapNode;
  connectedLabels: string[];
  onClose: () => void;
}

export default function NodeDetailPanel({ node, connectedLabels, onClose }: NodeDetailPanelProps) {
  const detail = nodeDetails[node.id];
  if (!detail) return null;

  const sparkMin = Math.min(...detail.sparkline);
  const sparkMax = Math.max(...detail.sparkline);
  const sparkRange = sparkMax - sparkMin || 1;
  const sparkPoints = detail.sparkline
    .map((v, i) => `${(i / (detail.sparkline.length - 1)) * 140},${40 - ((v - sparkMin) / sparkRange) * 36}`)
    .join(' ');

  const signalColor = detail.signal === 'bullish' ? 'hsl(152, 70%, 45%)' : detail.signal === 'bearish' ? 'hsl(0, 70%, 55%)' : 'hsl(210, 15%, 50%)';
  const SignalIcon = detail.signal === 'bullish' ? TrendingUp : detail.signal === 'bearish' ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="fixed top-20 right-4 z-30 w-72 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CLUSTER_HSL[node.cluster] }} />
          <span className="font-display text-sm font-bold text-foreground">{node.label}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Signal & Price */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <SignalIcon size={12} style={{ color: signalColor }} />
            <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: signalColor }}>
              {detail.signal}
            </span>
          </div>
          <span className="font-mono text-[9px] text-muted-foreground tracking-wider">
            {clusterMeta[node.cluster].label}
          </span>
        </div>

        {detail.price > 0 && (
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xl font-bold text-foreground">
              {detail.price >= 1000 ? detail.price.toLocaleString() : detail.price.toFixed(2)}
            </span>
            <span className="font-mono text-xs" style={{ color: detail.change >= 0 ? 'hsl(152, 70%, 45%)' : 'hsl(0, 70%, 55%)' }}>
              {detail.change >= 0 ? '+' : ''}{detail.change.toFixed(2)} ({detail.changePercent >= 0 ? '+' : ''}{detail.changePercent.toFixed(2)}%)
            </span>
          </div>
        )}

        {detail.price === 0 && detail.changePercent !== 0 && (
          <div className="font-mono text-lg font-bold" style={{ color: detail.changePercent >= 0 ? 'hsl(152, 70%, 45%)' : 'hsl(0, 70%, 55%)' }}>
            {detail.changePercent >= 0 ? '+' : ''}{detail.changePercent.toFixed(2)}%
          </div>
        )}
      </div>

      {/* Sparkline */}
      <div className="px-4 py-3 border-b border-border">
        <p className="font-mono text-[9px] text-muted-foreground tracking-wider mb-2">7D TREND</p>
        <svg viewBox="0 0 140 44" className="w-full h-10">
          <polyline
            points={sparkPoints}
            fill="none"
            stroke={signalColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={`0,44 ${sparkPoints} 140,44`}
            fill={detail.signal === 'bullish' ? 'hsla(152, 70%, 45%, 0.08)' : detail.signal === 'bearish' ? 'hsla(0, 70%, 55%, 0.08)' : 'hsla(210, 15%, 50%, 0.05)'}
            stroke="none"
          />
        </svg>
      </div>

      {/* Stats */}
      {(detail.volume !== '—' || detail.marketCap !== '—') && (
        <div className="px-4 py-3 border-b border-border grid grid-cols-2 gap-3">
          {detail.volume !== '—' && (
            <div>
              <p className="font-mono text-[9px] text-muted-foreground tracking-wider">VOLUME</p>
              <p className="font-mono text-xs text-foreground font-medium">{detail.volume}</p>
            </div>
          )}
          {detail.marketCap !== '—' && (
            <div>
              <p className="font-mono text-[9px] text-muted-foreground tracking-wider">MKT CAP</p>
              <p className="font-mono text-xs text-foreground font-medium">{detail.marketCap}</p>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">{detail.description}</p>
      </div>

      {/* Connections */}
      {connectedLabels.length > 0 && (
        <div className="px-4 py-3">
          <p className="font-mono text-[9px] text-muted-foreground tracking-wider mb-1.5">CONNECTIONS</p>
          <div className="flex flex-wrap gap-1">
            {connectedLabels.map((label, i) => (
              <span key={i} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
