import os
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import hf_hub_download
from pydantic import BaseModel

try:
    from rate_limit import check_rate_limit
except ImportError:
    def check_rate_limit(request, bucket: str = "predict") -> None:
        return None

app = FastAPI(title="F1 Qualifying Predictor API")


def _parse_allowed_origins(raw_value: str | None) -> list[str]:
    if not raw_value:
        return ["*"]

    origins = [origin.strip() for origin in raw_value.split(",") if origin.strip()]
    return origins or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_allowed_origins(os.getenv("ALLOWED_ORIGINS")),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
MODEL_REPO_ID = os.getenv("MODEL_REPO_ID")
MODEL_FILENAME = os.getenv("MODEL_FILENAME", "model.pkl")
FEATURES_FILENAME = os.getenv("FEATURES_FILENAME", "features.pkl")
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(BASE_DIR / "model.pkl")))
FEATURES_PATH = Path(os.getenv("FEATURES_PATH", str(BASE_DIR / "features.pkl")))
MODEL_CACHE_DIR = Path(os.getenv("MODEL_CACHE_DIR", str(BASE_DIR / "checkpoints")))

DEFAULT_FEATURE_NAMES = [
    "n_fp_laps",
    "n_fp_sessions_participated",
    "best_fp_lap_time_overall",
    "avg_fp_lap_time",
    "median_fp_lap_time",
    "best_last_fp_lap_time",
    "best_last_fp_s1",
    "best_last_fp_s2",
    "best_last_fp_s3",
]

model = None
feature_names = DEFAULT_FEATURE_NAMES.copy()


def _download_from_hub(filename: str) -> Path | None:
    if not MODEL_REPO_ID:
        return None

    MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    try:
        downloaded_path = hf_hub_download(
            repo_id=MODEL_REPO_ID,
            filename=filename,
            local_dir=str(MODEL_CACHE_DIR),
        )
        return Path(downloaded_path)
    except Exception as exc:
        print(f"WARNING: Could not download {filename} from {MODEL_REPO_ID}: {exc}")
        return None


def _resolve_artifact(local_path: Path, filename: str) -> Path | None:
    if MODEL_REPO_ID:
        downloaded = _download_from_hub(filename)
        if downloaded is not None:
            return downloaded

    if local_path.exists():
        return local_path

    return None

@app.on_event("startup")
def load_model():
    global model, feature_names

    model_path = _resolve_artifact(MODEL_PATH, MODEL_FILENAME)
    if model_path is None:
        print("WARNING: model not found locally or in HF Hub. The API will return 503 until one is available.")
        return

    try:
        model = joblib.load(model_path)
    except Exception as exc:
        print(f"WARNING: Failed to load model from {model_path}: {exc}")
        model = None
        return

    feature_path = _resolve_artifact(FEATURES_PATH, FEATURES_FILENAME)
    if feature_path is not None:
        try:
            loaded_features = joblib.load(feature_path)
            feature_names = list(loaded_features)
        except Exception as exc:
            print(f"WARNING: Failed to load features from {feature_path}: {exc}")
            feature_names = DEFAULT_FEATURE_NAMES.copy()
    else:
        feature_names = DEFAULT_FEATURE_NAMES.copy()

    print(f"Model loaded from {model_path}. Features: {feature_names}")


class PredictRequest(BaseModel):
    n_fp_laps: float
    n_fp_sessions_participated: float
    best_fp_lap_time_overall: float
    avg_fp_lap_time: float
    median_fp_lap_time: float
    best_last_fp_lap_time: float
    best_last_fp_s1: float
    best_last_fp_s2: float
    best_last_fp_s3: float


class PredictResponse(BaseModel):
    predicted_position: float
    rounded_position: int


@app.get("/")
def root():
    return {"status": "ok", "model_loaded": model is not None}


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest, request: Request):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Add model.pkl to backend/")

    check_rate_limit(request, "predict")

    input_data = pd.DataFrame([{
        "n_fp_laps": req.n_fp_laps,
        "n_fp_sessions_participated": req.n_fp_sessions_participated,
        "best_fp_lap_time_overall": req.best_fp_lap_time_overall,
        "avg_fp_lap_time": req.avg_fp_lap_time,
        "median_fp_lap_time": req.median_fp_lap_time,
        "best_last_fp_lap_time": req.best_last_fp_lap_time,
        "best_last_fp_s1": req.best_last_fp_s1,
        "best_last_fp_s2": req.best_last_fp_s2,
        "best_last_fp_s3": req.best_last_fp_s3,
    }])

    if feature_names and all(column in input_data.columns for column in feature_names):
        input_data = input_data[feature_names]

    prediction = model.predict(input_data)[0]
    rounded = max(1, min(20, round(float(prediction))))

    return PredictResponse(
        predicted_position=round(float(prediction), 2),
        rounded_position=rounded,
    )
