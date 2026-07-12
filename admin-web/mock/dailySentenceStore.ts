import type { AdminRoleId } from '../src/foundation/permissions';
import { nowText, pushOperationAuditLog } from './auditStore';

export type DailySentenceOperator = {
  id: string;
  name: string;
  roleName: string;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const assetUrls = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80',
];

export const dailySentenceImageAssets: API.DailySentenceImageAsset[] = [
  { id: 'daily-asset-morning', name: '清晨山谷', url: assetUrls[0], thumbnailUrl: assetUrls[0], width: 900, height: 1200, source: 'Unsplash Mock 素材', copyrightNote: '仅用于后台原型演示。', status: 'active' },
  { id: 'daily-asset-lake', name: '静谧湖面', url: assetUrls[1], thumbnailUrl: assetUrls[1], width: 900, height: 1200, source: 'Unsplash Mock 素材', copyrightNote: '仅用于后台原型演示。', status: 'active' },
  { id: 'daily-asset-forest', name: '林间光线', url: assetUrls[2], thumbnailUrl: assetUrls[2], width: 900, height: 1200, source: 'Unsplash Mock 素材', copyrightNote: '仅用于后台原型演示。', status: 'active' },
  { id: 'daily-asset-desert', name: '远山暮色', url: assetUrls[3], thumbnailUrl: assetUrls[3], width: 900, height: 1200, source: 'Unsplash Mock 素材', copyrightNote: '素材已停用，用于发布前复验。', status: 'disabled' },
];

const assetById = (id: string) => dailySentenceImageAssets.find((item) => item.id === id);

const emptyEffects = (): API.DailySentenceEffectSummary => ({ readPv: 0, readUv: 0, checkinUv: 0 });

const versionSnapshot = (item: Pick<API.DailySentenceItem, 'contentDate' | 'quote' | 'translation' | 'displaySource' | 'sourceReference' | 'imageAssetId'>) => ({
  contentDate: item.contentDate,
  quote: item.quote,
  translation: item.translation,
  displaySource: item.displaySource,
  sourceReference: item.sourceReference,
  imageAssetId: item.imageAssetId,
});

const seed = (
  values: Partial<API.DailySentenceItem> & Pick<API.DailySentenceItem, 'id' | 'contentDate' | 'quote' | 'translation' | 'displaySource' | 'sourceReference' | 'imageAssetId' | 'status'>,
): API.DailySentenceItem => {
  const asset = assetById(values.imageAssetId) ?? dailySentenceImageAssets[0];
  const createdAt = values.createdAt ?? `${values.contentDate} 09:00:00`;
  const base = {
    id: values.id,
    lineageId: values.lineageId ?? values.id,
    sourceId: values.sourceId,
    contentDate: values.contentDate,
    quote: values.quote,
    translation: values.translation,
    displaySource: values.displaySource,
    sourceReference: values.sourceReference,
    imageAssetId: values.imageAssetId,
    imageAsset: clone(asset),
    status: values.status,
    version: values.version ?? 'V1.0',
    dataVersion: values.dataVersion ?? 1,
    creatorId: values.creatorId ?? 'content_operator',
    creator: values.creator ?? '内容运营',
    updatedBy: values.updatedBy ?? '内容运营',
    createdAt,
    updatedAt: values.updatedAt ?? createdAt,
    changeSummary: values.changeSummary ?? '新增每日一句内容。',
    impactScope: values.impactScope ?? `影响 ${values.contentDate} 每日一句展示。`,
    reviewTaskId: values.reviewTaskId,
    releaseMode: values.releaseMode,
    scheduledAt: values.scheduledAt,
    publishedAt: values.publishedAt,
    publishedVersion: values.publishedVersion,
    effects: values.effects ?? emptyEffects(),
    versionRecords: [] as API.DailySentenceVersionRecord[],
    operationRecords: values.operationRecords ?? [],
  } satisfies Omit<API.DailySentenceItem, 'versionRecords'> & { versionRecords: API.DailySentenceVersionRecord[] };
  base.versionRecords = values.versionRecords ?? [{ id: `version-${base.id}-seed`, version: base.version, status: base.status, summary: base.changeSummary, createdBy: base.creator, createdAt: base.createdAt, snapshot: versionSnapshot(base) }];
  return base;
};

export const dailySentencesData: API.DailySentenceItem[] = [
  seed({ id: 'daily-sentence-20260710', contentDate: '2026-07-10', quote: 'Action is eloquence.', translation: '行动本身就是最有力的表达。', displaySource: '威廉·莎士比亚，《科利奥兰纳斯》', sourceReference: 'William Shakespeare, Coriolanus, Act III.', imageAssetId: 'daily-asset-morning', status: 'published', version: 'V1.0', publishedVersion: 'V1.0', publishedAt: '2026-07-10 00:05:00' }),
  seed({ id: 'daily-sentence-20260711', contentDate: '2026-07-11', quote: 'It is never too late to be wise.', translation: '变得明智，永远不算太晚。', displaySource: '丹尼尔·笛福，《鲁滨逊漂流记》', sourceReference: 'Daniel Defoe, Robinson Crusoe.', imageAssetId: 'daily-asset-lake', status: 'published', version: 'V1.1', publishedVersion: 'V1.1', publishedAt: '2026-07-11 00:03:00' }),
  seed({ id: 'daily-sentence-20260712', contentDate: '2026-07-12', quote: 'There is no charm equal to tenderness of heart.', translation: '没有什么魅力，比得上一颗温柔的心。', displaySource: '简·奥斯汀，《爱玛》', sourceReference: 'Jane Austen, Emma, Chapter 49.', imageAssetId: 'daily-asset-forest', status: 'draft', version: 'V1.0' }),
  seed({ id: 'daily-sentence-20260713', contentDate: '2026-07-13', quote: 'The world is full of obvious things which nobody by any chance ever observes.', translation: '世界充满显而易见的事，只是很少有人真正观察。', displaySource: '阿瑟·柯南·道尔，《巴斯克维尔的猎犬》', sourceReference: 'Arthur Conan Doyle, The Hound of the Baskervilles.', imageAssetId: 'daily-asset-morning', status: 'pending_review', version: 'V1.0', reviewTaskId: 'review-daily-sentence-20260713' }),
];

export const dailySentenceEvents: API.DailySentenceEvent[] = [
  { id: 'event-daily-read-1', eventId: 'seed-read-1', sentenceId: 'daily-sentence-20260710', version: 'V1.0', userId: 'mock-user-001', eventType: 'read', occurredAt: '2026-07-10 08:12:00' },
  { id: 'event-daily-read-2', eventId: 'seed-read-2', sentenceId: 'daily-sentence-20260710', version: 'V1.0', userId: 'mock-user-002', eventType: 'read', occurredAt: '2026-07-10 08:24:00' },
  { id: 'event-daily-checkin-1', eventId: 'seed-checkin-1', sentenceId: 'daily-sentence-20260710', version: 'V1.0', userId: 'mock-user-001', eventType: 'check_in', occurredAt: '2026-07-10 08:13:00' },
  { id: 'event-daily-read-3', eventId: 'seed-read-3', sentenceId: 'daily-sentence-20260711', version: 'V1.1', userId: 'mock-user-001', eventType: 'read', occurredAt: '2026-07-11 08:10:00' },
  { id: 'event-daily-checkin-2', eventId: 'seed-checkin-2', sentenceId: 'daily-sentence-20260711', version: 'V1.1', userId: 'mock-user-001', eventType: 'check_in', occurredAt: '2026-07-11 08:11:00' },
];

const shanghaiNowText = (date = new Date()) => {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
};

const dateOnly = (value: string) => value.slice(0, 10);
const shanghaiToday = () => shanghaiNowText().slice(0, 10);
const percent = (value: number, total: number) => (total ? Number(((value / total) * 100).toFixed(1)) : undefined);

export const buildDailySentenceEffects = (sentenceId: string) => {
  const events = dailySentenceEvents.filter((item) => item.sentenceId === sentenceId);
  const reads = events.filter((item) => item.eventType === 'read');
  const readUsers = new Set(reads.map((item) => item.userId));
  const checkinUsers = new Set(events.filter((item) => item.eventType === 'check_in').map((item) => item.userId));
  const summary: API.DailySentenceEffectSummary = {
    readPv: reads.length,
    readUv: readUsers.size,
    checkinUv: checkinUsers.size,
    checkinRate: percent(checkinUsers.size, readUsers.size),
  };
  const dates = [...new Set(events.map((item) => dateOnly(item.occurredAt)))].sort();
  const trend: API.DailySentenceEffectTrend[] = dates.map((date) => {
    const daily = events.filter((item) => dateOnly(item.occurredAt) === date);
    const dailyReads = daily.filter((item) => item.eventType === 'read');
    const dailyReadUsers = new Set(dailyReads.map((item) => item.userId));
    const dailyCheckins = new Set(daily.filter((item) => item.eventType === 'check_in').map((item) => item.userId));
    return { date, readPv: dailyReads.length, readUv: dailyReadUsers.size, checkinUv: dailyCheckins.size, checkinRate: percent(dailyCheckins.size, dailyReadUsers.size) };
  });
  const item = dailySentencesData.find((sentence) => sentence.id === sentenceId);
  if (item) item.effects = summary;
  return { summary, trend };
};

dailySentencesData.forEach((item) => buildDailySentenceEffects(item.id));

export const getDailySentence = (id: string) => dailySentencesData.find((item) => item.id === id);

export const filterDailySentences = (params: API.DailySentenceQueryParams) => {
  const keyword = params.keyword?.trim().toLowerCase();
  return [...dailySentencesData]
    .filter((item) => !keyword || [item.id, item.quote, item.translation, item.displaySource].some((value) => value.toLowerCase().includes(keyword)))
    .filter((item) => !params.startDate || item.contentDate >= params.startDate)
    .filter((item) => !params.endDate || item.contentDate <= params.endDate)
    .filter((item) => !params.status || item.status === params.status)
    .filter((item) => !params.assetStatus || item.imageAsset.status === params.assetStatus)
    .filter((item) => !params.creator || item.creator === params.creator)
    .sort((a, b) => b.contentDate.localeCompare(a.contentDate));
};

export const precheckDailySentence = (params: API.DailySentenceSaveParams, currentId?: string) => {
  const issues: API.DailySentencePrecheckIssue[] = [];
  const required: Array<[keyof API.DailySentenceSaveParams, string]> = [
    ['contentDate', '日期'], ['quote', '英文句子'], ['translation', '译文'], ['displaySource', '展示出处'], ['sourceReference', '来源凭证'], ['imageAssetId', '配图'],
  ];
  required.forEach(([field, label]) => {
    if (!String(params[field] ?? '').trim()) issues.push({ id: `required-${field}`, level: 'error', field, code: 'REQUIRED', message: `${label}不能为空。` });
  });
  const asset = assetById(params.imageAssetId);
  if (!asset) issues.push({ id: 'asset-missing', level: 'error', field: 'imageAssetId', code: 'ASSET_NOT_FOUND', message: '引用的配图素材不存在。' });
  else if (asset.status !== 'active') issues.push({ id: 'asset-disabled', level: 'error', field: 'imageAssetId', code: 'ASSET_DISABLED', message: '引用的配图素材已停用。' });
  const conflict = dailySentencesData.find((item) => item.id !== currentId && item.contentDate === params.contentDate && ['approved', 'pending_publish'].includes(item.status));
  if (conflict) issues.push({ id: 'date-pipeline-conflict', level: 'warning', field: 'contentDate', code: 'DATE_PIPELINE_CONFLICT', message: `该日期已有 ${conflict.status === 'approved' ? '已通过' : '待发布'} 内容 ${conflict.id}。` });
  const level: API.DailySentencePrecheckLevel = issues.some((item) => item.level === 'error') ? 'error' : issues.length ? 'warning' : 'passed';
  return { level, issues, summary: level === 'passed' ? '内容、来源、配图和日期校验通过。' : `发现 ${issues.length} 项需要处理的校验结果。`, checkedAt: nowText() } satisfies API.DailySentencePrecheckResult;
};

export const createDailySentence = (params: API.DailySentenceSaveParams, operator: DailySentenceOperator) => {
  const now = nowText();
  const id = `daily-sentence-${params.contentDate.replaceAll('-', '')}-${Date.now().toString().slice(-4)}`;
  const item = seed({ ...params, id, status: 'draft', creatorId: operator.id, creator: operator.name, updatedBy: operator.name, createdAt: now, updatedAt: now, imageAssetId: params.imageAssetId, version: 'V1.0' });
  item.lastPrecheck = precheckDailySentence(params, id);
  dailySentencesData.unshift(item);
  return item;
};

export const updateDailySentence = (id: string, params: API.DailySentenceSaveParams, operator: DailySentenceOperator) => {
  const item = getDailySentence(id);
  if (!item) return { error: 'not_found' as const };
  if (!['draft', 'rejected'].includes(item.status)) return { error: 'not_editable' as const };
  if (params.dataVersion !== item.dataVersion) return { error: 'version_conflict' as const, item };
  const asset = assetById(params.imageAssetId) ?? item.imageAsset;
  Object.assign(item, params, { imageAsset: clone(asset), updatedBy: operator.name, updatedAt: nowText(), dataVersion: item.dataVersion + 1 });
  item.lastPrecheck = precheckDailySentence(params, id);
  item.operationRecords.unshift({ id: `op-${id}-${Date.now()}`, operator: operator.name, roleName: operator.roleName, action: '保存草稿', fromStatus: item.status, toStatus: item.status, reason: params.changeSummary || '更新每日一句草稿。', time: item.updatedAt });
  return { item };
};

export const copyDailySentenceDraft = (source: API.DailySentenceItem, operator: DailySentenceOperator) => {
  const now = nowText();
  const id = `daily-sentence-${source.contentDate.replaceAll('-', '')}-${Date.now().toString().slice(-4)}`;
  const nextVersion = `V${Number(source.version.replace('V', '').split('.')[0] || 1) + 1}.0`;
  const item = seed({ ...clone(source), id, sourceId: source.id, lineageId: source.lineageId, status: 'draft', version: nextVersion, dataVersion: 1, reviewTaskId: undefined, releaseMode: undefined, scheduledAt: undefined, publishedAt: undefined, publishedVersion: undefined, creatorId: operator.id, creator: operator.name, updatedBy: operator.name, createdAt: now, updatedAt: now, changeSummary: `基于 ${source.version} 复制新版本。`, effects: emptyEffects(), versionRecords: [], operationRecords: [] });
  item.versionRecords = [{ id: `version-${id}-${Date.now()}`, version: item.version, status: 'draft', summary: item.changeSummary, createdBy: operator.name, createdAt: now, snapshot: versionSnapshot(item) }];
  dailySentencesData.unshift(item);
  return item;
};

export const submitDailySentenceReview = (
  item: API.DailySentenceItem,
  params: API.DailySentenceSubmitParams,
  operator: DailySentenceOperator,
  reviewTasks: API.ReviewTask[],
) => {
  if (params.dataVersion !== item.dataVersion) return { error: 'version_conflict' as const, item };
  const precheck = precheckDailySentence(item, item.id);
  item.lastPrecheck = precheck;
  if (precheck.level === 'error' || (precheck.level === 'warning' && !params.confirmWarnings)) return { error: 'precheck' as const, precheck };
  const now = nowText();
  const previousStatus = item.status;
  const task: API.ReviewTask = {
    id: item.reviewTaskId ?? `review-daily-sentence-${Date.now()}`,
    objectType: 'daily_sentence', objectTypeName: '每日一句', objectId: item.id, objectName: `每日一句 ${item.contentDate}`,
    moduleKey: 'content', moduleName: '内容运营', submitterId: operator.id, submitter: operator.name, submittedAt: now,
    version: item.version, priority: 'P1', status: 'pending_review', riskLevel: 'medium', updatedAt: now,
    changeSummary: params.changeSummary, impactScope: item.impactScope, releasePlan: '审核通过后选择立即发布或定时发布。',
    rollbackTargetVersion: item.publishedVersion, objectDetailPath: `/content-operations/daily-sentences/${item.id}`,
    versionRecords: [{ id: `review-version-${item.id}-${Date.now()}`, version: item.version, status: 'pending_review', summary: params.changeSummary, createdBy: operator.name, createdAt: now }],
    operationRecords: [{ id: `review-op-${item.id}-${Date.now()}`, operator: operator.name, roleName: operator.roleName, action: '提交审核', fromStatus: previousStatus, toStatus: 'pending_review', reason: params.changeSummary, time: now }],
  };
  const index = reviewTasks.findIndex((entry) => entry.id === task.id);
  if (index >= 0) reviewTasks.splice(index, 1, task); else reviewTasks.unshift(task);
  item.status = 'pending_review'; item.reviewTaskId = task.id; item.updatedAt = now; item.updatedBy = operator.name; item.dataVersion += 1; item.changeSummary = params.changeSummary;
  item.operationRecords.unshift(task.operationRecords[0]);
  item.versionRecords.unshift({ ...task.versionRecords[0], snapshot: versionSnapshot(item) });
  return { item, task };
};

export const isDailySentenceReviewTask = (task: API.ReviewTask) => task.objectType === 'daily_sentence';

export const validateDailySentenceReviewTransition = (task: API.ReviewTask, nextStatus: API.ReviewTaskStatus) => {
  if (!isDailySentenceReviewTask(task)) return { ok: true as const };
  const item = getDailySentence(task.objectId);
  if (!item) return { ok: false as const, errorMessage: '每日一句内容不存在。' };
  if (nextStatus === 'pending_publish') {
    if (task.releaseMode === 'scheduled') {
      if (!task.scheduledAt) return { ok: false as const, errorMessage: '定时发布必须设置发布时间。' };
      if (task.scheduledAt.slice(0, 10) !== item.contentDate) return { ok: false as const, errorMessage: '定时发布时间必须与内容日期为同一上海自然日。' };
      if (task.scheduledAt <= shanghaiNowText()) return { ok: false as const, errorMessage: '定时发布时间必须晚于当前时间。' };
    }
    if (task.releaseMode === 'immediate' && item.contentDate > shanghaiToday()) {
      return { ok: false as const, errorMessage: '未来日期内容不能立即发布，请选择定时发布。' };
    }
  }
  if (nextStatus === 'published') {
    if (task.version !== item.version) return { ok: false as const, errorMessage: '审核版本与待发布版本不一致。' };
    const precheck = precheckDailySentence(item, item.id);
    if (precheck.level === 'error') return { ok: false as const, errorMessage: '发布前复验失败。', precheck };
    const conflict = dailySentencesData.find((entry) => entry.id !== item.id && entry.contentDate === item.contentDate && entry.status === 'published' && entry.lineageId !== item.lineageId);
    if (conflict) return { ok: false as const, errorMessage: `同一日期已有线上主内容 ${conflict.id}。` };
  }
  return { ok: true as const };
};

export const syncDailySentenceFromReviewTask = (task: API.ReviewTask, previousStatus: API.ReviewTaskStatus, nextStatus: API.ReviewTaskStatus, operator: DailySentenceOperator, reason: string) => {
  if (!isDailySentenceReviewTask(task)) return;
  const item = getDailySentence(task.objectId);
  if (!item) return;
  const now = task.updatedAt || nowText();
  item.status = nextStatus; item.reviewTaskId = task.id; item.updatedAt = now; item.updatedBy = operator.name; item.releaseMode = task.releaseMode; item.scheduledAt = task.scheduledAt;
  item.lastPrecheck = precheckDailySentence(item, item.id);
  if (nextStatus === 'published') {
    dailySentencesData.filter((entry) => entry.id !== item.id && entry.contentDate === item.contentDate && entry.status === 'published' && entry.lineageId === item.lineageId).forEach((entry) => { entry.status = 'offline'; entry.updatedAt = now; entry.operationRecords.unshift({ id: `op-replaced-${entry.id}-${Date.now()}`, operator: operator.name, roleName: operator.roleName, action: '版本替换下架', fromStatus: 'published', toStatus: 'offline', reason: `由 ${item.id} 替换线上版本。`, time: now }); });
    item.publishedAt = now; item.publishedVersion = item.version; task.rollbackTargetVersion = item.sourceId ? getDailySentence(item.sourceId)?.version : item.version;
  }
  item.operationRecords.unshift({ id: `op-sync-${item.id}-${Date.now()}`, operator: operator.name, roleName: operator.roleName, action: task.operationRecords[0]?.action ?? '状态同步', fromStatus: previousStatus, toStatus: nextStatus, reason, time: now });
};

export const recordDailySentenceEvent = (item: API.DailySentenceItem, params: API.DailySentenceMockEventParams) => {
  if (item.status !== 'published') return { error: 'not_published' as const };
  const existing = dailySentenceEvents.find((event) => event.eventId === params.eventId);
  if (existing) return { event: existing, duplicate: true, effects: buildDailySentenceEffects(item.id) };
  if (params.eventType === 'check_in') {
    const checked = dailySentenceEvents.find((event) => event.sentenceId === item.id && event.version === item.version && event.userId === params.userId && event.eventType === 'check_in');
    if (checked) return { event: checked, duplicate: true, effects: buildDailySentenceEffects(item.id) };
  }
  const event: API.DailySentenceEvent = { ...params, id: `event-daily-${Date.now()}`, sentenceId: item.id, version: item.version, occurredAt: params.occurredAt || shanghaiNowText() };
  dailySentenceEvents.unshift(event);
  return { event, duplicate: false, effects: buildDailySentenceEffects(item.id) };
};

export const reconcileDueDailySentenceSchedules = (reviewTasks: API.ReviewTask[]) => {
  const now = shanghaiNowText();
  reviewTasks.filter((task) => task.objectType === 'daily_sentence' && task.status === 'pending_publish' && task.releaseMode === 'scheduled' && task.scheduledAt && task.scheduledAt <= now).forEach((task) => {
    const validation = validateDailySentenceReviewTransition(task, 'published');
    if (!validation.ok) return;
    const previousStatus = task.status;
    task.status = 'published'; task.updatedAt = now; task.reviewOpinion = '定时发布任务执行成功。';
    task.operationRecords.unshift({ id: `op-scheduler-${task.id}-${Date.now()}`, operator: 'Mock 调度器', roleName: '系统', action: '定时发布', fromStatus: previousStatus, toStatus: 'published', reason: '达到发布计划时间。', time: now });
    syncDailySentenceFromReviewTask(task, previousStatus, 'published', { id: 'mock-scheduler', name: 'Mock 调度器', roleName: '系统' }, '达到发布计划时间。');
    pushOperationAuditLog({ roleId: 'super_admin' as AdminRoleId, action: '定时发布', objectType: 'content', objectId: task.objectId, sourcePage: '/review-release/pending', reason: '达到发布计划时间。', result: 'success', changeSummary: `${task.objectName} 自动发布。`, version: task.version });
  });
};

export const dailySentenceAnalytics = (startDate: string, endDate: string) => {
  const events = dailySentenceEvents.filter((item) => dateOnly(item.occurredAt) >= startDate && dateOnly(item.occurredAt) <= endDate);
  const reads = events.filter((item) => item.eventType === 'read');
  const readUsers = new Set(reads.map((item) => item.userId));
  const checkinUsers = new Set(events.filter((item) => item.eventType === 'check_in').map((item) => item.userId));
  return { total: dailySentencesData.length, published: dailySentencesData.filter((item) => item.status === 'published').length, readUv: readUsers.size, checkinUv: checkinUsers.size, checkinRate: percent(checkinUsers.size, readUsers.size) };
};
