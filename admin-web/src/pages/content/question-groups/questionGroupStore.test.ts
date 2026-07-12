import { describe, expect, it } from 'vitest';
import {
  buildQuestionGroupReviewTask,
  precheckQuestionGroup,
  questionGroupData,
  questionGroupReferences,
} from '../../../../mock/questionGroupStore';
import { expandQuestionGroupForMockExam } from '../../../../mock/mockExamStore';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

describe('questionGroupStore', () => {
  it('only exposes published valid groups as available references', () => {
    const references = questionGroupReferences();
    expect(references.find((item) => item.id === 'group-cet4-reading-core')?.available).toBe(true);
    expect(references.find((item) => item.id === 'group-cet4-vocab-draft')?.available).toBe(false);
  });

  it('blocks duplicate questions and cross-module questions', () => {
    const source = questionGroupData.find((item) => item.id === 'group-cet4-reading-core');
    if (!source?.members[0]) throw new Error('Missing question group seed');
    const params: API.QuestionGroupSaveParams = {
      name: source.name,
      description: source.description,
      examType: source.examType,
      skill: 'listening',
      audienceTags: source.audienceTags,
      estimatedMinutes: source.estimatedMinutes,
      questionIds: [source.members[0].questionId, source.members[0].questionId],
    };
    const result = precheckQuestionGroup(params);
    expect(result.passed).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes('重复'))).toBe(true);
    expect(result.issues.some((issue) => issue.message.includes('学习模块'))).toBe(true);
  });

  it('creates a content review task and preserves group provenance in mock exam snapshots', () => {
    const source = questionGroupData.find((item) => item.id === 'group-cet4-reading-core');
    if (!source) throw new Error('Missing question group seed');
    const group = clone(source);
    group.status = 'draft';
    const tasks: API.ReviewTask[] = [];
    const task = buildQuestionGroupReviewTask(group, { id: 'teaching_editor', name: '教研编辑' }, tasks);
    const snapshots = expandQuestionGroupForMockExam(source.id, 20, 1);
    expect(task.objectType).toBe('question_group');
    expect(task.moduleKey).toBe('content');
    expect(tasks).toHaveLength(1);
    expect(snapshots).toHaveLength(source.members.length);
    expect(snapshots?.every((item) => item.sourceGroupId === source.id)).toBe(true);
    expect(snapshots?.map((item) => item.order)).toEqual(source.members.map((_, index) => index + 1));
  });
});
