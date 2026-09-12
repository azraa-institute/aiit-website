import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CertificatesService } from './certificates.service';
import { MyCertificatesController } from './my-certificates.controller';
import { CourseCertificatesController } from './course-certificates.controller';

@Module({
  imports: [EnrollmentsModule, NotificationsModule],
  controllers: [MyCertificatesController, CourseCertificatesController],
  providers: [CertificatesService],
})
export class CertificatesModule {}
