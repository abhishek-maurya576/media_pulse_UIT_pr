"""
PDF Renderer — generates newspaper-style PDFs using Playwright (headless Chromium).

Uses a real browser engine for perfect CSS support:
CSS Grid, web fonts, gradients, etc. all render correctly.

Accepts pre-computed page layouts from newspaper_engine and renders
them using the engine's HTML template.
"""

import os
import re
import base64
import urllib.parse
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from django.conf import settings

from newspaper_engine.config import get_page_dimensions_css


def render_edition_pdf(edition, page_layouts) -> bytes:
    """
    Render edition as newspaper-style PDF via headless Chromium.

    Args:
        edition: Django Edition model instance
        page_layouts: list of template-ready page dicts from newspaper_engine.compose()

    Returns:
        PDF file contents as bytes
    """
    page_dimensions = get_page_dimensions_css(edition.page_size)
    total_pages = len(page_layouts)

    # Determine column count from first page (or default)
    column_count = 3
    if page_layouts:
        column_count = page_layouts[0].get('column_count', 3)

    context = {
        'edition': edition,
        'pages': page_layouts,
        'total_pages': total_pages,
        'page_dim': page_dimensions,
        'column_count': column_count,
    }

    html_content = render_to_string('newspaper_engine/edition.html', context)

    # Pre-encode all local media images as base64
    # Avoids Playwright local file security restrictions
    html_content = re.sub(
        r'src="(/?media/[^"]+)"',
        _img_to_base64,
        html_content,
    )

    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page()
                page.set_content(html_content, wait_until='networkidle')

                pdf_bytes = page.pdf(
                    width=page_dimensions['width'],
                    height=page_dimensions['height'],
                    margin={
                        'top': '0',
                        'bottom': '0',
                        'left': '0',
                        'right': '0',
                    },
                    print_background=True,
                )
            finally:
                browser.close()

    except ImportError:
        raise RuntimeError(
            'Playwright is not installed. Run: pip install playwright && playwright install chromium'
        )
    except Exception as e:
        raise RuntimeError(f'PDF rendering failed: {e}')

    return pdf_bytes


def save_pdf_to_edition(edition, pdf_bytes: bytes) -> str:
    """Save PDF bytes to the edition's generated_pdf field."""
    filename = f"edition_{edition.id}_{edition.publication_date}.pdf"
    target_name = f"editions/pdfs/{filename}"
    storage = edition.generated_pdf.storage

    if edition.generated_pdf.name and storage.exists(edition.generated_pdf.name):
        storage.delete(edition.generated_pdf.name)
    elif storage.exists(target_name):
        storage.delete(target_name)

    edition.generated_pdf.save(filename, ContentFile(pdf_bytes), save=True)
    return edition.generated_pdf.url


def _img_to_base64(match):
    """Replace local media image src with base64 data URI."""
    rel_url = match.group(1)
    rel_path = urllib.parse.unquote(rel_url.lstrip('/').replace('media/', '', 1))
    file_path = os.path.join(settings.MEDIA_ROOT, rel_path)
    try:
        with open(file_path, "rb") as image_file:
            encoded = base64.b64encode(image_file.read()).decode('utf-8')
        ext = os.path.splitext(file_path)[1].lower().strip('.')
        mime_type = 'jpeg' if ext == 'jpg' else ext
        return f'src="data:image/{mime_type};base64,{encoded}"'
    except Exception as err:
        print(f"Warning: PDF Generator could not encode image: {file_path} - {err}")
        return match.group(0)
