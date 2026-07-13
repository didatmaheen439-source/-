import { request } from '@umijs/max';
import type {
  MockExamPaper,
  MockExamPaperItemSnapshot,
  MockExamPaperListResponse,
  MockExamPaperQueryParams,
  MockExamResultDetail,
  MockExamResultListResponse,
  MockExamResultQueryParams,
  MockExamPaperSaveParams,
  MockExamPaperSubmitParams,
  MockExamPrecheckResult,
  MockExamReference,
  MockExamSection,
  MockExamStatistics,
  MockExamStatisticsPeriod,
  MockExamVersionDiff,
  MockExamVersionSnapshot,
} from './data';

export const mockExamPapers = (params: MockExamPaperQueryParams) =>
  request<MockExamPaperListResponse>('/api/mock-exam/papers', {
    method: 'GET',
    params,
  });

export const mockExamPaperDetail = (id: string) =>
  request<{ success: boolean; data?: MockExamPaper }>(
    `/api/mock-exam/papers/${id}`,
    { method: 'GET' },
  );

export const createMockExamPaper = (data: MockExamPaperSaveParams) =>
  request<{ success: boolean; data?: MockExamPaper }>(
    '/api/mock-exam/papers',
    { method: 'POST', data },
  );

export const updateMockExamPaper = (
  id: string,
  data: MockExamPaperSaveParams,
) =>
  request<{ success: boolean; data?: MockExamPaper }>(
    `/api/mock-exam/papers/${id}`,
    { method: 'PATCH', data },
  );

export const copyMockExamPaper = (id: string) =>
  request<{ success: boolean; data?: MockExamPaper }>(
    `/api/mock-exam/papers/${id}/copy`,
    { method: 'POST' },
  );

export const precheckMockExamPaper = (data: MockExamPaperSaveParams) =>
  request<{ success: boolean; data?: MockExamPrecheckResult }>(
    '/api/mock-exam/papers/precheck',
    { method: 'POST', data },
  );

export const precheckExistingMockExamPaper = (
  id: string,
  data?: { simulateFailure?: boolean },
) =>
  request<{ success: boolean; data?: MockExamPrecheckResult }>(
    `/api/mock-exam/papers/${id}/precheck`,
    { method: 'POST', data },
  );

export const submitMockExamPaperReview = (
  id: string,
  data: MockExamPaperSubmitParams,
) =>
  request<{
    success: boolean;
    data?: MockExamPaper;
    reviewTask?: API.ReviewTask;
  }>(`/api/mock-exam/papers/${id}/submit-review`, {
    method: 'POST',
    data,
  });

export const mockExamPaperVersions = (
  id: string,
  params?: { current?: number; pageSize?: number },
) =>
  request<{
    success: boolean;
    data: MockExamVersionSnapshot[];
    total: number;
  }>(`/api/mock-exam/papers/${id}/versions`, {
    method: 'GET',
    params,
  });

export const mockExamPaperVersionDiff = (
  id: string,
  params?: { fromVersion?: string; toVersion?: string },
) =>
  request<{ success: boolean; data?: MockExamVersionDiff }>(
    `/api/mock-exam/papers/${id}/versions/diff`,
    { method: 'GET', params },
  );

export const mockExamReferences = (params: {
  current?: number;
  pageSize?: number;
  keyword?: string;
  examType?: API.ExamType;
  sectionType?: string;
  sourceType?: string;
  availableOnly?: boolean;
}) =>
  request<{
    success: boolean;
    data: MockExamReference[];
    total: number;
    current: number;
    pageSize: number;
  }>('/api/mock-exam/references', { method: 'GET', params });

export const mockExamQuestionGroups = (params: {
  current?: number;
  pageSize?: number;
  keyword?: string;
  examType?: API.ExamType;
}) =>
  request<{ success: boolean; data: API.QuestionGroupItem[]; total: number }>(
    '/api/mock-exam/references/question-groups',
    { method: 'GET', params },
  );

export const expandMockExamQuestionGroup = (
  id: string,
  data: { sectionScore: number; startOrder: number },
) =>
  request<{ success: boolean; data: MockExamPaperItemSnapshot[] }>(
    `/api/mock-exam/references/question-groups/${id}/expand`,
    { method: 'POST', data },
  );

export const mockExamPaperStatistics = (
  id: string,
  period: MockExamStatisticsPeriod,
) =>
  request<{ success: boolean; data?: MockExamStatistics }>(
    `/api/mock-exam/papers/${id}/statistics`,
    { method: 'GET', params: { period } },
  );

export const mockExamResults = (params: MockExamResultQueryParams) =>
  request<MockExamResultListResponse>('/api/mock-exam/results', {
    method: 'GET',
    params,
  });

export const mockExamResultDetail = (
  paperId: string,
  period: MockExamStatisticsPeriod,
) =>
  request<{ success: boolean; data?: MockExamResultDetail }>(
    `/api/mock-exam/results/${paperId}`,
    { method: 'GET', params: { period } },
  );

export const createMockExamResultFixDraft = (
  paperId: string,
  data?: { reason?: string },
) =>
  request<{ success: boolean; data?: MockExamPaper }>(
    `/api/mock-exam/results/${paperId}/create-fix-draft`,
    { method: 'POST', data },
  );

export const mockExamTemplate = (examType: API.ExamType) =>
  request<{
    success: boolean;
    data?: {
      examType: API.ExamType;
      totalScore: number;
      totalMinutes: number;
      sections: MockExamSection[];
    };
  }>(`/api/mock-exam/templates/${examType}`, { method: 'GET' });
