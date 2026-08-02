# --- SEC FIX SEC-010 ---
"""Server-side HTML sanitization for article content."""

from __future__ import annotations

import nh3


ALLOWED_TAGS = {
    "p", "br", "b", "i", "strong", "em", "u", "s",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "figure", "figcaption",
    "hr", "span", "div",
}

ALLOWED_ATTRIBUTES = {
    "a": {"href", "title", "target", "rel"},
    "img": {"src", "alt", "title", "width", "height"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan"},
    "*": {"class"},
}


def sanitize_article_html(raw_html: str) -> str:
    """Sanitize rich article HTML for safe browser and WebView rendering."""

    if not raw_html:
        return ""
    return nh3.clean(
        raw_html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        link_rel="noopener noreferrer",
        url_schemes={"https", "http", "mailto"},
    )


def sanitize_plain_text(text: str) -> str:
    """Strip all HTML from text fields."""

    if not text:
        return ""
    return nh3.clean_text(text)
