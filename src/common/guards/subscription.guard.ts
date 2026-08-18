import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.branchId) {
      throw new ForbiddenException('Subscription required');
    }

    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: {
        branchId: user.branchId,
        status: { in: ['TRIAL', 'ACTIVE', 'GRACE'] },
      },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'Your subscription is expired or inactive. Please renew to continue.',
      );
    }

    return true;
  }
}