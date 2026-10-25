import sys
import os

# Add current and app directories to python search path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.join(BASE_DIR, "app")
sys.path.insert(0, APP_DIR)
sys.path.insert(0, BASE_DIR)

import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("  Starting QSVM Medical SaaS Backend on http://127.0.0.1:8000")
    print("  API Docs available at: http://127.0.0.1:8000/docs")
    print("  Health check at: http://127.0.0.1:8000/health")
    print("=" * 60)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, app_dir=APP_DIR)
