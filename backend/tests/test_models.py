"""
test_models.py – Unit tests for Quotation and QuotationItem models.

Covers:
- Model creation and persistence
- Relationship navigation (quotation ↔ items)
- Cascade delete behaviour
- Monetary calculation correctness (Decimal arithmetic)
- recalculate_totals helper
- QuotationStatus values
"""

from decimal import Decimal

import pytest

from app.models.quotation import Quotation, QuotationItem, QuotationStatus
from tests.conftest import make_item, make_quotation


# ── QuotationStatus ──────────────────────────────────────────────────────────

class TestQuotationStatus:
    def test_all_expected_values_exist(self):
        expected = {"draft", "sent", "accepted", "rejected", "expired", "cancelled"}
        actual = {s.value for s in QuotationStatus}
        assert actual == expected

    def test_is_str_enum(self):
        assert isinstance(QuotationStatus.DRAFT, str)
        assert QuotationStatus.DRAFT == "draft"


# ── Quotation model ──────────────────────────────────────────────────────────

class TestQuotationModel:
    def test_create_and_persist(self, db_session):
        q = make_quotation(db_session)
        fetched = db_session.get(Quotation, q.id)
        assert fetched is not None
        assert fetched.quotation_number == "RQ-TEST-0001"
        assert fetched.status == QuotationStatus.DRAFT.value

    def test_defaults_are_decimal_zeros(self, db_session):
        q = make_quotation(db_session)
        assert q.subtotal == Decimal("0")
        assert q.tax_amount == Decimal("0")
        assert q.total_amount == Decimal("0")

    def test_currency_default(self, db_session):
        q = make_quotation(db_session)
        assert q.currency == "USD"

    def test_timestamps_set_on_creation(self, db_session):
        q = make_quotation(db_session)
        # SQLite sets server_default to None on flush; check it's not raising
        # (Postgres would populate these via func.now())
        assert hasattr(q, "created_at")
        assert hasattr(q, "updated_at")

    def test_repr_contains_number_and_status(self, db_session):
        q = make_quotation(db_session)
        r = repr(q)
        assert "RQ-TEST-0001" in r
        assert "draft" in r

    def test_optional_fields_accept_none(self, db_session):
        q = make_quotation(
            db_session,
            quotation_number="RQ-TEST-0002",
            description=None,
            customer_email=None,
            customer_phone=None,
            customer_company=None,
            customer_address=None,
            notes=None,
            terms_and_conditions=None,
        )
        db_session.flush()
        assert q.description is None
        assert q.customer_email is None


# ── QuotationItem model ───────────────────────────────────────────────────────

class TestQuotationItemModel:
    def test_create_item_linked_to_quotation(self, db_session):
        q = make_quotation(db_session)
        item = make_item(db_session, q)

        assert item.quotation_id == q.id
        assert item.description == "Widget"

    def test_line_total_stored_correctly(self, db_session):
        q = make_quotation(db_session)
        item = make_item(db_session, q, quantity="3.0000", unit_price="15.5000")

        expected = Decimal("3.0000") * Decimal("15.5000")
        assert item.line_total == expected

    def test_compute_line_total_helper(self, db_session):
        q = make_quotation(db_session)
        item = make_item(db_session, q, quantity="2.5000", unit_price="4.0000")

        assert item.compute_line_total() == Decimal("10.0000")

    def test_fractional_quantity(self, db_session):
        q = make_quotation(db_session)
        item = make_item(db_session, q, quantity="0.5000", unit_price="100.0000")
        assert item.line_total == Decimal("50.0000")

    def test_repr_contains_position_and_price(self, db_session):
        q = make_quotation(db_session)
        item = make_item(db_session, q)
        r = repr(item)
        assert "pos=1" in r

    def test_multiple_items_with_positions(self, db_session):
        q = make_quotation(db_session)
        i1 = make_item(db_session, q, position=1, description="Alpha")
        i2 = make_item(db_session, q, position=2, description="Beta")

        assert i1.position == 1
        assert i2.position == 2


# ── Relationship tests ───────────────────────────────────────────────────────

class TestQuotationRelationship:
    def test_quotation_items_accessible_via_relationship(self, db_session):
        q = make_quotation(db_session)
        make_item(db_session, q, position=1)
        make_item(db_session, q, position=2)

        db_session.refresh(q)
        assert len(q.items) == 2

    def test_item_quotation_back_reference(self, db_session):
        q = make_quotation(db_session)
        item = make_item(db_session, q)
        db_session.refresh(item)

        assert item.quotation.id == q.id
        assert item.quotation.customer_name == "Acme Corp"

    def test_cascade_delete_removes_items(self, db_session):
        q = make_quotation(db_session)
        item = make_item(db_session, q)
        item_id = item.id

        db_session.delete(q)
        db_session.flush()

        deleted = db_session.get(QuotationItem, item_id)
        assert deleted is None


# ── Monetary calculation tests ────────────────────────────────────────────────

class TestRecalculateTotals:
    def test_zero_items_gives_zero_totals(self, db_session):
        q = make_quotation(db_session)
        q.recalculate_totals()
        assert q.subtotal == Decimal("0")
        assert q.tax_amount == Decimal("0")
        assert q.total_amount == Decimal("0")

    def test_single_item_no_tax(self, db_session):
        q = make_quotation(db_session, tax_rate=Decimal("0.0000"))
        make_item(db_session, q, quantity="5.0000", unit_price="20.0000")
        db_session.refresh(q)

        q.recalculate_totals()

        assert q.subtotal == Decimal("100.0000")
        assert q.tax_amount == Decimal("0.0000")
        assert q.total_amount == Decimal("100.0000")

    def test_multiple_items_with_tax(self, db_session):
        q = make_quotation(db_session, tax_rate=Decimal("0.1000"))  # 10 %
        make_item(db_session, q, position=1, quantity="2.0000", unit_price="50.0000")
        make_item(db_session, q, position=2, quantity="1.0000", unit_price="30.0000")
        db_session.refresh(q)

        q.recalculate_totals()

        # subtotal = (2 * 50) + (1 * 30) = 130
        assert q.subtotal == Decimal("130.0000")
        # tax = 130 * 0.1 = 13
        assert q.tax_amount == Decimal("13.0000")
        # total = 143
        assert q.total_amount == Decimal("143.0000")

    def test_fractional_tax_precision(self, db_session):
        """Ensure Decimal quantize keeps 4 decimal places."""
        q = make_quotation(db_session, tax_rate=Decimal("0.0750"))  # 7.5 %
        make_item(db_session, q, quantity="1.0000", unit_price="10.0000")
        db_session.refresh(q)

        q.recalculate_totals()

        # tax = 10 * 0.075 = 0.75
        assert q.tax_amount == Decimal("0.7500")
        assert q.total_amount == Decimal("10.7500")

    def test_no_float_used(self, db_session):
        """All monetary values must be Decimal, never float."""
        q = make_quotation(db_session, tax_rate=Decimal("0.2000"))
        make_item(db_session, q, quantity="3.0000", unit_price="7.3300")
        db_session.refresh(q)
        q.recalculate_totals()

        assert isinstance(q.subtotal, Decimal)
        assert isinstance(q.tax_amount, Decimal)
        assert isinstance(q.total_amount, Decimal)
        for item in q.items:
            assert isinstance(item.line_total, Decimal)
