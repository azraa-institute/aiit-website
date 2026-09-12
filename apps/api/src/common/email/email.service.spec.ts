import { EmailService } from './email.service';

describe('EmailService', () => {
  const originalKey = process.env.RESEND_API_KEY;
  let service: EmailService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    service = new EmailService();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalKey;
    fetchSpy.mockRestore();
  });

  it('no-ops without throwing when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    await expect(
      service.send({ to: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>' }),
    ).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('posts to Resend with the API key when configured', async () => {
    process.env.RESEND_API_KEY = 'key123';
    fetchSpy.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await service.send({ to: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>' });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer key123' }),
      }),
    );
  });

  it('does not throw when Resend responds with an error status', async () => {
    process.env.RESEND_API_KEY = 'key123';
    fetchSpy.mockResolvedValueOnce(new Response('bad request', { status: 400 }));

    await expect(
      service.send({ to: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>' }),
    ).resolves.toBeUndefined();
  });

  it('does not throw when the fetch itself rejects', async () => {
    process.env.RESEND_API_KEY = 'key123';
    fetchSpy.mockRejectedValueOnce(new Error('network down'));

    await expect(
      service.send({ to: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>' }),
    ).resolves.toBeUndefined();
  });
});
