# Architecture — Rebbergverwaltung

This document describes the **technical architecture** for the vineyard management system. For product vision, goals, and user-facing design, see [vision.md](vision.md).

---

## System boundaries

```
  ┌──────────────────────────────────────────────────────────┐
  │  User's phone                                            │
  │                                                          │
  │  ┌────────────────────────────────────────────────────┐  │
  │  │  Browser / PWA shell                              │  │
  │  │                                                    │  │
  │  │  ┌──────────────────────────────────────────────┐  │  │
  │  │  │  Rebbergverwaltung PWA                       │  │  │
  │  │  │                                              │  │  │
  │  │  │  UI layer ←→ Data layer ←→ Storage layer     │  │  │
  │  │  └──────────────────┬───────────────────────────┘  │  │
  │  │                     │ uses                         │  │
  │  │       ┌─────────────┴──────────────┐               │  │
  │  │       │  Browser-provided storage  │               │  │
  │  │       │  • IndexedDB (data+videos) │               │  │
  │  │       │  • Service Worker (app     │               │  │
  │  │       │    shell offline cache)    │               │  │
  │  │       └─────────────┬──────────────┘               │  │
  │  └─────────────────────┼──────────────────────────────┘  │
  └────────────────────────┼─────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
   ┌──────────────────────┐  ┌──────────────────────┐
   │  GitHub (private repo)│  │  Google Gemini API   │
   │                      │  │                      │
   │  vineyard.json       │  │  Video → per-vine    │
   │  (BBCH results,      │  │  BBCH results        │
   │   VineMap, scans)    │  │                      │
   └──────────────────────┘  └──────────────────────┘
     HTTPS + PAT               HTTPS + API key
     (manual sync)             (on upload)
```

**Trust boundary**: everything inside the PWA is trusted. External systems
are the private GitHub repo (manual sync, PAT auth) and the Gemini API
(video analysis, user-supplied API key). Both are accessed over HTTPS
and only when explicitly triggered by the user.

---

## Components

### UI layer

Renders views, handles touch input, and dispatches user intents to the
data layer.

| View            | Responsibility                               |
|-----------------|----------------------------------------------|
| Home            | Vineyard selector, scan list, upload queue status, new scan button, export, settings gear icon. |
| New Scan        | Scan name/date (auto), "Record Row" button.  |
| Record Row      | Row selector, direction selector, start/stop recording with GPS track, clip saved locally. |
| Upload Queue    | List of clips with status (LOCAL_ONLY / UPLOADING / PROCESSING / DONE / FAILED), retry, "Wi-Fi only" toggle. |
| Scan Results    | Heatmap (Row × Vine BBCH), filter for low confidence / review. |
| Vine Detail     | BBCH time series across scans, related media. |
| Settings        | GitHub repo URL & PAT, Google API key. Accessed via gear icon on Home. |

### Data layer

Manages in-memory state, validates changes, and mediates between UI and
storage.

- **Scan store**: CRUD on scans — create, list, delete.
- **Video store**: manages RowVideo lifecycle (record, queue, track status).
- **Result store**: stores and queries BbchResult and VineMap data.
- **Sync engine**: implements push/pull protocol to GitHub repo.
- **AI engine**: sends videos to Gemini API, parses results, updates status.

### Storage layer

Persists data locally and provides the interface for remote sync.

```
┌─────────────────────────────────────────────────────────┐
│                    Storage layer                         │
│                                                         │
│  ┌─────────────────────┐   ┌─────────────────────────┐  │
│  │  Local persistence   │   │  Remote persistence     │  │
│  │                      │   │                          │  │
│  │  IndexedDB            │   │  GitHub Contents API    │  │
│  │  • vineyard.json     │   │  • vineyard.json        │  │
│  │  • video blobs       │   │  (structured results)   │  │
│  │  • credentials       │   │                          │  │
│  └─────────────────────┘   └─────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Service Worker                                     │ │
│  │  • Caches app shell for offline launch              │ │
│  │  • Does NOT cache data (data lives in IndexedDB)    │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## App Platform: Progressive Web App (PWA)

The app is a **PWA** — no app store, installable from the browser. Key browser APIs:

- **MediaRecorder API** — video capture in the field
- **Geolocation API** — GPS track alongside video (where available)
- **IndexedDB / Cache API** — offline storage for videos, metadata, and working state

---

## AI Pipeline: Gemini Video Analysis

Video analysis uses the **Gemini API** with native video understanding:

- **Send full row video** to Gemini — no client-side frame extraction needed
- Gemini handles both **vine identification** (stock-to-stock segmentation) and **BBCH classification** in a single call
- Output: one `bbch_pred` per vine, plus `confidence` score
- Model version is recorded with every result for traceability

---

## Data Storage

| Layer | Technology | Content |
|-------|-----------|---------|
| Client-side | IndexedDB | Videos, working state, upload queue |
| Credentials | IndexedDB | GitHub repo URL, GitHub PAT, Google API key — stored on-device, never leaves the client except in direct API calls |
| Structured results | Git repository | Per-vineyard data (BBCH results, VineMap, scan metadata) — versioned, diffable, shareable (same pattern as Kellerverwaltung) |

---

## Video Processing States

```
LOCAL_ONLY → UPLOADING → PROCESSING → DONE / FAILED
```

- `LOCAL_ONLY` — recorded, stored on-device
- `UPLOADING` — transfer to cloud in progress
- `PROCESSING` — Gemini analysis running
- `DONE` — results received and stored
- `FAILED` — error; retry or re-record

---

## Video Lifecycle

- Videos are stored **on-device** (IndexedDB) during capture and processing
- After processing reaches `DONE`, videos may be **purged from device** to free space
- Structured results (BBCH per vine) are tiny and always retained
- Long-term video archival (e.g., for model retraining or audit) is **post-MVP** (cheap blob storage when needed)

---

## Computer Vision Pipeline (MVP Strategy)

The pipeline must identify **individual vines within a row** and output BBCH per vine.

### Two-Phase Approach

#### 1. VineMap Build (early season)
- In early scans (around BBCH 09–12), trunks/vine heads are more visible
- Build `VineMap`:
  - Vine indices along the row (Vine 1..N)
  - Approximate position along row (from stock detection + GPS if available)

#### 2. Tracking & Inference (later season)
- Use `VineMap` as a positional anchor
- Assign video segments to vine indices even when the canopy becomes continuous
- Aggregate multiple frames per vine into a final `bbch_pred`

### Output Policy
- Always output exactly **one** BBCH value (`bbch_pred`)
- Store `confidence` internally
- Optional UI "review" flag for low-confidence vines

---

## Data Model

### Entities

- **Vineyard** — `id`, `name` (top-level; user can switch between vineyards)
- **Parcel** — `id`, `vineyard_id`, `name`
- **Scan** — `id`, `parcel_id`, `created_at`, `note`
- **RowVideo** — `id`, `scan_id`, `row_number`, `direction`, `local_uri`, `cloud_uri`, `status`, `created_at`
- **VineMap** — `id`, `parcel_id`, `row_number`, `vine_index`, `position_m_along_row`, `status` (present | missing | dead), `created_at`
- **BbchResult** — `id`, `scan_id`, `row_number`, `vine_index`, `bbch_pred`, `confidence`, `model_version`, `created_at`

---

## Exports

- **CSV per scan:** `scan_id, date, row_number, vine_index, bbch_pred, confidence(optional)`
- **CSV per vine time series:** `row_number, vine_index, scan_date, bbch_pred`
- Later: Geo/shape export if VineMap becomes georeferenced

---

## Data flows

### 1. Record a row video

```
 User                UI               Data layer          Local storage
  │                   │                    │                    │
  │  select row +     │                    │                    │
  │  start recording  │                    │                    │
  │──────────────────>│                    │                    │
  │                   │  MediaRecorder +   │                    │
  │                   │  Geolocation start │                    │
  │  ...walking...    │                    │                    │
  │  stop recording   │                    │                    │
  │──────────────────>│                    │                    │
  │                   │  createRowVideo()  │                    │
  │                   │───────────────────>│                    │
  │                   │                    │  write video blob  │
  │                   │                    │───────────────────>│
  │                   │                    │  status=LOCAL_ONLY │
  │                   │  saved             │                    │
  │  confirm          │<───────────────────│                    │
  │<──────────────────│                    │                    │
```

### 2. Upload & process video

```
 User         UI          AI engine         Local storage       Gemini API
  │            │               │                  │                │
  │  tap upload│               │                  │                │
  │  (or auto) │               │                  │                │
  │───────────>│               │                  │                │
  │            │  process()    │                  │                │
  │            │──────────────>│                  │                │
  │            │               │  read video blob │                │
  │            │               │─────────────────>│                │
  │            │               │  status=UPLOADING│                │
  │            │               │                  │                │
  │            │               │  POST video to Gemini             │
  │            │               │────────────────────────────────->│
  │            │               │  status=PROCESSING               │
  │            │               │                                  │
  │            │               │  BBCH results per vine            │
  │            │               │<─────────────────────────────────│
  │            │               │  store BbchResults│               │
  │            │               │─────────────────->│               │
  │            │               │  status=DONE      │               │
  │            │  results ready│                   │               │
  │  see status│<──────────────│                   │               │
  │<───────────│               │                   │               │
```

### 3. Push results to GitHub

```
 User         UI          Sync engine       Local storage       GitHub
  │            │               │                  │                │
  │  tap sync  │               │                  │                │
  │───────────>│               │                  │                │
  │            │  push()       │                  │                │
  │            │──────────────>│                  │                │
  │            │               │  read vineyard   │                │
  │            │               │  .json           │                │
  │            │               │─────────────────>│                │
  │            │               │                  │                │
  │            │               │  PUT vineyard.json                │
  │            │               │────────────────────────────────->│
  │            │               │                          200 OK  │
  │            │               │<─────────────────────────────────│
  │            │  sync complete│                                  │
  │  confirm   │<──────────────│                                  │
  │<───────────│               │                                  │
```

---

## Offline behavior

```
                  ┌──────────────────────────┐
                  │     App launch           │
                  └────────────┬─────────────┘
                               │
                  ┌────────────▼─────────────┐
                  │  Service Worker serves   │
                  │  cached app shell        │
                  └────────────┬─────────────┘
                               │
                  ┌────────────▼─────────────┐
                  │  Data layer loads from   │
                  │  IndexedDB               │
                  └────────────┬─────────────┘
                               │
                  ┌────────────▼─────────────┐
              ┌───│  Network available?      │───┐
              │   └──────────────────────────┘   │
             yes                                  no
              │                                   │
  ┌───────────▼──────────┐          ┌─────────────▼──────────┐
  │  Full functionality  │          │  Capture mode only     │
  │  • record videos     │          │  • record videos       │
  │  • upload & process  │          │  • videos queue locally│
  │  • sync to GitHub    │          │  • no upload/sync      │
  └──────────────────────┘          └────────────────────────┘
```

All reads and writes work against local storage. The network is only
needed for Gemini analysis and GitHub sync. The app never blocks on
connectivity — videos queue until a connection is available.

---

## Stack decisions

| Layer         | Choice             | Rationale                                                  |
|---------------|--------------------|------------------------------------------------------------|
| Language      | **TypeScript**     | Type safety for the data model, broad PWA tooling support. |
| Framework     | **SvelteKit 2 + Svelte 5** | Tiny runtime, fast startup on mobile, built-in static adapter for GitHub Pages. Same stack as Kellerverwaltung. |
| Styling       | **Tailwind CSS 4** | Utility-first keeps CSS small, works well with Svelte. |
| Build tool    | **Vite**           | Fast HMR, tree-shaking, native PWA plugin (`@vite-pwa/sveltekit`). |
| Local storage | **IndexedDB** (via `idb-keyval`) | Async, handles large video blobs. Works in Safari PWA context. |
| Remote sync   | **GitHub Contents API** | Same pattern as Kellerverwaltung. PAT auth, manual push/pull. |
| AI            | **Gemini API**     | Native video understanding — no frame extraction needed. Direct client-side calls. |
| Hosting       | **GitHub Pages**   | Free, zero-ops static hosting via SvelteKit static adapter. |
| CI            | **GitHub Actions** | Co-located with repo, runs tests and deploys on push to `main`. |

---

## Testing strategy

### Test pyramid

```
         ╱  ╲
        ╱ E2E╲         ~5 tests
       ╱──────╲        PWA smoke tests (record, upload, view results)
      ╱ Integr. ╲      ~15 tests
     ╱────────────╲     Store ↔ IndexedDB, Gemini response parsing, sync
    ╱    Unit      ╲    ~30 tests
   ╱────────────────╲   Data transforms, state machine, VineMap logic
```

- **Unit tests** (Vitest): pure functions — state machine transitions, data transforms, VineMap operations, export formatting.
- **Integration tests** (Vitest + `fake-indexeddb`): data layer against IndexedDB, Gemini response parsing, sync protocol paths.
- **E2E tests** (Playwright, WebKit): critical flows — record row → upload → see results; offline capture queues correctly.

### CI pipeline

```
  push / PR to main
        │
        ▼
  ┌─────────────────────────────────────────────┐
  │  GitHub Actions                              │
  │                                              │
  │  ┌─────────────┐  ┌──────────────────────┐  │
  │  │ Lint + types │  │ Schema validation    │  │
  │  │ (parallel)   │  │                      │  │
  │  └──────┬───────┘  └──────────┬───────────┘  │
  │         └──────────┬──────────┘              │
  │                    ▼                         │
  │         ┌──────────────────┐                 │
  │         │ Unit + integration│                 │
  │         │ tests (Vitest)    │                 │
  │         └────────┬─────────┘                 │
  │                  ▼                           │
  │         ┌──────────────────┐                 │
  │         │ Build (Vite)     │                 │
  │         └────────┬─────────┘                 │
  │                  ▼                           │
  │         ┌──────────────────┐                 │
  │         │ E2E (Playwright) │                 │
  │         │ (WebKit only)    │                 │
  │         └────────┬─────────┘                 │
  │                  ▼                           │
  │         ┌──────────────────┐                 │
  │         │ Deploy to Pages  │  (main only)    │
  │         └──────────────────┘                 │
  └─────────────────────────────────────────────┘
```

---

## Security model

### Authentication & authorization

- **App shell**: served from GitHub Pages, public, no authentication.
- **Data sync**: authenticated via a GitHub PAT with `repo` scope on the private data repository.
- **Video analysis**: authenticated via a Google API key sent directly to the Gemini API.
- **No server-side sessions**: the app has no backend.

### Secret storage

The GitHub PAT and the Google API key are stored in the browser's
origin-scoped IndexedDB. Neither leaves the device except in HTTPS requests
to `api.github.com` and `generativelanguage.googleapis.com` respectively.

### Data classification

| Data                | Classification | Storage location   | Notes                                        |
|---------------------|----------------|--------------------|----------------------------------------------|
| Scan results (JSON) | Personal       | IndexedDB + GitHub | Vineyard data, not sensitive but private.    |
| Videos              | Personal       | IndexedDB (temp)   | Purged after processing. No long-term storage in MVP. |
| GitHub PAT          | Secret         | IndexedDB          | Grants repo access; treat as password.       |
| Google API key      | Secret         | IndexedDB          | Sent only to Google APIs over HTTPS.         |
| App shell (JS/CSS)  | Public         | GitHub Pages CDN   | Open source / not secret.                    |

---

## Technical Risks

1. **PWA browser support:** MediaRecorder API support varies across mobile browsers. iOS Safari in particular has historically lagged — needs testing on target devices.
2. **Cloud AI API costs:** Sending video to Gemini for ~380 vines × 8 scans/season — cost depends on API pricing and frame sampling.
3. **Vine segmentation accuracy:** Stock-to-stock detection is the core technical challenge. Early-season trunk visibility helps, but later scans with continuous canopy depend on the VineMap anchor holding up. Needs validation with real video.
4. **Positioning strategy:** Vine-to-frame mapping relies on stock detection + GPS (if available). GPS accuracy on mobile (~3–5 m) may not distinguish individual vines (~0.8 m apart) — stock detection must remain the primary signal.
