from typing import List

import httpx

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Vault Controller")


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
# GET NODES
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

    if replication_factor < 1 or replication_factor > len(NODES):

        raise HTTPException(
            status_code=400,
            detail="Invalid replication factor"
        )


    # Find healthy nodes

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


    # Check whether enough nodes are available

    if len(healthy_nodes) < replication_factor:

        raise HTTPException(
            status_code=503,
            detail={
                "message": "Not enough healthy nodes",
                "available_nodes": len(healthy_nodes),
                "required_nodes": replication_factor
            }
        )


    # Select nodes

    selected_nodes = healthy_nodes[:replication_factor]


    # Read uploaded file

    file_data = await file.read()


    replicas = []


    # Send file to selected nodes

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


    successful_replicas = [
        replica
        for replica in replicas
        if replica["status"] == "stored"
    ]


    return {
        "message": "Object stored",
        "object": file.filename,
        "size": len(file_data),
        "replication_factor": replication_factor,
        "durability": durability,
        "replicas": successful_replicas
    }