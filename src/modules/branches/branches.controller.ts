import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Branches')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS_ADMIN') // only business admin can create branches
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new branch (business admin only)' })
  create(@Body() dto: CreateBranchDto, @GetUser('userId') userId: number) {
    return this.branchesService.create(dto, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active branches (scoped by role)' })
  findAllActive(@GetUser('userId') userId: number) {
    return this.branchesService.findAllActive(userId);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'BUSINESS_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all branches including inactive (scoped by role)' })
  findAll(@GetUser('userId') userId: number) {
    return this.branchesService.findAll(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a branch by ID (scoped)' })
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser('userId') userId: number) {
    return this.branchesService.findOne(id, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS_ADMIN') // only business admin can update branches
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a branch (business admin only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBranchDto,
    @GetUser('userId') userId: number,
  ) {
    return this.branchesService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS_ADMIN') // only business admin can deactivate branches
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a branch (business admin only)' })
  remove(@Param('id', ParseIntPipe) id: number, @GetUser('userId') userId: number) {
    return this.branchesService.remove(id, userId);
  }
}