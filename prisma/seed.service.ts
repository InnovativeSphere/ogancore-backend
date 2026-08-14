import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const roles = [
      'SUPER_ADMIN',
      'ADMIN',
      'LOAN_OFFICER',
      'CREDIT_REVIEWER',
      'MANAGEMENT',
      'USER',
      'IT_ADMIN',
    ];

    for (const roleName of roles) {
      const existingRole = await this.prisma.role.findFirst({
        where: { roleName },
      });
      if (!existingRole) {
        await this.prisma.role.create({
          data: {
            roleName,
            description: `${roleName} role`,
          },
        });
      }
    }

    const defaultBranch = await this.prisma.branch.findFirst({
      where: { isActive: true },
    });

    if (!defaultBranch) {
      await this.prisma.branch.create({
        data: {
          branchName: 'Head Office',
          address: 'Default branch',
        },
      });
    }

    const superAdminRole = await this.prisma.role.findFirst({
      where: { roleName: 'SUPER_ADMIN' },
    });

    if (superAdminRole) {
      const existingAdmin = await this.prisma.user.findFirst({
        where: { roleId: superAdminRole.roleId },
      });
      if (!existingAdmin) {
        const passwordHash = await bcrypt.hash('Admin123!', 12);
        await this.prisma.user.create({
          data: {
            fullName: 'System Administrator',
            username: 'admin',
            email: 'admin@ogancore.com',
            passwordHash,
            roleId: superAdminRole.roleId,
            branchId: (await this.prisma.branch.findFirst({ where: { isActive: true } }))?.branchId || 1,
            status: 'ACTIVE',
          },
        });
      }
    }
  }
}