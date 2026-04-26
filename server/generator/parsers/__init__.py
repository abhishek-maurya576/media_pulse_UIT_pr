"""
Content parsers — convert raw input formats to HTML.

Supported formats (Phase 1):
- PLAINTEXT → HTML paragraphs
- MARKDOWN → HTML via markdown lib
- JSON → structured article HTML
- YAML → structured article HTML
"""

import json
import re
import markdown as md
import yaml

try:
    import bleach
except ImportError:  # Keeps local/dev environments running until requirements are installed.
    bleach = None

from editions.models import ContentFormat


ALLOWED_HTML_TAGS = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u',
    'ul', 'ol', 'li', 'blockquote',
    'h2', 'h3', 'h4', 'hr',
    'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]

ALLOWED_HTML_ATTRIBUTES = {
    'a': ['href', 'title'],
    'th': ['colspan', 'rowspan'],
    'td': ['colspan', 'rowspan'],
}

ALLOWED_HTML_PROTOCOLS = ['http', 'https', 'mailto']


def parse_content(raw_content: str, content_format: str) -> str:
    """Route to appropriate parser based on format."""
    parsers = {
        ContentFormat.PLAINTEXT: parse_plaintext,
        ContentFormat.MARKDOWN: parse_markdown,
        ContentFormat.JSON: parse_json,
        ContentFormat.YAML: parse_yaml,
    }
    parser = parsers.get(content_format, parse_plaintext)
    return sanitize_html(parser(raw_content))


def parse_plaintext(text: str) -> str:
    """Convert plain text to HTML paragraphs."""
    if not text.strip():
        return ''

    text = _escape_html(text)

    paragraphs = re.split(r'\n\s*\n', text.strip())
    html_parts = []

    for para in paragraphs:
        lines = para.strip().split('\n')
        combined = '<br>'.join(line.strip() for line in lines if line.strip())
        if combined:
            html_parts.append(f'<p>{combined}</p>')

    return '\n'.join(html_parts)


def parse_markdown(text: str) -> str:
    """Convert Markdown to HTML."""
    if not text.strip():
        return ''

    extensions = ['extra', 'smarty', 'nl2br']
    return md.markdown(text, extensions=extensions)


def sanitize_html(html: str) -> str:
    """Allow editorial markup while stripping executable HTML."""
    if not html:
        return ''

    if bleach is not None:
        return bleach.clean(
            html,
            tags=ALLOWED_HTML_TAGS,
            attributes=ALLOWED_HTML_ATTRIBUTES,
            protocols=ALLOWED_HTML_PROTOCOLS,
            strip=True,
        )

    cleaned = re.sub(
        r'<\s*(script|style|iframe|object|embed)[^>]*>.*?<\s*/\s*\1\s*>',
        '',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    cleaned = re.sub(
        r'<\s*/?\s*(script|style|iframe|object|embed|form|input|button)[^>]*>',
        '',
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r'\son\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)',
        '',
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r'\s(href|src)\s*=\s*("[^"]*javascript:[^"]*"|\'[^\']*javascript:[^\']*\')',
        '',
        cleaned,
        flags=re.IGNORECASE,
    )
    return cleaned


def parse_json(text: str) -> str:
    """
    Parse JSON article format.
    Expected: {"paragraphs": ["...", "..."]} or just a list of strings.
    """
    if not text.strip():
        return ''

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return parse_plaintext(text)

    if isinstance(data, list):
        paragraphs = data
    elif isinstance(data, dict):
        paragraphs = data.get('paragraphs', data.get('content', []))
        if isinstance(paragraphs, str):
            paragraphs = [paragraphs]
    else:
        return parse_plaintext(str(data))

    html_parts = [f'<p>{_escape_html(str(p))}</p>' for p in paragraphs if str(p).strip()]
    return '\n'.join(html_parts)


def parse_yaml(text: str) -> str:
    """
    Parse YAML article format.
    Expected: paragraphs: ["...", "..."] or content: "..."
    """
    if not text.strip():
        return ''

    try:
        data = yaml.safe_load(text)
    except yaml.YAMLError:
        return parse_plaintext(text)

    if isinstance(data, str):
        return parse_plaintext(data)
    elif isinstance(data, list):
        paragraphs = data
    elif isinstance(data, dict):
        paragraphs = data.get('paragraphs', data.get('content', []))
        if isinstance(paragraphs, str):
            paragraphs = [paragraphs]
    else:
        return parse_plaintext(str(data))

    html_parts = [f'<p>{_escape_html(str(p))}</p>' for p in paragraphs if str(p).strip()]
    return '\n'.join(html_parts)


def _escape_html(text: str) -> str:
    """Basic HTML escaping."""
    return (
        text
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
    )
