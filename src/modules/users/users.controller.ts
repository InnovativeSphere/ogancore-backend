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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  getProfile(@GetUser('userId') userId: number) {
    return this.usersService.findProfile(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own profile' })
  updateProfile(
    @GetUser('userId') userId: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password' })
  changePassword(
    @GetUser('userId') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List users (scoped by role)' })
  findAll(@GetUser('userId') requesterUserId: number) {
    return this.usersService.findAll(requesterUserId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a user (admin or business admin)' })
  create(@Body() dto: CreateUserDto, @GetUser('userId') creatorUserId: number) {
    return this.usersService.create(dto, creatorUserId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user (admin or business admin)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @GetUser('userId') userId: number,
  ) {
    return this.usersService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a user (scoped by role)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('userId') requesterUserId: number,
  ) {
    return this.usersService.remove(id, requesterUserId);
  }
}