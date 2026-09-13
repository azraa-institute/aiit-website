import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CertificatesService } from './certificates.service';
import { CertificatePdfService } from './certificate-pdf.service';
import { MyCertificatesController } from './my-certificates.controller';
import { CourseCertificatesController } from './course-certificates.controller';
import { CertificateVerificationController } from './certificate-verification.controller';

@Module({
  imports: [EnrollmentsModule, NotificationsModule],
  controllers: [MyCertificatesController, CourseCertificatesController, CertificateVerificationController],
  providers: [CertificatesService, CertificatePdfService],
})
export class CertificatesModule {}
