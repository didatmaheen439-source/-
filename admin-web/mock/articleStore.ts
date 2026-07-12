import type { Request } from 'express';
import { nowText } from './auditStore';

export const articleDifficultyLabels: Record<API.ArticleDifficulty, string> = {
  easy: '基础',
  medium: '中等',
  hard: '较难',
};

export const articleAssets: API.ArticleAsset[] = [
  {
    id: 'asset-ocean-plastic',
    name: '海岸塑料与潮汐',
    type: 'cover_image',
    previewUrl:
      'https://images.unsplash.com/photo-1484291470158-b8f8d608850d?auto=format&fit=crop&w=1200&q=80',
    sourceName: 'Unsplash',
    sourceUrl: 'https://unsplash.com/',
    licenseNote: 'Mock 演示素材，仅用于内部原型。',
    status: 'enabled',
  },
  {
    id: 'asset-study-notes',
    name: '学习笔记与书桌',
    type: 'cover_image',
    previewUrl:
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80',
    sourceName: 'Unsplash',
    sourceUrl: 'https://unsplash.com/',
    licenseNote: 'Mock 演示素材，仅用于内部原型。',
    status: 'enabled',
  },
  {
    id: 'asset-language-books',
    name: '语言学习书籍',
    type: 'cover_image',
    previewUrl:
      'https://images.unsplash.com/photo-1526243741027-444d633d7365?auto=format&fit=crop&w=1200&q=80',
    sourceName: 'Unsplash',
    sourceUrl: 'https://unsplash.com/',
    licenseNote: 'Mock 演示素材，仅用于内部原型。',
    status: 'enabled',
  },
  {
    id: 'asset-legacy-disabled',
    name: '已停用旧封面',
    type: 'cover_image',
    previewUrl:
      'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1200&q=80',
    sourceName: 'Legacy Mock Asset',
    licenseNote: '旧素材来源信息不完整，禁止新内容引用。',
    status: 'disabled',
  },
];

const reviewActionLabels: Record<API.ReviewTaskStatus, string> = {
  draft: '保存草稿',
  pending_review: '提交审核',
  rejected: '驳回',
  approved: '审核通过',
  pending_publish: '安排发布',
  published: '发布',
  offline: '下架',
  rolled_back: '回滚',
};

const emptyEffects = (articleId: string, version: string): API.ArticleEffectSummary => ({
  articleId,
  version,
  views: 0,
  readers: 0,
  favorites: 0,
  completions: 0,
  completionRate: 0,
  risks: [{ code: 'insufficient_sample', level: 'info', label: '样本不足', description: '阅读用户少于 20，暂不判断内容质量。' }],
  trend: [],
});

const toAssetRefs = (assetIds: string[]): API.ArticleAssetRef[] =>
  assetIds
    .map((id, index) => {
      const asset = articleAssets.find((item) => item.id === id);
      return asset ? { ...asset, usage: index === 0 ? 'cover' as const : 'body' as const } : undefined;
    })
    .filter(Boolean) as API.ArticleAssetRef[];

const createSnapshot = (
  article: Pick<API.ArticleItem, 'id' | 'version' | 'title' | 'category' | 'summary' | 'body' | 'difficulty' | 'examTypes' | 'sourceName' | 'sourceUrl' | 'assets'>,
  operator: string,
  createdAt = nowText(),
): API.ArticleVersionSnapshot => ({
  id: `article-snapshot-${article.id}-${article.version}-${createdAt.replace(/\D/g, '')}`,
  articleId: article.id,
  version: article.version,
  title: article.title,
  category: article.category,
  summary: article.summary,
  body: article.body,
  difficulty: article.difficulty,
  examTypes: [...article.examTypes],
  sourceName: article.sourceName,
  sourceUrl: article.sourceUrl,
  assets: article.assets.map((item) => ({ ...item })),
  createdBy: operator,
  createdAt,
});

const seedBody = [
  'Plastic pollution is often imagined as bottles floating at sea, but its path usually begins much closer to home. A food wrapper, a worn jacket, or a delivery box can slowly break into pieces too small to notice.',
  'Those tiny fragments move through drains, dust, rivers, and soil. They can travel from city streets to coastlines, and from farms to dinner tables. The journey is quiet, which is why the problem can feel invisible.',
  'Scientists are still studying what long-term exposure means for human health. What they already know is enough to make prevention important. Once plastic becomes microscopic, cleaning it up is much harder than stopping it at the source.',
  'Small habits can reduce the flow. Reusing a bottle, choosing less packaging, and washing synthetic clothes less often will not solve the whole problem, but they change demand and reduce daily waste.',
].join('\n\n');

const seedArticle = (params: {
  id: string;
  title: string;
  category: string;
  status: API.ReviewTaskStatus;
  version: string;
  assetId: string;
  difficulty?: API.ArticleDifficulty;
}): API.ArticleItem => {
  const createdAt = '2026-07-08 09:00:00';
  const article: API.ArticleItem = {
    id: params.id,
    title: params.title,
    category: params.category,
    summary: '从日常物品进入环境的塑料碎片，正在改变人们理解污染来源和预防方式的角度。',
    body: seedBody,
    difficulty: params.difficulty ?? 'medium',
    examTypes: ['CET4', 'CET6'],
    sourceName: 'National Geographic Mock Digest',
    sourceUrl: 'https://example.com/mock-article-source',
    assets: toAssetRefs([params.assetId]),
    status: params.status,
    version: params.version,
    dataVersion: 1,
    isOnline: ['published', 'rolled_back'].includes(params.status),
    creatorId: 'content_operator',
    creator: '内容运营',
    createdAt,
    updatedById: 'teaching_reviewer',
    updatedBy: '教研审核',
    updatedAt: '2026-07-10 10:30:00',
    changeSummary: '补充外刊正文、摘要、难度和来源素材。',
    impactScope: '发布后影响外刊列表、文章详情和内容效果统计。',
    snapshots: [],
    versionRecords: [{ id: `article-version-${params.id}`, version: params.version, status: params.status, summary: '外刊种子版本。', createdBy: '内容运营', createdAt }],
    operationRecords: [],
    effects: emptyEffects(params.id, params.version),
  };
  if (article.isOnline) {
    const oldSnapshot = createSnapshot({ ...article, version: 'V1.0', summary: `${article.summary}（历史版本）` }, '教研审核', '2026-07-08 12:00:00');
    const currentSnapshot = createSnapshot(article, '教研审核', '2026-07-10 10:30:00');
    article.snapshots = [currentSnapshot, oldSnapshot];
    article.servingVersionId = currentSnapshot.id;
    article.releaseVersionId = currentSnapshot.id;
    article.rollbackTargetVersion = oldSnapshot.version;
  }
  return article;
};

const initialArticles: API.ArticleItem[] = [
  seedArticle({ id: 'article-plastic-everyday-life', title: 'How Plastic Finds Its Way Into Everyday Life', category: '环境科普', status: 'published', version: 'V1.1', assetId: 'asset-ocean-plastic' }),
  seedArticle({ id: 'article-short-study-sessions', title: 'Why Short Study Sessions Often Work Better', category: '学习方法', status: 'draft', version: 'V0.2', assetId: 'asset-study-notes', difficulty: 'easy' }),
  seedArticle({ id: 'article-language-listening', title: 'Learning a Language Is Also Learning to Listen', category: '语言文化', status: 'rejected', version: 'V0.3', assetId: 'asset-language-books', difficulty: 'hard' }),
];

const seedEvents: API.ArticleUserEvent[] = [
  ...Array.from({ length: 25 }, (_, index) => ({
  eventId: `seed-view-${index + 1}`,
  userId: `mock-user-${String(index + 1).padStart(2, '0')}`,
  articleId: 'article-plastic-everyday-life',
  version: 'V1.1',
  type: 'view' as const,
  occurredAt: `2026-07-${index < 12 ? '10' : '11'} ${String(9 + (index % 8)).padStart(2, '0')}:00:00`,
  })),
  ...Array.from({ length: 6 }, (_, index) => ({
    eventId: `seed-complete-${index + 1}`,
    userId: `mock-user-${String(index + 1).padStart(2, '0')}`,
    articleId: 'article-plastic-everyday-life',
    version: 'V1.1',
    type: 'complete' as const,
    occurredAt: '2026-07-11 18:00:00',
  })),
  ...Array.from({ length: 8 }, (_, index) => ({
    eventId: `seed-favorite-${index + 1}`,
    userId: `mock-user-${String(index + 1).padStart(2, '0')}`,
    articleId: 'article-plastic-everyday-life',
    version: 'V1.1',
    type: 'favorite_add' as const,
    occurredAt: '2026-07-11 18:10:00',
  })),
];

const globalStore = globalThis as typeof globalThis & {
  __GUOJI_ADMIN_ARTICLES__?: API.ArticleItem[];
  __GUOJI_ADMIN_ARTICLE_EVENTS__?: API.ArticleUserEvent[];
};

globalStore.__GUOJI_ADMIN_ARTICLES__ ??= initialArticles;
globalStore.__GUOJI_ADMIN_ARTICLE_EVENTS__ ??= seedEvents;

export const articleData = globalStore.__GUOJI_ADMIN_ARTICLES__;
export const articleEventData = globalStore.__GUOJI_ADMIN_ARTICLE_EVENTS__;

const queryValue = (value: unknown) => Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');

export const calculateArticleEffects = (article: API.ArticleItem): API.ArticleEffectSummary => {
  const version = article.snapshots.find((item) => item.id === article.servingVersionId)?.version ?? article.version;
  const events = articleEventData.filter((item) => item.articleId === article.id && item.version === version);
  const views = events.filter((item) => item.type === 'view');
  const readers = new Set(views.map((item) => item.userId));
  const completions = new Set(events.filter((item) => item.type === 'complete').map((item) => item.userId));
  const favoriteState = new Map<string, boolean>();
  [...events]
    .filter((item) => item.type === 'favorite_add' || item.type === 'favorite_remove')
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .forEach((item) => favoriteState.set(item.userId, item.type === 'favorite_add'));
  const completionRate = readers.size ? Math.round((completions.size / readers.size) * 1000) / 10 : 0;
  const trendMap = new Map<string, API.ArticleEffectTrendPoint>();
  events.forEach((event) => {
    const date = event.occurredAt.slice(0, 10);
    const point = trendMap.get(date) ?? { date, views: 0, readers: 0, completions: 0 };
    if (event.type === 'view') point.views += 1;
    if (event.type === 'complete') point.completions += 1;
    trendMap.set(date, point);
  });
  trendMap.forEach((point, date) => {
    point.readers = new Set(views.filter((item) => item.occurredAt.startsWith(date)).map((item) => item.userId)).size;
  });
  const risks: API.ArticleEffectRisk[] = readers.size < 20
    ? [{ code: 'insufficient_sample', level: 'info', label: '样本不足', description: '阅读用户少于 20，暂不判断内容质量。' }]
    : completionRate < 35
      ? [{ code: 'low_completion', level: 'high', label: '低完成率', description: `完成率 ${completionRate}% 低于 35%，建议复核正文长度、难度和素材匹配。` }]
      : [];
  const summary: API.ArticleEffectSummary = {
    articleId: article.id,
    version,
    views: views.length,
    readers: readers.size,
    favorites: [...favoriteState.values()].filter(Boolean).length,
    completions: completions.size,
    completionRate,
    risks,
    trend: [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
  article.effects = summary;
  return summary;
};

articleData.forEach(calculateArticleEffects);

export const filterArticles = (query: Request['query']) => {
  const keyword = queryValue(query.keyword).trim().toLowerCase();
  const category = queryValue(query.category);
  const difficulty = queryValue(query.difficulty);
  const examType = queryValue(query.examType);
  const status = queryValue(query.status);
  const risk = queryValue(query.risk);
  return [...articleData]
    .filter((item) => !keyword || [item.id, item.title, item.summary, item.sourceName].join(' ').toLowerCase().includes(keyword))
    .filter((item) => !category || item.category === category)
    .filter((item) => !difficulty || item.difficulty === difficulty)
    .filter((item) => !examType || item.examTypes.includes(examType as API.ExamType))
    .filter((item) => !status || item.status === status)
    .filter((item) => !risk || item.effects.risks.some((itemRisk) => itemRisk.code === risk))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const precheckArticle = (params: API.ArticleSaveParams | API.ArticleItem): API.ArticlePrecheckResult => {
  const issues: API.ArticlePrecheckIssue[] = [];
  const add = (level: 'warning' | 'error', field: string, message: string) => issues.push({ id: `article-check-${field}-${issues.length}`, level, field, message });
  const assetIds = 'assetIds' in params ? params.assetIds : params.assets.map((item) => item.id);
  if (!params.title?.trim()) add('error', 'title', '文章标题不能为空。');
  if (!params.category?.trim()) add('error', 'category', '文章分类不能为空。');
  if (!params.summary?.trim()) add('error', 'summary', '文章摘要不能为空。');
  if (!params.body?.trim()) add('error', 'body', '文章正文不能为空。');
  if (!params.examTypes?.length) add('error', 'examTypes', '至少选择一个适用考试。');
  if (!params.sourceName?.trim()) add('error', 'sourceName', '文章来源不能为空。');
  if (!/^https?:\/\//.test(params.sourceUrl ?? '')) add('error', 'sourceUrl', '文章来源链接必须是有效的 HTTP(S) 地址。');
  if (!assetIds.length) add('error', 'assetIds', '至少选择一个封面素材。');
  assetIds.forEach((id) => {
    const asset = articleAssets.find((item) => item.id === id);
    if (!asset) add('error', 'assetIds', `素材 ${id} 不存在。`);
    else if (asset.status !== 'enabled') add('error', 'assetIds', `素材 ${asset.name} 已停用。`);
  });
  const wordCount = params.body?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  if (wordCount > 0 && wordCount < 120) add('warning', 'body', `正文仅 ${wordCount} 个英文词，建议确认是否适合作为完整外刊。`);
  const duplicate = articleData.find((item) => item.id !== ('id' in params ? params.id : undefined) && item.title.trim().toLowerCase() === params.title?.trim().toLowerCase());
  if (duplicate) add('warning', 'title', `标题与文章 ${duplicate.id} 重复。`);
  const errors = issues.filter((item) => item.level === 'error');
  return { passed: errors.length === 0, checkedAt: nowText(), summary: errors.length ? `发现 ${errors.length} 个阻断问题。` : issues.length ? `校验通过，另有 ${issues.length} 个警告。` : '校验通过，可以提交审核。', issues };
};

const nextVersion = (version: string) => {
  const value = Number(version.replace(/^V/, ''));
  return `V${(Number.isFinite(value) ? value + 0.1 : 0.1).toFixed(1)}`;
};

export const createArticle = (params: API.ArticleSaveParams, operator: { id: string; name: string }) => {
  const now = nowText();
  const id = `article-${Date.now()}`;
  const article: API.ArticleItem = {
    id,
    title: params.title.trim(), category: params.category.trim(), summary: params.summary.trim(), body: params.body.trim(),
    difficulty: params.difficulty, examTypes: params.examTypes, sourceName: params.sourceName.trim(), sourceUrl: params.sourceUrl.trim(), assets: toAssetRefs(params.assetIds),
    status: 'draft', version: 'V0.1', dataVersion: 1, isOnline: false,
    creatorId: operator.id, creator: operator.name, createdAt: now, updatedById: operator.id, updatedBy: operator.name, updatedAt: now,
    changeSummary: params.changeSummary?.trim() || '创建外刊草稿。', impactScope: params.impactScope?.trim() || '草稿尚未影响 Mock 用户。',
    snapshots: [], versionRecords: [], operationRecords: [], effects: emptyEffects(id, 'V0.1'),
  };
  article.lastPrecheck = precheckArticle(article);
  article.versionRecords.push({ id: `article-version-${id}`, version: article.version, status: 'draft', summary: article.changeSummary, createdBy: operator.name, createdAt: now });
  article.operationRecords.push({ id: `article-op-${id}`, operator: operator.name, roleName: operator.name, action: '创建草稿', toStatus: 'draft', reason: article.changeSummary, time: now });
  articleData.unshift(article);
  return article;
};

export const updateArticle = (article: API.ArticleItem, params: API.ArticleSaveParams, operator: { id: string; name: string }) => {
  const now = nowText();
  const previousStatus = article.status;
  Object.assign(article, {
    title: params.title.trim(), category: params.category.trim(), summary: params.summary.trim(), body: params.body.trim(), difficulty: params.difficulty,
    examTypes: params.examTypes, sourceName: params.sourceName.trim(), sourceUrl: params.sourceUrl.trim(), assets: toAssetRefs(params.assetIds),
    status: 'draft', version: nextVersion(article.version), dataVersion: article.dataVersion + 1, updatedById: operator.id, updatedBy: operator.name, updatedAt: now,
    changeSummary: params.changeSummary?.trim() || '更新外刊草稿。', impactScope: params.impactScope?.trim() || article.impactScope,
  });
  article.lastPrecheck = precheckArticle(article);
  article.versionRecords.unshift({ id: `article-version-${article.id}-${Date.now()}`, version: article.version, status: 'draft', summary: article.changeSummary, createdBy: operator.name, createdAt: now });
  article.operationRecords.unshift({ id: `article-op-${article.id}-${Date.now()}`, operator: operator.name, roleName: operator.name, action: '保存草稿', fromStatus: previousStatus, toStatus: 'draft', reason: article.changeSummary, time: now });
  calculateArticleEffects(article);
  return article;
};

export const copyArticle = (source: API.ArticleItem, operator: { id: string; name: string }) => {
  const now = nowText();
  const serving = source.snapshots.find((item) => item.id === source.servingVersionId);
  if (serving) {
    Object.assign(source, {
      title: serving.title,
      category: serving.category,
      summary: serving.summary,
      body: serving.body,
      difficulty: serving.difficulty,
      examTypes: [...serving.examTypes],
      sourceName: serving.sourceName,
      sourceUrl: serving.sourceUrl,
      assets: serving.assets.map((item) => ({ ...item })),
    });
  }
  const previousStatus = source.status;
  source.status = 'draft';
  source.version = nextVersion(source.version);
  source.dataVersion += 1;
  source.updatedById = operator.id;
  source.updatedBy = operator.name;
  source.updatedAt = now;
  source.changeSummary = `基于线上版本 ${serving?.version ?? source.version} 创建新草稿。`;
  source.impactScope = '编辑草稿期间继续提供原线上版本，重新发布后切换线上版本。';
  source.reviewTaskId = undefined;
  source.lastPrecheck = precheckArticle(source);
  source.versionRecords.unshift({ id: `article-version-copy-${source.id}-${Date.now()}`, version: source.version, status: 'draft', summary: source.changeSummary, createdBy: operator.name, createdAt: now });
  source.operationRecords.unshift({ id: `article-op-copy-${source.id}-${Date.now()}`, operator: operator.name, roleName: operator.name, action: '复制为新草稿', fromStatus: previousStatus, toStatus: 'draft', reason: source.changeSummary, time: now });
  return source;
};

export const buildArticleReviewTask = (article: API.ArticleItem, operator: { id: string; name: string }, reviewTasks: API.ReviewTask[]) => {
  const now = nowText();
  const snapshot = createSnapshot(article, operator.name, now);
  article.snapshots.unshift(snapshot);
  const payload = {
    objectType: 'external_article' as const, objectTypeName: '外刊内容', objectId: article.id, objectName: article.title,
    moduleKey: 'content', moduleName: '内容运营', submitterId: operator.id, submitter: operator.name, submittedAt: now,
    version: article.version, priority: 'P1' as const, status: 'pending_review' as const, riskLevel: 'medium' as const,
    updatedAt: now, changeSummary: article.changeSummary, impactScope: article.impactScope,
    reviewOpinion: '', reviewer: '', releasePlan: '审核通过后进入待发布队列。', rollbackTargetVersion: article.snapshots[1]?.version,
  };
  const existing = article.reviewTaskId ? reviewTasks.find((item) => item.id === article.reviewTaskId) : undefined;
  if (existing) {
    Object.assign(existing, payload);
    existing.versionRecords.unshift({ id: `review-article-version-${Date.now()}`, version: article.version, status: 'pending_review', summary: article.changeSummary, createdBy: operator.name, createdAt: now });
    return existing;
  }
  const task: API.ReviewTask = {
    id: `review-external-article-${Date.now()}`, ...payload,
    versionRecords: [{ id: `review-article-version-${Date.now()}`, version: article.version, status: 'pending_review', summary: article.changeSummary, createdBy: operator.name, createdAt: now }],
    operationRecords: [{ id: `review-article-op-${Date.now()}`, operator: operator.name, roleName: operator.name, action: '提交审核', fromStatus: article.status, toStatus: 'pending_review', reason: article.changeSummary, time: now }],
  };
  reviewTasks.unshift(task);
  article.reviewTaskId = task.id;
  return task;
};

export const validateArticleReviewTransition = (task: API.ReviewTask, nextStatus: API.ReviewTaskStatus) => {
  if (task.objectType !== 'external_article') return { ok: true as const };
  const article = articleData.find((item) => item.id === task.objectId);
  if (nextStatus === 'rolled_back') {
    const target = article?.snapshots.find((item) => item.version === task.rollbackTargetVersion);
    return target
      ? { ok: true as const }
      : { ok: false as const, errorMessage: '当前外刊没有可恢复的历史已发布版本。', precheck: article?.lastPrecheck };
  }
  if (nextStatus !== 'published') return { ok: true as const };
  const precheck = article ? precheckArticle(article) : undefined;
  if (!article || !precheck?.passed || article.version !== task.version || article.assets.some((item) => item.status !== 'enabled')) {
    return { ok: false as const, errorMessage: '外刊发布前复验失败，请检查文章版本和素材状态。', precheck };
  }
  return { ok: true as const, precheck };
};

export const syncArticleFromReviewTask = (task: API.ReviewTask, previousStatus: API.ReviewTaskStatus, nextStatus: API.ReviewTaskStatus, operatorName: string, reason: string) => {
  if (task.objectType !== 'external_article') return;
  const article = articleData.find((item) => item.id === task.objectId);
  if (!article) return;
  article.status = nextStatus;
  article.updatedBy = operatorName;
  article.updatedAt = task.updatedAt;
  article.reviewTaskId = task.id;
  if (nextStatus === 'published') {
    const snapshot = article.snapshots.find((item) => item.version === task.version);
    article.isOnline = true;
    article.servingVersionId = snapshot?.id;
    article.releaseVersionId = snapshot?.id;
    article.rollbackTargetVersion = article.snapshots.find((item) => item.version !== task.version)?.version;
  } else if (nextStatus === 'offline') {
    article.isOnline = false;
  } else if (nextStatus === 'rolled_back') {
    const target = article.snapshots.find((item) => item.version === task.rollbackTargetVersion) ?? article.snapshots.find((item) => item.version !== task.version);
    article.isOnline = Boolean(target);
    article.servingVersionId = target?.id;
    article.rollbackTargetVersion = target?.version;
  }
  article.operationRecords.unshift({ id: `article-op-review-${Date.now()}`, operator: operatorName, roleName: operatorName, action: reviewActionLabels[nextStatus], fromStatus: previousStatus, toStatus: nextStatus, reason, time: task.updatedAt });
  article.versionRecords.unshift({ id: `article-version-review-${Date.now()}`, version: article.version, status: nextStatus, summary: `${reviewActionLabels[nextStatus]}：${task.changeSummary}`, createdBy: operatorName, createdAt: task.updatedAt });
  calculateArticleEffects(article);
};

export const recordArticleEvent = (article: API.ArticleItem, params: API.ArticleUserEventParams) => {
  const servingVersion = article.snapshots.find((item) => item.id === article.servingVersionId)?.version;
  if (!article.isOnline || !servingVersion || params.version !== servingVersion) {
    return { ok: false as const, errorCode: '409', errorMessage: '文章已下架或版本已更新。' };
  }
  const existing = articleEventData.find((item) => item.eventId === params.eventId);
  if (existing) return { ok: true as const, event: existing, duplicate: true, effects: calculateArticleEffects(article) };
  if (params.type === 'complete' && !articleEventData.some((item) => item.articleId === article.id && item.version === params.version && item.userId === params.userId && item.type === 'view')) {
    articleEventData.push({ eventId: `${params.eventId}-implicit-view`, userId: params.userId, articleId: article.id, version: params.version, type: 'view', occurredAt: params.occurredAt ?? nowText() });
  }
  const event: API.ArticleUserEvent = { eventId: params.eventId, userId: params.userId, articleId: article.id, version: params.version, type: params.type, occurredAt: params.occurredAt ?? nowText() };
  articleEventData.push(event);
  return { ok: true as const, event, duplicate: false, effects: calculateArticleEffects(article) };
};

export const onlineArticleCatalog = () => articleData
  .filter((item) => item.isOnline && item.servingVersionId)
  .map((item) => {
    const snapshot = item.snapshots.find((entry) => entry.id === item.servingVersionId);
    return snapshot ? { ...snapshot, effects: calculateArticleEffects(item) } : undefined;
  })
  .filter(Boolean);
