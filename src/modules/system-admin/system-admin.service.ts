import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SystemAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    let database = 'connected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      database = 'disconnected';
    }

    return {
      status: database === 'connected' ? 'ok' : 'error',
      database,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  getSystemInfo() {
    return {
      appName: 'OGANCORE Backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}