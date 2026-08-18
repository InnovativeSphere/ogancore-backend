import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';
import { SubscriptionStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService,  private readonly notificationsService: NotificationsService,) {}

  // ─── PLANS ─────────────────────────────────────────
  async createPlan(dto: CreatePlanDto) {
    return this.prisma.subscriptionPlan.create({
      data: dto,
    });
  }

  async listPlans(includeInactive = false) {
    const where: any = {};
    if (!includeInactive) where.isActive = true;
    return this.prisma.subscriptionPlan.findMany({ where });
  }

  async getPlan(id: number) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { planId: id },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async updatePlan(id: number, dto: UpdatePlanDto) {
    await this.getPlan(id);
    return this.prisma.subscriptionPlan.update({
      where: { planId: id },
      data: dto,
    });
  }

  async softDeletePlan(id: number) {
    await this.getPlan(id);
    return this.prisma.subscriptionPlan.update({
      where: { planId: id },
      data: { isActive: false },
    });
  }

  // ─── SUBSCRIPTIONS ────────────────────────────────
  async assignSubscription(dto: AssignSubscriptionDto) {
    const branch = await this.prisma.branch.findUnique({ where: { branchId: dto.branchId } });
    if (!branch) throw new BadRequestException('Branch not found');

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { planId: dto.planId } });
    if (!plan) throw new BadRequestException('Plan not found');

    // Check if there is already an active subscription for this branch
    const existing = await this.prisma.tenantSubscription.findFirst({
      where: {
        branchId: dto.branchId,
        status: { in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE] },
      },
    });
    if (existing) {
      throw new BadRequestException('Branch already has an active subscription');
    }

    const subscription = await this.prisma.tenantSubscription.create({
      data: {
        branchId: dto.branchId,
        planId: dto.planId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        graceUntil: dto.graceUntil ? new Date(dto.graceUntil) : null,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    // Create the first invoice
    await this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: subscription.subscriptionId,
        amount: plan.price,
        dueDate: new Date(dto.startDate),
        status: 'unpaid',
      },
    });

    return this.getSubscription(subscription.subscriptionId);
  }

  async getSubscription(id: number) {
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { subscriptionId: id },
      include: { plan: true, branch: true, invoices: true },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async getBranchSubscription(branchId: number) {
    const sub = await this.prisma.tenantSubscription.findFirst({
      where: {
        branchId,
        status: { in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE] },
      },
      include: { plan: true, invoices: true },
      orderBy: { startDate: 'desc' },
    });
    if (!sub) throw new NotFoundException('No active subscription for this branch');
    return sub;
  }

  async renewSubscription(id: number, dto: RenewSubscriptionDto) {
    const sub = await this.getSubscription(id);
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { planId: sub.planId },
    });
    if (!plan) throw new BadRequestException('Plan not found');

    const updated = await this.prisma.tenantSubscription.update({
      where: { subscriptionId: id },
      data: {
        endDate: new Date(dto.endDate),
        status: SubscriptionStatus.ACTIVE,
      },
    });

    await this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: id,
        amount: plan.price,
        dueDate: new Date(dto.endDate),
        status: 'unpaid',
      },
    });

    await this.notificationsService.createForAdmins(
  sub.branchId,
  NotificationType.SUBSCRIPTION_RENEWAL,
  'Subscription renewed',
  `Subscription for branch has been renewed until ${dto.endDate}.`,
);

    return this.getSubscription(id);
  }

  async cancelSubscription(id: number) {
    await this.getSubscription(id);
    return this.prisma.tenantSubscription.update({
      where: { subscriptionId: id },
      data: { status: SubscriptionStatus.SUSPENDED },
    });
  }

  async listInvoices(subscriptionId: number) {
    await this.getSubscription(subscriptionId);
    return this.prisma.subscriptionInvoice.findMany({
      where: { subscriptionId },
      orderBy: { dueDate: 'desc' },
    });
  }

  async payInvoice(invoiceId: number) {
    const invoice = await this.prisma.subscriptionInvoice.findUnique({
      where: { invoiceId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') throw new BadRequestException('Invoice already paid');

    return this.prisma.subscriptionInvoice.update({
      where: { invoiceId },
      data: { status: 'paid', paidAt: new Date() },
    });
  }
}