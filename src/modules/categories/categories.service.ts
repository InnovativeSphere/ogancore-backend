import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findFirst({
      where: { categoryName: dto.categoryName, isActive: true },
    });
    if (existing) {
      throw new ConflictException('A category with this name already exists');
    }
    return this.prisma.category.create({ data: dto });
  }

  async findAll(includeInactive = false) {
    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    return this.prisma.category.findMany({ where });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId: id },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);
    if (dto.categoryName) {
      const conflict = await this.prisma.category.findFirst({
        where: {
          categoryName: dto.categoryName,
          isActive: true,
          categoryId: { not: id },
        },
      });
      if (conflict) {
        throw new ConflictException('Another active category already uses this name');
      }
    }
    return this.prisma.category.update({ where: { categoryId: id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);

    // Check if any active products depend on this category
    const productCount = await this.prisma.product.count({
      where: { categoryId: id, status: 'active' },
    });

    if (productCount > 0) {
      // Soft-delete — products still reference it
      return this.prisma.category.update({
        where: { categoryId: id },
        data: { isActive: false },
      });
    }

    // Hard-delete — no dependencies
    return this.prisma.category.delete({ where: { categoryId: id } });
  }
}