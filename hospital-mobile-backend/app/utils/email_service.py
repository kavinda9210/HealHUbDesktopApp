import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app, render_template
from typing import Dict, Any, List, Optional
import threading

logger = logging.getLogger(__name__)

class EmailService:
    """Email service for sending notifications"""
    
    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        html_content: str = None,
        text_content: str = None,
        cc_emails: List[str] = None,
        bcc_emails: List[str] = None
    ) -> bool:
        """
        Send an email
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content of the email
            text_content: Plain text content of the email
            cc_emails: List of CC email addresses
            bcc_emails: List of BCC email addresses
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        # Check if email sending is suppressed (for testing)
        if current_app.config.get('MAIL_SUPPRESS_SEND', False):
            logger.info(f"Email sending suppressed. Would send to: {to_email}, Subject: {subject}")
            return True
        
        # Validate configuration
        if not all([
            current_app.config.get('MAIL_SERVER'),
            current_app.config.get('MAIL_USERNAME'),
            current_app.config.get('MAIL_PASSWORD')
        ]):
            logger.error("Email configuration incomplete")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = current_app.config.get('MAIL_DEFAULT_SENDER', current_app.config['MAIL_USERNAME'])
            msg['To'] = to_email
            
            if cc_emails:
                msg['Cc'] = ', '.join(cc_emails)
            
            # Add recipients
            recipients = [to_email]
            if cc_emails:
                recipients.extend(cc_emails)
            if bcc_emails:
                recipients.extend(bcc_emails)
            
            # Add content
            if text_content:
                msg.attach(MIMEText(text_content, 'plain'))
            
            if html_content:
                msg.attach(MIMEText(html_content, 'html'))
            elif text_content:
                # If no HTML but text exists, use text as HTML too
                msg.attach(MIMEText(text_content, 'html'))
            
            # Connect to SMTP server and send
            with smtplib.SMTP(current_app.config['MAIL_SERVER'], current_app.config['MAIL_PORT']) as server:
                server.starttls()
                server.login(current_app.config['MAIL_USERNAME'], current_app.config['MAIL_PASSWORD'])
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    @staticmethod
    def send_verification_code(email: str, verification_code: str, user_name: str = None) -> bool:
        """Send verification code email"""
        subject = "Verify Your Email - Hospital Management System"
        
        # HTML template for verification email
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9f9f9; }}
                .code {{ 
                    font-size: 32px; 
                    font-weight: bold; 
                    color: #4CAF50; 
                    text-align: center; 
                    margin: 20px 0;
                    padding: 10px;
                    background-color: #fff;
                    border: 2px dashed #4CAF50;
                    border-radius: 5px;
                }}
                .footer {{ 
                    text-align: center; 
                    padding: 20px; 
                    color: #666; 
                    font-size: 12px;
                    border-top: 1px solid #eee;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Hospital Management System</h1>
                </div>
                <div class="content">
                    <h2>Email Verification</h2>
                    <p>Hello {user_name or 'User'},</p>
                    <p>Thank you for registering with our Hospital Management System. 
                    Please use the verification code below to verify your email address:</p>
                    
                    <div class="code">{verification_code}</div>
                    
                    <p>This code will expire in 15 minutes.</p>
                    <p>If you didn't request this verification, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>© 2024 Hospital Management System. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_content = f"""
        Hospital Management System - Email Verification
        
        Hello {user_name or 'User'},
        
        Thank you for registering with our Hospital Management System.
        Please use the verification code below to verify your email address:
        
        Verification Code: {verification_code}
        
        This code will expire in 15 minutes.
        
        If you didn't request this verification, please ignore this email.
        
        © 2024 Hospital Management System
        """
        
        return EmailService.send_email(email, subject, html_content, text_content)
    
    @staticmethod
    def send_password_reset_code(email: str, reset_code: str, user_name: str = None) -> bool:
        """Send password reset code email"""
        subject = "Password Reset - Hospital Management System"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #2196F3; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9f9f9; }}
                .code {{ 
                    font-size: 32px; 
                    font-weight: bold; 
                    color: #2196F3; 
                    text-align: center; 
                    margin: 20px 0;
                    padding: 10px;
                    background-color: #fff;
                    border: 2px dashed #2196F3;
                    border-radius: 5px;
                }}
                .warning {{ 
                    background-color: #fff3cd; 
                    border: 1px solid #ffeaa7; 
                    color: #856404; 
                    padding: 10px; 
                    border-radius: 5px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <h2>Hello {user_name or 'User'},</h2>
                    <p>We received a request to reset your password. Use the code below to reset your password:</p>
                    
                    <div class="code">{reset_code}</div>
                    
                    <div class="warning">
                        <strong>Important:</strong> This code will expire in 15 minutes.
                        If you didn't request a password reset, please ignore this email 
                        and ensure your account is secure.
                    </div>
                    
                    <p>To reset your password:</p>
                    <ol>
                        <li>Enter the code above in the password reset form</li>
                        <li>Create a new strong password</li>
                        <li>Confirm your new password</li>
                    </ol>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Password Reset Request - Hospital Management System
        
        Hello {user_name or 'User'},
        
        We received a request to reset your password. Use the code below:
        
        Reset Code: {reset_code}
        
        This code expires in 15 minutes.
        
        If you didn't request this, please ignore this email.
        
        Steps to reset password:
        1. Enter the code above
        2. Create a new password
        3. Confirm your new password
        
        © 2024 Hospital Management System
        """
        
        return EmailService.send_email(email, subject, html_content, text_content)
    
    @staticmethod
    def send_appointment_confirmation(
        email: str, 
        patient_name: str,
        doctor_name: str,
        appointment_date: str,
        appointment_time: str,
        status: str,
        appointment_id: str = None
    ) -> bool:
        """Send appointment confirmation email"""
        subject = f"Appointment {status} - Hospital Management System"
        
        status_color = {
            'Confirmed': '#4CAF50',
            'Cancelled': '#f44336',
            'Scheduled': '#2196F3',
            'Completed': '#673AB7'
        }.get(status, '#2196F3')
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: {status_color}; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9f9f9; }}
                .details {{ 
                    background-color: white; 
                    border: 1px solid #ddd; 
                    border-radius: 5px; 
                    padding: 20px;
                    margin: 20px 0;
                }}
                .detail-row {{ display: flex; margin-bottom: 10px; }}
                .detail-label {{ font-weight: bold; width: 150px; }}
                .status-badge {{ 
                    display: inline-block; 
                    padding: 5px 15px; 
                    background-color: {status_color}; 
                    color: white; 
                    border-radius: 20px;
                    font-weight: bold;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Appointment {status}</h1>
                </div>
                <div class="content">
                    <h2>Hello {patient_name},</h2>
                    <p>Your appointment has been <span class="status-badge">{status}</span></p>
                    
                    <div class="details">
                        <div class="detail-row">
                            <div class="detail-label">Doctor:</div>
                            <div>{doctor_name}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Date:</div>
                            <div>{appointment_date}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Time:</div>
                            <div>{appointment_time}</div>
                        </div>
                        {f'<div class="detail-row"><div class="detail-label">Appointment ID:</div><div>{appointment_id}</div></div>' if appointment_id else ''}
                    </div>
                    
                    <p><strong>Next Steps:</strong></p>
                    <ul>
                        <li>Arrive 15 minutes before your appointment time</li>
                        <li>Bring any previous medical reports if available</li>
                        <li>Carry your identification documents</li>
                    </ul>
                    
                    <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Appointment {status} - Hospital Management System
        
        Hello {patient_name},
        
        Your appointment has been {status}.
        
        Appointment Details:
        Doctor: {doctor_name}
        Date: {appointment_date}
        Time: {appointment_time}
        {f'Appointment ID: {appointment_id}' if appointment_id else ''}
        
        Next Steps:
        • Arrive 15 minutes early
        • Bring previous medical reports
        • Carry identification documents
        
        Contact us at least 24 hours in advance for changes.
        
        © 2024 Hospital Management System
        """
        
        return EmailService.send_email(email, subject, html_content, text_content)
    
    @staticmethod
    def send_async_email(*args, **kwargs):
        """Send email asynchronously in a separate thread"""
        thread = threading.Thread(target=EmailService.send_email, args=args, kwargs=kwargs)
        thread.daemon = True
        thread.start()
        return thread

# Convenience functions
def send_verification_code_async(email: str, code: str, name: str = None):
    """Send verification code asynchronously"""
    EmailService.send_async_email(
        to_email=email,
        subject="Verify Your Email - Hospital Management System",
        html_content=f"Your verification code is: <strong>{code}</strong><br>Expires in 15 minutes.",
        text_content=f"Your verification code is: {code}\nExpires in 15 minutes."
    )

def send_notification_async(email: str, subject: str, message: str):
    """Send general notification asynchronously"""
    EmailService.send_async_email(
        to_email=email,
        subject=subject,
        html_content=message,
        text_content=message
    )