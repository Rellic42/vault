import os
import sys
import subprocess
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PYTHON_BIN = sys.executable

processes = []

def start():
    print("🚀 Starting Vault Distributed Storage System Backend...")

    # 1. Start 5 Storage Node Servers (Ports 8001 - 8005)
    for i in range(1, 6):
        node_id = f"node-0{i}"
        port = 8000 + i
        env = {**os.environ, "NODE_ID": node_id, "PORT": str(port), "PYTHONPATH": BASE_DIR}
        cmd = [PYTHON_BIN, "-m", "uvicorn", "nodes.node_server:app", "--port", str(port), "--host", "127.0.0.1"]
        print(f"  └─ Starting {node_id} on http://localhost:{port}")
        proc = subprocess.Popen(cmd, cwd=BASE_DIR, env=env)
        processes.append(proc)

    # Give node servers time to bind
    time.sleep(1.5)

    # 2. Start Controller Server (Port 8000)
    env = {**os.environ, "PYTHONPATH": BASE_DIR}
    cmd = [PYTHON_BIN, "-m", "uvicorn", "controller.main:app", "--port", "8000", "--host", "127.0.0.1"]
    print("  └─ Starting Vault Controller on http://localhost:8000")
    proc = subprocess.Popen(cmd, cwd=BASE_DIR, env=env)
    processes.append(proc)

    print("\n✅ Vault Backend is online!")
    print("   Controller: http://localhost:8000")
    print("   Nodes:      http://localhost:8001 - 8005\n")

    try:
        for p in processes:
            p.wait()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down Vault Backend...")
        for p in processes:
            p.terminate()

if __name__ == "__main__":
    start()
