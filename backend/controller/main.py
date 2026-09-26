import hashlib
import json
import uuid
from pathlib import Path

import httpx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Vault Controller")


# --------------------------------------------------
# METADATA CONFIGURATION
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

METADATA_FILE = BASE_DIR / "data" / "metadata.json"

METADATA_FILE.parent.mkdir(parents=True, exist_ok=True)


def load_metadata():
    if not METADATA_FILE.exists():
        return {}

    with open(METADATA_FILE, "r") as file:
        return json.load(file)


def save_metadata(metadata):
    with open(METADATA_FILE, "w") as file:
        json.dump(
            metadata,
            file,
            indent=2
        )


def calculate_checksum(data: bytes):
    return hashlib.sha256(data).hexdigest()


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# NODE CONFIGURATION
# --------------------------------------------------

NODES = [
    {
        "id": "node-01",
        "address": "http://localhost:8001",
        "status": "healthy"
    },
    {
        "id": "node-02",
        "address": "http://localhost:8002",
        "status": "healthy"
    },
    {
        "id": "node-03",
        "address": "http://localhost:8003",
        "status": "healthy"
    },
    {
        "id": "node-04",
        "address": "http://localhost:8004",
        "status": "healthy"
    },
    {
        "id": "node-05",
        "address": "http://localhost:8005",
        "status": "healthy"
    }
]


# --------------------------------------------------
# ROOT
# --------------------------------------------------

@app.get("/")
def controller_info():
    return {
        "service": "Vault Controller",
        "status": "running",
        "nodes": len(NODES)
    }


# --------------------------------------------------
# GET NODE STATUS
# --------------------------------------------------

@app.get("/nodes")
async def get_nodes():

    results = []

    async with httpx.AsyncClient() as client:

        for node in NODES:

            try:

                response = await client.get(
                    f"{node['address']}/health",
                    timeout=2
                )

                if response.status_code == 200:

                    results.append({
                        **node,
                        "status": "healthy"
                    })

                else:

                    results.append({
                        **node,
                        "status": "failed"
                    })

            except Exception:

                results.append({
                    **node,
                    "status": "failed"
                })

    return {
        "nodes": results
    }


# --------------------------------------------------
# UPLOAD OBJECT
# --------------------------------------------------

@app.post("/upload")
async def upload_object(
    file: UploadFile = File(...),
    replication_factor: int = Form(3),
    durability: str = Form("high")
):

    # Validate replication factor

    if replication_factor < 1 or replication_factor > len(NODES):

        raise HTTPException(
            status_code=400,
            detail="Invalid replication factor"
        )


    # --------------------------------------------------
    # FIND HEALTHY NODES
    # --------------------------------------------------

    healthy_nodes = []

    async with httpx.AsyncClient() as client:

        for node in NODES:

            try:

                response = await client.get(
                    f"{node['address']}/health",
                    timeout=2
                )

                if response.status_code == 200:

                    healthy_nodes.append(node)

            except Exception:

                pass


    # --------------------------------------------------
    # CHECK NODE AVAILABILITY
    # --------------------------------------------------

    if len(healthy_nodes) < replication_factor:

        raise HTTPException(
            status_code=503,
            detail={
                "message": "Not enough healthy nodes",
                "available_nodes": len(healthy_nodes),
                "required_nodes": replication_factor
            }
        )


    # --------------------------------------------------
    # SELECT NODES
    # --------------------------------------------------

    selected_nodes = healthy_nodes[:replication_factor]


    # --------------------------------------------------
    # READ FILE
    # --------------------------------------------------

    file_data = await file.read()

    object_id = f"obj_{uuid.uuid4().hex[:8]}"

    checksum = calculate_checksum(file_data)


    # --------------------------------------------------
    # STORE REPLICAS
    # --------------------------------------------------

    replicas = []

    async with httpx.AsyncClient() as client:

        for node in selected_nodes:

            try:

                response = await client.post(
                    f"{node['address']}/objects",
                    files={
                        "file": (
                            file.filename,
                            file_data,
                            file.content_type
                        )
                    },
                    timeout=30
                )


                if response.status_code == 200:

                    replicas.append({
                        "node_id": node["id"],
                        "status": "stored"
                    })

                else:

                    replicas.append({
                        "node_id": node["id"],
                        "status": "failed"
                    })


            except Exception:

                replicas.append({
                    "node_id": node["id"],
                    "status": "failed"
                })


    # --------------------------------------------------
    # SUCCESSFUL REPLICAS
    # --------------------------------------------------

    successful_replicas = [
        replica
        for replica in replicas
        if replica["status"] == "stored"
    ]


    replica_nodes = [
        replica["node_id"]
        for replica in successful_replicas
    ]


    # --------------------------------------------------
    # DETERMINE OBJECT STATUS
    # --------------------------------------------------

    if len(successful_replicas) == replication_factor:

        object_status = "healthy"

    elif len(successful_replicas) > 0:

        object_status = "degraded"

    else:

        object_status = "failed"


    # --------------------------------------------------
    # SAVE METADATA
    # --------------------------------------------------

    metadata = load_metadata()


    metadata[object_id] = {

        "object_id": object_id,

        "name": file.filename,

        "size": len(file_data),

        "checksum": checksum,

        "replication_factor": replication_factor,

        "durability": durability,

        "replicas": replica_nodes,

        "status": object_status
    }


    save_metadata(metadata)


    # --------------------------------------------------
    # RESPONSE
    # --------------------------------------------------

    return {

        "message": "Object stored",

        "object_id": object_id,

        "object": file.filename,

        "size": len(file_data),

        "checksum": checksum,

        "replication_factor": replication_factor,

        "durability": durability,

        "replicas": replica_nodes,

        "status": object_status
    }


# --------------------------------------------------
# GET ALL OBJECTS
# --------------------------------------------------

@app.get("/objects")
def get_objects():

    metadata = load_metadata()

    return {
        "objects": list(metadata.values())
    }


# --------------------------------------------------
# GET OBJECT METADATA
# --------------------------------------------------

@app.get("/objects/{object_id}")
def get_object(object_id: str):

    metadata = load_metadata()

    if object_id not in metadata:

        raise HTTPException(
            status_code=404,
            detail="Object not found"
        )

    return metadata[object_id]