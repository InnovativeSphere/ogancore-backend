import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Ensure the caller is allowed to use this expense category.
   * Rules:
   *  - Platform admins (SUPER_ADMIN, IT_ADMIN) → any category
   *  - Global categories (isGlobal = true) → usable by everyone
   *  - Business-scoped categories → only by members of that business
   */
  private async assertCategoryAccess(categoryId: number, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        role: { select: { roleName: true } },
        branch: { select: { businessId: true } },
      },
    });
    if (!user) throw new BadRequestException('User not found');

    const category = await this.prisma.expenseCategory.findUnique({
      where: { categoryId },
    });
    if (!category || !category.isActive) {
      throw new BadRequestException('Expense category not found');
    }

    // Platform admins bypass scope checks
    const roleName = user.role?.roleName;
    if (roleName === 'SUPER_ADMIN' || roleName === 'IT_ADMIN') {
      return category;
    }

    // Global categories are usable by any business
    if (category.isGlobal) return category;

    // Business-scoped: must belong to the caller's business
    const userBusinessId = user.branch?.businessId ?? null;
    if (!userBusinessId || category.businessId !== userBusinessId) {
      // Same message for "not found" and "forbidden" — don't leak existence
      throw new ForbiddenException('Expense category not found');
    }

    return category;
  }

  async create(userId: number, dto: CreateExpenseDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { branchId: dto.branchId },
    });
    if (!branch) throw new BadRequestException('Branch not found');

    await this.assertCategoryAccess(dto.categoryId, userId);

    const expenseNumber = `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return this.prisma.expense.create({
      data: {
        branchId: dto.branchId,
        expenseNumber,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        reference: dto.reference,
        attachment: dto.attachment,
        status: dto.status || ExpenseStatus.PENDING,
        expenseDate: new Date(dto.expenseDate),
        recordedBy: userId,
      },
      include: {
        branch: true,
        category: true,
        recorder: { select: { userId: true, fullName: true, username: true } },
        approver: { select: { userId: true, fullName: true, username: true } },
      },
    });
  }

  async findAll(branchId?: number) {
    const where: any = { isActive: true };
    if (branchId) where.branchId = branchId;
    return this.prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      include: {
        branch: true,
        category: true,
        recorder: { select: { userId: true, fullName: true, username: true } },
        approver: { select: { userId: true, fullName: true, username: true } },
      },
    });
  }

  async findOne(id: number) {
    const expense = await this.prisma.expense.findUnique({
      where: { expenseId: id },
      include: {
        branch: true,
        category: true,
        recorder: { select: { userId: true, fullName: true, username: true } },
        approver: { select: { userId: true, fullName: true, username: true } },
      },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async update(id: number, userId: number, dto: UpdateExpenseDto) {
    await this.findOne(id);

    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { branchId: dto.branchId },
      });
      if (!branch) throw new BadRequestException('Branch not found');
    }
    if (dto.categoryId) {
      await this.assertCategoryAccess(dto.categoryId, userId);
    }

    // If status is being changed to APPROVED or REJECTED, set approver
    const data: any = { ...dto };
    if (
      dto.status === ExpenseStatus.APPROVED ||
      dto.status === ExpenseStatus.REJECTED
    ) {
      data.approvedBy = userId;
    }

    return this.prisma.expense.update({
      where: { expenseId: id },
      data,
      include: {
        branch: true,
        category: true,
        recorder: { select: { userId: true, fullName: true, username: true } },
        approver: { select: { userId: true, fullName: true, username: true } },
      },
    });
  }

  async approve(id: number, userId: number) {
    const expense = await this.findOne(id);
    if (expense.status === ExpenseStatus.APPROVED) {
      throw new BadRequestException('Expense already approved');
    }

    await this.notificationsService.createForUser(
      expense.recordedBy,
      NotificationType.EXPENSE_APPROVED,
      'Expense approved',
      `Your expense "${expense.title}" has been approved.`,
    );

    return this.prisma.expense.update({
      where: { expenseId: id },
      data: { status: ExpenseStatus.APPROVED, approvedBy: userId },
      include: { category: true, branch: true },
    });
  }

  async reject(id: number, userId: number) {
    const expense = await this.findOne(id);
    if (expense.status === ExpenseStatus.REJECTED) {
      throw new BadRequestException('Expense already rejected');
    }

    await this.notificationsService.createForUser(
      expense.recordedBy,
      NotificationType.EXPENSE_REJECTED,
      'Expense rejected',
      `Your expense "${expense.title}" was rejected.`,
    );

    return this.prisma.expense.update({
      where: { expenseId: id },
      data: { status: ExpenseStatus.REJECTED, approvedBy: userId },
      include: { category: true, branch: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.expense.update({
      where: { expenseId: id },
      data: { isActive: false },
    });
  }
}