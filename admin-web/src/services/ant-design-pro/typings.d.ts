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
    | 'pending_publish'
    | 'published'
    | 'offline'
    | 'rolled_back';

  type ReviewObjectType =
    | 'question_bank'
    | 'question_group'
    | 'external_article'
    | 'wrong_reason_tag'
    | 'daily_sentence'
    | 'learning_path_config'
    | 'learning_rule'
    | 'ai_coach_strategy'
    | 'writing_translation'
    | 'writing_translation_template'
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
    objectSubtype?:
      | LearningPathConfigKind
      | AdvancedLearningStrategyKind
      | 'onboarding_config'
      | AiCoachConfigType
      | WritingTranslationTopicType
      | WritingTranslationTemplateType
      | WrongReasonTagCategory;
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
    releaseMode?: 'immediate' | 'scheduled';
    scheduledAt?: string;
    timezone?: 'Asia/Shanghai';
    objectDetailPath?: string;
    rollbackTargetVersion?: string;
    versionRecords: ReviewVersionRecord[];
    operationRecords: ReviewOperationRecord[];
  };

  type ReviewTaskStatusUpdateParams = {
    status: ReviewTaskStatus;
    reason?: string;
    releaseMode?: 'immediate' | 'scheduled';
    scheduledAt?: string;
    timezone?: 'Asia/Shanghai';
  };

  type DailySentenceImageAssetStatus = 'active' | 'disabled';

  type DailySentenceImageAsset = {
    id: string;
    name: string;
    url: string;
    thumbnailUrl: string;
    width: number;
    height: number;
    source: string;
    copyrightNote: string;
    status: DailySentenceImageAssetStatus;
  };

  type DailySentencePrecheckLevel = 'passed' | 'warning' | 'error';

  type DailySentencePrecheckIssue = {
    id: string;
    level: Exclude<DailySentencePrecheckLevel, 'passed'>;
    field: string;
    code: string;
    message: string;
  };

  type DailySentencePrecheckResult = {
    level: DailySentencePrecheckLevel;
    summary: string;
    issues: DailySentencePrecheckIssue[];
    checkedAt: string;
  };

  type DailySentenceEffectSummary = {
    readPv: number;
    readUv: number;
    checkinUv: number;
    checkinRate?: number;
  };

  type DailySentenceEffectTrend = {
    date: string;
    readPv: number;
    readUv: number;
    checkinUv: number;
    checkinRate?: number;
  };

  type DailySentenceOperationRecord = ReviewOperationRecord;

  type DailySentenceVersionRecord = ReviewVersionRecord & {
    snapshot: {
      contentDate: string;
      quote: string;
      translation: string;
      displaySource: string;
      sourceReference: string;
      imageAssetId: string;
    };
  };

  type DailySentenceItem = {
    id: string;
    lineageId: string;
    sourceId?: string;
    contentDate: string;
    quote: string;
    translation: string;
    displaySource: string;
    sourceReference: string;
    imageAssetId: string;
    imageAsset: DailySentenceImageAsset;
    status: ReviewTaskStatus;
    version: string;
    dataVersion: number;
    creatorId: string;
    creator: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
    changeSummary: string;
    impactScope: string;
    reviewTaskId?: string;
    releaseMode?: 'immediate' | 'scheduled';
    scheduledAt?: string;
    publishedAt?: string;
    publishedVersion?: string;
    lastPrecheck?: DailySentencePrecheckResult;
    effects: DailySentenceEffectSummary;
    versionRecords: DailySentenceVersionRecord[];
    operationRecords: DailySentenceOperationRecord[];
  };

  type DailySentenceSaveParams = {
    contentDate: string;
    quote: string;
    translation: string;
    displaySource: string;
    sourceReference: string;
    imageAssetId: string;
    changeSummary: string;
    impactScope: string;
    dataVersion?: number;
  };

  type DailySentenceQueryParams = {
    current?: number;
    pageSize?: number;
    keyword?: string;
    startDate?: string;
    endDate?: string;
    status?: ReviewTaskStatus;
    assetStatus?: DailySentenceImageAssetStatus;
    creator?: string;
  };

  type DailySentenceSubmitParams = {
    changeSummary: string;
    dataVersion: number;
    confirmWarnings?: boolean;
  };

  type DailySentenceMockEventParams = {
    eventId: string;
    userId: string;
    eventType: 'read' | 'check_in';
    occurredAt?: string;
  };

  type DailySentenceEvent = DailySentenceMockEventParams & {
    id: string;
    sentenceId: string;
    version: string;
    occurredAt: string;
  };

  type AiCoachConfigType =
    | 'intent'
    | 'prompt_template'
    | 'response_structure'
    | 'dependency_rule'
    | 'attachment_policy';

  type AiCoachBusinessScene =
    | 'listening_coach'
    | 'speaking_coach'
    | 'writing_explanation'
    | 'error_explanation'
    | 'learning_path_recommendation';

  type AiCoachStrategyStatus = ReviewTaskStatus;

  type AiCoachRiskLevel = 'low' | 'medium' | 'high';

  type AiCoachPrecheckLevel = 'passed' | 'warning' | 'error';

  type AiCoachInputVariable = {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    description: string;
    exampleValue?: string;
    defaultValue?: string;
  };

  type AiCoachRiskPolicy = {
    dependencyPrevention: boolean;
    answerBoundary: string;
    sensitivePolicy: string;
    fallbackStrategy: string;
    escalationRule?: string;
    highRiskKeywords?: string[];
  };

  type AiCoachPrecheckIssue = {
    id: string;
    level: AiCoachPrecheckLevel;
    field: string;
    message: string;
    suggestion: string;
  };

  type AiCoachPrecheckResult = {
    level: AiCoachPrecheckLevel;
    summary: string;
    issues: AiCoachPrecheckIssue[];
    checkedAt: string;
  };

  type AiCoachStaticValidationCase = {
    id: string;
    title: string;
    input: string;
    expected: string;
    result?: AiCoachPrecheckLevel;
    message?: string;
  };

  type AiCoachStaticValidationResult = {
    level: AiCoachPrecheckLevel;
    summary: string;
    cases: AiCoachStaticValidationCase[];
    checkedAt: string;
    mockOnly: true;
  };

  type AiCoachVersionSnapshot = {
    version: string;
    title: string;
    status: AiCoachStrategyStatus;
    configType: AiCoachConfigType;
    businessScenes: AiCoachBusinessScene[];
    bodySummary: string;
    createdBy: string;
    createdAt: string;
  };

  type AiCoachVersionDiffItem = {
    field: string;
    before?: string;
    after?: string;
    changed: boolean;
  };

  type AiCoachVersionDiff = {
    fromVersion: string;
    toVersion: string;
    items: AiCoachVersionDiffItem[];
  };

  type AiCoachIntentBody = {
    intentKey: string;
    description: string;
    triggerExamples: string[];
    outputIntent: string;
    confidenceThreshold: number;
  };

  type AiCoachPromptTemplateBody = {
    systemRole: string;
    promptBody: string;
    variables: AiCoachInputVariable[];
    styleRules: string[];
  };

  type AiCoachResponseStructureBody = {
    schemaName: string;
    sections: {
      key: string;
      title: string;
      required: boolean;
      description: string;
    }[];
    outputExample: string;
  };

  type AiCoachDependencyRuleBody = {
    dependencySignals: string[];
    interventionMessage: string;
    maxConsecutiveAnswers: number;
    cooldownMinutes: number;
  };

  type AiAttachmentType = 'image' | 'document' | 'audio';

  type AiAttachmentRecognitionMode =
    | 'image_ocr'
    | 'document_text_extract'
    | 'audio_asr';

  type AiAttachmentRule = {
    id: string;
    attachmentType: AiAttachmentType;
    allowedFormats: string[];
    maxSizeMb: number;
    recognitionMode: AiAttachmentRecognitionMode;
    enabled: boolean;
  };

  type AiAttachmentPolicyBody = {
    rules: AiAttachmentRule[];
    failureMessages: {
      unsupportedType: string;
      sizeExceeded: string;
      recognitionFailed: string;
    };
  };

  type AiCoachStrategyBase = {
    id: string;
    title: string;
    description: string;
    configType: AiCoachConfigType;
    businessScenes: AiCoachBusinessScene[];
    examTypes: ExamType[];
    status: AiCoachStrategyStatus;
    riskLevel: AiCoachRiskLevel;
    version: string;
    dataVersion: number;
    creatorId: string;
    creator: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
    changeSummary: string;
    impactScope: string;
    reviewTaskId?: string;
    publishedVersion?: string;
    rollbackTargetVersion?: string;
    riskPolicy: AiCoachRiskPolicy;
    validationCases: AiCoachStaticValidationCase[];
    lastPrecheck?: AiCoachPrecheckResult;
    lastValidation?: AiCoachStaticValidationResult;
    versionSnapshots: AiCoachVersionSnapshot[];
    operationRecords: ReviewOperationRecord[];
  };

  type AiCoachIntentStrategy = AiCoachStrategyBase & {
    configType: 'intent';
    body: AiCoachIntentBody;
  };

  type AiCoachPromptTemplateStrategy = AiCoachStrategyBase & {
    configType: 'prompt_template';
    body: AiCoachPromptTemplateBody;
  };

  type AiCoachResponseStructureStrategy = AiCoachStrategyBase & {
    configType: 'response_structure';
    body: AiCoachResponseStructureBody;
  };

  type AiCoachDependencyRuleStrategy = AiCoachStrategyBase & {
    configType: 'dependency_rule';
    body: AiCoachDependencyRuleBody;
  };

  type AiAttachmentPolicyStrategy = AiCoachStrategyBase & {
    configType: 'attachment_policy';
    body: AiAttachmentPolicyBody;
  };

  type AiCoachStrategy =
    | AiCoachIntentStrategy
    | AiCoachPromptTemplateStrategy
    | AiCoachResponseStructureStrategy
    | AiCoachDependencyRuleStrategy
    | AiAttachmentPolicyStrategy;

  type AiCoachStrategyQueryParams = {
    current?: number;
    pageSize?: number;
    keyword?: string;
    configType?: AiCoachConfigType;
    businessScene?: AiCoachBusinessScene;
    status?: AiCoachStrategyStatus;
    riskLevel?: AiCoachRiskLevel;
  };

  type AiCoachStrategySaveParams = {
    strategyId?: string;
    title: string;
    description: string;
    configType: AiCoachConfigType;
    businessScenes: AiCoachBusinessScene[];
    examTypes: ExamType[];
    body: Partial<
      AiCoachIntentBody &
        AiCoachPromptTemplateBody &
        AiCoachResponseStructureBody &
        AiCoachDependencyRuleBody &
        AiAttachmentPolicyBody
    >;
    riskPolicy: AiCoachRiskPolicy;
    validationCases?: AiCoachStaticValidationCase[];
    changeSummary?: string;
    impactScope?: string;
    dataVersion?: number;
  };

  type AiCoachStrategySubmitParams = {
    changeSummary: string;
    dataVersion: number;
    confirmWarnings?: boolean;
  };

  type AiAttachmentMockScenario =
    | 'success'
    | 'unsupported_type'
    | 'size_exceeded'
    | 'recognition_failed';

  type AiAttachmentMockSessionParams = {
    scenario: AiAttachmentMockScenario;
    dataVersion: number;
    idempotencyKey: string;
  };

  type AiAttachmentMockSample = {
    id: string;
    scenario: AiAttachmentMockScenario;
    result: 'passed' | 'failed';
    attachmentType: AiAttachmentType;
    format: string;
    sizeMb: number;
    recognitionMode?: AiAttachmentRecognitionMode;
    message: string;
    strategyId: string;
    strategyVersion: string;
    createdAt: string;
  };

  type AiAbnormalReplyStatus = 'pending' | 'processing' | 'resolved' | 'closed';

  type AiAbnormalReplyType =
    | 'intent_mismatch'
    | 'answer_deviation'
    | 'structure_missing'
    | 'dependency_boundary_violation'
    | 'attachment_policy_failure';

  type AiAbnormalResolutionType =
    | 'strategy_fix'
    | 'false_positive'
    | 'no_strategy_change';

  type AiAbnormalEvidence = {
    userInput: string;
    aiReply: string;
    expectedOutcome: string;
    observedIssue: string;
    sessionSummary: string;
    redactionNote: string;
  };

  type AiAbnormalRetestResult = {
    id: string;
    strategyId: string;
    strategyTitle: string;
    strategyVersion: string;
    result: AiCoachPrecheckLevel;
    summary: string;
    checkedAt: string;
    operator: string;
    mockOnly: true;
    cases: AiCoachStaticValidationCase[];
  };

  type AiAbnormalOperationRecord = ReviewOperationRecord;

  type AiAbnormalReply = {
    id: string;
    title: string;
    abnormalType: AiAbnormalReplyType;
    severity: AiCoachRiskLevel;
    status: AiAbnormalReplyStatus;
    businessScene: AiCoachBusinessScene;
    examType: ExamType;
    userId: string;
    userNickname: string;
    sessionId: string;
    sessionStartedAt: string;
    source: 'mock_session_review' | 'mock_attachment_validation';
    linkedStrategyId: string;
    linkedStrategyTitle: string;
    linkedStrategyVersion: string;
    linkedStrategyStatus: AiCoachStrategyStatus;
    rootCauseType?: AiCoachConfigType;
    diagnosis?: string;
    fixStrategyId?: string;
    fixStrategyTitle?: string;
    fixStrategyVersion?: string;
    fixReviewTaskId?: string;
    latestRetest?: AiAbnormalRetestResult;
    resolutionType?: AiAbnormalResolutionType;
    resolutionSummary?: string;
    handlerId?: string;
    handler?: string;
    handledAt?: string;
    closedAt?: string;
    createdAt: string;
    updatedAt: string;
    dataVersion: number;
    evidenceAccessed: boolean;
    operationRecords: AiAbnormalOperationRecord[];
  };

  type AiAbnormalReplyQueryParams = {
    current?: number;
    pageSize?: number;
    keyword?: string;
    status?: AiAbnormalReplyStatus;
    abnormalType?: AiAbnormalReplyType;
    rootCauseType?: AiCoachConfigType;
    severity?: AiCoachRiskLevel;
    businessScene?: AiCoachBusinessScene;
    handler?: string;
  };

  type AiAbnormalDiagnosisParams = {
    dataVersion: number;
    rootCauseType: AiCoachConfigType;
    diagnosis: string;
    linkedStrategyId: string;
  };

  type AiAbnormalCreateFixDraftParams = {
    dataVersion: number;
    changeSummary: string;
  };

  type AiAbnormalRetestParams = {
    dataVersion: number;
  };

  type AiAbnormalCloseParams = {
    dataVersion: number;
    resolutionSummary: string;
  };

  type AiAbnormalCloseWithoutFixParams = {
    dataVersion: number;
    resolutionType: Exclude<AiAbnormalResolutionType, 'strategy_fix'>;
    resolutionSummary: string;
  };

  type WritingTranslationTopicType = 'writing' | 'translation';

  type WritingTranslationTemplateType = 'scoring_template' | 'feedback_template';

  type WritingTranslationTemplateStatus = ReviewTaskStatus;

  type WritingTranslationTemplateReference = {
    templateId: string;
    templateName: string;
    templateType: WritingTranslationTemplateType;
    version: string;
    releaseVersionId: string;
    statusAtBinding: WritingTranslationTemplateStatus;
    boundAt: string;
  };

  type FeedbackSection = {
    key: string;
    title: string;
    guidance: string;
    required: boolean;
    order: number;
  };

  type WritingTranslationTemplateVersion = {
    id: string;
    templateId: string;
    version: string;
    status: WritingTranslationTemplateStatus;
    createdBy: string;
    createdAt: string;
    changeSummary: string;
    currentOnline: boolean;
    snapshot: Partial<WritingTranslationTemplate>;
  };

  type WritingTranslationTemplateBase = {
    id: string;
    templateType: WritingTranslationTemplateType;
    name: string;
    description: string;
    topicTypes: WritingTranslationTopicType[];
    examTypes: ExamType[];
    status: WritingTranslationTemplateStatus;
    version: string;
    dataVersion: number;
    createdBy: string;
    createdById: string;
    createdAt: string;
    updatedBy: string;
    updatedById: string;
    updatedAt: string;
    reviewTaskId?: string;
    releaseVersionId?: string;
    rollbackTargetVersion?: string;
    changeSummary: string;
    lastPrecheck?: WritingTranslationPrecheckResult;
    versionRecords: WritingTranslationTemplateVersion[];
    operationRecords: ReviewOperationRecord[];
  };

  type ScoringTemplate = WritingTranslationTemplateBase & {
    templateType: 'scoring_template';
    totalScore: number;
    dimensions: ScoringDimension[];
  };

  type FeedbackTemplate = WritingTranslationTemplateBase & {
    templateType: 'feedback_template';
    sections: FeedbackSection[];
    responseStructureRef: WritingTranslationAiStrategyReference;
  };

  type WritingTranslationTemplate = ScoringTemplate | FeedbackTemplate;

  type WritingTranslationTemplateSaveParams = {
    templateType: WritingTranslationTemplateType;
    name: string;
    description?: string;
    topicTypes: WritingTranslationTopicType[];
    examTypes: ExamType[];
    totalScore?: number;
    dimensions?: ScoringDimension[];
    sections?: FeedbackSection[];
    responseStructureRef?: WritingTranslationAiStrategyReference;
    changeSummary?: string;
    dataVersion?: number;
    confirmWarnings?: boolean;
  };

  type WritingTranslationTemplateQueryParams = {
    current?: number;
    pageSize?: number;
    templateType?: WritingTranslationTemplateType;
    keyword?: string;
    status?: WritingTranslationTemplateStatus;
    topicType?: WritingTranslationTopicType;
    examType?: ExamType;
  };

  type WritingTranslationTemplateList = {
    data?: WritingTranslationTemplate[];
    total?: number;
    success?: boolean;
  };

  type WritingTranslationTopicTemplateBindingParams = {
    scoringTemplateId: string;
    feedbackTemplateId: string;
    dataVersion: number;
  };

  type CorrectionFixTargetType = 'topic' | 'scoring_template' | 'feedback_template' | 'ai_strategy';

  type CorrectionFixStatus =
    | 'none'
    | 'draft_created'
    | 'pending_review'
    | 'published'
    | 'closed_no_fix';

  type CorrectionIssueTag = {
    code: string;
    name: string;
    severity: 'low' | 'medium' | 'high';
    causeType: CorrectionFixTargetType;
    count: number;
  };

  type CorrectionDimensionScore = {
    key: string;
    name: string;
    score: number;
    maxScore: number;
    issueCount: number;
  };

  type CorrectionFixDraft = {
    id: string;
    targetType: CorrectionFixTargetType;
    targetId: string;
    targetName: string;
    targetVersion: string;
    targetPath: string;
    createdBy: string;
    createdAt: string;
    reviewTaskId?: string;
  };

  type MockCorrectionRecord = {
    id: string;
    topicId: string;
    topicName: string;
    topicType: WritingTranslationTopicType;
    examType: ExamType;
    topicVersion: string;
    scoringTemplateRef: WritingTranslationTemplateReference;
    feedbackTemplateRef: WritingTranslationTemplateReference;
    aiStrategySnapshot: WritingTranslationAiStrategyReference;
    aiStrategyVersion: string;
    totalScore: number;
    score: number;
    scoreBand: 'excellent' | 'stable' | 'attention' | 'abnormal';
    answerSummary: string;
    dimensionScores: CorrectionDimensionScore[];
    issueTags: CorrectionIssueTag[];
    feedbackSections: Array<{ title: string; content: string }>;
    correctionStatus: 'normal' | 'needs_review' | 'abnormal';
    revisionCount: number;
    fixStatus: CorrectionFixStatus;
    rootCauseType?: CorrectionFixTargetType;
    diagnosis?: string;
    linkedFixDrafts: CorrectionFixDraft[];
    updatedAt: string;
    dataVersion: number;
    createdAt: string;
    mockOnly: true;
  };

  type CorrectionSummaryQueryParams = {
    current?: number;
    pageSize?: number;
    keyword?: string;
    topicType?: WritingTranslationTopicType;
    examType?: ExamType;
    scoreBand?: MockCorrectionRecord['scoreBand'];
    correctionStatus?: MockCorrectionRecord['correctionStatus'];
    fixStatus?: CorrectionFixStatus;
    issueCode?: string;
    causeType?: CorrectionFixTargetType;
    strategyVersion?: string;
  };

  type CorrectionSummaryStats = {
    total: number;
    normalCount: number;
    abnormalCount: number;
    needsReviewCount: number;
    averageScore: number;
    scoreBands: Array<{ band: MockCorrectionRecord['scoreBand']; label: string; count: number }>;
    topIssues: CorrectionIssueTag[];
    dimensionAverages: Array<{ key: string; name: string; averageScore: number; maxScore: number }>;
  };

  type CorrectionFixDraftParams = {
    dataVersion: number;
    targetType: CorrectionFixTargetType;
    diagnosis: string;
    changeSummary: string;
  };

  type WritingTranslationStatus = ReviewTaskStatus;

  type WritingTranslationDifficulty = QuestionDifficulty;

  type WritingTranslationRiskLevel = ReviewRiskLevel;

  type WritingGenre = 'argumentative' | 'chart' | 'letter' | 'notice' | 'poster';

  type TranslationDirection = 'zh-CN_to_en';

  type ScoringBand = {
    name: string;
    minScore: number;
    maxScore: number;
    description: string;
    criteria: string[];
  };

  type CorrectionErrorRule = {
    code: string;
    name: string;
    topicType: WritingTranslationTopicType;
    severity: 'minor' | 'medium' | 'major' | 'critical';
    description: string;
    suggestedDeduction: number;
    repeatable: boolean;
    maxDeduction: number;
    dimensionKey: string;
    revisionSuggestionTemplate: string;
  };

  type ScoringDimension = {
    key: string;
    name: string;
    description: string;
    weight: number;
    maxScore: number;
    order: number;
    required: boolean;
    bandNotes: ScoringBand[];
    deductionRules: CorrectionErrorRule[];
    bonusRules: string[];
  };

  type CorrectionRuleSet = {
    feedbackStructure: string[];
    overallScoringGuide: string;
    deductionRules: CorrectionErrorRule[];
    bonusRules: string[];
    severityRules: string[];
    blankAnswerRule: string;
    offTopicRule: string;
    insufficientInformationRule: string;
    templateAbuseRule: string;
    sensitiveContentRule: string;
    uncertainResultRule: string;
    manualReviewConditions: string[];
    revisionHint: string;
    fallbackMessage: string;
  };

  type WritingTranslationAiStrategyReference = {
    strategyId: string;
    strategyTitle: string;
    strategyVersion: string;
    releaseVersionId: string;
    configType: AiCoachConfigType;
    businessScene: AiCoachBusinessScene;
    usage: 'scoring_prompt' | 'feedback_structure' | 'dependency_guard' | 'intent_hint';
    required: boolean;
    statusAtBinding: AiCoachStrategyStatus;
    boundAt: string;
  };

  type WritingTranslationPrecheckLevel = 'passed' | 'warning' | 'error';

  type WritingTranslationPrecheckIssue = {
    id: string;
    level: WritingTranslationPrecheckLevel;
    code: string;
    field: string;
    message: string;
    suggestion: string;
  };

  type WritingTranslationPrecheckResult = {
    id: string;
    topicId?: string;
    level: WritingTranslationPrecheckLevel;
    checkedAt: string;
    issues: WritingTranslationPrecheckIssue[];
    summary: string;
  };

  type WritingTranslationValidationCase = {
    id: string;
    title: string;
    inputSummary: string;
    expectedRule: string;
    result?: WritingTranslationPrecheckLevel;
    message?: string;
  };

  type WritingTranslationValidationResult = {
    level: WritingTranslationPrecheckLevel;
    summary: string;
    cases: WritingTranslationValidationCase[];
    checkedAt: string;
    mockOnly: true;
  };

  type WritingTranslationTopicVersion = {
    id: string;
    topicId: string;
    topicType: WritingTranslationTopicType;
    version: string;
    status: WritingTranslationStatus;
    createdBy: string;
    createdAt: string;
    changeSummary: string;
    currentOnline: boolean;
    snapshot: Partial<WritingTranslationTopicBase>;
  };

  type WritingTranslationTopicBase = {
    id: string;
    topicType: WritingTranslationTopicType;
    name: string;
    description?: string;
    examType: ExamType;
    difficulty: WritingTranslationDifficulty;
    tags: string[];
    totalScore: number;
    riskLevel: WritingTranslationRiskLevel;
    referencePoints: string[];
    scoringDimensions: ScoringDimension[];
    correctionRule: CorrectionRuleSet;
    aiStrategyRefs: WritingTranslationAiStrategyReference[];
    scoringTemplateRef?: WritingTranslationTemplateReference;
    feedbackTemplateRef?: WritingTranslationTemplateReference;
    status: WritingTranslationStatus;
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
    rollbackTargetVersion?: string;
    changeSummary: string;
    internalRemark?: string;
    lastPrecheck?: WritingTranslationPrecheckResult;
    lastValidation?: WritingTranslationValidationResult;
    versionRecords: WritingTranslationTopicVersion[];
    operationRecords: ReviewOperationRecord[];
  };

  type WritingTopic = WritingTranslationTopicBase & {
    topicType: 'writing';
    prompt: string;
    topicDirection: string;
    genre: WritingGenre;
    minWords: number;
    maxWords: number;
    suggestedMinutes: number;
    writingRequirements: string[];
    outlinePoints: string[];
    sampleAnswerSummary?: string;
    templateUsageWarning?: string;
  };

  type TranslationTopic = WritingTranslationTopicBase & {
    topicType: 'translation';
    sourceText: string;
    sourceLanguage: 'zh-CN';
    targetLanguage: 'en';
    translationDirection: TranslationDirection;
    topicDirection: string;
    referenceTranslation: string;
    keywords: string[];
    fixedExpressions: string[];
    acceptableExpressions: string[];
    commonMistranslations: string[];
    suggestedMinutes: number;
  };

  type WritingTranslationTopic = WritingTopic | TranslationTopic;

  type WritingTranslationTopicQueryParams = {
    current?: number;
    pageSize?: number;
    topicType?: WritingTranslationTopicType;
    keyword?: string;
    examType?: ExamType;
    difficulty?: WritingTranslationDifficulty;
    status?: WritingTranslationStatus;
    riskLevel?: WritingTranslationRiskLevel;
    tag?: string;
    hasAiStrategy?: 'yes' | 'no';
    updatedBy?: string;
    updatedAtRange?: string[];
  };

  type WritingTranslationTopicSaveParams = {
    topicType: WritingTranslationTopicType;
    name: string;
    description?: string;
    examType: ExamType;
    difficulty: WritingTranslationDifficulty;
    totalScore: number;
    riskLevel: WritingTranslationRiskLevel;
    tags?: string[];
    referencePoints?: string[];
    scoringDimensions?: ScoringDimension[];
    correctionRule?: CorrectionRuleSet;
    aiStrategyRefs?: WritingTranslationAiStrategyReference[];
    validationCases?: WritingTranslationValidationCase[];
    changeSummary?: string;
    internalRemark?: string;
    prompt?: string;
    topicDirection?: string;
    genre?: WritingGenre;
    minWords?: number;
    maxWords?: number;
    suggestedMinutes?: number;
    writingRequirements?: string[];
    outlinePoints?: string[];
    sampleAnswerSummary?: string;
    templateUsageWarning?: string;
    sourceText?: string;
    sourceLanguage?: 'zh-CN';
    targetLanguage?: 'en';
    translationDirection?: TranslationDirection;
    referenceTranslation?: string;
    keywords?: string[];
    fixedExpressions?: string[];
    acceptableExpressions?: string[];
    commonMistranslations?: string[];
    dataVersion?: number;
    confirmWarnings?: boolean;
    simulateFailure?: boolean;
  };

  type WritingTranslationSubmitParams = {
    changeSummary: string;
    dataVersion: number;
    confirmWarnings?: boolean;
    simulateTaskFailure?: boolean;
  };

  type WritingTranslationVersionDiffItem = {
    field: string;
    before?: string;
    after?: string;
    changed: boolean;
  };

  type WritingTranslationVersionDiff = {
    fromVersion: string;
    toVersion: string;
    items: WritingTranslationVersionDiffItem[];
  };

  type WritingTranslationTopicList = {
    data?: WritingTranslationTopic[];
    total?: number;
    current?: number;
    pageSize?: number;
    success?: boolean;
  };

  type WritingTranslationScoringPreset = {
    id: string;
    topicType: WritingTranslationTopicType;
    name: string;
    totalScore: number;
    dimensions: ScoringDimension[];
  };

  type UserWritingTranslationTrace = {
    topicId: string;
    topicVersion: string;
    topicType: WritingTranslationTopicType;
    scoringRuleVersion: string;
    aiStrategyIds: string[];
    aiStrategyVersions: string[];
    submittedAt: string;
    correctionMode: 'mock_static' | 'ai' | 'manual';
    resultVersion: string;
  };

  type ExamType = 'CET4' | 'CET6';

  type QuestionType = 'single_choice' | 'reading_choice' | 'listening_choice';

  type QuestionSkill = 'vocabulary' | 'grammar' | 'reading' | 'listening';

  type QuestionDifficulty = 'easy' | 'medium' | 'hard';

  type ArticleDifficulty = QuestionDifficulty;

  type ArticleAssetType = 'cover_image' | 'illustration' | 'audio' | 'reference';

  type ArticleAsset = {
    id: string;
    name: string;
    type: ArticleAssetType;
    previewUrl: string;
    sourceName: string;
    sourceUrl?: string;
    licenseNote: string;
    status: 'enabled' | 'disabled';
  };

  type ArticleAssetRef = ArticleAsset & {
    usage: 'cover' | 'body' | 'audio' | 'source';
  };

  type ArticlePrecheckIssue = {
    id: string;
    level: 'warning' | 'error';
    field: string;
    message: string;
  };

  type ArticlePrecheckResult = {
    passed: boolean;
    checkedAt: string;
    summary: string;
    issues: ArticlePrecheckIssue[];
  };

  type ArticleVersionSnapshot = {
    id: string;
    articleId: string;
    version: string;
    title: string;
    category: string;
    summary: string;
    body: string;
    difficulty: ArticleDifficulty;
    examTypes: ExamType[];
    sourceName: string;
    sourceUrl: string;
    assets: ArticleAssetRef[];
    createdBy: string;
    createdAt: string;
  };

  type ArticleEffectRiskCode = 'insufficient_sample' | 'low_completion' | 'completion_decline';

  type ArticleEffectRisk = {
    code: ArticleEffectRiskCode;
    level: 'info' | 'warning' | 'high';
    label: string;
    description: string;
  };

  type ArticleEffectTrendPoint = {
    date: string;
    views: number;
    readers: number;
    completions: number;
  };

  type ArticleEffectSummary = {
    articleId: string;
    version: string;
    views: number;
    readers: number;
    favorites: number;
    completions: number;
    completionRate: number;
    risks: ArticleEffectRisk[];
    trend: ArticleEffectTrendPoint[];
  };

  type ArticleUserEventType = 'view' | 'favorite_add' | 'favorite_remove' | 'complete';

  type ArticleUserEvent = {
    eventId: string;
    userId: string;
    articleId: string;
    version: string;
    type: ArticleUserEventType;
    occurredAt: string;
  };

  type ArticleItem = {
    id: string;
    title: string;
    category: string;
    summary: string;
    body: string;
    difficulty: ArticleDifficulty;
    examTypes: ExamType[];
    sourceName: string;
    sourceUrl: string;
    assets: ArticleAssetRef[];
    status: ReviewTaskStatus;
    version: string;
    dataVersion: number;
    isOnline: boolean;
    servingVersionId?: string;
    creatorId: string;
    creator: string;
    createdAt: string;
    updatedById: string;
    updatedBy: string;
    updatedAt: string;
    changeSummary: string;
    impactScope: string;
    reviewTaskId?: string;
    releaseVersionId?: string;
    rollbackTargetVersion?: string;
    lastPrecheck?: ArticlePrecheckResult;
    snapshots: ArticleVersionSnapshot[];
    versionRecords: ReviewVersionRecord[];
    operationRecords: ReviewOperationRecord[];
    effects: ArticleEffectSummary;
  };

  type ArticleSaveParams = {
    title: string;
    category: string;
    summary: string;
    body: string;
    difficulty: ArticleDifficulty;
    examTypes: ExamType[];
    sourceName: string;
    sourceUrl: string;
    assetIds: string[];
    changeSummary?: string;
    impactScope?: string;
    dataVersion?: number;
    confirmWarnings?: boolean;
  };

  type ArticleSubmitReviewParams = {
    changeSummary: string;
    dataVersion: number;
    confirmWarnings?: boolean;
  };

  type ArticleQueryParams = {
    current?: number;
    pageSize?: number;
    keyword?: string;
    category?: string;
    difficulty?: ArticleDifficulty;
    examType?: ExamType;
    status?: ReviewTaskStatus;
    risk?: ArticleEffectRiskCode;
  };

  type ArticleList = {
    data?: ArticleItem[];
    total?: number;
    current?: number;
    pageSize?: number;
    success?: boolean;
  };

  type ArticleUserEventParams = {
    eventId: string;
    userId: string;
    version: string;
    type: ArticleUserEventType;
    occurredAt?: string;
  };

  type WrongReasonTagCategory =
    | 'comprehension_bias'
    | 'knowledge_gap'
    | 'question_review'
    | 'expression_issue'
    | 'strategy_issue';

  type WrongReasonTagSeverity = ReviewRiskLevel;

  type WrongReasonTagItem = {
    id: string;
    name: string;
    category: WrongReasonTagCategory;
    examTypes: ExamType[];
    questionTypes: QuestionType[];
    severity: WrongReasonTagSeverity;
    description: string;
    status: ReviewTaskStatus;
    referenceCount: number;
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

  type WrongReasonTagSaveParams = {
    name: string;
    category: WrongReasonTagCategory;
    examTypes: ExamType[];
    questionTypes: QuestionType[];
    severity: WrongReasonTagSeverity;
    description: string;
    changeSummary?: string;
    referenceImpact?: string;
  };

  type WrongReasonTagSubmitReviewParams = {
    changeSummary: string;
  };

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

  type QuestionGroupAudienceTag =
    | 'foundation'
    | 'skill_improvement'
    | 'exam_sprint';

  type QuestionGroupMember = {
    questionId: string;
    questionTitle: string;
    questionVersion: string;
    questionType: QuestionType;
    difficulty: QuestionDifficulty;
    order: number;
  };

  type QuestionGroupPrecheckIssue = {
    id: string;
    level: 'warning' | 'error';
    field: string;
    message: string;
  };

  type QuestionGroupPrecheckResult = {
    passed: boolean;
    checkedAt: string;
    summary: string;
    issues: QuestionGroupPrecheckIssue[];
  };

  type QuestionGroupItem = {
    id: string;
    name: string;
    description: string;
    examType: ExamType;
    skill: QuestionSkill;
    audienceTags: QuestionGroupAudienceTag[];
    estimatedMinutes: number;
    members: QuestionGroupMember[];
    status: ReviewTaskStatus;
    version: string;
    dataVersion: number;
    creatorId: string;
    creator: string;
    createdAt: string;
    updatedById: string;
    updatedBy: string;
    updatedAt: string;
    changeSummary: string;
    impactScope: string;
    reviewTaskId?: string;
    lastPrecheck?: QuestionGroupPrecheckResult;
    versionRecords: ReviewVersionRecord[];
    operationRecords: ReviewOperationRecord[];
  };

  type QuestionGroupSaveParams = {
    name: string;
    description: string;
    examType: ExamType;
    skill: QuestionSkill;
    audienceTags: QuestionGroupAudienceTag[];
    estimatedMinutes: number;
    questionIds: string[];
    changeSummary?: string;
    impactScope?: string;
    dataVersion?: number;
  };

  type QuestionGroupSubmitReviewParams = {
    changeSummary: string;
    dataVersion: number;
  };

  type QuestionGroupImpactItem = {
    source: 'learning_path' | 'mock_exam';
    objectId: string;
    objectName: string;
    status: ReviewTaskStatus;
  };

  type QuestionGroupImpact = {
    groupId: string;
    total: number;
    items: QuestionGroupImpactItem[];
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

  type AiCoachStrategyList = {
    data?: AiCoachStrategy[];
    total?: number;
    success?: boolean;
  };

  type AiAbnormalReplyList = {
    data?: AiAbnormalReply[];
    total?: number;
    success?: boolean;
  };

  type QuestionList = {
    data?: QuestionItem[];
    total?: number;
    success?: boolean;
  };

  type QuestionGroupList = {
    data?: QuestionGroupItem[];
    total?: number;
    success?: boolean;
  };

  type WrongReasonTagList = {
    data?: WrongReasonTagItem[];
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
    | 'ai_conversation_summary'
    | 'ai_session_review_context';

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
    strategyId: string;
    strategyVersion: string;
    configType: AiCoachConfigType;
    businessScene: AiCoachBusinessScene;
    strategyStatusAtTime: AiCoachStrategyStatus;
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
    isMockUser?: boolean;
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

  type AiSessionReviewStatus = 'pending' | 'in_review' | 'completed';

  type AiSessionReviewConclusion = 'normal' | 'abnormal';

  type AiSessionAbnormalType =
    | 'answer_dependency'
    | 'boundary_violation'
    | 'incorrect_guidance'
    | 'sensitive_content'
    | 'attachment_policy_failure'
    | 'other';

  type AiSessionAbnormalSeverity = 'P0' | 'P1' | 'P2';

  type AiSessionSensitiveFieldKey =
    | 'context_excerpt'
    | 'user_input_excerpt'
    | 'assistant_reply_excerpt'
    | 'attachment_summary';

  type AiSessionRiskSignal = {
    id: string;
    label: string;
    level: AiCoachRiskLevel;
    summary: string;
  };

  type AiSessionStrategySnapshot = {
    strategyId: string;
    strategyTitle: string;
    strategyVersion: string;
    configType: AiCoachConfigType;
    businessScene: AiCoachBusinessScene;
    statusAtTime: AiCoachStrategyStatus;
  };

  type AiSessionReviewTimelineItem = {
    id: string;
    operator: string;
    roleName: string;
    action: string;
    fromStatus?: AiSessionReviewStatus;
    toStatus?: AiSessionReviewStatus;
    reason: string;
    time: string;
    result: 'success' | 'failed';
  };

  type AiAbnormalHandlingItem = {
    id: string;
    sourceSessionReviewId: string;
    sourceSessionId: string;
    abnormalType: AiSessionAbnormalType;
    severity: AiSessionAbnormalSeverity;
    evidenceSummary: string;
    reviewNote: string;
    strategySnapshot: AiSessionStrategySnapshot;
    status: 'pending';
    creatorId: string;
    creator: string;
    createdAt: string;
    updatedAt: string;
  };

  type AiSessionReview = {
    id: string;
    sessionId: string;
    sessionTime: string;
    userLabel: string;
    examType: ExamType;
    intentKey: string;
    intentName: string;
    businessScene: AiCoachBusinessScene;
    summaryPreview: string;
    summary: string;
    riskLevel: AiCoachRiskLevel;
    riskSignals: AiSessionRiskSignal[];
    strategySnapshot: AiSessionStrategySnapshot;
    reviewStatus: AiSessionReviewStatus;
    conclusion?: AiSessionReviewConclusion;
    reviewNote?: string;
    reviewerId?: string;
    reviewer?: string;
    reviewedAt?: string;
    abnormalItemId?: string;
    abnormalItem?: AiAbnormalHandlingItem;
    source?: 'seed' | 'attachment_policy_mock';
    attachmentMockSample?: AiAttachmentMockSample;
    timeline: AiSessionReviewTimelineItem[];
    dataVersion: number;
    updatedAt: string;
  };

  type AiSessionReviewQueryParams = {
    current?: number;
    pageSize?: number;
    keyword?: string;
    intentKey?: string;
    strategyVersion?: string;
    riskLevel?: AiCoachRiskLevel;
    reviewStatus?: AiSessionReviewStatus;
    conclusion?: AiSessionReviewConclusion;
    sessionTimeRange?: string[];
  };

  type AiSessionReviewList = {
    data?: AiSessionReview[];
    total?: number;
    current?: number;
    pageSize?: number;
    success?: boolean;
  };

  type AiSessionSensitiveAccessParams = {
    requestedFields: AiSessionSensitiveFieldKey[];
    accessReason: string;
    dataVersion?: number;
    simulateFailure?: boolean;
  };

  type AiSessionSensitiveAccessResult = {
    accessLog: UserSensitiveAccessLog;
    fields: Partial<Record<AiSessionSensitiveFieldKey, string>>;
  };

  type AiSessionReviewConclusionParams = {
    conclusion: AiSessionReviewConclusion;
    reviewNote: string;
    dataVersion: number;
    abnormalType?: AiSessionAbnormalType;
    severity?: AiSessionAbnormalSeverity;
    evidenceSummary?: string;
    idempotencyKey?: string;
  };

  type LearningPathConfigKind = 'diagnosis_rule' | 'today_task_template';

  type AdvancedLearningStrategyKind =
    | 'light_task'
    | 'extra_practice'
    | 'review_recommendation';

  type StrategyTriggerMetric =
    | 'available_minutes'
    | 'weak_module'
    | 'accuracy'
    | 'consecutive_errors'
    | 'wrong_reason_tag'
    | 'days_since_practice';

  type StrategyTriggerCondition = {
    id: string;
    metric: StrategyTriggerMetric;
    operator: 'eq' | 'in' | 'lt' | 'lte' | 'gt' | 'gte';
    value: string | number | string[];
    description: string;
  };

  type StrategyTriggerGroup = {
    mode: 'all' | 'any';
    conditions: StrategyTriggerCondition[];
  };

  type StrategyReference = {
    id: string;
    name: string;
    type: 'question' | 'question_group' | 'wrong_reason_tag' | 'module';
    examType?: ExamType;
    module?: LearningPathModule;
    status: string;
    available: boolean;
  };

  type StrategyFallbackRule = {
    enabled: boolean;
    trigger: 'primary_unavailable' | 'already_completed' | 'insufficient_time';
    targetId?: string;
    targetName?: string;
  };

  type StrategyPrecheckIssue = {
    id: string;
    level: 'error' | 'warning';
    field: string;
    code: string;
    message: string;
  };

  type StrategyPrecheckResult = {
    level: 'passed' | 'warning' | 'error';
    summary: string;
    checkedAt: string;
    issues: StrategyPrecheckIssue[];
  };

  type AdvancedLearningStrategy = {
    id: string;
    kind: AdvancedLearningStrategyKind;
    name: string;
    description: string;
    examType: ExamType;
    module: LearningPathModule;
    priority: number;
    status: LearningPathConfigStatus;
    version: string;
    dataVersion: number;
    triggerGroup: StrategyTriggerGroup;
    primaryReference: StrategyReference;
    fallbackRule: StrategyFallbackRule;
    estimatedMinutes?: number;
    practiceCount?: number;
    reviewIntervalDays?: number;
    questionTypes?: string[];
    wrongReasonTagIds?: string[];
    createdById: string;
    createdBy: string;
    createdAt: string;
    updatedById: string;
    updatedBy: string;
    updatedAt: string;
    changeSummary: string;
    impactScope: string;
    reviewTaskId?: string;
    releaseVersionId?: string;
    onlineVersion?: string;
    rollbackTargetVersion?: string;
    lastPrecheck?: StrategyPrecheckResult;
    versionRecords: LearningPathConfigVersion[];
    operationRecords: ReviewOperationRecord[];
  };

  type AdvancedLearningStrategySaveParams = Omit<
    AdvancedLearningStrategy,
    | 'id'
    | 'status'
    | 'version'
    | 'createdById'
    | 'createdBy'
    | 'createdAt'
    | 'updatedById'
    | 'updatedBy'
    | 'updatedAt'
    | 'reviewTaskId'
    | 'releaseVersionId'
    | 'onlineVersion'
    | 'rollbackTargetVersion'
    | 'lastPrecheck'
    | 'versionRecords'
    | 'operationRecords'
  > & { id?: string; dataVersion?: number };

  type StrategyExecutionStatus =
    | 'assigned'
    | 'started'
    | 'completed'
    | 'replaced'
    | 'skipped'
    | 'expired';

  type StrategyMockProfile = {
    id: string;
    name: string;
    examType: ExamType;
    availableMinutes: number;
    weakModule: LearningPathModule;
    accuracy: number;
    consecutiveErrors: number;
    wrongReasonTags: string[];
    daysSincePractice: number;
  };

  type StrategyMatchRun = {
    id: string;
    profileId: string;
    profileName: string;
    kind: AdvancedLearningStrategyKind;
    matched: boolean;
    strategyId?: string;
    strategyName?: string;
    strategyVersion?: string;
    resultReferenceId?: string;
    resultReferenceName?: string;
    usedFallback: boolean;
    reason: string;
    status: StrategyExecutionStatus;
    matchedAt: string;
    updatedAt: string;
  };

  type StrategyEffectSummary = {
    strategyId: string;
    hits: number;
    started: number;
    completed: number;
    replaced: number;
    skippedOrExpired: number;
    completionRate: number;
  };

  type AdvancedLearningStrategyList = {
    success?: boolean;
    data?: AdvancedLearningStrategy[];
    total?: number;
    current?: number;
    pageSize?: number;
  };

  type OnboardingFieldKey =
    | 'examType'
    | 'targetScore'
    | 'examDate'
    | 'dailyMinutes'
    | 'moodStatus';

  type OnboardingFieldType = 'single_select' | 'exam_date';

  type OnboardingMoodStatus = 'steady' | 'tired' | 'anxious';

  type OnboardingOption = {
    id: string;
    label: string;
    value: string | number;
    enabled: boolean;
    sortOrder: number;
    referencedCount: number;
  };

  type OnboardingField = {
    key: OnboardingFieldKey;
    label: string;
    type: OnboardingFieldType;
    description: string;
    required: true;
    enabled: boolean;
    sortOrder: number;
    options: OnboardingOption[];
  };

  type OnboardingConfigVersion = {
    id: string;
    configId: string;
    version: string;
    status: LearningPathConfigStatus;
    createdBy: string;
    createdAt: string;
    changeSummary: string;
    publishedAt?: string;
    publishedBy?: string;
    currentOnline: boolean;
  };

  type OnboardingConfig = {
    id: string;
    kind: 'onboarding_config';
    name: string;
    description: string;
    status: LearningPathConfigStatus;
    version: string;
    dataVersion: number;
    currentOnline: boolean;
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
    fields: OnboardingField[];
    lastPrecheck?: OnboardingPrecheckResult;
    versionRecords: OnboardingConfigVersion[];
    operationRecords: ReviewOperationRecord[];
  };

  type OnboardingPrecheckResult = {
    id: string;
    configId?: string;
    level: LearningPathPrecheckLevel;
    checkedAt: string;
    issues: LearningPathPrecheckIssue[];
    summary: string;
  };

  type OnboardingSaveParams = {
    name: string;
    description?: string;
    changeSummary: string;
    internalRemark?: string;
    dataVersion: number;
    fields: OnboardingField[];
  };

  type OnboardingSubmission = {
    examType: ExamType;
    targetScore: 425 | 500 | 600;
    examDate: string;
    dailyMinutes: 5 | 15 | 30;
    moodStatus: OnboardingMoodStatus;
  };

  type OnboardingAnswerSnapshot = {
    fieldKey: OnboardingFieldKey;
    fieldLabel: string;
    optionLabel: string;
    value: string | number;
  };

  type OnboardingMatchSnapshot = {
    configId: string;
    configName: string;
    version: string;
    completedAt: string;
    answers: OnboardingAnswerSnapshot[];
  };

  type OnboardingOverview = {
    config?: OnboardingConfig;
    onlineConfig?: OnboardingConfig;
    mockUser: AdminUser;
    match: UserLearningPathMatchSummary;
    nextExamDates: string[];
  };

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
    kind: LearningPathConfigKind | AdvancedLearningStrategyKind;
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
    onboardingConfig?: OnboardingMatchSnapshot;
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
    advancedStrategies?: Array<{
      runId: string;
      kind: AdvancedLearningStrategyKind;
      strategyId: string;
      strategyName: string;
      version: string;
      matchedAt: string;
      executionStatus: StrategyExecutionStatus;
      resultReferenceName?: string;
    }>;
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

  type AnalyticsGranularity = 'day' | 'week' | 'month';

  type AnalyticsModule =
    | 'all'
    | 'users'
    | 'learningPath'
    | 'content'
    | 'reviewRelease'
    | 'feedback'
    | 'aiCoach'
    | 'writingTranslation'
    | 'mockExam'
    | 'audit';

  type AnalyticsVisibleSection =
    | 'users'
    | 'learningPath'
    | 'content'
    | 'reviewRelease'
    | 'feedback'
    | 'aiCoach'
    | 'writingTranslation'
    | 'mockExam'
    | 'audit';

  type AnalyticsMetricType = 'count' | 'rate' | 'duration';

  type AnalyticsMetricTimeSemantic = 'interval' | 'snapshot';

  type AnalyticsMetricDirection = 'positive' | 'risk' | 'neutral';

  type AnalyticsFilterParams = {
    startDate?: string;
    endDate?: string;
    examType?: ExamType | 'all';
    granularity?: AnalyticsGranularity;
    module?: AnalyticsModule;
    simulateSectionError?: AnalyticsVisibleSection;
    simulateEmpty?: boolean;
    simulateFailure?: boolean;
  };

  type AnalyticsComparison = {
    value?: number;
    rate?: number;
    label: string;
    available: boolean;
  };

  type AnalyticsMetricCard = {
    id: string;
    title: string;
    value?: number;
    displayValue: string;
    unit: string;
    type: AnalyticsMetricType;
    timeSemantic: AnalyticsMetricTimeSemantic;
    direction: AnalyticsMetricDirection;
    comparison: AnalyticsComparison;
    tooltip: string;
    updatedAt: string;
    section: AnalyticsVisibleSection;
    jumpTo?: string;
  };

  type AnalyticsTrendPoint = {
    date: string;
    metric: string;
    value: number;
  };

  type AnalyticsDistributionItem = {
    label: string;
    value: number;
    percent?: number;
    group?: string;
  };

  type AnalyticsFunnelItem = {
    step: string;
    count: number;
    previousRate?: number;
    totalRate?: number;
    source: string;
  };

  type AnalyticsModuleSnapshot = {
    id: AnalyticsVisibleSection;
    name: string;
    value: number;
    displayValue: string;
    unit: string;
    status: 'formal' | 'placeholder';
    description: string;
    visible: boolean;
    jumpTo?: string;
  };

  type AnalyticsReviewStats = {
    pendingReview: number;
    approved: number;
    rejected: number;
    pendingRelease: number;
    published: number;
    offline: number;
    rolledBack: number;
    publishFailed: number;
    rollbackFailed: number;
    averageReviewMinutes?: number;
    longestPendingReviewHours?: number;
    averagePendingReleaseMinutes?: number;
  };

  type AnalyticsFeedbackStats = {
    newFeedback: number;
    pending: number;
    processing: number;
    resolved: number;
    noAction: number;
    closed: number;
    handled: number;
    closeRate?: number;
    averageHandleHours?: number;
    overdue24h: number;
    p0Feedback: number;
  };

  type AnalyticsSectionError = {
    section: AnalyticsVisibleSection;
    message: string;
    level: 'warning' | 'error';
  };

  type AnalyticsDataQualityIssue = {
    id: string;
    section: AnalyticsVisibleSection;
    level: 'warning' | 'error';
    message: string;
    metricId?: string;
  };

  type AnalyticsDataSource = {
    section: AnalyticsVisibleSection;
    source: string;
    formal: boolean;
  };

  type AnalyticsOverview = {
    filters: Required<Pick<AnalyticsFilterParams, 'startDate' | 'endDate' | 'granularity' | 'module'>> & {
      examType: ExamType | 'all';
    };
    summaryCards: AnalyticsMetricCard[];
    userTrend: AnalyticsTrendPoint[];
    userDistributions: Record<string, AnalyticsDistributionItem[]>;
    learningPathFunnel: AnalyticsFunnelItem[];
    learningPathMetrics: AnalyticsMetricCard[];
    contentStatusDistribution: AnalyticsDistributionItem[];
    contentMetrics: AnalyticsMetricCard[];
    reviewReleaseStats?: AnalyticsReviewStats;
    reviewRiskItems: AnalyticsDistributionItem[];
    feedbackStats?: AnalyticsFeedbackStats;
    feedbackDistributions: Record<string, AnalyticsDistributionItem[]>;
    moduleSnapshots: AnalyticsModuleSnapshot[];
    sectionErrors: AnalyticsSectionError[];
    dataQualityIssues: AnalyticsDataQualityIssue[];
    visibleSections: AnalyticsVisibleSection[];
    updatedAt: string;
    dataSources: AnalyticsDataSource[];
  };

  type AnalyticsApiResponse = {
    data?: AnalyticsOverview;
    success?: boolean;
    errorCode?: string;
    errorMessage?: string;
  };

  type AnalyticsExportResult = {
    id: string;
    status: 'preview_ready';
    title: string;
    filters: AnalyticsOverview['filters'];
    metricCount: number;
    sectionCount: number;
    containsSensitiveFields: false;
    mockOnly: true;
    createdAt: string;
    message: string;
  };

  type DashboardVisibleSection =
    | 'welcome'
    | 'todos'
    | 'risks'
    | 'metrics'
    | 'quickActions'
    | 'moduleSnapshots'
    | 'recentActivities'
    | 'aiPlaceholder';

  type DashboardTodoType =
    | 'pending_review'
    | 'pending_publish'
    | 'rejected_content'
    | 'pending_feedback'
    | 'stale_feedback'
    | 'learning_path_precheck_error'
    | 'learning_path_rejected'
    | 'ai_strategy_pending_review'
    | 'ai_strategy_pending_publish'
    | 'ai_strategy_rejected'
    | 'ai_strategy_precheck_error'
    | 'ai_strategy_high_risk_publish'
    | 'ai_strategy_release_failed'
    | 'ai_strategy_rollback_failed'
    | 'writing_translation_pending_review'
    | 'writing_translation_pending_publish'
    | 'writing_translation_precheck_error'
    | 'writing_translation_ai_reference_invalid'
    | 'publish_failed'
    | 'rollback_failed'
    | 'high_risk_audit'
    | 'permission_denied'
    | 'ai_placeholder';

  type DashboardTodoPriority = 'P0' | 'P1' | 'P2' | 'P3';

  type DashboardRiskType =
    | 'permission_denied'
    | 'sensitive_access'
    | 'permission_change'
    | 'publish_failed'
    | 'rollback_failed'
    | 'version_conflict'
    | 'precheck_blocked'
    | 'ai_reference_invalid'
    | 'content_effect_risk'
    | 'placeholder';

  type DashboardRiskLevel = 'high' | 'medium' | 'low';

  type DashboardMetricType = 'count' | 'rate';

  type DashboardRoleView = {
    roleId: string;
    roleName: string;
    description: string;
  };

  type DashboardWelcome = {
    operatorName: string;
    roleName: string;
    greeting: string;
    workHint: string;
    currentDate: string;
    updatedAt: string;
  };

  type DashboardComparison = {
    available: boolean;
    value?: number;
    label: string;
  };

  type DashboardMetric = {
    id: string;
    title: string;
    value?: number;
    displayValue: string;
    unit: string;
    type: DashboardMetricType;
    timeSemantic: 'today' | 'snapshot';
    direction: 'positive' | 'risk' | 'neutral';
    comparison: DashboardComparison;
    tooltip: string;
    targetRoute?: string;
  };

  type DashboardTodoSummary = {
    total: number;
    highPriority: number;
    overdue: number;
    todayNew: number;
  };

  type DashboardTodoItem = {
    id: string;
    type: DashboardTodoType;
    typeName: string;
    title: string;
    objectType: string;
    objectId: string;
    priority: DashboardTodoPriority;
    status: string;
    statusLabel: string;
    createdAt: string;
    waitHours: number;
    waitText: string;
    owner: string;
    sourceModule: string;
    sourceModuleName: string;
    targetRoute: string;
    targetQuery?: Record<string, string>;
    canHandle: boolean;
    handleActionLabel?: string;
    overdue: boolean;
    riskLevel?: DashboardRiskLevel;
    description: string;
  };

  type DashboardRiskSummary = {
    total: number;
    high: number;
    overdue: number;
    latestAt?: string;
  };

  type DashboardRiskItem = {
    id: string;
    type: DashboardRiskType;
    typeName: string;
    level: DashboardRiskLevel;
    title: string;
    objectId: string;
    occurredAt: string;
    sourceModule: string;
    sourceModuleName: string;
    targetRoute: string;
    targetQuery?: Record<string, string>;
    handled: boolean;
    description: string;
  };

  type DashboardQuickAction = {
    id: string;
    title: string;
    description: string;
    icon: string;
    targetRoute: string;
    targetQuery?: Record<string, string>;
    requiredModule: string;
    requiredAction: string;
    todoCount?: number;
  };

  type DashboardModuleSnapshot = {
    id: string;
    title: string;
    sourceModule: string;
    targetRoute: string;
    items: {
      label: string;
      value: number;
      status?: 'normal' | 'warning' | 'risk';
    }[];
  };

  type DashboardRecentActivity = {
    id: string;
    time: string;
    operator: string;
    action: string;
    objectType: string;
    objectSummary: string;
    result: 'success' | 'denied' | 'failed';
    sourceModule: string;
    sourceModuleName: string;
  };

  type DashboardSectionError = {
    section: DashboardVisibleSection;
    message: string;
    level: 'warning' | 'error';
  };

  type DashboardDataQualityIssue = {
    id: string;
    section: DashboardVisibleSection;
    level: 'warning' | 'error';
    message: string;
    objectId?: string;
  };

  type DashboardOverview = {
    welcome: DashboardWelcome;
    role: DashboardRoleView;
    summaryMetrics: DashboardMetric[];
    todoSummary: DashboardTodoSummary;
    todoItems: DashboardTodoItem[];
    riskSummary: DashboardRiskSummary;
    riskItems: DashboardRiskItem[];
    quickActions: DashboardQuickAction[];
    moduleSnapshots: DashboardModuleSnapshot[];
    recentActivities: DashboardRecentActivity[];
    visibleSections: DashboardVisibleSection[];
    sectionErrors: DashboardSectionError[];
    dataQualityIssues: DashboardDataQualityIssue[];
    updatedAt: string;
  };

  type DashboardApiResponse = {
    data?: DashboardOverview;
    success?: boolean;
    errorCode?: string;
    errorMessage?: string;
  };

  type DashboardFilterParams = {
    module?: string;
    todoType?: DashboardTodoType | 'all';
    priority?: DashboardTodoPriority | 'all';
    simulateEmpty?: boolean;
    simulateNoRisk?: boolean;
    simulateFailure?: boolean;
    simulateSectionError?: DashboardVisibleSection;
  };

  type DashboardActionLogParams = {
    action: 'manual_refresh' | 'todo_jump' | 'quick_action_jump';
    objectId: string;
    targetRoute?: string;
    reason?: string;
  };

  type DashboardRiskHandleParams = {
    reason?: string;
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
