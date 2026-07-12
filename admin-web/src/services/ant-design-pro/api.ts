// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取当前的用户 GET /api/currentUser */
export async function currentUser(options?: { [key: string]: any }) {
  return request<{
    data: API.CurrentUser;
  }>('/api/currentUser', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 退出登录接口 POST /api/login/outLogin */
export async function outLogin(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/login/outLogin', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 登录接口 POST /api/login/account */
export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
  return request<API.LoginResult>('/api/login/account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取后台账号列表 GET /api/admin/accounts */
export async function adminAccounts(options?: { [key: string]: any }) {
  return request<API.AdminAccountList>('/api/admin/accounts', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取角色权限配置 GET /api/admin/roles */
export async function adminRoles(options?: { [key: string]: any }) {
  return request<API.AdminRoleList>('/api/admin/roles', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取审计日志 GET /api/admin/audit-logs */
export async function adminAuditLogs(options?: { [key: string]: any }) {
  return request<API.AuditLogList>('/api/admin/audit-logs', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 更新账号状态 PATCH /api/admin/accounts/:id/status */
export async function updateAdminAccountStatus(
  id: string,
  body: API.AdminAccountStatusUpdateParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.AdminAccount;
    success?: boolean;
  }>(`/api/admin/accounts/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取审核发布任务 GET /api/review-release/tasks */
export async function reviewTasks(options?: { [key: string]: any }) {
  return request<API.ReviewTaskList>('/api/review-release/tasks', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取审核发布任务详情 GET /api/review-release/tasks/:id */
export async function reviewTaskDetail(id: string, options?: { [key: string]: any }) {
  return request<{
    data?: API.ReviewTask;
    success?: boolean;
  }>(`/api/review-release/tasks/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 更新审核发布状态 PATCH /api/review-release/tasks/:id/status */
export async function updateReviewTaskStatus(
  id: string,
  body: API.ReviewTaskStatusUpdateParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.ReviewTask;
    success?: boolean;
  }>(`/api/review-release/tasks/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取每日一句列表 GET /api/content-operations/daily-sentences */
export async function dailySentences(params?: API.DailySentenceQueryParams) {
  return request<{ data?: API.DailySentenceItem[]; total?: number; success?: boolean }>(
    '/api/content-operations/daily-sentences',
    { method: 'GET', params },
  );
}

export async function dailySentenceDetail(id: string) {
  return request<{ data?: API.DailySentenceItem; success?: boolean }>(
    `/api/content-operations/daily-sentences/${id}`,
    { method: 'GET' },
  );
}

export async function dailySentenceImageAssets() {
  return request<{ data?: API.DailySentenceImageAsset[]; success?: boolean }>(
    '/api/content-operations/daily-sentence-image-assets',
    { method: 'GET' },
  );
}

export async function createDailySentence(body: API.DailySentenceSaveParams) {
  return request<{ data?: API.DailySentenceItem; success?: boolean }>(
    '/api/content-operations/daily-sentences',
    { method: 'POST', data: body },
  );
}

export async function updateDailySentence(id: string, body: API.DailySentenceSaveParams) {
  return request<{ data?: API.DailySentenceItem; success?: boolean }>(
    `/api/content-operations/daily-sentences/${id}`,
    { method: 'PATCH', data: body },
  );
}

export async function precheckDailySentence(body: API.DailySentenceSaveParams & { id?: string }) {
  return request<{ data?: API.DailySentencePrecheckResult; success?: boolean }>(
    '/api/content-operations/daily-sentences/precheck',
    { method: 'POST', data: body },
  );
}

export async function precheckExistingDailySentence(id: string) {
  return request<{ data?: API.DailySentencePrecheckResult; success?: boolean }>(
    `/api/content-operations/daily-sentences/${id}/precheck`,
    { method: 'POST' },
  );
}

export async function submitDailySentenceReview(id: string, body: API.DailySentenceSubmitParams) {
  return request<{ data?: API.DailySentenceItem; success?: boolean }>(
    `/api/content-operations/daily-sentences/${id}/submit-review`,
    { method: 'POST', data: body },
  );
}

export async function copyDailySentence(id: string) {
  return request<{ data?: API.DailySentenceItem; success?: boolean }>(
    `/api/content-operations/daily-sentences/${id}/copy`,
    { method: 'POST' },
  );
}

export async function dailySentenceEffects(id: string) {
  return request<{ data?: { summary: API.DailySentenceEffectSummary; trend: API.DailySentenceEffectTrend[] }; success?: boolean }>(
    `/api/content-operations/daily-sentences/${id}/effects`,
    { method: 'GET' },
  );
}

export async function createDailySentenceMockEvent(id: string, body: API.DailySentenceMockEventParams) {
  return request<{ data?: { event: API.DailySentenceEvent; duplicate: boolean; effects: { summary: API.DailySentenceEffectSummary; trend: API.DailySentenceEffectTrend[] } }; success?: boolean }>(
    `/api/content-operations/daily-sentences/${id}/mock-events`,
    { method: 'POST', data: body },
  );
}

/** 获取 AI 陪练策略列表 GET /api/ai-coach/strategies */
export async function aiCoachStrategies(
  params?: API.AiCoachStrategyQueryParams,
  options?: { [key: string]: any },
) {
  return request<API.AiCoachStrategyList>('/api/ai-coach/strategies', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取 AI 陪练策略详情 GET /api/ai-coach/strategies/:id */
export async function aiCoachStrategyDetail(id: string, options?: { [key: string]: any }) {
  return request<{
    data?: API.AiCoachStrategy;
    success?: boolean;
  }>(`/api/ai-coach/strategies/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建 AI 陪练策略 POST /api/ai-coach/strategies */
export async function createAiCoachStrategy(
  body: API.AiCoachStrategySaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.AiCoachStrategy;
    success?: boolean;
  }>('/api/ai-coach/strategies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新 AI 陪练策略 PATCH /api/ai-coach/strategies/:id */
export async function updateAiCoachStrategy(
  id: string,
  body: API.AiCoachStrategySaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.AiCoachStrategy;
    success?: boolean;
  }>(`/api/ai-coach/strategies/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 复制已发布策略为草稿 POST /api/ai-coach/strategies/:id/copy */
export async function copyAiCoachStrategy(id: string, options?: { [key: string]: any }) {
  return request<{
    data?: API.AiCoachStrategy;
    success?: boolean;
  }>(`/api/ai-coach/strategies/${id}/copy`, {
    method: 'POST',
    ...(options || {}),
  });
}

/** 预校验 AI 陪练策略 POST /api/ai-coach/strategies/precheck */
export async function precheckAiCoachStrategy(
  body: API.AiCoachStrategySaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.AiCoachPrecheckResult;
    success?: boolean;
  }>('/api/ai-coach/strategies/precheck', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 静态样例校验 AI 陪练策略 POST /api/ai-coach/strategies/validate-samples */
export async function validateAiCoachStrategySamples(
  body: API.AiCoachStrategySaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.AiCoachStaticValidationResult;
    success?: boolean;
  }>('/api/ai-coach/strategies/validate-samples', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 提交 AI 陪练策略审核 POST /api/ai-coach/strategies/:id/submit-review */
export async function submitAiCoachStrategyReview(
  id: string,
  body: API.AiCoachStrategySubmitParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.AiCoachStrategy;
    reviewTask?: API.ReviewTask;
    success?: boolean;
  }>(`/api/ai-coach/strategies/${id}/submit-review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取 AI 陪练策略版本 GET /api/ai-coach/strategies/:id/versions */
export async function aiCoachStrategyVersions(id: string, options?: { [key: string]: any }) {
  return request<{
    data?: API.AiCoachVersionSnapshot[];
    success?: boolean;
  }>(`/api/ai-coach/strategies/${id}/versions`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取 AI 陪练策略版本差异 GET /api/ai-coach/strategies/:id/version-diff */
export async function aiCoachStrategyVersionDiff(
  id: string,
  params?: { fromVersion?: string; toVersion?: string },
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.AiCoachVersionDiff;
    success?: boolean;
  }>(`/api/ai-coach/strategies/${id}/version-diff`, {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取可引用意图配置 GET /api/ai-coach/available-intents */
export async function availableAiCoachIntents(options?: { [key: string]: any }) {
  return request<{
    data?: API.AiCoachStrategy[];
    success?: boolean;
  }>('/api/ai-coach/available-intents', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取可引用回答结构 GET /api/ai-coach/available-response-structures */
export async function availableAiCoachResponseStructures(options?: { [key: string]: any }) {
  return request<{
    data?: API.AiCoachStrategy[];
    success?: boolean;
  }>('/api/ai-coach/available-response-structures', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取写译题目列表 GET /api/writing-translation/topics */
export async function writingTranslationTopics(
  params?: API.WritingTranslationTopicQueryParams,
  options?: { [key: string]: any },
) {
  return request<API.WritingTranslationTopicList>('/api/writing-translation/topics', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取写译题目详情 GET /api/writing-translation/topics/:id */
export async function writingTranslationTopicDetail(
  id: string,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WritingTranslationTopic;
    success?: boolean;
  }>(`/api/writing-translation/topics/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 新建写译题目 POST /api/writing-translation/topics */
export async function createWritingTranslationTopic(
  body: API.WritingTranslationTopicSaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WritingTranslationTopic;
    success?: boolean;
  }>('/api/writing-translation/topics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新写译题目 PATCH /api/writing-translation/topics/:id */
export async function updateWritingTranslationTopic(
  id: string,
  body: API.WritingTranslationTopicSaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WritingTranslationTopic;
    success?: boolean;
  }>(`/api/writing-translation/topics/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 复制写译题目为草稿 POST /api/writing-translation/topics/:id/copy */
export async function copyWritingTranslationTopic(
  id: string,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WritingTranslationTopic;
    success?: boolean;
  }>(`/api/writing-translation/topics/${id}/copy`, {
    method: 'POST',
    ...(options || {}),
  });
}

/** 新建态写译预校验 POST /api/writing-translation/topics/precheck */
export async function precheckWritingTranslationTopic(
  body: API.WritingTranslationTopicSaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WritingTranslationPrecheckResult;
    success?: boolean;
  }>('/api/writing-translation/topics/precheck', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 已有写译题目预校验 POST /api/writing-translation/topics/:id/precheck */
export async function precheckExistingWritingTranslationTopic(
  id: string,
  body?: API.WritingTranslationTopicSaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WritingTranslationPrecheckResult;
    success?: boolean;
  }>(`/api/writing-translation/topics/${id}/precheck`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 新建态静态样例校验 POST /api/writing-translation/topics/validate-samples */
export async function validateWritingTranslationSamples(
  body: API.WritingTranslationTopicSaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WritingTranslationValidationResult;
    success?: boolean;
  }>('/api/writing-translation/topics/validate-samples', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 已有写译题目静态样例校验 POST /api/writing-translation/topics/:id/validate-samples */
export async function validateExistingWritingTranslationSamples(
  id: string,
  body?: API.WritingTranslationTopicSaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WritingTranslationValidationResult;
    success?: boolean;
  }>(`/api/writing-translation/topics/${id}/validate-samples`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 提交写译题目审核 POST /api/writing-translation/topics/:id/submit-review */
export async function submitWritingTranslationReview(
  id: string,
  body: API.WritingTranslationSubmitParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WritingTranslationTopic;
    reviewTask?: API.ReviewTask;
    success?: boolean;
  }>(`/api/writing-translation/topics/${id}/submit-review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取写译题目版本 GET /api/writing-translation/topics/:id/versions */
export async function writingTranslationTopicVersions(
  id: string,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WritingTranslationTopicVersion[];
    success?: boolean;
  }>(`/api/writing-translation/topics/${id}/versions`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取写译题目版本差异 GET /api/writing-translation/topics/:id/versions/diff */
export async function writingTranslationTopicVersionDiff(
  id: string,
  params?: { fromVersion?: string; toVersion?: string },
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WritingTranslationVersionDiff;
    success?: boolean;
  }>(`/api/writing-translation/topics/${id}/versions/diff`, {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取写译评分预设 GET /api/writing-translation/references/scoring-presets */
export async function writingTranslationScoringPresets(
  params?: { topicType?: API.WritingTranslationTopicType },
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WritingTranslationScoringPreset[];
    success?: boolean;
  }>('/api/writing-translation/references/scoring-presets', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取写译可引用 AI 策略 GET /api/writing-translation/references/ai-strategies */
export async function writingTranslationAiStrategies(
  params?: {
    topicType?: API.WritingTranslationTopicType;
    examType?: API.ExamType;
  },
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.AiCoachStrategy[];
    success?: boolean;
  }>('/api/writing-translation/references/ai-strategies', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取题库题目列表 GET /api/content/questions */
export async function contentQuestions(options?: { [key: string]: any }) {
  return request<API.QuestionList>('/api/content/questions', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取题库题目详情 GET /api/content/questions/:id */
export async function contentQuestionDetail(id: string, options?: { [key: string]: any }) {
  return request<{
    data?: API.QuestionItem;
    success?: boolean;
  }>(`/api/content/questions/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建题库题目 POST /api/content/questions */
export async function createContentQuestion(
  body: API.QuestionSaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.QuestionItem;
    success?: boolean;
  }>('/api/content/questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新题库题目 PATCH /api/content/questions/:id */
export async function updateContentQuestion(
  id: string,
  body: API.QuestionSaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.QuestionItem;
    success?: boolean;
  }>(`/api/content/questions/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 提交题目审核 POST /api/content/questions/:id/submit-review */
export async function submitContentQuestionReview(
  id: string,
  body: API.QuestionSubmitReviewParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.QuestionItem;
    reviewTask?: API.ReviewTask;
    success?: boolean;
  }>(`/api/content/questions/${id}/submit-review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取题组列表 GET /api/content/question-groups */
export async function contentQuestionGroups(
  params?: API.PageParams & Record<string, unknown>,
  options?: { [key: string]: any },
) {
  return request<API.QuestionGroupList>('/api/content/question-groups', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取题组详情 GET /api/content/question-groups/:id */
export async function contentQuestionGroupDetail(id: string) {
  return request<{ success: boolean; data: API.QuestionGroupItem }>(
    `/api/content/question-groups/${id}`,
  );
}

/** 获取题组可选已发布题目 */
export async function availableQuestionGroupQuestions(
  params: API.PageParams & { examType?: API.ExamType; skill?: API.QuestionSkill; keyword?: string },
) {
  return request<API.QuestionList>('/api/content/question-groups/available-questions', {
    method: 'GET',
    params,
  });
}

export async function createContentQuestionGroup(data: API.QuestionGroupSaveParams) {
  return request<{ success: boolean; data: API.QuestionGroupItem; precheck: API.QuestionGroupPrecheckResult }>(
    '/api/content/question-groups',
    { method: 'POST', data },
  );
}

export async function updateContentQuestionGroup(id: string, data: API.QuestionGroupSaveParams) {
  return request<{ success: boolean; data: API.QuestionGroupItem }>(
    `/api/content/question-groups/${id}`,
    { method: 'PATCH', data },
  );
}

export async function copyContentQuestionGroup(id: string) {
  return request<{ success: boolean; data: API.QuestionGroupItem }>(
    `/api/content/question-groups/${id}/copy`,
    { method: 'POST' },
  );
}

export async function precheckContentQuestionGroup(id: string) {
  return request<{ success: boolean; data: API.QuestionGroupPrecheckResult }>(
    `/api/content/question-groups/${id}/precheck`,
    { method: 'POST' },
  );
}

export async function submitContentQuestionGroupReview(
  id: string,
  data: API.QuestionGroupSubmitReviewParams,
) {
  return request<{ success: boolean; data: API.QuestionGroupItem; reviewTask: API.ReviewTask }>(
    `/api/content/question-groups/${id}/submit-review`,
    { method: 'POST', data },
  );
}

export async function contentQuestionGroupImpact(id: string) {
  return request<{ success: boolean; data: API.QuestionGroupImpact }>(
    `/api/content/question-groups/${id}/impact`,
  );
}

/** 获取外刊列表 GET /api/content/articles */
export async function contentArticles(params?: API.ArticleQueryParams) {
  return request<API.ArticleList>('/api/content/articles', { method: 'GET', params });
}

/** 获取外刊详情 GET /api/content/articles/:id */
export async function contentArticleDetail(id: string) {
  return request<{ success: boolean; data: API.ArticleItem }>(`/api/content/articles/${id}`, { method: 'GET' });
}

/** 获取受管素材 GET /api/content/article-assets */
export async function contentArticleAssets() {
  return request<{ success: boolean; data: API.ArticleAsset[] }>('/api/content/article-assets', { method: 'GET' });
}

/** 新建外刊 POST /api/content/articles */
export async function createContentArticle(body: API.ArticleSaveParams) {
  return request<{ success: boolean; data: API.ArticleItem }>('/api/content/articles', { method: 'POST', data: body });
}

/** 更新外刊 PATCH /api/content/articles/:id */
export async function updateContentArticle(id: string, body: API.ArticleSaveParams) {
  return request<{ success: boolean; data: API.ArticleItem }>(`/api/content/articles/${id}`, { method: 'PATCH', data: body });
}

/** 复制外刊为新草稿 POST /api/content/articles/:id/copy */
export async function copyContentArticle(id: string) {
  return request<{ success: boolean; data: API.ArticleItem }>(`/api/content/articles/${id}/copy`, { method: 'POST' });
}

/** 外刊预校验 POST /api/content/articles/:id/precheck */
export async function precheckContentArticle(id: string) {
  return request<{ success: boolean; data: API.ArticlePrecheckResult }>(`/api/content/articles/${id}/precheck`, { method: 'POST' });
}

/** 提交外刊审核 POST /api/content/articles/:id/submit-review */
export async function submitContentArticleReview(id: string, body: API.ArticleSubmitReviewParams) {
  return request<{ success: boolean; data: API.ArticleItem; reviewTask: API.ReviewTask }>(`/api/content/articles/${id}/submit-review`, { method: 'POST', data: body });
}

/** 获取外刊效果 GET /api/content/articles/:id/effects */
export async function contentArticleEffects(id: string) {
  return request<{ success: boolean; data: API.ArticleEffectSummary }>(`/api/content/articles/${id}/effects`, { method: 'GET' });
}

/** 写入 Mock 用户事件 POST /api/mock-app/articles/:id/events */
export async function createMockArticleEvent(id: string, body: API.ArticleUserEventParams) {
  return request<{ success: boolean; data: API.ArticleUserEvent; duplicate: boolean; effects: API.ArticleEffectSummary }>(`/api/mock-app/articles/${id}/events`, { method: 'POST', data: body });
}

/** 获取错因标签列表 GET /api/content/wrong-reason-tags */
export async function wrongReasonTags(
  params?: {
    current?: number;
    pageSize?: number;
    keyword?: string;
    category?: API.WrongReasonTagCategory;
    examType?: API.ExamType;
    questionType?: API.QuestionType;
    severity?: API.WrongReasonTagSeverity;
    status?: API.ReviewTaskStatus;
    updatedBy?: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.WrongReasonTagList>('/api/content/wrong-reason-tags', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取错因标签详情 GET /api/content/wrong-reason-tags/:id */
export async function wrongReasonTagDetail(id: string, options?: { [key: string]: any }) {
  return request<{
    data?: API.WrongReasonTagItem;
    success?: boolean;
  }>(`/api/content/wrong-reason-tags/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建错因标签 POST /api/content/wrong-reason-tags */
export async function createWrongReasonTag(
  body: API.WrongReasonTagSaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WrongReasonTagItem;
    success?: boolean;
  }>('/api/content/wrong-reason-tags', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新错因标签 PATCH /api/content/wrong-reason-tags/:id */
export async function updateWrongReasonTag(
  id: string,
  body: API.WrongReasonTagSaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WrongReasonTagItem;
    success?: boolean;
  }>(`/api/content/wrong-reason-tags/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 提交错因标签审核 POST /api/content/wrong-reason-tags/:id/submit-review */
export async function submitWrongReasonTagReview(
  id: string,
  body: API.WrongReasonTagSubmitReviewParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.WrongReasonTagItem;
    reviewTask?: API.ReviewTask;
    success?: boolean;
  }>(`/api/content/wrong-reason-tags/${id}/submit-review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取运营用户列表 GET /api/operation/users */
export async function operationUsers(
  params?: {
    current?: number;
    pageSize?: number;
    keyword?: string;
    examType?: API.ExamType;
    onboardingStatus?: API.UserOnboardingStatus;
    diagnosisStatus?: API.UserDiagnosisStatus;
    todayTaskStatus?: API.UserTaskStatus;
    feedbackStatus?: API.UserFeedbackStatus;
    lastActiveRange?: string[];
    sorter?: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.AdminUserList>('/api/operation/users', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取运营用户详情 GET /api/operation/users/:id */
export async function operationUserDetail(id: string, options?: { [key: string]: any }) {
  return request<{
    data?: API.AdminUser;
    success?: boolean;
  }>(`/api/operation/users/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取用户学习记录 GET /api/operation/users/:id/learning-records */
export async function operationUserLearningRecords(
  id: string,
  params?: {
    current?: number;
    pageSize?: number;
    dateRange?: string[];
    module?: string;
    status?: API.UserTaskStatus;
    errorTag?: string;
  },
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.UserLearningRecord[];
    total?: number;
    success?: boolean;
  }>(`/api/operation/users/${id}/learning-records`, {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取用户反馈 GET /api/operation/users/:id/feedback */
export async function operationUserFeedbacks(
  id: string,
  params?: {
    current?: number;
    pageSize?: number;
    status?: API.UserFeedbackStatus;
  },
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.UserFeedbackItem[];
    total?: number;
    success?: boolean;
  }>(`/api/operation/users/${id}/feedback`, {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取用户 AI 摘要 GET /api/operation/users/:id/ai-summaries */
export async function operationUserAiSummaries(
  id: string,
  params?: {
    current?: number;
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.UserAiSummary[];
    total?: number;
    success?: boolean;
  }>(`/api/operation/users/${id}/ai-summaries`, {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取用户敏感访问日志 GET /api/operation/users/:id/access-logs */
export async function operationUserAccessLogs(
  id: string,
  params?: {
    current?: number;
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.UserSensitiveAccessLog[];
    total?: number;
    success?: boolean;
  }>(`/api/operation/users/${id}/access-logs`, {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 更新用户反馈状态 PATCH /api/operation/users/:id/feedback/:feedbackId/status */
export async function updateUserFeedbackStatus(
  userId: string,
  feedbackId: string,
  body: API.UserFeedbackStatusUpdateParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.UserFeedbackItem;
    success?: boolean;
  }>(`/api/operation/users/${userId}/feedback/${feedbackId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 新增客服备注 POST /api/operation/users/:id/remarks */
export async function createUserRemark(
  id: string,
  body: API.UserRemarkCreateParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.UserRemark;
    success?: boolean;
  }>(`/api/operation/users/${id}/remarks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 写入敏感访问日志并获取授权内容 POST /api/operation/sensitive-access-logs */
export async function createSensitiveAccessLog(
  body: API.SensitiveAccessParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: {
      content?: string;
      fields?: Record<string, string>;
      accessLog?: API.UserSensitiveAccessLog;
    };
    success?: boolean;
  }>('/api/operation/sensitive-access-logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取 Onboarding 配置闭环 GET /api/learning-path/onboarding */
export async function onboardingOverview(options?: { [key: string]: any }) {
  return request<{
    data?: API.OnboardingOverview;
    success?: boolean;
  }>('/api/learning-path/onboarding', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 更新 Onboarding 草稿 PATCH /api/learning-path/onboarding/:id */
export async function updateOnboardingConfig(
  id: string,
  body: API.OnboardingSaveParams,
  options?: { [key: string]: any },
) {
  return request<{ data?: API.OnboardingConfig; success?: boolean }>(
    `/api/learning-path/onboarding/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      data: body,
      ...(options || {}),
    },
  );
}

/** 复制 Onboarding 配置为草稿 POST /api/learning-path/onboarding/:id/copy */
export async function copyOnboardingConfig(
  id: string,
  options?: { [key: string]: any },
) {
  return request<{ data?: API.OnboardingConfig; success?: boolean }>(
    `/api/learning-path/onboarding/${id}/copy`,
    { method: 'POST', ...(options || {}) },
  );
}

/** 预校验 Onboarding 配置 POST /api/learning-path/onboarding/:id/precheck */
export async function precheckOnboardingConfig(
  id: string,
  body: API.OnboardingSaveParams,
  options?: { [key: string]: any },
) {
  return request<{ data?: API.OnboardingPrecheckResult; success?: boolean }>(
    `/api/learning-path/onboarding/${id}/precheck`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: body,
      ...(options || {}),
    },
  );
}

/** 提交 Onboarding 配置审核 POST /api/learning-path/onboarding/:id/submit-review */
export async function submitOnboardingConfigReview(
  id: string,
  body: API.LearningPathSubmitReviewParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.OnboardingConfig;
    reviewTask?: API.ReviewTask;
    success?: boolean;
  }>(`/api/learning-path/onboarding/${id}/submit-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: body,
    ...(options || {}),
  });
}

/** 获取 Onboarding 版本 GET /api/learning-path/onboarding/:id/versions */
export async function onboardingConfigVersions(
  id: string,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.OnboardingConfigVersion[];
    total?: number;
    success?: boolean;
  }>(`/api/learning-path/onboarding/${id}/versions`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 完成固定 Mock 用户 Onboarding POST /api/learning-path/onboarding/mock-user/complete */
export async function completeMockOnboarding(
  body: API.OnboardingSubmission,
  options?: { [key: string]: any },
) {
  return request<{ data?: API.OnboardingOverview; success?: boolean }>(
    '/api/learning-path/onboarding/mock-user/complete',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: body,
      ...(options || {}),
    },
  );
}

/** 重置固定 Mock 用户 POST /api/learning-path/onboarding/mock-user/reset */
export async function resetMockOnboarding(options?: { [key: string]: any }) {
  return request<{ data?: API.OnboardingOverview; success?: boolean }>(
    '/api/learning-path/onboarding/mock-user/reset',
    { method: 'POST', ...(options || {}) },
  );
}

/** 获取学习路径配置列表 GET /api/learning-path/configs */
export async function learningPathConfigs(
  params?: API.LearningPathConfigQueryParams,
  options?: { [key: string]: any },
) {
  return request<API.LearningPathConfigList>('/api/learning-path/configs', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取学习路径配置详情 GET /api/learning-path/configs/:id */
export async function learningPathConfigDetail(
  id: string,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.LearningPathConfigItem;
    success?: boolean;
  }>(`/api/learning-path/configs/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建学习路径配置 POST /api/learning-path/configs */
export async function createLearningPathConfig(
  body: API.LearningPathSaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.LearningPathConfigItem;
    success?: boolean;
  }>('/api/learning-path/configs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新学习路径配置 PATCH /api/learning-path/configs/:id */
export async function updateLearningPathConfig(
  id: string,
  body: API.LearningPathSaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.LearningPathConfigItem;
    success?: boolean;
  }>(`/api/learning-path/configs/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 复制学习路径配置 POST /api/learning-path/configs/:id/copy */
export async function copyLearningPathConfig(
  id: string,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.LearningPathConfigItem;
    success?: boolean;
  }>(`/api/learning-path/configs/${id}/copy`, {
    method: 'POST',
    ...(options || {}),
  });
}

/** 预校验学习路径配置 POST /api/learning-path/configs/precheck */
export async function precheckLearningPathConfig(
  body: API.LearningPathSaveParams & { id?: string },
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.LearningPathPrecheckResult;
    success?: boolean;
  }>('/api/learning-path/configs/precheck', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 预校验已有学习路径配置 POST /api/learning-path/configs/:id/precheck */
export async function precheckExistingLearningPathConfig(
  id: string,
  body: API.LearningPathSaveParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.LearningPathPrecheckResult;
    success?: boolean;
  }>(`/api/learning-path/configs/${id}/precheck`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 提交学习路径配置审核 POST /api/learning-path/configs/:id/submit-review */
export async function submitLearningPathConfigReview(
  id: string,
  body: API.LearningPathSubmitReviewParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.LearningPathConfigItem;
    reviewTask?: API.ReviewTask;
    success?: boolean;
  }>(`/api/learning-path/configs/${id}/submit-review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取学习路径配置版本 GET /api/learning-path/configs/:id/versions */
export async function learningPathConfigVersions(
  id: string,
  params?: { current?: number; pageSize?: number },
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.LearningPathConfigVersion[];
    total?: number;
    success?: boolean;
  }>(`/api/learning-path/configs/${id}/versions`, {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 可引用题目 GET /api/learning-path/references/questions */
export async function availableLearningPathQuestions(
  params?: {
    current?: number;
    pageSize?: number;
    keyword?: string;
    examType?: API.ExamType;
    module?: API.LearningPathModule;
    status?: API.ReviewTaskStatus;
  },
  options?: { [key: string]: any },
) {
  return request<API.LearningPathReferenceList>('/api/learning-path/references/questions', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 可引用题组 GET /api/learning-path/references/question-groups */
export async function availableLearningPathQuestionGroups(
  params?: {
    current?: number;
    pageSize?: number;
    keyword?: string;
    examType?: API.ExamType;
    module?: API.LearningPathModule;
    status?: API.ReviewTaskStatus | 'enabled' | 'disabled';
  },
  options?: { [key: string]: any },
) {
  return request<API.LearningPathReferenceList>(
    '/api/learning-path/references/question-groups',
    {
      method: 'GET',
      params,
      ...(options || {}),
    },
  );
}

/** 用户学习路径匹配摘要 GET /api/operation/users/:id/learning-path-match */
export async function userLearningPathMatchSummary(
  id: string,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.UserLearningPathMatchSummary;
    success?: boolean;
  }>(`/api/operation/users/${id}/learning-path-match`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取运营数据总览 GET /api/analytics/overview */
export async function analyticsOverview(
  params?: API.AnalyticsFilterParams,
  options?: { [key: string]: any },
) {
  return request<API.AnalyticsApiResponse>('/api/analytics/overview', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 生成运营数据 Mock 导出预览 GET /api/analytics/overview/export */
export async function exportAnalyticsOverview(
  params?: API.AnalyticsFilterParams,
  options?: { [key: string]: any },
) {
  return request<{
    data?: API.AnalyticsExportResult;
    success?: boolean;
  }>('/api/analytics/overview/export', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取运营工作台 GET /api/dashboard/overview */
export async function dashboardOverview(
  params?: API.DashboardFilterParams,
  options?: { [key: string]: any },
) {
  return request<API.DashboardApiResponse>('/api/dashboard/overview', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 记录工作台动作 POST /api/dashboard/action-log */
export async function recordDashboardAction(
  body: API.DashboardActionLogParams,
  options?: { [key: string]: any },
) {
  return request<{ success?: boolean }>('/api/dashboard/action-log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 标记工作台风险已处理 PATCH /api/dashboard/risks/:id/handle */
export async function handleDashboardRisk(
  id: string,
  body: API.DashboardRiskHandleParams,
  options?: { [key: string]: any },
) {
  return request<{ success?: boolean }>(`/api/dashboard/risks/${id}/handle`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 GET /api/notices */
export async function getNotices(options?: { [key: string]: any }) {
  return request<API.NoticeIconList>('/api/notices', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取规则列表 GET /api/rule */
export async function rule(
  params: {
    // query
    /** 当前的页码 */
    current?: number;
    /** 页面的容量 */
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.RuleList>('/api/rule', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 更新规则 PUT /api/rule */
export async function updateRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data: {
      method: 'update',
      ...(options || {}),
    },
  });
}

/** 新建规则 POST /api/rule */
export async function addRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data: {
      method: 'post',
      ...(options || {}),
    },
  });
}

/** 删除规则 DELETE /api/rule */
export async function removeRule(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/rule', {
    method: 'POST',
    data: {
      method: 'delete',
      ...(options || {}),
    },
  });
}
