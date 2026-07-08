import type { Request, Response } from 'express';
import {
  getRolePermissionsPayload,
  roleCanPerformAction,
  roleConfigs,
  roleList,
} from '../src/foundation/permissions';
import type { AdminModuleKey, AdminRoleId, PermissionAction } from '../src/foundation/permissions';
import {
  aiCoachDashboardTodoSources,
  aiCoachStrategiesData,
  aiCoachBusinessSceneLabels,
  aiCoachConfigTypeLabels,
  isAiCoachReviewTask,
  operatorFromRole,
  strategyForUserSummary,
  syncAiCoachStrategyFromReviewTask,
} from './aiCoachStore';
import { auditLogs, nowText, pushAuditLog, pushOperationAuditLog } from './auditStore';
import { clearMockSession, loginAliases, mockSession, setMockSession } from './session';
import { waitTime, defaultUser } from './utils';

let currentRoleId: AdminRoleId | '' = mockSession.currentRoleId;
let currentAccountId = mockSession.currentAccountId;
let currentAccountName = mockSession.currentAccountName;

const disabledAccounts = new Set(['disabled_admin']);
const dashboardHandledRiskIds = new Set<string>();
const accountStatusMap: Record<string, API.AdminAccountStatus> = {
  super_admin: 'enabled',
  content_operator: 'enabled',
  teaching_reviewer: 'enabled',
  ai_operator: 'enabled',
  customer_support: 'enabled',
  data_analyst: 'enabled',
  read_only_auditor: 'enabled',
  teaching_editor: 'enabled',
  teaching_reviewer_2: 'enabled',
  disabled_admin: 'disabled',
};

const accountCreatedAtMap: Record<string, string> = {
  super_admin: '2026-07-01 09:00:00',
  content_operator: '2026-07-01 09:20:00',
  teaching_reviewer: '2026-07-01 09:40:00',
  ai_operator: '2026-07-01 10:00:00',
  customer_support: '2026-07-01 10:20:00',
  data_analyst: '2026-07-01 10:40:00',
  read_only_auditor: '2026-07-01 11:00:00',
  teaching_editor: '2026-07-01 11:10:00',
  teaching_reviewer_2: '2026-07-01 11:12:00',
  disabled_admin: '2026-07-01 11:20:00',
};

const accountLastLoginAtMap: Record<string, string> = {
  super_admin: '2026-07-07 09:20:00',
  content_operator: '2026-07-07 09:32:00',
  teaching_reviewer: '2026-07-07 11:12:00',
  ai_operator: '2026-07-07 12:08:00',
  customer_support: '2026-07-07 13:25:00',
  data_analyst: '2026-07-07 15:40:00',
  read_only_auditor: '2026-07-07 16:05:00',
  teaching_editor: '2026-07-07 16:12:00',
  teaching_reviewer_2: '2026-07-07 16:18:00',
  disabled_admin: '2026-07-02 18:10:00',
};

const reviewObjectModuleMap: Record<API.ReviewObjectType, string> = {
  question_bank: 'content',
  learning_path_config: 'learningPath',
  learning_rule: 'learningPath',
  ai_coach_strategy: 'aiCoach',
  writing_translation: 'writingTranslation',
  mock_exam: 'mockExam',
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

const examTypeLabels: Record<API.ExamType, string> = {
  CET4: '四级',
  CET6: '六级',
};

const questionTypeLabels: Record<API.QuestionType, string> = {
  single_choice: '单选题',
  reading_choice: '阅读选择',
  listening_choice: '听力选择',
};

const skillLabels: Record<API.QuestionSkill, string> = {
  vocabulary: '词汇',
  grammar: '语法',
  reading: '阅读',
  listening: '听力',
};

const learningPathModuleLabels: Record<API.LearningPathModule, string> = {
  vocabulary: '词汇',
  grammar: '语法',
  reading: '阅读',
  listening: '听力',
  writing: '写作',
  translation: '翻译',
  mock_exam: '模考',
};

const difficultyLabels: Record<API.QuestionDifficulty, string> = {
  easy: '基础',
  medium: '中等',
  hard: '较难',
};

const onboardingStatusLabels: Record<API.UserOnboardingStatus, string> = {
  not_started: '未完成',
  completed: '已完成',
};

const diagnosisStatusLabels: Record<API.UserDiagnosisStatus, string> = {
  not_started: '未完成',
  completed: '已完成',
};

const taskStatusLabels: Record<API.UserTaskStatus, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
  interrupted: '已中断',
};

const feedbackStatusLabels: Record<API.UserFeedbackStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已处理',
  no_action: '无需处理',
  closed: '已关闭',
};

const feedbackStatusTransitions: Record<API.UserFeedbackStatus, API.UserFeedbackStatus[]> = {
  pending: ['processing', 'no_action'],
  processing: ['resolved', 'no_action'],
  resolved: ['closed'],
  no_action: ['closed'],
  closed: [],
};

const accountDisplayNameMap: Record<string, string> = {
  teaching_editor: '教研编辑',
  teaching_reviewer_2: '教研复核',
};

const getOperator = () => {
  const roleId = currentRoleId || 'super_admin';
  return {
    id: currentAccountId || roleId,
    name: currentAccountName || roleConfigs[roleId].name,
    roleId,
    roleName: roleConfigs[roleId].name,
  };
};

const maskPhone = (phone: string) => phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');

const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 2)}***@${domain}`;
};

const maskDeviceId = (deviceId: string) =>
  deviceId.length > 10
    ? `${deviceId.slice(0, 4)}...${deviceId.slice(-4)}`
    : deviceId;

const mockUserPrivateData: Record<
  string,
  {
    phone: string;
    email: string;
    deviceId: string;
    ip: string;
  }
> = {};

const feedbackOriginalContentMap: Record<string, string> = {};
const aiSummaryContentMap: Record<string, string> = {};

const learningModules = ['词汇', '听力', '阅读', '写作', '翻译', '模考'];
const taskTypes = ['专项练习', '今日任务', '错题复练', '模考分区'];
const errorTagPool = ['词义辨析', '长难句', '主旨判断', '听力定位', '搭配错误', '时态'];

const buildLearningRecords = (userId: string, index: number): API.UserLearningRecord[] => {
  if (index % 10 === 0) return [];
  return Array.from({ length: 4 + (index % 4) }).map((_, recordIndex) => {
    const hasAnswer = recordIndex % 5 !== 0;
    return {
      id: `${userId}-learn-${recordIndex + 1}`,
      date: `2026-07-${String(7 - (recordIndex % 5)).padStart(2, '0')}`,
      module: learningModules[(index + recordIndex) % learningModules.length],
      taskType: taskTypes[(index + recordIndex) % taskTypes.length],
      status: (['not_started', 'in_progress', 'completed', 'interrupted'] as API.UserTaskStatus[])[
        (index + recordIndex) % 4
      ],
      accuracy: hasAnswer ? Math.min(96, 58 + ((index + recordIndex) % 8) * 5) : undefined,
      errorTags: hasAnswer ? [errorTagPool[(index + recordIndex) % errorTagPool.length]] : [],
      durationSeconds: hasAnswer ? 480 + recordIndex * 190 : 0,
      relatedObjectId: `content-${index}-${recordIndex + 1}`,
      relatedObjectSummary: `${learningModules[(index + recordIndex) % learningModules.length]}任务摘要 ${recordIndex + 1}`,
    };
  });
};

const buildFeedbacks = (userId: string, index: number): API.UserFeedbackItem[] => {
  if (index % 5 === 0) return [];
  const statuses: API.UserFeedbackStatus[] = ['pending', 'processing', 'resolved', 'no_action', 'closed'];
  return Array.from({ length: 1 + (index % 3) }).map((_, feedbackIndex) => {
    const id = `${userId}-feedback-${feedbackIndex + 1}`;
    const status = statuses[(index + feedbackIndex) % statuses.length];
    feedbackOriginalContentMap[id] = `这是 ${userId} 的模拟反馈原文，仅用于验证敏感访问审计。用户反馈今日任务进度、AI 讲解或题目解析存在疑问。`;
    return {
      id,
      type: ['学习路径', 'AI 陪练', '题目解析', '模考结果'][feedbackIndex % 4],
      summary: `反馈摘要 ${feedbackIndex + 1}：用户反馈学习流程存在疑问。`,
      submittedAt: `2026-07-0${(feedbackIndex % 6) + 1} 1${feedbackIndex}:20:00`,
      priority: (['P0', 'P1', 'P2'] as const)[(index + feedbackIndex) % 3],
      status,
      relatedModule: ['学习路径配置', 'AI 陪练管理', '题库与内容管理'][feedbackIndex % 3],
      handler: status === 'pending' ? undefined : '客服',
      remark: status === 'pending' ? '' : '已记录排查进展。',
      updatedAt: `2026-07-0${(feedbackIndex % 6) + 1} 1${feedbackIndex}:45:00`,
      version: 1,
      originalContentAvailable: true,
      statusHistory: [
        {
          id: `${id}-history-1`,
          operator: '客服',
          toStatus: status,
          reason: '模拟反馈状态初始化。',
          remark: status === 'pending' ? '' : '已进入处理流程。',
          version: 1,
          time: `2026-07-0${(feedbackIndex % 6) + 1} 1${feedbackIndex}:45:00`,
          result: 'success',
        },
      ],
    };
  });
};

const buildAiSummaries = (userId: string, index: number): API.UserAiSummary[] => {
  if (index % 6 === 0) return [];
  return Array.from({ length: 1 + (index % 2) }).map((_, summaryIndex) => {
    const id = `${userId}-ai-${summaryIndex + 1}`;
    const strategy = strategyForUserSummary(index + summaryIndex);
    aiSummaryContentMap[id] = `模拟 AI 摘要：用户围绕 ${summaryIndex % 2 === 0 ? '阅读错题' : '写作修改'} 进行咨询，系统给出步骤化提示并避免直接代写。`;
    return {
      id,
      sessionTime: `2026-07-0${(summaryIndex % 6) + 1} 20:1${summaryIndex}:00`,
      intent: ['错题讲解', '写作建议', '学习计划', '翻译提示'][(index + summaryIndex) % 4],
      summaryStatus: 'available',
      attachmentType: summaryIndex % 2 === 0 ? '无附件' : '图片摘要',
      abnormalFlag: index % 7 === 0,
      processStatus: (['pending', 'processing', 'resolved', 'closed'] as const)[
        (index + summaryIndex) % 4
      ],
      strategyId: strategy.id,
      strategyVersion: strategy.version,
      configType: strategy.configType,
      businessScene: strategy.businessScenes[0],
      strategyStatusAtTime: strategy.status,
      summaryPreview: '仅展示必要摘要，完整会话不进入本后台。',
      summaryAvailable: true,
    };
  });
};

const operationUsersData: API.AdminUser[] = Array.from({ length: 30 }).map((_, zeroIndex) => {
  const index = zeroIndex + 1;
  const id = `app-user-${String(index).padStart(3, '0')}`;
  const phone = `139${String(20000000 + index * 137).padStart(8, '0')}`;
  const email = `mockuser${index}@example.test`;
  const deviceId = `device-${String(index).padStart(3, '0')}-abcdef${index}`;
  mockUserPrivateData[id] = {
    phone,
    email,
    deviceId,
    ip: `10.${index % 255}.${(index * 3) % 255}.${(index * 7) % 255}`,
  };
  const learningStatus: API.UserLearningStatus = {
    onboardingStatus: index % 4 === 0 ? 'not_started' : 'completed',
    diagnosisStatus: index % 5 === 0 ? 'not_started' : 'completed',
    weakModules: [learningModules[index % learningModules.length], learningModules[(index + 2) % learningModules.length]],
    todayTaskStatus: (['not_started', 'in_progress', 'completed', 'interrupted'] as API.UserTaskStatus[])[index % 4],
    todayTaskProgress: [0, 35, 100, 60][index % 4],
    lastStudyAt: `2026-07-0${(index % 7) + 1} ${String(8 + (index % 12)).padStart(2, '0')}:30:00`,
  };
  const feedbacks = buildFeedbacks(id, index);
  const unhandledFeedbackCount = feedbacks.filter((item) =>
    ['pending', 'processing'].includes(item.status),
  ).length;
  return {
    id,
    nickname: `模拟用户${String(index).padStart(2, '0')}`,
    phoneMasked: maskPhone(phone),
    emailMasked: maskEmail(email),
    deviceSummary: maskDeviceId(deviceId),
    registerAt: `2026-06-${String((index % 26) + 1).padStart(2, '0')} 09:00:00`,
    lastActiveAt:
      index % 9 === 0
        ? `2026-06-${String((index % 20) + 1).padStart(2, '0')} 18:00:00`
        : `2026-07-${String((index % 7) + 1).padStart(2, '0')} ${String(22 - (index % 12)).padStart(2, '0')}:10:00`,
    examProfile: {
      examType: index % 2 === 0 ? 'CET6' : 'CET4',
      targetScore: index % 2 === 0 ? 530 : 500,
      examDate: index % 2 === 0 ? '2026-12-12' : '2026-12-13',
      dailyStudyMinutes: [20, 30, 45, 60][index % 4],
    },
    learningStatus,
    currentStudyStatus: `${taskStatusLabels[learningStatus.todayTaskStatus]}，${learningStatus.todayTaskProgress}%`,
    unhandledFeedbackCount,
    latestFeedbackStatus: feedbacks[0]?.status,
    latestHandler: feedbacks[0]?.handler,
    allowedActions: [],
    learningRecords: buildLearningRecords(id, index),
    feedbacks,
    aiSummaries: buildAiSummaries(id, index),
    remarks: [],
    accessLogs: [],
  };
});

const initialReviewTasksData: API.ReviewTask[] = [
  {
    id: 'review-question-001',
    objectType: 'question_bank',
    objectTypeName: '题库内容',
    objectId: 'question-cet4-reading-001',
    objectName: '四级阅读主旨判断题 A',
    moduleKey: 'content',
    moduleName: '题库与内容管理',
    submitter: '内容运营',
    submittedAt: '2026-07-07 09:40:00',
    version: 'V1.2',
    priority: 'P0',
    status: 'pending_review',
    riskLevel: 'high',
    updatedAt: '2026-07-07 09:45:00',
    changeSummary: '补充阅读题干、选项和错因解析。',
    impactScope: '影响 CET-4 阅读专项练习和今日任务推荐。',
    reviewOpinion: '',
    reviewer: '',
    releasePlan: '审核通过后进入待发布队列。',
    rollbackTargetVersion: 'V1.1',
    versionRecords: [
      {
        id: 'version-question-001-v12',
        version: 'V1.2',
        status: 'pending_review',
        summary: '新增阅读题组和解析。',
        createdBy: '内容运营',
        createdAt: '2026-07-07 09:40:00',
      },
      {
        id: 'version-question-001-v11',
        version: 'V1.1',
        status: 'published',
        summary: '线上稳定版本。',
        createdBy: '教研审核',
        createdAt: '2026-07-01 16:20:00',
      },
    ],
    operationRecords: [
      {
        id: 'op-question-001-submit',
        operator: '内容运营',
        roleName: '内容运营',
        action: '提交审核',
        fromStatus: 'draft',
        toStatus: 'pending_review',
        reason: '题组完成初稿。',
        time: '2026-07-07 09:40:00',
      },
    ],
  },
  {
    id: 'review-learning-001',
    objectType: 'learning_rule',
    objectTypeName: '学习路径规则',
    objectId: 'diagnosis-rule-cet6-listening-weak',
    objectName: '六级听力薄弱诊断规则',
    moduleKey: 'learningPath',
    moduleName: '学习路径配置',
    submitter: 'AI 策略运营',
    submittedAt: '2026-07-07 08:50:00',
    version: 'V0.9',
    priority: 'P1',
    status: 'rejected',
    riskLevel: 'medium',
    updatedAt: '2026-07-07 10:10:00',
    changeSummary: '调整诊断阈值和推荐任务包。',
    impactScope: '影响 CET-6 听力薄弱用户的诊断结果。',
    reviewOpinion: '阈值说明不足，需要补充样本依据。',
    reviewer: '教研审核',
    releasePlan: '补充说明后重新提交。',
    rollbackTargetVersion: 'V0.8',
    versionRecords: [
      {
        id: 'version-learning-001-v09',
        version: 'V0.9',
        status: 'rejected',
        summary: '调整阈值。',
        createdBy: 'AI 策略运营',
        createdAt: '2026-07-07 08:50:00',
      },
    ],
    operationRecords: [
      {
        id: 'op-learning-001-reject',
        operator: '教研审核',
        roleName: '教研审核',
        action: '驳回',
        fromStatus: 'pending_review',
        toStatus: 'rejected',
        reason: '阈值说明不足。',
        time: '2026-07-07 10:10:00',
      },
    ],
  },
  {
    id: 'review-ai-001',
    objectType: 'ai_coach_strategy',
    objectSubtype: 'prompt_template',
    objectTypeName: 'AI 策略',
    objectId: 'ai-prompt-speaking-v30',
    objectName: '口语陪练提示词 V3',
    moduleKey: 'aiCoach',
    moduleName: 'AI 陪练管理',
    submitter: 'AI 策略运营',
    submittedAt: '2026-07-07 10:25:00',
    version: 'V3.0',
    priority: 'P0',
    status: 'approved',
    riskLevel: 'high',
    updatedAt: '2026-07-07 11:00:00',
    changeSummary: '优化追问策略，增加防依赖提示。',
    impactScope: '影响 AI 口语陪练会话。',
    reviewOpinion: '可进入发布准备。',
    reviewer: '教研审核',
    releasePlan: '灰度发布到模拟环境。',
    rollbackTargetVersion: 'V2.8',
    versionRecords: [
      {
        id: 'version-ai-001-v30',
        version: 'V3.0',
        status: 'approved',
        summary: '提示词策略升级。',
        createdBy: 'AI 策略运营',
        createdAt: '2026-07-07 10:25:00',
      },
    ],
    operationRecords: [
      {
        id: 'op-ai-001-approve',
        operator: '教研审核',
        roleName: '教研审核',
        action: '审核通过',
        fromStatus: 'pending_review',
        toStatus: 'approved',
        reason: '策略边界完整。',
        time: '2026-07-07 11:00:00',
      },
    ],
  },
  {
    id: 'review-writing-001',
    objectType: 'writing_translation',
    objectTypeName: '写译题目',
    objectId: 'writing-topic-cet4-202607',
    objectName: '四级写作题 2026-07',
    moduleKey: 'writingTranslation',
    moduleName: '写译批改管理',
    submitter: '内容运营',
    submittedAt: '2026-07-07 11:20:00',
    version: 'V1.0',
    priority: 'P1',
    status: 'pending_publish',
    riskLevel: 'medium',
    updatedAt: '2026-07-07 12:30:00',
    changeSummary: '新增写作题和评分维度。',
    impactScope: '影响写作专项练习。',
    reviewOpinion: '审核通过，等待发布。',
    reviewer: '教研审核',
    releasePlan: '2026-07-08 09:00 发布。',
    rollbackTargetVersion: 'V0.9',
    versionRecords: [
      {
        id: 'version-writing-001-v10',
        version: 'V1.0',
        status: 'pending_publish',
        summary: '新增写作题。',
        createdBy: '内容运营',
        createdAt: '2026-07-07 11:20:00',
      },
    ],
    operationRecords: [
      {
        id: 'op-writing-001-schedule',
        operator: '教研审核',
        roleName: '教研审核',
        action: '安排发布',
        fromStatus: 'approved',
        toStatus: 'pending_publish',
        reason: '进入明日发布队列。',
        time: '2026-07-07 12:30:00',
      },
    ],
  },
  {
    id: 'review-mock-001',
    objectType: 'mock_exam',
    objectTypeName: '模考试卷',
    objectId: 'mock-exam-cet6-202607',
    objectName: '六级模考试卷 2026-07',
    moduleKey: 'mockExam',
    moduleName: '模考管理',
    submitter: '教研审核',
    submittedAt: '2026-07-06 16:00:00',
    version: 'V2.1',
    priority: 'P1',
    status: 'published',
    riskLevel: 'medium',
    updatedAt: '2026-07-07 09:00:00',
    changeSummary: '更新听力分区和阅读题目。',
    impactScope: '影响模考入口和成绩统计。',
    reviewOpinion: '已发布。',
    reviewer: '超级管理员',
    releasePlan: '已于 2026-07-07 09:00 发布。',
    rollbackTargetVersion: 'V2.0',
    versionRecords: [
      {
        id: 'version-mock-001-v21',
        version: 'V2.1',
        status: 'published',
        summary: '当前线上版本。',
        createdBy: '教研审核',
        createdAt: '2026-07-06 16:00:00',
      },
    ],
    operationRecords: [
      {
        id: 'op-mock-001-publish',
        operator: '超级管理员',
        roleName: '超级管理员',
        action: '发布',
        fromStatus: 'pending_publish',
        toStatus: 'published',
        reason: '模考试卷审核通过。',
        time: '2026-07-07 09:00:00',
      },
    ],
  },
  {
    id: 'review-ai-002',
    objectType: 'ai_coach_strategy',
    objectSubtype: 'dependency_rule',
    objectTypeName: 'AI 策略',
    objectId: 'ai-dependency-error-v04',
    objectName: '错题答案依赖干预 V0.4',
    moduleKey: 'aiCoach',
    moduleName: 'AI 陪练管理',
    submitter: 'AI 策略运营',
    submittedAt: '2026-07-05 15:00:00',
    version: 'V1.0',
    priority: 'P2',
    status: 'offline',
    riskLevel: 'low',
    updatedAt: '2026-07-06 18:00:00',
    changeSummary: '旧附件策略下架。',
    impactScope: '旧策略不再对线上会话生效。',
    reviewOpinion: '已下架。',
    reviewer: 'AI 策略运营',
    releasePlan: '替换为新策略。',
    rollbackTargetVersion: 'V0.9',
    versionRecords: [
      {
        id: 'version-ai-002-v10',
        version: 'V1.0',
        status: 'offline',
        summary: '旧策略下架。',
        createdBy: 'AI 策略运营',
        createdAt: '2026-07-05 15:00:00',
      },
    ],
    operationRecords: [
      {
        id: 'op-ai-002-offline',
        operator: 'AI 策略运营',
        roleName: 'AI 策略运营',
        action: '下架',
        fromStatus: 'published',
        toStatus: 'offline',
        reason: '新策略已替换。',
        time: '2026-07-06 18:00:00',
      },
    ],
  },
  {
    id: 'review-question-002',
    objectType: 'question_bank',
    objectTypeName: '题库内容',
    objectId: 'daily-sentence-20260706',
    objectName: '每日一句 2026-07-06',
    moduleKey: 'content',
    moduleName: '题库与内容管理',
    submitter: '内容运营',
    submittedAt: '2026-07-06 10:00:00',
    version: 'V1.4',
    priority: 'P2',
    status: 'rolled_back',
    riskLevel: 'low',
    updatedAt: '2026-07-06 20:20:00',
    changeSummary: '回滚每日一句配图版本。',
    impactScope: '影响历史内容展示。',
    reviewOpinion: '已回滚。',
    reviewer: '超级管理员',
    releasePlan: '恢复 V1.3。',
    rollbackTargetVersion: 'V1.3',
    versionRecords: [
      {
        id: 'version-question-002-v14',
        version: 'V1.4',
        status: 'rolled_back',
        summary: '问题版本。',
        createdBy: '内容运营',
        createdAt: '2026-07-06 10:00:00',
      },
      {
        id: 'version-question-002-v13',
        version: 'V1.3',
        status: 'published',
        summary: '恢复版本。',
        createdBy: '内容运营',
        createdAt: '2026-07-05 10:00:00',
      },
    ],
    operationRecords: [
      {
        id: 'op-question-002-rollback',
        operator: '超级管理员',
        roleName: '超级管理员',
        action: '回滚',
        fromStatus: 'published',
        toStatus: 'rolled_back',
        reason: '配图引用异常。',
        time: '2026-07-06 20:20:00',
      },
    ],
  },
];

const globalReviewStore = globalThis as typeof globalThis & {
  __GUOJI_ADMIN_REVIEW_TASKS__?: API.ReviewTask[];
};

if (!globalReviewStore.__GUOJI_ADMIN_REVIEW_TASKS__) {
  globalReviewStore.__GUOJI_ADMIN_REVIEW_TASKS__ = initialReviewTasksData;
}

export const reviewTasksData = globalReviewStore.__GUOJI_ADMIN_REVIEW_TASKS__;

const questionData: API.QuestionItem[] = [
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
  {
    id: 'question-cet6-grammar-001',
    title: '六级语法结构题 A',
    stem: 'Had it not been for the timely warning, the students ______ the deadline.',
    examType: 'CET6',
    questionType: 'single_choice',
    skill: 'grammar',
    difficulty: 'hard',
    tags: ['虚拟语气', '语法结构'],
    options: [
      { key: 'A', content: 'would miss' },
      { key: 'B', content: 'will miss' },
      { key: 'C', content: 'would have missed' },
      { key: 'D', content: 'had missed' },
    ],
    answer: 'C',
    analysis: 'Had it not been for 表示与过去事实相反，主句使用 would have done。',
    status: 'published',
    version: 'V1.0',
    creator: '教研审核',
    createdAt: '2026-07-03 09:30:00',
    updatedBy: '教研审核',
    updatedAt: '2026-07-05 15:00:00',
    changeSummary: '发布六级语法结构题。',
    referenceImpact: '已用于 CET-6 语法专项练习。',
    versionRecords: [
      {
        id: 'question-version-grammar-001-v10',
        version: 'V1.0',
        status: 'published',
        summary: '当前线上版本。',
        createdBy: '教研审核',
        createdAt: '2026-07-05 15:00:00',
      },
    ],
    operationRecords: [
      {
        id: 'question-op-grammar-001-publish',
        operator: '教研审核',
        roleName: '教研审核',
        action: '发布',
        fromStatus: 'pending_publish',
        toStatus: 'published',
        reason: '题目审核通过并发布。',
        time: '2026-07-05 15:00:00',
      },
    ],
  },
];

const moduleByQuestionSkill: Record<API.QuestionSkill, API.LearningPathModule> = {
  vocabulary: 'vocabulary',
  grammar: 'grammar',
  reading: 'reading',
  listening: 'listening',
};

const questionGroupReferences: API.LearningPathReference[] = [
  {
    id: 'group-cet4-reading-core',
    type: 'question_group',
    name: '四级阅读核心题组',
    examType: 'CET4',
    module: 'reading',
    status: 'published',
    available: true,
  },
  {
    id: 'group-cet6-listening-core',
    type: 'question_group',
    name: '六级听力核心题组',
    examType: 'CET6',
    module: 'listening',
    status: 'published',
    available: true,
  },
  {
    id: 'group-cet4-vocab-draft',
    type: 'question_group',
    name: '四级词汇草稿题组',
    examType: 'CET4',
    module: 'vocabulary',
    status: 'draft',
    available: false,
  },
  {
    id: 'group-cet6-writing-offline',
    type: 'question_group',
    name: '六级写作下架题组',
    examType: 'CET6',
    module: 'writing',
    status: 'offline',
    available: false,
  },
  {
    id: 'group-cet4-translation-core',
    type: 'question_group',
    name: '四级翻译基础题组',
    examType: 'CET4',
    module: 'translation',
    status: 'published',
    available: true,
  },
  {
    id: 'group-cet6-reading-core',
    type: 'question_group',
    name: '六级阅读提升题组',
    examType: 'CET6',
    module: 'reading',
    status: 'published',
    available: true,
  },
];

const buildQuestionReference = (question: API.QuestionItem): API.LearningPathReference => ({
  id: question.id,
  type: 'question',
  name: question.title,
  examType: question.examType,
  module: moduleByQuestionSkill[question.skill],
  status: question.status,
  available: question.status === 'published',
});

const allLearningPathReferences = () => [
  ...questionData.map(buildQuestionReference),
  ...questionGroupReferences,
];

const referenceById = (id?: string) =>
  allLearningPathReferences().find((item) => item.id === id);

const baseLearningPathConfig = (params: {
  id: string;
  kind: API.LearningPathConfigKind;
  name: string;
  description: string;
  examType: API.ExamType;
  priority: number;
  status: API.LearningPathConfigStatus;
  version: string;
  dataVersion: number;
  createdBy?: string;
  createdById?: string;
  updatedBy?: string;
  updatedById?: string;
  updatedAt: string;
  changeSummary: string;
  internalRemark?: string;
  reviewTaskId?: string;
  releaseVersionId?: string;
}): API.LearningPathConfigBase => ({
  id: params.id,
  kind: params.kind,
  name: params.name,
  description: params.description,
  examType: params.examType,
  priority: params.priority,
  status: params.status,
  version: params.version,
  dataVersion: params.dataVersion,
  createdBy: params.createdBy ?? '教研编辑',
  createdById: params.createdById ?? 'teaching_editor',
  createdAt: '2026-07-01 09:00:00',
  updatedBy: params.updatedBy ?? '教研编辑',
  updatedById: params.updatedById ?? 'teaching_editor',
  updatedAt: params.updatedAt,
  reviewTaskId: params.reviewTaskId,
  releaseVersionId: params.releaseVersionId,
  changeSummary: params.changeSummary,
  internalRemark: params.internalRemark,
  versionRecords: [
    {
      id: `lp-version-${params.id}-${params.version}`,
      configId: params.id,
      kind: params.kind,
      version: params.version,
      status: params.status,
      createdBy: params.updatedBy ?? '教研编辑',
      createdAt: params.updatedAt,
      changeSummary: params.changeSummary,
      currentOnline: params.status === 'published',
      publishedAt: params.status === 'published' ? params.updatedAt : undefined,
      publishedBy: params.status === 'published' ? params.updatedBy ?? '教研编辑' : undefined,
    },
  ],
  operationRecords: [
    {
      id: `lp-op-${params.id}-${params.version}`,
      operator: params.updatedBy ?? '教研编辑',
      roleName: '教研审核',
      action: reviewStatusActionMap[params.status],
      toStatus: params.status,
      reason: params.changeSummary,
      time: params.updatedAt,
    },
  ],
});

const defaultUserCondition = (
  examType: API.ExamType,
  conditionMode: API.LearningPathConditionMode = 'all',
): API.LearningPathUserCondition => ({
  examType,
  targetScoreMin: examType === 'CET4' ? 425 : 500,
  targetScoreMax: examType === 'CET4' ? 550 : 620,
  dailyMinutesMin: 20,
  dailyMinutesMax: 60,
  onboardingStatus: 'completed',
  diagnosisStatus: 'completed',
  conditionMode,
});

const defaultDiagnosisOutput = (
  module: API.LearningPathModule,
  groupId: string,
): API.DiagnosisRuleOutput => ({
  weakModules: [module],
  weakLevel: module === 'listening' || module === 'writing' ? 'high' : 'medium',
  taskPriority: module === 'listening' || module === 'writing' ? 'P0' : 'P1',
  recommendedTaskType: '专项练习',
  recommendedGroupId: groupId,
  estimatedMinutes: module === 'listening' ? 35 : 25,
  outputDescription: `${learningPathModuleLabels[module]}薄弱时推荐专项任务。`,
});

const createDiagnosisRule = (params: {
  id: string;
  name: string;
  examType: API.ExamType;
  module: API.LearningPathModule;
  priority: number;
  status: API.LearningPathConfigStatus;
  version: string;
  dataVersion: number;
  updatedAt: string;
  references: string[];
  conditions?: API.DiagnosisRuleCondition[];
  outputGroupId?: string;
  changeSummary: string;
  reviewTaskId?: string;
}): API.DiagnosisRule => {
  const references = params.references
    .map(referenceById)
    .filter(Boolean) as API.LearningPathReference[];
  const groupId = params.outputGroupId ?? references.find((item) => item.type === 'question_group')?.id ?? '';
  return {
    ...baseLearningPathConfig({
      id: params.id,
      kind: 'diagnosis_rule',
      name: params.name,
      description: `${params.name} 的基础诊断配置。`,
      examType: params.examType,
      priority: params.priority,
      status: params.status,
      version: params.version,
      dataVersion: params.dataVersion,
      updatedAt: params.updatedAt,
      changeSummary: params.changeSummary,
      reviewTaskId: params.reviewTaskId,
      releaseVersionId: params.status === 'published' ? `${params.id}-${params.version}` : undefined,
    }),
    kind: 'diagnosis_rule',
    applicableModule: params.module,
    userCondition: defaultUserCondition(params.examType),
    questionRange: `${examTypeLabels[params.examType]}${learningPathModuleLabels[params.module]}专项`,
    references,
    conditionGroup: {
      mode: 'all',
      conditions:
        params.conditions ??
        [
          {
            id: `${params.id}-condition-accuracy`,
            metric: 'accuracy',
            operator: 'lt',
            value: 70,
            description: '正确率低于 70%。',
          },
        ],
    },
    output: defaultDiagnosisOutput(params.module, groupId),
  };
};

const createTaskTemplate = (params: {
  id: string;
  name: string;
  examType: API.ExamType;
  priority: number;
  status: API.LearningPathConfigStatus;
  version: string;
  dataVersion: number;
  updatedAt: string;
  modules: API.LearningPathModule[];
  contentIds: string[];
  changeSummary: string;
  reviewTaskId?: string;
}): API.TodayTaskTemplate => {
  const taskItems: API.LearningPathTaskItem[] = params.contentIds.map((contentId, index) => {
    const reference = referenceById(contentId);
    const module = params.modules[index % params.modules.length] ?? 'reading';
    return {
      id: `${params.id}-task-${index + 1}`,
      order: index + 1,
      module,
      taskType: index === 0 ? '今日任务' : '错题复练',
      contentType: reference?.type ?? 'question_group',
      contentId,
      contentName: reference?.name ?? `失效引用 ${contentId}`,
      estimatedMinutes: 15 + index * 5,
      required: index === 0,
      replacementAllowed: index > 0,
      description: `${learningPathModuleLabels[module]}任务项。`,
    };
  });
  return {
    ...baseLearningPathConfig({
      id: params.id,
      kind: 'today_task_template',
      name: params.name,
      description: `${params.name} 的今日任务模板。`,
      examType: params.examType,
      priority: params.priority,
      status: params.status,
      version: params.version,
      dataVersion: params.dataVersion,
      updatedAt: params.updatedAt,
      changeSummary: params.changeSummary,
      reviewTaskId: params.reviewTaskId,
      releaseVersionId: params.status === 'published' ? `${params.id}-${params.version}` : undefined,
    }),
    kind: 'today_task_template',
    userCondition: defaultUserCondition(params.examType, 'any'),
    matchedDiagnosisRuleId: params.examType === 'CET4' ? 'diagnosis-cet4-reading-core' : 'diagnosis-cet6-listening-core',
    matchedWeakModules: params.modules,
    weakLevel: params.modules.includes('listening') ? 'high' : 'medium',
    taskItems,
    totalEstimatedMinutes: taskItems.reduce((sum, item) => sum + item.estimatedMinutes, 0),
    replacementAllowed: true,
    templateDescription: '根据诊断输出生成当天任务，不运行真实规则计算。',
  };
};

const learningPathConfigsData: API.LearningPathConfigItem[] = [
  createDiagnosisRule({
    id: 'diagnosis-cet4-reading-core',
    name: '四级阅读薄弱诊断规则',
    examType: 'CET4',
    module: 'reading',
    priority: 10,
    status: 'published',
    version: 'V1.0',
    dataVersion: 4,
    updatedAt: '2026-07-05 10:20:00',
    references: ['question-cet4-reading-001', 'group-cet4-reading-core'],
    changeSummary: '发布四级阅读薄弱诊断规则。',
  }),
  createDiagnosisRule({
    id: 'diagnosis-cet6-listening-core',
    name: '六级听力薄弱诊断规则',
    examType: 'CET6',
    module: 'listening',
    priority: 10,
    status: 'rejected',
    version: 'V0.9',
    dataVersion: 3,
    updatedAt: '2026-07-07 10:10:00',
    references: ['question-cet6-listening-001', 'group-cet6-listening-core'],
    changeSummary: '调整听力阈值，被要求补充样本说明。',
    reviewTaskId: 'review-learning-001',
  }),
  createDiagnosisRule({
    id: 'diagnosis-cet4-vocab-draft',
    name: '四级词汇错误诊断规则',
    examType: 'CET4',
    module: 'vocabulary',
    priority: 20,
    status: 'draft',
    version: 'V0.2',
    dataVersion: 2,
    updatedAt: '2026-07-07 09:30:00',
    references: ['question-cet4-vocabulary-001', 'group-cet4-vocab-draft'],
    changeSummary: '补充词汇错因标签判定。',
  }),
  createDiagnosisRule({
    id: 'diagnosis-cet6-writing-pending',
    name: '六级写作薄弱诊断规则',
    examType: 'CET6',
    module: 'writing',
    priority: 30,
    status: 'pending_review',
    version: 'V0.5',
    dataVersion: 5,
    updatedAt: '2026-07-07 11:20:00',
    references: ['group-cet6-writing-offline'],
    changeSummary: '新增六级写作薄弱诊断。',
  }),
  createDiagnosisRule({
    id: 'diagnosis-cet6-grammar-approved',
    name: '六级语法结构诊断规则',
    examType: 'CET6',
    module: 'grammar',
    priority: 40,
    status: 'approved',
    version: 'V1.1',
    dataVersion: 6,
    updatedAt: '2026-07-07 12:10:00',
    references: ['question-cet6-grammar-001'],
    changeSummary: '审核通过，等待安排发布。',
  }),
  createDiagnosisRule({
    id: 'diagnosis-cet4-translation-release',
    name: '四级翻译基础诊断规则',
    examType: 'CET4',
    module: 'translation',
    priority: 50,
    status: 'pending_publish',
    version: 'V1.0',
    dataVersion: 4,
    updatedAt: '2026-07-07 13:05:00',
    references: ['group-cet4-translation-core'],
    changeSummary: '已通过审核，等待发布。',
  }),
  createDiagnosisRule({
    id: 'diagnosis-cet4-reading-offline',
    name: '四级阅读旧版诊断规则',
    examType: 'CET4',
    module: 'reading',
    priority: 60,
    status: 'offline',
    version: 'V0.8',
    dataVersion: 8,
    updatedAt: '2026-07-06 17:20:00',
    references: ['group-cet4-reading-core'],
    changeSummary: '旧版规则下架。',
  }),
  createDiagnosisRule({
    id: 'diagnosis-cet6-reading-rollback',
    name: '六级阅读回滚诊断规则',
    examType: 'CET6',
    module: 'reading',
    priority: 70,
    status: 'rolled_back',
    version: 'V1.3',
    dataVersion: 9,
    updatedAt: '2026-07-06 20:10:00',
    references: ['group-cet6-reading-core'],
    changeSummary: '回滚到 V1.2 稳定版本。',
  }),
  createDiagnosisRule({
    id: 'diagnosis-cet4-conflict',
    name: '四级阅读优先级冲突规则',
    examType: 'CET4',
    module: 'reading',
    priority: 10,
    status: 'draft',
    version: 'V0.1',
    dataVersion: 1,
    updatedAt: '2026-07-07 14:00:00',
    references: ['group-cet4-reading-core'],
    changeSummary: '用于验证同优先级冲突。',
  }),
  createDiagnosisRule({
    id: 'diagnosis-cet6-impossible',
    name: '六级不可达条件诊断规则',
    examType: 'CET6',
    module: 'listening',
    priority: 80,
    status: 'draft',
    version: 'V0.1',
    dataVersion: 1,
    updatedAt: '2026-07-07 14:30:00',
    references: ['group-cet6-listening-core'],
    conditions: [
      {
        id: 'diagnosis-cet6-impossible-condition',
        metric: 'accuracy',
        operator: 'between',
        min: 90,
        max: 50,
        description: '最小正确率大于最大正确率。',
      },
    ],
    changeSummary: '用于验证条件互相矛盾。',
  }),
  createTaskTemplate({
    id: 'template-cet4-reading-daily',
    name: '四级阅读今日任务模板',
    examType: 'CET4',
    priority: 10,
    status: 'published',
    version: 'V1.0',
    dataVersion: 5,
    updatedAt: '2026-07-05 15:20:00',
    modules: ['reading', 'vocabulary'],
    contentIds: ['group-cet4-reading-core', 'question-cet4-vocabulary-001'],
    changeSummary: '发布四级阅读今日任务模板。',
  }),
  createTaskTemplate({
    id: 'template-cet6-listening-daily',
    name: '六级听力今日任务模板',
    examType: 'CET6',
    priority: 10,
    status: 'draft',
    version: 'V0.3',
    dataVersion: 2,
    updatedAt: '2026-07-07 10:45:00',
    modules: ['listening'],
    contentIds: ['group-cet6-listening-core'],
    changeSummary: '补充六级听力任务项。',
  }),
  createTaskTemplate({
    id: 'template-cet4-empty',
    name: '四级空任务模板',
    examType: 'CET4',
    priority: 20,
    status: 'draft',
    version: 'V0.1',
    dataVersion: 1,
    updatedAt: '2026-07-07 11:05:00',
    modules: ['reading'],
    contentIds: [],
    changeSummary: '用于验证空任务项。',
  }),
  createTaskTemplate({
    id: 'template-cet6-duplicate',
    name: '六级重复任务模板',
    examType: 'CET6',
    priority: 20,
    status: 'rejected',
    version: 'V0.6',
    dataVersion: 4,
    updatedAt: '2026-07-06 18:10:00',
    modules: ['reading', 'reading'],
    contentIds: ['group-cet6-reading-core', 'group-cet6-reading-core'],
    changeSummary: '用于验证重复任务项。',
  }),
  createTaskTemplate({
    id: 'template-cet4-release',
    name: '四级翻译今日任务模板',
    examType: 'CET4',
    priority: 30,
    status: 'pending_publish',
    version: 'V0.9',
    dataVersion: 3,
    updatedAt: '2026-07-07 12:40:00',
    modules: ['translation'],
    contentIds: ['group-cet4-translation-core'],
    changeSummary: '等待发布四级翻译模板。',
  }),
  createTaskTemplate({
    id: 'template-cet6-offline',
    name: '六级写作旧模板',
    examType: 'CET6',
    priority: 40,
    status: 'offline',
    version: 'V1.0',
    dataVersion: 6,
    updatedAt: '2026-07-06 16:00:00',
    modules: ['writing'],
    contentIds: ['group-cet6-writing-offline'],
    changeSummary: '旧写作模板下架。',
  }),
  createTaskTemplate({
    id: 'template-cet6-rollback',
    name: '六级阅读回滚模板',
    examType: 'CET6',
    priority: 50,
    status: 'rolled_back',
    version: 'V1.4',
    dataVersion: 8,
    updatedAt: '2026-07-06 21:00:00',
    modules: ['reading'],
    contentIds: ['group-cet6-reading-core'],
    changeSummary: '回滚到阅读稳定模板。',
  }),
  createTaskTemplate({
    id: 'template-cet4-invalid-ref',
    name: '四级失效引用模板',
    examType: 'CET4',
    priority: 60,
    status: 'draft',
    version: 'V0.1',
    dataVersion: 1,
    updatedAt: '2026-07-07 15:10:00',
    modules: ['reading'],
    contentIds: ['missing-question-001'],
    changeSummary: '用于验证引用不存在。',
  }),
];

const userLearningPathMatches: Record<string, API.UserLearningPathMatchSummary> = {
  'app-user-001': {
    userId: 'app-user-001',
    diagnosisRule: {
      ruleId: 'diagnosis-cet4-reading-core',
      ruleName: '四级阅读薄弱诊断规则',
      version: 'V1.0',
      matchedAt: '2026-07-07 09:20:00',
      weakModules: ['reading'],
      weakLevel: 'medium',
      taskPriority: 'P1',
      status: 'published',
      currentOnline: true,
    },
    todayTaskTemplate: {
      templateId: 'template-cet4-reading-daily',
      templateName: '四级阅读今日任务模板',
      version: 'V1.0',
      matchedAt: '2026-07-07 09:21:00',
      taskItemCount: 2,
      totalEstimatedMinutes: 35,
      status: 'published',
      currentOnline: true,
    },
  },
  'app-user-002': {
    userId: 'app-user-002',
    diagnosisRule: {
      ruleId: 'diagnosis-cet6-reading-rollback',
      ruleName: '六级阅读回滚诊断规则',
      version: 'V1.2',
      matchedAt: '2026-07-06 20:30:00',
      weakModules: ['reading'],
      weakLevel: 'medium',
      taskPriority: 'P1',
      status: 'rolled_back',
      currentOnline: true,
    },
    todayTaskTemplate: {
      templateId: 'template-cet6-rollback',
      templateName: '六级阅读回滚模板',
      version: 'V1.3',
      matchedAt: '2026-07-06 20:31:00',
      taskItemCount: 1,
      totalEstimatedMinutes: 15,
      status: 'rolled_back',
      currentOnline: true,
    },
  },
  'app-user-003': {
    userId: 'app-user-003',
    diagnosisRule: {
      ruleId: 'diagnosis-cet4-reading-offline',
      ruleName: '四级阅读旧版诊断规则',
      version: 'V0.8',
      matchedAt: '2026-07-04 10:00:00',
      weakModules: ['reading'],
      weakLevel: 'medium',
      taskPriority: 'P1',
      status: 'offline',
      currentOnline: false,
    },
  },
  'app-user-004': {
    userId: 'app-user-004',
  },
};

const resolveRoleId = (username?: string): AdminRoleId | undefined => {
  if (!username) return undefined;
  if (loginAliases[username]) return loginAliases[username];
  if (roleConfigs[username as AdminRoleId]) return username as AdminRoleId;
  return undefined;
};

const buildAdminAccount = (
  username: string,
  roleId: AdminRoleId,
  remark?: string,
): API.AdminAccount => {
  const role = roleConfigs[roleId];
  return {
    id: username,
    username,
    displayName: accountDisplayNameMap[username] ?? role.name,
    roleId: role.id,
    roleName: role.name,
    status: accountStatusMap[username] ?? 'enabled',
    dataScopes: role.dataScopes,
    lastLoginAt: accountLastLoginAtMap[username] ?? '-',
    createdAt: accountCreatedAtMap[username] ?? '2026-07-01 09:00:00',
    remark,
  };
};

const buildAdminAccounts = () => [
  ...roleList.map((role) => buildAdminAccount(role.username, role.id)),
  buildAdminAccount('teaching_editor', 'teaching_reviewer', '教研编辑账号，自提交验证样例'),
  buildAdminAccount('teaching_reviewer_2', 'teaching_reviewer', '教研复核账号，自审隔离样例'),
  buildAdminAccount('disabled_admin', 'super_admin', '停用账号登录错误样例'),
];

const roleCanViewUserList = (roleId?: AdminRoleId | '') =>
  Boolean(roleId && ['super_admin', 'customer_support', 'data_analyst'].includes(roleId));

const roleCanViewUserDetail = (roleId?: AdminRoleId | '') =>
  Boolean(roleId && ['super_admin', 'customer_support'].includes(roleId));

const roleCanHandleFeedback = (roleId?: AdminRoleId | '') =>
  Boolean(roleId && roleCanPerformAction(roleId, 'users', 'edit') && roleId !== 'data_analyst');

const roleCanAccessSensitiveUserData = (roleId?: AdminRoleId | '') =>
  Boolean(roleId && ['super_admin', 'customer_support'].includes(roleId));

const buildAllowedUserActions = (roleId?: AdminRoleId | '') => {
  if (!roleId) return [];
  if (roleId === 'super_admin') return ['detail', 'learning', 'feedback', 'sensitive', 'remark', 'feedback_status'];
  if (roleId === 'customer_support') return ['detail', 'learning', 'feedback', 'sensitive', 'remark', 'feedback_status'];
  if (roleId === 'data_analyst') return ['list_read'];
  return [];
};

const buildUserPayload = (
  user: API.AdminUser,
  roleId?: AdminRoleId | '',
  includeDetail = false,
): API.AdminUser => ({
  id: user.id,
  nickname: user.nickname,
  phoneMasked: user.phoneMasked,
  emailMasked: user.emailMasked,
  deviceSummary: user.deviceSummary,
  registerAt: user.registerAt,
  lastActiveAt: user.lastActiveAt,
  examProfile: user.examProfile,
  learningStatus: user.learningStatus,
  currentStudyStatus: user.currentStudyStatus,
  unhandledFeedbackCount: user.unhandledFeedbackCount,
  latestFeedbackStatus: user.latestFeedbackStatus,
  latestHandler: user.latestHandler,
  allowedActions: buildAllowedUserActions(roleId),
  ...(includeDetail
    ? {
        learningRecords: user.learningRecords,
        feedbacks: user.feedbacks?.map((feedback) => ({
          ...feedback,
          originalContent: undefined,
        })),
        aiSummaries: user.aiSummaries?.map((summary) => ({
          ...summary,
          summaryContent: undefined,
        })),
        remarks: user.remarks,
        accessLogs: user.accessLogs,
      }
    : {}),
});

const parseRange = (range: unknown) => {
  if (Array.isArray(range)) return range.map(String);
  if (typeof range === 'string' && range.includes(',')) return range.split(',');
  return [];
};

const filterOperationUsers = (query: Request['query']) => {
  const keyword = getQueryValue(query.keyword)?.trim().toLowerCase();
  const examType = getQueryValue(query.examType);
  const onboardingStatus = getQueryValue(query.onboardingStatus);
  const diagnosisStatus = getQueryValue(query.diagnosisStatus);
  const todayTaskStatus = getQueryValue(query.todayTaskStatus);
  const feedbackStatus = getQueryValue(query.feedbackStatus);
  const lastActiveRange = parseRange(query.lastActiveRange);

  return operationUsersData
    .filter((user) => {
      const privateData = mockUserPrivateData[user.id];
      if (keyword) {
        const haystack = [
          user.id,
          user.nickname,
          privateData.phone,
          privateData.email,
          user.phoneMasked,
          user.emailMasked,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      if (examType && user.examProfile.examType !== examType) return false;
      if (onboardingStatus && user.learningStatus.onboardingStatus !== onboardingStatus) return false;
      if (diagnosisStatus && user.learningStatus.diagnosisStatus !== diagnosisStatus) return false;
      if (todayTaskStatus && user.learningStatus.todayTaskStatus !== todayTaskStatus) return false;
      if (feedbackStatus && user.latestFeedbackStatus !== feedbackStatus) return false;
      if (lastActiveRange.length === 2) {
        const lastActiveTime = new Date(user.lastActiveAt).getTime();
        const start = new Date(lastActiveRange[0]).getTime();
        const end = new Date(lastActiveRange[1]).getTime();
        if (Number.isFinite(start) && lastActiveTime < start) return false;
        if (Number.isFinite(end) && lastActiveTime > end) return false;
      }
      return true;
    })
    .sort((first, second) => {
      const diff = new Date(second.lastActiveAt).getTime() - new Date(first.lastActiveAt).getTime();
      return diff || first.id.localeCompare(second.id);
    });
};

const paginateArray = <T,>(items: T[], query: Request['query']) => {
  const current = Number(getQueryValue(query.current) || 1);
  const pageSize = Number(getQueryValue(query.pageSize) || 20);
  const start = (current - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    total: items.length,
    current,
    pageSize,
  };
};

const getOperationUser = (id: string) =>
  operationUsersData.find((user) => user.id === id);

const getFeedbackById = (user: API.AdminUser, feedbackId: string) =>
  user.feedbacks?.find((feedback) => feedback.id === feedbackId);

const getAiSummaryById = (user: API.AdminUser, summaryId: string) =>
  user.aiSummaries?.find((summary) => summary.id === summaryId);

const recordSensitiveAccess = (
  user: API.AdminUser,
  roleId: AdminRoleId,
  params: API.SensitiveAccessParams,
  result: 'success' | 'denied' | 'failed',
) => {
  const role = roleConfigs[roleId];
  const accessLog: API.UserSensitiveAccessLog = {
    id: `access-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    userId: user.id,
    objectType: params.objectType,
    objectId: params.objectId,
    operator: role.name,
    roleName: role.name,
    sourcePage: params.sourcePage,
    requestedFields: params.requestedFields,
    accessReason: params.accessReason,
    result,
    time: nowText(),
  };
  user.accessLogs = [accessLog, ...(user.accessLogs ?? [])];
  pushOperationAuditLog({
    roleId,
    logType: result === 'success' ? 'sensitive_access' : 'permission_denied',
    action: result === 'success' ? 'read' : 'restricted_access',
    objectType: 'user',
    objectId: params.objectId,
    sourcePage: params.sourcePage,
    reason: params.accessReason,
    result,
    changeSummary: `${role.name} 请求查看 ${params.objectType}，结果：${result}。`,
  });
  return accessLog;
};

const requiredActionByReviewStatus = (
  status: API.ReviewTaskStatus,
): 'submit' | 'approve' | 'publish' | undefined => {
  if (status === 'pending_review') return 'submit';
  if (status === 'approved' || status === 'rejected') return 'approve';
  if (
    status === 'pending_publish' ||
    status === 'published' ||
    status === 'offline' ||
    status === 'rolled_back'
  ) {
    return 'publish';
  }
  return undefined;
};

const validReviewTransitions: Partial<
  Record<API.ReviewTaskStatus, API.ReviewTaskStatus[]>
> = {
  pending_review: ['approved', 'rejected'],
  rejected: ['pending_review'],
  approved: ['pending_publish'],
  pending_publish: ['published'],
  published: ['offline', 'rolled_back'],
  offline: ['rolled_back'],
};

const reviewReasonRequiredStatuses: API.ReviewTaskStatus[] = [
  'rejected',
  'offline',
  'rolled_back',
];

const roleCanOperateReviewTask = (
  roleId: AdminRoleId,
  task: API.ReviewTask,
  nextStatus: API.ReviewTaskStatus,
) => {
  const requiredAction = requiredActionByReviewStatus(nextStatus);
  if (!requiredAction) return false;
  if (!roleCanPerformAction(roleId, 'reviewRelease', requiredAction)) return false;
  if (['approved', 'rejected'].includes(nextStatus) && task.submitterId === currentAccountId) {
    return false;
  }
  if (
    isAiCoachReviewTask(task) &&
    task.riskLevel === 'high' &&
    nextStatus === 'published'
  ) {
    return roleId === 'super_admin' && task.submitterId !== currentAccountId;
  }
  if (roleId === 'super_admin') return true;

  if (roleId === 'teaching_reviewer') {
    return ['question_bank', 'learning_rule', 'learning_path_config', 'writing_translation', 'mock_exam'].includes(
      task.objectType,
    );
  }

  if (roleId === 'ai_operator') {
    return task.objectType === 'ai_coach_strategy';
  }

  if (roleId === 'content_operator') {
    return nextStatus === 'pending_review';
  }

  return false;
};

const pushReviewAuditLog = (
  roleId: AdminRoleId,
  task: API.ReviewTask,
  action: string,
  result: 'success' | 'denied' | 'failed',
  reason: string,
  changeSummary: string,
) => {
  const role = roleConfigs[roleId];
  const operator = getOperator();
  auditLogs.unshift({
    id: `audit-review-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    operator: operator.name,
    roleId: role.id,
    roleName: role.name,
    action: action as any,
    objectType: 'review_release',
    objectId: task.id,
    sourcePage: '/review-release/pending',
    time: nowText(),
    reason,
    result,
    changeSummary,
    objectSubtype: task.objectSubtype,
    version: task.version,
  });
};

const filterReviewTasks = (query: Request['query']) => {
  const keyword = Array.isArray(query.keyword) ? query.keyword[0] : query.keyword;
  const objectType = Array.isArray(query.objectType)
    ? query.objectType[0]
    : query.objectType;
  const status = Array.isArray(query.status) ? query.status[0] : query.status;
  const riskLevel = Array.isArray(query.riskLevel)
    ? query.riskLevel[0]
    : query.riskLevel;

  return [...reviewTasksData]
    .filter((task) => {
      if (
        keyword &&
        ![
          task.id,
          task.objectId,
          task.objectName,
          task.objectSubtype,
          task.changeSummary,
        ].some((value) => String(value ?? '').includes(String(keyword)))
      ) {
        return false;
      }
      if (objectType && task.objectType !== objectType) return false;
      if (status && task.status !== status) return false;
      if (riskLevel && task.riskLevel !== riskLevel) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

const getQueryValue = (value: unknown) =>
  Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');

const paginate = <T,>(items: T[], query: Request['query']) => {
  const current = Number(getQueryValue(query.current) || 1);
  const pageSize = Number(getQueryValue(query.pageSize) || 20);
  const start = (current - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

const filterQuestions = (query: Request['query']) => {
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

const roleCanReadContent = (roleId?: AdminRoleId | '') =>
  Boolean(roleId && roleCanPerformAction(roleId, 'content', 'read'));

const roleCanCreateQuestion = (roleId?: AdminRoleId | '') =>
  Boolean(roleId && roleCanPerformAction(roleId, 'content', 'create'));

const roleCanEditQuestion = (roleId: AdminRoleId | '', question: API.QuestionItem) => {
  if (!roleId || !roleCanPerformAction(roleId, 'content', 'edit')) return false;
  if (roleId === 'super_admin') return ['draft', 'rejected'].includes(question.status);
  if (roleId === 'content_operator') return ['draft', 'rejected'].includes(question.status);
  if (roleId === 'teaching_reviewer') return ['draft', 'rejected'].includes(question.status);
  return false;
};

const roleCanSubmitQuestion = (roleId: AdminRoleId | '', question: API.QuestionItem) =>
  Boolean(
    roleId &&
      roleCanPerformAction(roleId, 'content', 'submit') &&
      ['draft', 'rejected'].includes(question.status),
  );

const normalizeTags = (tags?: string[]) =>
  [...new Set((tags ?? []).map((item) => item.trim()).filter(Boolean))];

const validateQuestionPayload = (body: Partial<API.QuestionSaveParams>) => {
  if (!body.title?.trim()) return '题目标题是必填项。';
  if (!body.stem?.trim()) return '题干是必填项。';
  if (!body.examType || !examTypeLabels[body.examType]) return '考试类型无效。';
  if (!body.questionType || !questionTypeLabels[body.questionType]) return '题型无效。';
  if (!body.skill || !skillLabels[body.skill]) return '所属技能无效。';
  if (!body.difficulty || !difficultyLabels[body.difficulty]) return '难度无效。';
  if (!body.answer || !['A', 'B', 'C', 'D'].includes(body.answer)) return '正确答案无效。';
  if (!body.analysis?.trim()) return '解析是必填项。';

  const optionKeys = ['A', 'B', 'C', 'D'];
  const options = body.options ?? [];
  if (options.length !== 4) return '客观题必须包含 A、B、C、D 四个选项。';
  for (const key of optionKeys) {
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

const buildQuestionFromPayload = (
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
  question.tags = normalizeTags(body.tags);
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
  question.changeSummary = body.changeSummary?.trim() || '更新题目草稿。';
  question.referenceImpact = body.referenceImpact?.trim() || '当前为草稿，尚未影响线上练习。';
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

const pushContentAuditLog = (
  roleId: AdminRoleId,
  action: string,
  result: 'success' | 'denied' | 'failed',
  objectId: string,
  reason: string,
  changeSummary: string,
) => {
  const role = roleConfigs[roleId];
  auditLogs.unshift({
    id: `audit-content-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    operator: role.name,
    roleId: role.id,
    roleName: role.name,
    action: action as any,
    objectType: 'content',
    objectId,
    sourcePage: '/content/questions',
    time: nowText(),
    reason,
    result,
    changeSummary,
  });
};

const buildQuestionReviewTask = (
  question: API.QuestionItem,
  operator: { id: AdminRoleId; name: string },
  changeSummary: string,
) => {
  const now = nowText();
  const existingTask = question.reviewTaskId
    ? reviewTasksData.find((item) => item.id === question.reviewTaskId)
    : reviewTasksData.find((item) => item.objectType === 'question_bank' && item.objectId === question.id);
  const riskLevel: API.ReviewRiskLevel = question.difficulty === 'hard' ? 'high' : 'medium';
  const taskPayload = {
    objectType: 'question_bank' as API.ReviewObjectType,
    objectTypeName: '题库内容',
    objectId: question.id,
    objectName: question.title,
    moduleKey: 'content',
    moduleName: '题库与内容管理',
    submitter: operator.name,
    submittedAt: now,
    version: question.version,
    priority: question.difficulty === 'hard' ? 'P0' as const : 'P1' as const,
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
  reviewTasksData.unshift(task);
  question.reviewTaskId = task.id;
  return task;
};

const syncQuestionFromReviewTask = (
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

const roleCanReadLearningPath = (roleId?: AdminRoleId | '') =>
  Boolean(roleId && roleCanPerformAction(roleId, 'learningPath', 'read'));

const roleCanWriteLearningPath = (roleId?: AdminRoleId | '') =>
  Boolean(
    roleId &&
      ['super_admin', 'teaching_reviewer'].includes(roleId) &&
      roleCanPerformAction(roleId, 'learningPath', 'edit'),
  );

const roleCanSubmitLearningPath = (roleId?: AdminRoleId | '') =>
  Boolean(
    roleId &&
      ['super_admin', 'teaching_reviewer'].includes(roleId) &&
      roleCanPerformAction(roleId, 'learningPath', 'submit'),
  );

const editableLearningPathStatuses: API.LearningPathConfigStatus[] = ['draft', 'rejected'];

const nextLearningPathVersion = (version: string) => {
  const matched = /^V(\d+)\.(\d+)$/.exec(version);
  if (!matched) return 'V0.1';
  return `V${matched[1]}.${Number(matched[2]) + 1}`;
};

const getLearningPathConfig = (id: string) =>
  learningPathConfigsData.find((item) => item.id === id);

const isLearningPathConfig = (task: API.ReviewTask) =>
  task.objectType === 'learning_path_config' || task.objectType === 'learning_rule';

const learningPathKindName = (kind: API.LearningPathConfigKind) =>
  kind === 'diagnosis_rule' ? '诊断规则' : '今日任务模板';

const getConfigSummary = (config: API.LearningPathConfigItem) => {
  if (config.kind === 'diagnosis_rule') {
    return {
      conditionSummary: `${config.conditionGroup.conditions.length} 个判定条件，${config.conditionGroup.mode === 'all' ? '全部满足' : '任意满足'}`,
      outputSummary: `${config.output.weakModules.map((item) => learningPathModuleLabels[item]).join('、')} · ${config.output.weakLevel}`,
      module: config.applicableModule,
    };
  }
  return {
    conditionSummary: `${config.matchedWeakModules.map((item) => learningPathModuleLabels[item]).join('、')} · ${config.weakLevel ?? '-'}`,
    outputSummary: `${config.taskItems.length} 项，${config.totalEstimatedMinutes} 分钟`,
    module: config.matchedWeakModules[0] ?? 'reading',
  };
};

const filterLearningPathConfigs = (query: Request['query']) => {
  const kind = getQueryValue(query.kind) as API.LearningPathConfigKind | '';
  const keyword = getQueryValue(query.keyword).trim().toLowerCase();
  const examType = getQueryValue(query.examType);
  const moduleName = getQueryValue(query.module);
  const status = getQueryValue(query.status);
  const priority = Number(getQueryValue(query.priority) || 0);
  const conditionType = getQueryValue(query.conditionType);
  const totalMinutesMin = Number(getQueryValue(query.totalMinutesMin) || 0);
  const totalMinutesMax = Number(getQueryValue(query.totalMinutesMax) || 0);
  const updatedAtRange = parseRange(query.updatedAtRange);

  return [...learningPathConfigsData]
    .filter((config) => {
      const summary = getConfigSummary(config);
      if (kind && config.kind !== kind) return false;
      if (
        keyword &&
        ![config.id, config.name, config.description, config.changeSummary]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))
      ) {
        return false;
      }
      if (examType && config.examType !== examType) return false;
      if (moduleName && summary.module !== moduleName) return false;
      if (status && config.status !== status) return false;
      if (priority && config.priority !== priority) return false;
      if (conditionType && config.kind === 'today_task_template' && !config.matchedWeakModules.includes(conditionType as API.LearningPathModule)) {
        return false;
      }
      if (config.kind === 'today_task_template') {
        if (totalMinutesMin && config.totalEstimatedMinutes < totalMinutesMin) return false;
        if (totalMinutesMax && config.totalEstimatedMinutes > totalMinutesMax) return false;
      }
      if (updatedAtRange.length === 2) {
        const updatedAt = new Date(config.updatedAt).getTime();
        const start = new Date(updatedAtRange[0]).getTime();
        const end = new Date(updatedAtRange[1]).getTime();
        if (Number.isFinite(start) && updatedAt < start) return false;
        if (Number.isFinite(end) && updatedAt > end) return false;
      }
      return true;
    })
    .sort((first, second) => {
      const diff = new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
      return diff || first.id.localeCompare(second.id);
    });
};

const filterLearningPathReferences = (
  references: API.LearningPathReference[],
  query: Request['query'],
) => {
  const keyword = getQueryValue(query.keyword).trim().toLowerCase();
  const examType = getQueryValue(query.examType);
  const moduleName = getQueryValue(query.module);
  const status = getQueryValue(query.status);

  return references
    .filter((item) => {
      if (keyword && ![item.id, item.name].some((value) => value.toLowerCase().includes(keyword))) return false;
      if (examType && item.examType !== examType) return false;
      if (moduleName && item.module !== moduleName) return false;
      if (status && item.status !== status) return false;
      return true;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
};

const addPrecheckIssue = (
  issues: API.LearningPathPrecheckIssue[],
  level: API.LearningPathPrecheckLevel,
  field: string,
  message: string,
  suggestion: string,
) => {
  issues.push({
    id: `precheck-${field}-${issues.length + 1}`,
    level,
    field,
    message,
    suggestion,
  });
};

const normalizeLearningPathPayload = (
  body: API.LearningPathSaveParams,
  existing?: API.LearningPathConfigItem,
): API.LearningPathConfigItem => {
  const now = nowText();
  const operator = getOperator();
  const base = baseLearningPathConfig({
    id: existing?.id ?? `lp-${body.kind}-${Date.now()}`,
    kind: body.kind,
    name: String(body.name ?? existing?.name ?? '').trim(),
    description: String(body.description ?? existing?.description ?? ''),
    examType: body.examType,
    priority: Number(body.priority ?? existing?.priority ?? 10),
    status: existing?.status ?? 'draft',
    version: existing ? nextLearningPathVersion(existing.version) : 'V0.1',
    dataVersion: (existing?.dataVersion ?? 0) + 1,
    createdBy: existing?.createdBy ?? operator.name,
    createdById: existing?.createdById ?? operator.id,
    updatedBy: operator.name,
    updatedById: operator.id,
    updatedAt: now,
    changeSummary: String(body.changeSummary ?? '保存学习路径配置草稿。').trim(),
    internalRemark: String(body.internalRemark ?? existing?.internalRemark ?? ''),
  });

  if (body.kind === 'diagnosis_rule') {
    const payload = body as Partial<API.DiagnosisRule>;
    const references = (payload.references ?? (existing?.kind === 'diagnosis_rule' ? existing.references : []))
      .map((item) => referenceById(item.id) ?? item);
    return {
      ...base,
      kind: 'diagnosis_rule',
      applicableModule: payload.applicableModule ?? (existing?.kind === 'diagnosis_rule' ? existing.applicableModule : 'reading'),
      userCondition: payload.userCondition ?? defaultUserCondition(body.examType),
      questionRange: payload.questionRange ?? `${examTypeLabels[body.examType]}专项`,
      references,
      conditionGroup:
        payload.conditionGroup ??
        (existing?.kind === 'diagnosis_rule'
          ? existing.conditionGroup
          : {
              mode: 'all',
              conditions: [
                {
                  id: `condition-${Date.now()}`,
                  metric: 'accuracy',
                  operator: 'lt',
                  value: 70,
                  description: '正确率低于阈值。',
                },
              ],
            }),
      output:
        payload.output ??
        (existing?.kind === 'diagnosis_rule'
          ? existing.output
          : defaultDiagnosisOutput('reading', references[0]?.id ?? '')),
    };
  }

  const payload = body as Partial<API.TodayTaskTemplate>;
  const taskItems = payload.taskItems ?? (existing?.kind === 'today_task_template' ? existing.taskItems : []);
  return {
    ...base,
    kind: 'today_task_template',
    userCondition: payload.userCondition ?? defaultUserCondition(body.examType, 'any'),
    matchedDiagnosisRuleId: payload.matchedDiagnosisRuleId ?? (existing?.kind === 'today_task_template' ? existing.matchedDiagnosisRuleId : undefined),
    matchedWeakModules: payload.matchedWeakModules ?? (existing?.kind === 'today_task_template' ? existing.matchedWeakModules : ['reading']),
    weakLevel: payload.weakLevel ?? (existing?.kind === 'today_task_template' ? existing.weakLevel : 'medium'),
    taskItems: taskItems.map((item, index) => ({
      ...item,
      id: item.id || `task-${Date.now()}-${index}`,
      order: Number(item.order || index + 1),
      contentName: referenceById(item.contentId)?.name ?? item.contentName,
    })),
    totalEstimatedMinutes: taskItems.reduce((sum, item) => sum + Number(item.estimatedMinutes || 0), 0),
    replacementAllowed: payload.replacementAllowed ?? (existing?.kind === 'today_task_template' ? existing.replacementAllowed : true),
    templateDescription: payload.templateDescription ?? (existing?.kind === 'today_task_template' ? existing.templateDescription : ''),
  };
};

const precheckLearningPathPayload = (
  payload: API.LearningPathSaveParams,
  existingId?: string,
): API.LearningPathPrecheckResult => {
  const issues: API.LearningPathPrecheckIssue[] = [];

  if (!payload.name?.trim()) {
    addPrecheckIssue(issues, 'error', 'name', '配置名称不能为空。', '填写清晰的规则或模板名称。');
  }
  if (!payload.examType || !examTypeLabels[payload.examType]) {
    addPrecheckIssue(issues, 'error', 'examType', '考试类型无效。', '选择 CET4 或 CET6。');
  }
  if (!Number.isFinite(Number(payload.priority))) {
    addPrecheckIssue(issues, 'error', 'priority', '优先级无效。', '填写数字优先级。');
  }

  const samePriority = learningPathConfigsData.find((item) =>
    item.id !== existingId &&
    item.kind === payload.kind &&
    item.examType === payload.examType &&
    item.priority === Number(payload.priority) &&
    !['offline', 'rolled_back'].includes(item.status),
  );
  if (samePriority) {
    addPrecheckIssue(
      issues,
      'warning',
      'priority',
      `同考试同类型存在同优先级配置：${samePriority.name}。`,
      '确认优先级是否需要调整，或在提交审核前说明冲突原因。',
    );
  }

  if (payload.kind === 'diagnosis_rule') {
    const rule = payload as Partial<API.DiagnosisRule>;
    if (!rule.conditionGroup?.conditions?.length) {
      addPrecheckIssue(issues, 'error', 'conditionGroup', '诊断判定条件为空。', '至少添加一个结构化判定条件。');
    }
    for (const condition of rule.conditionGroup?.conditions ?? []) {
      if (condition.operator === 'between' && Number(condition.min) > Number(condition.max)) {
        addPrecheckIssue(issues, 'error', 'conditionGroup', '判定条件最小值大于最大值。', '调整数值范围。');
      }
      if (condition.metric === 'accuracy' && ((condition.value ?? condition.min ?? 0) < 0 || (condition.value ?? condition.max ?? 0) > 100)) {
        addPrecheckIssue(issues, 'error', 'conditionGroup', '正确率必须在 0 到 100 之间。', '修正正确率阈值。');
      }
    }
    if (!rule.output?.weakModules?.length || !rule.output.outputDescription?.trim()) {
      addPrecheckIssue(issues, 'error', 'output', '输出结果不完整。', '补充薄弱模块、等级和输出说明。');
    }
    if (!rule.references?.length) {
      addPrecheckIssue(issues, 'error', 'references', '未绑定题目或题组引用。', '至少绑定一个有效题目或题组。');
    }
    for (const reference of rule.references ?? []) {
      const current = referenceById(reference.id);
      if (!current) {
        addPrecheckIssue(issues, 'error', 'references', `引用对象不存在：${reference.id}。`, '移除失效引用或重新选择。');
        continue;
      }
      if (!current.available) {
        addPrecheckIssue(issues, 'warning', 'references', `引用对象当前不可用：${current.name}。`, '提交审核前建议替换为已发布内容。');
      }
      if (current.examType !== payload.examType) {
        addPrecheckIssue(issues, 'error', 'references', `引用对象考试类型不一致：${current.name}。`, '选择同考试类型内容。');
      }
    }
  }

  if (payload.kind === 'today_task_template') {
    const template = payload as Partial<API.TodayTaskTemplate>;
    if (!template.taskItems?.length) {
      addPrecheckIssue(issues, 'error', 'taskItems', '今日任务模板至少需要一个任务项。', '添加题目或题组任务项。');
    }
    const orders = new Set<number>();
    const contentIds = new Set<string>();
    for (const item of template.taskItems ?? []) {
      if (orders.has(Number(item.order))) {
        addPrecheckIssue(issues, 'error', 'taskItems', `任务顺序重复：${item.order}。`, '调整任务项顺序。');
      }
      orders.add(Number(item.order));
      if (Number(item.estimatedMinutes) <= 0) {
        addPrecheckIssue(issues, 'error', 'taskItems', `任务项 ${item.contentName} 预计分钟无效。`, '预计分钟必须大于 0。');
      }
      if (contentIds.has(item.contentId)) {
        addPrecheckIssue(issues, 'warning', 'taskItems', `重复绑定内容：${item.contentName}。`, '确认是否需要重复练习同一内容。');
      }
      contentIds.add(item.contentId);
      const reference = referenceById(item.contentId);
      if (!reference) {
        addPrecheckIssue(issues, 'error', 'taskItems', `绑定内容不存在：${item.contentId}。`, '重新选择有效内容。');
        continue;
      }
      if (!reference.available) {
        addPrecheckIssue(issues, 'warning', 'taskItems', `绑定内容当前不可用：${reference.name}。`, '提交审核前建议替换。');
      }
      if (reference.examType !== payload.examType) {
        addPrecheckIssue(issues, 'error', 'taskItems', `绑定内容考试类型不一致：${reference.name}。`, '选择同考试类型内容。');
      }
    }
    const total = (template.taskItems ?? []).reduce((sum, item) => sum + Number(item.estimatedMinutes || 0), 0);
    if (total > 120) {
      addPrecheckIssue(issues, 'warning', 'totalEstimatedMinutes', '任务总时长超过 120 分钟。', '确认是否拆分为轻量任务。');
    }
    if (!template.matchedWeakModules?.length && !template.matchedDiagnosisRuleId) {
      addPrecheckIssue(issues, 'error', 'userCondition', '适用条件为空。', '选择命中诊断规则或薄弱模块。');
    }
  }

  const level: API.LearningPathPrecheckLevel = issues.some((item) => item.level === 'error')
    ? 'error'
    : issues.some((item) => item.level === 'warning')
      ? 'warning'
      : 'passed';

  return {
    id: `precheck-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    configId: existingId,
    level,
    checkedAt: nowText(),
    issues,
    summary: level === 'passed' ? '预校验通过。' : `预校验发现 ${issues.length} 个问题。`,
  };
};

const pushLearningPathAuditLog = (
  roleId: AdminRoleId,
  action: string,
  result: 'success' | 'denied' | 'failed',
  config: Pick<API.LearningPathConfigItem, 'id' | 'kind' | 'status' | 'version'>,
  reason: string,
  changeSummary: string,
  nextStatus?: API.LearningPathConfigStatus,
) => {
  pushOperationAuditLog({
    roleId,
    action,
    objectType: 'learning_path_config',
    objectSubtype: config.kind,
    objectId: config.id,
    sourcePage: '/learning-path/diagnosis-rules',
    reason,
    result,
    changeSummary,
    originalStatus: config.status,
    newStatus: nextStatus,
    version: config.version,
  });
};

const buildLearningPathReviewTask = (
  config: API.LearningPathConfigItem,
  operator: ReturnType<typeof getOperator>,
  changeSummary: string,
) => {
  const now = nowText();
  const existingTask = config.reviewTaskId
    ? reviewTasksData.find((item) => item.id === config.reviewTaskId)
    : reviewTasksData.find((item) => isLearningPathConfig(item) && item.objectId === config.id);
  const taskPayload = {
    objectType: 'learning_path_config' as API.ReviewObjectType,
    objectSubtype: config.kind,
    objectTypeName: learningPathKindName(config.kind),
    objectId: config.id,
    objectName: config.name,
    moduleKey: 'learningPath',
    moduleName: '学习路径配置',
    submitterId: operator.id,
    submitter: operator.name,
    submittedAt: now,
    version: config.version,
    priority: config.priority <= 10 ? 'P0' as const : config.priority <= 30 ? 'P1' as const : 'P2' as const,
    status: 'pending_review' as API.ReviewTaskStatus,
    riskLevel: config.priority <= 10 ? 'high' as const : 'medium' as const,
    updatedAt: now,
    changeSummary,
    impactScope: config.kind === 'diagnosis_rule'
      ? `影响 ${examTypeLabels[config.examType]} ${learningPathModuleLabels[config.applicableModule]} 诊断输出。`
      : `影响 ${examTypeLabels[config.examType]} 今日任务模板。`,
    reviewOpinion: '',
    reviewerId: '',
    reviewer: '',
    releasePlan: '审核通过后进入待发布队列。',
    rollbackTargetVersion: config.version,
  };

  if (existingTask) {
    Object.assign(existingTask, taskPayload);
    existingTask.versionRecords.unshift({
      id: `version-${existingTask.id}-${Date.now()}`,
      version: config.version,
      status: 'pending_review',
      summary: changeSummary,
      createdBy: operator.name,
      createdAt: now,
    });
    existingTask.operationRecords.unshift({
      id: `op-${existingTask.id}-${Date.now()}`,
      operator: operator.name,
      roleName: operator.roleName,
      action: '提交审核',
      fromStatus: config.status,
      toStatus: 'pending_review',
      reason: changeSummary,
      time: now,
    });
    config.reviewTaskId = existingTask.id;
    return existingTask;
  }

  const task: API.ReviewTask = {
    id: `review-learning-path-${Date.now()}`,
    ...taskPayload,
    versionRecords: [
      {
        id: `version-learning-path-${config.id}-${Date.now()}`,
        version: config.version,
        status: 'pending_review',
        summary: changeSummary,
        createdBy: operator.name,
        createdAt: now,
      },
    ],
    operationRecords: [
      {
        id: `op-learning-path-${config.id}-${Date.now()}`,
        operator: operator.name,
        roleName: operator.roleName,
        action: '提交审核',
        fromStatus: config.status,
        toStatus: 'pending_review',
        reason: changeSummary,
        time: now,
      },
    ],
  };
  reviewTasksData.unshift(task);
  config.reviewTaskId = task.id;
  return task;
};

const syncLearningPathFromReviewTask = (
  task: API.ReviewTask,
  previousStatus: API.ReviewTaskStatus,
  nextStatus: API.ReviewTaskStatus,
  operator: ReturnType<typeof getOperator>,
  reason: string,
) => {
  if (!isLearningPathConfig(task)) return;
  const config = getLearningPathConfig(task.objectId);
  if (!config) return;
  if (nextStatus === 'published' && config.status === 'published') return;
  const now = task.updatedAt;
  config.status = nextStatus;
  config.updatedBy = operator.name;
  config.updatedById = operator.id;
  config.updatedAt = now;
  config.reviewTaskId = task.id;
  config.dataVersion += 1;
  if (nextStatus === 'published') {
    config.releaseVersionId = `${config.id}-${config.version}`;
    config.versionRecords.forEach((item) => {
      item.currentOnline = false;
    });
  }
  config.operationRecords.unshift({
    id: `lp-op-${config.id}-${Date.now()}`,
    operator: operator.name,
    roleName: operator.roleName,
    action: reviewStatusActionMap[nextStatus],
    fromStatus: previousStatus,
    toStatus: nextStatus,
    reason,
    time: now,
  });
  config.versionRecords.unshift({
    id: `lp-version-${config.id}-${Date.now()}`,
    configId: config.id,
    kind: config.kind,
    version: config.version,
    status: nextStatus,
    createdBy: operator.name,
    createdAt: now,
    changeSummary: `${reviewStatusActionMap[nextStatus]}：${task.changeSummary}`,
    reviewer: operator.name,
    reviewResult: reviewStatusActionMap[nextStatus],
    publishedAt: nextStatus === 'published' ? now : undefined,
    publishedBy: nextStatus === 'published' ? operator.name : undefined,
    currentOnline: nextStatus === 'published',
  });
  Object.values(userLearningPathMatches).forEach((match) => {
    if (match.diagnosisRule?.ruleId === config.id) {
      match.diagnosisRule.status = nextStatus;
      match.diagnosisRule.currentOnline = nextStatus === 'published' || nextStatus === 'rolled_back';
    }
    if (match.todayTaskTemplate?.templateId === config.id) {
      match.todayTaskTemplate.status = nextStatus;
      match.todayTaskTemplate.currentOnline = nextStatus === 'published' || nextStatus === 'rolled_back';
    }
  });
};

const copyLearningPathConfigAsDraft = (config: API.LearningPathConfigItem) => {
  const operator = getOperator();
  const now = nowText();
  const copied = structuredClone(config) as API.LearningPathConfigItem;
  copied.id = `${config.id}-draft-${Date.now()}`;
  copied.name = `${config.name} 新草稿`;
  copied.status = 'draft';
  copied.version = nextLearningPathVersion(config.version);
  copied.dataVersion = 1;
  copied.createdBy = operator.name;
  copied.createdById = operator.id;
  copied.createdAt = now;
  copied.updatedBy = operator.name;
  copied.updatedById = operator.id;
  copied.updatedAt = now;
  copied.reviewTaskId = undefined;
  copied.releaseVersionId = undefined;
  copied.changeSummary = `基于 ${config.version} 创建新草稿。`;
  copied.lastPrecheck = undefined;
  copied.versionRecords = [
    {
      id: `lp-version-copy-${Date.now()}`,
      configId: copied.id,
      kind: copied.kind,
      version: copied.version,
      status: 'draft',
      createdBy: operator.name,
      createdAt: now,
      changeSummary: copied.changeSummary,
      currentOnline: false,
    },
  ];
  copied.operationRecords = [
    {
      id: `lp-op-copy-${Date.now()}`,
      operator: operator.name,
      roleName: operator.roleName,
      action: '复制配置',
      toStatus: 'draft',
      reason: copied.changeSummary,
      time: now,
    },
  ];
  learningPathConfigsData.unshift(copied);
  return copied;
};

const buildUserLearningPathMatch = (userId: string) => {
  const existing = userLearningPathMatches[userId] ?? { userId };
  const diagnosisConfig = existing.diagnosisRule ? getLearningPathConfig(existing.diagnosisRule.ruleId) : undefined;
  const templateConfig = existing.todayTaskTemplate ? getLearningPathConfig(existing.todayTaskTemplate.templateId) : undefined;
  return {
    ...existing,
    diagnosisRule: existing.diagnosisRule
      ? {
          ...existing.diagnosisRule,
          status: diagnosisConfig?.status ?? existing.diagnosisRule.status,
          currentOnline: diagnosisConfig?.status === 'published' || diagnosisConfig?.status === 'rolled_back',
        }
      : undefined,
    todayTaskTemplate: existing.todayTaskTemplate
      ? {
          ...existing.todayTaskTemplate,
          status: templateConfig?.status ?? existing.todayTaskTemplate.status,
          currentOnline: templateConfig?.status === 'published' || templateConfig?.status === 'rolled_back',
        }
    : undefined,
  };
};

const analyticsSectionLabels: Record<API.AnalyticsVisibleSection, string> = {
  users: '用户增长与活跃',
  learningPath: '学习路径漏斗',
  content: '题库与内容',
  reviewRelease: '审核发布',
  feedback: '客服反馈',
  aiCoach: 'AI 陪练占位',
  writingTranslation: '写译批改占位',
  mockExam: '模考占位',
  audit: '风险与审计摘要',
};

const analyticsModuleSectionMap: Record<API.AnalyticsModule, API.AnalyticsVisibleSection[]> = {
  all: ['users', 'learningPath', 'content', 'reviewRelease', 'feedback', 'aiCoach', 'writingTranslation', 'mockExam', 'audit'],
  users: ['users'],
  learningPath: ['learningPath'],
  content: ['content'],
  reviewRelease: ['reviewRelease'],
  feedback: ['feedback'],
  aiCoach: ['aiCoach'],
  writingTranslation: ['writingTranslation'],
  mockExam: ['mockExam'],
  audit: ['audit'],
};

const roleAnalyticsSections: Record<AdminRoleId, API.AnalyticsVisibleSection[]> = {
  super_admin: analyticsModuleSectionMap.all,
  content_operator: ['content', 'reviewRelease'],
  teaching_reviewer: ['users', 'learningPath', 'content', 'reviewRelease', 'writingTranslation'],
  ai_operator: ['users', 'reviewRelease', 'aiCoach', 'writingTranslation'],
  customer_support: ['users', 'feedback'],
  data_analyst: analyticsModuleSectionMap.all,
  read_only_auditor: ['reviewRelease', 'audit'],
};

const analyticsPlaceholderSnapshots: API.AnalyticsModuleSnapshot[] = [
  {
    id: 'aiCoach',
    name: 'AI 陪练',
    value: 86,
    displayValue: '86',
    unit: '次 Mock 会话',
    status: 'placeholder',
    description: '基础占位指标，完整 AI 业务模块尚未建设。',
    visible: true,
  },
  {
    id: 'writingTranslation',
    name: '写译批改',
    value: 42,
    displayValue: '42',
    unit: '次 Mock 提交',
    status: 'placeholder',
    description: '完整模块尚未建设，仅展示结构占位。',
    visible: true,
  },
  {
    id: 'mockExam',
    name: '模考',
    value: 18,
    displayValue: '18',
    unit: '人 Mock 开始',
    status: 'placeholder',
    description: '基础占位指标，不参与顶部核心指标。',
    visible: true,
  },
];

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateOnly = (value: string) => value.slice(0, 10);

const parseDateTime = (value?: string) => {
  if (!value) return undefined;
  const time = new Date(value.replace(/-/g, '/')).getTime();
  return Number.isFinite(time) ? time : undefined;
};

const startOfDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return date.getTime();
};

const endOfDate = (value: string) => {
  const date = new Date(`${value}T23:59:59`);
  return date.getTime();
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const percentValue = (numerator: number, denominator: number) =>
  denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(1)) : undefined;

const displayNumber = (value?: number) =>
  value === undefined || !Number.isFinite(value) ? '--' : value.toLocaleString('zh-CN');

const displayPercent = (value?: number) =>
  value === undefined || !Number.isFinite(value) ? '--' : value.toFixed(1);

const displayMinutes = (value?: number) =>
  value === undefined || !Number.isFinite(value) ? '--' : `${value.toFixed(1)} 分钟`;

const metricCard = (params: {
  id: string;
  title: string;
  value?: number;
  unit: string;
  type: API.AnalyticsMetricType;
  timeSemantic: API.AnalyticsMetricTimeSemantic;
  direction: API.AnalyticsMetricDirection;
  section: API.AnalyticsVisibleSection;
  tooltip: string;
  updatedAt: string;
  comparisonValue?: number;
  jumpTo?: string;
}) => {
  const isRate = params.type === 'rate';
  const displayValue = isRate ? displayPercent(params.value) : displayNumber(params.value);
  const rate =
    params.value !== undefined && params.comparisonValue !== undefined && params.comparisonValue !== 0
      ? Number((((params.value - params.comparisonValue) / Math.abs(params.comparisonValue)) * 100).toFixed(1))
      : undefined;
  return {
    id: params.id,
    title: params.title,
    value: params.value,
    displayValue,
    unit: params.unit,
    type: params.type,
    timeSemantic: params.timeSemantic,
    direction: params.direction,
    comparison: {
      value: params.comparisonValue,
      rate,
      label: '较上一周期',
      available: params.comparisonValue !== undefined,
    },
    tooltip: params.tooltip,
    updatedAt: params.updatedAt,
    section: params.section,
    jumpTo: params.jumpTo,
  } satisfies API.AnalyticsMetricCard;
};

const analyticsRoleSections = (roleId: AdminRoleId, module: API.AnalyticsModule) => {
  const allowed = roleAnalyticsSections[roleId] ?? [];
  const requested = analyticsModuleSectionMap[module] ?? analyticsModuleSectionMap.all;
  return allowed.filter((section) => requested.includes(section));
};

const roleCanReadAnalytics = (roleId?: AdminRoleId | '') =>
  Boolean(roleId && roleCanPerformAction(roleId, 'analytics', 'read'));

const roleCanExportAnalytics = (roleId?: AdminRoleId | '') =>
  Boolean(roleId && roleCanPerformAction(roleId, 'analytics', 'export'));

const analyticsFilters = (query: Request['query']) => {
  const today = new Date();
  const defaultEnd = formatDate(today);
  const defaultStart = formatDate(addDays(today, -29));
  const startDate = getQueryValue(query.startDate) || defaultStart;
  const endDate = getQueryValue(query.endDate) || defaultEnd;
  const examType = (getQueryValue(query.examType) || 'all') as API.ExamType | 'all';
  const module = (getQueryValue(query.module) || 'all') as API.AnalyticsModule;
  const explicitGranularity = getQueryValue(query.granularity) as API.AnalyticsGranularity | '';
  const start = startOfDate(startDate);
  const end = endOfDate(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return {
      error: '日期范围无效，请检查开始日期和结束日期。',
      filters: undefined,
    };
  }
  const days = Math.max(1, Math.ceil((end - start) / 86_400_000));
  const granularity: API.AnalyticsGranularity =
    explicitGranularity || (days <= 30 ? 'day' : days <= 90 ? 'week' : 'month');
  return {
    error: '',
    filters: {
      startDate,
      endDate,
      examType,
      granularity,
      module,
    },
  };
};

const inRange = (value: string | undefined, filters: API.AnalyticsOverview['filters'], offsetDays = 0) => {
  const time = parseDateTime(value);
  if (time === undefined) return false;
  const start = startOfDate(filters.startDate) + offsetDays * 86_400_000;
  const end = endOfDate(filters.endDate) + offsetDays * 86_400_000;
  return time >= start && time <= end;
};

const beforeOrAtEnd = (value: string | undefined, filters: API.AnalyticsOverview['filters']) => {
  const time = parseDateTime(value);
  return time !== undefined && time <= endOfDate(filters.endDate);
};

const sameExam = (examType: API.ExamType | 'all', itemExam?: API.ExamType) =>
  examType === 'all' || itemExam === examType;

const bucketStart = (dateText: string, granularity: API.AnalyticsGranularity) => {
  const date = new Date(`${dateOnly(dateText)}T00:00:00`);
  if (granularity === 'month') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  if (granularity === 'week') {
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    return formatDate(date);
  }
  return formatDate(date);
};

const buildBuckets = (filters: API.AnalyticsOverview['filters']) => {
  const buckets: string[] = [];
  const cursor = new Date(`${filters.startDate}T00:00:00`);
  const end = new Date(`${filters.endDate}T00:00:00`);
  while (cursor <= end) {
    buckets.push(bucketStart(formatDate(cursor), filters.granularity));
    if (filters.granularity === 'month') {
      cursor.setMonth(cursor.getMonth() + 1);
    } else if (filters.granularity === 'week') {
      cursor.setDate(cursor.getDate() + 7);
    } else {
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return [...new Set(buckets)];
};

const countBy = <T,>(items: T[], getKey: (item: T) => string) =>
  Object.entries(
    items.reduce<Record<string, number>>((acc, item) => {
      const key = getKey(item) || '未知';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([label, value]) => ({ label, value }));

const taskExamType = (task: API.ReviewTask): API.ExamType | undefined => {
  const question = questionData.find((item) => item.id === task.objectId);
  if (question) return question.examType;
  const config = learningPathConfigsData.find((item) => item.id === task.objectId);
  return config?.examType;
};

const buildAnalyticsOverview = (
  roleId: AdminRoleId,
  filters: API.AnalyticsOverview['filters'],
  query: Request['query'],
) => {
  const updatedAt = nowText();
  const visibleSections = analyticsRoleSections(roleId, filters.module);
  const sectionErrors: API.AnalyticsSectionError[] = [];
  const dataQualityIssues: API.AnalyticsDataQualityIssue[] = [];
  const simulatedSection = getQueryValue(query.simulateSectionError) as API.AnalyticsVisibleSection;
  const simulateEmpty = getQueryValue(query.simulateEmpty) === 'true';
  if (simulatedSection && visibleSections.includes(simulatedSection)) {
    sectionErrors.push({
      section: simulatedSection,
      level: 'error',
      message: `${analyticsSectionLabels[simulatedSection]}聚合模拟失败，其他区块继续返回。`,
    });
    pushOperationAuditLog({
      roleId,
      action: 'analytics_section_failed',
      objectType: 'analytics',
      objectId: simulatedSection,
      sourcePage: '/analytics/overview',
      reason: '模拟单一区块聚合失败。',
      result: 'failed',
      changeSummary: `${analyticsSectionLabels[simulatedSection]}区块聚合失败，接口按部分成功返回。`,
    });
  }

  const users = simulateEmpty
    ? []
    : operationUsersData.filter((user) => sameExam(filters.examType, user.examProfile.examType));
  const registeredUsers = users.filter((user) => beforeOrAtEnd(user.registerAt, filters));
  const previousDays = Math.max(1, Math.ceil((endOfDate(filters.endDate) - startOfDate(filters.startDate)) / 86_400_000));
  const previousOffset = -previousDays;
  const newUsers = users.filter((user) => inRange(user.registerAt, filters)).length;
  const previousNewUsers = users.filter((user) => inRange(user.registerAt, filters, previousOffset)).length;
  const activeUserIds = new Set<string>();
  const previousActiveUserIds = new Set<string>();
  users.forEach((user) => {
    if (inRange(user.lastActiveAt, filters) || (user.learningRecords ?? []).some((record) => inRange(record.date, filters))) {
      activeUserIds.add(user.id);
    }
    if (inRange(user.lastActiveAt, filters, previousOffset) || (user.learningRecords ?? []).some((record) => inRange(record.date, filters, previousOffset))) {
      previousActiveUserIds.add(user.id);
    }
  });
  const onboardingCompleted = registeredUsers.filter((user) => user.learningStatus.onboardingStatus === 'completed').length;
  const diagnosisCompleted = registeredUsers.filter((user) => user.learningStatus.diagnosisStatus === 'completed').length;
  const startedTaskUsers = registeredUsers.filter((user) => user.learningStatus.todayTaskStatus !== 'not_started').length;
  const completedTaskUsers = registeredUsers.filter((user) => user.learningStatus.todayTaskStatus === 'completed').length;
  const previousCompletedTaskUsers = users.filter((user) => inRange(user.learningStatus.lastStudyAt, filters, previousOffset) && user.learningStatus.todayTaskStatus === 'completed').length;
  const onboardingRate = percentValue(onboardingCompleted, registeredUsers.length);
  const diagnosisRate = percentValue(diagnosisCompleted, onboardingCompleted);
  const taskCompletionRate = percentValue(completedTaskUsers, startedTaskUsers);

  const buckets = buildBuckets(filters);
  const trendRows: API.AnalyticsTrendPoint[] = buckets.flatMap((date) => {
    const bucketUsers = users.filter((user) => bucketStart(user.registerAt, filters.granularity) === date && inRange(user.registerAt, filters));
    const bucketActive = users.filter((user) =>
      (bucketStart(user.lastActiveAt, filters.granularity) === date && inRange(user.lastActiveAt, filters)) ||
      (user.learningRecords ?? []).some((record) => bucketStart(record.date, filters.granularity) === date && inRange(record.date, filters)),
    );
    const bucketCompleted = users.filter((user) => bucketStart(user.learningStatus.lastStudyAt, filters.granularity) === date && inRange(user.learningStatus.lastStudyAt, filters) && user.learningStatus.todayTaskStatus === 'completed');
    return [
      { date, metric: '新增用户', value: bucketUsers.length },
      { date, metric: '活跃用户', value: new Set(bucketActive.map((user) => user.id)).size },
      { date, metric: '完成今日任务', value: bucketCompleted.length },
    ];
  });

  const matchSummaries = registeredUsers.map((user) => buildUserLearningPathMatch(user.id));
  const matchedRuleUsers = matchSummaries.filter((item) => item.diagnosisRule).length;
  const matchedTemplateUsers = matchSummaries.filter((item) => item.todayTaskTemplate).length;
  const funnelCounts = [
    onboardingCompleted,
    diagnosisCompleted,
    matchedRuleUsers,
    matchedTemplateUsers,
    startedTaskUsers,
    completedTaskUsers,
  ];
  const funnelSteps = ['已完成 Onboarding', '已完成诊断', '命中诊断规则', '匹配今日任务模板', '开始今日任务', '完成今日任务'];
  const learningPathFunnel = funnelSteps.map((step, index) => {
    const count = funnelCounts[index] ?? 0;
    const previous = index === 0 ? count : funnelCounts[index - 1] ?? 0;
    if (index > 0 && count > previous) {
      dataQualityIssues.push({
        id: `dq-funnel-${index}`,
        section: 'learningPath',
        level: 'warning',
        message: `${step}人数大于上一漏斗步骤，保留原始聚合结果。`,
        metricId: 'learning_path_funnel',
      });
    }
    return {
      step,
      count,
      previousRate: index === 0 ? 100 : percentValue(count, previous),
      totalRate: percentValue(count, funnelCounts[0] ?? 0),
      source: '用户状态、学习路径匹配摘要和学习记录',
    };
  });
  const matchedTemplates = matchSummaries.map((item) => item.todayTaskTemplate).filter(Boolean) as NonNullable<API.UserLearningPathMatchSummary['todayTaskTemplate']>[];
  const avgEstimatedMinutes = matchedTemplates.length > 0
    ? Number((matchedTemplates.reduce((sum, item) => sum + item.totalEstimatedMinutes, 0) / matchedTemplates.length).toFixed(1))
    : undefined;
  const publishedRules = learningPathConfigsData.filter((item) => item.kind === 'diagnosis_rule' && item.status === 'published' && sameExam(filters.examType, item.examType)).length;
  const publishedTemplates = learningPathConfigsData.filter((item) => item.kind === 'today_task_template' && item.status === 'published' && sameExam(filters.examType, item.examType)).length;

  const questions = simulateEmpty ? [] : questionData.filter((item) => sameExam(filters.examType, item.examType));
  const contentObjects = [
    ...questions.map((item) => ({ status: item.status, examType: item.examType, type: '题目' })),
    ...questionGroupReferences.filter((item) => sameExam(filters.examType, item.examType)).map((item) => ({ status: item.status, examType: item.examType, type: '题组' })),
  ];
  const contentStatusDistribution = countBy(contentObjects, (item) => reviewStatusActionMap[item.status as API.ReviewTaskStatus] ?? String(item.status));
  const contentReviewTasks = reviewTasksData.filter((task) => task.objectType === 'question_bank' && sameExam(filters.examType, taskExamType(task)));
  const approvedContentReviews = contentReviewTasks.filter((task) => task.status === 'approved' && inRange(task.updatedAt, filters)).length;
  const rejectedContentReviews = contentReviewTasks.filter((task) => task.status === 'rejected' && inRange(task.updatedAt, filters)).length;
  const contentApprovalRate = percentValue(approvedContentReviews, approvedContentReviews + rejectedContentReviews);

  const filteredReviewTasks = simulateEmpty ? [] : reviewTasksData.filter((task) => sameExam(filters.examType, taskExamType(task)));
  const intervalTasks = filteredReviewTasks.filter((task) => inRange(task.updatedAt, filters));
  const reviewStats: API.AnalyticsReviewStats = {
    pendingReview: filteredReviewTasks.filter((task) => task.status === 'pending_review').length,
    approved: intervalTasks.filter((task) => task.status === 'approved').length,
    rejected: intervalTasks.filter((task) => task.status === 'rejected').length,
    pendingRelease: filteredReviewTasks.filter((task) => task.status === 'pending_publish').length,
    published: intervalTasks.filter((task) => task.status === 'published').length,
    offline: intervalTasks.filter((task) => task.status === 'offline').length,
    rolledBack: intervalTasks.filter((task) => task.status === 'rolled_back').length,
    publishFailed: auditLogs.filter((item) => String(item.action) === '发布' && item.result === 'failed' && inRange(item.time, filters)).length,
    rollbackFailed: auditLogs.filter((item) => String(item.action) === '回滚' && item.result === 'failed' && inRange(item.time, filters)).length,
  };
  const closedReviewTasks = intervalTasks.filter((task) => ['approved', 'rejected'].includes(task.status));
  const reviewDurations = closedReviewTasks
    .map((task) => {
      const start = parseDateTime(task.submittedAt);
      const end = parseDateTime(task.updatedAt);
      if (start === undefined || end === undefined) {
        dataQualityIssues.push({ id: `dq-review-date-${task.id}`, section: 'reviewRelease', level: 'warning', message: `审核任务 ${task.id} 缺少时间字段。`, metricId: 'average_review_minutes' });
        return undefined;
      }
      if (end < start) {
        dataQualityIssues.push({ id: `dq-review-negative-${task.id}`, section: 'reviewRelease', level: 'error', message: `审核任务 ${task.id} 审核结束时间早于提交时间。`, metricId: 'average_review_minutes' });
        return undefined;
      }
      return (end - start) / 60_000;
    })
    .filter((item): item is number => item !== undefined);
  reviewStats.averageReviewMinutes = reviewDurations.length > 0 ? Number((reviewDurations.reduce((sum, item) => sum + item, 0) / reviewDurations.length).toFixed(1)) : undefined;
  const pendingReviewHours = filteredReviewTasks
    .filter((task) => task.status === 'pending_review')
    .map((task) => {
      const start = parseDateTime(task.submittedAt);
      return start === undefined ? undefined : (endOfDate(filters.endDate) - start) / 3_600_000;
    })
    .filter((item): item is number => item !== undefined);
  reviewStats.longestPendingReviewHours = pendingReviewHours.length > 0 ? Number(Math.max(...pendingReviewHours).toFixed(1)) : undefined;
  reviewStats.averagePendingReleaseMinutes = undefined;

  const usersWithFeedback = simulateEmpty ? [] : users;
  const allFeedbacks = usersWithFeedback.flatMap((user) =>
    (user.feedbacks ?? []).map((feedback) => ({
      feedback,
      examType: user.examProfile.examType,
    })),
  );
  const intervalFeedbacks = allFeedbacks.filter(({ feedback }) => inRange(feedback.submittedAt, filters));
  const handledFeedbacks = allFeedbacks.filter(({ feedback }) => ['resolved', 'no_action'].includes(feedback.status) && inRange(feedback.updatedAt, filters));
  const closedFeedbacks = allFeedbacks.filter(({ feedback }) => feedback.status === 'closed' && inRange(feedback.updatedAt, filters));
  const pendingFeedback = allFeedbacks.filter(({ feedback }) => feedback.status === 'pending').length;
  const processingFeedback = allFeedbacks.filter(({ feedback }) => feedback.status === 'processing').length;
  const feedbackDurations = handledFeedbacks
    .map(({ feedback }) => {
      const start = parseDateTime(feedback.submittedAt);
      const end = parseDateTime(feedback.updatedAt);
      if (start === undefined || end === undefined) {
        dataQualityIssues.push({ id: `dq-feedback-date-${feedback.id}`, section: 'feedback', level: 'warning', message: `反馈 ${feedback.id} 缺少处理时间字段。`, metricId: 'feedback_average_handle_hours' });
        return undefined;
      }
      if (end < start) {
        dataQualityIssues.push({ id: `dq-feedback-negative-${feedback.id}`, section: 'feedback', level: 'error', message: `反馈 ${feedback.id} 处理时间为负。`, metricId: 'feedback_average_handle_hours' });
        return undefined;
      }
      return (end - start) / 3_600_000;
    })
    .filter((item): item is number => item !== undefined);
  const feedbackStats: API.AnalyticsFeedbackStats = {
    newFeedback: intervalFeedbacks.length,
    pending: pendingFeedback,
    processing: processingFeedback,
    resolved: allFeedbacks.filter(({ feedback }) => feedback.status === 'resolved').length,
    noAction: allFeedbacks.filter(({ feedback }) => feedback.status === 'no_action').length,
    closed: allFeedbacks.filter(({ feedback }) => feedback.status === 'closed').length,
    handled: handledFeedbacks.length,
    closeRate: percentValue(closedFeedbacks.length, intervalFeedbacks.length),
    averageHandleHours: feedbackDurations.length > 0 ? Number((feedbackDurations.reduce((sum, item) => sum + item, 0) / feedbackDurations.length).toFixed(1)) : undefined,
    overdue24h: allFeedbacks.filter(({ feedback }) => feedback.status === 'pending' && parseDateTime(feedback.submittedAt) !== undefined && endOfDate(filters.endDate) - (parseDateTime(feedback.submittedAt) ?? 0) > 86_400_000).length,
    p0Feedback: intervalFeedbacks.filter(({ feedback }) => feedback.priority === 'P0').length,
  };

  const learningPathMetrics = [
    metricCard({ id: 'diagnosis_completion_rate', title: '诊断完成率', value: diagnosisRate, unit: '%', type: 'rate', timeSemantic: 'snapshot', direction: 'positive', section: 'learningPath', tooltip: '完成诊断用户数 / 完成 Onboarding 用户数。', updatedAt }),
    metricCard({ id: 'rule_hit_rate', title: '规则命中率', value: percentValue(matchedRuleUsers, diagnosisCompleted), unit: '%', type: 'rate', timeSemantic: 'snapshot', direction: 'positive', section: 'learningPath', tooltip: '命中诊断规则用户数 / 完成诊断用户数。', updatedAt }),
    metricCard({ id: 'task_template_match_rate', title: '任务模板匹配率', value: percentValue(matchedTemplateUsers, matchedRuleUsers), unit: '%', type: 'rate', timeSemantic: 'snapshot', direction: 'positive', section: 'learningPath', tooltip: '匹配今日任务模板用户数 / 命中诊断规则用户数。', updatedAt }),
    metricCard({ id: 'average_task_minutes', title: '平均任务预计分钟', value: avgEstimatedMinutes, unit: '分钟', type: 'duration', timeSemantic: 'snapshot', direction: 'neutral', section: 'learningPath', tooltip: '用户匹配到的今日任务模板预计分钟均值。', updatedAt }),
    metricCard({ id: 'published_diagnosis_rules', title: '已发布诊断规则', value: publishedRules, unit: '条', type: 'count', timeSemantic: 'snapshot', direction: 'positive', section: 'learningPath', tooltip: '当前状态为已发布的诊断规则数。', updatedAt, jumpTo: '/learning-path/diagnosis-rules' }),
    metricCard({ id: 'published_task_templates', title: '已发布任务模板', value: publishedTemplates, unit: '条', type: 'count', timeSemantic: 'snapshot', direction: 'positive', section: 'learningPath', tooltip: '当前状态为已发布的今日任务模板数。', updatedAt, jumpTo: '/learning-path/diagnosis-rules?tab=today_task_template' }),
  ];

  const contentMetrics = [
    metricCard({ id: 'question_total', title: '题目总数', value: questions.length, unit: '题', type: 'count', timeSemantic: 'snapshot', direction: 'positive', section: 'content', tooltip: '当前题库题目总数，来自题库共享 Mock 数据。', updatedAt, jumpTo: '/content/questions' }),
    metricCard({ id: 'published_questions', title: '已发布题目', value: questions.filter((item) => item.status === 'published').length, unit: '题', type: 'count', timeSemantic: 'snapshot', direction: 'positive', section: 'content', tooltip: '当前状态为已发布的题目数。', updatedAt, jumpTo: '/content/questions?status=published' }),
    metricCard({ id: 'pending_questions', title: '待审核题目', value: questions.filter((item) => item.status === 'pending_review').length, unit: '题', type: 'count', timeSemantic: 'snapshot', direction: 'risk', section: 'content', tooltip: '当前状态为待审核的题目数。', updatedAt, jumpTo: '/content/questions?status=pending_review' }),
    metricCard({ id: 'rejected_questions', title: '已驳回题目', value: questions.filter((item) => item.status === 'rejected').length, unit: '题', type: 'count', timeSemantic: 'snapshot', direction: 'risk', section: 'content', tooltip: '当前状态为已驳回的题目数。', updatedAt }),
    metricCard({ id: 'recent_new_questions', title: '最近新增题目', value: questions.filter((item) => inRange(item.createdAt, filters)).length, unit: '题', type: 'count', timeSemantic: 'interval', direction: 'positive', section: 'content', tooltip: '筛选时间范围内 createdAt 落入范围的题目数。', updatedAt }),
    metricCard({ id: 'content_review_approval_rate', title: '内容审核通过率', value: contentApprovalRate, unit: '%', type: 'rate', timeSemantic: 'interval', direction: 'positive', section: 'content', tooltip: '审核通过数量 /（审核通过数量 + 审核驳回数量）。', updatedAt }),
  ];

  const summaryCards = [
    metricCard({ id: 'new_users', title: '新增用户', value: newUsers, comparisonValue: previousNewUsers, unit: '人', type: 'count', timeSemantic: 'interval', direction: 'positive', section: 'users', tooltip: '筛选时间范围内 registerAt 落入范围的用户数。', updatedAt, jumpTo: '/users/list' }),
    metricCard({ id: 'active_users', title: '区间活跃用户', value: activeUserIds.size, comparisonValue: previousActiveUserIds.size, unit: '人', type: 'count', timeSemantic: 'interval', direction: 'positive', section: 'users', tooltip: '筛选时间范围内存在学习行为或 lastActiveAt 落入范围的去重用户数。', updatedAt }),
    metricCard({ id: 'onboarding_rate', title: 'Onboarding 完成率', value: onboardingRate, unit: '%', type: 'rate', timeSemantic: 'snapshot', direction: 'positive', section: 'users', tooltip: '完成 Onboarding 的有效用户数 / 有效注册用户数。', updatedAt }),
    metricCard({ id: 'today_task_completion_rate', title: '今日任务完成率', value: taskCompletionRate, comparisonValue: percentValue(previousCompletedTaskUsers, Math.max(previousActiveUserIds.size, 1)), unit: '%', type: 'rate', timeSemantic: 'snapshot', direction: 'positive', section: 'users', tooltip: '完成今日任务用户数 / 已开始今日任务用户数。', updatedAt }),
    metricCard({ id: 'pending_review_tasks', title: '当前待审核任务', value: reviewStats.pendingReview, unit: '项', type: 'count', timeSemantic: 'snapshot', direction: 'risk', section: 'reviewRelease', tooltip: '当前审核任务状态为待审核的任务数。', updatedAt, jumpTo: '/review-release/pending?status=pending_review' }),
    metricCard({ id: 'pending_feedback', title: '当前待处理反馈', value: feedbackStats.pending, unit: '条', type: 'count', timeSemantic: 'snapshot', direction: 'risk', section: 'feedback', tooltip: '当前状态为待处理的反馈数。', updatedAt, jumpTo: '/users/list?feedbackStatus=pending' }),
    metricCard({ id: 'published_content', title: '当前已发布内容', value: contentObjects.filter((item) => item.status === 'published').length, unit: '项', type: 'count', timeSemantic: 'snapshot', direction: 'positive', section: 'content', tooltip: '题目和已实现题组中当前状态为已发布的对象数。', updatedAt, jumpTo: '/content/questions?status=published' }),
    metricCard({ id: 'review_rollback_count', title: '区间回滚数', value: reviewStats.rolledBack, unit: '次', type: 'count', timeSemantic: 'interval', direction: 'risk', section: 'reviewRelease', tooltip: '筛选时间范围内审核任务状态变为已回滚的数量。', updatedAt }),
  ].filter((card) => visibleSections.includes(card.section));

  const moduleSnapshots: API.AnalyticsModuleSnapshot[] = [
    { id: 'users', name: '用户', value: registeredUsers.length, displayValue: displayNumber(registeredUsers.length), unit: '人', status: 'formal', description: '来自用户共享 Mock 数据。', visible: visibleSections.includes('users'), jumpTo: '/users/list' },
    { id: 'learningPath', name: '学习路径', value: publishedRules + publishedTemplates, displayValue: displayNumber(publishedRules + publishedTemplates), unit: '条已发布配置', status: 'formal', description: '来自学习路径配置共享 Mock 数据。', visible: visibleSections.includes('learningPath'), jumpTo: '/learning-path/diagnosis-rules' },
    { id: 'content', name: '题库与内容', value: contentObjects.length, displayValue: displayNumber(contentObjects.length), unit: '项内容对象', status: 'formal', description: '来自题库和题组共享 Mock 数据。', visible: visibleSections.includes('content'), jumpTo: '/content/questions' },
    { id: 'reviewRelease', name: '审核发布', value: filteredReviewTasks.length, displayValue: displayNumber(filteredReviewTasks.length), unit: '项审核任务', status: 'formal', description: '来自审核发布共享 Mock 数据。', visible: visibleSections.includes('reviewRelease'), jumpTo: '/review-release/pending' },
    { id: 'feedback', name: '客服反馈', value: allFeedbacks.length, displayValue: displayNumber(allFeedbacks.length), unit: '条反馈', status: 'formal', description: '来自用户反馈共享 Mock 数据，不含反馈原文。', visible: visibleSections.includes('feedback'), jumpTo: '/users/list?feedbackStatus=pending' },
    ...analyticsPlaceholderSnapshots.map((item) => ({ ...item, visible: visibleSections.includes(item.id) })),
  ];

  if ([registeredUsers.length, onboardingCompleted, startedTaskUsers].some((value) => value === 0)) {
    dataQualityIssues.push({
      id: 'dq-zero-denominator',
      section: 'users',
      level: 'warning',
      message: '部分比例指标分母为 0，页面按规则显示 --。',
      metricId: 'ratio_metrics',
    });
  }
  if (learningPathConfigsData.some((config) => !config.updatedAt)) {
    dataQualityIssues.push({
      id: 'dq-learning-missing-date',
      section: 'learningPath',
      level: 'warning',
      message: '存在学习路径配置缺少更新时间，受影响快照指标显示 --。',
    });
  }
  dataQualityIssues.forEach((issue) => {
    pushOperationAuditLog({
      roleId,
      action: 'analytics_data_quality',
      objectType: 'analytics',
      objectId: issue.metricId ?? issue.section,
      sourcePage: '/analytics/overview',
      reason: issue.message,
      result: issue.level === 'error' ? 'failed' : 'success',
      changeSummary: `运营数据质量提示：${issue.message}`,
    });
  });

  const response: API.AnalyticsOverview = {
    filters,
    summaryCards,
    userTrend: visibleSections.includes('users') && !sectionErrors.some((item) => item.section === 'users') ? trendRows : [],
    userDistributions: {
      examType: countBy(registeredUsers, (user) => user.examProfile.examType),
      onboardingStatus: countBy(registeredUsers, (user) => onboardingStatusLabels[user.learningStatus.onboardingStatus]),
      diagnosisStatus: countBy(registeredUsers, (user) => diagnosisStatusLabels[user.learningStatus.diagnosisStatus]),
      todayTaskStatus: countBy(registeredUsers, (user) => taskStatusLabels[user.learningStatus.todayTaskStatus]),
    },
    learningPathFunnel,
    learningPathMetrics,
    contentStatusDistribution,
    contentMetrics,
    reviewReleaseStats: reviewStats,
    reviewRiskItems: [
      { label: '待审核超过 24 小时', value: pendingReviewHours.filter((item) => item > 24).length },
      { label: '待发布超过 24 小时', value: filteredReviewTasks.filter((task) => task.status === 'pending_publish' && parseDateTime(task.updatedAt) !== undefined && endOfDate(filters.endDate) - (parseDateTime(task.updatedAt) ?? 0) > 86_400_000).length },
      { label: '发布失败', value: reviewStats.publishFailed },
      { label: '回滚失败', value: reviewStats.rollbackFailed },
      { label: '状态不一致任务', value: dataQualityIssues.filter((item) => item.section === 'reviewRelease').length },
    ],
    feedbackStats,
    feedbackDistributions: {
      status: countBy(allFeedbacks, ({ feedback }) => feedbackStatusLabels[feedback.status]),
      type: countBy(allFeedbacks, ({ feedback }) => feedback.type),
      relatedModule: countBy(allFeedbacks, ({ feedback }) => feedback.relatedModule),
    },
    moduleSnapshots,
    sectionErrors,
    dataQualityIssues,
    visibleSections,
    updatedAt,
    dataSources: ([
      { section: 'users', source: 'operationUsersData、learningRecords', formal: true },
      { section: 'learningPath', source: 'learningPathConfigsData、userLearningPathMatches、learningRecords', formal: true },
      { section: 'content', source: 'questionData、questionGroupReferences、reviewTasksData', formal: true },
      { section: 'reviewRelease', source: 'reviewTasksData、auditLogs', formal: true },
      { section: 'feedback', source: 'operationUsersData.feedbacks', formal: true },
      { section: 'aiCoach', source: '固定 Mock 占位指标', formal: false },
      { section: 'writingTranslation', source: '固定 Mock 占位指标', formal: false },
      { section: 'mockExam', source: '固定 Mock 占位指标', formal: false },
      { section: 'audit', source: 'auditLogs 聚合摘要', formal: true },
    ] as API.AnalyticsDataSource[]).filter((item) => visibleSections.includes(item.section)),
  };
  response.sectionErrors = sectionErrors;
  return response;
};

const dashboardSectionLabels: Record<API.DashboardVisibleSection, string> = {
  welcome: '欢迎区',
  todos: '今日待办',
  risks: '超时和高风险提醒',
  metrics: '今日关键指标',
  quickActions: '快捷入口',
  moduleSnapshots: '模块状态摘要',
  recentActivities: '最近处理记录',
  aiPlaceholder: 'AI 占位摘要',
};

const dashboardTodoTypeLabels: Record<API.DashboardTodoType, string> = {
  pending_review: '待审核',
  pending_publish: '待发布',
  rejected_content: '驳回待修改',
  pending_feedback: '待处理反馈',
  stale_feedback: '反馈超时',
  learning_path_precheck_error: '预校验阻断',
  learning_path_rejected: '学习路径驳回',
  ai_strategy_pending_review: 'AI 策略待审核',
  ai_strategy_pending_publish: 'AI 策略待发布',
  ai_strategy_rejected: 'AI 策略驳回',
  ai_strategy_precheck_error: 'AI 预校验阻断',
  ai_strategy_high_risk_publish: 'AI 高风险发布',
  ai_strategy_release_failed: 'AI 发布失败',
  ai_strategy_rollback_failed: 'AI 回滚失败',
  publish_failed: '发布失败',
  rollback_failed: '回滚失败',
  high_risk_audit: '高风险审计',
  permission_denied: '权限异常',
  ai_placeholder: 'AI 占位提醒',
};

const dashboardPriorityRank: Record<API.DashboardTodoPriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

const dashboardRiskLevelRank: Record<API.DashboardRiskLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const dashboardOverdueThresholdHours: Record<API.DashboardTodoType, number> = {
  pending_review: 24,
  pending_publish: 24,
  rejected_content: 48,
  pending_feedback: 24,
  stale_feedback: 48,
  learning_path_precheck_error: 24,
  learning_path_rejected: 48,
  ai_strategy_pending_review: 24,
  ai_strategy_pending_publish: 24,
  ai_strategy_rejected: 48,
  ai_strategy_precheck_error: 12,
  ai_strategy_high_risk_publish: 0,
  ai_strategy_release_failed: 0,
  ai_strategy_rollback_failed: 0,
  publish_failed: 0,
  rollback_failed: 0,
  high_risk_audit: 0,
  permission_denied: 2,
  ai_placeholder: 24,
};

const dashboardRoleSections: Record<AdminRoleId, API.DashboardVisibleSection[]> = {
  super_admin: ['welcome', 'todos', 'risks', 'metrics', 'quickActions', 'moduleSnapshots', 'recentActivities'],
  content_operator: ['welcome', 'todos', 'metrics', 'quickActions', 'moduleSnapshots', 'recentActivities'],
  teaching_reviewer: ['welcome', 'todos', 'risks', 'metrics', 'quickActions', 'moduleSnapshots', 'recentActivities'],
  ai_operator: ['welcome', 'todos', 'risks', 'metrics', 'quickActions', 'moduleSnapshots', 'recentActivities', 'aiPlaceholder'],
  customer_support: ['welcome', 'todos', 'risks', 'metrics', 'quickActions', 'moduleSnapshots', 'recentActivities'],
  data_analyst: ['welcome', 'metrics', 'quickActions', 'moduleSnapshots'],
  read_only_auditor: ['welcome', 'todos', 'risks', 'metrics', 'quickActions', 'moduleSnapshots', 'recentActivities'],
};

const dashboardRoleTodoTypes: Record<AdminRoleId, API.DashboardTodoType[]> = {
  super_admin: ['pending_review', 'pending_publish', 'rejected_content', 'pending_feedback', 'stale_feedback', 'learning_path_precheck_error', 'learning_path_rejected', 'ai_strategy_pending_review', 'ai_strategy_pending_publish', 'ai_strategy_rejected', 'ai_strategy_precheck_error', 'ai_strategy_high_risk_publish', 'ai_strategy_release_failed', 'ai_strategy_rollback_failed', 'publish_failed', 'rollback_failed', 'permission_denied'],
  content_operator: ['pending_review', 'pending_publish', 'rejected_content', 'publish_failed', 'rollback_failed'],
  teaching_reviewer: ['pending_review', 'pending_publish', 'rejected_content', 'learning_path_precheck_error', 'learning_path_rejected', 'publish_failed', 'rollback_failed'],
  ai_operator: ['ai_strategy_pending_review', 'ai_strategy_pending_publish', 'ai_strategy_rejected', 'ai_strategy_precheck_error', 'ai_strategy_high_risk_publish', 'ai_strategy_release_failed', 'ai_strategy_rollback_failed', 'publish_failed', 'rollback_failed'],
  customer_support: ['pending_feedback', 'stale_feedback', 'permission_denied'],
  data_analyst: [],
  read_only_auditor: ['permission_denied', 'publish_failed', 'rollback_failed', 'ai_strategy_pending_review', 'ai_strategy_pending_publish', 'ai_strategy_high_risk_publish'],
};

const dashboardSourceModuleLabels: Record<string, string> = {
  dashboard: '工作台',
  users: '用户管理',
  content: '题库与内容管理',
  learningPath: '学习路径配置',
  aiCoach: 'AI 陪练管理',
  writingTranslation: '写译批改管理',
  mockExam: '模考管理',
  analytics: '运营数据',
  reviewRelease: '审核发布',
  system: '权限与系统设置',
};

const reviewStatusLabels: Record<API.ReviewTaskStatus, string> = {
  draft: '草稿',
  pending_review: '待审核',
  rejected: '已驳回',
  approved: '已通过',
  pending_publish: '待发布',
  published: '已发布',
  offline: '已下架',
  rolled_back: '已回滚',
};

const dashboardRouteModuleMap: { prefix: string; module: AdminModuleKey }[] = [
  { prefix: '/dashboard', module: 'dashboard' },
  { prefix: '/users', module: 'users' },
  { prefix: '/content', module: 'content' },
  { prefix: '/learning-path', module: 'learningPath' },
  { prefix: '/ai-coach', module: 'aiCoach' },
  { prefix: '/writing-translation', module: 'writingTranslation' },
  { prefix: '/mock-exam', module: 'mockExam' },
  { prefix: '/analytics', module: 'analytics' },
  { prefix: '/review-release', module: 'reviewRelease' },
  { prefix: '/system', module: 'system' },
];

const routeModule = (route: string) =>
  dashboardRouteModuleMap.find((item) => route.startsWith(item.prefix))?.module;

const canReadRoute = (roleId: AdminRoleId, route: string) => {
  const module = routeModule(route);
  return Boolean(module && roleCanPerformAction(roleId, module, 'read'));
};

const dashboardHoursSince = (value: string, nowMs = Date.now()) => {
  const start = parseDateTime(value);
  if (start === undefined) return 0;
  return Math.max(0, Number(((nowMs - start) / 3_600_000).toFixed(1)));
};

const dashboardWaitText = (hours: number) =>
  hours < 1 ? `${Math.round(hours * 60)} 分钟` : `${hours.toFixed(1)} 小时`;

const dashboardTodayRange = () => {
  const today = formatDate(new Date());
  const yesterday = formatDate(addDays(new Date(`${today}T00:00:00`), -1));
  return {
    today,
    todayStart: startOfDate(today),
    todayEnd: endOfDate(today),
    yesterdayStart: startOfDate(yesterday),
    yesterdayEnd: endOfDate(yesterday),
  };
};

const isInTimeRange = (value: string, start: number, end: number) => {
  const time = parseDateTime(value);
  return time !== undefined && time >= start && time <= end;
};

const dashboardMetric = (params: {
  id: string;
  title: string;
  value?: number;
  previousValue?: number;
  unit: string;
  type: API.DashboardMetricType;
  timeSemantic: 'today' | 'snapshot';
  direction: 'positive' | 'risk' | 'neutral';
  tooltip: string;
  targetRoute?: string;
}): API.DashboardMetric => ({
  id: params.id,
  title: params.title,
  value: params.value,
  displayValue: params.type === 'rate' ? displayPercent(params.value) : displayNumber(params.value),
  unit: params.unit,
  type: params.type,
  timeSemantic: params.timeSemantic,
  direction: params.direction,
  comparison:
    params.previousValue === undefined
      ? { available: false, label: '较昨日' }
      : {
          available: true,
          value: Number(((params.value ?? 0) - params.previousValue).toFixed(1)),
          label: '较昨日',
        },
  tooltip: params.tooltip,
  targetRoute: params.targetRoute,
});

const dashboardReviewTaskRoute = (task: API.ReviewTask) => ({
  targetRoute: '/review-release/pending',
  targetQuery: { keyword: task.id, status: task.status },
});

const dashboardLearningPathRoute = (config: API.LearningPathConfigItem) => ({
  targetRoute: config.kind === 'today_task_template'
    ? `/learning-path/task-templates/${config.id}`
    : `/learning-path/diagnosis-rules/${config.id}`,
  targetQuery: { tab: config.kind },
});

const dashboardTodoCanHandle = (
  roleId: AdminRoleId,
  todoType: API.DashboardTodoType,
  sourceModule: AdminModuleKey,
  task?: API.ReviewTask,
) => {
  if (todoType === 'pending_review' && task) return roleCanOperateReviewTask(roleId, task, 'approved');
  if (todoType === 'pending_publish' && task) return roleCanOperateReviewTask(roleId, task, 'published');
  if (todoType === 'ai_strategy_pending_review' && task) return roleCanOperateReviewTask(roleId, task, 'approved');
  if (todoType === 'ai_strategy_pending_publish' && task) return roleCanOperateReviewTask(roleId, task, 'published');
  if (todoType === 'ai_strategy_high_risk_publish' && task) return roleCanOperateReviewTask(roleId, task, 'published');
  if (todoType === 'ai_strategy_rejected' || todoType === 'ai_strategy_precheck_error') {
    return roleCanPerformAction(roleId, 'aiCoach', 'edit');
  }
  if (todoType === 'ai_strategy_release_failed' || todoType === 'ai_strategy_rollback_failed') {
    return roleCanPerformAction(roleId, 'reviewRelease', 'publish');
  }
  if (todoType === 'rejected_content') {
    return sourceModule === 'learningPath'
      ? roleCanPerformAction(roleId, 'learningPath', 'submit')
      : roleCanPerformAction(roleId, 'content', 'submit');
  }
  if (todoType === 'pending_feedback' || todoType === 'stale_feedback') return roleCanHandleFeedback(roleId);
  if (todoType === 'learning_path_precheck_error' || todoType === 'learning_path_rejected') {
    return roleCanPerformAction(roleId, 'learningPath', 'edit');
  }
  if (todoType === 'publish_failed' || todoType === 'rollback_failed') return roleCanPerformAction(roleId, 'reviewRelease', 'publish');
  if (todoType === 'permission_denied') return roleCanPerformAction(roleId, 'system', 'config');
  return false;
};

const createDashboardTodo = (params: {
  type: API.DashboardTodoType;
  title: string;
  objectType: string;
  objectId: string;
  priority: API.DashboardTodoPriority;
  status: string;
  statusLabel: string;
  createdAt: string;
  owner: string;
  sourceModule: AdminModuleKey;
  targetRoute: string;
  targetQuery?: Record<string, string>;
  description: string;
  roleId: AdminRoleId;
  task?: API.ReviewTask;
  riskLevel?: API.DashboardRiskLevel;
}): API.DashboardTodoItem => {
  const waitHours = dashboardHoursSince(params.createdAt);
  const threshold = dashboardOverdueThresholdHours[params.type];
  const overdue = threshold === 0 || waitHours >= threshold;
  const canHandle = dashboardTodoCanHandle(params.roleId, params.type, params.sourceModule, params.task);
  return {
    id: `todo-${params.type}-${params.objectId}`,
    type: params.type,
    typeName: dashboardTodoTypeLabels[params.type],
    title: params.title,
    objectType: params.objectType,
    objectId: params.objectId,
    priority: params.priority,
    status: params.status,
    statusLabel: params.statusLabel,
    createdAt: params.createdAt,
    waitHours,
    waitText: dashboardWaitText(waitHours),
    owner: params.owner,
    sourceModule: params.sourceModule,
    sourceModuleName: dashboardSourceModuleLabels[params.sourceModule],
    targetRoute: params.targetRoute,
    targetQuery: params.targetQuery,
    canHandle,
    handleActionLabel: canHandle ? '处理' : '查看',
    overdue,
    riskLevel: params.riskLevel,
    description: params.description,
  };
};

const buildDashboardTodoCandidates = (roleId: AdminRoleId) => {
  const todos: API.DashboardTodoItem[] = [];
  for (const task of reviewTasksData) {
    if (task.status === 'pending_review' || task.status === 'pending_publish') {
      const route = dashboardReviewTaskRoute(task);
      const type =
        task.objectType === 'ai_coach_strategy'
          ? task.status === 'pending_review'
            ? 'ai_strategy_pending_review'
            : task.riskLevel === 'high'
              ? 'ai_strategy_high_risk_publish'
              : 'ai_strategy_pending_publish'
          : task.status === 'pending_review'
            ? 'pending_review'
            : 'pending_publish';
      todos.push(createDashboardTodo({
        type,
        title: task.objectName,
        objectType: task.objectTypeName,
        objectId: task.id,
        priority: task.priority as API.DashboardTodoPriority,
        status: task.status,
        statusLabel: reviewStatusLabels[task.status],
        createdAt: task.status === 'pending_review' ? task.submittedAt : task.updatedAt,
        owner: task.status === 'pending_review' ? task.submitter : task.reviewer || task.submitter,
        sourceModule: 'reviewRelease',
        targetRoute: route.targetRoute,
        targetQuery: route.targetQuery,
        description: `${task.moduleName}，版本 ${task.version}。`,
        roleId,
        task,
        riskLevel: task.riskLevel === 'high' ? 'high' : task.riskLevel === 'medium' ? 'medium' : 'low',
      }));
    }
  }

  aiCoachDashboardTodoSources().forEach((strategy) => {
    if (strategy.status === 'pending_review' || strategy.status === 'pending_publish') return;
    const type: API.DashboardTodoType =
      strategy.lastPrecheck?.level === 'error'
        ? 'ai_strategy_precheck_error'
        : strategy.status === 'rejected'
          ? 'ai_strategy_rejected'
          : 'ai_strategy_release_failed';
    todos.push(createDashboardTodo({
      type,
      title: strategy.title,
      objectType: aiCoachConfigTypeLabels[strategy.configType],
      objectId: strategy.id,
      priority: strategy.riskLevel === 'high' ? 'P0' : 'P1',
      status: strategy.status,
      statusLabel: reviewStatusLabels[strategy.status],
      createdAt: strategy.updatedAt,
      owner: strategy.updatedBy,
      sourceModule: 'aiCoach',
      targetRoute: `/ai-coach/prompts/${strategy.id}`,
      description: `${aiCoachConfigTypeLabels[strategy.configType]}，场景 ${strategy.businessScenes
        .map((item) => aiCoachBusinessSceneLabels[item])
        .join('、')}。`,
      roleId,
      riskLevel: strategy.riskLevel,
    }));
  });

  questionData.filter((item) => item.status === 'rejected').forEach((question) => {
    todos.push(createDashboardTodo({
      type: 'rejected_content',
      title: question.title,
      objectType: '题库内容',
      objectId: question.id,
      priority: 'P2',
      status: question.status,
      statusLabel: '已驳回',
      createdAt: question.updatedAt,
      owner: question.creator,
      sourceModule: 'content',
      targetRoute: '/content/questions',
      targetQuery: { keyword: question.id, status: 'rejected' },
      description: question.changeSummary,
      roleId,
      riskLevel: 'medium',
    }));
  });

  learningPathConfigsData.filter((item) => item.status === 'rejected').forEach((config) => {
    const route = dashboardLearningPathRoute(config);
    todos.push(createDashboardTodo({
      type: 'learning_path_rejected',
      title: config.name,
      objectType: config.kind === 'diagnosis_rule' ? '诊断规则' : '今日任务模板',
      objectId: config.id,
      priority: 'P1',
      status: config.status,
      statusLabel: '已驳回',
      createdAt: config.updatedAt,
      owner: config.updatedBy,
      sourceModule: 'learningPath',
      targetRoute: route.targetRoute,
      targetQuery: route.targetQuery,
      description: config.changeSummary,
      roleId,
      riskLevel: 'medium',
    }));
  });

  learningPathConfigsData.forEach((config) => {
    const precheck = precheckLearningPathPayload(config as API.LearningPathSaveParams, config.id);
    if (precheck.level !== 'error') return;
    const route = dashboardLearningPathRoute(config);
    todos.push(createDashboardTodo({
      type: 'learning_path_precheck_error',
      title: config.name,
      objectType: config.kind === 'diagnosis_rule' ? '诊断规则' : '今日任务模板',
      objectId: config.id,
      priority: 'P1',
      status: config.status,
      statusLabel: reviewStatusLabels[config.status as API.ReviewTaskStatus] ?? config.status,
      createdAt: config.updatedAt,
      owner: config.updatedBy,
      sourceModule: 'learningPath',
      targetRoute: route.targetRoute,
      targetQuery: route.targetQuery,
      description: precheck.issues.find((item) => item.level === 'error')?.message ?? precheck.summary,
      roleId,
      riskLevel: 'medium',
    }));
  });

  operationUsersData.forEach((user) => {
    (user.feedbacks ?? []).forEach((feedback) => {
      if (feedback.status === 'pending') {
        todos.push(createDashboardTodo({
          type: 'pending_feedback',
          title: `${user.nickname}：${feedback.summary}`,
          objectType: '用户反馈',
          objectId: feedback.id,
          priority: feedback.priority,
          status: feedback.status,
          statusLabel: feedbackStatusLabels[feedback.status],
          createdAt: feedback.submittedAt,
          owner: feedback.handler ?? '未分配',
          sourceModule: 'users',
          targetRoute: '/users/list',
          targetQuery: { keyword: user.id, feedbackStatus: 'pending' },
          description: `${feedback.type}，${feedback.relatedModule}。`,
          roleId,
          riskLevel: feedback.priority === 'P0' ? 'high' : feedback.priority === 'P1' ? 'medium' : 'low',
        }));
      }
      if (feedback.status === 'processing' && dashboardHoursSince(feedback.updatedAt) >= dashboardOverdueThresholdHours.stale_feedback) {
        todos.push(createDashboardTodo({
          type: 'stale_feedback',
          title: `${user.nickname}：${feedback.summary}`,
          objectType: '用户反馈',
          objectId: feedback.id,
          priority: feedback.priority === 'P0' ? 'P0' : 'P1',
          status: feedback.status,
          statusLabel: feedbackStatusLabels[feedback.status],
          createdAt: feedback.updatedAt,
          owner: feedback.handler ?? '客服',
          sourceModule: 'users',
          targetRoute: '/users/list',
          targetQuery: { keyword: user.id, feedbackStatus: 'processing' },
          description: '处理中反馈长时间未更新。',
          roleId,
          riskLevel: feedback.priority === 'P0' ? 'high' : 'medium',
        }));
      }
    });
  });

  auditLogs.forEach((item) => {
    if (item.result === 'failed' && String(item.action).includes('发布')) {
      todos.push(createDashboardTodo({
        type: 'publish_failed',
        title: item.changeSummary,
        objectType: item.objectType,
        objectId: item.id,
        priority: 'P0',
        status: item.result,
        statusLabel: '失败',
        createdAt: item.time,
        owner: item.operator,
        sourceModule: 'reviewRelease',
        targetRoute: '/review-release/pending',
        targetQuery: { keyword: item.objectId },
        description: item.reason,
        roleId,
        riskLevel: 'high',
      }));
    }
    if (item.result === 'failed' && String(item.action).includes('回滚')) {
      todos.push(createDashboardTodo({
        type: 'rollback_failed',
        title: item.changeSummary,
        objectType: item.objectType,
        objectId: item.id,
        priority: 'P0',
        status: item.result,
        statusLabel: '失败',
        createdAt: item.time,
        owner: item.operator,
        sourceModule: 'reviewRelease',
        targetRoute: '/review-release/pending',
        targetQuery: { keyword: item.objectId },
        description: item.reason,
        roleId,
        riskLevel: 'high',
      }));
    }
    if (item.logType === 'permission_denied' || item.action === 'restricted_access') {
      todos.push(createDashboardTodo({
        type: 'permission_denied',
        title: item.changeSummary,
        objectType: item.objectType,
        objectId: item.id,
        priority: 'P1',
        status: item.result,
        statusLabel: '已拒绝',
        createdAt: item.time,
        owner: item.operator,
        sourceModule: 'system',
        targetRoute: '/system/accounts',
        targetQuery: { logType: 'permission_denied' },
        description: item.reason,
        roleId,
        riskLevel: 'medium',
      }));
    }
  });

  return todos;
};

const filterDashboardTodos = (
  roleId: AdminRoleId,
  todos: API.DashboardTodoItem[],
  filters: API.DashboardFilterParams,
) => {
  const allowedTypes = new Set(dashboardRoleTodoTypes[roleId]);
  return todos
    .filter((todo) => allowedTypes.has(todo.type))
    .filter((todo) => canReadRoute(roleId, todo.targetRoute))
    .filter((todo) => !filters.todoType || filters.todoType === 'all' || todo.type === filters.todoType)
    .filter((todo) => !filters.priority || filters.priority === 'all' || todo.priority === filters.priority)
    .sort((first, second) => {
      const priorityDiff = dashboardPriorityRank[first.priority] - dashboardPriorityRank[second.priority];
      if (priorityDiff) return priorityDiff;
      if (first.overdue !== second.overdue) return first.overdue ? -1 : 1;
      const waitDiff = second.waitHours - first.waitHours;
      if (waitDiff) return waitDiff;
      const timeDiff = (parseDateTime(second.createdAt) ?? 0) - (parseDateTime(first.createdAt) ?? 0);
      return timeDiff || first.id.localeCompare(second.id);
    });
};

const buildDashboardRisks = (roleId: AdminRoleId, todos: API.DashboardTodoItem[]) => {
  const riskItems: API.DashboardRiskItem[] = todos
    .filter((todo) => ['P0', 'P1'].includes(todo.priority) || todo.overdue)
    .map((todo) => ({
      id: `risk-${todo.id}`,
      type: todo.type === 'learning_path_precheck_error'
        ? 'precheck_blocked'
        : todo.type === 'publish_failed'
          ? 'publish_failed'
          : todo.type === 'rollback_failed'
            ? 'rollback_failed'
            : todo.type === 'permission_denied'
              ? 'permission_denied'
              : 'placeholder',
      typeName: todo.typeName,
      level: todo.priority === 'P0' ? 'high' : todo.priority === 'P1' ? 'medium' : 'low',
      title: todo.title,
      objectId: todo.objectId,
      occurredAt: todo.createdAt,
      sourceModule: todo.sourceModule,
      sourceModuleName: todo.sourceModuleName,
      targetRoute: todo.targetRoute,
      targetQuery: todo.targetQuery,
      handled: false,
      description: todo.description,
    }));

  auditLogs.forEach((log) => {
    const isRisk =
      log.logType === 'permission_denied' ||
      log.logType === 'sensitive_access' ||
      log.action === 'permission_change' ||
      log.result === 'failed';
    if (!isRisk) return;
    riskItems.push({
      id: `risk-audit-${log.id}`,
      type: log.action === 'permission_change'
        ? 'permission_change'
        : log.logType === 'sensitive_access'
          ? 'sensitive_access'
          : log.result === 'failed'
            ? 'version_conflict'
            : 'permission_denied',
      typeName: log.action === 'permission_change' ? '权限变更' : log.logType === 'sensitive_access' ? '敏感访问' : log.result === 'failed' ? '操作失败' : '权限拒绝',
      level: log.result === 'failed' || log.action === 'permission_change' ? 'high' : 'medium',
      title: log.changeSummary,
      objectId: log.objectId,
      occurredAt: log.time,
      sourceModule: log.objectType === 'analytics' ? 'analytics' : log.objectType === 'user' ? 'users' : log.objectType === 'review_release' ? 'reviewRelease' : 'system',
      sourceModuleName: log.objectType === 'analytics' ? '运营数据' : log.objectType === 'user' ? '用户管理' : log.objectType === 'review_release' ? '审核发布' : '权限与系统设置',
      targetRoute: log.objectType === 'analytics' ? '/analytics/overview' : log.objectType === 'review_release' ? '/review-release/pending' : '/system/accounts',
      targetQuery: { logType: log.logType ?? 'operation' },
      handled: false,
      description: log.reason,
    });
  });

  return riskItems
    .filter((risk) => !dashboardHandledRiskIds.has(risk.id))
    .filter((risk) => {
      if (roleId === 'super_admin' || roleId === 'read_only_auditor') return true;
      if (roleId === 'customer_support') return ['users', 'system'].includes(risk.sourceModule);
      if (roleId === 'teaching_reviewer') return ['reviewRelease', 'learningPath', 'content'].includes(risk.sourceModule);
      if (roleId === 'ai_operator') return ['aiCoach', 'reviewRelease', 'analytics'].includes(risk.sourceModule);
      if (roleId === 'content_operator') return ['content', 'reviewRelease'].includes(risk.sourceModule);
      return false;
    })
    .filter((risk) => canReadRoute(roleId, risk.targetRoute))
    .sort((first, second) => {
      const levelDiff = dashboardRiskLevelRank[first.level] - dashboardRiskLevelRank[second.level];
      if (levelDiff) return levelDiff;
      return (parseDateTime(second.occurredAt) ?? 0) - (parseDateTime(first.occurredAt) ?? 0);
    });
};

const buildDashboardMetrics = (roleId: AdminRoleId, risks: API.DashboardRiskItem[]) => {
  const range = dashboardTodayRange();
  const todayRegistered = operationUsersData.filter((user) => isInTimeRange(user.registerAt, range.todayStart, range.todayEnd)).length;
  const yesterdayRegistered = operationUsersData.filter((user) => isInTimeRange(user.registerAt, range.yesterdayStart, range.yesterdayEnd)).length;
  const todayActiveIds = new Set<string>();
  const yesterdayActiveIds = new Set<string>();
  operationUsersData.forEach((user) => {
    if (isInTimeRange(user.lastActiveAt, range.todayStart, range.todayEnd)) todayActiveIds.add(user.id);
    if (isInTimeRange(user.lastActiveAt, range.yesterdayStart, range.yesterdayEnd)) yesterdayActiveIds.add(user.id);
    (user.learningRecords ?? []).forEach((record) => {
      if (isInTimeRange(record.date, range.todayStart, range.todayEnd)) todayActiveIds.add(user.id);
      if (isInTimeRange(record.date, range.yesterdayStart, range.yesterdayEnd)) yesterdayActiveIds.add(user.id);
    });
  });
  const todayStartedTaskUsers = operationUsersData.filter((user) => user.learningStatus.todayTaskStatus !== 'not_started').length;
  const todayCompletedTaskUsers = operationUsersData.filter((user) => user.learningStatus.todayTaskStatus === 'completed').length;
  const pendingReview = reviewTasksData.filter((task) => task.status === 'pending_review').length;
  const pendingRelease = reviewTasksData.filter((task) => task.status === 'pending_publish').length;
  const pendingFeedback = operationUsersData.flatMap((user) => user.feedbacks ?? []).filter((feedback) => feedback.status === 'pending').length;
  const highRisk = risks.filter((risk) => ['high', 'medium'].includes(risk.level)).length;
  const allMetrics = [
    dashboardMetric({ id: 'today_new_users', title: '今日新增用户', value: todayRegistered, previousValue: yesterdayRegistered, unit: '人', type: 'count', timeSemantic: 'today', direction: 'positive', tooltip: 'createdAt 落在今日范围内的用户数。', targetRoute: '/users/list' }),
    dashboardMetric({ id: 'today_active_users', title: '今日活跃用户', value: todayActiveIds.size, previousValue: yesterdayActiveIds.size, unit: '人', type: 'count', timeSemantic: 'today', direction: 'positive', tooltip: '今日存在学习行为或 lastActiveAt 落入今日范围的去重用户数。', targetRoute: '/users/list' }),
    dashboardMetric({ id: 'today_task_completion_rate', title: '今日任务完成率', value: percentValue(todayCompletedTaskUsers, todayStartedTaskUsers), unit: '%', type: 'rate', timeSemantic: 'today', direction: 'positive', tooltip: '今日完成任务用户数 / 今日开始任务用户数，分母为 0 时显示 --。', targetRoute: '/analytics/overview' }),
    dashboardMetric({ id: 'pending_review', title: '当前待审核', value: pendingReview, unit: '项', type: 'count', timeSemantic: 'snapshot', direction: 'risk', tooltip: '当前状态为 pending_review 的审核任务数。', targetRoute: '/review-release/pending?status=pending_review' }),
    dashboardMetric({ id: 'pending_publish', title: '当前待发布', value: pendingRelease, unit: '项', type: 'count', timeSemantic: 'snapshot', direction: 'risk', tooltip: '当前状态为 pending_publish 的审核任务数。', targetRoute: '/review-release/pending?status=pending_publish' }),
    dashboardMetric({ id: 'pending_feedback', title: '当前待处理反馈', value: pendingFeedback, unit: '条', type: 'count', timeSemantic: 'snapshot', direction: 'risk', tooltip: '当前状态为 pending 的用户反馈数。', targetRoute: '/users/list?feedbackStatus=pending' }),
    dashboardMetric({ id: 'high_risk', title: '当前高风险事项', value: highRisk, unit: '项', type: 'count', timeSemantic: 'snapshot', direction: 'risk', tooltip: '当前 P0/P1 或高风险未关闭事项数。', targetRoute: '/system/accounts' }),
  ];
  const roleMetricIds: Record<AdminRoleId, string[]> = {
    super_admin: allMetrics.map((metric) => metric.id),
    content_operator: ['pending_review', 'pending_publish', 'high_risk'],
    teaching_reviewer: ['pending_review', 'pending_publish', 'high_risk'],
    ai_operator: ['pending_review', 'pending_publish', 'high_risk'],
    customer_support: ['today_active_users', 'today_task_completion_rate', 'pending_feedback', 'high_risk'],
    data_analyst: ['today_new_users', 'today_active_users', 'today_task_completion_rate', 'pending_review', 'pending_publish', 'pending_feedback', 'high_risk'],
    read_only_auditor: ['pending_review', 'pending_publish', 'high_risk'],
  };
  return allMetrics.filter((metric) => roleMetricIds[roleId].includes(metric.id));
};

const buildDashboardQuickActions = (roleId: AdminRoleId, todos: API.DashboardTodoItem[]) => {
  const candidates: API.DashboardQuickAction[] = [
    { id: 'review-release', title: '去审核发布', description: '查看审核、发布、下架和回滚记录。', icon: 'AuditOutlined', targetRoute: '/review-release/pending', requiredModule: 'reviewRelease', requiredAction: 'read', todoCount: todos.filter((item) => item.sourceModule === 'reviewRelease').length },
    { id: 'content-questions', title: '去题库管理', description: '查看题目草稿、驳回和审核状态。', icon: 'DatabaseOutlined', targetRoute: '/content/questions', requiredModule: 'content', requiredAction: 'read', todoCount: todos.filter((item) => item.sourceModule === 'content').length },
    { id: 'user-feedback', title: '去用户反馈', description: '查看待处理反馈和用户排查入口。', icon: 'TeamOutlined', targetRoute: '/users/list', targetQuery: { feedbackStatus: 'pending' }, requiredModule: 'users', requiredAction: 'read', todoCount: todos.filter((item) => item.sourceModule === 'users').length },
    { id: 'learning-path', title: '去学习路径配置', description: '检查诊断规则和今日任务模板。', icon: 'BranchesOutlined', targetRoute: '/learning-path/diagnosis-rules', requiredModule: 'learningPath', requiredAction: 'read', todoCount: todos.filter((item) => item.sourceModule === 'learningPath').length },
    { id: 'analytics', title: '去运营数据', description: '查看趋势、漏斗和指标口径。', icon: 'LineChartOutlined', targetRoute: '/analytics/overview', requiredModule: 'analytics', requiredAction: 'read' },
    { id: 'system-audit', title: '去审计日志', description: '查看权限拒绝、敏感访问和权限变更。', icon: 'SafetyCertificateOutlined', targetRoute: '/system/accounts', targetQuery: { tab: 'audit' }, requiredModule: 'system', requiredAction: 'read', todoCount: todos.filter((item) => item.sourceModule === 'system').length },
    { id: 'ai-coach', title: '去 AI 陪练管理', description: '查看 AI 策略占位摘要和审核入口。', icon: 'RobotOutlined', targetRoute: '/ai-coach/prompts', requiredModule: 'aiCoach', requiredAction: 'read' },
  ];
  return candidates
    .filter((action) =>
      roleCanPerformAction(
        roleId,
        action.requiredModule as AdminModuleKey,
        action.requiredAction as PermissionAction,
      ),
    )
    .slice(0, 6);
};

const buildDashboardModuleSnapshots = (roleId: AdminRoleId): API.DashboardModuleSnapshot[] => {
  const today = dashboardTodayRange().today;
  const snapshots: API.DashboardModuleSnapshot[] = [
    {
      id: 'reviewRelease',
      title: '审核发布',
      sourceModule: 'reviewRelease',
      targetRoute: '/review-release/pending',
      items: [
        { label: '待审核', value: reviewTasksData.filter((task) => task.status === 'pending_review').length, status: 'risk' },
        { label: '待发布', value: reviewTasksData.filter((task) => task.status === 'pending_publish').length, status: 'warning' },
        { label: '今日已通过', value: reviewTasksData.filter((task) => task.status === 'approved' && dateOnly(task.updatedAt) === today).length },
        { label: '今日已驳回', value: reviewTasksData.filter((task) => task.status === 'rejected' && dateOnly(task.updatedAt) === today).length, status: 'warning' },
      ],
    },
    {
      id: 'content',
      title: '题库内容',
      sourceModule: 'content',
      targetRoute: '/content/questions',
      items: [
        { label: '草稿', value: questionData.filter((item) => item.status === 'draft').length },
        { label: '待审核', value: questionData.filter((item) => item.status === 'pending_review').length, status: 'warning' },
        { label: '已发布', value: questionData.filter((item) => item.status === 'published').length },
        { label: '被驳回', value: questionData.filter((item) => item.status === 'rejected').length, status: 'risk' },
      ],
    },
    {
      id: 'users',
      title: '用户反馈',
      sourceModule: 'users',
      targetRoute: '/users/list',
      items: [
        { label: '待处理', value: operationUsersData.flatMap((user) => user.feedbacks ?? []).filter((item) => item.status === 'pending').length, status: 'risk' },
        { label: '处理中', value: operationUsersData.flatMap((user) => user.feedbacks ?? []).filter((item) => item.status === 'processing').length, status: 'warning' },
        { label: '今日已处理', value: operationUsersData.flatMap((user) => user.feedbacks ?? []).filter((item) => ['resolved', 'no_action'].includes(item.status) && dateOnly(item.updatedAt) === today).length },
        { label: 'P0 未关闭', value: operationUsersData.flatMap((user) => user.feedbacks ?? []).filter((item) => item.priority === 'P0' && item.status !== 'closed').length, status: 'risk' },
      ],
    },
    {
      id: 'learningPath',
      title: '学习路径',
      sourceModule: 'learningPath',
      targetRoute: '/learning-path/diagnosis-rules',
      items: [
        { label: '草稿', value: learningPathConfigsData.filter((item) => item.status === 'draft').length },
        { label: '待审核', value: learningPathConfigsData.filter((item) => item.status === 'pending_review').length, status: 'warning' },
        { label: '预校验阻断', value: learningPathConfigsData.filter((item) => precheckLearningPathPayload(item as API.LearningPathSaveParams, item.id).level === 'error').length, status: 'risk' },
        { label: '已发布', value: learningPathConfigsData.filter((item) => item.status === 'published').length },
      ],
    },
    {
      id: 'system',
      title: '审计风险',
      sourceModule: 'system',
      targetRoute: '/system/accounts',
      items: [
        { label: '今日权限拒绝', value: auditLogs.filter((item) => item.logType === 'permission_denied' && dateOnly(item.time) === today).length, status: 'risk' },
        { label: '今日敏感访问', value: auditLogs.filter((item) => item.logType === 'sensitive_access' && dateOnly(item.time) === today).length, status: 'warning' },
        { label: '权限变更', value: auditLogs.filter((item) => item.action === 'permission_change').length, status: 'risk' },
        { label: '发布回滚异常', value: auditLogs.filter((item) => item.result === 'failed' && ['发布', '回滚'].includes(String(item.action))).length, status: 'risk' },
      ],
    },
    {
      id: 'aiCoach',
      title: 'AI 策略治理',
      sourceModule: 'aiCoach',
      targetRoute: '/ai-coach/prompts',
      items: [
        { label: '策略总量', value: aiCoachStrategiesData.length },
        { label: '预校验阻断', value: aiCoachStrategiesData.filter((item) => item.lastPrecheck?.level === 'error').length, status: 'risk' },
        { label: '高风险待发布', value: aiCoachStrategiesData.filter((item) => item.riskLevel === 'high' && item.status === 'pending_publish').length, status: 'risk' },
        { label: '审核相关', value: reviewTasksData.filter((task) => task.objectType === 'ai_coach_strategy' && ['pending_review', 'pending_publish', 'approved'].includes(task.status)).length, status: 'warning' },
      ],
    },
  ];
  return snapshots.filter((snapshot) => canReadRoute(roleId, snapshot.targetRoute));
};

const buildDashboardRecentActivities = (roleId: AdminRoleId) =>
  auditLogs
    .filter((log) => {
      if (roleId === 'super_admin') return true;
      if (roleId === 'read_only_auditor') return ['permission_denied', 'sensitive_access'].includes(log.logType ?? '') || ['permission_change', 'restricted_access'].includes(String(log.action)) || log.result === 'failed';
      if (roleId === 'customer_support') return log.objectType === 'user';
      if (roleId === 'content_operator') return ['content', 'review_release'].includes(log.objectType);
      if (roleId === 'teaching_reviewer') return ['content', 'learning_path_config', 'review_release'].includes(log.objectType);
      if (roleId === 'ai_operator') return ['ai_coach_strategy', 'review_release', 'analytics'].includes(log.objectType);
      return false;
    })
    .slice(0, 8)
    .map((log): API.DashboardRecentActivity => ({
      id: log.id,
      time: log.time,
      operator: log.operator,
      action: String(log.action),
      objectType: log.objectType,
      objectSummary: log.objectId,
      result: log.result,
      sourceModule: log.objectType === 'user' ? 'users' : log.objectType === 'analytics' ? 'analytics' : log.objectType === 'review_release' ? 'reviewRelease' : log.objectType === 'learning_path_config' ? 'learningPath' : log.objectType === 'content' ? 'content' : 'system',
      sourceModuleName: log.objectType === 'user' ? '用户管理' : log.objectType === 'analytics' ? '运营数据' : log.objectType === 'review_release' ? '审核发布' : log.objectType === 'learning_path_config' ? '学习路径配置' : log.objectType === 'content' ? '题库与内容管理' : '权限与系统设置',
    }));

const dashboardDataQualityIssues = (
  roleId: AdminRoleId,
  todos: API.DashboardTodoItem[],
  metrics: API.DashboardMetric[],
  quickActions: API.DashboardQuickAction[],
): API.DashboardDataQualityIssue[] => {
  const issues: API.DashboardDataQualityIssue[] = [];
  const seenTodoObjectIds = new Set<string>();
  todos.forEach((todo) => {
    const dedupeKey = `${todo.type}-${todo.objectId}`;
    if (seenTodoObjectIds.has(dedupeKey)) {
      issues.push({ id: `dq-dashboard-duplicate-${todo.id}`, section: 'todos', level: 'warning', message: `待办重复生成：${todo.title}`, objectId: todo.objectId });
    }
    seenTodoObjectIds.add(dedupeKey);
    if (!routeModule(todo.targetRoute)) {
      issues.push({ id: `dq-dashboard-route-${todo.id}`, section: 'todos', level: 'error', message: `待办目标路由无效：${todo.targetRoute}`, objectId: todo.objectId });
    }
    if (todo.waitHours < 0) {
      issues.push({ id: `dq-dashboard-wait-${todo.id}`, section: 'todos', level: 'error', message: `待办等待时长为负数：${todo.title}`, objectId: todo.objectId });
    }
    if (!canReadRoute(roleId, todo.targetRoute)) {
      issues.push({ id: `dq-dashboard-permission-${todo.id}`, section: 'todos', level: 'error', message: `无权限角色收到待办：${todo.title}`, objectId: todo.objectId });
    }
  });
  quickActions.forEach((action) => {
    if (!canReadRoute(roleId, action.targetRoute)) {
      issues.push({ id: `dq-dashboard-action-${action.id}`, section: 'quickActions', level: 'error', message: `快捷入口指向无权限路由：${action.title}`, objectId: action.id });
    }
  });
  metrics.forEach((metric) => {
    if (metric.value !== undefined && !Number.isFinite(metric.value)) {
      issues.push({ id: `dq-dashboard-metric-${metric.id}`, section: 'metrics', level: 'error', message: `指标出现无效数值：${metric.title}`, objectId: metric.id });
    }
  });
  return issues;
};

const buildDashboardOverview = (roleId: AdminRoleId, query: Request['query']): API.DashboardOverview => {
  const role = roleConfigs[roleId];
  const visibleSections = dashboardRoleSections[roleId];
  const simulateEmpty = getQueryValue(query.simulateEmpty) === 'true';
  const simulateNoRisk = getQueryValue(query.simulateNoRisk) === 'true';
  const simulateSectionError = getQueryValue(query.simulateSectionError) as API.DashboardVisibleSection | undefined;
  const sectionErrors: API.DashboardSectionError[] = [];
  if (simulateSectionError && dashboardSectionLabels[simulateSectionError]) {
    sectionErrors.push({
      section: simulateSectionError,
      level: 'error',
      message: `${dashboardSectionLabels[simulateSectionError]}聚合模拟失败，其他区块继续返回。`,
    });
    pushOperationAuditLog({
      roleId,
      action: 'dashboard_section_failed',
      objectType: 'dashboard',
      objectId: simulateSectionError,
      sourcePage: '/dashboard/overview',
      reason: '模拟工作台单区块聚合失败。',
      result: 'failed',
      changeSummary: `${dashboardSectionLabels[simulateSectionError]}区块聚合失败，接口按部分成功返回。`,
    });
  }

  const filters = query as API.DashboardFilterParams;
  const todoItems = simulateEmpty || simulateSectionError === 'todos'
    ? []
    : filterDashboardTodos(roleId, buildDashboardTodoCandidates(roleId), filters);
  const riskItems = simulateEmpty || simulateNoRisk || simulateSectionError === 'risks'
    ? []
    : buildDashboardRisks(roleId, todoItems);
  const summaryMetrics = simulateSectionError === 'metrics' ? [] : buildDashboardMetrics(roleId, riskItems);
  const quickActions = simulateSectionError === 'quickActions' ? [] : buildDashboardQuickActions(roleId, todoItems);
  const moduleSnapshots = simulateSectionError === 'moduleSnapshots' ? [] : buildDashboardModuleSnapshots(roleId);
  const recentActivities = simulateSectionError === 'recentActivities' ? [] : buildDashboardRecentActivities(roleId);
  const dataQualityIssues = dashboardDataQualityIssues(roleId, todoItems, summaryMetrics, quickActions);
  if (summaryMetrics.some((metric) => ['NaN', 'Infinity'].includes(metric.displayValue))) {
    dataQualityIssues.push({ id: 'dq-dashboard-invalid-display', section: 'metrics', level: 'error', message: '今日指标出现 NaN 或 Infinity。' });
  }
  if (simulateEmpty && summaryMetrics.some((metric) => metric.type === 'rate' && metric.displayValue !== '--')) {
    dataQualityIssues.push({ id: 'dq-dashboard-empty-rate', section: 'metrics', level: 'warning', message: '空数据比例指标未显示 --。' });
  }
  if (dataQualityIssues.length > 0) {
    pushOperationAuditLog({
      roleId,
      action: 'dashboard_data_quality',
      objectType: 'dashboard',
      objectId: 'overview',
      sourcePage: '/dashboard/overview',
      reason: '工作台聚合发现数据质量问题。',
      result: dataQualityIssues.some((item) => item.level === 'error') ? 'failed' : 'success',
      changeSummary: `工作台数据质量提示 ${dataQualityIssues.length} 条。`,
    });
  }
  const today = dashboardTodayRange().today;
  const updatedAt = nowText();
  const overdue = todoItems.filter((item) => item.overdue).length;

  return {
    welcome: {
      operatorName: currentAccountName || role.name,
      roleName: role.name,
      greeting: new Date().getHours() < 12 ? '上午好' : new Date().getHours() < 18 ? '下午好' : '晚上好',
      workHint: todoItems.length > 0 ? `今天有 ${todoItems.length} 项待办需要处理。` : '当前暂无待处理事项。',
      currentDate: today,
      updatedAt,
    },
    role: {
      roleId,
      roleName: role.name,
      description: role.description,
    },
    summaryMetrics,
    todoSummary: {
      total: todoItems.length,
      highPriority: todoItems.filter((item) => ['P0', 'P1'].includes(item.priority)).length,
      overdue,
      todayNew: todoItems.filter((item) => dateOnly(item.createdAt) === today).length,
    },
    todoItems: todoItems.slice(0, 10),
    riskSummary: {
      total: riskItems.length,
      high: riskItems.filter((item) => item.level === 'high').length,
      overdue,
      latestAt: riskItems[0]?.occurredAt,
    },
    riskItems: riskItems.slice(0, 8),
    quickActions,
    moduleSnapshots,
    recentActivities,
    visibleSections,
    sectionErrors,
    dataQualityIssues,
    updatedAt,
  };
};

const buildCurrentUser = (roleId: AdminRoleId): API.CurrentUser => {
  const role = roleConfigs[roleId];
  const permissions = getRolePermissionsPayload(roleId);

  return {
    ...defaultUser,
    userid: role.id,
    name: currentAccountName || role.name,
    accountId: currentAccountId || role.username,
    accountName: currentAccountName || role.name,
    title: role.description,
    access: role.id,
    roleId: role.id,
    roleName: role.name,
    menuPermissions: permissions.menuPermissions,
    actionPermissions: permissions.actionPermissions,
    dataScopes: permissions.dataScopes,
  };
};

export default {
  'GET /api/currentUser': (_req: Request, res: Response) => {
    if (!currentRoleId) {
      res.status(401).send({
        data: {
          isLogin: false,
        },
        errorCode: '401',
        errorMessage: '请先登录！',
        success: true,
      });
      return;
    }

    res.send({
      success: true,
      data: buildCurrentUser(currentRoleId),
    });
  },
  'GET /api/dashboard/overview': (req: Request, res: Response) => {
    if (!currentRoleId) {
      res.status(401).send({
        success: false,
        errorCode: '401',
        errorMessage: '登录态已失效，请重新登录。',
      });
      return;
    }
    if (!roleCanPerformAction(currentRoleId, 'dashboard', 'read')) {
      pushOperationAuditLog({
        roleId: currentRoleId,
        logType: 'permission_denied',
        action: 'restricted_access',
        objectType: 'dashboard',
        objectId: 'overview',
        sourcePage: '/dashboard/overview',
        reason: '当前角色无工作台访问权限。',
        result: 'denied',
        changeSummary: 'Mock API 拒绝运营工作台访问。',
      });
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无工作台访问权限。',
      });
      return;
    }
    if (getQueryValue(req.query.simulateFailure) === 'true') {
      pushOperationAuditLog({
        roleId: currentRoleId,
        action: 'dashboard_failed',
        objectType: 'dashboard',
        objectId: 'overview',
        sourcePage: '/dashboard/overview',
        reason: '模拟工作台聚合服务整体失败。',
        result: 'failed',
        changeSummary: '运营工作台聚合服务模拟失败。',
      });
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '运营工作台聚合服务模拟失败。',
      });
      return;
    }
    const overview = buildDashboardOverview(currentRoleId, req.query);
    pushOperationAuditLog({
      roleId: currentRoleId,
      action: 'dashboard_view',
      objectType: 'dashboard',
      objectId: 'overview',
      sourcePage: '/dashboard/overview',
      reason: '访问运营工作台。',
      result: 'success',
      changeSummary: `运营工作台加载成功，角色视图 ${overview.role.roleName}。`,
    });
    res.send({
      success: true,
      data: overview,
    });
  },
  'POST /api/dashboard/action-log': (req: Request, res: Response) => {
    if (!currentRoleId) {
      res.status(401).send({
        success: false,
        errorCode: '401',
        errorMessage: '登录态已失效，请重新登录。',
      });
      return;
    }
    if (!roleCanPerformAction(currentRoleId, 'dashboard', 'read')) {
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无工作台访问权限。',
      });
      return;
    }
    const body = req.body as API.DashboardActionLogParams;
    pushOperationAuditLog({
      roleId: currentRoleId,
      action: body.action,
      objectType: 'dashboard',
      objectId: body.objectId || 'overview',
      sourcePage: '/dashboard/overview',
      reason: body.reason || '记录工作台操作。',
      result: 'success',
      changeSummary: body.targetRoute
        ? `工作台操作 ${body.action}，目标 ${body.targetRoute}。`
        : `工作台操作 ${body.action}。`,
    });
    res.send({ success: true });
  },
  'PATCH /api/dashboard/risks/:id/handle': (req: Request, res: Response) => {
    const riskId = getQueryValue(req.params.id);
    if (!currentRoleId) {
      res.status(401).send({
        success: false,
        errorCode: '401',
        errorMessage: '登录态已失效，请重新登录。',
      });
      return;
    }
    if (!roleCanPerformAction(currentRoleId, 'system', 'config')) {
      pushOperationAuditLog({
        roleId: currentRoleId,
        logType: 'permission_denied',
        action: 'dashboard_risk_handle_denied',
        objectType: 'dashboard',
        objectId: riskId,
        sourcePage: '/dashboard/overview',
        reason: '当前角色无高风险事项处理权限。',
        result: 'denied',
        changeSummary: 'Mock API 拒绝工作台风险处理。',
      });
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无高风险事项处理权限。',
      });
      return;
    }
    dashboardHandledRiskIds.add(riskId);
    pushOperationAuditLog({
      roleId: currentRoleId,
      action: 'dashboard_risk_handled',
      objectType: 'dashboard',
      objectId: riskId,
      sourcePage: '/dashboard/overview',
      reason: (req.body as API.DashboardRiskHandleParams)?.reason || '标记工作台风险已处理。',
      result: 'success',
      changeSummary: `工作台风险 ${riskId} 已标记处理。`,
    });
    res.send({ success: true });
  },
  'GET /api/admin/roles': (_req: Request, res: Response) => {
    res.send({
      success: true,
      data: roleList.map(({ password: _password, ...role }) => role),
      total: roleList.length,
    });
  },
  'GET /api/admin/accounts': (_req: Request, res: Response) => {
    const data = buildAdminAccounts();
    res.send({
      success: true,
      data,
      total: data.length,
    });
  },
  'GET /api/admin/audit-logs': (req: Request, res: Response) => {
    const logType = getQueryValue(req.query.logType);
    const objectType = getQueryValue(req.query.objectType);
    const data = auditLogs.filter((item) => {
      if (logType && item.logType !== logType) return false;
      if (objectType && item.objectType !== objectType) return false;
      return true;
    });
    res.send({
      success: true,
      data,
      total: data.length,
    });
  },
  'GET /api/analytics/overview': (req: Request, res: Response) => {
    if (!currentRoleId || !roleCanReadAnalytics(currentRoleId)) {
      if (currentRoleId) {
        pushOperationAuditLog({
          roleId: currentRoleId,
          logType: 'permission_denied',
          action: 'restricted_access',
          objectType: 'analytics',
          objectId: 'overview',
          sourcePage: '/analytics/overview',
          reason: '当前角色无运营数据访问权限。',
          result: 'denied',
          changeSummary: 'Mock API 拒绝运营数据总览访问。',
        });
      }
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无运营数据访问权限。',
      });
      return;
    }
    if (getQueryValue(req.query.simulateFailure) === 'true') {
      pushOperationAuditLog({
        roleId: currentRoleId,
        action: 'analytics_failed',
        objectType: 'analytics',
        objectId: 'overview',
        sourcePage: '/analytics/overview',
        reason: '模拟聚合服务整体失败。',
        result: 'failed',
        changeSummary: '运营数据聚合服务模拟失败。',
      });
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '运营数据聚合服务模拟失败。',
      });
      return;
    }
    const { error, filters } = analyticsFilters(req.query);
    if (error || !filters) {
      pushOperationAuditLog({
        roleId: currentRoleId,
        action: 'analytics_invalid_filter',
        objectType: 'analytics',
        objectId: 'overview',
        sourcePage: '/analytics/overview',
        reason: error || '筛选参数无效。',
        result: 'failed',
        changeSummary: '运营数据筛选参数校验失败。',
      });
      res.status(400).send({
        success: false,
        errorCode: '400',
        errorMessage: error || '筛选参数无效。',
      });
      return;
    }
    const overview = buildAnalyticsOverview(currentRoleId, filters, req.query);
    pushOperationAuditLog({
      roleId: currentRoleId,
      action: 'analytics_view',
      objectType: 'analytics',
      objectId: 'overview',
      sourcePage: '/analytics/overview',
      reason: '访问运营数据总览。',
      result: 'success',
      changeSummary: `运营数据总览加载成功，区块数 ${overview.visibleSections.length}。`,
    });
    res.send({
      success: true,
      data: overview,
    });
  },
  'GET /api/analytics/overview/export': (req: Request, res: Response) => {
    if (!currentRoleId || !roleCanExportAnalytics(currentRoleId)) {
      if (currentRoleId) {
        pushOperationAuditLog({
          roleId: currentRoleId,
          logType: 'permission_denied',
          action: 'analytics_export_denied',
          objectType: 'analytics',
          objectId: 'overview-export',
          sourcePage: '/analytics/overview',
          reason: '当前角色无运营数据导出权限。',
          result: 'denied',
          changeSummary: 'Mock 聚合导出预览被拒绝。',
        });
      }
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无运营数据导出权限。',
      });
      return;
    }
    if (getQueryValue(req.query.simulateFailure) === 'true') {
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: 'Mock 导出预览模拟失败。',
      });
      return;
    }
    const { error, filters } = analyticsFilters(req.query);
    if (error || !filters) {
      res.status(400).send({
        success: false,
        errorCode: '400',
        errorMessage: error || '筛选参数无效。',
      });
      return;
    }
    const overview = buildAnalyticsOverview(currentRoleId, filters, req.query);
    const result: API.AnalyticsExportResult = {
      id: `analytics-export-preview-${Date.now()}`,
      status: 'preview_ready',
      title: '运营数据 Mock 聚合导出预览',
      filters: overview.filters,
      metricCount: overview.summaryCards.length + overview.learningPathMetrics.length + overview.contentMetrics.length,
      sectionCount: overview.visibleSections.length,
      containsSensitiveFields: false,
      mockOnly: true,
      createdAt: nowText(),
      message: '本阶段仅生成导出预览，不生成真实文件，不包含用户级敏感字段。',
    };
    pushOperationAuditLog({
      roleId: currentRoleId,
      action: 'analytics_export_preview',
      objectType: 'analytics',
      objectId: result.id,
      sourcePage: '/analytics/overview',
      reason: '生成运营数据 Mock 导出预览。',
      result: 'success',
      changeSummary: `生成 Mock 导出预览，区块数 ${result.sectionCount}，指标数 ${result.metricCount}。`,
    });
    res.send({
      success: true,
      data: result,
    });
  },
  'GET /api/content/questions': (req: Request, res: Response) => {
    if (!roleCanReadContent(currentRoleId)) {
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '无权查看题库内容。',
      });
      return;
    }

    const filtered = filterQuestions(req.query);
    res.send({
      success: true,
      data: paginate(filtered, req.query),
      total: filtered.length,
    });
  },
  'GET /api/content/questions/:id': (req: Request, res: Response) => {
    if (!roleCanReadContent(currentRoleId)) {
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '无权查看题库内容。',
      });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const question = questionData.find((item) => item.id === id);

    if (!question) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '题目不存在。',
      });
      return;
    }

    res.send({
      success: true,
      data: question,
    });
  },
  'POST /api/content/questions': (req: Request, res: Response) => {
    if (!currentRoleId || !roleCanCreateQuestion(currentRoleId)) {
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '无权新建题目。',
      });
      return;
    }

    const errorMessage = validateQuestionPayload(req.body);
    if (errorMessage) {
      res.status(400).send({
        success: false,
        errorCode: '400',
        errorMessage,
      });
      return;
    }

    const operator = roleConfigs[currentRoleId];
    const now = nowText();
    const body = req.body as API.QuestionSaveParams;
    const question: API.QuestionItem = {
      id: `question-${Date.now()}`,
      title: body.title.trim(),
      stem: body.stem.trim(),
      examType: body.examType,
      questionType: body.questionType,
      skill: body.skill,
      difficulty: body.difficulty,
      tags: normalizeTags(body.tags),
      options: body.options.map((item) => ({
        key: item.key,
        content: item.content.trim(),
      })),
      answer: body.answer,
      analysis: body.analysis.trim(),
      status: 'draft',
      version: 'V0.1',
      creator: operator.name,
      createdAt: now,
      updatedBy: operator.name,
      updatedAt: now,
      changeSummary: body.changeSummary?.trim() || '新增题目草稿。',
      referenceImpact: body.referenceImpact?.trim() || '当前为草稿，尚未影响线上练习。',
      versionRecords: [
        {
          id: `question-version-create-${Date.now()}`,
          version: 'V0.1',
          status: 'draft',
          summary: body.changeSummary?.trim() || '新增题目草稿。',
          createdBy: operator.name,
          createdAt: now,
        },
      ],
      operationRecords: [
        {
          id: `question-op-create-${Date.now()}`,
          operator: operator.name,
          roleName: operator.name,
          action: '保存草稿',
          toStatus: 'draft',
          reason: body.changeSummary?.trim() || '新增题目草稿。',
          time: now,
        },
      ],
    };
    questionData.unshift(question);
    pushContentAuditLog(
      currentRoleId,
      'create',
      'success',
      question.id,
      '保存题目草稿。',
      `创建题目 ${question.title}。`,
    );

    res.send({
      success: true,
      data: question,
    });
  },
  'PATCH /api/content/questions/:id': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const question = questionData.find((item) => item.id === id);

    if (!question) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '题目不存在。',
      });
      return;
    }

    if (!currentRoleId || !roleCanEditQuestion(currentRoleId, question)) {
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '无权编辑当前状态的题目。',
      });
      return;
    }

    const errorMessage = validateQuestionPayload(req.body);
    if (errorMessage) {
      res.status(400).send({
        success: false,
        errorCode: '400',
        errorMessage,
      });
      return;
    }

    const operator = roleConfigs[currentRoleId];
    const updatedQuestion = buildQuestionFromPayload(
      question,
      req.body as API.QuestionSaveParams,
      operator.name,
    );
    pushContentAuditLog(
      currentRoleId,
      'edit',
      'success',
      question.id,
      updatedQuestion.changeSummary,
      `编辑题目 ${question.title}，版本更新为 ${question.version}。`,
    );

    res.send({
      success: true,
      data: updatedQuestion,
    });
  },
  'POST /api/content/questions/:id/submit-review': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const question = questionData.find((item) => item.id === id);

    if (!question) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '题目不存在。',
      });
      return;
    }

    if (!currentRoleId || !roleCanSubmitQuestion(currentRoleId, question)) {
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '无权提交当前状态的题目。',
      });
      return;
    }

    const changeSummary = String(req.body?.changeSummary ?? question.changeSummary).trim();
    if (!changeSummary) {
      res.status(400).send({
        success: false,
        errorCode: '400',
        errorMessage: '提交审核必须填写变更说明。',
      });
      return;
    }

    const operator = roleConfigs[currentRoleId];
    const previousStatus = question.status;
    const task = buildQuestionReviewTask(question, operator, changeSummary);
    question.status = 'pending_review';
    question.updatedBy = operator.name;
    question.updatedAt = task.updatedAt;
    question.changeSummary = changeSummary;
    question.operationRecords.unshift({
      id: `question-op-submit-${question.id}-${Date.now()}`,
      operator: operator.name,
      roleName: operator.name,
      action: '提交审核',
      fromStatus: previousStatus,
      toStatus: 'pending_review',
      reason: changeSummary,
      time: task.updatedAt,
    });
    question.versionRecords.unshift({
      id: `question-version-submit-${question.id}-${Date.now()}`,
      version: question.version,
      status: 'pending_review',
      summary: changeSummary,
      createdBy: operator.name,
      createdAt: task.updatedAt,
    });
    pushContentAuditLog(
      currentRoleId,
      'submit',
      'success',
      question.id,
      changeSummary,
      `题目 ${question.title} 提交审核，审核任务 ${task.id}。`,
    );

    res.send({
      success: true,
      data: question,
      reviewTask: task,
    });
  },
  'GET /api/learning-path/configs': (req: Request, res: Response) => {
    if (!roleCanReadLearningPath(currentRoleId)) {
      if (currentRoleId) {
        pushOperationAuditLog({
          roleId: currentRoleId,
          logType: 'permission_denied',
          action: 'restricted_access',
          objectType: 'learning_path_config',
          objectId: 'learning-path/configs',
          sourcePage: '/learning-path/diagnosis-rules',
          reason: '当前角色无学习路径配置访问权限。',
          result: 'denied',
          changeSummary: 'Mock API 拒绝学习路径配置列表访问。',
        });
      }
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无学习路径配置访问权限。',
      });
      return;
    }
    const page = paginateArray(filterLearningPathConfigs(req.query), req.query);
    res.send({ success: true, ...page });
  },
  'GET /api/learning-path/configs/:id': (req: Request, res: Response) => {
    if (!roleCanReadLearningPath(currentRoleId)) {
      res.status(403).send({ success: false, errorCode: '403', errorMessage: '当前账号无学习路径配置详情权限。' });
      return;
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const config = getLearningPathConfig(id);
    if (!config) {
      res.status(404).send({ success: false, errorCode: '404', errorMessage: '学习路径配置不存在。' });
      return;
    }
    res.send({ success: true, data: config });
  },
  'POST /api/learning-path/configs': (req: Request, res: Response) => {
    if (!currentRoleId || !roleCanWriteLearningPath(currentRoleId)) {
      res.status(403).send({ success: false, errorCode: '403', errorMessage: '当前账号无新建学习路径配置权限。' });
      return;
    }
    const body = req.body as API.LearningPathSaveParams;
    const precheck = precheckLearningPathPayload(body);
    const blocking = precheck.issues.find((item) => ['name', 'examType'].includes(item.field) && item.level === 'error');
    if (blocking) {
      res.status(400).send({ success: false, errorCode: '400', errorMessage: blocking.message });
      return;
    }
    const config = normalizeLearningPathPayload(body);
    config.lastPrecheck = precheck;
    learningPathConfigsData.unshift(config);
    pushLearningPathAuditLog(currentRoleId, 'create', 'success', config, '创建学习路径配置草稿。', `创建${learningPathKindName(config.kind)} ${config.name}。`);
    res.send({ success: true, data: config });
  },
  'PATCH /api/learning-path/configs/:id': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const config = getLearningPathConfig(id);
    if (!config) {
      res.status(404).send({ success: false, errorCode: '404', errorMessage: '学习路径配置不存在。' });
      return;
    }
    if (!currentRoleId || !roleCanWriteLearningPath(currentRoleId)) {
      res.status(403).send({ success: false, errorCode: '403', errorMessage: '当前账号无编辑学习路径配置权限。' });
      return;
    }
    if (!editableLearningPathStatuses.includes(config.status)) {
      res.status(400).send({ success: false, errorCode: '400', errorMessage: '当前状态不允许直接编辑，请基于当前版本创建新草稿。' });
      return;
    }
    const body = req.body as API.LearningPathSaveParams;
    if (Number(body.dataVersion) !== config.dataVersion) {
      pushLearningPathAuditLog(currentRoleId, 'edit', 'failed', config, '配置数据版本冲突。', '保存学习路径配置失败，数据已被其他操作更新。');
      res.status(409).send({ success: false, errorCode: '409', errorMessage: '配置已被其他人更新，请刷新后重试。' });
      return;
    }
    const nextConfig = normalizeLearningPathPayload(body, config);
    const index = learningPathConfigsData.findIndex((item) => item.id === id);
    learningPathConfigsData[index] = {
      ...nextConfig,
      versionRecords: [...nextConfig.versionRecords, ...config.versionRecords],
      operationRecords: [...nextConfig.operationRecords, ...config.operationRecords],
    };
    pushLearningPathAuditLog(currentRoleId, 'edit', 'success', learningPathConfigsData[index], nextConfig.changeSummary, `编辑${learningPathKindName(config.kind)} ${config.name}。`);
    res.send({ success: true, data: learningPathConfigsData[index] });
  },
  'POST /api/learning-path/configs/:id/copy': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const config = getLearningPathConfig(id);
    if (!config) {
      res.status(404).send({ success: false, errorCode: '404', errorMessage: '学习路径配置不存在。' });
      return;
    }
    if (!currentRoleId || !roleCanWriteLearningPath(currentRoleId)) {
      res.status(403).send({ success: false, errorCode: '403', errorMessage: '当前账号无复制学习路径配置权限。' });
      return;
    }
    const copied = copyLearningPathConfigAsDraft(config);
    pushLearningPathAuditLog(currentRoleId, 'copy', 'success', copied, '复制为新草稿。', `基于 ${config.id} 创建新草稿版本。`);
    res.send({ success: true, data: copied });
  },
  'POST /api/learning-path/configs/precheck': (req: Request, res: Response) => {
    if (!currentRoleId || !roleCanWriteLearningPath(currentRoleId)) {
      res.status(403).send({ success: false, errorCode: '403', errorMessage: '当前账号无预校验权限。' });
      return;
    }
    if (req.body?.simulateFailure) {
      res.status(500).send({ success: false, errorCode: '500', errorMessage: '预校验服务模拟失败。' });
      return;
    }
    const result = precheckLearningPathPayload(req.body as API.LearningPathSaveParams);
    pushOperationAuditLog({
      roleId: currentRoleId,
      action: result.level === 'error' ? 'precheck_failed' : 'precheck',
      objectType: 'learning_path_config',
      objectSubtype: req.body?.kind,
      objectId: req.body?.id ?? 'new-config',
      sourcePage: '/learning-path/diagnosis-rules',
      reason: '执行学习路径配置预校验。',
      result: result.level === 'error' ? 'failed' : 'success',
      changeSummary: result.summary,
    });
    res.send({ success: true, data: result });
  },
  'POST /api/learning-path/configs/:id/precheck': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const config = getLearningPathConfig(id);
    if (!config) {
      res.status(404).send({ success: false, errorCode: '404', errorMessage: '学习路径配置不存在。' });
      return;
    }
    if (!currentRoleId || !roleCanWriteLearningPath(currentRoleId)) {
      res.status(403).send({ success: false, errorCode: '403', errorMessage: '当前账号无预校验权限。' });
      return;
    }
    if (req.body?.simulateFailure) {
      res.status(500).send({ success: false, errorCode: '500', errorMessage: '预校验服务模拟失败。' });
      return;
    }
    const result = precheckLearningPathPayload(req.body as API.LearningPathSaveParams, id);
    config.lastPrecheck = result;
    pushLearningPathAuditLog(currentRoleId, result.level === 'error' ? 'precheck_failed' : 'precheck', result.level === 'error' ? 'failed' : 'success', config, '执行学习路径配置预校验。', result.summary);
    res.send({ success: true, data: result });
  },
  'POST /api/learning-path/configs/:id/submit-review': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const config = getLearningPathConfig(id);
    if (!config) {
      res.status(404).send({ success: false, errorCode: '404', errorMessage: '学习路径配置不存在。' });
      return;
    }
    if (!currentRoleId || !roleCanSubmitLearningPath(currentRoleId)) {
      res.status(403).send({ success: false, errorCode: '403', errorMessage: '当前账号无提交学习路径审核权限。' });
      return;
    }
    if (!editableLearningPathStatuses.includes(config.status)) {
      res.status(400).send({ success: false, errorCode: '400', errorMessage: '当前状态不允许提交审核。' });
      return;
    }
    const body = req.body as API.LearningPathSubmitReviewParams;
    if (Number(body.dataVersion) !== config.dataVersion) {
      res.status(409).send({ success: false, errorCode: '409', errorMessage: '配置已被其他人更新，请刷新后重试。' });
      return;
    }
    const changeSummary = String(body.changeSummary ?? '').trim();
    if (!changeSummary) {
      res.status(400).send({ success: false, errorCode: '400', errorMessage: '提交审核必须填写变更说明。' });
      return;
    }
    if (body.simulateTaskFailure) {
      res.status(500).send({ success: false, errorCode: '500', errorMessage: '审核任务创建失败。' });
      return;
    }
    const precheck = config.lastPrecheck ?? precheckLearningPathPayload(config as API.LearningPathSaveParams, id);
    if (precheck.level === 'error') {
      res.status(400).send({ success: false, errorCode: '400', errorMessage: '预校验存在阻断错误，不能提交审核。' });
      return;
    }
    if (precheck.level === 'warning' && !body.confirmWarnings) {
      res.status(400).send({ success: false, errorCode: '400', errorMessage: '预校验存在警告，请确认后再提交审核。' });
      return;
    }
    const operator = getOperator();
    const previousStatus = config.status;
    const task = buildLearningPathReviewTask(config, operator, changeSummary);
    config.status = 'pending_review';
    config.updatedBy = operator.name;
    config.updatedById = operator.id;
    config.updatedAt = task.updatedAt;
    config.changeSummary = changeSummary;
    config.dataVersion += 1;
    config.operationRecords.unshift({
      id: `lp-op-submit-${config.id}-${Date.now()}`,
      operator: operator.name,
      roleName: operator.roleName,
      action: '提交审核',
      fromStatus: previousStatus,
      toStatus: 'pending_review',
      reason: changeSummary,
      time: task.updatedAt,
    });
    pushLearningPathAuditLog(currentRoleId, 'submit', 'success', config, changeSummary, `${learningPathKindName(config.kind)} ${config.name} 提交审核，审核任务 ${task.id}。`, 'pending_review');
    res.send({ success: true, data: config, reviewTask: task });
  },
  'GET /api/learning-path/configs/:id/versions': (req: Request, res: Response) => {
    if (!roleCanReadLearningPath(currentRoleId)) {
      res.status(403).send({ success: false, errorCode: '403', errorMessage: '当前账号无版本记录访问权限。' });
      return;
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const config = getLearningPathConfig(id);
    if (!config) {
      res.status(404).send({ success: false, errorCode: '404', errorMessage: '学习路径配置不存在。' });
      return;
    }
    res.send({ success: true, ...paginateArray(config.versionRecords, req.query) });
  },
  'GET /api/learning-path/references/questions': (req: Request, res: Response) => {
    if (!roleCanReadLearningPath(currentRoleId)) {
      res.status(403).send({ success: false, errorCode: '403', errorMessage: '当前账号无引用题目访问权限。' });
      return;
    }
    res.send({ success: true, ...paginateArray(filterLearningPathReferences(questionData.map(buildQuestionReference), req.query), req.query) });
  },
  'GET /api/learning-path/references/question-groups': (req: Request, res: Response) => {
    if (!roleCanReadLearningPath(currentRoleId)) {
      res.status(403).send({ success: false, errorCode: '403', errorMessage: '当前账号无引用题组访问权限。' });
      return;
    }
    res.send({ success: true, ...paginateArray(filterLearningPathReferences(questionGroupReferences, req.query), req.query) });
  },
  'GET /api/review-release/tasks': (req: Request, res: Response) => {
    const data = filterReviewTasks(req.query);
    res.send({
      success: true,
      data,
      total: data.length,
    });
  },
  'GET /api/review-release/tasks/:id': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const task = reviewTasksData.find((item) => item.id === id);

    if (!task) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '审核任务不存在。',
      });
      return;
    }

    res.send({
      success: true,
      data: task,
    });
  },
  'PATCH /api/review-release/tasks/:id/status': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const nextStatus = req.body?.status as API.ReviewTaskStatus | undefined;
    const reason = String(req.body?.reason ?? '').trim();
    const task = reviewTasksData.find((item) => item.id === id);

    if (!task) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '审核任务不存在。',
      });
      return;
    }

    if (!nextStatus || !validReviewTransitions[task.status]?.includes(nextStatus)) {
      if (
        nextStatus === 'published' &&
        task.status === 'published' &&
        (isLearningPathConfig(task) || isAiCoachReviewTask(task))
      ) {
        res.send({
          success: true,
          data: task,
        });
        return;
      }
      res.status(400).send({
        success: false,
        errorCode: '400',
        errorMessage: '审核状态流转不合法。',
      });
      return;
    }

    if (reviewReasonRequiredStatuses.includes(nextStatus) && !reason) {
      res.status(400).send({
        success: false,
        errorCode: '400',
        errorMessage: '该操作必须填写原因。',
      });
      return;
    }

    if (!currentRoleId || !roleCanOperateReviewTask(currentRoleId, task, nextStatus)) {
      if (currentRoleId) {
        pushReviewAuditLog(
          currentRoleId,
          task,
          reviewStatusActionMap[nextStatus],
          'denied',
          '角色无权执行该审核发布操作。',
          `尝试将 ${task.id} 从 ${task.status} 变更为 ${nextStatus} 被拒绝。`,
        );
      }
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '无权执行该操作。',
      });
      return;
    }

    const previousStatus = task.status;
    const operator = getOperator();
    const action = reviewStatusActionMap[nextStatus];
    const operationReason = reason || `${action}。`;
    task.status = nextStatus;
    task.updatedAt = nowText();
    task.reviewOpinion = operationReason;
    task.reviewerId = operator.id;
    task.reviewer = operator.name;
    task.operationRecords.unshift({
      id: `op-${task.id}-${Date.now()}`,
      operator: operator.name,
      roleName: operator.roleName,
      action,
      fromStatus: previousStatus,
      toStatus: nextStatus,
      reason: operationReason,
      time: task.updatedAt,
    });
    task.versionRecords.unshift({
      id: `version-${task.id}-${Date.now()}`,
      version: task.version,
      status: nextStatus,
      summary: `${action}：${task.changeSummary}`,
      createdBy: operator.name,
      createdAt: task.updatedAt,
    });
    syncQuestionFromReviewTask(
      task,
      previousStatus,
      nextStatus,
      operator.name,
      operationReason,
    );
    syncLearningPathFromReviewTask(
      task,
      previousStatus,
      nextStatus,
      operator,
      operationReason,
    );
    syncAiCoachStrategyFromReviewTask(
      task,
      previousStatus,
      nextStatus,
      operatorFromRole(operator.roleId, operator.id, operator.name),
      operationReason,
    );

    pushReviewAuditLog(
      currentRoleId,
      task,
      action,
      'success',
      operationReason,
      `审核任务 ${task.id} 状态由 ${previousStatus} 变更为 ${nextStatus}。`,
    );

    res.send({
      success: true,
      data: task,
    });
  },
  'PATCH /api/admin/accounts/:id/status': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const nextStatus = req.body?.status as API.AdminAccountStatus | undefined;
    const account = buildAdminAccounts().find((item) => item.id === id);

    if (!account) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '账号不存在。',
      });
      return;
    }

    if (!['enabled', 'disabled', 'locked'].includes(nextStatus ?? '')) {
      res.status(400).send({
        success: false,
        errorCode: '400',
        errorMessage: '账号状态无效。',
      });
      return;
    }

    accountStatusMap[id] = nextStatus as API.AdminAccountStatus;
    if (nextStatus === 'disabled') {
      disabledAccounts.add(id);
    } else {
      disabledAccounts.delete(id);
    }

    if (currentRoleId) {
      pushAuditLog(
        currentRoleId,
        nextStatus === 'enabled' ? 'edit' : 'disable',
        'success',
        '/system/accounts',
        `账号 ${id} 状态由 ${account.status} 变更为 ${nextStatus}。`,
      );
    }

    res.send({
      success: true,
      data: buildAdminAccount(id, account.roleId as AdminRoleId, account.remark),
    });
  },
  'POST /api/admin/audit-logs': (req: Request, res: Response) => {
    if (currentRoleId) {
      pushAuditLog(
        currentRoleId,
        req.body?.action ?? 'restricted_access',
        req.body?.result ?? 'success',
        req.body?.sourcePage ?? '/dashboard/overview',
        req.body?.changeSummary ?? '开发环境审计日志写入。',
      );
    }
    res.send({
      success: true,
      data: auditLogs[0],
    });
  },
  'GET /api/operation/users': (req: Request, res: Response) => {
    if (!roleCanViewUserList(currentRoleId)) {
      if (currentRoleId) {
        pushOperationAuditLog({
          roleId: currentRoleId,
          logType: 'permission_denied',
          action: 'restricted_access',
          objectId: 'users/list',
          sourcePage: '/users/list',
          reason: '当前角色无用户列表访问权限。',
          result: 'denied',
          changeSummary: 'Mock API 拒绝用户列表访问。',
        });
      }
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无用户列表访问权限。',
      });
      return;
    }

    const filteredUsers = filterOperationUsers(req.query).map((user) =>
      buildUserPayload(user, currentRoleId, false),
    );
    const page = paginateArray(filteredUsers, req.query);
    res.send({
      success: true,
      ...page,
    });
  },
  'GET /api/operation/users/:id/learning-path-match': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = getOperationUser(id);

    if (!roleCanViewUserDetail(currentRoleId)) {
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无学习路径摘要访问权限。',
      });
      return;
    }

    if (!user) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '用户不存在。',
      });
      return;
    }

    res.send({
      success: true,
      data: buildUserLearningPathMatch(id),
    });
  },
  'GET /api/operation/users/:id': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = getOperationUser(id);

    if (!roleCanViewUserDetail(currentRoleId)) {
      if (currentRoleId) {
        pushOperationAuditLog({
          roleId: currentRoleId,
          logType: 'permission_denied',
          action: 'restricted_access',
          objectId: id,
          sourcePage: `/users/${id}`,
          reason: '当前角色无用户详情访问权限。',
          result: 'denied',
          changeSummary: 'Mock API 拒绝用户详情访问。',
        });
      }
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无用户详情访问权限。',
      });
      return;
    }

    if (!user) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '用户不存在。',
      });
      return;
    }

    if (currentRoleId) {
      pushOperationAuditLog({
        roleId: currentRoleId,
        action: 'read',
        objectId: id,
        sourcePage: `/users/${id}`,
        reason: '访问用户详情。',
        result: 'success',
        changeSummary: '访问用户详情，默认返回脱敏信息。',
      });
    }

    res.send({
      success: true,
      data: buildUserPayload(user, currentRoleId, true),
    });
  },
  'GET /api/operation/users/:id/learning-records': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = getOperationUser(id);

    if (!roleCanViewUserDetail(currentRoleId)) {
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无学习记录访问权限。',
      });
      return;
    }

    if (!user) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '用户不存在。',
      });
      return;
    }

    const dateRange = parseRange(req.query.dateRange);
    const moduleName = getQueryValue(req.query.module);
    const status = getQueryValue(req.query.status);
    const errorTag = getQueryValue(req.query.errorTag);
    const records = (user.learningRecords ?? []).filter((record) => {
      if (moduleName && record.module !== moduleName) return false;
      if (status && record.status !== status) return false;
      if (errorTag && !record.errorTags.includes(errorTag)) return false;
      if (dateRange.length === 2) {
        const recordTime = new Date(record.date).getTime();
        const start = new Date(dateRange[0]).getTime();
        const end = new Date(dateRange[1]).getTime();
        if (Number.isFinite(start) && recordTime < start) return false;
        if (Number.isFinite(end) && recordTime > end) return false;
      }
      return true;
    });
    const page = paginateArray(records, req.query);
    res.send({
      success: true,
      ...page,
    });
  },
  'GET /api/operation/users/:id/feedback': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = getOperationUser(id);

    if (!roleCanViewUserDetail(currentRoleId)) {
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无反馈记录访问权限。',
      });
      return;
    }

    if (!user) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '用户不存在。',
      });
      return;
    }

    const status = getQueryValue(req.query.status);
    const feedbacks = (user.feedbacks ?? [])
      .filter((feedback) => !status || feedback.status === status)
      .map((feedback) => ({
        ...feedback,
        originalContent: undefined,
      }));
    const page = paginateArray(feedbacks, req.query);
    res.send({
      success: true,
      ...page,
    });
  },
  'GET /api/operation/users/:id/ai-summaries': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = getOperationUser(id);

    if (!roleCanViewUserDetail(currentRoleId)) {
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无 AI 摘要访问权限。',
      });
      return;
    }

    if (!user) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '用户不存在。',
      });
      return;
    }

    const summaries = (user.aiSummaries ?? []).map((summary) => ({
      ...summary,
      summaryContent: undefined,
    }));
    const page = paginateArray(summaries, req.query);
    res.send({
      success: true,
      ...page,
    });
  },
  'GET /api/operation/users/:id/access-logs': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = getOperationUser(id);

    if (!roleCanViewUserDetail(currentRoleId)) {
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无访问记录权限。',
      });
      return;
    }

    if (!user) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '用户不存在。',
      });
      return;
    }

    const page = paginateArray(user.accessLogs ?? [], req.query);
    res.send({
      success: true,
      ...page,
    });
  },
  'PATCH /api/operation/users/:id/feedback/:feedbackId/status': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const feedbackId = Array.isArray(req.params.feedbackId)
      ? req.params.feedbackId[0]
      : req.params.feedbackId;
    const user = getOperationUser(id);

    if (!currentRoleId || !roleCanHandleFeedback(currentRoleId)) {
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无反馈处理权限。',
      });
      return;
    }

    if (!user) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '用户不存在。',
      });
      return;
    }

    const feedback = getFeedbackById(user, feedbackId);
    if (!feedback) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '反馈不存在。',
      });
      return;
    }

    const nextStatus = req.body?.status as API.UserFeedbackStatus;
    const reason = String(req.body?.reason ?? '').trim();
    const remark = String(req.body?.remark ?? '').trim();
    const version = Number(req.body?.version);

    if (version !== feedback.version) {
      pushOperationAuditLog({
        roleId: currentRoleId,
        action: 'edit',
        objectId: feedback.id,
        sourcePage: `/users/${id}`,
        reason: '反馈状态数据版本冲突。',
        result: 'failed',
        changeSummary: '反馈状态更新被拒绝，数据已被其他操作更新。',
        originalStatus: feedback.status,
        newStatus: nextStatus,
      });
      res.status(409).send({
        success: false,
        errorCode: '409',
        errorMessage: '数据已更新，请刷新后重试。',
      });
      return;
    }

    if (!feedbackStatusTransitions[feedback.status]?.includes(nextStatus)) {
      res.status(400).send({
        success: false,
        errorCode: '400',
        errorMessage: '反馈状态流转不符合规则。',
      });
      return;
    }

    if ((nextStatus === 'resolved' && !remark && !reason) || (nextStatus === 'no_action' && !reason)) {
      res.status(400).send({
        success: false,
        errorCode: '400',
        errorMessage: nextStatus === 'no_action' ? '无需处理原因必填。' : '处理结果或备注必填。',
      });
      return;
    }

    const previousStatus = feedback.status;
    feedback.status = nextStatus;
    feedback.handler = roleConfigs[currentRoleId].name;
    feedback.remark = remark || reason || feedback.remark;
    feedback.version += 1;
    feedback.updatedAt = nowText();
    feedback.statusHistory.unshift({
      id: `${feedback.id}-history-${Date.now()}`,
      operator: roleConfigs[currentRoleId].name,
      fromStatus: previousStatus,
      toStatus: nextStatus,
      reason: reason || '更新反馈状态。',
      remark,
      version: feedback.version,
      time: feedback.updatedAt,
      result: 'success',
    });
    user.latestFeedbackStatus = user.feedbacks?.[0]?.status;
    user.latestHandler = feedback.handler;
    user.unhandledFeedbackCount = (user.feedbacks ?? []).filter((item) =>
      ['pending', 'processing'].includes(item.status),
    ).length;

    pushOperationAuditLog({
      roleId: currentRoleId,
      action: 'edit',
      objectId: feedback.id,
      sourcePage: `/users/${id}`,
      reason: reason || '更新反馈状态。',
      result: 'success',
      changeSummary: `反馈状态由${feedbackStatusLabels[previousStatus]}变更为${feedbackStatusLabels[nextStatus]}。`,
      originalStatus: previousStatus,
      newStatus: nextStatus,
    });

    res.send({
      success: true,
      data: {
        ...feedback,
        originalContent: undefined,
      },
    });
  },
  'POST /api/operation/users/:id/remarks': (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = getOperationUser(id);

    if (!currentRoleId || !roleCanHandleFeedback(currentRoleId)) {
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无备注权限。',
      });
      return;
    }

    if (!user) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '用户不存在。',
      });
      return;
    }

    const content = String(req.body?.content ?? '').trim();
    if (!content) {
      res.status(400).send({
        success: false,
        errorCode: '400',
        errorMessage: '备注内容不能为空。',
      });
      return;
    }

    const remark: API.UserRemark = {
      id: `remark-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      operator: roleConfigs[currentRoleId].name,
      roleName: roleConfigs[currentRoleId].name,
      content,
      createdAt: nowText(),
    };
    user.remarks = [remark, ...(user.remarks ?? [])];

    pushOperationAuditLog({
      roleId: currentRoleId,
      action: 'edit',
      objectId: user.id,
      sourcePage: `/users/${id}`,
      reason: '添加客服备注。',
      result: 'success',
      changeSummary: '新增客服处理备注。',
    });

    res.send({
      success: true,
      data: remark,
    });
  },
  'POST /api/operation/sensitive-access-logs': (req: Request, res: Response) => {
    const body = req.body as API.SensitiveAccessParams;
    const user = getOperationUser(body.userId);

    if (!currentRoleId || !roleCanAccessSensitiveUserData(currentRoleId)) {
      if (currentRoleId && user) {
        recordSensitiveAccess(user, currentRoleId, body, 'denied');
      }
      res.status(403).send({
        success: false,
        errorCode: '403',
        errorMessage: '当前账号无敏感信息访问权限。',
      });
      return;
    }

    if (!user) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '用户不存在。',
      });
      return;
    }

    if (!body.accessReason?.trim() || !body.objectType || !body.objectId) {
      res.status(400).send({
        success: false,
        errorCode: '400',
        errorMessage: '敏感访问参数不完整。',
      });
      return;
    }

    if (body.simulateFailure || body.objectId === 'simulate-log-failure') {
      recordSensitiveAccess(user, currentRoleId, body, 'failed');
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '敏感访问日志写入失败，已拒绝展示内容。',
      });
      return;
    }

    const accessLog = recordSensitiveAccess(user, currentRoleId, body, 'success');
    if (body.objectType === 'user_private_profile') {
      const privateData = mockUserPrivateData[user.id];
      res.send({
        success: true,
        data: {
          accessLog,
          fields: {
            phone: privateData.phone,
            email: privateData.email,
            deviceId: privateData.deviceId,
            ip: privateData.ip.replace(/\.\d+$/, '.*'),
          },
        },
      });
      return;
    }

    if (body.objectType === 'feedback_original_content') {
      const feedback = getFeedbackById(user, body.objectId);
      if (!feedback) {
        res.status(404).send({
          success: false,
          errorCode: '404',
          errorMessage: '反馈不存在。',
        });
        return;
      }
      res.send({
        success: true,
        data: {
          accessLog,
          content: feedbackOriginalContentMap[feedback.id],
        },
      });
      return;
    }

    if (body.objectType === 'ai_conversation_summary') {
      const summary = getAiSummaryById(user, body.objectId);
      if (!summary) {
        res.status(404).send({
          success: false,
          errorCode: '404',
          errorMessage: 'AI 摘要不存在。',
        });
        return;
      }
      res.send({
        success: true,
        data: {
          accessLog,
          content: aiSummaryContentMap[summary.id],
        },
      });
      return;
    }

    res.status(400).send({
      success: false,
      errorCode: '400',
      errorMessage: '敏感对象类型无效。',
    });
  },
  'GET /api/users': [
    {
      key: '1',
      name: '脱敏用户 A',
      age: 20,
      address: 'CET-4 备考',
    },
    {
      key: '2',
      name: '脱敏用户 B',
      age: 22,
      address: 'CET-6 备考',
    },
  ],
  'POST /api/login/account': async (req: Request, res: Response) => {
    const { password, username, type } = req.body;
    await waitTime(300);

    if (disabledAccounts.has(username) || accountStatusMap[username] === 'disabled') {
      currentRoleId = '';
      currentAccountId = '';
      currentAccountName = '';
      clearMockSession();
      res.send({
        status: 'error',
        type,
        currentAuthority: 'disabled',
        errorMessage: '账号已停用，请联系超级管理员。',
      });
      return;
    }

    if (accountStatusMap[username] === 'locked') {
      currentRoleId = '';
      currentAccountId = '';
      currentAccountName = '';
      clearMockSession();
      res.send({
        status: 'error',
        type,
        currentAuthority: 'locked',
        errorMessage: '账号已锁定，请联系超级管理员。',
      });
      return;
    }

    const roleId = type === 'mobile' ? 'super_admin' : resolveRoleId(username);
    const role = roleId ? roleConfigs[roleId] : undefined;

    if (role && (password === role.password || type === 'mobile')) {
      currentRoleId = role.id;
      currentAccountId = username || role.username;
      currentAccountName = accountDisplayNameMap[currentAccountId] ?? role.name;
      accountLastLoginAtMap[currentAccountId] = new Date().toLocaleString('zh-CN', {
        hour12: false,
      });
      setMockSession(role.id, currentAccountId, currentAccountName);
      pushAuditLog(role.id, 'login', 'success', '/user/login', '登录成功。');
      res.send({
        status: 'ok',
        type,
        currentAuthority: role.id,
        roleId: role.id,
        roleName: role.name,
      });
      return;
    }

    currentRoleId = '';
    currentAccountId = '';
    currentAccountName = '';
    clearMockSession();
    res.send({
      status: 'error',
      type,
      currentAuthority: 'guest',
      errorMessage: '账号或密码错误。',
    });
  },
  'POST /api/login/outLogin': (_req: Request, res: Response) => {
    currentRoleId = '';
    currentAccountId = '';
    currentAccountName = '';
    clearMockSession();
    res.send({ data: {}, success: true });
  },
  'GET /api/500': (_req: Request, res: Response) => {
    res.status(500).send({
      timestamp: 1513932555104,
      status: 500,
      error: 'error',
      message: 'error',
      path: '/base/category/list',
    });
  },
  'GET /api/404': (_req: Request, res: Response) => {
    res.status(404).send({
      timestamp: 1513932643431,
      status: 404,
      error: 'Not Found',
      message: 'No message available',
      path: '/base/category/list/2121212',
    });
  },
  'GET /api/403': (_req: Request, res: Response) => {
    res.status(403).send({
      timestamp: 1513932555104,
      status: 403,
      error: 'Forbidden',
      message: 'Forbidden',
      path: '/base/category/list',
    });
  },
  'GET /api/401': (_req: Request, res: Response) => {
    res.status(401).send({
      timestamp: 1513932555104,
      status: 401,
      error: 'Unauthorized',
      message: 'Unauthorized',
      path: '/base/category/list',
    });
  },
  'GET /api/login/captcha': async (_req: Request, res: Response) => {
    await waitTime(300);
    return res.json('captcha-xxx');
  },
};
