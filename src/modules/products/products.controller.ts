import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a product or a service',
    description:
      'Set itemType to SERVICE for non-inventory items (consultation, delivery, installation). ' +
      'Services bypass all inventory checks in cart, sales, and refund flows. ' +
      'trackInventory is automatically forced to false for services.',
  })
  @ApiBody({
    description:
      'Full request body. Set itemType to SERVICE for non-inventory items; all other fields work identically for both.',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Indomie Noodles' },
        sku: { type: 'string', example: 'ABC123' },
        barcode: { type: 'string', example: '123456789012' },
        description: { type: 'string', example: 'Product description' },
        categoryId: { type: 'number', example: 1 },
        supplierId: { type: 'number', example: 1 },
        branchId: { type: 'number', example: 1 },
        unit: { type: 'string', example: 'Carton' },
        costPrice: { type: 'number', example: 8500 },
        sellingPrice: { type: 'number', example: 10500 },
        wholesalePrice: { type: 'number', example: 9500 },
        taxRate: { type: 'number', example: 7.5 },
        discount: { type: 'number', example: 0 },
        image: { type: 'string', example: 'https://example.com/image.jpg' },
        stockAlertLevel: { type: 'number', example: 50 },
        itemType: {
          type: 'string',
          enum: ['PRODUCT', 'SERVICE'],
          example: 'PRODUCT',
        },
        trackInventory: { type: 'boolean', example: true },
        status: { type: 'string', example: 'active' },
      },
      required: ['name', 'categoryId', 'costPrice', 'sellingPrice'],
    },
    examples: {
      product: {
        summary: 'Physical product (inventory-tracked) — full body',
        value: {
          name: 'Indomie Noodles',
          sku: 'ABC123',
          barcode: '123456789012',
          description: 'Instant noodles, pack of 12',
          categoryId: 1,
          supplierId: 1,
          branchId: 1,
          unit: 'Carton',
          costPrice: 8500,
          sellingPrice: 10500,
          wholesalePrice: 9500,
          taxRate: 7.5,
          discount: 0,
          image: 'https://example.com/indomie.jpg',
          stockAlertLevel: 50,
          itemType: 'PRODUCT',
          trackInventory: true,
          status: 'active',
        },
      },
      service: {
        summary: 'Service (no inventory) — full body',
        value: {
          name: 'Consultation Hour',
          sku: 'SERV-CONS-01',
          barcode: '',
          description: 'One-hour consulting session',
          categoryId: 1,
          supplierId: 1,
          branchId: 1,
          unit: 'Hour',
          costPrice: 0,
          sellingPrice: 25000,
          wholesalePrice: 20000,
          taxRate: 7.5,
          discount: 0,
          image: 'https://example.com/consult.jpg',
          stockAlertLevel: 0,
          itemType: 'SERVICE',
          trackInventory: false,
          status: 'active',
        },
      },
    },
  })
  create(@Body() dto: CreateProductDto, @GetUser('userId') userId: number) {
    return this.productsService.create(dto, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active products and services' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @GetUser('userId') userId: number,
    @Query('branchId') branchId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(
      {
        branchId: branchId ? parseInt(branchId, 10) : undefined,
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        search,
      },
      userId,
    );
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search products/services by name, sku, or barcode' })
  @ApiQuery({ name: 'q', required: true, type: String })
  search(@Query('q') q: string, @GetUser('userId') userId: number) {
    return this.productsService.search(q, userId);
  }

  @Get('barcode/:barcode')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lookup product by barcode' })
  findByBarcode(
    @Param('barcode') barcode: string,
    @GetUser('userId') userId: number,
  ) {
    return this.productsService.findByBarcode(barcode, userId);
  }

  @Get('sku/:sku')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lookup product by SKU' })
  findBySku(@Param('sku') sku: string, @GetUser('userId') userId: number) {
    return this.productsService.findBySku(sku, userId);
  }

  @Get('category/:categoryId')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List products/services by category' })
  findByCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @GetUser('userId') userId: number,
  ) {
    return this.productsService.findByCategory(categoryId, userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product or service by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.productsService.findOne(id, userId);
  }

  @Patch(':id/pricing')
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product/service pricing' })
  updatePricing(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @GetUser('userId') userId: number,
  ) {
    return this.productsService.updatePricing(id, dto, userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product/service status' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @GetUser('userId') userId: number,
  ) {
    return this.productsService.updateStatus(id, dto, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a product or service',
    description:
      'Changing itemType to SERVICE forces trackInventory to false. ' +
      'Changing back to PRODUCT does not restore tracking automatically — set trackInventory explicitly.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @GetUser('userId') userId: number,
  ) {
    return this.productsService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a product or service' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.productsService.remove(id, userId);
  }
}