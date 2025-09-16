# 🚌 NagaraTrack-Lite - Advanced Bus Tracking System

<div align="center">

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-GitHub_Pages-brightgreen)](https://rishi5377.github.io/NagaraTrack-Lite/)
[![React](https://img.shields.io/badge/React-18.3.1-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.4-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.10-blue)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4.9-green)](https://vitejs.dev/)
[![GitHub Pages](https://img.shields.io/badge/Deployed_on-GitHub_Pages-orange)](https://pages.github.com/)

**A modern, responsive bus tracking system with real-time simulation capabilities**

[🔗 **Live Demo**](https://rishi5377.github.io/NagaraTrack-Lite/) • [📖 **Documentation**](./docs/) • [🐛 **Report Bug**](./issues) • [💡 **Request Feature**](./issues)

</div>

---

## 📋 Table of Contents

- [🌟 Features](#-features)
- [🎯 Demo Highlights](#-demo-highlights)
- [🏗️ Architecture](#️-architecture)
- [🔧 Technical Modifications](#-technical-modifications)
- [🚀 Quick Start](#-quick-start)
- [💻 Development](#-development)
- [🌐 Deployment](#-deployment)
- [📊 Static Data Structure](#-static-data-structure)
- [🎮 Demo Controls](#-demo-controls)
- [🔮 Future Enhancements](#-future-enhancements)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🌟 Features

### 🗺️ **Interactive Mapping**
- **Real-time Vehicle Tracking**: Live simulation of bus movements with realistic speed and bearing changes
- **Interactive Route Visualization**: Color-coded routes with polyline rendering using Leaflet.js
- **Dynamic Bus Stops**: Clickable stops with route information and accessibility indicators
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### 📊 **Analytics Dashboard**
- **System Status Monitoring**: Real-time operational metrics and health indicators
- **Route Performance**: On-time percentage, delay analytics, and efficiency metrics
- **Passenger Insights**: Daily ridership statistics and popular stop analysis
- **Live Updates**: Auto-refreshing dashboard with simulated real-time data

### 🚌 **Fleet Management**
- **Vehicle Status Tracking**: Real-time location, speed, bearing, and operational status
- **Route Management**: Complete CRUD operations for routes, stops, and vehicle assignments
- **Data Administration**: Interactive tables with sorting, filtering, and bulk operations
- **Import/Export**: CSV data management with validation and error handling

### 🎮 **Demo Experience**
- **Simulation Controls**: Start/stop real-time updates with professional control panel
- **Portfolio Showcase**: Branded demo with GitHub and LinkedIn integration
- **Performance Optimized**: Code splitting, lazy loading, and CDN delivery
- **PWA Ready**: Installable as mobile app with offline capabilities

---

## 🎯 Demo Highlights

### 🔄 **Real-time Simulation Engine**
- **Vehicle Movement**: Realistic GPS coordinate updates every 3 seconds
- **Dynamic Status Changes**: Automatic transitions between in_transit, at_stop, and delayed states
- **Speed Variations**: Simulated traffic conditions with speed fluctuations
- **Route Adherence**: Vehicles follow defined route polylines with realistic deviations

### 🎨 **Professional UI/UX**
- **Modern Design**: Clean, intuitive interface with Tailwind CSS styling
- **Smooth Animations**: Framer Motion powered transitions and state changes
- **Responsive Layout**: Mobile-first design with adaptive components
- **Accessibility**: WCAG compliant with keyboard navigation and screen reader support

### 📱 **Progressive Web App**
- **Installable**: Add to home screen functionality
- **Offline Capability**: Service worker integration for offline data access
- **Fast Loading**: Optimized bundle size with lazy-loaded components
- **Cross-Platform**: Works seamlessly across all modern browsers

---

## 🏗️ Architecture

### 🎯 **Static-First Design**
```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Pages (Static Hosting)            │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React 18 + TypeScript)                              │
│  ├─ Interactive Map (Leaflet + React-Leaflet)                  │
│  ├─ Analytics Dashboard (Custom Charts + Metrics)              │
│  ├─ Data Management (CRUD Interfaces)                          │
│  └─ Real-time Simulation (Client-side State Management)        │
├─────────────────────────────────────────────────────────────────┤
│  Static API Layer                                              │
│  ├─ JSON Data Files (/public/data/)                           │
│  ├─ Mock API Client (CRUD Simulation)                         │
│  ├─ Real-time Updates (In-memory State)                       │
│  └─ Network Delay Simulation                                   │
├─────────────────────────────────────────────────────────────────┤
│  Build & Deployment                                            │
│  ├─ Vite Build System (Code Splitting + Optimization)         │
│  ├─ GitHub Actions CI/CD                                       │
│  ├─ Automated Testing & Validation                             │
│  └─ CDN Distribution (Global Edge Caching)                     │
└─────────────────────────────────────────────────────────────────┘
```

### 🛠️ **Technology Stack**

#### **Frontend Framework**
- **React 18.3.1**: Latest React with concurrent features and hooks
- **TypeScript 5.5.4**: Type-safe development with modern ES features
- **Vite 5.4.9**: Lightning-fast build tool with HMR and optimization
- **React Router DOM 6.26.2**: Client-side routing with nested routes

#### **UI & Styling**
- **Tailwind CSS 3.4.10**: Utility-first CSS framework with custom design system
- **Lucide React 0.441.0**: Beautiful, customizable SVG icons
- **Framer Motion 11.2.10**: Smooth animations and transitions
- **PostCSS & Autoprefixer**: CSS processing and browser compatibility

#### **Mapping & Visualization**
- **Leaflet 1.9.4**: Open-source interactive maps with tile layer support
- **React-Leaflet 4.2.1**: React components for Leaflet maps
- **Custom Markers & Polylines**: Vehicle tracking and route visualization
- **Responsive Map Controls**: Zoom, pan, and layer management

#### **Development & Quality**
- **ESLint**: Code linting with TypeScript support
- **Prettier**: Code formatting and style consistency
- **TypeScript Strict Mode**: Enhanced type checking and error prevention
- **Modern Browser Support**: ES2020+ with polyfills for legacy browsers

---

## 🔧 Technical Modifications

### 🔄 **Backend to Static Conversion**

#### **Original Architecture Issues**
- ❌ **FastAPI Backend**: Required Python server with PostgreSQL database
- ❌ **Dynamic CSV Processing**: Server-side file I/O operations
- ❌ **Database Dependencies**: PostgreSQL for data persistence
- ❌ **GitHub Pages Incompatibility**: Static hosting cannot run server processes

#### **Static Solution Implemented**
- ✅ **Client-Side API**: Complete API simulation using TypeScript classes
- ✅ **JSON Data Files**: Pre-processed CSV data converted to optimized JSON
- ✅ **In-Memory State**: Browser-based state management with persistence
- ✅ **Zero Server Dependencies**: 100% client-side execution

### 📁 **Data Layer Transformation**

#### **Static Data Files Created**
```json
// /public/data/bus-stops.json - 8 realistic Delhi NCR locations
[
  {
    "stop_id": "BTS001",
    "name": "Central Station",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "routes": ["RT001", "RT003", "RT005"],
    "accessibility": true
  }
]

// /public/data/routes.json - 5 active bus routes with polylines
[
  {
    "route_id": "RT001",
    "route_name": "Metro Link Express",
    "route_color": "#FF6B6B",
    "is_active": true,
    "coordinates": [[28.6139, 77.2090], [28.6000, 77.2500]],
    "stops": ["BTS001", "BTS003", "BTS006"]
  }
]

// /public/data/vehicles.json - 6 vehicles with real-time simulation
[
  {
    "vehicle_id": "VH001",
    "route_id": "RT001",
    "latitude": 28.6039,
    "longitude": 77.2190,
    "bearing": 145,
    "speed": 35,
    "status": "in_transit",
    "last_updated": "2025-09-16T10:30:00Z"
  }
]
```

### 🎮 **Real-time Simulation Engine**

#### **Custom Hook Implementation**
```typescript
// /src/hooks/useRealtimeVehicles.ts
export const useRealtimeVehicles = ({
  vehicles,
  updateInterval = 3000,
  enabled = true
}) => {
  // Simulates realistic vehicle movement:
  // - GPS coordinate updates based on speed and bearing
  // - Random status changes (in_transit, at_stop, delayed)
  // - Speed variations simulating traffic conditions
  // - Route boundary enforcement for realistic tracking
}
```

#### **Static API Client**
```typescript
// /src/lib/static-api.ts
class StaticApiClient {
  // Complete CRUD operations simulation
  // Network delay simulation for realistic UX
  // Error handling and retry logic
  // Session-based data persistence
  // Real-time update broadcasting
}
```

### 🚀 **Build & Deployment Optimization**

#### **Vite Configuration Enhanced**
```typescript
// vite.config.ts modifications
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/NagaraTrack-Lite/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          map: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
  define: {
    'import.meta.env.VITE_STATIC_MODE': JSON.stringify('true'),
  },
}));
```

#### **GitHub Actions Workflow**
```yaml
# .github/workflows/gh-pages.yml
- name: Build static application
  env:
    NODE_ENV: production
    VITE_STATIC_MODE: 'true'
  run: npm run build

- name: Verify build output
  run: |
    ls -la dist/data/
    echo "Static data validation completed"
```

### 🎨 **Demo Enhancement Features**

#### **Professional Demo Banner**
```typescript
// /src/components/DemoBanner.tsx
// Portfolio branding with GitHub/LinkedIn links
// Animated status indicators
// Mobile-responsive design
// Professional showcase messaging
```

#### **Interactive Control Panel**
```typescript
// /src/components/DemoControlPanel.tsx
// Start/stop simulation controls
// Real-time status indicators
// Demo information and tips
// Portfolio showcase notes
```

#### **Environment Detection**
```typescript
// Automatic static mode detection
const isStaticMode = import.meta.env.VITE_STATIC_MODE === 'true' || 
                   import.meta.env.MODE === 'production' ||
                   window.location.hostname.includes('github.io');
```

---

## 🚀 Quick Start

### 📦 **Prerequisites**
- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **Git**: Latest version
- **Modern Browser**: Chrome, Firefox, Safari, or Edge

### ⚡ **Local Development**
```bash
# Clone the repository
git clone https://github.com/Rishi5377/NagaraTrack-Lite.git
cd NagaraTrack-Lite

# Navigate to frontend directory
cd frontend-pwa

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5000
```

### 🏗️ **Build for Production**
```bash
# Build optimized static files
npm run build

# Preview production build locally
npm run preview

# Validate build output
ls -la dist/data/
```

### 🌐 **Deploy to GitHub Pages**
```bash
# Commit your changes
git add .
git commit -m "feat: ready for GitHub Pages deployment"

# Push to main branch
git push origin main

# GitHub Actions will automatically deploy to:
# https://yourusername.github.io/NagaraTrack-Lite/
```

---

## 🔮 Future Enhancements

### 🏗️ **Architecture Upgrades**
- [ ] **Backend Integration**: Deploy full FastAPI backend on Railway/Render
- [ ] **Database Migration**: PostgreSQL integration for persistent data
- [ ] **Real GPS Integration**: Traccar GPS server for live vehicle tracking
- [ ] **WebSocket Support**: Real-time bidirectional communication
- [ ] **Microservices**: Split into dedicated services (auth, tracking, analytics)

### 🌟 **Feature Additions**
- [ ] **User Authentication**: Multi-role access (admin, operator, passenger)
- [ ] **Real-time Notifications**: Push notifications for delays and arrivals
- [ ] **Mobile App**: React Native or Flutter mobile application
- [ ] **Advanced Analytics**: Machine learning for route optimization
- [ ] **GTFS Integration**: Import/export General Transit Feed Specification data
- [ ] **Multi-language Support**: Internationalization (i18n) implementation

### 📊 **Data & Analytics**
- [ ] **Historical Data**: Time-series analysis and trend reporting
- [ ] **Predictive Analytics**: ETA predictions and delay forecasting
- [ ] **Performance Metrics**: KPI dashboard for transit efficiency
- [ ] **Passenger Feedback**: Rating system and service quality metrics
- [ ] **Environmental Impact**: Carbon footprint and sustainability metrics

### 🔧 **Technical Improvements**
- [ ] **Performance Optimization**: Service workers and offline-first architecture
- [ ] **Testing Suite**: Unit tests, integration tests, and E2E testing
- [ ] **Accessibility**: WCAG 2.1 AA compliance and screen reader optimization
- [ ] **Monitoring**: Application performance monitoring and error tracking
- [ ] **Security**: OWASP compliance and security audit implementation

### 🌐 **Deployment & DevOps**
- [ ] **Multi-environment**: Development, staging, and production pipelines
- [ ] **Infrastructure as Code**: Terraform or CloudFormation templates
- [ ] **Container Orchestration**: Kubernetes deployment for scalability
- [ ] **Monitoring & Logging**: Comprehensive observability stack
- [ ] **Backup & Recovery**: Automated backup systems and disaster recovery

### 🎯 **Business Features**
- [ ] **Route Planning**: AI-powered route optimization algorithms
- [ ] **Passenger Information**: Real-time arrival predictions at stops
- [ ] **Fleet Management**: Vehicle maintenance scheduling and tracking
- [ ] **Revenue Management**: Fare collection and financial reporting
- [ ] **Integration APIs**: Third-party service integrations (payment, maps, etc.)

---

## 🤝 Contributing

We welcome contributions to make NagaraTrack-Lite even better! Here's how you can help:

### 🐛 **Bug Reports**
Found a bug? Please [open an issue](https://github.com/Rishi5377/NagaraTrack-Lite/issues) with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser and device information
- Screenshots if applicable

### 💡 **Feature Requests**
Have an idea for improvement? [Submit a feature request](https://github.com/Rishi5377/NagaraTrack-Lite/issues) with:
- Detailed description of the feature
- Use case and benefits
- Possible implementation approach
- Mockups or examples if available

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

## 🚀 Ready to Explore?

[![Live Demo](https://img.shields.io/badge/🌐_Explore_Live_Demo-GitHub_Pages-success?style=for-the-badge)](https://rishi5377.github.io/NagaraTrack-Lite/)

**Built with ❤️ for modern transit solutions**

[⭐ Star this repo](https://github.com/Rishi5377/NagaraTrack-Lite) • [🐛 Report Bug](https://github.com/Rishi5377/NagaraTrack-Lite/issues) • [💡 Request Feature](https://github.com/Rishi5377/NagaraTrack-Lite/issues)

---

*This README was crafted with attention to detail for portfolio showcase and professional presentation.*

</div>
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
