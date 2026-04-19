"""
Newspaper Engine — Main Orchestrator

Single public entry point for the entire layout engine.
Composes the full pipeline: group by category → place → render.

Category-per-page model:
  - Each PDF page is dedicated to a single category
  - Admin assigns page_number to each category
  - Empty categories (no articles) are skipped
  - Uncategorized articles go to the last page
  - Front page (page 1) is category-filtered like all others
  - Static editorial board text appears on the last page
  - Remaining page space is filled with uncategorized overflow

Usage:
    from newspaper_engine.engine import compose
    pages = compose(edition, articles)
"""

from typing import List
from collections import defaultdict

from newspaper_engine import config
from newspaper_engine.paginator import PageComposition
from newspaper_engine.placer import place_articles_on_page, Column
from newspaper_engine.renderer import render_pages


# ─── Hindi Date Formatting ───────────────────────────────────────

HINDI_WEEKDAYS = {
    0: 'सोमवार', 1: 'मंगलवार', 2: 'बुधवार',
    3: 'गुरुवार', 4: 'शुक्रवार', 5: 'शनिवार', 6: 'रविवार',
}

HINDI_MONTHS = {
    1: 'जनवरी', 2: 'फरवरी', 3: 'मार्च', 4: 'अप्रैल',
    5: 'मई', 6: 'जून', 7: 'जुलाई', 8: 'अगस्त',
    9: 'सितम्बर', 10: 'अक्टूबर', 11: 'नवम्बर', 12: 'दिसम्बर',
}

PRIORITY_ORDER = {'HERO': 0, 'MAJOR': 1, 'STANDARD': 2, 'MINOR': 3}


def format_hindi_date(date_obj) -> str:
    """Format date in Hindi: प्रयागराज, मंगलवार, 31 मार्च 2026"""
    weekday = HINDI_WEEKDAYS.get(date_obj.weekday(), '')
    month = HINDI_MONTHS.get(date_obj.month, '')
    return f"प्रयागराज, {weekday}, {date_obj.day} {month} {date_obj.year}"


# ─── Main Compose Pipeline ───────────────────────────────────────

def compose(edition, articles: list) -> List[dict]:
    """
    Full newspaper layout composition pipeline with category-per-page.

    Groups articles by their category's page_number, places each group
    on its own page, and renders template-ready dictionaries.

    Key behaviors:
    - Empty categories produce NO page (no blank pages)
    - Remaining page space is filled with uncategorized overflow articles
    - If all categories are empty, uncategorized articles become page 1
    """
    if not articles:
        return []

    page_size = getattr(edition, 'page_size', 'TABLOID')
    col_count = config.DEFAULT_COLUMN_COUNT

    # ─── Step 1: Group articles by category page_number ───
    page_groups = defaultdict(lambda: {'category_name': '', 'articles': []})
    uncategorized = []

    for article in articles:
        cat = getattr(article, 'category', None)
        if cat and getattr(cat, 'page_number', 0) > 0:
            pn = cat.page_number
            page_groups[pn]['category_name'] = cat.name
            page_groups[pn]['articles'].append(article)
        else:
            uncategorized.append(article)

    # ─── Step 2: Build pages in page_number order ───
    sorted_page_nums = sorted(page_groups.keys())
    all_compositions: List[PageComposition] = []
    page_categories: List[str] = []

    # Track uncategorized articles as a pool to fill remaining space
    uncat_pool = list(uncategorized)

    for page_num in sorted_page_nums:
        group = page_groups[page_num]
        cat_articles = group['articles']

        if not cat_articles:
            continue

        # Sort: priority → then article order
        cat_articles.sort(
            key=lambda a: (PRIORITY_ORDER.get(a.priority, 99), a.order)
        )

        is_front = (len(all_compositions) == 0)
        result = place_articles_on_page(
            cat_articles, page_size, is_front_page=is_front,
        )

        content_height = config.get_content_height(page_size, is_front)
        used = result.hero_zone_height + result.max_column_height

        # ─── Fill remaining space with uncategorized articles ───
        fill_placements, fill_columns, fill_used = _fill_remaining_space(
            uncat_pool, result, page_size, is_front, content_height, col_count,
        )

        total_used = used + fill_used

        comp = PageComposition(
            page_number=len(all_compositions) + 1,
            is_front_page=is_front,
            column_count=col_count,
            hero_placements=result.hero_placements,
            column_placements=result.column_placements + fill_placements,
            columns=result.columns,
            hero_zone_height=result.hero_zone_height,
            max_column_height=result.max_column_height + fill_used,
            content_width=config.get_content_area(page_size)['width'],
            content_height=content_height,
            used_height=total_used,
        )
        all_compositions.append(comp)
        page_categories.append(group['category_name'])

    # ─── Step 3: Place remaining uncategorized on final page(s) ───
    if uncat_pool:
        _sort_articles(uncat_pool)

        while uncat_pool:
            is_front = (len(all_compositions) == 0)
            result = place_articles_on_page(
                uncat_pool, page_size, is_front_page=is_front,
            )
            content_height = config.get_content_height(page_size, is_front)
            used = result.hero_zone_height + result.max_column_height

            # Only create page if there's actual content
            placed_count = len(result.hero_placements) + len(result.column_placements)
            if placed_count == 0:
                break

            comp = PageComposition(
                page_number=len(all_compositions) + 1,
                is_front_page=is_front,
                column_count=col_count,
                hero_placements=result.hero_placements,
                column_placements=result.column_placements,
                columns=result.columns,
                hero_zone_height=result.hero_zone_height,
                max_column_height=result.max_column_height,
                content_width=config.get_content_area(page_size)['width'],
                content_height=content_height,
                used_height=used,
            )
            all_compositions.append(comp)
            page_categories.append('')

            # Remove placed articles from the pool
            placed_ids = set()
            for p in result.hero_placements + result.column_placements:
                placed_ids.add(id(p.article))
            uncat_pool = [a for a in uncat_pool if id(a) not in placed_ids]

            # Safety: prevent infinite loop
            if len(all_compositions) > 50:
                break

    if not all_compositions:
        return []

    # ─── Step 4: Render all pages ───
    rendered_pages = render_pages(all_compositions, page_size)

    # ─── Step 5: Inject category + last-page metadata ───
    total_pages = len(rendered_pages)
    hindi_date = format_hindi_date(edition.publication_date)

    for i, page in enumerate(rendered_pages):
        page['category_name'] = page_categories[i] if i < len(page_categories) else ''
        page['is_last_page'] = (i == total_pages - 1)
        page['total_pages'] = total_pages
        page['hindi_date'] = hindi_date

    return rendered_pages


def _fill_remaining_space(
    uncat_pool: list,
    result,
    page_size: str,
    is_front: bool,
    content_height: float,
    col_count: int,
) -> tuple:
    """
    After placing category articles, fill remaining page space
    with uncategorized articles from the pool.

    Modifies uncat_pool in place (removes used articles).
    Returns (extra_placements, extra_columns, extra_used_height).
    """
    from newspaper_engine.measurer import measure_article
    from newspaper_engine.placer import PlacedArticle

    used = result.hero_zone_height + result.max_column_height
    remaining_height = content_height - used

    # Need at least 60pt of space to bother filling
    if remaining_height < 60 or not uncat_pool:
        return [], [], 0.0

    # Sort pool
    _sort_articles(uncat_pool)

    col_width = config.get_column_width(page_size, col_count)
    extra_placements = []
    extra_used = 0.0
    used_indices = []

    # Use the existing column heights from result to continue packing
    col_heights = [c.height for c in result.columns]

    for idx, article in enumerate(uncat_pool):
        m = measure_article(article, col_width, is_hero=False)

        # Find shortest column
        shortest_idx = col_heights.index(min(col_heights))
        y_pos = col_heights[shortest_idx]

        if y_pos + m.total > content_height - result.hero_zone_height:
            continue

        placement = PlacedArticle(
            article=article,
            column_index=shortest_idx,
            column_span=1,
            y_offset=y_pos,
            height=m.total,
            measurement=m,
            content_html=_get_content(article),
        )
        extra_placements.append(placement)
        col_heights[shortest_idx] += m.total
        used_indices.append(idx)

    # Remove used articles from pool (reverse order to preserve indices)
    for idx in reversed(used_indices):
        uncat_pool.pop(idx)

    extra_used = max(col_heights) - result.max_column_height if col_heights else 0.0
    return extra_placements, [], max(0, extra_used)


def _sort_articles(articles: list):
    """Sort articles in-place by priority then order."""
    articles.sort(key=lambda a: (PRIORITY_ORDER.get(getattr(a, 'priority', 'STANDARD'), 99), getattr(a, 'order', 0)))


def _get_content(article) -> str:
    """Get HTML content from article."""
    if hasattr(article, 'content_html') and article.content_html:
        return article.content_html
    return getattr(article, 'content_parsed', '') or getattr(article, 'content_raw', '') or ''


def get_layout_summary(pages: list) -> dict:
    """Generate a summary of the layout for debugging/logging."""
    total_articles = 0
    total_hero = 0
    page_summaries = []

    for page in pages:
        hero_count = len(page.get('hero_articles', []))
        col_articles = sum(len(col['articles']) for col in page.get('columns', []))
        total = hero_count + col_articles
        total_articles += total
        total_hero += hero_count

        page_summaries.append({
            'page': page['page_number'],
            'is_front': page['is_front_page'],
            'category': page.get('category_name', ''),
            'hero_articles': hero_count,
            'column_articles': col_articles,
            'total': total,
            'used_height': round(page.get('used_height_pt', 0), 1),
            'content_height': round(page.get('content_height_pt', 0), 1),
            'fill_ratio': round(
                page.get('used_height_pt', 0) / max(page.get('content_height_pt', 1), 1),
                2,
            ),
        })

    return {
        'total_pages': len(pages),
        'total_articles': total_articles,
        'total_hero': total_hero,
        'pages': page_summaries,
    }
