import { nowText } from './auditStore';

export const advancedStrategyKindLabels: Record<API.AdvancedLearningStrategyKind, string> = {
  light_task: '轻量任务',
  extra_practice: '追加陪练',
  review_recommendation: '复练推荐',
};

export const strategyReferences: API.StrategyReference[] = [
  { id: 'group-cet4-reading-core', name: '四级阅读核心题组', type: 'question_group', examType: 'CET4', module: 'reading', status: 'published', available: true },
  { id: 'question-cet4-vocabulary-001', name: '四级核心词汇辨析', type: 'question', examType: 'CET4', module: 'vocabulary', status: 'published', available: true },
  { id: 'group-cet6-listening-core', name: '六级听力精听题组', type: 'question_group', examType: 'CET6', module: 'listening', status: 'published', available: true },
  { id: 'group-cet6-reading-core', name: '六级阅读定位题组', type: 'question_group', examType: 'CET6', module: 'reading', status: 'published', available: true },
  { id: 'group-cet6-writing-offline', name: '六级写作旧题组', type: 'question_group', examType: 'CET6', module: 'writing', status: 'offline', available: false },
  { id: 'wrong-reading-location', name: '阅读定位偏差', type: 'wrong_reason_tag', examType: 'CET4', module: 'reading', status: 'published', available: true },
  { id: 'wrong-listening-detail', name: '听力细节遗漏', type: 'wrong_reason_tag', examType: 'CET6', module: 'listening', status: 'published', available: true },
  { id: 'module-listening-coach', name: 'AI 听力陪练', type: 'module', module: 'listening', status: 'enabled', available: true },
];

const trigger = (
  metric: API.StrategyTriggerMetric,
  operator: API.StrategyTriggerCondition['operator'],
  value: API.StrategyTriggerCondition['value'],
  description: string,
): API.StrategyTriggerCondition => ({
  id: `condition-${metric}-${String(value)}`,
  metric,
  operator,
  value,
  description,
});

const ref = (id: string) => {
  const found = strategyReferences.find((item) => item.id === id);
  if (!found) throw new Error(`Missing strategy reference: ${id}`);
  return { ...found };
};

const seedStrategy = (
  params: Partial<API.AdvancedLearningStrategy> & Pick<API.AdvancedLearningStrategy, 'id' | 'kind' | 'name' | 'examType' | 'module' | 'priority' | 'status' | 'version' | 'primaryReference' | 'triggerGroup'>,
): API.AdvancedLearningStrategy => ({
  id: params.id,
  kind: params.kind,
  name: params.name,
  description: params.description ?? `${params.name}的 Mock 策略。`,
  examType: params.examType,
  module: params.module,
  priority: params.priority,
  status: params.status,
  version: params.version,
  dataVersion: params.dataVersion ?? 1,
  triggerGroup: params.triggerGroup,
  primaryReference: params.primaryReference,
  fallbackRule: params.fallbackRule ?? { enabled: false, trigger: 'primary_unavailable' },
  estimatedMinutes: params.estimatedMinutes,
  practiceCount: params.practiceCount,
  reviewIntervalDays: params.reviewIntervalDays,
  questionTypes: params.questionTypes,
  wrongReasonTagIds: params.wrongReasonTagIds,
  createdById: params.createdById ?? 'teaching_reviewer',
  createdBy: params.createdBy ?? '教研审核',
  createdAt: params.createdAt ?? '2026-07-10 09:00:00',
  updatedById: params.updatedById ?? 'teaching_reviewer',
  updatedBy: params.updatedBy ?? '教研审核',
  updatedAt: params.updatedAt ?? '2026-07-12 10:00:00',
  changeSummary: params.changeSummary ?? '完善触发和替代规则。',
  impactScope: params.impactScope ?? `影响 ${params.examType} ${advancedStrategyKindLabels[params.kind]}命中。`,
  reviewTaskId: params.reviewTaskId,
  releaseVersionId: params.releaseVersionId,
  onlineVersion: params.onlineVersion ?? (['published', 'rolled_back'].includes(params.status) ? params.version : undefined),
  rollbackTargetVersion: params.rollbackTargetVersion,
  lastPrecheck: params.lastPrecheck,
  versionRecords: params.versionRecords ?? [{ id: `version-${params.id}-${params.version}`, configId: params.id, kind: params.kind, version: params.version, status: params.status, createdBy: '教研审核', createdAt: '2026-07-10 09:00:00', changeSummary: '初始策略版本。', currentOnline: ['published', 'rolled_back'].includes(params.status) }],
  operationRecords: params.operationRecords ?? [],
});

const initialStrategies: API.AdvancedLearningStrategy[] = [
  seedStrategy({ id: 'strategy-light-cet4-reading', kind: 'light_task', name: '四级阅读 10 分钟轻量任务', examType: 'CET4', module: 'reading', priority: 10, status: 'published', version: 'V1.1', estimatedMinutes: 10, primaryReference: ref('group-cet4-reading-core'), fallbackRule: { enabled: true, trigger: 'insufficient_time', targetId: 'question-cet4-vocabulary-001', targetName: '四级核心词汇辨析' }, triggerGroup: { mode: 'all', conditions: [trigger('available_minutes', 'gte', 10, '可用时间不少于 10 分钟'), trigger('weak_module', 'eq', 'reading', '当前薄弱模块为阅读')] }, releaseVersionId: 'strategy-light-cet4-reading-V1.1', rollbackTargetVersion: 'V1.0' }),
  seedStrategy({ id: 'strategy-light-cet6-listening-draft', kind: 'light_task', name: '六级听力 12 分钟轻量任务', examType: 'CET6', module: 'listening', priority: 20, status: 'draft', version: 'V0.2', estimatedMinutes: 12, primaryReference: ref('group-cet6-listening-core'), triggerGroup: { mode: 'all', conditions: [trigger('available_minutes', 'gte', 12, '可用时间不少于 12 分钟'), trigger('accuracy', 'lt', 70, '近期正确率低于 70%')] } }),
  seedStrategy({ id: 'strategy-extra-cet6-listening', kind: 'extra_practice', name: '六级听力连续错题追加陪练', examType: 'CET6', module: 'listening', priority: 10, status: 'published', version: 'V1.0', practiceCount: 2, primaryReference: ref('group-cet6-listening-core'), fallbackRule: { enabled: true, trigger: 'already_completed', targetId: 'module-listening-coach', targetName: 'AI 听力陪练' }, triggerGroup: { mode: 'all', conditions: [trigger('consecutive_errors', 'gte', 2, '连续错题不少于 2 道'), trigger('weak_module', 'eq', 'listening', '当前薄弱模块为听力')] } }),
  seedStrategy({ id: 'strategy-extra-cet4-reading-review', kind: 'extra_practice', name: '四级阅读低正确率追加练习', examType: 'CET4', module: 'reading', priority: 20, status: 'pending_review', version: 'V0.5', practiceCount: 1, primaryReference: ref('group-cet4-reading-core'), triggerGroup: { mode: 'all', conditions: [trigger('accuracy', 'lt', 60, '近期正确率低于 60%')] } }),
  seedStrategy({ id: 'strategy-review-cet4-reading', kind: 'review_recommendation', name: '四级阅读定位偏差复练', examType: 'CET4', module: 'reading', priority: 10, status: 'published', version: 'V1.0', reviewIntervalDays: 3, wrongReasonTagIds: ['wrong-reading-location'], questionTypes: ['reading'], primaryReference: ref('group-cet4-reading-core'), fallbackRule: { enabled: true, trigger: 'primary_unavailable', targetId: 'question-cet4-vocabulary-001', targetName: '四级核心词汇辨析' }, triggerGroup: { mode: 'all', conditions: [trigger('wrong_reason_tag', 'in', ['wrong-reading-location'], '存在阅读定位偏差'), trigger('days_since_practice', 'gte', 3, '距上次练习不少于 3 天')] } }),
  seedStrategy({ id: 'strategy-review-cet6-invalid-ref', kind: 'review_recommendation', name: '六级写作旧题复练', examType: 'CET6', module: 'writing', priority: 30, status: 'rejected', version: 'V0.3', reviewIntervalDays: 5, primaryReference: ref('group-cet6-writing-offline'), triggerGroup: { mode: 'all', conditions: [trigger('days_since_practice', 'gte', 5, '距上次练习不少于 5 天')] }, changeSummary: '引用题组已下架，需替换。' }),
];

export const strategyMockProfiles: API.StrategyMockProfile[] = [
  { id: 'mock-cet4-reading', name: '四级阅读薄弱用户', examType: 'CET4', availableMinutes: 12, weakModule: 'reading', accuracy: 56, consecutiveErrors: 3, wrongReasonTags: ['wrong-reading-location'], daysSincePractice: 4 },
  { id: 'mock-cet6-listening', name: '六级听力连错用户', examType: 'CET6', availableMinutes: 18, weakModule: 'listening', accuracy: 62, consecutiveErrors: 4, wrongReasonTags: ['wrong-listening-detail'], daysSincePractice: 2 },
  { id: 'mock-cet4-stable', name: '四级稳定学习用户', examType: 'CET4', availableMinutes: 8, weakModule: 'vocabulary', accuracy: 86, consecutiveErrors: 0, wrongReasonTags: [], daysSincePractice: 1 },
];

type StrategyGlobalStore = typeof globalThis & {
  __GUOJI_ADVANCED_STRATEGIES__?: API.AdvancedLearningStrategy[];
  __GUOJI_ADVANCED_STRATEGY_RUNS__?: API.StrategyMatchRun[];
};

const globalStore = globalThis as StrategyGlobalStore;
export const advancedLearningStrategies = globalStore.__GUOJI_ADVANCED_STRATEGIES__ ??= initialStrategies;
export const strategyMatchRuns = globalStore.__GUOJI_ADVANCED_STRATEGY_RUNS__ ??= [
  { id: 'run-light-complete', profileId: 'mock-cet4-reading', profileName: '四级阅读薄弱用户', kind: 'light_task', matched: true, strategyId: 'strategy-light-cet4-reading', strategyName: '四级阅读 10 分钟轻量任务', strategyVersion: 'V1.1', resultReferenceId: 'group-cet4-reading-core', resultReferenceName: '四级阅读核心题组', usedFallback: false, reason: '命中已发布的最高优先级策略。', status: 'completed', matchedAt: '2026-07-12 09:10:00', updatedAt: '2026-07-12 09:24:00' },
  { id: 'run-extra-started', profileId: 'mock-cet6-listening', profileName: '六级听力连错用户', kind: 'extra_practice', matched: true, strategyId: 'strategy-extra-cet6-listening', strategyName: '六级听力连续错题追加陪练', strategyVersion: 'V1.0', resultReferenceId: 'group-cet6-listening-core', resultReferenceName: '六级听力精听题组', usedFallback: false, reason: '命中已发布的最高优先级策略。', status: 'started', matchedAt: '2026-07-12 10:10:00', updatedAt: '2026-07-12 10:12:00' },
];

export const precheckAdvancedStrategy = (
  strategy: Pick<API.AdvancedLearningStrategy, 'id' | 'kind' | 'name' | 'examType' | 'priority' | 'triggerGroup' | 'primaryReference' | 'fallbackRule' | 'estimatedMinutes' | 'reviewIntervalDays'>,
  source = advancedLearningStrategies,
): API.StrategyPrecheckResult => {
  const issues: API.StrategyPrecheckIssue[] = [];
  const add = (level: 'error' | 'warning', field: string, code: string, message: string) => issues.push({ id: `${code}-${issues.length + 1}`, level, field, code, message });
  if (!strategy.name?.trim()) add('error', 'name', 'required', '策略名称不能为空。');
  if (!strategy.triggerGroup?.conditions?.length) add('error', 'triggerGroup', 'required', '至少配置一个触发条件。');
  if (!strategy.primaryReference?.id) add('error', 'primaryReference', 'required', '必须选择主任务或推荐内容。');
  if (!strategy.primaryReference?.available) add('error', 'primaryReference', 'reference_unavailable', '主引用对象当前不可用。');
  if (strategy.primaryReference?.examType && strategy.primaryReference.examType !== strategy.examType) add('error', 'primaryReference', 'exam_mismatch', '主引用对象考试类型不匹配。');
  if (strategy.kind === 'light_task' && (Number(strategy.estimatedMinutes) < 5 || Number(strategy.estimatedMinutes) > 15)) add('error', 'estimatedMinutes', 'light_duration', '轻量任务预计时长必须为 5–15 分钟。');
  if (strategy.kind === 'review_recommendation' && Number(strategy.reviewIntervalDays) < 0) add('error', 'reviewIntervalDays', 'negative_interval', '复练间隔不能为负数。');
  if (strategy.fallbackRule?.enabled) {
    if (!strategy.fallbackRule.targetId) add('error', 'fallbackRule', 'fallback_missing', '已启用替代规则，但未选择替代目标。');
    if (strategy.fallbackRule.targetId === strategy.primaryReference?.id) add('error', 'fallbackRule', 'fallback_self', '替代目标不能与主目标相同。');
    const fallback = strategyReferences.find((item) => item.id === strategy.fallbackRule.targetId);
    if (strategy.fallbackRule.targetId && !fallback?.available) add('error', 'fallbackRule', 'fallback_unavailable', '替代目标不存在或不可用。');
  }
  const conflict = source.find((item) => item.id !== strategy.id && item.kind === strategy.kind && item.examType === strategy.examType && item.module === strategy.primaryReference?.module && item.priority === Number(strategy.priority) && !['offline', 'rejected'].includes(item.status));
  if (conflict) add('warning', 'priority', 'priority_conflict', `存在同范围同优先级策略：${conflict.name}。`);
  const level = issues.some((item) => item.level === 'error') ? 'error' : issues.length ? 'warning' : 'passed';
  return { level, checkedAt: nowText(), issues, summary: level === 'passed' ? '预校验通过。' : `预校验发现 ${issues.length} 个问题。` };
};

const metricValue = (profile: API.StrategyMockProfile, metric: API.StrategyTriggerMetric) => ({
  available_minutes: profile.availableMinutes,
  weak_module: profile.weakModule,
  accuracy: profile.accuracy,
  consecutive_errors: profile.consecutiveErrors,
  wrong_reason_tag: profile.wrongReasonTags,
  days_since_practice: profile.daysSincePractice,
})[metric];

export const conditionMatches = (condition: API.StrategyTriggerCondition, profile: API.StrategyMockProfile) => {
  const actual = metricValue(profile, condition.metric);
  const expected = condition.value;
  if (condition.operator === 'in') return Array.isArray(actual) && Array.isArray(expected) && actual.some((item) => expected.includes(item));
  if (condition.operator === 'eq') return actual === expected;
  if (condition.operator === 'lt') return Number(actual) < Number(expected);
  if (condition.operator === 'lte') return Number(actual) <= Number(expected);
  if (condition.operator === 'gt') return Number(actual) > Number(expected);
  if (condition.operator === 'gte') return Number(actual) >= Number(expected);
  return false;
};

export const runStrategyMatch = (
  profile: API.StrategyMockProfile,
  kind: API.AdvancedLearningStrategyKind,
  source = advancedLearningStrategies,
): API.StrategyMatchRun => {
  const candidates = source.filter((item) => item.kind === kind && item.examType === profile.examType && ['published', 'rolled_back'].includes(item.status)).filter((item) => {
    const results = item.triggerGroup.conditions.map((condition) => conditionMatches(condition, profile));
    return item.triggerGroup.mode === 'all' ? results.every(Boolean) : results.some(Boolean);
  }).sort((a, b) => a.priority - b.priority || b.updatedAt.localeCompare(a.updatedAt));
  const matched = candidates[0];
  const now = nowText();
  if (!matched) return { id: `run-${Date.now()}`, profileId: profile.id, profileName: profile.name, kind, matched: false, usedFallback: false, reason: '没有已发布策略同时满足考试类型和触发条件。', status: 'skipped', matchedAt: now, updatedAt: now };
  const useFallback = !matched.primaryReference.available && matched.fallbackRule.enabled;
  const fallback = useFallback ? strategyReferences.find((item) => item.id === matched.fallbackRule.targetId) : undefined;
  const resultReference = fallback ?? matched.primaryReference;
  return { id: `run-${Date.now()}`, profileId: profile.id, profileName: profile.name, kind, matched: true, strategyId: matched.id, strategyName: matched.name, strategyVersion: matched.onlineVersion ?? matched.version, resultReferenceId: resultReference.id, resultReferenceName: resultReference.name, usedFallback: useFallback, reason: useFallback ? '主引用不可用，已按替代规则命中。' : '命中已发布的最高优先级策略。', status: 'assigned', matchedAt: now, updatedAt: now };
};

export const recordStrategyRun = (run: API.StrategyMatchRun) => {
  strategyMatchRuns.unshift(run);
  return run;
};

export const updateStrategyRunStatus = (id: string, status: API.StrategyExecutionStatus) => {
  const run = strategyMatchRuns.find((item) => item.id === id);
  if (!run) return undefined;
  run.status = status;
  run.updatedAt = nowText();
  return run;
};

export const strategyEffects = (strategyId: string): API.StrategyEffectSummary => {
  const runs = strategyMatchRuns.filter((item) => item.strategyId === strategyId && item.matched);
  const completed = runs.filter((item) => item.status === 'completed').length;
  return { strategyId, hits: runs.length, started: runs.filter((item) => ['started', 'completed', 'replaced'].includes(item.status)).length, completed, replaced: runs.filter((item) => item.status === 'replaced').length, skippedOrExpired: runs.filter((item) => ['skipped', 'expired'].includes(item.status)).length, completionRate: runs.length ? Math.round((completed / runs.length) * 1000) / 10 : 0 };
};

export const copyAdvancedStrategy = (source: API.AdvancedLearningStrategy, operator: { id: string; name: string }) => {
  const now = nowText();
  const copy = structuredClone(source);
  copy.id = `${source.id}-draft-${Date.now()}`;
  copy.status = 'draft';
  copy.version = `V${Number(source.version.replace(/^V/, '').split('.')[0] || 0)}.${Number(source.version.split('.')[1] || 0) + 1}`;
  copy.dataVersion = 1;
  copy.createdById = operator.id;
  copy.createdBy = operator.name;
  copy.createdAt = now;
  copy.updatedById = operator.id;
  copy.updatedBy = operator.name;
  copy.updatedAt = now;
  copy.reviewTaskId = undefined;
  copy.releaseVersionId = undefined;
  copy.onlineVersion = undefined;
  copy.lastPrecheck = undefined;
  copy.changeSummary = `基于 ${source.version} 复制为新草稿。`;
  copy.versionRecords = [];
  copy.operationRecords = [{ id: `op-${copy.id}`, operator: operator.name, roleName: operator.name, action: '复制草稿', fromStatus: source.status, toStatus: 'draft', reason: copy.changeSummary, time: now }];
  advancedLearningStrategies.unshift(copy);
  return copy;
};

export const syncAdvancedStrategyFromReviewTask = (
  task: API.ReviewTask,
  previousStatus: API.ReviewTaskStatus,
  nextStatus: API.ReviewTaskStatus,
  operator: { id: string; name: string; roleName: string },
  reason: string,
) => {
  if (!['light_task', 'extra_practice', 'review_recommendation'].includes(String(task.objectSubtype))) return;
  const strategy = advancedLearningStrategies.find((item) => item.id === task.objectId);
  if (!strategy) return;
  strategy.status = nextStatus;
  strategy.dataVersion += 1;
  strategy.updatedById = operator.id;
  strategy.updatedBy = operator.name;
  strategy.updatedAt = task.updatedAt;
  if (nextStatus === 'published') {
    strategy.releaseVersionId = `${strategy.id}-${strategy.version}`;
    strategy.onlineVersion = strategy.version;
    strategy.rollbackTargetVersion = task.rollbackTargetVersion ?? strategy.version;
  }
  if (nextStatus === 'rolled_back') {
    const rollbackVersion = task.rollbackTargetVersion ?? strategy.rollbackTargetVersion ?? strategy.onlineVersion ?? strategy.version;
    strategy.onlineVersion = rollbackVersion;
    strategy.releaseVersionId = `${strategy.id}-${rollbackVersion}`;
    strategy.rollbackTargetVersion = rollbackVersion;
  }
  strategy.versionRecords.forEach((item) => { item.currentOnline = false; });
  strategy.versionRecords.unshift({ id: `version-${strategy.id}-${Date.now()}`, configId: strategy.id, kind: strategy.kind, version: strategy.onlineVersion ?? strategy.version, status: nextStatus, createdBy: operator.name, createdAt: task.updatedAt, changeSummary: reason, currentOnline: ['published', 'rolled_back'].includes(nextStatus) });
  strategy.operationRecords.unshift({ id: `op-${strategy.id}-${Date.now()}`, operator: operator.name, roleName: operator.roleName, action: nextStatus === 'published' ? '发布' : nextStatus === 'rolled_back' ? '回滚' : nextStatus === 'offline' ? '下架' : '审核状态更新', fromStatus: previousStatus, toStatus: nextStatus, reason, time: task.updatedAt });
};
