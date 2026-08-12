import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    // Validate category exists
    const category = await this.prisma.category.findUnique({ where: { categoryId: dto.categoryId } });
    if (!category) throw new BadRequestException('Category not found');

    // Validate supplier if provided
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({ where: { supplierId: dto.supplierId } });
      if (!supplier) throw new BadRequestException('Supplier not found');
    }

    // Barcode uniqueness among active products
    if (dto.barcode) {
      const existing = await this.prisma.product.findFirst({
        where: { barcode: dto.barcode, status: 'active' },
      });
      if (existing) throw new ConflictException('A product with this barcode already exists');
    }

    return this.prisma.product.create({
      data: {
        ...dto,
        status: dto.status || 'active',
      },
      include: { category: true, supplier: true },
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      where: { status: 'active' },
      include: { category: true, supplier: true },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { productId: id },
      include: { category: true, supplier: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { barcode, status: 'active' },
      include: { category: true, supplier: true },
    });
    if (!product) throw new NotFoundException('Product not found for this barcode');
    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id); // ensure exists

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { categoryId: dto.categoryId } });
      if (!category) throw new BadRequestException('Category not found');
    }
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({ where: { supplierId: dto.supplierId } });
      if (!supplier) throw new BadRequestException('Supplier not found');
    }
    if (dto.barcode) {
      const conflict = await this.prisma.product.findFirst({
        where: { barcode: dto.barcode, status: 'active', productId: { not: id } },
      });
      if (conflict) throw new ConflictException('Another active product already uses this barcode');
    }

    return this.prisma.product.update({
      where: { productId: id },
      data: dto,
      include: { category: true, supplier: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { productId: id },
      data: { status: 'inactive' },
    });
  }
}