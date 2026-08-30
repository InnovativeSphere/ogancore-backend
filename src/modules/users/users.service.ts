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

  // ─── Public profile (authenticated user) ────────────
  async findProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: { role: true, branch: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.excludePassword(user);
  }

  // ─── Update own profile ─────────────────────────────
  async updateProfile(userId: number, dto: UpdateUserDto) {
    const { roleId, branchId, status, ...safeDto } = dto as any;
    const user = await this.prisma.user.update({
      where: { userId },
      data: safeDto,
      include: { role: true, branch: true },
    });
    return this.excludePassword(user);
  }

  // ─── Change own password ─────────────────────────────
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

  // ─── Admin: list all users ───────────────────────────
  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { role: true, branch: true },
    });
    return users.map((u) => this.excludePassword(u));
  }

  // ─── Admin: create user (full control, with business scoping) ───────────────
  async create(dto: CreateUserDto, creatorUserId: number) {
    // 1. Verify branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { branchId: dto.branchId },
    });
    if (!branch) throw new BadRequestException('Branch not found');

    // 2. Check uniqueness
    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingEmail) throw new ConflictException('Email already registered');

    const existingUsername = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existingUsername) throw new ConflictException('Username already taken');

    // 3. Get creator details
    const creator = await this.prisma.user.findUnique({
      where: { userId: creatorUserId },
      include: { role: true, branch: { include: { business: true } } },
    });
    if (!creator) throw new NotFoundException('Creator not found');

    // 4. If creator is BUSINESS_ADMIN, enforce business scoping and role restrictions
    if (creator.role.roleName === 'BUSINESS_ADMIN') {
      const creatorBusinessId = creator.branch?.businessId;
      if (!creatorBusinessId) {
        throw new ForbiddenException('Your account is not linked to a business');
      }

      // Branch must belong to creator's business
      if (branch.businessId !== creatorBusinessId) {
        throw new ForbiddenException('You can only create users in branches of your own business');
      }

      // Role restriction: BUSINESS_ADMIN can only assign business-scoped roles
      const targetRole = await this.prisma.role.findUnique({ where: { roleId: dto.roleId } });
      if (!targetRole) throw new BadRequestException('Role not found');

      const allowedBusinessRoles = ['USER', 'LOAN_OFFICER', 'CREDIT_REVIEWER', 'MANAGEMENT'];
      if (!allowedBusinessRoles.includes(targetRole.roleName)) {
        throw new ForbiddenException(
          'You can only assign business-scoped roles: USER, LOAN_OFFICER, CREDIT_REVIEWER, or MANAGEMENT.',
        );
      }
    } else {
      // Non-business admin (ADMIN, SUPER_ADMIN, IT_ADMIN) can create users in any branch
      // No additional checks needed, but we could optionally restrict to active branches
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

  // ─── Admin: update any user ──────────────────────────
  async update(userId: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { userId },
      data: dto,
      include: { role: true, branch: true },
    });
    return this.excludePassword(updated);
  }

  // ─── Admin: soft‑delete (deactivate) ────────────────
  async remove(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { userId },
      data: { status: 'INACTIVE' },
    });
    return { message: 'User deactivated' };
  }

  // ─── Helper: strip password hash from output ─────────
  private excludePassword(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}