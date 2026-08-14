import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // 1. Seed all roles
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

    // 2. Ensure at least one active branch
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

    // 3. Seed users for each role (idempotent)
    const users = [
      {
        fullName: 'Super Admin',
        username: 'super_admin',
        email: 'superadmin@ogancore.com',
        password: 'Pass1234!',
        roleName: 'SUPER_ADMIN',
      },
      {
        fullName: 'Admin User',
        username: 'admin_user',
        email: 'adminuser@ogancore.com',
        password: 'Pass1234!',
        roleName: 'ADMIN',
      },
      {
        fullName: 'Loan Officer',
        username: 'loan_officer',
        email: 'loanofficer@ogancore.com',
        password: 'Pass1234!',
        roleName: 'LOAN_OFFICER',
      },
      {
        fullName: 'Credit Reviewer',
        username: 'credit_reviewer',
        email: 'creditreviewer@ogancore.com',
        password: 'Pass1234!',
        roleName: 'CREDIT_REVIEWER',
      },
      {
        fullName: 'Management User',
        username: 'management_user',
        email: 'management@ogancore.com',
        password: 'Pass1234!',
        roleName: 'MANAGEMENT',
      },
      {
        fullName: 'Regular User',
        username: 'regular_user',
        email: 'regularuser@ogancore.com',
        password: 'Pass1234!',
        roleName: 'USER',
      },
      {
        fullName: 'IT Admin',
        username: 'it_admin',
        email: 'itadmin@ogancore.com',
        password: 'Pass1234!',
        roleName: 'IT_ADMIN',
      },
    ];

    for (const user of users) {
      const role = await this.prisma.role.findFirst({
        where: { roleName: user.roleName },
      });

      if (!role) continue;

      const existingUser = await this.prisma.user.findFirst({
        where: { email: user.email },
      });

      if (!existingUser) {
        const passwordHash = await bcrypt.hash(user.password, 12);
        await this.prisma.user.create({
          data: {
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            passwordHash,
            roleId: role.roleId,
            branchId: defaultBranch.branchId,
            status: 'ACTIVE',
          },
        });
      }
    }
  }
}