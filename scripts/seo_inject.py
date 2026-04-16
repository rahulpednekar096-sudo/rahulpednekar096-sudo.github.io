"""
One-off / maintenance: inject Open Graph, Twitter cards, and JSON-LD where missing.
Run from repo root: python scripts/seo_inject.py
"""
from __future__ import annotations

import json
import re
from html import escape as html_escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_PARTS = frozenset({"components"})
DEFAULT_OG_IMAGE = "https://rdroidapps.com/assets/icons/android-chrome-512x512.png"


def rel_url(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def extract_title(html: str) -> str:
    m = re.search(r"<title[^>]*>([^<]+)</title>", html, re.I | re.S)
    return (m.group(1) if m else "RDroid Apps").strip()


def extract_description(html: str, title: str) -> str:
    m = re.search(
        r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']*)["\']',
        html,
        re.I,
    )
    if m:
        return m.group(1).strip()
    m = re.search(
        r'<meta\s+content=["\']([^"\']*)["\']\s+name=["\']description["\']',
        html,
        re.I,
    )
    if m:
        return m.group(1).strip()
    return (title[:160] + "…") if len(title) > 160 else title


def extract_canonical(html: str, rel_posix: str) -> str:
    m = re.search(
        r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']',
        html,
        re.I,
    )
    if m:
        return m.group(1).strip()
    m = re.search(
        r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical["\']',
        html,
        re.I,
    )
    if m:
        return m.group(1).strip()
    if rel_posix == "index.html":
        return "https://rdroidapps.com/"
    return "https://rdroidapps.com/" + rel_posix


def has_og_title(html: str) -> bool:
    return bool(re.search(r'property\s*=\s*["\']og:title["\']', html, re.I))


def has_schema_jsonld(html: str) -> bool:
    if "application/ld+json" not in html:
        return False
    return bool(
        re.search(
            r'"@type"\s*:\s*"(SoftwareApplication|WebApplication|WebPage|Article|BlogPosting|FAQPage|HowTo)"',
            html,
        )
    )


def build_og_block(title: str, desc: str, url: str, image: str) -> str:
    t = html_escape(title, quote=True)
    d = html_escape(desc, quote=True)
    u = html_escape(url, quote=True)
    img = html_escape(image, quote=True)
    return (
        f'  <meta property="og:site_name" content="RDroid Apps" />\n'
        f'  <meta property="og:locale" content="en_US" />\n'
        f'  <meta property="og:title" content="{t}" />\n'
        f'  <meta property="og:description" content="{d}" />\n'
        f'  <meta property="og:type" content="website" />\n'
        f'  <meta property="og:url" content="{u}" />\n'
        f'  <meta property="og:image" content="{img}" />\n'
        f'  <meta name="twitter:card" content="summary_large_image" />\n'
        f'  <meta name="twitter:title" content="{t}" />\n'
        f'  <meta name="twitter:description" content="{d}" />\n'
        f'  <meta name="twitter:image" content="{img}" />\n'
    )


def build_json_ld(rel_posix: str, title: str, desc: str, url: str) -> str:
    base = {
        "@context": "https://schema.org",
        "name": title,
        "description": desc,
        "url": url,
        "isPartOf": {
            "@type": "WebSite",
            "name": "RDroid Apps",
            "url": "https://rdroidapps.com/",
        },
    }
    if rel_posix == "index.html":
        doc = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "RDroid Apps",
            "url": "https://rdroidapps.com/",
            "description": desc,
            "publisher": {
                "@type": "Organization",
                "name": "RDroid Apps",
                "url": "https://rdroidapps.com/",
            },
        }
    elif rel_posix.startswith("windows-tools/"):
        doc = {
            **base,
            "@type": "WebApplication",
            "applicationCategory": "UtilitiesApplication",
            "operatingSystem": "Web Browser",
            "browserRequirements": "Requires JavaScript",
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        }
    elif rel_posix.startswith("blog/"):
        doc = {**base, "@type": "WebPage", "name": title}
    else:
        doc = {**base, "@type": "WebPage"}

    return (
        "\n  <script type=\"application/ld+json\">\n  "
        + json.dumps(doc, ensure_ascii=False, indent=2).replace("\n", "\n  ")
        + "\n  </script>\n"
    )


def insert_before_head_close(html: str, snippet: str) -> str:
    m = re.search(r"</head>", html, re.I)
    if not m:
        return html
    i = m.start()
    return html[:i] + snippet + html[i:]


def insert_after_canonical_or_desc(html: str, og_block: str) -> str:
    # Prefer after canonical link
    for pat in (
        r'(<link[^>]+rel=["\']canonical["\'][^>]*>\s*\n)',
        r'(<link[^>]+rel=["\']canonical["\'][^>]*>)',
    ):
        m = re.search(pat, html, re.I)
        if m:
            return html[: m.end()] + "\n" + og_block + html[m.end() :]
    m = re.search(
        r'(<meta\s+name=["\']description["\'][^>]*>\s*\n?)', html, re.I
    )
    if m:
        return html[: m.end()] + "\n" + og_block + html[m.end() :]
    m = re.search(r"(</title>\s*\n)", html, re.I)
    if m:
        return html[: m.end()] + og_block + html[m.end() :]
    return insert_before_head_close(html, "\n" + og_block)


def process_file(path: Path) -> bool:
    rel = rel_url(path)
    text = path.read_text(encoding="utf-8")
    changed = False
    title = extract_title(text)
    desc = extract_description(text, title)
    canon = extract_canonical(text, rel)

    if not has_og_title(text):
        og = build_og_block(title, desc, canon, DEFAULT_OG_IMAGE)
        text = insert_after_canonical_or_desc(text, og)
        changed = True

    if not has_schema_jsonld(text):
        text = insert_before_head_close(text, build_json_ld(rel, title, desc, canon))
        changed = True

    if changed:
        path.write_text(text, encoding="utf-8", newline="\n")
    return changed


def main() -> None:
    n = 0
    for p in sorted(ROOT.rglob("*.html")):
        if any(part in SKIP_PARTS for part in p.parts):
            continue
        if process_file(p):
            print(rel_url(p))
            n += 1
    print(f"Updated {n} files.")


if __name__ == "__main__":
    main()
