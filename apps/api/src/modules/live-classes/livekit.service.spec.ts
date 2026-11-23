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

describe('LiveKitService recording (Egress)', () => {
  let service: LiveKitService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.LIVEKIT_URL = 'wss://example.livekit.cloud';
    process.env.LIVEKIT_API_KEY = 'APItestkey';
    process.env.LIVEKIT_API_SECRET = 'test-secret-value-that-is-long-enough';
    process.env.R2_ACCOUNT_ID = 'acct-1';
    process.env.R2_ACCESS_KEY_ID = 'r2-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'r2-secret';
    process.env.R2_BUCKET_NAME = 'aiit-media';
    service = new LiveKitService();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    delete process.env.LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
    fetchSpy.mockRestore();
  });

  it('starts a room-composite egress against the livekit.Egress Twirp service with the R2 bucket as its S3 output', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ egressId: 'EG_abc123', status: 'EGRESS_STARTING' }) } as Response);

    const result = await service.startRoomRecording(ROOM);

    expect(result.egressId).toBe('EG_abc123');
    const [calledUrl, init] = fetchSpy.mock.calls[0];
    expect(String(calledUrl)).toContain('/twirp/livekit.Egress/StartEgress');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.room_name).toBe(ROOM);
    expect(body.storage.s3).toEqual({
      access_key: 'r2-access-key',
      secret: 'r2-secret',
      bucket: 'aiit-media',
      endpoint: 'https://acct-1.r2.cloudflarestorage.com',
      force_path_style: true,
    });
  });

  it('refuses to start recording when R2 is not configured', async () => {
    delete process.env.R2_BUCKET_NAME;
    await expect(service.startRoomRecording(ROOM)).rejects.toThrow('Recording storage is not configured yet.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('stops an egress by id against the Egress service', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ egressId: 'EG_abc123', status: 'EGRESS_ENDING' }) } as Response);

    await service.stopRoomRecording('EG_abc123');

    const [calledUrl, init] = fetchSpy.mock.calls[0];
    expect(String(calledUrl)).toContain('/twirp/livekit.Egress/StopEgress');
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ egress_id: 'EG_abc123' });
  });
});
