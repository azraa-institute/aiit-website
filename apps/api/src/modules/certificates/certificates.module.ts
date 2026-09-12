import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { CertificatesService } from './certificates.service';
import { MyCertificatesController } from './my-certificates.controller';
import { CourseCertificatesController } from './course-certificates.controller';

@Module({
  imports: [EnrollmentsModule],
  controllers: [MyCertificatesController, CourseCertificatesController],
  providers: [CertificatesService],
})
export class CertificatesModule {}
