import { describe, expect, it } from 'vitest';
import {
  buildWrongReasonTagReviewTask,
  filterWrongReasonTags,
  validateWrongReasonTagPayload,
  wrongReasonTagData,
} from '../../../../mock/contentQuestionStore';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

describe('wrongReasonTagStore', () => {
  it('filters tags by status, exam type, question type, and keyword', () => {
    const result = filterWrongReasonTags({
      status: 'published',
      examType: 'CET4',
      questionType: 'reading_choice',
      keyword: '主旨',
    });

    expect(result.some((item) => item.name === '主旨理解偏差')).toBe(true);
    expect(result.every((item) => item.status === 'published')).toBe(true);
  });

  it('validates required fields and duplicate names within the same category', () => {
    expect(validateWrongReasonTagPayload({ name: '' })?.errorCode).toBe('400');
    expect(
      validateWrongReasonTagPayload({
        name: '新错因',
        category: 'knowledge_gap',
        examTypes: [],
        questionTypes: ['single_choice'],
        severity: 'medium',
        description: '描述',
      })?.errorMessage,
    ).toBe('适用考试是必填项。');
    expect(
      validateWrongReasonTagPayload({
        name: '主旨理解偏差',
        category: 'comprehension_bias',
        examTypes: ['CET4'],
        questionTypes: ['reading_choice'],
        severity: 'medium',
        description: '描述',
      })?.errorCode,
    ).toBe('409');
  });

  it('builds a review task for wrong reason tags with content ownership', () => {
    const tag = clone(
      wrongReasonTagData.find((item) => item.id === 'wrong-reason-main-idea-bias'),
    );
    if (!tag) throw new Error('Missing wrong reason tag seed');
    const reviewTasks: API.ReviewTask[] = [];
    const task = buildWrongReasonTagReviewTask(
      tag,
      { id: 'content_operator', name: '内容运营' },
      '提交错因标签审核。',
      reviewTasks,
    );

    expect(task.objectType).toBe('wrong_reason_tag');
    expect(task.moduleKey).toBe('content');
    expect(task.status).toBe('pending_review');
    expect(task.riskLevel).toBe('high');
    expect(tag.reviewTaskId).toBe(task.id);
    expect(reviewTasks).toHaveLength(1);
  });
});
