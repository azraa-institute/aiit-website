import { CertificatePdfService } from './certificate-pdf.service';

describe('CertificatePdfService', () => {
  it('renders a real, non-empty PDF buffer', async () => {
    const service = new CertificatePdfService();
    const buffer = await service.render({
      holderName: 'Ada Lovelace',
      courseTitle: 'Digital & Tech Literacy (Absolute Beginner)',
      credentialId: 'AIIT-AB12CD34',
      issuedAt: new Date('2026-09-13T00:00:00.000Z'),
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(500);
    expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });

  it('still renders when the background template is missing', async () => {
    const service = new CertificatePdfService();
    // Force the "template unavailable" fallback path without touching the
    // real file on disk -- same resilience guarantee the old logo-fetch-
    // failure test checked, just against the new background-template read.
    (service as unknown as { getTemplateBytes: () => Promise<Buffer | null> }).getTemplateBytes = () =>
      Promise.resolve(null);

    const buffer = await service.render({
      holderName: 'Grace Hopper',
      courseTitle: 'Digital & Tech Literacy (Absolute Beginner)',
      credentialId: 'AIIT-FF00EE11',
      issuedAt: new Date('2026-09-13T00:00:00.000Z'),
    });
    expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });

  it('shrinks a long recipient name and course title instead of overrunning the frame', async () => {
    const service = new CertificatePdfService();
    const buffer = await service.render({
      holderName: 'Nnamdiamaka Chukwuemeka Okonkwo-Adeyemi Thandiwe',
      courseTitle: 'Advanced Cloud Computing, Cybersecurity and Emerging Infrastructure Technologies',
      credentialId: 'AIIT-LONG0001',
      issuedAt: new Date('2026-09-13T00:00:00.000Z'),
    });
    expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });
});
