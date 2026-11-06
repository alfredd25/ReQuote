"""
pdf.py – Professional PDF quotation generation service.

Generates print-ready, high-fidelity PDF documents using ReportLab.
Includes business contact information, customer details, itemized deliverables,
accurate Decimal-based financial summaries, lifecycle status, and pagination.
"""

from datetime import datetime, timezone
from decimal import Decimal
import io
import os
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.config import settings
from app.models.quotation import Quotation


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that computes total page count dynamically
    and draws professional running headers and footers on every page.
    """

    business_name: str = settings.business_name
    business_email: str = settings.business_email
    business_phone: str = settings.business_phone

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        kwargs.setdefault("pageCompression", 0)
        super().__init__(*args, **kwargs)
        self._saved_page_states: list[dict[str, Any]] = []

    def showPage(self) -> None:
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self) -> None:
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def _draw_page_decorations(self, total_pages: int) -> None:
        self.saveState()

        # Top subtle primary accent stripe
        self.setFillColor(colors.HexColor("#4f46e5"))
        self.rect(0, 786, 612, 6, fill=True, stroke=False)

        # Footer divider line
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 40, 576, 40)

        # Footer text
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        left_text = f"{self.business_name} • {self.business_email}"
        if self.business_phone:
            left_text += f" • {self.business_phone}"
        self.drawString(36, 26, left_text)

        right_text = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(576, 26, right_text)

        self.restoreState()


def _format_currency(amount: Decimal | str | float, currency: str) -> str:
    """Format monetary amount with symbol or code and two decimal places."""
    try:
        val = Decimal(str(amount))
    except Exception:
        val = Decimal("0.00")

    formatted_num = f"{val:,.2f}"
    symbols = {
        "USD": "$",
        "EUR": "€",
        "GBP": "£",
        "CAD": "CA$",
        "AUD": "AU$",
    }
    symbol = symbols.get(currency.upper())
    if symbol:
        return f"{symbol}{formatted_num}"
    return f"{currency.upper()} {formatted_num}"


def _get_status_color(status_val: str) -> colors.HexColor:
    """Return matching status brand color."""
    mapping = {
        "draft": "#64748b",
        "sent": "#2563eb",
        "accepted": "#16a34a",
        "rejected": "#dc2626",
        "expired": "#d97706",
        "cancelled": "#475569",
    }
    return colors.HexColor(mapping.get(status_val.lower(), "#64748b"))


def generate_quotation_pdf(
    quotation: Quotation,
    business_profile: Any = None,
) -> bytes:
    """
    Generate print-ready PDF bytes for the given quotation model.
    Uses custom business_profile if provided, otherwise falls back gracefully
    to application settings.
    """
    buffer = io.BytesIO()

    # Resolve business information with graceful fallback
    b_name = (
        business_profile.business_name
        if business_profile and getattr(business_profile, "business_name", None)
        else None
    ) or settings.business_name
    b_email = (
        business_profile.email
        if business_profile and getattr(business_profile, "email", None)
        else None
    ) or settings.business_email
    b_phone = (
        business_profile.phone
        if business_profile and getattr(business_profile, "phone", None)
        else None
    ) or settings.business_phone
    b_address = (
        business_profile.address
        if business_profile and getattr(business_profile, "address", None)
        else None
    ) or settings.business_address
    b_website = (
        business_profile.website
        if business_profile and getattr(business_profile, "website", None)
        else None
    ) or settings.business_website
    b_contact = (
        business_profile.contact_person
        if business_profile and getattr(business_profile, "contact_person", None)
        else None
    )
    b_tax_id = (
        business_profile.tax_id
        if business_profile and getattr(business_profile, "tax_id", None)
        else None
    )
    b_logo_url = (
        business_profile.logo_url
        if business_profile and getattr(business_profile, "logo_url", None)
        else None
    )

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=54,
    )
    doc.pageCompression = 0

    base_styles = getSampleStyleSheet()

    # Custom paragraph typography
    styles = {
        "CompanyTitle": ParagraphStyle(
            "CompanyTitle",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#0f172a"),
        ),
        "CompanyMeta": ParagraphStyle(
            "CompanyMeta",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#475569"),
        ),
        "DocHeaderTitle": ParagraphStyle(
            "DocHeaderTitle",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            alignment=2,  # Right-aligned
            textColor=colors.HexColor("#1e1b4b"),
        ),
        "DocHeaderNumber": ParagraphStyle(
            "DocHeaderNumber",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            alignment=2,
            textColor=colors.HexColor("#4f46e5"),
        ),
        "DocHeaderMeta": ParagraphStyle(
            "DocHeaderMeta",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            alignment=2,
            textColor=colors.HexColor("#475569"),
        ),
        "SectionHeading": ParagraphStyle(
            "SectionHeading",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#1e293b"),
        ),
        "CardLabel": ParagraphStyle(
            "CardLabel",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#64748b"),
            textTransform="uppercase",
        ),
        "CardText": ParagraphStyle(
            "CardText",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#1e293b"),
        ),
        "TableHeader": ParagraphStyle(
            "TableHeader",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            textColor=colors.white,
        ),
        "TableBody": ParagraphStyle(
            "TableBody",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11.5,
            textColor=colors.HexColor("#1e293b"),
        ),
        "TableBodyBold": ParagraphStyle(
            "TableBodyBold",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11.5,
            textColor=colors.HexColor("#0f172a"),
        ),
        "TableBodyRight": ParagraphStyle(
            "TableBodyRight",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11.5,
            alignment=2,
            textColor=colors.HexColor("#1e293b"),
        ),
        "TableBodyRightBold": ParagraphStyle(
            "TableBodyRightBold",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11.5,
            alignment=2,
            textColor=colors.HexColor("#0f172a"),
        ),
        "TotalsLabel": ParagraphStyle(
            "TotalsLabel",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            alignment=2,
            textColor=colors.HexColor("#475569"),
        ),
        "TotalsValue": ParagraphStyle(
            "TotalsValue",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            alignment=2,
            textColor=colors.HexColor("#0f172a"),
        ),
        "GrandTotalLabel": ParagraphStyle(
            "GrandTotalLabel",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            alignment=2,
            textColor=colors.HexColor("#0f172a"),
        ),
        "GrandTotalValue": ParagraphStyle(
            "GrandTotalValue",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            alignment=2,
            textColor=colors.HexColor("#4f46e5"),
        ),
        "NotesBoxText": ParagraphStyle(
            "NotesBoxText",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#475569"),
        ),
    }

    story: list[Any] = []

    # ── 1. Header: Business Info (Left) & Document Title/Number (Right) ───────
    company_lines: list[Any] = []

    # Optional business logo
    if b_logo_url:
        try:
            if os.path.isfile(b_logo_url):
                company_lines.append(RLImage(b_logo_url, width=120, height=45))
                company_lines.append(Spacer(1, 3))
        except Exception:
            pass

    company_lines.append(Paragraph(b_name, styles["CompanyTitle"]))
    company_lines.append(Spacer(1, 2))
    if b_contact:
        company_lines.append(Paragraph(f"Attn: {b_contact}", styles["CompanyMeta"]))
    if b_address:
        company_lines.append(Paragraph(b_address, styles["CompanyMeta"]))

    contact_parts: list[str] = []
    if b_email:
        contact_parts.append(f"Email: {b_email}")
    if b_phone:
        contact_parts.append(f"Phone: {b_phone}")
    if contact_parts:
        company_lines.append(Paragraph("  •  ".join(contact_parts), styles["CompanyMeta"]))

    if b_website:
        company_lines.append(Paragraph(f"Web: {b_website}", styles["CompanyMeta"]))
    if b_tax_id:
        company_lines.append(Paragraph(f"Tax / VAT ID: {b_tax_id}", styles["CompanyMeta"]))

    created_date = quotation.created_at or datetime.now(timezone.utc)
    issue_date_str = created_date.strftime("%B %d, %Y")
    status_str = quotation.status.upper()
    status_color = _get_status_color(quotation.status)

    doc_header_lines = [
        Paragraph("QUOTATION", styles["DocHeaderTitle"]),
        Spacer(1, 2),
        Paragraph(quotation.quotation_number, styles["DocHeaderNumber"]),
        Spacer(1, 2),
        Paragraph(f"Date: <b>{issue_date_str}</b>", styles["DocHeaderMeta"]),
        Paragraph(
            f"Status: <b><font color='{status_color.hexval()}'>{status_str}</font></b>",
            styles["DocHeaderMeta"],
        ),
    ]

    header_table = Table(
        [[company_lines, doc_header_lines]],
        colWidths=[310, 230],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(header_table)
    story.append(Spacer(1, 14))

    # Divider line
    story.append(
        HRFlowable(
            width="100%",
            thickness=1,
            color=colors.HexColor("#e2e8f0"),
            spaceBefore=0,
            spaceAfter=14,
        )
    )

    # ── 2. Information Cards: Customer Details (Left) & Project Scope (Right) ──
    customer_content = [
        Paragraph("PREPARED FOR", styles["CardLabel"]),
        Spacer(1, 2),
        Paragraph(f"<b>{quotation.customer_name}</b>", styles["CardText"]),
    ]
    if quotation.customer_company:
        customer_content.append(
            Paragraph(quotation.customer_company, styles["CardText"])
        )
    if quotation.customer_email:
        customer_content.append(
            Paragraph(f"Email: {quotation.customer_email}", styles["CardText"])
        )
    if quotation.customer_phone:
        customer_content.append(
            Paragraph(f"Phone: {quotation.customer_phone}", styles["CardText"])
        )
    if quotation.customer_address:
        customer_content.append(
            Paragraph(f"Address: {quotation.customer_address}", styles["CardText"])
        )

    scope_content = [
        Paragraph("PROJECT OVERVIEW", styles["CardLabel"]),
        Spacer(1, 2),
        Paragraph(f"<b>{quotation.title}</b>", styles["CardText"]),
    ]
    if quotation.description:
        scope_content.append(Spacer(1, 2))
        scope_content.append(Paragraph(quotation.description, styles["CardText"]))

    details_table = Table(
        [[customer_content, scope_content]],
        colWidths=[265, 265],
    )
    details_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    story.append(details_table)
    story.append(Spacer(1, 16))

    # ── 3. Line Items Table ───────────────────────────────────────────────────
    # Widths: [30, 240, 50, 50, 85, 85] = 540 pt
    table_headers = [
        Paragraph("#", styles["TableHeader"]),
        Paragraph("Deliverable / Description", styles["TableHeader"]),
        Paragraph("Unit", styles["TableHeader"]),
        Paragraph("<div align='right'>Qty</div>", styles["TableHeader"]),
        Paragraph("<div align='right'>Unit Price</div>", styles["TableHeader"]),
        Paragraph("<div align='right'>Line Total</div>", styles["TableHeader"]),
    ]

    table_data = [table_headers]

    for idx, item in enumerate(quotation.items, start=1):
        pos = str(item.position or idx)
        unit_str = item.unit or "—"
        qty_num = Decimal(str(item.quantity))
        qty_str = f"{qty_num:g}"
        price_str = _format_currency(item.unit_price, quotation.currency)
        total_str = _format_currency(item.line_total, quotation.currency)

        row = [
            Paragraph(pos, styles["TableBody"]),
            Paragraph(item.description, styles["TableBodyBold"]),
            Paragraph(unit_str, styles["TableBody"]),
            Paragraph(qty_str, styles["TableBodyRight"]),
            Paragraph(price_str, styles["TableBodyRight"]),
            Paragraph(total_str, styles["TableBodyRightBold"]),
        ]
        table_data.append(row)

    items_table = Table(
        table_data,
        colWidths=[30, 240, 50, 50, 85, 85],
        repeatRows=1,
    )

    t_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]

    # Alternating row background for line items
    for row_idx in range(1, len(table_data)):
        bg = colors.HexColor("#f8fafc") if row_idx % 2 == 0 else colors.white
        t_style.append(("BACKGROUND", (0, row_idx), (-1, row_idx), bg))

    items_table.setStyle(TableStyle(t_style))
    story.append(items_table)
    story.append(Spacer(1, 10))

    # ── 4. Financial Totals Table (Right-Aligned) ────────────────────────────
    subtotal_str = _format_currency(quotation.subtotal, quotation.currency)
    tax_rate_pct = f"{(Decimal(str(quotation.tax_rate)) * 100):.2f}%"
    tax_amount_str = _format_currency(quotation.tax_amount, quotation.currency)
    grand_total_str = _format_currency(quotation.total_amount, quotation.currency)

    totals_data = [
        [
            Paragraph("Subtotal:", styles["TotalsLabel"]),
            Paragraph(subtotal_str, styles["TotalsValue"]),
        ],
        [
            Paragraph(f"Tax ({tax_rate_pct}):", styles["TotalsLabel"]),
            Paragraph(tax_amount_str, styles["TotalsValue"]),
        ],
        [
            Paragraph("Total Amount:", styles["GrandTotalLabel"]),
            Paragraph(grand_total_str, styles["GrandTotalValue"]),
        ],
    ]

    totals_table = Table(
        totals_data,
        colWidths=[120, 110],
    )
    totals_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 1), (-1, 1), 0.5, colors.HexColor("#cbd5e1")),
                ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#f1f5f9")),
                ("BOX", (0, 2), (-1, 2), 1, colors.HexColor("#e2e8f0")),
            ]
        )
    )

    # Wrap totals in a right-aligned parent layout
    totals_wrapper = Table(
        [[Paragraph("", styles["CardText"]), totals_table]],
        colWidths=[310, 230],
    )
    totals_wrapper.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(totals_wrapper)
    story.append(Spacer(1, 14))

    # ── 5. Notes & Terms (Optional Callout Sections) ──────────────────────────
    notes_elements: list[Any] = []
    if quotation.notes:
        notes_elements.extend(
            [
                Paragraph("<b>Notes:</b>", styles["SectionHeading"]),
                Spacer(1, 2),
                Paragraph(quotation.notes, styles["NotesBoxText"]),
                Spacer(1, 8),
            ]
        )
    if quotation.terms_and_conditions:
        notes_elements.extend(
            [
                Paragraph("<b>Terms &amp; Conditions:</b>", styles["SectionHeading"]),
                Spacer(1, 2),
                Paragraph(quotation.terms_and_conditions, styles["NotesBoxText"]),
            ]
        )

    if notes_elements:
        callout_table = Table(
            [[notes_elements]],
            colWidths=[540],
        )
        callout_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(KeepTogether(callout_table))

    # Dynamic canvas with business footer details
    class QuotationCanvas(NumberedCanvas):
        business_name = b_name
        business_email = b_email
        business_phone = b_phone

    # Build the document with our QuotationCanvas
    doc.build(story, canvasmaker=QuotationCanvas)

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
