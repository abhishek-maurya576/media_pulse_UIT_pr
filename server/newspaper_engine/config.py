"""
Newspaper Engine — Centralized Configuration

Dense traditional newspaper layout constants.
Aesthetic target: Indian regional press (Dainik Jagran, Amar Ujala, BR Times).
Maximizes content density — 90-95% page utilization, minimal whitespace.
"""

# ─── Page Dimensions (in points, 1pt = 1/72 inch) ────────────────

PAGE_DIMENSIONS = {
    'TABLOID':    {'width': 792.0,  'height': 1224.0},   # 11 × 17 in
    'BROADSHEET': {'width': 1080.0, 'height': 1620.0},   # 15 × 22.5 in
    'A4':         {'width': 595.28, 'height': 841.89},    # 210 × 297 mm
    'LETTER':     {'width': 612.0,  'height': 792.0},     # 8.5 × 11 in
}

PAGE_DIMENSIONS_CSS = {
    'TABLOID':    {'width': '11in',   'height': '17in'},
    'BROADSHEET': {'width': '15in',   'height': '22.5in'},
    'A4':         {'width': '210mm',  'height': '297mm'},
    'LETTER':     {'width': '8.5in',  'height': '11in'},
}


# ─── Margins (tight — newspaper feel) ────────────────────────────

MARGIN_TOP = 28.0        # 0.39 in
MARGIN_BOTTOM = 28.0     # 0.39 in
MARGIN_LEFT = 24.0       # 0.33 in
MARGIN_RIGHT = 24.0      # 0.33 in


# ─── Column Layout ───────────────────────────────────────────────

DEFAULT_COLUMN_COUNT = 3
COLUMN_GAP = 12.0        # pt — narrow gap (newspapers use ~4mm)
COLUMN_RULE_WIDTH = 0.4  # pt — thin vertical separator


# ─── Masthead Dimensions ─────────────────────────────────────────

MASTHEAD_HEIGHT = 130.0  # pt — tall Hindi masthead (बी.आर.टाइम्स style)
SUBHEADER_HEIGHT = 22.0  # pt — category section header on inner pages


# ─── Font Metrics (dense newspaper) ──────────────────────────────

HEADLINE_FONT_SIZE = 14.0       # pt
HEADLINE_LINE_HEIGHT = 1.10
HEADLINE_CHARS_PER_PT = 0.52

HERO_HEADLINE_FONT_SIZE = 26.0  # pt — bold but not huge
HERO_HEADLINE_LINE_HEIGHT = 1.05

SUBHEADLINE_FONT_SIZE = 9.5     # pt
SUBHEADLINE_LINE_HEIGHT = 1.20

BODY_FONT_SIZE = 9.0            # pt — compact newspaper body
BODY_LINE_HEIGHT = 1.30         # tight reading
BODY_CHARS_PER_PT = 0.58

BYLINE_HEIGHT = 14.0            # pt — compact
CATEGORY_TAG_HEIGHT = 10.0      # pt — compact


# ─── Element Spacing (minimal) ───────────────────────────────────

ARTICLE_MARGIN_BOTTOM = 8.0     # pt — tight gap between articles
HEADLINE_MARGIN_BOTTOM = 3.0    # pt
SUBHEADLINE_MARGIN_BOTTOM = 3.0
IMAGE_MARGIN_BOTTOM = 4.0
HIGHLIGHTS_PADDING = 14.0       # pt — tighter internal padding
HIGHLIGHTS_LINE_HEIGHT = 11.0   # pt
HERO_SECTION_PADDING = 10.0     # pt — minimal padding below hero


# ─── Image Sizing (controlled — not decorative) ──────────────────

IMAGE_MAX_HEIGHT = 200.0         # pt — restrained (25-35% page height)
IMAGE_DEFAULT_ASPECT_RATIO = 0.55
HERO_IMAGE_WIDTH_RATIO = 0.60   # hero image: 60% of content width


# ─── Float/Wrap Configuration ────────────────────────────────────
# Controls inline float wrapping for images and highlight boxes

FLOAT_IMAGE_WIDTH_RATIO = 0.40   # floated image = 40% of column width
FLOAT_IMAGE_MARGIN = 8.0         # pt — margin around floated image
FLOAT_IMAGE_MAX_HEIGHT = 160.0   # pt — max height for floated images

# Float direction alternation by article index for visual balance
# Even index = right, Odd index = left
FLOAT_DEFAULT_DIRECTION = 'right'

# Highlight box float settings
FLOAT_HIGHLIGHTS_WIDTH_RATIO = 0.45   # floated highlight box = 45% column
FLOAT_HIGHLIGHTS_MARGIN = 6.0         # pt — margin around highlight box

# Height reduction factor: floated images share vertical space with text.
# Since text wraps beside the image, the image only adds ~60% of its
# height to the total article height (text fills the remaining space).
FLOAT_HEIGHT_FACTOR = 0.60


# ─── Page Footer ─────────────────────────────────────────────────

PAGE_FOOTER_HEIGHT = 14.0   # pt — minimal footer


# ─── Pagination Rules ────────────────────────────────────────────

SPLIT_THRESHOLD_RATIO = 0.55
MIN_PARAGRAPHS_PER_FRAGMENT = 2
REBALANCE_THRESHOLD = 0.35


# ─── Priority Configuration ─────────────────────────────────────

PRIORITY_SORT_ORDER = {
    'HERO': 0,
    'MAJOR': 1,
    'STANDARD': 2,
    'MINOR': 3,
}

PRIORITY_COLUMN_SPAN = {
    'HERO': 'full',       # full content width
    'MAJOR': 2,           # spans 2 of 3 columns
    'STANDARD': 1,
    'MINOR': 1,
}


# ─── Derived Helpers ─────────────────────────────────────────────

def get_page_dimensions(page_size: str) -> dict:
    return PAGE_DIMENSIONS.get(page_size, PAGE_DIMENSIONS['TABLOID'])


def get_page_dimensions_css(page_size: str) -> dict:
    return PAGE_DIMENSIONS_CSS.get(page_size, PAGE_DIMENSIONS_CSS['TABLOID'])


def get_content_area(page_size: str) -> dict:
    dims = get_page_dimensions(page_size)
    return {
        'width': dims['width'] - MARGIN_LEFT - MARGIN_RIGHT,
        'height': dims['height'] - MARGIN_TOP - MARGIN_BOTTOM,
    }


def get_column_width(page_size: str, column_count: int = None) -> float:
    cols = column_count or DEFAULT_COLUMN_COUNT
    content = get_content_area(page_size)
    total_gaps = COLUMN_GAP * (cols - 1)
    return (content['width'] - total_gaps) / cols


def get_content_height(page_size: str, is_front_page: bool = False) -> float:
    content = get_content_area(page_size)
    header_h = MASTHEAD_HEIGHT if is_front_page else SUBHEADER_HEIGHT
    return content['height'] - header_h - PAGE_FOOTER_HEIGHT
