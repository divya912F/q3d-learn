FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt "psycopg[binary]>=3.1"

COPY app ./app
COPY frontend ./frontend
COPY run.py .

ENV HOST=0.0.0.0 PORT=8000 RELOAD=0
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/api/health')"
CMD ["python", "run.py"]
