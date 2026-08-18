import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
     private readonly notificationsService: NotificationsService,
  ) {}

  async register(dto: RegisterDto) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Find the default low-privilege role
    const defaultRole = await this.prisma.role.findFirst({
      where: { roleName: 'USER' },
    });
    if (!defaultRole) {
      throw new BadRequestException('Default role not found');
    }

    // Find the default branch
    const defaultBranch = await this.prisma.branch.findFirst({
  where: { isActive: true },
});
    if (!defaultBranch) {
      throw new BadRequestException('Default branch not found');
    }

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        username: dto.username,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        roleId: defaultRole.roleId,
        branchId: defaultBranch.branchId,
      },
      select: {
        userId: true,
        fullName: true,
        username: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    await this.notificationsService.createForUser(
  user.userId,
  NotificationType.USER_WELCOME,
  'Welcome to OGANCORE',
  `Hi ${user.fullName}, your account has been created successfully.`,
);

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true, branch: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'LOCKED') {
      throw new UnauthorizedException('Account is locked. Contact administrator.');
    }
    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Account is deactivated.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.prisma.user.update({
        where: { userId: user.userId },
        data: { failedLogins: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { userId: user.userId },
      data: {
        failedLogins: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      },
    });

    const payload = {
      sub: user.userId,
      branchId: user.branchId,
      role: user.role.roleName,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshTokenOptions: any = {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
    };
    const refreshToken = this.jwtService.sign(payload, refreshTokenOptions);

    return {
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        role: user.role.roleName,
        branchId: user.branchId,
      },
    };
  }

  async refreshToken(oldRefreshToken: string) {
    try {
      const payload = this.jwtService.verify(oldRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { userId: payload.sub },
        include: { role: true, branch: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is not active');
      }

      const newPayload = {
        sub: user.userId,
        branchId: user.branchId,
        role: user.role.roleName,
        email: user.email,
      };

      const newAccessToken = this.jwtService.sign(newPayload);

      const refreshTokenOptions: any = {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
      };
      const newRefreshToken = this.jwtService.sign(newPayload, refreshTokenOptions);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout() {
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'If that email is registered, a reset link has been sent.' };
    }
    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    throw new BadRequestException('Password reset not yet implemented');
  }
}