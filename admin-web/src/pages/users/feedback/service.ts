import { request } from '@umijs/max';
import type {
  FeedbackQueueAssignParams,
  FeedbackQueueDetail,
  FeedbackQueueItem,
  FeedbackQueueQueryParams,
  FeedbackQueueResolutionParams,
  FeedbackQueueStatusParams,
} from '@/foundation/feedbackQueue';

export async function feedbackQueue(
  params?: FeedbackQueueQueryParams,
  options?: { [key: string]: unknown },
) {
  return request<{
    data?: FeedbackQueueItem[];
    total?: number;
    current?: number;
    pageSize?: number;
    success?: boolean;
  }>('/api/operation/feedback-queue', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

export async function feedbackQueueDetail(
  feedbackId: string,
  options?: { [key: string]: unknown },
) {
  return request<{ data?: FeedbackQueueDetail; success?: boolean }>(
    `/api/operation/feedback-queue/${feedbackId}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function assignFeedbackQueueItem(
  feedbackId: string,
  body: FeedbackQueueAssignParams,
  options?: { [key: string]: unknown },
) {
  return request<{ data?: FeedbackQueueDetail; success?: boolean }>(
    `/api/operation/feedback-queue/${feedbackId}/assign`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: body,
      ...(options || {}),
    },
  );
}

export async function submitFeedbackQueueResolution(
  feedbackId: string,
  body: FeedbackQueueResolutionParams,
  options?: { [key: string]: unknown },
) {
  return request<{ data?: FeedbackQueueDetail; success?: boolean }>(
    `/api/operation/feedback-queue/${feedbackId}/resolution`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: body,
      ...(options || {}),
    },
  );
}

export async function updateFeedbackQueueStatus(
  feedbackId: string,
  body: FeedbackQueueStatusParams,
  options?: { [key: string]: unknown },
) {
  return request<{ data?: FeedbackQueueDetail; success?: boolean }>(
    `/api/operation/feedback-queue/${feedbackId}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      data: body,
      ...(options || {}),
    },
  );
}
