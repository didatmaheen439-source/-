import { describe, expect, it } from 'vitest';
import { roleConfigs } from './permissions';
import {
  bindTemplatesToTopic,
  canEditWritingTranslationTemplate,
  correctionSummaryStats,
  createCorrectionFixDraft,
  filterCorrectionSummaries,
  getWritingTranslationTemplate,
  precheckWritingTranslationTemplate,
  runMockCorrection,
  submitWritingTranslationTemplateReview,
} from '../../mock/writingTranslationTemplateStore';
import { writingTranslationTopicsData } from '../../mock/writingTranslationStore';

const operator = (roleId: 'super_admin' | 'teaching_reviewer' | 'ai_operator') => ({
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
    expect(result.record.answerSummary).toContain('脱敏摘要');
    expect(result.record.dimensionScores.length).toBeGreaterThan(0);
  });

  it('aggregates mock correction summaries without storing raw answers', () => {
    const rows = filterCorrectionSummaries({ correctionStatus: 'abnormal' });
    const stats = correctionSummaryStats();
    expect(rows.length).toBeGreaterThan(0);
    expect(stats.total).toBeGreaterThanOrEqual(rows.length);
    expect(stats.topIssues.length).toBeGreaterThan(0);
    expect(filterCorrectionSummaries({ keyword: '用户完整作答' })).toHaveLength(0);
  });

  it('creates a traceable fix draft from a correction summary', () => {
    const record = filterCorrectionSummaries({ correctionStatus: 'abnormal' })[0];
    expect(record).toBeTruthy();
    const result = createCorrectionFixDraft(record.id, {
      dataVersion: record.dataVersion,
      targetType: 'topic',
      diagnosis: '题目要求和样例覆盖不清晰。',
      changeSummary: '根据 Mock 批改异常创建题目修正草稿。',
    }, operator('teaching_reviewer'));
    if (!('draft' in result) || !result.draft) throw new Error('fix draft was not created');
    expect(result.draft.targetType).toBe('topic');
    expect(result.record.fixStatus).toBe('draft_created');
    expect(result.record.linkedFixDrafts[0].targetPath).toContain('/writing-translation/');
  });

  it('keeps AI strategy fix drafts under AI operator ownership', () => {
    const record = filterCorrectionSummaries({ causeType: 'ai_strategy' })[0];
    expect(record).toBeTruthy();
    const denied = createCorrectionFixDraft(record.id, {
      dataVersion: record.dataVersion,
      targetType: 'ai_strategy',
      diagnosis: 'AI 输出结构偏离模板。',
      changeSummary: '创建 AI 策略修正草稿。',
    }, operator('teaching_reviewer'));
    expect('forbidden' in denied).toBe(true);
  });
});
