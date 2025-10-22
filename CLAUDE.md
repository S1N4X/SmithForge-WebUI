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

# Rebuild container after making changes to web templates or static files
docker-compose down && docker-compose up --build -d
```

The web interface will be available at `http://localhost:8000`.

**IMPORTANT**:
- **After making any changes that need to be tested**, you must rebuild the Docker container for changes to take effect. This includes modifications to:
  - `web/templates/` - HTML templates
  - `web/static/` - JavaScript, CSS, and other static files
  - `web/main.py` - FastAPI backend code
  - `smithforge/` - Core processing scripts
  - `requirements.txt` - Python dependencies
  - Any other application code
- When using sudo for Docker commands, read the sudo password from `~/.env` file (variable: `SUDO_PASSWORD`)

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
6. Embeds Hueforge with DEFAULT_EMBEDDING_OVERLAP_MM (0.1mm) Z overlap for proper union
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
    - `presets.js` - Parameter presets management (localStorage)
    - `viewer.js` - Three.js 3D model viewer
    - `layer-viz.js` - Layer visualization JavaScript
- `smithforge/` - Core processing submodule (git submodule)
  - `smithforge.py` - Main 3D model manipulation script
  - `layer_parser.py` - Extract layer information from 3MF files
  - `text_layer_parser.py` - Parse HueForge swap instructions text
  - `repair.py` - Mesh validation and repair module
  - `lib3mf_exporter.py` - Bambu Studio compatible 3MF exporter using lib3mf C++
- `inputs/` - Uploaded Hueforge files (created at runtime)
  - `bases/` - Base model files (uploaded or defaults)
- `outputs/` - Generated combined models (created at runtime)

### Output Format Options

SmithForge supports two output formats for maximum compatibility:

#### Standard 3MF (Default)
- **Export Method**: trimesh library
- **Compatibility**: Universal - works with PrusaSlicer, Cura, Simplify3D, OrcaSlicer, and most slicers
- **Structure**: Simple 3MF format with embedded mesh geometry
- **Color Metadata**: Injected post-export via ZIP manipulation
- **Use Case**: General purpose, maximum compatibility

#### Bambu Studio 3MF
- **Export Method**: lib3mf C++ library with Production Extension
- **Compatibility**: Optimized for Bambu Studio and Bambu Lab printers
- **Structure**: Component-based 3MF with proper Production Extension namespace
- **Color Metadata**: Integrated during export with proper XML structure
- **Use Case**: When targeting Bambu Studio specifically, or when "No such node (objects)" errors occur with standard format
- **Fallback**: Automatically falls back to standard export if lib3mf is unavailable

**Implementation Details:**
- Format selection available in web UI dropdown (Output Settings section)
- Passed via `--output-format` parameter (choices: `standard`, `bambu`)
- Export logic in `smithforge.py:706-742` branches based on format
- Bambu export delegated to `lib3mf_exporter.Lib3mfExporter` class
- lib3mf CLI tool installed in Docker container during build

### Key Parameters
- `--rotatebase` - Rotate base model (degrees)
- `--scale` - Force specific scale value
- `--scaledown` - Allow scaling below 1.0
- `--xshift/yshift/zshift` - Position adjustments in mm
- `--preserve-colors` - Preserve Hueforge color layer information from original 3MF
- `--inject-colors-text` - Inject color layers from HueForge swap instructions text (mutually exclusive with --preserve-colors)
- `--auto-repair` - Enable automatic mesh validation and repair
- `--fill-gaps` - Fill gaps between scaled overlay and base boundaries
- `--output-format` - Output format selection: `standard` (default) or `bambu`
- Z-axis height is never modified to maintain Hueforge visual integrity

## Important Constraints

1. **Port Configuration**: Never change the service port (8000) as specified in docker-compose.yaml and Dockerfile
2. **Z-axis Preservation**: The Z-axis of Hueforge models must never be scaled - this maintains the color layer integrity
3. **Manifold Geometry**: Both input models must have proper manifold geometry for boolean operations to succeed
4. **File Paths**: The subprocess call to smithforge.py uses relative path `smithforge/smithforge.py` (lowercase), not `SmithForge/smithforge.py`
5. **Default Overlap**: Embedding overlap defined by DEFAULT_EMBEDDING_OVERLAP_MM constant (smithforge.py:27), currently 0.1mm

## Common Issues

- **"Not all meshes are volumes" error**: Input models are not watertight/manifold. Enable auto-repair to fix this automatically, or manually repair models in external tools. Error is caught and displayed in error.html (web/main.py:231)
- **Empty intersection**: Occurs when there's no overlap between models or when base is not a valid volume
- **Path issues**: The web server uses relative paths from project root, subprocess calls use paths relative to working directory

## Frontend Features

### Parameter Presets (web/static/presets.js)
Allows users to save, load, and delete parameter configurations using browser localStorage.

**Storage Format:**
```javascript
{
  "presetName": {
    rotate_base: "90",
    force_scale: "1.2",
    scaledown: true,
    xshift: "5.0",
    yshift: "10.0",
    zshift: "0.5",
    preserve_colors: true,
    output_name: "custom_output",
    base_template: "default",
    default_base: "coaster.3mf"
  }
}
```

**Key Functions:**
- `savePreset()` - Serializes current form state to localStorage
- `loadPreset()` - Applies saved parameters to form fields
- `deletePreset()` - Removes preset from localStorage
- `getAllPresets()` - Retrieves all saved presets
- `populatePresetDropdown()` - Updates UI with available presets

**Storage Key:** `smithforge_presets` in localStorage

**Limitations:**
- Presets are browser-specific (not synced across devices)
- Subject to localStorage size limits (~5-10MB depending on browser)
- Cleared if user clears browser data

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

### Layer Visualization (smithforge/layer_parser.py, web/static/layer-viz.js)
Extracts and displays color layer information from Hueforge 3MF files.

**Architecture:**
```
User uploads Hueforge → /get-layers endpoint → layer_parser.py extracts metadata →
Returns JSON with layer info → layer-viz.js displays visual bars
```

**Layer Parser** (`smithforge/layer_parser.py`):
- Parses 3MF ZIP archives for layer metadata
- Supports multiple formats:
  - Bambu Lab (layer_config_ranges.xml)
  - PrusaSlicer (custom_gcode_per_layer.xml)
  - Generic 3MF (color base materials)
- Extracts: Z-heights, colors, layer numbers
- Imports DEFAULT_EMBEDDING_OVERLAP_MM for accurate calculations
- `adjust_layers_for_zshift()` - Adjusts heights for user Z-shift parameter

**Get-Layers Endpoint** (`/get-layers` in web/main.py):
- Accepts uploaded 3MF file via POST
- Accepts optional `z_shift` parameter (default 0.0)
- Returns JSON: `{layers, total_height, layer_count, has_colors, format}`
- Temporary file handling with automatic cleanup

**Layer Visualization UI** (`web/static/layer-viz.js`):
- Auto-loads when Hueforge file selected
- Displays color-coded layer bars
- Shows: layer number, Z-height, color indicator
- Updates dynamically when Z-shift parameter changes (500ms debounce)
- Loading indicators during fetch
- Format badge (Bambu/Prusa/Generic)

**Display Features:**
- Scrollable layer list (max 300px height)
- Color-coded left borders matching layer colors
- Hover effects for interactivity
- Layer count badge
- Summary: "X layers, Y.YYmm total"

**Z-Offset Calculations:**
The layer visualization accounts for:
1. Original layer Z-heights from 3MF
2. Embedding overlap (DEFAULT_EMBEDDING_OVERLAP_MM)
3. User Z-shift parameter
4. Final formula: `displayed_z = original_z - overlap + z_shift`

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

## Color Layer Management

SmithForge WebUI supports three modes for managing color layer information in the output 3MF:

### Mode 1: No Color Layers (Default)
- Output 3MF contains no color layer metadata
- Simplest option for basic model combining

### Mode 2: Preserve from Hueforge File
- Extracts color layer information from the uploaded Hueforge 3MF file
- Automatically adjusts Z-heights to account for:
  - Embedding overlap (`DEFAULT_EMBEDDING_OVERLAP_MM` = 0.1mm)
  - User-specified Z-shift parameter
- Supports multiple 3MF metadata formats (Bambu Lab, PrusaSlicer)
- Formula: `final_layer_z = original_z + base_top_z - overlap + z_shift`

### Mode 3: Inject from Text/File
- Parses HueForge swap instruction text to generate color layers
- **Mutually exclusive** with Mode 2 (preserve)
- Accounts for embedding offset and Z-shift just like preserve mode

**Expected Text Format:**
```
Filaments Used:
PLA BambuLab Basic Black
PLA BambuLab Basic Cobalt Blue
PLA BambuLab Basic Sunflower Yellow

Swap Instructions:
Start with Black
At layer #8 (0.72mm) swap to Cobalt Blue
At layer #15 (1.28mm) swap to Sunflower Yellow
```

**Implementation:**
- Text parser: `smithforge/text_layer_parser.py`
- Strict format matching (case-insensitive)
- Color name to hex mapping with common filament colors
- Validates layer heights against final model Z-height
- Supports both textarea input and .txt file upload in web UI

**Z-Offset Calculation:**
The text injection mode applies the same Z-offset as preserve mode:
1. Layers start at original Z-heights from swap instructions
2. Adjusted for base top Z position
3. Subtracted by embedding overlap (0.1mm)
4. Added user Z-shift parameter

**Validation:**
- Warns if layer heights exceed final model height
- Checks for negative Z-heights
- Does not fail the build (warnings only)

## Technology Stack
- **Backend**: FastAPI + Uvicorn
- **3D Processing**: trimesh, shapely, manifold3d
- **Frontend**: Bootstrap 4, Font Awesome, Three.js (r160), vanilla JavaScript
- **3D Rendering**: Three.js with WebGL, OrbitControls, GLTFLoader
- **Templating**: Jinja2
- **Containerization**: Docker + Docker Compose (Python 3.9-slim base)
