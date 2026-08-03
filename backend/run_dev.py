import os
import sys
import socket
import subprocess
import threading
import time

def get_python_executable():
    """Detects and returns the virtual environment Python interpreter if available."""
    backend_dir = os.path.dirname(os.path.abspath(__file__))

    # Possible virtual environment Python paths (Windows & Unix)
    candidate_paths = [
        os.path.join(backend_dir, "venv", "Scripts", "python.exe"),
        os.path.join(backend_dir, ".venv", "Scripts", "python.exe"),
        os.path.join(backend_dir, "venv", "bin", "python"),
        os.path.join(backend_dir, ".venv", "bin", "python"),
    ]

    for path in candidate_paths:
        if os.path.exists(path):
            return path

    return sys.executable

def check_redis_running(host='127.0.0.1', port=6379, timeout=1.0) -> bool:
    """Check if Redis is currently listening on host:port."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.error, OSError):
        return False

def start_redis_if_needed():
    """Attempt to verify Redis status or launch redis-server if available."""
    if check_redis_running():
        print("[Runner]: Redis server is running on 127.0.0.1:6379.")
        return None

    print("[Runner]: Redis server is not running on 127.0.0.1:6379. Attempting to start...")
    try:
        redis_proc = subprocess.Popen(
            ["redis-server"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        time.sleep(1.5)
        if check_redis_running():
            print("[Runner]: redis-server started successfully.")
            return redis_proc
        else:
            print("[Runner Warning]: Attempted to start redis-server, but port 6379 is not responding yet.")
            return redis_proc
    except FileNotFoundError:
        print("[Runner Warning]: 'redis-server' command not found in PATH.")
        print("[Runner Warning]: Make sure Redis/Memurai is running on localhost:6379 for Celery task processing.")
        return None

def stream_logs(process: subprocess.Popen, prefix: str):
    """Continuously reads stdout lines from a subprocess and prints with a formatted prefix."""
    try:
        if process.stdout:
            for line in iter(process.stdout.readline, ''):
                if not line:
                    break
                print(f"{prefix} {line.rstrip()}")
    except Exception:
        pass

def main():
    python_bin = get_python_executable()

    print("=" * 65)
    print("      Cold Email Backend Launcher (FastAPI + Celery + Redis)")
    print("=" * 65)
    print(f"[Runner]: Using Python Interpreter: {python_bin}")

    redis_proc = start_redis_if_needed()

    # Launch FastAPI Server with Uvicorn
    fastapi_cmd = [
        python_bin, "-m", "uvicorn", "main:app",
        "--reload",
        "--host", "0.0.0.0",
        "--port", "8000"
    ]
    print("[Runner]: Starting FastAPI server (uvicorn main:app --reload)...")
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    fastapi_proc = subprocess.Popen(
        fastapi_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        cwd=backend_dir
    )

    # Launch Celery Worker
    celery_cmd = [
        python_bin, "-m", "celery",
        "-A", "celery_app.celery_app",
        "worker",
        "--loglevel=info",
        "-P", "threads",
        "--concurrency=16"
    ]
    print("[Runner]: Starting Celery Worker (celery -A celery_app.celery_app worker -P threads)...")
    celery_proc = subprocess.Popen(
        celery_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        cwd=backend_dir
    )

    # Start stdout reader threads for realtime log output
    fastapi_thread = threading.Thread(
        target=stream_logs, args=(fastapi_proc, "[FastAPI]"), daemon=True
    )
    celery_thread = threading.Thread(
        target=stream_logs, args=(celery_proc, "[Celery]"), daemon=True
    )

    fastapi_thread.start()
    celery_thread.start()

    print("[Runner]: All backend processes started successfully. Press Ctrl+C to stop.")
    print("-" * 65)

    try:
        while True:
            # Check if any process exited prematurely
            fastapi_code = fastapi_proc.poll()
            celery_code = celery_proc.poll()

            if fastapi_code is not None:
                print(f"\n[Runner Error]: FastAPI process exited unexpectedly with code {fastapi_code}")
                break
            if celery_code is not None:
                print(f"\n[Runner Error]: Celery worker process exited unexpectedly with code {celery_code}")
                break

            time.sleep(0.5)

    except KeyboardInterrupt:
        print("\n[Runner]: Shutdown signal received (Ctrl+C). Terminating child processes...")

    finally:
        # Gracefully shutdown sub-processes
        for proc, name in [(fastapi_proc, "FastAPI"), (celery_proc, "Celery"), (redis_proc, "Redis")]:
            if proc and proc.poll() is None:
                print(f"[Runner]: Stopping {name}...")
                try:
                    proc.terminate()
                    proc.wait(timeout=3)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass

        print("[Runner]: Backend launcher shut down cleanly.")

if __name__ == "__main__":
    main()
