# ─────────────────────────────────────────────
# Stage 1 : builder – installe les dépendances
# ─────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Copie uniquement les fichiers de dépendances pour profiter du cache Docker
COPY requirements.txt ./requirements.txt

RUN pip install --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt

# ─────────────────────────────────────────────
# Stage 2 : production
# ─────────────────────────────────────────────
FROM python:3.12-slim AS production

WORKDIR /app

# Récupère les dépendances installées dans le builder
COPY --from=builder /install /usr/local

# Copie le code source de l'API
COPY app ./app

# Répertoire de la base de données (sera monté en volume)
RUN mkdir -p /data

ENV DB_PATH=/data/scores.db
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Healthcheck Docker natif (utilisé par Compose et Kubernetes)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
