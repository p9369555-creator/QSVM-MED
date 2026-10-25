# File: backend/build_ood_detector.py
"""
Builds the optional "is this image unlike the training data?" detector and VALIDATES it.

Run AFTER train_brain_mri.py (it reuses quantum_pipeline_std.pkl):

  1. Make a folder  backend/ood_probes/  and put a few NON-brain images in it
     (hand/chest/leg X-rays, CT scans, photos...). The more varied, the better.
  2. python build_ood_detector.py                 # downloads/uses the Kaggle data like train_brain_mri.py
     python build_ood_detector.py --data-dir <folder with Training/ and Testing/>

It fits a 64-component PCA on the Kaggle Training scans, sets thresholds at the 99th percentile of
the held-out Testing scans, then checks how many of YOUR probe images get flagged.
The detector is only switched on in the API if it passes validation:
  - at least 75% of probe images flagged, and
  - at most 3% of held-out Kaggle test scans falsely flagged.
Otherwise it is saved as "not validated" and the API ignores it (structural checks still run).
"""
import argparse
import glob
import os
import sys

import cv2
import joblib
import numpy as np
from sklearn.decomposition import PCA

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
from train_brain_mri import (  # noqa: E402
    IMG_EXT, MODELS_DIR, dedupe, find_split_dir, get_kaggle_root, load_official_split, preprocess_uint8,
)


def scores(pca, Z):
    P = pca.transform(Z)
    k = P.shape[1]
    dist = np.sqrt(np.sum(P ** 2 / pca.explained_variance_, axis=1)) / np.sqrt(k)
    resid = np.linalg.norm(Z - pca.inverse_transform(P), axis=1) / np.sqrt(Z.shape[1])
    return dist, resid


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default=None)
    ap.add_argument("--probe-dir", default=os.path.join(BASE_DIR, "ood_probes"))
    ap.add_argument("--components", type=int, default=64)
    args = ap.parse_args()

    std = joblib.load(os.path.join(MODELS_DIR, "quantum_pipeline_std.pkl"))

    root = get_kaggle_root(args.data_dir)
    Xtr, ytr, htr = load_official_split(find_split_dir(root, "Training"))
    Xte, yte, hte = load_official_split(find_split_dir(root, "Testing"))
    Xtr, ytr, htr = dedupe(Xtr, ytr, htr)
    Xte, yte, hte = dedupe(Xte, yte, hte, forbidden=set(htr))
    print(f"[OOD] fitting on {len(Xtr)} training scans, thresholds from {len(Xte)} held-out test scans")

    Ztr = std.transform(Xtr.astype(np.float32))
    pca = PCA(n_components=args.components, svd_solver="randomized", random_state=42).fit(Ztr)
    Zte = std.transform(Xte.astype(np.float32))
    d_te, r_te = scores(pca, Zte)
    d_thr, r_thr = float(np.percentile(d_te, 99)), float(np.percentile(r_te, 99))
    false_flag = float(np.mean((d_te > d_thr) | (r_te > r_thr)))

    probe_files = [f for f in sorted(glob.glob(os.path.join(args.probe_dir, "*")))
                   if os.path.splitext(f)[1].lower() in IMG_EXT]
    flagged = []
    for f in probe_files:
        g = cv2.imread(f, cv2.IMREAD_GRAYSCALE)
        if g is None:
            continue
        z = std.transform(preprocess_uint8(g).flatten().reshape(1, -1).astype(np.float32))
        d, r = scores(pca, z)
        hit = bool(d[0] > d_thr or r[0] > r_thr)
        flagged.append(hit)
        print(f"[PROBE] {os.path.basename(f):<34} distance={d[0]:6.2f} residual={r[0]:5.2f}  -> {'FLAGGED' if hit else 'not flagged'}")

    probe_rate = float(np.mean(flagged)) if flagged else None
    validated = bool(flagged) and len(flagged) >= 3 and probe_rate >= 0.75 and false_flag <= 0.03

    joblib.dump({
        "pca": pca,
        "distance_threshold": d_thr,
        "residual_threshold": r_thr,
        "validated": validated,
        "report": {"test_false_flag_rate": round(false_flag, 4), "probe_flag_rate": probe_rate,
                   "n_probes": len(flagged), "n_test": int(len(Xte)), "components": args.components},
    }, os.path.join(MODELS_DIR, "ood_detector.pkl"))

    print("\n================ OOD DETECTOR REPORT ================")
    print(f"Kaggle test scans falsely flagged : {false_flag:.1%}  (target <= 3%)")
    print(f"Probe images flagged              : {'n/a (no probes found in ' + args.probe_dir + ')' if probe_rate is None else f'{probe_rate:.0%} of {len(flagged)}'}  (target >= 75%, need >= 3 probes)")
    print("RESULT:", "VALIDATED - the API will use it." if validated else
          "NOT validated - the API will ignore it (structural checks still run). Add more varied probe images, or leave it off.")


if __name__ == "__main__":
    main()
