# Financial WordMap - Backend

FastAPI backend for the Financial WordMap application, connecting to Qdrant vector database and Tavily API for real-time news.

## Prerequisites

- Python 3.9+
- Docker (for Qdrant)
- Qdrant running on `localhost:6333`

## Setup

1. **Create a virtual environment:**

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

2. **Install dependencies:**

```bash
pip install -r requirements.txt
```

3. **Configure environment variables:**

Edit the `.env` file in the project root:

```env
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION=financial_docs
TAVILY_API_KEY=your_tavily_api_key_here
```

Get your Tavily API key from [https://tavily.com](https://tavily.com)

## Running the Backend

From the project root directory:

```bash
# Windows
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Or from backend directory
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/map` | GET | Get all nodes and edges |
| `/api/node/{id}` | GET | Get node details + news |
| `/api/node/{id}/details` | GET | Get node stock details only |
| `/api/node/{id}/news` | GET | Get node news from Tavily |
| `/api/clusters` | GET | Get cluster metadata |
| `/api/search?q=` | GET | Search nodes |
| `/api/similar/{id}` | GET | Get similar nodes |

## Data Source

- **Qdrant**: Stock data from document chunks with metadata (ticker, sector, category)
- **Tavily**: Real-time news search for each stock
- **Fallback**: Nifty 50 stocks with generated mock data when Qdrant is unavailable

## Architecture

```
backend/
├── main.py           # FastAPI app and routes
├── config.py         # Environment configuration
├── models/
│   └── schemas.py    # Pydantic models
└── services/
    ├── qdrant_service.py   # Qdrant vector DB integration
    └── tavily_service.py   # Tavily news API integration
```
