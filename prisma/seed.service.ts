import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // 1. Seed all required roles
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

    // 2. Ensure there is at least one active branch
    let defaultBranch = await this.prisma.branch.findFirst({
      where: { isActive: true },
    });
    if (!defaultBranch) {
      defaultBranch = await this.prisma.branch.create({
        data: {
          branchName: 'Head Office',
          address: 'Default branch',
        },
      });
    }

    // 3. Ensure a default SUPER_ADMIN user exists (without duplicating usernames)
    const superAdminRole = await this.prisma.role.findFirst({
      where: { roleName: 'SUPER_ADMIN' },
    });

    if (superAdminRole) {
      // Check if a super admin already exists by email or username
      const existingAdmin = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: 'admin@ogancore.com' },
            { username: 'sysadmin' },
          ],
        },
      });

      if (!existingAdmin) {
        const passwordHash = await bcrypt.hash('Admin123!', 12);
        await this.prisma.user.create({
          data: {
            fullName: 'System Administrator',
            username: 'sysadmin',
            email: 'admin@ogancore.com',
            passwordHash,
            roleId: superAdminRole.roleId,
            branchId: defaultBranch.branchId,
            status: 'ACTIVE',
          },
        });
      }
    }
  }
}