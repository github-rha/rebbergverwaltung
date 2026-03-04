# Roadmap — Rebbergverwaltung

## 0.1.0 — Foundation (pre-season)

Get the app shell running and prove the capture-to-analysis loop works end-to-end.

- [ ] PWA scaffolding (installable, Service Worker, offline shell)
- [ ] Vineyard & parcel setup (create/select vineyard, define rows)
- [ ] Video capture screen (MediaRecorder, row/direction metadata, GPS track)
- [ ] Local storage (IndexedDB for videos and working state)
- [ ] Upload queue with status tracking (LOCAL_ONLY → UPLOADING)
- [ ] Settings screen (GitHub repo & PAT, Google API key — stored locally)
- [ ] Gemini API integration (send video, receive per-vine BBCH results)
- [ ] Video processing state machine (UPLOADING → PROCESSING → DONE / FAILED)
- [ ] VineMap build from early-season scan (vine indices + approximate positions)
- [ ] Data model implementation (Vineyard, Parcel, Scan, RowVideo, VineMap, BbchResult)
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
