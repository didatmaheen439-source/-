import { describe, expect, it } from 'vitest';
import { questionData } from '../../../../mock/contentQuestionStore';
import {
  buildMockExamPrecheck,
  buildMockExamResultDetail,
  filterMockExamResults,
  buildMockExamStatistics,
  getMockExamPaper,
  mockExamTemplate,
  mockExamTemplateTotals,
} from '../../../../mock/mockExamStore';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const requiredPaper = (id: string) => {
  const paper = getMockExamPaper(id);
  if (!paper) throw new Error(`Missing mock exam paper: ${id}`);
  return paper;
};

describe('mockExamStore', () => {
  it('creates the configured CET template totals', () => {
    expect(mockExamTemplateTotals('CET4')).toEqual({
      totalScore: 710,
      totalMinutes: 125,
    });
    expect(mockExamTemplateTotals('CET6')).toEqual({
      totalScore: 710,
      totalMinutes: 130,
    });
    expect(mockExamTemplate('CET4').map((item) => item.sectionType)).toEqual([
      'writing',
      'listening',
      'reading',
      'translation',
    ]);
  });

  it('accepts a structurally valid short paper with warnings but no errors', () => {
    const paper = requiredPaper('mock-exam-cet6-202607');
    const result = buildMockExamPrecheck(paper);
    expect(result.level).toBe('warning');
    expect(result.issues.some((item) => item.level === 'error')).toBe(false);
    expect(
      result.issues.some((item) => item.code === 'STANDARD_ITEM_COUNT'),
    ).toBe(true);
  });

  it('blocks score and duration mismatches', () => {
    const scorePaper = requiredPaper('mock-exam-score-error');
    const durationPaper = requiredPaper('mock-exam-duration-error');
    const scoreResult = buildMockExamPrecheck(scorePaper);
    const durationResult = buildMockExamPrecheck(durationPaper);
    expect(scoreResult.level).toBe('error');
    expect(
      scoreResult.issues.some(
        (item) =>
          item.code === 'PAPER_SCORE_MISMATCH' ||
          item.code === 'SECTION_SCORE_MISMATCH',
      ),
    ).toBe(true);
    expect(durationResult.level).toBe('error');
    expect(
      durationResult.issues.some(
        (item) => item.code === 'PAPER_DURATION_MISMATCH',
      ),
    ).toBe(true);
  });

  it('blocks duplicated and cross-exam references', () => {
    const paper = clone(requiredPaper('mock-exam-cet6-202607'));
    const duplicated = clone(paper.sections[1].items[0]);
    duplicated.id = `${duplicated.id}-duplicate`;
    duplicated.order = paper.sections[1].items.length + 1;
    duplicated.score = 0;
    paper.sections[1].items.push(duplicated);
    const cet4Question = questionData.find(
      (item) =>
        item.examType === 'CET4' &&
        item.status === 'published' &&
        item.skill === 'reading',
    );
    if (!cet4Question) throw new Error('Missing CET4 published question');
    paper.sections[2].items[0].sourceId = cet4Question.id;
    paper.sections[2].items[0].sourceVersion = cet4Question.version;
    const result = buildMockExamPrecheck(paper);
    expect(
      result.issues.some((item) => item.code === 'SOURCE_DUPLICATED'),
    ).toBe(true);
    expect(
      result.issues.some((item) => item.code === 'SOURCE_EXAM_MISMATCH'),
    ).toBe(true);
  });

  it('keeps a bound snapshot valid when a newer source version exists', () => {
    const paper = clone(requiredPaper('mock-exam-cet6-202607'));
    const item = paper.sections[1].items[0];
    const source = questionData.find(
      (question) => question.id === item.sourceId,
    );
    if (!source) throw new Error('Missing bound source question');
    const originalVersion = source.version;
    const originalStem = item.stem;
    source.version = 'V2.0';
    const result = buildMockExamPrecheck(paper);
    source.version = originalVersion;
    expect(item.stem).toBe(originalStem);
    expect(
      result.issues.some((issue) => issue.code === 'SOURCE_NEW_VERSION'),
    ).toBe(true);
    expect(
      result.issues.some(
        (issue) =>
          issue.code === 'SOURCE_UNAVAILABLE' ||
          issue.code === 'SOURCE_NOT_FOUND',
      ),
    ).toBe(false);
  });

  it('returns aggregate statistics without sensitive fields', () => {
    const paper = requiredPaper('mock-exam-cet6-202607');
    const statistics = buildMockExamStatistics(paper, '30d');
    expect(statistics.startedCount).toBeGreaterThan(
      statistics.completedCount,
    );
    expect(statistics.completionRate).toBeGreaterThan(0);
    expect(statistics.containsSensitiveFields).toBe(false);
    expect(JSON.stringify(statistics)).not.toContain('userId');
    expect(JSON.stringify(statistics)).not.toContain('answer');
  });

  it('builds result diagnostics from aggregate mock statistics only', () => {
    const results = filterMockExamResults({ period: '30d' });
    const published = results.find(
      (item) => item.paperId === 'mock-exam-cet6-202607',
    );
    expect(published).toBeTruthy();
    expect(published?.startedCount).toBeGreaterThan(0);
    expect(published?.completedCount).toBeGreaterThan(0);
    expect(published?.averageScoreRate).toBeGreaterThan(0);
    expect(published?.riskTypes.length).toBeGreaterThan(0);

    const detail = buildMockExamResultDetail(
      requiredPaper('mock-exam-cet6-202607'),
      '30d',
    );
    expect(detail.containsSensitiveFields).toBe(false);
    expect(detail.mockOnly).toBe(true);
    expect(detail.itemStats.length).toBeGreaterThan(0);
    expect(detail.diagnosis.length).toBeGreaterThan(0);
    expect(JSON.stringify(detail)).not.toContain('userId');
    expect(JSON.stringify(detail.paper)).not.toContain('"answer"');
    expect(JSON.stringify(detail.paper)).not.toContain('referenceAnswer');
    expect(JSON.stringify(detail)).not.toContain('作文原文');
  });

  it('filters result risks by exam type and risk type', () => {
    const cet6Results = filterMockExamResults({ examType: 'CET6' });
    expect(cet6Results.every((item) => item.examType === 'CET6')).toBe(true);

    const weakItemResults = filterMockExamResults({ riskType: 'weak_item' });
    expect(weakItemResults.length).toBeGreaterThan(0);
    expect(
      weakItemResults.every((item) => item.riskTypes.includes('weak_item')),
    ).toBe(true);
  });
});
