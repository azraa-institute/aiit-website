import { BrevoClientService } from './brevo-client.service';

describe('BrevoClientService', () => {
  const originalKey = process.env.BREVO_API_KEY;
  let service: BrevoClientService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    service = new BrevoClientService();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    process.env.BREVO_API_KEY = originalKey;
    fetchSpy.mockRestore();
  });

  it('no-ops without throwing when BREVO_API_KEY is not set', async () => {
    delete process.env.BREVO_API_KEY;
    await expect(service.upsertContact({ email: 'a@example.com' })).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('upserts the contact with updateEnabled so a re-application never 400s on an existing email', async () => {
    process.env.BREVO_API_KEY = 'key123';
    fetchSpy.mockResolvedValueOnce(new Response('{}', { status: 201 }));

    await service.upsertContact({ email: 'a@example.com', attributes: { FIRSTNAME: 'Ada' }, listIds: [7] });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/contacts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'api-key': 'key123' }),
        body: JSON.stringify({ email: 'a@example.com', attributes: { FIRSTNAME: 'Ada' }, listIds: [7], updateEnabled: true }),
      }),
    );
  });

  it('does not throw when Brevo responds with an error status', async () => {
    process.env.BREVO_API_KEY = 'key123';
    fetchSpy.mockResolvedValueOnce(new Response('bad request', { status: 400 }));

    await expect(service.upsertContact({ email: 'a@example.com' })).resolves.toBeUndefined();
  });

  it('does not throw when the fetch itself rejects', async () => {
    process.env.BREVO_API_KEY = 'key123';
    fetchSpy.mockRejectedValueOnce(new Error('network down'));

    await expect(service.upsertContact({ email: 'a@example.com' })).resolves.toBeUndefined();
  });
});
