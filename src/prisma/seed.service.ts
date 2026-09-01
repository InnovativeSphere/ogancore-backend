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
      'BUSINESS_ADMIN',
    ];

    // Seed expense categories
    const expenseCategories = [
      'Rent',
      'Electricity',
      'Internet',
      'Transportation',
      'Salary',
      'Maintenance',
      'Office Supplies',
      'Marketing',
      'Security',
      'Fuel',
      'Utilities',
      'Other',
    ];

    for (const categoryName of expenseCategories) {
      const existing = await this.prisma.expenseCategory.findFirst({
        where: { categoryName },
      });
      if (!existing) {
        await this.prisma.expenseCategory.create({
          data: { categoryName },
        });
      }
    }

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

    // 4. Seed default subscription plans (idempotent)
    const plans = [
      {
        name: 'Starter',
        interval: 'MONTHLY',
        price: 5000,
        features: '7 days free trial, 1 branch, 5 users',
        maxBranches: 1,
        maxUsers: 5,
      },
      {
        name: 'Pro',
        interval: 'MONTHLY',
        price: 10000,
        features: '7 days free trial, 3 branches, 10 users',
        maxBranches: 3,
        maxUsers: 10,
      },
      {
        name: 'Enterprise',
        interval: 'MONTHLY',
        price: 50000,
        features: 'Custom limits, priority support',
        maxBranches: null, // or a large number
        maxUsers: null,
      },
    ];

    for (const plan of plans) {
      const existingPlan = await this.prisma.subscriptionPlan.findFirst({
        where: { name: plan.name },
      });
      if (!existingPlan) {
        await this.prisma.subscriptionPlan.create({
          data: {
            name: plan.name,
            interval: plan.interval as any,
            price: plan.price,
            features: plan.features,
            maxBranches: plan.maxBranches,
            maxUsers: plan.maxUsers,
          },
        });
      }
    }
  }
}