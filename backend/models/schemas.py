from typing import Literal, Optional, List
from pydantic import BaseModel

# Cluster types matching frontend
ClusterType = Literal["news", "assets", "sectors", "stocks"]
SignalType = Literal["bullish", "bearish", "neutral"]
SentimentType = Literal["positive", "negative", "neutral"]


class MapNode(BaseModel):
    """Node in the financial map"""
    id: str
    label: str
    cluster: ClusterType
    x: float
    y: float
    size: int
    sublabel: Optional[str] = None


class BoundingBox(BaseModel):
    """Bounding box coordinates for PDF highlights"""
    x: float
    y: float
    w: float
    h: float


class DocumentChunk(BaseModel):
    """A chunk of document text that supports a connection"""
    text: str
    source: Optional[str] = None  # PDF filename
    date: Optional[str] = None
    relevance_score: Optional[float] = None
    chunk_id: Optional[str] = None
    chunk_type: Optional[str] = None  # "table", "text", etc.
    page: Optional[int] = None
    bbox: Optional[BoundingBox] = None
    page_width: Optional[float] = None
    page_height: Optional[float] = None
    pdf_url: Optional[str] = None  # Full URL to open PDF


class MapEdge(BaseModel):
    """Edge connecting two nodes"""
    source: str  # 'from' in frontend, renamed for Python
    target: str  # 'to' in frontend, renamed for Python
    label: Optional[str] = None
    supportingChunks: Optional[List[DocumentChunk]] = None


class StockDetail(BaseModel):
    """Detailed information for a stock/node"""
    price: float
    change: float
    changePercent: float
    volume: str
    marketCap: str
    sparkline: List[float]
    signal: SignalType
    description: str


class NewsItem(BaseModel):
    """News article related to a stock"""
    title: str
    source: str
    time: str
    sentiment: SentimentType
    snippet: str
    url: Optional[str] = None


class MapDataResponse(BaseModel):
    """Response for /api/map endpoint"""
    nodes: List[MapNode]
    edges: List[MapEdge]


class NodeDetailResponse(BaseModel):
    """Response for /api/node/{ticker} endpoint"""
    details: StockDetail
    news: List[NewsItem]


class ClusterMeta(BaseModel):
    """Metadata for a cluster"""
    label: str
    color: str
    count: int
