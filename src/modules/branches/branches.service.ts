import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBranchDto) {
    const existing = await this.prisma.branch.findFirst({
      where: { branchName: dto.branchName, isActive: true },
    });
    if (existing) {
      throw new ConflictException('A branch with this name already exists');
    }
    return this.prisma.branch.create({ data: dto });
  }

  async findAllActive() {
    return this.prisma.branch.findMany({ where: { isActive: true } });
  }

  async findAll() {
    return this.prisma.branch.findMany();
  }

  async findOne(id: number) {
    const branch = await this.prisma.branch.findUnique({ where: { branchId: id } });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async update(id: number, dto: UpdateBranchDto) {
    await this.findOne(id);
    if (dto.branchName) {
      const conflict = await this.prisma.branch.findFirst({
        where: { branchName: dto.branchName, isActive: true, branchId: { not: id } },
      });
      if (conflict) {
        throw new ConflictException('Another active branch already uses this name');
      }
    }
    return this.prisma.branch.update({ where: { branchId: id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.branch.update({
      where: { branchId: id },
      data: { isActive: false },
    });
  }
}