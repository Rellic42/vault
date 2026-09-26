import asyncio
import hashlib
import json
import uuid
from datetime import datetime
from pathlib import Path

import httpx

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware


# ==================================================
# VAULT CONTROLLER
# ==================================================

app = FastAPI(title="Vault Controller")


# ==================================================
# METADATA CONFIGURATION
# ==================================================

BASE_DIR = Path(__file__).resolve().parent.parent

METADATA_FILE = BASE_DIR / "data" / "metadata.json"

METADATA_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)


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


# ==================================================
# NODE CONFIGURATION
# ==================================================

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


# ==================================================
# HEARTBEAT STATE
# ==================================================

node_states = {

    node["id"]: {

        "status": "unknown",

        "last_heartbeat": None

    }

    for node in NODES

}


# ==================================================
# HEARTBEAT CHECK
# ==================================================

async def heartbeat_check():

    async with httpx.AsyncClient() as client:

        for node in NODES:

            try:

                response = await client.get(

                    f"{node['address']}/health",

                    timeout=2

                )


                if response.status_code == 200:

                    node_states[node["id"]]["status"] = "healthy"

                    node_states[node["id"]]["last_heartbeat"] = (
                        datetime.now().isoformat()
                    )


                else:

                    node_states[node["id"]]["status"] = "failed"


            except Exception:

                node_states[node["id"]]["status"] = "failed"


# ==================================================
# UPDATE OBJECT HEALTH
# ==================================================

async def update_object_health():

    metadata = load_metadata()

    changed = False


    for object_id, obj in metadata.items():

        healthy_replicas = []


        for node_id in obj["replicas"]:

            if (
                node_id in node_states
                and node_states[node_id]["status"] == "healthy"
            ):

                healthy_replicas.append(node_id)


        # Determine object health

        if len(healthy_replicas) >= obj["replication_factor"]:

            new_status = "healthy"

        elif len(healthy_replicas) > 0:

            new_status = "degraded"

        else:

            new_status = "failed"


        if obj["status"] != new_status:

            obj["status"] = new_status

            changed = True


    if changed:

        save_metadata(metadata)


# ==================================================
# HEARTBEAT LOOP
# ==================================================

async def heartbeat_loop():

    while True:

        await heartbeat_check()

        await update_object_health()

        await asyncio.sleep(5)


# ==================================================
# START HEARTBEAT WHEN VAULT STARTS
# ==================================================

@app.on_event("startup")
async def startup_event():

    asyncio.create_task(heartbeat_loop())


# ==================================================
# ROOT
# ==================================================

@app.get("/")
def controller_info():

    return {

        "service": "Vault Controller",

        "status": "running",

        "nodes": len(NODES)

    }


# ==================================================
# GET NODE STATUS
# ==================================================

@app.get("/nodes")
async def get_nodes():

    results = []


    for node in NODES:

        results.append({

            **node,

            "status": node_states[node["id"]]["status"],

            "last_heartbeat": (
                node_states[node["id"]]["last_heartbeat"]
            )

        })


    return {

        "nodes": results

    }


# ==================================================
# UPLOAD OBJECT
# ==================================================

@app.post("/upload")
async def upload_object(

    file: UploadFile = File(...),

    replication_factor: int = Form(3),

    durability: str = Form("high")

):

    # --------------------------------------------------
    # VALIDATE REPLICATION FACTOR
    # --------------------------------------------------

    if (
        replication_factor < 1
        or replication_factor > len(NODES)
    ):

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


    # Generate unique object ID

    object_id = (
        f"obj_{uuid.uuid4().hex[:8]}"
    )


    # Calculate SHA-256

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


# ==================================================
# GET ALL OBJECTS
# ==================================================

@app.get("/objects")
def get_objects():

    metadata = load_metadata()


    return {

        "objects": list(metadata.values())

    }


# ==================================================
# GET OBJECT METADATA
# ==================================================

@app.get("/objects/{object_id}")
def get_object(object_id: str):

    metadata = load_metadata()


    if object_id not in metadata:

        raise HTTPException(

            status_code=404,

            detail="Object not found"

        )


    return metadata[object_id]