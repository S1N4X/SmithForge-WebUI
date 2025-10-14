<p align="center">
  <img src="web/static/smithforge_logo_white_small_v2.gif" alt="SmithForge Logo">
</p>

# SmithForge: WebUI Edition

SmithForge WebUI is a web-based interface for the SmithForge tool, which allows you to seamlessly combine two 3MF models by overlaying and embedding a Hueforge model onto a base shape with automatic scaling, positioning, and precise intersection alignment. This project includes a Docker setup for easy deployment.

## Features

- Web-based interface for SmithForge
- **Automatic Model Repair** - Validate and fix mesh issues before processing
- Upload and process 3MF models
- Automatic scaling and positioning
- Customizable rotation and shifts
- Dockerized for easy deployment

## Requirements

- Docker
- Docker Compose
- Docker Desktop (optional for ease of use)

## Installation

1. Clone the repository with submodules:
    ```bash
    git clone --recurse-submodules https://github.com/yourusername/smithforge-webui.git
    cd smithforge-webui
    ```

2. Build and run the Docker container:
    ```bash
    docker-compose up --build -d
    ```
    ```yaml
    version: '3'
    services:
      smithforge-webui:
        build: .
        ports:
          - "8000:8000"
    ```

3. Access the web interface at `http://localhost:8000`.

## Usage
1. Open the web interface in your browser.
2. Upload the Hueforge and base 3MF models.
3. Configure the optional settings as needed.
4. Click "Start Forging" to process the models.
5. Download the combined 3MF model once the process is complete.

## Automatic Model Repair

The Automatic Model Repair feature validates and fixes common mesh issues that can cause boolean operations to fail, such as the "Not all meshes are volumes" error.

### How It Works

1. **Enable Auto-Repair**: Check the "Enable automatic mesh repair" option in the Optional Settings
2. **Automatic Validation**: Both models are validated before processing
3. **Repair Process**: Issues are automatically fixed using proven repair algorithms
4. **Detailed Report**: View repair results in the process log after forging

### Issues That Can Be Fixed

- **Non-watertight meshes** - Holes in the mesh surface are automatically filled
- **Non-manifold edges** - Edges shared by more than 2 faces are corrected
- **Degenerate faces** - Zero-area faces are removed
- **Duplicate vertices/faces** - Redundant geometry is cleaned up
- **Inverted normals** - Face orientations are corrected for consistent winding
- **Unreferenced vertices** - Orphaned vertices are removed

### When to Use Auto-Repair

Use auto-repair when:
- You encounter "Not all meshes are volumes" errors
- Your models have been edited or modified in external tools
- You're working with models from various sources with unknown quality
- You want to ensure reliable boolean operations

### Repair Report

After processing with auto-repair enabled, the result page will show:
- A blue notification indicating auto-repair was used
- Detailed repair information in the process log, including:
  - Issues detected in each model
  - Repairs successfully applied
  - Warnings about any remaining issues

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](http://_vscodecontentref_/0) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## Acknowledgements

- [trimesh](https://github.com/mikedh/trimesh)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Docker](https://www.docker.com/)