# SmithForge-WebUI React Migration

**Date Started**: 2025-10-29
**Branch**: `feature/react-ui-redesign`
**Goal**: Redesign UI from FastAPI/Jinja2 to React + Node.js/Express for better UX

## Migration Objectives

- ✅ **Ergonomic split-pane layout** - Large 3D viewer + collapsible sidebar
- ✅ **Single dynamic page** - No scrolling, everything visible at once
- ✅ **Modern tech stack** - React 18 + Vite + Tailwind CSS
- ✅ **Node.js backend** - Express server calling smithforge.py as subprocess
- ✅ **No functionality regression** - All existing features preserved

## Architecture Changes

### Before (FastAPI/Jinja2)
```
Client Browser
    ↓ HTTP Request
FastAPI Server (Python)
    ↓ Renders Jinja2 template
    ↓ Serves HTML form
User submits form
    ↓ POST /run-smithforge
FastAPI calls smithforge.py subprocess
    ↓ Returns rendered result.html
```

### After (React + Express)
```
Client Browser (React SPA)
    ↓ API Requests
Express Server (Node.js)
    ↓ Calls Python subprocess
smithforge.py (unchanged)
    ↓ Returns JSON
React updates UI dynamically
```

## Progress Tracker

### ✅ Phase 1: Express Backend (COMPLETED)

**Files Created:**
- `/backend/package.json` - Node.js dependencies
- `/backend/server.js` - Main Express server
- `/backend/utils/subprocess.js` - Python subprocess wrapper
- `/backend/routes/preview.js` - `POST /api/preview-model` endpoint
- `/backend/routes/layers.js` - `POST /api/get-layers` endpoint
- `/backend/routes/smithforge.js` - `POST /api/run-smithforge` endpoint
- `/backend/routes/bases.js` - `GET /api/bases` endpoint

**API Endpoints Implemented:**
- ✅ `GET /api/health` - Healthcheck (returns `{"status": "ok"}`)
- ✅ `GET /api/bases` - List available base models
- ✅ `POST /api/preview-model` - Convert 3MF to GLB for preview
- ✅ `POST /api/get-layers` - Extract layer info from Hueforge
- ✅ `POST /api/run-smithforge` - Main processing endpoint

**Key Features:**
- File uploads via `express-fileupload` middleware
- Python subprocess execution with proper error handling
- Static file serving (`/outputs`, `/bases`, `/inputs`)
- CORS enabled for development
- Temp file cleanup after processing
- Enhanced error messages (e.g., auto-repair suggestions)

**Subprocess Integration:**
- `executePython(scriptPath, args)` - Generic Python script executor
- `executeSmithForge(params)` - SmithForge-specific wrapper
- `cleanLogOutput(output)` - ANSI code removal, log formatting
- All smithforge.py arguments supported:
  - Transform: `--rotatebase`, `--scale`, `--scaledown`, `--xshift`, `--yshift`, `--zshift`
  - Colors: `--preserve-colors`, `--inject-colors-text`
  - Options: `--auto-repair`, `--fill-gaps`, `--output-format`

### 🚧 Phase 2: React Frontend (IN PROGRESS)

**Status:** Project initialized, API service created

**Completed:**
- ✅ Vite React project initialized
- ✅ Tailwind CSS installed and configured
- ✅ Additional dependencies installed (axios, three, react-three/fiber, react-hook-form)
- ✅ Vite proxy configured for API routes (`/api`, `/outputs`, `/bases`)
- ✅ API service created (`frontend/src/services/api.js`)
  - `smithForgeAPI.health()` - Health check
  - `smithForgeAPI.getBases()` - List base models
  - `smithForgeAPI.previewModel(file)` - Convert 3MF to GLB
  - `smithForgeAPI.getLayers(file, zShift)` - Extract layers
  - `smithForgeAPI.runSmithForge(params)` - Main processing

**Planned Structure:**
```
frontend/
├── src/
│   ├── components/
│   │   ├── SplitLayout.jsx           # Main split-pane layout
│   │   ├── Sidebar/
│   │   │   ├── FileUpload.jsx        # Drag-drop file inputs
│   │   │   ├── TransformControls.jsx # Rotate, scale, shift
│   │   │   ├── ColorSettings.jsx     # Color mode selector
│   │   │   └── OutputSettings.jsx    # Output name, format
│   │   ├── ModelViewer/
│   │   │   ├── ThreeScene.jsx        # Port of viewer.js
│   │   │   └── ViewControls.jsx      # View modes, wireframe
│   │   ├── LayerPanel.jsx            # Port of layer-viz.js
│   │   ├── PresetManager.jsx         # Port of presets.js
│   │   └── StatusBar.jsx             # Processing logs, download
│   ├── hooks/
│   │   ├── useModelPreview.js        # Fetch /api/preview-model
│   │   ├── useLayerInfo.js           # Fetch /api/get-layers
│   │   ├── usePresets.js             # localStorage management
│   │   └── useSmithForge.js          # POST /api/run-smithforge
│   ├── services/
│   │   └── api.js                    # Axios wrapper
│   ├── App.jsx
│   └── main.jsx
├── package.json
├── vite.config.js
└── tailwind.config.js
```

**Technologies:**
- React 18 with hooks
- Vite (build tool, dev server)
- Tailwind CSS (utility-first styling)
- Three.js with React Three Fiber or vanilla Three.js
- React Hook Form (form state management)
- Axios (HTTP client)

**UI/UX Improvements:**
- Split-pane layout with resizable divider
- Large 3D viewer (60-70% of screen width)
- Collapsible sidebar sections to reduce clutter
- Drag-drop file uploads with preview thumbnails
- Live preview updates when parameters change
- Processing progress bar with streaming logs
- Floating/dockable layer visualization panel
- Status bar with download button and log viewer

### ⏳ Phase 3: Docker Configuration (PENDING)

**Planned Changes:**
- Multi-stage Dockerfile (frontend build + backend)
- Update docker-compose.yaml to use new structure
- Keep port 8000, volumes, healthcheck
- Ensure all paths are correct

### ⏳ Phase 4: Testing & Validation (PENDING)

**Test Checklist:**
- [ ] File upload (Hueforge + base)
- [ ] Parameter presets (save/load/delete)
- [ ] 3D preview (both models, view modes, wireframe)
- [ ] Layer visualization with Z-shift updates
- [ ] Color modes (none/preserve/inject)
- [ ] Auto-repair and fill-gaps
- [ ] Output format selection (standard/bambu)
- [ ] Download generated files
- [ ] Docker deployment
- [ ] Puppeteer MCP tests

## API Migration Guide

### Old Endpoint: `GET /` (Form Page)
**Before:**
```python
@app.get("/")
async def form(request: Request):
    base_models = list_base_models()
    return templates.TemplateResponse("index.html", {
        "request": request,
        "base_models": base_models
    })
```

**After:**
```javascript
// React fetches base models from API
const { data } = await axios.get('/api/bases');
// data: { bases: ["cml_base.3mf", ...], count: 5 }
```

### Old Endpoint: `POST /run-smithforge`
**Before:**
```python
# Returns rendered HTML template (result.html or error.html)
return templates.TemplateResponse("result.html", context)
```

**After:**
```javascript
// Returns JSON response
{
  "success": true,
  "output_filename": "combined_base_overlay_20251029.3mf",
  "download_url": "/outputs/combined_base_overlay_20251029.3mf",
  "log_lines": ["Processing started...", "Scaling overlay..."],
  "parameters": { /* echo of all parameters */ }
}
```

### New Endpoints Added
- `GET /api/health` - Missing from original FastAPI app
- `GET /api/bases` - Replaces template context variable

## File Structure Comparison

### Before
```
SmithForge-WebUI/
├── web/
│   ├── main.py              # FastAPI app
│   ├── templates/           # Jinja2 templates
│   └── static/              # JS/CSS
├── smithforge/              # Python processing
├── inputs/, outputs/
└── docker-compose.yaml
```

### After
```
SmithForge-WebUI/
├── backend/                 # Express API server
│   ├── server.js
│   ├── routes/
│   └── utils/
├── frontend/                # React SPA
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── smithforge/              # Python processing (unchanged)
├── web/                     # OLD (deprecated, will be removed)
├── inputs/, outputs/
├── Dockerfile               # Multi-stage build
└── docker-compose.yaml      # Updated
```

## Notes & Decisions

### Why Node.js Backend?
- User requested: "2 but call it as subprocess. DONT FUCK THE BACKEND"
- Keeps smithforge.py intact (Python)
- Single JavaScript language for frontend + backend
- Easier to maintain for full-stack JS developers

### Why Express Over FastAPI?
- User wanted Node.js backend
- Express is mature, well-documented
- Easy file upload handling with express-fileupload
- Can still call Python subprocess for processing

### Why Not Port smithforge.py to JavaScript?
- **High risk** of introducing bugs in complex 3D boolean operations
- trimesh, shapely, manifold3d have no direct Node.js equivalents
- Python implementation is proven and working
- Subprocess approach keeps existing logic intact

### Why Vite Over Create React App?
- Faster dev server (ES modules, HMR)
- Better build performance
- Modern tooling, active development
- Smaller bundle sizes

## Current Issues & Blockers

None yet - backend phase completed successfully.

## Next Steps

1. Initialize Vite React project with Tailwind CSS
2. Create split-pane layout component
3. Port viewer.js to React component
4. Build sidebar with collapsible sections
5. Implement preset management
6. Update Dockerfile for multi-stage build

## Resources

- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Three.js](https://threejs.org/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
