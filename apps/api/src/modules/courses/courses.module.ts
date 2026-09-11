import { Module } from '@nestjs/common';
import { CurrencyModule } from '../../common/currency/currency.module';
import { CoursesController } from './courses.controller';
import { DomainsController } from './domains.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [CurrencyModule],
  controllers: [CoursesController, DomainsController],
  providers: [CoursesService],
})
export class CoursesModule {}
