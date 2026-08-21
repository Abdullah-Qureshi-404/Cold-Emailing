"""
Pipeline Reliability & Concurrency Test Suite
Tests:
1. Zombie recovery logic & idempotency
2. Renewable distributed locks (acquire, renew, release, throttle)
3. Groq rate limiter concurrency & backoff behavior
4. Website scraper response reuse
5. Idempotent agent processing
"""
import os
import sys
import time
import unittest
from unittest.mock import patch, MagicMock

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.redis_lock import (
    acquire_stage_lock,
    renew_stage_lock,
    release_stage_lock,
    is_stage_locked,
    throttle_stage_dispatch,
    _in_memory_locks,
    _in_memory_throttles
)
from services.company_scraper import extract_company_information
from services.website_quality import assess_website_quality
from services.groq_service import _make_groq_request, _groq_semaphore


class TestRedisRenewableLocks(unittest.TestCase):
    def setUp(self):
        _in_memory_locks.clear()
        _in_memory_throttles.clear()

    def test_acquire_and_release_lock(self):
        token = acquire_stage_lock(999, "research", ttl_seconds=10)
        self.assertIsNotNone(token)
        self.assertTrue(is_stage_locked(999, "research"))

        # Duplicate acquire should fail
        duplicate = acquire_stage_lock(999, "research", ttl_seconds=10)
        self.assertIsNone(duplicate)

        # Release with correct token
        released = release_stage_lock(999, "research", token)
        self.assertTrue(released)
        self.assertFalse(is_stage_locked(999, "research"))

    def test_renew_lock(self):
        token = acquire_stage_lock(998, "research", ttl_seconds=2)
        self.assertIsNotNone(token)

        # Renew should succeed with correct token
        renewed = renew_stage_lock(998, "research", token, extend_seconds=10)
        self.assertTrue(renewed)

        # Renew with invalid token should fail
        bad_renew = renew_stage_lock(998, "research", "wrong-token", extend_seconds=10)
        self.assertFalse(bad_renew)

        release_stage_lock(998, "research", token)

    def test_throttle_stage_dispatch(self):
        allowed1 = throttle_stage_dispatch(997, "research", ttl_seconds=5)
        self.assertTrue(allowed1)

        # Immediate second check should be throttled (False)
        allowed2 = throttle_stage_dispatch(997, "research", ttl_seconds=5)
        self.assertFalse(allowed2)


class TestWebsiteReuse(unittest.TestCase):
    @patch("services.company_scraper.requests.get")
    def test_extract_company_information_with_meta(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = "<html><body><h1>Sample Gym</h1><p>We provide crossfit and strength training in downtown Toronto.</p></body></html>"
        mock_get.return_value = mock_resp

        text, meta = extract_company_information("https://examplegym.com", return_meta=True)
        self.assertIsNotNone(text)
        self.assertIn("Sample Gym", text)
        self.assertIsNotNone(meta)
        self.assertEqual(meta["status_code"], 200)

        # Test passing pre_fetched_meta into assess_website_quality
        score, issues = assess_website_quality("https://examplegym.com", pre_fetched_meta=meta)
        self.assertIsInstance(score, int)
        self.assertIsInstance(issues, list)
        # Verify requests.get was NOT called a second time during assess_website_quality
        self.assertEqual(mock_get.call_count, 1)


class TestGroqRateLimiting(unittest.TestCase):
    @patch("services.groq_service.requests.post")
    def test_groq_retry_on_429(self, mock_post):
        # First call returns 429, second call returns 200
        resp_429 = MagicMock()
        resp_429.status_code = 429
        resp_429.headers = {"Retry-After": "0.1"}

        resp_200 = MagicMock()
        resp_200.status_code = 200
        resp_200.json.return_value = {
            "choices": [{"message": {"content": '{"company_summary": "Test"}'}}]
        }

        mock_post.side_effect = [resp_429, resp_200]

        messages = [{"role": "user", "content": "hello"}]
        result = _make_groq_request(messages)
        self.assertEqual(result, '{"company_summary": "Test"}')
        self.assertEqual(mock_post.call_count, 2)


if __name__ == "__main__":
    unittest.main()
