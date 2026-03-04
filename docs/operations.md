# Operations — Rebbergverwaltung

## Deployment

```
  Developer pushes to main
         │
         ▼
  ┌──────────────────────────────┐
  │  GitHub Actions CI           │
  │                              │
  │  1. npm ci                   │
  │  2. run tests                │
  │  3. npm run build            │
  │  4. deploy to GitHub Pages   │
  └──────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────┐
  │  GitHub Pages                │
  │  (static files served via    │
  │   CDN, HTTPS by default)     │
  └──────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────┐
  │  User's phone                │
  │  Service Worker updates      │
  │  cached app shell on next    │
  │  visit (or via manual        │
  │  refresh)                    │
  └──────────────────────────────┘
```

- **No custom backend** — the app is static files + direct API calls to
  Gemini. There is no server process or container to operate.
- **Deployment is a git push** — GitHub Actions builds and deploys
  automatically.

## Scaling

Not applicable in the traditional sense. This is a single-user PWA:

- Video capture and local storage happen entirely on-device.
- Video analysis calls the **Gemini API** directly from the client using
  the user's own API key.
- GitHub Pages CDN handles static asset delivery.
- Structured results (BBCH data, VineMap, scan metadata) are committed
  to a **Git repository** — small JSON/CSV files, well within limits.
- Videos are stored temporarily in IndexedDB and purged after processing.

## Monitoring

| What                      | How                                         |
|---------------------------|---------------------------------------------|
| App availability          | GitHub Pages status (status.github.com)     |
| Build / deploy failures   | GitHub Actions notifications (email)        |
| Client-side errors        | Browser console (no telemetry — privacy)    |
| Gemini API failures       | In-app status per video (FAILED state, retry option) |
| Data integrity            | Schema validation on results; CI runs checks on committed data |

No external monitoring service — the app is private and has one user.
If something breaks, the user sees it immediately.

## Recovery

| Scenario                  | Recovery path                               |
|---------------------------|---------------------------------------------|
| Lost/broken phone         | Pull structured results from GitHub repo to new device. Re-record videos if needed (results are retained). |
| Corrupted IndexedDB       | Force-pull from GitHub overwrites local state. Videos in progress may need re-recording. |
| Bad deploy                | Revert commit on `main`; Pages redeploys. Service Worker picks up fix on next visit. |
| Gemini API outage         | Videos queue locally (LOCAL_ONLY). Upload and process when API is back. |
| Lost scan results         | Data is in git history — recoverable via `git log` / `git checkout`. |
| GitHub outage             | App works fully offline (capture continues). Sync resumes when GitHub is back. |

The GitHub repo is the disaster recovery mechanism for structured results.
Videos are ephemeral by design — they are purged after processing, and
results (BBCH per vine) are the durable artifact.
