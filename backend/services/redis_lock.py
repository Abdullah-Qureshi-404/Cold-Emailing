import os
import time
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_redis_client = None
_in_memory_locks = {}


def get_redis_client():
    global _redis_client
    if _redis_client is None:
        try:
            import redis
            url = REDIS_URL
            if "ssl_cert_reqs=CERT_REQUIRED" in url:
                url = url.replace("ssl_cert_reqs=CERT_REQUIRED", "ssl_cert_reqs=required")
            _redis_client = redis.from_url(url, decode_responses=True)
            _redis_client.ping()
        except Exception as e:
            logger.warning("Redis lock client initialization failed (%s); using in-memory fallback lock", e)
            _redis_client = False
    return _redis_client if _redis_client is not False else None


def acquire_stage_lock(campaign_id: int, stage: str, ttl_seconds: int = 180) -> bool:
    """
    Acquires a distributed lock for a specific campaign stage.
    Returns True if the lock was acquired, False if a task is already running.
    TTL prevents permanently locked campaigns if a worker crashes.
    """
    lock_key = f"campaign_lock:{campaign_id}:{stage}"
    client = get_redis_client()

    if client:
        try:
            # Set key only if it does not already exist (nx=True) with expiration (ex=ttl_seconds)
            acquired = bool(client.set(lock_key, str(int(time.time())), nx=True, ex=ttl_seconds))
            if acquired:
                logger.info("Acquired Redis lock for %s (TTL: %ds)", lock_key, ttl_seconds)
            else:
                logger.debug("Redis lock for %s already held by another worker", lock_key)
            return acquired
        except Exception as e:
            logger.warning("Redis error acquiring lock %s: %s; falling back to in-memory lock", lock_key, e)

    # In-memory fallback
    now = time.time()
    existing_expiry = _in_memory_locks.get(lock_key, 0)
    if existing_expiry > now:
        return False
    _in_memory_locks[lock_key] = now + ttl_seconds
    return True


def release_stage_lock(campaign_id: int, stage: str) -> None:
    """
    Releases the distributed lock for a specific campaign stage.
    """
    lock_key = f"campaign_lock:{campaign_id}:{stage}"
    client = get_redis_client()

    if client:
        try:
            client.delete(lock_key)
            logger.debug("Released Redis lock for %s", lock_key)
        except Exception as e:
            logger.warning("Redis error releasing lock %s: %s", lock_key, e)

    _in_memory_locks.pop(lock_key, None)
