import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from dotenv import load_dotenv

load_dotenv()

_app = None


def get_firebase_app():
    global _app
    if _app is None:
        sa_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./serviceAccountKey.json")
        cred = credentials.Certificate(sa_path)
        _app = firebase_admin.initialize_app(cred)
    return _app


# Initialize on import
get_firebase_app()

# Export Firestore client and auth module
db = firestore.client()
firebase_auth = auth
