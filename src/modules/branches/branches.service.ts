import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch current user with role name and business ID (if any).
   * Using select avoids extra data and keeps types clean.
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

  /**
   * Return the businessId for a BUSINESS_ADMIN.
   * Throws ForbiddenException if not a business admin or no business linked.
   */
  private async getBusinessIdForBusinessAdmin(userId: number): Promise<number> {
    const user = await this.getUserContext(userId);

    if (user.role?.roleName !== 'BUSINESS_ADMIN') {
      throw new ForbiddenException('Only business admins can manage branches');
    }

    const businessId = user.branch?.businessId;
    if (!businessId) {
      throw new ForbiddenException('Your account is not linked to a business');
    }

    return businessId;
  }

  /**
   * For BUSINESS_ADMIN, ensure the target branch belongs to their business.
   * Other roles bypass this check.
   */
  private async validateBranchOwnership(userId: number, branchId: number) {
    const user = await this.getUserContext(userId);

    if (user.role?.roleName === 'BUSINESS_ADMIN') {
      const businessId = user.branch?.businessId;
      if (!businessId) {
        throw new ForbiddenException('Your account is not linked to a business');
      }

      const branch = await this.prisma.branch.findUnique({
        where: { branchId },
        select: { businessId: true },
      });

      if (!branch || branch.businessId !== businessId) {
        throw new ForbiddenException('You can only manage branches of your own business');
      }
    }
  }

  async create(dto: CreateBranchDto, userId: number) {
    const businessId = await this.getBusinessIdForBusinessAdmin(userId);

    // Plan maxBranches limit enforcement
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: {
        businessId,
        status: { in: ['TRIAL', 'ACTIVE', 'GRACE'] },
      },
      include: { plan: true },
    });

    if (subscription?.plan?.maxBranches != null) {
      const branchCount = await this.prisma.branch.count({
        where: { businessId },
      });
      if (branchCount >= subscription.plan.maxBranches) {
        throw new ForbiddenException(
          `Your current plan allows a maximum of ${subscription.plan.maxBranches} branch(es).`,
        );
      }
    }

    const existing = await this.prisma.branch.findFirst({
      where: { branchName: dto.branchName, isActive: true, businessId },
    });
    if (existing) {
      throw new ConflictException('A branch with this name already exists in your business');
    }

    return this.prisma.branch.create({
      data: {
        ...dto,
        businessId,
      },
    });
  }

  async findAllActive(userId: number) {
    const user = await this.getUserContext(userId);

    if (user.role?.roleName === 'BUSINESS_ADMIN') {
      const businessId = user.branch?.businessId;
      if (!businessId) throw new ForbiddenException('Business not found');
      return this.prisma.branch.findMany({
        where: { isActive: true, businessId },
      });
    }

    // Other authenticated roles see all active branches
    return this.prisma.branch.findMany({ where: { isActive: true } });
  }

  async findAll(userId: number) {
    const user = await this.getUserContext(userId);

    if (user.role?.roleName === 'BUSINESS_ADMIN') {
      const businessId = user.branch?.businessId;
      if (!businessId) throw new ForbiddenException('Business not found');
      return this.prisma.branch.findMany({ where: { businessId } });
    }

    // Admins / super admins see all branches
    return this.prisma.branch.findMany();
  }

  async findOne(id: number, userId: number) {
    const branch = await this.prisma.branch.findUnique({ where: { branchId: id } });
    if (!branch) throw new NotFoundException('Branch not found');

    await this.validateBranchOwnership(userId, id);
    return branch;
  }

  async update(id: number, dto: UpdateBranchDto, userId: number) {
    await this.validateBranchOwnership(userId, id);

    const branch = await this.prisma.branch.findUnique({ where: { branchId: id } });
    if (!branch) throw new NotFoundException('Branch not found');

    if (dto.branchName) {
      const conflict = await this.prisma.branch.findFirst({
        where: {
          branchName: dto.branchName,
          isActive: true,
          branchId: { not: id },
          businessId: branch.businessId,
        },
      });
      if (conflict) {
        throw new ConflictException('Another active branch in your business already uses this name');
      }
    }

    return this.prisma.branch.update({
      where: { branchId: id },
      data: dto,
    });
  }

  async remove(id: number, userId: number) {
    await this.validateBranchOwnership(userId, id);

    const branch = await this.prisma.branch.findUnique({ where: { branchId: id } });
    if (!branch) throw new NotFoundException('Branch not found');

    return this.prisma.branch.update({
      where: { branchId: id },
      data: { isActive: false },
    });
  }
}