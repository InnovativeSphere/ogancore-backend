import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AppController } from './app.controller';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}