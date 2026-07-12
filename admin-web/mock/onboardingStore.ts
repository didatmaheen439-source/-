import { nowText } from './auditStore';

const MOCK_ONBOARDING_USER_ID = 'mock-onboarding-user';

export const onboardingFieldOrder: API.OnboardingFieldKey[] = [
  'examType',
  'targetScore',
  'examDate',
  'dailyMinutes',
  'moodStatus',
];

const fieldLabels: Record<API.OnboardingFieldKey, string> = {
  examType: '考试类型',
  targetScore: '目标分',
  examDate: '考试日期',
  dailyMinutes: '每日学习时长',
  moodStatus: '最近状态',
};

const secondSaturday = (year: number, monthIndex: number) => {
  const date = new Date(year, monthIndex, 1);
  const offset = (6 - date.getDay() + 7) % 7;
  date.setDate(1 + offset + 7);
  return date;
};

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

export const getUpcomingCetExamDates = (from = new Date()) => {
  const candidates: Date[] = [];
  for (let year = from.getFullYear(); year <= from.getFullYear() + 2; year += 1) {
    candidates.push(secondSaturday(year, 5), secondSaturday(year, 11));
  }
  return candidates
    .filter((date) => date.getTime() >= new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime())
    .slice(0, 2)
    .map(formatDate);
};

const option = (
  field: API.OnboardingFieldKey,
  value: string | number,
  label: string,
  sortOrder: number,
): API.OnboardingOption => ({
  id: `onboarding-${field}-${String(value)}`,
  label,
  value,
  enabled: true,
  sortOrder,
  referencedCount: 0,
});

export const createDefaultOnboardingFields = (
  examDates = getUpcomingCetExamDates(),
): API.OnboardingField[] => [
  {
    key: 'examType',
    label: fieldLabels.examType,
    type: 'single_select',
    description: '选择四级或六级考试方向。',
    required: true,
    enabled: true,
    sortOrder: 1,
    options: [option('examType', 'CET4', '四级 CET-4', 1), option('examType', 'CET6', '六级 CET-6', 2)],
  },
  {
    key: 'targetScore',
    label: fieldLabels.targetScore,
    type: 'single_select',
    description: '选择过线、提分或高分目标。',
    required: true,
    enabled: true,
    sortOrder: 2,
    options: [
      option('targetScore', 425, '425 过线', 1),
      option('targetScore', 500, '500+ 提分', 2),
      option('targetScore', 600, '600+ 高分', 3),
    ],
  },
  {
    key: 'examDate',
    label: fieldLabels.examDate,
    type: 'exam_date',
    description: '由系统生成未来两次 CET 日期，并保留暂不确定。',
    required: true,
    enabled: true,
    sortOrder: 3,
    options: [
      option('examDate', examDates[0], examDates[0], 1),
      option('examDate', examDates[1], examDates[1], 2),
      option('examDate', 'default', '暂不确定', 3),
    ],
  },
  {
    key: 'dailyMinutes',
    label: fieldLabels.dailyMinutes,
    type: 'single_select',
    description: '选择每天可投入的学习时长。',
    required: true,
    enabled: true,
    sortOrder: 4,
    options: [
      option('dailyMinutes', 5, '5 分钟', 1),
      option('dailyMinutes', 15, '15 分钟', 2),
      option('dailyMinutes', 30, '30 分钟', 3),
    ],
  },
  {
    key: 'moodStatus',
    label: fieldLabels.moodStatus,
    type: 'single_select',
    description: '记录最近学习状态，用于低压力任务判断。',
    required: true,
    enabled: true,
    sortOrder: 5,
    options: [
      option('moodStatus', 'steady', '稳定', 1),
      option('moodStatus', 'tired', '有点累', 2),
      option('moodStatus', 'anxious', '考前焦虑', 3),
    ],
  },
];

const allowedValues: Record<Exclude<API.OnboardingFieldKey, 'examDate'>, Array<string | number>> = {
  examType: ['CET4', 'CET6'],
  targetScore: [425, 500, 600],
  dailyMinutes: [5, 15, 30],
  moodStatus: ['steady', 'tired', 'anxious'],
};

export const precheckOnboardingConfig = (
  config: Pick<API.OnboardingConfig, 'id' | 'fields'>,
): API.OnboardingPrecheckResult => {
  const issues: API.LearningPathPrecheckIssue[] = [];
  const dates = getUpcomingCetExamDates();

  if (config.fields.length !== onboardingFieldOrder.length) {
    issues.push({
      id: 'onboarding-field-count',
      level: 'error',
      field: '采集字段',
      message: 'Onboarding 必须保持固定五字段。',
      suggestion: '删除额外字段或恢复缺失字段。',
    });
  }

  onboardingFieldOrder.forEach((key, index) => {
    const fields = config.fields.filter((field) => field.key === key);
    const field = fields[0];
    if (fields.length !== 1 || !field) {
      issues.push({
        id: `onboarding-field-${key}`,
        level: 'error',
        field: fieldLabels[key],
        message: '固定字段必须且只能存在一次。',
        suggestion: '恢复固定五字段结构。',
      });
      return;
    }
    if (!field.enabled || field.sortOrder !== index + 1) {
      issues.push({
        id: `onboarding-order-${key}`,
        level: 'error',
        field: field.label,
        message: '固定字段必须启用并保持既定顺序。',
        suggestion: `将字段顺序恢复为 ${index + 1}。`,
      });
    }
    const expectedType: API.OnboardingFieldType = key === 'examDate' ? 'exam_date' : 'single_select';
    if (!field.label.trim() || field.type !== expectedType) {
      issues.push({
        id: `onboarding-type-${key}`,
        level: 'error',
        field: field.label || fieldLabels[key],
        message: '字段名称或字段类型不符合固定契约。',
        suggestion: `字段类型应为 ${expectedType}。`,
      });
    }
    const enabled = field.options.filter((item) => item.enabled);
    if (!enabled.length) {
      issues.push({
        id: `onboarding-empty-${key}`,
        level: 'error',
        field: field.label,
        message: '字段至少需要一个启用选项。',
        suggestion: '启用一个有效选项。',
      });
    }
    const values = field.options.map((item) => String(item.value));
    if (new Set(values).size !== values.length) {
      issues.push({
        id: `onboarding-duplicate-${key}`,
        level: 'error',
        field: field.label,
        message: '选项值不能重复。',
        suggestion: '删除重复值或恢复内置选项。',
      });
    }
    const optionOrders = field.options.map((item) => item.sortOrder);
    if (
      new Set(optionOrders).size !== optionOrders.length ||
      field.options.some((item) => !item.label.trim() || item.sortOrder < 1 || item.sortOrder > field.options.length)
    ) {
      issues.push({
        id: `onboarding-option-order-${key}`,
        level: 'error',
        field: field.label,
        message: '选项名称不能为空，排序必须在有效范围内且不可重复。',
        suggestion: '补全选项名称并重新设置连续排序。',
      });
    }
    const validValues = key === 'examDate' ? [...dates, 'default'] : allowedValues[key];
    if (field.options.some((item) => !validValues.map(String).includes(String(item.value)))) {
      issues.push({
        id: `onboarding-value-${key}`,
        level: 'error',
        field: field.label,
        message: '存在非内置选项值。',
        suggestion: '仅保留移动端已支持的内置值。',
      });
    }
    if (enabled.length < validValues.length) {
      issues.push({
        id: `onboarding-disabled-${key}`,
        level: 'warning',
        field: field.label,
        message: '部分内置选项已停用。',
        suggestion: '确认停用不会阻断目标用户完成 Onboarding。',
      });
    }
  });

  const level: API.LearningPathPrecheckLevel = issues.some((item) => item.level === 'error')
    ? 'error'
    : issues.some((item) => item.level === 'warning')
      ? 'warning'
      : 'passed';
  return {
    id: `onboarding-precheck-${Date.now()}`,
    configId: config.id,
    level,
    checkedAt: nowText(),
    issues,
    summary: level === 'passed' ? '五项 Onboarding 配置完整。' : `发现 ${issues.length} 个配置问题。`,
  };
};

const initialConfig = (): API.OnboardingConfig => {
  const createdAt = '2026-07-09 09:00:00';
  const config: API.OnboardingConfig = {
    id: 'onboarding-config-default',
    kind: 'onboarding_config',
    name: '过级搭子 Onboarding 基础配置',
    description: '与移动端当前五项用户目标采集保持一致。',
    status: 'published',
    version: 'V1.0',
    dataVersion: 1,
    currentOnline: true,
    createdBy: '教研审核',
    createdById: 'teaching_reviewer',
    createdAt,
    updatedBy: '超级管理员',
    updatedById: 'super_admin',
    updatedAt: createdAt,
    releaseVersionId: 'onboarding-config-default-V1.0',
    changeSummary: '初始化五项 Onboarding 配置。',
    fields: createDefaultOnboardingFields(),
    versionRecords: [],
    operationRecords: [],
  };
  config.lastPrecheck = precheckOnboardingConfig(config);
  config.versionRecords = [{
    id: 'onboarding-version-default-V1.0',
    configId: config.id,
    version: config.version,
    status: 'published',
    createdBy: config.createdBy,
    createdAt,
    changeSummary: config.changeSummary,
    publishedAt: createdAt,
    publishedBy: config.updatedBy,
    currentOnline: true,
  }];
  config.operationRecords = [{
    id: 'onboarding-op-default-publish',
    operator: config.updatedBy,
    roleName: '超级管理员',
    action: '发布',
    toStatus: 'published',
    reason: config.changeSummary,
    time: createdAt,
  }];
  return config;
};

type OnboardingGlobalStore = typeof globalThis & {
  __GUOJI_ADMIN_ONBOARDING_CONFIGS__?: API.OnboardingConfig[];
  __GUOJI_ADMIN_ONBOARDING_MOCK_USER__?: API.AdminUser;
  __GUOJI_ADMIN_ONBOARDING_MOCK_MATCH__?: API.UserLearningPathMatchSummary;
};

const globalStore = globalThis as OnboardingGlobalStore;
if (!globalStore.__GUOJI_ADMIN_ONBOARDING_CONFIGS__) {
  globalStore.__GUOJI_ADMIN_ONBOARDING_CONFIGS__ = [initialConfig()];
}

export const onboardingConfigsData = globalStore.__GUOJI_ADMIN_ONBOARDING_CONFIGS__;

const createMockUser = (): API.AdminUser => {
  const now = nowText();
  return {
    id: MOCK_ONBOARDING_USER_ID,
    nickname: 'Onboarding 回归用户',
    phoneMasked: '139****9001',
    emailMasked: 'onb***@example.test',
    deviceSummary: 'mock-onboarding-device',
    registerAt: now,
    lastActiveAt: now,
    examProfile: {
      examType: 'CET4',
      targetScore: 500,
      examDate: getUpcomingCetExamDates()[0],
      dailyStudyMinutes: 30,
    },
    learningStatus: {
      onboardingStatus: 'not_started',
      diagnosisStatus: 'not_started',
      weakModules: [],
      todayTaskStatus: 'not_started',
      todayTaskProgress: 0,
      lastStudyAt: now,
    },
    currentStudyStatus: '未开始，0%',
    isMockUser: true,
    unhandledFeedbackCount: 0,
    allowedActions: [],
    learningRecords: [],
    feedbacks: [],
    aiSummaries: [],
    remarks: [],
    accessLogs: [],
  };
};

if (!globalStore.__GUOJI_ADMIN_ONBOARDING_MOCK_USER__) {
  globalStore.__GUOJI_ADMIN_ONBOARDING_MOCK_USER__ = createMockUser();
}
if (!globalStore.__GUOJI_ADMIN_ONBOARDING_MOCK_MATCH__) {
  globalStore.__GUOJI_ADMIN_ONBOARDING_MOCK_MATCH__ = { userId: MOCK_ONBOARDING_USER_ID };
}

export const mockOnboardingUser = globalStore.__GUOJI_ADMIN_ONBOARDING_MOCK_USER__;
export const mockOnboardingMatch = globalStore.__GUOJI_ADMIN_ONBOARDING_MOCK_MATCH__;

export const resetMockOnboardingState = () => {
  const reset = createMockUser();
  Object.keys(mockOnboardingUser).forEach((key) => {
    delete (mockOnboardingUser as Record<string, unknown>)[key];
  });
  Object.assign(mockOnboardingUser, reset);
  delete mockOnboardingMatch.onboardingConfig;
  delete mockOnboardingMatch.diagnosisRule;
  delete mockOnboardingMatch.todayTaskTemplate;
};

export const getOnboardingConfig = (id: string) =>
  onboardingConfigsData.find((item) => item.id === id);

export const getOnlineOnboardingConfig = () =>
  onboardingConfigsData.find((item) => item.status === 'published' && item.currentOnline);

export const getEditableOnboardingConfig = () =>
  onboardingConfigsData.find((item) => ['draft', 'rejected', 'pending_review', 'approved', 'pending_publish'].includes(item.status)) ??
  getOnlineOnboardingConfig() ??
  onboardingConfigsData[0];

const nextVersion = (version: string) => {
  const matched = /^V(\d+)\.(\d+)$/.exec(version);
  return matched ? `V${matched[1]}.${Number(matched[2]) + 1}` : 'V1.1';
};

export const copyOnboardingConfigAsDraft = (
  source: API.OnboardingConfig,
  operator: { id: string; name: string; roleName: string },
) => {
  const now = nowText();
  const copied: API.OnboardingConfig = {
    ...structuredClone(source),
    id: `onboarding-config-${Date.now()}`,
    status: 'draft',
    version: nextVersion(source.version),
    dataVersion: 1,
    currentOnline: false,
    createdBy: operator.name,
    createdById: operator.id,
    createdAt: now,
    updatedBy: operator.name,
    updatedById: operator.id,
    updatedAt: now,
    reviewTaskId: undefined,
    releaseVersionId: undefined,
    changeSummary: `基于 ${source.version} 创建新草稿。`,
    lastPrecheck: undefined,
    versionRecords: [],
    operationRecords: [{
      id: `onboarding-copy-${Date.now()}`,
      operator: operator.name,
      roleName: operator.roleName,
      action: '复制配置',
      fromStatus: source.status,
      toStatus: 'draft',
      reason: `基于 ${source.version} 创建新草稿。`,
      time: now,
    }],
  };
  onboardingConfigsData.unshift(copied);
  return copied;
};

export const syncOnboardingFromReviewTask = (
  task: API.ReviewTask,
  nextStatus: API.ReviewTaskStatus,
  operator: { id: string; name: string; roleName: string },
  reason: string,
) => {
  if (task.objectSubtype !== 'onboarding_config') return;
  const config = getOnboardingConfig(task.objectId);
  if (!config) return;
  config.status = nextStatus;
  config.updatedBy = operator.name;
  config.updatedById = operator.id;
  config.updatedAt = task.updatedAt;
  config.reviewTaskId = task.id;
  config.dataVersion += 1;
  if (nextStatus === 'published') {
    onboardingConfigsData.forEach((item) => {
      item.currentOnline = item.id === config.id;
      item.versionRecords.forEach((record) => {
        record.currentOnline = item.id === config.id && record.version === config.version;
      });
    });
    config.releaseVersionId = `${config.id}-${config.version}`;
  } else if (nextStatus === 'offline') {
    config.currentOnline = false;
    config.versionRecords.forEach((record) => {
      record.currentOnline = false;
    });
  } else if (nextStatus === 'rolled_back') {
    config.currentOnline = false;
    config.versionRecords.forEach((record) => {
      record.currentOnline = false;
    });
    const rollbackTarget = onboardingConfigsData.find(
      (item) => item.id !== config.id && item.version === task.rollbackTargetVersion,
    );
    if (rollbackTarget) {
      rollbackTarget.status = 'published';
      rollbackTarget.currentOnline = true;
      rollbackTarget.versionRecords.forEach((record) => {
        record.currentOnline = record.version === rollbackTarget.version;
      });
    }
  }
  config.versionRecords.unshift({
    id: `onboarding-version-${config.id}-${Date.now()}`,
    configId: config.id,
    version: config.version,
    status: nextStatus,
    createdBy: operator.name,
    createdAt: task.updatedAt,
    changeSummary: reason,
    publishedAt: nextStatus === 'published' ? task.updatedAt : undefined,
    publishedBy: nextStatus === 'published' ? operator.name : undefined,
    currentOnline: nextStatus === 'published',
  });
};

const compare = (actual: number, condition: API.DiagnosisRuleCondition) => {
  if (condition.operator === 'between') return actual >= Number(condition.min) && actual <= Number(condition.max);
  const value = Number(condition.value);
  if (condition.operator === 'lt') return actual < value;
  if (condition.operator === 'lte') return actual <= value;
  if (condition.operator === 'eq') return actual === value;
  if (condition.operator === 'gte') return actual >= value;
  return actual > value;
};

const userConditionMatches = (
  condition: API.LearningPathUserCondition,
  submission: API.OnboardingSubmission,
) => {
  if (condition.examType !== submission.examType) return false;
  const checks: boolean[] = [];
  if (condition.targetScoreMin !== undefined) checks.push(submission.targetScore >= condition.targetScoreMin);
  if (condition.targetScoreMax !== undefined) checks.push(submission.targetScore <= condition.targetScoreMax);
  if (condition.dailyMinutesMin !== undefined) checks.push(submission.dailyMinutes >= condition.dailyMinutesMin);
  if (condition.dailyMinutesMax !== undefined) checks.push(submission.dailyMinutes <= condition.dailyMinutesMax);
  if (condition.onboardingStatus !== undefined) checks.push(condition.onboardingStatus === 'completed');
  if (condition.diagnosisStatus !== undefined) checks.push(condition.diagnosisStatus === 'completed');
  if (condition.currentStudyStatus !== undefined) checks.push(condition.currentStudyStatus === 'not_started');
  if (!checks.length) return true;
  return condition.conditionMode === 'any' ? checks.some(Boolean) : checks.every(Boolean);
};

export const matchPublishedLearningPath = (
  submission: API.OnboardingSubmission,
  configs: API.LearningPathConfigItem[],
) => {
  const targetModule: API.LearningPathModule =
    submission.examType === 'CET6' || submission.targetScore > 425 ? 'reading' : 'listening';
  const metrics: Record<API.DiagnosisRuleCondition['metric'], number> = {
    accuracy: 60,
    wrong_count: 4,
    module_score: 60,
    completed_questions: 10,
    error_tag_hits: 2,
  };
  const diagnosisRule = configs
    .filter((item): item is API.DiagnosisRule => item.kind === 'diagnosis_rule' && item.status === 'published')
    .filter((item) => item.applicableModule === targetModule && userConditionMatches(item.userCondition, submission))
    .filter((item) => {
      const checks = item.conditionGroup.conditions.map((condition) => compare(metrics[condition.metric], condition));
      return item.conditionGroup.mode === 'any' ? checks.some(Boolean) : checks.every(Boolean);
    })
    .sort((a, b) => a.priority - b.priority)[0];
  if (!diagnosisRule) return {};

  const todayTaskTemplate = configs
    .filter((item): item is API.TodayTaskTemplate => item.kind === 'today_task_template' && item.status === 'published')
    .filter((item) => userConditionMatches(item.userCondition, submission))
    .filter(
      (item) =>
        item.matchedDiagnosisRuleId === diagnosisRule.id ||
        item.matchedWeakModules.some((module) => diagnosisRule.output.weakModules.includes(module)),
    )
    .sort((a, b) => a.priority - b.priority)[0];
  return { diagnosisRule, todayTaskTemplate };
};

export const buildOnboardingSnapshot = (
  config: API.OnboardingConfig,
  submission: API.OnboardingSubmission,
): API.OnboardingMatchSnapshot => ({
  configId: config.id,
  configName: config.name,
  version: config.version,
  completedAt: nowText(),
  answers: onboardingFieldOrder.map((key) => {
    const field = config.fields.find((item) => item.key === key)!;
    const value = submission[key];
    const optionItem = field.options.find((item) => String(item.value) === String(value));
    return {
      fieldKey: key,
      fieldLabel: field.label,
      optionLabel: optionItem?.label ?? String(value),
      value,
    };
  }),
});

export const validateOnboardingSubmission = (
  config: API.OnboardingConfig,
  submission: API.OnboardingSubmission,
) => {
  for (const key of onboardingFieldOrder) {
    const field = config.fields.find((item) => item.key === key && item.enabled);
    const value = submission[key];
    if (!field?.options.some((item) => item.enabled && String(item.value) === String(value))) {
      return `${fieldLabels[key]}不是当前线上版本的启用选项。`;
    }
  }
  return undefined;
};
