import {
  Injectable,
  BadRequestException,
  NotFoundException,
  RawBodyRequest,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import * as crypto from 'crypto';
import { EmailService } from '../email/email.service';
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
    // Determine the subscription or plan to pay for
    let businessId: number;
    let subscriptionId: number;
    let amountInNaira: number;
    let email: string;

    if (dto.subscriptionId) {
      // Find the subscription and get business info
      const subscription = await this.prisma.tenantSubscription.findUnique({
        where: { subscriptionId: dto.subscriptionId },
        include: { business: true, plan: true },
      });
      if (!subscription) throw new NotFoundException('Subscription not found');

      // Ensure the user's business matches the subscription's business
      const user = await this.prisma.user.findUnique({
        where: { userId },
        include: { branch: { include: { business: true } } },
      });
      if (
        !user?.branch?.business ||
        user.branch.business.businessId !== subscription.businessId
      ) {
        throw new BadRequestException(
          'You can only pay for your own subscription',
        );
      }

      businessId = subscription.businessId;
      subscriptionId = subscription.subscriptionId;
      amountInNaira = Number(subscription.plan.price);
      email = subscription.business.businessEmail || user.email;
    } else if (dto.planId) {
      // For a new subscription, find the business via user's branch
      const user = await this.prisma.user.findUnique({
        where: { userId },
        include: { branch: { include: { business: true } } },
      });
      if (!user?.branch?.business) {
        throw new BadRequestException(
          'Your account is not linked to a business',
        );
      }

      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { planId: dto.planId },
      });
      if (!plan) throw new NotFoundException('Plan not found');

      // Check if business already has active subscription; if so, don't allow new one unless trial? For simplicity, we'll not create subscription now, just return a payment for plan.
      // But we need subscriptionId to store in PaymentTransaction. So we'll create a pending subscription first? For MVP, assume subscription already exists (created during registration).
      throw new BadRequestException(
        'For new plan payments, please use subscriptionId from your active trial.',
      );
    } else {
      throw new BadRequestException('Provide either subscriptionId or planId');
    }

    // Generate a unique reference
    const reference = `OGANCORE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const amountInKobo = Math.round(amountInNaira * 100);

    // Call Paystack to initialize transaction
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

    // Store the payment transaction
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

    // Verify signature
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
      const amount = data.amount / 100; // Convert from kobo to naira
      const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();

      // Find our transaction record
      const transaction = await this.prisma.paymentTransaction.findUnique({
        where: { reference },
      });

      if (!transaction) {
        console.error('Transaction not found for reference:', reference);
        return { status: 'error', message: 'Transaction not found' };
      }

      // Idempotency: if already processed as success, ignore
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

      // Fetch business email
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
      // Activate subscription
      await this.prisma.tenantSubscription.update({
        where: { subscriptionId: transaction.subscriptionId },
        data: {
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      // Mark invoice as paid
      const invoice = await this.prisma.subscriptionInvoice.findFirst({
        where: { subscriptionId: transaction.subscriptionId, status: 'unpaid' },
        orderBy: { dueDate: 'asc' },
      });

      if (invoice) {
        await this.prisma.subscriptionInvoice.update({
          where: { invoiceId: invoice.invoiceId },
          data: { status: 'paid', paidAt },
        });
      }

      return { status: 'success' };
    }

    // Ignore other events for now
    return { status: 'ignored' };
  }
}
