import { describe, expect, it } from 'vitest';
import {
  buildOnboardingSnapshot,
  createDefaultOnboardingFields,
  getUpcomingCetExamDates,
  matchPublishedLearningPath,
  precheckOnboardingConfig,
  validateOnboardingSubmission,
} from '../../mock/onboardingStore';

const config = (): API.OnboardingConfig => ({
  id: 'onboarding-test',
  kind: 'onboarding_config',
  name: '测试配置',
  description: '测试',
  status: 'draft',
  version: 'V1.2',
  dataVersion: 1,
  currentOnline: false,
  createdBy: '教研',
  createdAt: '2026-07-11 09:00:00',
  updatedBy: '教研',
  updatedAt: '2026-07-11 09:00:00',
  changeSummary: '测试',
  fields: createDefaultOnboardingFields(),
  versionRecords: [],
  operationRecords: [],
});

const submission: API.OnboardingSubmission = {
  examType: 'CET4',
  targetScore: 500,
  examDate: getUpcomingCetExamDates()[0],
  dailyMinutes: 30,
  moodStatus: 'steady',
};

describe('onboarding config precheck', () => {
  it('accepts the fixed five-field contract', () => {
    expect(precheckOnboardingConfig(config()).level).toBe('passed');
  });

  it('blocks duplicate values and duplicate option order', () => {
    const target = config();
    target.fields[0].options[1].value = target.fields[0].options[0].value;
    target.fields[0].options[1].sortOrder = target.fields[0].options[0].sortOrder;
    const result = precheckOnboardingConfig(target);
    expect(result.level).toBe('error');
    expect(result.issues.map((item) => item.id)).toEqual(
      expect.arrayContaining(['onboarding-duplicate-examType', 'onboarding-option-order-examType']),
    );
  });

  it('returns a warning when a supported option is disabled', () => {
    const target = config();
    target.fields[4].options[1].enabled = false;
    expect(precheckOnboardingConfig(target).level).toBe('warning');
  });
});

describe('onboarding submission and matching', () => {
  it('rejects a disabled selected option', () => {
    const target = config();
    const selectedOption = target.fields[1].options.find((item) => item.value === 500);
    expect(selectedOption).toBeDefined();
    if (selectedOption) selectedOption.enabled = false;
    expect(validateOnboardingSubmission(target, submission)).toContain('目标分');
  });

  it('pins labels and version into the completion snapshot', () => {
    const snapshot = buildOnboardingSnapshot(config(), submission);
    expect(snapshot.version).toBe('V1.2');
    expect(snapshot.answers).toHaveLength(5);
    expect(snapshot.answers.find((item) => item.fieldKey === 'targetScore')?.optionLabel).toBe('500+ 提分');
  });

  it('matches only published diagnosis rules and task templates by priority', () => {
    const userCondition = {
      examType: 'CET4',
      targetScoreMin: 425,
      targetScoreMax: 600,
      dailyMinutesMin: 5,
      dailyMinutesMax: 30,
      onboardingStatus: 'completed',
      diagnosisStatus: 'completed',
      conditionMode: 'all',
    } as API.LearningPathUserCondition;
    const diagnosis = {
      id: 'diagnosis-published',
      kind: 'diagnosis_rule',
      name: '已发布阅读规则',
      status: 'published',
      version: 'V1.0',
      priority: 10,
      applicableModule: 'reading',
      userCondition,
      conditionGroup: {
        mode: 'all',
        conditions: [{ id: 'accuracy', metric: 'accuracy', operator: 'lt', value: 70 }],
      },
      output: { weakModules: ['reading'], weakLevel: 'medium', taskPriority: 'P1' },
    } as unknown as API.DiagnosisRule;
    const ignoredDraft = { ...diagnosis, id: 'diagnosis-draft', status: 'draft', priority: 1 } as API.DiagnosisRule;
    const template = {
      id: 'template-published',
      kind: 'today_task_template',
      name: '已发布阅读模板',
      status: 'published',
      version: 'V1.0',
      priority: 10,
      userCondition,
      matchedDiagnosisRuleId: diagnosis.id,
      matchedWeakModules: ['reading'],
      taskItems: [{ id: 'task-1' }],
      totalEstimatedMinutes: 30,
    } as unknown as API.TodayTaskTemplate;
    const result = matchPublishedLearningPath(submission, [ignoredDraft, diagnosis, template]);
    expect(result.diagnosisRule?.id).toBe(diagnosis.id);
    expect(result.todayTaskTemplate?.id).toBe(template.id);
  });
});
