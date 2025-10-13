<p align="center">
  <img src="web/static/smithforge_logo_white_small_v2.gif" alt="SmithForge Logo">
</p>

# SmithForge: WebUI Edition

SmithForge WebUI is a web-based interface for the SmithForge tool, which allows you to seamlessly combine two 3MF models by overlaying and embedding a Hueforge model onto a base shape with automatic scaling, positioning, and precise intersection alignment. This project includes a Docker setup for easy deployment.

## Features

- Web-based interface for SmithForge
- Upload and process 3MF models
- Automatic scaling and positioning
- Customizable rotation and shifts
- **Parameter Presets** - Save and load your favorite parameter combinations
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

## Parameter Presets

Parameter Presets allow you to save and reuse your frequently-used parameter combinations, making it faster to work with similar projects.

### Saving a Preset

1. Configure all your desired parameters (rotation, scaling, shifts, etc.)
2. Enter a name for your preset in the "Save Current Settings" field
3. Click the "Save Preset" button
4. Your preset is now saved in your browser's local storage

### Loading a Preset

1. Select a preset from the "Load Saved Preset" dropdown
2. Click the "Load" button
3. All form fields will be populated with the saved values

### Deleting a Preset

1. Select a preset from the "Load Saved Preset" dropdown
2. Click the "Delete" button
3. Confirm the deletion

### What Gets Saved

Presets save the following parameters:
- Base rotation angle
- Force scale value
- Scale down permission
- X, Y, Z position shifts
- Color preservation setting
- Output filename template
- Base template selection (default bases or upload)

**Note:** Presets are stored locally in your browser using localStorage. They will persist between sessions but are not synced across different browsers or devices.

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](http://_vscodecontentref_/0) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## Acknowledgements

- [trimesh](https://github.com/mikedh/trimesh)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Docker](https://www.docker.com/)