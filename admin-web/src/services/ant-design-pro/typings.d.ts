// @ts-ignore
/* eslint-disable */

declare namespace API {
  type CurrentUser = {
    name?: string;
    avatar?: string;
    userid?: string;
    email?: string;
    signature?: string;
    title?: string;
    group?: string;
    tags?: { key?: string; label?: string }[];
    notifyCount?: number;
    unreadCount?: number;
    country?: string;
    access?: string;
    accountId?: string;
    accountName?: string;
    roleId?: string;
    roleName?: string;
    menuPermissions?: string[];
    actionPermissions?: Record<string, string[]>;
    dataScopes?: string[];
    geographic?: {
      province?: { label?: string; key?: string };
      city?: { label?: string; key?: string };
    };
    address?: string;
    phone?: string;
  };

  type LoginResult = {
    status?: string;
    type?: string;
    currentAuthority?: string;
    roleId?: string;
    roleName?: string;
    errorMessage?: string;
  };

  type AdminAccountStatus = 'enabled' | 'disabled' | 'locked';

  type AdminRole = {
    id: string;
    name: string;
    username: string;
    description: string;
    modules: string[];
    actions: Record<string, string[]>;
    dataScopes: string[];
  };

  type AdminAccount = {
    id: string;
    username: string;
    displayName: string;
    roleId: string;
    roleName: string;
    status: AdminAccountStatus;
    dataScopes: string[];
    lastLoginAt: string;
    createdAt: string;
    remark?: string;
  };

  type AuditLogItem = {
    id: string;
    logType?: AuditLogType;
    operator: string;
    roleId: string;
    roleName: string;
    action: string;
    objectType: string;
    objectId: string;
    objectSubtype?: string;
    sourcePage: string;
    time: string;
    reason: string;
    result: 'success' | 'denied' | 'failed';
    changeSummary: string;
    originalStatus?: string;
    newStatus?: string;
    version?: string;
  };

  type AuditLogType = 'operation' | 'sensitive_access' | 'permission_denied';

  type AdminAccountStatusUpdateParams = {
    status: AdminAccountStatus;
    reason?: string;
  };

  type ReviewTaskStatus =
    | 'draft'
    | 'pending_review'
    | 'rejected'
    | 'approved'
    | 'pending_release'
    | 'published'
    | 'offline'
    | 'rolled_back';

  type ReviewObjectType =
    | 'question_bank'
    | 'learning_path_config'
    | 'learning_rule'
    | 'ai_strategy'
    | 'writing_translation'
    | 'mock_exam';

  type ReviewRiskLevel = 'low' | 'medium' | 'high';

  type ReviewOperationRecord = {
    id: string;
    operator: string;
    roleName: string;
    action: string;
    fromStatus?: ReviewTaskStatus;
    toStatus: ReviewTaskStatus;
    reason: string;
    time: string;
  };

  type ReviewVersionRecord = {
    id: string;
    version: string;
    status: ReviewTaskStatus;
    summary: string;
    createdBy: string;
    createdAt: string;
  };

  type ReviewTask = {
    id: string;
    objectType: ReviewObjectType;
    objectSubtype?: LearningPathConfigKind;
    objectTypeName: string;
    objectId: string;
    objectName: string;
    moduleKey: string;
    moduleName: string;
    submitterId?: string;
    submitter: string;
    submittedAt: string;
    version: string;
    priority: 'P0' | 'P1' | 'P2';
    status: ReviewTaskStatus;
    riskLevel: ReviewRiskLevel;
    updatedAt: string;
    changeSummary: string;
    impactScope: string;
    reviewOpinion?: string;
    reviewerId?: string;
    reviewer?: string;
    releasePlan?: string;
    rollbackTargetVersion?: string;
    versionRecords: ReviewVersionRecord[];
    operationRecords: ReviewOperationRecord[];
  };

  type ReviewTaskStatusUpdateParams = {
    status: ReviewTaskStatus;
    reason?: string;
  };

  type ExamType = 'CET4' | 'CET6';

  type QuestionType = 'single_choice' | 'reading_choice' | 'listening_choice';

  type QuestionSkill = 'vocabulary' | 'grammar' | 'reading' | 'listening';

  type QuestionDifficulty = 'easy' | 'medium' | 'hard';

  type QuestionOption = {
    key: 'A' | 'B' | 'C' | 'D';
    content: string;
  };

  type QuestionItem = {
    id: string;
    title: string;
    stem: string;
    examType: ExamType;
    questionType: QuestionType;
    skill: QuestionSkill;
    difficulty: QuestionDifficulty;
    tags: string[];
    options: QuestionOption[];
    answer: 'A' | 'B' | 'C' | 'D';
    analysis: string;
    status: ReviewTaskStatus;
    version: string;
    creator: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
    changeSummary: string;
    referenceImpact: string;
    reviewTaskId?: string;
    versionRecords: ReviewVersionRecord[];
    operationRecords: ReviewOperationRecord[];
  };

  type QuestionSaveParams = {
    title: string;
    stem: string;
    examType: ExamType;
    questionType: QuestionType;
    skill: QuestionSkill;
    difficulty: QuestionDifficulty;
    tags?: string[];
    options: QuestionOption[];
    answer: 'A' | 'B' | 'C' | 'D';
    analysis: string;
    changeSummary?: string;
    referenceImpact?: string;
  };

  type QuestionSubmitReviewParams = {
    changeSummary: string;
  };

  type PageParams = {
    current?: number;
    pageSize?: number;
  };

  type RuleListItem = {
    key?: number;
    disabled?: boolean;
    href?: string;
    avatar?: string;
    name?: string;
    owner?: string;
    desc?: string;
    callNo?: number;
    status?: number;
    updatedAt?: string;
    createdAt?: string;
    progress?: number;
  };

  type RuleList = {
    data?: RuleListItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };

  type AdminAccountList = {
    data?: AdminAccount[];
    total?: number;
    success?: boolean;
  };

  type AdminRoleList = {
    data?: AdminRole[];
    total?: number;
    success?: boolean;
  };

  type AuditLogList = {
    data?: AuditLogItem[];
    total?: number;
    success?: boolean;
  };

  type ReviewTaskList = {
    data?: ReviewTask[];
    total?: number;
    success?: boolean;
  };

  type QuestionList = {
    data?: QuestionItem[];
    total?: number;
    success?: boolean;
  };

  type UserFeedbackStatus = 'pending' | 'processing' | 'resolved' | 'no_action' | 'closed';

  type UserTaskStatus = 'not_started' | 'in_progress' | 'completed' | 'interrupted';

  type UserOnboardingStatus = 'not_started' | 'completed';

  type UserDiagnosisStatus = 'not_started' | 'completed';

  type SensitiveAccessObjectType =
    | 'user_private_profile'
    | 'feedback_original_content'
    | 'ai_conversation_summary';

  type UserExamProfile = {
    examType: ExamType;
    targetScore: number;
    examDate: string;
    dailyStudyMinutes: number;
  };

  type UserLearningStatus = {
    onboardingStatus: UserOnboardingStatus;
    diagnosisStatus: UserDiagnosisStatus;
    weakModules: string[];
    todayTaskStatus: UserTaskStatus;
    todayTaskProgress: number;
    lastStudyAt: string;
  };

  type UserLearningRecord = {
    id: string;
    date: string;
    module: string;
    taskType: string;
    status: UserTaskStatus;
    accuracy?: number;
    errorTags: string[];
    durationSeconds: number;
    relatedObjectId: string;
    relatedObjectSummary: string;
  };

  type UserFeedbackHistoryItem = {
    id: string;
    operator: string;
    fromStatus?: UserFeedbackStatus;
    toStatus: UserFeedbackStatus;
    reason: string;
    remark?: string;
    version: number;
    time: string;
    result: 'success' | 'failed';
  };

  type UserFeedbackItem = {
    id: string;
    type: string;
    summary: string;
    submittedAt: string;
    priority: 'P0' | 'P1' | 'P2';
    status: UserFeedbackStatus;
    relatedModule: string;
    handler?: string;
    remark?: string;
    updatedAt: string;
    version: number;
    statusHistory: UserFeedbackHistoryItem[];
    originalContentAvailable: boolean;
    originalContent?: string;
  };

  type UserAiSummary = {
    id: string;
    sessionTime: string;
    intent: string;
    summaryStatus: 'available' | 'empty' | 'restricted';
    attachmentType: string;
    abnormalFlag: boolean;
    processStatus: 'pending' | 'processing' | 'resolved' | 'closed';
    strategyVersion: string;
    summaryPreview: string;
    summaryAvailable: boolean;
    summaryContent?: string;
  };

  type UserRemark = {
    id: string;
    operator: string;
    roleName: string;
    content: string;
    createdAt: string;
  };

  type UserSensitiveAccessLog = {
    id: string;
    userId: string;
    objectType: SensitiveAccessObjectType;
    objectId: string;
    operator: string;
    roleName: string;
    sourcePage: string;
    requestedFields: string[];
    accessReason: string;
    result: 'success' | 'denied' | 'failed';
    time: string;
  };

  type AdminUser = {
    id: string;
    nickname: string;
    avatar?: string;
    phoneMasked: string;
    emailMasked: string;
    deviceSummary: string;
    registerAt: string;
    lastActiveAt: string;
    examProfile: UserExamProfile;
    learningStatus: UserLearningStatus;
    currentStudyStatus: string;
    unhandledFeedbackCount: number;
    latestFeedbackStatus?: UserFeedbackStatus;
    latestHandler?: string;
    allowedActions: string[];
    learningRecords?: UserLearningRecord[];
    feedbacks?: UserFeedbackItem[];
    aiSummaries?: UserAiSummary[];
    remarks?: UserRemark[];
    accessLogs?: UserSensitiveAccessLog[];
  };

  type AdminUserList = {
    data?: AdminUser[];
    total?: number;
    current?: number;
    pageSize?: number;
    success?: boolean;
  };

  type UserFeedbackStatusUpdateParams = {
    status: UserFeedbackStatus;
    reason?: string;
    remark?: string;
    version: number;
  };

  type UserRemarkCreateParams = {
    content: string;
  };

  type SensitiveAccessParams = {
    userId: string;
    objectType: SensitiveAccessObjectType;
    objectId: string;
    accessReason: string;
    sourcePage: string;
    requestedFields: string[];
    simulateFailure?: boolean;
  };

  type LearningPathConfigKind = 'diagnosis_rule' | 'today_task_template';

  type LearningPathConfigStatus = ReviewTaskStatus;

  type LearningPathModule =
    | 'vocabulary'
    | 'grammar'
    | 'reading'
    | 'listening'
    | 'writing'
    | 'translation'
    | 'mock_exam';

  type LearningPathConditionMode = 'all' | 'any';

  type LearningPathCompareOperator = 'lt' | 'lte' | 'eq' | 'gte' | 'gt' | 'between';

  type LearningPathReferenceType = 'question' | 'question_group';

  type LearningPathReference = {
    id: string;
    type: LearningPathReferenceType;
    name: string;
    examType: ExamType;
    module: LearningPathModule;
    status: ReviewTaskStatus | 'enabled' | 'disabled';
    available: boolean;
  };

  type LearningPathUserCondition = {
    examType: ExamType;
    targetScoreMin?: number;
    targetScoreMax?: number;
    dailyMinutesMin?: number;
    dailyMinutesMax?: number;
    onboardingStatus?: UserOnboardingStatus;
    diagnosisStatus?: UserDiagnosisStatus;
    currentStudyStatus?: UserTaskStatus;
    conditionMode: LearningPathConditionMode;
  };

  type DiagnosisRuleCondition = {
    id: string;
    metric:
      | 'accuracy'
      | 'wrong_count'
      | 'module_score'
      | 'completed_questions'
      | 'error_tag_hits';
    operator: LearningPathCompareOperator;
    min?: number;
    max?: number;
    value?: number;
    errorTag?: string;
    description?: string;
  };

  type DiagnosisRuleConditionGroup = {
    mode: LearningPathConditionMode;
    conditions: DiagnosisRuleCondition[];
  };

  type DiagnosisRuleOutput = {
    weakModules: LearningPathModule[];
    weakLevel: 'low' | 'medium' | 'high';
    taskPriority: 'P0' | 'P1' | 'P2';
    recommendedTaskType: string;
    recommendedGroupId?: string;
    estimatedMinutes: number;
    outputDescription: string;
  };

  type LearningPathTaskItem = {
    id: string;
    order: number;
    module: LearningPathModule;
    taskType: string;
    contentType: LearningPathReferenceType;
    contentId: string;
    contentName: string;
    estimatedMinutes: number;
    required: boolean;
    replacementAllowed: boolean;
    description?: string;
  };

  type LearningPathConfigBase = {
    id: string;
    kind: LearningPathConfigKind;
    name: string;
    description?: string;
    examType: ExamType;
    priority: number;
    status: LearningPathConfigStatus;
    version: string;
    dataVersion: number;
    createdBy: string;
    createdById?: string;
    createdAt: string;
    updatedBy: string;
    updatedById?: string;
    updatedAt: string;
    reviewTaskId?: string;
    releaseVersionId?: string;
    changeSummary: string;
    internalRemark?: string;
    lastPrecheck?: LearningPathPrecheckResult;
    versionRecords: LearningPathConfigVersion[];
    operationRecords: ReviewOperationRecord[];
  };

  type DiagnosisRule = LearningPathConfigBase & {
    kind: 'diagnosis_rule';
    applicableModule: LearningPathModule;
    userCondition: LearningPathUserCondition;
    questionRange: string;
    references: LearningPathReference[];
    conditionGroup: DiagnosisRuleConditionGroup;
    output: DiagnosisRuleOutput;
  };

  type TodayTaskTemplate = LearningPathConfigBase & {
    kind: 'today_task_template';
    userCondition: LearningPathUserCondition;
    matchedDiagnosisRuleId?: string;
    matchedWeakModules: LearningPathModule[];
    weakLevel?: 'low' | 'medium' | 'high';
    taskItems: LearningPathTaskItem[];
    totalEstimatedMinutes: number;
    replacementAllowed: boolean;
    templateDescription?: string;
  };

  type LearningPathConfigItem = DiagnosisRule | TodayTaskTemplate;

  type LearningPathPrecheckLevel = 'passed' | 'warning' | 'error';

  type LearningPathPrecheckIssue = {
    id: string;
    level: LearningPathPrecheckLevel;
    field: string;
    message: string;
    suggestion: string;
  };

  type LearningPathPrecheckResult = {
    id: string;
    configId?: string;
    level: LearningPathPrecheckLevel;
    checkedAt: string;
    issues: LearningPathPrecheckIssue[];
    summary: string;
  };

  type LearningPathSaveParams = Partial<DiagnosisRule | TodayTaskTemplate> & {
    kind: LearningPathConfigKind;
    name: string;
    examType: ExamType;
    priority: number;
    version?: string;
    dataVersion?: number;
  };

  type LearningPathSubmitReviewParams = {
    changeSummary: string;
    dataVersion: number;
    confirmWarnings?: boolean;
    simulateTaskFailure?: boolean;
  };

  type LearningPathConfigVersion = {
    id: string;
    configId: string;
    kind: LearningPathConfigKind;
    version: string;
    status: LearningPathConfigStatus;
    createdBy: string;
    createdAt: string;
    changeSummary: string;
    reviewer?: string;
    reviewResult?: string;
    publishedAt?: string;
    publishedBy?: string;
    currentOnline: boolean;
  };

  type LearningPathConfigQueryParams = {
    current?: number;
    pageSize?: number;
    kind?: LearningPathConfigKind;
    keyword?: string;
    examType?: ExamType;
    module?: LearningPathModule;
    status?: LearningPathConfigStatus;
    priority?: number;
    conditionType?: string;
    totalMinutesMin?: number;
    totalMinutesMax?: number;
    updatedAtRange?: string[];
    sorter?: string;
  };

  type UserLearningPathMatchSummary = {
    userId: string;
    diagnosisRule?: {
      ruleId: string;
      ruleName: string;
      version: string;
      matchedAt: string;
      weakModules: LearningPathModule[];
      weakLevel: 'low' | 'medium' | 'high';
      taskPriority: 'P0' | 'P1' | 'P2';
      status: LearningPathConfigStatus;
      currentOnline: boolean;
    };
    todayTaskTemplate?: {
      templateId: string;
      templateName: string;
      version: string;
      matchedAt: string;
      taskItemCount: number;
      totalEstimatedMinutes: number;
      status: LearningPathConfigStatus;
      currentOnline: boolean;
    };
  };

  type LearningPathConfigList = {
    data?: LearningPathConfigItem[];
    total?: number;
    current?: number;
    pageSize?: number;
    success?: boolean;
  };

  type LearningPathReferenceList = {
    data?: LearningPathReference[];
    total?: number;
    current?: number;
    pageSize?: number;
    success?: boolean;
  };

  type FakeCaptcha = {
    code?: number;
    status?: string;
  };

  type LoginParams = {
    username?: string;
    password?: string;
    autoLogin?: boolean;
    type?: string;
  };

  type ErrorResponse = {
    /** 业务约定的错误码 */
    errorCode: string;
    /** 业务上的错误信息 */
    errorMessage?: string;
    /** 业务上的请求是否成功 */
    success?: boolean;
  };

  type NoticeIconList = {
    data?: NoticeIconItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };

  type NoticeIconItemType = 'notification' | 'message' | 'event';

  type NoticeIconItem = {
    id?: string;
    extra?: string;
    key?: string;
    read?: boolean;
    avatar?: string;
    title?: string;
    status?: string;
    datetime?: string;
    description?: string;
    type?: NoticeIconItemType;
  };
}
