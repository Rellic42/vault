import os
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse


NODE_ID = os.getenv("NODE_ID", "node-01")
PORT = int(os.getenv("PORT", "8001"))

BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage" / NODE_ID

STORAGE_DIR.mkdir(parents=True, exist_ok=True)


app = FastAPI(title=f"Vault {NODE_ID}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# NODE INFORMATION
# --------------------------------------------------

@app.get("/")
def node_info():
    return {
        "node_id": NODE_ID,
        "port": PORT,
        "status": "healthy",
        "storage_path": str(STORAGE_DIR),
    }


@app.get("/health")
def health():
    return {
        "node_id": NODE_ID,
        "status": "healthy",
    }


# --------------------------------------------------
# LIST OBJECTS
# --------------------------------------------------

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


# --------------------------------------------------
# UPLOAD OBJECT
# --------------------------------------------------

@app.post("/objects")
async def upload_object(file: UploadFile = File(...)):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File name is required"
        )

    file_path = STORAGE_DIR / file.filename

    with open(file_path, "wb") as buffer:

        while True:

            chunk = await file.read(1024 * 1024)

            if not chunk:
                break

            buffer.write(chunk)

    return {
        "message": "Object stored successfully",
        "node_id": NODE_ID,
        "object": file.filename,
        "size": file_path.stat().st_size
    }


# --------------------------------------------------
# DOWNLOAD OBJECT
# --------------------------------------------------

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


# --------------------------------------------------
# DELETE OBJECT
# --------------------------------------------------

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