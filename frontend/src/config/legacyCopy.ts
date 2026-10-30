// File: frontend/src/config/legacyCopy.ts
// Preserved legacy copy kept for reference as required by Safety Rule 2.
// These strings are not displayed in the restyled UI.

export const LEGACY_COPY = {
  branding: {
    title: "QSVM MED SAAS",
    tagline: "DETECT • DECODE • CURE",
    marketingSlogan: "reveal what classical eyes miss",
    teamNameTypo: "TEAM 5 QUIBITS",
  },
  navigation: {
    projectOverview: "Project Overview",
    scanSuite: "Radiology Scan Suite",
    quantumArchitecture: "Quantum Architecture",
    testSetBenchmark: "Test Set Benchmark",
    pipelineBanner:
      "PIPELINE: • 01. Ingest (UI Scan Upload) → • 02. Reduce (PCA Dimensionality) → • 03. Execute (8-Qubit Hilbert QPU) → • 04. Render (Heatmap & Coordinates)",
  },
  login: {
    title: "QSVM MED SAAS",
    subtitle: "Clinician Authentication • Radiology PACS Portal",
    notice:
      '"Login required to access high-resolution diagnostic tools & lesion coordinate localization"',
    usernameLabel: "Researcher / Clinician ID",
    passwordLabel: "Passkey / Access Token",
    submitButton: "Authenticate & Enter Radiology Suite",
    demoButton: "One-Click Default Demo Sign-In (researcher)",
  },
  scanPage: {
    ingestCardTitle: "01 • Ingest Medical Scan",
    ingestCardHint: "DICOM / PNG (Max 15MB)",
    analyzeButton: "Analyze Scan & Compute Coordinates",
    analyzingState: "Projecting into 256-D Quantum Space...",
    predictionTitle: "QSVM Diagnostic Prediction",
    proportionTitle: "Tissue State Proportion",
    viewerOverlays: {
      patient: "PATIENT: 4092-ANON-BRAIN",
      study: "STUDY: BRAIN MRI (AXIAL)",
      modality: "MODALITY: MR-T2/FLAIR",
      te_tr: "TE: 14ms | TR: 520ms",
      fov_thk: "FOV: 240mm | THK: 3.0mm",
      workstationBadge: "® R | L RADIOLOGY WORKSTATION",
      cleanBadge: "Clean Scan (Normal)",
      normalArchitecture: "Normal Neuro-Cranial Architecture",
      tumorCoordinatesCard: "TUMOR CELL EXACT COORDINATES",
      noPathologicalTumor:
        "No Pathological Tumor Mass Detected: The Quantum Support Vector Machine (QSVM) evaluated the scan's 8-dimensional PCA feature projection within the calibrated 256-dimensional Hilbert feature space. The scan conforms to normal neuro-cranial tissue architecture with no focal tumor cell mass.",
      cranialBaselineOrigin: "Cranial Symmetry Baseline Origin",
      focalLesionIdentified: "Focal Lesion Identified",
      normalTissueBaseline: "Normal Tissue Baseline",
    },
    rightPanels: {
      hilbertStateSpaceTitle: "Quantum Hilbert State Space (256-D)",
      dualModelTelemetryTitle: "Dual-Model Architecture Telemetry",
      cranialAsymmetryInsight:
        "Cranial symmetry verification: Verified normal bilateral neuro-cranial tissue architecture with no focal pathological mass.",
      whyQuantumSvm: "Why Quantum SVM?",
    },
  },
};
