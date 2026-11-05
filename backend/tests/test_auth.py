"""
test_auth.py – Unit and API tests for Authentication Foundation (Phase 4 Step 1).

Tests:
- Password hashing and verification using bcrypt (salt, verification, mismatch, malformed hash).
- JWT token generation, expiration, claims, and signature verification.
- POST /auth/signup:
    - Successful registration returning user profile (without password or hash)
    - Email normalization (whitespace trimming and lowercasing)
    - Duplicate email rejection (409 Conflict)
    - Password length and blank validation (422 Unprocessable Entity)
    - Invalid email format validation (422 Unprocessable Entity)
- POST /auth/login:
    - Successful authentication returning Bearer token and user info
    - Incorrect password rejection (401 Unauthorized with safe error message)
    - Nonexistent email rejection (401 Unauthorized with safe error message)
    - Case-insensitive email login
    - Deactivated user rejection (403 Forbidden)
- GET /auth/me:
    - Profile retrieval using valid Bearer access token
    - Missing token rejection (401 Unauthorized)
    - Malformed/tampered token rejection (401 Unauthorized)
    - Expired token rejection (401 Unauthorized)
- Router prefix compatibility (/auth and /api/auth).
"""

from datetime import timedelta
import uuid
import pytest
import httpx
import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


# ── Password Security Unit Tests ──────────────────────────────────────────────

class TestPasswordSecurity:
    """Unit tests for bcrypt password hashing and verification."""

    def test_hash_password_produces_bcrypt_hash(self):
        plain = "SuperSecretPassword123!"
        hashed = hash_password(plain)

        assert hashed != plain
        assert hashed.startswith("$2b$")
        assert verify_password(plain, hashed) is True

    def test_verify_password_with_incorrect_password_fails(self):
        hashed = hash_password("CorrectHorseBatteryStaple")
        assert verify_password("WrongPassword123", hashed) is False

    def test_verify_password_with_malformed_hash_fails_gracefully(self):
        assert verify_password("test", "not-a-valid-bcrypt-hash") is False
        assert verify_password("test", "") is False


# ── JWT Token Unit Tests ──────────────────────────────────────────────────────

class TestJWTTokens:
    """Unit tests for JWT creation and validation."""

    def test_create_and_decode_access_token_success(self):
        user_id = uuid.uuid4()
        token = create_access_token(
            subject=user_id,
            extra_claims={"email": "alice@example.com"},
        )

        payload = decode_access_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["email"] == "alice@example.com"
        assert "exp" in payload
        assert "iat" in payload

    def test_expired_token_raises_expired_signature_error(self):
        user_id = uuid.uuid4()
        # Token expired 10 minutes ago
        token = create_access_token(
            subject=user_id,
            expires_delta=timedelta(minutes=-10),
        )

        with pytest.raises(jwt.ExpiredSignatureError):
            decode_access_token(token)

    def test_invalid_signature_raises_invalid_token_error(self):
        user_id = uuid.uuid4()
        # Signed with a different secret
        payload = {"sub": str(user_id)}
        tampered_token = jwt.encode(payload, "different_secret_key_12345678901234567890", algorithm="HS256")

        with pytest.raises(jwt.InvalidSignatureError):
            decode_access_token(tampered_token)

    def test_extra_claims_cannot_override_standard_claims(self):
        user_id = uuid.uuid4()
        token = create_access_token(
            subject=user_id,
            extra_claims={"sub": "overridden", "role": "admin"},
        )
        payload = decode_access_token(token)
        # sub should remain the user_id, not "overridden"
        assert payload["sub"] == str(user_id)
        assert payload["role"] == "admin"


# ── User Signup API Tests ─────────────────────────────────────────────────────

class TestUserSignupAPI:
    """API tests for POST /auth/signup."""

    @pytest.mark.asyncio
    async def test_signup_success_returns_user_without_password(
        self, client: httpx.AsyncClient
    ):
        payload = {
            "email": "testuser@example.com",
            "password": "StrongPassword999!",
            "full_name": "Test User",
        }
        response = await client.post("/auth/signup", json=payload)
        assert response.status_code == 201

        data = response.json()
        assert "id" in data
        assert data["email"] == "testuser@example.com"
        assert data["full_name"] == "Test User"
        assert data["is_active"] is True
        assert "created_at" in data
        assert "updated_at" in data

        # Security check: password and hash must never be returned
        assert "password" not in data
        assert "hashed_password" not in data

    @pytest.mark.asyncio
    async def test_signup_normalizes_email(self, client: httpx.AsyncClient):
        payload = {
            "email": "   User.Normalized@Example.COM   ",
            "password": "Password12345",
        }
        response = await client.post("/auth/signup", json=payload)
        assert response.status_code == 201
        assert response.json()["email"] == "user.normalized@example.com"

    @pytest.mark.asyncio
    async def test_signup_duplicate_email_returns_409_conflict(
        self, client: httpx.AsyncClient
    ):
        payload = {
            "email": "duplicate@example.com",
            "password": "Password12345",
        }
        r1 = await client.post("/auth/signup", json=payload)
        assert r1.status_code == 201

        # Attempt to register with the same email (different casing)
        r2 = await client.post(
            "/auth/signup",
            json={"email": "DUPLICATE@example.com", "password": "Password99999"},
        )
        assert r2.status_code == 409
        assert "already exists" in r2.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_signup_short_password_returns_422(self, client: httpx.AsyncClient):
        payload = {
            "email": "shortpw@example.com",
            "password": "short",  # < 8 chars
        }
        response = await client.post("/auth/signup", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_signup_blank_password_returns_422(self, client: httpx.AsyncClient):
        payload = {
            "email": "blankpw@example.com",
            "password": "        ",  # only whitespace
        }
        response = await client.post("/auth/signup", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_signup_invalid_email_format_returns_422(
        self, client: httpx.AsyncClient
    ):
        payload = {
            "email": "not-an-email-address",
            "password": "ValidPassword123",
        }
        response = await client.post("/auth/signup", json=payload)
        assert response.status_code == 422


# ── User Login API Tests ──────────────────────────────────────────────────────

class TestUserLoginAPI:
    """API tests for POST /auth/login."""

    @pytest.mark.asyncio
    async def test_login_success_returns_jwt_and_user_info(
        self, client: httpx.AsyncClient
    ):
        # Signup first
        signup_payload = {
            "email": "loginuser@example.com",
            "password": "MyLoginPassword456!",
            "full_name": "Login User",
        }
        await client.post("/auth/signup", json=signup_payload)

        # Login
        login_res = await client.post(
            "/auth/login",
            json={"email": "loginuser@example.com", "password": "MyLoginPassword456!"},
        )
        assert login_res.status_code == 200

        data = login_res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "loginuser@example.com"
        assert data["user"]["full_name"] == "Login User"
        assert "hashed_password" not in data["user"]

        # Validate that returned access token is valid and decodable
        decoded = decode_access_token(data["access_token"])
        assert decoded["email"] == "loginuser@example.com"

    @pytest.mark.asyncio
    async def test_login_with_incorrect_password_returns_401(
        self, client: httpx.AsyncClient
    ):
        await client.post(
            "/auth/signup",
            json={"email": "victim@example.com", "password": "CorrectPassword1"},
        )

        response = await client.post(
            "/auth/login",
            json={"email": "victim@example.com", "password": "WrongPassword2"},
        )
        assert response.status_code == 401
        assert "invalid email or password" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_login_with_nonexistent_email_returns_401(
        self, client: httpx.AsyncClient
    ):
        response = await client.post(
            "/auth/login",
            json={"email": "ghost@example.com", "password": "AnyPassword123"},
        )
        assert response.status_code == 401
        assert "invalid email or password" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_login_with_case_insensitive_email(
        self, client: httpx.AsyncClient
    ):
        await client.post(
            "/auth/signup",
            json={"email": "casetest@example.com", "password": "CasePassword123"},
        )

        response = await client.post(
            "/auth/login",
            json={"email": "CASETEST@example.com", "password": "CasePassword123"},
        )
        assert response.status_code == 200
        assert "access_token" in response.json()

    @pytest.mark.asyncio
    async def test_login_deactivated_user_returns_403(
        self, client: httpx.AsyncClient, async_db: AsyncSession
    ):
        signup_res = await client.post(
            "/auth/signup",
            json={"email": "deactivated@example.com", "password": "ValidPassword123"},
        )
        user_id = uuid.UUID(signup_res.json()["id"])

        # Manually deactivate user in DB
        user = await async_db.get(User, user_id)
        assert user is not None
        user.is_active = False
        await async_db.commit()

        # Login attempt
        response = await client.post(
            "/auth/login",
            json={"email": "deactivated@example.com", "password": "ValidPassword123"},
        )
        assert response.status_code == 403
        assert "deactivated" in response.json()["detail"].lower()


# ── Current User Profile API Tests ────────────────────────────────────────────

class TestCurrentUserProfileAPI:
    """API tests for GET /auth/me."""

    @pytest.mark.asyncio
    async def test_get_me_with_valid_token_returns_profile(
        self, client: httpx.AsyncClient
    ):
        # Register and login
        await client.post(
            "/auth/signup",
            json={"email": "me_user@example.com", "password": "Password12345", "full_name": "Me User"},
        )
        login_res = await client.post(
            "/auth/login",
            json={"email": "me_user@example.com", "password": "Password12345"},
        )
        token = login_res.json()["access_token"]

        # Request /auth/me with Authorization header
        me_res = await client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_res.status_code == 200
        data = me_res.json()
        assert data["email"] == "me_user@example.com"
        assert data["full_name"] == "Me User"

    @pytest.mark.asyncio
    async def test_get_me_without_token_returns_401(
        self, client: httpx.AsyncClient
    ):
        response = await client.get("/auth/me")
        assert response.status_code == 401
        assert "could not validate credentials" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_me_with_tampered_token_returns_401(
        self, client: httpx.AsyncClient
    ):
        response = await client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid.tampered.token"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_me_with_expired_token_returns_401(
        self, client: httpx.AsyncClient
    ):
        expired_token = create_access_token(
            subject=uuid.uuid4(),
            expires_delta=timedelta(minutes=-5),
        )
        response = await client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401


# ── Prefix & Routing Compatibility Tests ─────────────────────────────────────

class TestAuthPrefixCompatibilityAPI:
    """Verify both /auth and /api/auth route prefixes work seamlessly."""

    @pytest.mark.asyncio
    async def test_api_prefix_routes_work(self, client: httpx.AsyncClient):
        # Signup via /api/auth/signup
        signup_res = await client.post(
            "/api/auth/signup",
            json={"email": "prefix@example.com", "password": "Password12345"},
        )
        assert signup_res.status_code == 201

        # Login via /api/auth/login
        login_res = await client.post(
            "/api/auth/login",
            json={"email": "prefix@example.com", "password": "Password12345"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

        # /api/auth/me
        me_res = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "prefix@example.com"

