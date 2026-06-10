import os

try:
    from upstash_redis import Redis
except ImportError:
    Redis = None

UPSTASH_REDIS_URL = os.getenv("UPSTASH_REDIS_URL")
UPSTASH_REDIS_TOKEN = os.getenv("UPSTASH_REDIS_TOKEN")
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "20"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

_client = None


def _redis_client():
    global _client

    if Redis is None or not UPSTASH_REDIS_URL or not UPSTASH_REDIS_TOKEN:
        return None

    if _client is None:
        _client = Redis(url=UPSTASH_REDIS_URL, token=UPSTASH_REDIS_TOKEN)

    return _client


def check_rate_limit(ip: str) -> tuple[bool, int]:
    client = _redis_client()
    if client is None:
        return True, 0

    key = f"rate_limit:{ip}"

    try:
        current_count = int(client.incr(key))
        if current_count == 1:
            client.expire(key, RATE_LIMIT_WINDOW_SECONDS)
    except Exception as exc:
        print(f"WARNING: Rate limit check failed for {ip}: {exc}")
        return True, 0

    return current_count <= RATE_LIMIT_MAX_REQUESTS, current_count