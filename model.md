PRAVAHA — ML MODEL INTEGRATION TASK

I have manually added my trained AI/ML model files to:

services/ml/

Current structure includes:
- services/ml/risk_model.py
- services/ml/ai model/

Your task is to integrate the ACTUAL trained model into the existing PRAVAHA system.

IMPORTANT:
Do NOT create a fake/demo ML model.
Do NOT replace my trained model with another algorithm.
Do NOT generate dummy predictions.
Do NOT retrain the model unless absolutely necessary.
Do NOT break or rewrite existing PRAVAHA functionality.

==================================================
PHASE 1 — INSPECT BEFORE MODIFYING
==================================================

First inspect:

1. Entire existing PRAVAHA project structure.
2. services/ml/risk_model.py
3. Every file inside services/ml/ai model/
4. Existing backend architecture.
5. Existing Risk Engine.
6. Existing database/PostGIS structure.
7. Existing API structure.
8. Existing Live Map.
9. Existing RouteGuard.
10. Existing AlertNet.
11. Existing Earth Intelligence module if present.

Determine exactly:

- Which file is the trained model.
- Model framework.
- Model architecture.
- Input features/input shape.
- Output format.
- Classes/labels.
- Preprocessing.
- Normalization/scaling.
- Encoders.
- Feature ordering.
- Required dependencies.
- Model loading procedure.
- Inference procedure.
- Any thresholds.
- Model version.
- Whether risk_model.py already contains integration logic.
- Whether the model is tabular, image-based, time-series, geospatial, or another type.

DO NOT assume anything that cannot be established from the files.

==================================================
PHASE 2 — CREATE AN INTEGRATION PLAN
==================================================

Before making major changes, produce a concise implementation plan showing:

1. Model identified
2. Inputs
3. Outputs
4. Required dependencies
5. Backend integration point
6. Risk Engine integration
7. Database changes, if required
8. API endpoints required
9. Frontend components affected
10. Files that will be created
11. Files that will be modified

Then implement the plan.

==================================================
PHASE 3 — MODEL SERVICE
==================================================

Create a clean production-style ML inference layer around my existing model.

Preferred architecture:

PRAVAHA Frontend
       ↓
PRAVAHA Backend API
       ↓
ML Inference Service
       ↓
MY TRAINED MODEL
       ↓
Prediction
       ↓
PRAVAHA Risk Engine
       ↓
RouteGuard / AlertNet / Analytics

Keep the model isolated from the UI.

Create appropriate modules such as:

services/ml/
    models/
    inference/
    api/
    config/
    tests/

BUT:

Do not duplicate files unnecessarily.

If the current model structure already provides equivalent functionality, reuse it.

==================================================
PHASE 4 — PRESERVE MODEL PIPELINE
==================================================

The exact training-time preprocessing must be preserved.

Do NOT silently change:

- feature order
- normalization
- scaling
- encoding
- image preprocessing
- missing-value handling
- input dimensions
- class mapping
- thresholds

If something is missing, clearly identify it.

Do NOT invent missing features.

==================================================
PHASE 5 — API
==================================================

Expose the model through the PRAVAHA backend.

Create an appropriate endpoint, for example:

POST /api/v1/ml/predict

Also create where appropriate:

GET /api/v1/ml/health
GET /api/v1/ml/version

The prediction response should contain only information actually produced or supported by the model, such as:

{
  prediction,
  confidence,
  risk_level,
  model_name,
  model_version,
  timestamp
}

Do not fabricate confidence values.

If the model does not provide confidence, clearly indicate that.

==================================================
PHASE 6 — RISK ENGINE
==================================================

Connect the model output to the existing PRAVAHA Risk Engine.

The model should be treated as ONE evidence source.

Conceptually:

Weather
Terrain
Flood
Satellite
Historical incidents
Road condition
GPS anomalies
Field reports
       ↓
PRAVAHA RISK ENGINE
       ↑
       |
MY ML MODEL

Do not allow the ML model alone to automatically:

- declare a disaster
- permanently close a road
- issue a public emergency alert
- make irreversible operational decisions

Critical alerts should remain human-verifiable.

==================================================
PHASE 7 — PRAVAHA FEATURES
==================================================

Where technically appropriate, expose model results in:

- Command Center
- Live Map
- Risk Engine
- Incident details
- RouteGuard
- Analytics
- Earth Intelligence

For map-based predictions, show the relevant geographic location.

For high-risk areas, allow the prediction to contribute to:

- corridor risk
- route scoring
- ETA estimation
- alternate route recommendations
- incident prioritization

Do not claim the model does something it was not trained to do.

==================================================
PHASE 8 — DATABASE
==================================================

If appropriate, create a prediction record containing:

- prediction_id
- model_name
- model_version
- timestamp
- latitude
- longitude
- input/reference ID
- prediction
- confidence if available
- risk level
- source
- created_at

Follow the existing PRAVAHA database conventions.

Do not create a second unnecessary database architecture.

==================================================
PHASE 9 — TESTING
==================================================

Create real tests for:

1. Model loading
2. Preprocessing
3. Valid inference
4. Invalid input
5. API endpoint
6. Model health endpoint
7. Risk Engine integration

Run the tests.

Do not mark functionality as complete simply because the code compiles.

==================================================
PHASE 10 — DOCUMENTATION
==================================================

Create/update documentation explaining:

- What the model does
- Required inputs
- Output
- Model version
- Dependencies
- How to start the ML service
- How to call the prediction API
- How it connects to PRAVAHA
- Known limitations

==================================================
CRITICAL RULES
==================================================

1. USE MY ACTUAL TRAINED MODEL.
2. DO NOT REPLACE IT.
3. DO NOT CREATE A MOCK MODEL.
4. DO NOT FABRICATE PREDICTIONS.
5. DO NOT FABRICATE ACCURACY.
6. DO NOT FABRICATE CONFIDENCE.
7. DO NOT CLAIM REAL-TIME CAPABILITIES THAT THE MODEL DOES NOT HAVE.
8. DO NOT BREAK EXISTING PRAVAHA MODULES.
9. DO NOT unnecessarily rewrite the architecture.
10. Reuse existing APIs, database models and Risk Engine where possible.
11. Keep secrets/API keys in environment variables.
12. Follow the existing PRAVAHA coding conventions.
13. Make the implementation production-oriented but keep it achievable for the current prototype.
14. If a dependency or model file is incompatible, report the exact issue and propose the smallest safe fix.

==================================================
FINAL REPORT
==================================================

After implementation, report:

MODEL:
- model identified
- framework
- input
- output
- preprocessing
- version

INTEGRATION:
- files created
- files modified
- API endpoints
- Risk Engine integration
- database changes
- UI changes

TESTING:
- tests executed
- results
- model loading status
- sample inference result

ISSUES:
- unresolved dependencies
- missing files
- compatibility problems
- anything that still requires my action

Do not hide errors. I need the actual integration status, not a simulated success.