import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiOperation({ summary: 'Create a customer' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List customers (active by default)' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.customersService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiOperation({ summary: 'Update a customer' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiOperation({ summary: 'Deactivate a customer' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.remove(id);
  }
}