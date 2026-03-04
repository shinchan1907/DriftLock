FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim

WORKDIR /app

RUN groupadd -g 1001 driftlock && \
    useradd -u 1001 -g driftlock -s /bin/sh driftlock

COPY --from=builder /root/.local /home/driftlock/.local
COPY . .

RUN mkdir -p /app/data && chown -R driftlock:driftlock /app/data

USER 1001:1001
ENV PATH=/home/driftlock/.local/bin:$PATH

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

