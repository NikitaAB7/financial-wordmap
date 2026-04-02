// API service for Financial WordMap
// Handles all communication with the FastAPI backend

import type {
  MapDataResponse,
  NodeDetailResponse,
  NewsItem,
  StockDetail,
  ClustersResponse,
  MapNode,
  MapEdge,
  MapEdgeCompat,
  DocumentChunk,
  TopicsResponse,
  DynamicConnection,
} from '@/types';

// API base URL - uses Vite proxy in development
const API_BASE_URL = '/api';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API Error: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error - please check your connection');
  }
}

/**
 * Convert backend edge format to frontend format
 */
function convertEdge(edge: MapEdge): MapEdgeCompat {
  return {
    from: edge.source,
    to: edge.target,
    label: edge.label,
    supportingChunks: edge.supportingChunks,
  };
}

/**
 * Fetch all map data (nodes and edges)
 */
export async function fetchMapData(): Promise<{
  nodes: MapNode[];
  edges: MapEdgeCompat[];
}> {
  const data = await apiFetch<MapDataResponse>('/map');
  return {
    nodes: data.nodes,
    edges: data.edges.map(convertEdge),
  };
}

/**
 * Fetch details and news for a specific node
 */
export async function fetchNodeDetails(nodeId: string): Promise<NodeDetailResponse> {
  return apiFetch<NodeDetailResponse>(`/node/${encodeURIComponent(nodeId)}`);
}

/**
 * Fetch only stock details (no news)
 */
export async function fetchStockDetails(nodeId: string): Promise<StockDetail> {
  return apiFetch<StockDetail>(`/node/${encodeURIComponent(nodeId)}/details`);
}

/**
 * Fetch news for a specific node
 */
export async function fetchNodeNews(nodeId: string, limit: number = 5): Promise<NewsItem[]> {
  return apiFetch<NewsItem[]>(`/node/${encodeURIComponent(nodeId)}/news?limit=${limit}`);
}

/**
 * Fetch cluster metadata
 */
export async function fetchClusters(): Promise<ClustersResponse> {
  return apiFetch<ClustersResponse>('/clusters');
}

/**
 * Search nodes by query
 */
export async function searchNodes(query: string, limit: number = 10): Promise<MapNode[]> {
  return apiFetch<MapNode[]>(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

/**
 * Get similar nodes
 */
export async function fetchSimilarNodes(nodeId: string, limit: number = 5): Promise<string[]> {
  const data = await apiFetch<{ similar: string[] }>(`/similar/${encodeURIComponent(nodeId)}?limit=${limit}`);
  return data.similar;
}

/**
 * Health check
 */
export async function checkApiHealth(): Promise<{
  status: string;
  qdrant_connected: boolean;
  tavily_configured: boolean;
}> {
  const response = await fetch('/');
  return response.json();
}

/**
 * Fetch document chunks for a node
 */
export async function fetchNodeChunks(nodeId: string, limit: number = 5): Promise<DocumentChunk[]> {
  return apiFetch<DocumentChunk[]>(`/node/${encodeURIComponent(nodeId)}/chunks?limit=${limit}`);
}

/**
 * Fetch document chunks that support an edge connection
 */
export async function fetchEdgeChunks(source: string, target: string, limit: number = 3): Promise<DocumentChunk[]> {
  return apiFetch<DocumentChunk[]>(`/edge/${encodeURIComponent(source)}/${encodeURIComponent(target)}/chunks?limit=${limit}`);
}

// =============================================================================
// Topic Mapping APIs
// =============================================================================

/**
 * Fetch active news topics with their graph mappings
 */
export async function fetchTopics(maxTopics: number = 10): Promise<TopicsResponse> {
  return apiFetch<TopicsResponse>(`/topics?max_topics=${maxTopics}`);
}

/**
 * Fetch news for a specific topic
 */
export async function fetchTopicNews(topicId: string, limit: number = 5): Promise<NewsItem[]> {
  return apiFetch<NewsItem[]>(`/topics/${encodeURIComponent(topicId)}/news?limit=${limit}`);
}

/**
 * Walk the knowledge graph from a node
 */
export async function walkGraph(nodeId: string, maxHops: number = 2): Promise<{
  starting_node: string;
  connected_nodes: Array<{ id: string; label: string; type: string; sector?: string }>;
  hops: number;
}> {
  return apiFetch(`/graph/walk/${encodeURIComponent(nodeId)}?max_hops=${maxHops}`);
}

/**
 * Fetch dynamic connections for a node (LLM-generated)
 */
export async function fetchDynamicConnections(nodeId: string, limit: number = 5): Promise<DynamicConnection[]> {
  return apiFetch<DynamicConnection[]>(`/node/${encodeURIComponent(nodeId)}/dynamic-connections?limit=${limit}`);
}
