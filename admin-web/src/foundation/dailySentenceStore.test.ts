import { describe, expect, it } from 'vitest';
import {
  copyDailySentenceDraft,
  dailySentenceImageAssets,
  getDailySentence,
  precheckDailySentence,
  recordDailySentenceEvent,
  updateDailySentence,
  validateDailySentenceReviewTransition,
} from '../../mock/dailySentenceStore';

const operator = { id: 'content_operator', name: '内容运营', roleName: '内容运营' };

const requiredSentence = (id: string) => {
  const item = getDailySentence(id);
  if (!item) throw new Error(`Missing daily sentence fixture: ${id}`);
  return item;
};

const shanghaiDateOffset = (days: number) => {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
};

const validPayload = (): API.DailySentenceSaveParams => ({
  contentDate: '2026-08-01',
  quote: 'Test the behavior, not the implementation.',
  translation: '验证行为，而不是实现细节。',
  displaySource: 'Mock Engineering Notes',
  sourceReference: 'Internal mock source reference.',
  imageAssetId: dailySentenceImageAssets.find((item) => item.status === 'active')?.id ?? '',
  changeSummary: '新增测试内容。',
  impactScope: '影响目标日期每日一句展示。',
});

describe('daily sentence precheck', () => {
  it('passes complete content and blocks disabled assets', () => {
    expect(precheckDailySentence(validPayload()).level).toBe('passed');
    const disabled = dailySentenceImageAssets.find((item) => item.status === 'disabled');
    const result = precheckDailySentence({ ...validPayload(), imageAssetId: disabled?.id ?? '' });
    expect(result.level).toBe('error');
    expect(result.issues.some((item) => item.code === 'ASSET_DISABLED')).toBe(true);
  });

  it('requires a traceable source reference', () => {
    const result = precheckDailySentence({ ...validPayload(), sourceReference: '' });
    expect(result.level).toBe('error');
    expect(result.issues.some((item) => item.field === 'sourceReference')).toBe(true);
  });
});

describe('daily sentence versions and events', () => {
  it('rejects stale updates through dataVersion', () => {
    const item = requiredSentence('daily-sentence-20260712');
    const result = updateDailySentence(item.id, { ...validPayload(), dataVersion: item.dataVersion - 1 }, operator);
    expect(result.error).toBe('version_conflict');
  });

  it('copies a published version into an empty draft lineage', () => {
    const source = requiredSentence('daily-sentence-20260710');
    const copy = copyDailySentenceDraft(source, operator);
    expect(copy.status).toBe('draft');
    expect(copy.lineageId).toBe(source.lineageId);
    expect(copy.sourceId).toBe(source.id);
    expect(copy.effects).toEqual({ readPv: 0, readUv: 0, checkinUv: 0 });
  });

  it('keeps read events idempotent by eventId and check-ins unique per user', () => {
    const item = requiredSentence('daily-sentence-20260710');
    expect(item.status).toBe('published');
    const eventId = `test-read-${Date.now()}`;
    const first = recordDailySentenceEvent(item, { eventId, userId: 'test-user', eventType: 'read' });
    const duplicate = recordDailySentenceEvent(item, { eventId, userId: 'test-user', eventType: 'read' });
    expect(first.duplicate).toBe(false);
    expect(first.event?.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(duplicate.duplicate).toBe(true);

    const checkin = recordDailySentenceEvent(item, { eventId: `${eventId}-checkin`, userId: 'test-user', eventType: 'check_in' });
    const secondCheckin = recordDailySentenceEvent(item, { eventId: `${eventId}-checkin-2`, userId: 'test-user', eventType: 'check_in' });
    expect(checkin.duplicate).toBe(false);
    expect(secondCheckin.duplicate).toBe(true);
  });

  it('blocks user events for non-published content', () => {
    const item = requiredSentence('daily-sentence-20260712');
    const result = recordDailySentenceEvent(item, { eventId: `draft-event-${Date.now()}`, userId: 'test-user', eventType: 'read' });
    expect(result.error).toBe('not_published');
  });
});

describe('daily sentence release plan', () => {
  it('blocks immediate publication of a future content date', () => {
    const item = requiredSentence('daily-sentence-20260713');
    const originalContentDate = item.contentDate;
    item.contentDate = shanghaiDateOffset(1);
    try {
      const task: API.ReviewTask = {
        id: 'future-release-test', objectType: 'daily_sentence', objectTypeName: '每日一句', objectId: item.id,
        objectName: '未来每日一句', moduleKey: 'content', moduleName: '内容运营', submitter: '内容运营', submittedAt: '2026-07-12 10:00:00',
        version: item.version, priority: 'P1', status: 'approved', riskLevel: 'medium', updatedAt: '2026-07-12 10:00:00',
        changeSummary: '测试', impactScope: '测试', releaseMode: 'immediate', timezone: 'Asia/Shanghai', versionRecords: [], operationRecords: [],
      };
      expect(validateDailySentenceReviewTransition(task, 'pending_publish').ok).toBe(false);
    } finally {
      item.contentDate = originalContentDate;
    }
  });
});
