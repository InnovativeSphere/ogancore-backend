import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    // Map frontend "name" to "productName"
    const data: any = {
      productName: dto.name,
      sku: dto.sku,
      barcode: dto.barcode,
      description: dto.description,
      categoryId: dto.categoryId,
      brandId: dto.brandId,
      unit: dto.unit,
      costPrice: dto.costPrice,
      sellingPrice: dto.sellingPrice,
      wholesalePrice: dto.wholesalePrice,
      taxRate: dto.taxRate,
      discount: dto.discount,
      image: dto.image,
      reorderLevel: dto.stockAlertLevel ?? 0,
      trackInventory: dto.trackInventory ?? true,
      status: dto.status || 'active',
    };

    // Validate category exists
    const category = await this.prisma.category.findUnique({
      where: { categoryId: dto.categoryId },
    });
    if (!category) throw new BadRequestException('Category not found');

    // Validate supplier if provided (existing supplierId remains optional in schema, but DTO doesn't include it)
    // We'll keep supplierId nullable; not required by frontend.

    // Barcode uniqueness among active products
    if (dto.barcode) {
      const existing = await this.prisma.product.findFirst({
        where: { barcode: dto.barcode, status: 'active' },
      });
      if (existing) throw new ConflictException('A product with this barcode already exists');
    }

    return this.prisma.product.create({
      data,
      include: { category: true, supplier: true },
    });
  }

  async findAll(filters?: { branchId?: number; categoryId?: number; search?: string }) {
    const where: any = { status: 'active' };

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters?.search) {
      where.OR = [
        { productName: { contains: filters.search } },
        { sku: { contains: filters.search } },
        { barcode: { contains: filters.search } },
      ];
    }

    // If branchId is provided, we might want to filter by inventory? Products are org-wide.
    // BranchId doesn't directly apply to products. But maybe we ignore it for now.
    return this.prisma.product.findMany({
      where,
      include: { category: true, supplier: true },
    });
  }

  async search(q: string) {
    return this.prisma.product.findMany({
      where: {
        status: 'active',
        OR: [
          { productName: { contains: q } },
          { sku: { contains: q } },
          { barcode: { contains: q } },
        ],
      },
      include: { category: true, supplier: true },
    });
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { barcode, status: 'active' },
      include: { category: true, supplier: true },
    });
    if (!product) throw new NotFoundException('Product not found for this barcode');
    return product;
  }

  async findBySku(sku: string) {
    const product = await this.prisma.product.findFirst({
      where: { sku, status: 'active' },
      include: { category: true, supplier: true },
    });
    if (!product) throw new NotFoundException('Product not found for this SKU');
    return product;
  }

  async findByCategory(categoryId: number) {
    return this.prisma.product.findMany({
      where: { categoryId, status: 'active' },
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

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id); // ensure exists

    const data: any = { ...dto };
    if (dto.name) {
      data.productName = dto.name;
      delete data.name;
    }
    if (dto.stockAlertLevel !== undefined) {
      data.reorderLevel = dto.stockAlertLevel;
      delete data.stockAlertLevel;
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { categoryId: dto.categoryId } });
      if (!category) throw new BadRequestException('Category not found');
    }

    return this.prisma.product.update({
      where: { productId: id },
      data,
      include: { category: true, supplier: true },
    });
  }

  async updatePricing(id: number, dto: UpdateProductDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.costPrice !== undefined) data.costPrice = dto.costPrice;
    if (dto.sellingPrice !== undefined) data.sellingPrice = dto.sellingPrice;
    if (dto.wholesalePrice !== undefined) data.wholesalePrice = dto.wholesalePrice;

    return this.prisma.product.update({
      where: { productId: id },
      data,
      include: { category: true, supplier: true },
    });
  }

  async updateStatus(id: number, dto: UpdateProductDto) {
    await this.findOne(id);
    if (!dto.status) throw new BadRequestException('Status is required');
    return this.prisma.product.update({
      where: { productId: id },
      data: { status: dto.status },
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