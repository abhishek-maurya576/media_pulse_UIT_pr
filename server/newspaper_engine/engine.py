"""
Newspaper Engine — Main Orchestrator

Single public entry point for the entire layout engine.
Composes the full pipeline: sort → measure → place → paginate → render.

Usage:
    from newspaper_engine.engine import compose
    pages = compose(edition, articles)
    # pages is a list of template-ready dicts
"""

from typing import List

from newspaper_engine import config
from newspaper_engine.paginator import paginate
from newspaper_engine.renderer import render_pages


def compose(edition, articles: list) -> List[dict]:
    """
    Full newspaper layout composition pipeline.

    Takes an Edition and its Articles, returns a list of
    template-ready page dictionaries with exact positions.

    Args:
        edition: Django Edition model instance
        articles: list of Article model instances

    Returns:
        List of page dicts ready for template rendering.
        Each page contains hero_articles, columns with placed articles,
        and all positioning/sizing data.
    """
    if not articles:
        return []

    page_size = getattr(edition, 'page_size', 'TABLOID')

    # Step 1: Paginate — sort, place, split, and balance across pages
    page_compositions = paginate(list(articles), page_size)

    if not page_compositions:
        return []

    # Step 2: Render — convert engine coordinates to template-ready dicts
    rendered_pages = render_pages(page_compositions, page_size)

    return rendered_pages


def get_layout_summary(pages: list) -> dict:
    """
    Generate a summary of the layout for debugging/logging.

    Args:
        pages: list of rendered page dicts from compose()

    Returns:
        Summary dict with page count, article distribution, etc.
    """
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
