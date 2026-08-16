import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { ScanBarcodeDto } from './dto/scan-barcode.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Cart')
@Controller('carts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new cart' })
  createCart(@GetUser('userId') userId: number, @Body() dto: CreateCartDto) {
    return this.cartService.createCart(userId, dto);
  }

  @Post(':cartId/items')
  @ApiOperation({ summary: 'Add a product to the cart' })
  addItem(
    @Param('cartId', ParseIntPipe) cartId: number,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(cartId, dto);
  }

  @Post(':cartId/scan')
  @ApiOperation({ summary: 'Scan barcode and add product to cart' })
  scanBarcode(
    @Param('cartId', ParseIntPipe) cartId: number,
    @Body() dto: ScanBarcodeDto,
  ) {
    return this.cartService.scanBarcode(cartId, dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active cart by branch and optional posId' })
  @ApiQuery({ name: 'branchId', required: true, type: Number })
  @ApiQuery({ name: 'posId', required: false, type: String })
  getActiveCart(
    @Query('branchId', ParseIntPipe) branchId: number,
    @Query('posId') posId?: string,
  ) {
    return this.cartService.getActiveCart(branchId, posId);
  }

  @Get(':cartId')
  @ApiOperation({ summary: 'Get a cart by ID' })
  getCart(@Param('cartId', ParseIntPipe) cartId: number) {
    return this.cartService.getCart(cartId);
  }

  @Patch(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Update quantity of a cart item' })
  updateItem(
    @Param('cartId', ParseIntPipe) cartId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(cartId, itemId, dto);
  }

  @Delete(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Remove an item from the cart' })
  removeItem(
    @Param('cartId', ParseIntPipe) cartId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.cartService.removeItem(cartId, itemId);
  }

  @Post(':cartId/discount')
  @ApiOperation({ summary: 'Apply a discount to the cart' })
  applyDiscount(
    @Param('cartId', ParseIntPipe) cartId: number,
    @Body() dto: ApplyDiscountDto,
  ) {
    return this.cartService.applyDiscount(cartId, dto);
  }

  @Post(':cartId/checkout')
  @ApiOperation({ summary: 'Checkout the cart (create sale and payment)' })
  checkout(
    @Param('cartId', ParseIntPipe) cartId: number,
    @GetUser('userId') userId: number,
    @Body() dto: CheckoutCartDto,
  ) {
    return this.cartService.checkout(cartId, userId, dto);
  }
}