# QSVM Med • Brain Tumor Screening with a Quantum Kernel SVM

An academic research prototype evaluating an **8-qubit quantum-kernel Support Vector Machine (QSVM)** against a tuned **classical RBF SVM** on brain MRI slices.

- **Live Backend API**: `https://qsvm-med.onrender.com`
- **Documentation**: For full mathematical formulations, pipeline architecture, and metrics, see [DOCUMENTATION.md](DOCUMENTATION.md).

---

## 👥 Research Team (Team 5 Qubits)

- **Kartikey Mishra**: Quantum ML & Research
- **Kunal**: Frontend & Visualization
- **Kush**: Backend & Pipeline
- **Kartikey**: Dataset & Validation
- **Gaurav**: System Architecture & Research

---

## 📁 Project Structure

```
QSVM/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI REST endpoints
│   │   ├── core/            # Configuration and authentication
│   │   ├── models/          # Pre-trained models and benchmark metrics
│   │   ├── schemas/         # Pydantic data schemas
│   │   ├── services/        # Preprocessing, PCA, and quantum inference
│   │   └── main.py          # FastAPI application entrypoint
│   ├── requirements.txt     # Python backend dependencies
│   ├── run_server.py        # Local server runner
│   └── train_brain_mri.py   # Training and benchmark script
├── frontend/
│   ├── src/                 # React components, viewer, and state
│   ├── public/              # Icons and static assets
│   ├── .env.production      # Render production API configuration
│   ├── package.json         # Node.js dependencies
│   └── vite.config.ts       # Vite build configuration
├── DOCUMENTATION.md         # Comprehensive project documentation
├── render.yaml              # Render deployment blueprint
├── run_backend.bat          # Start backend server (:8000)
├── run_frontend.bat         # Start frontend server (:5173)
└── start_all.bat            # One-click launcher for both services
```

---

## 🚀 Quick Start

### 1. Run with Live Render Backend (Fastest)
The frontend is already configured to communicate with the live backend at `https://qsvm-med.onrender.com`.

```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 2. Run Completely Locally
To run both backend and frontend on your machine:

**Backend**:
```bash
cd backend
pip install -r requirements.txt
python run_server.py
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

Or double-click **`start_all.bat`** on Windows.

---

## 🔑 Authorized Credentials (for Evaluators / Judges)

- **Username**: `psit`
- **Password**: `FSAVDfghj@1234`

---

## 📊 Benchmark Summary (1,468 Held-Out Test Slices)

| Metric | QSVM (8 Qubit Quantum Kernel) | Classical SVM (Tuned RBF) |
| :--- | :---: | :---: |
| **Accuracy** | **94.01%** | **95.44%** |
| **Tumor Recall** | **95.08%** | **94.61%** |
| **Precision** | **96.69%** | **99.12%** |
| **F1 Score** | **95.88%** | **96.82%** |
| **ROC AUC** | **0.9674** | **0.9915** |
| **Dataset** | Kaggle Brain Tumor MRI Dataset | Official Testing Split |

---

## ⚖️ Scope & Disclaimer

Research prototype. Not for clinical use. Predictions are global binary labels for individual 2D slices evaluated using simulated statevector quantum kernels.
