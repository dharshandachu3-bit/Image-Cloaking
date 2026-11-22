# Privacy-Preserving Image Cloaking — FastAPI + PyTorch Backend

This directory contains the complete Python ML backend for executing resolution-decoupled adversarial perturbations (FGSM & PGD) using pretrained Torchvision models (`ResNet-50`, `MobileNetV3-Large`, `ViT-B/16`).

## Quick Local Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Verify the service is healthy:

```bash
curl http://localhost:8000/health
```

## Docker Deployment (Render / Cloud Run / Railway)

```bash
cd backend
docker build -t cloak-vision-backend .
docker run -p 8000:8000 -e ALLOWED_ORIGINS="https://your-frontend-domain.com" cloak-vision-backend
```

## Connecting to the Frontend

1. Open the web application and navigate to **Settings** (or click **Backend Settings** inside **Cloaking Studio**).
2. Enter your running FastAPI URL (e.g. `http://localhost:8000` or your deployed Cloud Run / Render HTTPS URL).
3. Click **Test Connection** to verify `GET /health` and inspect available pretrained models.

## Privacy Guarantee

All uploaded images are validated and processed strictly in RAM (`io.BytesIO`). No user photographs are written to disk or retained after inference completes.
