"""
Generation service — orchestrates the PDF generation pipeline.

Pipeline:
1. Fetch edition + articles
2. Ensure all articles are parsed
3. Compose layout using the newspaper engine
4. Render PDF with newspaper-style HTML
5. Save to edition
"""

from editions.models import Edition, ArticlePriority
from generator.parsers import parse_content
from generator.pdf import render_edition_pdf, save_pdf_to_edition
from newspaper_engine.engine import compose


PRIORITY_ORDER = {
    ArticlePriority.HERO: 0,
    ArticlePriority.MAJOR: 1,
    ArticlePriority.STANDARD: 2,
    ArticlePriority.MINOR: 3,
}


def generate_edition_pdf(edition: Edition) -> str:
    """
    Full PDF generation pipeline for an edition.
    Returns the URL path to the generated PDF.
    """
    articles = (
        edition.articles
        .select_related('category')
        .all()
    )

    # Ensure all articles have parsed content
    for article in articles:
        if not article.content_parsed:
            article.content_parsed = parse_content(
                article.content_raw,
                article.content_format,
            )
            article.save(update_fields=['content_parsed'])

    # Compose page layouts using the newspaper engine
    page_layouts = compose(edition, list(articles))

    pdf_bytes = render_edition_pdf(edition, page_layouts)

    pdf_url = save_pdf_to_edition(edition, pdf_bytes)

    return pdf_url
