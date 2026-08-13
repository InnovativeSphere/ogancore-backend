import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateExpenseDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { branchId: dto.branchId },
    });
    if (!branch) throw new BadRequestException('Branch not found');

    // Convert expenseDate string to Date object
    return this.prisma.expense.create({
      data: {
        branchId: dto.branchId,
        expenseName: dto.expenseName,
        category: dto.category,
        amount: dto.amount,
        expenseDate: new Date(dto.expenseDate),   // ← the fix
        description: dto.description,
        recordedBy: userId,
      },
      include: {
        branch: true,
        recorder: {
          select: { userId: true, fullName: true, username: true },
        },
      },
    });
  }

  async findAll(branchId?: number) {
    const where: any = { isActive: true };
    if (branchId) {
      where.branchId = branchId;
    }
    return this.prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      include: {
        branch: true,
        recorder: {
          select: { userId: true, fullName: true, username: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const expense = await this.prisma.expense.findUnique({
      where: { expenseId: id },
      include: {
        branch: true,
        recorder: {
          select: { userId: true, fullName: true, username: true },
        },
      },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.expense.update({
      where: { expenseId: id },
      data: { isActive: false },
    });
  }
}