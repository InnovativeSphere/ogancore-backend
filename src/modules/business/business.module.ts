import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { KycModule } from '../kyc/kyc.module';

@Module({
  imports: [
    KycModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: (process.env.JWT_EXPIRATION as any) || '15m' },
    }),
  ],
  controllers: [BusinessController],
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {}