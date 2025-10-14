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
2. **[Optional]** Validates and repairs both meshes if `--auto-repair` is enabled
3. Optionally rotates base model around Z-axis
4. Auto-scales Hueforge to match base dimensions (X/Y only, Z unchanged)
5. Centers Hueforge on base in X/Y plane
6. Embeds Hueforge with 0.1mm Z overlap for proper union
7. Applies user-specified X/Y/Z shifts
8. Creates 2D convex hull from base, extrudes to clip Hueforge
9. Performs boolean intersection to clip outside geometry
10. Unions clipped Hueforge with base for final manifold
11. Exports combined model as 3MF

### Directory Structure
- `web/` - FastAPI application and frontend
  - `main.py` - FastAPI routes and subprocess orchestration
  - `templates/` - Jinja2 HTML templates (index, result, error)
  - `static/` - CSS and static assets
- `smithforge/` - Core processing submodule
  - `smithforge.py` - Main 3D model manipulation script
  - `repair.py` - Mesh validation and repair module
- `inputs/` - Uploaded Hueforge files (created at runtime)
  - `bases/` - Base model files (uploaded or defaults)
- `outputs/` - Generated combined models (created at runtime)

### Key Parameters
- `--rotatebase` - Rotate base model (degrees)
- `--scale` - Force specific scale value
- `--scaledown` - Allow scaling below 1.0
- `--xshift/yshift/zshift` - Position adjustments in mm
- `--preserve-colors` - Preserve Hueforge color layer information
- `--auto-repair` - Enable automatic mesh validation and repair
- Z-axis height is never modified to maintain Hueforge visual integrity

## Important Constraints

1. **Port Configuration**: Never change the service port (8000) as specified in docker-compose.yaml and Dockerfile
2. **Z-axis Preservation**: The Z-axis of Hueforge models must never be scaled - this maintains the color layer integrity
3. **Manifold Geometry**: Both input models must have proper manifold geometry for boolean operations to succeed
4. **File Paths**: The subprocess call to smithforge.py uses relative path `smithforge/smithforge.py` (lowercase), not `SmithForge/smithforge.py`
5. **Default Overlap**: 0.1mm Z overlap is hardcoded in smithforge.py:117 for proper model union

## Common Issues

- **"Not all meshes are volumes" error**: Input models are not watertight/manifold. Enable auto-repair to fix this automatically, or manually repair models in external tools. Error is caught and displayed in error.html (web/main.py:231)
- **Empty intersection**: Occurs when there's no overlap between models or when base is not a valid volume
- **Path issues**: The web server uses relative paths from project root, subprocess calls use paths relative to working directory

## Mesh Repair System

The automatic mesh repair system is implemented in `smithforge/repair.py` and provides validation and repair capabilities for 3D meshes.

### Architecture

**Components:**
- `RepairReport` class - Tracks issues, repairs, warnings, and success status
- `validate_mesh()` - Identifies mesh problems without modifying geometry
- `repair_mesh()` - Applies automatic repairs with configurable aggressiveness
- `auto_repair_mesh()` - Convenience wrapper with sensible defaults

**Integration:**
1. User enables auto-repair checkbox in `web/templates/index.html`
2. `web/main.py` passes `--auto-repair` flag to subprocess (web/main.py:200)
3. `smithforge.py` imports repair module and applies to both models (smithforge.py:315-331)
4. Repair reports are printed to stdout and captured in process logs
5. `result.html` displays repair notification and detailed logs

### Repair Algorithms

The repair system applies fixes in this sequence:

1. **Merge Duplicate Vertices**
   - Uses `trimesh.merge_vertices()` to consolidate identical vertex positions
   - Reduces vertex count and removes redundancy

2. **Remove Duplicate Faces**
   - Identifies faces with identical vertex indices
   - Uses `mesh.unique_faces()` to eliminate duplicates

3. **Remove Degenerate Faces**
   - Detects faces with zero or near-zero area (< 1e-10)
   - Uses `mesh.remove_degenerate_faces()` to clean up

4. **Fill Holes** (Non-watertight Fix)
   - Uses `mesh.fill_holes()` to close gaps in mesh surface
   - Makes mesh watertight for boolean operations
   - Most important repair for "Not all meshes are volumes" errors

5. **Fix Normals**
   - Uses `mesh.fix_normals()` to ensure consistent face winding
   - Corrects inverted faces for proper boolean operations

6. **Remove Unreferenced Vertices**
   - Cleans up orphaned vertices not used by any face
   - Uses `mesh.remove_unreferenced_vertices()`

7. **Aggressive Repairs** (Optional, not used by default)
   - Convex hull generation as last resort
   - Significantly alters geometry, disabled in `auto_repair_mesh()`

### Validation Checks

The `validate_mesh()` function checks for:
- Empty meshes (no vertices/faces)
- Non-watertight geometry (`mesh.is_watertight`)
- Degenerate faces (area < 1e-10)
- Duplicate vertices/faces
- Invalid volume (volume <= 0)
- Self-intersections (disabled by default - expensive)

### Error Handling

- Gracefully handles missing repair module (ImportError)
- Reports partial success when some repairs fail
- Warns about remaining issues after repair attempts
- Never fails the entire pipeline if repair has issues

### Performance Considerations

- Validation is fast (< 1 second for typical models)
- Repair operations scale with mesh complexity
- Fill holes can be slow for large gaps
- Self-intersection check disabled by default (O(n²) complexity)

## Technology Stack
- **Backend**: FastAPI + Uvicorn
- **3D Processing**: trimesh, shapely, manifold3d
- **Frontend**: Bootstrap 4, Font Awesome, vanilla JavaScript
- **Templating**: Jinja2
- **Containerization**: Docker + Docker Compose (Python 3.9-slim base)
