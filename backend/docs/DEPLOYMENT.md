# Deployment Guide

## Environment Variables

Set these before starting the backend:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL=openai/gpt-4o-mini`
- `OPENROUTER_TEMPERATURE=0.7`
- `OPENROUTER_MAX_TOKENS=1000`
- `FRONTEND_URL`
- `BACKEND_URL`
- `CORS_ORIGINS`
- `RATE_LIMIT_REQUESTS`
- `RATE_LIMIT_WINDOW_SECONDS`
- `MAX_UPLOAD_SIZE_MB`

## Local Development

```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Upload dataset requests use JSON, so no multipart support is required.

## Docker

Build and run:

```bash
docker build -t hackathon-portal-backend .
docker run --env-file .env -p 8000:8000 hackathon-portal-backend
```

## Production Notes

- Put the service behind HTTPS.
- Store secrets in a secrets manager or platform environment store.
- Use a reverse proxy such as Nginx or a managed ingress.
- Monitor logs in `backend/logs/hackathon_portal.log`.
- Back up the memory store if you want conversational persistence across redeploys.
