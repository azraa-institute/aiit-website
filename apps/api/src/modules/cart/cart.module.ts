import { Module } from '@nestjs/common';
import { CurrencyModule } from '../../common/currency/currency.module';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

@Module({
  imports: [CurrencyModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
