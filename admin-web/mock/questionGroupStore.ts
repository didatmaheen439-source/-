import type { Request } from 'express';
import { nowText } from './auditStore';
import { questionData } from './contentQuestionStore';

export const questionGroupAudienceLabels: Record<API.QuestionGroupAudienceTag, string> = {
  foundation: '基础巩固',
  skill_improvement: '专项提升',
  exam_sprint: '冲刺练习',
};

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

const makeMembers = (examType: API.ExamType, skill: API.QuestionSkill, limit = 3) =>
  questionData
    .filter((item) => item.examType === examType && item.skill === skill && item.status === 'published')
    .slice(0, limit)
    .map<API.QuestionGroupMember>((question, index) => ({
      questionId: question.id,
      questionTitle: question.title,
      questionVersion: question.version,
      questionType: question.questionType,
      difficulty: question.difficulty,
      order: index + 1,
    }));

const seedGroup = (params: {
  id: string;
  name: string;
  examType: API.ExamType;
  skill: API.QuestionSkill;
  status: API.ReviewTaskStatus;
  audienceTags: API.QuestionGroupAudienceTag[];
  version?: string;
  limit?: number;
}): API.QuestionGroupItem => {
  const members = makeMembers(params.examType, params.skill, params.limit);
  return {
    id: params.id,
    name: params.name,
    description: `${params.examType} ${params.name}，用于学习路径和模考试卷批量引用。`,
    examType: params.examType,
    skill: params.skill,
    audienceTags: params.audienceTags,
    estimatedMinutes: Math.max(10, members.length * 5),
    members,
    status: params.status,
    version: params.version ?? 'V1.0',
    dataVersion: 1,
    creatorId: 'teaching_editor',
    creator: '教研编辑',
    createdAt: '2026-07-08 09:00:00',
    updatedById: 'teaching_reviewer_2',
    updatedBy: '教研审核二号',
    updatedAt: '2026-07-09 10:00:00',
    changeSummary: '建立题组并完成题目顺序编排。',
    impactScope: '发布后可被学习路径和模考试卷引用。',
    versionRecords: [{
      id: `question-group-version-${params.id}`,
      version: params.version ?? 'V1.0',
      status: params.status,
      summary: '题组种子版本。',
      createdBy: '教研编辑',
      createdAt: '2026-07-08 09:00:00',
    }],
    operationRecords: [],
  };
};

const initialQuestionGroups: API.QuestionGroupItem[] = [
  seedGroup({ id: 'group-cet4-reading-core', name: '四级阅读核心题组', examType: 'CET4', skill: 'reading', status: 'published', audienceTags: ['foundation', 'skill_improvement'] }),
  seedGroup({ id: 'group-cet6-listening-core', name: '六级听力核心题组', examType: 'CET6', skill: 'listening', status: 'published', audienceTags: ['skill_improvement', 'exam_sprint'] }),
  seedGroup({ id: 'group-cet6-reading-core', name: '六级阅读提升题组', examType: 'CET6', skill: 'reading', status: 'published', audienceTags: ['skill_improvement'] }),
  seedGroup({ id: 'group-cet4-vocab-draft', name: '四级词汇基础题组', examType: 'CET4', skill: 'vocabulary', status: 'draft', audienceTags: ['foundation'] }),
  seedGroup({ id: 'group-cet4-grammar-rejected', name: '四级语法强化题组', examType: 'CET4', skill: 'grammar', status: 'rejected', audienceTags: ['skill_improvement'] }),
];

const globalStore = globalThis as typeof globalThis & {
  __GUOJI_ADMIN_QUESTION_GROUPS__?: API.QuestionGroupItem[];
};

if (!globalStore.__GUOJI_ADMIN_QUESTION_GROUPS__) {
  globalStore.__GUOJI_ADMIN_QUESTION_GROUPS__ = initialQuestionGroups;
}

export const questionGroupData = globalStore.__GUOJI_ADMIN_QUESTION_GROUPS__;

const queryValue = (value: unknown) => Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');

export const filterQuestionGroups = (query: Request['query']) => {
  const keyword = queryValue(query.keyword).trim().toLowerCase();
  const examType = queryValue(query.examType);
  const skill = queryValue(query.skill);
  const status = queryValue(query.status);
  const audienceTag = queryValue(query.audienceTag);
  return [...questionGroupData]
    .filter((item) => !keyword || [item.id, item.name, item.description].some((value) => value.toLowerCase().includes(keyword)))
    .filter((item) => !examType || item.examType === examType)
    .filter((item) => !skill || item.skill === skill)
    .filter((item) => !status || item.status === status)
    .filter((item) => !audienceTag || item.audienceTags.includes(audienceTag as API.QuestionGroupAudienceTag))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

const membersFromIds = (params: API.QuestionGroupSaveParams) => params.questionIds.map((id, index) => {
  const question = questionData.find((item) => item.id === id);
  return question ? {
    questionId: question.id,
    questionTitle: question.title,
    questionVersion: question.version,
    questionType: question.questionType,
    difficulty: question.difficulty,
    order: index + 1,
  } satisfies API.QuestionGroupMember : undefined;
}).filter(Boolean) as API.QuestionGroupMember[];

export const precheckQuestionGroup = (params: API.QuestionGroupSaveParams | API.QuestionGroupItem): API.QuestionGroupPrecheckResult => {
  const questionIds = 'questionIds' in params ? params.questionIds : params.members.map((item) => item.questionId);
  const issues: API.QuestionGroupPrecheckIssue[] = [];
  const add = (field: string, message: string) => issues.push({ id: `group-check-${field}-${issues.length}`, level: 'error', field, message });
  if (!params.name.trim()) add('name', '题组名称不能为空。');
  if (!params.audienceTags.length) add('audienceTags', '至少选择一个适用人群标签。');
  if (!Number.isFinite(params.estimatedMinutes) || params.estimatedMinutes <= 0) add('estimatedMinutes', '预计用时必须大于 0。');
  if (!questionIds.length) add('questionIds', '题组至少包含一道题目。');
  if (new Set(questionIds).size !== questionIds.length) add('questionIds', '题组内不能重复添加同一道题目。');
  questionIds.forEach((id) => {
    const question = questionData.find((item) => item.id === id);
    if (!question) add('questionIds', `题目 ${id} 不存在。`);
    else if (question.status !== 'published') add('questionIds', `题目 ${question.title} 不是已发布状态。`);
    else if (question.examType !== params.examType) add('questionIds', `题目 ${question.title} 的考试类型不一致。`);
    else if (question.skill !== params.skill) add('questionIds', `题目 ${question.title} 的学习模块不一致。`);
  });
  return {
    passed: issues.length === 0,
    checkedAt: nowText(),
    summary: issues.length ? `发现 ${issues.length} 个阻断问题。` : `校验通过，共 ${questionIds.length} 道题。`,
    issues,
  };
};

const nextVersion = (version: string) => {
  const value = Number(version.replace(/^V/, ''));
  return `V${(Number.isFinite(value) ? value + 0.1 : 1).toFixed(1)}`;
};

export const createQuestionGroup = (params: API.QuestionGroupSaveParams, operator: { id: string; name: string }) => {
  const now = nowText();
  const group: API.QuestionGroupItem = {
    id: `question-group-${Date.now()}`,
    name: params.name.trim(),
    description: params.description.trim(),
    examType: params.examType,
    skill: params.skill,
    audienceTags: params.audienceTags,
    estimatedMinutes: params.estimatedMinutes,
    members: membersFromIds(params),
    status: 'draft',
    version: 'V0.1',
    dataVersion: 1,
    creatorId: operator.id,
    creator: operator.name,
    createdAt: now,
    updatedById: operator.id,
    updatedBy: operator.name,
    updatedAt: now,
    changeSummary: params.changeSummary?.trim() || '创建题组草稿。',
    impactScope: params.impactScope?.trim() || '当前为草稿，尚未影响学习路径或模考试卷。',
    versionRecords: [],
    operationRecords: [],
  };
  group.lastPrecheck = precheckQuestionGroup(group);
  group.versionRecords.push({ id: `group-version-${group.id}`, version: group.version, status: 'draft', summary: group.changeSummary, createdBy: operator.name, createdAt: now });
  group.operationRecords.push({ id: `group-op-${group.id}`, operator: operator.name, roleName: operator.name, action: '创建草稿', toStatus: 'draft', reason: group.changeSummary, time: now });
  questionGroupData.unshift(group);
  return group;
};

export const updateQuestionGroup = (group: API.QuestionGroupItem, params: API.QuestionGroupSaveParams, operator: { id: string; name: string }) => {
  const now = nowText();
  const previousStatus = group.status;
  Object.assign(group, {
    name: params.name.trim(), description: params.description.trim(), examType: params.examType, skill: params.skill,
    audienceTags: params.audienceTags, estimatedMinutes: params.estimatedMinutes, members: membersFromIds(params),
    status: 'draft', version: nextVersion(group.version), dataVersion: group.dataVersion + 1,
    updatedById: operator.id, updatedBy: operator.name, updatedAt: now,
    changeSummary: params.changeSummary?.trim() || '更新题组草稿。', impactScope: params.impactScope?.trim() || group.impactScope,
  });
  group.lastPrecheck = precheckQuestionGroup(group);
  group.versionRecords.unshift({ id: `group-version-${group.id}-${Date.now()}`, version: group.version, status: 'draft', summary: group.changeSummary, createdBy: operator.name, createdAt: now });
  group.operationRecords.unshift({ id: `group-op-${group.id}-${Date.now()}`, operator: operator.name, roleName: operator.name, action: '保存草稿', fromStatus: previousStatus, toStatus: 'draft', reason: group.changeSummary, time: now });
  return group;
};

export const copyQuestionGroup = (source: API.QuestionGroupItem, operator: { id: string; name: string }) => createQuestionGroup({
  name: `${source.name} 副本`, description: source.description, examType: source.examType, skill: source.skill,
  audienceTags: source.audienceTags, estimatedMinutes: source.estimatedMinutes,
  questionIds: source.members.map((item) => item.questionId), changeSummary: `复制自 ${source.id} ${source.version}。`,
  impactScope: '新草稿尚未影响下游引用。',
}, operator);

export const buildQuestionGroupReviewTask = (group: API.QuestionGroupItem, operator: { id: string; name: string }, reviewTasks: API.ReviewTask[]) => {
  const now = nowText();
  const payload = {
    objectType: 'question_group' as const, objectTypeName: '题组', objectId: group.id, objectName: group.name,
    moduleKey: 'content', moduleName: '题库管理', submitterId: operator.id, submitter: operator.name,
    submittedAt: now, version: group.version, priority: 'P1' as const, status: 'pending_review' as const,
    riskLevel: 'medium' as const, updatedAt: now, changeSummary: group.changeSummary,
    impactScope: group.impactScope, reviewOpinion: '', reviewer: '', releasePlan: '审核通过后进入待发布队列。', rollbackTargetVersion: group.version,
  };
  const existing = group.reviewTaskId ? reviewTasks.find((item) => item.id === group.reviewTaskId) : undefined;
  if (existing) {
    Object.assign(existing, payload);
    existing.versionRecords.unshift({ id: `review-group-version-${Date.now()}`, version: group.version, status: 'pending_review', summary: group.changeSummary, createdBy: operator.name, createdAt: now });
    return existing;
  }
  const task: API.ReviewTask = {
    id: `review-question-group-${Date.now()}`, ...payload,
    versionRecords: [{ id: `review-group-version-${Date.now()}`, version: group.version, status: 'pending_review', summary: group.changeSummary, createdBy: operator.name, createdAt: now }],
    operationRecords: [{ id: `review-group-op-${Date.now()}`, operator: operator.name, roleName: operator.name, action: '提交审核', fromStatus: group.status, toStatus: 'pending_review', reason: group.changeSummary, time: now }],
  };
  reviewTasks.unshift(task);
  group.reviewTaskId = task.id;
  return task;
};

export const syncQuestionGroupFromReviewTask = (task: API.ReviewTask, previousStatus: API.ReviewTaskStatus, nextStatus: API.ReviewTaskStatus, operatorName: string, reason: string) => {
  if (task.objectType !== 'question_group') return;
  const group = questionGroupData.find((item) => item.id === task.objectId);
  if (!group) return;
  group.status = nextStatus;
  group.updatedBy = operatorName;
  group.updatedAt = task.updatedAt;
  group.reviewTaskId = task.id;
  group.operationRecords.unshift({ id: `group-op-review-${Date.now()}`, operator: operatorName, roleName: operatorName, action: reviewActionLabels[nextStatus], fromStatus: previousStatus, toStatus: nextStatus, reason, time: task.updatedAt });
  group.versionRecords.unshift({ id: `group-version-review-${Date.now()}`, version: group.version, status: nextStatus, summary: `${reviewActionLabels[nextStatus]}：${task.changeSummary}`, createdBy: operatorName, createdAt: task.updatedAt });
};

export const questionGroupToLearningReference = (group: API.QuestionGroupItem): API.LearningPathReference => ({
  id: group.id,
  type: 'question_group',
  name: group.name,
  examType: group.examType,
  module: group.skill,
  status: group.status,
  available: group.status === 'published' && precheckQuestionGroup(group).passed,
});

export const questionGroupReferences = () => questionGroupData.map(questionGroupToLearningReference);
