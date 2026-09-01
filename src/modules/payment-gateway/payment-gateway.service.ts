import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service'; // adjust path if needed
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import * as crypto from 'crypto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class PaymentGatewayService {
  private readonly paystackBaseUrl: string;
  private readonly paystackSecretKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    this.paystackBaseUrl =
      process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
  }

  async initializePayment(userId: number, dto: InitializePaymentDto) {
    let businessId: number;
    let subscriptionId: number;
    let amountInNaira: number;
    let email: string;

    if (dto.subscriptionId) {
      const subscription = await this.prisma.tenantSubscription.findUnique({
        where: { subscriptionId: dto.subscriptionId },
        include: { business: true, plan: true },
      });
      if (!subscription) throw new NotFoundException('Subscription not found');

      const user = await this.prisma.user.findUnique({
        where: { userId },
        include: { branch: { include: { business: true } } },
      });
      if (
        !user?.branch?.business ||
        user.branch.business.businessId !== subscription.businessId
      ) {
        throw new BadRequestException('You can only pay for your own subscription');
      }

      businessId = subscription.businessId;
      subscriptionId = subscription.subscriptionId;
      amountInNaira = Number(subscription.plan.price);
      email = subscription.business.businessEmail || user.email;
    } else if (dto.planId) {
      const user = await this.prisma.user.findUnique({
        where: { userId },
        include: { branch: { include: { business: true } } },
      });
      if (!user?.branch?.business) {
        throw new BadRequestException('Your account is not linked to a business');
      }

      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { planId: dto.planId },
      });
      if (!plan) throw new NotFoundException('Plan not found');

      // For a new plan, we need an existing subscription (trial) to pay for.
      // In MVP, businesses already have a trial subscription created at registration.
      // So we require subscriptionId instead of planId for payment.
      throw new BadRequestException(
        'For new plan payments, please use subscriptionId from your active trial.',
      );
    } else {
      throw new BadRequestException('Provide either subscriptionId or planId');
    }

    const reference = `OGANCORE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const amountInKobo = Math.round(amountInNaira * 100);

    const paystackResponse = await fetch(
      `${this.paystackBaseUrl}/transaction/initialize`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.paystackSecretKey}`,
        },
        body: JSON.stringify({
          email,
          amount: amountInKobo,
          reference,
          metadata: {
            businessId,
            subscriptionId,
          },
        }),
      },
    );

    const paystackData = await paystackResponse.json();
    if (!paystackData.status) {
      throw new BadRequestException(
        paystackData.message || 'Failed to initialize payment',
      );
    }

    await this.prisma.paymentTransaction.create({
      data: {
        reference,
        amount: amountInNaira,
        currency: 'NGN',
        status: 'PENDING',
        provider: 'PAYSTACK',
        businessId,
        subscriptionId,
      },
    });

    return {
      reference,
      authorizationUrl: paystackData.data.authorization_url,
      amountInNaira,
    };
  }

  async handleWebhook(req: any, headers: any) {
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    const signature = headers['x-paystack-signature'];

    if (!signature) {
      console.error('Missing signature');
      return { status: 'error', message: 'Missing signature' };
    }

    const hash = crypto
      .createHmac('sha512', secret)
      .update(req.body) // req.body is a Buffer because of express.raw
      .digest('hex');

    if (hash !== signature) {
      console.error('Invalid signature');
      return { status: 'error', message: 'Invalid signature' };
    }

    let payload: any;
    try {
      payload = JSON.parse(req.body.toString());
    } catch (error) {
      console.error('Invalid JSON', error);
      return { status: 'error', message: 'Invalid JSON' };
    }

    const event = payload.event;
    const data = payload.data;

    if (event === 'charge.success') {
      const reference = data.reference;
      const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();

      const transaction = await this.prisma.paymentTransaction.findUnique({
        where: { reference },
      });

      if (!transaction) {
        console.error('Transaction not found for reference:', reference);
        return { status: 'error', message: 'Transaction not found' };
      }

      if (transaction.status === 'SUCCESS') {
        return { status: 'already_processed' };
      }

      // Update payment transaction
      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          paidAt,
          channel: data.channel || null,
        },
      });

      // Get subscription with plan to compute end date based on interval
      const subscription = await this.prisma.tenantSubscription.findUnique({
        where: { subscriptionId: transaction.subscriptionId },
        include: { plan: true },
      });

      if (subscription) {
        let endDate = new Date();
        switch (subscription.plan.interval) {
          case 'MONTHLY':
            endDate.setMonth(endDate.getMonth() + 1);
            break;
          case 'QUARTERLY':
            endDate.setMonth(endDate.getMonth() + 3);
            break;
          case 'ANNUAL':
            endDate.setFullYear(endDate.getFullYear() + 1);
            break;
          default:
            endDate.setMonth(endDate.getMonth() + 1);
        }

        await this.prisma.tenantSubscription.update({
          where: { subscriptionId: subscription.subscriptionId },
          data: {
            status: 'ACTIVE',
            startDate: new Date(),
            endDate,
          },
        });

        // Mark invoice as paid
        const invoice = await this.prisma.subscriptionInvoice.findFirst({
          where: { subscriptionId: subscription.subscriptionId, status: 'unpaid' },
          orderBy: { dueDate: 'asc' },
        });

        if (invoice) {
          await this.prisma.subscriptionInvoice.update({
            where: { invoiceId: invoice.invoiceId },
            data: { status: 'paid', paidAt },
          });
        }

        // Send payment receipt email
        const business = await this.prisma.business.findUnique({
          where: { businessId: transaction.businessId },
          select: { businessEmail: true },
        });

        const recipientEmail = business?.businessEmail || null;
        if (recipientEmail) {
          await this.emailService.sendNotificationEmail(
            recipientEmail,
            'Payment Received',
            'Subscription payment successful',
            `Your payment of ₦${Number(transaction.amount).toLocaleString()} has been received and your subscription is now active.`,
            NotificationType.PAYMENT_RECEIVED,
            process.env.APP_BASE_URL || 'https://ogancore.com',
          );
        }
      }

      return { status: 'success' };
    }

    return { status: 'ignored' };
  }
}