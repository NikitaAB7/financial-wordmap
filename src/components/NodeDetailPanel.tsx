import { motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus, Loader2, FileText, Newspaper, ExternalLink } from 'lucide-react';
import { type MapNode, type ClusterType, type NewsItem, type DocumentChunk } from '@/types';
import { useStockDetails, useNodeChunks, useNodeNews } from '@/hooks/useMapData';

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

const SENTIMENT_CONFIG = {
  positive: { color: 'hsl(152, 70%, 45%)', icon: TrendingUp, label: 'Positive' },
  negative: { color: 'hsl(0, 70%, 55%)', icon: TrendingDown, label: 'Negative' },
  neutral: { color: 'hsl(210, 15%, 50%)', icon: Minus, label: 'Neutral' },
};

interface NodeDetailPanelProps {
  node: MapNode;
  connectedLabels: string[];
  onClose: () => void;
  isMobile?: boolean;
}

function ChunkCard({ chunk }: { chunk: DocumentChunk }) {
  const getPdfUrl = () => {
    if (!chunk.pdf_url) return null;
    let url = chunk.pdf_url;
    if (chunk.bbox) {
      const bboxParam = `${chunk.bbox.x},${chunk.bbox.y},${chunk.bbox.w},${chunk.bbox.h}`;
      url += url.includes('#') ? `&bbox=${bboxParam}` : `#bbox=${bboxParam}`;
    }
    return url;
  };

  const pdfUrl = getPdfUrl();

  const content = (
    <>
      <p className="text-[10px] text-foreground/90 leading-relaxed line-clamp-3">
        {chunk.text}
      </p>
      <div className="flex items-center justify-between mt-1">
        <p className="font-mono text-[8px] text-muted-foreground">
          {chunk.source && <span>{chunk.source.length > 20 ? chunk.source.substring(0, 20) + '...' : chunk.source}</span>}
          {chunk.source && chunk.date && <span> · </span>}
          {chunk.date && <span>{chunk.date}</span>}
          {chunk.page && <span> · P{chunk.page}</span>}
        </p>
        {pdfUrl && <ExternalLink size={8} className="text-primary/70" />}
      </div>
    </>
  );

  if (pdfUrl) {
    return (
      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-2 rounded-md bg-secondary/40 border border-border/50 transition-all cursor-pointer hover:bg-secondary/70 hover:border-primary/30 no-underline"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="p-2 rounded-md bg-secondary/40 border border-border/50">
      {content}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const sentiment = SENTIMENT_CONFIG[item.sentiment];
  const SentimentIcon = sentiment.icon;

  const content = (
    <>
      <div className="flex items-start justify-between gap-1 mb-1">
        <h4 className="text-[10px] font-medium text-foreground leading-snug line-clamp-2">
          {item.title}
        </h4>
        {item.url && <ExternalLink size={8} className="text-primary/70 flex-shrink-0 mt-0.5" />}
      </div>
      <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-2 mb-1">{item.snippet}</p>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[8px] text-muted-foreground">
          {item.source} · {item.time}
        </span>
        <div className="flex items-center gap-0.5">
          <SentimentIcon size={8} style={{ color: sentiment.color }} />
          <span className="font-mono text-[7px] uppercase" style={{ color: sentiment.color }}>
            {sentiment.label}
          </span>
        </div>
      </div>
    </>
  );

  if (item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-2 rounded-md bg-secondary/40 border border-border/50 transition-all cursor-pointer hover:bg-secondary/70 hover:border-primary/30 no-underline"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="p-2 rounded-md bg-secondary/40 border border-border/50">
      {content}
    </div>
  );
}

export default function NodeDetailPanel({ node, connectedLabels, onClose, isMobile }: NodeDetailPanelProps) {
  const { data: detail, isLoading, error } = useStockDetails(node.id);
  const chunksQuery = useNodeChunks(node.id, 5);
  const newsQuery = useNodeNews(node.id, 5);
  
  const chunks = chunksQuery.data ?? [];
  const chunksLoading = chunksQuery.isLoading;
  const chunksError = chunksQuery.error;
  const news = newsQuery.data ?? [];
  const newsLoading = newsQuery.isLoading;
  const newsError = newsQuery.error;

  // Debug logging - check browser console!
  console.log('NodeDetailPanel render:', {
    nodeId: node.id,
    nodeCluster: node.cluster,
    chunksStatus: chunksQuery.status,
    chunksLength: chunks.length,
    chunksData: chunks,
    chunksError: chunksError?.message,
    newsStatus: newsQuery.status,
    newsLength: news.length,
  });

  // Loading state
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className={`fixed z-30 ${isMobile ? 'inset-x-0 bottom-0 rounded-t-2xl border-t' : 'top-20 left-4 w-80 rounded-xl border'} border-border bg-card/95 backdrop-blur-md shadow-2xl`}
      >
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </motion.div>
    );
  }

  if (!detail || error) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className={`fixed z-30 ${isMobile ? 'inset-x-0 bottom-0 rounded-t-2xl border-t' : 'top-20 left-4 w-80 rounded-xl border'} border-border bg-card/95 backdrop-blur-md shadow-2xl`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-display text-sm font-bold text-foreground">{node.label}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Details unavailable</p>
        </div>
      </motion.div>
    );
  }

  const sparkMin = Math.min(...detail.sparkline);
  const sparkMax = Math.max(...detail.sparkline);
  const sparkRange = sparkMax - sparkMin || 1;
  const sparkPoints = detail.sparkline
    .map((v, i) => `${(i / (detail.sparkline.length - 1)) * 140},${40 - ((v - sparkMin) / sparkRange) * 36}`)
    .join(' ');

  const signalColor = detail.signal === 'bullish' ? 'hsl(152, 70%, 45%)' : detail.signal === 'bearish' ? 'hsl(0, 70%, 55%)' : 'hsl(210, 15%, 50%)';
  const SignalIcon = detail.signal === 'bullish' ? TrendingUp : detail.signal === 'bearish' ? TrendingDown : Minus;

  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-border bg-card/98 backdrop-blur-xl shadow-2xl max-h-[70vh] overflow-auto"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card/98 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CLUSTER_HSL[node.cluster] }} />
            <span className="font-display text-sm font-bold text-foreground">{node.label}</span>
            <div className="flex items-center gap-1 ml-2">
              <SignalIcon size={11} style={{ color: signalColor }} />
              <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: signalColor }}>{detail.signal}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Debug banner - remove after debugging */}
          <div className="text-[8px] bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 p-1 rounded font-mono">
            DEBUG: {node.id} | chunks: {chunksQuery.status} ({chunks.length}) | news: {newsQuery.status} ({news.length})
          </div>

          {/* Price */}
          {detail.price > 0 && (
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xl font-bold text-foreground">
                ₹{detail.price >= 1000 ? detail.price.toLocaleString() : detail.price.toFixed(2)}
              </span>
              <span className="font-mono text-xs" style={{ color: detail.change >= 0 ? 'hsl(152, 70%, 45%)' : 'hsl(0, 70%, 55%)' }}>
                {detail.change >= 0 ? '+' : ''}{detail.change.toFixed(2)} ({detail.changePercent >= 0 ? '+' : ''}{detail.changePercent.toFixed(2)}%)
              </span>
            </div>
          )}

          <svg viewBox="0 0 140 44" className="w-full h-8">
            <polyline points={sparkPoints} fill="none" stroke={signalColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <p className="text-xs text-muted-foreground leading-relaxed">{detail.description}</p>

          {/* News */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <Newspaper size={11} className="text-muted-foreground" />
              <p className="font-mono text-[9px] text-muted-foreground tracking-wider">LATEST NEWS</p>
            </div>
            {newsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
            ) : news.length > 0 ? (
              <div className="space-y-2">
                {news.slice(0, 3).map((item, i) => <NewsCard key={i} item={item} />)}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground/60 text-center py-1">No news available</p>
            )}
          </div>

          {/* Concalls */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText size={11} className="text-muted-foreground" />
              <p className="font-mono text-[9px] text-muted-foreground tracking-wider">CONCALL HIGHLIGHTS</p>
            </div>
            {chunksError ? (
              <p className="text-[10px] text-destructive text-center py-1">Error loading</p>
            ) : chunksLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
            ) : chunks.length > 0 ? (
              <div className="space-y-2">
                {chunks.slice(0, 2).map((chunk, i) => <ChunkCard key={i} chunk={chunk} />)}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground/60 text-center py-1">No highlights available</p>
            )}
          </div>

          {connectedLabels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {connectedLabels.map((label, i) => (
                <span key={i} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{label}</span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Desktop view
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="fixed top-20 left-4 z-30 w-[340px] max-h-[calc(100vh-100px)] rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CLUSTER_HSL[node.cluster] }} />
          <span className="font-display text-sm font-bold text-foreground">{node.label}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Signal & Price */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <SignalIcon size={12} style={{ color: signalColor }} />
              <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: signalColor }}>{detail.signal}</span>
            </div>
            <span className="font-mono text-[9px] text-muted-foreground tracking-wider">{clusterMeta[node.cluster].label}</span>
          </div>

          {detail.price > 0 && (
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xl font-bold text-foreground">
                ₹{detail.price >= 1000 ? detail.price.toLocaleString() : detail.price.toFixed(2)}
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
            <polyline points={sparkPoints} fill="none" stroke={signalColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

        {/* News Section */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-1.5 mb-2">
            <Newspaper size={11} className="text-muted-foreground" />
            <p className="font-mono text-[9px] text-muted-foreground tracking-wider">LATEST NEWS</p>
            <span className="font-mono text-[8px] text-muted-foreground/50 ml-auto">Click to open</span>
          </div>
          {newsLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : news.length > 0 ? (
            <div className="space-y-2">
              {news.map((item, i) => <NewsCard key={i} item={item} />)}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 text-center py-2">No news available</p>
          )}
        </div>

        {/* Concall Highlights */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText size={11} className="text-muted-foreground" />
            <p className="font-mono text-[9px] text-muted-foreground tracking-wider">CONCALL HIGHLIGHTS</p>
            <span className="font-mono text-[8px] text-muted-foreground/50 ml-auto">Click to view PDF</span>
          </div>
          {chunksError ? (
            <p className="text-[10px] text-destructive text-center py-2">Error: {chunksError.message}</p>
          ) : chunksLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : chunks.length > 0 ? (
            <div className="space-y-2">
              {chunks.map((chunk, i) => <ChunkCard key={i} chunk={chunk} />)}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 text-center py-2">No highlights available (0 chunks)</p>
          )}
        </div>

        {/* Connections */}
        {connectedLabels.length > 0 && (
          <div className="px-4 py-3">
            <p className="font-mono text-[9px] text-muted-foreground tracking-wider mb-1.5">CONNECTIONS</p>
            <div className="flex flex-wrap gap-1">
              {connectedLabels.map((label, i) => (
                <span key={i} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{label}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border flex-shrink-0">
        <p className="font-mono text-[8px] text-muted-foreground/50 text-center tracking-wider">
          {news.length} NEWS · {chunks.length} DOCUMENTS
        </p>
      </div>
    </motion.div>
  );
}
