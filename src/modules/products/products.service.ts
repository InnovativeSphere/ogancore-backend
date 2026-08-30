import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns an array of branch IDs the user is allowed to access,
   * or null if the user has no business scoping (platform roles).
   */
  private async getAllowedBranchIds(userId?: number): Promise<number[] | null> {
    if (!userId) return null;

    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        role: true,
        branch: { include: { business: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // Only business admins and management are scoped to their business
    const roleName = user.role?.roleName;
    if (roleName !== 'BUSINESS_ADMIN' && roleName !== 'MANAGEMENT') {
      return null; // platform roles see all
    }

    const businessId = user.branch?.businessId;
    if (!businessId) {
      throw new ForbiddenException('Your account is not linked to a business');
    }

    const branches = await this.prisma.branch.findMany({
      where: { businessId },
      select: { branchId: true },
    });

    return branches.map((b) => b.branchId);
  }

  /**
   * Ensure the provided branchId belongs to the user's business,
   * or set it to the user's own branch if not provided.
   */
  private async resolveBranchId(userId: number, branchId?: number): Promise<number | null> {
    const allowed = await this.getAllowedBranchIds(userId);
    if (allowed === null) {
      return branchId ?? null; // platform roles: no restriction
    }

    if (!branchId) {
      // Default to user's own branch
      const user = await this.prisma.user.findUnique({ where: { userId } });
      return user?.branchId ?? null;
    }

    if (!allowed.includes(branchId)) {
      throw new ForbiddenException('You can only manage products in your own business');
    }

    return branchId;
  }

  async create(dto: CreateProductDto, userId: number) {
    const branchId = await this.resolveBranchId(userId, dto.branchId);

    const data: any = {
      productName: dto.name,
      sku: dto.sku,
      barcode: dto.barcode,
      description: dto.description,
      categoryId: dto.categoryId,
      supplierId: dto.supplierId,
      branchId,
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

    const category = await this.prisma.category.findUnique({
      where: { categoryId: dto.categoryId },
    });
    if (!category) throw new BadRequestException('Category not found');

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

  async findAll(filters: { branchId?: number; categoryId?: number; search?: string }, userId: number) {
    const allowedBranchIds = await this.getAllowedBranchIds(userId);
    const where: any = { status: 'active' };

    if (allowedBranchIds !== null) {
      where.branchId = { in: allowedBranchIds };
    } else if (filters?.branchId) {
      where.branchId = filters.branchId;
    }

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

    return this.prisma.product.findMany({
      where,
      include: { category: true, supplier: true },
    });
  }

  async search(q: string, userId: number) {
    const allowedBranchIds = await this.getAllowedBranchIds(userId);
    const where: any = {
      status: 'active',
      OR: [
        { productName: { contains: q } },
        { sku: { contains: q } },
        { barcode: { contains: q } },
      ],
    };

    if (allowedBranchIds !== null) {
      where.branchId = { in: allowedBranchIds };
    }

    return this.prisma.product.findMany({
      where,
      include: { category: true, supplier: true },
    });
  }

  async findByBarcode(barcode: string, userId: number) {
    const allowedBranchIds = await this.getAllowedBranchIds(userId);
    const where: any = { barcode, status: 'active' };
    if (allowedBranchIds !== null) {
      where.branchId = { in: allowedBranchIds };
    }

    const product = await this.prisma.product.findFirst({
      where,
      include: { category: true, supplier: true },
    });
    if (!product) throw new NotFoundException('Product not found for this barcode');
    return product;
  }

  async findBySku(sku: string, userId: number) {
    const allowedBranchIds = await this.getAllowedBranchIds(userId);
    const where: any = { sku, status: 'active' };
    if (allowedBranchIds !== null) {
      where.branchId = { in: allowedBranchIds };
    }

    const product = await this.prisma.product.findFirst({
      where,
      include: { category: true, supplier: true },
    });
    if (!product) throw new NotFoundException('Product not found for this SKU');
    return product;
  }

  async findByCategory(categoryId: number, userId: number) {
    const allowedBranchIds = await this.getAllowedBranchIds(userId);
    const where: any = { categoryId, status: 'active' };
    if (allowedBranchIds !== null) {
      where.branchId = { in: allowedBranchIds };
    }

    return this.prisma.product.findMany({
      where,
      include: { category: true, supplier: true },
    });
  }

  async findOne(id: number, userId: number) {
    const allowedBranchIds = await this.getAllowedBranchIds(userId);
    const product = await this.prisma.product.findUnique({
      where: { productId: id },
      include: { category: true, supplier: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (allowedBranchIds !== null && product.branchId !== null && !allowedBranchIds.includes(product.branchId)) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: number, dto: UpdateProductDto, userId: number) {
    await this.findOne(id, userId);

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

  async updatePricing(id: number, dto: UpdateProductDto, userId: number) {
    await this.findOne(id, userId);
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

  async updateStatus(id: number, dto: UpdateProductDto, userId: number) {
    await this.findOne(id, userId);
    if (!dto.status) throw new BadRequestException('Status is required');
    return this.prisma.product.update({
      where: { productId: id },
      data: { status: dto.status },
      include: { category: true, supplier: true },
    });
  }

  async remove(id: number, userId: number) {
    await this.findOne(id, userId);
    return this.prisma.product.update({
      where: { productId: id },
      data: { status: 'inactive' },
    });
  }
}