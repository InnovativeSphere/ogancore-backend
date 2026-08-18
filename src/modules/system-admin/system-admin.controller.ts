import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SystemAdminService } from './system-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('System Admin')
@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'IT_ADMIN')
@ApiBearerAuth()
export class SystemAdminController {
  constructor(private readonly systemAdminService: SystemAdminService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check server and database health (admin only)' })
  health() {
    return this.systemAdminService.getHealth();
  }

  @Get('info')
  @ApiOperation({ summary: 'Get system information (admin only)' })
  info() {
    return this.systemAdminService.getSystemInfo();
  }
}