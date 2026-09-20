import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: { role: true, branch: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.excludePassword(user);
  }

  async updateProfile(userId: number, dto: UpdateUserDto) {
    const { roleId, branchId, status, ...safeDto } = dto as any;
    const user = await this.prisma.user.update({
      where: { userId },
      data: safeDto,
      include: { role: true, branch: true },
    });
    return this.excludePassword(user);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { userId },
      data: { passwordHash },
    });
    return { message: 'Password changed successfully' };
  }

  // ─── List users (scoped by role) ────────────────────────────
  async findAll(requesterUserId: number) {
    const requester = await this.prisma.user.findUnique({
      where: { userId: requesterUserId },
      include: { role: true, branch: { include: { business: true } } },
    });
    if (!requester) throw new NotFoundException('Requester not found');

    // Business admin: only users in their business
    if (requester.role.roleName === 'BUSINESS_ADMIN') {
      const businessId = requester.branch?.businessId;
      if (!businessId) {
        throw new ForbiddenException('Your account is not linked to a business');
      }

      const branches = await this.prisma.branch.findMany({
        where: { businessId },
        select: { branchId: true },
      });
      const branchIds = branches.map((b) => b.branchId);

      const users = await this.prisma.user.findMany({
        where: { branchId: { in: branchIds } },
        include: { role: true, branch: true },
      });
      return users.map((u) => this.excludePassword(u));
    }

    // Platform admins: all users
    const users = await this.prisma.user.findMany({
      include: { role: true, branch: true },
    });
    return users.map((u) => this.excludePassword(u));
  }

  async create(dto: CreateUserDto, creatorUserId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { branchId: dto.branchId },
    });
    if (!branch) throw new BadRequestException('Branch not found');

    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingEmail) throw new ConflictException('Email already registered');

    const existingUsername = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existingUsername) throw new ConflictException('Username already taken');

    const creator = await this.prisma.user.findUnique({
      where: { userId: creatorUserId },
      include: { role: true, branch: { include: { business: true } } },
    });
    if (!creator) throw new NotFoundException('Creator not found');

    if (creator.role.roleName === 'BUSINESS_ADMIN') {
      const creatorBusinessId = creator.branch?.businessId;
      if (!creatorBusinessId) {
        throw new ForbiddenException('Your account is not linked to a business');
      }

      if (branch.businessId !== creatorBusinessId) {
        throw new ForbiddenException('You can only create users in branches of your own business');
      }

      const targetRole = await this.prisma.role.findUnique({ where: { roleId: dto.roleId } });
      if (!targetRole) throw new BadRequestException('Role not found');

      const allowedBusinessRoles = ['USER', 'LOAN_OFFICER', 'CREDIT_REVIEWER', 'MANAGEMENT'];
      if (!allowedBusinessRoles.includes(targetRole.roleName)) {
        throw new ForbiddenException(
          'You can only assign business-scoped roles: USER, LOAN_OFFICER, CREDIT_REVIEWER, or MANAGEMENT.',
        );
      }

      const subscription = await this.prisma.tenantSubscription.findFirst({
        where: {
          businessId: creatorBusinessId,
          status: { in: ['TRIAL', 'ACTIVE', 'GRACE'] },
        },
        include: { plan: true },
      });

      if (subscription?.plan?.maxUsers != null) {
        const branches = await this.prisma.branch.findMany({
          where: { businessId: creatorBusinessId },
          select: { branchId: true },
        });
        const branchIds = branches.map((b) => b.branchId);

        const userCount = await this.prisma.user.count({
          where: { branchId: { in: branchIds } },
        });

        if (userCount >= subscription.plan.maxUsers) {
          throw new ForbiddenException(
            `Your current plan allows a maximum of ${subscription.plan.maxUsers} user(s).`,
          );
        }
      }
    } else {
      if (!branch.isActive) throw new BadRequestException('Branch is inactive');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        username: dto.username,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        roleId: dto.roleId,
        branchId: dto.branchId,
        status: dto.status || 'ACTIVE',
      },
      include: { role: true, branch: true },
    });
    return this.excludePassword(user);
  }

  async update(userId: number, dto: UpdateUserDto, requesterUserId: number) {
    const requester = await this.prisma.user.findUnique({
      where: { userId: requesterUserId },
      include: { role: true, branch: { include: { business: true } } },
    });
    if (!requester) throw new NotFoundException('Requester not found');

    const target = await this.prisma.user.findUnique({
      where: { userId },
      include: { branch: true },
    });
    if (!target) throw new NotFoundException('User not found');

    if (requester.role.roleName === 'BUSINESS_ADMIN') {
      const requesterBusinessId = requester.branch?.businessId;
      if (!requesterBusinessId) {
        throw new ForbiddenException('Your account is not linked to a business');
      }

      const targetBranch = await this.prisma.branch.findUnique({
        where: { branchId: target.branchId },
        select: { businessId: true },
      });
      if (!targetBranch || targetBranch.businessId !== requesterBusinessId) {
        throw new ForbiddenException('You can only update users in your own business');
      }

      const allowedUpdates: any = {};

      if (dto.fullName !== undefined) allowedUpdates.fullName = dto.fullName;
      if (dto.username !== undefined) allowedUpdates.username = dto.username;
      if (dto.phone !== undefined) allowedUpdates.phone = dto.phone;
      if (dto.status !== undefined) allowedUpdates.status = dto.status;

      if (dto.roleId !== undefined) {
        const targetRole = await this.prisma.role.findUnique({ where: { roleId: dto.roleId } });
        if (!targetRole) throw new BadRequestException('Role not found');
        const allowedRoles = ['USER', 'LOAN_OFFICER', 'CREDIT_REVIEWER', 'MANAGEMENT'];
        if (!allowedRoles.includes(targetRole.roleName)) {
          throw new ForbiddenException('Business admin can only assign business-scoped roles');
        }
        allowedUpdates.roleId = dto.roleId;
      }

      if (dto.branchId !== undefined) {
        const newBranch = await this.prisma.branch.findUnique({ where: { branchId: dto.branchId } });
        if (!newBranch) throw new BadRequestException('Branch not found');
        if (newBranch.businessId !== requesterBusinessId) {
          throw new ForbiddenException('Can only assign users to branches in your own business');
        }
        allowedUpdates.branchId = dto.branchId;
      }

      if (allowedUpdates.username) {
        const existing = await this.prisma.user.findFirst({
          where: { username: allowedUpdates.username, userId: { not: userId } },
        });
        if (existing) throw new ConflictException('Username already taken');
      }

      const updated = await this.prisma.user.update({
        where: { userId },
        data: allowedUpdates,
        include: { role: true, branch: true },
      });
      return this.excludePassword(updated);
    }

    const updated = await this.prisma.user.update({
      where: { userId },
      data: dto,
      include: { role: true, branch: true },
    });
    return this.excludePassword(updated);
  }

  // ─── Deactivate user (scoped) ───────────────────────────────
  async remove(userId: number, requesterUserId: number) {
    const requester = await this.prisma.user.findUnique({
      where: { userId: requesterUserId },
      include: { role: true, branch: { include: { business: true } } },
    });
    if (!requester) throw new NotFoundException('Requester not found');

    if (requesterUserId === userId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    const target = await this.prisma.user.findUnique({
      where: { userId },
      include: { branch: true },
    });
    if (!target) throw new NotFoundException('User not found');

    if (requester.role.roleName === 'BUSINESS_ADMIN') {
      const requesterBusinessId = requester.branch?.businessId;
      if (!requesterBusinessId) {
        throw new ForbiddenException('Your account is not linked to a business');
      }

      const targetBranch = await this.prisma.branch.findUnique({
        where: { branchId: target.branchId },
        select: { businessId: true },
      });
      if (!targetBranch || targetBranch.businessId !== requesterBusinessId) {
        throw new ForbiddenException('You can only deactivate users in your own business');
      }
    }

    await this.prisma.user.update({
      where: { userId },
      data: { status: 'INACTIVE' },
    });
    return { message: 'User deactivated' };
  }

  private excludePassword(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}