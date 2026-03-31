"""
Topic Mapper Service
Implements a two-layer mapping system:
1. Static layer: hardcoded semantic graph (stocks → sectors → asset classes)
2. Dynamic layer: news topics → bubbles → graph highlighting
"""

from typing import List, Dict, Set, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import re
from collections import defaultdict

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class GraphNode:
    """Represents a node in the financial knowledge graph"""
    id: str
    label: str
    node_type: str  # "stock", "sector", "asset", "news_topic"
    sector: Optional[str] = None
    linked_sectors: List[str] = field(default_factory=list)
    linked_assets: List[str] = field(default_factory=list)


@dataclass
class NewsTopic:
    """A clustered news topic with sentiment and entity links"""
    id: str
    name: str
    headlines: List[Dict]
    sentiment_score: float  # -1 to 1
    sentiment: str  # "positive", "negative", "neutral"
    linked_entities: List[str]  # node IDs this topic connects to
    headline_count: int
    timestamp: datetime = field(default_factory=datetime.now)


# =============================================================================
# Static Knowledge Graph
# =============================================================================

# Nifty 50 stocks with their sectors
NIFTY_50_STOCKS = {
    "RELIANCE": {"name": "Reliance Industries", "sector": "Energy", "keywords": ["oil", "gas", "refinery", "jio", "retail"]},
    "TCS": {"name": "Tata Consultancy Services", "sector": "IT", "keywords": ["software", "digital", "cloud", "ai"]},
    "HDFCBANK": {"name": "HDFC Bank", "sector": "Banking", "keywords": ["bank", "loan", "credit", "deposit"]},
    "INFY": {"name": "Infosys", "sector": "IT", "keywords": ["software", "consulting", "digital", "cloud"]},
    "ICICIBANK": {"name": "ICICI Bank", "sector": "Banking", "keywords": ["bank", "loan", "credit"]},
    "HINDUNILVR": {"name": "Hindustan Unilever", "sector": "FMCG", "keywords": ["consumer", "soap", "food"]},
    "ITC": {"name": "ITC", "sector": "FMCG", "keywords": ["cigarette", "hotel", "food", "fmcg"]},
    "SBIN": {"name": "State Bank of India", "sector": "Banking", "keywords": ["bank", "psu", "loan"]},
    "BHARTIARTL": {"name": "Bharti Airtel", "sector": "Telecom", "keywords": ["telecom", "5g", "mobile", "internet"]},
    "KOTAKBANK": {"name": "Kotak Mahindra Bank", "sector": "Banking", "keywords": ["bank", "loan"]},
    "LT": {"name": "Larsen & Toubro", "sector": "Infrastructure", "keywords": ["construction", "engineering", "infra"]},
    "HCLTECH": {"name": "HCL Technologies", "sector": "IT", "keywords": ["software", "it services"]},
    "AXISBANK": {"name": "Axis Bank", "sector": "Banking", "keywords": ["bank", "loan", "credit"]},
    "ASIANPAINT": {"name": "Asian Paints", "sector": "Consumer", "keywords": ["paint", "home", "decor"]},
    "MARUTI": {"name": "Maruti Suzuki", "sector": "Auto", "keywords": ["car", "automobile", "vehicle"]},
    "SUNPHARMA": {"name": "Sun Pharma", "sector": "Pharma", "keywords": ["pharma", "drug", "medicine"]},
    "TITAN": {"name": "Titan Company", "sector": "Consumer", "keywords": ["jewelry", "watch", "tanishq"]},
    "BAJFINANCE": {"name": "Bajaj Finance", "sector": "Financial", "keywords": ["finance", "loan", "nbfc"]},
    "DMART": {"name": "Avenue Supermarts", "sector": "Retail", "keywords": ["retail", "supermarket", "grocery"]},
    "WIPRO": {"name": "Wipro", "sector": "IT", "keywords": ["software", "it services"]},
    "ULTRACEMCO": {"name": "UltraTech Cement", "sector": "Cement", "keywords": ["cement", "construction"]},
    "ONGC": {"name": "ONGC", "sector": "Energy", "keywords": ["oil", "gas", "exploration", "psu"]},
    "NTPC": {"name": "NTPC", "sector": "Power", "keywords": ["power", "electricity", "thermal"]},
    "POWERGRID": {"name": "Power Grid Corp", "sector": "Power", "keywords": ["power", "grid", "transmission"]},
    "M&M": {"name": "Mahindra & Mahindra", "sector": "Auto", "keywords": ["auto", "tractor", "suv"]},
    "TATAMOTORS": {"name": "Tata Motors", "sector": "Auto", "keywords": ["auto", "car", "jlr", "ev"]},
    "JSWSTEEL": {"name": "JSW Steel", "sector": "Metal", "keywords": ["steel", "metal", "iron"]},
    "TATASTEEL": {"name": "Tata Steel", "sector": "Metal", "keywords": ["steel", "metal", "iron"]},
    "ADANIENT": {"name": "Adani Enterprises", "sector": "Conglomerate", "keywords": ["infra", "ports", "energy"]},
    "ADANIPORTS": {"name": "Adani Ports", "sector": "Infrastructure", "keywords": ["ports", "logistics"]},
    "COALINDIA": {"name": "Coal India", "sector": "Mining", "keywords": ["coal", "mining", "psu"]},
    "BAJAJFINSV": {"name": "Bajaj Finserv", "sector": "Financial", "keywords": ["insurance", "finance"]},
    "TECHM": {"name": "Tech Mahindra", "sector": "IT", "keywords": ["software", "telecom", "5g"]},
    "HDFCLIFE": {"name": "HDFC Life", "sector": "Insurance", "keywords": ["insurance", "life"]},
    "SBILIFE": {"name": "SBI Life Insurance", "sector": "Insurance", "keywords": ["insurance", "life"]},
    "BRITANNIA": {"name": "Britannia Industries", "sector": "FMCG", "keywords": ["biscuit", "food", "fmcg"]},
    "INDUSINDBK": {"name": "IndusInd Bank", "sector": "Banking", "keywords": ["bank", "loan"]},
    "NESTLEIND": {"name": "Nestle India", "sector": "FMCG", "keywords": ["food", "maggi", "fmcg"]},
    "GRASIM": {"name": "Grasim Industries", "sector": "Cement", "keywords": ["cement", "textile", "chemicals"]},
    "CIPLA": {"name": "Cipla", "sector": "Pharma", "keywords": ["pharma", "drug", "generic"]},
    "DRREDDY": {"name": "Dr. Reddy's Labs", "sector": "Pharma", "keywords": ["pharma", "drug", "generic"]},
    "APOLLOHOSP": {"name": "Apollo Hospitals", "sector": "Healthcare", "keywords": ["hospital", "health", "medical"]},
    "EICHERMOT": {"name": "Eicher Motors", "sector": "Auto", "keywords": ["motorcycle", "royal enfield"]},
    "HEROMOTOCO": {"name": "Hero MotoCorp", "sector": "Auto", "keywords": ["motorcycle", "two wheeler"]},
    "DIVISLAB": {"name": "Divi's Labs", "sector": "Pharma", "keywords": ["pharma", "api", "chemicals"]},
    "BPCL": {"name": "BPCL", "sector": "Energy", "keywords": ["oil", "petrol", "refinery", "psu"]},
    "TATACONSUM": {"name": "Tata Consumer", "sector": "FMCG", "keywords": ["tea", "food", "consumer"]},
    "HINDALCO": {"name": "Hindalco", "sector": "Metal", "keywords": ["aluminum", "metal", "copper"]},
    "UPL": {"name": "UPL", "sector": "Chemicals", "keywords": ["agrochemical", "pesticide"]},
    "VEDL": {"name": "Vedanta", "sector": "Metal", "keywords": ["mining", "metal", "zinc", "aluminum"]},
}

# Sector definitions with related asset classes
SECTORS = {
    "IT": {"label": "Information Technology", "linked_assets": ["equity", "nifty50"], "keywords": ["software", "tech", "ai", "cloud", "digital", "saas"]},
    "Banking": {"label": "Banking", "linked_assets": ["equity", "nifty50", "fixed_income"], "keywords": ["bank", "loan", "credit", "npa", "deposit", "rbi"]},
    "Energy": {"label": "Energy", "linked_assets": ["crude_oil", "commodities"], "keywords": ["oil", "gas", "crude", "opec", "refinery", "petrol", "diesel"]},
    "Pharma": {"label": "Pharmaceuticals", "linked_assets": ["equity"], "keywords": ["pharma", "drug", "medicine", "vaccine", "fda", "healthcare"]},
    "Auto": {"label": "Automobile", "linked_assets": ["equity"], "keywords": ["car", "auto", "vehicle", "ev", "electric vehicle", "motorcycle"]},
    "FMCG": {"label": "Fast Moving Consumer Goods", "linked_assets": ["equity"], "keywords": ["consumer", "fmcg", "food", "beverage", "retail"]},
    "Metal": {"label": "Metals & Mining", "linked_assets": ["gold", "commodities"], "keywords": ["steel", "metal", "iron", "aluminum", "copper", "zinc"]},
    "Financial": {"label": "Financial Services", "linked_assets": ["equity", "fixed_income"], "keywords": ["finance", "nbfc", "insurance", "loan"]},
    "Infrastructure": {"label": "Infrastructure", "linked_assets": ["equity"], "keywords": ["infra", "construction", "road", "port", "airport"]},
    "Power": {"label": "Power & Utilities", "linked_assets": ["equity"], "keywords": ["power", "electricity", "coal", "thermal", "renewable"]},
    "Telecom": {"label": "Telecommunications", "linked_assets": ["equity"], "keywords": ["telecom", "5g", "mobile", "internet", "spectrum"]},
    "Consumer": {"label": "Consumer Durables", "linked_assets": ["equity"], "keywords": ["consumer", "appliance", "durables"]},
    "Insurance": {"label": "Insurance", "linked_assets": ["equity", "fixed_income"], "keywords": ["insurance", "policy", "premium"]},
    "Cement": {"label": "Cement", "linked_assets": ["equity"], "keywords": ["cement", "construction", "housing"]},
    "Healthcare": {"label": "Healthcare", "linked_assets": ["equity"], "keywords": ["hospital", "health", "medical", "diagnostic"]},
    "Retail": {"label": "Retail", "linked_assets": ["equity"], "keywords": ["retail", "ecommerce", "shopping"]},
    "Mining": {"label": "Mining", "linked_assets": ["commodities"], "keywords": ["mining", "coal", "mineral"]},
    "Conglomerate": {"label": "Conglomerate", "linked_assets": ["equity"], "keywords": ["diversified", "conglomerate"]},
    "Chemicals": {"label": "Chemicals", "linked_assets": ["equity"], "keywords": ["chemical", "pesticide", "fertilizer"]},
}

# Asset classes with linked sectors
ASSET_CLASSES = {
    "crude_oil": {"label": "Crude Oil", "linked_sectors": ["Energy"], "keywords": ["oil", "crude", "opec", "brent", "wti", "petrol", "diesel", "refinery"]},
    "gold": {"label": "Gold", "linked_sectors": ["Metal"], "keywords": ["gold", "bullion", "precious metal", "safe haven", "inflation hedge"]},
    "usd_inr": {"label": "USD/INR", "linked_sectors": ["Banking", "Financial", "IT"], "keywords": ["dollar", "rupee", "forex", "currency", "exchange rate", "rbi"]},
    "nifty50": {"label": "NIFTY 50", "linked_sectors": list(SECTORS.keys()), "keywords": ["nifty", "sensex", "index", "market", "benchmark"]},
    "bitcoin": {"label": "Bitcoin", "linked_sectors": ["Financial"], "keywords": ["crypto", "bitcoin", "blockchain", "digital currency"]},
    "fixed_income": {"label": "Fixed Income", "linked_sectors": ["Banking", "Financial"], "keywords": ["bond", "yield", "treasury", "debt", "interest rate"]},
    "commodities": {"label": "Commodities", "linked_sectors": ["Energy", "Metal", "Mining"], "keywords": ["commodity", "futures", "mcx"]},
}

# News topic phrase mapping for rule-based classification
PHRASE_TO_SECTOR_ASSET = {
    # Energy related
    ("oil", "crude", "opec", "refinery", "energy crisis", "petrol", "diesel", "brent", "wti"): ["Energy", "crude_oil"],
    # Geopolitical
    ("war", "conflict", "sanction", "iran", "middle east", "russia", "ukraine", "geopolitical", "tension"): ["Energy", "crude_oil", "gold"],
    # Monetary policy
    ("inflation", "fed", "rate hike", "interest rate", "rbi", "monetary policy", "repo rate", "cpi"): ["Banking", "Financial", "fixed_income", "usd_inr"],
    # Safe haven
    ("gold", "safe haven", "bullion", "precious metal"): ["Metal", "gold"],
    # Technology
    ("tech", "ai", "artificial intelligence", "chip", "semiconductor", "nvidia", "software"): ["IT"],
    # Healthcare
    ("disease", "pandemic", "vaccine", "pharma", "drug", "fda", "healthcare"): ["Pharma", "Healthcare"],
    # Banking
    ("bank", "loan", "credit", "npa", "deposit", "liquidity"): ["Banking"],
    # Commodities
    ("commodity", "grain", "metal", "mcx", "futures"): ["Metal", "Mining", "commodities"],
    # Currency
    ("dollar", "rupee", "forex", "currency", "exchange rate"): ["Financial", "usd_inr"],
    # Earnings
    ("earnings", "quarterly results", "profit", "revenue", "guidance"): ["nifty50"],
    # Auto sector
    ("ev", "electric vehicle", "automobile", "car sales"): ["Auto"],
    # Market sentiment
    ("bull", "bear", "rally", "crash", "correction", "fii", "dii"): ["nifty50"],
}


# =============================================================================
# Topic Mapper Service
# =============================================================================

class TopicMapperService:
    """Service for mapping news topics to the financial knowledge graph"""
    
    def __init__(self):
        self._build_graph()
        self._topic_cache: Dict[str, NewsTopic] = {}
        self._cache_ttl_minutes = 30
        self._last_cache_update = datetime.min
    
    def _build_graph(self):
        """Build the static knowledge graph"""
        self.nodes: Dict[str, GraphNode] = {}
        
        # Add stock nodes
        for ticker, info in NIFTY_50_STOCKS.items():
            self.nodes[ticker.lower()] = GraphNode(
                id=ticker.lower(),
                label=ticker,
                node_type="stock",
                sector=info["sector"],
            )
        
        # Add sector nodes
        for sector_id, info in SECTORS.items():
            node_id = f"sector_{sector_id.lower().replace(' ', '_')}"
            self.nodes[node_id] = GraphNode(
                id=node_id,
                label=sector_id,
                node_type="sector",
                linked_assets=info["linked_assets"],
            )
        
        # Add asset nodes
        for asset_id, info in ASSET_CLASSES.items():
            self.nodes[asset_id] = GraphNode(
                id=asset_id,
                label=info["label"],
                node_type="asset",
                linked_sectors=info["linked_sectors"],
            )
    
    def map_headline_to_entities(self, headline: str, text: str = "") -> Tuple[List[str], float]:
        """
        Map a news headline to relevant entities (sectors, assets, stocks)
        Returns: (list of entity IDs, relevance score)
        """
        combined_text = f"{headline} {text}".lower()
        matched_entities: Set[str] = set()
        match_count = 0
        
        # Rule-based phrase matching
        for phrases, entities in PHRASE_TO_SECTOR_ASSET.items():
            for phrase in phrases:
                if phrase in combined_text:
                    match_count += 1
                    for entity in entities:
                        # Map to actual node IDs
                        if entity in SECTORS:
                            matched_entities.add(f"sector_{entity.lower().replace(' ', '_')}")
                        elif entity in ASSET_CLASSES:
                            matched_entities.add(entity)
                        elif entity in [s.lower() for s in NIFTY_50_STOCKS]:
                            matched_entities.add(entity)
        
        # Check for stock mentions
        for ticker, info in NIFTY_50_STOCKS.items():
            if ticker.lower() in combined_text or info["name"].lower() in combined_text:
                matched_entities.add(ticker.lower())
                sector_id = f"sector_{info['sector'].lower().replace(' ', '_')}"
                matched_entities.add(sector_id)
            # Check keywords
            for keyword in info.get("keywords", []):
                if keyword in combined_text:
                    matched_entities.add(ticker.lower())
                    sector_id = f"sector_{info['sector'].lower().replace(' ', '_')}"
                    matched_entities.add(sector_id)
                    break
        
        # Calculate relevance score
        relevance = min(1.0, match_count / 3.0) if match_count > 0 else 0.0
        
        return list(matched_entities), relevance
    
    def expand_entities_through_graph(self, entities: List[str], max_hops: int = 2) -> List[str]:
        """
        Walk the graph to find all connected entities up to max_hops away
        """
        visited: Set[str] = set(entities)
        frontier = list(entities)
        
        for hop in range(max_hops):
            next_frontier = []
            for entity_id in frontier:
                node = self.nodes.get(entity_id)
                if not node:
                    continue
                
                # Expand based on node type
                if node.node_type == "stock":
                    # Stock → Sector
                    if node.sector:
                        sector_id = f"sector_{node.sector.lower().replace(' ', '_')}"
                        if sector_id not in visited:
                            visited.add(sector_id)
                            next_frontier.append(sector_id)
                
                elif node.node_type == "sector":
                    sector_info = SECTORS.get(node.label)
                    if sector_info:
                        # Sector → Assets
                        for asset_id in sector_info.get("linked_assets", []):
                            if asset_id not in visited:
                                visited.add(asset_id)
                                next_frontier.append(asset_id)
                        # Sector → Stocks (reverse lookup)
                        for ticker, stock_info in NIFTY_50_STOCKS.items():
                            if stock_info["sector"] == node.label:
                                if ticker.lower() not in visited:
                                    visited.add(ticker.lower())
                                    next_frontier.append(ticker.lower())
                
                elif node.node_type == "asset":
                    asset_info = ASSET_CLASSES.get(entity_id)
                    if asset_info:
                        # Asset → Sectors
                        for sector in asset_info.get("linked_sectors", []):
                            sector_id = f"sector_{sector.lower().replace(' ', '_')}"
                            if sector_id not in visited:
                                visited.add(sector_id)
                                next_frontier.append(sector_id)
            
            frontier = next_frontier
            if not frontier:
                break
        
        return list(visited)
    
    def cluster_headlines_into_topics(
        self, 
        news_items: List[Dict], 
        max_topics: int = 10
    ) -> List[NewsTopic]:
        """
        Cluster news headlines into topics based on entity overlap
        Returns top-k most active topics
        """
        # Group headlines by their primary entity mapping
        entity_groups: Dict[str, List[Dict]] = defaultdict(list)
        
        for item in news_items:
            title = item.get("title", "")
            snippet = item.get("snippet", "")
            sentiment = item.get("sentiment", "neutral")
            
            entities, relevance = self.map_headline_to_entities(title, snippet)
            
            if entities:
                # Use the first/primary entity as the group key
                primary_entity = entities[0]
                entity_groups[primary_entity].append({
                    "title": title,
                    "snippet": snippet,
                    "sentiment": sentiment,
                    "url": item.get("url"),
                    "entities": entities,
                    "relevance": relevance,
                })
        
        # Create topic objects from groups
        topics = []
        for primary_entity, headlines in entity_groups.items():
            if not headlines:
                continue
            
            # Calculate average sentiment
            sentiment_scores = {
                "positive": 1,
                "neutral": 0,
                "negative": -1,
            }
            total_score = sum(sentiment_scores.get(h["sentiment"], 0) for h in headlines)
            avg_score = total_score / len(headlines) if headlines else 0
            
            if avg_score > 0.3:
                overall_sentiment = "positive"
            elif avg_score < -0.3:
                overall_sentiment = "negative"
            else:
                overall_sentiment = "neutral"
            
            # Get all linked entities
            all_entities: Set[str] = set()
            for h in headlines:
                all_entities.update(h["entities"])
            
            # Expand through graph
            expanded_entities = self.expand_entities_through_graph(list(all_entities), max_hops=1)
            
            # Generate topic name
            node = self.nodes.get(primary_entity)
            if node:
                topic_name = f"{node.label} Impact"
            else:
                topic_name = f"{primary_entity.replace('_', ' ').title()} News"
            
            topics.append(NewsTopic(
                id=f"topic_{primary_entity}",
                name=topic_name,
                headlines=headlines[:5],  # Keep top 5 headlines
                sentiment_score=avg_score,
                sentiment=overall_sentiment,
                linked_entities=expanded_entities,
                headline_count=len(headlines),
            ))
        
        # Sort by headline count and sentiment extremity
        topics.sort(key=lambda t: (t.headline_count, abs(t.sentiment_score)), reverse=True)
        
        return topics[:max_topics]
    
    def get_highlighted_nodes(self, topics: List[NewsTopic]) -> Dict[str, Dict]:
        """
        Get all nodes that should be highlighted based on active topics
        Returns dict of node_id -> {topics, sentiment, intensity}
        """
        highlights: Dict[str, Dict] = {}
        
        for topic in topics:
            for entity_id in topic.linked_entities:
                if entity_id not in highlights:
                    highlights[entity_id] = {
                        "topics": [],
                        "sentiment_scores": [],
                        "headline_count": 0,
                    }
                
                highlights[entity_id]["topics"].append(topic.id)
                highlights[entity_id]["sentiment_scores"].append(topic.sentiment_score)
                highlights[entity_id]["headline_count"] += topic.headline_count
        
        # Calculate aggregate metrics
        for node_id, data in highlights.items():
            avg_sentiment = sum(data["sentiment_scores"]) / len(data["sentiment_scores"])
            data["sentiment"] = "positive" if avg_sentiment > 0.3 else "negative" if avg_sentiment < -0.3 else "neutral"
            data["intensity"] = min(1.0, data["headline_count"] / 10.0)  # Normalize to 0-1
            data["sentiment_score"] = avg_sentiment
        
        return highlights
    
    def get_topic_edges(self, topics: List[NewsTopic]) -> List[Dict]:
        """
        Generate edges from topics to their linked entities
        """
        edges = []
        
        for topic in topics:
            for entity_id in topic.linked_entities:
                edges.append({
                    "source": topic.id,
                    "target": entity_id,
                    "weight": topic.headline_count,
                    "sentiment": topic.sentiment,
                })
        
        return edges


# Singleton instance
topic_mapper = TopicMapperService()
