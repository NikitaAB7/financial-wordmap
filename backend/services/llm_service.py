"""
LLM Service for generating dynamic connections using OpenAI.
"""
import json
import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class DynamicConnection:
    """A dynamically generated connection between nodes."""
    target: str  # Target node ID
    target_label: str  # Display label
    relationship: str  # Type of relationship (e.g., "impacts", "correlated_with")
    reasoning: str  # Why this connection exists
    strength: float  # Connection strength 0-1


class LLMService:
    """Service for generating dynamic connections using OpenAI GPT."""
    
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self._client = None
        
        # Node ID to label mapping for context
        self.node_labels = {
            # Stocks
            "reliance": "Reliance Industries", "tcs": "TCS", "hdfcbank": "HDFC Bank",
            "infy": "Infosys", "icicibank": "ICICI Bank", "hindunilvr": "Hindustan Unilever",
            "sbin": "SBI", "bhartiartl": "Bharti Airtel", "kotakbank": "Kotak Bank",
            "itc": "ITC", "axisbank": "Axis Bank", "lt": "L&T", "asianpaint": "Asian Paints",
            "maruti": "Maruti Suzuki", "sunpharma": "Sun Pharma", "tatamotors": "Tata Motors",
            "wipro": "Wipro", "hcltech": "HCL Tech", "ultracemco": "UltraTech Cement",
            "ongc": "ONGC", "ntpc": "NTPC", "powergrid": "Power Grid", "tatasteel": "Tata Steel",
            "jswsteel": "JSW Steel", "bajfinance": "Bajaj Finance", "bajajfinsv": "Bajaj Finserv",
            "nestleind": "Nestle India", "titan": "Titan", "techm": "Tech Mahindra",
            "adanient": "Adani Enterprises", "adaniports": "Adani Ports", "coalindia": "Coal India",
            "bpcl": "BPCL", "drreddy": "Dr Reddy's", "cipla": "Cipla", "divislab": "Divi's Labs",
            "britannia": "Britannia", "eichermot": "Eicher Motors", "heromotoco": "Hero MotoCorp",
            "m&m": "Mahindra & Mahindra", "apollohosp": "Apollo Hospitals", "grasim": "Grasim",
            "hindalco": "Hindalco", "indusindbk": "IndusInd Bank", "sbilife": "SBI Life",
            "hdfclife": "HDFC Life", "tataconsum": "Tata Consumer", "vedl": "Vedanta",
            # Sectors
            "sector_banking": "Banking", "sector_it": "IT Services", "sector_fmcg": "FMCG",
            "sector_pharma": "Pharma", "sector_auto": "Auto", "sector_energy": "Energy",
            "sector_metal": "Metals", "sector_power": "Power", "sector_cement": "Cement",
            "sector_telecom": "Telecom", "sector_consumer": "Consumer",
            "sector_financial": "Financial Services", "sector_infrastructure": "Infrastructure",
            "sector_healthcare": "Healthcare", "sector_retail": "Retail",
            "sector_conglomerate": "Conglomerate", "sector_chemicals": "Chemicals",
            "sector_insurance": "Insurance", "sector_mining": "Mining",
            # Assets
            "crude_oil": "Crude Oil", "gold": "Gold", "usd_inr": "USD/INR",
            "nifty50": "Nifty 50", "bitcoin": "Bitcoin", "equity": "Equity",
            "fixed_income": "Fixed Income", "commodities": "Commodities",
            # News topics
            "fed_sentiment": "Fed Sentiment", "market_mood": "Market Mood",
            "global_risk": "Global Risk", "earnings_season": "Earnings Season",
            "inflation_watch": "Inflation Watch",
        }
    
    def is_configured(self) -> bool:
        """Check if OpenAI API is configured."""
        return bool(self.api_key and len(self.api_key) > 10)
    
    def _get_client(self):
        """Lazy initialization of OpenAI client."""
        if self._client is None and self.is_configured():
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=self.api_key)
            except ImportError:
                print("OpenAI package not installed. Run: pip install openai")
                return None
            except Exception as e:
                print(f"Failed to initialize OpenAI client: {e}")
                return None
        return self._client
    
    async def generate_dynamic_connections(
        self,
        node_id: str,
        node_label: str,
        node_type: str,  # 'stock', 'sector', 'asset', 'news'
        recent_news: List[Dict[str, Any]],
        existing_connections: List[str],
        max_connections: int = 5,
        all_nodes: Optional[Dict[str, str]] = None
    ) -> List[DynamicConnection]:
        """
        Generate dynamic connections for a node based on current context.
        
        Args:
            node_id: The source node ID
            node_label: Display label of the source node
            node_type: Type of node (stock, sector, asset, news)
            recent_news: Recent news headlines for context
            existing_connections: Already connected node IDs
            max_connections: Maximum number of connections to generate
            all_nodes: Dict mapping node_id to label for all nodes in the graph
            
        Returns:
            List of DynamicConnection objects
        """
        client = self._get_client()
        if not client:
            return self._fallback_connections(node_id, node_type, max_connections)
        
        # Build context from news
        news_context = "\n".join([
            f"- {item.get('title', '')} ({item.get('sentiment', 'neutral')})"
            for item in recent_news[:5]
        ]) if recent_news else "No recent news available."
        
        # Use provided node list or fall back to hardcoded list
        node_mapping = all_nodes if all_nodes else self.node_labels
        
        # Build available nodes list (exclude already connected)
        available_nodes = {
            k: v for k, v in node_mapping.items()
            if k not in existing_connections and k != node_id
        }
        
        # Create the prompt
        prompt = f"""You are a financial analyst AI. Given a node in a financial knowledge graph, suggest logical connections based on current market context.

CURRENT NODE:
- ID: {node_id}
- Label: {node_label}
- Type: {node_type}

RECENT NEWS CONTEXT:
{news_context}

AVAILABLE NODES TO CONNECT TO:
{json.dumps(available_nodes, indent=2)}

TASK: Suggest {max_connections} most relevant connections from the current node to available nodes. Consider:
1. Direct business relationships (suppliers, competitors, partners)
2. Sector/industry correlations
3. Macroeconomic linkages (oil prices affecting auto, rates affecting banks)
4. Current news themes and their cross-sector impacts
5. Investment thesis connections

For each connection, provide:
- target: the node_id to connect to
- target_label: the display name
- relationship: a short relationship type (e.g., "impacts", "correlated_with", "benefits_from", "competes_with", "supplier_to", "affected_by")
- reasoning: a 1-2 sentence explanation of why this connection is relevant NOW
- strength: a value from 0.3 to 1.0 indicating connection strength

Return ONLY a JSON array with exactly {max_connections} connections. Example format:
[
  {{"target": "crude_oil", "target_label": "Crude Oil", "relationship": "affected_by", "reasoning": "Rising crude oil prices directly impact ONGC's profitability as an upstream oil producer.", "strength": 0.9}}
]"""

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a financial market expert. Return only valid JSON arrays."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1500,
            )
            
            # Parse response
            content = response.choices[0].message.content.strip()
            
            # Extract JSON from response (handle markdown code blocks)
            if "```" in content:
                start = content.find("[")
                end = content.rfind("]") + 1
                content = content[start:end]
            
            connections_data = json.loads(content)
            
            # Convert to DynamicConnection objects
            connections = []
            for item in connections_data[:max_connections]:
                try:
                    conn = DynamicConnection(
                        target=item.get("target", ""),
                        target_label=item.get("target_label", ""),
                        relationship=item.get("relationship", "related_to"),
                        reasoning=item.get("reasoning", ""),
                        strength=float(item.get("strength", 0.5))
                    )
                    # Validate target exists in the provided node mapping
                    if conn.target in node_mapping or conn.target in available_nodes:
                        connections.append(conn)
                except (KeyError, ValueError) as e:
                    print(f"Error parsing connection: {e}")
                    continue
            
            return connections
            
        except Exception as e:
            print(f"Error generating connections with OpenAI: {e}")
            return self._fallback_connections(node_id, node_type, max_connections)
    
    def _fallback_connections(
        self,
        node_id: str,
        node_type: str,
        max_connections: int
    ) -> List[DynamicConnection]:
        """Fallback rule-based connections when LLM is unavailable."""
        
        # Define some static fallback connections based on node type
        fallback_rules = {
            "stock": {
                "reliance": [
                    ("crude_oil", "Crude Oil", "affected_by", "Oil prices directly impact Reliance's petrochemical business", 0.9),
                    ("sector_energy", "Energy", "belongs_to", "Reliance is a major player in India's energy sector", 0.85),
                ],
                "tcs": [
                    ("usd_inr", "USD/INR", "benefits_from", "TCS earns most revenue in USD, benefiting from rupee depreciation", 0.85),
                    ("sector_it", "IT Services", "belongs_to", "TCS is India's largest IT services company", 0.9),
                ],
                "hdfcbank": [
                    ("fed_sentiment", "Fed Sentiment", "affected_by", "US Fed policy impacts global liquidity and Indian banks", 0.7),
                    ("sector_banking", "Banking", "belongs_to", "HDFC Bank is India's largest private bank", 0.95),
                ],
            },
            "sector": {
                "sector_banking": [
                    ("fed_sentiment", "Fed Sentiment", "affected_by", "Banking sector is sensitive to global interest rate changes", 0.8),
                    ("inflation_watch", "Inflation Watch", "correlated_with", "Inflation impacts loan demand and NIM", 0.75),
                ],
                "sector_it": [
                    ("usd_inr", "USD/INR", "benefits_from", "IT exports benefit from weaker rupee", 0.8),
                    ("global_risk", "Global Risk", "affected_by", "IT spending depends on global economic outlook", 0.7),
                ],
                "sector_energy": [
                    ("crude_oil", "Crude Oil", "correlated_with", "Energy sector moves with crude oil prices", 0.9),
                    ("global_risk", "Global Risk", "affected_by", "Geopolitical risks impact oil supply", 0.8),
                ],
            },
            "asset": {
                "crude_oil": [
                    ("sector_energy", "Energy", "impacts", "Oil prices drive energy sector performance", 0.9),
                    ("inflation_watch", "Inflation Watch", "impacts", "Oil prices are a key inflation driver", 0.8),
                    ("sector_auto", "Auto", "impacts", "High oil prices affect auto demand", 0.7),
                ],
                "gold": [
                    ("global_risk", "Global Risk", "benefits_from", "Gold is a safe haven during uncertainty", 0.85),
                    ("usd_inr", "USD/INR", "inversely_correlated", "Gold often moves inverse to dollar strength", 0.7),
                ],
                "usd_inr": [
                    ("sector_it", "IT Services", "impacts", "IT sector revenues impacted by forex moves", 0.8),
                    ("fed_sentiment", "Fed Sentiment", "affected_by", "Fed policy drives dollar strength", 0.85),
                ],
            },
            "news": {
                "fed_sentiment": [
                    ("sector_banking", "Banking", "impacts", "Banking sector most sensitive to rate changes", 0.85),
                    ("usd_inr", "USD/INR", "impacts", "Fed policy directly affects USD/INR", 0.9),
                ],
                "inflation_watch": [
                    ("sector_fmcg", "FMCG", "impacts", "Inflation affects FMCG margins and demand", 0.75),
                    ("gold", "Gold", "correlated_with", "Inflation concerns drive gold demand", 0.7),
                ],
                "global_risk": [
                    ("gold", "Gold", "benefits", "Safe haven buying during risk-off", 0.85),
                    ("crude_oil", "Crude Oil", "impacts", "Geopolitical risks affect oil supply", 0.8),
                ],
            }
        }
        
        # Get fallback connections for this node
        type_rules = fallback_rules.get(node_type, {})
        node_rules = type_rules.get(node_id, [])
        
        if not node_rules:
            # Generic fallbacks based on type
            if node_type == "stock":
                node_rules = [
                    ("nifty50", "Nifty 50", "component_of", "Part of the Nifty 50 index", 0.7),
                    ("market_mood", "Market Mood", "affected_by", "Stock sentiment follows market mood", 0.6),
                ]
            elif node_type == "sector":
                node_rules = [
                    ("nifty50", "Nifty 50", "contributes_to", "Sector contributes to Nifty performance", 0.7),
                    ("earnings_season", "Earnings Season", "affected_by", "Sector performance tied to earnings", 0.65),
                ]
            else:
                node_rules = [
                    ("market_mood", "Market Mood", "influences", "Affects overall market sentiment", 0.6),
                ]
        
        connections = []
        for target, label, rel, reason, strength in node_rules[:max_connections]:
            connections.append(DynamicConnection(
                target=target,
                target_label=label,
                relationship=rel,
                reasoning=reason,
                strength=strength
            ))
        
        return connections


# Singleton instance
llm_service = LLMService()
