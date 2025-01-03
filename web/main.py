# web/main.py
from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import uvicorn
import subprocess
import os
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
    zshift: float = None
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
        "default_base_models": default_base_models
    })

def generate_output_filename(base_file: str, hueforge_file: str) -> str:
    """Generate a default output filename from input files."""
    base_name = os.path.splitext(os.path.basename(base_file))[0]
    hueforge_name = os.path.splitext(os.path.basename(hueforge_file))[0]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"combined_{base_name}_{hueforge_name}_{timestamp}.3mf"

def ensure_3mf_extension(filename: str) -> str:
    """Ensure the filename has a .3mf extension."""
    if not filename.lower().endswith('.3mf'):
        return f"{filename}.3mf"
    return filename

@app.post("/run-smithforge")
async def run_smithforge(
    request: Request,
    hueforge_file: UploadFile = File(...),
    base_file: UploadFile = File(None),
    default_base: str = Form(None),  # Add default_base parameter
    output_name: str = Form(None),  # Change default to None
    rotate_base: int = Form(0),
    force_scale: float = Form(None),
    scaledown: bool = Form(False),
    xshift: float = Form(None),
    yshift: float = Form(None),
    zshift: float = Form(None),
    #DEV: fill: float = Form(None),  # Change fill parameter to float
    #DEV: watertight: bool = Form(False) 
):
    """
    Receives the uploaded .3mf files and parameters from the form.
    Then invokes the Python script with subprocess, returning stdout & stderr.
    """
    # Generate default output name if none provided
    if not output_name:
        base_filename = base_file.filename if base_file else default_base
        output_name = generate_output_filename(base_filename, hueforge_file.filename)
    else:
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
        "python", 
        "smithforge/smithforge.py",
        "--hueforge", hueforge_path,
        "--base", base_path,
        "--output", output_path,  # Use full output path
        "--rotatebase", str(rotate_base),
        #"--result-image", result_image_path  # Add result image path
    ]

    # If user provided a force_scale value, pass it
    if force_scale is not None:
        command += ["--scale", str(force_scale)]

    # If scaledown is checked, pass the --scaledown flag
    if scaledown:
        command.append("--scaledown")

    # Pass xshift, yshift, zshift only if they are set
    if xshift is not None:
        command += ["--xshift", str(xshift)]
    if yshift is not None:
        command += ["--yshift", str(yshift)]
    if zshift is not None:
        command += ["--zshift", str(zshift)]

    #DEV: Add fill parameter to command if provided
    #DEV: if fill is not None:
    #DEV:    command += ["--fill", str(fill)]

    #DEV: Add watertight parameter to command if checked
    #DEV:if watertight:
    #DEV:    command.append("--watertight")

    # 4) Run the command with subprocess
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
        #DEV: result_image_url = f"/outputs/{result_image_name}"
        return templates.TemplateResponse(
            "result.html",
            {
                "request": request,
                "result": result,
                "log_lines": log_lines,
                "download_url": f"/outputs/{output_name}",  # Updated path
                #DEV: "result_image_url": result_image_url,  # Add result image URL
                "hueforge_file": hueforge_file.filename,
                "base_file": base_file.filename if base_file else default_base,
                "output_name": output_name,
                "rotate_base": rotate_base,
                "force_scale": force_scale,
                "scaledown": scaledown,
                "xshift": xshift,
                "yshift": yshift,
                "zshift": zshift,
                #DEV: "fill": fill 
            }
        )
    else:
        error_message = "An error occurred during processing"
        if "Not all meshes are volumes" in result["stderr"]:
            error_message = "not watertight"

        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "error": error_message,
                "log": result["stderr"]  # Pass the stderr log to the template
            }
        )

if __name__ == "__main__":
    # For local testing only
    uvicorn.run(app, host="0.0.0.0", port=8000)