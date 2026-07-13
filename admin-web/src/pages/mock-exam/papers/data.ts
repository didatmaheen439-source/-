export type MockExamSectionType =
  | 'writing'
  | 'listening'
  | 'reading'
  | 'translation';

export type MockExamSourceType =
  | 'question_bank'
  | 'writing_topic'
  | 'translation_topic';

export type MockExamPrecheckLevel = 'passed' | 'warning' | 'error';

export type MockExamStatisticsPeriod = '7d' | '30d' | 'all';

export type MockExamResultRiskType =
  | 'low_completion'
  | 'low_average_score'
  | 'weak_section'
  | 'weak_item'
  | 'time_pressure'
  | 'precheck_blocked';

export type MockExamResultRiskLevel = 'high' | 'medium' | 'low';

export type MockExamReference = {
  sourceType: MockExamSourceType;
  sourceId: string;
  sourceVersion: string;
  sourceStatus: API.ReviewTaskStatus;
  title: string;
  examType: API.ExamType;
  sectionType: MockExamSectionType;
  questionType?: API.QuestionType;
  available: boolean;
  updatedAt: string;
};

export type MockExamPaperItemSnapshot = {
  id: string;
  sourceType: MockExamSourceType;
  sourceId: string;
  sourceVersion: string;
  sourceStatusAtBinding: API.ReviewTaskStatus;
  title: string;
  sectionType: MockExamSectionType;
  score: number;
  order: number;
  stem?: string;
  options?: API.QuestionOption[];
  answer?: string;
  analysis?: string;
  requirements?: string[];
  referencePoints?: string[];
  referenceAnswer?: string;
  sourceGroupId?: string;
  sourceGroupName?: string;
  sourceGroupVersion?: string;
};

export type MockExamSection = {
  id: string;
  name: string;
  sectionType: MockExamSectionType;
  order: number;
  score: number;
  durationMinutes: number;
  instructions?: string;
  items: MockExamPaperItemSnapshot[];
};

export type MockExamPrecheckIssue = {
  id: string;
  level: MockExamPrecheckLevel;
  code: string;
  field: string;
  message: string;
  suggestion: string;
};

export type MockExamPrecheckResult = {
  level: MockExamPrecheckLevel;
  summary: string;
  checkedAt: string;
  issues: MockExamPrecheckIssue[];
};

export type MockExamVersionSnapshot = {
  id: string;
  paperId: string;
  version: string;
  status: API.ReviewTaskStatus;
  createdBy: string;
  createdAt: string;
  changeSummary: string;
  currentOnline: boolean;
  snapshot: {
    name: string;
    examType: API.ExamType;
    totalScore: number;
    totalMinutes: number;
    sectionCount: number;
    itemCount: number;
  };
};

export type MockExamPaper = {
  id: string;
  name: string;
  description: string;
  examType: API.ExamType;
  totalScore: number;
  totalMinutes: number;
  instructions: string;
  sections: MockExamSection[];
  status: API.ReviewTaskStatus;
  version: string;
  dataVersion: number;
  riskLevel: API.ReviewRiskLevel;
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
  lastPrecheck?: MockExamPrecheckResult;
  versionRecords: MockExamVersionSnapshot[];
  operationRecords: API.ReviewOperationRecord[];
};

export type MockExamPaperSaveParams = {
  name: string;
  description?: string;
  examType: API.ExamType;
  totalScore: number;
  totalMinutes: number;
  instructions?: string;
  sections: MockExamSection[];
  changeSummary?: string;
  impactScope?: string;
  dataVersion?: number;
  simulateFailure?: boolean;
};

export type MockExamPaperQueryParams = {
  current?: number;
  pageSize?: number;
  keyword?: string;
  examType?: API.ExamType;
  status?: API.ReviewTaskStatus;
  precheckLevel?: MockExamPrecheckLevel;
};

export type MockExamPaperListResponse = {
  success: boolean;
  data: MockExamPaper[];
  total: number;
  current: number;
  pageSize: number;
};

export type MockExamPaperSubmitParams = {
  changeSummary: string;
  dataVersion: number;
  confirmWarnings?: boolean;
  simulateTaskFailure?: boolean;
};

export type MockExamVersionDiffItem = {
  field: string;
  before?: string;
  after?: string;
  changed: boolean;
};

export type MockExamVersionDiff = {
  fromVersion: string;
  toVersion: string;
  items: MockExamVersionDiffItem[];
};

export type MockExamSectionStatistic = {
  sectionId: string;
  sectionName: string;
  averageScore: number;
  fullScore: number;
  averageRate: number;
  averageMinutes: number;
};

export type MockExamStatistics = {
  paperId: string;
  paperVersion: string;
  period: MockExamStatisticsPeriod;
  startedCount: number;
  completedCount: number;
  completionRate: number;
  averageScore: number;
  totalScore: number;
  averageMinutes: number;
  sectionStats: MockExamSectionStatistic[];
  containsSensitiveFields: false;
  mockOnly: true;
  updatedAt: string;
};

export type MockExamResultQueryParams = {
  current?: number;
  pageSize?: number;
  keyword?: string;
  examType?: API.ExamType;
  status?: API.ReviewTaskStatus;
  period?: MockExamStatisticsPeriod;
  riskType?: MockExamResultRiskType;
  completionBand?: 'low' | 'normal' | 'high';
  averageBand?: 'low' | 'normal' | 'high';
};

export type MockExamResultItem = {
  paperId: string;
  paperName: string;
  paperVersion: string;
  examType: API.ExamType;
  status: API.ReviewTaskStatus;
  period: MockExamStatisticsPeriod;
  startedCount: number;
  completedCount: number;
  completionRate: number;
  averageScore: number;
  totalScore: number;
  averageScoreRate: number;
  averageMinutes: number;
  totalMinutes: number;
  lowestSectionName: string;
  lowestSectionRate: number;
  riskTypes: MockExamResultRiskType[];
  riskLevel: MockExamResultRiskLevel;
  updatedAt: string;
};

export type MockExamItemStatistic = {
  itemId: string;
  title: string;
  sectionId: string;
  sectionName: string;
  sourceType: MockExamSourceType;
  sourceId: string;
  sourceVersion: string;
  averageScore: number;
  fullScore: number;
  averageRate: number;
  skipRate: number;
  riskLevel: MockExamResultRiskLevel;
  riskReasons: string[];
};

export type MockExamTimeRisk = {
  scope: 'paper' | 'section';
  targetId: string;
  targetName: string;
  configuredMinutes: number;
  averageMinutes: number;
  pressureRate: number;
  riskLevel: MockExamResultRiskLevel;
  message: string;
};

export type MockExamResultDiagnosis = {
  id: string;
  riskType?: MockExamResultRiskType;
  title: string;
  description: string;
  affectedScope: string;
  suggestion: string;
  targetRoute?: string;
};

export type MockExamResultDetail = {
  summary: MockExamResultItem;
  paper: MockExamPaper;
  statistics: MockExamStatistics;
  itemStats: MockExamItemStatistic[];
  timeRisks: MockExamTimeRisk[];
  diagnosis: MockExamResultDiagnosis[];
  containsSensitiveFields: false;
  mockOnly: true;
};

export type MockExamResultListResponse = {
  success: boolean;
  data: MockExamResultItem[];
  total: number;
  current: number;
  pageSize: number;
  summary: {
    startedCount: number;
    completedCount: number;
    completionRate: number;
    averageScore: number;
    averageScoreRate: number;
    averageMinutes: number;
    riskPaperCount: number;
    mockOnly: true;
  };
};
