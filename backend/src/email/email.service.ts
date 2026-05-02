import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient, Brevo } from '@getbrevo/brevo';
import * as nodemailer from 'nodemailer';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private scraperTransporter: nodemailer.Transporter;
  private brevoClient: BrevoClient;
  private readonly senderEmail: string;
  private readonly senderName: string;
  private readonly brevoApiKey: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL') || 'stockbud@stockbud.xyz';
    this.senderName = this.configService.get<string>('BREVO_SENDER_NAME') || 'Stockbud';

    // ── Brevo Send API (via SDK v4) ──────────────────────
    this.brevoApiKey = (this.configService.get<string>('BREVO_API_KEY') || '').trim();
    this.brevoClient = new BrevoClient({ apiKey: this.brevoApiKey });

    // ── Gmail SMTP (Staff Alerting) ─────────────────────────
    // When a user submits a new site for monitoring, the scraper service
    // uses THIS Gmail account (SCRAPER_GMAIL_USER) as the SENDER to
    // email the EMPLOYEE at STAFF_NOTIFICATION_EMAIL.
    // The employee then logs into the platform, creates credentials,
    // and approves the monitoring request.
    //
    // SCRAPER_GMAIL_PASS must be a 16-char Gmail App Password (no spaces).
    const gmailPass = this.configService.get<string>('SCRAPER_GMAIL_PASS');
    this.scraperTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('SCRAPER_GMAIL_USER'),
        pass: gmailPass ? gmailPass.replace(/\s/g, '') : '',
      }
    });

    this.logger.log('Initialized — Brevo SDK (users) + Gmail SMTP (staff alerts).');
  }


  async sendEmail(options: {
    to: { email: string; name?: string }[];
    subject: string;
    htmlContent: string;
    attachment?: { name: string; content: string };
    from?: { name: string; email: string };
    useScraperTransporter?: boolean;
  }): Promise<boolean> {
    if (options.useScraperTransporter) {
      return this.sendViaGmail(options);
    } else {
      return this.sendViaBrevoApi(options);
    }
  }

  /**
   * Sends an alert to the staff email using the Gmail SMTP transporter.
   * This is used for internal notifications like new site monitoring requests.
   */
  async sendStaffAlert(subject: string, htmlContent: string): Promise<boolean> {
    const staffEmail = this.configService.get<string>('STAFF_NOTIFICATION_EMAIL') || 'support@stockbud.xyz';
    const senderGmail = this.configService.get<string>('SCRAPER_GMAIL_USER') || 'stockbud.01@gmail.com';

    return this.sendEmail({
      to: [{ email: staffEmail, name: 'Stockbud Staff' }],
      subject: subject,
      htmlContent: htmlContent,
      from: { name: 'Stockbud System Alerts', email: senderGmail },
      useScraperTransporter: true
    }); 
  }

  private async sendViaGmail(options: any): Promise<boolean> {
    const mailOptions: nodemailer.SendMailOptions = {
      from: options.from ? {
        name: options.from.name,
        address: options.from.email,
      } : {
        name: this.senderName,
        address: this.senderEmail,
      },
      to: options.to.map(t => ({
        name: t.name || '',
        address: t.email,
      })),
      subject: options.subject,
      html: options.htmlContent,
    };

    if (options.attachment) {
      mailOptions.attachments = [
        {
          filename: options.attachment.name,
          content: Buffer.from(options.attachment.content, 'base64'),
        },
      ];
    }

    try {
      const info = await this.scraperTransporter.sendMail(mailOptions);
      this.logger.log(`Gmail sent successfully. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send Gmail SMTP: ${error.message}`, error.stack);
      return false;
    }
  }

  private async sendViaBrevoApi(options: any): Promise<boolean> {
    try {
      const payload = {
        subject: options.subject,
        htmlContent: options.htmlContent,
        sender: options.from
          ? { name: options.from.name, email: options.from.email }
          : { name: this.senderName, email: this.senderEmail },
        to: options.to.map((t: any) => ({ email: t.email, name: t.name })),
        attachment: options.attachment ? [
          {
            name: options.attachment.name,
            content: options.attachment.content,
          }
        ] : undefined
      };

      await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
          'accept': 'application/json',
          'api-key': this.brevoApiKey,
          'content-type': 'application/json'
        }
      });

      this.logger.log(`Brevo email sent successfully to ${options.to[0]?.email}`);
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      this.logger.error(`Failed to send Brevo API email: ${errorMessage}`, error.stack);
      return false;
    }
  }

  async sendWeeklyReport(userEmail: string, userName: string, reportTitle: string, docxBase64: string): Promise<boolean> {
    const weekDate = new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: ` Your Weekly Store Report — ${weekDate}`,
      htmlContent: this.buildWeeklyEmailHtml(userName, reportTitle, weekDate),
      attachment: {
        name: `StockBud_Weekly_Report_${new Date().toISOString().slice(0, 10)}.docx`,
        content: docxBase64,
      },
    });
  }

  async sendMonthlyReview(userEmail: string, userName: string, reportTitle: string, docxBase64: string): Promise<boolean> {
    const monthDate = new Date().toLocaleDateString('en-US', {
      month: 'long', year: 'numeric',
    });

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: ` Your Monthly Business Review — ${monthDate}`,
      htmlContent: this.buildMonthlyEmailHtml(userName, reportTitle, monthDate),
      attachment: {
        name: `StockBud_Monthly_Review_${new Date().toISOString().slice(0, 7)}.docx`,
        content: docxBase64,
      },
    });
  }

  async sendWelcomeReport(userEmail: string, userName: string, shopName: string, docxBase64: string): Promise<boolean> {
    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: ` Welcome to StockBud! Your First Store Analysis is Ready`,
      htmlContent: this.buildWelcomeEmailHtml(userName, shopName),
      attachment: {
        name: `StockBud_Welcome_Analysis_${shopName.replace(/[^a-zA-Z0-9]/g, '_')}.docx`,
        content: docxBase64,
      },
    });
  }

  async sendInstantReview(userEmail: string, userName: string, reportTitle: string, docxBase64: string): Promise<boolean> {
    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: ` Your Instant System Review — ${reportTitle}`,
      htmlContent: this.buildInstantReviewEmailHtml(userName, reportTitle),
      attachment: {
        name: `StockBud_Instant_Review_${new Date().toISOString().slice(0, 10)}.docx`,
        content: docxBase64,
      },
    });
  }

  async sendAccountVerificationEmail(userEmail: string, userName: string, token: string): Promise<boolean> {
    const verificationLink = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost'}/auth/verify?token=${token}`;
    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: 'Verify Your StockBud Account',
      htmlContent: this.buildVerificationEmailHtml(userName, verificationLink),
    });
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: 'Welcome to StockBud!',
      htmlContent: this.buildWelcomeMessageHtml(userName),
    });
  }

  async sendPasswordResetEmail(userEmail: string, userName: string, resetLink: string): Promise<boolean> {
    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: 'Password Reset Request - StockBud',
      htmlContent: this.buildPasswordResetHtml(userName, resetLink),
    });
  }



  public buildWeeklyEmailHtml(userName: string, reportTitle: string, weekDate: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:40px 32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;"> Weekly Report</h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">${weekDate}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${userName}</strong>,</p>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;">Your weekly store performance report <strong>"${reportTitle}"</strong> is now ready for review. Our AI has analyzed your data to provide actionable insights for your business.</p>
          <div style="background:#eff6ff;border-left:4px solid #2563eb;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
            <p style="margin:0;color:#1e40af;font-size:14px;font-weight:600;"> Your report is available in the dashboard</p>
            <p style="margin:4px 0 0;color:#3b82f6;font-size:13px;">View detailed metrics, trend analysis, and strategic recommendations.</p>
          </div>
          <p style="color:#6b7280;font-size:14px;">You can also view this report anytime in your <a href="http://localhost/reports" style="color:#2563eb;">StockBud Dashboard</a>.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">StockBud — Smart Inventory Intelligence</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  public buildMonthlyEmailHtml(userName: string, reportTitle: string, monthDate: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#059669,#0d9488);padding:40px 32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;"> Monthly Business Review</h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">${monthDate}</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${userName}</strong>,</p>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;">Your comprehensive monthly review <strong>"${reportTitle}"</strong> is ready. This report aggregates all your weekly data, identifies trends, and provides strategic recommendations for the coming month.</p>
          <div style="background:#ecfdf5;border-left:4px solid #059669;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
            <p style="margin:0;color:#065f46;font-size:14px;font-weight:600;"> Monthly review available in dashboard</p>
            <p style="margin:4px 0 0;color:#10b981;font-size:13px;">Contains trend analysis, fault-finding, and corrective action items.</p>
          </div>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">StockBud — Smart Inventory Intelligence</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  public buildWelcomeEmailHtml(userName: string, shopName: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:40px 32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;"> Welcome to StockBud!</h1>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Your store "${shopName}" is now connected</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${userName}</strong>,</p>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;">Congratulations on connecting your Shopify store! </p>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;">We've already analyzed your store's current performance and generated your <strong>first system review</strong>. It includes a critical assessment of your products, inventory health, and revenue potential.</p>
          <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
            <p style="margin:0;color:#92400e;font-size:14px;font-weight:600;"> Your First Store Analysis is ready</p>
            <p style="margin:4px 0 0;color:#d97706;font-size:13px;">View it in the reports section to understand where your business stands.</p>
          </div>
          <h3 style="color:#374151;font-size:16px;">What happens next?</h3>
          <ul style="color:#6b7280;font-size:14px;line-height:1.8;">
            <li><strong>Weekly Reports</strong> — Every Monday, we'll send you a detailed weekly analysis</li>
            <li><strong>Monthly Reviews</strong> — On the 1st of each month, get a comprehensive business review</li>
            <li><strong>Instant Reviews</strong> — Need insights now? Get an instant paid review anytime</li>
          </ul>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">StockBud — Smart Inventory Intelligence</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  public buildInstantReviewEmailHtml(userName: string, reportTitle: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#8b5cf6,#ec4899);padding:40px 32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;"> Instant System Review</h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${userName}</strong>,</p>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;">Your instant system review <strong>"${reportTitle}"</strong> has been generated. This is a comprehensive, real-time analysis of your store's current state.</p>
          <div style="background:#f5f3ff;border-left:4px solid #8b5cf6;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
            <p style="margin:0;color:#5b21b6;font-size:14px;font-weight:600;"> Your review is ready to view in dashboard</p>
          </div>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">StockBud — Smart Inventory Intelligence</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private buildVerificationEmailHtml(userName: string, verificationLink: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:40px 32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;"> Verify Your Account</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${userName}</strong>,</p>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;">Welcome to StockBud! Please verify your email address to complete your registration and start optimizing your inventory.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${verificationLink}" style="background:#2563eb;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">Verify Email Address</a>
          </div>
          <p style="color:#9ca3af;font-size:13px;text-align:center;">If you didn't create an account, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">StockBud — Smart Inventory Intelligence</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private buildWelcomeMessageHtml(userName: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#059669,#0d9488);padding:40px 32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;"> Welcome to StockBud!</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${userName}</strong>,</p>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;">We're thrilled to have you on board. StockBud is here to help you manage your inventory smarter and boost your store's performance.</p>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;">You can now connect your Shopify store if you haven't already, and we'll start generating insights for you right away.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="http://localhost/dashboard" style="background:#059669;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">Go to Dashboard</a>
          </div>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">StockBud — Smart Inventory Intelligence</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private buildPasswordResetHtml(userName: string, resetLink: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#ef4444,#f59e0b);padding:40px 32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;"> Password Reset Request</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${userName}</strong>,</p>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;">We received a request to reset your StockBud password. Click the button below to set a new password:</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetLink}" style="background:#ef4444;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">Reset Password</a>
          </div>
          <p style="color:#9ca3af;font-size:13px;text-align:center;">If you didn't request a password reset, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">StockBud — Smart Inventory Intelligence</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  public buildGeneralNotificationHtml(userName: string, title: string, message: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;">${title}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${userName}</strong>,</p>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;">${message}</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="http://localhost/dashboard" style="background:#2563eb;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">Open StockBud Dashboard</a>
          </div>
          <p style="color:#9ca3af;font-size:13px;text-align:center;">Working hard to make your business smarter.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">StockBud — Smart Inventory Intelligence</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
