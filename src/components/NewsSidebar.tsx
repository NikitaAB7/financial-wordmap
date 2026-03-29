import { motion } from 'framer-motion';
import { X, ExternalLink, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { type MapNode, type ClusterType, type NewsItem } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNodeNews } from '@/hooks/useMapData';

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

interface NewsSidebarProps {
  node: MapNode;
  onClose: () => void;
  isMobile?: boolean;
}

export default function NewsSidebar({ node, onClose, isMobile }: NewsSidebarProps) {
  const { data: news = [], isLoading, error } = useNodeNews(node.id);

  // Loading component
  const LoadingState = () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  // Error or empty state
  const EmptyState = () => (
    <p className="text-xs text-muted-foreground text-center py-12">
      {error ? 'Failed to load news' : 'No news available for this topic.'}
    </p>
  );

  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] rounded-t-2xl border-t border-border bg-card/98 backdrop-blur-xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CLUSTER_HSL[node.cluster] }} />
            <span className="font-display text-sm font-bold text-foreground">{node.label}</span>
            <span className="font-mono text-[9px] text-muted-foreground tracking-wider">NEWS</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X size={16} />
          </button>
        </div>
        <ScrollArea className="h-[calc(70vh-52px)]">
          <div className="p-3 space-y-2">
            {isLoading && <LoadingState />}
            {!isLoading && news.length === 0 && <EmptyState />}
            {!isLoading && news.map((item, i) => (
              <NewsCard key={i} item={item} />
            ))}
          </div>
        </ScrollArea>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 320 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 320 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed top-0 right-0 z-40 h-full w-80 border-l border-border bg-card/98 backdrop-blur-xl shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CLUSTER_HSL[node.cluster] }} />
          <div>
            <span className="font-display text-sm font-bold text-foreground">{node.label}</span>
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest">RELATED NEWS</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* News list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {isLoading && <LoadingState />}
          {!isLoading && news.length === 0 && <EmptyState />}
          {!isLoading && news.map((item, i) => (
            <NewsCard key={i} item={item} />
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border flex-shrink-0">
        <p className="font-mono text-[8px] text-muted-foreground/50 text-center tracking-wider">
          {isLoading ? 'LOADING...' : `${news.length} ARTICLE${news.length !== 1 ? 'S' : ''} · TAVILY`}
        </p>
      </div>
    </motion.div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const sentiment = SENTIMENT_CONFIG[item.sentiment];
  const SentimentIcon = sentiment.icon;

  const handleClick = () => {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      className="group p-3 rounded-lg border border-border hover:border-foreground/10 bg-secondary/30 hover:bg-secondary/60 transition-all cursor-pointer"
      onClick={handleClick}
      role={item.url ? "link" : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="text-xs font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        {item.url && <ExternalLink size={10} className="text-muted-foreground/40 flex-shrink-0 mt-0.5" />}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed mb-2 line-clamp-2">{item.snippet}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] text-muted-foreground font-medium">{item.source}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="font-mono text-[9px] text-muted-foreground">{item.time}</span>
        </div>
        <div className="flex items-center gap-1">
          <SentimentIcon size={9} style={{ color: sentiment.color }} />
          <span className="font-mono text-[8px] uppercase tracking-wider" style={{ color: sentiment.color }}>
            {sentiment.label}
          </span>
        </div>
      </div>
    </div>
  );
}
