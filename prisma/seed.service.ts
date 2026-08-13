import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
@Injectable()
export class SeedService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Seed default role if none exists
    const roleCount = await this.prisma.role.count();
    if (roleCount === 0) {
      await this.prisma.role.create({
        data: {
          roleName: 'Admin',
          description: 'Default admin role',
        },
      });
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