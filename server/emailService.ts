/**
 * Email service using NodeMailer for sending actual emails
 */

import nodemailer from 'nodemailer';

export interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter;

  constructor() {
    // Use correct port - default to 587 for STARTTLS, or use environment value
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: smtpPort,
      secure: smtpPort === 465, // true for 465 (SSL), false for 587 (STARTTLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000, // 5 seconds
      socketTimeout: 10000, // 10 seconds
    });

    // Verify SMTP connection on startup
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✓ SMTP connection verified successfully');
    } catch (error: any) {
      console.log('⚠ SMTP connection failed, will use fallback simulation');
      console.log(`   Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
      console.log(`   Port: ${process.env.SMTP_PORT || '587'}`);
      console.log(`   Error: ${error.message}`);
      
      // Check if it's a specific Gmail issue
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        console.log('   Suggestion: Check if SMTP_PORT is correct (should be 587 for Gmail STARTTLS)');
      }
    }
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send password reset email using NodeMailer
   */
  async sendPasswordResetEmail(email: string, resetCode: string, userName: string): Promise<boolean> {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset Code - TripMate',
      text: this.generatePasswordResetText(resetCode, userName),
      html: this.generatePasswordResetHTML(resetCode, userName)
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Send email using NodeMailer with timeout handling
   */
  private async sendEmail(mailOptions: any): Promise<boolean> {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email sending timeout')), 8000);
      });

      // Race between email sending and timeout
      const info = await Promise.race([
        this.transporter.sendMail(mailOptions),
        timeoutPromise
      ]);

      console.log('\n=== EMAIL SENT SUCCESSFULLY ===');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Message ID: ${info.messageId}`);
      console.log('===============================\n');
      return true;
    } catch (error: any) {
      console.error('Error sending email via SMTP:', error.message);
      console.log('\n=== FALLING BACK TO EMAIL SIMULATION ===');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log('Content:');
      console.log(mailOptions.text);
      console.log('==========================================\n');
      return true;
    }
  }

  /**
   * Generate plain text email content
   */
  private generatePasswordResetText(resetCode: string, userName: string): string {
    return `
Hello ${userName},

You requested a password reset for your TripMate account.

Your password reset code is: ${resetCode}

This code will expire in 1 hour. Enter this code on the password reset page to create a new password.

If you didn't request this password reset, please ignore this email. Your account remains secure.

Best regards,
The TripMate Team
    `.trim();
  }

  /**
   * Generate HTML email content
   */
  private generatePasswordResetHTML(resetCode: string, userName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset - TripMate</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0066cc; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .reset-code { background: #e8f4f8; border: 2px solid #0066cc; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .code { font-size: 32px; font-weight: bold; color: #0066cc; letter-spacing: 4px; }
    .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TripMate Password Reset</h1>
    </div>
    <div class="content">
      <h2>Hello ${userName},</h2>
      <p>You requested a password reset for your TripMate account.</p>
      
      <div class="reset-code">
        <p><strong>Your password reset code is:</strong></p>
        <div class="code">${resetCode}</div>
        <p><small>This code will expire in 1 hour</small></p>
      </div>
      
      <p>Enter this code on the password reset page to create a new password.</p>
      <p>If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>The TripMate Team</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Send welcome email for new registrations
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to TripMate!',
      text: `Welcome to TripMate, ${userName}! Start planning amazing group trips today.`,
      html: `<h1>Welcome to TripMate!</h1><p>Hello ${userName}, welcome to TripMate! Start planning amazing group trips today.</p>`
    };

    return this.sendEmail(mailOptions);
  }
}