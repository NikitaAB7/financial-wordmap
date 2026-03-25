export type ClusterType = 'news' | 'assets' | 'sectors' | 'stocks';

export interface MapNode {
  id: string;
  label: string;
  cluster: ClusterType;
  x: number;
  y: number;
  size: number;
  sublabel?: string;
}

export interface MapEdge {
  from: string;
  to: string;
  label?: string;
}

// Positions designed for a 1200x800 viewBox
export const nodes: MapNode[] = [
  // Cluster 1 - News/Trending (left zone)
  { id: 'war', label: 'War Tensions', cluster: 'news', x: 120, y: 160, size: 28 },
  { id: 'fed', label: 'Fed Sentiment', cluster: 'news', x: 100, y: 320, size: 30 },
  { id: 'ai-buzz', label: 'AI Buzz', cluster: 'news', x: 140, y: 470, size: 32 },
  { id: 'climate', label: 'Climate News', cluster: 'news', x: 110, y: 610, size: 26 },
  { id: 'earnings', label: 'Earnings Surprise', cluster: 'news', x: 160, y: 740, size: 27 },

  // Cluster 2 - Asset Classes (center-left)
  { id: 'crude', label: 'Crude Oil', cluster: 'assets', x: 380, y: 130, size: 30 },
  { id: 'gold', label: 'Gold', cluster: 'assets', x: 350, y: 260, size: 34, sublabel: 'Safe Haven' },
  { id: 'usd', label: 'US Dollar', cluster: 'assets', x: 370, y: 400, size: 32 },
  { id: 'fixed-income', label: 'Fixed Income', cluster: 'assets', x: 360, y: 530, size: 28 },
  { id: 'equity', label: 'Equity Markets', cluster: 'assets', x: 400, y: 660, size: 36 },
  { id: 'commodities', label: 'Commodities', cluster: 'assets', x: 380, y: 780, size: 26 },

  // Cluster 3 - Sectors (center-right)
  { id: 'tech', label: 'Technology', cluster: 'sectors', x: 660, y: 200, size: 36 },
  { id: 'energy', label: 'Energy', cluster: 'sectors', x: 640, y: 380, size: 32 },
  { id: 'auto', label: 'Automotive', cluster: 'sectors', x: 680, y: 520, size: 28 },
  { id: 'health', label: 'Healthcare', cluster: 'sectors', x: 650, y: 650, size: 28 },
  { id: 'financial', label: 'Financial Services', cluster: 'sectors', x: 670, y: 790, size: 34 },

  // Cluster 4 - Stocks (right zone)
  { id: 'nvda', label: 'NVIDIA', cluster: 'stocks', x: 920, y: 120, size: 30 },
  { id: 'msft', label: 'Microsoft', cluster: 'stocks', x: 980, y: 220, size: 28 },
  { id: 'aapl', label: 'Apple', cluster: 'stocks', x: 940, y: 310, size: 28 },
  { id: 'xom', label: 'ExxonMobil', cluster: 'stocks', x: 950, y: 400, size: 24 },
  { id: 'cvx', label: 'Chevron', cluster: 'stocks', x: 990, y: 480, size: 22, sublabel: 'Refining Margin ↑' },
  { id: 'tsla', label: 'Tesla', cluster: 'stocks', x: 930, y: 560, size: 26 },
  { id: 'ford', label: 'Ford', cluster: 'stocks', x: 980, y: 630, size: 20 },
  { id: 'pfe', label: 'Pfizer', cluster: 'stocks', x: 940, y: 700, size: 22 },
  { id: 'jnj', label: 'J&J', cluster: 'stocks', x: 990, y: 760, size: 22 },
  { id: 'jpm', label: 'JPMorgan', cluster: 'stocks', x: 950, y: 840, size: 26 },
  { id: 'bac', label: 'BofA', cluster: 'stocks', x: 1010, y: 900, size: 22 },
];

export const edges: MapEdge[] = [
  // News → Assets
  { from: 'war', to: 'crude' },
  { from: 'war', to: 'gold' },
  { from: 'fed', to: 'fixed-income' },
  { from: 'fed', to: 'usd' },
  { from: 'ai-buzz', to: 'equity' },
  { from: 'climate', to: 'commodities' },
  { from: 'climate', to: 'crude' },
  { from: 'earnings', to: 'equity' },

  // Assets → Sectors
  { from: 'crude', to: 'energy' },
  { from: 'equity', to: 'tech' },
  { from: 'equity', to: 'financial' },
  { from: 'usd', to: 'financial' },
  { from: 'fixed-income', to: 'financial' },
  { from: 'commodities', to: 'energy' },

  // Sectors → Stocks
  { from: 'tech', to: 'nvda' },
  { from: 'tech', to: 'msft' },
  { from: 'tech', to: 'aapl' },
  { from: 'energy', to: 'xom' },
  { from: 'energy', to: 'cvx' },
  { from: 'auto', to: 'tsla' },
  { from: 'auto', to: 'ford' },
  { from: 'health', to: 'pfe' },
  { from: 'health', to: 'jnj' },
  { from: 'financial', to: 'jpm' },
  { from: 'financial', to: 'bac' },

  // Cross-cluster
  { from: 'ai-buzz', to: 'tech' },
  { from: 'earnings', to: 'financial' },
];

export const clusterMeta: Record<ClusterType, { label: string; color: string; glowVar: string }> = {
  news: { label: 'NEWS & SENTIMENT', color: 'var(--cluster-news)', glowVar: '--glow-news' },
  assets: { label: 'ASSET CLASSES', color: 'var(--cluster-assets)', glowVar: '--glow-assets' },
  sectors: { label: 'SECTORS', color: 'var(--cluster-sectors)', glowVar: '--glow-sectors' },
  stocks: { label: 'STOCKS', color: 'var(--cluster-stocks)', glowVar: '--glow-stocks' },
};
