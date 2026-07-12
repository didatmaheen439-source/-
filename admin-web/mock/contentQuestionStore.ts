import type { Request } from 'express';
import { nowText } from './auditStore';

export const examTypeLabels: Record<API.ExamType, string> = {
  CET4: '四级',
  CET6: '六级',
};

export const questionTypeLabels: Record<API.QuestionType, string> = {
  single_choice: '单选题',
  reading_choice: '阅读选择',
  listening_choice: '听力选择',
};

export const skillLabels: Record<API.QuestionSkill, string> = {
  vocabulary: '词汇',
  grammar: '语法',
  reading: '阅读',
  listening: '听力',
};

export const difficultyLabels: Record<API.QuestionDifficulty, string> = {
  easy: '基础',
  medium: '中等',
  hard: '较难',
};

const reviewStatusActionMap: Record<API.ReviewTaskStatus, string> = {
  draft: '保存草稿',
  pending_review: '重新提交',
  rejected: '驳回',
  approved: '审核通过',
  pending_publish: '安排发布',
  published: '发布',
  offline: '下架',
  rolled_back: '回滚',
};

const publishedQuestion = (params: {
  id: string;
  title: string;
  examType: API.ExamType;
  questionType: API.QuestionType;
  skill: API.QuestionSkill;
  difficulty?: API.QuestionDifficulty;
  index: number;
}): API.QuestionItem => ({
  id: params.id,
  title: params.title,
  stem: `${params.examType} ${params.skill} mock passage question ${params.index}: which option best matches the stated information?`,
  examType: params.examType,
  questionType: params.questionType,
  skill: params.skill,
  difficulty: params.difficulty ?? 'medium',
  tags: ['模考引用', params.skill === 'listening' ? '听力理解' : '阅读理解'],
  options: [
    { key: 'A', content: `Option A for mock item ${params.index}.` },
    { key: 'B', content: `Option B for mock item ${params.index}.` },
    { key: 'C', content: `Option C for mock item ${params.index}.` },
    { key: 'D', content: `Option D for mock item ${params.index}.` },
  ],
  answer: params.index % 2 === 0 ? 'B' : 'C',
  analysis: `模拟解析 ${params.index}，用于验证模考试卷引用、版本锁定与参考答案展示。`,
  status: 'published',
  version: 'V1.0',
  creator: '教研审核',
  createdAt: '2026-07-08 09:00:00',
  updatedBy: '教研审核',
  updatedAt: `2026-07-08 09:${String(params.index).padStart(2, '0')}:00`,
  changeSummary: '补充模考试卷可引用的已发布客观题。',
  referenceImpact: '可被同考试类型的模考试卷引用。',
  versionRecords: [
    {
      id: `question-version-${params.id}-v10`,
      version: 'V1.0',
      status: 'published',
      summary: '当前线上版本。',
      createdBy: '教研审核',
      createdAt: '2026-07-08 09:00:00',
    },
  ],
  operationRecords: [
    {
      id: `question-op-${params.id}-publish`,
      operator: '教研审核',
      roleName: '教研审核',
      action: '发布',
      fromStatus: 'pending_publish',
      toStatus: 'published',
      reason: '完成教研审核并发布。',
      time: '2026-07-08 09:00:00',
    },
  ],
});

const initialQuestionData: API.QuestionItem[] = [
  {
    id: 'question-cet4-reading-001',
    title: '四级阅读主旨判断题 A',
    stem: 'According to the passage, what is the main reason students delay their daily reading practice?',
    examType: 'CET4',
    questionType: 'reading_choice',
    skill: 'reading',
    difficulty: 'medium',
    tags: ['主旨题', '学习习惯', '阅读理解'],
    options: [
      { key: 'A', content: 'They cannot find enough reading materials.' },
      { key: 'B', content: 'They do not have a clear starting task.' },
      { key: 'C', content: 'They prefer listening practice.' },
      { key: 'D', content: 'They have already mastered the topic.' },
    ],
    answer: 'B',
    analysis: '文中强调学生拖延的主要原因是缺少明确起点，而不是材料不足或偏好问题。',
    status: 'pending_review',
    version: 'V1.2',
    creator: '内容运营',
    createdAt: '2026-07-06 16:00:00',
    updatedBy: '内容运营',
    updatedAt: '2026-07-07 09:40:00',
    changeSummary: '补充阅读题干、选项和错因解析。',
    referenceImpact: '影响 CET-4 阅读专项练习和今日任务推荐。',
    reviewTaskId: 'review-question-001',
    versionRecords: [
      {
        id: 'question-version-reading-001-v12',
        version: 'V1.2',
        status: 'pending_review',
        summary: '补充阅读题干、选项和解析。',
        createdBy: '内容运营',
        createdAt: '2026-07-07 09:40:00',
      },
      {
        id: 'question-version-reading-001-v11',
        version: 'V1.1',
        status: 'draft',
        summary: '初始草稿。',
        createdBy: '内容运营',
        createdAt: '2026-07-06 16:00:00',
      },
    ],
    operationRecords: [
      {
        id: 'question-op-reading-001-submit',
        operator: '内容运营',
        roleName: '内容运营',
        action: '提交审核',
        fromStatus: 'draft',
        toStatus: 'pending_review',
        reason: '阅读题内容完整，提交教研审核。',
        time: '2026-07-07 09:40:00',
      },
    ],
  },
  {
    id: 'question-cet6-listening-001',
    title: '六级听力观点态度题 A',
    stem: 'What is the speaker most likely to suggest at the end of the conversation?',
    examType: 'CET6',
    questionType: 'listening_choice',
    skill: 'listening',
    difficulty: 'hard',
    tags: ['观点态度', '听力长对话'],
    options: [
      { key: 'A', content: 'Reschedule the meeting for next week.' },
      { key: 'B', content: 'Collect more feedback before making a decision.' },
      { key: 'C', content: 'Cancel the project immediately.' },
      { key: 'D', content: 'Ignore the recent survey results.' },
    ],
    answer: 'B',
    analysis: '说话人强调需要更多反馈再决定，选项 B 与语义一致。',
    status: 'draft',
    version: 'V0.3',
    creator: '内容运营',
    createdAt: '2026-07-07 10:20:00',
    updatedBy: '内容运营',
    updatedAt: '2026-07-07 10:35:00',
    changeSummary: '新增六级听力观点态度题。',
    referenceImpact: '当前为草稿，尚未影响线上练习。',
    versionRecords: [
      {
        id: 'question-version-listening-001-v03',
        version: 'V0.3',
        status: 'draft',
        summary: '补充选项和解析。',
        createdBy: '内容运营',
        createdAt: '2026-07-07 10:35:00',
      },
    ],
    operationRecords: [
      {
        id: 'question-op-listening-001-create',
        operator: '内容运营',
        roleName: '内容运营',
        action: '保存草稿',
        toStatus: 'draft',
        reason: '新增听力客观题草稿。',
        time: '2026-07-07 10:20:00',
      },
    ],
  },
  {
    id: 'question-cet4-vocabulary-001',
    title: '四级词汇辨析题 A',
    stem: 'The manager asked the team to ______ the report before Friday.',
    examType: 'CET4',
    questionType: 'single_choice',
    skill: 'vocabulary',
    difficulty: 'easy',
    tags: ['词汇辨析', '动词搭配'],
    options: [
      { key: 'A', content: 'revise' },
      { key: 'B', content: 'reserve' },
      { key: 'C', content: 'reverse' },
      { key: 'D', content: 'reveal' },
    ],
    answer: 'A',
    analysis: 'revise the report 表示修改报告，符合语境。',
    status: 'rejected',
    version: 'V0.8',
    creator: '内容运营',
    createdAt: '2026-07-05 14:20:00',
    updatedBy: '教研审核',
    updatedAt: '2026-07-06 11:10:00',
    changeSummary: '补充词汇辨析题。',
    referenceImpact: '当前未发布，不影响线上练习。',
    versionRecords: [
      {
        id: 'question-version-vocab-001-v08',
        version: 'V0.8',
        status: 'rejected',
        summary: '教研驳回，要求补充干扰项解释。',
        createdBy: '教研审核',
        createdAt: '2026-07-06 11:10:00',
      },
    ],
    operationRecords: [
      {
        id: 'question-op-vocab-001-reject',
        operator: '教研审核',
        roleName: '教研审核',
        action: '驳回',
        fromStatus: 'pending_review',
        toStatus: 'rejected',
        reason: '干扰项解释不足。',
        time: '2026-07-06 11:10:00',
      },
    ],
  },
  publishedQuestion({
    id: 'question-cet6-grammar-001',
    title: '六级语法结构题 A',
    examType: 'CET6',
    questionType: 'single_choice',
    skill: 'grammar',
    difficulty: 'hard',
    index: 1,
  }),
  ...(['CET4', 'CET6'] as API.ExamType[]).flatMap((examType, examIndex) =>
    Array.from({ length: 4 }).flatMap((_, index) => [
      publishedQuestion({
        id: `question-${examType.toLowerCase()}-listening-mock-${index + 1}`,
        title: `${examType === 'CET4' ? '四级' : '六级'}听力模考题 ${index + 1}`,
        examType,
        questionType: 'listening_choice',
        skill: 'listening',
        index: examIndex * 10 + index + 2,
      }),
      publishedQuestion({
        id: `question-${examType.toLowerCase()}-reading-mock-${index + 1}`,
        title: `${examType === 'CET4' ? '四级' : '六级'}阅读模考题 ${index + 1}`,
        examType,
        questionType: 'reading_choice',
        skill: 'reading',
        index: examIndex * 10 + index + 6,
      }),
    ]),
  ),
];

export const wrongReasonCategoryLabels: Record<
  API.WrongReasonTagCategory,
  string
> = {
  comprehension_bias: '理解偏差',
  knowledge_gap: '知识点缺失',
  question_review: '审题问题',
  expression_issue: '表达问题',
  strategy_issue: '策略问题',
};

export const wrongReasonSeverityLabels: Record<
  API.WrongReasonTagSeverity,
  string
> = {
  low: '低',
  medium: '中',
  high: '高',
};

const wrongReasonTagSeed = (params: {
  id: string;
  name: string;
  category: API.WrongReasonTagCategory;
  examTypes: API.ExamType[];
  questionTypes: API.QuestionType[];
  severity: API.WrongReasonTagSeverity;
  description: string;
  status: API.ReviewTaskStatus;
  referenceCount: number;
  version: string;
  updatedBy?: string;
  updatedAt: string;
  changeSummary: string;
  referenceImpact: string;
  reviewTaskId?: string;
}): API.WrongReasonTagItem => ({
  id: params.id,
  name: params.name,
  category: params.category,
  examTypes: params.examTypes,
  questionTypes: params.questionTypes,
  severity: params.severity,
  description: params.description,
  status: params.status,
  referenceCount: params.referenceCount,
  version: params.version,
  creator: '内容运营',
  createdAt: '2026-07-06 09:20:00',
  updatedBy: params.updatedBy ?? '内容运营',
  updatedAt: params.updatedAt,
  changeSummary: params.changeSummary,
  referenceImpact: params.referenceImpact,
  reviewTaskId: params.reviewTaskId,
  versionRecords: [
    {
      id: `wrong-reason-version-${params.id}-${params.version}`,
      version: params.version,
      status: params.status,
      summary: params.changeSummary,
      createdBy: params.updatedBy ?? '内容运营',
      createdAt: params.updatedAt,
    },
  ],
  operationRecords: [
    {
      id: `wrong-reason-op-${params.id}-${params.status}`,
      operator: params.updatedBy ?? '内容运营',
      roleName: params.updatedBy ?? '内容运营',
      action: reviewStatusActionMap[params.status],
      toStatus: params.status,
      reason: params.changeSummary,
      time: params.updatedAt,
    },
  ],
});

const initialWrongReasonTagData: API.WrongReasonTagItem[] = [
  wrongReasonTagSeed({
    id: 'wrong-reason-main-idea-bias',
    name: '主旨理解偏差',
    category: 'comprehension_bias',
    examTypes: ['CET4', 'CET6'],
    questionTypes: ['reading_choice'],
    severity: 'medium',
    description: '学生将局部细节误判为全文主旨，适用于阅读主旨类错题归因。',
    status: 'published',
    referenceCount: 18,
    version: 'V1.0',
    updatedBy: '教研审核',
    updatedAt: '2026-07-07 09:30:00',
    changeSummary: '发布阅读主旨错因标签。',
    referenceImpact: '已被阅读题解析、错因分布和复练推荐引用。',
  }),
  wrongReasonTagSeed({
    id: 'wrong-reason-vocab-collocation',
    name: '固定搭配缺失',
    category: 'knowledge_gap',
    examTypes: ['CET4'],
    questionTypes: ['single_choice'],
    severity: 'low',
    description: '学生不了解常见动词、名词或介词搭配，导致词汇辨析错误。',
    status: 'published',
    referenceCount: 12,
    version: 'V1.1',
    updatedBy: '教研审核',
    updatedAt: '2026-07-07 10:15:00',
    changeSummary: '补充四级词汇固定搭配错因。',
    referenceImpact: '可被四级词汇题和复练推荐引用。',
  }),
  wrongReasonTagSeed({
    id: 'wrong-reason-keyword-missed',
    name: '题干关键词遗漏',
    category: 'question_review',
    examTypes: ['CET4', 'CET6'],
    questionTypes: ['single_choice', 'reading_choice', 'listening_choice'],
    severity: 'high',
    description: '学生忽略否定、比较、时间或因果关键词，导致审题方向错误。',
    status: 'draft',
    referenceCount: 0,
    version: 'V0.2',
    updatedAt: '2026-07-08 11:05:00',
    changeSummary: '新增审题关键词遗漏错因草稿。',
    referenceImpact: '当前为草稿，尚未影响线上题目。',
  }),
  wrongReasonTagSeed({
    id: 'wrong-reason-template-expression',
    name: '模板化表达过度',
    category: 'expression_issue',
    examTypes: ['CET6'],
    questionTypes: ['single_choice'],
    severity: 'medium',
    description: '用于标记写译或表达类任务中过度套用模板导致内容空泛的问题。',
    status: 'rejected',
    referenceCount: 2,
    version: 'V0.4',
    updatedBy: '教研审核',
    updatedAt: '2026-07-08 14:20:00',
    changeSummary: '教研要求补充适用边界后再提交。',
    referenceImpact: '被少量草稿内容引用，暂不影响线上发布内容。',
  }),
  wrongReasonTagSeed({
    id: 'wrong-reason-low-review-frequency',
    name: '复练频率不足',
    category: 'strategy_issue',
    examTypes: ['CET4', 'CET6'],
    questionTypes: ['single_choice', 'reading_choice', 'listening_choice'],
    severity: 'medium',
    description: '用于学习路径分析，标记学生因复练间隔过长导致同类错误反复出现。',
    status: 'pending_publish',
    referenceCount: 5,
    version: 'V0.9',
    updatedBy: '教研审核',
    updatedAt: '2026-07-08 16:40:00',
    changeSummary: '审核通过，等待发布到错因标签字典。',
    referenceImpact: '发布后可被学习路径复练推荐策略引用。',
    reviewTaskId: 'review-wrong-reason-001',
  }),
];

const globalQuestionStore = globalThis as typeof globalThis & {
  __GUOJI_ADMIN_QUESTIONS__?: API.QuestionItem[];
  __GUOJI_ADMIN_WRONG_REASON_TAGS__?: API.WrongReasonTagItem[];
};

if (!globalQuestionStore.__GUOJI_ADMIN_QUESTIONS__) {
  globalQuestionStore.__GUOJI_ADMIN_QUESTIONS__ = initialQuestionData;
}

if (!globalQuestionStore.__GUOJI_ADMIN_WRONG_REASON_TAGS__) {
  globalQuestionStore.__GUOJI_ADMIN_WRONG_REASON_TAGS__ =
    initialWrongReasonTagData;
}

export const questionData = globalQuestionStore.__GUOJI_ADMIN_QUESTIONS__;

export const wrongReasonTagData =
  globalQuestionStore.__GUOJI_ADMIN_WRONG_REASON_TAGS__;

export const moduleByQuestionSkill: Record<
  API.QuestionSkill,
  API.LearningPathModule
> = {
  vocabulary: 'vocabulary',
  grammar: 'grammar',
  reading: 'reading',
  listening: 'listening',
};

export const buildQuestionReference = (
  question: API.QuestionItem,
): API.LearningPathReference => ({
  id: question.id,
  type: 'question',
  name: question.title,
  examType: question.examType,
  module: moduleByQuestionSkill[question.skill],
  status: question.status,
  available: question.status === 'published',
});

export const allLearningPathReferences = () =>
  questionData.map(buildQuestionReference);

export const referenceById = (id?: string) =>
  allLearningPathReferences().find((item) => item.id === id);

const getQueryValue = (value: unknown) =>
  Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');

export const filterWrongReasonTags = (query: Request['query']) => {
  const keyword = getQueryValue(query.keyword).trim();
  const category = getQueryValue(query.category);
  const examType = getQueryValue(query.examType);
  const questionType = getQueryValue(query.questionType);
  const severity = getQueryValue(query.severity);
  const status = getQueryValue(query.status);
  const updatedBy = getQueryValue(query.updatedBy).trim();

  return [...wrongReasonTagData]
    .filter((tag) => {
      if (
        keyword &&
        ![
          tag.id,
          tag.name,
          wrongReasonCategoryLabels[tag.category],
          tag.description,
          tag.changeSummary,
        ].some((value) => value.includes(keyword))
      ) {
        return false;
      }
      if (category && tag.category !== category) return false;
      if (examType && !tag.examTypes.includes(examType as API.ExamType)) {
        return false;
      }
      if (
        questionType &&
        !tag.questionTypes.includes(questionType as API.QuestionType)
      ) {
        return false;
      }
      if (severity && tag.severity !== severity) return false;
      if (status && tag.status !== status) return false;
      if (updatedBy && !tag.updatedBy.includes(updatedBy)) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

const normalizeExamTypes = (examTypes?: API.ExamType[]) =>
  [...new Set((examTypes ?? []).filter((item) => examTypeLabels[item]))];

const normalizeQuestionTypes = (questionTypes?: API.QuestionType[]) =>
  [
    ...new Set(
      (questionTypes ?? []).filter((item) => questionTypeLabels[item]),
    ),
  ];

export const validateWrongReasonTagPayload = (
  body: Partial<API.WrongReasonTagSaveParams>,
  currentId?: string,
):
  | {
      errorCode: '400' | '409';
      errorMessage: string;
    }
  | undefined => {
  const name = body.name?.trim();
  if (!name) return { errorCode: '400', errorMessage: '标签名是必填项。' };
  if (!body.category || !wrongReasonCategoryLabels[body.category]) {
    return { errorCode: '400', errorMessage: '分类无效。' };
  }
  if (!normalizeExamTypes(body.examTypes).length) {
    return { errorCode: '400', errorMessage: '适用考试是必填项。' };
  }
  if (!normalizeQuestionTypes(body.questionTypes).length) {
    return { errorCode: '400', errorMessage: '适用题型是必填项。' };
  }
  if (!body.severity || !wrongReasonSeverityLabels[body.severity]) {
    return { errorCode: '400', errorMessage: '严重级别无效。' };
  }
  if (!body.description?.trim()) {
    return { errorCode: '400', errorMessage: '说明是必填项。' };
  }
  const duplicated = wrongReasonTagData.some(
    (tag) =>
      tag.id !== currentId &&
      tag.category === body.category &&
      tag.name === name,
  );
  if (duplicated) {
    return {
      errorCode: '409',
      errorMessage: '同一分类下已存在同名错因标签。',
    };
  }
  return undefined;
};

export const filterQuestions = (query: Request['query']) => {
  const keyword = getQueryValue(query.keyword).trim();
  const examType = getQueryValue(query.examType);
  const questionType = getQueryValue(query.questionType);
  const status = getQueryValue(query.status);
  const difficulty = getQueryValue(query.difficulty);

  return [...questionData]
    .filter((question) => {
      if (
        keyword &&
        ![
          question.id,
          question.title,
          question.stem,
          question.analysis,
          ...question.tags,
        ].some((value) => value.includes(keyword))
      ) {
        return false;
      }
      if (examType && question.examType !== examType) return false;
      if (questionType && question.questionType !== questionType) return false;
      if (status && question.status !== status) return false;
      if (difficulty && question.difficulty !== difficulty) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const normalizeQuestionTags = (tags?: string[]) =>
  [...new Set((tags ?? []).map((item) => item.trim()).filter(Boolean))];

export const validateQuestionPayload = (
  body: Partial<API.QuestionSaveParams>,
) => {
  if (!body.title?.trim()) return '题目标题是必填项。';
  if (!body.stem?.trim()) return '题干是必填项。';
  if (!body.examType || !examTypeLabels[body.examType])
    return '考试类型无效。';
  if (!body.questionType || !questionTypeLabels[body.questionType])
    return '题型无效。';
  if (!body.skill || !skillLabels[body.skill]) return '所属技能无效。';
  if (!body.difficulty || !difficultyLabels[body.difficulty])
    return '难度无效。';
  if (!body.answer || !['A', 'B', 'C', 'D'].includes(body.answer))
    return '正确答案无效。';
  if (!body.analysis?.trim()) return '解析是必填项。';

  const options = body.options ?? [];
  if (options.length !== 4) return '客观题必须包含 A、B、C、D 四个选项。';
  for (const key of ['A', 'B', 'C', 'D']) {
    const option = options.find((item) => item.key === key);
    if (!option?.content?.trim()) return `选项 ${key} 是必填项。`;
  }
  return '';
};

const nextQuestionVersion = (version: string) => {
  const matched = /^V(\d+)\.(\d+)$/.exec(version);
  if (!matched) return 'V0.1';
  return `V${matched[1]}.${Number(matched[2]) + 1}`;
};

const defaultWrongReasonReferenceImpact = (tag: API.WrongReasonTagItem) =>
  tag.referenceCount > 0
    ? `当前被 ${tag.referenceCount} 个内容对象引用，状态变更会影响题目、题组或错因分布。`
    : '当前未被内容对象引用。';

export const createWrongReasonTagRecord = (
  body: API.WrongReasonTagSaveParams,
  operatorName: string,
) => {
  const now = nowText();
  const tag: API.WrongReasonTagItem = {
    id: `wrong-reason-${Date.now()}`,
    name: body.name.trim(),
    category: body.category,
    examTypes: normalizeExamTypes(body.examTypes),
    questionTypes: normalizeQuestionTypes(body.questionTypes),
    severity: body.severity,
    description: body.description.trim(),
    status: 'draft',
    referenceCount: 0,
    version: 'V0.1',
    creator: operatorName,
    createdAt: now,
    updatedBy: operatorName,
    updatedAt: now,
    changeSummary: body.changeSummary?.trim() || '新增错因标签草稿。',
    referenceImpact:
      body.referenceImpact?.trim() || '当前未被内容对象引用。',
    versionRecords: [
      {
        id: `wrong-reason-version-create-${Date.now()}`,
        version: 'V0.1',
        status: 'draft',
        summary: body.changeSummary?.trim() || '新增错因标签草稿。',
        createdBy: operatorName,
        createdAt: now,
      },
    ],
    operationRecords: [
      {
        id: `wrong-reason-op-create-${Date.now()}`,
        operator: operatorName,
        roleName: operatorName,
        action: '保存草稿',
        toStatus: 'draft',
        reason: body.changeSummary?.trim() || '新增错因标签草稿。',
        time: now,
      },
    ],
  };
  wrongReasonTagData.unshift(tag);
  return tag;
};

export const updateWrongReasonTagRecord = (
  tag: API.WrongReasonTagItem,
  body: API.WrongReasonTagSaveParams,
  operatorName: string,
) => {
  const now = nowText();
  const previousStatus = tag.status;
  tag.name = body.name.trim();
  tag.category = body.category;
  tag.examTypes = normalizeExamTypes(body.examTypes);
  tag.questionTypes = normalizeQuestionTypes(body.questionTypes);
  tag.severity = body.severity;
  tag.description = body.description.trim();
  tag.status = 'draft';
  tag.version = nextQuestionVersion(tag.version);
  tag.updatedBy = operatorName;
  tag.updatedAt = now;
  tag.changeSummary = body.changeSummary?.trim() || '更新错因标签草稿。';
  tag.referenceImpact =
    body.referenceImpact?.trim() || defaultWrongReasonReferenceImpact(tag);
  tag.versionRecords.unshift({
    id: `wrong-reason-version-${tag.id}-${Date.now()}`,
    version: tag.version,
    status: 'draft',
    summary: tag.changeSummary,
    createdBy: operatorName,
    createdAt: now,
  });
  tag.operationRecords.unshift({
    id: `wrong-reason-op-${tag.id}-${Date.now()}`,
    operator: operatorName,
    roleName: operatorName,
    action: '保存草稿',
    fromStatus: previousStatus,
    toStatus: 'draft',
    reason: tag.changeSummary,
    time: now,
  });
  return tag;
};

export const buildWrongReasonTagReviewTask = (
  tag: API.WrongReasonTagItem,
  operator: { id: string; name: string },
  changeSummary: string,
  reviewTasks: API.ReviewTask[],
) => {
  const now = nowText();
  const existingTask = tag.reviewTaskId
    ? reviewTasks.find((item) => item.id === tag.reviewTaskId)
    : reviewTasks.find(
        (item) =>
          item.objectType === 'wrong_reason_tag' && item.objectId === tag.id,
      );
  const riskLevel: API.ReviewRiskLevel =
    tag.severity === 'high' || tag.referenceCount > 0 ? 'high' : 'medium';
  const impactScope =
    tag.referenceCount > 0
      ? `${tag.referenceImpact} 当前引用次数 ${tag.referenceCount}。`
      : tag.referenceImpact;
  const taskPayload = {
    objectType: 'wrong_reason_tag' as API.ReviewObjectType,
    objectSubtype: tag.category,
    objectTypeName: '错因标签',
    objectId: tag.id,
    objectName: tag.name,
    moduleKey: 'content',
    moduleName: '题库与内容管理',
    submitterId: operator.id,
    submitter: operator.name,
    submittedAt: now,
    version: tag.version,
    priority: riskLevel === 'high' ? ('P0' as const) : ('P1' as const),
    status: 'pending_review' as API.ReviewTaskStatus,
    riskLevel,
    updatedAt: now,
    changeSummary,
    impactScope,
    reviewOpinion: '',
    reviewer: '',
    releasePlan: '审核通过后进入待发布队列，发布后成为可引用错因字典项。',
    rollbackTargetVersion: tag.version,
  };

  if (existingTask) {
    Object.assign(existingTask, taskPayload);
    existingTask.versionRecords.unshift({
      id: `version-${existingTask.id}-${Date.now()}`,
      version: tag.version,
      status: 'pending_review',
      summary: changeSummary,
      createdBy: operator.name,
      createdAt: now,
    });
    existingTask.operationRecords.unshift({
      id: `op-${existingTask.id}-${Date.now()}`,
      operator: operator.name,
      roleName: operator.name,
      action: '提交审核',
      fromStatus: tag.status,
      toStatus: 'pending_review',
      reason: changeSummary,
      time: now,
    });
    tag.reviewTaskId = existingTask.id;
    return existingTask;
  }

  const task: API.ReviewTask = {
    id: `review-wrong-reason-${Date.now()}`,
    ...taskPayload,
    versionRecords: [
      {
        id: `version-wrong-reason-${tag.id}-${Date.now()}`,
        version: tag.version,
        status: 'pending_review',
        summary: changeSummary,
        createdBy: operator.name,
        createdAt: now,
      },
    ],
    operationRecords: [
      {
        id: `op-wrong-reason-${tag.id}-${Date.now()}`,
        operator: operator.name,
        roleName: operator.name,
        action: '提交审核',
        fromStatus: tag.status,
        toStatus: 'pending_review',
        reason: changeSummary,
        time: now,
      },
    ],
  };
  reviewTasks.unshift(task);
  tag.reviewTaskId = task.id;
  return task;
};

export const createQuestionRecord = (
  body: API.QuestionSaveParams,
  operatorName: string,
) => {
  const now = nowText();
  const question: API.QuestionItem = {
    id: `question-${Date.now()}`,
    title: body.title.trim(),
    stem: body.stem.trim(),
    examType: body.examType,
    questionType: body.questionType,
    skill: body.skill,
    difficulty: body.difficulty,
    tags: normalizeQuestionTags(body.tags),
    options: body.options.map((item) => ({
      key: item.key,
      content: item.content.trim(),
    })),
    answer: body.answer,
    analysis: body.analysis.trim(),
    status: 'draft',
    version: 'V0.1',
    creator: operatorName,
    createdAt: now,
    updatedBy: operatorName,
    updatedAt: now,
    changeSummary: body.changeSummary?.trim() || '新增题目草稿。',
    referenceImpact:
      body.referenceImpact?.trim() || '当前为草稿，尚未影响线上练习。',
    versionRecords: [
      {
        id: `question-version-create-${Date.now()}`,
        version: 'V0.1',
        status: 'draft',
        summary: body.changeSummary?.trim() || '新增题目草稿。',
        createdBy: operatorName,
        createdAt: now,
      },
    ],
    operationRecords: [
      {
        id: `question-op-create-${Date.now()}`,
        operator: operatorName,
        roleName: operatorName,
        action: '保存草稿',
        toStatus: 'draft',
        reason: body.changeSummary?.trim() || '新增题目草稿。',
        time: now,
      },
    ],
  };
  questionData.unshift(question);
  return question;
};

export const updateQuestionRecord = (
  question: API.QuestionItem,
  body: API.QuestionSaveParams,
  operatorName: string,
) => {
  const now = nowText();
  const previousStatus = question.status;
  question.title = body.title.trim();
  question.stem = body.stem.trim();
  question.examType = body.examType;
  question.questionType = body.questionType;
  question.skill = body.skill;
  question.difficulty = body.difficulty;
  question.tags = normalizeQuestionTags(body.tags);
  question.options = body.options.map((item) => ({
    key: item.key,
    content: item.content.trim(),
  }));
  question.answer = body.answer;
  question.analysis = body.analysis.trim();
  question.status = 'draft';
  question.version = nextQuestionVersion(question.version);
  question.updatedBy = operatorName;
  question.updatedAt = now;
  question.changeSummary =
    body.changeSummary?.trim() || '更新题目草稿。';
  question.referenceImpact =
    body.referenceImpact?.trim() || '当前为草稿，尚未影响线上练习。';
  question.versionRecords.unshift({
    id: `question-version-${question.id}-${Date.now()}`,
    version: question.version,
    status: question.status,
    summary: question.changeSummary,
    createdBy: operatorName,
    createdAt: now,
  });
  question.operationRecords.unshift({
    id: `question-op-${question.id}-${Date.now()}`,
    operator: operatorName,
    roleName: operatorName,
    action: '保存草稿',
    fromStatus: previousStatus,
    toStatus: 'draft',
    reason: question.changeSummary,
    time: now,
  });
  return question;
};

export const buildQuestionReviewTask = (
  question: API.QuestionItem,
  operator: { id: string; name: string },
  changeSummary: string,
  reviewTasks: API.ReviewTask[],
) => {
  const now = nowText();
  const existingTask = question.reviewTaskId
    ? reviewTasks.find((item) => item.id === question.reviewTaskId)
    : reviewTasks.find(
        (item) =>
          item.objectType === 'question_bank' &&
          item.objectId === question.id,
      );
  const riskLevel: API.ReviewRiskLevel =
    question.difficulty === 'hard' ? 'high' : 'medium';
  const taskPayload = {
    objectType: 'question_bank' as API.ReviewObjectType,
    objectTypeName: '题库内容',
    objectId: question.id,
    objectName: question.title,
    moduleKey: 'content',
    moduleName: '题库与内容管理',
    submitterId: operator.id,
    submitter: operator.name,
    submittedAt: now,
    version: question.version,
    priority: question.difficulty === 'hard' ? ('P0' as const) : ('P1' as const),
    status: 'pending_review' as API.ReviewTaskStatus,
    riskLevel,
    updatedAt: now,
    changeSummary,
    impactScope: question.referenceImpact,
    reviewOpinion: '',
    reviewer: '',
    releasePlan: '审核通过后进入待发布队列。',
    rollbackTargetVersion: question.version,
  };

  if (existingTask) {
    Object.assign(existingTask, taskPayload);
    existingTask.versionRecords.unshift({
      id: `version-${existingTask.id}-${Date.now()}`,
      version: question.version,
      status: 'pending_review',
      summary: changeSummary,
      createdBy: operator.name,
      createdAt: now,
    });
    existingTask.operationRecords.unshift({
      id: `op-${existingTask.id}-${Date.now()}`,
      operator: operator.name,
      roleName: operator.name,
      action: '提交审核',
      fromStatus: question.status,
      toStatus: 'pending_review',
      reason: changeSummary,
      time: now,
    });
    question.reviewTaskId = existingTask.id;
    return existingTask;
  }

  const task: API.ReviewTask = {
    id: `review-question-${Date.now()}`,
    ...taskPayload,
    versionRecords: [
      {
        id: `version-question-${question.id}-${Date.now()}`,
        version: question.version,
        status: 'pending_review',
        summary: changeSummary,
        createdBy: operator.name,
        createdAt: now,
      },
    ],
    operationRecords: [
      {
        id: `op-question-${question.id}-${Date.now()}`,
        operator: operator.name,
        roleName: operator.name,
        action: '提交审核',
        fromStatus: question.status,
        toStatus: 'pending_review',
        reason: changeSummary,
        time: now,
      },
    ],
  };
  reviewTasks.unshift(task);
  question.reviewTaskId = task.id;
  return task;
};

export const syncQuestionFromReviewTask = (
  task: API.ReviewTask,
  previousStatus: API.ReviewTaskStatus,
  nextStatus: API.ReviewTaskStatus,
  operatorName: string,
  reason: string,
) => {
  if (task.objectType !== 'question_bank') return;
  const question = questionData.find((item) => item.id === task.objectId);
  if (!question) return;
  const now = task.updatedAt;
  question.status = nextStatus;
  question.updatedBy = operatorName;
  question.updatedAt = now;
  question.reviewTaskId = task.id;
  question.operationRecords.unshift({
    id: `question-op-${question.id}-${Date.now()}`,
    operator: operatorName,
    roleName: operatorName,
    action: reviewStatusActionMap[nextStatus],
    fromStatus: previousStatus,
    toStatus: nextStatus,
    reason,
    time: now,
  });
  question.versionRecords.unshift({
    id: `question-version-${question.id}-${Date.now()}`,
    version: question.version,
    status: nextStatus,
    summary: `${reviewStatusActionMap[nextStatus]}：${task.changeSummary}`,
    createdBy: operatorName,
    createdAt: now,
  });
};

export const syncWrongReasonTagFromReviewTask = (
  task: API.ReviewTask,
  previousStatus: API.ReviewTaskStatus,
  nextStatus: API.ReviewTaskStatus,
  operatorName: string,
  reason: string,
) => {
  if (task.objectType !== 'wrong_reason_tag') return;
  const tag = wrongReasonTagData.find((item) => item.id === task.objectId);
  if (!tag) return;
  const now = task.updatedAt;
  tag.status = nextStatus;
  tag.updatedBy = operatorName;
  tag.updatedAt = now;
  tag.reviewTaskId = task.id;
  tag.operationRecords.unshift({
    id: `wrong-reason-op-${tag.id}-${Date.now()}`,
    operator: operatorName,
    roleName: operatorName,
    action: reviewStatusActionMap[nextStatus],
    fromStatus: previousStatus,
    toStatus: nextStatus,
    reason,
    time: now,
  });
  tag.versionRecords.unshift({
    id: `wrong-reason-version-${tag.id}-${Date.now()}`,
    version: tag.version,
    status: nextStatus,
    summary: `${reviewStatusActionMap[nextStatus]}：${task.changeSummary}`,
    createdBy: operatorName,
    createdAt: now,
  });
};

export const publishedQuestions = (
  examType?: API.ExamType,
  skill?: API.QuestionSkill,
) =>
  questionData.filter(
    (item) =>
      item.status === 'published' &&
      (!examType || item.examType === examType) &&
      (!skill || item.skill === skill),
  );
