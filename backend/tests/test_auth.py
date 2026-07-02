"""Tests for password hashing and token utilities."""

from __future__ import annotations

import unittest

from app.core.security import create_access_token, create_refresh_token, get_password_hash, verify_password, verify_token


class SecurityTests(unittest.TestCase):
    """Exercise the core authentication helpers."""

    def test_password_hash_round_trip(self) -> None:
        """Hashing and verification should succeed for the same password."""

        hashed = get_password_hash("super-secret-password")
        self.assertTrue(verify_password("super-secret-password", hashed))

    def test_access_token_round_trip(self) -> None:
        """Access tokens should decode with the expected token type."""

        token = create_access_token("11111111-1111-1111-1111-111111111111")
        payload = verify_token(token, expected_type="access")
        self.assertEqual(payload["sub"], "11111111-1111-1111-1111-111111111111")
        self.assertEqual(payload["type"], "access")

    def test_refresh_token_round_trip(self) -> None:
        """Refresh tokens should decode with the expected token type."""

        token = create_refresh_token("22222222-2222-2222-2222-222222222222")
        payload = verify_token(token, expected_type="refresh")
        self.assertEqual(payload["sub"], "22222222-2222-2222-2222-222222222222")
        self.assertEqual(payload["type"], "refresh")

