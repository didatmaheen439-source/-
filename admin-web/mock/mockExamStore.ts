import { nowText } from './auditStore';
import { questionData } from './contentQuestionStore';
import { precheckQuestionGroup, questionGroupData } from './questionGroupStore';
import { writingTranslationTopicsData } from './writingTranslationStore';
import type {
  MockExamPaper,
  MockExamPaperItemSnapshot,
  MockExamPaperQueryParams,
  MockExamResultDetail,
  MockExamResultDiagnosis,
  MockExamResultItem,
  MockExamResultListResponse,
  MockExamResultQueryParams,
  MockExamResultRiskLevel,
  MockExamResultRiskType,
  MockExamTimeRisk,
  MockExamItemStatistic,
  MockExamPaperSaveParams,
  MockExamPaperSubmitParams,
  MockExamPrecheckIssue,
  MockExamPrecheckLevel,
  MockExamPrecheckResult,
  MockExamReference,
  MockExamSection,
  MockExamSectionStatistic,
  MockExamSectionType,
  MockExamSourceType,
  MockExamStatistics,
  MockExamStatisticsPeriod,
  MockExamVersionDiff,
  MockExamVersionSnapshot,
} from '../src/pages/mock-exam/papers/data';

export type MockExamOperator = {
  id: string;
  name: string;
  roleName: string;
};

export const mockExamSectionLabels: Record<MockExamSectionType, string> = {
  writing: '写作',
  listening: '听力',
  reading: '阅读',
  translation: '翻译',
};

export const mockExamSourceLabels: Record<MockExamSourceType, string> = {
  question_bank: '题库题目',
  writing_topic: '写作题目',
  translation_topic: '翻译题目',
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const nearlyEqual = (first: number, second: number) =>
  Math.abs(first - second) < 0.001;

const sumBy = <T,>(items: T[], getValue: (item: T) => number) =>
  items.reduce((sum, item) => sum + Number(getValue(item) || 0), 0);

export const mockExamTemplate = (examType: API.ExamType): MockExamSection[] => {
  const listeningMinutes = examType === 'CET4' ? 25 : 30;
  return [
    {
      id: `section-writing-${Date.now()}`,
      name: '写作',
      sectionType: 'writing',
      order: 1,
      score: 106.5,
      durationMinutes: 30,
      instructions: '完成一篇短文写作。',
      items: [],
    },
    {
      id: `section-listening-${Date.now()}`,
      name: '听力理解',
      sectionType: 'listening',
      order: 2,
      score: 248.5,
      durationMinutes: listeningMinutes,
      instructions: '根据听力材料选择正确答案。',
      items: [],
    },
    {
      id: `section-reading-${Date.now()}`,
      name: '阅读理解',
      sectionType: 'reading',
      order: 3,
      score: 248.5,
      durationMinutes: 40,
      instructions: '阅读材料并完成对应题目。',
      items: [],
    },
    {
      id: `section-translation-${Date.now()}`,
      name: '翻译',
      sectionType: 'translation',
      order: 4,
      score: 106.5,
      durationMinutes: 30,
      instructions: '将中文段落翻译为英文。',
      items: [],
    },
  ];
};

export const mockExamTemplateTotals = (examType: API.ExamType) => ({
  totalScore: 710,
  totalMinutes: examType === 'CET4' ? 125 : 130,
});

const referenceFromQuestion = (question: API.QuestionItem): MockExamReference => ({
  sourceType: 'question_bank',
  sourceId: question.id,
  sourceVersion: question.version,
  sourceStatus: question.status,
  title: question.title,
  examType: question.examType,
  sectionType: question.skill === 'listening' ? 'listening' : 'reading',
  questionType: question.questionType,
  available:
    question.status === 'published' &&
    ['listening', 'reading'].includes(question.skill),
  updatedAt: question.updatedAt,
});

const referenceFromTopic = (
  topic: API.WritingTranslationTopic,
): MockExamReference => ({
  sourceType:
    topic.topicType === 'writing' ? 'writing_topic' : 'translation_topic',
  sourceId: topic.id,
  sourceVersion: topic.releaseVersionId ?? topic.version,
  sourceStatus: topic.status,
  title: topic.name,
  examType: topic.examType,
  sectionType: topic.topicType,
  available: topic.status === 'published',
  updatedAt: topic.updatedAt,
});

export const allMockExamReferences = () => [
  ...questionData.map(referenceFromQuestion),
  ...writingTranslationTopicsData.map(referenceFromTopic),
];

export const filterMockExamReferences = (query: {
  keyword?: string;
  examType?: API.ExamType;
  sectionType?: MockExamSectionType;
  sourceType?: MockExamSourceType;
  availableOnly?: boolean;
}) => {
  const keyword = String(query.keyword ?? '').trim().toLowerCase();
  return allMockExamReferences()
    .filter((item) => !query.examType || item.examType === query.examType)
    .filter(
      (item) => !query.sectionType || item.sectionType === query.sectionType,
    )
    .filter((item) => !query.sourceType || item.sourceType === query.sourceType)
    .filter((item) => !query.availableOnly || item.available)
    .filter(
      (item) =>
        !keyword ||
        [item.sourceId, item.title, item.sourceVersion]
          .join(' ')
          .toLowerCase()
          .includes(keyword),
    )
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
};

const sourceReferenceById = (
  sourceType: MockExamSourceType,
  sourceId: string,
) =>
  allMockExamReferences().find(
    (item) => item.sourceType === sourceType && item.sourceId === sourceId,
  );

const snapshotFromSource = (
  sourceType: MockExamSourceType,
  sourceId: string,
  score: number,
  order: number,
): MockExamPaperItemSnapshot | undefined => {
  if (sourceType === 'question_bank') {
    const question = questionData.find((item) => item.id === sourceId);
    if (!question) return undefined;
    return {
      id: `paper-item-${sourceId}-${Date.now()}-${order}`,
      sourceType,
      sourceId,
      sourceVersion: question.version,
      sourceStatusAtBinding: question.status,
      title: question.title,
      sectionType: question.skill === 'listening' ? 'listening' : 'reading',
      score,
      order,
      stem: question.stem,
      options: clone(question.options),
      answer: question.answer,
      analysis: question.analysis,
    };
  }

  const topic = writingTranslationTopicsData.find(
    (item) => item.id === sourceId,
  );
  if (!topic) return undefined;
  if (topic.topicType === 'writing') {
    return {
      id: `paper-item-${sourceId}-${Date.now()}-${order}`,
      sourceType: 'writing_topic',
      sourceId,
      sourceVersion: topic.releaseVersionId ?? topic.version,
      sourceStatusAtBinding: topic.status,
      title: topic.name,
      sectionType: 'writing',
      score,
      order,
      stem: topic.prompt,
      requirements: clone(topic.writingRequirements),
      referencePoints: clone(topic.outlinePoints),
      referenceAnswer: topic.sampleAnswerSummary,
    };
  }
  return {
    id: `paper-item-${sourceId}-${Date.now()}-${order}`,
    sourceType: 'translation_topic',
    sourceId,
    sourceVersion: topic.releaseVersionId ?? topic.version,
    sourceStatusAtBinding: topic.status,
    title: topic.name,
    sectionType: 'translation',
    score,
    order,
    stem: topic.sourceText,
    referencePoints: clone(topic.referencePoints),
    referenceAnswer: topic.referenceTranslation,
  };
};

export const availableMockExamQuestionGroups = (examType?: API.ExamType) =>
  questionGroupData
    .filter((group) => group.status === 'published' && precheckQuestionGroup(group).passed)
    .filter((group) => !examType || group.examType === examType)
    .filter((group) => ['reading', 'listening'].includes(group.skill));

export const expandQuestionGroupForMockExam = (
  groupId: string,
  sectionScore: number,
  startOrder: number,
) => {
  const group = availableMockExamQuestionGroups().find((item) => item.id === groupId);
  if (!group) return undefined;
  const score = group.members.length ? Number((sectionScore / group.members.length).toFixed(3)) : 0;
  return group.members.map((member, index) => {
    const snapshot = snapshotFromSource(
      'question_bank',
      member.questionId,
      index === group.members.length - 1
        ? Number((sectionScore - score * Math.max(group.members.length - 1, 0)).toFixed(3))
        : score,
      startOrder + index,
    );
    return snapshot ? {
      ...snapshot,
      sourceGroupId: group.id,
      sourceGroupName: group.name,
      sourceGroupVersion: group.version,
    } : undefined;
  }).filter(Boolean) as MockExamPaperItemSnapshot[];
};

const normalizeSections = (
  sections: MockExamSection[],
  existing?: MockExamPaper,
) =>
  sections.map((section, sectionIndex) => ({
    ...section,
    id: section.id || `section-${Date.now()}-${sectionIndex + 1}`,
    name: String(section.name ?? '').trim(),
    order: Number(section.order || sectionIndex + 1),
    score: Number(section.score || 0),
    durationMinutes: Number(section.durationMinutes || 0),
    instructions: String(section.instructions ?? '').trim(),
    items: (section.items ?? []).map((item, itemIndex) => {
      const existingItem = existing?.sections
        .flatMap((current) => current.items)
        .find(
          (current) =>
            current.sourceType === item.sourceType &&
            current.sourceId === item.sourceId &&
            current.sourceVersion === item.sourceVersion,
        );
      const sourceSnapshot = snapshotFromSource(
        item.sourceType,
        item.sourceId,
        Number(item.score || 0),
        Number(item.order || itemIndex + 1),
      );
      return {
        ...(existingItem ?? sourceSnapshot ?? item),
        id:
          item.id ||
          existingItem?.id ||
          sourceSnapshot?.id ||
          `paper-item-${Date.now()}-${sectionIndex}-${itemIndex}`,
        score: Number(item.score || 0),
        order: Number(item.order || itemIndex + 1),
      };
    }),
  }));

const addIssue = (
  issues: MockExamPrecheckIssue[],
  level: MockExamPrecheckLevel,
  code: string,
  field: string,
  message: string,
  suggestion: string,
) => {
  issues.push({
    id: `${code}-${issues.length + 1}`,
    level,
    code,
    field,
    message,
    suggestion,
  });
};

export const buildMockExamPrecheck = (
  input: Pick<
    MockExamPaper,
    | 'name'
    | 'description'
    | 'examType'
    | 'totalScore'
    | 'totalMinutes'
    | 'sections'
    | 'impactScope'
  >,
): MockExamPrecheckResult => {
  const issues: MockExamPrecheckIssue[] = [];
  if (!input.name.trim()) {
    addIssue(
      issues,
      'error',
      'PAPER_NAME_REQUIRED',
      'name',
      '试卷名称不能为空。',
      '填写可识别的试卷名称。',
    );
  }
  if (!input.description.trim()) {
    addIssue(
      issues,
      'warning',
      'DESCRIPTION_MISSING',
      'description',
      '试卷说明为空。',
      '补充适用范围和试卷用途。',
    );
  }
  if (!input.impactScope.trim()) {
    addIssue(
      issues,
      'warning',
      'IMPACT_SCOPE_MISSING',
      'impactScope',
      '影响范围为空。',
      '说明发布后影响的用户入口和统计口径。',
    );
  }
  if (!input.sections.length) {
    addIssue(
      issues,
      'error',
      'SECTION_REQUIRED',
      'sections',
      '试卷至少包含一个分区。',
      '应用标准模板或新增分区。',
    );
  }

  const orderSet = new Set<number>();
  const sourceSet = new Set<string>();
  input.sections.forEach((section, sectionIndex) => {
    const field = `sections.${sectionIndex}`;
    if (!section.name.trim()) {
      addIssue(
        issues,
        'error',
        'SECTION_NAME_REQUIRED',
        `${field}.name`,
        `第 ${sectionIndex + 1} 个分区名称为空。`,
        '填写分区名称。',
      );
    }
    if (orderSet.has(section.order)) {
      addIssue(
        issues,
        'error',
        'SECTION_ORDER_DUPLICATED',
        `${field}.order`,
        `分区顺序 ${section.order} 重复。`,
        '调整为唯一顺序。',
      );
    }
    orderSet.add(section.order);
    if (!section.items.length) {
      addIssue(
        issues,
        'error',
        'SECTION_EMPTY',
        `${field}.items`,
        `${section.name || `第 ${sectionIndex + 1} 个分区`}未编排题目。`,
        '选择至少一个同考试类型的已发布题目。',
      );
    }
    const itemScore = sumBy(section.items, (item) => item.score);
    if (!nearlyEqual(itemScore, section.score)) {
      addIssue(
        issues,
        'error',
        'SECTION_SCORE_MISMATCH',
        `${field}.score`,
        `${section.name}题目分值合计 ${itemScore}，与分区分值 ${section.score} 不一致。`,
        '调整题目分值或分区分值。',
      );
    }
    const itemOrderSet = new Set<number>();
    section.items.forEach((item, itemIndex) => {
      const itemField = `${field}.items.${itemIndex}`;
      const sourceKey = `${item.sourceType}:${item.sourceId}`;
      if (sourceSet.has(sourceKey)) {
        addIssue(
          issues,
          'error',
          'SOURCE_DUPLICATED',
          itemField,
          `题目 ${item.title || item.sourceId} 在试卷中重复引用。`,
          '移除重复题目。',
        );
      }
      sourceSet.add(sourceKey);
      if (itemOrderSet.has(item.order)) {
        addIssue(
          issues,
          'error',
          'ITEM_ORDER_DUPLICATED',
          `${itemField}.order`,
          `${section.name}内题目顺序 ${item.order} 重复。`,
          '调整为唯一顺序。',
        );
      }
      itemOrderSet.add(item.order);
      if (item.sectionType !== section.sectionType) {
        addIssue(
          issues,
          'error',
          'SECTION_SOURCE_MISMATCH',
          itemField,
          `题目 ${item.title} 不属于${mockExamSectionLabels[section.sectionType]}分区。`,
          '重新选择与分区类型一致的题目。',
        );
      }
      const current = sourceReferenceById(item.sourceType, item.sourceId);
      if (!current) {
        addIssue(
          issues,
          'error',
          'SOURCE_NOT_FOUND',
          itemField,
          `引用 ${item.sourceId} 不存在。`,
          '移除引用或重新选择题目。',
        );
        return;
      }
      if (current.examType !== input.examType) {
        addIssue(
          issues,
          'error',
          'SOURCE_EXAM_MISMATCH',
          itemField,
          `题目 ${current.title} 的考试类型与试卷不一致。`,
          '选择相同考试类型的题目。',
        );
      }
      if (current.sourceStatus !== 'published') {
        addIssue(
          issues,
          'error',
          'SOURCE_UNAVAILABLE',
          itemField,
          `题目 ${current.title} 当前状态为 ${current.sourceStatus}。`,
          '仅使用当前可用的已发布题目。',
        );
      } else if (current.sourceVersion !== item.sourceVersion) {
        addIssue(
          issues,
          'warning',
          'SOURCE_NEW_VERSION',
          itemField,
          `题目 ${current.title} 已有新版本 ${current.sourceVersion}，试卷仍锁定 ${item.sourceVersion}。`,
          '确认继续使用锁定版本，或重新绑定最新版本。',
        );
      }
    });
  });

  const sectionScore = sumBy(input.sections, (section) => section.score);
  if (!nearlyEqual(sectionScore, input.totalScore)) {
    addIssue(
      issues,
      'error',
      'PAPER_SCORE_MISMATCH',
      'totalScore',
      `分区分值合计 ${sectionScore}，与试卷总分 ${input.totalScore} 不一致。`,
      '调整分区分值或试卷总分。',
    );
  }
  const sectionMinutes = sumBy(
    input.sections,
    (section) => section.durationMinutes,
  );
  if (!nearlyEqual(sectionMinutes, input.totalMinutes)) {
    addIssue(
      issues,
      'error',
      'PAPER_DURATION_MISMATCH',
      'totalMinutes',
      `分区时长合计 ${sectionMinutes} 分钟，与试卷总时长 ${input.totalMinutes} 分钟不一致。`,
      '调整分区时长或试卷总时长。',
    );
  }

  const standardSections = mockExamTemplate(input.examType);
  const standardTotals = mockExamTemplateTotals(input.examType);
  if (
    !nearlyEqual(input.totalScore, standardTotals.totalScore) ||
    !nearlyEqual(input.totalMinutes, standardTotals.totalMinutes)
  ) {
    addIssue(
      issues,
      'warning',
      'STANDARD_TOTAL_DEVIATION',
      'totalScore',
      '试卷总分或总时长偏离 CET 标准模板。',
      '内部模拟卷可以继续，但提交审核前应确认用途。',
    );
  }
  for (const standard of standardSections) {
    const current = input.sections.find(
      (item) => item.sectionType === standard.sectionType,
    );
    if (
      !current ||
      !nearlyEqual(current.score, standard.score) ||
      !nearlyEqual(current.durationMinutes, standard.durationMinutes)
    ) {
      addIssue(
        issues,
        'warning',
        'STANDARD_SECTION_DEVIATION',
        'sections',
        `${mockExamSectionLabels[standard.sectionType]}分区偏离标准模板。`,
        '确认分区分值和时长符合本次模拟卷目标。',
      );
    }
  }
  const itemCount = sumBy(input.sections, (section) => section.items.length);
  if (itemCount < 57) {
    addIssue(
      issues,
      'warning',
      'STANDARD_ITEM_COUNT',
      'sections',
      `当前共 ${itemCount} 个题目引用，少于标准笔试结构的 57 题。`,
      '本阶段题库类型有限，可作为内部短卷确认后提交。',
    );
  }

  const level: MockExamPrecheckLevel = issues.some(
    (item) => item.level === 'error',
  )
    ? 'error'
    : issues.some((item) => item.level === 'warning')
      ? 'warning'
      : 'passed';
  return {
    level,
    summary:
      level === 'passed'
        ? '试卷结构、分值、时长和引用校验通过。'
        : `发现 ${issues.filter((item) => item.level === 'error').length} 个错误和 ${issues.filter((item) => item.level === 'warning').length} 个警告。`,
    checkedAt: nowText(),
    issues,
  };
};

const versionSnapshot = (
  paper: MockExamPaper,
  currentOnline = false,
): MockExamVersionSnapshot => ({
  id: `mock-exam-version-${paper.id}-${Date.now()}-${paper.dataVersion}`,
  paperId: paper.id,
  version: paper.version,
  status: paper.status,
  createdBy: paper.updatedBy,
  createdAt: paper.updatedAt,
  changeSummary: paper.changeSummary,
  currentOnline,
  snapshot: {
    name: paper.name,
    examType: paper.examType,
    totalScore: paper.totalScore,
    totalMinutes: paper.totalMinutes,
    sectionCount: paper.sections.length,
    itemCount: sumBy(paper.sections, (section) => section.items.length),
  },
});

const defaultOperator: MockExamOperator = {
  id: 'teaching_editor',
  name: '教研编辑',
  roleName: '教研审核',
};

const buildSeedSections = (examType: API.ExamType) => {
  const sections = mockExamTemplate(examType);
  const references = filterMockExamReferences({
    examType,
    availableOnly: true,
  });
  return sections.map((section) => {
    const sourceRefs = references.filter(
      (item) => item.sectionType === section.sectionType,
    );
    const selected =
      section.sectionType === 'writing' || section.sectionType === 'translation'
        ? sourceRefs.slice(0, 1)
        : sourceRefs.slice(0, 4);
    const itemScore = selected.length
      ? Number((section.score / selected.length).toFixed(3))
      : 0;
    const items = selected
      .map((reference, index) =>
        snapshotFromSource(
          reference.sourceType,
          reference.sourceId,
          index === selected.length - 1
            ? Number(
                (
                  section.score -
                  itemScore * Math.max(selected.length - 1, 0)
                ).toFixed(3),
              )
            : itemScore,
          index + 1,
        ),
      )
      .filter(Boolean) as MockExamPaperItemSnapshot[];
    return { ...section, items };
  });
};

const seedPaper = (params: {
  id: string;
  name: string;
  examType: API.ExamType;
  status: API.ReviewTaskStatus;
  version: string;
  updatedAt: string;
  reviewTaskId?: string;
  invalid?: 'score' | 'source' | 'duration';
}): MockExamPaper => {
  const totals = mockExamTemplateTotals(params.examType);
  const sections = buildSeedSections(params.examType);
  if (params.invalid === 'score') sections[1].score += 10;
  if (params.invalid === 'duration') sections[2].durationMinutes += 5;
  if (params.invalid === 'source' && sections[2].items[0]) {
    sections[2].items[0].sourceId = 'question-missing';
  }
  const paper: MockExamPaper = {
    id: params.id,
    name: params.name,
    description: '用于验证 CET 模考试卷编排、审核发布与聚合统计。',
    examType: params.examType,
    totalScore: totals.totalScore,
    totalMinutes: totals.totalMinutes,
    instructions: '按分区顺序完成全部内容。',
    sections,
    status: params.status,
    version: params.version,
    dataVersion: 1,
    riskLevel: 'medium',
    creatorId: defaultOperator.id,
    creator: defaultOperator.name,
    createdAt: '2026-07-08 09:00:00',
    updatedById: defaultOperator.id,
    updatedBy: defaultOperator.name,
    updatedAt: params.updatedAt,
    changeSummary: '维护分区、题目、分值和计时配置。',
    impactScope: '影响模考入口、试卷版本和聚合统计。',
    reviewTaskId: params.reviewTaskId,
    releaseVersionId:
      params.status === 'published' ? params.version : undefined,
    rollbackTargetVersion:
      params.status === 'published' ? params.version : undefined,
    versionRecords: [],
    operationRecords: [
      {
        id: `mock-exam-op-${params.id}-seed`,
        operator: defaultOperator.name,
        roleName: defaultOperator.roleName,
        action: params.status === 'published' ? '发布' : '保存草稿',
        toStatus: params.status,
        reason: '初始化模考试卷 Mock 数据。',
        time: params.updatedAt,
      },
    ],
  };
  paper.lastPrecheck = buildMockExamPrecheck(paper);
  paper.versionRecords = [
    versionSnapshot(paper, params.status === 'published'),
  ];
  return paper;
};

const initialPapers: MockExamPaper[] = [
  seedPaper({
    id: 'mock-exam-cet6-202607',
    name: '六级模考试卷 2026-07',
    examType: 'CET6',
    status: 'published',
    version: 'V2.1',
    updatedAt: '2026-07-07 09:00:00',
    reviewTaskId: 'review-mock-001',
  }),
  seedPaper({
    id: 'mock-exam-cet4-draft',
    name: '四级标准模拟卷草稿',
    examType: 'CET4',
    status: 'draft',
    version: 'V0.3',
    updatedAt: '2026-07-08 10:00:00',
  }),
  seedPaper({
    id: 'mock-exam-cet6-rejected',
    name: '六级强化模拟卷已驳回',
    examType: 'CET6',
    status: 'rejected',
    version: 'V0.8',
    updatedAt: '2026-07-08 09:40:00',
  }),
  seedPaper({
    id: 'mock-exam-cet4-pending',
    name: '四级考前模拟卷待审核',
    examType: 'CET4',
    status: 'pending_review',
    version: 'V1.0',
    updatedAt: '2026-07-08 09:20:00',
  }),
  seedPaper({
    id: 'mock-exam-score-error',
    name: '模考分值错误样例',
    examType: 'CET6',
    status: 'draft',
    version: 'V0.1',
    updatedAt: '2026-07-08 11:00:00',
    invalid: 'score',
  }),
  seedPaper({
    id: 'mock-exam-source-error',
    name: '模考引用失效样例',
    examType: 'CET4',
    status: 'draft',
    version: 'V0.1',
    updatedAt: '2026-07-08 11:10:00',
    invalid: 'source',
  }),
  seedPaper({
    id: 'mock-exam-duration-error',
    name: '模考时长错误样例',
    examType: 'CET6',
    status: 'draft',
    version: 'V0.1',
    updatedAt: '2026-07-08 11:20:00',
    invalid: 'duration',
  }),
];

const globalMockExamStore = globalThis as typeof globalThis & {
  __GUOJI_ADMIN_MOCK_EXAM_PAPERS__?: MockExamPaper[];
};

if (!globalMockExamStore.__GUOJI_ADMIN_MOCK_EXAM_PAPERS__) {
  globalMockExamStore.__GUOJI_ADMIN_MOCK_EXAM_PAPERS__ = initialPapers;
}

export const mockExamPapersData =
  globalMockExamStore.__GUOJI_ADMIN_MOCK_EXAM_PAPERS__;

export const mockExamPapersReferencingQuestionGroup = (groupId: string) =>
  mockExamPapersData.filter((paper) =>
    paper.sections.some((section) =>
      section.items.some((item) => item.sourceGroupId === groupId),
    ),
  );

export const getMockExamPaper = (id: string) =>
  mockExamPapersData.find((item) => item.id === id);

export const filterMockExamPapers = (query: MockExamPaperQueryParams) => {
  const keyword = String(query.keyword ?? '').trim().toLowerCase();
  return [...mockExamPapersData]
    .filter(
      (item) =>
        !keyword ||
        [item.id, item.name, item.description]
          .join(' ')
          .toLowerCase()
          .includes(keyword),
    )
    .filter((item) => !query.examType || item.examType === query.examType)
    .filter((item) => !query.status || item.status === query.status)
    .filter(
      (item) =>
        !query.precheckLevel ||
        item.lastPrecheck?.level === query.precheckLevel,
    )
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
};

export const paginateMockExamPapers = (
  data: MockExamPaper[],
  query: MockExamPaperQueryParams,
) => {
  const current = Number(query.current || 1);
  const pageSize = Number(query.pageSize || 20);
  const start = (current - 1) * pageSize;
  return {
    data: data.slice(start, start + pageSize),
    total: data.length,
    current,
    pageSize,
  };
};

const normalizePaper = (
  id: string,
  params: MockExamPaperSaveParams,
  operator: MockExamOperator,
  existing?: MockExamPaper,
): MockExamPaper => {
  const now = nowText();
  const paper: MockExamPaper = {
    id,
    name: params.name.trim(),
    description: String(params.description ?? '').trim(),
    examType: params.examType,
    totalScore: Number(params.totalScore || 0),
    totalMinutes: Number(params.totalMinutes || 0),
    instructions: String(params.instructions ?? '').trim(),
    sections: normalizeSections(params.sections ?? [], existing),
    status: existing?.status ?? 'draft',
    version: existing?.version ?? 'V0.1',
    dataVersion: existing ? existing.dataVersion + 1 : 1,
    riskLevel: existing?.riskLevel ?? 'medium',
    creatorId: existing?.creatorId ?? operator.id,
    creator: existing?.creator ?? operator.name,
    createdAt: existing?.createdAt ?? now,
    updatedById: operator.id,
    updatedBy: operator.name,
    updatedAt: now,
    changeSummary:
      params.changeSummary?.trim() ||
      existing?.changeSummary ||
      '保存模考试卷草稿。',
    impactScope:
      params.impactScope?.trim() ||
      existing?.impactScope ||
      '影响模考入口和聚合统计。',
    reviewTaskId: existing?.reviewTaskId,
    releaseVersionId: existing?.releaseVersionId,
    rollbackTargetVersion: existing?.rollbackTargetVersion,
    versionRecords: clone(existing?.versionRecords ?? []),
    operationRecords: clone(existing?.operationRecords ?? []),
  };
  paper.lastPrecheck = buildMockExamPrecheck(paper);
  paper.riskLevel =
    paper.lastPrecheck.level === 'passed'
      ? 'low'
      : paper.lastPrecheck.level === 'warning'
        ? 'medium'
        : 'high';
  paper.versionRecords.unshift(versionSnapshot(paper));
  paper.operationRecords.unshift({
    id: `mock-exam-op-${paper.id}-${Date.now()}`,
    operator: operator.name,
    roleName: operator.roleName,
    action: existing ? '保存草稿' : '新建草稿',
    fromStatus: existing?.status,
    toStatus: paper.status,
    reason: paper.changeSummary,
    time: now,
  });
  return paper;
};

export const createMockExamPaperRecord = (
  params: MockExamPaperSaveParams,
  operator: MockExamOperator,
) => {
  const paper = normalizePaper(
    `mock-exam-${params.examType.toLowerCase()}-${Date.now()}`,
    params,
    operator,
  );
  mockExamPapersData.unshift(paper);
  return paper;
};

export const updateMockExamPaperRecord = (
  paper: MockExamPaper,
  params: MockExamPaperSaveParams,
  operator: MockExamOperator,
) => {
  if (
    params.dataVersion !== undefined &&
    params.dataVersion !== paper.dataVersion
  ) {
    return { conflict: true as const, paper };
  }
  if (!['draft', 'rejected'].includes(paper.status)) {
    return { locked: true as const, paper };
  }
  const updated = normalizePaper(paper.id, params, operator, paper);
  const index = mockExamPapersData.findIndex((item) => item.id === paper.id);
  mockExamPapersData.splice(index, 1, updated);
  return { paper: updated };
};

export const copyMockExamPaperDraft = (
  source: MockExamPaper,
  operator: MockExamOperator,
) => {
  const now = nowText();
  const draft = clone(source);
  draft.id = `${source.id}-draft-${Date.now()}`;
  draft.name = `${source.name} 新草稿`;
  draft.status = 'draft';
  draft.version = `V${(Number(source.version.replace(/^V/, '')) + 0.1).toFixed(1)}`;
  draft.dataVersion = 1;
  draft.creatorId = operator.id;
  draft.creator = operator.name;
  draft.createdAt = now;
  draft.updatedById = operator.id;
  draft.updatedBy = operator.name;
  draft.updatedAt = now;
  draft.reviewTaskId = undefined;
  draft.releaseVersionId = undefined;
  draft.changeSummary = '从历史版本复制为新草稿。';
  draft.lastPrecheck = buildMockExamPrecheck(draft);
  draft.operationRecords = [
    {
      id: `mock-exam-op-copy-${draft.id}`,
      operator: operator.name,
      roleName: operator.roleName,
      action: '复制草稿',
      fromStatus: source.status,
      toStatus: 'draft',
      reason: '线上版本不可直接覆盖，创建新草稿。',
      time: now,
    },
  ];
  draft.versionRecords = [versionSnapshot(draft), ...source.versionRecords];
  mockExamPapersData.unshift(draft);
  return draft;
};

export const submitMockExamPaperReview = (
  paper: MockExamPaper,
  params: MockExamPaperSubmitParams,
  operator: MockExamOperator,
  reviewTasks: API.ReviewTask[],
) => {
  if (params.simulateTaskFailure) return { failed: true as const };
  if (params.dataVersion !== paper.dataVersion)
    return { conflict: true as const };
  if (!['draft', 'rejected'].includes(paper.status))
    return { locked: true as const };
  const precheck = buildMockExamPrecheck(paper);
  paper.lastPrecheck = precheck;
  if (precheck.level === 'error')
    return { blocked: true as const, precheck };
  if (precheck.level === 'warning' && !params.confirmWarnings) {
    return { warning: true as const, precheck };
  }
  const now = nowText();
  const previousStatus = paper.status;
  const task: API.ReviewTask = {
    id: paper.reviewTaskId || `review-mock-exam-${Date.now()}`,
    objectType: 'mock_exam',
    objectTypeName: '模考试卷',
    objectId: paper.id,
    objectName: paper.name,
    moduleKey: 'mockExam',
    moduleName: '模考管理',
    submitterId: operator.id,
    submitter: operator.name,
    submittedAt: now,
    version: paper.version,
    priority: paper.riskLevel === 'high' ? 'P0' : 'P1',
    status: 'pending_review',
    riskLevel: paper.riskLevel,
    updatedAt: now,
    changeSummary: params.changeSummary,
    impactScope: `${paper.sections.length} 个分区，${sumBy(paper.sections, (section) => section.items.length)} 个题目引用，总分 ${paper.totalScore}，总时长 ${paper.totalMinutes} 分钟。`,
    reviewOpinion: '',
    reviewer: '',
    releasePlan: '审核通过后进入待发布队列。',
    rollbackTargetVersion: paper.releaseVersionId,
    versionRecords: [
      {
        id: `version-mock-exam-${paper.id}-${Date.now()}`,
        version: paper.version,
        status: 'pending_review',
        summary: params.changeSummary,
        createdBy: operator.name,
        createdAt: now,
      },
    ],
    operationRecords: [
      {
        id: `op-mock-exam-${paper.id}-${Date.now()}`,
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
  const existingIndex = reviewTasks.findIndex((item) => item.id === task.id);
  if (existingIndex >= 0) reviewTasks.splice(existingIndex, 1, task);
  else reviewTasks.unshift(task);
  paper.status = 'pending_review';
  paper.reviewTaskId = task.id;
  paper.updatedAt = now;
  paper.updatedBy = operator.name;
  paper.updatedById = operator.id;
  paper.changeSummary = params.changeSummary;
  paper.dataVersion += 1;
  paper.operationRecords.unshift(task.operationRecords[0]);
  paper.versionRecords.unshift(versionSnapshot(paper));
  return { paper, task };
};

export const validateMockExamReviewTransition = (
  task: API.ReviewTask,
  nextStatus: API.ReviewTaskStatus,
) => {
  if (task.objectType !== 'mock_exam') return { ok: true as const };
  if (!['approved', 'pending_publish', 'published'].includes(nextStatus)) {
    return { ok: true as const };
  }
  const paper = getMockExamPaper(task.objectId);
  if (!paper) {
    return {
      ok: false as const,
      errorMessage: '关联模考试卷不存在。',
    };
  }
  if (paper.version !== task.version) {
    return {
      ok: false as const,
      errorMessage: '审核任务版本与试卷当前版本不一致。',
    };
  }
  const precheck = buildMockExamPrecheck(paper);
  paper.lastPrecheck = precheck;
  if (precheck.level === 'error') {
    return {
      ok: false as const,
      errorMessage: '模考试卷发布前复验存在阻断错误。',
      precheck,
    };
  }
  return { ok: true as const, precheck };
};

export const syncMockExamFromReviewTask = (
  task: API.ReviewTask,
  previousStatus: API.ReviewTaskStatus,
  nextStatus: API.ReviewTaskStatus,
  operator: MockExamOperator,
  reason: string,
) => {
  if (task.objectType !== 'mock_exam') return;
  const paper = getMockExamPaper(task.objectId);
  if (!paper) return;
  const now = task.updatedAt;
  paper.status = nextStatus;
  paper.updatedAt = now;
  paper.updatedById = operator.id;
  paper.updatedBy = operator.name;
  paper.reviewTaskId = task.id;
  paper.dataVersion += 1;
  if (nextStatus === 'published') {
    paper.releaseVersionId = task.version;
    paper.rollbackTargetVersion = task.version;
    task.rollbackTargetVersion = task.version;
    paper.versionRecords.forEach((item) => {
      item.currentOnline = item.version === task.version;
    });
  }
  if (nextStatus === 'rolled_back') {
    paper.releaseVersionId =
      task.rollbackTargetVersion ?? paper.rollbackTargetVersion;
    paper.rollbackTargetVersion = task.rollbackTargetVersion;
  }
  paper.operationRecords.unshift({
    id: `mock-exam-op-${paper.id}-${Date.now()}`,
    operator: operator.name,
    roleName: operator.roleName,
    action:
      nextStatus === 'approved'
        ? '审核通过'
        : nextStatus === 'pending_publish'
          ? '安排发布'
          : nextStatus === 'published'
            ? '发布'
            : nextStatus === 'offline'
              ? '下架'
              : nextStatus === 'rolled_back'
                ? '回滚'
                : '状态更新',
    fromStatus: previousStatus,
    toStatus: nextStatus,
    reason,
    time: now,
  });
  paper.versionRecords.unshift(versionSnapshot(paper, nextStatus === 'published'));
};

export const mockExamVersionDiff = (
  paper: MockExamPaper,
  fromVersion?: string,
  toVersion?: string,
): MockExamVersionDiff | undefined => {
  const from =
    paper.versionRecords.find((item) => item.version === fromVersion) ??
    paper.versionRecords[1];
  const to =
    paper.versionRecords.find((item) => item.version === toVersion) ??
    paper.versionRecords[0];
  if (!from || !to) return undefined;
  const fields: Array<keyof MockExamVersionSnapshot['snapshot']> = [
    'name',
    'examType',
    'totalScore',
    'totalMinutes',
    'sectionCount',
    'itemCount',
  ];
  return {
    fromVersion: from.version,
    toVersion: to.version,
    items: fields.map((field) => ({
      field,
      before: String(from.snapshot[field] ?? ''),
      after: String(to.snapshot[field] ?? ''),
      changed: from.snapshot[field] !== to.snapshot[field],
    })),
  };
};

export const buildMockExamStatistics = (
  paper: MockExamPaper,
  period: MockExamStatisticsPeriod = '30d',
): MockExamStatistics => {
  const factor = period === '7d' ? 1 : period === '30d' ? 4 : 9;
  const base =
    [...paper.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) %
    17;
  const startedCount = (42 + base) * factor;
  const completedCount = Math.max(
    0,
    Math.round(startedCount * (0.62 + (base % 13) / 100)),
  );
  const averageScore = Number(
    (paper.totalScore * (0.61 + (base % 11) / 100)).toFixed(1),
  );
  const averageMinutes = Number(
    (paper.totalMinutes * (0.78 + (base % 7) / 100)).toFixed(1),
  );
  const sectionStats: MockExamSectionStatistic[] = paper.sections.map(
    (section, index) => {
      const averageRate = Number((62 + ((base + index * 5) % 18)).toFixed(1));
      return {
        sectionId: section.id,
        sectionName: section.name,
        averageScore: Number(
          ((section.score * averageRate) / 100).toFixed(1),
        ),
        fullScore: section.score,
        averageRate,
        averageMinutes: Number(
          (section.durationMinutes * (0.76 + index * 0.03)).toFixed(1),
        ),
      };
    },
  );
  return {
    paperId: paper.id,
    paperVersion: paper.releaseVersionId ?? paper.version,
    period,
    startedCount,
    completedCount,
    completionRate:
      startedCount > 0
        ? Number(((completedCount / startedCount) * 100).toFixed(1))
        : 0,
    averageScore,
    totalScore: paper.totalScore,
    averageMinutes,
    sectionStats,
    containsSensitiveFields: false,
    mockOnly: true,
    updatedAt: nowText(),
  };
};

const resultVisibleStatuses: API.ReviewTaskStatus[] = [
  'rejected',
  'pending_review',
  'approved',
  'pending_publish',
  'published',
  'offline',
  'rolled_back',
];

const riskWeight: Record<MockExamResultRiskLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const strongestRisk = (
  levels: MockExamResultRiskLevel[],
): MockExamResultRiskLevel =>
  levels.sort((first, second) => riskWeight[second] - riskWeight[first])[0] ??
  'low';

const uniqueRisks = (risks: MockExamResultRiskType[]) =>
  Array.from(new Set(risks));

const scoreRate = (score: number, total: number) =>
  total > 0 ? Number(((score / total) * 100).toFixed(1)) : 0;

const itemBase = (paperId: string, itemId: string) =>
  [...`${paperId}:${itemId}`].reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );

export const buildMockExamItemStatistics = (
  paper: MockExamPaper,
): MockExamItemStatistic[] =>
  paper.sections.flatMap((section, sectionIndex) =>
    section.items.map((item, itemIndex) => {
      const base = itemBase(paper.id, item.id);
      const averageRate = Number(
        Math.max(38, 78 - ((base + sectionIndex * 7 + itemIndex * 3) % 34)).toFixed(1),
      );
      const skipRate = Number(((base + itemIndex * 11) % 42).toFixed(1));
      const riskReasons = [
        averageRate < 45 ? '题目得分率低于 45%。' : '',
        skipRate > 30 ? '题目跳过率高于 30%。' : '',
      ].filter(Boolean);
      return {
        itemId: item.id,
        title: item.title,
        sectionId: section.id,
        sectionName: section.name,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        sourceVersion: item.sourceVersion,
        averageScore: Number(((item.score * averageRate) / 100).toFixed(1)),
        fullScore: item.score,
        averageRate,
        skipRate,
        riskLevel:
          averageRate < 45 || skipRate > 35
            ? 'high'
            : skipRate > 30
              ? 'medium'
              : 'low',
        riskReasons,
      };
    }),
  );

export const buildMockExamTimeRisks = (
  paper: MockExamPaper,
  statistics: MockExamStatistics,
): MockExamTimeRisk[] => {
  const risks: MockExamTimeRisk[] = [];
  const paperPressure = scoreRate(statistics.averageMinutes, paper.totalMinutes);
  if (paperPressure >= 95) {
    risks.push({
      scope: 'paper',
      targetId: paper.id,
      targetName: paper.name,
      configuredMinutes: paper.totalMinutes,
      averageMinutes: statistics.averageMinutes,
      pressureRate: paperPressure,
      riskLevel: paperPressure >= 100 ? 'high' : 'medium',
      message: '全卷平均耗时接近或超过配置时长。',
    });
  }
  statistics.sectionStats.forEach((section) => {
    const source = paper.sections.find((item) => item.id === section.sectionId);
    if (!source) return;
    const pressureRate = scoreRate(section.averageMinutes, source.durationMinutes);
    if (pressureRate >= 95) {
      risks.push({
        scope: 'section',
        targetId: section.sectionId,
        targetName: section.sectionName,
        configuredMinutes: source.durationMinutes,
        averageMinutes: section.averageMinutes,
        pressureRate,
        riskLevel: pressureRate >= 100 ? 'high' : 'medium',
        message: `${section.sectionName}平均耗时接近或超过配置时长。`,
      });
    }
  });
  return risks;
};

const resultRiskTypes = (
  paper: MockExamPaper,
  statistics: MockExamStatistics,
  itemStats: MockExamItemStatistic[],
  timeRisks: MockExamTimeRisk[],
): MockExamResultRiskType[] => {
  const averageScoreRate = scoreRate(statistics.averageScore, paper.totalScore);
  const sectionWeak = statistics.sectionStats.some(
    (section) => section.averageRate < 55 || section.averageRate < averageScoreRate - 8,
  );
  return uniqueRisks([
    statistics.completionRate < 60 ? 'low_completion' : undefined,
    averageScoreRate < 60 ? 'low_average_score' : undefined,
    sectionWeak ? 'weak_section' : undefined,
    itemStats.some((item) => item.riskReasons.length) ? 'weak_item' : undefined,
    timeRisks.length ? 'time_pressure' : undefined,
    paper.lastPrecheck?.level === 'error' ? 'precheck_blocked' : undefined,
  ].filter(Boolean) as MockExamResultRiskType[]);
};

const resultRiskLevel = (
  riskTypes: MockExamResultRiskType[],
  itemStats: MockExamItemStatistic[],
  timeRisks: MockExamTimeRisk[],
): MockExamResultRiskLevel => {
  if (!riskTypes.length) return 'low';
  return strongestRisk([
    riskTypes.includes('low_completion') ? 'high' : undefined,
    riskTypes.includes('low_average_score') ? 'high' : undefined,
    riskTypes.includes('precheck_blocked') ? 'high' : undefined,
    itemStats.some((item) => item.riskLevel === 'high') ? 'high' : undefined,
    timeRisks.some((item) => item.riskLevel === 'high') ? 'high' : undefined,
    'medium',
  ].filter(Boolean) as MockExamResultRiskLevel[]);
};

export const buildMockExamResultItem = (
  paper: MockExamPaper,
  period: MockExamStatisticsPeriod = '30d',
): MockExamResultItem => {
  const statistics = buildMockExamStatistics(paper, period);
  const itemStats = buildMockExamItemStatistics(paper);
  const timeRisks = buildMockExamTimeRisks(paper, statistics);
  const riskTypes = resultRiskTypes(paper, statistics, itemStats, timeRisks);
  const weakestSection =
    [...statistics.sectionStats].sort(
      (first, second) => first.averageRate - second.averageRate,
    )[0] ?? statistics.sectionStats[0];
  return {
    paperId: paper.id,
    paperName: paper.name,
    paperVersion: statistics.paperVersion,
    examType: paper.examType,
    status: paper.status,
    period,
    startedCount: statistics.startedCount,
    completedCount: statistics.completedCount,
    completionRate: statistics.completionRate,
    averageScore: statistics.averageScore,
    totalScore: statistics.totalScore,
    averageScoreRate: scoreRate(statistics.averageScore, statistics.totalScore),
    averageMinutes: statistics.averageMinutes,
    totalMinutes: paper.totalMinutes,
    lowestSectionName: weakestSection?.sectionName ?? '-',
    lowestSectionRate: weakestSection?.averageRate ?? 0,
    riskTypes,
    riskLevel: resultRiskLevel(riskTypes, itemStats, timeRisks),
    updatedAt: statistics.updatedAt,
  };
};

const resultBandMatch = (
  value: number,
  band?: 'low' | 'normal' | 'high',
) => {
  if (!band) return true;
  if (band === 'low') return value < 60;
  if (band === 'high') return value >= 80;
  return value >= 60 && value < 80;
};

export const filterMockExamResults = (query: MockExamResultQueryParams) => {
  const keyword = String(query.keyword ?? '').trim().toLowerCase();
  const period = query.period ?? '30d';
  return mockExamPapersData
    .filter((paper) => resultVisibleStatuses.includes(paper.status))
    .map((paper) => buildMockExamResultItem(paper, period))
    .filter(
      (item) =>
        !keyword ||
        [item.paperId, item.paperName, item.paperVersion]
          .join(' ')
          .toLowerCase()
          .includes(keyword),
    )
    .filter((item) => !query.examType || item.examType === query.examType)
    .filter((item) => !query.status || item.status === query.status)
    .filter((item) => !query.riskType || item.riskTypes.includes(query.riskType))
    .filter((item) => resultBandMatch(item.completionRate, query.completionBand))
    .filter((item) => resultBandMatch(item.averageScoreRate, query.averageBand))
    .sort((first, second) => {
      const riskDelta =
        riskWeight[second.riskLevel] - riskWeight[first.riskLevel];
      if (riskDelta) return riskDelta;
      return second.updatedAt.localeCompare(first.updatedAt);
    });
};

export const paginateMockExamResults = (
  data: MockExamResultItem[],
  query: MockExamResultQueryParams,
): MockExamResultListResponse => {
  const current = Number(query.current || 1);
  const pageSize = Number(query.pageSize || 20);
  const startedCount = sumBy(data, (item) => item.startedCount);
  const completedCount = sumBy(data, (item) => item.completedCount);
  const averageScore =
    data.length > 0
      ? Number(
          (
            sumBy(data, (item) => item.averageScore) / data.length
          ).toFixed(1),
        )
      : 0;
  const averageScoreRate =
    data.length > 0
      ? Number(
          (
            sumBy(data, (item) => item.averageScoreRate) / data.length
          ).toFixed(1),
        )
      : 0;
  const averageMinutes =
    data.length > 0
      ? Number(
          (
            sumBy(data, (item) => item.averageMinutes) / data.length
          ).toFixed(1),
        )
      : 0;
  return {
    success: true,
    data: data.slice((current - 1) * pageSize, current * pageSize),
    total: data.length,
    current,
    pageSize,
    summary: {
      startedCount,
      completedCount,
      completionRate:
        startedCount > 0
          ? Number(((completedCount / startedCount) * 100).toFixed(1))
          : 0,
      averageScore,
      averageScoreRate,
      averageMinutes,
      riskPaperCount: data.filter((item) => item.riskTypes.length).length,
      mockOnly: true,
    },
  };
};

const diagnosisFromRisks = (
  paper: MockExamPaper,
  summary: MockExamResultItem,
  itemStats: MockExamItemStatistic[],
  timeRisks: MockExamTimeRisk[],
): MockExamResultDiagnosis[] => {
  const diagnosis: MockExamResultDiagnosis[] = [];
  if (summary.riskTypes.includes('low_completion')) {
    diagnosis.push({
      id: `${paper.id}-low-completion`,
      riskType: 'low_completion',
      title: '完成率偏低',
      description: `完成率 ${summary.completionRate}%，低于 60% 风险线。`,
      affectedScope: '全卷',
      suggestion: '检查试卷总时长、分区顺序和难度梯度，优先复制为草稿调整配置。',
      targetRoute: `/mock-exam/papers/${paper.id}`,
    });
  }
  if (summary.riskTypes.includes('low_average_score')) {
    diagnosis.push({
      id: `${paper.id}-low-score`,
      riskType: 'low_average_score',
      title: '均分偏低',
      description: `均分 ${summary.averageScore}，得分率 ${summary.averageScoreRate}%。`,
      affectedScope: '全卷',
      suggestion: '检查题目难度组合和分值配置，必要时替换低表现题目。',
      targetRoute: `/mock-exam/papers/${paper.id}?tab=structure`,
    });
  }
  if (summary.riskTypes.includes('weak_section')) {
    diagnosis.push({
      id: `${paper.id}-weak-section`,
      riskType: 'weak_section',
      title: '分区表现异常',
      description: `${summary.lowestSectionName} 得分率 ${summary.lowestSectionRate}%，是当前最低分区。`,
      affectedScope: summary.lowestSectionName,
      suggestion: '回到试卷结构检查该分区题目数量、分值和题型组合。',
      targetRoute: `/mock-exam/papers/${paper.id}?tab=structure`,
    });
  }
  const weakItems = itemStats.filter((item) => item.riskReasons.length);
  if (weakItems.length) {
    diagnosis.push({
      id: `${paper.id}-weak-item`,
      riskType: 'weak_item',
      title: '题目表现异常',
      description: `${weakItems.length} 道题存在低得分率或高跳过率。`,
      affectedScope: weakItems.slice(0, 3).map((item) => item.title).join('、'),
      suggestion: '优先替换或调整这些题目的分值、位置和解析。',
      targetRoute: `/mock-exam/papers/${paper.id}?tab=structure`,
    });
  }
  if (timeRisks.length) {
    diagnosis.push({
      id: `${paper.id}-time-risk`,
      riskType: 'time_pressure',
      title: '时间配置压力',
      description: `${timeRisks.length} 个范围的平均耗时接近配置时长。`,
      affectedScope: timeRisks.map((item) => item.targetName).join('、'),
      suggestion: '检查分区时长和题量配比，避免学生在中后段集中流失。',
      targetRoute: `/mock-exam/papers/${paper.id}?tab=overview`,
    });
  }
  if (summary.riskTypes.includes('precheck_blocked')) {
    diagnosis.push({
      id: `${paper.id}-precheck-blocked`,
      riskType: 'precheck_blocked',
      title: '发布前校验阻断',
      description: paper.lastPrecheck?.summary ?? '预校验存在阻断错误。',
      affectedScope: '试卷配置',
      suggestion: '先修复预校验错误，再提交审核发布。',
      targetRoute: `/mock-exam/papers/${paper.id}?tab=validation`,
    });
  }
  if (!diagnosis.length) {
    diagnosis.push({
      id: `${paper.id}-healthy`,
      title: '暂无明显配置风险',
      description: '当前 Mock 聚合结果未触发风险线。',
      affectedScope: '全卷',
      suggestion: '继续观察完成率、均分和分区耗时变化。',
      targetRoute: `/mock-exam/papers/${paper.id}`,
    });
  }
  return diagnosis;
};

const sanitizedResultPaper = (paper: MockExamPaper): MockExamPaper => ({
  ...clone(paper),
  sections: paper.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      id: item.id,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      sourceVersion: item.sourceVersion,
      sourceStatusAtBinding: item.sourceStatusAtBinding,
      title: item.title,
      sectionType: item.sectionType,
      score: item.score,
      order: item.order,
      sourceGroupId: item.sourceGroupId,
      sourceGroupName: item.sourceGroupName,
      sourceGroupVersion: item.sourceGroupVersion,
    })),
  })),
});

export const buildMockExamResultDetail = (
  paper: MockExamPaper,
  period: MockExamStatisticsPeriod = '30d',
): MockExamResultDetail => {
  const statistics = buildMockExamStatistics(paper, period);
  const itemStats = buildMockExamItemStatistics(paper);
  const timeRisks = buildMockExamTimeRisks(paper, statistics);
  const summary = buildMockExamResultItem(paper, period);
  return {
    summary,
    paper: sanitizedResultPaper(paper),
    statistics,
    itemStats,
    timeRisks,
    diagnosis: diagnosisFromRisks(paper, summary, itemStats, timeRisks),
    containsSensitiveFields: false,
    mockOnly: true,
  };
};

export const mockExamDashboardStats = () => ({
  draft: mockExamPapersData.filter((item) => item.status === 'draft').length,
  pendingReview: mockExamPapersData.filter(
    (item) => item.status === 'pending_review',
  ).length,
  pendingPublish: mockExamPapersData.filter(
    (item) => item.status === 'pending_publish',
  ).length,
  published: mockExamPapersData.filter((item) => item.status === 'published')
    .length,
  precheckErrors: mockExamPapersData.filter(
    (item) => item.lastPrecheck?.level === 'error',
  ).length,
});
