from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import re

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import TAVILY_API_KEY
from models.schemas import NewsItem, SentimentType

# Cache for news results to avoid excessive API calls
_news_cache: dict = {}
_cache_ttl_minutes = 10

# Only include news from the last year
MAX_NEWS_AGE_DAYS = 365


class TavilyService:
    """Service for fetching news using Tavily API"""

    def __init__(self):
        self.api_key = TAVILY_API_KEY
        self._client = None

    def _get_client(self):
        """Lazy initialization of TavilyClient"""
        if self._client is None and self.is_configured():
            try:
                from tavily import TavilyClient
                self._client = TavilyClient(self.api_key)
            except ImportError:
                print("tavily-python not installed. Run: pip install tavily-python")
                return None
        return self._client

    def is_configured(self) -> bool:
        """Check if Tavily API key is configured"""
        return bool(self.api_key) and self.api_key != "your_tavily_api_key_here"

    async def search_news(
        self,
        query: str,
        max_results: int = 5,
        include_domains: Optional[List[str]] = None,
    ) -> List[NewsItem]:
        """
        Search for news articles using Tavily API.
        
        Args:
            query: Search query (e.g., "Reliance Industries stock news")
            max_results: Maximum number of results (default 5)
            include_domains: Optional list of domains to search
            
        Returns:
            List of NewsItem objects
        """
        # Check cache first
        cache_key = f"{query}:{max_results}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        client = self._get_client()
        if not client:
            return self._get_mock_news(query)

        try:
            # Use TavilyClient search method
            response = client.search(
                query=query,
                search_depth="basic",
                include_answer=False,
                include_images=False,
                max_results=max_results,
                include_domains=include_domains or [
                    "economictimes.indiatimes.com",
                    "moneycontrol.com",
                    "livemint.com",
                    "business-standard.com",
                    "reuters.com",
                    "bloomberg.com",
                    "ndtv.com",
                    "zeebiz.com",
                ],
            )
            
            news_items = []
            for result in response.get("results", []):
                # Filter for news from last year only
                published_date = result.get("published_date")
                if not self._is_within_date_range(published_date, MAX_NEWS_AGE_DAYS):
                    continue
                
                # Analyze sentiment from content
                content = result.get("content", "") or ""
                title = result.get("title", "") or ""
                sentiment = self._analyze_sentiment(content + " " + title)
                
                news_items.append(NewsItem(
                    title=title,
                    source=self._extract_domain(result.get("url", "")),
                    time=self._format_date(published_date),
                    sentiment=sentiment,
                    snippet=(content[:200] + "...") if len(content) > 200 else content,
                    url=result.get("url"),
                    published_date=published_date,
                ))
                
                if len(news_items) >= max_results:
                    break
            
            # Cache results
            self._set_cache(cache_key, news_items)
            return news_items

        except Exception as e:
            print(f"Tavily API error: {e}")
            return self._get_mock_news(query)

    async def crawl_url(self, url: str) -> Dict[str, Any]:
        """
        Crawl a specific URL using Tavily's crawl method.
        
        Args:
            url: The URL to crawl
            
        Returns:
            Crawled content with extracted data
        """
        client = self._get_client()
        if not client:
            return {"error": "Tavily client not configured"}

        try:
            response = client.crawl(
                url=url,
                extract_depth="advanced"
            )
            return response
        except Exception as e:
            print(f"Tavily crawl error: {e}")
            return {"error": str(e)}

    def _get_cached(self, key: str) -> Optional[List[NewsItem]]:
        """Get cached news if still valid"""
        if key in _news_cache:
            cached_time, items = _news_cache[key]
            if datetime.now() - cached_time < timedelta(minutes=_cache_ttl_minutes):
                return items
        return None

    def _set_cache(self, key: str, items: List[NewsItem]):
        """Cache news items"""
        _news_cache[key] = (datetime.now(), items)

    def _analyze_sentiment(self, text: str) -> SentimentType:
        """
        Simple rule-based sentiment analysis.
        In production, use an ML model or sentiment API.
        """
        text_lower = text.lower()
        
        positive_words = [
            "rise", "gain", "up", "surge", "rally", "growth", "profit",
            "bullish", "outperform", "upgrade", "strong", "positive",
            "beat", "exceed", "record", "high", "boost", "optimistic"
        ]
        negative_words = [
            "fall", "drop", "down", "decline", "loss", "crash", "plunge",
            "bearish", "underperform", "downgrade", "weak", "negative",
            "miss", "concern", "risk", "low", "cut", "pessimistic", "warning"
        ]
        
        pos_count = sum(1 for word in positive_words if word in text_lower)
        neg_count = sum(1 for word in negative_words if word in text_lower)
        
        if pos_count > neg_count + 1:
            return "positive"
        elif neg_count > pos_count + 1:
            return "negative"
        return "neutral"

    def _extract_domain(self, url: str) -> str:
        """Extract domain name from URL"""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            domain = parsed.netloc.replace("www.", "")
            # Return just the main domain name
            parts = domain.split(".")
            if len(parts) >= 2:
                return parts[-2].title()
            return domain.title()
        except:
            return "News"

    def _is_within_date_range(self, published_date: Optional[str], max_days: int) -> bool:
        """Check if published date is within the allowed range"""
        if not published_date:
            return True  # Include if no date (we can't filter)
        
        try:
            pub_date = datetime.fromisoformat(published_date.replace("Z", "+00:00"))
            # Make datetime naive for comparison if needed
            if pub_date.tzinfo:
                pub_date = pub_date.replace(tzinfo=None)
            cutoff = datetime.now() - timedelta(days=max_days)
            return pub_date >= cutoff
        except:
            return True  # Include if date parsing fails
    
    def _format_date(self, published_date: Optional[str]) -> str:
        """Format published date to show actual date with relative time"""
        if not published_date:
            return "Recently"
        
        try:
            # Try parsing ISO format
            pub_date = datetime.fromisoformat(published_date.replace("Z", "+00:00"))
            now = datetime.now(pub_date.tzinfo) if pub_date.tzinfo else datetime.now()
            diff = now - pub_date
            
            # Format: "Mar 15, 2026 (3d ago)"
            date_str = pub_date.strftime("%b %d, %Y")
            
            if diff.days > 7:
                return date_str
            elif diff.days > 0:
                return f"{date_str} ({diff.days}d ago)"
            elif diff.seconds > 3600:
                return f"{date_str} ({diff.seconds // 3600}h ago)"
            elif diff.seconds > 60:
                return f"{diff.seconds // 60}m ago"
            else:
                return "Just now"
        except:
            return "Recently"

    def _get_mock_news(self, query: str) -> List[NewsItem]:
        """Return mock news when API is unavailable"""
        # Extract stock name from query
        stock_name = query.split()[0] if query else "Stock"
        ticker = stock_name.upper()
        
        # Generate recent dates for mock news
        now = datetime.now()
        dates = [
            (now - timedelta(hours=2)).isoformat(),
            (now - timedelta(hours=5)).isoformat(),
            (now - timedelta(days=1)).isoformat(),
        ]
        
        return [
            NewsItem(
                title=f"{stock_name} shares rise on strong quarterly results",
                source="Economic Times",
                time=self._format_date(dates[0]),
                sentiment="positive",
                snippet=f"{stock_name} reported better-than-expected quarterly earnings, driving shares higher in early trading...",
                url=f"https://economictimes.indiatimes.com/markets/stocks/news/{ticker.lower()}-stock-news",
                published_date=dates[0],
            ),
            NewsItem(
                title=f"Analysts upgrade {stock_name} on growth outlook",
                source="Moneycontrol",
                time=self._format_date(dates[1]),
                sentiment="positive",
                snippet=f"Multiple brokerages have upgraded their rating on {stock_name} citing strong fundamentals and growth potential...",
                url=f"https://www.moneycontrol.com/india/stockpricequote/{ticker.lower()}",
                published_date=dates[1],
            ),
            NewsItem(
                title=f"{stock_name} announces strategic expansion plans",
                source="Business Standard",
                time=self._format_date(dates[2]),
                sentiment="neutral",
                snippet=f"The company has announced plans to expand its operations into new markets, with investments planned over the next fiscal year...",
                url=f"https://www.business-standard.com/companies/{ticker.lower()}",
                published_date=dates[2],
            ),
        ]

    async def get_stock_news(self, ticker: str, company_name: str = "") -> List[NewsItem]:
        """
        Get news for a specific stock.
        
        Args:
            ticker: Stock ticker (e.g., "RELIANCE")
            company_name: Optional full company name
        """
        search_query = f"{company_name or ticker} stock news India NSE"
        return await self.search_news(search_query, max_results=5)

    async def get_topic_news(self, topic_id: str, topic_label: str) -> List[NewsItem]:
        """
        Get news for a sentiment/news cluster topic.
        
        Args:
            topic_id: Topic ID (e.g., "fed_sentiment", "market_mood")
            topic_label: Display label for the topic
        """
        # Map topic IDs to relevant search queries
        topic_queries = {
            "fed_sentiment": "Federal Reserve interest rate decision monetary policy impact India markets",
            "market_mood": "Indian stock market sentiment outlook Sensex Nifty investor mood",
            "global_risk": "global economic risks geopolitical tensions impact Indian markets",
            "earnings_season": "India quarterly earnings results corporate profits Nifty 50 companies",
            "inflation_watch": "India inflation CPI RBI monetary policy interest rates",
        }
        
        search_query = topic_queries.get(topic_id, f"{topic_label} India financial markets news")
        return await self.search_news(search_query, max_results=5)

    async def get_sector_news(self, sector_id: str, sector_label: str) -> List[NewsItem]:
        """
        Get news for a sector.
        
        Args:
            sector_id: Sector ID (e.g., "sector_banking", "sector_it")
            sector_label: Display label for the sector
        """
        # Map sector IDs to relevant search queries
        sector_queries = {
            "sector_banking": "Indian banking sector news HDFC ICICI SBI banks",
            "sector_it": "India IT sector news TCS Infosys Wipro software services",
            "sector_fmcg": "India FMCG sector news HUL ITC Nestle consumer goods",
            "sector_pharma": "India pharma sector news Sun Pharma Dr Reddy Cipla drugs",
            "sector_auto": "India auto sector news Tata Motors Maruti M&M EV",
            "sector_energy": "India energy sector news Reliance ONGC BPCL oil gas",
            "sector_metal": "India metals sector news Tata Steel JSW Hindalco",
            "sector_power": "India power sector news NTPC Power Grid utilities",
            "sector_cement": "India cement sector news UltraTech ACC infrastructure",
            "sector_telecom": "India telecom sector news Bharti Airtel Jio 5G",
            "sector_consumer": "India consumer goods sector news retail demand",
            "sector_financial": "India NBFC financial services Bajaj Finance HDFC AMC",
            "sector_infrastructure": "India infrastructure sector news L&T Adani roads ports",
            "sector_healthcare": "India healthcare sector news Apollo Hospitals medical",
            "sector_retail": "India retail sector news ecommerce consumer spending",
            "sector_conglomerate": "India conglomerate news Reliance Tata Adani group",
            "sector_chemicals": "India chemicals sector news specialty chemicals exports",
            "sector_insurance": "India insurance sector news LIC HDFC Life premium",
            "sector_mining": "India mining sector news Coal India Vedanta minerals",
        }
        
        search_query = sector_queries.get(sector_id, f"{sector_label} sector India stock market news")
        return await self.search_news(search_query, max_results=5)

    async def get_asset_news(self, asset_id: str, asset_label: str) -> List[NewsItem]:
        """
        Get news for an asset class.
        
        Args:
            asset_id: Asset ID (e.g., "crude_oil", "gold")
            asset_label: Display label for the asset
        """
        # Map asset IDs to relevant search queries
        asset_queries = {
            "crude_oil": "crude oil prices Brent WTI impact India markets OPEC",
            "gold": "gold prices India MCX precious metals safe haven",
            "usd_inr": "USD INR exchange rate rupee dollar RBI forex",
            "nifty50": "Nifty 50 index India stock market Sensex",
            "bitcoin": "Bitcoin crypto prices India regulation cryptocurrency",
            "equity": "Indian equity markets FII DII flows stock market outlook",
            "fixed_income": "India bond market G-Sec yields RBI debt",
            "commodities": "commodities prices India MCX metals agriculture",
        }
        
        search_query = asset_queries.get(asset_id, f"{asset_label} India financial markets news")
        return await self.search_news(search_query, max_results=5)

    async def get_stock_price(self, ticker: str, company_name: str = "") -> Dict[str, Any]:
        """
        Fetch current stock price using Tavily search.
        
        Args:
            ticker: Stock ticker (e.g., "RELIANCE", "TCS")
            company_name: Optional full company name
            
        Returns:
            Dict with price, change, changePercent if found
        """
        import re
        
        cache_key = f"price:{ticker}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached[0] if cached else {}
        
        client = self._get_client()
        if not client:
            return {}
        
        try:
            # Search for current stock price
            search_query = f"{ticker} NSE stock price today INR"
            
            response = client.search(
                query=search_query,
                search_depth="basic",
                include_answer=True,
                include_images=False,
                max_results=3,
                include_domains=[
                    "google.com/finance",
                    "in.finance.yahoo.com",
                    "moneycontrol.com",
                    "nseindia.com",
                    "bseindia.com",
                    "economictimes.indiatimes.com",
                ],
            )
            
            # Try to extract price from answer or results
            price_data = {}
            
            # Check the answer first
            answer = response.get("answer", "") or ""
            results = response.get("results", [])
            
            # Combine all text for extraction
            all_text = answer + " " + " ".join(
                (r.get("content", "") or "") + " " + (r.get("title", "") or "")
                for r in results
            )
            
            # Patterns to match Indian stock prices (₹ or Rs or INR)
            price_patterns = [
                r'₹\s*([\d,]+(?:\.\d{2})?)',  # ₹1,234.56
                r'Rs\.?\s*([\d,]+(?:\.\d{2})?)',  # Rs 1,234.56
                r'INR\s*([\d,]+(?:\.\d{2})?)',  # INR 1234.56
                r'price[:\s]+(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{2})?)',  # price: 1234.56
                r'([\d,]+(?:\.\d{2})?)\s*(?:INR|rupees)',  # 1234.56 INR
            ]
            
            for pattern in price_patterns:
                match = re.search(pattern, all_text, re.IGNORECASE)
                if match:
                    price_str = match.group(1).replace(',', '')
                    try:
                        price = float(price_str)
                        if 10 < price < 500000:  # Reasonable stock price range
                            price_data["price"] = price
                            break
                    except ValueError:
                        continue
            
            # Try to extract change/percent
            change_patterns = [
                r'([+-]?\d+(?:\.\d+)?)\s*\(([+-]?\d+(?:\.\d+)?)\s*%\)',  # +10.50 (0.85%)
                r'([+-]?\d+(?:\.\d+)?)\s*%',  # +0.85%
                r'(?:change|up|down|gain|loss)[:\s]+([+-]?\d+(?:\.\d+)?)',
            ]
            
            for pattern in change_patterns:
                match = re.search(pattern, all_text, re.IGNORECASE)
                if match:
                    try:
                        if len(match.groups()) >= 2:
                            price_data["change"] = float(match.group(1))
                            price_data["changePercent"] = float(match.group(2))
                        else:
                            percent = float(match.group(1))
                            price_data["changePercent"] = percent
                            if "price" in price_data:
                                # Estimate change from percent
                                price_data["change"] = price_data["price"] * percent / 100
                        break
                    except ValueError:
                        continue
            
            # Cache and return
            if price_data:
                self._set_cache(cache_key, [price_data])
            
            return price_data
            
        except Exception as e:
            print(f"Error fetching stock price for {ticker}: {e}")
            return {}


# Singleton instance
tavily_service = TavilyService()
