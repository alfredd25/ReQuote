"""
test_api_quotations.py – API tests for Quotation endpoints.

Tests:
- POST /quotations:
    - Successful creation with line items
    - Auto-generated quotation numbers
    - Custom quotation numbers
    - Client-provided totals are ignored (server Decimal calculation enforcement)
    - Fractional quantities and prices
    - Empty line items list
    - Duplicate quotation number returns 409 Conflict
    - Validation errors return 422 Unprocessable Entity
- GET /quotations/{id}:
    - Successful retrieval with line items
    - Nonexistent UUID returns 404 Not Found
    - Malformed UUID returns 422 Unprocessable Entity
- GET /quotations:
    - Paginated listing
    - Correct total, page, page_size, total_pages
- Both `/quotations` and `/api/quotations` paths work
"""

from decimal import Decimal
import uuid
import pytest
import httpx


# ── Creation Tests ────────────────────────────────────────────────────────────

class TestCreateQuotationAPI:
    """Test suite for POST /quotations endpoint."""

    @pytest.mark.asyncio
    async def test_create_quotation_with_items_success(self, client: httpx.AsyncClient):
        payload = {
            "title": "Cloud Migration Services",
            "description": "Full architecture migration to AWS/GCP",
            "customer_name": "Globex Corp",
            "customer_email": "billing@globex.example",
            "customer_phone": "+1-555-0199",
            "customer_company": "Globex International",
            "customer_address": "742 Evergreen Terrace, Springfield",
            "currency": "USD",
            "tax_rate": "0.1000",
            "notes": "Payment due within 30 days.",
            "terms_and_conditions": "Standard service agreement applies.",
            "items": [
                {
                    "position": 1,
                    "description": "Cloud Architecture Assessment",
                    "unit": "hours",
                    "quantity": "10.0000",
                    "unit_price": "150.0000",
                },
                {
                    "position": 2,
                    "description": "Database Migration Scripting",
                    "unit": "hours",
                    "quantity": "5.5000",
                    "unit_price": "200.0000",
                },
            ],
        }

        response = await client.post("/quotations", json=payload)
        assert response.status_code == 201

        data = response.json()
        assert "id" in data
        assert data["title"] == "Cloud Migration Services"
        assert data["customer_name"] == "Globex Corp"
        assert data["customer_email"] == "billing@globex.example"
        assert data["status"] == "draft"
        assert data["currency"] == "USD"

        # Check Quotation Number is auto-generated and has RQ- prefix
        assert data["quotation_number"].startswith("RQ-")

        # Check line totals:
        # Item 1: 10 * 150 = 1500.0000
        # Item 2: 5.5 * 200 = 1100.0000
        items = data["items"]
        assert len(items) == 2
        assert items[0]["description"] == "Cloud Architecture Assessment"
        assert Decimal(items[0]["line_total"]) == Decimal("1500.0000")
        assert items[1]["description"] == "Database Migration Scripting"
        assert Decimal(items[1]["line_total"]) == Decimal("1100.0000")

        # Check calculated quotation totals:
        # subtotal = 1500 + 1100 = 2600.0000
        # tax_amount = 2600 * 0.1000 = 260.0000
        # total_amount = 2600 + 260 = 2860.0000
        assert Decimal(data["subtotal"]) == Decimal("2600.0000")
        assert Decimal(data["tax_amount"]) == Decimal("260.0000")
        assert Decimal(data["total_amount"]) == Decimal("2860.0000")

    @pytest.mark.asyncio
    async def test_client_calculated_totals_are_strictly_ignored(
        self, client: httpx.AsyncClient
    ):
        """
        Verify that client-provided subtotal/tax/total/line_total are NEVER trusted.
        Backend calculates them from scratch using Decimal arithmetic.
        """
        payload = {
            "title": "Security Audit",
            "customer_name": "Initech",
            "currency": "EUR",
            "tax_rate": "0.2000",
            # Bogus client-provided values that must be ignored:
            "subtotal": "1.0000",
            "tax_amount": "0.0000",
            "total_amount": "1.0000",
            "items": [
                {
                    "description": "Penetration Testing",
                    "quantity": "3.0000",
                    "unit_price": "50.0000",
                    # Bogus line total that must be ignored:
                    "line_total": "0.0100",
                }
            ],
        }

        response = await client.post("/quotations", json=payload)
        assert response.status_code == 201

        data = response.json()
        # Item line_total must be 3 * 50 = 150.0000, NOT 0.0100
        assert Decimal(data["items"][0]["line_total"]) == Decimal("150.0000")
        # Subtotal must be 150.0000, NOT 1.0000
        assert Decimal(data["subtotal"]) == Decimal("150.0000")
        # Tax must be 150 * 0.20 = 30.0000, NOT 0.0000
        assert Decimal(data["tax_amount"]) == Decimal("30.0000")
        # Total must be 180.0000, NOT 1.0000
        assert Decimal(data["total_amount"]) == Decimal("180.0000")

    @pytest.mark.asyncio
    async def test_create_quotation_with_custom_number(self, client: httpx.AsyncClient):
        payload = {
            "title": "Custom Number Quote",
            "quotation_number": "RQ-2026-CUSTOM-001",
            "customer_name": "Hooli",
            "items": [],
        }

        response = await client.post("/quotations", json=payload)
        assert response.status_code == 201
        assert response.json()["quotation_number"] == "RQ-2026-CUSTOM-001"

    @pytest.mark.asyncio
    async def test_create_duplicate_quotation_number_returns_409(
        self, client: httpx.AsyncClient
    ):
        payload = {
            "title": "First Quote",
            "quotation_number": "RQ-DUP-001",
            "customer_name": "Acme",
        }
        r1 = await client.post("/quotations", json=payload)
        assert r1.status_code == 201

        # Second attempt with same quotation_number
        payload["title"] = "Second Quote"
        r2 = await client.post("/quotations", json=payload)
        assert r2.status_code == 409
        assert "already exists" in r2.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_create_quotation_without_items(self, client: httpx.AsyncClient):
        payload = {
            "title": "Draft Quote No Items",
            "customer_name": "Stark Industries",
            "currency": "USD",
        }
        response = await client.post("/quotations", json=payload)
        assert response.status_code == 201

        data = response.json()
        assert data["items"] == []
        assert Decimal(data["subtotal"]) == Decimal("0.0000")
        assert Decimal(data["tax_amount"]) == Decimal("0.0000")
        assert Decimal(data["total_amount"]) == Decimal("0.0000")

    @pytest.mark.asyncio
    async def test_automatic_item_positions_when_omitted(self, client: httpx.AsyncClient):
        payload = {
            "title": "Auto Position Quote",
            "customer_name": "Wayne Enterprises",
            "items": [
                {"description": "Gadget A", "quantity": "1.0000", "unit_price": "10.0000"},
                {"description": "Gadget B", "quantity": "2.0000", "unit_price": "20.0000"},
                {"description": "Gadget C", "quantity": "3.0000", "unit_price": "30.0000"},
            ],
        }
        response = await client.post("/quotations", json=payload)
        assert response.status_code == 201

        items = response.json()["items"]
        assert [it["position"] for it in items] == [1, 2, 3]

    @pytest.mark.asyncio
    async def test_currency_normalized_to_uppercase(self, client: httpx.AsyncClient):
        payload = {
            "title": "Currency Check",
            "customer_name": "Euro Corp",
            "currency": "eur",
        }
        response = await client.post("/quotations", json=payload)
        assert response.status_code == 201
        assert response.json()["currency"] == "EUR"


# ── Validation Error Tests ───────────────────────────────────────────────────

class TestQuotationValidationAPI:
    """Test suite for request payload validation and 422 HTTP responses."""

    @pytest.mark.asyncio
    async def test_missing_required_title(self, client: httpx.AsyncClient):
        payload = {"customer_name": "Acme"}
        response = await client.post("/quotations", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_blank_title(self, client: httpx.AsyncClient):
        payload = {"title": "   ", "customer_name": "Acme"}
        response = await client.post("/quotations", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_required_customer_name(self, client: httpx.AsyncClient):
        payload = {"title": "Website Quote"}
        response = await client.post("/quotations", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_blank_customer_name(self, client: httpx.AsyncClient):
        payload = {"title": "Website Quote", "customer_name": "   "}
        response = await client.post("/quotations", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_email_format(self, client: httpx.AsyncClient):
        payload = {
            "title": "Email Test",
            "customer_name": "Acme",
            "customer_email": "not-a-valid-email",
        }
        response = await client.post("/quotations", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_negative_item_quantity(self, client: httpx.AsyncClient):
        payload = {
            "title": "Negative Qty",
            "customer_name": "Acme",
            "items": [
                {"description": "Item", "quantity": "-1.0000", "unit_price": "10.0000"}
            ],
        }
        response = await client.post("/quotations", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_zero_item_quantity(self, client: httpx.AsyncClient):
        payload = {
            "title": "Zero Qty",
            "customer_name": "Acme",
            "items": [
                {"description": "Item", "quantity": "0.0000", "unit_price": "10.0000"}
            ],
        }
        response = await client.post("/quotations", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_negative_unit_price(self, client: httpx.AsyncClient):
        payload = {
            "title": "Negative Price",
            "customer_name": "Acme",
            "items": [
                {"description": "Item", "quantity": "1.0000", "unit_price": "-5.0000"}
            ],
        }
        response = await client.post("/quotations", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_tax_rate(self, client: httpx.AsyncClient):
        payload = {
            "title": "Invalid Tax",
            "customer_name": "Acme",
            "tax_rate": "1.5000",  # Over 100%
        }
        response = await client.post("/quotations", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_currency_code(self, client: httpx.AsyncClient):
        payload = {
            "title": "Invalid Currency",
            "customer_name": "Acme",
            "currency": "USDD",  # 4 chars
        }
        response = await client.post("/quotations", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_blank_item_description(self, client: httpx.AsyncClient):
        payload = {
            "title": "Blank Item Desc",
            "customer_name": "Acme",
            "items": [
                {"description": "   ", "quantity": "1.0000", "unit_price": "10.0000"}
            ],
        }
        response = await client.post("/quotations", json=payload)
        assert response.status_code == 422


# ── Retrieval Tests ──────────────────────────────────────────────────────────

class TestGetQuotationAPI:
    """Test suite for GET /quotations/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_quotation_by_id_success(self, client: httpx.AsyncClient):
        # Create first
        create_res = await client.post(
            "/quotations",
            json={
                "title": "Hardware Procurement",
                "customer_name": "Cyberdyne Systems",
                "tax_rate": "0.0825",
                "items": [
                    {
                        "position": 1,
                        "description": "Server Rack 42U",
                        "quantity": "2.0000",
                        "unit_price": "899.9900",
                    }
                ],
            },
        )
        assert create_res.status_code == 201
        created_id = create_res.json()["id"]

        # Fetch
        fetch_res = await client.get(f"/quotations/{created_id}")
        assert fetch_res.status_code == 200

        data = fetch_res.json()
        assert data["id"] == created_id
        assert data["title"] == "Hardware Procurement"
        assert len(data["items"]) == 1
        assert data["items"][0]["description"] == "Server Rack 42U"

    @pytest.mark.asyncio
    async def test_get_quotation_nonexistent_uuid_returns_404(
        self, client: httpx.AsyncClient
    ):
        random_uuid = str(uuid.uuid4())
        response = await client.get(f"/quotations/{random_uuid}")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_quotation_malformed_id_returns_422(
        self, client: httpx.AsyncClient
    ):
        response = await client.get("/quotations/not-a-valid-uuid")
        assert response.status_code == 422


# ── List & Pagination Tests ──────────────────────────────────────────────────

class TestListQuotationsAPI:
    """Test suite for GET /quotations endpoint with pagination."""

    @pytest.mark.asyncio
    async def test_list_quotations_empty(self, client: httpx.AsyncClient):
        response = await client.get("/quotations")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1
        assert data["total_pages"] == 0

    @pytest.mark.asyncio
    async def test_list_quotations_pagination(self, client: httpx.AsyncClient):
        # Create 5 quotations
        for i in range(1, 6):
            await client.post(
                "/quotations",
                json={
                    "title": f"Quote Number {i}",
                    "customer_name": f"Customer {i}",
                },
            )

        # Page 1, page_size=2 -> items 1 & 2
        res_p1 = await client.get("/quotations?page=1&page_size=2")
        assert res_p1.status_code == 200
        p1 = res_p1.json()
        assert p1["total"] == 5
        assert p1["page"] == 1
        assert p1["page_size"] == 2
        assert p1["total_pages"] == 3
        assert len(p1["items"]) == 2

        # Page 2, page_size=2 -> items 3 & 4
        res_p2 = await client.get("/quotations?page=2&page_size=2")
        assert res_p2.status_code == 200
        p2 = res_p2.json()
        assert p2["page"] == 2
        assert len(p2["items"]) == 2

        # Page 3, page_size=2 -> item 5 (1 item)
        res_p3 = await client.get("/quotations?page=3&page_size=2")
        assert res_p3.status_code == 200
        p3 = res_p3.json()
        assert p3["page"] == 3
        assert len(p3["items"]) == 1

        # Page 4, page_size=2 -> past end, 0 items
        res_p4 = await client.get("/quotations?page=4&page_size=2")
        assert res_p4.status_code == 200
        p4 = res_p4.json()
        assert p4["page"] == 4
        assert len(p4["items"]) == 0

    @pytest.mark.asyncio
    async def test_list_invalid_pagination_parameters(self, client: httpx.AsyncClient):
        # page < 1
        r1 = await client.get("/quotations?page=0")
        assert r1.status_code == 422

        # page_size < 1
        r2 = await client.get("/quotations?page_size=0")
        assert r2.status_code == 422

        # page_size > 100
        r3 = await client.get("/quotations?page_size=101")
        assert r3.status_code == 422


# ── Prefix & Routing Compatibility Tests ─────────────────────────────────────

class TestPrefixCompatibilityAPI:
    """Verify both /quotations and /api/quotations route correctly."""

    @pytest.mark.asyncio
    async def test_api_prefix_routes_work(self, client: httpx.AsyncClient):
        # Create via /api/quotations
        create_res = await client.post(
            "/api/quotations",
            json={"title": "API Prefix Test", "customer_name": "Prefix Customer"},
        )
        assert create_res.status_code == 201
        qid = create_res.json()["id"]

        # Get via /api/quotations/{id}
        get_res = await client.get(f"/api/quotations/{qid}")
        assert get_res.status_code == 200

        # List via /api/quotations
        list_res = await client.get("/api/quotations")
        assert list_res.status_code == 200
        assert list_res.json()["total"] >= 1

