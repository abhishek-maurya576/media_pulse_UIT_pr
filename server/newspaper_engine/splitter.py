"""
Newspaper Engine — Article Content Splitter

Splits long articles across pages with continuation markers.
Only splits articles that exceed SPLIT_THRESHOLD_RATIO of a full page.
Splits at paragraph boundaries — never mid-sentence.
"""

import re
from dataclasses import dataclass
from typing import Optional, Tuple

from newspaper_engine import config
from newspaper_engine.measurer import measure_article_body_only


@dataclass
class ArticleFragment:
    """A portion of an article that fits on a single page."""
    article: object              # original Django Article model
    content_html: str            # this fragment's HTML content
    is_first: bool = True        # is this the first/main part?
    is_last: bool = True         # is this the final fragment?
    continued_on_page: Optional[int] = None    # page of next fragment
    continued_from_page: Optional[int] = None  # page of previous fragment
    fragment_index: int = 0      # 0 = first fragment, 1 = second, etc.


def should_split(article_height: float, page_content_height: float) -> bool:
    """
    Determine if an article should be split.
    Only split if the article exceeds SPLIT_THRESHOLD_RATIO of a full page.
    """
    return article_height > (page_content_height * config.SPLIT_THRESHOLD_RATIO)


def split_article(
    article,
    available_height: float,
    column_width: float,
    overhead_height: float = 0.0,
) -> Tuple[ArticleFragment, ArticleFragment]:
    """
    Split article content into two fragments at a paragraph boundary.

    Args:
        article: Django Article model
        available_height: remaining height on current page (pt)
        column_width: column width for height estimation
        overhead_height: height consumed by non-body elements (headline, image, etc.)

    Returns:
        (fits_fragment, overflow_fragment)
    """
    content = article.content_parsed or article.content_raw or ''
    paragraphs = _extract_paragraphs(content)

    if len(paragraphs) < (config.MIN_PARAGRAPHS_PER_FRAGMENT * 2):
        # Not enough paragraphs to split — return as single fragment
        return (
            ArticleFragment(
                article=article,
                content_html=content,
                is_first=True,
                is_last=True,
            ),
            None,
        )

    # Calculate how much height is available for body text
    body_budget = available_height - overhead_height
    if body_budget <= 0:
        # No room for body on this page — entire article overflows
        return (
            None,
            ArticleFragment(
                article=article,
                content_html=content,
                is_first=True,
                is_last=True,
            ),
        )

    # Find the split point: accumulate paragraphs until we exceed budget
    accumulated_html = ''
    split_index = 0

    for i, para in enumerate(paragraphs):
        test_html = accumulated_html + para
        test_height = measure_article_body_only(test_html, column_width)

        if test_height > body_budget:
            split_index = i
            break
        accumulated_html = test_html
        split_index = i + 1

    # Enforce minimum paragraphs per fragment
    split_index = max(split_index, config.MIN_PARAGRAPHS_PER_FRAGMENT)
    split_index = min(split_index, len(paragraphs) - config.MIN_PARAGRAPHS_PER_FRAGMENT)

    # Safety: if constraints make split impossible, don't split
    if split_index <= 0 or split_index >= len(paragraphs):
        return (
            ArticleFragment(
                article=article,
                content_html=content,
                is_first=True,
                is_last=True,
            ),
            None,
        )

    first_html = '\n'.join(paragraphs[:split_index])
    second_html = '\n'.join(paragraphs[split_index:])

    first_fragment = ArticleFragment(
        article=article,
        content_html=first_html,
        is_first=True,
        is_last=False,
        fragment_index=0,
    )

    second_fragment = ArticleFragment(
        article=article,
        content_html=second_html,
        is_first=False,
        is_last=True,
        fragment_index=1,
    )

    return (first_fragment, second_fragment)


def _extract_paragraphs(html_content: str) -> list:
    """
    Extract individual paragraph elements from HTML content.
    Returns a list of <p>...</p> strings.
    """
    # Match <p>...</p> blocks (including nested inline tags)
    pattern = r'<p[^>]*>.*?</p>'
    paragraphs = re.findall(pattern, html_content, flags=re.DOTALL | re.IGNORECASE)

    if not paragraphs:
        # Fallback: split on double newline and wrap in <p>
        raw_parts = re.split(r'\n\s*\n', html_content.strip())
        paragraphs = [f'<p>{part.strip()}</p>' for part in raw_parts if part.strip()]

    return paragraphs
