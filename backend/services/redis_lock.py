import os
import time
import uuid
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_redis_client = None
_in_memory_locks = {}
_in_memory_throttles = {}

# Lua script to safely renew a lock only if the token matches
LUA_RENEW_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("expire", KEYS[1], tonumber(ARGV[2]))
else
    return 0
end
"""

# Lua script to safely release a lock only if the token matches
LUA_RELEASE_SCRIPT = """
if ARGV[1] == "" or redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""


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


def acquire_stage_lock(campaign_id: int, stage: str, ttl_seconds: int = 120, token: str | None = None) -> str | None:
    """
    Acquires a distributed lock for a specific campaign stage.
    Returns the token (str) if acquired (truthy), or None if locked by another worker.
    """
    lock_key = f"campaign_lock:{campaign_id}:{stage}"
    lock_token = token or str(uuid.uuid4())
    client = get_redis_client()

    if client:
        try:
            acquired = bool(client.set(lock_key, lock_token, nx=True, ex=ttl_seconds))
            if acquired:
                logger.info("Acquired Redis lock for %s (token: %s, TTL: %ds)", lock_key, lock_token, ttl_seconds)
                return lock_token
            else:
                logger.debug("Redis lock for %s already held by another worker", lock_key)
                return None
        except Exception as e:
            logger.warning("Redis error acquiring lock %s: %s; falling back to in-memory lock", lock_key, e)

    # In-memory fallback
    now = time.time()
    existing = _in_memory_locks.get(lock_key)
    if existing and existing["expiry"] > now:
        return None
    _in_memory_locks[lock_key] = {"token": lock_token, "expiry": now + ttl_seconds}
    return lock_token


def renew_stage_lock(campaign_id: int, stage: str, token: str, extend_seconds: int = 120) -> bool:
    """
    Extends the TTL of an actively held lock only if the token matches.
    Returns True if successfully renewed, False if expired or owned by another worker.
    """
    if not token:
        return False

    lock_key = f"campaign_lock:{campaign_id}:{stage}"
    client = get_redis_client()

    if client:
        try:
            res = client.eval(LUA_RENEW_SCRIPT, 1, lock_key, token, extend_seconds)
            success = bool(res == 1)
            if success:
                logger.debug("Renewed Redis lock for %s by %ds (token: %s)", lock_key, extend_seconds, token)
            else:
                logger.warning("Failed to renew Redis lock for %s; token mismatch or already expired", lock_key)
            return success
        except Exception as e:
            logger.warning("Redis error renewing lock %s: %s; falling back to in-memory", lock_key, e)

    # In-memory fallback
    now = time.time()
    existing = _in_memory_locks.get(lock_key)
    if existing and existing["token"] == token and existing["expiry"] > now:
        existing["expiry"] = now + extend_seconds
        return True
    return False


def release_stage_lock(campaign_id: int, stage: str, token: str | None = None) -> bool:
    """
    Releases the distributed lock for a specific campaign stage.
    If token is provided, only releases if the token matches.
    """
    lock_key = f"campaign_lock:{campaign_id}:{stage}"
    client = get_redis_client()

    if client:
        try:
            token_arg = token if token else ""
            res = client.eval(LUA_RELEASE_SCRIPT, 1, lock_key, token_arg)
            logger.debug("Released Redis lock for %s", lock_key)
            return bool(res == 1)
        except Exception as e:
            logger.warning("Redis error releasing lock %s: %s", lock_key, e)

    # In-memory fallback
    existing = _in_memory_locks.get(lock_key)
    if existing:
        if token is None or existing["token"] == token:
            _in_memory_locks.pop(lock_key, None)
            return True
    return False


def is_stage_locked(campaign_id: int, stage: str) -> bool:
    """
    Checks whether a stage is actively locked without attempting to acquire it.
    """
    lock_key = f"campaign_lock:{campaign_id}:{stage}"
    client = get_redis_client()

    if client:
        try:
            return bool(client.exists(lock_key))
        except Exception as e:
            logger.warning("Redis error checking lock %s: %s", lock_key, e)

    # In-memory fallback
    now = time.time()
    existing = _in_memory_locks.get(lock_key)
    return bool(existing and existing["expiry"] > now)


def throttle_stage_dispatch(campaign_id: int, stage: str, ttl_seconds: int = 45) -> bool:
    """
    Sets a short dispatch throttle key. Returns True if dispatch is ALLOWED (key was set),
    or False if throttled (dispatch happened recently).
    """
    throttle_key = f"campaign_throttle:{campaign_id}:{stage}"
    client = get_redis_client()

    if client:
        try:
            allowed = bool(client.set(throttle_key, "1", nx=True, ex=ttl_seconds))
            return allowed
        except Exception as e:
            logger.warning("Redis error checking throttle %s: %s", throttle_key, e)

    # In-memory fallback
    now = time.time()
    existing_expiry = _in_memory_throttles.get(throttle_key, 0)
    if existing_expiry > now:
        return False
    _in_memory_throttles[throttle_key] = now + ttl_seconds
    return True
