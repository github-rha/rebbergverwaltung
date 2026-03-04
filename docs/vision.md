# Vineyard Management Program – Vision (Per-Vine BBCH from Row Video)

## Goal
Build a mobile vineyard management system that records **BBCH stage per individual vine** at multiple moments in the season (e.g., **~8 full scans per season**). Data capture is done with **one video per row** recorded inside the app; analysis is performed by **cloud-based AI**. The result is a **BBCH map** (Row × Vine), per-vine time series, and analytics to reveal spatial patterns ("zones") and outliers.

---

## Core Use Case
1. User opens the app in the vineyard
2. Starts a new **BBCH Scan**
3. Records **one video per row** (consistent side, fruiting zone in view)
4. App stores videos offline and uploads later
5. Cloud AI returns **one BBCH number per vine**
6. App displays heatmaps, vine details, and exports

---

## Guiding Principles
- **Field-friendly:** feasible as a weekly habit; full scan ~30 minutes for ~10 rows
- **Per vine, not just per zone:** every vine receives a BBCH value
- **Standardization > cleverness:** capture protocol matters most
- **Traceable:** results are versioned (model version; confidence stored)
- **Offline-first:** record and queue uploads without connectivity

---

## Capture Protocol (MVP)

### Per Row (1 video)
- Training system: **single Guyot** (1 cane per vine). Vine boundaries are defined **stock-to-stock**. Stocks serve as the primary visual anchor for vine segmentation.
- Film from the **same side** every time
- Keep camera aimed at the **fruiting zone / mid canopy**
- Walk at a steady pace, avoid big pans (pace variation is a known limitation; no active mitigation in MVP)
- **No visual markers in the video** required

### In-app Metadata on Start
- Row number: 1..10
- Direction: top→bottom or bottom→top (dropdown)
- Optional note (e.g., "after rain", "leaf removal last week")

---

## Scan Schedule (Season Plan)
User performs around **8 full scans per season**. The scan dates are roughly planned (e.g., around BBCH 09/11/55/65/71/77/81/85), but:
- The model always outputs the **actual BBCH** per vine
- Vines can differ within a scan (heterogeneity is the point)

---

## Primary Objective: Zone Discovery
The system must make spatial patterns obvious:
- Heatmap per scan: **Row × Vine** BBCH
- Derived layers:
  - "Ahead/behind": BBCH deviation from parcel median
  - "Heterogeneity": variance per row / row segments
- Exportable data for deeper analysis

---

## Output per Vine
- `bbch_pred` (integer; *any* BBCH value can be output)
- `confidence` (0..1, stored internally; optional UI "review" flag for low confidence)
- Later (not MVP):
  - **Yield estimation** (per vine / per row)
  - **Plant health:** seasonal diseases (e.g., Falscher Mehltau) and terminal conditions requiring replacement (e.g., Esca)
  - Canopy density / fruit zone visibility

---

## Product Scope (MVP)

### Screens
1. **Home** — Vineyard selector, New Scan, Scans (list), Upload Queue, Export
2. **New Scan** — Scan name/date (auto), "Record Row" button
3. **Record Row** — Row selector, direction selector, start/stop recording with GPS track, clip saved locally
4. **Upload Queue** — List of clips with status, resumable upload, retry, optional "Wi-Fi only"
5. **Scan Results** — Heatmap (Row × Vine), filter for "low confidence / review"
6. **Vine Detail** — BBCH time series across scans, related media
7. **Settings** — GitHub repo & PAT, Google API key

### Offline Behavior
- Videos and metadata are stored locally on the device
- Upload when connectivity is available
- App clearly shows status: pending / uploaded / processing / done

> For technical implementation details (platform APIs, AI pipeline, data model, processing states), see [architecture.md](architecture.md).

---

## Quality & Field "Definition of Done"
A scan is considered "good" if:
- ≥ 95% of **present** vines per row receive a `bbch_pred`
- Results are stable against small pace/light variations
- Heatmap shows no systematic shifts (e.g., whole row offset by one vine)

---

## Roadmap (Post-MVP)
1. Confidence UI (show/flag low-confidence)
2. **Yield estimation:** per-vine / per-row yield predictions from video
3. **Plant health monitoring:**
   - Seasonal diseases (e.g., Falscher Mehltau) — detection and severity tracking
   - Terminal diseases (e.g., Esca) — flagging vines for replacement
4. Additional features from video:
   - canopy density
   - fruit zone visibility
5. Neighbor parcel comparison:
   - same scan workflow
   - "sync" metrics (BBCH differences, zone comparisons)
6. **Drone-based capture:** programmed flight path with steady velocity, eliminating pace variation and improving consistency

---

## Assumptions & Constraints
- Parcel size: ~10 rows × ~30 m; vine spacing ~0.8 m (~37–38 vines/row)
- Capture: 1 video per row, consistent side
- Start very early in season (currently BBCH ~0–3; first VineMap scan around BBCH 09–11)

---

## Risks
1. **Pace variation:** No active compensation in MVP. If the user speeds up or slows down significantly, vine-to-frame mapping may drift. Mitigated later by drone capture.
2. **Single-user MVP:** No authentication or multi-user support in MVP. Git-based results naturally support collaboration later.

---

## Success Criteria
Within one season, the system delivers:
- Per-vine BBCH maps at ~8 timepoints
- Visible "zones" (where vines are ahead/behind)
- Objective basis for management decisions (canopy/fruit zone timing)
- Clean data export for deeper analysis
