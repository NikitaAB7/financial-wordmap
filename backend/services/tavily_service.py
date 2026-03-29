from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import TAVILY_API_KEY
from models.schemas import NewsItem, SentimentType

# Cache for news results to avoid excessive API calls
_news_cache: dict = {}
_cache_ttl_minutes = 10


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
            for result in response.get("results", [])[:max_results]:
                # Analyze sentiment from content
                content = result.get("content", "") or ""
                title = result.get("title", "") or ""
                sentiment = self._analyze_sentiment(content + " " + title)
                
                news_items.append(NewsItem(
                    title=title,
                    source=self._extract_domain(result.get("url", "")),
                    time=self._format_time(result.get("published_date")),
                    sentiment=sentiment,
                    snippet=(content[:200] + "...") if len(content) > 200 else content,
                    url=result.get("url"),
                ))
            
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

    def _format_time(self, published_date: Optional[str]) -> str:
        """Format published date to relative time"""
        if not published_date:
            return "Recently"
        
        try:
            # Try parsing ISO format
            pub_date = datetime.fromisoformat(published_date.replace("Z", "+00:00"))
            now = datetime.now(pub_date.tzinfo) if pub_date.tzinfo else datetime.now()
            diff = now - pub_date
            
            if diff.days > 0:
                return f"{diff.days}d ago"
            elif diff.seconds > 3600:
                return f"{diff.seconds // 3600}h ago"
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
        
        return [
            NewsItem(
                title=f"{stock_name} shares rise on strong quarterly results",
                source="Economic Times",
                time="2h ago",
                sentiment="positive",
                snippet=f"{stock_name} reported better-than-expected quarterly earnings, driving shares higher in early trading...",
                url=f"https://economictimes.indiatimes.com/markets/stocks/news/{ticker.lower()}-stock-news",
            ),
            NewsItem(
                title=f"Analysts upgrade {stock_name} on growth outlook",
                source="Moneycontrol",
                time="5h ago",
                sentiment="positive",
                snippet=f"Multiple brokerages have upgraded their rating on {stock_name} citing strong fundamentals and growth potential...",
                url=f"https://www.moneycontrol.com/india/stockpricequote/{ticker.lower()}",
            ),
            NewsItem(
                title=f"{stock_name} announces strategic expansion plans",
                source="Business Standard",
                time="1d ago",
                sentiment="neutral",
                snippet=f"The company has announced plans to expand its operations into new markets, with investments planned over the next fiscal year...",
                url=f"https://www.business-standard.com/companies/{ticker.lower()}",
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
