import { CertificatePdfService } from './certificate-pdf.service';

describe('CertificatePdfService', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    // The real logo fetch is irrelevant here -- a 404 exercises the
    // "logo unavailable" fallback path, which render() must survive.
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

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

  it('still renders when the logo fetch fails', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('network down'));
    const service = new CertificatePdfService();
    const buffer = await service.render({
      holderName: 'Grace Hopper',
      courseTitle: 'Digital & Tech Literacy (Absolute Beginner)',
      credentialId: 'AIIT-FF00EE11',
      issuedAt: new Date('2026-09-13T00:00:00.000Z'),
    });
    expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });
});
