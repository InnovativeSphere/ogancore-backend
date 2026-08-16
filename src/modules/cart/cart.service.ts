import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { ScanBarcodeDto } from './dto/scan-barcode.dto';
import { PaymentMethod } from '@prisma/client';
import { Prisma, SaleStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async recalculateCart(cartId: number) {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
      include: { product: true },
    });

    let subtotal = 0;
    let totalQuantity = 0;

    for (const item of items) {
      const unitPrice = Number(item.unitPrice);
      const lineTotal = unitPrice * item.quantity - Number(item.discount);
      subtotal += lineTotal;
      totalQuantity += item.quantity;
    }

    const cart = await this.prisma.cart.findUnique({ where: { cartId } });
    if (!cart) throw new NotFoundException('Cart not found');

    let discountAmount = 0;
    if (cart.discountType === 'FIXED') {
      discountAmount = Number(cart.discountValue || 0);
    } else if (cart.discountType === 'PERCENTAGE') {
      discountAmount = (subtotal * Number(cart.discountValue || 0)) / 100;
    }

    const total = subtotal - discountAmount;
    await this.prisma.cart.update({
      where: { cartId },
      data: { subtotal, discount: discountAmount, tax: 0, total },
    });

    return {
      cartId,
      subtotal,
      discount: discountAmount,
      tax: 0,
      total,
      totalQuantity,
      itemCount: items.length,
    };
  }

  async createCart(userId: number, dto: CreateCartDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { branchId: dto.branchId },
    });
    if (!branch) throw new BadRequestException('Branch not found');

    const cart = await this.prisma.cart.create({
      data: {
        branchId: dto.branchId,
        posId: dto.posId,
        sessionId: dto.sessionId,
        cashierId: dto.cashierId || userId,
        customerId: dto.customerId,
      },
      include: { items: true },
    });
    return cart;
  }

  async addItem(cartId: number, dto: AddCartItemDto) {
    const cart = await this.prisma.cart.findUnique({ where: { cartId } });
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.status !== 'ACTIVE') throw new BadRequestException('Cart is not active');

    const product = await this.prisma.product.findUnique({
      where: { productId: dto.productId },
    });
    if (!product || product.status !== 'active') {
      throw new BadRequestException('Product not available');
    }

    // Check existing item with same productId
    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId: dto.productId } },
    });

    if (existing) {
      const updated = await this.prisma.cartItem.update({
        where: { cartItemId: existing.cartItemId },
        data: {
          quantity: existing.quantity + dto.quantity,
          total: Number(existing.unitPrice) * (existing.quantity + dto.quantity),
        },
        include: { product: true },
      });
      await this.recalculateCart(cartId);
      return updated;
    }

    const unitPrice = Number(product.sellingPrice);
    const total = unitPrice * dto.quantity;

    const item = await this.prisma.cartItem.create({
      data: {
        cartId,
        productId: dto.productId,
        quantity: dto.quantity,
        unitPrice,
        discount: 0,
        tax: 0,
        total,
      },
      include: { product: true },
    });

    await this.recalculateCart(cartId);
    return item;
  }

  async scanBarcode(cartId: number, dto: ScanBarcodeDto) {
    const product = await this.prisma.product.findFirst({
      where: { barcode: dto.barcode, status: 'active' },
    });
    if (!product) throw new BadRequestException('Product not found for barcode');

    return this.addItem(cartId, { productId: product.productId, quantity: dto.quantity || 1 });
  }

  async updateItem(cartId: number, itemId: number, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { cartItemId: itemId },
    });
    if (!item || item.cartId !== cartId) throw new NotFoundException('Cart item not found');

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { cartItemId: itemId } });
    } else {
      await this.prisma.cartItem.update({
        where: { cartItemId: itemId },
        data: {
          quantity: dto.quantity,
          total: Number(item.unitPrice) * dto.quantity - Number(item.discount),
        },
      });
    }
    await this.recalculateCart(cartId);
    return this.getCart(cartId);
  }

  async removeItem(cartId: number, itemId: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { cartItemId: itemId },
    });
    if (!item || item.cartId !== cartId) throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.delete({ where: { cartItemId: itemId } });
    await this.recalculateCart(cartId);
    return this.getCart(cartId);
  }

  async applyDiscount(cartId: number, dto: ApplyDiscountDto) {
    const cart = await this.prisma.cart.findUnique({ where: { cartId } });
    if (!cart) throw new NotFoundException('Cart not found');

    await this.prisma.cart.update({
      where: { cartId },
      data: {
        discountType: dto.type,
        discountValue: dto.value,
        discountReason: dto.reason,
      },
    });
    await this.recalculateCart(cartId);
    return this.getCart(cartId);
  }

  async getCart(cartId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { cartId },
      include: {
        items: {
          include: { product: true },
        },
        customer: true,
        cashier: { select: { userId: true, fullName: true, username: true } },
        branch: true,
      },
    });
    if (!cart) throw new NotFoundException('Cart not found');

    const totals = await this.recalculateCart(cartId);
    return {
      ...cart,
      ...totals,
    };
  }

  async getActiveCart(branchId: number, posId?: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { branchId, posId, status: 'ACTIVE' },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (!cart) throw new NotFoundException('No active cart found');
    return this.getCart(cart.cartId);
  }

  async checkout(cartId: number, userId: number, dto: CheckoutCartDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { cartId },
      include: { items: true },
    });
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.status !== 'ACTIVE') throw new BadRequestException('Cart is not active');
    if (cart.items.length === 0) throw new BadRequestException('Cart is empty');

    // Recalculate totals before checkout
    const totals = await this.recalculateCart(cartId);
    const grandTotal = totals.total;

    // Validate payment
    const amountPaid = Number(dto.payment.amount);
    const paymentMethod = dto.payment.method;
    const customerId = dto.customerId || cart.customerId;
        if (customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { customerId },
      });
      if (!customer) {
        throw new BadRequestException('Customer not found');
      }
    }

    if (amountPaid < grandTotal && !customerId) {
      throw new BadRequestException('Customer is required for partial payment');
    }
    const change = amountPaid > grandTotal ? amountPaid - grandTotal : 0;

    // Create sale
    const transactionNumber = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const sale = await this.prisma.sale.create({
      data: {
        invoiceNumber: transactionNumber,
        customerId: customerId ?? null,
        userId: cart.cashierId,
        branchId: cart.branchId,
        saleDate: new Date(),
        totalAmount: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        grandTotal,
        posId: cart.posId,
        sessionId: cart.sessionId,
        notes: 'Cart checkout',
status: SaleStatus.COMPLETED,
      },
    });

    // Create sale items and update inventory
    for (const item of cart.items) {
      const product = await this.prisma.product.findUnique({ where: { productId: item.productId } });
      if (!product) throw new BadRequestException('Product not found');

      await this.prisma.saleItem.create({
        data: {
          saleId: sale.saleId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.total,
          discount: item.discount,
          tax: item.tax,
        },
      });

      const inventory = await this.prisma.inventory.findUnique({
        where: { productId_branchId: { productId: item.productId, branchId: cart.branchId } },
      });
      if (inventory) {
        await this.prisma.inventory.update({
          where: { inventoryId: inventory.inventoryId },
          data: { quantity: inventory.quantity - item.quantity },
        });
      }
      // Could create inventory movement here as well, but we'll keep for now
    }

    // Create payment
    const payment = await this.prisma.payment.create({
      data: {
        saleId: sale.saleId,
        paymentMethod,
        amount: amountPaid,
        paymentDate: new Date(),
        referenceNumber: `PAY-${Date.now()}`,
        status: PaymentStatus.PAID,
      },
    });

    // Mark cart as completed
    await this.prisma.cart.update({
      where: { cartId },
      data: { status: 'COMPLETED' },
    });

    return {
      sale,
      items: cart.items,
      payment,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: grandTotal,
      amountPaid,
      change,
    };
  }
}