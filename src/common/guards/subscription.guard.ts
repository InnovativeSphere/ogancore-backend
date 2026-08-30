import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KycStatus } from '@prisma/client';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.branchId) {
      throw new ForbiddenException('Subscription required');
    }

    // Platform roles bypass subscription checks
    const platformRoles = ['SUPER_ADMIN', 'IT_ADMIN'];
    if (platformRoles.includes(user.role)) {
      return true;
    }

    // Derive businessId from user's branch
    const branch = await this.prisma.branch.findUnique({
      where: { branchId: user.branchId },
      select: { businessId: true },
    });

    if (!branch?.businessId) {
      throw new ForbiddenException('Your account is not linked to a business');
    }

    const businessId = branch.businessId;

    // Check subscription status for the business
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: {
        businessId,
        status: { in: ['TRIAL', 'ACTIVE', 'GRACE'] },
      },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'Your subscription is expired or inactive. Please renew to continue.',
      );
    }

    // For BUSINESS_ADMIN, also enforce KYC verification
    if (user.role === 'BUSINESS_ADMIN') {
      const business = await this.prisma.business.findUnique({
        where: { businessId },
        select: { kycStatus: true },
      });

      if (!business || business.kycStatus !== KycStatus.VERIFIED) {
        throw new ForbiddenException(
          'KYC verification is required to access this resource.',
        );
      }
    }

    return true;
  }
}