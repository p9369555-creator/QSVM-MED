// File: frontend/src/constants/landingContent.ts
// Plain, sentence-case research copy and editable constants for QSVM Med.

export const PROJECT_TITLE = "QSVM Med";

export const NAV_LINKS = [
  { label: "Problem", href: "#problem" },
  { label: "Approach", href: "#approach" },
  { label: "System Stack", href: "#stack" },
  { label: "Results", href: "#results" },
  { label: "Limitations", href: "#limitations" },
  { label: "Team", href: "#team" },
];

export const HERO = {
  h1: "Brain tumor screening with a quantum kernel SVM",
  subtitle:
    "A research prototype that classifies brain MRI slices as tumor or no tumor using a simulated 8 qubit quantum kernel, compared side by side with a tuned classical SVM.",
  primaryButton: "Try the demo",
  secondaryButton: "See benchmark",
};

export const PROBLEM = {
  heading: "The problem",
  text: [
    "Tumor and healthy brain tissue can appear very similar in raw MRI pixels, and models trained on reduced feature sets frequently confuse them.",
    "This project tests whether a quantum kernel can help separate overlapping features by projecting low dimensional representations into a high dimensional quantum state space.",
  ],
};

export const APPROACH_STEPS = [
  {
    step: 1,
    title: "Upload MRI slice",
    detail: "Receive an axial brain MRI slice in grayscale raster or DICOM format.",
  },
  {
    step: 2,
    title: "Crop to head and normalise intensity",
    detail: "Isolate cranial boundaries, remove black background padding, and apply adaptive histogram equalization.",
  },
  {
    step: 3,
    title: "PCA to 8 features",
    detail: "Reduce flattened 128x128 pixels (16,384 values) to 8 principal components with standard scaling.",
  },
  {
    step: 4,
    title: "Encode with an 8 qubit ZZFeatureMap and compute the kernel",
    detail: "Map the 8 scaled angles into an 8 qubit Qiskit statevector simulation and compute pairwise fidelity kernel matrices.",
  },
  {
    step: 5,
    title: "SVM classifier with Platt calibrated probability",
    detail: "Fit a support vector classifier on quantum kernel values with Platt scaling for calibrated posterior probabilities.",
  },
];

export const SYSTEM_STACK = [
  {
    category: "Frontend UI",
    tech: "React + Vite + Tailwind CSS",
    description: "Responsive web client, slice canvas viewer, and real-time state visualization.",
  },
  {
    category: "Backend Service",
    tech: "FastAPI",
    description: "Asynchronous Python REST API handling scan upload, image processing, and inference orchestration.",
  },
  {
    category: "Classical ML",
    tech: "scikit-learn",
    description: "Data preprocessing, PCA dimensionality reduction, and tuned classical RBF SVM baseline.",
  },
  {
    category: "Quantum Simulation",
    tech: "Qiskit Statevector Simulator",
    description: "Simulated 8 qubit quantum kernel executing ZZFeatureMap statevector inner products.",
  },
];

export const LIMITATIONS = [
  {
    title: "Simulated quantum execution",
    description:
      "The quantum kernel runs via classical statevector simulation in Qiskit, not on physical quantum processing hardware.",
  },
  {
    title: "8 PCA features",
    description:
      "Compressing 16,384 pixels to 8 components discards fine microstructural texture in exchange for a tractable 8 qubit Hilbert space.",
  },
  {
    title: "Dataset source bias",
    description:
      "The public Kaggle dataset contains acquisition biases where image dimensions correlate with labels; inputs are cropped to head masks to reduce shortcuts.",
  },
  {
    title: "Global slice level prediction",
    description:
      "The classifier generates a single binary label for the overall slice and does not segment or localize tumors.",
  },
  {
    title: "Research prototype",
    description:
      "This system is an academic research experiment and is not certified or intended for clinical medical diagnostic use.",
  },
];

export interface TeamMember {
  name: string;
  role: string;
  note?: string;
}

export const TEAM_NAME = "Team 5 Qubits";

// 5 Member research team
export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Kartikey Mishra",
    role: "Quantum ML & Research",
    note: "Simulated 8 Qubit ZZFeatureMap statevector kernel, quantum circuit encoding, and Platt calibration.",
  },
  {
    name: "Kunal",
    role: "Frontend & Visualization",
    note: "Interactive web interface, radiology slice viewer, and coordinate visualization.",
  },
  {
    name: "Kush",
    role: "Backend & Pipeline",
    note: "FastAPI endpoints, medical image decoding, and preprocessing pipeline.",
  },
  {
    name: "Kartikey",
    role: "Dataset & Validation",
    note: "Dataset curation, ground truth label verification, and evaluation metrics.",
  },
  {
    name: "Gaurav",
    role: "System Architecture & Research",
    note: "Classical baseline SVM tuning, system integration, and benchmarking.",
  },
];

export const COLLEGE_LOGO_SLOT = {
  enabled: false,
  institutionName: "Academic Research Prototype",
  logoUrl: "",
};

export const FOOTER = {
  disclaimer: "Research prototype. Not for clinical use.",
  copyright: "© 2026 Team 5 Qubits • QSVM Med",
};
