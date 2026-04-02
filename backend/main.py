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
    NewsTopic as NewsTopicSchema,
    NodeHighlight,
    TopicEdge,
    TopicsResponse,
    TopicHeadline,
)
from services.qdrant_service import qdrant_service, NIFTY_50_STOCKS
from services.tavily_service import tavily_service
from services.topic_mapper import topic_mapper
from services.llm_service import llm_service


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
    # Check if this is a news cluster topic
    if node_id in NEWS_CLUSTER_TOPICS:
        topic_label = NEWS_CLUSTER_TOPICS[node_id]
        topic_descriptions = {
            "fed_sentiment": "Federal Reserve policy decisions and their impact on Indian markets. Track interest rate changes, monetary policy shifts, and global liquidity trends.",
            "market_mood": "Overall sentiment in Indian equity markets. Gauge investor confidence, FII/DII flows, and market breadth indicators.",
            "global_risk": "Geopolitical tensions, trade conflicts, and global economic risks affecting emerging markets and India specifically.",
            "earnings_season": "Corporate earnings results from Nifty 50 and broader market companies. Track revenue growth, profit margins, and guidance.",
            "inflation_watch": "India's inflation trends, RBI monetary policy decisions, and their impact on interest rates and equity valuations.",
        }
        
        details = StockDetail(
            price=0,
            change=0,
            changePercent=0,
            volume="N/A",
            marketCap="N/A",
            sparkline=[0] * 8,
            signal="neutral",
            description=topic_descriptions.get(node_id, f"News and analysis about {topic_label}"),
        )
        
        news = await tavily_service.get_topic_news(node_id, topic_label)
        return NodeDetailResponse(details=details, news=news)
    
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


# News cluster topic IDs and labels
NEWS_CLUSTER_TOPICS = {
    "fed_sentiment": "Fed Sentiment",
    "market_mood": "Market Mood",
    "global_risk": "Global Risk",
    "earnings_season": "Earnings Season",
    "inflation_watch": "Inflation Watch",
}

# Sector definitions with descriptions
SECTOR_INFO = {
    "sector_banking": {"label": "Banking", "description": "Indian banking sector including public and private banks. Track HDFC Bank, ICICI Bank, SBI, and other key players."},
    "sector_it": {"label": "IT Services", "description": "Information technology and software services sector. Includes TCS, Infosys, Wipro, HCL Tech."},
    "sector_fmcg": {"label": "FMCG", "description": "Fast-moving consumer goods sector. Track HUL, ITC, Nestle, Britannia and consumer demand trends."},
    "sector_pharma": {"label": "Pharma", "description": "Pharmaceutical and healthcare sector. Includes Sun Pharma, Dr Reddy's, Cipla and regulatory news."},
    "sector_auto": {"label": "Auto", "description": "Automobile and auto ancillary sector. Track Tata Motors, M&M, Maruti and EV transition news."},
    "sector_energy": {"label": "Energy", "description": "Oil, gas and energy sector. Includes Reliance, ONGC, BPCL and crude oil impact."},
    "sector_metal": {"label": "Metals", "description": "Metals and mining sector. Track Tata Steel, JSW Steel, Hindalco and commodity prices."},
    "sector_power": {"label": "Power", "description": "Power generation and utilities sector. Includes NTPC, Power Grid, and renewable energy trends."},
    "sector_cement": {"label": "Cement", "description": "Cement and building materials sector. Track infrastructure spending and construction demand."},
    "sector_telecom": {"label": "Telecom", "description": "Telecommunications sector. Includes Bharti Airtel, Jio and 5G rollout news."},
    "sector_consumer": {"label": "Consumer", "description": "Consumer durables and discretionary sector. Track spending patterns and urban demand."},
    "sector_financial": {"label": "Financial Services", "description": "NBFCs, insurance, and financial services. Includes Bajaj Finance, HDFC Life and credit growth."},
    "sector_infrastructure": {"label": "Infrastructure", "description": "Infrastructure and construction sector. Track L&T, Adani and government capex."},
    "sector_healthcare": {"label": "Healthcare", "description": "Healthcare services and hospitals. Includes Apollo Hospitals and healthcare spending trends."},
    "sector_retail": {"label": "Retail", "description": "Retail sector and consumer trends. Track organized retail growth and e-commerce impact."},
    "sector_conglomerate": {"label": "Conglomerate", "description": "Large diversified conglomerates. Includes Reliance, Tata group, and Adani group news."},
    "sector_chemicals": {"label": "Chemicals", "description": "Chemicals and specialty chemicals sector. Track raw material costs and export trends."},
    "sector_insurance": {"label": "Insurance", "description": "Life and general insurance sector. Includes LIC, HDFC Life and insurance penetration trends."},
    "sector_mining": {"label": "Mining", "description": "Mining and minerals sector. Track Coal India, Vedanta and commodity cycles."},
}

# Asset class definitions with descriptions
ASSET_INFO = {
    "crude_oil": {"label": "Crude Oil", "description": "Brent and WTI crude oil prices. Track OPEC decisions, supply disruptions and impact on Indian markets."},
    "gold": {"label": "Gold", "description": "Gold prices and precious metals. Safe haven demand, jewelry consumption and MCX gold trends."},
    "usd_inr": {"label": "USD/INR", "description": "Dollar-Rupee exchange rate. Track RBI intervention, FII flows and currency volatility."},
    "nifty50": {"label": "Nifty 50", "description": "Nifty 50 index performance. Benchmark for Indian large-cap equities and market breadth."},
    "bitcoin": {"label": "Bitcoin", "description": "Bitcoin and cryptocurrency markets. Track regulatory news and crypto adoption in India."},
    "equity": {"label": "Equity", "description": "Indian equity markets overview. Track FII/DII flows, market sentiment and valuations."},
    "fixed_income": {"label": "Fixed Income", "description": "Bond markets and fixed income. Track G-Sec yields, RBI policy and debt market trends."},
    "commodities": {"label": "Commodities", "description": "Commodity markets overview. Track MCX, agricultural commodities and industrial metals."},
}


@app.get("/api/node/{node_id}/news", response_model=List[NewsItem])
async def get_node_news(node_id: str, limit: int = 5):
    """
    Get news articles related to a specific node/stock or sentiment topic.
    Uses Tavily API or returns mock data.
    """
    # Check if this is a news cluster topic
    if node_id in NEWS_CLUSTER_TOPICS:
        topic_label = NEWS_CLUSTER_TOPICS[node_id]
        news = await tavily_service.get_topic_news(node_id, topic_label)
        return news[:limit]
    
    # Check if this is a sector
    if node_id in SECTOR_INFO:
        sector_label = SECTOR_INFO[node_id]["label"]
        news = await tavily_service.get_sector_news(node_id, sector_label)
        return news[:limit]
    
    # Check if this is an asset class
    if node_id in ASSET_INFO:
        asset_label = ASSET_INFO[node_id]["label"]
        news = await tavily_service.get_asset_news(node_id, asset_label)
        return news[:limit]
    
    # Otherwise treat as stock
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
    # Check if this is a news cluster topic
    if node_id in NEWS_CLUSTER_TOPICS:
        topic_label = NEWS_CLUSTER_TOPICS[node_id]
        topic_descriptions = {
            "fed_sentiment": "Federal Reserve policy decisions and their impact on Indian markets. Track interest rate changes, monetary policy shifts, and global liquidity trends.",
            "market_mood": "Overall sentiment in Indian equity markets. Gauge investor confidence, FII/DII flows, and market breadth indicators.",
            "global_risk": "Geopolitical tensions, trade conflicts, and global economic risks affecting emerging markets and India specifically.",
            "earnings_season": "Corporate earnings results from Nifty 50 and broader market companies. Track revenue growth, profit margins, and guidance.",
            "inflation_watch": "India's inflation trends, RBI monetary policy decisions, and their impact on interest rates and equity valuations.",
        }
        return StockDetail(
            price=0,
            change=0,
            changePercent=0,
            volume="N/A",
            marketCap="N/A",
            sparkline=[0] * 8,
            signal="neutral",
            description=topic_descriptions.get(node_id, f"News and analysis about {topic_label}"),
        )
    
    # Check if this is a sector
    if node_id in SECTOR_INFO:
        sector_info = SECTOR_INFO[node_id]
        return StockDetail(
            price=0,
            change=0,
            changePercent=0,
            volume="N/A",
            marketCap="N/A",
            sparkline=[0] * 8,
            signal="neutral",
            description=sector_info["description"],
        )
    
    # Check if this is an asset class
    if node_id in ASSET_INFO:
        asset_info = ASSET_INFO[node_id]
        return StockDetail(
            price=0,
            change=0,
            changePercent=0,
            volume="N/A",
            marketCap="N/A",
            sparkline=[0] * 8,
            signal="neutral",
            description=asset_info["description"],
        )
    
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


@app.get("/api/node/{node_id}/dynamic-connections")
async def get_dynamic_connections(node_id: str, limit: int = 5):
    """
    Get dynamically generated connections for a node using LLM.
    Returns intelligent connection suggestions based on current market context.
    """
    # Determine node type and label
    node_label = node_id
    node_type = "stock"
    
    if node_id in NEWS_CLUSTER_TOPICS:
        node_label = NEWS_CLUSTER_TOPICS[node_id]
        node_type = "news"
    elif node_id in SECTOR_INFO:
        node_label = SECTOR_INFO[node_id]["label"]
        node_type = "sector"
    elif node_id in ASSET_INFO:
        node_label = ASSET_INFO[node_id]["label"]
        node_type = "asset"
    elif node_id.upper() in NIFTY_50_STOCKS:
        node_label = NIFTY_50_STOCKS[node_id.upper()].get("name", node_id)
        node_type = "stock"
    
    # Get recent news for context
    recent_news = []
    try:
        if node_type == "news":
            news = await tavily_service.get_topic_news(node_id, node_label)
        elif node_type == "sector":
            news = await tavily_service.get_sector_news(node_id, node_label)
        elif node_type == "asset":
            news = await tavily_service.get_asset_news(node_id, node_label)
        else:
            news = await tavily_service.get_stock_news(node_id, node_label)
        recent_news = [{"title": n.title, "sentiment": n.sentiment} for n in news[:5]]
    except Exception as e:
        print(f"Error fetching news for context: {e}")
    
    # Get existing connections from graph
    nodes = qdrant_service.build_map_nodes()
    edges = qdrant_service.build_map_edges(nodes)
    existing_connections = [
        e.target if e.source == node_id else e.source
        for e in edges
        if e.source == node_id or e.target == node_id
    ]
    
    # Generate dynamic connections
    connections = await llm_service.generate_dynamic_connections(
        node_id=node_id,
        node_label=node_label,
        node_type=node_type,
        recent_news=recent_news,
        existing_connections=existing_connections,
        max_connections=limit
    )
    
    # Convert to response format
    return [
        {
            "target": conn.target,
            "target_label": conn.target_label,
            "relationship": conn.relationship,
            "reasoning": conn.reasoning,
            "strength": conn.strength
        }
        for conn in connections
    ]


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


# =============================================================================
# Topic Mapping Endpoints
# =============================================================================

@app.get("/api/topics", response_model=TopicsResponse)
async def get_active_topics(max_topics: int = 10):
    """
    Fetch latest news, cluster into topics, and return topic mappings.
    This powers the dynamic news-driven layer of the wordmap.
    """
    try:
        # Fetch latest market news
        news_items = await tavily_service.search_news(
            "India stock market Nifty Sensex financial news",
            max_results=30
        )
        
        # Also fetch sector-specific news
        sector_news = await tavily_service.search_news(
            "India banking IT pharma auto energy sector news",
            max_results=20
        )
        
        # Combine news
        all_news = []
        seen_titles = set()
        for item in news_items + sector_news:
            if item.title not in seen_titles:
                seen_titles.add(item.title)
                all_news.append({
                    "title": item.title,
                    "snippet": item.snippet,
                    "sentiment": item.sentiment,
                    "url": item.url,
                })
        
        # Cluster into topics
        topics = topic_mapper.cluster_headlines_into_topics(all_news, max_topics=max_topics)
        
        # Get highlights and edges
        highlights_dict = topic_mapper.get_highlighted_nodes(topics)
        topic_edges = topic_mapper.get_topic_edges(topics)
        
        # Convert to response format
        response_topics = []
        for topic in topics:
            response_topics.append(NewsTopicSchema(
                id=topic.id,
                name=topic.name,
                headlines=[TopicHeadline(
                    title=h["title"],
                    snippet=h.get("snippet", ""),
                    sentiment=h.get("sentiment", "neutral"),
                    url=h.get("url"),
                ) for h in topic.headlines[:5]],
                sentiment_score=topic.sentiment_score,
                sentiment=topic.sentiment,
                linked_entities=topic.linked_entities,
                headline_count=topic.headline_count,
            ))
        
        response_highlights = []
        for node_id, data in highlights_dict.items():
            response_highlights.append(NodeHighlight(
                node_id=node_id,
                topics=data["topics"],
                sentiment=data["sentiment"],
                sentiment_score=data["sentiment_score"],
                intensity=data["intensity"],
                headline_count=data["headline_count"],
            ))
        
        response_edges = []
        for edge in topic_edges:
            response_edges.append(TopicEdge(
                source=edge["source"],
                target=edge["target"],
                weight=edge["weight"],
                sentiment=edge["sentiment"],
            ))
        
        return TopicsResponse(
            topics=response_topics,
            highlights=response_highlights,
            topic_edges=response_edges,
        )
        
    except Exception as e:
        print(f"Error fetching topics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/topics/{topic_id}/news", response_model=List[NewsItem])
async def get_topic_news(topic_id: str, limit: int = 5):
    """
    Get news articles for a specific topic.
    """
    # Map topic IDs to search queries
    topic_queries = {
        "topic_sector_energy": "India energy sector oil gas stocks news",
        "topic_sector_banking": "India banking sector HDFC ICICI SBI news",
        "topic_sector_it": "India IT sector TCS Infosys Wipro news",
        "topic_crude_oil": "crude oil prices India impact energy stocks",
        "topic_gold": "gold prices India MCX bullion news",
        "topic_usd_inr": "rupee dollar exchange rate RBI forex news",
        "topic_nifty50": "Nifty 50 Sensex India stock market news",
    }
    
    # Clean up topic_id to match our keys
    query = topic_queries.get(topic_id)
    
    if not query:
        # Try to extract entity from topic_id
        entity = topic_id.replace("topic_", "")
        if entity in NIFTY_50_STOCKS:
            company_name = NIFTY_50_STOCKS[entity]["name"]
            query = f"{company_name} stock news India"
        else:
            query = f"{entity.replace('_', ' ')} India financial news"
    
    news = await tavily_service.search_news(query, max_results=limit)
    return news


@app.get("/api/graph/walk/{node_id}")
async def walk_graph_from_node(node_id: str, max_hops: int = 2):
    """
    Walk the knowledge graph starting from a node and return all connected entities.
    """
    connected = topic_mapper.expand_entities_through_graph([node_id], max_hops=max_hops)
    
    # Get node details for each connected entity
    result = []
    for entity_id in connected:
        node = topic_mapper.nodes.get(entity_id)
        if node:
            result.append({
                "id": node.id,
                "label": node.label,
                "type": node.node_type,
                "sector": node.sector,
            })
    
    return {"starting_node": node_id, "connected_nodes": result, "hops": max_hops}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)
