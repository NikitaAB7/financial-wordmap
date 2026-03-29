import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (parent of backend/)
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Qdrant Configuration
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "financial_docs")

# Tavily Configuration
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

# Define Edge Configuration
DEFINE_EDGE_BASE_URL = os.getenv("DEFINE_EDGE_FUNDAMENTAL_APIS_BASE_URL", "https://radar.definedgesecurities.com")
DEFINE_EDGE_API_KEY = os.getenv("DEFINE_EDGE_API_KEY", "")

# PDF Storage Configuration - proxied through backend via Vite proxy
PDF_BASE_URL = os.getenv("PDF_BASE_URL", "/api/pdf")

# API Configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
