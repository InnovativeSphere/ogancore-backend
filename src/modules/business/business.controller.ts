import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
  @ApiOperation({ summary: 'Retry KYC verification for current business' })
  verifyKyc(
    @GetUser('userId') userId: number,
    @Body() dto: { nin?: string; cacRegistrationNumber?: string },
  ) {
    return this.businessService.verifyKyc(userId, dto);
  }
  
}