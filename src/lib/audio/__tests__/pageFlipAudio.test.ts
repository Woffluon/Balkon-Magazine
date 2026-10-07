import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PageFlipAudioManager } from '../pageFlipAudio';

describe('PageFlipAudioManager', () => {
  // Mock localStorage for test isolation
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    PageFlipAudioManager.resetInstance();

    // Setup global window and localStorage mock
    global.window = {
      localStorage: {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
        key: () => null,
        length: 0,
      },
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    PageFlipAudioManager.resetInstance();
    // @ts-expect-error cleanup global mock
    delete global.window;
  });

  it('provides a singleton instance matching the default export', () => {
    const instance1 = PageFlipAudioManager.getInstance();
    const instance2 = PageFlipAudioManager.getInstance();

    assert.equal(instance1, instance2);
    assert.ok(instance1 instanceof PageFlipAudioManager);
  });

  it('initializes with unmuted state by default when localStorage is empty', () => {
    const manager = PageFlipAudioManager.getInstance();
    assert.equal(manager.getMuted(), false);
  });

  it('restores muted state from localStorage on initialization', () => {
    mockStorage['balkon_reader_muted'] = 'true';
    const manager = PageFlipAudioManager.getInstance();
    assert.equal(manager.getMuted(), true);
  });

  it('toggles mute state and updates localStorage', () => {
    const manager = PageFlipAudioManager.getInstance();

    assert.equal(manager.getMuted(), false);
    const newMutedState = manager.toggleMute();
    assert.equal(newMutedState, true);
    assert.equal(manager.getMuted(), true);
    assert.equal(mockStorage['balkon_reader_muted'], 'true');

    manager.toggleMute();
    assert.equal(manager.getMuted(), false);
    assert.equal(mockStorage['balkon_reader_muted'], 'false');
  });

  it('sets muted explicitly via setMuted', () => {
    const manager = PageFlipAudioManager.getInstance();

    manager.setMuted(true);
    assert.equal(manager.getMuted(), true);
    assert.equal(mockStorage['balkon_reader_muted'], 'true');

    manager.setMuted(false);
    assert.equal(manager.getMuted(), false);
    assert.equal(mockStorage['balkon_reader_muted'], 'false');
  });

  it('notifies subscribers when mute state changes and allows unsubscribe', () => {
    const manager = PageFlipAudioManager.getInstance();
    const notifications: boolean[] = [];

    const unsubscribe = manager.subscribe((isMuted) => {
      notifications.push(isMuted);
    });

    manager.setMuted(true);
    manager.setMuted(false);
    assert.deepEqual(notifications, [true, false]);

    unsubscribe();
    manager.setMuted(true);
    // Should not receive third notification after unsubscribe
    assert.deepEqual(notifications, [true, false]);
  });

  it('does not re-notify or re-persist when setting the same mute state', () => {
    const manager = PageFlipAudioManager.getInstance();
    let callCount = 0;

    manager.subscribe(() => {
      callCount++;
    });

    manager.setMuted(false); // Already false
    assert.equal(callCount, 0);

    manager.setMuted(true); // Changed to true
    assert.equal(callCount, 1);

    manager.setMuted(true); // Still true
    assert.equal(callCount, 1);
  });

  it('calculates playback rates within the anti-machine-gun range (0.94 to 1.06)', () => {
    const manager = PageFlipAudioManager.getInstance();

    // Min boundary (random = 0)
    const minRate = manager.calculatePlaybackRate(0);
    assert.equal(minRate, 0.94);

    // Max boundary (random = 1)
    const maxRate = manager.calculatePlaybackRate(1);
    assert.equal(Math.round(maxRate * 1000) / 1000, 1.06);

    // Mid point (random = 0.5)
    const midRate = manager.calculatePlaybackRate(0.5);
    assert.equal(Math.round(midRate * 1000) / 1000, 1.00);

    // Verify 100 random variations are strictly within [0.94, 1.06]
    for (let i = 0; i < 100; i++) {
      const rate = manager.calculatePlaybackRate();
      assert.ok(rate >= 0.94 && rate <= 1.06, `Playback rate ${rate} outside expected range [0.94, 1.06]`);
    }
  });

  it('preloads /sounds/page-flip.opus directly and returns null without fallback if fetch fails', async () => {
    const manager = PageFlipAudioManager.getInstance();
    const originalFetch = global.fetch;

    try {
      let requestedUrl = '';
      global.fetch = (async (url: string | URL | Request) => {
        requestedUrl = String(url);
        return {
          ok: false,
          statusText: 'Not Found',
        } as unknown as Response;
      }) as typeof fetch;

      // Provide mock audioContext
      manager.getAudioContext = () => ({
        decodeAudioData: async () => ({}) as AudioBuffer,
      }) as unknown as AudioContext;

      const buffer = await manager.preload();
      assert.equal(buffer, null);
      assert.equal(requestedUrl, '/sounds/page-flip.opus');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
