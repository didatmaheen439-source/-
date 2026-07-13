import { roleConfigs } from '../src/foundation/permissions';
import type { AdminRoleId } from '../src/foundation/permissions';
import { nowText } from './auditStore';

export const aiCoachConfigTypeLabels: Record<API.AiCoachConfigType, string> = {
  intent: '意图分类',
  prompt_template: 'Prompt 模板',
  response_structure: '回答结构',
  dependency_rule: '防依赖规则',
  attachment_policy: '附件策略',
};

export const aiCoachBusinessSceneLabels: Record<API.AiCoachBusinessScene, string> = {
  listening_coach: '听力陪练',
  speaking_coach: '口语陪练',
  writing_explanation: '写作讲解',
  error_explanation: '错题讲解',
  learning_path_recommendation: '学习路径推荐',
};

export const aiCoachRiskLevelLabels: Record<API.AiCoachRiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

const reviewStatusActionMap: Record<API.ReviewTaskStatus, string> = {
  draft: '保存草稿',
  pending_review: '提交审核',
  rejected: '驳回',
  approved: '审核通过',
  pending_publish: '安排发布',
  published: '发布',
  offline: '下架',
  rolled_back: '回滚',
};

export type AiCoachOperator = {
  id: string;
  name: string;
  roleId: AdminRoleId;
  roleName: string;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const splitLines = (value?: string) =>
  String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const defaultRiskPolicy = (
  high = false,
): API.AiCoachRiskPolicy => ({
  dependencyPrevention: true,
  answerBoundary: '不直接代写、代答或替用户完成整篇输出，优先解释思路和下一步。',
  sensitivePolicy: high
    ? '包含高风险触发词时转人工复核，不展示完整策略正文。'
    : '遇到隐私、作弊、代写诉求时拒绝并给出学习建议。',
  fallbackStrategy: '信息不足时追问一个澄清问题，或给出可执行的学习步骤。',
  escalationRule: high ? '命中依赖或作弊信号时记录风险并建议客服复核。' : '连续两次兜底后提示用户回到今日任务。',
  highRiskKeywords: high ? ['代写', '直接答案', '跳过练习'] : ['答案依赖'],
});

const statusSnapshot = (
  strategy: Pick<
    API.AiCoachStrategy,
    'version' | 'title' | 'status' | 'configType' | 'businessScenes' | 'createdAt' | 'creator'
  > & { body?: API.AiCoachStrategy['body'] },
): API.AiCoachVersionSnapshot => ({
  version: strategy.version,
  title: strategy.title,
  status: strategy.status,
  configType: strategy.configType,
  businessScenes: [...strategy.businessScenes],
  bodySummary: bodySummary(strategy.configType, strategy.body),
  createdBy: strategy.creator,
  createdAt: strategy.createdAt,
});

const defaultBody = (
  configType: API.AiCoachConfigType,
  seed: number,
): API.AiCoachStrategy['body'] => {
  if (configType === 'intent') {
    return {
      intentKey: `intent_${seed}`,
      description: '识别用户当前学习诉求，并输出稳定意图标签。',
      triggerExamples: ['我想听力跟练', '这题为什么错了', '今天该学什么'],
      outputIntent: 'learning_help',
      confidenceThreshold: 0.72,
    };
  }
  if (configType === 'prompt_template') {
    return {
      systemRole: '过级搭子学习陪练',
      promptBody:
        '根据 {{examType}}、{{weakModule}} 和 {{userQuestion}} 生成分步讲解。不要代写完整答案，先解释判断依据，再给下一步练习建议。',
      variables: [
        {
          name: 'examType',
          type: 'string',
          required: true,
          description: '考试类型',
          exampleValue: 'CET4',
        },
        {
          name: 'weakModule',
          type: 'string',
          required: true,
          description: '薄弱模块',
          exampleValue: 'listening',
        },
      ],
      styleRules: ['语气低压力', '先解释原因', '不直接给整篇代写'],
    };
  }
  if (configType === 'response_structure') {
    return {
      schemaName: `coach_response_${seed}`,
      sections: [
        { key: 'diagnosis', title: '问题判断', required: true, description: '概括用户问题' },
        { key: 'steps', title: '处理步骤', required: true, description: '给出可执行步骤' },
        { key: 'nextTask', title: '下一步任务', required: true, description: '回到学习闭环' },
      ],
      outputExample: '{"diagnosis":"定位错误原因","steps":["先复看题干"],"nextTask":"完成 3 道同类题"}',
    };
  }
  if (configType === 'attachment_policy') {
    return {
      rules: [
        {
          id: `attachment-rule-${seed}`,
          attachmentType: 'image',
          allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
          maxSizeMb: 10,
          recognitionMode: 'image_ocr',
          enabled: true,
        },
      ],
      failureMessages: {
        unsupportedType: '暂不支持该附件类型，请更换后重试。',
        sizeExceeded: '附件超过大小限制，请压缩后重试。',
        recognitionFailed: '附件识别失败，请检查内容清晰度后重试。',
      },
    };
  }
  return {
    dependencySignals: ['反复索要直接答案', '要求代写全文', '跳过练习步骤'],
    interventionMessage: '我可以帮你拆解思路，但不能替你直接完成。先从第一步判断依据开始。',
    maxConsecutiveAnswers: 2,
    cooldownMinutes: 15,
  };
};

const bodySummary = (
  configType: API.AiCoachConfigType,
  body?: API.AiCoachStrategy['body'],
) => {
  if (!body) return '-';
  if (configType === 'intent') {
    const intentBody = body as API.AiCoachIntentBody;
    return `${intentBody.intentKey}，阈值 ${intentBody.confidenceThreshold}`;
  }
  if (configType === 'prompt_template') {
    const promptBody = body as API.AiCoachPromptTemplateBody;
    return `${promptBody.systemRole}，${promptBody.variables?.length ?? 0} 个变量`;
  }
  if (configType === 'response_structure') {
    const responseBody = body as API.AiCoachResponseStructureBody;
    return `${responseBody.schemaName}，${responseBody.sections?.length ?? 0} 个区块`;
  }
  if (configType === 'attachment_policy') {
    const attachmentBody = body as API.AiAttachmentPolicyBody;
    const enabledRules = attachmentBody.rules?.filter((item) => item.enabled) ?? [];
    return `${enabledRules.length} 条附件规则，${enabledRules.map((item) => item.attachmentType).join('、') || '未启用'}`;
  }
  const dependencyBody = body as API.AiCoachDependencyRuleBody;
  return `${dependencyBody.dependencySignals?.length ?? 0} 个依赖信号，冷却 ${dependencyBody.cooldownMinutes} 分钟`;
};

const createStrategy = (params: {
  id: string;
  title: string;
  description: string;
  configType: API.AiCoachConfigType;
  businessScenes: API.AiCoachBusinessScene[];
  status: API.AiCoachStrategyStatus;
  riskLevel: API.AiCoachRiskLevel;
  version: string;
  seed: number;
  creator?: string;
  creatorId?: string;
  updatedAt: string;
  changeSummary: string;
  impactScope: string;
  reviewTaskId?: string;
  body?: API.AiCoachStrategy['body'];
  lastPrecheck?: API.AiCoachPrecheckResult;
}): API.AiCoachStrategy => {
  const strategy = {
    id: params.id,
    title: params.title,
    description: params.description,
    configType: params.configType,
    businessScenes: params.businessScenes,
    examTypes: params.seed % 2 === 0 ? ['CET4', 'CET6'] : ['CET6'],
    status: params.status,
    riskLevel: params.riskLevel,
    version: params.version,
    dataVersion: 1,
    creatorId: params.creatorId ?? 'ai_operator',
    creator: params.creator ?? 'AI 策略运营',
    updatedBy: params.creator ?? 'AI 策略运营',
    createdAt: '2026-07-08 09:00:00',
    updatedAt: params.updatedAt,
    changeSummary: params.changeSummary,
    impactScope: params.impactScope,
    reviewTaskId: params.reviewTaskId,
    publishedVersion: params.status === 'published' ? params.version : undefined,
    rollbackTargetVersion: params.status === 'rolled_back' ? 'V1.0' : undefined,
    riskPolicy: defaultRiskPolicy(params.riskLevel === 'high'),
    body: params.body ?? defaultBody(params.configType, params.seed),
    validationCases: [
      {
        id: `${params.id}-case-1`,
        title: '基础输入结构',
        input: '用户询问今天听力怎么练。',
        expected: '输出可执行学习步骤。',
      },
      {
        id: `${params.id}-case-2`,
        title: '边界诉求',
        input: '用户要求直接给答案。',
        expected: '拒绝代答并回到解析。',
      },
    ],
    lastPrecheck: params.lastPrecheck ?? {
      level: params.riskLevel === 'high' ? 'warning' : 'passed',
      summary: params.riskLevel === 'high' ? '存在高风险边界，需发布前复核。' : '静态预校验通过。',
      issues:
        params.riskLevel === 'high'
          ? [
              {
                id: `${params.id}-warning-risk`,
                level: 'warning',
                field: 'riskPolicy',
                message: '策略影响高风险业务场景。',
                suggestion: '发布前由超级管理员复核。',
              },
            ]
          : [],
      checkedAt: params.updatedAt,
    },
    versionSnapshots: [],
    operationRecords: [
      {
        id: `${params.id}-op-init`,
        operator: params.creator ?? 'AI 策略运营',
        roleName: params.creator ?? 'AI 策略运营',
        action: '保存草稿',
        toStatus: params.status,
        reason: params.changeSummary,
        time: params.updatedAt,
      },
    ],
  } as API.AiCoachStrategy;
  strategy.versionSnapshots = [statusSnapshot(strategy)];
  return strategy;
};

export const aiCoachStrategiesData: API.AiCoachStrategy[] = [
  createStrategy({
    id: 'ai-attachment-global-v10',
    title: '陪练附件识别策略 V1.0',
    description: '管理图片、文档和音频附件的大小与识别方式。',
    configType: 'attachment_policy',
    businessScenes: ['listening_coach', 'writing_explanation'],
    status: 'published',
    riskLevel: 'medium',
    version: 'V1.0',
    seed: 90,
    updatedAt: '2026-07-12 14:00:00',
    changeSummary: '发布附件识别基线。',
    impactScope: '影响听力和写作陪练的 Mock 附件处理。',
    body: {
      rules: [
        { id: 'rule-image', attachmentType: 'image', allowedFormats: ['jpg', 'jpeg', 'png', 'webp'], maxSizeMb: 10, recognitionMode: 'image_ocr', enabled: true },
        { id: 'rule-document', attachmentType: 'document', allowedFormats: ['pdf', 'docx', 'txt'], maxSizeMb: 20, recognitionMode: 'document_text_extract', enabled: true },
        { id: 'rule-audio', attachmentType: 'audio', allowedFormats: ['mp3', 'm4a', 'wav'], maxSizeMb: 30, recognitionMode: 'audio_asr', enabled: true },
      ],
      failureMessages: {
        unsupportedType: '暂不支持该附件类型，请更换后重试。',
        sizeExceeded: '附件超过大小限制，请压缩后重试。',
        recognitionFailed: '附件识别失败，请检查内容清晰度后重试。',
      },
    },
  }),
  createStrategy({
    id: 'ai-intent-listening-v12',
    title: '听力陪练意图识别 V1.2',
    description: '识别听力跟练、错因追问和下一步推荐。',
    configType: 'intent',
    businessScenes: ['listening_coach'],
    status: 'published',
    riskLevel: 'medium',
    version: 'V1.2',
    seed: 1,
    updatedAt: '2026-07-08 09:10:00',
    changeSummary: '补充听力陪练意图样例。',
    impactScope: '影响听力陪练入口的意图分流。',
  }),
  createStrategy({
    id: 'ai-prompt-speaking-v30',
    title: '口语陪练 Prompt 模板 V3.0',
    description: '控制口语陪练追问、纠错和鼓励语气。',
    configType: 'prompt_template',
    businessScenes: ['speaking_coach'],
    status: 'approved',
    riskLevel: 'high',
    version: 'V3.0',
    seed: 2,
    reviewTaskId: 'review-ai-001',
    updatedAt: '2026-07-08 09:20:00',
    changeSummary: '优化追问策略，增加防依赖提示。',
    impactScope: '影响 AI 口语陪练会话。',
  }),
  createStrategy({
    id: 'ai-structure-error-v08',
    title: '错题讲解回答结构 V0.8',
    description: '约束错题讲解必须包含错因、判断依据和下一步。',
    configType: 'response_structure',
    businessScenes: ['error_explanation'],
    status: 'pending_review',
    riskLevel: 'medium',
    version: 'V0.8',
    seed: 3,
    updatedAt: '2026-07-08 09:30:00',
    changeSummary: '新增错题讲解结构。',
    impactScope: '影响错题讲解摘要输出结构。',
  }),
  createStrategy({
    id: 'ai-dependency-global-v11',
    title: '全局防依赖策略 V1.1',
    description: '识别连续索要答案和代写诉求，触发干预话术。',
    configType: 'dependency_rule',
    businessScenes: ['speaking_coach', 'writing_explanation', 'error_explanation'],
    status: 'pending_publish',
    riskLevel: 'high',
    version: 'V1.1',
    seed: 4,
    updatedAt: '2026-07-08 09:40:00',
    changeSummary: '提高代写和直接答案拦截等级。',
    impactScope: '影响多场景 AI 回复边界。',
  }),
  createStrategy({
    id: 'ai-prompt-writing-v04',
    title: '写作讲解 Prompt 模板 V0.4',
    description: '写作批改解释模板，只给改进建议，不代写全文。',
    configType: 'prompt_template',
    businessScenes: ['writing_explanation'],
    status: 'published',
    riskLevel: 'medium',
    version: 'V1.0',
    seed: 50,
    updatedAt: '2026-07-08 09:50:00',
    changeSummary: '发布写作讲解模板。',
    impactScope: '影响写作批改解释配置。',
  }),
  createStrategy({
    id: 'ai-intent-path-v06',
    title: '学习路径推荐意图 V0.6',
    description: '识别用户是否需要今日任务和薄弱项推荐。',
    configType: 'intent',
    businessScenes: ['learning_path_recommendation'],
    status: 'rejected',
    riskLevel: 'low',
    version: 'V0.6',
    seed: 6,
    updatedAt: '2026-07-08 10:00:00',
    changeSummary: '补充路径推荐触发样例。',
    impactScope: '影响路径推荐入口。',
  }),
  createStrategy({
    id: 'ai-structure-listening-v10',
    title: '听力陪练回答结构 V1.0',
    description: '限定听力陪练输出为定位、复听点和跟读任务。',
    configType: 'response_structure',
    businessScenes: ['listening_coach'],
    status: 'published',
    riskLevel: 'low',
    version: 'V1.0',
    seed: 7,
    updatedAt: '2026-07-08 10:10:00',
    changeSummary: '发布听力回答结构。',
    impactScope: '影响听力陪练输出结构。',
  }),
  createStrategy({
    id: 'ai-dependency-writing-v02',
    title: '写作代写防依赖规则 V0.2',
    description: '针对代写全文、套模板和跳过修改的诉求触发干预。',
    configType: 'dependency_rule',
    businessScenes: ['writing_explanation'],
    status: 'published',
    riskLevel: 'high',
    version: 'V1.0',
    seed: 8,
    updatedAt: '2026-07-08 10:20:00',
    changeSummary: '发布写作防依赖规则。',
    impactScope: '影响写作批改边界策略。',
  }),
  createStrategy({
    id: 'ai-structure-writing-v10',
    title: '写作讲解回答结构 V1.0',
    description: '限定写作反馈为总评、分维度问题、修改建议和二次练习。',
    configType: 'response_structure',
    businessScenes: ['writing_explanation'],
    status: 'published',
    riskLevel: 'medium',
    version: 'V1.0',
    seed: 82,
    updatedAt: '2026-07-08 10:25:00',
    changeSummary: '发布写作讲解回答结构。',
    impactScope: '影响写作批改反馈结构。',
  }),
  createStrategy({
    id: 'ai-prompt-error-v18',
    title: '错题讲解 Prompt 模板 V1.8',
    description: '根据题型和错因给出分步讲解。',
    configType: 'prompt_template',
    businessScenes: ['error_explanation'],
    status: 'published',
    riskLevel: 'medium',
    version: 'V1.8',
    seed: 9,
    updatedAt: '2026-07-08 10:30:00',
    changeSummary: '优化错因解释顺序。',
    impactScope: '影响错题讲解。',
  }),
  createStrategy({
    id: 'ai-intent-speaking-v03',
    title: '口语陪练意图 V0.3',
    description: '识别用户要发音纠错、话题追问还是表达替换。',
    configType: 'intent',
    businessScenes: ['speaking_coach'],
    status: 'offline',
    riskLevel: 'low',
    version: 'V0.3',
    seed: 10,
    updatedAt: '2026-07-08 10:40:00',
    changeSummary: '旧口语意图策略下架。',
    impactScope: '已由新版本替换。',
  }),
  createStrategy({
    id: 'ai-structure-path-v05',
    title: '路径推荐回答结构 V0.5',
    description: '限定推荐结果包含原因、任务和预计时长。',
    configType: 'response_structure',
    businessScenes: ['learning_path_recommendation'],
    status: 'rolled_back',
    riskLevel: 'medium',
    version: 'V0.5',
    seed: 11,
    updatedAt: '2026-07-08 10:50:00',
    changeSummary: '回滚路径结构策略。',
    impactScope: '恢复到 V0.4。',
  }),
  createStrategy({
    id: 'ai-dependency-speaking-v09',
    title: '口语连续追问防依赖规则 V0.9',
    description: '限制连续追问和答案替用户生成。',
    configType: 'dependency_rule',
    businessScenes: ['speaking_coach'],
    status: 'pending_review',
    riskLevel: 'high',
    version: 'V0.9',
    seed: 12,
    updatedAt: '2026-07-08 11:00:00',
    changeSummary: '新增口语连续追问限制。',
    impactScope: '影响口语陪练高风险回复。',
  }),
  createStrategy({
    id: 'ai-prompt-path-v07',
    title: '路径推荐 Prompt 模板 V0.7',
    description: '根据诊断结果给出下一步任务解释。',
    configType: 'prompt_template',
    businessScenes: ['learning_path_recommendation'],
    status: 'rejected',
    riskLevel: 'medium',
    version: 'V0.7',
    seed: 13,
    updatedAt: '2026-07-08 11:10:00',
    changeSummary: '补充推荐理由。',
    impactScope: '影响路径推荐说明。',
  }),
  createStrategy({
    id: 'ai-intent-writing-v02',
    title: '写作讲解意图 V0.2',
    description: '识别作文结构、语法、词汇和逻辑问题。',
    configType: 'intent',
    businessScenes: ['writing_explanation'],
    status: 'draft',
    riskLevel: 'low',
    version: 'V0.2',
    seed: 14,
    updatedAt: '2026-07-08 11:20:00',
    changeSummary: '新增写作讲解意图。',
    impactScope: '草稿，不影响线上。',
  }),
  createStrategy({
    id: 'ai-structure-speaking-v21',
    title: '口语陪练回答结构 V2.1',
    description: '控制口语陪练输出为纠错、替代表达和跟读任务。',
    configType: 'response_structure',
    businessScenes: ['speaking_coach'],
    status: 'pending_publish',
    riskLevel: 'medium',
    version: 'V2.1',
    seed: 15,
    updatedAt: '2026-07-08 11:30:00',
    changeSummary: '优化口语陪练结构。',
    impactScope: '影响口语陪练输出结构。',
  }),
  createStrategy({
    id: 'ai-dependency-error-v04',
    title: '错题答案依赖干预 V0.4',
    description: '当用户反复要求直接答案时回到题目解析。',
    configType: 'dependency_rule',
    businessScenes: ['error_explanation'],
    status: 'published',
    riskLevel: 'high',
    version: 'V0.4',
    seed: 16,
    updatedAt: '2026-07-08 11:40:00',
    changeSummary: '发布错题答案依赖干预。',
    impactScope: '影响错题讲解边界。',
  }),
];

export const isAiCoachReviewTask = (task: API.ReviewTask) =>
  task.objectType === 'ai_coach_strategy';

export const getAiCoachStrategy = (id: string) =>
  aiCoachStrategiesData.find((item) => item.id === id);

export const filterAiCoachStrategies = (query: API.AiCoachStrategyQueryParams = {}) => {
  const keyword = query.keyword?.trim().toLowerCase();
  return aiCoachStrategiesData
    .filter((item) => {
      if (keyword) {
        const haystack = [item.id, item.title, item.description, item.changeSummary]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      if (query.configType && item.configType !== query.configType) return false;
      if (query.businessScene && !item.businessScenes.includes(query.businessScene)) return false;
      if (query.status && item.status !== query.status) return false;
      if (query.riskLevel && item.riskLevel !== query.riskLevel) return false;
      return true;
    })
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
};

export const paginateAiCoachStrategies = (
  items: API.AiCoachStrategy[],
  query: API.AiCoachStrategyQueryParams = {},
) => {
  const current = Number(query.current || 1);
  const pageSize = Number(query.pageSize || 20);
  const start = (current - 1) * pageSize;
  return {
    data: clone(items.slice(start, start + pageSize)),
    total: items.length,
    current,
    pageSize,
  };
};

export const buildAiCoachPrecheck = (
  params: API.AiCoachStrategySaveParams,
): API.AiCoachPrecheckResult => {
  const issues: API.AiCoachPrecheckIssue[] = [];
  if (!params.title?.trim()) {
    issues.push({
      id: 'title-required',
      level: 'error',
      field: 'title',
      message: '策略名称不能为空。',
      suggestion: '补充可识别的策略名称。',
    });
  }
  if (!params.businessScenes?.length) {
    issues.push({
      id: 'scene-required',
      level: 'error',
      field: 'businessScenes',
      message: '至少选择一个业务场景。',
      suggestion: '按实际调用场景选择业务场景，不要与配置类型混用。',
    });
  }
  if (params.configType === 'prompt_template') {
    const body = params.body as Partial<API.AiCoachPromptTemplateBody>;
    const variables = body.variables ?? [];
    if (!body.promptBody || body.promptBody.length < 30) {
      issues.push({
        id: 'prompt-too-short',
        level: 'error',
        field: 'body.promptBody',
        message: 'Prompt 模板正文过短。',
        suggestion: '补充任务边界、输入变量和输出约束。',
      });
    }
    const promptVariables = Array.from(String(body.promptBody ?? '').matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)).map(
      (item) => item[1],
    );
    const declared = new Set(variables.map((item) => item.name));
    const missing = promptVariables.filter((item) => !declared.has(item));
    if (missing.length) {
      issues.push({
        id: 'variable-missing',
        level: 'error',
        field: 'body.variables',
        message: `Prompt 引用了未声明变量：${missing.join('、')}。`,
        suggestion: '在输入变量中补齐声明。',
      });
    }
    if (!body.promptBody?.includes('不直接') && !body.promptBody?.includes('不能')) {
      issues.push({
        id: 'answer-boundary-warning',
        level: 'warning',
        field: 'body.promptBody',
        message: '模板未明确拒绝代写或直接答案。',
        suggestion: '补充学习边界说明。',
      });
    }
  }
  if (params.configType === 'dependency_rule') {
    const body = params.body as Partial<API.AiCoachDependencyRuleBody>;
    if (!body.dependencySignals?.length) {
      issues.push({
        id: 'dependency-signal-required',
        level: 'error',
        field: 'body.dependencySignals',
        message: '防依赖规则必须配置依赖信号。',
        suggestion: '至少添加一个依赖或代答信号。',
      });
    }
    if ((body.maxConsecutiveAnswers ?? 0) > 3) {
      issues.push({
        id: 'dependency-threshold-warning',
        level: 'warning',
        field: 'body.maxConsecutiveAnswers',
        message: '连续回答阈值偏高。',
        suggestion: '建议不超过 3 次。',
      });
    }
  }
  if (params.configType === 'attachment_policy') {
    const body = params.body as Partial<API.AiAttachmentPolicyBody>;
    const rules = body.rules ?? [];
    const formatAllowlist: Record<API.AiAttachmentType, string[]> = {
      image: ['jpg', 'jpeg', 'png', 'webp'],
      document: ['pdf', 'docx', 'txt'],
      audio: ['mp3', 'm4a', 'wav'],
    };
    const recognitionByType: Record<API.AiAttachmentType, API.AiAttachmentRecognitionMode> = {
      image: 'image_ocr',
      document: 'document_text_extract',
      audio: 'audio_asr',
    };
    if (!rules.some((item) => item.enabled)) {
      issues.push({ id: 'attachment-rule-required', level: 'error', field: 'body.rules', message: '至少启用一条附件规则。', suggestion: '新增并启用附件规则。' });
    }
    const seen = new Set<string>();
    rules.forEach((rule, index) => {
      if (seen.has(rule.attachmentType)) {
        issues.push({ id: `attachment-duplicate-${index}`, level: 'error', field: `body.rules.${index}.attachmentType`, message: '同一附件类型不能重复配置。', suggestion: '合并同类型规则。' });
      }
      seen.add(rule.attachmentType);
      if (!(rule.maxSizeMb > 0 && rule.maxSizeMb <= 100)) {
        issues.push({ id: `attachment-size-${index}`, level: 'error', field: `body.rules.${index}.maxSizeMb`, message: '大小限制必须在 0 到 100 MB 之间。', suggestion: '设置有效的大小上限。' });
      }
      if (!rule.allowedFormats?.length || rule.allowedFormats.some((format) => !formatAllowlist[rule.attachmentType]?.includes(format.toLowerCase()))) {
        issues.push({ id: `attachment-format-${index}`, level: 'error', field: `body.rules.${index}.allowedFormats`, message: '存在空格式或系统不支持的格式。', suggestion: '从当前附件类型的格式白名单中选择。' });
      }
      if (recognitionByType[rule.attachmentType] !== rule.recognitionMode) {
        issues.push({ id: `attachment-recognition-${index}`, level: 'error', field: `body.rules.${index}.recognitionMode`, message: '识别方式与附件类型不匹配。', suggestion: '选择当前附件类型对应的识别方式。' });
      }
    });
    const messages = body.failureMessages;
    if (!messages?.unsupportedType?.trim() || !messages.sizeExceeded?.trim() || !messages.recognitionFailed?.trim()) {
      issues.push({ id: 'attachment-failure-messages', level: 'error', field: 'body.failureMessages', message: '三类失败提示均为必填项。', suggestion: '补齐不支持类型、超限和识别失败提示。' });
    }
    const conflict = aiCoachStrategiesData.find((item) =>
      item.id !== params.strategyId &&
      item.configType === 'attachment_policy' &&
      item.status === 'published' &&
      item.businessScenes.some((scene) => params.businessScenes.includes(scene)) &&
      item.examTypes.some((exam) => params.examTypes.includes(exam)),
    );
    if (conflict) {
      issues.push({ id: 'attachment-scope-conflict', level: 'error', field: 'businessScenes', message: `与已发布附件策略「${conflict.title}」的生效范围重叠。`, suggestion: '调整业务场景或考试类型后再提交。' });
    }
  }
  if (params.riskPolicy?.highRiskKeywords?.some((item) => ['代写', '直接答案', '作弊'].includes(item))) {
    issues.push({
      id: 'high-risk-keyword',
      level: 'warning',
      field: 'riskPolicy.highRiskKeywords',
      message: '包含高风险敏感策略词。',
      suggestion: '提交后需要强化审核，最终发布由超级管理员执行。',
    });
  }
  const level: API.AiCoachPrecheckLevel = issues.some((item) => item.level === 'error')
    ? 'error'
    : issues.some((item) => item.level === 'warning')
      ? 'warning'
      : 'passed';
  return {
    level,
    summary:
      level === 'passed'
        ? '静态预校验通过。'
        : level === 'warning'
          ? '静态预校验存在警告，允许确认后提交。'
          : '静态预校验存在阻断错误，不能提交审核。',
    issues,
    checkedAt: nowText(),
  };
};

export const buildAiCoachStaticValidation = (
  params: API.AiCoachStrategySaveParams,
): API.AiCoachStaticValidationResult => {
  const precheck = buildAiCoachPrecheck(params);
  const cases = (params.validationCases?.length
    ? params.validationCases
    : [
        {
          id: 'static-case-basic',
          title: '配置校验通过',
          input: '用户询问今日任务。',
          expected: '返回结构化学习步骤。',
        },
        {
          id: 'static-case-boundary',
          title: '风险规则命中',
          input: '用户要求直接给答案。',
          expected: '触发边界提示。',
        },
      ]
  ).map((item, index) => ({
    ...item,
    result: precheck.level === 'error' && index === 0 ? 'error' : index === 1 && precheck.level !== 'passed' ? 'warning' : 'passed',
    message:
      precheck.level === 'error' && index === 0
        ? '配置字段不完整，静态样例不能通过。'
        : index === 1 && precheck.level !== 'passed'
          ? '静态样例命中风险规则，需人工确认。'
          : '静态样例结构校验通过。',
  })) as API.AiCoachStaticValidationCase[];
  const level: API.AiCoachPrecheckLevel = cases.some((item) => item.result === 'error')
    ? 'error'
    : cases.some((item) => item.result === 'warning')
      ? 'warning'
      : 'passed';
  return {
    level,
    summary: '本结果来自本地静态样例校验，不调用真实 AI。',
    cases,
    checkedAt: nowText(),
    mockOnly: true,
  };
};

const normalizedStrategyBody = (
  configType: API.AiCoachConfigType,
  body: API.AiCoachStrategySaveParams['body'],
): API.AiCoachStrategy['body'] => {
  if (configType === 'intent') {
    return {
      intentKey: String(body.intentKey ?? 'intent_custom'),
      description: String(body.description ?? ''),
      triggerExamples: Array.isArray(body.triggerExamples)
        ? body.triggerExamples
        : splitLines(String(body.triggerExamples ?? '')),
      outputIntent: String(body.outputIntent ?? 'learning_help'),
      confidenceThreshold: Number(body.confidenceThreshold ?? 0.72),
    };
  }
  if (configType === 'prompt_template') {
    return {
      systemRole: String(body.systemRole ?? '过级搭子学习陪练'),
      promptBody: String(body.promptBody ?? ''),
      variables: Array.isArray(body.variables) ? body.variables : [],
      styleRules: Array.isArray(body.styleRules)
        ? body.styleRules
        : splitLines(String(body.styleRules ?? '')),
    };
  }
  if (configType === 'response_structure') {
    return {
      schemaName: String(body.schemaName ?? 'coach_response'),
      sections: Array.isArray(body.sections) ? body.sections : [],
      outputExample: String(body.outputExample ?? ''),
    };
  }
  if (configType === 'attachment_policy') {
    return {
      rules: Array.isArray(body.rules) ? body.rules.map((rule) => ({
        ...rule,
        id: String(rule.id || `attachment-rule-${Date.now()}`),
        allowedFormats: (rule.allowedFormats ?? []).map((format) => String(format).toLowerCase()),
        maxSizeMb: Number(rule.maxSizeMb ?? 0),
        enabled: rule.enabled !== false,
      })) : [],
      failureMessages: {
        unsupportedType: String(body.failureMessages?.unsupportedType ?? ''),
        sizeExceeded: String(body.failureMessages?.sizeExceeded ?? ''),
        recognitionFailed: String(body.failureMessages?.recognitionFailed ?? ''),
      },
    } as API.AiAttachmentPolicyBody;
  }
  return {
    dependencySignals: Array.isArray(body.dependencySignals)
      ? body.dependencySignals
      : splitLines(String(body.dependencySignals ?? '')),
    interventionMessage: String(body.interventionMessage ?? ''),
    maxConsecutiveAnswers: Number(body.maxConsecutiveAnswers ?? 2),
    cooldownMinutes: Number(body.cooldownMinutes ?? 15),
  };
};

const buildStrategyFromParams = (
  id: string,
  params: API.AiCoachStrategySaveParams,
  operator: AiCoachOperator,
): API.AiCoachStrategy => {
  const now = nowText();
  const strategy = {
    id,
    title: params.title,
    description: params.description,
    configType: params.configType,
    businessScenes: params.businessScenes,
    examTypes: params.examTypes,
    status: 'draft',
    riskLevel:
      params.configType === 'dependency_rule' || params.riskPolicy?.highRiskKeywords?.length
        ? 'high'
        : 'medium',
    version: 'V0.1',
    dataVersion: 1,
    creatorId: operator.id,
    creator: operator.name,
    updatedBy: operator.name,
    createdAt: now,
    updatedAt: now,
    changeSummary: params.changeSummary || '保存 AI 策略草稿。',
    impactScope: params.impactScope || '当前为草稿，不影响线上策略。',
    riskPolicy: params.riskPolicy,
    body: normalizedStrategyBody(params.configType, params.body),
    validationCases: params.validationCases ?? [],
    lastPrecheck: buildAiCoachPrecheck(params),
    lastValidation: buildAiCoachStaticValidation(params),
    versionSnapshots: [],
    operationRecords: [
      {
        id: `ai-op-${id}-${Date.now()}`,
        operator: operator.name,
        roleName: operator.roleName,
        action: '保存草稿',
        toStatus: 'draft',
        reason: params.changeSummary || '保存 AI 策略草稿。',
        time: now,
      },
    ],
  } as API.AiCoachStrategy;
  strategy.versionSnapshots = [statusSnapshot(strategy)];
  return strategy;
};

export const createAiCoachStrategyRecord = (
  params: API.AiCoachStrategySaveParams,
  operator: AiCoachOperator,
) => {
  const strategy = buildStrategyFromParams(`ai-strategy-${Date.now()}`, params, operator);
  aiCoachStrategiesData.unshift(strategy);
  return strategy;
};

export const updateAiCoachStrategyRecord = (
  strategy: API.AiCoachStrategy,
  params: API.AiCoachStrategySaveParams,
  operator: AiCoachOperator,
) => {
  if (params.dataVersion !== undefined && params.dataVersion !== strategy.dataVersion) {
    return { conflict: true as const };
  }
  if (!['draft', 'rejected'].includes(strategy.status)) {
    return { locked: true as const };
  }
  const now = nowText();
  strategy.title = params.title;
  strategy.description = params.description;
  strategy.configType = params.configType;
  strategy.businessScenes = params.businessScenes;
  strategy.examTypes = params.examTypes;
  strategy.body = normalizedStrategyBody(params.configType, params.body);
  strategy.riskPolicy = params.riskPolicy;
  strategy.validationCases = params.validationCases ?? [];
  strategy.riskLevel =
    params.configType === 'dependency_rule' || params.riskPolicy?.highRiskKeywords?.length
      ? 'high'
      : strategy.riskLevel;
  strategy.changeSummary = params.changeSummary || strategy.changeSummary;
  strategy.impactScope = params.impactScope || strategy.impactScope;
  strategy.updatedBy = operator.name;
  strategy.updatedAt = now;
  strategy.dataVersion += 1;
  strategy.lastPrecheck = buildAiCoachPrecheck(params);
  strategy.lastValidation = buildAiCoachStaticValidation(params);
  strategy.versionSnapshots.unshift(statusSnapshot(strategy));
  strategy.operationRecords.unshift({
    id: `ai-op-${strategy.id}-${Date.now()}`,
    operator: operator.name,
    roleName: operator.roleName,
    action: '保存草稿',
    fromStatus: strategy.status,
    toStatus: strategy.status,
    reason: params.changeSummary || '更新 AI 策略草稿。',
    time: now,
  });
  return { strategy };
};

export const copyAiCoachStrategyDraft = (
  strategy: API.AiCoachStrategy,
  operator: AiCoachOperator,
) => {
  const now = nowText();
  const draft = clone(strategy);
  draft.id = `${strategy.id}-draft-${Date.now()}`;
  draft.title = `${strategy.title} 新草稿`;
  draft.status = 'draft';
  draft.version = `V${Number(strategy.version.replace(/^V/, '') || 1) + 0.1}`;
  draft.dataVersion = 1;
  draft.creatorId = operator.id;
  draft.creator = operator.name;
  draft.updatedBy = operator.name;
  draft.createdAt = now;
  draft.updatedAt = now;
  draft.reviewTaskId = undefined;
  draft.changeSummary = '从已发布版本创建新草稿。';
  draft.impactScope = '草稿版本，不直接影响线上。';
  draft.operationRecords = [
    {
      id: `ai-op-copy-${draft.id}`,
      operator: operator.name,
      roleName: operator.roleName,
      action: '复制草稿',
      fromStatus: strategy.status,
      toStatus: 'draft',
      reason: '已发布版本不可直接覆盖，创建新草稿版本。',
      time: now,
    },
  ];
  draft.versionSnapshots = [statusSnapshot(draft), ...strategy.versionSnapshots];
  aiCoachStrategiesData.unshift(draft);
  return draft;
};

export const submitAiCoachStrategyReview = (
  strategy: API.AiCoachStrategy,
  params: API.AiCoachStrategySubmitParams,
  operator: AiCoachOperator,
  reviewTasksData: API.ReviewTask[],
) => {
  if (params.dataVersion !== strategy.dataVersion) {
    return { conflict: true as const };
  }
  if (!['draft', 'rejected'].includes(strategy.status)) {
    return { locked: true as const };
  }
  const precheck = strategy.lastPrecheck ?? buildAiCoachPrecheck({
    title: strategy.title,
    description: strategy.description,
    configType: strategy.configType,
    businessScenes: strategy.businessScenes,
    examTypes: strategy.examTypes,
    body: strategy.body,
    riskPolicy: strategy.riskPolicy,
    validationCases: strategy.validationCases,
    changeSummary: params.changeSummary,
    impactScope: strategy.impactScope,
    dataVersion: strategy.dataVersion,
  });
  if (precheck.level === 'error') {
    return { blocked: true as const, precheck };
  }
  if (precheck.level === 'warning' && !params.confirmWarnings) {
    return { warning: true as const, precheck };
  }
  const now = nowText();
  const previousStatus = strategy.status;
  const task: API.ReviewTask = {
    id: strategy.reviewTaskId || `review-ai-coach-${Date.now()}`,
    objectType: 'ai_coach_strategy',
    objectSubtype: strategy.configType,
    objectTypeName: 'AI 陪练策略',
    objectId: strategy.id,
    objectName: strategy.title,
    moduleKey: 'aiCoach',
    moduleName: 'AI 陪练管理',
    submitterId: operator.id,
    submitter: operator.name,
    submittedAt: now,
    version: strategy.version,
    priority: strategy.riskLevel === 'high' ? 'P0' : 'P1',
    status: 'pending_review',
    riskLevel: strategy.riskLevel,
    updatedAt: now,
    changeSummary: params.changeSummary,
    impactScope: strategy.impactScope,
    reviewOpinion: '',
    reviewer: '',
    releasePlan: strategy.riskLevel === 'high' ? '高风险策略通过后由超级管理员最终发布。' : '审核通过后进入待发布队列。',
    rollbackTargetVersion: strategy.publishedVersion,
    versionRecords: [
      {
        id: `version-ai-coach-${strategy.id}-${Date.now()}`,
        version: strategy.version,
        status: 'pending_review',
        summary: params.changeSummary,
        createdBy: operator.name,
        createdAt: now,
      },
    ],
    operationRecords: [
      {
        id: `op-ai-coach-${strategy.id}-${Date.now()}`,
        operator: operator.name,
        roleName: operator.roleName,
        action: '提交审核',
        fromStatus: previousStatus,
        toStatus: 'pending_review',
        reason: params.changeSummary,
        time: now,
      },
    ],
  };
  const existingIndex = reviewTasksData.findIndex((item) => item.id === task.id);
  if (existingIndex >= 0) reviewTasksData.splice(existingIndex, 1, task);
  else reviewTasksData.unshift(task);
  strategy.status = 'pending_review';
  strategy.reviewTaskId = task.id;
  strategy.updatedAt = now;
  strategy.updatedBy = operator.name;
  strategy.changeSummary = params.changeSummary;
  strategy.dataVersion += 1;
  strategy.versionSnapshots.unshift(statusSnapshot(strategy));
  strategy.operationRecords.unshift(task.operationRecords[0]);
  return { strategy, task };
};

export const syncAiCoachStrategyFromReviewTask = (
  task: API.ReviewTask,
  previousStatus: API.ReviewTaskStatus,
  nextStatus: API.ReviewTaskStatus,
  operator: AiCoachOperator,
  reason: string,
) => {
  if (!isAiCoachReviewTask(task)) return;
  const strategy = getAiCoachStrategy(task.objectId);
  if (!strategy) return;
  const now = task.updatedAt || nowText();
  strategy.status = nextStatus;
  strategy.updatedBy = operator.name;
  strategy.updatedAt = now;
  strategy.reviewTaskId = task.id;
  if (nextStatus === 'published') strategy.publishedVersion = strategy.version;
  if (nextStatus === 'rolled_back') strategy.rollbackTargetVersion = task.rollbackTargetVersion;
  strategy.dataVersion += 1;
  strategy.operationRecords.unshift({
    id: `ai-op-review-${strategy.id}-${Date.now()}`,
    operator: operator.name,
    roleName: operator.roleName,
    action: reviewStatusActionMap[nextStatus],
    fromStatus: previousStatus,
    toStatus: nextStatus,
    reason,
    time: now,
  });
  strategy.versionSnapshots.unshift(statusSnapshot(strategy));
};

export const buildAiCoachVersionDiff = (
  strategy: API.AiCoachStrategy,
  fromVersion?: string,
  toVersion?: string,
): API.AiCoachVersionDiff => {
  const snapshots = strategy.versionSnapshots;
  const from = snapshots.find((item) => item.version === fromVersion) ?? snapshots[1] ?? snapshots[0];
  const to = snapshots.find((item) => item.version === toVersion) ?? snapshots[0];
  return {
    fromVersion: from?.version ?? '-',
    toVersion: to?.version ?? '-',
    items: [
      { field: '策略名称', before: from?.title, after: to?.title, changed: from?.title !== to?.title },
      {
        field: '配置类型',
        before: from ? aiCoachConfigTypeLabels[from.configType] : '-',
        after: to ? aiCoachConfigTypeLabels[to.configType] : '-',
        changed: from?.configType !== to?.configType,
      },
      {
        field: '业务场景',
        before: from?.businessScenes.map((item) => aiCoachBusinessSceneLabels[item]).join('、'),
        after: to?.businessScenes.map((item) => aiCoachBusinessSceneLabels[item]).join('、'),
        changed: from?.businessScenes.join(',') !== to?.businessScenes.join(','),
      },
      { field: '主体摘要', before: from?.bodySummary, after: to?.bodySummary, changed: from?.bodySummary !== to?.bodySummary },
      { field: '状态', before: from?.status, after: to?.status, changed: from?.status !== to?.status },
    ],
  };
};

export const aiCoachDashboardTodoSources = () =>
  aiCoachStrategiesData.filter((item) =>
    ['pending_review', 'pending_publish', 'rejected'].includes(item.status) ||
    item.lastPrecheck?.level === 'error' ||
    (item.riskLevel === 'high' && item.status === 'pending_publish'),
  );

export const strategyForUserSummary = (index: number) => {
  const available = aiCoachStrategiesData.filter((item) => item.status === 'published');
  return available[index % available.length] ?? aiCoachStrategiesData[index % aiCoachStrategiesData.length];
};

export const operatorFromRole = (roleId: AdminRoleId, accountId?: string, accountName?: string): AiCoachOperator => ({
  id: accountId || roleId,
  name: accountName || roleConfigs[roleId].name,
  roleId,
  roleName: roleConfigs[roleId].name,
});
