import { MemoryCacheService } from './memory-cache.service';

describe('MemoryCacheService', () => {
  let service: MemoryCacheService;

  beforeEach(() => {
    service = new MemoryCacheService();
  });

  it('serves a cached value without calling the fetcher again', async () => {
    const fetcher = jest.fn().mockResolvedValue('value');

    expect(await service.getOrSet('key', 60_000, fetcher)).toBe('value');
    expect(await service.getOrSet('key', 60_000, fetcher)).toBe('value');

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('collapses concurrent misses for the same key into one fetch', async () => {
    let resolve!: (v: string) => void;
    const fetcher = jest.fn().mockReturnValue(new Promise<string>((r) => (resolve = r)));

    const a = service.getOrSet('key', 60_000, fetcher);
    const b = service.getOrSet('key', 60_000, fetcher);
    resolve('value');

    expect(await a).toBe('value');
    expect(await b).toBe('value');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches once the entry expires', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

    expect(await service.getOrSet('key', 0, fetcher)).toBe('first');
    await new Promise((r) => setTimeout(r, 1));
    expect(await service.getOrSet('key', 0, fetcher)).toBe('second');

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('keeps different keys independent', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce('a-value').mockResolvedValueOnce('b-value');

    expect(await service.getOrSet('a', 60_000, fetcher)).toBe('a-value');
    expect(await service.getOrSet('b', 60_000, fetcher)).toBe('b-value');

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not cache a rejected fetch', async () => {
    const fetcher = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('value');

    await expect(service.getOrSet('key', 60_000, fetcher)).rejects.toThrow('boom');
    expect(await service.getOrSet('key', 60_000, fetcher)).toBe('value');

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
