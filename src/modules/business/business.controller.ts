import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateKycDocumentDto } from './dto/update-kyc-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Business')
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new business and owner account' })
  register(@Body() dto: RegisterBusinessDto) {
    return this.businessService.register(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current business profile' })
  getProfile(@GetUser('userId') userId: number) {
    return this.businessService.getProfile(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update business profile' })
  updateProfile(
    @GetUser('userId') userId: number,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businessService.updateProfile(userId, dto);
  }

  @Get('branches')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List branches under current business' })
  listBranches(@GetUser('userId') userId: number) {
    return this.businessService.listBranches(userId);
  }

  @Post('verify-kyc')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry KYC verification via API (NIN/CAC)' })
  verifyKyc(
    @GetUser('userId') userId: number,
    @Body() dto: { nin?: string; cacRegistrationNumber?: string },
  ) {
    return this.businessService.verifyKyc(userId, dto);
  }

  // ─── Manual KYC Workflow ────────────────────────────────────

  @Patch('kyc-document')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update KYC document URL for current business' })
  updateKycDocument(
    @GetUser('userId') userId: number,
    @Body() dto: UpdateKycDocumentDto,
  ) {
    return this.businessService.updateKycDocument(userId, dto.documentUrl);
  }

  @Post('request-kyc-review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request manual KYC review' })
  requestKycReview(@GetUser('userId') userId: number) {
    return this.businessService.requestKycReview(userId);
  }

  @Get('admin/pending-kyc')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'IT_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all businesses awaiting manual KYC review' })
  listPendingKyc() {
    return this.businessService.listPendingKycReviews();
  }

  @Patch(':businessId/verify-kyc-manual')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'IT_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Manually verify or reject a business KYC (superadmin only)',
  })
  verifyKycManual(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Body() dto: { action: 'VERIFY' | 'REJECT'; reason?: string },
    @GetUser('userId') userId: number,
  ) {
    return this.businessService.verifyKycManual(
      businessId,
      dto.action,
      userId,
      dto.reason ?? null,
    );
  }
}