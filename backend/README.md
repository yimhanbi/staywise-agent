# Staywise API and MCP

FastAPI owns the hotel data and database access. The web app calls the API, and the API invokes the local MCP tools over stdio for hotel search and detail lookup.

```text
Web app → FastAPI → MCP tools → FastAPI hotel endpoints → PostgreSQL
```

## MCP tools

- `health_check`: checks whether the hotel API responds.
- `search_hotels`: searches by location and category with pagination. It validates and forwards dates and guest count, but does not check room availability.
- `get_hotel_detail`: returns one hotel's details.

The FastAPI routes used by the web app are:

- `POST /api/ai/search`
- `POST /api/ai/chat`: talks to the configured local Ollama model and lets it call the Staywise MCP search/detail tools.
- `GET /api/mcp/health`
- `GET /api/mcp/hotels/{hotel_id}`
- `GET /api/maps/static`: returns a Kakao static map image through the server-side REST API. It accepts coordinates or an address.

Hotel search and detail requests from the web app use these MCP tools. The AI chat uses Ollama locally; the model can search the hotel catalogue and look up hotel details through MCP. Booking, payment, and date-specific room availability are not implemented.

## Ollama AI chat

Install and start Ollama, then download the default small model:

```bash
ollama pull gemma4:e2b
```

Keep the Ollama app running while using Staywise. If the Ollama server is not running as an app, start it in a separate terminal with `ollama serve`.

The backend defaults to `http://localhost:11434` and model `gemma4:e2b`. To change either, add these optional settings to `backend/.env`:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:e2b
```

The static map route requires a Kakao **REST API key** in `backend/.env`:

```env
KAKAO_REST_API_KEY=your_kakao_rest_api_key
```

The key stays on the backend and is never sent to the browser. The map is a static image, so it does not support pan or zoom.

## Run locally

Start PostgreSQL from the repository root:

```bash
docker compose up -d
```

Then start the API from this directory:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Run the frontend in another terminal from `frontend` with `npm run dev` (or the package manager used for this checkout).

## Run the MCP server for an external MCP host

The MCP server uses stdio transport and exposes the same tools:

```bash
cd backend
source .venv/bin/activate
python mcp_server.py
```

Set `MCP_BACKEND_API_BASE_URL` to the FastAPI API base URL when it differs from `http://localhost:8000/api`. `MCP_UPSTREAM_TIMEOUT_SECONDS` defaults to `5`.
