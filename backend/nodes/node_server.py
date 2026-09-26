import os
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse


# ==================================================
# NODE CONFIGURATION
# ==================================================

NODE_ID = os.getenv("NODE_ID", "node-01")

PORT = int(os.getenv("PORT", "8001"))

BASE_DIR = Path(__file__).resolve().parent

STORAGE_DIR = BASE_DIR / "storage" / NODE_ID

STORAGE_DIR.mkdir(
    parents=True,
    exist_ok=True
)

SIMULATION_STATUS = "healthy"  # "healthy" | "failed" | "offline"


# ==================================================
# FASTAPI APP
# ==================================================

app = FastAPI(
    title=f"Vault {NODE_ID}"
)


# ==================================================
# CORS
# ==================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


@app.middleware("http")
async def check_simulation_status(request, call_next):
    if SIMULATION_STATUS != "healthy":
        path = request.url.path
        if not path.endswith("/restore"):
            return JSONResponse(
                status_code=503,
                content={"detail": f"Node {NODE_ID} is {SIMULATION_STATUS}"}
            )
    return await call_next(request)


# ==================================================
# NODE INFORMATION
# ==================================================

@app.get("/")
def node_info():

    return {

        "node_id": NODE_ID,

        "port": PORT,

        "status": SIMULATION_STATUS,

        "storage_path": str(STORAGE_DIR)

    }


# ==================================================
# HEALTH CHECK
# ==================================================

@app.get("/health")
def health():

    if SIMULATION_STATUS != "healthy":

        raise HTTPException(

            status_code=503,

            detail=f"Node {NODE_ID} is {SIMULATION_STATUS}"

        )

    return {

        "node_id": NODE_ID,

        "status": "healthy"

    }


# ==================================================
# SIMULATION CONTROLS
# ==================================================

@app.post("/simulate-failure")
def simulate_failure():

    global SIMULATION_STATUS

    SIMULATION_STATUS = "failed"

    return {

        "message": "Node failure simulated",

        "node_id": NODE_ID,

        "status": "failed"

    }


@app.post("/kill")
def kill_node():

    global SIMULATION_STATUS

    SIMULATION_STATUS = "offline"

    return {

        "message": "Node offline simulated",

        "node_id": NODE_ID,

        "status": "offline"

    }


@app.post("/restore")
def restore_node():

    global SIMULATION_STATUS

    SIMULATION_STATUS = "healthy"

    return {

        "message": "Node restored",

        "node_id": NODE_ID,

        "status": "healthy"

    }


# ==================================================
# LIST OBJECTS
# ==================================================

@app.get("/objects")
def list_objects():

    objects = []


    for item in STORAGE_DIR.iterdir():

        if item.is_file():

            objects.append({

                "name": item.name,

                "size": item.stat().st_size

            })


    return {

        "node_id": NODE_ID,

        "objects": objects

    }


# ==================================================
# UPLOAD OBJECT
# ==================================================

@app.post("/objects")
async def upload_object(file: UploadFile = File(...)):

    file_path = STORAGE_DIR / file.filename


    try:

        with open(file_path, "wb") as output_file:

            while True:

                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                output_file.write(chunk)


    except Exception as error:

        raise HTTPException(

            status_code=500,

            detail=f"Failed to store object: {error}"

        )


    return {

        "message": "Object stored",

        "node_id": NODE_ID,

        "filename": file.filename,

        "size": file_path.stat().st_size

    }


# ==================================================
# REPAIR / REPLACE OBJECT
# ==================================================

@app.put("/objects/{filename}")
async def repair_object(
    filename: str,
    file: UploadFile = File(...)
):

    file_path = STORAGE_DIR / filename

    try:

        with open(file_path, "wb") as output_file:

            while True:

                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                output_file.write(chunk)

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to repair object: {error}"
        )

    return {
        "message": "Object repaired",
        "node_id": NODE_ID,
        "filename": filename,
        "size": file_path.stat().st_size
    }


# ==================================================
# CORRUPT OBJECT
# ==================================================

@app.post("/objects/{filename}/corrupt")
async def corrupt_object(filename: str):

    file_path = STORAGE_DIR / filename


    if not file_path.exists():

        raise HTTPException(

            status_code=404,

            detail="Object not found"

        )


    with open(file_path, "ab") as file:

        file.write(b"CORRUPTED_BY_VAULT")


    return {

        "message": "Object corrupted",

        "node_id": NODE_ID,

        "filename": filename

    }


# ==================================================
# DOWNLOAD OBJECT
# ==================================================

@app.get("/objects/{object_name}")
def download_object(object_name: str):

    file_path = STORAGE_DIR / object_name


    if not file_path.exists():

        raise HTTPException(

            status_code=404,

            detail="Object not found"

        )


    return FileResponse(

        path=file_path,

        filename=file_path.name

    )


# ==================================================
# DELETE OBJECT
# ==================================================

@app.delete("/objects/{object_name}")
def delete_object(object_name: str):

    file_path = STORAGE_DIR / object_name


    if not file_path.exists():

        raise HTTPException(

            status_code=404,

            detail="Object not found"

        )


    file_path.unlink()


    return {

        "message": "Object deleted",

        "node_id": NODE_ID,

        "object": object_name

    }