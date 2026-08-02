import logging

logger = logging.getLogger(__name__)


def safe_task_error(task_name: str, exc: Exception) -> str:
    """
    Logs the real exception server-side and returns a user-safe message —
    never leak file paths, library internals, or raw stack traces to the UI.
    """
    logger.exception("%s failed: %s", task_name, exc)
    return f"{task_name} couldn't complete right now. Please try again or contact support if it keeps happening."
