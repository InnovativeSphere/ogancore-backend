import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async createForUser(
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
  ) {
    // Save to database
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        scheduledFor: new Date(),
      },
    });

    // Send email to the user (if they have an email)
    try {
      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { email: true, fullName: true },
      });
      if (user?.email) {
               await this.emailService.sendNotificationEmail(
          user.email,
          title,
          title,
          message,
          type,
        );
      }
    } catch (error) {
      // Email failure shouldn't break the app
      console.error('Failed to send notification email:', error);
    }

    return notification;
  }

  async createForAdmins(
    branchId: number,
    type: NotificationType,
    title: string,
    message: string,
  ) {
    const admins = await this.prisma.user.findMany({
      where: {
        branchId,
        status: 'ACTIVE',
        role: { roleName: { in: ['SUPER_ADMIN', 'ADMIN', 'IT_ADMIN'] } },
      },
      select: { userId: true },
    });

    return Promise.all(
      admins.map((a) => this.createForUser(a.userId, type, title, message)),
    );
  }

  async createForAllUsers(
    type: NotificationType,
    title: string,
    message: string,
  ) {
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { userId: true },
    });

    return Promise.all(
      users.map((u) => this.createForUser(u.userId, type, title, message)),
    );
  }

  async getUserNotifications(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(notificationId: number, userId: number) {
    const notif = await this.prisma.notification.findFirst({
      where: { notificationId, userId },
    });
    if (!notif) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { notificationId },
      data: { isRead: true, sentAt: new Date() },
    });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, sentAt: new Date() },
    });
  }
}