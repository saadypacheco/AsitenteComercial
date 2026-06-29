FROM python:3.12-slim

# ffmpeg necesario para faster-whisper (decodifica audios de WhatsApp)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir uv && uv pip install --system .

COPY app ./app

EXPOSE 8002
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
