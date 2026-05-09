import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from pathlib import Path
import asyncio
from typing import Optional, List
import qrcode
from io import BytesIO

from core.config import settings

class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.email_from = settings.EMAIL_FROM
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[dict]] = None
    ) -> bool:
        """Send email with optional attachments"""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.email_from
            msg['To'] = to_email
            
            # Add text/plain part
            if text_content:
                msg.attach(MIMEText(text_content, 'plain'))
            
            # Add HTML part
            msg.attach(MIMEText(html_content, 'html'))
            
            # Add attachments
            if attachments:
                for attachment in attachments:
                    file_data = attachment.get('data')
                    file_name = attachment.get('filename')
                    content_type = attachment.get('content_type', 'application/octet-stream')
                    
                    part = MIMEApplication(file_data, Name=file_name)
                    part['Content-Disposition'] = f'attachment; filename="{file_name}"'
                    msg.attach(part)
            
            # Send email
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                self._send_sync,
                msg
            )
            
            return True
            
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False
    
    def _send_sync(self, msg: MIMEMultipart):
        """Synchronous email sending"""
        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            server.send_message(msg)
    
    async def send_welcome_email(self, to_email: str, user_name: str, role: str):
        """Send welcome email to new user"""
        subject = f"Welcome to ProEduvate Hackathon Platform - {role.title()}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
                .footer {{ margin-top: 30px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to ProEduvate!</h1>
                    <p>Your journey to hackathon success starts here</p>
                </div>
                <div class="content">
                    <h2>Hello {user_name},</h2>
                    <p>Welcome to the ProEduvate Hackathon Platform as a <strong>{role}</strong>!</p>
                    
                    <p>With your new account, you can:</p>
                    <ul>
                        <li>Participate in exciting hackathons</li>
                        <li>Collaborate with team members</li>
                        <li>Get guidance from mentors</li>
                        <li>Use our AI Co-Mentor for assistance</li>
                        <li>Track your progress and earn badges</li>
                    </ul>
                    
                    <p>Get started by exploring upcoming hackathons or completing your profile.</p>
                    
                    <a href="{settings.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
                    
                    <div class="footer">
                        <p>This is an automated message. Please do not reply to this email.</p>
                        <p>&copy; 2024 ProEduvate Hackathon Platform. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Welcome to ProEduvate Hackathon Platform!
        
        Hello {user_name},
        
        Welcome to the ProEduvate Hackathon Platform as a {role}!
        
        Get started by visiting: {settings.FRONTEND_URL}/dashboard
        
        Best regards,
        The ProEduvate Team
        """
        
        return await self.send_email(to_email, subject, html_content, text_content)
    
    async def send_certificate_email(
        self,
        to_email: str,
        user_name: str,
        hackathon_title: str,
        certificate_data: dict,
        certificate_pdf: bytes
    ):
        """Send certificate email with PDF attachment"""
        subject = f"Congratulations! Your Hackathon Certificate - {hackathon_title}"
        
        # Generate QR code for verification
        verification_url = f"{settings.BACKEND_URL}/certificates/verify/{certificate_data['certificate_id']}"
        qr = qrcode.make(verification_url)
        qr_buffer = BytesIO()
        qr.save(qr_buffer, format='PNG')
        qr_image = qr_buffer.getvalue()
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .certificate-info {{ background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #4CAF50; }}
                .qr-code {{ text-align: center; margin: 20px 0; }}
                .footer {{ margin-top: 30px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Certificate Awarded! 🎉</h1>
                    <p>Congratulations on completing the hackathon!</p>
                </div>
                <div class="content">
                    <h2>Dear {user_name},</h2>
                    
                    <p>Congratulations on successfully completing <strong>{hackathon_title}</strong>!</p>
                    
                    <div class="certificate-info">
                        <h3>Your Achievement Details:</h3>
                        <p><strong>Certificate ID:</strong> {certificate_data['certificate_id']}</p>
                        <p><strong>Issued Date:</strong> {certificate_data['issued_date'].split('T')[0]}</p>
                        <p><strong>Team:</strong> {certificate_data.get('team_name', 'Individual')}</p>
                        <p><strong>Role:</strong> {certificate_data.get('role', 'Participant')}</p>
                    </div>
                    
                    <p>Your certificate is attached to this email as a PDF. You can also verify it online using the QR code below:</p>
                    
                    <div class="qr-code">
                        <img src="cid:qr_code" alt="Verification QR Code" style="width: 150px; height: 150px;">
                        <p>Scan to verify your certificate</p>
                    </div>
                    
                    <p>Keep this certificate for your portfolio and future references.</p>
                    
                    <div class="footer">
                        <p>This certificate is digitally signed and verified by ProEduvate Hackathon Platform.</p>
                        <p>&copy; 2024 ProEduvate. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Certificate of Completion
        
        Dear {user_name},
        
        Congratulations on successfully completing {hackathon_title}!
        
        Certificate Details:
        - Certificate ID: {certificate_data['certificate_id']}
        - Issued Date: {certificate_data['issued_date'].split('T')[0]}
        - Team: {certificate_data.get('team_name', 'Individual')}
        - Role: {certificate_data.get('role', 'Participant')}
        
        Your certificate is attached as a PDF file.
        
        Verify your certificate at: {verification_url}
        
        Congratulations again on your achievement!
        
        Best regards,
        The ProEduvate Team
        """
        
        attachments = [
            {
                'data': certificate_pdf,
                'filename': f'Certificate_{certificate_data["certificate_id"]}.pdf',
                'content_type': 'application/pdf'
            },
            {
                'data': qr_image,
                'filename': 'qr_code.png',
                'content_type': 'image/png'
            }
        ]
        
        return await self.send_email(to_email, subject, html_content, text_content, attachments)

# Singleton instance
email_service = EmailService()