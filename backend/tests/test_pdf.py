"""
test_pdf.py – Tests for backend PDF generation service and authenticated download endpoint.

Covers:
- PDF generation service produces valid print-ready PDF bytes starting with %PDF-.
- Generated PDF handles complete and minimal quotation data cleanly (None fields).
- Currency formatting and Decimal monetary accuracy.
- Authenticated PDF export endpoint:
  - 200 OK with application/pdf and Content-Disposition headers.
  - 401 Unauthorized for unauthenticated requests.
  - 404 Not Found for nonexistent quotation IDs.
  - 404 Not Found cross-user ownership isolation (User B cannot download User A's PDF).
  - 422 Unprocessable Entity for invalid UUIDs.
  - Support for /quotations/{id}/pdf and /api/quotations/{id}/pdf routes.
"""

from datetime import datetime, timezone
from decimal import Decimal
import uuid
import pytest
import httpx

from app.models.quotation import Quotation, QuotationItem
from app.services.pdf import generate_quotation_pdf, _format_currency


class TestPdfServiceUnit:
    """Unit tests for the PDF generation service."""

    def test_format_currency_symbols(self):
        assert _format_currency("1250.50", "USD") == "$1,250.50"
        assert _format_currency(Decimal("99.99"), "EUR") == "€99.99"
        assert _format_currency("1000", "GBP") == "£1,000.00"
        assert _format_currency("500.00", "JPY") == "JPY 500.00"

    def test_generate_quotation_pdf_valid_bytes(self):
        dummy_id = uuid.uuid4()
        user_id = uuid.uuid4()
        quote = Quotation(
            id=dummy_id,
            user_id=user_id,
            quotation_number="RQ-20261106-PDF1",
            title="Office Network Setup",
            description="Install routers and configure mesh WiFi network.",
            status="sent",
            customer_name="TechCorp Global",
            customer_email="billing@techcorp.com",
            customer_phone="+1 555-0144",
            customer_company="TechCorp Enterprises",
            customer_address="742 Evergreen Terrace, Springfield, OR",
            currency="USD",
            subtotal=Decimal("2500.00"),
            tax_rate=Decimal("0.1000"),
            tax_amount=Decimal("250.00"),
            total_amount=Decimal("2750.00"),
            notes="Net 30 days payment terms.",
            terms_and_conditions="All hardware comes with 1-year manufacturer warranty.",
            created_at=datetime.now(timezone.utc),
        )
        quote.items = [
            QuotationItem(
                id=uuid.uuid4(),
                quotation_id=dummy_id,
                position=1,
                description="Enterprise Gateway Router",
                unit="pcs",
                quantity=Decimal("2.0000"),
                unit_price=Decimal("500.0000"),
                line_total=Decimal("1000.0000"),
            ),
            QuotationItem(
                id=uuid.uuid4(),
                quotation_id=dummy_id,
                position=2,
                description="Installation & Configuration Labor",
                unit="hrs",
                quantity=Decimal("15.0000"),
                unit_price=Decimal("100.0000"),
                line_total=Decimal("1500.0000"),
            ),
        ]

        pdf_bytes = generate_quotation_pdf(quote)

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 2000
        assert pdf_bytes.startswith(b"%PDF-")
        assert b"%%EOF" in pdf_bytes

    def test_generate_quotation_pdf_minimal_optional_fields(self):
        """Test PDF generation when all optional fields (notes, description, company, address) are None."""
        dummy_id = uuid.uuid4()
        quote = Quotation(
            id=dummy_id,
            user_id=uuid.uuid4(),
            quotation_number="RQ-20261106-MIN",
            title="Consulting Session",
            description=None,
            status="draft",
            customer_name="Jane Doe",
            customer_email=None,
            customer_phone=None,
            customer_company=None,
            customer_address=None,
            currency="EUR",
            subtotal=Decimal("150.00"),
            tax_rate=Decimal("0.0000"),
            tax_amount=Decimal("0.00"),
            total_amount=Decimal("150.00"),
            notes=None,
            terms_and_conditions=None,
            created_at=None,
        )
        quote.items = [
            QuotationItem(
                id=uuid.uuid4(),
                quotation_id=dummy_id,
                position=1,
                description="Initial Strategy Audit",
                unit=None,
                quantity=Decimal("1.0000"),
                unit_price=Decimal("150.0000"),
                line_total=Decimal("150.0000"),
            )
        ]

        pdf_bytes = generate_quotation_pdf(quote)
        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes.startswith(b"%PDF-")


class TestPdfDownloadApi:
    """Integration tests for the GET /quotations/{id}/pdf endpoint."""

    @pytest.fixture
    def sample_payload(self) -> dict:
        return {
            "title": "Cloud Architecture Assessment",
            "description": "Comprehensive review of cloud infrastructure and security.",
            "customer_name": "Apex Innovations",
            "customer_email": "finance@apexinno.io",
            "customer_phone": "+1 555-0987",
            "customer_company": "Apex Corp",
            "customer_address": "500 Howard St, San Francisco, CA",
            "currency": "USD",
            "tax_rate": "0.0825",
            "notes": "Thank you for considering our proposal.",
            "terms_and_conditions": "Valid for 30 calendar days.",
            "items": [
                {
                    "description": "Architecture Review",
                    "unit": "days",
                    "quantity": "3.00",
                    "unit_price": "1200.00",
                    "position": 1,
                },
                {
                    "description": "Security Report",
                    "unit": "doc",
                    "quantity": "1.00",
                    "unit_price": "800.00",
                    "position": 2,
                },
            ],
        }

    @pytest.mark.asyncio
    async def test_download_pdf_unauthenticated_returns_401(
        self, client: httpx.AsyncClient
    ):
        random_id = str(uuid.uuid4())
        res = await client.get(f"/quotations/{random_id}/pdf")
        assert res.status_code == 401
        assert "could not validate credentials" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_download_pdf_nonexistent_returns_404(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        random_id = str(uuid.uuid4())
        res = await client.get(f"/quotations/{random_id}/pdf", headers=auth_headers)
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_download_pdf_invalid_uuid_returns_422(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        res = await client.get("/quotations/not-a-valid-uuid/pdf", headers=auth_headers)
        assert res.status_code == 422

    @pytest.mark.asyncio
    async def test_download_pdf_authenticated_owner_success(
        self,
        client: httpx.AsyncClient,
        auth_headers: dict[str, str],
        sample_payload: dict,
    ):
        # 1. Create a quotation as primary user
        create_res = await client.post(
            "/quotations", json=sample_payload, headers=auth_headers
        )
        assert create_res.status_code == 201
        created = create_res.json()
        quote_id = created["id"]
        quote_number = created["quotation_number"]

        # 2. Download the PDF as primary user
        pdf_res = await client.get(f"/quotations/{quote_id}/pdf", headers=auth_headers)
        assert pdf_res.status_code == 200
        assert pdf_res.headers["content-type"] == "application/pdf"
        assert (
            f'filename="quotation-{quote_number}.pdf"'
            in pdf_res.headers["content-disposition"]
        )
        assert pdf_res.content.startswith(b"%PDF-")
        assert len(pdf_res.content) > 1000

    @pytest.mark.asyncio
    async def test_download_pdf_cross_user_isolation_returns_404(
        self,
        client: httpx.AsyncClient,
        auth_headers: dict[str, str],
        second_auth_headers: dict[str, str],
        sample_payload: dict,
    ):
        """User 2 must receive 404 when attempting to download User 1's quotation PDF."""
        # User 1 creates a quotation
        create_res = await client.post(
            "/quotations", json=sample_payload, headers=auth_headers
        )
        assert create_res.status_code == 201
        user1_quote_id = create_res.json()["id"]

        # User 2 attempts to download User 1's quotation PDF
        cross_res = await client.get(
            f"/quotations/{user1_quote_id}/pdf", headers=second_auth_headers
        )
        assert cross_res.status_code == 404
        assert "not found" in cross_res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_download_pdf_via_api_prefix(
        self,
        client: httpx.AsyncClient,
        auth_headers: dict[str, str],
        sample_payload: dict,
    ):
        """Verify the /api/quotations/{id}/pdf route alias works seamlessly."""
        create_res = await client.post(
            "/api/quotations", json=sample_payload, headers=auth_headers
        )
        assert create_res.status_code == 201
        quote_id = create_res.json()["id"]

        pdf_res = await client.get(
            f"/api/quotations/{quote_id}/pdf", headers=auth_headers
        )
        assert pdf_res.status_code == 200
        assert pdf_res.headers["content-type"] == "application/pdf"
        assert pdf_res.content.startswith(b"%PDF-")
