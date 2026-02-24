#!/usr/bin/env python3
"""
ODCA Audit Recommendations Converter
Reads the XLSX tracking spreadsheet, scrapes report URLs from dcauditor.org,
and outputs structured data for the ODCA dashboard.

Usage:
    python3 scripts/odca_converter.py               # normal run (read + scrape + output)
    python3 scripts/odca_converter.py --no-scrape   # skip URL scraping
    python3 scripts/odca_converter.py --from-cache-only  # regenerate data.js without re-scraping
"""

import argparse
import csv
import html
import json
import re
import sys
import time
import unicodedata
from datetime import date
from pathlib import Path

try:
    import openpyxl
    import requests
    from bs4 import BeautifulSoup
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Run: scripts/.venv/bin/pip install openpyxl requests beautifulsoup4")
    sys.exit(1)

# ===== Configuration =====
CONFIG = {
    "XLSX_FILE": "projects/odca-dashboard/150_Rec-Tracking-2026-Analysis-2.4.26-Appendix-download.xlsx",
    "CACHE_FILE": "scripts/cache/odca_urls_cache.json",
    "OUTPUT_FILE": "projects/odca-dashboard/data.js",
    "SUMMARIES_CSV": "scripts/cache/report_summaries.csv",
    "SUMMARIES_FILE": "projects/odca-dashboard/summaries.js",
    "WP_API_URL": "https://dcauditor.org/wp-json/wp/v2/report",
    "RATE_LIMIT_SECONDS": 1.0,
    "HEADERS": {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
    },
}


# ===== Slug Generation =====
def slugify(text, max_length=60):
    """Convert text to a URL-safe slug, max_length chars."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^\w\s-]", " ", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = text.strip("-")
    return text[:max_length].rstrip("-")


# ===== Report Name Parsing =====
REPORT_NAME_RE = re.compile(r"^(.+?)\s+\((\d{1,2}/\d{1,2}/\d{2,4})\)\s*$")


def parse_report_field(raw):
    """Split 'Report Title (MM/DD/YYYY)' or 'Report Title (MM/DD/YY)' into
    (title, iso_date, raw_date)."""
    if not raw:
        return None, None, None
    raw = str(raw).strip()
    m = REPORT_NAME_RE.match(raw)
    if m:
        title = m.group(1).strip()
        raw_date = m.group(2)
        parts = raw_date.split("/")
        month, day = int(parts[0]), int(parts[1])
        year = int(parts[2])
        if year < 100:
            year += 2000
        iso_date = f"{year:04d}-{month:02d}-{day:02d}"
        return title, iso_date, raw_date
    # Fallback: no date found
    return raw, None, None


# ===== URL Scraping =====
def fetch_with_retry(url, session, max_retries=3):
    """Fetch URL with exponential backoff. Returns (response, error_str)."""
    for attempt in range(max_retries):
        try:
            resp = session.get(url, headers=CONFIG["HEADERS"], timeout=20)
            if resp.status_code == 200:
                return resp, None
            print(f"  HTTP {resp.status_code} on attempt {attempt + 1}: {url}")
        except Exception as e:
            print(f"  Error on attempt {attempt + 1}: {e}")
        if attempt < max_retries - 1:
            time.sleep(2 ** attempt)
    return None, f"Failed after {max_retries} attempts"


def title_match_key(title):
    """Normalize title to alphanumeric only for fuzzy matching."""
    return re.sub(r"[^a-z0-9]", "", html.unescape(title).lower())[:50]


def fetch_all_wp_reports(session):
    """Fetch all reports from dcauditor.org WordPress REST API."""
    all_reports = []
    page = 1
    while True:
        url = f"{CONFIG['WP_API_URL']}?per_page=100&page={page}&_fields=slug,title,link"
        resp, err = fetch_with_retry(url, session)
        if err or not resp:
            print(f"  WP API failed on page {page}: {err}")
            break
        data = resp.json()
        if not data:
            break
        all_reports.extend(data)
        print(f"  Fetched page {page}: {len(data)} reports")
        if len(data) < 100:
            break
        page += 1
        time.sleep(CONFIG["RATE_LIMIT_SECONDS"])
    return all_reports


def match_reports_to_urls(report_titles, wp_reports):
    """Match XLSX report titles to WP API report URLs."""
    # Build lookup keyed by normalized title
    wp_lookup = {}
    for r in wp_reports:
        raw_title = r.get("title", {}).get("rendered", "")
        key = title_match_key(raw_title)
        wp_lookup[key] = r.get("link", "").rstrip("/")

    results = {}
    for title in report_titles:
        key = title_match_key(title)
        url = wp_lookup.get(key)
        results[title] = url
        status = url or "(not found)"
        print(f"  {'✓' if url else '✗'} {title[:55]!r}")
        if url:
            print(f"    -> {url}")
    return results


def fetch_and_match_urls(report_titles, session, cache):
    """Fetch all WP reports and match to XLSX titles. Updates cache in place."""
    # Check if all titles are already cached
    uncached = [t for t in report_titles if t not in cache]
    if not uncached:
        print("  All titles already cached.")
        return False

    print(f"  Fetching all reports from dcauditor.org WP API...")
    wp_reports = fetch_all_wp_reports(session)
    print(f"  Total WP reports fetched: {len(wp_reports)}")

    matches = match_reports_to_urls(report_titles, wp_reports)
    cache.update(matches)
    return True


# ===== Cache =====

def load_cache(cache_file):
    path = Path(cache_file)
    if path.exists():
        try:
            with open(path) as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: could not load cache: {e}")
    return {}


def save_cache(cache, cache_file):
    path = Path(cache_file)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(cache, f, indent=2)


# ===== XLSX Reading =====
def read_xlsx(xlsx_file):
    """Read XLSX and return list of raw row dicts (columns 1-6)."""
    wb = openpyxl.load_workbook(xlsx_file)
    ws = wb.active

    rows = []
    # Row 4 = headers, data starts at row 5
    for row in ws.iter_rows(min_row=5, values_only=True):
        if not any(row):
            continue
        rows.append({
            "report_raw": row[0],
            "rec_no_raw": row[1],
            "recommendation_raw": row[2],
            "agency_raw": row[3],
            "status_raw": row[4],
            "notes_raw": row[5],
        })
    return rows


# ===== Record Building =====
def build_records(raw_rows, url_cache):
    """Convert raw rows to output records with stable unique IDs."""
    records = []
    # Track IDs to handle duplicates (same report+rec, different agency)
    id_counts = {}
    # Track recommendation text by (report_raw, rec_no) for rows with None rec text
    rec_text_by_key = {}

    for raw in raw_rows:
        report_raw = str(raw["report_raw"]).strip() if raw["report_raw"] else ""
        rec_no_raw = raw["rec_no_raw"]
        rec_no = int(rec_no_raw) if rec_no_raw is not None else 0
        recommendation = str(raw["recommendation_raw"]).strip() if raw["recommendation_raw"] else None
        agency = str(raw["agency_raw"]).strip() if raw["agency_raw"] else ""
        status = str(raw["status_raw"]).strip() if raw["status_raw"] else ""
        notes = str(raw["notes_raw"]).strip() if raw["notes_raw"] else None

        report_name, report_date, report_date_raw = parse_report_field(report_raw)
        if not report_name:
            continue

        report_slug = slugify(report_name)
        report_url = url_cache.get(report_name)

        # Fill in missing recommendation text from a previous row with same report+rec
        rec_key = (report_raw, rec_no)
        if recommendation:
            rec_text_by_key[rec_key] = recommendation
        elif rec_key in rec_text_by_key:
            recommendation = rec_text_by_key[rec_key]

        # Generate stable unique ID
        base_id = f"{report_slug}-{rec_no}"
        id_counts[base_id] = id_counts.get(base_id, 0) + 1
        count = id_counts[base_id]
        rec_id = base_id if count == 1 else f"{base_id}-{count}"

        records.append({
            "id": rec_id,
            "report_name": report_name,
            "report_date": report_date,
            "report_date_raw": report_date_raw,
            "report_url": report_url,
            "rec_no": rec_no,
            "recommendation": recommendation,
            "agency": agency,
            "status": status,
            "notes_2026": notes if notes else None,
            "report_slug": report_slug,
        })

    return records


# ===== Output =====
def write_output(records, output_file):
    today = date.today().strftime("%Y-%m-%d")
    path = Path(output_file)
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, "w") as f:
        f.write(f"// Generated by odca_converter.py — Last updated: {today}\n")
        f.write("const ODCA_DATA = ")
        json.dump(records, f, indent=2, default=str)
        f.write(";\n")

    print(f"\nWrote {len(records)} recommendations to {output_file}")


# ===== Summaries =====
def write_summaries(summaries_csv, summaries_file):
    summaries = {}
    csv_path = Path(summaries_csv)
    if not csv_path.exists():
        print(f"Warning: summaries CSV not found: {summaries_csv}")
        return
    with open(csv_path, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            if row.get('summary'):
                summaries[row['report_name']] = row['summary']

    out_path = Path(summaries_file)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(f'const REPORT_SUMMARIES = {json.dumps(summaries, indent=2, ensure_ascii=False)};\n')
    print(f'Wrote summaries.js ({len(summaries)} entries)')


# ===== Main =====
def main():
    parser = argparse.ArgumentParser(description="ODCA Audit Recommendations Converter")
    parser.add_argument("--no-scrape", action="store_true",
                        help="Skip URL scraping; use existing cache only")
    parser.add_argument("--from-cache-only", action="store_true",
                        help="Regenerate data.js from cache without HTTP requests")
    args = parser.parse_args()

    url_cache = load_cache(CONFIG["CACHE_FILE"])

    # Read XLSX
    print(f"Reading {CONFIG['XLSX_FILE']}...")
    raw_rows = read_xlsx(CONFIG["XLSX_FILE"])
    print(f"  Read {len(raw_rows)} rows")

    # Collect unique report titles
    unique_titles = []
    seen_titles = set()
    for raw in raw_rows:
        report_name, _, _ = parse_report_field(raw.get("report_raw"))
        if report_name and report_name not in seen_titles:
            seen_titles.add(report_name)
            unique_titles.append(report_name)
    print(f"  Found {len(unique_titles)} unique reports")

    # URL scraping via WP API
    if not args.from_cache_only and not args.no_scrape:
        print("\n=== Matching Report URLs via dcauditor.org WP API ===")
        session = requests.Session()
        updated = fetch_and_match_urls(unique_titles, session, url_cache)
        if updated:
            save_cache(url_cache, CONFIG["CACHE_FILE"])
            print(f"Cache updated: {CONFIG['CACHE_FILE']}")
    else:
        print("\n=== Skipping URL scraping (using cache) ===")

    # Show URL match summary
    found = sum(1 for t in unique_titles if url_cache.get(t))
    print(f"URLs found: {found}/{len(unique_titles)}")

    # Build records
    print("\n=== Building records ===")
    records = build_records(raw_rows, url_cache)
    print(f"  Built {len(records)} records")

    # Write output
    write_output(records, CONFIG["OUTPUT_FILE"])

    # Write summaries.js
    write_summaries(CONFIG["SUMMARIES_CSV"], CONFIG["SUMMARIES_FILE"])


if __name__ == "__main__":
    main()
