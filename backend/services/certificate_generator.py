from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    Table,
    TableStyle,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
from typing import Dict, Any
import qrcode
from io import BytesIO
import os

from core.security import generate_certificate_id
from core.config import settings


class CertificateGenerator:
    def __init__(self):
        self.page_size = letter
        self.styles = getSampleStyleSheet()
        self._setup_styles()

    def _setup_styles(self):
        """Setup custom styles for certificate"""
        # Title style
        self.title_style = ParagraphStyle(
            "CertificateTitle",
            parent=self.styles["Heading1"],
            fontSize=36,
            textColor=colors.HexColor("#2E7D32"),
            alignment=1,  # Center
            spaceAfter=30,
        )

        # Subtitle style
        self.subtitle_style = ParagraphStyle(
            "CertificateSubtitle",
            parent=self.styles["Normal"],
            fontSize=18,
            textColor=colors.HexColor("#555555"),
            alignment=1,
            spaceAfter=40,
        )

        # Name style
        self.name_style = ParagraphStyle(
            "CertificateName",
            parent=self.styles["Heading2"],
            fontSize=42,
            textColor=colors.HexColor("#1A237E"),
            alignment=1,
            spaceAfter=20,
        )

        # Details style
        self.details_style = ParagraphStyle(
            "CertificateDetails",
            parent=self.styles["Normal"],
            fontSize=14,
            textColor=colors.HexColor("#333333"),
            alignment=1,
            spaceAfter=10,
        )

    def generate_certificate(self, certificate_data: Dict[str, Any]) -> bytes:
        """Generate certificate PDF"""
        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=self.page_size,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72,
        )

        story = []

        # Add border
        self._add_border(canvas.Canvas(buffer, pagesize=self.page_size))

        # Add logo (if exists)
        logo_path = os.path.join(settings.UPLOAD_DIR, "logo.png")
        if os.path.exists(logo_path):
            logo = Image(logo_path, width=2 * inch, height=1 * inch)
            logo.hAlign = "CENTER"
            story.append(logo)
            story.append(Spacer(1, 30))

        # Title
        story.append(Paragraph("Certificate of Achievement", self.title_style))
        story.append(Spacer(1, 10))

        # Subtitle
        story.append(
            Paragraph("This certificate is proudly presented to", self.subtitle_style)
        )

        # Participant name
        story.append(Paragraph(certificate_data["participant_name"], self.name_style))
        story.append(Spacer(1, 30))

        # Achievement description
        achievement_text = f"For successfully completing the hackathon: <b>{certificate_data['hackathon_title']}</b>"
        story.append(Paragraph(achievement_text, self.details_style))

        if certificate_data.get("team_name"):
            story.append(
                Paragraph(
                    f"As part of team: <b>{certificate_data['team_name']}</b>",
                    self.details_style,
                )
            )

        story.append(
            Paragraph(
                f"Role: <b>{certificate_data.get('role', 'Participant')}</b>",
                self.details_style,
            )
        )
        story.append(Spacer(1, 40))

        # Details table
        details_data = [
            ["Certificate ID:", certificate_data["certificate_id"]],
            ["Issued Date:", certificate_data["issued_date"].split("T")[0]],
            [
                "Hackathon Duration:",
                f"{certificate_data.get('hackathon_duration', 'Multiple days')}",
            ],
            ["Verification:", "Scan QR code below"],
        ]

        details_table = Table(details_data, colWidths=[2 * inch, 3 * inch])
        details_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTSIZE", (0, 0), (-1, -1), 12),
                    ("PADDING", (0, 0), (-1, -1), 6),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ]
            )
        )
        story.append(details_table)
        story.append(Spacer(1, 40))

        # Generate QR code
        verification_url = f"{settings.BACKEND_URL}/certificates/verify/{certificate_data['certificate_id']}"
        qr = qrcode.make(verification_url)
        qr_buffer = BytesIO()
        qr.save(qr_buffer, format="PNG")
        qr_image = Image(qr_buffer, width=1.5 * inch, height=1.5 * inch)
        qr_image.hAlign = "CENTER"
        story.append(qr_image)

        # Verification text
        story.append(
            Paragraph("Scan QR code to verify this certificate", self.details_style)
        )
        story.append(Spacer(1, 20))

        # Signatures
        signatures_data = [
            ["", "", ""],
            [
                "________________________",
                "________________________",
                "________________________",
            ],
            ["Hackathon Organizer", "Mentor", "ProEduvate Platform"],
        ]

        signatures_table = Table(
            signatures_data, colWidths=[2 * inch, 2 * inch, 2 * inch]
        )
        signatures_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("PADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        story.append(signatures_table)

        # Build PDF
        doc.build(story)

        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    def _add_border(self, canvas_obj):
        """Add decorative border to certificate"""
        canvas_obj.setStrokeColor(colors.HexColor("#2E7D32"))
        canvas_obj.setLineWidth(3)
        canvas_obj.rect(50, 50, self.page_size[0] - 100, self.page_size[1] - 100)

    def create_certificate_data(
        self,
        user_data: Dict[str, Any],
        hackathon_data: Dict[str, Any],
        team_data: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """Create certificate data structure"""
        certificate_id = generate_certificate_id()

        certificate_data = {
            "certificate_id": certificate_id,
            "participant_name": user_data["full_name"],
            "participant_email": user_data["email"],
            "participant_uid": user_data.get("uid", ""),
            "hackathon_title": hackathon_data["title"],
            "hackathon_id": hackathon_data["hackathon_id"],
            "issued_date": datetime.utcnow().isoformat(),
            "role": (
                "Team Lead"
                if team_data and team_data.get("team_lead_id") == user_data["id"]
                else "Team Member" if team_data else "Individual Participant"
            ),
            "status": "issued",
        }

        if team_data:
            certificate_data["team_name"] = team_data["name"]
            certificate_data["team_id"] = team_data["id"]

        if hackathon_data.get("hackathon_start") and hackathon_data.get(
            "hackathon_end"
        ):
            start = datetime.fromisoformat(
                hackathon_data["hackathon_start"].isoformat()
                if isinstance(hackathon_data["hackathon_start"], datetime)
                else hackathon_data["hackathon_start"]
            )
            end = datetime.fromisoformat(
                hackathon_data["hackathon_end"].isoformat()
                if isinstance(hackathon_data["hackathon_end"], datetime)
                else hackathon_data["hackathon_end"]
            )
            duration = (end - start).days
            certificate_data["hackathon_duration"] = (
                f"{duration} day{'s' if duration != 1 else ''}"
            )

        return certificate_data


# Singleton instance
certificate_generator = CertificateGenerator()
