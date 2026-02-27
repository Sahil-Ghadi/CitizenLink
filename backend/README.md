# CitizenLink — FastAPI Backend

## Setup

### 1. Create a Python virtual environment
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment
Copy `.env.example` to `.env` (already done). The `serviceAccountKey.json` should be in the `backend/` folder.

### 4. Run the server
```bash
uvicorn main:app --reload --port 8000
```

### API Docs
Visit [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive Swagger UI.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/auth/verify` | Verify Firebase ID token & upsert user in Firestore |
| GET | `/auth/me?uid=...` | Get user profile from Firestore |
