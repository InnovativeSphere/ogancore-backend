import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    // Optional: check uniqueness of email or phone among active customers
    if (dto.email) {
      const existingEmail = await this.prisma.customer.findFirst({
        where: { email: dto.email, isActive: true },
      });
      if (existingEmail) {
        throw new ConflictException('A customer with this email already exists');
      }
    }
    if (dto.phone) {
      const existingPhone = await this.prisma.customer.findFirst({
        where: { phone: dto.phone, isActive: true },
      });
      if (existingPhone) {
        throw new ConflictException('A customer with this phone already exists');
      }
    }

    return this.prisma.customer.create({ data: dto });
  }

  async findAll(includeInactive = false) {
    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    return this.prisma.customer.findMany({ where });
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { customerId: id },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findOne(id);

    // Check uniqueness for email/phone if being updated
    if (dto.email) {
      const existingEmail = await this.prisma.customer.findFirst({
        where: { email: dto.email, isActive: true, customerId: { not: id } },
      });
      if (existingEmail) {
        throw new ConflictException('Another customer already uses this email');
      }
    }
    if (dto.phone) {
      const existingPhone = await this.prisma.customer.findFirst({
        where: { phone: dto.phone, isActive: true, customerId: { not: id } },
      });
      if (existingPhone) {
        throw new ConflictException('Another customer already uses this phone');
      }
    }

    return this.prisma.customer.update({ where: { customerId: id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    // Soft-delete: preserve purchase history
    return this.prisma.customer.update({
      where: { customerId: id },
      data: { isActive: false },
    });
  }
}