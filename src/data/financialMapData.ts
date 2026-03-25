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

export interface StockDetail {
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  sparkline: number[];
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
}

export interface NewsItem {
  title: string;
  source: string;
  time: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  snippet: string;
}

// Positions designed for a 1120x960 viewBox
export const nodes: MapNode[] = [
  // Cluster 1 - News/Trending (left zone)
  { id: 'war', label: 'War Tensions', cluster: 'news', x: 110, y: 140, size: 28 },
  { id: 'fed', label: 'Fed Sentiment', cluster: 'news', x: 90, y: 290, size: 30 },
  { id: 'ai-buzz', label: 'AI Buzz', cluster: 'news', x: 130, y: 440, size: 32 },
  { id: 'climate', label: 'Climate News', cluster: 'news', x: 100, y: 580, size: 26 },
  { id: 'earnings', label: 'Earnings Surprise', cluster: 'news', x: 150, y: 720, size: 27 },
  { id: 'trade-war', label: 'Trade Policy', cluster: 'news', x: 60, y: 210, size: 22 },
  { id: 'crypto-news', label: 'Crypto Sentiment', cluster: 'news', x: 170, y: 170, size: 20 },
  { id: 'jobs-data', label: 'Jobs Data', cluster: 'news', x: 50, y: 440, size: 21 },
  { id: 'inflation', label: 'Inflation Watch', cluster: 'news', x: 70, y: 680, size: 24 },
  { id: 'geopolitics', label: 'Geopolitics', cluster: 'news', x: 180, y: 860, size: 23 },

  // Cluster 2 - Asset Classes (center-left)
  { id: 'crude', label: 'Crude Oil', cluster: 'assets', x: 340, y: 120, size: 30 },
  { id: 'gold', label: 'Gold', cluster: 'assets', x: 310, y: 250, size: 34, sublabel: 'Safe Haven' },
  { id: 'usd', label: 'US Dollar', cluster: 'assets', x: 330, y: 390, size: 32 },
  { id: 'fixed-income', label: 'Fixed Income', cluster: 'assets', x: 320, y: 520, size: 28 },
  { id: 'equity', label: 'Equity Markets', cluster: 'assets', x: 360, y: 650, size: 36 },
  { id: 'commodities', label: 'Commodities', cluster: 'assets', x: 340, y: 780, size: 26 },
  { id: 'bitcoin', label: 'Bitcoin', cluster: 'assets', x: 280, y: 160, size: 24 },
  { id: 'natural-gas', label: 'Natural Gas', cluster: 'assets', x: 400, y: 230, size: 20 },
  { id: 'silver', label: 'Silver', cluster: 'assets', x: 260, y: 340, size: 20 },
  { id: 'bonds-10y', label: '10Y Treasury', cluster: 'assets', x: 400, y: 460, size: 22 },
  { id: 'real-estate', label: 'Real Estate', cluster: 'assets', x: 290, y: 700, size: 22 },
  { id: 'vix', label: 'VIX', cluster: 'assets', x: 400, y: 870, size: 24, sublabel: 'Fear Index' },

  // Cluster 3 - Sectors (center-right)
  { id: 'tech', label: 'Technology', cluster: 'sectors', x: 620, y: 180, size: 36 },
  { id: 'energy', label: 'Energy', cluster: 'sectors', x: 600, y: 350, size: 32 },
  { id: 'auto', label: 'Automotive', cluster: 'sectors', x: 640, y: 490, size: 28 },
  { id: 'health', label: 'Healthcare', cluster: 'sectors', x: 610, y: 630, size: 28 },
  { id: 'financial', label: 'Financial Services', cluster: 'sectors', x: 630, y: 770, size: 34 },
  { id: 'consumer', label: 'Consumer Disc.', cluster: 'sectors', x: 570, y: 260, size: 22 },
  { id: 'utilities', label: 'Utilities', cluster: 'sectors', x: 680, y: 420, size: 20 },
  { id: 'materials', label: 'Materials', cluster: 'sectors', x: 560, y: 510, size: 20 },
  { id: 'telecom', label: 'Telecom', cluster: 'sectors', x: 680, y: 700, size: 21 },
  { id: 'defense', label: 'Defense', cluster: 'sectors', x: 570, y: 870, size: 23 },

  // Cluster 4 - Stocks (right zone)
  { id: 'nvda', label: 'NVIDIA', cluster: 'stocks', x: 870, y: 100, size: 30 },
  { id: 'msft', label: 'Microsoft', cluster: 'stocks', x: 940, y: 180, size: 28 },
  { id: 'aapl', label: 'Apple', cluster: 'stocks', x: 880, y: 270, size: 28 },
  { id: 'googl', label: 'Alphabet', cluster: 'stocks', x: 1000, y: 120, size: 24 },
  { id: 'amzn', label: 'Amazon', cluster: 'stocks', x: 1020, y: 250, size: 25 },
  { id: 'meta', label: 'Meta', cluster: 'stocks', x: 960, y: 310, size: 22 },
  { id: 'xom', label: 'ExxonMobil', cluster: 'stocks', x: 900, y: 380, size: 24 },
  { id: 'cvx', label: 'Chevron', cluster: 'stocks', x: 1000, y: 420, size: 22, sublabel: 'Refining ↑' },
  { id: 'tsla', label: 'Tesla', cluster: 'stocks', x: 880, y: 500, size: 26 },
  { id: 'ford', label: 'Ford', cluster: 'stocks', x: 980, y: 540, size: 20 },
  { id: 'rivn', label: 'Rivian', cluster: 'stocks', x: 1040, y: 490, size: 16 },
  { id: 'pfe', label: 'Pfizer', cluster: 'stocks', x: 890, y: 620, size: 22 },
  { id: 'jnj', label: 'J&J', cluster: 'stocks', x: 970, y: 660, size: 22 },
  { id: 'unh', label: 'UnitedHealth', cluster: 'stocks', x: 1040, y: 610, size: 20 },
  { id: 'jpm', label: 'JPMorgan', cluster: 'stocks', x: 890, y: 760, size: 26 },
  { id: 'bac', label: 'BofA', cluster: 'stocks', x: 960, y: 830, size: 22 },
  { id: 'gs', label: 'Goldman Sachs', cluster: 'stocks', x: 1040, y: 770, size: 20 },
  { id: 'lmt', label: 'Lockheed', cluster: 'stocks', x: 870, y: 880, size: 20 },
  { id: 'rtx', label: 'RTX Corp', cluster: 'stocks', x: 1000, y: 900, size: 18 },
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
  { from: 'trade-war', to: 'usd' },
  { from: 'trade-war', to: 'commodities' },
  { from: 'crypto-news', to: 'bitcoin' },
  { from: 'jobs-data', to: 'fixed-income' },
  { from: 'jobs-data', to: 'equity' },
  { from: 'inflation', to: 'gold' },
  { from: 'inflation', to: 'bonds-10y' },
  { from: 'geopolitics', to: 'vix' },
  { from: 'geopolitics', to: 'gold' },
  { from: 'war', to: 'natural-gas' },
  { from: 'fed', to: 'bonds-10y' },

  // Assets → Sectors
  { from: 'crude', to: 'energy' },
  { from: 'equity', to: 'tech' },
  { from: 'equity', to: 'financial' },
  { from: 'usd', to: 'financial' },
  { from: 'fixed-income', to: 'financial' },
  { from: 'commodities', to: 'energy' },
  { from: 'equity', to: 'consumer' },
  { from: 'natural-gas', to: 'utilities' },
  { from: 'commodities', to: 'materials' },
  { from: 'real-estate', to: 'financial' },
  { from: 'vix', to: 'financial' },

  // Sectors → Stocks
  { from: 'tech', to: 'nvda' },
  { from: 'tech', to: 'msft' },
  { from: 'tech', to: 'aapl' },
  { from: 'tech', to: 'googl' },
  { from: 'tech', to: 'amzn' },
  { from: 'tech', to: 'meta' },
  { from: 'energy', to: 'xom' },
  { from: 'energy', to: 'cvx' },
  { from: 'auto', to: 'tsla' },
  { from: 'auto', to: 'ford' },
  { from: 'auto', to: 'rivn' },
  { from: 'health', to: 'pfe' },
  { from: 'health', to: 'jnj' },
  { from: 'health', to: 'unh' },
  { from: 'financial', to: 'jpm' },
  { from: 'financial', to: 'bac' },
  { from: 'financial', to: 'gs' },
  { from: 'defense', to: 'lmt' },
  { from: 'defense', to: 'rtx' },
  { from: 'consumer', to: 'amzn' },
  { from: 'consumer', to: 'tsla' },
  { from: 'telecom', to: 'meta' },
  { from: 'telecom', to: 'googl' },

  // Cross-cluster
  { from: 'ai-buzz', to: 'tech' },
  { from: 'earnings', to: 'financial' },
  { from: 'war', to: 'defense' },
  { from: 'geopolitics', to: 'defense' },
  { from: 'crypto-news', to: 'tech' },
];

export const clusterMeta: Record<ClusterType, { label: string; color: string; glowVar: string }> = {
  news: { label: 'NEWS & SENTIMENT', color: 'var(--cluster-news)', glowVar: '--glow-news' },
  assets: { label: 'ASSET CLASSES', color: 'var(--cluster-assets)', glowVar: '--glow-assets' },
  sectors: { label: 'SECTORS', color: 'var(--cluster-sectors)', glowVar: '--glow-sectors' },
  stocks: { label: 'STOCKS', color: 'var(--cluster-stocks)', glowVar: '--glow-stocks' },
};

// Mock detail data for all nodes
export const nodeDetails: Record<string, StockDetail> = {
  war: { price: 0, change: 0, changePercent: 0, volume: '—', marketCap: '—', sparkline: [60, 72, 68, 80, 75, 90, 85, 92], signal: 'bearish', description: 'Escalating geopolitical tensions driving risk-off sentiment across global markets.' },
  fed: { price: 0, change: 0, changePercent: 0, volume: '—', marketCap: '—', sparkline: [50, 48, 52, 55, 53, 58, 56, 54], signal: 'neutral', description: 'Federal Reserve policy stance monitored for rate trajectory signals.' },
  'ai-buzz': { price: 0, change: 0, changePercent: 0, volume: '—', marketCap: '—', sparkline: [30, 45, 55, 70, 80, 75, 90, 95], signal: 'bullish', description: 'AI sector momentum accelerating with new model releases and enterprise adoption.' },
  climate: { price: 0, change: 0, changePercent: 0, volume: '—', marketCap: '—', sparkline: [40, 42, 50, 48, 55, 60, 58, 62], signal: 'neutral', description: 'Climate policy developments impacting energy transition investments.' },
  earnings: { price: 0, change: 0, changePercent: 0, volume: '—', marketCap: '—', sparkline: [50, 55, 52, 60, 58, 65, 70, 68], signal: 'bullish', description: 'Q4 earnings season showing stronger-than-expected results across sectors.' },
  'trade-war': { price: 0, change: 0, changePercent: 0, volume: '—', marketCap: '—', sparkline: [45, 50, 55, 48, 52, 60, 55, 58], signal: 'bearish', description: 'Trade tariff escalation threatening supply chain stability.' },
  'crypto-news': { price: 0, change: 0, changePercent: 0, volume: '—', marketCap: '—', sparkline: [30, 50, 45, 65, 55, 80, 70, 85], signal: 'bullish', description: 'Institutional crypto adoption narrative gaining momentum.' },
  'jobs-data': { price: 0, change: 0, changePercent: 0, volume: '—', marketCap: '—', sparkline: [60, 58, 62, 55, 57, 53, 50, 52], signal: 'neutral', description: 'Non-farm payrolls data influencing Fed rate expectations.' },
  inflation: { price: 0, change: 0, changePercent: 0, volume: '—', marketCap: '—', sparkline: [70, 65, 68, 60, 55, 58, 52, 50], signal: 'bearish', description: 'CPI and PCE inflation metrics showing sticky core readings.' },
  geopolitics: { price: 0, change: 0, changePercent: 0, volume: '—', marketCap: '—', sparkline: [40, 55, 50, 65, 60, 75, 70, 80], signal: 'bearish', description: 'Rising global instability creating safe-haven demand.' },

  crude: { price: 78.42, change: 2.15, changePercent: 2.82, volume: '1.2M', marketCap: '—', sparkline: [72, 74, 73, 76, 75, 78, 77, 78], signal: 'bullish', description: 'WTI crude rallying on OPEC+ supply discipline and demand recovery.' },
  gold: { price: 2341.80, change: 18.50, changePercent: 0.80, volume: '890K', marketCap: '—', sparkline: [2280, 2300, 2310, 2295, 2320, 2335, 2340, 2342], signal: 'bullish', description: 'Gold at all-time highs as central bank buying persists.' },
  usd: { price: 104.20, change: -0.35, changePercent: -0.34, volume: '—', marketCap: '—', sparkline: [105, 104.8, 104.5, 104.2, 104.6, 104.3, 104.1, 104.2], signal: 'neutral', description: 'Dollar index consolidating near resistance on mixed data.' },
  'fixed-income': { price: 4.25, change: -0.03, changePercent: -0.70, volume: '—', marketCap: '—', sparkline: [4.35, 4.32, 4.28, 4.30, 4.27, 4.26, 4.25, 4.25], signal: 'neutral', description: '10Y yields easing on dovish Fed tilt expectations.' },
  equity: { price: 5280.50, change: 45.20, changePercent: 0.86, volume: '4.2B', marketCap: '—', sparkline: [5200, 5220, 5240, 5230, 5260, 5270, 5275, 5280], signal: 'bullish', description: 'S&P 500 grinding higher on AI momentum and earnings beats.' },
  commodities: { price: 0, change: 0, changePercent: 1.2, volume: '—', marketCap: '—', sparkline: [100, 102, 101, 105, 104, 108, 106, 108], signal: 'bullish', description: 'Broad commodity index rising on supply constraints.' },
  bitcoin: { price: 67840, change: 2150, changePercent: 3.27, volume: '28B', marketCap: '1.34T', sparkline: [63000, 64500, 65200, 64800, 66000, 67200, 67500, 67840], signal: 'bullish', description: 'Bitcoin surging post-halving with ETF inflows accelerating.' },
  'natural-gas': { price: 2.85, change: 0.12, changePercent: 4.40, volume: '450K', marketCap: '—', sparkline: [2.5, 2.6, 2.55, 2.7, 2.75, 2.8, 2.82, 2.85], signal: 'bullish', description: 'Natural gas spiking on inventory draws and export demand.' },
  silver: { price: 29.45, change: 0.85, changePercent: 2.97, volume: '320K', marketCap: '—', sparkline: [27.5, 28, 28.5, 28.2, 29, 29.2, 29.3, 29.45], signal: 'bullish', description: 'Silver benefiting from both industrial demand and precious metals rally.' },
  'bonds-10y': { price: 4.25, change: -0.05, changePercent: -1.16, volume: '—', marketCap: '—', sparkline: [4.4, 4.38, 4.35, 4.32, 4.30, 4.28, 4.26, 4.25], signal: 'neutral', description: 'Treasury yields drifting lower as rate cut expectations build.' },
  'real-estate': { price: 0, change: 0, changePercent: -0.8, volume: '—', marketCap: '—', sparkline: [105, 104, 103, 102, 103, 102, 101, 101], signal: 'bearish', description: 'Commercial real estate under pressure from higher rates and remote work.' },
  vix: { price: 14.80, change: 1.20, changePercent: 8.82, volume: '—', marketCap: '—', sparkline: [12, 12.5, 13, 12.8, 13.5, 14, 14.5, 14.8], signal: 'bearish', description: 'Volatility index creeping up as geopolitical risks rise.' },

  tech: { price: 0, change: 0, changePercent: 2.1, volume: '—', marketCap: '14.2T', sparkline: [90, 92, 94, 93, 96, 98, 100, 102], signal: 'bullish', description: 'Technology sector leading market gains on AI infrastructure buildout.' },
  energy: { price: 0, change: 0, changePercent: 1.5, volume: '—', marketCap: '3.8T', sparkline: [80, 82, 81, 84, 83, 86, 85, 87], signal: 'bullish', description: 'Energy sector benefiting from tight supply and refining margins.' },
  auto: { price: 0, change: 0, changePercent: -0.3, volume: '—', marketCap: '1.9T', sparkline: [70, 68, 72, 69, 71, 67, 70, 69], signal: 'neutral', description: 'Automotive sector mixed as EV demand normalizes.' },
  health: { price: 0, change: 0, changePercent: 0.8, volume: '—', marketCap: '5.1T', sparkline: [85, 86, 84, 87, 86, 88, 87, 88], signal: 'neutral', description: 'Healthcare sector steady with defensive positioning appeal.' },
  financial: { price: 0, change: 0, changePercent: 1.2, volume: '—', marketCap: '6.4T', sparkline: [75, 77, 76, 79, 78, 80, 81, 82], signal: 'bullish', description: 'Financial sector rallying on net interest margin expansion.' },
  consumer: { price: 0, change: 0, changePercent: 0.5, volume: '—', marketCap: '4.8T', sparkline: [60, 62, 61, 63, 62, 64, 63, 64], signal: 'neutral', description: 'Consumer discretionary supported by resilient spending.' },
  utilities: { price: 0, change: 0, changePercent: 0.2, volume: '—', marketCap: '1.2T', sparkline: [50, 51, 50, 52, 51, 52, 51, 52], signal: 'neutral', description: 'Utilities sector steady as rate-sensitive defensive play.' },
  materials: { price: 0, change: 0, changePercent: 0.9, volume: '—', marketCap: '1.5T', sparkline: [55, 56, 57, 56, 58, 59, 58, 59], signal: 'neutral', description: 'Materials sector firming on infrastructure spending outlook.' },
  telecom: { price: 0, change: 0, changePercent: -0.4, volume: '—', marketCap: '2.1T', sparkline: [45, 44, 46, 43, 45, 44, 43, 44], signal: 'bearish', description: 'Telecom sector under pressure from capex requirements.' },
  defense: { price: 0, change: 0, changePercent: 3.2, volume: '—', marketCap: '0.8T', sparkline: [70, 72, 75, 78, 80, 82, 85, 88], signal: 'bullish', description: 'Defense sector surging on increased global military spending.' },

  nvda: { price: 924.50, change: 32.40, changePercent: 3.63, volume: '48M', marketCap: '2.28T', sparkline: [850, 870, 880, 890, 900, 910, 920, 924], signal: 'bullish', description: 'NVIDIA continues to dominate AI GPU market with record data center revenue.' },
  msft: { price: 428.30, change: 5.20, changePercent: 1.23, volume: '22M', marketCap: '3.18T', sparkline: [415, 418, 420, 422, 424, 426, 427, 428], signal: 'bullish', description: 'Microsoft Azure AI services driving cloud revenue acceleration.' },
  aapl: { price: 192.80, change: -1.40, changePercent: -0.72, volume: '35M', marketCap: '2.97T', sparkline: [196, 195, 194, 193, 194, 193, 193, 193], signal: 'neutral', description: 'Apple navigating China headwinds while Vision Pro ramps.' },
  googl: { price: 175.60, change: 3.80, changePercent: 2.21, volume: '28M', marketCap: '2.16T', sparkline: [168, 170, 171, 173, 174, 175, 175, 176], signal: 'bullish', description: 'Alphabet benefiting from AI integration across search and cloud.' },
  amzn: { price: 186.40, change: 2.90, changePercent: 1.58, volume: '32M', marketCap: '1.94T', sparkline: [180, 181, 183, 184, 185, 186, 186, 186], signal: 'bullish', description: 'Amazon AWS margins expanding with AI workload growth.' },
  meta: { price: 502.10, change: 8.30, changePercent: 1.68, volume: '18M', marketCap: '1.28T', sparkline: [485, 490, 492, 495, 498, 500, 501, 502], signal: 'bullish', description: 'Meta Platforms monetizing Reels effectively while cutting costs.' },
  xom: { price: 115.20, change: 2.80, changePercent: 2.49, volume: '15M', marketCap: '460B', sparkline: [108, 110, 111, 112, 113, 114, 115, 115], signal: 'bullish', description: 'ExxonMobil benefiting from upstream production growth and Pioneer acquisition.' },
  cvx: { price: 162.40, change: 3.10, changePercent: 1.95, volume: '8M', marketCap: '298B', sparkline: [155, 157, 158, 159, 160, 161, 162, 162], signal: 'bullish', description: 'Chevron refining margins expanding with crack spread widening.' },
  tsla: { price: 178.50, change: -4.20, changePercent: -2.30, volume: '85M', marketCap: '568B', sparkline: [190, 188, 185, 183, 181, 180, 179, 178], signal: 'bearish', description: 'Tesla facing margin pressure from price cuts and competition.' },
  ford: { price: 12.80, change: 0.15, changePercent: 1.19, volume: '42M', marketCap: '51B', sparkline: [12.2, 12.4, 12.5, 12.6, 12.7, 12.7, 12.8, 12.8], signal: 'neutral', description: 'Ford restructuring EV strategy while F-150 Lightning demand stabilizes.' },
  rivn: { price: 10.20, change: -0.45, changePercent: -4.23, volume: '25M', marketCap: '10.2B', sparkline: [12, 11.5, 11, 10.8, 10.5, 10.3, 10.2, 10.2], signal: 'bearish', description: 'Rivian burning cash while scaling R2 production timeline.' },
  pfe: { price: 28.50, change: 0.40, changePercent: 1.42, volume: '28M', marketCap: '161B', sparkline: [27, 27.5, 27.8, 28, 28.2, 28.3, 28.4, 28.5], signal: 'neutral', description: 'Pfizer repositioning portfolio post-COVID with oncology focus.' },
  jnj: { price: 158.90, change: 1.20, changePercent: 0.76, volume: '6M', marketCap: '383B', sparkline: [155, 156, 157, 157, 158, 158, 159, 159], signal: 'neutral', description: 'J&J MedTech segment growing while managing talc litigation.' },
  unh: { price: 524.30, change: -8.50, changePercent: -1.60, volume: '4M', marketCap: '484B', sparkline: [540, 535, 530, 528, 526, 525, 524, 524], signal: 'bearish', description: 'UnitedHealth facing regulatory scrutiny on Medicare Advantage.' },
  jpm: { price: 198.60, change: 3.40, changePercent: 1.74, volume: '12M', marketCap: '572B', sparkline: [190, 192, 193, 195, 196, 197, 198, 199], signal: 'bullish', description: 'JPMorgan leading banking sector with strong trading revenue.' },
  bac: { price: 38.20, change: 0.65, changePercent: 1.73, volume: '35M', marketCap: '302B', sparkline: [36, 36.5, 37, 37.3, 37.6, 37.8, 38, 38.2], signal: 'bullish', description: 'Bank of America NII expanding as deposit costs stabilize.' },
  gs: { price: 452.80, change: 12.50, changePercent: 2.84, volume: '3M', marketCap: '152B', sparkline: [430, 435, 438, 442, 445, 448, 451, 453], signal: 'bullish', description: 'Goldman Sachs M&A advisory pipeline strengthening significantly.' },
  lmt: { price: 468.50, change: 15.80, changePercent: 3.49, volume: '2M', marketCap: '112B', sparkline: [440, 445, 450, 455, 458, 462, 465, 468], signal: 'bullish', description: 'Lockheed Martin backlog expanding on global defense contracts.' },
  rtx: { price: 102.30, change: 3.20, changePercent: 3.23, volume: '5M', marketCap: '138B', sparkline: [95, 96, 98, 99, 100, 101, 102, 102], signal: 'bullish', description: 'RTX Corp benefiting from Pratt & Whitney engine demand recovery.' },
};

// Mock news data per node
export const nodeNews: Record<string, NewsItem[]> = {
  war: [
    { title: 'Tensions Escalate in Eastern Europe as NATO Bolsters Defenses', source: 'Reuters', time: '2h ago', sentiment: 'negative', snippet: 'NATO allies agree to increase defense spending amid rising threats on the eastern border.' },
    { title: 'Middle East Conflict Pushes Oil Prices Higher', source: 'Bloomberg', time: '4h ago', sentiment: 'negative', snippet: 'Brent crude jumps 3% as shipping routes face new disruption risks.' },
    { title: 'Defense Stocks Rally on Increased Military Budgets', source: 'CNBC', time: '6h ago', sentiment: 'positive', snippet: 'Lockheed Martin and RTX lead gains as governments boost arms procurement.' },
  ],
  fed: [
    { title: 'Fed Officials Signal Patience on Rate Cuts', source: 'WSJ', time: '1h ago', sentiment: 'neutral', snippet: 'Multiple FOMC members suggest data dependency before any policy easing.' },
    { title: 'Markets Reprice Rate Cut Expectations After Fed Minutes', source: 'Bloomberg', time: '3h ago', sentiment: 'negative', snippet: 'Probability of June cut drops to 35% from 60% after hawkish minutes.' },
    { title: 'Powell Emphasizes Inflation Progress Still Needed', source: 'Reuters', time: '8h ago', sentiment: 'neutral', snippet: 'Chair Powell reiterates the Fed is not in a hurry to lower borrowing costs.' },
  ],
  'ai-buzz': [
    { title: 'OpenAI Launches GPT-5 with Breakthrough Reasoning', source: 'TechCrunch', time: '30m ago', sentiment: 'positive', snippet: 'New model shows 40% improvement in complex reasoning benchmarks.' },
    { title: 'Enterprise AI Spending Expected to Double in 2026', source: 'Gartner', time: '2h ago', sentiment: 'positive', snippet: 'Global AI infrastructure spending projected to reach $420B annually.' },
    { title: 'AI Regulation Debate Heats Up in Congress', source: 'Politico', time: '5h ago', sentiment: 'neutral', snippet: 'Bipartisan bill proposes mandatory safety testing for frontier models.' },
  ],
  climate: [
    { title: 'EU Carbon Border Tax Takes Effect, Impacts Imports', source: 'FT', time: '3h ago', sentiment: 'neutral', snippet: 'European carbon border adjustment mechanism begins charging importers.' },
    { title: 'Record Heatwave Drives Energy Demand Surge', source: 'Reuters', time: '5h ago', sentiment: 'negative', snippet: 'Extreme temperatures boost electricity consumption across southern states.' },
  ],
  earnings: [
    { title: 'S&P 500 Companies Beat Estimates by Widest Margin in 2 Years', source: 'FactSet', time: '1h ago', sentiment: 'positive', snippet: '78% of reporting companies exceeded EPS estimates this quarter.' },
    { title: 'Tech Giants Drive Q1 Earnings Growth', source: 'Bloomberg', time: '4h ago', sentiment: 'positive', snippet: 'Magnificent Seven account for 60% of index earnings growth.' },
  ],
  'trade-war': [
    { title: 'New Tariffs on Chinese EVs Announced', source: 'WSJ', time: '2h ago', sentiment: 'negative', snippet: 'US imposes 100% tariff on Chinese electric vehicle imports effective immediately.' },
    { title: 'Supply Chain Reshoring Accelerates Amid Trade Tensions', source: 'Reuters', time: '6h ago', sentiment: 'neutral', snippet: 'Companies increasingly moving production to Mexico and Southeast Asia.' },
  ],
  'crypto-news': [
    { title: 'Bitcoin ETF Inflows Hit Record $1.2B in Single Day', source: 'CoinDesk', time: '1h ago', sentiment: 'positive', snippet: 'BlackRock IBIT leads inflows as institutional demand surges.' },
    { title: 'SEC Approves Ethereum ETF Applications', source: 'Bloomberg', time: '3h ago', sentiment: 'positive', snippet: 'Spot Ethereum ETFs expected to begin trading next month.' },
  ],
  'jobs-data': [
    { title: 'Non-Farm Payrolls Come in Below Expectations', source: 'BLS', time: '2h ago', sentiment: 'neutral', snippet: 'Economy added 175K jobs vs 240K expected, unemployment ticks up to 3.9%.' },
    { title: 'Wage Growth Moderates, Easing Inflation Concerns', source: 'Reuters', time: '3h ago', sentiment: 'positive', snippet: 'Average hourly earnings rise 3.9% YoY, slowest pace in two years.' },
  ],
  inflation: [
    { title: 'Core CPI Remains Sticky at 3.8% YoY', source: 'BLS', time: '1h ago', sentiment: 'negative', snippet: 'Shelter and services inflation continue to run above Fed target.' },
    { title: 'PCE Deflator Shows Modest Improvement', source: 'Commerce Dept', time: '4h ago', sentiment: 'neutral', snippet: 'Fed preferred inflation gauge edges down to 2.7% from 2.8%.' },
  ],
  geopolitics: [
    { title: 'South China Sea Tensions Rise After Naval Confrontation', source: 'Reuters', time: '2h ago', sentiment: 'negative', snippet: 'Philippines and China vessels involved in confrontation near disputed territory.' },
    { title: 'BRICS Expansion Creates New Economic Bloc Dynamics', source: 'FT', time: '5h ago', sentiment: 'neutral', snippet: 'Expanded BRICS nations represent 46% of world population and 29% of GDP.' },
  ],
  crude: [
    { title: 'OPEC+ Extends Production Cuts Through Q3', source: 'Bloomberg', time: '1h ago', sentiment: 'positive', snippet: 'Saudi Arabia leads voluntary cuts of 2.2M barrels per day.' },
    { title: 'US Shale Output Growth Slowing on Capital Discipline', source: 'Reuters', time: '3h ago', sentiment: 'positive', snippet: 'Permian Basin rig count declines as producers prioritize returns.' },
  ],
  gold: [
    { title: 'Central Banks Buy Record 290 Tonnes in Q1', source: 'World Gold Council', time: '2h ago', sentiment: 'positive', snippet: 'China and emerging market central banks continue aggressive gold accumulation.' },
    { title: 'Gold Hits All-Time High Amid Geopolitical Uncertainty', source: 'Bloomberg', time: '4h ago', sentiment: 'positive', snippet: 'Spot gold breaches $2,400 as investors seek safe-haven assets.' },
  ],
  usd: [
    { title: 'Dollar Steadies as Rate Cut Bets Moderate', source: 'Reuters', time: '2h ago', sentiment: 'neutral', snippet: 'DXY index holds near 104 as traders reassess Fed timeline.' },
  ],
  'fixed-income': [
    { title: 'Treasury Yields Drop on Softer Economic Data', source: 'Bloomberg', time: '1h ago', sentiment: 'neutral', snippet: '10-year yield falls to 4.25% after weaker-than-expected retail sales.' },
  ],
  equity: [
    { title: 'S&P 500 Closes at Record High for 22nd Time This Year', source: 'CNBC', time: '30m ago', sentiment: 'positive', snippet: 'Broad market rally led by technology and financial sectors.' },
    { title: 'Market Breadth Improves as Small Caps Join Rally', source: 'Bloomberg', time: '2h ago', sentiment: 'positive', snippet: 'Russell 2000 gains 2.1% as rotation trade gains momentum.' },
  ],
  commodities: [
    { title: 'Copper Hits 2-Year High on Supply Deficit', source: 'Reuters', time: '3h ago', sentiment: 'positive', snippet: 'LME copper surges past $10,000/tonne on mine disruptions.' },
  ],
  bitcoin: [
    { title: 'Bitcoin Breaks $68K as Halving Rally Continues', source: 'CoinDesk', time: '1h ago', sentiment: 'positive', snippet: 'Post-halving supply squeeze drives prices toward all-time highs.' },
    { title: 'MicroStrategy Announces Additional $500M Bitcoin Purchase', source: 'Bloomberg', time: '3h ago', sentiment: 'positive', snippet: 'Corporate treasury demand for Bitcoin continues to grow.' },
  ],
  'natural-gas': [
    { title: 'LNG Export Demand Drives US Natural Gas Higher', source: 'Reuters', time: '2h ago', sentiment: 'positive', snippet: 'European and Asian buyers lock in long-term US LNG contracts.' },
  ],
  silver: [
    { title: 'Silver Demand Surges on Solar Panel Manufacturing Boom', source: 'Silver Institute', time: '4h ago', sentiment: 'positive', snippet: 'Industrial silver demand hits record as solar capacity expands globally.' },
  ],
  'bonds-10y': [
    { title: 'Treasury Auction Sees Strong Demand from Foreign Buyers', source: 'Reuters', time: '2h ago', sentiment: 'positive', snippet: 'Indirect bidders take 73% of $42B 10-year note auction.' },
  ],
  'real-estate': [
    { title: 'Commercial Property Defaults Rise to Post-GFC Highs', source: 'WSJ', time: '3h ago', sentiment: 'negative', snippet: 'Office vacancy rates hit 19.6% nationally as remote work persists.' },
  ],
  vix: [
    { title: 'VIX Spikes 15% on Geopolitical Concerns', source: 'CBOE', time: '1h ago', sentiment: 'negative', snippet: 'Fear gauge rises sharply as options traders increase hedging activity.' },
  ],
  tech: [
    { title: 'Semiconductor Stocks Lead Tech Rally on AI Demand', source: 'Bloomberg', time: '1h ago', sentiment: 'positive', snippet: 'Philadelphia Semiconductor Index up 3.2% on data center buildout.' },
    { title: 'Cloud Revenue Growth Accelerates Across Big Tech', source: 'CNBC', time: '3h ago', sentiment: 'positive', snippet: 'AWS, Azure, and GCP all report 25%+ YoY growth rates.' },
  ],
  energy: [
    { title: 'Energy Sector Posts Best Quarter in Two Years', source: 'Reuters', time: '2h ago', sentiment: 'positive', snippet: 'Rising oil prices and refining margins boost energy profits.' },
  ],
  auto: [
    { title: 'EV Sales Growth Slows as Consumers Shift to Hybrids', source: 'Automotive News', time: '3h ago', sentiment: 'neutral', snippet: 'Hybrid vehicle sales jump 50% while pure EV growth moderates.' },
  ],
  health: [
    { title: 'GLP-1 Drug Market Expected to Reach $100B by 2030', source: 'Goldman Sachs', time: '2h ago', sentiment: 'positive', snippet: 'Obesity treatment drugs reshape healthcare investment landscape.' },
  ],
  financial: [
    { title: 'Bank Earnings Beat on Trading Revenue Surge', source: 'Bloomberg', time: '1h ago', sentiment: 'positive', snippet: 'JPMorgan and Goldman Sachs report record trading quarters.' },
  ],
  consumer: [
    { title: 'Retail Sales Surprise to Upside in March', source: 'Commerce Dept', time: '2h ago', sentiment: 'positive', snippet: 'Consumer spending resilience supports discretionary sector outlook.' },
  ],
  utilities: [
    { title: 'Data Center Power Demand Boosts Utility Stocks', source: 'Reuters', time: '4h ago', sentiment: 'positive', snippet: 'AI infrastructure buildout drives electricity demand growth projections.' },
  ],
  materials: [
    { title: 'Infrastructure Bill Funding Flows Boost Materials Demand', source: 'Reuters', time: '3h ago', sentiment: 'positive', snippet: 'Steel and cement producers see order books fill on government projects.' },
  ],
  telecom: [
    { title: '5G Rollout Costs Weigh on Telecom Margins', source: 'FT', time: '5h ago', sentiment: 'negative', snippet: 'Network upgrade capex continues to pressure telecom profitability.' },
  ],
  defense: [
    { title: 'Pentagon Awards $50B Multi-Year Contract Package', source: 'Defense One', time: '1h ago', sentiment: 'positive', snippet: 'Major defense primes set to benefit from sustained spending increase.' },
  ],
  nvda: [
    { title: 'NVIDIA H200 Chips Sell Out Through 2026', source: 'Reuters', time: '1h ago', sentiment: 'positive', snippet: 'Data center GPU demand remains insatiable as AI training scales up.' },
    { title: 'NVIDIA Partners with Sovereign AI Funds', source: 'Bloomberg', time: '3h ago', sentiment: 'positive', snippet: 'Middle East and Asian governments invest in NVIDIA-powered AI infrastructure.' },
    { title: 'Analyst Raises NVIDIA Target to $1,200', source: 'BofA Research', time: '5h ago', sentiment: 'positive', snippet: 'Data center revenue expected to exceed $100B run rate by year end.' },
  ],
  msft: [
    { title: 'Microsoft Copilot Adoption Surges Among Enterprise Clients', source: 'CNBC', time: '2h ago', sentiment: 'positive', snippet: 'Office 365 Copilot users grow 300% QoQ as productivity gains validated.' },
    { title: 'Azure Revenue Grows 31% Driven by AI Workloads', source: 'Bloomberg', time: '4h ago', sentiment: 'positive', snippet: 'Cloud AI services account for 8 percentage points of Azure growth.' },
  ],
  aapl: [
    { title: 'Apple Vision Pro Sales Disappoint in First Quarter', source: 'WSJ', time: '2h ago', sentiment: 'negative', snippet: 'Spatial computing device sells below expectations at 200K units.' },
    { title: 'iPhone 16 Pro Max Leads Upgrade Cycle', source: 'Counterpoint', time: '5h ago', sentiment: 'positive', snippet: 'Premium tier drives higher ASPs despite flat unit volumes.' },
  ],
  googl: [
    { title: 'Google AI Overviews Boost Search Revenue Per Query', source: 'Bloomberg', time: '1h ago', sentiment: 'positive', snippet: 'AI-generated answers increase ad engagement and click-through rates.' },
  ],
  amzn: [
    { title: 'Amazon AWS Launches Custom AI Chip Trainium2', source: 'TechCrunch', time: '2h ago', sentiment: 'positive', snippet: 'New chip offers 4x performance improvement for AI training workloads.' },
  ],
  meta: [
    { title: 'Meta AI Assistant Reaches 400M Monthly Users', source: 'The Verge', time: '1h ago', sentiment: 'positive', snippet: 'Llama-powered assistant becomes fastest-growing AI product.' },
  ],
  xom: [
    { title: 'ExxonMobil Guyana Production Hits 650K BPD', source: 'Reuters', time: '3h ago', sentiment: 'positive', snippet: 'Stabroek block expansion drives low-cost production growth.' },
  ],
  cvx: [
    { title: 'Chevron Refining Margins Hit Multi-Year Highs', source: 'Bloomberg', time: '2h ago', sentiment: 'positive', snippet: 'Crack spreads widen as seasonal demand meets tight supply.' },
  ],
  tsla: [
    { title: 'Tesla Cuts Prices Again in China Amid Competition', source: 'Reuters', time: '1h ago', sentiment: 'negative', snippet: 'Model 3 and Y prices reduced by up to 5% in key market.' },
    { title: 'Cybertruck Production Ramp Faces Battery Supply Issues', source: 'Electrek', time: '4h ago', sentiment: 'negative', snippet: '4680 cell yield improvements slower than expected.' },
  ],
  ford: [
    { title: 'Ford F-150 Lightning Sales Surge 80% YoY', source: 'Automotive News', time: '3h ago', sentiment: 'positive', snippet: 'Electric truck gains market share as fleet orders accelerate.' },
  ],
  rivn: [
    { title: 'Rivian Cash Burn Raises Going Concern Questions', source: 'Bloomberg', time: '2h ago', sentiment: 'negative', snippet: 'Company has 18 months of runway at current spending rate.' },
  ],
  pfe: [
    { title: 'Pfizer Oncology Pipeline Shows Promise in Phase 3 Trials', source: 'Reuters', time: '3h ago', sentiment: 'positive', snippet: 'Three cancer drugs in late-stage development could drive growth.' },
  ],
  jnj: [
    { title: 'J&J MedTech Division Posts Strong Surgical Growth', source: 'Bloomberg', time: '2h ago', sentiment: 'positive', snippet: 'Robotic surgery platform adoption accelerates across hospitals.' },
  ],
  unh: [
    { title: 'UnitedHealth Faces DOJ Antitrust Investigation', source: 'WSJ', time: '1h ago', sentiment: 'negative', snippet: 'Department of Justice examining vertical integration practices.' },
  ],
  jpm: [
    { title: 'JPMorgan Trading Revenue Hits Record $8.4B', source: 'Bloomberg', time: '1h ago', sentiment: 'positive', snippet: 'Fixed income and equities trading both exceed expectations.' },
    { title: 'Dimon Warns of Geopolitical Risks in Annual Letter', source: 'CNBC', time: '4h ago', sentiment: 'neutral', snippet: 'CEO highlights inflation, conflicts, and fiscal deficits as key concerns.' },
  ],
  bac: [
    { title: 'Bank of America Digital Banking Users Reach 47M', source: 'Reuters', time: '3h ago', sentiment: 'positive', snippet: 'Digital transformation drives cost efficiency improvements.' },
  ],
  gs: [
    { title: 'Goldman Sachs M&A Pipeline Hits 3-Year High', source: 'Bloomberg', time: '2h ago', sentiment: 'positive', snippet: 'IPO and M&A advisory backlog strengthens as deal activity rebounds.' },
  ],
  lmt: [
    { title: 'Lockheed F-35 Deliveries Accelerate in Q1', source: 'Defense News', time: '2h ago', sentiment: 'positive', snippet: 'Fighter jet production rate increases to 156 units annually.' },
  ],
  rtx: [
    { title: 'Pratt & Whitney GTF Engine Inspections Near Completion', source: 'Reuters', time: '3h ago', sentiment: 'positive', snippet: 'Powder metal issue resolution ahead of schedule, earnings impact limited.' },
  ],
};
