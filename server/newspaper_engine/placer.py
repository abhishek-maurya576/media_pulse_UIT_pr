"""
Newspaper Engine — Column-Based Article Placer

Uses shortest-column-first packing to balance article placement across
columns, mimicking how real newspaper editors balance page layout.

Supports:
- Full-width hero placement
- 2-column spans for MAJOR articles
- Single-column placement for STANDARD/MINOR
"""

from dataclasses import dataclass, field
from typing import List, Optional

from newspaper_engine import config
from newspaper_engine.measurer import measure_article, ArticleMeasurement


@dataclass
class PlacedArticle:
    """An article with computed layout position."""
    article: object                     # Django Article model (or ArticleFragment)
    column_index: int                   # 0-based starting column
    column_span: int                    # number of columns this article spans
    y_offset: float                     # vertical position within column (pt)
    height: float                       # computed total height (pt)
    measurement: ArticleMeasurement = None
    content_html: str = ''              # rendered content (may be fragment)
    is_continuation: bool = False       # is this a continued article?
    continued_on_page: Optional[int] = None
    continued_from_page: Optional[int] = None
    is_hero: bool = False               # placed in hero zone?


@dataclass
class Column:
    """Tracks the current fill height of a single column."""
    index: int
    height: float = 0.0
    placements: List[PlacedArticle] = field(default_factory=list)


@dataclass
class PlacementResult:
    """Result of placing articles on a single page."""
    hero_placements: List[PlacedArticle]    # full-width hero articles
    column_placements: List[PlacedArticle]  # articles in columns
    columns: List[Column]                    # final column states
    hero_zone_height: float                  # total hero zone height
    max_column_height: float                 # tallest column height
    overflow_articles: list                  # articles that didn't fit


def place_articles_on_page(
    articles: list,
    page_size: str,
    is_front_page: bool = False,
    column_count: int = None,
    pre_offset: float = 0.0,
) -> PlacementResult:
    """
    Place articles on a single page using shortest-column-first packing.

    Args:
        articles: list of Article model instances (sorted by priority)
        page_size: 'TABLOID', 'A4', etc.
        is_front_page: True for front page (has hero zone + masthead)
        column_count: override column count (default from config)
        pre_offset: height already used at top of column zone

    Returns:
        PlacementResult with placed articles and overflow
    """
    cols = column_count or config.DEFAULT_COLUMN_COUNT
    content_height = config.get_content_height(page_size, is_front_page)
    content_area = config.get_content_area(page_size)
    col_width = config.get_column_width(page_size, cols)

    hero_placements = []
    hero_zone_height = 0.0
    remaining_articles = list(articles)

    # ─── Front page: extract and place HERO articles ───
    if is_front_page:
        hero_articles = [a for a in remaining_articles if _get_priority(a) == 'HERO']
        non_hero = [a for a in remaining_articles if _get_priority(a) != 'HERO']
        remaining_articles = non_hero

        for hero_article in hero_articles:
            m = measure_article(hero_article, content_area['width'], is_hero=True)
            placement = PlacedArticle(
                article=hero_article,
                column_index=0,
                column_span=cols,
                y_offset=hero_zone_height,
                height=m.total,
                measurement=m,
                content_html=_get_content(hero_article),
                is_hero=True,
            )
            hero_placements.append(placement)
            hero_zone_height += m.total + config.HERO_SECTION_PADDING

    # ─── Available height for column zone ───
    column_zone_height = content_height - hero_zone_height - pre_offset
    if column_zone_height <= 0:
        return PlacementResult(
            hero_placements=hero_placements,
            column_placements=[],
            columns=[Column(index=i) for i in range(cols)],
            hero_zone_height=hero_zone_height,
            max_column_height=0.0,
            overflow_articles=remaining_articles,
        )

    # ─── Initialize columns ───
    columns = [Column(index=i) for i in range(cols)]
    overflow = []

    # ─── Place non-hero articles ───
    for article in remaining_articles:
        priority = _get_priority(article)
        span = _get_column_span(priority, cols)

        if span >= cols:
            # Full-width article in column zone
            effective_width = content_area['width']
        elif span > 1:
            # Multi-column span (MAJOR = 2 columns)
            effective_width = (col_width * span) + (config.COLUMN_GAP * (span - 1))
        else:
            effective_width = col_width

        m = measure_article(article, effective_width, is_hero=False)

        if span >= cols:
            # Full-width: check if it fits below all columns
            max_col_h = max(c.height for c in columns) if any(c.height > 0 for c in columns) else 0
            y_pos = max_col_h
            if y_pos + m.total > column_zone_height:
                overflow.append(article)
                continue

            placement = PlacedArticle(
                article=article,
                column_index=0,
                column_span=cols,
                y_offset=y_pos,
                height=m.total,
                measurement=m,
                content_html=_get_content(article),
            )
            # Push all columns down, but only add placement to column 0
            for c in columns:
                c.height = y_pos + m.total
            columns[0].placements.append(placement)

        elif span > 1:
            # Multi-column: find best starting position
            best_start = _find_best_span_start(columns, span)
            if best_start is None:
                overflow.append(article)
                continue

            # Y offset = max height among spanned columns
            spanned = columns[best_start:best_start + span]
            y_pos = max(c.height for c in spanned)

            if y_pos + m.total > column_zone_height:
                overflow.append(article)
                continue

            placement = PlacedArticle(
                article=article,
                column_index=best_start,
                column_span=span,
                y_offset=y_pos,
                height=m.total,
                measurement=m,
                content_html=_get_content(article),
            )
            # Update height for all spanned columns, but only add placement to start
            for c in spanned:
                c.height = y_pos + m.total
            columns[best_start].placements.append(placement)

        else:
            # Single column: shortest-column-first
            shortest = min(columns, key=lambda c: c.height)
            y_pos = shortest.height

            if y_pos + m.total > column_zone_height:
                overflow.append(article)
                continue

            placement = PlacedArticle(
                article=article,
                column_index=shortest.index,
                column_span=1,
                y_offset=y_pos,
                height=m.total,
                measurement=m,
                content_html=_get_content(article),
            )
            shortest.placements.append(placement)
            shortest.height += m.total

    max_col_h = max(c.height for c in columns) if columns else 0.0

    return PlacementResult(
        hero_placements=hero_placements,
        column_placements=[p for c in columns for p in c.placements],
        columns=columns,
        hero_zone_height=hero_zone_height,
        max_column_height=max_col_h,
        overflow_articles=overflow,
    )


# ─── Internal Helpers ─────────────────────────────────────────────


def _get_priority(article) -> str:
    """Get priority string from article or fragment."""
    if hasattr(article, 'priority'):
        return article.priority
    if hasattr(article, 'article'):
        return getattr(article.article, 'priority', 'STANDARD')
    return 'STANDARD'


def _get_content(article) -> str:
    """Get HTML content from article or fragment."""
    if hasattr(article, 'content_html') and article.content_html:
        return article.content_html
    return getattr(article, 'content_parsed', '') or getattr(article, 'content_raw', '') or ''


def _get_column_span(priority: str, max_columns: int) -> int:
    """Determine column span for a priority level."""
    span_config = config.PRIORITY_COLUMN_SPAN.get(priority, 1)
    if span_config == 'full':
        return max_columns
    return min(span_config, max_columns)


def _find_best_span_start(columns: List[Column], span: int) -> Optional[int]:
    """
    Find the best starting column index for a multi-column span.
    Picks the position where the max height among spanned columns is smallest.
    """
    best_start = None
    best_max_height = float('inf')

    for start in range(len(columns) - span + 1):
        spanned = columns[start:start + span]
        max_h = max(c.height for c in spanned)
        if max_h < best_max_height:
            best_max_height = max_h
            best_start = start

    return best_start
