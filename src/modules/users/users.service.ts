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
    // Only allow safe fields for self‑update
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

  // ─── Admin: create user (full control) ───────────────
  async create(dto: CreateUserDto) {
    // Check uniqueness
    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingEmail) throw new ConflictException('Email already registered');

    const existingUsername = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existingUsername) throw new ConflictException('Username already taken');

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