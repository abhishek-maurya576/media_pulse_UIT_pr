"""
Newspaper Engine — Content Height Measurer

Estimates rendered height (in points) of each article component.
Conservative estimates — slightly overestimates to prevent overflow.
"""

import math
import os
from dataclasses import dataclass
from typing import Optional

from newspaper_engine import config


@dataclass
class ArticleMeasurement:
    """Height breakdown of a measured article in points."""
    category_tag: float = 0.0
    headline: float = 0.0
    subheadline: float = 0.0
    byline: float = 0.0
    image: float = 0.0
    highlights: float = 0.0
    body: float = 0.0
    spacing: float = 0.0
    total: float = 0.0


def measure_article(article, column_width: float, is_hero: bool = False) -> ArticleMeasurement:
    """
    Estimate total rendered height of an article.
    Applies a 1.15x safety multiplier to prevent page overflow.
    """
    m = ArticleMeasurement()

    # Category tag
    if getattr(article, 'category', None):
        m.category_tag = config.CATEGORY_TAG_HEIGHT

    # Headline
    headline_text = getattr(article, 'headline', '') or ''
    if headline_text:
        if is_hero:
            m.headline = _measure_text_block(
                headline_text, column_width,
                config.HERO_HEADLINE_FONT_SIZE,
                config.HERO_HEADLINE_LINE_HEIGHT,
                config.HEADLINE_CHARS_PER_PT,
            )
        else:
            m.headline = _measure_text_block(
                headline_text, column_width,
                config.HEADLINE_FONT_SIZE,
                config.HEADLINE_LINE_HEIGHT,
                config.HEADLINE_CHARS_PER_PT,
            )
        m.headline += config.HEADLINE_MARGIN_BOTTOM

    # Subheadline
    sub_text = getattr(article, 'subheadline', '') or ''
    if sub_text:
        font_size = 11.0 if is_hero else config.SUBHEADLINE_FONT_SIZE
        m.subheadline = _measure_text_block(
            sub_text, column_width, font_size,
            config.SUBHEADLINE_LINE_HEIGHT, config.HEADLINE_CHARS_PER_PT,
        )
        m.subheadline += config.SUBHEADLINE_MARGIN_BOTTOM

    # Byline
    if getattr(article, 'byline', ''):
        m.byline = config.BYLINE_HEIGHT

    # Image — for non-hero articles, images are floated (40% width)
    # so they consume less vertical space since text wraps beside them
    if getattr(article, 'image', None):
        m.image = _measure_image(article, column_width, is_hero)
        m.image += config.IMAGE_MARGIN_BOTTOM
        # Images are floated (inline) for all priorities, so text wraps
        # beside them — apply float height reduction factor
        m.image *= config.FLOAT_HEIGHT_FACTOR

    # Highlights box — floated in standard articles, shares space with text
    highlights = getattr(article, 'highlights', None) or []
    if highlights:
        header_h = 10.0
        items_h = len(highlights) * config.HIGHLIGHTS_LINE_HEIGHT
        m.highlights = header_h + items_h + config.HIGHLIGHTS_PADDING
        if not is_hero:
            m.highlights *= config.FLOAT_HEIGHT_FACTOR

    # Body content
    content = getattr(article, 'content_parsed', '') or getattr(article, 'content_raw', '') or ''
    if content:
        body_width = column_width
        if is_hero:
            body_width = (column_width - config.COLUMN_GAP * 2) / 3
        m.body = _measure_body_content(content, body_width)

    # Sum all present components
    present = [v for v in [m.category_tag, m.headline, m.subheadline,
                           m.byline, m.image, m.highlights, m.body] if v > 0]
    m.spacing = config.ARTICLE_MARGIN_BOTTOM

    raw_total = sum(present) + m.spacing

    # Safety multiplier: overestimate by 12% to prevent page overflow
    m.total = raw_total * 1.12
    return m


def measure_article_body_only(content: str, column_width: float) -> float:
    """Measure just the body content height. Used by splitter."""
    return _measure_body_content(content, column_width)


# ─── Internal Helpers ─────────────────────────────────────────────

def _measure_text_block(
    text: str, column_width: float,
    font_size: float, line_height_ratio: float,
    chars_per_pt: float,
) -> float:
    if not text:
        return 0.0
    chars_per_line = max(1, int(column_width * chars_per_pt))
    num_lines = math.ceil(len(text) / chars_per_line)
    line_height_pt = font_size * line_height_ratio
    return num_lines * line_height_pt


def _measure_body_content(html_content: str, column_width: float) -> float:
    """Estimate body text height from HTML content."""
    import re
    clean = re.sub(r'<[^>]+>', ' ', html_content)
    clean = re.sub(r'\s+', ' ', clean).strip()

    if not clean:
        return 0.0

    words = clean.split()
    word_count = len(words)

    avg_word_width_pt = config.BODY_FONT_SIZE * 0.45
    words_per_line = max(1, int(column_width / (avg_word_width_pt * 5)))

    num_lines = math.ceil(word_count / words_per_line)
    line_height_pt = config.BODY_FONT_SIZE * config.BODY_LINE_HEIGHT

    paragraph_count = max(1, word_count // 80)
    paragraph_spacing = paragraph_count * 4.0  # tight <p> margins

    return (num_lines * line_height_pt) + paragraph_spacing


def _measure_image(article, column_width: float, is_hero: bool) -> float:
    if is_hero:
        display_width = column_width * config.HERO_IMAGE_WIDTH_RATIO
    else:
        display_width = column_width

    # Try reading actual image dimensions
    try:
        image_field = article.image
        if hasattr(image_field, 'width') and hasattr(image_field, 'height'):
            if image_field.width and image_field.height:
                aspect = image_field.height / image_field.width
                computed_h = display_width * aspect
                return min(computed_h, config.IMAGE_MAX_HEIGHT)
    except Exception:
        pass

    try:
        image_path = article.image.path
        if os.path.exists(image_path):
            from PIL import Image
            with Image.open(image_path) as img:
                w, h = img.size
                if w > 0:
                    aspect = h / w
                    computed_h = display_width * aspect
                    return min(computed_h, config.IMAGE_MAX_HEIGHT)
    except Exception:
        pass

    return min(
        display_width * config.IMAGE_DEFAULT_ASPECT_RATIO,
        config.IMAGE_MAX_HEIGHT,
    )
