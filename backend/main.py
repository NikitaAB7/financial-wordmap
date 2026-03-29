from contextlib import asynccontextmanager
from typing import Dict, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx

from config import API_HOST, API_PORT, DEFINE_EDGE_BASE_URL, DEFINE_EDGE_API_KEY
from models.schemas import (
    MapDataResponse,
    NodeDetailResponse,
    NewsItem,
    ClusterMeta,
    StockDetail,
    DocumentChunk,
)
from services.qdrant_service import qdrant_service, NIFTY_50_STOCKS
from services.tavily_service import tavily_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup: Connect to Qdrant
    print("Connecting to Qdrant...")
    connected = qdrant_service.connect()
    if connected:
        print("✓ Connected to Qdrant")
        info = qdrant_service.get_collection_info()
        print(f"  Collection: {info}")
    else:
        print("✗ Qdrant connection failed - using fallback data")
    
    # Check Tavily configuration
    if tavily_service.is_configured():
        print("✓ Tavily API configured")
    else:
        print("✗ Tavily API not configured - using mock news")
    
    yield
    
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title="Financial WordMap API",
    description="API for Financial WordMap visualization with Qdrant and Tavily integration",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Financial WordMap API",
        "qdrant_connected": qdrant_service.is_connected(),
        "tavily_configured": tavily_service.is_configured(),
    }


@app.get("/api/map", response_model=MapDataResponse)
async def get_map_data():
    """
    Get all nodes and edges for the financial word map.
    Data is sourced from Qdrant or fallback Nifty 50 data.
    """
    try:
        nodes = qdrant_service.build_map_nodes()
        edges = qdrant_service.build_map_edges(nodes)
        
        # Convert to dict format expected by frontend
        return MapDataResponse(
            nodes=nodes,
            edges=edges,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/node/{node_id}", response_model=NodeDetailResponse)
async def get_node_details(node_id: str):
    """
    Get detailed information for a specific node including stock data and news.
    """
    # Get stock details
    details = qdrant_service.get_stock_details(node_id)
    
    if not details:
        # Try to create generic details for non-stock nodes
        details = StockDetail(
            price=0,
            change=0,
            changePercent=0,
            volume="N/A",
            marketCap="N/A",
            sparkline=[0] * 8,
            signal="neutral",
            description=f"Information about {node_id}",
        )
    
    # Get company name for news search
    stock_info = NIFTY_50_STOCKS.get(node_id.upper(), {})
    company_name = stock_info.get("name", node_id)
    
    # Fetch news
    news = await tavily_service.get_stock_news(node_id, company_name)
    
    return NodeDetailResponse(
        details=details,
        news=news,
    )


@app.get("/api/node/{node_id}/news", response_model=List[NewsItem])
async def get_node_news(node_id: str, limit: int = 5):
    """
    Get news articles related to a specific node/stock.
    Uses Tavily API or returns mock data.
    """
    stock_info = NIFTY_50_STOCKS.get(node_id.upper(), {})
    company_name = stock_info.get("name", node_id)
    
    news = await tavily_service.get_stock_news(node_id, company_name)
    return news[:limit]


@app.get("/api/node/{node_id}/details", response_model=StockDetail)
async def get_stock_details_only(node_id: str):
    """
    Get the stock details (price, change, etc.) for a node.
    Uses Tavily API to fetch real-time stock prices when available.
    """
    # Get base details from qdrant service
    details = qdrant_service.get_stock_details(node_id)
    
    if not details:
        raise HTTPException(status_code=404, detail=f"Stock {node_id} not found")
    
    # Try to get real price from Tavily
    ticker_upper = node_id.upper()
    stock_info = NIFTY_50_STOCKS.get(ticker_upper)
    if stock_info and tavily_service.is_configured():
        try:
            price_data = await tavily_service.get_stock_price(
                ticker_upper,
                stock_info.get("name", "")
            )
            if price_data:
                # Update with real price data
                if "price" in price_data:
                    details.price = price_data["price"]
                if "change" in price_data:
                    details.change = price_data["change"]
                if "changePercent" in price_data:
                    details.changePercent = price_data["changePercent"]
                # Update signal based on real change
                if details.changePercent > 1:
                    details.signal = "bullish"
                elif details.changePercent < -1:
                    details.signal = "bearish"
                else:
                    details.signal = "neutral"
        except Exception as e:
            print(f"Error fetching real price for {node_id}: {e}")
    
    return details


@app.get("/api/node/{node_id}/chunks", response_model=List[DocumentChunk])
async def get_node_chunks(node_id: str, limit: int = 5):
    """
    Get document chunks from Qdrant related to a specific node.
    These are the source documents that support the node's connections.
    """
    chunks = qdrant_service.get_chunks_for_node(node_id, limit)
    return chunks


@app.get("/api/edge/{source}/{target}/chunks", response_model=List[DocumentChunk])
async def get_edge_chunks(source: str, target: str, limit: int = 3):
    """
    Get document chunks that support the connection between two nodes.
    """
    # Extract ticker from node IDs
    source_ticker = source.upper() if not source.startswith("sector_") else ""
    target_ticker = target.upper() if not target.startswith("sector_") else ""
    
    ticker = target_ticker or source_ticker
    sector = ""
    
    # Get sector from node ID if applicable
    if source.startswith("sector_"):
        sector = source.replace("sector_", "").replace("_", " ").title()
    elif target.startswith("sector_"):
        sector = target.replace("sector_", "").replace("_", " ").title()
    
    if ticker and sector:
        chunks = qdrant_service.get_supporting_chunks(ticker, sector, limit)
    elif ticker:
        chunks = qdrant_service.get_chunks_for_node(ticker, limit)
    else:
        chunks = []
    
    return chunks


@app.get("/api/pdf/{filename:path}")
async def get_pdf(filename: str, page: int = None):
    """
    Proxy PDF files from Define Edge API.
    This endpoint fetches the PDF and serves it to the client.
    """
    if not DEFINE_EDGE_API_KEY:
        raise HTTPException(status_code=500, detail="Define Edge API key not configured")
    
    # Construct the Define Edge URL for the PDF
    # Try different possible endpoints
    possible_urls = [
        f"{DEFINE_EDGE_BASE_URL}/api/v1/files/{filename}",
        f"{DEFINE_EDGE_BASE_URL}/files/{filename}",
        f"{DEFINE_EDGE_BASE_URL}/documents/{filename}",
        f"{DEFINE_EDGE_BASE_URL}/pdfs/{filename}",
    ]
    
    headers = {
        "Authorization": f"Bearer {DEFINE_EDGE_API_KEY}",
        "X-API-Key": DEFINE_EDGE_API_KEY,
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for url in possible_urls:
            try:
                response = await client.get(url, headers=headers, follow_redirects=True)
                if response.status_code == 200:
                    # Check if it's actually a PDF
                    content_type = response.headers.get("content-type", "")
                    if "pdf" in content_type.lower() or filename.endswith(".pdf"):
                        return StreamingResponse(
                            iter([response.content]),
                            media_type="application/pdf",
                            headers={
                                "Content-Disposition": f"inline; filename={filename}",
                            }
                        )
            except Exception:
                continue
    
    raise HTTPException(status_code=404, detail=f"PDF not found: {filename}")


@app.get("/api/clusters", response_model=Dict[str, ClusterMeta])
async def get_clusters():
    """
    Get metadata for all clusters including counts.
    """
    nodes = qdrant_service.build_map_nodes()
    
    # Count nodes per cluster
    cluster_counts = {"news": 0, "assets": 0, "sectors": 0, "stocks": 0}
    for node in nodes:
        cluster_counts[node.cluster] += 1
    
    return {
        "news": ClusterMeta(
            label="NEWS & SENTIMENT",
            color="hsl(38, 92%, 50%)",
            count=cluster_counts["news"],
        ),
        "assets": ClusterMeta(
            label="ASSET CLASSES",
            color="hsl(180, 70%, 45%)",
            count=cluster_counts["assets"],
        ),
        "sectors": ClusterMeta(
            label="SECTORS",
            color="hsl(152, 60%, 40%)",
            count=cluster_counts["sectors"],
        ),
        "stocks": ClusterMeta(
            label="STOCKS",
            color="hsl(270, 60%, 55%)",
            count=cluster_counts["stocks"],
        ),
    }


@app.get("/api/search")
async def search_nodes(q: str, limit: int = 10):
    """
    Search for nodes by name or ticker.
    """
    nodes = qdrant_service.build_map_nodes()
    query_lower = q.lower()
    
    results = []
    for node in nodes:
        if query_lower in node.label.lower() or (node.sublabel and query_lower in node.sublabel.lower()):
            results.append(node)
            if len(results) >= limit:
                break
    
    return results


@app.get("/api/similar/{node_id}")
async def get_similar_nodes(node_id: str, limit: int = 5):
    """
    Get nodes similar to the specified node.
    Uses vector similarity from Qdrant when available.
    """
    similar = qdrant_service.search_similar_stocks(node_id, limit)
    return {"similar": similar}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)
