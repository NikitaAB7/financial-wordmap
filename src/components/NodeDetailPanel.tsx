import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus, Loader2, FileText, Newspaper, ExternalLink, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { type MapNode, type ClusterType, type NewsItem, type DocumentChunk, type DynamicConnection } from '@/types';
import { useStockDetails, useNodeChunks, useNodeNews } from '@/hooks/useMapData';
import { fetchDynamicConnections } from '@/services/api';

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
  onNodeNavigate?: (nodeId: string) => void;
  onChunkClick?: (chunk: DocumentChunk) => void;
  isMobile?: boolean;
}

function ChunkCard({ chunk, onChunkClick }: { chunk: DocumentChunk; onChunkClick?: (chunk: DocumentChunk) => void }) {
  const [expanded, setExpanded] = useState(false);

  const hasMoreText = chunk.text.length > 150;
  const canOpenPdf = !!chunk.source && !!onChunkClick;

  const handleCardClick = () => {
    if (canOpenPdf) {
      onChunkClick!(chunk);
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <div
      className={`p-2 rounded-md bg-secondary/40 border border-border/50 transition-all cursor-pointer hover:bg-secondary/70 hover:border-primary/30 ${expanded ? 'ring-1 ring-primary/30' : ''}`}
      onClick={handleCardClick}
    >
      {/* Prominent date display */}
      {chunk.date && (
        <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-border/30">
          <span className="font-mono text-[10px] font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
            {chunk.date}
          </span>
          {chunk.source && (
            <span className="font-mono text-[8px] text-muted-foreground truncate">
              {chunk.source.length > 25 ? chunk.source.substring(0, 25) + '...' : chunk.source}
            </span>
          )}
        </div>
      )}
      <p className={`text-[10px] text-foreground/90 leading-relaxed whitespace-pre-wrap ${expanded ? '' : 'line-clamp-3'}`}>
        {chunk.text}
      </p>
      <div className="flex items-center justify-between mt-1">
        <p className="font-mono text-[8px] text-muted-foreground">
          {!chunk.date && chunk.source && <span>{chunk.source.length > 20 ? chunk.source.substring(0, 20) + '...' : chunk.source}</span>}
          {chunk.page && <span> · P{chunk.page}</span>}
        </p>
        {hasMoreText && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-[8px] text-primary/60 hover:text-primary"
          >
            {expanded ? '▲ collapse' : '▼ expand'}
          </button>
        )}
      </div>
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
        <div className="flex items-center gap-1">
          <span className="font-mono text-[8px] text-muted-foreground">{item.source}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="font-mono text-[8px] font-medium text-primary/70">{item.time}</span>
        </div>
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

export default function NodeDetailPanel({ node, connectedLabels, onClose, onNodeNavigate, onChunkClick, isMobile }: NodeDetailPanelProps) {
  const { data: detail, isLoading, error } = useStockDetails(node.id);
  const chunksQuery = useNodeChunks(node.id, 5);
  const newsQuery = useNodeNews(node.id, 5);
  
  // Dynamic connections state
  const [dynamicConnections, setDynamicConnections] = useState<DynamicConnection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  
  const chunks = chunksQuery.data ?? [];
  const chunksLoading = chunksQuery.isLoading;
  const chunksError = chunksQuery.error;
  const news = newsQuery.data ?? [];
  const newsLoading = newsQuery.isLoading;
  const newsError = newsQuery.error;
  
  // Function to discover dynamic connections
  const handleDiscoverConnections = async () => {
    setIsLoadingConnections(true);
    setConnectionsError(null);
    try {
      const connections = await fetchDynamicConnections(node.id, 5);
      setDynamicConnections(connections);
    } catch (err) {
      setConnectionsError('Failed to discover connections');
      console.error('Error fetching dynamic connections:', err);
    } finally {
      setIsLoadingConnections(false);
    }
  };
  
  // Handle navigation to connected node
  const handleConnectionClick = (targetId: string) => {
    if (onNodeNavigate) {
      onNodeNavigate(targetId);
    }
  };

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
                {chunks.slice(0, 2).map((chunk, i) => <ChunkCard key={i} chunk={chunk} onChunkClick={onChunkClick} />)}
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
              {chunks.map((chunk, i) => <ChunkCard key={i} chunk={chunk} onChunkClick={onChunkClick} />)}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 text-center py-2">No highlights available (0 chunks)</p>
          )}
        </div>

        {/* Connections */}
        {connectedLabels.length > 0 && (
          <div className="px-4 py-3 border-b border-border">
            <p className="font-mono text-[9px] text-muted-foreground tracking-wider mb-1.5">CONNECTIONS</p>
            <div className="flex flex-wrap gap-1">
              {connectedLabels.map((label, i) => (
                <span key={i} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{label}</span>
              ))}
            </div>
          </div>
        )}
        
        {/* Dynamic Connections - AI Discover */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-amber-500" />
              <p className="font-mono text-[9px] text-muted-foreground tracking-wider">DISCOVER CONNECTIONS</p>
            </div>
          </div>
          
          {dynamicConnections.length === 0 && !isLoadingConnections && !connectionsError && (
            <button
              onClick={handleDiscoverConnections}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 hover:border-amber-500/50 transition-all group"
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles size={14} className="text-amber-500 group-hover:animate-pulse" />
                <span className="font-mono text-[10px] text-amber-500/90">Click to discover AI-powered connections</span>
              </div>
            </button>
          )}
          
          {isLoadingConnections && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span className="font-mono text-[10px] text-muted-foreground">AI analyzing connections...</span>
              </div>
            </div>
          )}
          
          {connectionsError && (
            <div className="text-center py-2">
              <p className="text-[10px] text-destructive mb-2">{connectionsError}</p>
              <button
                onClick={handleDiscoverConnections}
                className="text-[10px] text-amber-500 hover:underline"
              >
                Try again
              </button>
            </div>
          )}
          
          {dynamicConnections.length > 0 && (
            <div className="space-y-2">
              {dynamicConnections.map((conn, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleConnectionClick(conn.target)}
                  className="p-2.5 rounded-lg bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/20 hover:border-amber-500/40 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-semibold text-foreground">{conn.target_label}</span>
                      <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600">
                        {conn.relationship.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <ArrowRight size={12} className="text-amber-500/50 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">{conn.reasoning}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Zap size={9} className="text-amber-500/70" />
                    <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                        style={{ width: `${conn.strength * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-[8px] text-muted-foreground">{Math.round(conn.strength * 100)}%</span>
                  </div>
                </motion.div>
              ))}
              <button
                onClick={handleDiscoverConnections}
                className="w-full mt-2 py-1.5 text-[9px] text-amber-500/70 hover:text-amber-500 transition-colors"
              >
                ↻ Refresh connections
              </button>
            </div>
          )}
        </div>
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
