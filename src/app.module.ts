import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { CustomersModule } from './modules/customers/customers.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    CategoriesModule,
    SuppliersModule,
    ProductsModule,
    InventoryModule,
    SalesModule,
    CustomersModule,
    PaymentsModule,
    ExpensesModule,
    AnalyticsModule
    
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
