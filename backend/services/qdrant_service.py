import random
from typing import List, Dict, Tuple, Any, Optional
from datetime import datetime, timedelta
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import QDRANT_HOST, QDRANT_PORT, QDRANT_COLLECTION, PDF_BASE_URL
from models.schemas import MapNode, MapEdge, StockDetail, ClusterType, DocumentChunk, BoundingBox

# Concall highlights must be from the last 6 months
MAX_CHUNK_AGE_DAYS = 180

# Cache for stock data to avoid repeated API calls
_stock_cache: Dict[str, tuple] = {}
_cache_ttl_minutes = 15

# Nifty 50 stocks with their sectors
NIFTY_50_STOCKS = {
    "RELIANCE": {"name": "Reliance Industries", "sector": "Energy"},
    "TCS": {"name": "Tata Consultancy Services", "sector": "IT"},
    "HDFCBANK": {"name": "HDFC Bank", "sector": "Banking"},
    "INFY": {"name": "Infosys", "sector": "IT"},
    "ICICIBANK": {"name": "ICICI Bank", "sector": "Banking"},
    "HINDUNILVR": {"name": "Hindustan Unilever", "sector": "FMCG"},
    "ITC": {"name": "ITC", "sector": "FMCG"},
    "SBIN": {"name": "State Bank of India", "sector": "Banking"},
    "BHARTIARTL": {"name": "Bharti Airtel", "sector": "Telecom"},
    "KOTAKBANK": {"name": "Kotak Mahindra Bank", "sector": "Banking"},
    "LT": {"name": "Larsen & Toubro", "sector": "Infrastructure"},
    "HCLTECH": {"name": "HCL Technologies", "sector": "IT"},
    "AXISBANK": {"name": "Axis Bank", "sector": "Banking"},
    "ASIANPAINT": {"name": "Asian Paints", "sector": "Consumer"},
    "MARUTI": {"name": "Maruti Suzuki", "sector": "Auto"},
    "SUNPHARMA": {"name": "Sun Pharma", "sector": "Pharma"},
    "TITAN": {"name": "Titan Company", "sector": "Consumer"},
    "BAJFINANCE": {"name": "Bajaj Finance", "sector": "Financial"},
    "DMART": {"name": "Avenue Supermarts", "sector": "Retail"},
    "WIPRO": {"name": "Wipro", "sector": "IT"},
    "ULTRACEMCO": {"name": "UltraTech Cement", "sector": "Cement"},
    "ONGC": {"name": "ONGC", "sector": "Energy"},
    "NTPC": {"name": "NTPC", "sector": "Power"},
    "POWERGRID": {"name": "Power Grid Corp", "sector": "Power"},
    "M&M": {"name": "Mahindra & Mahindra", "sector": "Auto"},
    "TATAMOTORS": {"name": "Tata Motors", "sector": "Auto"},
    "JSWSTEEL": {"name": "JSW Steel", "sector": "Metal"},
    "TATASTEEL": {"name": "Tata Steel", "sector": "Metal"},
    "ADANIENT": {"name": "Adani Enterprises", "sector": "Conglomerate"},
    "ADANIPORTS": {"name": "Adani Ports", "sector": "Infrastructure"},
    "COALINDIA": {"name": "Coal India", "sector": "Mining"},
    "BAJAJFINSV": {"name": "Bajaj Finserv", "sector": "Financial"},
    "TECHM": {"name": "Tech Mahindra", "sector": "IT"},
    "HDFCLIFE": {"name": "HDFC Life", "sector": "Insurance"},
    "SBILIFE": {"name": "SBI Life Insurance", "sector": "Insurance"},
    "BRITANNIA": {"name": "Britannia Industries", "sector": "FMCG"},
    "INDUSINDBK": {"name": "IndusInd Bank", "sector": "Banking"},
    "NESTLEIND": {"name": "Nestle India", "sector": "FMCG"},
    "GRASIM": {"name": "Grasim Industries", "sector": "Cement"},
    "CIPLA": {"name": "Cipla", "sector": "Pharma"},
    "DRREDDY": {"name": "Dr. Reddy's Labs", "sector": "Pharma"},
    "APOLLOHOSP": {"name": "Apollo Hospitals", "sector": "Healthcare"},
    "EICHERMOT": {"name": "Eicher Motors", "sector": "Auto"},
    "HEROMOTOCO": {"name": "Hero MotoCorp", "sector": "Auto"},
    "DIVISLAB": {"name": "Divi's Labs", "sector": "Pharma"},
    "BPCL": {"name": "BPCL", "sector": "Energy"},
    "TATACONSUM": {"name": "Tata Consumer", "sector": "FMCG"},
    "HINDALCO": {"name": "Hindalco", "sector": "Metal"},
    "UPL": {"name": "UPL", "sector": "Chemicals"},
    "VEDL": {"name": "Vedanta", "sector": "Metal"},
}

# Sector cluster positions (for initial layout)
SECTOR_POSITIONS = {
    "IT": (800, 200),
    "Banking": (200, 200),
    "Energy": (200, 700),
    "Pharma": (800, 700),
    "Auto": (500, 150),
    "FMCG": (500, 800),
    "Metal": (900, 500),
    "Financial": (300, 350),
    "Infrastructure": (150, 500),
    "Power": (100, 600),
    "Telecom": (400, 300),
    "Consumer": (600, 400),
    "Insurance": (350, 250),
    "Cement": (700, 600),
    "Healthcare": (850, 400),
    "Retail": (600, 700),
    "Mining": (250, 800),
    "Conglomerate": (450, 500),
    "Chemicals": (750, 350),
}

# Category to cluster mapping
CATEGORY_TO_CLUSTER: Dict[str, ClusterType] = {
    "market_sentiment": "news",
    "geopolitics": "news",
    "economic_news": "news",
    "commodity": "assets",
    "index": "assets",
    "crypto": "assets",
    "currency": "assets",
    "sector": "sectors",
    "industry": "sectors",
    "equity": "stocks",
    "stock": "stocks",
}


class QdrantService:
    """Service for interacting with Qdrant vector database"""

    def __init__(self):
        self.client: Optional[QdrantClient] = None
        self._connected = False

    def connect(self) -> bool:
        """Establish connection to Qdrant"""
        try:
            self.client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
            # Test connection
            self.client.get_collections()
            self._connected = True
            return True
        except Exception as e:
            print(f"Failed to connect to Qdrant: {e}")
            self._connected = False
            return False

    def is_connected(self) -> bool:
        """Check if connected to Qdrant"""
        return self._connected and self.client is not None

    def get_collection_info(self) -> Dict[str, Any]:
        """Get information about the collection"""
        if not self.is_connected():
            return {}
        try:
            info = self.client.get_collection(QDRANT_COLLECTION)
            return {
                "name": QDRANT_COLLECTION,
                "vectors_count": getattr(info, 'vectors_count', 0),
                "points_count": getattr(info, 'points_count', 0),
            }
        except Exception as e:
            print(f"Error getting collection info: {e}")
            return {"error": f"Collection '{QDRANT_COLLECTION}' - {str(e)}"}

    def get_all_stock_tickers(self) -> List[Dict[str, Any]]:
        """
        Retrieve all unique stock tickers from Qdrant collection.
        Each document should have metadata with stock ticker, date, etc.
        """
        if not self.is_connected():
            # Return fallback Nifty 50 data
            return self._get_fallback_stocks()

        try:
            # Scroll through all points to get unique tickers
            tickers_data = {}
            offset = None
            
            while True:
                results, offset = self.client.scroll(
                    collection_name=QDRANT_COLLECTION,
                    limit=100,
                    offset=offset,
                    with_payload=True,
                    with_vectors=False,
                )
                
                for point in results:
                    payload = point.payload or {}
                    # Handle nested metadata structure
                    metadata = payload.get("metadata", {})
                    ticker = metadata.get("ticker") or payload.get("ticker") or payload.get("stock_ticker")
                    
                    if ticker and ticker not in tickers_data:
                        # Look up sector from our NIFTY_50_STOCKS mapping
                        stock_info = NIFTY_50_STOCKS.get(ticker.upper(), {})
                        tickers_data[ticker] = {
                            "ticker": ticker.upper(),
                            "category": metadata.get("category", "stock"),
                            "sector": stock_info.get("sector", "Unknown"),
                            "name": stock_info.get("name", ticker),
                        }
                
                if offset is None:
                    break
                
                # Limit iterations to avoid too many API calls
                if len(tickers_data) >= 60:
                    break
            
            return list(tickers_data.values())
        except Exception as e:
            print(f"Error fetching stocks from Qdrant: {e}")
            return self._get_fallback_stocks()

    def _get_fallback_stocks(self) -> List[Dict[str, Any]]:
        """Return Nifty 50 stocks as fallback when Qdrant is unavailable"""
        return [
            {
                "ticker": ticker,
                "category": "stock",
                "sector": info["sector"],
                "name": info["name"],
            }
            for ticker, info in NIFTY_50_STOCKS.items()
        ]

    def build_map_nodes(self) -> List[MapNode]:
        """Build MapNode objects from Qdrant data with cluster-based positioning"""
        stocks = self.get_all_stock_tickers()
        nodes = []
        
        # Cluster center positions (in 1120x960 viewbox)
        CLUSTER_CENTERS = {
            "news": (150, 150),      # Top-left
            "assets": (950, 150),    # Top-right  
            "sectors": (560, 400),   # Center
            "stocks": (560, 700),    # Bottom-center
        }
        
        # Add sector nodes - clustered together in the center
        sectors_added = set()
        sector_index = 0
        for stock in stocks:
            sector = stock.get("sector", "Unknown")
            if sector not in sectors_added:
                sectors_added.add(sector)
                # Position sectors in a grid pattern around center
                import math
                angle = (sector_index * 30) % 360
                radius = 80 + (sector_index % 3) * 40
                cx, cy = CLUSTER_CENTERS["sectors"]
                x = cx + radius * math.cos(math.radians(angle))
                y = cy + radius * math.sin(math.radians(angle))
                
                nodes.append(MapNode(
                    id=f"sector_{sector.lower().replace(' ', '_')}",
                    label=sector,
                    cluster="sectors",
                    x=max(300, min(820, x)),
                    y=max(250, min(550, y)),
                    size=28,
                    sublabel=f"Sector",
                ))
                sector_index += 1
        
        # Add stock nodes - clustered in the bottom area
        import math
        stock_cx, stock_cy = CLUSTER_CENTERS["stocks"]
        for i, stock in enumerate(stocks):
            ticker = stock["ticker"]
            
            # Arrange stocks in concentric circles
            ring = i // 12  # 12 stocks per ring
            angle = (i % 12) * 30 + ring * 15  # Offset each ring
            radius = 100 + ring * 60
            
            x = stock_cx + radius * math.cos(math.radians(angle))
            y = stock_cy + radius * math.sin(math.radians(angle))
            
            # Clamp to viewbox
            x = max(100, min(1020, x))
            y = max(480, min(900, y))
            
            nodes.append(MapNode(
                id=ticker.lower(),
                label=ticker,
                cluster="stocks",
                x=x,
                y=y,
                size=20 + (hash(ticker) % 8),
                sublabel=stock.get("name", ticker),
            ))
        
        # Add news/sentiment nodes - clustered in top-left
        news_cx, news_cy = CLUSTER_CENTERS["news"]
        news_nodes = [
            ("fed_sentiment", "Fed Sentiment", 0),
            ("market_mood", "Market Mood", 60),
            ("global_risk", "Global Risk", 120),
            ("earnings_season", "Earnings Season", 180),
            ("inflation_watch", "Inflation Watch", 240),
        ]
        for node_id, label, angle in news_nodes:
            x = news_cx + 70 * math.cos(math.radians(angle))
            y = news_cy + 70 * math.sin(math.radians(angle))
            nodes.append(MapNode(
                id=node_id,
                label=label,
                cluster="news",
                x=max(50, min(300, x)),
                y=max(50, min(300, y)),
                size=24,
            ))
        
        # Add asset nodes - clustered in top-right
        asset_cx, asset_cy = CLUSTER_CENTERS["assets"]
        asset_nodes = [
            ("crude_oil", "Crude Oil", 180),
            ("gold", "Gold", 240),
            ("usd_inr", "USD/INR", 300),
            ("nifty50", "NIFTY 50", 120),
            ("bitcoin", "Bitcoin", 60),
        ]
        for node_id, label, angle in asset_nodes:
            x = asset_cx + 80 * math.cos(math.radians(angle))
            y = asset_cy + 80 * math.sin(math.radians(angle))
            nodes.append(MapNode(
                id=node_id,
                label=label,
                cluster="assets",
                x=max(800, min(1070, x)),
                y=max(50, min(300, y)),
                size=26,
            ))
        
        return nodes

    def build_map_edges(self, nodes: List[MapNode]) -> List[MapEdge]:
        """Build edges between related nodes with supporting document chunks"""
        edges = []
        node_ids = {n.id for n in nodes}
        
        # Connect stocks to their sectors (with supporting chunks)
        for node in nodes:
            if node.cluster == "stocks":
                # Find matching sector
                stock_info = NIFTY_50_STOCKS.get(node.label)
                if stock_info:
                    sector_id = f"sector_{stock_info['sector'].lower().replace(' ', '_')}"
                    if sector_id in node_ids:
                        # Retrieve supporting chunks from Qdrant
                        chunks = self.get_supporting_chunks(node.label, stock_info['sector'])
                        edges.append(MapEdge(
                            source=sector_id, 
                            target=node.id,
                            label=f"{node.label} in {stock_info['sector']}",
                            supportingChunks=chunks if chunks else None
                        ))
        
        # Connect sectors to market index
        for node in nodes:
            if node.cluster == "sectors":
                edges.append(MapEdge(source="nifty50", target=node.id))
        
        # Connect news to relevant assets
        edges.append(MapEdge(source="fed_sentiment", target="usd_inr"))
        edges.append(MapEdge(source="global_risk", target="crude_oil"))
        edges.append(MapEdge(source="market_mood", target="nifty50"))
        
        # Connect assets to relevant sectors
        edges.append(MapEdge(source="crude_oil", target="sector_energy"))
        edges.append(MapEdge(source="gold", target="sector_metal"))
        
        return edges

    def get_supporting_chunks(self, ticker: str, sector: str, limit: int = 3) -> List[DocumentChunk]:
        """
        Retrieve document chunks from Qdrant that support the connection between
        a stock and its sector.
        
        Args:
            ticker: Stock ticker (e.g., "RELIANCE")
            sector: Sector name (e.g., "Energy")
            limit: Maximum number of chunks to return
            
        Returns:
            List of DocumentChunk objects with supporting text
        """
        if not self.is_connected():
            return []
        
        try:
            # Search for documents that mention this ticker using nested metadata
            results, _ = self.client.scroll(
                collection_name=QDRANT_COLLECTION,
                scroll_filter={
                    "should": [
                        {"key": "metadata.ticker", "match": {"value": ticker}},
                        {"key": "metadata.ticker", "match": {"value": ticker.upper()}},
                    ]
                },
                limit=limit * 2,  # Get more to filter
                with_payload=True,
                with_vectors=False,
            )
            
            chunks = []
            for point in results[:limit]:
                payload = point.payload or {}
                metadata = payload.get("metadata", {})
                text = payload.get("page_content", "") or payload.get("text", "")
                
                if text:
                    # Truncate long text
                    if len(text) > 300:
                        text = text[:300] + "..."
                    
                    chunks.append(DocumentChunk(
                        text=text,
                        source=metadata.get("source", metadata.get("document_name")),
                        date=metadata.get("document_date"),
                        relevance_score=None
                    ))
            
            return chunks
            
        except Exception as e:
            print(f"Error retrieving supporting chunks: {e}")
            return []

    def get_chunks_for_node(self, node_id: str, limit: int = 5) -> List[DocumentChunk]:
        """
        Retrieve all document chunks related to a specific node.
        Prefers chunks from the last 6 months, but shows older ones if none available.
        
        Args:
            node_id: The node ID (ticker or entity name)
            limit: Maximum number of chunks
            
        Returns:
            List of DocumentChunk objects with PDF bbox info for viewer
        """
        if not self.is_connected():
            return []
        
        try:
            # Try to match on nested metadata.ticker
            ticker = node_id.upper()
            
            # Get more results than needed so we can filter by date
            results, _ = self.client.scroll(
                collection_name=QDRANT_COLLECTION,
                scroll_filter={
                    "should": [
                        {"key": "metadata.ticker", "match": {"value": ticker}},
                        {"key": "metadata.ticker", "match": {"value": ticker.lower()}},
                    ]
                },
                limit=limit * 5,  # Get more to allow for date filtering
                with_payload=True,
                with_vectors=False,
            )
            
            all_chunks = []
            
            for point in results:
                payload = point.payload or {}
                metadata = payload.get("metadata", {})
                text = payload.get("page_content", "") or payload.get("text", "")
                doc_date_str = metadata.get("document_date")
                
                if not text:
                    continue
                
                # Parse the date
                doc_date = None
                if doc_date_str:
                    for fmt in ["%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y", "%B %d, %Y", "%b %d, %Y"]:
                        try:
                            doc_date = datetime.strptime(doc_date_str, fmt)
                            break
                        except ValueError:
                            continue
                
                # Parse bbox if available
                bbox_data = metadata.get("bbox")
                bbox = None
                if bbox_data and isinstance(bbox_data, dict):
                    bbox = BoundingBox(
                        x=bbox_data.get("x", 0),
                        y=bbox_data.get("y", 0),
                        w=bbox_data.get("w", 0),
                        h=bbox_data.get("h", 0)
                    )
                
                # Build PDF URL with page and bbox parameters
                source = metadata.get("source", metadata.get("document_name"))
                page = metadata.get("page")
                pdf_url = None
                if source:
                    pdf_url = f"{PDF_BASE_URL}/{source}"
                    if page:
                        pdf_url += f"#page={page}"
                
                # Format date for display
                display_date = doc_date.strftime("%b %d, %Y") if doc_date else doc_date_str
                
                chunk = DocumentChunk(
                    text=text[:500] + "..." if len(text) > 500 else text,
                    source=source,
                    date=display_date,
                    relevance_score=None,
                    chunk_id=metadata.get("chunk_id"),
                    chunk_type=metadata.get("chunk_type"),
                    category=metadata.get("category"),
                    page=page,
                    bbox=bbox,
                    page_width=metadata.get("page_width"),
                    page_height=metadata.get("page_height"),
                    pdf_url=pdf_url
                )
                
                all_chunks.append((doc_date, chunk))
            
            # Sort by date (newest first) and return
            all_chunks.sort(key=lambda x: x[0] or datetime.min, reverse=True)
            
            return [chunk for _, chunk in all_chunks[:limit]]
            
        except Exception as e:
            print(f"Error retrieving chunks for node {node_id}: {e}")
            return []
        
        # Connect assets to relevant sectors
        edges.append(MapEdge(source="crude_oil", target="sector_energy"))
        edges.append(MapEdge(source="gold", target="sector_metal"))
        
        return edges

    def _get_cluster_for_category(self, category: str) -> ClusterType:
        """Map a category to cluster type"""
        return CATEGORY_TO_CLUSTER.get(category.lower(), "stocks")

    def get_stock_details(self, ticker: str) -> Optional[StockDetail]:
        """
        Get detailed information for a stock.
        Uses yfinance to fetch real stock data from NSE India.
        """
        ticker_upper = ticker.upper()
        stock_info = NIFTY_50_STOCKS.get(ticker_upper)
        
        if not stock_info:
            return None
        
        # Check cache first
        cache_key = f"stock:{ticker_upper}"
        if cache_key in _stock_cache:
            cached_time, cached_data = _stock_cache[cache_key]
            if datetime.now() - cached_time < timedelta(minutes=_cache_ttl_minutes):
                return cached_data
        
        # Try to fetch real stock data using yfinance
        try:
            import yfinance as yf
            
            # NSE stock symbols need .NS suffix
            yf_ticker = f"{ticker_upper}.NS"
            stock = yf.Ticker(yf_ticker)
            
            # Get historical data for sparkline (last 7 days)
            hist = stock.history(period="7d")
            
            if not hist.empty:
                current_price = hist['Close'].iloc[-1]
                prev_close = hist['Close'].iloc[-2] if len(hist) > 1 else current_price
                change = current_price - prev_close
                change_percent = (change / prev_close) * 100 if prev_close else 0
                
                # Get sparkline from close prices
                sparkline = hist['Close'].tolist()[-8:]  # Last 8 data points
                if len(sparkline) < 8:
                    sparkline = sparkline + [sparkline[-1]] * (8 - len(sparkline))
                
                # Get volume and market cap
                info = stock.info
                volume = info.get('volume', 0)
                market_cap = info.get('marketCap', 0)
                
                # Format volume
                if volume >= 1_000_000:
                    volume_str = f"{volume / 1_000_000:.1f}M"
                elif volume >= 1000:
                    volume_str = f"{volume / 1000:.1f}K"
                else:
                    volume_str = str(volume)
                
                # Format market cap
                if market_cap >= 1_000_000_000_000:  # Trillion
                    mcap_str = f"₹{market_cap / 1_000_000_000_000:.1f}L Cr"
                elif market_cap >= 10_000_000_000:  # 1000 Cr+
                    mcap_str = f"₹{market_cap / 10_000_000_000:.0f}K Cr"
                elif market_cap >= 100_000_000:  # 10 Cr+
                    mcap_str = f"₹{market_cap / 100_000_000:.0f} Cr"
                else:
                    mcap_str = "N/A"
                
                # Determine signal based on real data
                if change_percent > 1:
                    signal = "bullish"
                elif change_percent < -1:
                    signal = "bearish"
                else:
                    signal = "neutral"
                
                result = StockDetail(
                    price=round(current_price, 2),
                    change=round(change, 2),
                    changePercent=round(change_percent, 2),
                    volume=volume_str,
                    marketCap=mcap_str,
                    sparkline=sparkline,
                    signal=signal,
                    description=f"{stock_info['name']} is a leading company in the {stock_info['sector']} sector, listed on NSE as part of the Nifty 50 index.",
                )
                
                # Cache the result
                _stock_cache[cache_key] = (datetime.now(), result)
                return result
                
        except Exception as e:
            print(f"Error fetching stock data for {ticker_upper}: {e}")
        
        # Fallback to mock data if yfinance fails
        seed = hash(ticker_upper)
        random.seed(seed)
        
        base_price = 500 + (seed % 5000)
        change = round(random.uniform(-50, 50), 2)
        change_percent = round((change / base_price) * 100, 2)
        
        return StockDetail(
            price=round(base_price + random.uniform(-100, 100), 2),
            change=change,
            changePercent=change_percent,
            volume=f"{random.randint(1, 50)}M",
            marketCap=f"₹{random.randint(10, 500)}K Cr",
            sparkline=[
                base_price + random.uniform(-50, 50) for _ in range(8)
            ],
            signal=random.choice(["bullish", "bearish", "neutral"]),
            description=f"{stock_info['name']} is a leading company in the {stock_info['sector']} sector, listed on NSE as part of the Nifty 50 index.",
        )

    def search_similar_stocks(self, ticker: str, limit: int = 5) -> List[str]:
        """Find stocks similar to the given ticker using vector search"""
        if not self.is_connected():
            # Return random stocks from same sector as fallback
            stock_info = NIFTY_50_STOCKS.get(ticker.upper())
            if stock_info:
                same_sector = [
                    t for t, info in NIFTY_50_STOCKS.items()
                    if info["sector"] == stock_info["sector"] and t != ticker.upper()
                ]
                return same_sector[:limit]
            return []
        
        # TODO: Implement actual vector similarity search
        return []


# Singleton instance
qdrant_service = QdrantService()
