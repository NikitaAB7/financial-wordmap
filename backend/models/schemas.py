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
    category: Optional[str] = None  # "concall", "annual-report", etc.
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
    published_date: Optional[str] = None  # ISO format date for filtering/display


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


# =============================================================================
# Topic Mapping Models
# =============================================================================

class TopicHeadline(BaseModel):
    """A headline within a news topic"""
    title: str
    snippet: str
    sentiment: SentimentType
    url: Optional[str] = None


class NewsTopic(BaseModel):
    """A clustered news topic with sentiment and entity links"""
    id: str
    name: str
    headlines: List[TopicHeadline]
    sentiment_score: float  # -1 to 1
    sentiment: SentimentType
    linked_entities: List[str]  # node IDs this topic connects to
    headline_count: int


class NodeHighlight(BaseModel):
    """Highlight information for a node based on active topics"""
    node_id: str
    topics: List[str]
    sentiment: SentimentType
    sentiment_score: float
    intensity: float  # 0-1, how strongly highlighted
    headline_count: int


class TopicEdge(BaseModel):
    """Edge from a topic to an entity"""
    source: str  # topic ID
    target: str  # entity ID
    weight: int  # headline count
    sentiment: SentimentType


class TopicsResponse(BaseModel):
    """Response containing active topics and their graph effects"""
    topics: List[NewsTopic]
    highlights: List[NodeHighlight]
    topic_edges: List[TopicEdge]

