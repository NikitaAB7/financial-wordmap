import { useQuery } from '@tanstack/react-query';
import {
  fetchMapData,
  fetchNodeDetails,
  fetchNodeNews,
  fetchStockDetails,
  fetchClusters,
  fetchSimilarNodes,
  fetchNodeChunks,
  fetchEdgeChunks,
} from '@/services/api';
import type { MapNode, MapEdgeCompat, NewsItem, StockDetail, ClustersResponse, NodeDetailResponse, DocumentChunk } from '@/types';

/**
 * Hook to fetch all map data (nodes and edges)
 * Caches for 5 minutes and revalidates in background
 */
export function useMapData() {
  return useQuery<{ nodes: MapNode[]; edges: MapEdgeCompat[] }, Error>({
    queryKey: ['mapData'],
    queryFn: fetchMapData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch node details and news together
 * Only fetches when nodeId is provided
 */
export function useNodeDetails(nodeId: string | null) {
  return useQuery<NodeDetailResponse, Error>({
    queryKey: ['nodeDetails', nodeId],
    queryFn: () => fetchNodeDetails(nodeId!),
    enabled: !!nodeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch only stock details (price, change, etc.)
 */
export function useStockDetails(nodeId: string | null) {
  return useQuery<StockDetail, Error>({
    queryKey: ['stockDetails', nodeId],
    queryFn: () => fetchStockDetails(nodeId!),
    enabled: !!nodeId,
    staleTime: 1 * 60 * 1000, // 1 minute (stock data changes frequently)
  });
}

/**
 * Hook to fetch news for a node
 * Has longer cache time since news doesn't change as frequently
 */
export function useNodeNews(nodeId: string | null, limit: number = 5) {
  return useQuery<NewsItem[], Error>({
    queryKey: ['nodeNews', nodeId, limit],
    queryFn: () => fetchNodeNews(nodeId!, limit),
    enabled: !!nodeId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch cluster metadata
 */
export function useClusters() {
  return useQuery<ClustersResponse, Error>({
    queryKey: ['clusters'],
    queryFn: fetchClusters,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch similar nodes
 */
export function useSimilarNodes(nodeId: string | null, limit: number = 5) {
  return useQuery<string[], Error>({
    queryKey: ['similarNodes', nodeId, limit],
    queryFn: () => fetchSimilarNodes(nodeId!, limit),
    enabled: !!nodeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch document chunks for a node
 */
export function useNodeChunks(nodeId: string | null, limit: number = 5) {
  return useQuery<DocumentChunk[], Error>({
    queryKey: ['nodeChunks', nodeId, limit],
    queryFn: () => fetchNodeChunks(nodeId!, limit),
    enabled: !!nodeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch document chunks supporting an edge
 */
export function useEdgeChunks(source: string | null, target: string | null, limit: number = 3) {
  return useQuery<DocumentChunk[], Error>({
    queryKey: ['edgeChunks', source, target, limit],
    queryFn: () => fetchEdgeChunks(source!, target!, limit),
    enabled: !!source && !!target,
    staleTime: 5 * 60 * 1000,
  });
}
