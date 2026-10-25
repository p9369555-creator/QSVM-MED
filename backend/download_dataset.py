# File: backend/download_dataset.py
"""
Copies the REAL Kaggle Brain Tumor MRI dataset into this project, at:

    backend/kaggle_brain_mri/Training/{glioma,meningioma,notumor,pituitary}
    backend/kaggle_brain_mri/Testing/{glioma,meningioma,notumor,pituitary}

Usage (from backend/):
    python download_dataset.py                      # downloads with kagglehub (or reuses its cache), then copies
    python download_dataset.py --source-dir <path>  # you already have the folder (it must contain Training/ and Testing/)

train_brain_mri.py and build_ood_detector.py use this folder automatically once it exists.
"""
import argparse
import os
import shutil
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(BASE_DIR, "kaggle_brain_mri")
IMG_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


def find_dir(root, name):
    for dirpath, dirnames, _ in os.walk(root):
        for d in dirnames:
            if d.lower() == name.lower():
                return os.path.join(dirpath, d)
    raise FileNotFoundError(f"No '{name}' folder found under {root}")


def count_images(path):
    return sum(1 for _, _, fs in os.walk(path) for f in fs if os.path.splitext(f)[1].lower() in IMG_EXT)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-dir", default=None)
    ap.add_argument("--dest", default=DEST)
    ap.add_argument("--force", action="store_true", help="replace an existing copy")
    args = ap.parse_args()

    if os.path.isdir(os.path.join(args.dest, "Training")) and not args.force:
        print(f"Dataset already present in {args.dest} (use --force to replace it).")
        return

    src = args.source_dir
    if not src:
        try:
            import kagglehub
        except ImportError:
            sys.exit("kagglehub is not installed. Run: pip install kagglehub")
        src = kagglehub.dataset_download("masoudnickparvar/brain-tumor-mri-dataset")
        print(f"kagglehub dataset path: {src}")

    for split in ("Training", "Testing"):
        s = find_dir(src, split)
        d = os.path.join(args.dest, split)
        if os.path.exists(d):
            shutil.rmtree(d)
        print(f"Copying {s}  ->  {d} ...")
        shutil.copytree(s, d)

    print("\nDone. Images copied:")
    for split in ("Training", "Testing"):
        print(f"  {split}: {count_images(os.path.join(args.dest, split))}")
        for cls in sorted(os.listdir(os.path.join(args.dest, split))):
            print(f"      {cls}: {count_images(os.path.join(args.dest, split, cls))}")
    print(f"\nDataset location: {args.dest}")


if __name__ == "__main__":
    main()
