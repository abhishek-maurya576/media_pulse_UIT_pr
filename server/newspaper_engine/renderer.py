"""
Newspaper Engine — Page Renderer

Converts PageComposition objects into template-friendly dictionaries.
Computes CSS positions, float directions, and wrap modes for the
HTML template to render articles with float-based text wrapping.
"""

from typing import List

from newspaper_engine import config
from newspaper_engine.paginator import PageComposition
from newspaper_engine.placer import PlacedArticle


# Global article counter for alternating float direction
_article_counter = 0


def render_pages(pages: List[PageComposition], page_size: str) -> List[dict]:
    """
    Convert PageComposition list into template-ready dictionaries.
    Adds float direction and wrap mode data for each article.
    """
    global _article_counter
    _article_counter = 0

    rendered = []
    total_pages = len(pages)
    content_area = config.get_content_area(page_size)
    col_count = config.DEFAULT_COLUMN_COUNT
    col_width_pt = config.get_column_width(page_size, col_count)

    total_gaps = config.COLUMN_GAP * (col_count - 1)
    col_width_pct = ((content_area['width'] - total_gaps) / content_area['width']) / col_count * 100
    gap_pct = (config.COLUMN_GAP / content_area['width']) * 100

    for page in pages:
        page_dict = {
            'page_number': page.page_number,
            'is_front_page': page.is_front_page,
            'total_pages': total_pages,
            'column_count': col_count,
            'col_width_pct': round(col_width_pct, 3),
            'gap_pt': config.COLUMN_GAP,
            'content_height_pt': page.content_height,
            'used_height_pt': page.used_height,
        }

        # Hero articles
        page_dict['hero_articles'] = [
            _render_hero_placement(p, content_area['width'])
            for p in page.hero_placements
        ]
        page_dict['hero_zone_height_pt'] = page.hero_zone_height

        # Column articles
        column_articles = {i: [] for i in range(col_count)}
        seen_ids = set()
        for placement in page.column_placements:
            p_id = id(placement)
            if p_id in seen_ids:
                continue
            seen_ids.add(p_id)

            if placement.is_hero:
                continue

            rendered_article = _render_column_placement(
                placement, col_width_pt, col_count,
            )
            column_articles[placement.column_index].append(rendered_article)

        page_dict['columns'] = [
            {
                'index': i,
                'articles': sorted(column_articles[i], key=lambda a: a['y_offset']),
                'total_height': sum(a['height'] for a in column_articles[i]),
            }
            for i in range(col_count)
        ]

        rendered.append(page_dict)

    return rendered


def _render_hero_placement(placement: PlacedArticle, content_width: float) -> dict:
    """Hero articles: float image inline so text wraps around it."""
    article = placement.article
    has_image = bool(getattr(article, 'image', None))

    # Hero images float right so the body text wraps on the left
    image_wrap_mode = 'float' if has_image else 'none'
    image_float = 'right' if has_image else 'none'
    image_width_pct = round(config.HERO_IMAGE_WIDTH_RATIO * 100)

    return {
        'article': article,
        'y_offset': placement.y_offset,
        'height': placement.height,
        'content_html': placement.content_html or _get_content(article),
        'is_continuation': placement.is_continuation,
        'continued_on_page': placement.continued_on_page,
        'continued_from_page': placement.continued_from_page,
        'image_width_pct': image_width_pct,
        'image_wrap_mode': image_wrap_mode,
        'image_float': image_float,
    }


def _render_column_placement(
    placement: PlacedArticle,
    col_width_pt: float,
    total_columns: int,
) -> dict:
    """
    Column articles: images and highlights get float wrapping.
    Alternates float direction for visual balance.
    """
    global _article_counter
    article = placement.article

    # Compute span width
    if placement.column_span > 1:
        span_width_pt = (
            col_width_pt * placement.column_span
            + config.COLUMN_GAP * (placement.column_span - 1)
        )
        span_class = f'span-{placement.column_span}'
    else:
        span_width_pt = col_width_pt
        span_class = ''

    # Determine headline size class
    priority = getattr(article, 'priority', 'STANDARD')
    if hasattr(article, 'article'):
        priority = getattr(article.article, 'priority', 'STANDARD')

    headline_class = {
        'HERO': 'headline-hero',
        'MAJOR': 'headline-major',
        'STANDARD': 'headline-standard',
        'MINOR': 'headline-minor',
    }.get(priority, 'headline-standard')

    # Float configuration
    has_image = bool(getattr(article, 'image', None))
    has_highlights = bool(getattr(article, 'highlights', None))

    # Determine float direction: alternate for visual balance
    float_dir = 'right' if (_article_counter % 2 == 0) else 'left'
    _article_counter += 1

    # Image wrap mode based on priority
    if priority in ('HERO', 'MAJOR') and has_image:
        # Major: block image above text (large article, needs full-width image)
        image_wrap_mode = 'block'
        image_float = 'none'
        image_width_pct = 100
    elif has_image:
        # Standard/Minor: float image with text wrapping
        image_wrap_mode = 'float'
        image_float = float_dir
        image_width_pct = round(config.FLOAT_IMAGE_WIDTH_RATIO * 100)
    else:
        image_wrap_mode = 'none'
        image_float = 'none'
        image_width_pct = 0

    # Highlight box wrap
    if has_highlights and priority not in ('HERO',):
        # Float highlights as side-box (opposite direction to image)
        highlight_float = 'left' if float_dir == 'right' else 'right'
        highlight_width_pct = round(config.FLOAT_HIGHLIGHTS_WIDTH_RATIO * 100)
    else:
        highlight_float = 'none'
        highlight_width_pct = 100

    return {
        'article': article,
        'column_index': placement.column_index,
        'column_span': placement.column_span,
        'span_class': span_class,
        'y_offset': placement.y_offset,
        'height': placement.height,
        'width_pt': span_width_pt,
        'content_html': placement.content_html or _get_content(article),
        'headline_class': headline_class,
        'is_continuation': placement.is_continuation,
        'continued_on_page': placement.continued_on_page,
        'continued_from_page': placement.continued_from_page,
        # Float/wrap data
        'image_wrap_mode': image_wrap_mode,
        'image_float': image_float,
        'image_width_pct': image_width_pct,
        'highlight_float': highlight_float,
        'highlight_width_pct': highlight_width_pct,
    }


def _get_content(article) -> str:
    if hasattr(article, 'content_html') and article.content_html:
        return article.content_html
    return getattr(article, 'content_parsed', '') or getattr(article, 'content_raw', '') or ''
