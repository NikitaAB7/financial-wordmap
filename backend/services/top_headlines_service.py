from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

from models.schemas import NewsItem
from services.tavily_service import tavily_service


_GLOBAL_DOMAINS = [
    "reuters.com",
    "bloomberg.com",
    "ft.com",
    "wsj.com",
    "apnews.com",
    "cnn.com",
    "bbc.com",
]

_INDIA_DOMAINS = [
    "ndtv.com",
    "thehindu.com",
    "indianexpress.com",
    "hindustantimes.com",
    "timesofindia.indiatimes.com",
    "livemint.com",
    "economictimes.indiatimes.com",
    "moneycontrol.com",
]


@dataclass(frozen=True)
class TopHeadline:
    id: str
    region: str  # "global" | "india"
    item: NewsItem


class TopHeadlinesService:
    """Fetches and caches top headlines per day.

    Notes:
    - Cache is in-memory; it resets on backend restart.
    - IDs include the date to avoid collisions across days.
    """

    def __init__(self):
        self._cached_day: Optional[str] = None  # YYYYMMDD
        self._headlines: List[TopHeadline] = []
        self._by_id: Dict[str, TopHeadline] = {}

    def is_headline_node_id(self, node_id: str) -> bool:
        return node_id.startswith("news_global_") or node_id.startswith("news_india_")

    def get_by_id(self, node_id: str) -> Optional[TopHeadline]:
        return self._by_id.get(node_id)

    async def get_daily_headlines(self) -> List[TopHeadline]:
        day = datetime.now().strftime("%Y%m%d")
        if self._cached_day == day and self._headlines:
            return self._headlines

        global_items = await self._fetch_region(
            region="global",
            query="top global news today economy markets geopolitics",
            max_results=10,
            include_domains=_GLOBAL_DOMAINS,
            desired=5,
        )
        india_items = await self._fetch_region(
            region="india",
            query="top India national news today economy policy markets",
            max_results=10,
            include_domains=_INDIA_DOMAINS,
            desired=5,
        )

        combined: List[TopHeadline] = []
        combined.extend(self._assign_ids(global_items, region="global", day=day))
        combined.extend(self._assign_ids(india_items, region="india", day=day))

        self._cached_day = day
        self._headlines = combined
        self._by_id = {h.id: h for h in combined}
        return combined

    async def _fetch_region(
        self,
        *,
        region: str,
        query: str,
        max_results: int,
        include_domains: List[str],
        desired: int,
    ) -> List[NewsItem]:
        # Try a focused query first.
        items = await tavily_service.search_news(
            query,
            max_results=max_results,
            include_domains=include_domains,
        )

        # Prefer very recent items (last ~48h) when dates are available.
        recent_items: List[NewsItem] = []
        now = datetime.now()
        for item in items:
            if not item.published_date:
                continue
            try:
                pub = datetime.fromisoformat(item.published_date.replace("Z", "+00:00"))
                if pub.tzinfo:
                    pub = pub.replace(tzinfo=None)
                if (now - pub).total_seconds() <= 48 * 3600:
                    recent_items.append(item)
            except Exception:
                continue
        if len(recent_items) >= min(desired, 3):
            items = recent_items

        # Deduplicate by title.
        seen = set()
        deduped: List[NewsItem] = []
        for item in items:
            title_key = (item.title or "").strip().lower()
            if not title_key or title_key in seen:
                continue
            seen.add(title_key)
            deduped.append(item)
            if len(deduped) >= desired:
                break

        # If we didn't get enough, broaden the query (no domain restriction).
        if len(deduped) < desired:
            fallback_items = await tavily_service.search_news(
                f"{query} latest headlines",
                max_results=max_results,
                include_domains=None,
            )
            for item in fallback_items:
                title_key = (item.title or "").strip().lower()
                if not title_key or title_key in seen:
                    continue
                seen.add(title_key)
                deduped.append(item)
                if len(deduped) >= desired:
                    break

        return deduped[:desired]

    def _assign_ids(self, items: List[NewsItem], *, region: str, day: str) -> List[TopHeadline]:
        out: List[TopHeadline] = []
        for idx, item in enumerate(items, start=1):
            out.append(
                TopHeadline(
                    id=f"news_{region}_{day}_{idx}",
                    region=region,
                    item=item,
                )
            )
        return out


top_headlines_service = TopHeadlinesService()
