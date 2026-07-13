import { describe, expect, it } from 'vitest';
import { roleConfigs } from './permissions';
import {
  bindTemplatesToTopic,
  canEditWritingTranslationTemplate,
  getWritingTranslationTemplate,
  precheckWritingTranslationTemplate,
  runMockCorrection,
  submitWritingTranslationTemplateReview,
} from '../../mock/writingTranslationTemplateStore';
import { writingTranslationTopicsData } from '../../mock/writingTranslationStore';

const operator = (roleId: 'teaching_reviewer' | 'ai_operator') => ({
  id: `${roleId}-test`,
  name: roleConfigs[roleId].name,
  roleId,
  roleName: roleConfigs[roleId].name,
});

describe('writing translation template workflow', () => {
  it('blocks scoring templates whose weights do not total 100', () => {
    const result = precheckWritingTranslationTemplate({
      templateType: 'scoring_template',
      name: '错误权重模板',
      topicTypes: ['writing'],
      examTypes: ['CET4'],
      totalScore: 50,
      dimensions: [
        { key: 'a', name: 'A', description: '', weight: 40, maxScore: 25, order: 1, required: true, bandNotes: [], deductionRules: [], bonusRules: [] },
        { key: 'b', name: 'B', description: '', weight: 40, maxScore: 25, order: 2, required: true, bandNotes: [], deductionRules: [], bonusRules: [] },
      ],
    });
    expect(result.level).toBe('error');
    expect(result.issues.some((item) => item.code === 'WEIGHT_TOTAL')).toBe(true);
  });

  it('requires the complete feedback structure', () => {
    const published = getWritingTranslationTemplate('wt-feedback-default');
    expect(published?.templateType).toBe('feedback_template');
    if (published?.templateType !== 'feedback_template') return;
    const result = precheckWritingTranslationTemplate({ ...published, sections: published.sections.slice(0, 2) });
    expect(result.level).toBe('error');
    expect(result.issues.filter((item) => item.code === 'SECTION_REQUIRED').length).toBe(2);
  });

  it('separates scoring and feedback ownership', () => {
    expect(canEditWritingTranslationTemplate('scoring_template', 'teaching_reviewer')).toBe(true);
    expect(canEditWritingTranslationTemplate('scoring_template', 'ai_operator')).toBe(false);
    expect(canEditWritingTranslationTemplate('feedback_template', 'ai_operator')).toBe(true);
    expect(canEditWritingTranslationTemplate('feedback_template', 'teaching_reviewer')).toBe(false);
  });

  it('submits a valid feedback draft to unified review', () => {
    const draft = getWritingTranslationTemplate('wt-feedback-draft');
    expect(draft?.templateType).toBe('feedback_template');
    if (draft?.templateType !== 'feedback_template') return;
    draft.sections = (getWritingTranslationTemplate('wt-feedback-default') as API.FeedbackTemplate).sections;
    const tasks: API.ReviewTask[] = [];
    const result = submitWritingTranslationTemplateReview(draft, { dataVersion: draft.dataVersion, changeSummary: '测试提交。' }, operator('ai_operator'), tasks);
    if (!('task' in result) || !result.task) throw new Error('review task was not created');
    expect(result.task.objectType).toBe('writing_translation_template');
    expect(draft.status).toBe('pending_review');
  });

  it('pins template versions in a mock correction record', () => {
    const topic = writingTranslationTopicsData.find((item) => ['draft', 'rejected'].includes(item.status) && item.totalScore === 50);
    expect(topic).toBeTruthy();
    if (!topic) return;
    const bound = bindTemplatesToTopic(topic.id, { scoringTemplateId: 'wt-scoring-default', feedbackTemplateId: 'wt-feedback-default', dataVersion: topic.dataVersion }, operator('teaching_reviewer'));
    expect('topic' in bound).toBe(true);
    const result = runMockCorrection(topic.id);
    expect('record' in result).toBe(true);
    if (!('record' in result) || !result.record) throw new Error('mock correction was not created');
    expect(result.record.mockOnly).toBe(true);
    expect(result.record.topicVersion).toBe(topic.version);
    expect(result.record.scoringTemplateRef.version).toBe('v1.0.0');
    expect(result.record.feedbackTemplateRef.version).toBe('v1.0.0');
    expect(result.record.aiStrategyVersion).toBeTruthy();
  });
});
