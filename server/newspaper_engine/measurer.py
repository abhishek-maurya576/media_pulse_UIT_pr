"""
Newspaper Engine — Content Height Measurer

Estimates rendered height (in points) of each article component.
Conservative estimates — overestimates to prevent overflow.

Accounts for HTML structural elements: headings, lists, blockquotes,
not just raw text. This prevents articles from overflowing their
assigned page space.
"""

import math
import os
import re
from dataclasses import dataclass
from typing import Optional

from newspaper_engine import config

# Devanagari characters are wider than Latin; apply width multiplier
DEVANAGARI_WIDTH_FACTOR = 1.30


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

    # Body content — uses structure-aware measurement
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

    # Safety multiplier: overestimate by 15% to prevent page overflow
    m.total = raw_total * 1.15
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
    effective_width = column_width * _script_width_factor(text)
    chars_per_line = max(1, int(effective_width * chars_per_pt))
    num_lines = math.ceil(len(text) / chars_per_line)
    line_height_pt = font_size * line_height_ratio
    return num_lines * line_height_pt


def _measure_body_content(html_content: str, column_width: float) -> float:
    """
    Estimate body text height from HTML content.

    Structure-aware: accounts for headings (h2-h4), lists (ul/ol/li),
    blockquotes, and paragraph margins — not just raw text.
    """
    if not html_content:
        return 0.0

    total_height = 0.0
    line_height_pt = config.BODY_FONT_SIZE * config.BODY_LINE_HEIGHT

    # ─── Count structural elements BEFORE stripping tags ───

    # Headings: each adds font-size + margins
    h2_count = len(re.findall(r'<h2[\s>]', html_content, re.IGNORECASE))
    h3_count = len(re.findall(r'<h3[\s>]', html_content, re.IGNORECASE))
    h4_count = len(re.findall(r'<h4[\s>]', html_content, re.IGNORECASE))
    # h2 = ~13pt font + 8pt top margin + 4pt bottom = ~25pt each
    # h3 = ~11pt font + 6pt top margin + 3pt bottom = ~20pt each
    # h4 = ~10pt font + 4pt top margin + 2pt bottom = ~16pt each
    total_height += h2_count * 25.0
    total_height += h3_count * 20.0
    total_height += h4_count * 16.0

    # List items: each adds line-height + bullet margin
    li_count = len(re.findall(r'<li[\s>]', html_content, re.IGNORECASE))
    # Each <li> = ~line_height + 3pt padding + 2pt bullet space
    total_height += li_count * (line_height_pt + 5.0)

    # List containers (ul/ol): each adds padding
    ul_count = len(re.findall(r'<(?:ul|ol)[\s>]', html_content, re.IGNORECASE))
    total_height += ul_count * 8.0  # top+bottom padding per list

    # Blockquotes: add padding + border space
    bq_count = len(re.findall(r'<blockquote[\s>]', html_content, re.IGNORECASE))
    total_height += bq_count * 16.0

    # <hr> / horizontal rules
    hr_count = len(re.findall(r'<hr[\s/>]', html_content, re.IGNORECASE))
    total_height += hr_count * 10.0

    # <strong>/<b> within body: bold text is slightly wider, so more lines
    bold_sections = re.findall(r'<(?:strong|b)>(.+?)</(?:strong|b)>', html_content, re.IGNORECASE | re.DOTALL)
    bold_extra_chars = sum(len(s) for s in bold_sections)
    # Bold text is ~10% wider → causes extra line wraps
    bold_extra_lines = math.ceil(bold_extra_chars * 0.10 / max(1, int(column_width * config.BODY_CHARS_PER_PT)))
    total_height += bold_extra_lines * line_height_pt

    # ─── Now measure the plain text body ───
    clean = re.sub(r'<[^>]+>', ' ', html_content)
    clean = re.sub(r'\s+', ' ', clean).strip()

    if not clean:
        return total_height

    words = clean.split()
    word_count = len(words)

    # Compute average word length for this content to get accurate wrapping
    avg_word_len = sum(len(w) for w in words) / max(1, word_count)
    avg_word_width_pt = config.BODY_FONT_SIZE * 0.45 * _script_width_factor(clean)
    words_per_line = max(1, int(column_width / (avg_word_width_pt * max(avg_word_len, 3))))

    num_lines = math.ceil(word_count / words_per_line)

    # Paragraph count (from <p> tags or text breaks)
    p_count = max(1, len(re.findall(r'<p[\s>]', html_content, re.IGNORECASE)))
    paragraph_spacing = p_count * 6.0  # margin-bottom per paragraph

    total_height += (num_lines * line_height_pt) + paragraph_spacing

    return total_height


def _script_width_factor(text: str) -> float:
    """Return inverse width factor based on script detection.

    Devanagari glyphs are ~30% wider than Latin at the same font-size,
    so fewer characters fit per line.  We return a factor < 1.0 to
    *reduce* the effective column width used for line-count estimation,
    which results in *more* estimated lines (conservative).
    """
    if not text:
        return 1.0
    # Sample up to 200 characters for performance
    sample = text[:200]
    devanagari_count = sum(
        1 for ch in sample
        if '\u0900' <= ch <= '\u097F'  # Devanagari Unicode block
    )
    ratio = devanagari_count / max(len(sample), 1)
    if ratio > 0.3:
        return 1.0 / DEVANAGARI_WIDTH_FACTOR  # ~0.77 — fewer chars per line
    return 1.0


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
