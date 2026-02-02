# Oshiwara Places — Place Intelligence Aggregator

## Live URL
https://oshiwara-places.vercel.app

## What This Is
A place review aggregator for Oshiwara, Andheri West, Mumbai. Aggregates data from 7 sources into one searchable, filterable, map-enabled static website. Think "Yelp meets Google Maps" for one neighborhood.

## Current State
- **v2 deployed on Vercel** via GitHub auto-deploy
- **Repo**: github.com/darshanl37/oshiwara-places
- Static site — no backend, no build step, vanilla HTML/CSS/JS

## Data Stats
- **521 places** total
- **300 real photos** (resolved from Google Places Photo API at build time)
- **1,000+ Google reviews** (detailed, for top 200 places)
- **16 places with Zomato ratings** + 12 with Zomato review excerpts
- **28 places with multi-source data**
- **7 data sources**: Google Places, Zomato, MagicPin, TripAdvisor, Practo, Slurrp, BhukkadCompany

## Architecture
```
index.html    — Single page app structure
styles.css    — Light warm theme, mobile-first, Inter + DM Serif Display fonts
app.js        — Vanilla JS: search, filters, map, cards, modal, lazy loading
data.js       — All 521 places as const PLACES = [...], includes GOOGLE_MAPS_KEY (public/restricted)
```

### Data Pipeline (build-time, not in repo)
```
places_raw.json        — 507 places from Google Places Nearby Search API
places_detailed.json   — Top 200 enriched with Place Details API (reviews, hours, phone, website)
zomato_data.json       — 27 restaurants scraped via web search (Zomato blocks direct fetch)
photo_urls.json        — 300 resolved photo URLs from Google Places Photo API
places_merged.json     — Merged Google + blog + Practo + TripAdvisor data
places_final.json      — Final merged dataset with photos + Zomato
merge_data.py          — Fuzzy name-matching merge script
```
These build files are gitignored. Only the 4 frontend files are in the repo.

## API Keys Used (build-time only)
- **Google Places/Maps**: `GOOGLE_MAPS_KEY` in data.js (public, restricted to Maps JS API + Places)
- **YouTube**: Key exists but YouTube Search API is disabled on the project — needs enabling in Google Cloud Console
- Keys live in `/home/nvidia/the-list/.env.local`

## Features Built
- Hero section with source badges
- Stats bar (521 places, 1000+ reviews, 7 sources, 300+ photos)
- Interactive Google Maps with colored markers by category
- Sticky filter bar: category pills, sort, rating filter, "has reviews" toggle
- Responsive card grid with real photos (gradient fallback for places without)
- Source badges on cards (Google, Zomato, MagicPin, TripAdvisor, Practo, Blog)
- Detail modal: multi-source ratings, editorial summary, reviews with rating breakdown, hours, contact, links
- Zomato review excerpts + Zomato ratings displayed alongside Google ratings
- Lazy loading images, infinite scroll, debounced search

## What's NOT Working / Next Steps
1. **More Zomato data** — Zomato blocks direct scraping (ECONNRESET). Need headless browser (Puppeteer) or their API
2. **Swiggy** — Returns 403. Same situation
3. **Practo** — Client-side rendered, needs Puppeteer to scrape doctor/clinic pages
4. **YouTube videos** — API key has Search endpoint disabled. Enable "YouTube Data API v3" in Google Cloud Console, then re-run search queries to embed food vlogs
5. **Instagram** — Needs auth, not feasible without official API access
6. **JustDial** — Search page didn't return results with WebFetch; needs different approach
7. **Better name matching** — Fuzzy matching between Google and Zomato names is imperfect (Google has "Woodside Inn - Andheri", Zomato has "Woodside Inn")
8. **User wants mobile app** — After webapp approval, build phone app (framework TBD)
9. **More photos** — Only 300/521 places have photos. Could use Zomato/blog images

## Design Philosophy
Following Karpathy's CLAUDE.md principles:
- No unnecessary abstractions — vanilla JS, no frameworks
- Every line serves a purpose
- Simplicity first — static site, no build step, no backend
- Surgical changes when updating

## Category Mapping
Google types → human-readable: restaurant, cafe, bar, bakery, gym, spa, beauty_salon, doctor, dentist, hospital, pharmacy, store, etc. The app.js `getCategory()` function maps these to 5 display categories: Food & Drinks, Health & Medical, Beauty & Wellness, Shopping, Services.
