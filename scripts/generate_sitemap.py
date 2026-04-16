"""Generate sitemap.xml from all HTML pages (excluding components/)."""
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
SKIP = {"components"}


def priority(rel: str) -> str:
    if rel == "index.html":
        return "1.0"
    if rel in ("apps.html", "blog/index.html", "about.html"):
        return "0.9"
    if rel.startswith("windows-tools/"):
        return "0.8"
    if rel.startswith("blog/"):
        return "0.75"
    return "0.7"


def main() -> None:
    paths: list[tuple[str, str]] = []
    for p in sorted(ROOT.rglob("*.html")):
        if any(x in SKIP for x in p.parts):
            continue
        rel = p.relative_to(ROOT).as_posix()
        loc = (
            "https://rdroidapps.com/"
            if rel == "index.html"
            else f"https://rdroidapps.com/{rel}"
        )
        paths.append((loc, rel))

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "",
    ]
    for loc, rel in paths:
        cfreq = "weekly" if rel == "index.html" else "monthly"
        lines.extend(
            [
                "  <url>",
                f"    <loc>{escape(loc)}</loc>",
                f"    <changefreq>{cfreq}</changefreq>",
                f"    <priority>{priority(rel)}</priority>",
                "  </url>",
                "",
            ]
        )
    lines.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(paths)} URLs to sitemap.xml")


if __name__ == "__main__":
    main()
