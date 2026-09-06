import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUserBusinessId(userId: number): Promise<number | null> {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        role: { select: { roleName: true } },
        branch: { select: { businessId: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user.branch?.businessId ?? null;
  }

  private async isBusinessAdmin(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { role: { select: { roleName: true } } },
    });
    return user?.role?.roleName === 'BUSINESS_ADMIN';
  }

  async create(dto: CreateCategoryDto, userId: number) {
    const businessId = await this.getUserBusinessId(userId);
    if (await this.isBusinessAdmin(userId) && !businessId) {
      throw new ForbiddenException('Your account is not linked to a business');
    }

    // For business admin, scope uniqueness to their business
    const existing = await this.prisma.category.findFirst({
      where: {
        categoryName: dto.categoryName,
        isActive: true,
        ...(businessId ? { businessId } : {}),
      },
    });
    if (existing) {
      throw new ConflictException('A category with this name already exists');
    }

    return this.prisma.category.create({
      data: {
        ...dto,
        ...(businessId ? { businessId } : {}),
      },
    });
  }

  async findAll(includeInactive = false, userId: number) {
    const businessId = await this.getUserBusinessId(userId);
    const where: any = {};
    if (!includeInactive) where.isActive = true;
    if (await this.isBusinessAdmin(userId)) {
      if (!businessId) throw new ForbiddenException('Your account is not linked to a business');
      where.businessId = businessId;
    }

    const categories = await this.prisma.category.findMany({
      where,
      include: {
        _count: { select: { products: { where: { status: 'active' } } } },
      },
    });

    return categories.map(({ _count, ...category }) => ({
      ...category,
      totalProducts: _count?.products ?? 0,
    }));
  }

  async findOne(id: number, userId: number) {
    const businessId = await this.getUserBusinessId(userId);
    const where: any = { categoryId: id };
    if (await this.isBusinessAdmin(userId)) {
      if (!businessId) throw new ForbiddenException('Your account is not linked to a business');
      where.businessId = businessId;
    }

    const category = await this.prisma.category.findFirst({
      where,
      include: {
        _count: { select: { products: { where: { status: 'active' } } } },
      },
    });
    if (!category) throw new NotFoundException('Category not found');

    const { _count, ...rest } = category;
    return { ...rest, totalProducts: _count?.products ?? 0 };
  }

  async update(id: number, dto: UpdateCategoryDto, userId: number) {
    const category = await this.findOne(id, userId);
    // For uniqueness, scope to business if business admin
    const businessId = await this.getUserBusinessId(userId);
    if (dto.categoryName) {
      const conflict = await this.prisma.category.findFirst({
        where: {
          categoryName: dto.categoryName,
          isActive: true,
          categoryId: { not: id },
          ...(businessId ? { businessId } : {}),
        },
      });
      if (conflict) {
        throw new ConflictException('Another active category already uses this name');
      }
    }
    return this.prisma.category.update({
      where: { categoryId: id },
      data: dto,
    });
  }

  async remove(id: number, userId: number) {
    const category = await this.findOne(id, userId);

    const productCount = await this.prisma.product.count({
      where: { categoryId: id, status: 'active' },
    });

    if (productCount > 0) {
      return this.prisma.category.update({
        where: { categoryId: id },
        data: { isActive: false },
      });
    }

    return this.prisma.category.delete({ where: { categoryId: id } });
  }
}