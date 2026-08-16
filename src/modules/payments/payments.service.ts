import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async addPayment(saleId: number, dto: CreatePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { saleId },
        include: { payments: true },
      });
      if (!sale) throw new NotFoundException('Sale not found');
      if (sale.status === 'RETURNED') {
        throw new BadRequestException('Cannot pay a returned sale');
      }

      const totalPaid = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const outstanding = Number(sale.grandTotal) - totalPaid;

      if (outstanding <= 0) {
        throw new BadRequestException('Sale is already fully paid');
      }

      if (Number(dto.amount) > outstanding) {
        throw new BadRequestException(`Amount exceeds outstanding balance (${outstanding})`);
      }

      const payment = await tx.payment.create({
        data: {
          saleId,
          paymentMethod: dto.method,
          amount: Number(dto.amount),
          paymentDate: new Date(),
          referenceNumber: dto.reference,
          status: PaymentStatus.PAID,
          currency: 'NGN',
        },
      });

      const updatedSale = await tx.sale.findUnique({
        where: { saleId },
        include: { payments: true },
      });

      const newTotalPaid = updatedSale!.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const newOutstanding = Number(updatedSale!.grandTotal) - newTotalPaid;

      let saleStatus = updatedSale!.status;
      let paymentStatus: PaymentStatus = PaymentStatus.PARTIALLY_PAID;
      if (newOutstanding === 0) {
        paymentStatus = PaymentStatus.PAID;
        saleStatus = 'COMPLETED';
      } else if (newTotalPaid === 0) {
        paymentStatus = PaymentStatus.UNPAID;
      }

      await tx.sale.update({
        where: { saleId },
        data: { status: saleStatus as any },
      });

      return {
        payment,
        sale: {
          id: updatedSale!.saleId,
          transactionNumber: updatedSale!.invoiceNumber,
          total: Number(updatedSale!.grandTotal),
          previousAmountPaid: totalPaid,
          amountPaid: newTotalPaid,
          outstandingAmount: newOutstanding,
          saleStatus: updatedSale!.status,
          paymentStatus,
        },
      };
    });
  }

  async listPayments(saleId: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { saleId },
      include: { payments: true },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale.payments;
  }
}