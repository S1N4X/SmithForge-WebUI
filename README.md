<p align="center">
  <img src="web/static/smithforge_logo_white_small_v2.gif" alt="SmithForge Logo">
</p>

# SmithForge: WebUI Edition

SmithForge WebUI is a web-based interface for the SmithForge tool, which allows you to seamlessly combine two 3MF models by overlaying and embedding a Hueforge model onto a base shape with automatic scaling, positioning, and precise intersection alignment. This project includes a Docker setup for easy deployment.

## Features

- Web-based interface for SmithForge
- **Layer Visualization** - View Hueforge color layers before processing
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

## Layer Visualization

The Layer Visualization feature extracts and displays color layer information from Hueforge 3MF files, helping you understand the layer structure before processing.

### How It Works

1. **Upload Hueforge File**: When you select a Hueforge 3MF file, the layer information is automatically extracted
2. **View Layers**: Expand the "Layer Visualization" section in Optional Settings to see:
   - Number of layers
   - Total height
   - Individual layer heights (Z-coordinates)
   - Layer colors (color-coded bars)
   - File format (Bambu Lab, PrusaSlicer, etc.)
3. **Dynamic Updates**: Layer heights automatically adjust when you change the Z-shift parameter

### Supported Formats

- **Bambu Lab** (layer_config_ranges.xml)
- **PrusaSlicer/SuperSlicer** (custom_gcode_per_layer.xml)
- **Generic 3MF** (color metadata)

### Layer Height Adjustments

The visualization accounts for:
- **Embedding overlap** (DEFAULT_EMBEDDING_OVERLAP_MM = 0.1mm)
- **User Z-shift** parameter
- Shows final layer positions in the combined model

### Benefits

- **Verify Layer Data**: Ensure color information is present before processing
- **Check Heights**: Confirm layer positions after embedding
- **Troubleshoot**: Identify layer-related issues early
- **Plan Prints**: Understand where filament changes will occur

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](http://_vscodecontentref_/0) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## Acknowledgements

- [trimesh](https://github.com/mikedh/trimesh)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Docker](https://www.docker.com/)