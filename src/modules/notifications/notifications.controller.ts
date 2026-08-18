import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { NotificationType } from '@prisma/client';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user notifications' })
  getUserNotifications(@GetUser('userId') userId: number) {
    return this.notificationsService.getUserNotifications(userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all as read' })
  markAllAsRead(@GetUser('userId') userId: number) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN')
  @ApiOperation({ summary: 'Create a general notification (admin only)' })
  create(
    @Body('type') type: NotificationType,
    @Body('title') title: string,
    @Body('message') message: string,
  ) {
    return this.notificationsService.createForAllUsers(type, title, message);
  }
}