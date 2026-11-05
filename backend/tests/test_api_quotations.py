"""
test_api_quotations.py – API tests for Quotation endpoints with authentication & ownership.

Tests:
- Unauthenticated access returns 401 Unauthorized across all endpoints.
- Ownership isolation:
    - User B cannot retrieve, update, delete, or transition status of User A's quotation (returns 404).
    - Listing returns only the authenticated user's records.
    - Owner ID is automatically assigned from the JWT and cannot be client-injected.
- Authenticated Quotation Lifecycle:
    - POST /quotations: creation, calculations, custom/auto numbers, validation.
    - GET /quotations/{id}: retrieval with line items, 404 on nonexistent.
    - GET /quotations: pagination, count, page size.
    - PUT /quotations/{id}: updates, recalculations, terminal status protection.
    - DELETE /quotations/{id}: deletion and item cascade.
    - PATCH /quotations/{id}/status: lifecycle transitions, terminal states.
    - Router prefix compatibility (/quotations and /api/quotations).
"""

from decimal import Decimal
import uuid
import pytest
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quotation import Quotation, QuotationItem


# ── Unauthenticated Access Tests (Task 2) ─────────────────────────────────────

class TestUnauthenticatedQuotationAPI:
    """Every quotation endpoint must reject unauthenticated requests with 401."""

    @pytest.mark.asyncio
    async def test_create_quotation_unauthenticated_returns_401(
        self, client: httpx.AsyncClient
    ):
        res = await client.post("/quotations", json={"title": "Test", "customer_name": "Acme"})
        assert res.status_code == 401
        assert "could not validate credentials" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_list_quotations_unauthenticated_returns_401(
        self, client: httpx.AsyncClient
    ):
        res = await client.get("/quotations")
        assert res.status_code == 401
        assert "could not validate credentials" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_quotation_unauthenticated_returns_401(
        self, client: httpx.AsyncClient
    ):
        random_id = str(uuid.uuid4())
        res = await client.get(f"/quotations/{random_id}")
        assert res.status_code == 401
        assert "could not validate credentials" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_update_quotation_unauthenticated_returns_401(
        self, client: httpx.AsyncClient
    ):
        random_id = str(uuid.uuid4())
        res = await client.put(f"/quotations/{random_id}", json={"title": "New"})
        assert res.status_code == 401
        assert "could not validate credentials" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_delete_quotation_unauthenticated_returns_401(
        self, client: httpx.AsyncClient
    ):
        random_id = str(uuid.uuid4())
        res = await client.delete(f"/quotations/{random_id}")
        assert res.status_code == 401
        assert "could not validate credentials" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_status_transition_unauthenticated_returns_401(
        self, client: httpx.AsyncClient
    ):
        random_id = str(uuid.uuid4())
        res = await client.patch(f"/quotations/{random_id}/status", json={"status": "sent"})
        assert res.status_code == 401
        assert "could not validate credentials" in res.json()["detail"].lower()


# ── User Ownership & Isolation Tests (Tasks 4, 5, 6, 7) ───────────────────────

class TestQuotationOwnershipAPI:
    """Ownership checks and multi-tenant isolation tests."""

    @pytest.mark.asyncio
    async def test_quotation_owner_assigned_from_token_not_payload(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str], auth_user
    ):
        # Even if a malicious client attempts to inject user_id, it is ignored
        spoofed_user_id = str(uuid.uuid4())
        payload = {
            "title": "Owner Test Quote",
            "customer_name": "Target Corp",
            "user_id": spoofed_user_id,
        }
        res = await client.post("/quotations", json=payload, headers=auth_headers)
        assert res.status_code == 201
        data = res.json()
        assert data["user_id"] == str(auth_user.id)
        assert data["user_id"] != spoofed_user_id

    @pytest.mark.asyncio
    async def test_cannot_get_other_user_quotation_returns_404(
        self,
        client: httpx.AsyncClient,
        auth_headers: dict[str, str],
        second_auth_headers: dict[str, str],
    ):
        # User A creates a quotation
        create_res = await client.post(
            "/quotations",
            json={"title": "User A Private Quote", "customer_name": "Client A"},
            headers=auth_headers,
        )
        assert create_res.status_code == 201
        quote_id = create_res.json()["id"]

        # User B attempts to access User A's quotation -> must return 404 (not 403, to prevent probing)
        fetch_res = await client.get(f"/quotations/{quote_id}", headers=second_auth_headers)
        assert fetch_res.status_code == 404
        assert "not found" in fetch_res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_cannot_update_other_user_quotation_returns_404(
        self,
        client: httpx.AsyncClient,
        auth_headers: dict[str, str],
        second_auth_headers: dict[str, str],
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "User A Quote", "customer_name": "Client A"},
            headers=auth_headers,
        )
        quote_id = create_res.json()["id"]

        update_res = await client.put(
            f"/quotations/{quote_id}",
            json={"title": "Hacked Title"},
            headers=second_auth_headers,
        )
        assert update_res.status_code == 404
        assert "not found" in update_res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_cannot_delete_other_user_quotation_returns_404(
        self,
        client: httpx.AsyncClient,
        auth_headers: dict[str, str],
        second_auth_headers: dict[str, str],
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "User A Quote to Keep", "customer_name": "Client A"},
            headers=auth_headers,
        )
        quote_id = create_res.json()["id"]

        del_res = await client.delete(f"/quotations/{quote_id}", headers=second_auth_headers)
        assert del_res.status_code == 404
        assert "not found" in del_res.json()["detail"].lower()

        # Verify User A can still retrieve it
        verify_res = await client.get(f"/quotations/{quote_id}", headers=auth_headers)
        assert verify_res.status_code == 200

    @pytest.mark.asyncio
    async def test_cannot_change_status_of_other_user_quotation_returns_404(
        self,
        client: httpx.AsyncClient,
        auth_headers: dict[str, str],
        second_auth_headers: dict[str, str],
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "User A Quote", "customer_name": "Client A"},
            headers=auth_headers,
        )
        quote_id = create_res.json()["id"]

        patch_res = await client.patch(
            f"/quotations/{quote_id}/status",
            json={"status": "sent"},
            headers=second_auth_headers,
        )
        assert patch_res.status_code == 404
        assert "not found" in patch_res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_list_quotations_isolated_between_users(
        self,
        client: httpx.AsyncClient,
        auth_headers: dict[str, str],
        second_auth_headers: dict[str, str],
    ):
        # User A creates 3 quotes
        for i in range(3):
            await client.post(
                "/quotations",
                json={"title": f"User A Quote {i}", "customer_name": "Client A"},
                headers=auth_headers,
            )

        # User B creates 1 quote
        await client.post(
            "/quotations",
            json={"title": "User B Solo Quote", "customer_name": "Client B"},
            headers=second_auth_headers,
        )

        # User A list
        res_a = await client.get("/quotations", headers=auth_headers)
        assert res_a.status_code == 200
        data_a = res_a.json()
        assert data_a["total"] == 3
        assert len(data_a["items"]) == 3
        assert all("User A" in q["title"] for q in data_a["items"])

        # User B list
        res_b = await client.get("/quotations", headers=second_auth_headers)
        assert res_b.status_code == 200
        data_b = res_b.json()
        assert data_b["total"] == 1
        assert len(data_b["items"]) == 1
        assert data_b["items"][0]["title"] == "User B Solo Quote"


# ── Creation Tests ────────────────────────────────────────────────────────────

class TestCreateQuotationAPI:
    """Test suite for POST /quotations endpoint (authenticated)."""

    @pytest.mark.asyncio
    async def test_create_quotation_with_items_success(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str], auth_user
    ):
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

        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 201

        data = response.json()
        assert "id" in data
        assert data["user_id"] == str(auth_user.id)
        assert data["title"] == "Cloud Migration Services"
        assert data["customer_name"] == "Globex Corp"
        assert data["customer_email"] == "billing@globex.example"
        assert data["status"] == "draft"
        assert data["currency"] == "USD"
        assert data["quotation_number"].startswith("RQ-")

        items = data["items"]
        assert len(items) == 2
        assert items[0]["description"] == "Cloud Architecture Assessment"
        assert Decimal(items[0]["line_total"]) == Decimal("1500.0000")
        assert items[1]["description"] == "Database Migration Scripting"
        assert Decimal(items[1]["line_total"]) == Decimal("1100.0000")

        assert Decimal(data["subtotal"]) == Decimal("2600.0000")
        assert Decimal(data["tax_amount"]) == Decimal("260.0000")
        assert Decimal(data["total_amount"]) == Decimal("2860.0000")

    @pytest.mark.asyncio
    async def test_client_calculated_totals_are_strictly_ignored(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "title": "Security Audit",
            "customer_name": "Initech",
            "currency": "EUR",
            "tax_rate": "0.2000",
            "subtotal": "1.0000",
            "tax_amount": "0.0000",
            "total_amount": "1.0000",
            "items": [
                {
                    "description": "Penetration Testing",
                    "quantity": "3.0000",
                    "unit_price": "50.0000",
                    "line_total": "0.0100",
                }
            ],
        }

        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 201

        data = response.json()
        assert Decimal(data["items"][0]["line_total"]) == Decimal("150.0000")
        assert Decimal(data["subtotal"]) == Decimal("150.0000")
        assert Decimal(data["tax_amount"]) == Decimal("30.0000")
        assert Decimal(data["total_amount"]) == Decimal("180.0000")

    @pytest.mark.asyncio
    async def test_create_quotation_with_custom_number(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "title": "Custom Number Quote",
            "quotation_number": "RQ-2026-CUSTOM-001",
            "customer_name": "Hooli",
            "items": [],
        }

        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["quotation_number"] == "RQ-2026-CUSTOM-001"

    @pytest.mark.asyncio
    async def test_create_duplicate_quotation_number_returns_409(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "title": "First Quote",
            "quotation_number": "RQ-DUP-001",
            "customer_name": "Acme",
        }
        r1 = await client.post("/quotations", json=payload, headers=auth_headers)
        assert r1.status_code == 201

        payload["title"] = "Second Quote"
        r2 = await client.post("/quotations", json=payload, headers=auth_headers)
        assert r2.status_code == 409
        assert "already exists" in r2.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_create_quotation_without_items(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "title": "Draft Quote No Items",
            "customer_name": "Stark Industries",
            "currency": "USD",
        }
        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 201

        data = response.json()
        assert data["items"] == []
        assert Decimal(data["subtotal"]) == Decimal("0.0000")
        assert Decimal(data["tax_amount"]) == Decimal("0.0000")
        assert Decimal(data["total_amount"]) == Decimal("0.0000")

    @pytest.mark.asyncio
    async def test_automatic_item_positions_when_omitted(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "title": "Auto Position Quote",
            "customer_name": "Wayne Enterprises",
            "items": [
                {"description": "Gadget A", "quantity": "1.0000", "unit_price": "10.0000"},
                {"description": "Gadget B", "quantity": "2.0000", "unit_price": "20.0000"},
                {"description": "Gadget C", "quantity": "3.0000", "unit_price": "30.0000"},
            ],
        }
        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 201

        items = response.json()["items"]
        assert [it["position"] for it in items] == [1, 2, 3]

    @pytest.mark.asyncio
    async def test_currency_normalized_to_uppercase(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "title": "Currency Check",
            "customer_name": "Euro Corp",
            "currency": "eur",
        }
        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["currency"] == "EUR"


# ── Validation Error Tests ───────────────────────────────────────────────────

class TestQuotationValidationAPI:
    """Test suite for request payload validation and 422 HTTP responses."""

    @pytest.mark.asyncio
    async def test_missing_required_title(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {"customer_name": "Acme"}
        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_blank_title(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {"title": "   ", "customer_name": "Acme"}
        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_required_customer_name(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {"title": "Website Quote"}
        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_blank_customer_name(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {"title": "Website Quote", "customer_name": "   "}
        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_email_format(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "title": "Email Test",
            "customer_name": "Acme",
            "customer_email": "not-a-valid-email",
        }
        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_negative_item_quantity(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "title": "Negative Qty",
            "customer_name": "Acme",
            "items": [
                {"description": "Item", "quantity": "-1.0000", "unit_price": "10.0000"}
            ],
        }
        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_zero_item_quantity(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "title": "Zero Qty",
            "customer_name": "Acme",
            "items": [
                {"description": "Item", "quantity": "0.0000", "unit_price": "10.0000"}
            ],
        }
        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_negative_unit_price(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "title": "Negative Price",
            "customer_name": "Acme",
            "items": [
                {"description": "Item", "quantity": "1.0000", "unit_price": "-5.0000"}
            ],
        }
        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_tax_rate(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "title": "Invalid Tax",
            "customer_name": "Acme",
            "tax_rate": "1.5000",
        }
        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_currency_code(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "title": "Invalid Currency",
            "customer_name": "Acme",
            "currency": "USDD",
        }
        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_blank_item_description(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        payload = {
            "title": "Blank Item Desc",
            "customer_name": "Acme",
            "items": [
                {"description": "   ", "quantity": "1.0000", "unit_price": "10.0000"}
            ],
        }
        response = await client.post("/quotations", json=payload, headers=auth_headers)
        assert response.status_code == 422


# ── Retrieval Tests ──────────────────────────────────────────────────────────

class TestGetQuotationAPI:
    """Test suite for GET /quotations/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_quotation_by_id_success(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
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
            headers=auth_headers,
        )
        assert create_res.status_code == 201
        created_id = create_res.json()["id"]

        fetch_res = await client.get(f"/quotations/{created_id}", headers=auth_headers)
        assert fetch_res.status_code == 200

        data = fetch_res.json()
        assert data["id"] == created_id
        assert data["title"] == "Hardware Procurement"
        assert len(data["items"]) == 1
        assert data["items"][0]["description"] == "Server Rack 42U"

    @pytest.mark.asyncio
    async def test_get_quotation_nonexistent_uuid_returns_404(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        random_uuid = str(uuid.uuid4())
        response = await client.get(f"/quotations/{random_uuid}", headers=auth_headers)
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_quotation_malformed_id_returns_422(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        response = await client.get("/quotations/not-a-valid-uuid", headers=auth_headers)
        assert response.status_code == 422


# ── List & Pagination Tests ──────────────────────────────────────────────────

class TestListQuotationsAPI:
    """Test suite for GET /quotations endpoint with pagination."""

    @pytest.mark.asyncio
    async def test_list_quotations_empty(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        response = await client.get("/quotations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1
        assert data["total_pages"] == 0

    @pytest.mark.asyncio
    async def test_list_quotations_pagination(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        for i in range(1, 6):
            await client.post(
                "/quotations",
                json={
                    "title": f"Quote Number {i}",
                    "customer_name": f"Customer {i}",
                },
                headers=auth_headers,
            )

        res_p1 = await client.get("/quotations?page=1&page_size=2", headers=auth_headers)
        assert res_p1.status_code == 200
        p1 = res_p1.json()
        assert p1["total"] == 5
        assert p1["page"] == 1
        assert p1["page_size"] == 2
        assert p1["total_pages"] == 3
        assert len(p1["items"]) == 2

        res_p2 = await client.get("/quotations?page=2&page_size=2", headers=auth_headers)
        assert res_p2.status_code == 200
        p2 = res_p2.json()
        assert p2["page"] == 2
        assert len(p2["items"]) == 2

        res_p3 = await client.get("/quotations?page=3&page_size=2", headers=auth_headers)
        assert res_p3.status_code == 200
        p3 = res_p3.json()
        assert p3["page"] == 3
        assert len(p3["items"]) == 1

        res_p4 = await client.get("/quotations?page=4&page_size=2", headers=auth_headers)
        assert res_p4.status_code == 200
        p4 = res_p4.json()
        assert p4["page"] == 4
        assert len(p4["items"]) == 0

    @pytest.mark.asyncio
    async def test_list_invalid_pagination_parameters(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        r1 = await client.get("/quotations?page=0", headers=auth_headers)
        assert r1.status_code == 422

        r2 = await client.get("/quotations?page_size=0", headers=auth_headers)
        assert r2.status_code == 422

        r3 = await client.get("/quotations?page_size=101", headers=auth_headers)
        assert r3.status_code == 422


# ── Update Tests ──────────────────────────────────────────────────────────────

class TestUpdateQuotationAPI:
    """Test suite for PUT /quotations/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_customer_and_scalar_fields_success(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={
                "title": "Initial Quote",
                "customer_name": "Old Client",
                "customer_email": "old@example.com",
            },
            headers=auth_headers,
        )
        assert create_res.status_code == 201
        qid = create_res.json()["id"]

        update_payload = {
            "title": "Updated Quote Title",
            "customer_name": "New Client Inc",
            "customer_email": "new@example.com",
            "customer_phone": "+1-800-555-1234",
            "notes": "Updated notes on billing",
        }
        update_res = await client.put(f"/quotations/{qid}", json=update_payload, headers=auth_headers)
        assert update_res.status_code == 200

        data = update_res.json()
        assert data["id"] == qid
        assert data["title"] == "Updated Quote Title"
        assert data["customer_name"] == "New Client Inc"
        assert data["customer_email"] == "new@example.com"
        assert data["customer_phone"] == "+1-800-555-1234"
        assert data["notes"] == "Updated notes on billing"

    @pytest.mark.asyncio
    async def test_update_line_items_recalculates_totals_with_decimal_arithmetic(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={
                "title": "Development",
                "customer_name": "Acme",
                "tax_rate": "0.1000",
                "items": [
                    {
                        "description": "Initial Task",
                        "quantity": "2.0000",
                        "unit_price": "50.0000",
                    }
                ],
            },
            headers=auth_headers,
        )
        assert create_res.status_code == 201
        qid = create_res.json()["id"]
        assert Decimal(create_res.json()["total_amount"]) == Decimal("110.0000")

        update_payload = {
            "subtotal": "9999.0000",
            "tax_amount": "9999.0000",
            "total_amount": "9999.0000",
            "items": [
                {
                    "description": "Consulting",
                    "quantity": "3.5000",
                    "unit_price": "100.0000",
                    "line_total": "0.0000",
                },
                {
                    "description": "Implementation",
                    "quantity": "1.0000",
                    "unit_price": "150.0000",
                    "line_total": "0.0000",
                },
            ],
        }
        update_res = await client.put(f"/quotations/{qid}", json=update_payload, headers=auth_headers)
        assert update_res.status_code == 200

        data = update_res.json()
        assert len(data["items"]) == 2
        assert data["items"][0]["description"] == "Consulting"
        assert Decimal(data["items"][0]["line_total"]) == Decimal("350.0000")
        assert data["items"][1]["description"] == "Implementation"
        assert Decimal(data["items"][1]["line_total"]) == Decimal("150.0000")

        assert Decimal(data["subtotal"]) == Decimal("500.0000")
        assert Decimal(data["tax_amount"]) == Decimal("50.0000")
        assert Decimal(data["total_amount"]) == Decimal("550.0000")

    @pytest.mark.asyncio
    async def test_update_tax_rate_recalculates_totals(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={
                "title": "Tax Change Quote",
                "customer_name": "Tax Payer",
                "tax_rate": "0.0500",
                "items": [
                    {
                        "description": "Fixed Service",
                        "quantity": "1.0000",
                        "unit_price": "200.0000",
                    }
                ],
            },
            headers=auth_headers,
        )
        assert create_res.status_code == 201
        qid = create_res.json()["id"]

        update_res = await client.put(
            f"/quotations/{qid}",
            json={"tax_rate": "0.2000"},
            headers=auth_headers,
        )
        assert update_res.status_code == 200

        data = update_res.json()
        assert Decimal(data["subtotal"]) == Decimal("200.0000")
        assert Decimal(data["tax_amount"]) == Decimal("40.0000")
        assert Decimal(data["total_amount"]) == Decimal("240.0000")

    @pytest.mark.asyncio
    async def test_update_replace_with_empty_items(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={
                "title": "Items to clear",
                "customer_name": "Customer",
                "items": [
                    {"description": "Item", "quantity": "1.0000", "unit_price": "50.0000"}
                ],
            },
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        update_res = await client.put(f"/quotations/{qid}", json={"items": []}, headers=auth_headers)
        assert update_res.status_code == 200

        data = update_res.json()
        assert data["items"] == []
        assert Decimal(data["subtotal"]) == Decimal("0.0000")
        assert Decimal(data["tax_amount"]) == Decimal("0.0000")
        assert Decimal(data["total_amount"]) == Decimal("0.0000")

    @pytest.mark.asyncio
    async def test_update_nonexistent_quotation_returns_404(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        random_id = str(uuid.uuid4())
        response = await client.put(
            f"/quotations/{random_id}",
            json={"title": "Doesn't exist"},
            headers=auth_headers,
        )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_update_malformed_id_returns_422(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        response = await client.put(
            "/quotations/invalid-uuid",
            json={"title": "Malformed"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_accepted_quotation_rejected_with_400(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "Contract Deal", "customer_name": "VIP"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        await client.patch(f"/quotations/{qid}/status", json={"status": "sent"}, headers=auth_headers)
        await client.patch(f"/quotations/{qid}/status", json={"status": "accepted"}, headers=auth_headers)

        update_res = await client.put(
            f"/quotations/{qid}",
            json={"title": "Sneaky Modification"},
            headers=auth_headers,
        )
        assert update_res.status_code == 400
        assert "cannot update quotation" in update_res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_update_cancelled_quotation_rejected_with_400(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "Dead Deal", "customer_name": "Ex-Client"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        await client.patch(f"/quotations/{qid}/status", json={"status": "cancelled"}, headers=auth_headers)

        update_res = await client.put(
            f"/quotations/{qid}",
            json={"title": "Revival Attempt"},
            headers=auth_headers,
        )
        assert update_res.status_code == 400
        assert "cannot update quotation" in update_res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_update_invalid_input_returns_422(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "Valid Quote", "customer_name": "Valid Client"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        r1 = await client.put(f"/quotations/{qid}", json={"title": "   "}, headers=auth_headers)
        assert r1.status_code == 422

        r2 = await client.put(f"/quotations/{qid}", json={"tax_rate": "2.0000"}, headers=auth_headers)
        assert r2.status_code == 422

        r3 = await client.put(
            f"/quotations/{qid}",
            json={
                "items": [
                    {"description": "Item", "quantity": "-1.0000", "unit_price": "10.0000"}
                ]
            },
            headers=auth_headers,
        )
        assert r3.status_code == 422


# ── Deletion Tests ────────────────────────────────────────────────────────────

class TestDeleteQuotationAPI:
    """Test suite for DELETE /quotations/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_quotation_success_and_cascades_items(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str], async_db: AsyncSession
    ):
        create_res = await client.post(
            "/quotations",
            json={
                "title": "To Be Deleted",
                "customer_name": "Disposable Inc",
                "items": [
                    {"description": "Item 1", "quantity": "1.0000", "unit_price": "10.0000"},
                    {"description": "Item 2", "quantity": "2.0000", "unit_price": "20.0000"},
                ],
            },
            headers=auth_headers,
        )
        assert create_res.status_code == 201
        data = create_res.json()
        qid = data["id"]
        item_ids = [uuid.UUID(it["id"]) for it in data["items"]]

        del_res = await client.delete(f"/quotations/{qid}", headers=auth_headers)
        assert del_res.status_code == 204

        get_res = await client.get(f"/quotations/{qid}", headers=auth_headers)
        assert get_res.status_code == 404

        item_records = await async_db.execute(
            select(QuotationItem).where(QuotationItem.id.in_(item_ids))
        )
        assert len(list(item_records.scalars().all())) == 0

    @pytest.mark.asyncio
    async def test_delete_nonexistent_quotation_returns_404(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        random_id = str(uuid.uuid4())
        response = await client.delete(f"/quotations/{random_id}", headers=auth_headers)
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_delete_malformed_id_returns_422(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        response = await client.delete("/quotations/not-a-valid-uuid", headers=auth_headers)
        assert response.status_code == 422


# ── Status Transition Tests ──────────────────────────────────────────────────

class TestQuotationStatusAPI:
    """Test suite for PATCH /quotations/{id}/status endpoint and lifecycle transitions."""

    @pytest.mark.asyncio
    async def test_valid_transition_draft_to_sent(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "Draft Quote", "customer_name": "Prospect"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]
        assert create_res.json()["status"] == "draft"

        patch_res = await client.patch(
            f"/quotations/{qid}/status",
            json={"status": "sent"},
            headers=auth_headers,
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["status"] == "sent"

    @pytest.mark.asyncio
    async def test_valid_lifecycle_happy_path_to_accepted(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "Happy Path Quote", "customer_name": "Client"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        s1 = await client.patch(f"/quotations/{qid}/status", json={"status": "sent"}, headers=auth_headers)
        assert s1.status_code == 200
        assert s1.json()["status"] == "sent"

        s2 = await client.patch(f"/quotations/{qid}/status", json={"status": "accepted"}, headers=auth_headers)
        assert s2.status_code == 200
        assert s2.json()["status"] == "accepted"

    @pytest.mark.asyncio
    async def test_valid_transition_sent_reverted_to_draft(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "Draft to Revise", "customer_name": "Client"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        await client.patch(f"/quotations/{qid}/status", json={"status": "sent"}, headers=auth_headers)
        revert_res = await client.patch(f"/quotations/{qid}/status", json={"status": "draft"}, headers=auth_headers)
        assert revert_res.status_code == 200
        assert revert_res.json()["status"] == "draft"

    @pytest.mark.asyncio
    async def test_valid_transition_sent_to_rejected_and_revived(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "Negotiation", "customer_name": "Client"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        await client.patch(f"/quotations/{qid}/status", json={"status": "sent"}, headers=auth_headers)
        reject_res = await client.patch(f"/quotations/{qid}/status", json={"status": "rejected"}, headers=auth_headers)
        assert reject_res.status_code == 200
        assert reject_res.json()["status"] == "rejected"

        revive_res = await client.patch(f"/quotations/{qid}/status", json={"status": "draft"}, headers=auth_headers)
        assert revive_res.status_code == 200
        assert revive_res.json()["status"] == "draft"

    @pytest.mark.asyncio
    async def test_valid_transition_sent_to_expired_and_revived(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "Time-sensitive Quote", "customer_name": "Client"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        await client.patch(f"/quotations/{qid}/status", json={"status": "sent"}, headers=auth_headers)
        expire_res = await client.patch(f"/quotations/{qid}/status", json={"status": "expired"}, headers=auth_headers)
        assert expire_res.status_code == 200
        assert expire_res.json()["status"] == "expired"

        reopen_res = await client.patch(f"/quotations/{qid}/status", json={"status": "draft"}, headers=auth_headers)
        assert reopen_res.status_code == 200
        assert reopen_res.json()["status"] == "draft"

    @pytest.mark.asyncio
    async def test_valid_transition_draft_to_cancelled(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "Abortive Quote", "customer_name": "Client"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        cancel_res = await client.patch(f"/quotations/{qid}/status", json={"status": "cancelled"}, headers=auth_headers)
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"

    @pytest.mark.asyncio
    async def test_rejected_transition_draft_directly_to_accepted(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "Draft Quote", "customer_name": "Client"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        res = await client.patch(f"/quotations/{qid}/status", json={"status": "accepted"}, headers=auth_headers)
        assert res.status_code == 400
        assert "invalid status transition" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_rejected_transition_draft_to_expired(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "Draft Quote", "customer_name": "Client"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        res = await client.patch(f"/quotations/{qid}/status", json={"status": "expired"}, headers=auth_headers)
        assert res.status_code == 400
        assert "invalid status transition" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_rejected_transition_accepted_is_terminal(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "Closed Won Deal", "customer_name": "Customer"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        await client.patch(f"/quotations/{qid}/status", json={"status": "sent"}, headers=auth_headers)
        await client.patch(f"/quotations/{qid}/status", json={"status": "accepted"}, headers=auth_headers)

        for target in ["draft", "sent", "rejected", "expired", "cancelled"]:
            res = await client.patch(f"/quotations/{qid}/status", json={"status": target}, headers=auth_headers)
            assert res.status_code == 400
            assert "invalid status transition" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_rejected_transition_cancelled_is_terminal(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "Dead Deal", "customer_name": "Customer"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        await client.patch(f"/quotations/{qid}/status", json={"status": "cancelled"}, headers=auth_headers)

        for target in ["draft", "sent", "accepted", "rejected", "expired"]:
            res = await client.patch(f"/quotations/{qid}/status", json={"status": target}, headers=auth_headers)
            assert res.status_code == 400
            assert "invalid status transition" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_transition_to_same_status_returns_400(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "No-op Status Quote", "customer_name": "Customer"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        res = await client.patch(f"/quotations/{qid}/status", json={"status": "draft"}, headers=auth_headers)
        assert res.status_code == 400
        assert "already in 'draft' status" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_status_transition_nonexistent_quotation_returns_404(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        random_id = str(uuid.uuid4())
        res = await client.patch(
            f"/quotations/{random_id}/status",
            json={"status": "sent"},
            headers=auth_headers,
        )
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_status_transition_invalid_enum_returns_422(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/quotations",
            json={"title": "Enum Check", "customer_name": "Customer"},
            headers=auth_headers,
        )
        qid = create_res.json()["id"]

        res = await client.patch(
            f"/quotations/{qid}/status",
            json={"status": "completely_bogus_status"},
            headers=auth_headers,
        )
        assert res.status_code == 422


# ── Prefix & Routing Compatibility Tests ─────────────────────────────────────

class TestPrefixCompatibilityAPI:
    """Verify both /quotations and /api/quotations route correctly."""

    @pytest.mark.asyncio
    async def test_api_prefix_routes_work(
        self, client: httpx.AsyncClient, auth_headers: dict[str, str]
    ):
        create_res = await client.post(
            "/api/quotations",
            json={"title": "API Prefix Test", "customer_name": "Prefix Customer"},
            headers=auth_headers,
        )
        assert create_res.status_code == 201
        qid = create_res.json()["id"]

        get_res = await client.get(f"/api/quotations/{qid}", headers=auth_headers)
        assert get_res.status_code == 200

        list_res = await client.get("/api/quotations", headers=auth_headers)
        assert list_res.status_code == 200
        assert list_res.json()["total"] >= 1
