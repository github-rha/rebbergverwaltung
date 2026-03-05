# Roadmap — Rebbergverwaltung

## 0.1.0 — App shell + data model + settings

Scaffold the project, persist data locally, and prove the app shell works.

- [x] PWA scaffolding (installable, Service Worker, offline shell)
- [x] Data model implementation (Vineyard, Scan, RowVideo, VineMap, BbchResult)
- [x] Storage layer (IndexedDB via idb-keyval)
- [x] Vineyard setup (create/select vineyard, configurable row count and direction)
- [x] Settings screen (GitHub repo & PAT, Google API key — stored locally; delete vineyard)
- [x] Unit & integration tests (data model, storage, CRUD)

**Exit criteria:** App runs locally, vineyard data persists across reloads, settings save/load, tests pass.

---

## 0.1.1 — Video capture + upload queue

Record row videos and queue them for processing.

- [x] Scan CRUD (create/list/delete scans per vineyard)
- [x] Video capture screen (MediaRecorder, row/direction from vineyard config, GPS start/end)
- [x] Local video storage (IndexedDB for video blobs)
- [x] Upload queue with status tracking (LOCAL_ONLY — display only, upload in 0.1.2)

**Exit criteria:** Record a row video, see it queued locally, status updates work.

---

## 0.1.2 — Gemini integration + VineMap + Git sync + CI/CD

Close the capture-to-analysis loop end-to-end.

- [ ] Gemini API integration (send video, receive per-vine BBCH results)
- [ ] Video processing state machine (UPLOADING → PROCESSING → DONE / FAILED)
- [ ] VineMap build from early-season scan (vine indices + approximate positions)
- [ ] Git-based result storage (commit structured results to repo)
- [ ] CI/CD pipeline (GitHub Actions → GitHub Pages)

**Exit criteria:** Record a row, upload, get BBCH results back, see them in the app.

---

## 0.2.0 — MVP (first full season)

Complete the product for a single user running ~8 scans across one season.

- [ ] Scan results heatmap (Row × Vine BBCH)
- [ ] Derived layers: "ahead/behind" (deviation from median), heterogeneity
- [ ] Vine detail screen (BBCH time series across scans)
- [ ] Later-season tracking using VineMap as positional anchor
- [ ] Video purge after DONE (free device storage)
- [ ] CSV export (per scan, per vine time series)
- [ ] Retry / re-record for FAILED videos
- [ ] Offline capture with deferred upload (Wi-Fi only option)

**Exit criteria:** [Success criteria from vision](vision.md#success-criteria) — per-vine BBCH maps at ~8 timepoints, visible zones, exportable data.

---

## 0.3.0 — Confidence & review

- [ ] Confidence UI (flag low-confidence vines for manual review)
- [ ] Review workflow (accept / override BBCH prediction)

---

## 0.4.0 — Yield estimation

- [ ] Per-vine / per-row yield predictions from video analysis
- [ ] Yield heatmap and trend views

---

## 0.5.0 — Plant health monitoring

- [ ] Seasonal disease detection (e.g., Falscher Mehltau) — severity tracking per vine
- [ ] Terminal disease detection (e.g., Esca) — flag vines for replacement
- [ ] Health status overlay on heatmap

---

## 0.6.0 — Extended video analytics

- [ ] Canopy density estimation
- [ ] Fruit zone visibility scoring

---

## 0.7.0 — Multi-parcel comparison

- [ ] Neighbor parcel comparison (same scan workflow)
- [ ] "Sync" metrics (BBCH differences, zone comparisons across parcels)

---

## 0.8.0 — Drone-based capture

- [ ] Programmed flight path with steady velocity
- [ ] Eliminates pace variation; improves consistency and coverage

---

## Future / unscheduled

- Long-term video archival (blob storage for model retraining / audit)
- Geo/shape export (georeferenced VineMap)
- Multi-user support / authentication
