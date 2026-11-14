"""
test_profile.py – Tests for Business Profile & Settings API and PDF integration.

Covers:
- Unauthenticated access rejection (401 Unauthorized).
- Retrieval of initial profile before configuration (prefilled with user identity).
- Creation and update of business profile via PUT /profile.
- Validation and blank string sanitization.
- Multi-user ownership isolation (User A cannot access or overwrite User B's profile).
- PDF integration: generated PDF reflects configured business profile details.
- PDF integration fallback: users without configured profile still generate valid PDFs.
"""

from decimal import Decimal
import uuid
import pytest
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.database import get_db
from app.main import app
from app.models.base import Base
from app.models.business_profile import BusinessProfile
from app.models.quotation import Quotation, QuotationItem
from app.models.user import User
from app.security import create_access_token, hash_password
from app.services.pdf import generate_quotation_pdf


class TestBusinessProfileAPI:
    """Integration tests for GET and PUT /profile."""

    @pytest.mark.asyncio
    async def test_get_profile_unauthenticated_returns_401(
        self, client: httpx.AsyncClient
    ):
        res = await client.get("/profile")
        assert res.status_code == 401
        assert "could not validate credentials" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_put_profile_unauthenticated_returns_401(
        self, client: httpx.AsyncClient
    ):
        res = await client.put("/profile", json={"business_name": "Acme Inc"})
        assert res.status_code == 401
        assert "could not validate credentials" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_profile_initial_defaults(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        """User without configured profile receives prefilled identity object."""
        res = await client.get("/profile", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] is not None
        assert data["business_name"] is None
        assert data["email"] is not None
        assert data["default_currency"] == "USD"

    @pytest.mark.asyncio
    async def test_create_and_update_business_profile(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "business_name": "Summit Web Design LLC",
            "contact_person": "Alex Morgan",
            "email": "alex@summitweb.design",
            "phone": "+1 555-0188",
            "address": "456 Highland Ave, Boulder, CO 80302",
            "website": "https://summitweb.design",
            "tax_id": "EIN-8839210",
            "default_currency": "USD",
            "default_notes": "All estimates are valid for 30 days.",
            "default_terms": "50% upfront deposit required before project kickoff.",
        }

        # 1. Create profile
        put_res = await client.put("/profile", json=payload, headers=auth_headers)
        assert put_res.status_code == 200
        saved = put_res.json()
        assert saved["business_name"] == "Summit Web Design LLC"
        assert saved["contact_person"] == "Alex Morgan"
        assert saved["email"] == "alex@summitweb.design"
        assert saved["tax_id"] == "EIN-8839210"

        # 2. Retrieve profile via GET
        get_res = await client.get("/profile", headers=auth_headers)
        assert get_res.status_code == 200
        assert get_res.json()["business_name"] == "Summit Web Design LLC"

        # 3. Update profile fields
        update_payload = {
            **payload,
            "business_name": "Summit Digital Solutions",
            "phone": "+1 555-9999",
        }
        put2_res = await client.put(
            "/profile", json=update_payload, headers=auth_headers
        )
        assert put2_res.status_code == 200
        assert put2_res.json()["business_name"] == "Summit Digital Solutions"
        assert put2_res.json()["phone"] == "+1 555-9999"

    @pytest.mark.asyncio
    async def test_profile_field_sanitization_blank_to_none(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "business_name": "  Clean Company  ",
            "contact_person": "   ",
            "website": "   ",
            "default_currency": "eur",
        }
        res = await client.put("/profile", json=payload, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["business_name"] == "Clean Company"
        assert data["contact_person"] is None
        assert data["website"] is None
        assert data["default_currency"] == "EUR"

    @pytest.mark.asyncio
    async def test_profile_multi_user_ownership_isolation(
        self,
        client: httpx.AsyncClient,
        auth_headers: dict[str, str],
        second_auth_headers: dict[str, str],
    ):
        """User A and User B maintain completely isolated profiles."""
        # User 1 sets profile
        await client.put(
            "/profile",
            json={"business_name": "User 1 Alpha Corp"},
            headers=auth_headers,
        )

        # User 2 sets profile
        await client.put(
            "/profile",
            json={"business_name": "User 2 Beta Inc"},
            headers=second_auth_headers,
        )

        # User 1 verifies their profile
        u1_res = await client.get("/profile", headers=auth_headers)
        assert u1_res.status_code == 200
        assert u1_res.json()["business_name"] == "User 1 Alpha Corp"

        # User 2 verifies their profile
        u2_res = await client.get("/profile", headers=second_auth_headers)
        assert u2_res.status_code == 200
        assert u2_res.json()["business_name"] == "User 2 Beta Inc"

    @pytest.mark.asyncio
    async def test_pdf_download_reflects_configured_business_profile(
        self,
        client: httpx.AsyncClient,
        auth_headers: dict[str, str],
    ):
        """When user downloads quotation PDF, the PDF contains their custom business details."""
        # 1. Configure user's business profile
        await client.put(
            "/profile",
            json={
                "business_name": "Vanguard Engineering Studios",
                "email": "invoicing@vanguard-eng.com",
                "phone": "+1 555-888-9999",
                "address": "900 Market St, Suite 200, Philadelphia, PA",
                "tax_id": "US-EIN-992819",
            },
            headers=auth_headers,
        )

        # 2. Create quotation
        quote_res = await client.post(
            "/quotations",
            json={
                "title": "Industrial Automation Pilot",
                "customer_name": "Apex Factory",
                "currency": "USD",
                "items": [
                    {
                        "description": "PLC Programming",
                        "quantity": "10.00",
                        "unit_price": "150.00",
                    }
                ],
            },
            headers=auth_headers,
        )
        assert quote_res.status_code == 201
        quote_id = quote_res.json()["id"]

        # 3. Download quotation PDF
        pdf_res = await client.get(f"/quotations/{quote_id}/pdf", headers=auth_headers)
        assert pdf_res.status_code == 200
        assert pdf_res.headers["content-type"] == "application/pdf"
        assert pdf_res.content.startswith(b"%PDF-")
        # PDF stream should contain the custom business name and details
        assert b"Vanguard Engineering Studios" in pdf_res.content
        assert b"invoicing@vanguard-eng.com" in pdf_res.content

    @pytest.mark.asyncio
    async def test_profile_persistence_with_fresh_sessions_per_request(
        self, async_engine
    ):
        """
        Verify persistence when each HTTP request uses a genuinely fresh AsyncSession
        that is completely closed after the request completes (preventing identity map
        caching across requests).
        """
        session_factory = async_sessionmaker(
            async_engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

        # 1. Create and persist user in a dedicated setup session, then close it
        user_id = uuid.uuid4()
        async with session_factory() as setup_session:
            user = User(
                id=user_id,
                email=f"persist_test_{uuid.uuid4().hex[:8]}@example.com",
                hashed_password=hash_password("Password123!"),
                full_name="Persist Test User",
                is_active=True,
            )
            setup_session.add(user)
            await setup_session.commit()

        token = create_access_token(user_id)
        auth_headers = {"Authorization": f"Bearer {token}"}

        # Dependency override: provides a genuinely fresh session per request and closes it
        active_sessions = []

        async def fresh_get_db():
            async with session_factory() as session:
                active_sessions.append(session)
                try:
                    yield session
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise

        app.dependency_overrides[get_db] = fresh_get_db

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as http_client:
            put_payload = {
                "business_name": "Apex Innovations Inc",
                "contact_person": "Alex Mercer",
                "email": "alex@apexinnovations.com",
                "phone": "+1 555-0144",
                "address": "789 Enterprise Blvd, Austin, TX 78701",
                "website": "https://apexinnovations.com",
                "tax_id": "US-EIN-1234567",
                "default_currency": "USD",
                "default_notes": "Net 30 payment terms.",
                "default_terms": "Standard SaaS agreement applies.",
            }

            # 2. PUT /api/profile with updated business details
            put_res = await http_client.put(
                "/api/profile", json=put_payload, headers=auth_headers
            )
            assert put_res.status_code == 200

            # 3. Verify session was recorded
            assert len(active_sessions) >= 1
            put_session = active_sessions[-1]

            # 4. GET /api/profile for the same user via a fresh HTTP request and session
            get_res = await http_client.get("/api/profile", headers=auth_headers)
            assert get_res.status_code == 200
            data = get_res.json()

            # 5. Assert that every updated field is returned
            assert data["business_name"] == put_payload["business_name"]
            assert data["contact_person"] == put_payload["contact_person"]
            assert data["email"] == put_payload["email"]
            assert data["phone"] == put_payload["phone"]
            assert data["address"] == put_payload["address"]
            assert data["website"] == put_payload["website"]
            assert data["tax_id"] == put_payload["tax_id"]
            assert data["default_currency"] == put_payload["default_currency"]
            assert data["default_notes"] == put_payload["default_notes"]
            assert data["default_terms"] == put_payload["default_terms"]

        # Clean up dependency override
        app.dependency_overrides.clear()

        # 6. Ensure actual database persistence directly via a completely new session
        async with session_factory() as direct_session:
            result = await direct_session.execute(
                select(BusinessProfile).where(BusinessProfile.user_id == user_id)
            )
            persisted = result.scalar_one_or_none()
            assert persisted is not None, "BusinessProfile was not persisted in database!"
            assert persisted.business_name == put_payload["business_name"]
            assert persisted.contact_person == put_payload["contact_person"]
            assert persisted.email == put_payload["email"]
            assert persisted.phone == put_payload["phone"]
            assert persisted.address == put_payload["address"]
            assert persisted.website == put_payload["website"]
            assert persisted.tax_id == put_payload["tax_id"]
            assert persisted.default_currency == put_payload["default_currency"]
            assert persisted.default_notes == put_payload["default_notes"]
            assert persisted.default_terms == put_payload["default_terms"]


class TestPdfServiceWithProfileUnit:
    """Unit tests for generate_quotation_pdf with and without BusinessProfile."""

    def test_pdf_generation_with_custom_profile(self):
        dummy_id = uuid.uuid4()
        user_id = uuid.uuid4()
        quote = Quotation(
            id=dummy_id,
            user_id=user_id,
            quotation_number="RQ-PROFILE-01",
            title="Custom Profile Quote",
            status="draft",
            customer_name="Global Logistics",
            currency="USD",
            subtotal=Decimal("500.00"),
            tax_rate=Decimal("0.0000"),
            tax_amount=Decimal("0.00"),
            total_amount=Decimal("500.00"),
        )
        quote.items = [
            QuotationItem(
                id=uuid.uuid4(),
                quotation_id=dummy_id,
                position=1,
                description="Custom Deliverable",
                quantity=Decimal("1"),
                unit_price=Decimal("500"),
                line_total=Decimal("500"),
            )
        ]

        profile = BusinessProfile(
            user_id=user_id,
            business_name="Custom Branding Corp",
            contact_person="Jane Doe",
            email="billing@custombrand.com",
            phone="+1 555-1234",
            address="100 Custom Way",
            website="https://custombrand.com",
            tax_id="VAT-GB9999",
        )

        pdf_bytes = generate_quotation_pdf(quote, business_profile=profile)
        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes.startswith(b"%PDF-")
        assert b"Custom Branding Corp" in pdf_bytes
        assert b"billing@custombrand.com" in pdf_bytes

    def test_pdf_generation_without_profile_fallback(self):
        """Ensure fallback to app settings when business_profile is None."""
        dummy_id = uuid.uuid4()
        user_id = uuid.uuid4()
        quote = Quotation(
            id=dummy_id,
            user_id=user_id,
            quotation_number="RQ-PROFILE-02",
            title="Fallback Quote",
            status="draft",
            customer_name="Client X",
            currency="USD",
            subtotal=Decimal("100.00"),
            tax_rate=Decimal("0.0000"),
            tax_amount=Decimal("0.00"),
            total_amount=Decimal("100.00"),
        )
        quote.items = []

        pdf_bytes = generate_quotation_pdf(quote, business_profile=None)
        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes.startswith(b"%PDF-")

