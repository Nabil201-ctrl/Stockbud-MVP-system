import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EmailService {
  private readonly apiKey: string;
  private readonly senderEmail: string;
  private readonly senderName: string;
  private readonly apiUrl = 'https://api.brevo.com/v3/smtp/email';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY');
    this.senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL');
    this.senderName = this.configService.get<string>('BREVO_SENDER_NAME');

    if (!this.apiKey) {
      console.warn('[EmailService] BREVO_API_KEY not set. Email sending will be disabled.');
    } else {
      console.log('[EmailService] Brevo email service initialized.');
    }
  }

  async sendEmail(options: {
    to: { email: string; name?: string }[];
    subject: string;
    htmlContent: string;
    attachment?: { name: string; content: string };
  }): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('[EmailService] Skipping email — BREVO_API_KEY not configured.');
      return false;
    }

    const payload: any = {
      sender: {
        name: this.senderName,
        email: this.senderEmail,
      },
      to: options.to.map(t => ({
        email: t.email,
        name: t.name || t.email,
      })),
      subject: options.subject,
      htmlContent: options.htmlContent,
    };


    if (options.attachment) {
      payload.attachment = [
        {
          name: options.attachment.name,
          content: options.attachment.content,
        },
      ];
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.apiUrl, payload, {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 30000,
        }),
      );

      console.log(`[EmailService] Email sent successfully to ${options.to.map(t => t.email).join(', ')}. MessageId: ${response.data?.messageId}`);
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send email:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
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
