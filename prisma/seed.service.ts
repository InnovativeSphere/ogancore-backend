import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Seed all required roles
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

    // Seed default branch if none exists
    const branchCount = await this.prisma.branch.count();
    if (branchCount === 0) {
      await this.prisma.branch.create({
        data: {
          branchName: 'Head Office',
          address: 'Default branch',
        },
      });
    }
  }
}