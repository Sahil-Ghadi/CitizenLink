import os
from dotenv import load_dotenv

# Load .env BEFORE any subgraph module is imported, because graph modules
# instantiate ChatGoogleGenerativeAI at module level and need GOOGLE_API_KEY.
load_dotenv()

# langchain_google_genai reads GOOGLE_API_KEY; our .env uses GEMINI_API_KEY.
# Bridge the two so either name works.
if not os.getenv("GOOGLE_API_KEY") and os.getenv("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]
