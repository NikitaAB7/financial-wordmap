// Type definitions for the Financial WordMap
// These match the backend Pydantic schemas

export type ClusterType = 'news' | 'assets' | 'sectors' | 'stocks';
export type SignalType = 'bullish' | 'bearish' | 'neutral';
export type SentimentType = 'positive' | 'negative' | 'neutral';

export interface MapNode {
  id: string;
  label: string;
  cluster: ClusterType;
  x: number;
  y: number;
  size: number;
  sublabel?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DocumentChunk {
  text: string;
  source?: string;
  date?: string;
  relevance_score?: number;
  chunk_id?: string;
  chunk_type?: string;
  category?: string;
  page?: number;
  bbox?: BoundingBox;
  page_width?: number;
  page_height?: number;
  pdf_url?: string;
}

export interface MapEdge {
  source: string;  // 'from' renamed for consistency
  target: string;  // 'to' renamed for consistency
  label?: string;
  supportingChunks?: DocumentChunk[];
}

// Alias for compatibility with existing code
export interface MapEdgeCompat {
  from: string;
  to: string;
  label?: string;
  supportingChunks?: DocumentChunk[];
}

export interface StockDetail {
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  sparkline: number[];
  signal: SignalType;
  description: string;
}

export interface NewsItem {
  title: string;
  source: string;
  time: string;
  sentiment: SentimentType;
  snippet: string;
  url?: string;
  published_date?: string;  // ISO format date for filtering/display
}

export interface MapDataResponse {
  nodes: MapNode[];
  edges: MapEdge[];
}

export interface NodeDetailResponse {
  details: StockDetail;
  news: NewsItem[];
}

export interface ClusterMeta {
  label: string;
  color: string;
  count: number;
}

export type ClustersResponse = Record<ClusterType, ClusterMeta>;

// =============================================================================
// Topic Mapping Types
// =============================================================================

export interface TopicHeadline {
  title: string;
  snippet: string;
  sentiment: SentimentType;
  url?: string;
}

export interface NewsTopic {
  id: string;
  name: string;
  headlines: TopicHeadline[];
  sentiment_score: number;  // -1 to 1
  sentiment: SentimentType;
  linked_entities: string[];
  headline_count: number;
}

export interface NodeHighlight {
  node_id: string;
  topics: string[];
  sentiment: SentimentType;
  sentiment_score: number;
  intensity: number;  // 0-1
  headline_count: number;
}

export interface TopicEdge {
  source: string;
  target: string;
  weight: number;
  sentiment: SentimentType;
}

export interface TopicsResponse {
  topics: NewsTopic[];
  highlights: NodeHighlight[];
  topic_edges: TopicEdge[];
}

// =============================================================================
// Dynamic Connections Types
// =============================================================================

export interface DynamicConnection {
  target: string;
  target_label: string;
  relationship: string;
  reasoning: string;
  strength: number;  // 0-1
}
