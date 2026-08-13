import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

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
      if (sale.status === 'refunded') {
        throw new BadRequestException('Cannot pay a refunded sale');
      }

      // Calculate current outstanding
      const totalPaid = sale.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const outstanding = Number(sale.grandTotal) - totalPaid;

      if (outstanding <= 0) {
        throw new BadRequestException('Sale is already fully paid');
      }

      if (Number(dto.amount) > outstanding) {
        throw new BadRequestException(
          `Amount exceeds outstanding balance (${outstanding})`,
        );
      }

      const payment = await tx.payment.create({
        data: {
          saleId,
          paymentMethod: dto.paymentMethod,
          amount: Number(dto.amount),
          paymentDate: new Date(),
          referenceNumber: dto.referenceNumber,
          status: 'completed',
        },
      });

      // Recalculate and return updated sale with payment status
      const updatedSale = await tx.sale.findUnique({
        where: { saleId },
        include: { payments: true },
      });

      const newTotalPaid = updatedSale!.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const newOutstanding = Number(updatedSale!.grandTotal) - newTotalPaid;

      return {
        payment,
        updatedSale: {
          saleId: updatedSale!.saleId,
          grandTotal: updatedSale!.grandTotal,
          totalPaid: newTotalPaid,
          outstandingBalance: newOutstanding,
          paymentStatus:
            newOutstanding === 0 ? 'PAID' : 'PARTIAL',
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