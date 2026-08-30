import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // ─── PLANS ─────────────────────────────────────────
  @Post('plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN')
  @ApiOperation({ summary: 'Create a subscription plan (admin only)' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Get('plans')
  @ApiOperation({ summary: 'List subscription plans (public)' })
  listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Get('plans/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a subscription plan' })
  getPlan(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.getPlan(id);
  }

  @Patch('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN')
  @ApiOperation({ summary: 'Update a plan (admin only)' })
  updatePlan(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlanDto) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN')
  @ApiOperation({ summary: 'Soft-delete a plan (admin only)' })
  softDeletePlan(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.softDeletePlan(id);
  }

  // ─── SUBSCRIPTIONS ────────────────────────────────
  @Post('assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN')
  @ApiOperation({ summary: 'Assign a plan to a business (admin only)' })
  assign(@Body() dto: AssignSubscriptionDto) {
    return this.subscriptionsService.assignSubscription(dto);
  }

  @Get('business/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get active subscription for a business' })
  getBusinessSubscription(@Param('businessId', ParseIntPipe) businessId: number) {
    return this.subscriptionsService.getBusinessSubscription(businessId);
  }

  @Patch(':id/renew')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN')
  @ApiOperation({ summary: 'Renew a subscription (admin only)' })
  renew(@Param('id', ParseIntPipe) id: number, @Body() dto: RenewSubscriptionDto) {
    return this.subscriptionsService.renewSubscription(id, dto);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN')
  @ApiOperation({ summary: 'Cancel/suspend a subscription (admin only)' })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.cancelSubscription(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a subscription by ID' })
  getSubscription(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.getSubscription(id);
  }

  @Get(':id/invoices')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List invoices for a subscription' })
  listInvoices(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.listInvoices(id);
  }

  @Post('invoices/:invoiceId/pay')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN')
  @ApiOperation({ summary: 'Mark an invoice as paid (admin only)' })
  payInvoice(@Param('invoiceId', ParseIntPipe) invoiceId: number) {
    return this.subscriptionsService.payInvoice(invoiceId);
  }
}