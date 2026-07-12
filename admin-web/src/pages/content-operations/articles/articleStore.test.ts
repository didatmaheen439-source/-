import { describe, expect, it } from 'vitest';
import {
  articleData,
  buildArticleReviewTask,
  calculateArticleEffects,
  copyArticle,
  precheckArticle,
  recordArticleEvent,
  syncArticleFromReviewTask,
} from '../../../../mock/articleStore';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

describe('articleStore', () => {
  it('blocks missing or disabled assets and warns on short content', () => {
    const source = articleData[0];
    const missing = precheckArticle({
      title: 'Mock external article',
      category: '学习方法',
      summary: '用于验证外刊提交校验。',
      body: 'Short article body.',
      difficulty: 'easy',
      examTypes: ['CET4'],
      sourceName: 'Mock Source',
      sourceUrl: 'https://example.com/source',
      assetIds: ['asset-legacy-disabled'],
    });
    expect(source).toBeDefined();
    expect(missing.passed).toBe(false);
    expect(missing.issues.some((item) => item.message.includes('已停用'))).toBe(true);
    expect(missing.issues.some((item) => item.level === 'warning' && item.field === 'body')).toBe(true);
  });

  it('creates an immutable review snapshot for the submitted version', () => {
    const source = clone(articleData.find((item) => item.status === 'draft'));
    if (!source) throw new Error('Missing draft article seed');
    const tasks: API.ReviewTask[] = [];
    const task = buildArticleReviewTask(source, { id: 'content_operator', name: '内容运营' }, tasks);
    expect(task.objectType).toBe('external_article');
    expect(task.version).toBe(source.version);
    expect(source.snapshots[0]?.body).toBe(source.body);
    source.body = 'Later draft mutation';
    expect(source.snapshots[0]?.body).not.toBe(source.body);
  });

  it('creates a draft version without replacing the current serving snapshot', () => {
    const source = clone(articleData.find((item) => item.id === 'article-plastic-everyday-life'));
    if (!source) throw new Error('Missing published article seed');
    const servingVersionId = source.servingVersionId;
    const draft = copyArticle(source, { id: 'content_operator', name: '内容运营' });
    expect(draft.id).toBe('article-plastic-everyday-life');
    expect(draft.status).toBe('draft');
    expect(draft.isOnline).toBe(true);
    expect(draft.servingVersionId).toBe(servingVersionId);
    expect(draft.version).toBe('V1.2');
  });

  it('keeps user events idempotent and derives completion from distinct users', () => {
    const source = clone(articleData.find((item) => item.id === 'article-plastic-everyday-life'));
    if (!source) throw new Error('Missing published article seed');
    const params: API.ArticleUserEventParams = {
      eventId: 'article-store-test-complete',
      userId: 'article-store-test-user',
      version: 'V1.1',
      type: 'complete',
      occurredAt: '2026-07-12 12:00:00',
    };
    const first = recordArticleEvent(source, params);
    const duplicate = recordArticleEvent(source, params);
    expect(first.ok).toBe(true);
    expect(first.duplicate).toBe(false);
    expect(duplicate.ok).toBe(true);
    expect(duplicate.duplicate).toBe(true);
    expect(calculateArticleEffects(source).readers).toBe(26);
    expect(calculateArticleEffects(source).completions).toBe(7);
  });

  it('surfaces low completion risk and restores a previous serving snapshot on rollback', () => {
    const source = clone(articleData.find((item) => item.id === 'article-plastic-everyday-life'));
    if (!source) throw new Error('Missing published article seed');
    const effects = calculateArticleEffects(source);
    expect(effects.risks.some((item) => item.code === 'low_completion')).toBe(true);
    const task: API.ReviewTask = {
      id: 'review-article-test',
      objectType: 'external_article',
      objectTypeName: '外刊内容',
      objectId: source.id,
      objectName: source.title,
      moduleKey: 'content',
      moduleName: '内容运营',
      submitter: '内容运营',
      submittedAt: '2026-07-10 10:00:00',
      version: source.version,
      priority: 'P1',
      status: 'rolled_back',
      riskLevel: 'medium',
      updatedAt: '2026-07-12 12:00:00',
      changeSummary: '验证回滚。',
      impactScope: 'Mock 用户外刊目录。',
      rollbackTargetVersion: 'V1.0',
      versionRecords: [],
      operationRecords: [],
    };
    const original = articleData.find((item) => item.id === source.id);
    if (!original) throw new Error('Missing store article');
    const previousServing = original.servingVersionId;
    syncArticleFromReviewTask(task, 'published', 'rolled_back', '教研审核', '当前版本完成率异常。');
    expect(original.isOnline).toBe(true);
    expect(original.servingVersionId).not.toBe(previousServing);
    expect(original.rollbackTargetVersion).toBe('V1.0');
  });
});
