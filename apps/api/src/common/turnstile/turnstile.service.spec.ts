import { ServiceUnavailableException } from '@nestjs/common';
import { TurnstileService } from './turnstile.service';

describe('TurnstileService', () => {
  const originalSecret = process.env.TURNSTILE_SECRET_KEY;
  let service: TurnstileService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    service = new TurnstileService();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    process.env.TURNSTILE_SECRET_KEY = originalSecret;
    fetchSpy.mockRestore();
  });

  it('rejects when TURNSTILE_SECRET_KEY is not configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    await expect(service.verify('token')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects when no token is provided', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    await expect(service.verify(undefined)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resolves when Cloudflare reports success', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

    await expect(service.verify('token', '1.2.3.4')).resolves.toBeUndefined();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect((init?.body as URLSearchParams).get('remoteip')).toBe('1.2.3.4');
  });

  it('rejects when Cloudflare reports failure', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ success: false }), { status: 200 }));

    await expect(service.verify('token')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects when the verification request itself throws', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    fetchSpy.mockRejectedValueOnce(new Error('network down'));

    await expect(service.verify('token')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
