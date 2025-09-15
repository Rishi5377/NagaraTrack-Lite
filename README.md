# NagaraTrack Lite (SIH Project)

 Live Demo: https://Rishi5377.github.io/NagaraTrack-Lite-SIH-Project/

**🚀 Deployment Status:**
- ✅ GitHub Pages (Frontend): Automated deployment on push to main
- ✅ Docker Container (Fullstack): Automated build on push to main  
- ✅ Local Development: Docker Compose ready

📖 **[Deployment Guide](./DEPLOYMENT.md)** - Complete deployment instructions

A lightweight, hackathon-ready bus tracking platform built with a CSV-backed FastAPI API, a modern React PWA, and Dockerized infrastructure. It supports quick demos without live GPS, while leaving room to scale to GTFS-RT and Traccar-based real-time tracking.

---

## Highlights

- Interactive map with stops, routes (polylines), and vehicles
- CSV-mode data persistence (import/export) — no database required to demo
- Auto-derived route polylines from stop coordinates; "Rebuild coordinates" button to persist
- Real-time updates: data imports instantly refresh map view, active routes, and polylines
- Event-driven frontend refresh: edits in Data pages immediately update the map
- Docker Compose stack with backend, frontend, and Postgres (optional)
- Clean TypeScript + Tailwind UI and a small API client

---

## Architecture Overview

- Backend: FastAPI (Python), serves CSV-mode APIs; can derive and persist route polylines
- Frontend: Vite + React + TypeScript + Tailwind; Leaflet map; data admin pages
- Bot: Telegram bot scaffold (optional; token required)
- Infra: Docker Compose; optional Postgres; Traccar scaffold commented

Service URLs (default):
- Frontend PWA: http://localhost:5000
- Backend API: http://localhost:8000
- Postgres: localhost:5432 (optional)

---

## Installation & Setup (Windows-friendly)

Prerequisites:
- Docker Desktop (with WSL 2 backend)
- Make (optional; you can use VS Code tasks or raw docker compose commands)

Start services:

```powershell
# From repo root
# Option A: using Make tasks
make build; make up; make status

# Option B: using VS Code tasks
# Run: "compose up -d" (rebuild if needed)

# Option C: raw docker compose
docker compose up -d --build
```

Open:
- Frontend: http://localhost:5000
- Backend docs: http://localhost:8000/docs

Stop/clean:

```powershell
docker compose down -v --remove-orphans
```

---

## Using the Website (Quick Tour)

1) Map Dashboard
- See routes as colored polylines and stops as markers
- Vehicle markers (dummy CSV-mode) demonstrate live-tracking visuals
- Zoom/pan and click markers for details

2) Data Pages (BusStops, Routes, Vehicles)
- Import: Load JSON (array of objects) or simple CSV for quick population
- Export: Save current table to a JSON file
- Schema: Shows expected fields (aligned with Base 44 Entities)
- Delete All: Clear a data set
- Add: Create a single stop/route/vehicle

3) Rebuild Polylines
- After editing/importing stops or routes, open Data → Route → ⋯ → "Rebuild coordinates"
- This persists derived [lat, lon] pairs into `data/Routes.csv` and refreshes the map

4) Active Routes Panel
- Home page lists active routes; clicking highlights the route on the map

---

## Data Admin: CSV Mode & Base 44 Schemas

Data lives in `data/` as CSV, updated via the API/UI.

- BusStop: { stop_id, name, latitude, longitude, routes?, accessibility? }
- Route: { route_id, route_name, route_color, is_active?, coordinates?: [lat,lon][], stops?: string[] }
- Vehicle: { vehicle_id, route_id, latitude, longitude, bearing?, speed?, status?, last_updated? }

Import tips:
- Prefer JSON array (cleanest). CSV with headers also works (simple parser in UI).
- The backend is tolerant of messy list strings (e.g., nested quotes) when parsing routes/stops.

Polyline derivation:
- The backend collects all route stops (explicit + derived + scanned) and connects them using a nearest-neighbor path, so no stop is left isolated if its coordinates are known.
- Rebuild coordinates persists the computed path to CSV for faster reloads.

---

## API Overview

- GET /api/stops → GeoJSON of stops
- GET /api/routes → list of routes with coordinates/stops
- GET /api/routes/geojson → GeoJSON features (polylines): [lon, lat]
- POST /api/routes/rebuild-coordinates → persist derived coordinates to CSV
- CRUD and bulk import for stops/routes/vehicles

Explore at http://localhost:8000/docs.

---

## Troubleshooting

- Editor "Problems" in local TS don’t affect Docker builds; the containers compile the app.
- If polylines look sparse, run "Rebuild coordinates" and refresh.
- Port conflicts? Adjust `docker-compose.yml` ports.
- Telegram bot disabled unless `TELEGRAM_BOT_TOKEN` is set.

Security checklist before pushing:
- Do not commit `.env` files; use `.env.example` for placeholders.
- Avoid hardcoding credentials in `docker-compose.yml`; use `${VARS}` from `.env`.
- Review `data/` for any sensitive or private datasets before publishing.

---

## Future Enhancements

- Smarter polyline ordering: 2-opt/3-opt pass to reduce crossings and improve path quality
- GTFS-RT integration end-to-end, with optional Traccar live GPS ingestion
- Persist to Postgres/PostGIS with migrations; CSV import/export maintained for admin
- Real-time websockets for vehicle positions and toast notifications on updates
- Role-based admin UI with audit logs; bulk inline editing
- Geofencing and alerts (e.g., ETA, dwell-time analytics)
- Theming and offline map tiles for field demos

---

## Hosting Options (One Link)

You have two practical paths:

1) Frontend-only via GitHub Pages + Hosted Backend
	- Push `frontend-pwa/dist` to GitHub Pages.
	- Set `VITE_API_URL` at build time to point to your hosted backend (Render/Railway/Fly/Cloud Run).
	- Pros: Free/cheap static hosting. Cons: CORS/config across two origins.

	Build and deploy (locally):
	```powershell
	cd frontend-pwa
	$env:VITE_API_URL="https://your-backend.example.com"
	npm run build
	# Deploy ./dist to GitHub Pages (e.g., actions or manual)
	```

		 Deploy via GitHub Actions (recommended):
		 - Set repository → Settings → Pages → Build and deployment: GitHub Actions
		 - Add secret `PAGES_BACKEND_URL` → your hosted backend (e.g., from Render)
		 - On push to main, the workflow publishes your site at:
			 - Organization/User site: https://<user>.github.io/<repo>/
			 - Copy this link and paste it near the top of this README under “Live Demo”.

2) Single-link fullstack container (recommended)
	- Build one image that serves API and static frontend together (same origin).
	- We added `Dockerfile.fullstack` for this.
	- Deploy the image to a container host (Render, Railway, Fly.io, Cloud Run, Azure Web Apps for Containers).

	GitHub Actions will build and push the image on commit to main if you add Docker Hub secrets:
	- `DOCKERHUB_USERNAME`
	- `DOCKERHUB_TOKEN`

	Then configure your PaaS to run:
	- Image: `your-dockerhub-user/nagaratrack-fullstack:latest`
	- Expose port 8000
	- Optional env:
	  - `DATA_DIR=/app/data` (mounted volume if you want persistence)
	  - `FRONTEND_DIST=/app/frontend-dist`

	Result: One URL (e.g., `https://nagaratrack.example.com`) serving both frontend and API.

---

## Contributing

- Standard PR workflow. Keep patches focused.
- For UI changes, include screenshots or short Looms.
- For backend changes, add small integration tests where possible.

---

## License

MIT (or update if different).
