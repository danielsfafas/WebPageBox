# WebPageBox

Sitio web para gimnasio de boxeo (frontend React + backend FastAPI + MongoDB).

## Docker

Requisitos: [Docker](https://docs.docker.com/get-docker/) y Docker Compose v2.

```bash
docker compose up -d --build
```

| Servicio  | URL local              |
|-----------|------------------------|
| Frontend  | http://localhost:3102  |
| Backend   | http://localhost:8102  |
| MongoDB   | localhost:27017        |

Credenciales de admin por defecto (cambiar en producción vía variables en `docker-compose.yml`):

- Email: `admin@boxinggym.com`
- Contraseña: `admin123`

### Estructura de imágenes

- `backend/Dockerfile` — API FastAPI (uvicorn, puerto 8000)
- `frontend/Dockerfile` — build React + nginx (puerto 80)
- `docker-compose.yml` — orquesta mongo, backend y frontend

Variable de build del frontend:

```bash
REACT_APP_BACKEND_URL=http://localhost:8102
```

Para producción, ajusta `CORS_ORIGINS`, `JWT_SECRET`, `STRIPE_API_KEY` y las credenciales de admin en `docker-compose.yml` o usa un archivo `.env` con `env_file` en cada servicio.
