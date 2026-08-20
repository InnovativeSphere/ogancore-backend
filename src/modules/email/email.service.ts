import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationType } from '@prisma/client';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private getLogoUrl(): string {
    if (process.env.APP_LOGO_URL) {
      return process.env.APP_LOGO_URL;
    }
    try {
      const logoPath = path.join(
        process.cwd(),
        'src',
        'modules',
        'email',
        'templates',
        'assets',
        'logo.jpeg',
      );
      const fileBuffer = fs.readFileSync(logoPath);
      return `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;
    } catch (error) {
      console.error('Could not read logo file:', error);
      return '';
    }
  }

  private getTypeStyle(type: NotificationType): { color: string; icon: string; label: string } {
    const styles: Record<string, { color: string; icon: string; label: string }> = {
      LOW_STOCK: { color: '#D96600', icon: '⚠️', label: 'Low Stock Alert' },
      OUT_OF_STOCK: { color: '#FF0000', icon: '🛑', label: 'Out of Stock Alert' },
      SUBSCRIPTION_EXPIRY: { color: '#D96600', icon: '⏳', label: 'Subscription Expiry' },
      SUBSCRIPTION_RENEWAL: { color: '#004D2B', icon: '🔄', label: 'Subscription Renewed' },
      REPORT_READY: { color: '#004D2B', icon: '📊', label: 'Report Ready' },
      PAYMENT_RECEIVED: { color: '#004D2B', icon: '💰', label: 'Payment Received' },
      PAYMENT_FAILED: { color: '#FF0000', icon: '❌', label: 'Payment Failed' },
      EXPENSE_APPROVED: { color: '#004D2B', icon: '✅', label: 'Expense Approved' },
      EXPENSE_REJECTED: { color: '#FF0000', icon: '❌', label: 'Expense Rejected' },
      SYSTEM_ALERT: { color: '#D96600', icon: '🔔', label: 'System Alert' },
      USER_WELCOME: { color: '#004D2B', icon: '👋', label: 'Welcome' },
      GENERAL: { color: '#004D2B', icon: 'ℹ️', label: 'Notification' },
    };

    return styles[type] || styles.GENERAL;
  }

  async sendNotificationEmail(
    to: string,
    subject: string,
    title: string,
    message: string,
    type: NotificationType,
    actionUrl?: string,
  ) {
    try {
      const templatePath = path.join(
        process.cwd(),
        'src',
        'modules',
        'email',
        'templates',
        'notification.ejs',
      );

      const logoUrl = this.getLogoUrl();
      const style = this.getTypeStyle(type);

      const html = await ejs.renderFile(templatePath, {
        title: style.label || title,
        message,
        subject,
        actionUrl: actionUrl || process.env.APP_BASE_URL,
        appName: 'OGANCORE',
        logoUrl,
        accentColor: style.color,
        icon: style.icon,
      });

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: `${style.label}: ${title}`,
        html,
      });
    } catch (error) {
      console.error('Email sending failed:', error);
    }
  }
}