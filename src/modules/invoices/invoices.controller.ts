import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { InvoiceStatus, InvoiceType } from '@prisma/client';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @Roles('SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create an invoice (platform admins must pass businessId; business admins inherit from their branch)',
  })
  create(@Body() dto: CreateInvoiceDto, @GetUser('userId') userId: number) {
    return this.invoicesService.create(dto, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List invoices (scoped: business admin sees own business; platform admin sees all or filtered by businessId)',
  })
  @ApiQuery({ name: 'businessId', required: false, type: Number })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiQuery({ name: 'invoiceType', required: false, enum: InvoiceType })
  findAll(
    @GetUser('userId') userId: number,
    @Query('businessId') businessId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: InvoiceStatus,
    @Query('invoiceType') invoiceType?: InvoiceType,
  ) {
    return this.invoicesService.findAll(userId, {
      businessId: businessId ? parseInt(businessId, 10) : undefined,
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      status,
      invoiceType,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an invoice by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.invoicesService.findOne(id, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @Roles('SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an invoice (not allowed on PAID or VOIDED invoices)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceDto,
    @GetUser('userId') userId: number,
  ) {
    return this.invoicesService.update(id, dto, userId);
  }

  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @Roles('SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Void an invoice (soft delete; not allowed on PAID invoices)' })
  void(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VoidInvoiceDto,
    @GetUser('userId') userId: number,
  ) {
    return this.invoicesService.void(id, dto, userId);
  }
}