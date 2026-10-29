import { YoutubeClientService } from './youtube-client.service';

describe('YoutubeClientService', () => {
  const originalKey = process.env.YOUTUBE_API_KEY;
  let service: YoutubeClientService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    service = new YoutubeClientService();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    process.env.YOUTUBE_API_KEY = originalKey;
    fetchSpy.mockRestore();
  });

  it('resolves to null without throwing when YOUTUBE_API_KEY is not set', async () => {
    delete process.env.YOUTUBE_API_KEY;
    await expect(service.fetchSubscriberCount('https://www.youtube.com/@aiit')).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resolves to null for a non-YouTube URL, without calling the API', async () => {
    process.env.YOUTUBE_API_KEY = 'key123';
    await expect(service.fetchSubscriberCount('https://instagram.com/aiit')).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resolves a @handle URL via forHandle and returns the subscriber count', async () => {
    process.env.YOUTUBE_API_KEY = 'key123';
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ statistics: { subscriberCount: '12400' } }] }), { status: 200 }));

    await expect(service.fetchSubscriberCount('https://www.youtube.com/@aiit')).resolves.toBe(12400);

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('forHandle=%40aiit');
    expect(calledUrl).toContain('key=key123');
  });

  it('resolves a /channel/ URL via the raw channel id', async () => {
    process.env.YOUTUBE_API_KEY = 'key123';
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ statistics: { subscriberCount: '500' } }] }), { status: 200 }));

    await service.fetchSubscriberCount('https://www.youtube.com/channel/UC1234567890');

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('id=UC1234567890');
  });

  it('resolves to null when the channel hides its subscriber count', async () => {
    process.env.YOUTUBE_API_KEY = 'key123';
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [{ statistics: { hiddenSubscriberCount: true } }] }), { status: 200 }),
    );

    await expect(service.fetchSubscriberCount('https://www.youtube.com/@aiit')).resolves.toBeNull();
  });

  it('resolves to null, not throws, when the API responds with an error status', async () => {
    process.env.YOUTUBE_API_KEY = 'key123';
    fetchSpy.mockResolvedValueOnce(new Response('quota exceeded', { status: 403 }));

    await expect(service.fetchSubscriberCount('https://www.youtube.com/@aiit')).resolves.toBeNull();
  });

  it('resolves to null, not throws, when the fetch itself rejects', async () => {
    process.env.YOUTUBE_API_KEY = 'key123';
    fetchSpy.mockRejectedValueOnce(new Error('network down'));

    await expect(service.fetchSubscriberCount('https://www.youtube.com/@aiit')).resolves.toBeNull();
  });
});
