# File: backend/app/services/exact_qkernel.py
"""
Exact (shot-noise-free) ZZFeatureMap fidelity kernel for the QSVM.

K[i, j] = |<psi(s*x_i) | psi(s*x_j)>|^2, where psi(.) is the 8-qubit state made by
Qiskit's ZZFeatureMap(reps=2, linear entanglement) and s is an angle scale.

Why this exists
  * The Qiskit FidelityQuantumKernel simulates one circuit per PAIR of scans (N^2
    circuits). Here every scan's statevector is simulated ONCE (N circuits) and the
    whole kernel is a single matrix product -> training on thousands of scans and
    millisecond inference become practical.
  * ZZFeatureMap with angles in [-pi, pi] often yields a near-identity kernel (every
    scan looks unrelated to every other scan), so the SVM cannot generalise. `scale`
    shrinks the angles; train_brain_mri.py tunes it on the validation split.

This class lives in an importable module so the pickled qsvm_model.pkl can be loaded
by the FastAPI server (it is referenced as app.services.exact_qkernel.ScaledZZKernel).
"""
import hashlib
import threading

import numpy as np

_CACHE: dict = {}          # (scale, shape, md5) -> statevectors
_CACHE_MAX = 8
_LOCK = threading.Lock()
_FMAP = None


def _feature_map():
    global _FMAP
    if _FMAP is None:
        from qiskit.circuit.library import ZZFeatureMap
        _FMAP = ZZFeatureMap(feature_dimension=8, reps=2, entanglement="linear")
    return _FMAP


def _compute_states(X: np.ndarray) -> np.ndarray:
    """Statevectors (N, 256) for already-scaled angle rows."""
    from qiskit.quantum_info import Statevector
    fmap = _feature_map()
    return np.array([Statevector(fmap.assign_parameters(x)).data for x in X])


def circuit_depth():
    """Real depth of the feature-map circuit in {u, cx} gates, or None if unavailable."""
    try:
        from qiskit import transpile
        qc = _feature_map().assign_parameters(np.zeros(8))
        return int(transpile(qc, basis_gates=["u", "cx"], optimization_level=0).depth())
    except Exception:
        return None


class ScaledZZKernel:
    """Callable kernel for sklearn: SVC(kernel=ScaledZZKernel(scale))."""

    def __init__(self, scale: float = 1.0):
        self.scale = float(scale)

    def _states(self, X) -> np.ndarray:
        X = np.ascontiguousarray(X, dtype=np.float64)
        key = (self.scale, X.shape, hashlib.md5(X.tobytes()).hexdigest())
        with _LOCK:                      # a request arriving during warm-up waits instead of recomputing
            if key in _CACHE:
                _CACHE[key] = _CACHE.pop(key)            # LRU: mark as most recently used
            else:
                while len(_CACHE) >= _CACHE_MAX:
                    _CACHE.pop(next(iter(_CACHE)))       # evict the LEAST recently used entry
                _CACHE[key] = _compute_states(X * self.scale)
            return _CACHE[key]

    def __call__(self, A, B) -> np.ndarray:
        SA, SB = self._states(A), self._states(B)
        return np.abs(SA.conj() @ SB.T) ** 2

    def __repr__(self) -> str:
        return f"ScaledZZKernel(scale={self.scale})"


def exact_zz_kernel(A, B):
    """Backward compatible function form (scale = 1.0)."""
    return ScaledZZKernel(1.0)(A, B)
