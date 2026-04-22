from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

from models.schemas import NewsItem
from services.tavily_service import tavily_service
from services.topic_mapper import topic_mapper, NewsTopic


@dataclass(frozen=True)
class DailyTopic:
    topic: NewsTopic


class DailyTopicClustersService:
    """Builds daily topic clusters from the day's news and caches them in-memory."""

    def __init__(self):
        self._cached_day: Optional[str] = None  # YYYYMMDD
        self._topics: List[DailyTopic] = []
        self._by_id: Dict[str, DailyTopic] = {}

    def is_topic_node_id(self, node_id: str) -> bool:
        return node_id.startswith("topic_")

    def get_by_id(self, node_id: str) -> Optional[DailyTopic]:
        return self._by_id.get(node_id)

    async def get_daily_topics(self, max_topics: int = 10) -> List[DailyTopic]:
        day = datetime.now().strftime("%Y%m%d")
        if self._cached_day == day and self._topics:
            return self._topics[:max_topics]

        # Broad queries so we catch whatever is "in the news" today.
        global_news = await tavily_service.search_news(
            "top global news today war bitcoin markets economy geopolitics",
            max_results=40,
        )
        india_news = await tavily_service.search_news(
            "top India national news today policy economy markets elections",
            max_results=40,
        )

        all_items: List[NewsItem] = []
        seen = set()
        for item in (global_news + india_news):
            key = (item.title or "").strip().lower()
            if not key or key in seen:
                continue
            seen.add(key)
            all_items.append(item)

        news_payload = [
            {
                "title": n.title,
                "snippet": n.snippet,
                "sentiment": n.sentiment,
                "url": n.url,
            }
            for n in all_items
        ]

        topics = topic_mapper.cluster_headlines_into_topics(news_payload, max_topics=max_topics)
        wrapped = [DailyTopic(topic=t) for t in topics]

        self._cached_day = day
        self._topics = wrapped
        self._by_id = {t.topic.id: t for t in wrapped}

        return wrapped[:max_topics]


daily_topic_clusters_service = DailyTopicClustersService()
