# File: backend/train_brain_mri.py
"""
Train + calibrate + benchmark the Classical SVM and the 8-qubit QSVM.

Run from backend/:

  python train_brain_mri.py                       # REAL Kaggle data (downloads via kagglehub), full QSVM
  python train_brain_mri.py --qsvm-max-train 300  # quick first run
  python train_brain_mri.py --data-dir <folder>   # Kaggle folder you already downloaded (has Training/ + Testing/)
  python train_brain_mri.py --source local        # the old flat brain_mri_dataset/ folder (SYNTHETIC demo data
                                                  #   if it was made by setup_dataset.py)
  python train_brain_mri.py --qsvm-mode sampler   # original slow Qiskit sampler kernel (capped at 120 scans)

Outputs (same files the FastAPI backend already loads), in app/models/:
  quantum_pipeline_std.pkl / _pca.pkl / _angle.pkl, classical_baseline_svm.pkl,
  qsvm_model.pkl, benchmark_metrics.json
Every number in benchmark_metrics.json is measured on held-out test data.
"""
import argparse
import glob
import hashlib
import json
import os
import re
import sys
import time

import cv2
import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.decomposition import PCA
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import GridSearchCV, GroupShuffleSplit, StratifiedShuffleSplit
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from sklearn.svm import SVC

try:
    from sklearn.frozen import FrozenEstimator
except ImportError:
    FrozenEstimator = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)          # so `app.services.exact_qkernel` is importable when pickled

MODELS_DIR = os.path.join(BASE_DIR, "app", "models")
DATASET_DIR = os.path.join(BASE_DIR, "brain_mri_dataset")
os.makedirs(MODELS_DIR, exist_ok=True)

IMG_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}
NORMAL_FOLDERS = {"no", "normal", "notumor", "no_tumor", "healthy"}
TUMOR_FOLDERS = {
    "yes", "tumor", "glioma", "meningioma", "pituitary",
    "glioma_tumor", "meningioma_tumor", "pituitary_tumor", "malignant",
}

clahe_filter = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))


# ----------------------------------------------------------------------------
# Preprocessing (must match app/services/pipeline.py exactly)
# ----------------------------------------------------------------------------
def preprocess_uint8(img_gray: np.ndarray) -> np.ndarray:
    enhanced = clahe_filter.apply(img_gray)
    return cv2.resize(enhanced, (128, 128), interpolation=cv2.INTER_AREA)


def preprocess_image(img_gray: np.ndarray) -> np.ndarray:
    """Applies CLAHE (clipLimit=2.0, 8x8) and resizes to 128x128 flattened float32 vector."""
    return preprocess_uint8(img_gray).flatten().astype(np.float32)


# ----------------------------------------------------------------------------
# Loader 1 (original): flat folder, normal/tumor sub-folders, patient-grouped split
# ----------------------------------------------------------------------------
def extract_patient_group_id(filepath: str) -> str:
    """Extracts patient/subject prefix from filename so slices from one patient stay in the same split."""
    stem = os.path.splitext(os.path.basename(filepath))[0]
    match = re.match(r"^([A-Za-z0-9]+[-_][A-Za-z0-9]+)", stem)
    if match:
        return match.group(1).lower()
    parts = re.split(r"(?:_slice|_img|-slice)", stem, flags=re.IGNORECASE)   # fixed: was a character class
    return parts[0].lower()


def load_kaggle_brain_mri_dataset(root_dir: str):
    if not os.path.exists(root_dir):
        raise FileNotFoundError(
            f"Dataset directory not found at '{root_dir}'. "
            "Extract the Kaggle Brain Tumor MRI Dataset folders ('no'/'notumor' and "
            "'yes'/'glioma'/'meningioma'/'pituitary') into backend/brain_mri_dataset/."
        )

    X_list, y_list, groups_list = [], [], []
    all_files = glob.glob(os.path.join(root_dir, "**", "*.*"), recursive=True)

    for fpath in sorted(all_files):
        ext = os.path.splitext(fpath)[1].lower()
        if ext not in IMG_EXT:
            continue
        parent = os.path.basename(os.path.dirname(fpath)).lower()
        if parent not in NORMAL_FOLDERS and parent not in TUMOR_FOLDERS:
            continue

        img = cv2.imread(fpath, cv2.IMREAD_GRAYSCALE)
        if img is None or img.shape[0] < 10 or img.shape[1] < 10:
            continue

        X_list.append(preprocess_image(img))
        y_list.append(0 if parent in NORMAL_FOLDERS else 1)
        groups_list.append(extract_patient_group_id(fpath))

    if len(X_list) < 50 or len(set(y_list)) < 2:
        raise RuntimeError(
            f"Insufficient valid scans found in '{root_dir}' (loaded {len(X_list)} images). "
            "Verify both normal and tumor class folders contain valid grayscale MRI images."
        )

    return (
        np.array(X_list, dtype=np.float32),
        np.array(y_list, dtype=np.int64),
        np.array(groups_list),
    )


def split_by_patient_groups(X: np.ndarray, y: np.ndarray, groups: np.ndarray):
    """Splits dataset into 70% Train, 15% Validation, 15% Test grouped by patient ID."""
    unique_groups = len(np.unique(groups))
    if unique_groups > 30:
        gss_test = GroupShuffleSplit(n_splits=1, test_size=0.15, random_state=42)
        train_val_idx, test_idx = next(gss_test.split(X, y, groups=groups))

        X_tv, y_tv, g_tv = X[train_val_idx], y[train_val_idx], groups[train_val_idx]
        gss_val = GroupShuffleSplit(n_splits=1, test_size=0.1765, random_state=42)
        train_rel_idx, val_rel_idx = next(gss_val.split(X_tv, y_tv, groups=g_tv))

        train_idx = train_val_idx[train_rel_idx]
        val_idx = train_val_idx[val_rel_idx]
        split_method = "Patient-Grouped Split (70% Train / 15% Validation / 15% Test)"
    else:
        sss_test = StratifiedShuffleSplit(n_splits=1, test_size=0.15, random_state=42)
        train_val_idx, test_idx = next(sss_test.split(X, y))

        X_tv, y_tv = X[train_val_idx], y[train_val_idx]
        sss_val = StratifiedShuffleSplit(n_splits=1, test_size=0.1765, random_state=42)
        train_rel_idx, val_rel_idx = next(sss_val.split(X_tv, y_tv))

        train_idx = train_val_idx[train_rel_idx]
        val_idx = train_val_idx[val_rel_idx]
        split_method = "Stratified Split (70% Train / 15% Validation / 15% Test)"

    return train_idx, val_idx, test_idx, split_method


# ----------------------------------------------------------------------------
# Loader 2 (new): the real Kaggle dataset with its OFFICIAL Training/ and Testing/ folders
# ----------------------------------------------------------------------------
LOCAL_KAGGLE_DIR = os.path.join(BASE_DIR, "kaggle_brain_mri")   # filled by download_dataset.py


def get_kaggle_root(data_dir):
    if data_dir:
        return data_dir
    if (os.path.isdir(os.path.join(LOCAL_KAGGLE_DIR, "Training"))
            and os.path.isdir(os.path.join(LOCAL_KAGGLE_DIR, "Testing"))):
        print(f"[DATA] using the dataset inside the project: {LOCAL_KAGGLE_DIR}")
        return LOCAL_KAGGLE_DIR
    try:
        import kagglehub
    except ImportError as ex:
        raise SystemExit("kagglehub is not installed. Run: pip install kagglehub  "
                         "(or download the dataset yourself and pass --data-dir <folder>).") from ex
    path = kagglehub.dataset_download("masoudnickparvar/brain-tumor-mri-dataset")
    print(f"[DATA] kagglehub dataset path: {path}")
    return path


def find_split_dir(root: str, split: str) -> str:
    for dirpath, dirnames, _ in os.walk(root):
        for d in dirnames:
            if d.lower() == split.lower():
                return os.path.join(dirpath, d)
    raise FileNotFoundError(f"No '{split}' folder found under {root}")


def load_official_split(split_dir: str):
    """Returns X (N,16384) uint8, y (0 = no tumor, 1 = any tumor), content hashes."""
    X, y, hashes = [], [], []
    for path in sorted(glob.glob(os.path.join(split_dir, "**", "*.*"), recursive=True)):
        if os.path.splitext(path)[1].lower() not in IMG_EXT:
            continue
        folder = os.path.basename(os.path.dirname(path)).lower()
        if folder in NORMAL_FOLDERS:
            label = 0
        elif folder in TUMOR_FOLDERS:
            label = 1
        else:
            continue
        img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
        if img is None or img.shape[0] < 10 or img.shape[1] < 10:
            continue
        small = preprocess_uint8(img)
        X.append(small.flatten())
        y.append(label)
        hashes.append(hashlib.md5(small.tobytes()).hexdigest())
    if not X:
        raise RuntimeError(f"No usable images under {split_dir}")
    return np.array(X, dtype=np.uint8), np.array(y, dtype=np.int64), np.array(hashes)


def dedupe(X, y, hashes, forbidden=frozenset()):
    """Drop exact duplicate scans, and any scan whose hash is in `forbidden` (train/test leakage)."""
    seen, keep = set(forbidden), []
    for i, h in enumerate(hashes):
        if h in seen:
            continue
        seen.add(h)
        keep.append(i)
    keep = np.array(keep, dtype=np.int64)
    return X[keep], y[keep], hashes[keep]


# ----------------------------------------------------------------------------
# Calibration + evaluation
# ----------------------------------------------------------------------------
def calibrate_on_validation_set(base_estimator, X_val: np.ndarray, y_val: np.ndarray):
    """Applies Platt scaling (sigmoid calibration) on the held-out validation split."""
    if FrozenEstimator is not None:
        calibrator = CalibratedClassifierCV(
            estimator=FrozenEstimator(base_estimator),
            method="sigmoid",
        )
    else:
        calibrator = CalibratedClassifierCV(
            estimator=base_estimator,
            method="sigmoid",
            cv="prefit",
        )
    calibrator.fit(X_val, y_val)
    return calibrator


def evaluate_model_on_test(model, X_test: np.ndarray, y_test: np.ndarray, latency_samples: int = 10) -> dict:
    """Real held-out test metrics, 2x2 confusion matrix, ROC curve points, per-scan latency."""
    probs = model.predict_proba(X_test)[:, 1]
    preds = (probs >= 0.5).astype(np.int64)

    # latency is measured one scan at a time, like a real API request
    n_lat = max(1, min(latency_samples, len(y_test)))
    t0 = time.perf_counter()
    for i in range(n_lat):
        model.predict_proba(X_test[i:i + 1])
    avg_latency_ms = int(round((time.perf_counter() - t0) * 1000.0 / n_lat))

    cm = confusion_matrix(y_test, preds, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    specificity = float(tn / max(1, (tn + fp)))

    fpr_arr, tpr_arr, _ = roc_curve(y_test, probs)
    indices = np.linspace(0, len(fpr_arr) - 1, min(len(fpr_arr), 25), dtype=int)
    roc_points = [
        {"fpr": round(float(fpr_arr[i]), 4), "tpr": round(float(tpr_arr[i]), 4)}
        for i in np.unique(indices)
    ]

    return {
        "accuracy": round(float(accuracy_score(y_test, preds)), 4),
        "precision": round(float(precision_score(y_test, preds, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, preds, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, preds, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, probs)), 4),
        "specificity": round(specificity, 4),
        "avg_inference_latency_ms": max(1, avg_latency_ms),
        "confusion_matrix": {
            "labels": ["Normal Cell", "Tumor Cell"],
            "matrix": [[int(tn), int(fp)], [int(fn), int(tp)]],
        },
        "roc_curve": roc_points,
    }


# ----------------------------------------------------------------------------
# QSVM kernel-scale tuning (fixes the near-identity-kernel problem)
# ----------------------------------------------------------------------------
def stratified_subset(y: np.ndarray, n: int, seed: int) -> np.ndarray:
    if n <= 0 or n >= len(y):
        return np.arange(len(y))
    sss = StratifiedShuffleSplit(n_splits=1, train_size=n, random_state=seed)
    idx, _ = next(sss.split(np.zeros(len(y)), y))
    return np.sort(idx)


def tune_qsvm(X_tr, y_tr, X_val, y_val, scales, Cs, tune_n, seed):
    """Pick angle scale and C by validation ROC-AUC on a subsample (cheap), report kernel health."""
    from app.services.exact_qkernel import ScaledZZKernel

    tr_idx = stratified_subset(y_tr, tune_n, seed)
    va_idx = stratified_subset(y_val, max(200, tune_n // 2), seed)
    Xs, ys = X_tr[tr_idx], y_tr[tr_idx]
    Xv, yv = X_val[va_idx], y_val[va_idx]
    n = len(ys)

    table, best = [], None
    for s in scales:
        kern = ScaledZZKernel(s)
        K_tr = kern(Xs, Xs)
        off_diag_mean = float((K_tr.sum() - np.trace(K_tr)) / max(1, n * n - n))
        K_val = kern(Xv, Xs)
        for C in Cs:
            svc = SVC(kernel="precomputed", C=C, class_weight="balanced").fit(K_tr, ys)
            auc = float(roc_auc_score(yv, svc.decision_function(K_val)))
            row = {"angle_scale": s, "C": C, "val_roc_auc": round(auc, 4),
                   "mean_off_diagonal_kernel": round(off_diag_mean, 4)}
            table.append(row)
            print(f"[QSVM TUNE] scale={s:<5} C={C:<5} val_auc={auc:.4f}  mean off-diag kernel={off_diag_mean:.4f}")
            if best is None or auc > best["val_roc_auc"]:
                best = row
    return best, table


def parse_float_list(text: str):
    return [float(t) for t in text.split(",") if t.strip()]


# ----------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", choices=["kaggle", "local"], default="kaggle",
                    help="kaggle = real dataset with official Training/Testing split (default); "
                         "local = flat backend/brain_mri_dataset/ folder")
    ap.add_argument("--data-dir", default=None, help="Use this folder instead of downloading (kaggle source)")
    ap.add_argument("--qsvm-mode", choices=["exact", "sampler"], default="exact")
    ap.add_argument("--qsvm-max-train", type=int, default=0,
                    help="0 = all training scans (exact mode) / 120 (sampler mode)")
    ap.add_argument("--qsvm-scales", default="0.1,0.25,0.5,1.0", help="angle scales to try for the quantum kernel")
    ap.add_argument("--qsvm-Cs", default="1,10", help="C values to try for the QSVM")
    ap.add_argument("--tune-n", type=int, default=800, help="training scans used for QSVM tuning")
    ap.add_argument("--latency-samples", type=int, default=10)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    # ---------------- 1. load data ----------------
    if args.source == "kaggle":
        root = get_kaggle_root(args.data_dir)
        Xtr_all, ytr_all, htr = load_official_split(find_split_dir(root, "Training"))
        Xte_raw, y_test, hte = load_official_split(find_split_dir(root, "Testing"))
        print(f"[DATA] raw  train={len(ytr_all)}  test={len(y_test)}")
        Xtr_all, ytr_all, htr = dedupe(Xtr_all, ytr_all, htr)
        Xte_raw, y_test, hte = dedupe(Xte_raw, y_test, hte, forbidden=set(htr))
        sss = StratifiedShuffleSplit(n_splits=1, test_size=0.15, random_state=args.seed)
        tr_idx, val_idx = next(sss.split(np.zeros(len(ytr_all)), ytr_all))
        X_train_raw = Xtr_all[tr_idx].astype(np.float32)
        y_train = ytr_all[tr_idx]
        X_val_raw = Xtr_all[val_idx].astype(np.float32)
        y_val = ytr_all[val_idx]
        X_test_raw = Xte_raw.astype(np.float32)
        del Xtr_all, Xte_raw
        split_desc = ("Official Kaggle Training/ (85% train / 15% validation, duplicates removed) "
                      "and official Testing/ folder as held-out test (leakage removed)")
        dataset_name = "Kaggle Brain Tumor MRI Dataset (masoudnickparvar) — Official Testing Split, Normal vs Tumor"
        synthetic = False
        n_total = len(y_train) + len(y_val) + len(y_test)
    else:
        X, y, groups = load_kaggle_brain_mri_dataset(DATASET_DIR)
        train_idx, val_idx, test_idx, split_desc = split_by_patient_groups(X, y, groups)
        X_train_raw, y_train = X[train_idx], y[train_idx]
        X_val_raw, y_val = X[val_idx], y[val_idx]
        X_test_raw, y_test = X[test_idx], y[test_idx]
        n_total = len(y)
        files = glob.glob(os.path.join(DATASET_DIR, "**", "*.*"), recursive=True)
        synthetic = (os.path.exists(os.path.join(DATASET_DIR, "SYNTHETIC_DATA.txt")) or
                     any(os.path.basename(f).startswith("patient_") for f in files))
        if synthetic:
            dataset_name = "SYNTHETIC demo data from setup_dataset.py (drawn ellipses) — NOT real MRI"
            print("\n[WARNING] The local dataset looks SYNTHETIC. Results below say nothing about real MRIs.\n")
        else:
            dataset_name = f"Local MRI folder ({os.path.basename(DATASET_DIR)}) — Held-Out Test Set"

    print(f"[DATA] Total: {n_total} | Train: {len(y_train)} | Val: {len(y_val)} | Test: {len(y_test)}")
    print(f"[DATA] train normal/tumor = {(y_train==0).sum()}/{(y_train==1).sum()}   "
          f"test normal/tumor = {(y_test==0).sum()}/{(y_test==1).sum()}")

    # ---------------- 2. preprocessors fit on TRAIN only ----------------
    std_scaler = StandardScaler()
    X_train_std = std_scaler.fit_transform(X_train_raw)
    X_val_std = std_scaler.transform(X_val_raw)
    X_test_std = std_scaler.transform(X_test_raw)

    pca_transformer = PCA(n_components=8, random_state=42)
    X_train_pca = pca_transformer.fit_transform(X_train_std)
    X_val_pca = pca_transformer.transform(X_val_std)
    X_test_pca = pca_transformer.transform(X_test_std)
    print(f"[PCA] 8 components explain {pca_transformer.explained_variance_ratio_.sum():.3f} of the variance")

    angle_scaler = MinMaxScaler(feature_range=(-np.pi, np.pi))
    X_train_angles = angle_scaler.fit_transform(X_train_pca)
    X_val_angles = angle_scaler.transform(X_val_pca)
    X_test_angles = angle_scaler.transform(X_test_pca)

    joblib.dump(std_scaler, os.path.join(MODELS_DIR, "quantum_pipeline_std.pkl"))
    joblib.dump(pca_transformer, os.path.join(MODELS_DIR, "quantum_pipeline_pca.pkl"))
    joblib.dump(angle_scaler, os.path.join(MODELS_DIR, "quantum_pipeline_angle.pkl"))

    # ---------------- 3. classical RBF SVM ----------------
    t_c0 = time.perf_counter()
    param_grid = {
        "C": [0.1, 1.0, 5.0, 10.0, 25.0],
        "gamma": ["scale", 0.05, 0.1, 0.25, 0.5, 1.0],
    }
    grid_search = GridSearchCV(
        SVC(kernel="rbf", class_weight="balanced", random_state=42),
        param_grid=param_grid,
        scoring="roc_auc",
        cv=5,
        n_jobs=-1,
    )
    grid_search.fit(X_train_angles, y_train)
    best_classical_svc = grid_search.best_estimator_
    best_params = grid_search.best_params_
    classical_sv_count = int(np.sum(best_classical_svc.n_support_))
    print(f"[CLASSICAL] best params {best_params}, support vectors {classical_sv_count}")

    calibrated_classical = calibrate_on_validation_set(best_classical_svc, X_val_angles, y_val)
    c_train_sec = round(time.perf_counter() - t_c0, 2)
    joblib.dump(calibrated_classical, os.path.join(MODELS_DIR, "classical_baseline_svm.pkl"))

    # ---------------- 4. QSVM ----------------
    qsvm_tuning = []
    t_q0 = time.perf_counter()
    if args.qsvm_mode == "exact":
        from app.services.exact_qkernel import ScaledZZKernel, circuit_depth

        scales = parse_float_list(args.qsvm_scales)
        Cs = parse_float_list(args.qsvm_Cs)
        best, qsvm_tuning = tune_qsvm(X_train_angles, y_train, X_val_angles, y_val,
                                      scales, Cs, args.tune_n, args.seed)
        q_idx = stratified_subset(y_train, args.qsvm_max_train, args.seed)
        X_qtrain, y_qtrain = X_train_angles[q_idx], y_train[q_idx]
        print(f"[QSVM] training exact kernel: scale={best['angle_scale']} C={best['C']} on {len(y_qtrain)} scans")
        kernel_obj = ScaledZZKernel(best["angle_scale"])
        base_qsvm = SVC(kernel=kernel_obj, C=best["C"], class_weight="balanced", random_state=42)
        base_qsvm.fit(X_qtrain, y_qtrain)
        kernel_label = (f"ZZFeatureMap Exact Fidelity Kernel (angle scale {best['angle_scale']}) "
                        "+ Platt Scaling")
        depth = circuit_depth() or 14
    else:
        from qiskit.circuit.library import ZZFeatureMap
        from qiskit_machine_learning.kernels import FidelityQuantumKernel

        max_qsvm_train = min(len(y_train), args.qsvm_max_train or 120)
        q_idx = stratified_subset(y_train, max_qsvm_train, args.seed)
        X_qtrain, y_qtrain = X_train_angles[q_idx], y_train[q_idx]
        feature_map = ZZFeatureMap(feature_dimension=8, reps=2, entanglement="linear")
        quantum_kernel = FidelityQuantumKernel(feature_map=feature_map)
        base_qsvm = SVC(kernel=quantum_kernel.evaluate, C=1.0, random_state=42)
        base_qsvm.fit(X_qtrain, y_qtrain)
        kernel_label = "ZZFeatureMap Fidelity Quantum Kernel (sampler) + Platt Scaling"
        depth = 14
    qsvm_sv_count = int(np.sum(base_qsvm.n_support_))

    calibrated_qsvm = calibrate_on_validation_set(base_qsvm, X_val_angles, y_val)
    q_train_sec = round(time.perf_counter() - t_q0, 2)
    joblib.dump(calibrated_qsvm, os.path.join(MODELS_DIR, "qsvm_model.pkl"))
    print(f"[QSVM] done in {q_train_sec}s, support vectors {qsvm_sv_count}")

    # ---------------- 5. evaluate on the held-out test set ----------------
    qsvm_eval = evaluate_model_on_test(calibrated_qsvm, X_test_angles, y_test, args.latency_samples)
    classical_eval = evaluate_model_on_test(calibrated_classical, X_test_angles, y_test, args.latency_samples)

    acc_diff = (qsvm_eval["accuracy"] - classical_eval["accuracy"]) * 100.0
    prec_diff = (qsvm_eval["precision"] - classical_eval["precision"]) * 100.0
    rec_diff = (qsvm_eval["recall"] - classical_eval["recall"]) * 100.0
    f1_diff = (qsvm_eval["f1_score"] - classical_eval["f1_score"]) * 100.0
    auc_diff = qsvm_eval["roc_auc"] - classical_eval["roc_auc"]
    sv_diff = ((qsvm_sv_count - classical_sv_count) / max(1, classical_sv_count)) * 100.0

    notes = [
        f"Evaluated on {len(y_test)} held-out test scans ({split_desc}).",
        f"Classical baseline tuned via 5-fold GridSearchCV (best: C={best_params['C']}, gamma={best_params['gamma']}).",
        "Both classifiers calibrated on the held-out validation split via Platt scaling (CalibratedClassifierCV).",
        f"QSVM trained on {len(y_qtrain)} of {len(y_train)} training scans "
        "(simulated 8-qubit statevector kernel, not quantum hardware).",
    ]
    if synthetic:
        notes.insert(0, "WARNING: trained on SYNTHETIC demo data — these metrics do not reflect real MRI performance.")

    benchmark_payload = {
        "status": "success",
        "dataset_name": dataset_name,
        "dataset_is_synthetic": bool(synthetic),
        "total_dataset_samples": int(n_total),
        "total_train_samples": int(len(y_train)),
        "total_test_samples": int(len(y_test)),
        "split": split_desc,
        "qsvm": {
            "model_name": "Calibrated 8-Qubit QSVM (qsvm_model.pkl)",
            "kernel_name": kernel_label,
            "feature_dimension": 8,
            "num_qubits": 8,
            "circuit_depth": depth,
            "entanglement": "Linear Pairwise (ZZ)",
            "training_time_seconds": q_train_sec,
            "support_vectors_count": qsvm_sv_count,
            "training_samples_used": int(len(y_qtrain)),
            "tuning": qsvm_tuning,
            **qsvm_eval,
        },
        "classical_svm": {
            "model_name": "GridSearch-Tuned Classical SVM (classical_baseline_svm.pkl)",
            "kernel_name": f"RBF Kernel (C={best_params['C']}, gamma={best_params['gamma']}) + Platt Scaling",
            "feature_dimension": 8,
            "num_qubits": 0,
            "circuit_depth": 0,
            "entanglement": "None (Euclidean R^8)",
            "training_time_seconds": c_train_sec,
            "support_vectors_count": classical_sv_count,
            "training_samples_used": int(len(y_train)),
            **classical_eval,
        },
        "deltas": {
            "accuracy_delta": f"{acc_diff:+.1f}%",
            "precision_delta": f"{prec_diff:+.1f}%",
            "recall_delta": f"{rec_diff:+.1f}%",
            "f1_delta": f"{f1_diff:+.1f}%",
            "roc_auc_delta": f"{auc_diff:+.3f}",
            "support_vector_reduction": f"{sv_diff:+.1f}%",
        },
        "quantum_advantage_notes": notes,
    }

    metrics_path = os.path.join(MODELS_DIR, "benchmark_metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(benchmark_payload, f, indent=2)

    print("\n================ RESULTS (held-out test set) ================")
    for name, r in (("QSVM", qsvm_eval), ("Classical SVM", classical_eval)):
        print(f"{name:<14} acc={r['accuracy']:.3f} precision={r['precision']:.3f} recall={r['recall']:.3f} "
              f"specificity={r['specificity']:.3f} auc={r['roc_auc']:.3f} latency={r['avg_inference_latency_ms']}ms")
    print(f"\n[SUCCESS] Saved real test benchmark metrics to {metrics_path}")
    print("[TIP] Optional: python build_ood_detector.py  (adds a validated 'unlike the training data' upload check)")


if __name__ == "__main__":
    main()
