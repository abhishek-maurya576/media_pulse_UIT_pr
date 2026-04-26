"""
Newspaper Engine — Multi-Page Paginator

Distributes articles across pages with overflow handling and
article splitting. Ensures no blank pages and balanced final page.

Pipeline:
1. Sort articles by (order, priority)
2. Build front page (hero zone + column fill)
3. Paginate remaining articles into inner pages
4. Split oversized articles at paragraph boundaries
5. Rebalance if final page is too empty
"""

from dataclasses import dataclass, field
from typing import List, Optional

from newspaper_engine import config
from newspaper_engine.measurer import measure_article
from newspaper_engine.placer import (
    place_articles_on_page, PlacedArticle, PlacementResult, Column,
)
from newspaper_engine.splitter import (
    should_split, split_article, ArticleFragment,
)


@dataclass
class PageComposition:
    """A fully composed page ready for rendering."""
    page_number: int
    is_front_page: bool
    column_count: int
    hero_placements: List[PlacedArticle] = field(default_factory=list)
    column_placements: List[PlacedArticle] = field(default_factory=list)
    columns: List[Column] = field(default_factory=list)
    hero_zone_height: float = 0.0
    max_column_height: float = 0.0
    content_width: float = 0.0
    content_height: float = 0.0
    used_height: float = 0.0


def paginate(articles: list, page_size: str) -> List[PageComposition]:
    """
    Main pagination entry point.

    Takes a list of articles and distributes them across pages
    with proper overflow handling, article splitting, and
    page balancing.

    Args:
        articles: list of Article model instances
        page_size: 'TABLOID', 'A4', etc.

    Returns:
        List of PageComposition objects ready for rendering
    """
    if not articles:
        return []

    sorted_articles = _sort_articles(articles)
    pages: List[PageComposition] = []
    pending_continuations: List[ArticleFragment] = []

    # ─── Page 1: Front Page ───────────────────────────
    page_1_result = place_articles_on_page(
        sorted_articles,
        page_size,
        is_front_page=True,
    )

    front_page = _build_page_composition(
        page_1_result, page_number=1, is_front_page=True, page_size=page_size,
    )
    pages.append(front_page)

    # Collect overflow from front page
    overflow = list(page_1_result.overflow_articles)

    # ─── Handle overflow articles that are splittable ───
    overflow, new_continuations = _try_split_overflow(
        overflow, page_size, is_front_page=True, current_page=front_page,
    )
    pending_continuations.extend(new_continuations)

    # ─── Inner Pages ──────────────────────────────────
    remaining = pending_continuations + overflow
    page_number = 2

    while remaining:
        page_result = place_articles_on_page(
            remaining,
            page_size,
            is_front_page=False,
        )

        inner_page = _build_page_composition(
            page_result, page_number=page_number,
            is_front_page=False, page_size=page_size,
        )
        pages.append(inner_page)

        overflow = list(page_result.overflow_articles)
        overflow, new_continuations = _try_split_overflow(
            overflow, page_size, is_front_page=False, current_page=inner_page,
        )

        remaining = new_continuations + overflow
        page_number += 1

        # Safety: prevent infinite loop
        if page_number > 100:
            break

    # ─── Rebalance final page if too empty ────────────
    if len(pages) > 1:
        pages = _rebalance_pages(pages, page_size)

    # ─── Set continuation page numbers ────────────────
    _resolve_continuation_pages(pages)

    return pages


# ─── Internal Helpers ─────────────────────────────────────────────


def _sort_articles(articles: list) -> list:
    """Sort articles by manual order, then priority rank."""
    return sorted(
        articles,
        key=lambda a: (
            getattr(a, 'order', 0),
            config.PRIORITY_SORT_ORDER.get(getattr(a, 'priority', 'STANDARD'), 99),
        ),
    )


def _build_page_composition(
    result: PlacementResult,
    page_number: int,
    is_front_page: bool,
    page_size: str,
) -> PageComposition:
    """Convert PlacementResult to PageComposition."""
    content_area = config.get_content_area(page_size)
    content_h = config.get_content_height(page_size, is_front_page)

    return PageComposition(
        page_number=page_number,
        is_front_page=is_front_page,
        column_count=config.DEFAULT_COLUMN_COUNT,
        hero_placements=result.hero_placements,
        column_placements=result.column_placements,
        columns=result.columns,
        hero_zone_height=result.hero_zone_height,
        max_column_height=result.max_column_height,
        content_width=content_area['width'],
        content_height=content_h,
        used_height=result.hero_zone_height + result.max_column_height,
    )


def _try_split_overflow(
    overflow_articles: list,
    page_size: str,
    is_front_page: bool,
    current_page: PageComposition,
) -> tuple:
    """
    Try to split oversized overflow articles.
    Returns (unsplit_overflow, continuation_fragments).
    """
    content_h = config.get_content_height(page_size, is_front_page=False)
    col_width = config.get_column_width(page_size)
    unsplit = []
    continuations = []

    for article in overflow_articles:
        m = measure_article(article, col_width)

        if should_split(m.total, content_h):
            # Article is large enough to split
            overhead = m.total - m.body  # non-body elements
            available = content_h - (current_page.max_column_height if current_page else 0)

            first_frag, second_frag = split_article(
                article, available, col_width, overhead,
            )

            # Keep the first fragment — it carries the headline/image
            # and should be placed on the current or next page.
            if first_frag is not None:
                unsplit.append(first_frag)

            if second_frag is not None:
                continuations.append(second_frag)
        else:
            # Article too small to split — just move to next page
            unsplit.append(article)

    return unsplit, continuations


def _rebalance_pages(pages: List[PageComposition], page_size: str) -> List[PageComposition]:
    """
    Redistribute articles if the final page is too empty.
    Moves articles from the second-to-last page to fill the last page better.
    """
    if len(pages) < 2:
        return pages

    last_page = pages[-1]
    content_h = config.get_content_height(page_size, is_front_page=False)

    # Check if last page is too empty
    if content_h > 0 and (last_page.used_height / content_h) < config.REBALANCE_THRESHOLD:
        # Last page is less than 30% full — try to redistribute
        prev_page = pages[-2]

        # Collect all column placements from both pages
        all_placements = prev_page.column_placements + last_page.column_placements

        if not all_placements:
            return pages

        # Extract articles from placements (deduplicate)
        seen_ids = set()
        articles_to_redistribute = []
        for p in all_placements:
            art = p.article
            art_id = id(art)
            if art_id not in seen_ids:
                seen_ids.add(art_id)
                articles_to_redistribute.append(art)

        # Re-place across both pages
        prev_is_front = prev_page.is_front_page
        result1 = place_articles_on_page(
            articles_to_redistribute,
            page_size,
            is_front_page=prev_is_front,
        )

        new_prev = _build_page_composition(
            result1, prev_page.page_number, prev_is_front, page_size,
        )
        # Preserve hero placements from original
        new_prev.hero_placements = prev_page.hero_placements
        new_prev.hero_zone_height = prev_page.hero_zone_height

        if result1.overflow_articles:
            result2 = place_articles_on_page(
                result1.overflow_articles,
                page_size,
                is_front_page=False,
            )
            new_last = _build_page_composition(
                result2, last_page.page_number, False, page_size,
            )
            pages[-2] = new_prev
            pages[-1] = new_last
        else:
            # Everything fits on one page — remove last page
            pages[-2] = new_prev
            pages.pop()

    return pages


def _resolve_continuation_pages(pages: List[PageComposition]):
    """
    After all pages are built, set the correct page numbers
    for continuation markers ("Continued on Page X", "Continued from Page Y").

    Only sets markers when the same article genuinely appears
    on different pages (via splitting).
    """
    # Build a map: article id → list of (page_number, placement)
    # Deduplicate: same article on same page only counted once
    article_pages = {}

    for page in pages:
        all_placements = page.hero_placements + page.column_placements
        seen_on_page = set()
        for placement in all_placements:
            art = placement.article
            art_id = id(art)
            page_art_key = (page.page_number, art_id)

            if page_art_key in seen_on_page:
                continue
            seen_on_page.add(page_art_key)

            if art_id not in article_pages:
                article_pages[art_id] = []
            article_pages[art_id].append((page.page_number, placement))

    # For articles that appear on multiple DIFFERENT pages, set continuation markers
    for art_id, appearances in article_pages.items():
        # Only consider articles on different pages
        unique_pages = set(p[0] for p in appearances)
        if len(unique_pages) <= 1:
            continue

        appearances.sort(key=lambda x: x[0])
        for i, (page_num, placement) in enumerate(appearances):
            if i < len(appearances) - 1:
                placement.continued_on_page = appearances[i + 1][0]
            if i > 0:
                placement.continued_from_page = appearances[i - 1][0]
                placement.is_continuation = True

