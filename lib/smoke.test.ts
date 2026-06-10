import { describe, it, expect } from 'vitest';
import { normalizeEvent } from '@/lib/normalize-event';
import { checkRateLimit } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

describe('normalizeEvent', () => {
  it('defaults members and commsLog for legacy documents', () => {
    const event = normalizeEvent({ id: 'evt-1', name: 'Test Event', stage: 'initiation' });
    expect(event.members).toEqual([]);
    expect(event.commsLog).toEqual([]);
    expect(event.memberUids).toEqual([]);
  });

  it('migrates blueprint to masterPlan', () => {
    const event = normalizeEvent({
      id: 'evt-2',
      blueprint: { eventName: 'Legacy' },
      stage: 'blueprint',
    });
    expect(event.masterPlan).toEqual({ eventName: 'Legacy' });
    expect(event.stage).toBe('masterplan');
  });
});

describe('checkRateLimit', () => {
  it('allows requests under the limit', () => {
    const req = new NextRequest('http://localhost/api/ai/test', {
      headers: { 'x-forwarded-for': '203.0.113.1' },
    });
    expect(checkRateLimit(req, 'test-smoke')).toBeNull();
  });
});
