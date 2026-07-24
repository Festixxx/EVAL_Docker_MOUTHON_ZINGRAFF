# Stage 1 : installation des dépendances
FROM python:3.12-slim AS builder

WORKDIR /app

COPY requirements.txt .

RUN pip install --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2 : image finale de production
FROM python:3.12-slim AS production

WORKDIR /app

COPY --from=builder /install /usr/local

COPY app ./app

RUN mkdir -p /data

ENV DB_PATH=/data/scores.db
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
