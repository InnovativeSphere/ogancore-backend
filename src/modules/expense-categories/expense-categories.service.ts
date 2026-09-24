import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch the caller's role and business linkage.
   * Every method below leans on this so scoping stays consistent.
   */
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

  private isPlatformAdmin(roleName?: string): boolean {
    return roleName === 'SUPER_ADMIN' || roleName === 'IT_ADMIN';
  }

  // ─── CREATE ─────────────────────────────────────────────
  async create(dto: CreateExpenseCategoryDto, userId: number) {
    const user = await this.getUserContext(userId);
    const roleName = user.role?.roleName;
    const userBusinessId = user.branch?.businessId ?? null;

    let isGlobal = false;
    let scopeBusinessId: number | null = null;

    if (this.isPlatformAdmin(roleName)) {
      // Platform admin → global category
      isGlobal = true;
      scopeBusinessId = null;
    } else if (roleName === 'BUSINESS_ADMIN') {
      // Business admin → scoped to own business
      if (!userBusinessId) {
        throw new ForbiddenException('Your account is not linked to a business');
      }
      isGlobal = false;
      scopeBusinessId = userBusinessId;
    } else {
      throw new ForbiddenException(
        'You do not have permission to manage expense categories',
      );
    }

    // Uniqueness within the same scope
    const existing = await this.prisma.expenseCategory.findFirst({
      where: {
        categoryName: dto.categoryName,
        isActive: true,
        ...(isGlobal ? { isGlobal: true } : { businessId: scopeBusinessId }),
      },
    });
    if (existing) {
      throw new ConflictException(
        isGlobal
          ? 'A global expense category with this name already exists'
          : 'An expense category with this name already exists in your business',
      );
    }

    return this.prisma.expenseCategory.create({
      data: {
        categoryName: dto.categoryName,
        isGlobal,
        businessId: scopeBusinessId,
      },
    });
  }

  // ─── LIST ───────────────────────────────────────────────
  async findAll(includeInactive = false, userId: number) {
    const user = await this.getUserContext(userId);
    const roleName = user.role?.roleName;
    const userBusinessId = user.branch?.businessId ?? null;

    const where: any = {};
    if (!includeInactive) where.isActive = true;

    // Business admin → global + own business
    if (roleName === 'BUSINESS_ADMIN') {
      if (!userBusinessId) {
        throw new ForbiddenException('Your account is not linked to a business');
      }
      where.OR = [{ isGlobal: true }, { businessId: userBusinessId }];
    }
    // Platform admins → see all (no extra filter)

    const categories = await this.prisma.expenseCategory.findMany({
      where,
      orderBy: [{ isGlobal: 'desc' }, { categoryName: 'asc' }],
      include: {
        _count: { select: { expenses: { where: { isActive: true } } } },
      },
    });

    return categories.map(({ _count, ...category }) => ({
      ...category,
      totalExpenses: _count?.expenses ?? 0,
    }));
  }

  // ─── GET ONE ────────────────────────────────────────────
  async findOne(id: number, userId: number) {
    const user = await this.getUserContext(userId);
    const roleName = user.role?.roleName;
    const userBusinessId = user.branch?.businessId ?? null;

    const where: any = { categoryId: id };
    if (roleName === 'BUSINESS_ADMIN') {
      if (!userBusinessId) {
        throw new ForbiddenException('Your account is not linked to a business');
      }
      where.OR = [{ isGlobal: true }, { businessId: userBusinessId }];
    }

    const category = await this.prisma.expenseCategory.findFirst({
      where,
      include: {
        _count: { select: { expenses: { where: { isActive: true } } } },
      },
    });
    if (!category) throw new NotFoundException('Expense category not found');

    const { _count, ...rest } = category;
    return { ...rest, totalExpenses: _count?.expenses ?? 0 };
  }

  // ─── UPDATE ─────────────────────────────────────────────
  async update(id: number, dto: UpdateExpenseCategoryDto, userId: number) {
    const category = await this.findOne(id, userId);
    const user = await this.getUserContext(userId);
    const roleName = user.role?.roleName;

    // Business admin cannot touch global categories
    if (roleName === 'BUSINESS_ADMIN' && category.isGlobal) {
      throw new ForbiddenException('You cannot modify global expense categories');
    }
    if (
      roleName !== 'BUSINESS_ADMIN' &&
      !this.isPlatformAdmin(roleName)
    ) {
      throw new ForbiddenException(
        'You do not have permission to update expense categories',
      );
    }

    if (dto.categoryName) {
      const conflict = await this.prisma.expenseCategory.findFirst({
        where: {
          categoryName: dto.categoryName,
          isActive: true,
          categoryId: { not: id },
          ...(category.isGlobal
            ? { isGlobal: true }
            : { businessId: category.businessId }),
        },
      });
      if (conflict) {
        throw new ConflictException(
          'Another active expense category already uses this name in this scope',
        );
      }
    }

    return this.prisma.expenseCategory.update({
      where: { categoryId: id },
      data: dto,
    });
  }

  // ─── DEACTIVATE (soft delete) ───────────────────────────
  async remove(id: number, userId: number) {
    const category = await this.findOne(id, userId);
    const user = await this.getUserContext(userId);
    const roleName = user.role?.roleName;

    if (roleName === 'BUSINESS_ADMIN' && category.isGlobal) {
      throw new ForbiddenException(
        'You cannot deactivate global expense categories',
      );
    }
    if (roleName !== 'BUSINESS_ADMIN' && !this.isPlatformAdmin(roleName)) {
      throw new ForbiddenException(
        'You do not have permission to deactivate expense categories',
      );
    }

    // Soft delete — this category feeds financial records, we never hard-delete
    return this.prisma.expenseCategory.update({
      where: { categoryId: id },
      data: { isActive: false },
    });
  }
}