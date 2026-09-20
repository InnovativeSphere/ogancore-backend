import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { KycService } from '../kyc/kyc.service';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { BusinessType, KycStatus } from '@prisma/client';



@Injectable()
export class BusinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly kycService: KycService,
  ) {}

   async register(dto: RegisterBusinessDto) {
    // Validate KYC fields based on business type
    if (
      (dto.businessType === BusinessType.BUSINESS ||
        dto.businessType === BusinessType.ENTREPRENEUR) &&
      !dto.cacRegistrationNumber &&
      !dto.nin
    ) {
      throw new BadRequestException(
        'For BUSINESS or ENTREPRENEUR, you must provide either NIN or CAC registration number.',
      );
    }

    // Check email uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.ownerEmail },
    });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Find BUSINESS_ADMIN role
    const businessAdminRole = await this.prisma.role.findFirst({
      where: { roleName: 'BUSINESS_ADMIN' },
    });
    if (!businessAdminRole) {
      throw new BadRequestException('BUSINESS_ADMIN role not found');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.ownerPassword, 12);

    // Create business
    const business = await this.prisma.business.create({
      data: {
        businessName: dto.businessName,
        businessType: dto.businessType,
        businessEmail: dto.businessEmail,
        businessPhone: dto.businessPhone,
        address: dto.address,
        logoUrl: dto.logoUrl,
        cacRegistrationNumber: dto.cacRegistrationNumber,
        nin: dto.nin,
        kycStatus: KycStatus.PENDING,
        kycDocumentUrl: dto.kycDocumentUrl,
      },
    });

    // KYC is not triggered during registration.
    // Business starts at PENDING and verification is user-initiated.
    const updatedBusiness = await this.prisma.business.update({
      where: { businessId: business.businessId },
      data: {
        kycStatus: KycStatus.PENDING,
        kycMethod: null,
        kycVerifiedAt: null,
      },
    });

    // Create default branch linked to business
    const branch = await this.prisma.branch.create({
      data: {
        branchName: dto.branchName || 'Main Branch',
        address: dto.branchAddress,
        businessId: business.businessId,
      },
    });

    // Generate a username from email prefix (removing non-alphanumeric)
    const usernameBase = dto.ownerEmail
      .split('@')[0]
      .replace(/[^a-zA-Z0-9_]/g, '');
    const username = `${usernameBase}_${Math.floor(Math.random() * 10000)}`;

    // Create owner user with BUSINESS_ADMIN role and assigned branch
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.ownerFullName,
        email: dto.ownerEmail,
        phone: dto.ownerPhone,
        username,
        passwordHash,
        roleId: businessAdminRole.roleId,
        branchId: branch.branchId,
        status: 'ACTIVE',
      },
    });

    // Create trial subscription if planId provided
    if (dto.planId) {
      await this.createTrialSubscription(business.businessId, dto.planId);
    }

    // Generate tokens
    const payload = {
      sub: user.userId,
      branchId: user.branchId,
      role: businessAdminRole.roleName,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshTokenOptions: any = {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
    };
    const refreshToken = this.jwtService.sign(payload, refreshTokenOptions);

    return {
      business: updatedBusiness,
      branch,
      user: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        role: businessAdminRole.roleName,
        branchId: user.branchId,
      },
      planId: dto.planId ?? null,
      accessToken,
      refreshToken,
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        branch: {
          include: { business: true },
        },
      },
    });
    if (!user || !user.branch?.business) {
      throw new BadRequestException('No business associated with this account');
    }
    return user.branch.business;
  }

  async updateProfile(userId: number, dto: UpdateBusinessDto) {
    const business = await this.getProfile(userId);
    return this.prisma.business.update({
      where: { businessId: business.businessId },
      data: dto,
    });
  }

  async listBranches(userId: number) {
    const business = await this.getProfile(userId);
    return this.prisma.branch.findMany({
      where: { businessId: business.businessId },
    });
  }

  async verifyKyc(
    userId: number,
    dto: { nin?: string; cacRegistrationNumber?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        branch: {
          include: { business: true },
        },
      },
    });

    if (!user || !user.branch?.business) {
      throw new BadRequestException('No business associated with this account');
    }

    const business = user.branch.business;
        // Once a business is manually verified, the API must not override it.
    if (business.kycMethod === 'MANUAL' && business.kycStatus === KycStatus.VERIFIED) {
      throw new BadRequestException(
        'This business is already manually verified. Automatic verification is disabled.',
      );
    }

    const nin = dto.nin || business.nin;
    const cac = dto.cacRegistrationNumber || business.cacRegistrationNumber;

    if (!nin && !cac) {
      throw new BadRequestException(
        'No NIN or CAC registration number available for verification',
      );
    }

    let kycStatus: KycStatus = KycStatus.PENDING;

    try {
      let result: any;
      if (cac) {
        result = await this.kycService.verifyCac(cac);
      } else if (nin) {
        result = await this.kycService.verifyNin(nin);
      }

      if (result !== undefined) {
        kycStatus = this.interpretKycResult(result);
      }
    } catch (error) {
      kycStatus = KycStatus.PENDING;
    }

    const updatedBusiness = await this.prisma.business.update({
      where: { businessId: business.businessId },
      data: {
        kycStatus,
        kycMethod: kycStatus === KycStatus.PENDING ? null : 'API',
        kycVerifiedAt: kycStatus === KycStatus.VERIFIED ? new Date() : null,
        ...(dto.nin ? { nin: dto.nin } : {}),
        ...(dto.cacRegistrationNumber
          ? { cacRegistrationNumber: dto.cacRegistrationNumber }
          : {}),
      },
    });

    return updatedBusiness;
  }

  // ─── Manual KYC Workflow ─────────────────────────────────────
  async updateKycDocument(userId: number, documentUrl: string) {
    const business = await this.getProfile(userId);
    return this.prisma.business.update({
      where: { businessId: business.businessId },
      data: { kycDocumentUrl: documentUrl },
    });
  }

  async requestKycReview(userId: number) {
    const business = await this.getProfile(userId);

    if (!business.kycDocumentUrl) {
      throw new BadRequestException(
        'Please upload a NIN or CAC document before requesting review',
      );
    }

    if (business.kycStatus === KycStatus.VERIFIED) {
      throw new BadRequestException('Your business is already verified');
    }

    if (business.kycReviewRequested) {
      throw new BadRequestException('You have already requested a review');
    }

    return this.prisma.business.update({
      where: { businessId: business.businessId },
      data: {
        kycReviewRequested: true,
        kycReviewRequestedAt: new Date(),
        kycRejectionReason: null,
      },
    });
  }

  async listPendingKycReviews() {
    return this.prisma.business.findMany({
      where: {
        kycReviewRequested: true,
        kycStatus: { not: KycStatus.VERIFIED },
        isActive: true,
      },
      orderBy: { kycReviewRequestedAt: 'asc' },
      select: {
        businessId: true,
        businessName: true,
        businessType: true,
        businessEmail: true,
        businessPhone: true,
        cacRegistrationNumber: true,
        nin: true,
        kycStatus: true,
        kycDocumentUrl: true,
        kycReviewRequestedAt: true,
        createdAt: true,
      },
    });
  }

  async verifyKycManual(
    businessId: number,
    action: 'VERIFY' | 'REJECT',
    adminUserId: number,
    rejectionReason: string | null = null,
  ) {
    if (action !== 'VERIFY' && action !== 'REJECT') {
      throw new BadRequestException(
        'action must be either "VERIFY" or "REJECT"',
      );
    }

    const business = await this.prisma.business.findUnique({
      where: { businessId },
    });

    if (!business) {
      throw new BadRequestException('Business not found');
    }

    if (action === 'REJECT' && !rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const kycStatus =
      action === 'VERIFY' ? KycStatus.VERIFIED : KycStatus.REJECTED;

    return this.prisma.business.update({
      where: { businessId },
      data: {
        kycStatus,
        kycMethod: 'MANUAL',
        kycVerifiedAt: action === 'VERIFY' ? new Date() : null,
        kycVerifiedBy: adminUserId,
        kycRejectionReason: action === 'REJECT' ? rejectionReason : null,
        kycReviewRequested: false,
      },
    });
  }

  private interpretKycResult(result: any): KycStatus {
    if (!result) return KycStatus.PENDING;

    if (result.data?.verificationOutcome) {
      if (
        result.data.verificationOutcome === 'SUCCESS' ||
        result.data.verificationOutcome === 'VERIFIED'
      ) {
        return KycStatus.VERIFIED;
      }
      return KycStatus.REJECTED;
    }

    if (result.data?.nin && (result.data?.firstName || result.data?.lastName)) {
      return KycStatus.VERIFIED;
    }

    if (result.data?.httpStatus && result.data.httpStatus >= 400) {
      return KycStatus.REJECTED;
    }

    return KycStatus.PENDING;
  }

  private async createTrialSubscription(businessId: number, planId: number) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { planId },
    });
    if (!plan) throw new BadRequestException('Plan not found');

    const startDate = new Date();
    const endDate = new Date(startDate);
    switch (plan.interval) {
      case 'MONTHLY':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'QUARTERLY':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'ANNUAL':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    const subscription = await this.prisma.tenantSubscription.create({
      data: {
        businessId,
        planId,
        startDate,
        endDate,
        status: 'TRIAL',
        graceUntil: null,
      },
    });

    await this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: subscription.subscriptionId,
        amount: plan.price,
        dueDate: startDate,
        status: 'unpaid',
      },
    });

    return subscription;
  }
}