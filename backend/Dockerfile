FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements_space.txt .
RUN pip install --no-cache-dir -r requirements_space.txt

COPY main.py .
COPY rate_limit.py .

RUN useradd -m -u 1000 user && chown -R user:user /app

USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH

EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]