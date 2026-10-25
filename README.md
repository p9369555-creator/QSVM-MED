# QSVM Medical SaaS Platform

A Quantum Machine Learning (QML) platform for medical scan analysis using **FastAPI**, **React**, and **Vite**.

---

## 📁 Project Structure

```
QSVM/
├── backend/
│   ├── app/
│   │   ├── api/             # API routes
│   │   ├── core/            # App configurations
│   │   ├── models/          # Pre-trained models and weights
│   │   ├── schemas/         # Pydantic data schemas
│   │   ├── services/        # ML and quantum inference services
│   │   └── main.py          # FastAPI application entrypoint
│   ├── requirements.txt     # Python backend dependencies
│   └── run_server.py        # Python server launcher
├── frontend/
│   ├── src/                 # React UI components & dashboard
│   ├── public/              # Static assets
│   ├── .env                 # API configuration (http://localhost:8000)
│   ├── package.json         # Node.js dependencies
│   └── vite.config.ts       # Vite build & local proxy settings
├── sample_scans/
│   └── sample_chest_xray.jpg# Sample clinical scan for testing
├── sample_medical_scan.jpg  # Input test image
├── run_backend.bat          # Start backend server (:8000)
├── run_frontend.bat         # Start frontend development server (:5173)
└── start_all.bat            # One-click launcher for both services
```

---

## 🚀 Getting Started

### One-Click Launch (Recommended)
Double-click **`start_all.bat`**. This will:
1. Start the FastAPI backend on `http://127.0.0.1:8000` (docs at `/docs`).
2. Start the React frontend on `http://localhost:5173`.
3. Open your browser directly to the dashboard.

### Dashboard Login Credentials
- **Researcher ID**: `researcher` (set `AUTH_USERNAME` in `backend/.env` to change)
- **Passkey**: `ChangeMe2026!` (default — set `AUTH_PASSWORD_HASH` and `JWT_SECRET_KEY` in `backend/.env` before sharing this anywhere)

---

## 🧪 Testing Scan Analysis
1. Log in to the dashboard.
2. In the **Input Data** section, upload a grayscale brain MRI slice (for example an image from the Kaggle dataset's `Testing/` folder).
3. Click **Process via QSVM** to observe the inference results, spatial heatmap, and telemetry.

---

## 🧠 Training on real data

This project classifies brain MRI as **no tumor vs tumor**. `backend/setup_dataset.py` only makes *synthetic demo images* — never use it for real results.

```
cd backend
pip install -r requirements.txt
python train_brain_mri.py                        # downloads the real Kaggle dataset, trains both models on all of it
python train_brain_mri.py --qsvm-max-train 300   # quick first run
```

Every number in `app/models/benchmark_metrics.json` (and therefore the dashboard) is measured on the dataset's official `Testing/` folder. The QSVM is a *simulated* 8-qubit statevector kernel, not quantum hardware, and this is a research prototype — not a medical device.

---

## 🛡️ Upload checks

Every upload goes through input checks. **They cannot confirm an image is a brain MRI** — they only catch clearly unsuitable inputs.

- **Always on:** blank images, extreme shapes, very low resolution, noise-like images.
- **Optional learned check** ("looks unlike the training data", e.g. CT or X-ray): create `backend/ood_probes/` with a few non-brain images, then run `python build_ood_detector.py`. It is enabled only if it passes validation against your probe images; the report says so.
- **Mode** (`INPUT_CHECK_MODE` in `backend/.env`): `warn` (default — result plus a warning banner), `reject` (HTTP 422), or `off`.

