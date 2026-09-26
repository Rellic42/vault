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

SYSTEM_ACTIVITIES = [
    {
        "id": "act-init-1",
        "type": "success",
        "icon": "✓",
        "time": datetime.now().strftime("%H:%M:%S"),
        "title": "Vault Controller started",
        "description": "Heartbeat and auto-replication background tasks initialized across 5 nodes",
        "statusTag": "Healthy"
    }
]


def log_system_activity(act_type: str, icon: str, title: str, description: str, status_tag: str):
    activity = {
        "id": f"act-{uuid.uuid4().hex[:8]}",
        "type": act_type,
        "icon": icon,
        "time": datetime.now().strftime("%H:%M:%S"),
        "title": title,
        "description": description,
        "statusTag": status_tag
    }
    SYSTEM_ACTIVITIES.insert(0, activity)
    if len(SYSTEM_ACTIVITIES) > 30:
        SYSTEM_ACTIVITIES.pop()


def load_metadata():
    if not METADATA_FILE.exists():
        return {}
    try:
        with open(METADATA_FILE, "r") as file:
            return json.load(file)
    except Exception:
        return {}


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


def get_node(node_id):
    return next(
        (node for node in NODES if node["id"] == node_id),
        None
    )


# ==================================================
# HEARTBEAT CHECK
# ==================================================

async def heartbeat_check():
    async with httpx.AsyncClient() as client:
        for node in NODES:
            node_id = node["id"]
            prev_status = node_states[node_id]["status"]
            try:
                response = await client.get(
                    f"{node['address']}/health",
                    timeout=2
                )
                if response.status_code == 200:
                    new_status = "healthy"
                else:
                    new_status = "failed"
            except Exception:
                new_status = "failed"

            node_states[node_id]["status"] = new_status
            node_states[node_id]["last_heartbeat"] = datetime.now().isoformat()

            if prev_status == "healthy" and new_status == "failed":
                log_system_activity(
                    "warning",
                    "⚠",
                    f"{node['id']} unavailable",
                    f"Heartbeat lost on {node['address']}. Node remains offline; auto-replicating data to active nodes.",
                    "Degraded"
                )
            elif prev_status in ("failed", "unknown") and new_status == "healthy":
                log_system_activity(
                    "success",
                    "✓",
                    f"{node['id']} restored",
                    f"Heartbeat restored on {node['address']}.",
                    "Healthy"
                )


# ==================================================
# AUTO RE-REPLICATION (LEAVING KILLED NODES KILLED)
# ==================================================

async def auto_rereplicate_objects():
    metadata = load_metadata()
    if not metadata:
        return

    changed = False

    async with httpx.AsyncClient() as client:
        for object_id, obj in metadata.items():
            required_factor = obj.get("replication_factor", 3)
            current_replicas = list(obj.get("replicas", []))

            valid_healthy_replicas = []

            # 1. Identify which currently assigned nodes are online and hold a valid uncorrupted copy vs corrupted copy
            corrupted_replicas = []
            for node_id in current_replicas:
                # If node is offline/failed, DO NOT touch or repair that node. Leave it killed!
                if node_states.get(node_id, {}).get("status") != "healthy":
                    continue

                node = get_node(node_id)
                if not node:
                    continue

                try:
                    res = await client.get(f"{node['address']}/objects/{obj['name']}", timeout=3)
                    if res.status_code == 200:
                        actual_checksum = calculate_checksum(res.content)
                        if actual_checksum == obj["checksum"]:
                            valid_healthy_replicas.append(node_id)
                        else:
                            corrupted_replicas.append(node_id)
                except Exception:
                    pass

            # 1b. Fix data corruption on online nodes by replacing corrupted file with valid copy from healthy node!
            if corrupted_replicas and valid_healthy_replicas:
                source_node_id = valid_healthy_replicas[0]
                source_node = get_node(source_node_id)
                try:
                    source_res = await client.get(f"{source_node['address']}/objects/{obj['name']}", timeout=10)
                    if source_res.status_code == 200 and calculate_checksum(source_res.content) == obj["checksum"]:
                        valid_file_bytes = source_res.content
                        for corr_node_id in corrupted_replicas:
                            corr_node = get_node(corr_node_id)
                            log_system_activity(
                                "warning", "⚠", "Data corruption detected",
                                f"Checksum mismatch for {obj['name']} on {corr_node_id}. Replacing corrupted data with healthy copy from {source_node_id}.",
                                "Mismatch"
                            )
                            # Put/replace valid data back to corrupted node endpoint
                            put_res = await client.put(
                                f"{corr_node['address']}/objects/{obj['name']}",
                                files={"file": (obj["name"], valid_file_bytes, "application/octet-stream")},
                                timeout=15
                            )
                            if put_res.status_code == 200:
                                valid_healthy_replicas.append(corr_node_id)
                                log_system_activity(
                                    "success", "✓", "Corrupted replica repaired",
                                    f"Overwrote corrupted copy of {obj['name']} on {corr_node_id} with clean data from {source_node_id}.",
                                    "Verified"
                                )
                                changed = True
                except Exception as e:
                    print(f"[VAULT] Repair corruption error: {e}")

            # 2. If valid active replicas < required_factor, auto-replicate to a NEW healthy node!
            needed_new = required_factor - len(valid_healthy_replicas)
            if needed_new > 0:
                # Must have at least one valid healthy source replica
                if not valid_healthy_replicas:
                    if obj.get("status") != "failed":
                        obj["status"] = "failed"
                        changed = True
                    continue

                source_node_id = valid_healthy_replicas[0]
                source_node = get_node(source_node_id)

                try:
                    source_res = await client.get(f"{source_node['address']}/objects/{obj['name']}", timeout=10)
                    if source_res.status_code != 200 or calculate_checksum(source_res.content) != obj["checksum"]:
                        continue
                    file_bytes = source_res.content
                except Exception:
                    continue

                # Find candidate HEALTHY nodes in the cluster that are NOT in valid_healthy_replicas
                candidate_nodes = [
                    n for n in NODES
                    if n["id"] not in valid_healthy_replicas
                    and node_states.get(n["id"], {}).get("status") == "healthy"
                ]

                for target_node in candidate_nodes[:needed_new]:
                    try:
                        log_system_activity(
                            "processing", "↻", "Auto-replication initiated",
                            f"Cloning {obj['name']} from {source_node['id']} → {target_node['id']} (leaving killed node offline)",
                            "Cloning"
                        )
                        post_res = await client.post(
                            f"{target_node['address']}/objects",
                            files={"file": (obj["name"], file_bytes, "application/octet-stream")},
                            timeout=20
                        )
                        if post_res.status_code == 200:
                            valid_healthy_replicas.append(target_node["id"])
                            log_system_activity(
                                "success", "✓", "Auto-replication complete",
                                f"New replica of {obj['name']} stored on {target_node['id']} ({len(valid_healthy_replicas)}/{required_factor} active replicas)",
                                "Healthy"
                            )
                            changed = True
                    except Exception as e:
                        print(f"[VAULT] Auto-replication error to {target_node['id']}: {e}")

            # Update metadata with current valid healthy replicas
            if set(obj.get("replicas", [])) != set(valid_healthy_replicas[:required_factor]):
                obj["replicas"] = valid_healthy_replicas[:required_factor]
                obj["available_replicas"] = valid_healthy_replicas
                obj["verified_replicas"] = valid_healthy_replicas
                obj["status"] = "healthy" if len(valid_healthy_replicas) >= required_factor else "degraded"
                changed = True

    if changed:
        save_metadata(metadata)


# ==================================================
# HEARTBEAT LOOP
# ==================================================

async def heartbeat_loop():
    while True:
        try:
            # 1. Check node availability (killed nodes stay failed)
            await heartbeat_check()

            # 2. Auto-replicate missing copies to other HEALTHY nodes
            await auto_rereplicate_objects()

        except Exception as error:
            print(f"[VAULT] Background task error: {error}")

        await asyncio.sleep(4)


# ==================================================
# START BACKGROUND SERVICES
# ==================================================

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(heartbeat_loop())


# ==================================================
# ROOT & ENDPOINTS
# ==================================================

@app.get("/")
def controller_info():
    return {
        "service": "Vault Controller",
        "status": "running",
        "nodes": len(NODES),
        "heartbeat_interval": "4 seconds"
    }


@app.get("/nodes")
async def get_nodes():
    results = []
    for node in NODES:
        node_id = node["id"]
        results.append({
            **node,
            "status": node_states[node_id]["status"],
            "last_heartbeat": node_states[node_id]["last_heartbeat"]
        })
    return {"nodes": results}


@app.get("/activities")
def get_activities():
    return {"activities": SYSTEM_ACTIVITIES}


# ==================================================
# UPLOAD OBJECT
# ==================================================

@app.post("/upload")
async def upload_object(
    file: UploadFile = File(...),
    replication_factor: int = Form(3),
    durability: str = Form("high")
):
    if replication_factor < 1 or replication_factor > len(NODES):
        raise HTTPException(status_code=400, detail="Invalid replication factor")

    healthy_nodes = []
    async with httpx.AsyncClient() as client:
        for node in NODES:
            try:
                response = await client.get(f"{node['address']}/health", timeout=2)
                if response.status_code == 200:
                    healthy_nodes.append(node)
            except Exception:
                pass

    if len(healthy_nodes) < replication_factor:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Not enough healthy nodes",
                "available_nodes": len(healthy_nodes),
                "required_nodes": replication_factor
            }
        )

    selected_nodes = healthy_nodes[:replication_factor]
    file_data = await file.read()
    object_id = f"obj_{uuid.uuid4().hex[:8]}"
    checksum = calculate_checksum(file_data)

    replicas = []
    async with httpx.AsyncClient() as client:
        for node in selected_nodes:
            try:
                response = await client.post(
                    f"{node['address']}/objects",
                    files={"file": (file.filename, file_data, file.content_type)},
                    timeout=30
                )
                if response.status_code == 200:
                    replicas.append({"node_id": node["id"], "status": "stored"})
                else:
                    replicas.append({"node_id": node["id"], "status": "failed"})
            except Exception:
                replicas.append({"node_id": node["id"], "status": "failed"})

    successful_replicas = [r for r in replicas if r["status"] == "stored"]
    replica_nodes = [r["node_id"] for r in successful_replicas]

    object_status = "healthy" if len(successful_replicas) == replication_factor else ("degraded" if len(successful_replicas) > 0 else "failed")

    metadata = load_metadata()
    metadata[object_id] = {
        "object_id": object_id,
        "name": file.filename,
        "size": len(file_data),
        "checksum": checksum,
        "replication_factor": replication_factor,
        "durability": durability,
        "replicas": replica_nodes,
        "status": object_status,
        "available_replicas": replica_nodes,
        "unavailable_replicas": [],
        "verified_replicas": replica_nodes,
        "corrupted_replicas": [],
        "last_repair": None
    }
    save_metadata(metadata)

    node_names_str = ", ".join([n.replace("node-0", "Node 0") for n in replica_nodes])
    log_system_activity(
        "success", "✓", "Object uploaded",
        f"{file.filename} stored on {node_names_str}",
        "Success"
    )
    log_system_activity(
        "success", "✓", "Metadata updated",
        f"{replication_factor} replicas registered in catalog",
        "Registered"
    )

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


@app.get("/objects")
def get_objects():
    metadata = load_metadata()
    return {"objects": list(metadata.values())}


@app.get("/objects/{object_id}")
def get_object(object_id: str):
    metadata = load_metadata()
    if object_id not in metadata:
        raise HTTPException(status_code=404, detail="Object not found")
    return metadata[object_id]