import type { Request, Response } from 'express';
import {
  roleCanPerformAction,
  roleConfigs,
} from '../src/foundation/permissions';
import type {
  AdminRoleId,
  PermissionAction,
} from '../src/foundation/permissions';
import type {
  MockExamPaperQueryParams,
  MockExamResultQueryParams,
  MockExamResultRiskType,
  MockExamPaperSaveParams,
  MockExamPaperSubmitParams,
  MockExamSectionType,
  MockExamSourceType,
  MockExamStatisticsPeriod,
} from '../src/pages/mock-exam/papers/data';
import { pushOperationAuditLog } from './auditStore';
import {
  buildMockExamPrecheck,
  buildMockExamResultDetail,
  buildMockExamStatistics,
  availableMockExamQuestionGroups,
  copyMockExamPaperDraft,
  createMockExamPaperRecord,
  filterMockExamPapers,
  filterMockExamResults,
  filterMockExamReferences,
  expandQuestionGroupForMockExam,
  getMockExamPaper,
  mockExamTemplate,
  mockExamTemplateTotals,
  mockExamVersionDiff,
  paginateMockExamResults,
  paginateMockExamPapers,
  submitMockExamPaperReview,
  updateMockExamPaperRecord,
} from './mockExamStore';
import { mockSession } from './session';
import { reviewTasksData } from './user';

const currentRoleId = () => mockSession.currentRoleId as AdminRoleId | '';

const currentOperator = () => {
  const roleId = currentRoleId() || 'super_admin';
  const role = roleConfigs[roleId];
  return {
    id: mockSession.currentAccountId || role.id,
    name: mockSession.currentAccountName || role.name,
    roleName: role.name,
  };
};

const canAction = (action: PermissionAction) =>
  Boolean(
    currentRoleId() &&
      roleCanPerformAction(currentRoleId() as AdminRoleId, 'mockExam', action),
  );

const sendForbidden = (
  res: Response,
  action: string,
  objectId = 'mock-exam',
) => {
  const roleId = currentRoleId();
  if (roleId) {
    pushOperationAuditLog({
      roleId,
      logType: 'permission_denied',
      action,
      objectType: 'mock_exam',
      objectId,
      sourcePage: '/mock-exam/papers',
      reason: '角色无模考管理权限。',
      result: 'denied',
      changeSummary: `模考试卷 ${action} 被拒绝，未记录完整题干或参考答案。`,
    });
  }
  res.status(403).send({
    success: false,
    errorCode: '403',
    errorMessage: '无权访问模考管理。',
  });
};

const auditPaper = (
  action: string,
  result: 'success' | 'failed' | 'denied',
  objectId: string,
  reason: string,
  changeSummary: string,
  version?: string,
) => {
  const roleId = currentRoleId();
  if (!roleId) return;
  pushOperationAuditLog({
    roleId,
    action,
    objectType: 'mock_exam',
    objectId,
    sourcePage: '/mock-exam/papers',
    reason,
    result,
    changeSummary,
    version,
  });
};

const queryValue = (value: unknown) =>
  Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');

const pathValue = (value: string | string[]) =>
  Array.isArray(value) ? String(value[0] ?? '') : String(value);

const readPaperQuery = (
  query: Request['query'],
): MockExamPaperQueryParams => ({
  current: Number(queryValue(query.current) || 1),
  pageSize: Number(queryValue(query.pageSize) || 20),
  keyword: queryValue(query.keyword) || undefined,
  examType: (queryValue(query.examType) as API.ExamType) || undefined,
  status:
    (queryValue(query.status) as API.ReviewTaskStatus) || undefined,
  precheckLevel:
    (queryValue(
      query.precheckLevel,
    ) as MockExamPaperQueryParams['precheckLevel']) || undefined,
});

const readResultQuery = (
  query: Request['query'],
): MockExamResultQueryParams => ({
  current: Number(queryValue(query.current) || 1),
  pageSize: Number(queryValue(query.pageSize) || 20),
  keyword: queryValue(query.keyword) || undefined,
  examType: (queryValue(query.examType) as API.ExamType) || undefined,
  status:
    (queryValue(query.status) as API.ReviewTaskStatus) || undefined,
  period:
    (queryValue(query.period) as MockExamResultQueryParams['period']) ||
    '30d',
  riskType:
    (queryValue(query.riskType) as MockExamResultRiskType) || undefined,
  completionBand:
    (queryValue(
      query.completionBand,
    ) as MockExamResultQueryParams['completionBand']) || undefined,
  averageBand:
    (queryValue(
      query.averageBand,
    ) as MockExamResultQueryParams['averageBand']) || undefined,
});

const paginate = <T,>(data: T[], req: Request) => {
  const current = Number(queryValue(req.query.current) || 1);
  const pageSize = Number(queryValue(req.query.pageSize) || 20);
  return {
    data: data.slice((current - 1) * pageSize, current * pageSize),
    total: data.length,
    current,
    pageSize,
  };
};

export default {
  'GET /api/mock-exam/papers': (req: Request, res: Response) => {
    if (!canAction('read')) return sendForbidden(res, 'read');
    const query = readPaperQuery(req.query);
    const filtered = filterMockExamPapers(query);
    res.send({
      success: true,
      ...paginateMockExamPapers(filtered, query),
    });
  },
  'GET /api/mock-exam/results': (req: Request, res: Response) => {
    if (!canAction('read')) return sendForbidden(res, 'read_results');
    const query = readResultQuery(req.query);
    const filtered = filterMockExamResults(query);
    res.send(paginateMockExamResults(filtered, query));
  },
  'GET /api/mock-exam/results/:paperId': (req: Request, res: Response) => {
    if (!canAction('read'))
      return sendForbidden(res, 'read_result_detail', pathValue(req.params.paperId));
    const paper = getMockExamPaper(pathValue(req.params.paperId));
    if (!paper) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '模考试卷不存在。',
      });
      return;
    }
    const period =
      (queryValue(req.query.period) as MockExamResultQueryParams['period']) ||
      '30d';
    res.send({
      success: true,
      data: buildMockExamResultDetail(
        paper,
        ['7d', '30d', 'all'].includes(String(period)) ? period : '30d',
      ),
    });
  },
  'POST /api/mock-exam/results/:paperId/create-fix-draft': (
    req: Request,
    res: Response,
  ) => {
    const paper = getMockExamPaper(pathValue(req.params.paperId));
    if (!paper) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '模考试卷不存在。',
      });
      return;
    }
    if (!canAction('create')) {
      return sendForbidden(res, 'create_fix_draft', paper.id);
    }
    if (['pending_review', 'approved', 'pending_publish'].includes(paper.status)) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '当前试卷处于审核发布流程中，不能创建修正草稿。',
      });
      return;
    }
    if (['draft', 'rejected'].includes(paper.status)) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '当前试卷可直接编辑，无需创建修正草稿。',
      });
      return;
    }
    const draft = copyMockExamPaperDraft(paper, currentOperator());
    draft.name = `${paper.name} 结果修正草稿`;
    draft.changeSummary =
      String(req.body?.reason ?? '').trim() ||
      '根据模考结果风险复制为修正草稿。';
    if (draft.versionRecords[0]) {
      draft.versionRecords[0].changeSummary = draft.changeSummary;
      draft.versionRecords[0].snapshot.name = draft.name;
    }
    auditPaper(
      'create_fix_draft',
      'success',
      draft.id,
      draft.changeSummary,
      `从 ${paper.id}@${paper.releaseVersionId ?? paper.version} 创建模考结果修正草稿。`,
      draft.version,
    );
    res.send({ success: true, data: draft });
  },
  'GET /api/mock-exam/papers/:id': (req: Request, res: Response) => {
    if (!canAction('read'))
      return sendForbidden(res, 'read', pathValue(req.params.id));
    const paper = getMockExamPaper(String(req.params.id));
    if (!paper) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '模考试卷不存在。',
      });
      return;
    }
    res.send({ success: true, data: paper });
  },
  'POST /api/mock-exam/papers': (req: Request, res: Response) => {
    if (!canAction('create')) return sendForbidden(res, 'create');
    const params = req.body as MockExamPaperSaveParams;
    if (params.simulateFailure) {
      auditPaper(
        'create',
        'failed',
        'mock-exam-create',
        '模拟创建失败。',
        '未创建模考试卷。',
      );
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '模拟服务异常，试卷未保存。',
      });
      return;
    }
    const paper = createMockExamPaperRecord(params, currentOperator());
    auditPaper(
      'create',
      'success',
      paper.id,
      '保存模考试卷草稿。',
      `创建 ${paper.examType} 模考试卷，${paper.sections.length} 个分区。`,
      paper.version,
    );
    res.send({ success: true, data: paper });
  },
  'PATCH /api/mock-exam/papers/:id': (req: Request, res: Response) => {
    const paper = getMockExamPaper(String(req.params.id));
    if (!paper) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '模考试卷不存在。',
      });
      return;
    }
    if (!canAction('edit'))
      return sendForbidden(res, 'edit', paper.id);
    const result = updateMockExamPaperRecord(
      paper,
      req.body as MockExamPaperSaveParams,
      currentOperator(),
    );
    if ('conflict' in result) {
      auditPaper(
        'edit',
        'failed',
        paper.id,
        '数据版本冲突。',
        '编辑未写入。',
        paper.version,
      );
      res.status(409).send({
        success: false,
        errorCode: '409',
        errorMessage: '试卷已被其他操作更新，请刷新后重试。',
        data: paper,
      });
      return;
    }
    if ('locked' in result) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '当前状态不可直接编辑，请复制为新草稿。',
      });
      return;
    }
    auditPaper(
      'edit',
      'success',
      paper.id,
      result.paper.changeSummary,
      `更新试卷结构，${result.paper.sections.length} 个分区。`,
      result.paper.version,
    );
    res.send({ success: true, data: result.paper });
  },
  'POST /api/mock-exam/papers/:id/copy': (req: Request, res: Response) => {
    const paper = getMockExamPaper(String(req.params.id));
    if (!paper) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '模考试卷不存在。',
      });
      return;
    }
    if (!canAction('create'))
      return sendForbidden(res, 'copy', paper.id);
    const draft = copyMockExamPaperDraft(paper, currentOperator());
    auditPaper(
      'create',
      'success',
      draft.id,
      '复制历史版本为新草稿。',
      `从 ${paper.id}@${paper.version} 创建新草稿，保留题目版本快照。`,
      draft.version,
    );
    res.send({ success: true, data: draft });
  },
  'POST /api/mock-exam/papers/precheck': (req: Request, res: Response) => {
    if (!canAction('read')) return sendForbidden(res, 'precheck');
    if (req.body?.simulateFailure) {
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '模拟预校验服务异常。',
      });
      return;
    }
    const params = req.body as MockExamPaperSaveParams;
    const result = buildMockExamPrecheck({
      name: String(params.name ?? ''),
      description: String(params.description ?? ''),
      examType: params.examType,
      totalScore: Number(params.totalScore || 0),
      totalMinutes: Number(params.totalMinutes || 0),
      sections: params.sections ?? [],
      impactScope: String(params.impactScope ?? ''),
    });
    res.send({ success: true, data: result });
  },
  'POST /api/mock-exam/papers/:id/precheck': (
    req: Request,
    res: Response,
  ) => {
    if (!canAction('read'))
      return sendForbidden(res, 'precheck', pathValue(req.params.id));
    const paper = getMockExamPaper(String(req.params.id));
    if (!paper) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '模考试卷不存在。',
      });
      return;
    }
    if (req.body?.simulateFailure) {
      auditPaper(
        'precheck',
        'failed',
        paper.id,
        '模拟预校验失败。',
        '试卷状态未改变。',
        paper.version,
      );
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '模拟预校验服务异常。',
      });
      return;
    }
    paper.lastPrecheck = buildMockExamPrecheck(paper);
    auditPaper(
      'precheck',
      'success',
      paper.id,
      '执行发布前结构校验。',
      `校验结果 ${paper.lastPrecheck.level}，错误 ${paper.lastPrecheck.issues.filter((item) => item.level === 'error').length} 个。`,
      paper.version,
    );
    res.send({ success: true, data: paper.lastPrecheck });
  },
  'POST /api/mock-exam/papers/:id/submit-review': (
    req: Request,
    res: Response,
  ) => {
    const paper = getMockExamPaper(String(req.params.id));
    if (!paper) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '模考试卷不存在。',
      });
      return;
    }
    if (!canAction('submit'))
      return sendForbidden(res, 'submit', paper.id);
    const params = req.body as MockExamPaperSubmitParams;
    if (!String(params.changeSummary ?? '').trim()) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '提交审核必须填写变更说明。',
      });
      return;
    }
    const result = submitMockExamPaperReview(
      paper,
      params,
      currentOperator(),
      reviewTasksData,
    );
    if ('conflict' in result) {
      res.status(409).send({
        success: false,
        errorCode: '409',
        errorMessage: '试卷版本已变化，请刷新后重试。',
      });
      return;
    }
    if ('locked' in result) {
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: '当前状态不可提交审核。',
      });
      return;
    }
    if ('failed' in result) {
      auditPaper(
        'submit',
        'failed',
        paper.id,
        '模拟审核任务创建失败。',
        '试卷保持原状态。',
        paper.version,
      );
      res.status(500).send({
        success: false,
        errorCode: '500',
        errorMessage: '审核任务创建失败，试卷状态未改变。',
      });
      return;
    }
    if ('blocked' in result || 'warning' in result) {
      const warning = 'warning' in result;
      auditPaper(
        'submit',
        'failed',
        paper.id,
        warning ? '预校验警告未确认。' : '预校验存在阻断错误。',
        '未创建审核任务。',
        paper.version,
      );
      res.status(422).send({
        success: false,
        errorCode: '422',
        errorMessage: warning
          ? '预校验存在警告，确认后方可提交。'
          : '预校验存在错误，不能提交审核。',
        data: result.precheck,
      });
      return;
    }
    auditPaper(
      'submit',
      'success',
      paper.id,
      params.changeSummary,
      `创建审核任务 ${result.task.id}，分区 ${paper.sections.length} 个。`,
      paper.version,
    );
    res.send({
      success: true,
      data: result.paper,
      reviewTask: result.task,
    });
  },
  'GET /api/mock-exam/papers/:id/versions': (
    req: Request,
    res: Response,
  ) => {
    if (!canAction('read'))
      return sendForbidden(res, 'read_versions', pathValue(req.params.id));
    const paper = getMockExamPaper(String(req.params.id));
    if (!paper) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '模考试卷不存在。',
      });
      return;
    }
    res.send({ success: true, ...paginate(paper.versionRecords, req) });
  },
  'GET /api/mock-exam/papers/:id/versions/diff': (
    req: Request,
    res: Response,
  ) => {
    if (!canAction('read'))
      return sendForbidden(
        res,
        'read_version_diff',
        pathValue(req.params.id),
      );
    const paper = getMockExamPaper(String(req.params.id));
    if (!paper) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '模考试卷不存在。',
      });
      return;
    }
    const data = mockExamVersionDiff(
      paper,
      queryValue(req.query.fromVersion) || undefined,
      queryValue(req.query.toVersion) || undefined,
    );
    res.send({ success: true, data });
  },
  'GET /api/mock-exam/references': (req: Request, res: Response) => {
    if (!canAction('read')) return sendForbidden(res, 'read_references');
    const data = filterMockExamReferences({
      keyword: queryValue(req.query.keyword) || undefined,
      examType:
        (queryValue(req.query.examType) as API.ExamType) || undefined,
      sectionType:
        (queryValue(req.query.sectionType) as MockExamSectionType) ||
        undefined,
      sourceType:
        (queryValue(req.query.sourceType) as MockExamSourceType) || undefined,
      availableOnly: queryValue(req.query.availableOnly) !== 'false',
    });
    res.send({ success: true, ...paginate(data, req) });
  },
  'GET /api/mock-exam/references/question-groups': (req: Request, res: Response) => {
    if (!canAction('read')) return sendForbidden(res, 'read_question_groups');
    const examType = (queryValue(req.query.examType) as API.ExamType) || undefined;
    const keyword = queryValue(req.query.keyword).trim().toLowerCase();
    const data = availableMockExamQuestionGroups(examType).filter((group) =>
      !keyword || [group.id, group.name].join(' ').toLowerCase().includes(keyword),
    );
    res.send({ success: true, ...paginate(data, req) });
  },
  'POST /api/mock-exam/references/question-groups/:id/expand': (req: Request, res: Response) => {
    if (!canAction('edit') && !canAction('create')) return sendForbidden(res, 'expand_question_group');
    const data = expandQuestionGroupForMockExam(
      pathValue(req.params.id),
      Number(req.body?.sectionScore ?? 0),
      Number(req.body?.startOrder ?? 1),
    );
    if (!data) {
      res.status(422).send({ success: false, errorCode: '422', errorMessage: '题组不可用或校验未通过。' });
      return;
    }
    res.send({ success: true, data });
  },
  'GET /api/mock-exam/papers/:id/statistics': (
    req: Request,
    res: Response,
  ) => {
    if (!canAction('read'))
      return sendForbidden(
        res,
        'read_statistics',
        pathValue(req.params.id),
      );
    const paper = getMockExamPaper(String(req.params.id));
    if (!paper) {
      res.status(404).send({
        success: false,
        errorCode: '404',
        errorMessage: '模考试卷不存在。',
      });
      return;
    }
    const period =
      (queryValue(req.query.period) as MockExamStatisticsPeriod) || '30d';
    const data = buildMockExamStatistics(
      paper,
      ['7d', '30d', 'all'].includes(period) ? period : '30d',
    );
    res.send({ success: true, data });
  },
  'GET /api/mock-exam/templates/:examType': (
    req: Request,
    res: Response,
  ) => {
    if (!canAction('read')) return sendForbidden(res, 'read_template');
    const examType =
      String(req.params.examType).toUpperCase() === 'CET4' ? 'CET4' : 'CET6';
    res.send({
      success: true,
      data: {
        examType,
        ...mockExamTemplateTotals(examType),
        sections: mockExamTemplate(examType),
      },
    });
  },
};
