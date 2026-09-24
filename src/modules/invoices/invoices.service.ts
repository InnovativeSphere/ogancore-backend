import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { InvoiceStatus, InvoiceType } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────
  private isPlatformAdmin(roleName?: string): boolean {
    return roleName === 'SUPER_ADMIN' || roleName === 'IT_ADMIN';
  }

  private async getUserContext(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        role: { select: { roleName: true } },
        branch: { select: { businessId: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private generateInvoiceNumber(): string {
    return `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  private computeTotal(amount: number, tax = 0, discount = 0): number {
    const total = amount + tax - discount;
    if (total < 0) {
      throw new BadRequestException(
        'Discount cannot exceed amount + tax',
      );
    }
    return total;
  }

  // ─── CREATE ─────────────────────────────────────────────
  async create(dto: CreateInvoiceDto, userId: number) {
    const user = await this.getUserContext(userId);
    const roleName = user.role?.roleName;
    const userBusinessId = user.branch?.businessId ?? null;

    // Resolve businessId
    let businessId: number;
    if (this.isPlatformAdmin(roleName)) {
      if (!dto.businessId) {
        throw new BadRequestException(
          'businessId is required for platform admins',
        );
      }
      businessId = dto.businessId;
      const business = await this.prisma.business.findUnique({
        where: { businessId },
      });
      if (!business) throw new BadRequestException('Business not found');
    } else if (roleName === 'BUSINESS_ADMIN') {
      if (!userBusinessId) {
        throw new ForbiddenException('Your account is not linked to a business');
      }
      businessId = userBusinessId;
    } else {
      throw new ForbiddenException(
        'You do not have permission to create invoices',
      );
    }

    // Validate branch belongs to this business
    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { branchId: dto.branchId },
      });
      if (!branch) throw new BadRequestException('Branch not found');
      if (branch.businessId !== businessId) {
        throw new ForbiddenException('Branch does not belong to this business');
      }
    }

    // Validate customer if provided
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { customerId: dto.customerId },
      });
      if (!customer) throw new BadRequestException('Customer not found');
    }

    // Validate supplier if provided
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { supplierId: dto.supplierId },
      });
      if (!supplier) throw new BadRequestException('Supplier not found');
    }

    // Reject creating a VOIDED invoice directly — use the void endpoint.
    if (dto.status === InvoiceStatus.VOIDED) {
      throw new BadRequestException(
        'Cannot create an invoice with VOIDED status. Use the void endpoint.',
      );
    }

    const tax = dto.tax ?? 0;
    const discount = dto.discount ?? 0;
    const totalAmount = this.computeTotal(dto.amount, tax, discount);

    const status = dto.status ?? InvoiceStatus.DRAFT;
    const paidAt = status === InvoiceStatus.PAID ? new Date() : null;

    return this.prisma.invoice.create({
      data: {
        invoiceNumber: this.generateInvoiceNumber(),
        invoiceType: dto.invoiceType ?? InvoiceType.GENERAL,
        businessId,
        branchId: dto.branchId ?? null,
        customerId: dto.customerId ?? null,
        supplierId: dto.supplierId ?? null,
        narration: dto.narration,
        amount: dto.amount,
        tax,
        discount,
        totalAmount,
        status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        paidAt,
      },
      include: {
        business: { select: { businessId: true, businessName: true } },
        branch: { select: { branchId: true, branchName: true } },
        customer: { select: { customerId: true, name: true, phone: true } },
        supplier: { select: { supplierId: true, supplierName: true } },
      },
    });
  }

  // ─── LIST ───────────────────────────────────────────────
  async findAll(
    userId: number,
    filters: {
      businessId?: number;
      branchId?: number;
      status?: InvoiceStatus;
      invoiceType?: InvoiceType;
    } = {},
  ) {
    const user = await this.getUserContext(userId);
    const roleName = user.role?.roleName;
    const userBusinessId = user.branch?.businessId ?? null;

    const where: any = {};

    if (roleName === 'BUSINESS_ADMIN') {
      if (!userBusinessId) {
        throw new ForbiddenException('Your account is not linked to a business');
      }
      where.businessId = userBusinessId;
    } else if (this.isPlatformAdmin(roleName)) {
      if (filters.businessId) where.businessId = filters.businessId;
    } else {
      throw new ForbiddenException(
        'You do not have permission to view invoices',
      );
    }

    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.status) where.status = filters.status;
    if (filters.invoiceType) where.invoiceType = filters.invoiceType;

    return this.prisma.invoice.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      include: {
        business: { select: { businessId: true, businessName: true } },
        branch: { select: { branchId: true, branchName: true } },
        customer: { select: { customerId: true, name: true, phone: true } },
        supplier: { select: { supplierId: true, supplierName: true } },
      },
    });
  }

  // ─── GET ONE ────────────────────────────────────────────
  async findOne(id: number, userId: number) {
    const user = await this.getUserContext(userId);
    const roleName = user.role?.roleName;
    const userBusinessId = user.branch?.businessId ?? null;

    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceId: id },
      include: {
        business: { select: { businessId: true, businessName: true } },
        branch: { select: { branchId: true, branchName: true } },
        customer: { select: { customerId: true, name: true, phone: true } },
        supplier: { select: { supplierId: true, supplierName: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (
      roleName === 'BUSINESS_ADMIN' &&
      invoice.businessId !== userBusinessId
    ) {
      throw new NotFoundException('Invoice not found');
    }
    if (
      roleName !== 'BUSINESS_ADMIN' &&
      !this.isPlatformAdmin(roleName)
    ) {
      throw new ForbiddenException(
        'You do not have permission to view invoices',
      );
    }

    return invoice;
  }

  // ─── UPDATE ─────────────────────────────────────────────
  async update(id: number, dto: UpdateInvoiceDto, userId: number) {
    const invoice = await this.findOne(id, userId);

    // Cannot modify a VOIDED or PAID invoice
    if (invoice.status === InvoiceStatus.VOIDED) {
      throw new BadRequestException('Cannot update a voided invoice');
    }
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot update a paid invoice');
    }

    // Validate branch/customer/supplier if they're being changed
    if (dto.branchId !== undefined && dto.branchId !== null) {
      const branch = await this.prisma.branch.findUnique({
        where: { branchId: dto.branchId },
      });
      if (!branch) throw new BadRequestException('Branch not found');
      if (branch.businessId !== invoice.businessId) {
        throw new ForbiddenException('Branch does not belong to this business');
      }
    }

    if (dto.customerId !== undefined && dto.customerId !== null) {
      const customer = await this.prisma.customer.findUnique({
        where: { customerId: dto.customerId },
      });
      if (!customer) throw new BadRequestException('Customer not found');
    }

    if (dto.supplierId !== undefined && dto.supplierId !== null) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { supplierId: dto.supplierId },
      });
      if (!supplier) throw new BadRequestException('Supplier not found');
    }

    // Recompute total if amount/tax/discount changed
    const nextAmount =
      dto.amount !== undefined ? dto.amount : Number(invoice.amount);
    const nextTax = dto.tax !== undefined ? dto.tax : Number(invoice.tax);
    const nextDiscount =
      dto.discount !== undefined ? dto.discount : Number(invoice.discount);
    const totalAmount = this.computeTotal(nextAmount, nextTax, nextDiscount);

    // Handle status transitions
    const data: any = {
      ...dto,
      totalAmount,
      amount: nextAmount,
      tax: nextTax,
      discount: nextDiscount,
    };
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);

    if (dto.status === InvoiceStatus.PAID && !invoice.paidAt) {
      data.paidAt = new Date();
    }
    if (dto.status === InvoiceStatus.VOIDED) {
      throw new BadRequestException(
        'Use the void endpoint to void an invoice',
      );
    }

    return this.prisma.invoice.update({
      where: { invoiceId: id },
      data,
      include: {
        business: { select: { businessId: true, businessName: true } },
        branch: { select: { branchId: true, branchName: true } },
        customer: { select: { customerId: true, name: true, phone: true } },
        supplier: { select: { supplierId: true, supplierName: true } },
      },
    });
  }

  // ─── VOID (soft delete) ─────────────────────────────────
  async void(id: number, dto: VoidInvoiceDto, userId: number) {
    const invoice = await this.findOne(id, userId);

    if (invoice.status === InvoiceStatus.VOIDED) {
      throw new BadRequestException('Invoice is already voided');
    }
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot void a paid invoice');
    }

    return this.prisma.invoice.update({
      where: { invoiceId: id },
      data: {
        status: InvoiceStatus.VOIDED,
        voidedAt: new Date(),
        voidedReason: dto.reason ?? null,
      },
      include: {
        business: { select: { businessId: true, businessName: true } },
        branch: { select: { branchId: true, branchName: true } },
      },
    });
  }
}