import { LiveKitService } from './livekit.service';

const ROOM = 'class-cls-1';
const IDENTITY = '11111111-1111-4111-8111-111111111111';

describe('LiveKitService.setMicrophonePublishAllowed', () => {
  let service: LiveKitService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.LIVEKIT_URL = 'wss://example.livekit.cloud';
    process.env.LIVEKIT_API_KEY = 'APItestkey';
    process.env.LIVEKIT_API_SECRET = 'test-secret-value-that-is-long-enough';
    service = new LiveKitService();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    delete process.env.LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
    fetchSpy.mockRestore();
  });

  function mockListParticipants(permission: Record<string, unknown> | undefined) {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ participants: [{ identity: IDENTITY, permission }] }),
    } as Response);
  }

  function lastUpdateBody(): Record<string, unknown> {
    const call = fetchSpy.mock.calls.find((c) => String(c[0]).includes('UpdateParticipant'));
    return JSON.parse(String((call?.[1] as RequestInit).body));
  }

  it('revokes the microphone source while leaving every other permission field untouched', async () => {
    mockListParticipants({
      canSubscribe: true,
      canPublish: true,
      canPublishData: true,
      canPublishSources: ['CAMERA', 'MICROPHONE'],
      hidden: false,
      recorder: false,
      canUpdateMetadata: true,
    });
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

    await service.setMicrophonePublishAllowed(ROOM, IDENTITY, false);

    const body = lastUpdateBody();
    expect(body.room).toBe(ROOM);
    expect(body.identity).toBe(IDENTITY);
    expect(body.permission).toEqual({
      canSubscribe: true,
      canPublish: true,
      canPublishData: true,
      canPublishSources: ['CAMERA'],
      hidden: false,
      recorder: false,
      canUpdateMetadata: true,
    });
  });

  it('adds the microphone source back without duplicating it or dropping camera', async () => {
    mockListParticipants({
      canSubscribe: true,
      canPublish: true,
      canPublishData: true,
      canPublishSources: ['CAMERA'],
      hidden: false,
      recorder: false,
      canUpdateMetadata: false,
    });
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

    await service.setMicrophonePublishAllowed(ROOM, IDENTITY, true);

    const body = lastUpdateBody();
    expect(body.permission).toMatchObject({ canPublishSources: ['CAMERA', 'MICROPHONE'] });
  });

  it('also recognises the numeric TrackSource form (2) as the microphone', async () => {
    mockListParticipants({ canPublishSources: [1, 2] }); // CAMERA=1, MICROPHONE=2
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

    await service.setMicrophonePublishAllowed(ROOM, IDENTITY, false);

    const body = lastUpdateBody();
    expect((body.permission as { canPublishSources: unknown[] }).canPublishSources).toEqual([1]);
  });

  it('defaults every field sensibly when the participant has no permission on record yet', async () => {
    mockListParticipants(undefined);
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

    await service.setMicrophonePublishAllowed(ROOM, IDENTITY, true);

    const body = lastUpdateBody();
    expect(body.permission).toEqual({
      canSubscribe: true,
      canPublish: true,
      canPublishData: true,
      canPublishSources: ['MICROPHONE'],
      hidden: false,
      recorder: false,
      canUpdateMetadata: false,
    });
  });
});

describe('LiveKitService.listParticipants', () => {
  let service: LiveKitService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.LIVEKIT_URL = 'wss://example.livekit.cloud';
    process.env.LIVEKIT_API_KEY = 'APItestkey';
    process.env.LIVEKIT_API_SECRET = 'test-secret-value-that-is-long-enough';
    service = new LiveKitService();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    delete process.env.LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
    fetchSpy.mockRestore();
  });

  it('returns just the identities', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ participants: [{ identity: 'a' }, { identity: 'b' }] }),
    } as Response);

    await expect(service.listParticipants(ROOM)).resolves.toEqual(['a', 'b']);
  });

  it('returns an empty array for an empty (or nonexistent) room', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    await expect(service.listParticipants(ROOM)).resolves.toEqual([]);
  });
});
