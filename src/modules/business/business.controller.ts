import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BusinessService } from './business.service';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateKycDocumentDto } from './dto/update-kyc-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { buildUploadConfig } from './upload.helper';

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

  // ─── Document Upload (KYC) ──────────────────────────────────
  @Post('upload-document')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload KYC document (PDF/JPG/PNG, max 20MB)' })
  @UseInterceptors(
    FileInterceptor(
      'file',
      buildUploadConfig({
        folder: 'kyc',
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
        maxSizeBytes: 20 * 1024 * 1024,
      }),
    ),
  )
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const relativePath = `/uploads/kyc/${file.filename}`;

    return {
      documentUrl: `${baseUrl}${relativePath}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  // ─── Logo Upload ────────────────────────────────────────────
  @Post('upload-logo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Upload business logo (PNG/JPG/SVG/WEBP, max 5MB)',
  })
  @UseInterceptors(
    FileInterceptor(
      'file',
      buildUploadConfig({
        folder: 'logos',
        allowedExtensions: ['.png', '.jpg', '.jpeg', '.svg', '.webp'],
        maxSizeBytes: 5 * 1024 * 1024,
      }),
    ),
  )
  uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const relativePath = `/uploads/logos/${file.filename}`;

    return {
      logoUrl: `${baseUrl}${relativePath}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
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