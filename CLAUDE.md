# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmithForge-WebUI is a web-based interface for combining 3MF models by overlaying a Hueforge model onto a base shape with automatic scaling, positioning, and precise intersection alignment. The project consists of:
- **Core processing script**: `SmithForge/smithforge.py` - handles 3D model manipulation using trimesh
- **Web interface**: FastAPI application in `web/main.py` with Jinja2 templates
- **Docker deployment**: Configured for easy deployment via Docker Compose

## Build and Run Commands

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run the web server locally
python -m uvicorn web.main:app --host 0.0.0.0 --port 8000

# Or run directly
python web/main.py
```

### Docker Deployment
```bash
# Build and start the container
docker-compose up --build -d

# Stop the container
docker-compose down

# View logs
docker-compose logs -f
```

The web interface will be available at `http://localhost:8000`.

### Testing with Puppeteer MCP
Use the Puppeteer MCP to test the web application at `http://localhost:8000`.

## Architecture

### Request Flow
1. User uploads files via `web/templates/index.html` form
2. FastAPI endpoint `/run-smithforge` in `web/main.py` receives the upload (web/main.py:77)
3. Files are saved to `inputs/` and `inputs/bases/` directories
4. Python subprocess calls `smithforge/smithforge.py` with appropriate arguments (web/main.py:147)
5. SmithForge processes models using trimesh library
6. Result is saved to `outputs/` directory
7. Success: renders `result.html` with download link
8. Failure: renders `error.html` with error details

### Core Processing (SmithForge/smithforge.py)
The `modify_3mf()` function performs these operations in sequence:
1. Loads both 3MF models using trimesh
2. Optionally rotates base model around Z-axis
3. Auto-scales Hueforge to match base dimensions (X/Y only, Z unchanged)
4. Centers Hueforge on base in X/Y plane
5. Embeds Hueforge with 0.1mm Z overlap for proper union
6. Applies user-specified X/Y/Z shifts
7. Creates 2D convex hull from base, extrudes to clip Hueforge
8. Performs boolean intersection to clip outside geometry
9. Unions clipped Hueforge with base for final manifold
10. Exports combined model as 3MF

### Directory Structure
- `web/` - FastAPI application and frontend
  - `main.py` - FastAPI routes and subprocess orchestration
  - `templates/` - Jinja2 HTML templates (index, result, error)
  - `static/` - CSS and static assets
    - `viewer.js` - Three.js 3D model viewer
- `SmithForge/` - Core processing submodule
  - `smithforge.py` - Main 3D model manipulation script
- `inputs/` - Uploaded Hueforge files (created at runtime)
  - `bases/` - Base model files (uploaded or defaults)
- `outputs/` - Generated combined models (created at runtime)

### Key Parameters
- `--rotatebase` - Rotate base model (degrees)
- `--scale` - Force specific scale value
- `--scaledown` - Allow scaling below 1.0
- `--xshift/yshift/zshift` - Position adjustments in mm
- Z-axis height is never modified to maintain Hueforge visual integrity

## Important Constraints

1. **Port Configuration**: Never change the service port (8000) as specified in docker-compose.yaml and Dockerfile
2. **Z-axis Preservation**: The Z-axis of Hueforge models must never be scaled - this maintains the color layer integrity
3. **Manifold Geometry**: Both input models must have proper manifold geometry for boolean operations to succeed
4. **File Paths**: The subprocess call to smithforge.py uses relative path `smithforge/smithforge.py` (lowercase), not `SmithForge/smithforge.py`
5. **Default Overlap**: 0.1mm Z overlap is hardcoded in smithforge.py:117 for proper model union

## Common Issues

- **"Not all meshes are volumes" error**: Input models are not watertight/manifold. This error is caught and displayed in error.html (web/main.py:231)
- **Empty intersection**: Occurs when there's no overlap between models or when base is not a valid volume
- **Path issues**: The web server uses relative paths from project root, subprocess calls use paths relative to working directory

## Frontend Features

### 3D Model Preview (web/static/viewer.js)
Interactive 3D visualization of uploaded models using Three.js.

**Architecture:**
```
User uploads 3MF → /preview-model endpoint → trimesh converts to GLB →
Returns binary GLB → Three.js GLTFLoader → Renders in WebGL canvas
```

**Preview Endpoint** (`/preview-model` in web/main.py):
- Accepts uploaded 3MF file via POST
- Loads with trimesh and handles Scene vs single Mesh
- Exports to GLB format (binary glTF)
- Returns GLB as `model/gltf-binary` MIME type
- Automatic cleanup of temporary files

**Viewer Components:**
- **Scene Setup**: Three.js scene with perspective camera, OrbitControls
- **Lighting**: Ambient + two directional lights for proper model illumination
- **Materials**: Base (gray, opaque), Overlay (blue, 85% opacity)
- **Grid Helper**: 200mm grid for scale reference
- **View Modes**: Both/Base Only/Overlay Only visibility toggles
- **Wireframe Mode**: Toggle mesh wireframe view

**Key Functions:**
- `initViewer()` - Initialize Three.js scene and controls
- `loadModel(file, modelType)` - Upload to /preview-model and load GLB
- `centerCamera()` - Auto-frame camera on loaded models
- `calculateVolume(model)` - Approximate volume from bounding boxes
- `setViewMode(mode)` - Control model visibility
- `toggleWireframe()` - Switch between solid and wireframe rendering

**Model Information Display:**
- Dimensions (X × Y × Z in mm) from bounding box
- Approximate volume (mm³)
- Loading indicators during conversion
- Real-time updates on file selection

**Integration:**
- Hooks into existing file input change events
- Loads default bases from `/bases/` endpoint
- Fully client-side rendering after initial GLB fetch
- No server state - stateless preview generation

## Technology Stack
- **Backend**: FastAPI + Uvicorn
- **3D Processing**: trimesh, shapely, manifold3d
- **Frontend**: Bootstrap 4, Font Awesome, Three.js (r160), vanilla JavaScript
- **3D Rendering**: Three.js with WebGL, OrbitControls, GLTFLoader
- **Templating**: Jinja2
- **Containerization**: Docker + Docker Compose (Python 3.9-slim base)
