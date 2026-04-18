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
    """
    if not articles:
        return []

    page_size = getattr(edition, 'page_size', 'TABLOID')
    content_area = config.get_content_area(page_size)
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

        comp = PageComposition(
            page_number=len(all_compositions) + 1,
            is_front_page=is_front,
            column_count=col_count,
            hero_placements=result.hero_placements,
            column_placements=result.column_placements,
            columns=result.columns,
            hero_zone_height=result.hero_zone_height,
            max_column_height=result.max_column_height,
            content_width=content_area['width'],
            content_height=content_height,
            used_height=used,
        )
        all_compositions.append(comp)
        page_categories.append(group['category_name'])

    # ─── Step 3: Place uncategorized articles on a final page ───
    if uncategorized:
        uncategorized.sort(
            key=lambda a: (PRIORITY_ORDER.get(a.priority, 99), a.order)
        )
        is_front = (len(all_compositions) == 0)
        result = place_articles_on_page(
            uncategorized, page_size, is_front_page=is_front,
        )
        content_height = config.get_content_height(page_size, is_front)
        used = result.hero_zone_height + result.max_column_height

        comp = PageComposition(
            page_number=len(all_compositions) + 1,
            is_front_page=is_front,
            column_count=col_count,
            hero_placements=result.hero_placements,
            column_placements=result.column_placements,
            columns=result.columns,
            hero_zone_height=result.hero_zone_height,
            max_column_height=result.max_column_height,
            content_width=content_area['width'],
            content_height=content_height,
            used_height=used,
        )
        all_compositions.append(comp)
        page_categories.append('')

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
