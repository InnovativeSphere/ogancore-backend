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
  @ApiOperation({ summary: 'Create a product' })
  create(@Body() dto: CreateProductDto, @GetUser('userId') userId: number) {
    return this.productsService.create(dto, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active products' })
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
  @ApiOperation({ summary: 'Search products by name, sku, or barcode' })
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
  @ApiOperation({ summary: 'List products by category' })
  findByCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @GetUser('userId') userId: number,
  ) {
    return this.productsService.findByCategory(categoryId, userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product by ID' })
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
  @ApiOperation({ summary: 'Update product pricing' })
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
  @ApiOperation({ summary: 'Update product status' })
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
  @ApiOperation({ summary: 'Update a product' })
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
  @ApiOperation({ summary: 'Deactivate a product' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') userId: number,
  ) {
    return this.productsService.remove(id, userId);
  }
}
