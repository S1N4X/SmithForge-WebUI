# web/main.py
from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse, Response
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from typing import Optional
import uvicorn
import subprocess
import os
import tempfile
import trimesh
from datetime import datetime

app = FastAPI()

# Define base paths
INPUT_DIR = "inputs"
BASES_DIR = "bases"
OUTPUT_DIR = "outputs"
STATIC_DIR = "static"
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH = os.path.join(APP_ROOT, "..", INPUT_DIR)
BASES_PATH = os.path.join(APP_ROOT, "..", INPUT_DIR, BASES_DIR)
OUTPUT_PATH = os.path.join(APP_ROOT, "..", OUTPUT_DIR)
STATIC_PATH = os.path.join(APP_ROOT, STATIC_DIR)

# Mount static files directory
app.mount("/static", StaticFiles(directory=STATIC_PATH), name="static")
app.mount("/inputs", StaticFiles(directory=INPUT_PATH), name="inputs")
app.mount("/outputs", StaticFiles(directory=OUTPUT_PATH), name="outputs")
app.mount("/bases", StaticFiles(directory=BASES_PATH), name="bases")

templates = Jinja2Templates(directory="web/templates")

def parse_optional_float(value: str) -> Optional[float]:
    """
    Parse an optional float from form data.
    Converts empty strings to None, otherwise attempts to parse as float.
    """
    if value is None or value == "" or (isinstance(value, str) and value.strip() == ""):
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

@app.get("/", response_class=HTMLResponse)
def get_form(
    request: Request,
    hueforge_file: str = None,
    base_file: str = None,
    output_name: str = None,
    rotate_base: int = 0,
    force_scale: float = None,
    scaledown: bool = False,
    xshift: float = None,
    yshift: float = None,
    zshift: float = None,
    color_mode: str = "none"
):
    """
    Render the main HTML form that allows the user
    to specify all parameters and upload the .3mf files.
    """
    default_base_models = [f for f in os.listdir(BASES_PATH) if f.endswith('.3mf')]  # Update path
    return templates.TemplateResponse("index.html", {
        "request": request,
        "hueforge_file": hueforge_file,
        "base_file": base_file,
        "output_name": output_name,
        "rotate_base": rotate_base,
        "force_scale": force_scale,
        "scaledown": scaledown,
        "xshift": xshift,
        "yshift": yshift,
        "zshift": zshift,
        "color_mode": color_mode,
        "default_base_models": default_base_models
    })

@app.post("/preview-model")
async def preview_model(file: UploadFile = File(...)):
    """
    Convert uploaded 3MF file to GLB format for Three.js preview.
    Returns the GLB file as binary data.
    """
    try:
        # Create temporary file for the upload
        with tempfile.NamedTemporaryFile(delete=False, suffix='.3mf') as tmp_input:
            content = await file.read()
            tmp_input.write(content)
            tmp_input_path = tmp_input.name

        # Load the 3MF file with trimesh
        mesh = trimesh.load(tmp_input_path, file_type='3mf')

        # If it's a scene with multiple meshes, combine them
        if isinstance(mesh, trimesh.Scene):
            # Get all geometries and combine them
            meshes = []
            for node_name in mesh.graph.nodes_geometry:
                # Get transform and geometry name from the graph
                transform, geometry_name = mesh.graph.get(node_name)
                geometry = mesh.geometry[geometry_name]
                meshes.append(geometry.apply_transform(transform))
            if meshes:
                mesh = trimesh.util.concatenate(meshes)
            else:
                # Use the first geometry if available
                if len(mesh.geometry) > 0:
                    mesh = list(mesh.geometry.values())[0]

        # Create temporary file for GLB export
        with tempfile.NamedTemporaryFile(delete=False, suffix='.glb') as tmp_output:
            tmp_output_path = tmp_output.name

        # Export as GLB
        mesh.export(tmp_output_path, file_type='glb')

        # Read the GLB file
        with open(tmp_output_path, 'rb') as f:
            glb_content = f.read()

        # Cleanup temporary files
        os.unlink(tmp_input_path)
        os.unlink(tmp_output_path)

        # Return GLB file
        return Response(
            content=glb_content,
            media_type='model/gltf-binary',
            headers={
                'Content-Disposition': f'inline; filename="{file.filename}.glb"'
            }
        )

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR in preview-model: {error_details}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to convert model: {str(e)}"}
        )

def generate_output_filename(base_file: str, hueforge_file: str) -> str:
    """Generate a default output filename from input files."""
    base_name = os.path.splitext(os.path.basename(base_file))[0]
    hueforge_name = os.path.splitext(os.path.basename(hueforge_file))[0]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"combined_{base_name}_{hueforge_name}_{timestamp}.3mf"

def ensure_3mf_extension(filename: str) -> str:
    """Ensure the filename has a .3mf extension."""
    if not filename:
        return "output.3mf"

    # Strip any whitespace
    filename = filename.strip()

    # Check if it already has .3mf extension (case insensitive)
    if not filename.lower().endswith('.3mf'):
        return f"{filename}.3mf"
    return filename

@app.post("/get-layers")
async def get_layers(file: UploadFile = File(...), z_shift: float = Form(0.0)):
    """
    Extract layer information from uploaded 3MF file.
    Returns JSON with layer heights, colors, and metadata.
    """
    try:
        # Import layer parser
        import sys
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
        from smithforge.layer_parser import parse_3mf_layers, serialize_layers, adjust_layers_for_zshift

        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.3mf') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Parse layers
        layer_data = parse_3mf_layers(tmp_path)

        # Apply Z shift if provided
        if z_shift != 0.0 and layer_data.get('layers'):
            layer_data['layers'] = adjust_layers_for_zshift(layer_data['layers'], z_shift)

        # Clean up temp file
        os.unlink(tmp_path)

        # Serialize and return
        return JSONResponse(content=serialize_layers(layer_data))

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to parse layers: {str(e)}"}
        )

@app.post("/run-smithforge")
async def run_smithforge(
    request: Request,
    hueforge_file: UploadFile = File(...),
    base_file: UploadFile = File(None),
    default_base: str = Form(None),  # Add default_base parameter
    output_name: str = Form(None),  # Change default to None
    rotate_base: int = Form(0),
    force_scale: str = Form(""),  # Accept as string, parse later
    scaledown: bool = Form(False),
    xshift: str = Form(""),  # Accept as string, parse later
    yshift: str = Form(""),  # Accept as string, parse later
    zshift: str = Form(""),  # Accept as string, parse later
    color_mode: str = Form("none"),  # Color layer mode: none, preserve, inject
    swap_instructions_text: str = Form(""),  # Text swap instructions
    swap_instructions_file: UploadFile = File(None),  # Text file with swap instructions
    auto_repair: bool = Form(False),  # Auto-repair mesh issues
    fill_gaps: bool = Form(False),  # Fill gaps between overlay and base
    output_format: str = Form("standard"),  # Output format: standard or bambu
):
    """
    Receives the uploaded .3mf files and parameters from the form.
    Then invokes the Python script with subprocess, returning stdout & stderr.
    """
    # Parse optional float fields
    force_scale_val = parse_optional_float(force_scale)
    xshift_val = parse_optional_float(xshift)
    yshift_val = parse_optional_float(yshift)
    zshift_val = parse_optional_float(zshift)
    # Generate default output name if none provided
    if not output_name:
        base_filename = base_file.filename if base_file else default_base
        output_name = generate_output_filename(base_filename, hueforge_file.filename)

    # Always ensure .3mf extension is present
    output_name = ensure_3mf_extension(output_name)

    # Ensure input and output directories exist
    os.makedirs(INPUT_PATH, exist_ok=True)
    os.makedirs(OUTPUT_PATH, exist_ok=True)

    # Save input files
    hueforge_path = os.path.join(INPUT_PATH, hueforge_file.filename)
    
    # Handle base file path
    if base_file and base_file.filename:
        base_path = os.path.join(BASES_PATH, base_file.filename)
        with open(base_path, "wb") as f:
            f.write(await base_file.read())
    elif default_base:
        base_path = os.path.join(BASES_PATH, default_base)
        if not os.path.exists(base_path):
            return templates.TemplateResponse(
                "error.html",
                {
                    "request": request,
                    "error": "Selected base model not found",
                    "log": f"File not found: {base_path}"
                }
            )
    else:
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "error": "No base model provided",
                "log": "Either upload a base file or select a default base model"
            }
        )

    output_path = os.path.join(OUTPUT_PATH, output_name)

    with open(hueforge_path, "wb") as f:
        f.write(await hueforge_file.read())

    #DEV: Generate result image path
    #DEV: result_image_name = f"{os.path.splitext(output_name)[0]}.png"
    #DEV: result_image_path = os.path.join(OUTPUT_PATH, result_image_name)

    # 3) Construct the command for main_script.py
    command = [
        "python3",  # Use python3 explicitly for compatibility
        "smithforge/smithforge.py",
        "--hueforge", hueforge_path,
        "--base", base_path,
        "--output", output_path,  # Use full output path
        "--rotatebase", str(rotate_base),
        #"--result-image", result_image_path  # Add result image path
    ]

    # If user provided a force_scale value, pass it
    if force_scale_val is not None:
        command += ["--scale", str(force_scale_val)]

    # If scaledown is checked, pass the --scaledown flag
    if scaledown:
        command.append("--scaledown")

    # Handle color layer mode
    swap_text_file_path = None  # Track temp file for cleanup
    if color_mode == "preserve":
        command.append("--preserve-colors")
    elif color_mode == "inject":
        # Get swap instructions text (from textarea or file)
        swap_text = swap_instructions_text.strip()

        # If file is provided, read it and prefer file content over textarea
        if swap_instructions_file and swap_instructions_file.filename:
            file_content = await swap_instructions_file.read()
            swap_text = file_content.decode('utf-8')

        if swap_text:
            # Save swap text to a temporary file (smithforge.py expects a file path)
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp_swap:
                tmp_swap.write(swap_text)
                swap_text_file_path = tmp_swap.name

            # Pass the file path to smithforge.py
            command += ["--inject-colors-text", swap_text_file_path]
        else:
            # No text provided - should show error but let smithforge handle it
            print("⚠️  Warning: Inject mode selected but no swap instructions provided")

    # If auto_repair is checked, pass the --auto-repair flag
    if auto_repair:
        command.append("--auto-repair")

    # If fill_gaps is checked, pass the --fill-gaps flag
    if fill_gaps:
        command.append("--fill-gaps")

    # Pass xshift, yshift, zshift only if they are set
    if xshift_val is not None:
        command += ["--xshift", str(xshift_val)]
    if yshift_val is not None:
        command += ["--yshift", str(yshift_val)]
    if zshift_val is not None:
        command += ["--zshift", str(zshift_val)]

    # Pass output format
    command += ["--output-format", output_format]

    # 4) Run the command with subprocess
    try:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
        exit_code = process.returncode

        result = {
            "command": " ".join(command),
            "exit_code": exit_code,
            "stdout": stdout.decode("utf-8"),
            "stderr": stderr.decode("utf-8"),
            "success": exit_code == 0
        }

        # If successful, add the file path
        if exit_code == 0:
            # Clean and compact log lines
            log_lines = []
            for line in result["stdout"].split('\n'):
                line = line.strip()
                if line and not line.isspace():
                    # Remove duplicate "===" lines
                    if not (line.startswith('===') and log_lines and log_lines[-1].startswith('===')):
                        # Remove redundant empty lines between sections
                        if not (line.startswith('---') and log_lines and log_lines[-1].startswith('---')):
                            log_lines.append(line)

            result["output_file"] = output_path

            # Return JSON for AJAX request
            return JSONResponse(content={
                "success": True,
                "output_filename": output_name,
                "download_url": f"/outputs/{output_name}",
                "log_lines": log_lines,
                "parameters": {
                    "hueforge_file": hueforge_file.filename,
                    "base_file": base_file.filename if base_file else default_base,
                    "output_name": output_name,
                    "rotate_base": rotate_base,
                    "force_scale": force_scale_val,
                    "scaledown": scaledown,
                    "xshift": xshift_val,
                    "yshift": yshift_val,
                    "zshift": zshift_val,
                    "color_mode": color_mode,
                    "auto_repair": auto_repair,
                    "fill_gaps": fill_gaps,
                    "output_format": output_format
                }
            })
        else:
            error_message = "An error occurred during processing"
            if "Not all meshes are volumes" in result["stderr"]:
                error_message = "Input models are not watertight. Enable auto-repair to fix this."

            # Return JSON error for AJAX request
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": error_message,
                    "log": result["stderr"]
                }
            )
    finally:
        # Clean up temporary swap instructions file
        if swap_text_file_path and os.path.exists(swap_text_file_path):
            try:
                os.unlink(swap_text_file_path)
            except Exception as e:
                print(f"⚠️  Warning: Could not delete temp file {swap_text_file_path}: {e}")

if __name__ == "__main__":
    # For local testing only
    uvicorn.run(app, host="0.0.0.0", port=8000)