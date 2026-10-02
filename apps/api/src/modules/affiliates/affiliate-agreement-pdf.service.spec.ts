import { AffiliateAgreementPdfService } from './affiliate-agreement-pdf.service';

const BASE_AFFILIATE = {
  id: '22222222-2222-4222-8222-222222222222',
  userId: '11111111-1111-4111-8111-111111111111',
  type: 'creator' as const,
  applicationStatus: 'pending' as const,
  referralSlug: 'abc123',
  phone: null,
  handle: null,
  country: null,
  city: null,
  source: null,
  motivation: null,
  signedName: 'Ada Lovelace',
  agreementVersion: '2026-10-03',
  signedAt: new Date('2026-10-03T12:00:00.000Z'),
  signedIp: '203.0.113.7',
  rejectionReason: null,
  reviewedAt: null,
  reviewedBy: null,
  createdAt: new Date('2026-10-03T12:00:00.000Z'),
};

// Several pages of body text across 4 embedded fonts take noticeably longer
// to lay out and subset than the certificate's single fixed page.
jest.setTimeout(30_000);

describe('AffiliateAgreementPdfService', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    // The real logo fetch is irrelevant here -- a 404 exercises the
    // "logo unavailable" fallback path, which render() must survive.
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('renders a real, non-empty, multi-page PDF buffer', async () => {
    const service = new AffiliateAgreementPdfService();
    const buffer = await service.render(BASE_AFFILIATE);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    // Several pages of embedded-font body text is a meaningfully bigger
    // file than the certificate's single fixed page -- a loose floor just
    // to catch "rendered almost nothing" regressions, not an exact size.
    expect(buffer.byteLength).toBeGreaterThan(20_000);
    expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });

  it('still renders when the logo fetch fails', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('network down'));
    const service = new AffiliateAgreementPdfService();
    const buffer = await service.render(BASE_AFFILIATE);
    expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });

  it('still renders with no IP on file (pre-signature-capture rows have none)', async () => {
    const service = new AffiliateAgreementPdfService();
    const buffer = await service.render({ ...BASE_AFFILIATE, signedIp: null });
    expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });
});
