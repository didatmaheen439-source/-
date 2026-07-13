export type AdminModuleKey =
  | 'dashboard'
  | 'users'
  | 'content'
  | 'learningPath'
  | 'aiCoach'
  | 'writingTranslation'
  | 'mockExam'
  | 'analytics'
  | 'reviewRelease'
  | 'system';

export type AdminRoleId =
  | 'super_admin'
  | 'content_operator'
  | 'teaching_reviewer'
  | 'ai_operator'
  | 'customer_support'
  | 'data_analyst'
  | 'read_only_auditor';

export type PermissionAction =
  | 'read'
  | 'create'
  | 'edit'
  | 'submit'
  | 'approve'
  | 'publish'
  | 'export'
  | 'disable'
  | 'config';

export type DataScope =
  | 'all'
  | 'business_module'
  | 'own'
  | 'desensitized'
  | 'aggregate'
  | 'audit_logs';

export type ModuleActionMatrix = Partial<
  Record<AdminModuleKey, PermissionAction[]>
>;

export type AdminModuleConfig = {
  key: AdminModuleKey;
  name: string;
  routePrefix: string;
  defaultRoute: string;
  description: string;
};

export type AdminRoleConfig = {
  id: AdminRoleId;
  name: string;
  username: string;
  password: string;
  description: string;
  modules: AdminModuleKey[];
  actions: ModuleActionMatrix;
  dataScopes: DataScope[];
};

export const permissionActions: PermissionAction[] = [
  'read',
  'create',
  'edit',
  'submit',
  'approve',
  'publish',
  'export',
  'disable',
  'config',
];

export const dataScopeLabels: Record<DataScope, string> = {
  all: '全部数据',
  business_module: '所属业务模块',
  own: '本人创建',
  desensitized: '脱敏数据',
  aggregate: '聚合数据',
  audit_logs: '审计日志',
};

export const actionLabels: Record<PermissionAction, string> = {
  read: '查看',
  create: '新建',
  edit: '编辑',
  submit: '提交审核',
  approve: '审核',
  publish: '发布',
  export: '导出',
  disable: '停用',
  config: '配置',
};

export const adminModules: AdminModuleConfig[] = [
  {
    key: 'dashboard',
    name: '工作台',
    routePrefix: '/dashboard',
    defaultRoute: '/dashboard/overview',
    description: '运营待办、审核提醒、风险提示和关键指标总览。',
  },
  {
    key: 'users',
    name: '用户与反馈',
    routePrefix: '/users',
    defaultRoute: '/users/list',
    description: '用户资料、学习状态、反馈记录和敏感访问审计。',
  },
  {
    key: 'content',
    name: '题库与内容运营',
    routePrefix: '/content',
    defaultRoute: '/content/questions',
    description: '题库、题组、每日一句、外刊、写作题目和翻译题目管理。',
  },
  {
    key: 'learningPath',
    name: '学习路径配置',
    routePrefix: '/learning-path',
    defaultRoute: '/learning-path/diagnosis-rules',
    description: '诊断规则、阶段路径、任务包和学习推荐配置。',
  },
  {
    key: 'aiCoach',
    name: 'AI 陪练',
    routePrefix: '/ai-coach',
    defaultRoute: '/ai-coach/prompts',
    description: '提示词、策略参数、风险规则和 AI 使用效果管理。',
  },
  {
    key: 'writingTranslation',
    name: '写译批改',
    routePrefix: '/writing-translation',
    defaultRoute: '/writing-translation/writing-topics',
    description: '写作、翻译题目、批改规则、评分维度和异常处理。',
  },
  {
    key: 'mockExam',
    name: '模考管理',
    routePrefix: '/mock-exam',
    defaultRoute: '/mock-exam/papers',
    description: '模考试卷、考试配置、成绩分布和复盘规则。',
  },
  {
    key: 'analytics',
    name: '运营数据',
    routePrefix: '/analytics',
    defaultRoute: '/analytics/overview',
    description: '增长、留存、内容效果、题库表现和 AI 使用数据看板。',
  },
  {
    key: 'reviewRelease',
    name: '审核发布',
    routePrefix: '/review-release',
    defaultRoute: '/review-release/pending',
    description: '草稿、待审核、待发布、已发布、回滚和操作记录。',
  },
  {
    key: 'system',
    name: '系统与审计',
    routePrefix: '/system',
    defaultRoute: '/system/accounts',
    description: '账号、角色、菜单、按钮权限、审计日志和安全配置。',
  },
];

const readOnly: PermissionAction[] = ['read'];
const contentActions: PermissionAction[] = ['read', 'create', 'edit', 'submit'];
const reviewActions: PermissionAction[] = [
  'read',
  'edit',
  'submit',
  'approve',
  'publish',
];
const fullActions: PermissionAction[] = permissionActions;

export const MOCK_LOGIN_PASSWORD = '123456789';

export const roleConfigs: Record<AdminRoleId, AdminRoleConfig> = {
  super_admin: {
    id: 'super_admin',
    name: '超级管理员',
    username: 'super_admin',
    password: MOCK_LOGIN_PASSWORD,
    description: '拥有全部菜单、动作和配置权限。',
    modules: adminModules.map((item) => item.key),
    actions: adminModules.reduce((acc, item) => {
      acc[item.key] = fullActions;
      return acc;
    }, {} as ModuleActionMatrix),
    dataScopes: [
      'all',
      'business_module',
      'own',
      'desensitized',
      'aggregate',
      'audit_logs',
    ],
  },
  content_operator: {
    id: 'content_operator',
    name: '内容运营',
    username: 'content_operator',
    password: MOCK_LOGIN_PASSWORD,
    description: '维护内容资产，可提交审核，不可发布和配置系统。',
    modules: [
      'dashboard',
      'content',
      'learningPath',
      'writingTranslation',
      'reviewRelease',
      'analytics',
    ],
    actions: {
      dashboard: readOnly,
      content: contentActions,
      learningPath: readOnly,
      writingTranslation: contentActions,
      reviewRelease: ['read', 'submit'],
      analytics: readOnly,
    },
    dataScopes: ['business_module', 'own'],
  },
  teaching_reviewer: {
    id: 'teaching_reviewer',
    name: '教研审核',
    username: 'teaching_reviewer',
    password: MOCK_LOGIN_PASSWORD,
    description: '负责内容质量审核、发布前复核和教研规则校验。',
    modules: [
      'dashboard',
      'content',
      'learningPath',
      'writingTranslation',
      'mockExam',
      'analytics',
      'reviewRelease',
    ],
    actions: {
      dashboard: readOnly,
      content: reviewActions,
      learningPath: reviewActions,
      writingTranslation: readOnly,
      mockExam: ['read', 'create', 'edit', 'submit', 'approve', 'publish'],
      analytics: readOnly,
      reviewRelease: ['read', 'approve', 'publish'],
    },
    dataScopes: ['business_module', 'desensitized', 'aggregate'],
  },
  ai_operator: {
    id: 'ai_operator',
    name: 'AI 策略运营',
    username: 'ai_operator',
    password: MOCK_LOGIN_PASSWORD,
    description: '维护 AI 策略、提示词、风险规则和相关效果指标。',
    modules: [
      'dashboard',
      'aiCoach',
      'learningPath',
      'writingTranslation',
      'analytics',
      'reviewRelease',
    ],
    actions: {
      dashboard: readOnly,
      aiCoach: ['read', 'create', 'edit', 'submit', 'publish', 'config'],
      learningPath: ['read', 'create', 'edit', 'submit'],
      writingTranslation: readOnly,
      analytics: readOnly,
      reviewRelease: ['read', 'submit', 'publish'],
    },
    dataScopes: ['business_module', 'desensitized', 'aggregate'],
  },
  customer_support: {
    id: 'customer_support',
    name: '客服',
    username: 'customer_support',
    password: MOCK_LOGIN_PASSWORD,
    description: '查看用户与反馈信息，处理异常，不具备内容编辑和系统配置权限。',
    modules: ['dashboard', 'users', 'analytics'],
    actions: {
      dashboard: readOnly,
      users: ['read', 'edit', 'disable'],
      analytics: readOnly,
    },
    dataScopes: ['desensitized', 'own'],
  },
  data_analyst: {
    id: 'data_analyst',
    name: '数据分析',
    username: 'data_analyst',
    password: MOCK_LOGIN_PASSWORD,
    description: '查看聚合看板和导出分析数据，不处理内容与系统配置。',
    modules: ['dashboard', 'users', 'mockExam', 'analytics'],
    actions: {
      dashboard: readOnly,
      users: readOnly,
      mockExam: readOnly,
      analytics: ['read', 'export'],
    },
    dataScopes: ['aggregate', 'desensitized'],
  },
  read_only_auditor: {
    id: 'read_only_auditor',
    name: '只读审计',
    username: 'read_only_auditor',
    password: MOCK_LOGIN_PASSWORD,
    description: '只读查看审核发布、系统记录和权限审计，不具备写操作。',
    modules: [
      'dashboard',
      'content',
      'aiCoach',
      'writingTranslation',
      'mockExam',
      'analytics',
      'reviewRelease',
      'system',
    ],
    actions: {
      dashboard: readOnly,
      content: readOnly,
      aiCoach: readOnly,
      writingTranslation: readOnly,
      mockExam: readOnly,
      analytics: readOnly,
      reviewRelease: readOnly,
      system: readOnly,
    },
    dataScopes: ['audit_logs', 'desensitized'],
  },
};

export const roleList = Object.values(roleConfigs);

export const getRoleConfig = (roleId?: string) => {
  if (!roleId) return undefined;
  return roleConfigs[roleId as AdminRoleId];
};

export const getModuleConfig = (moduleKey?: AdminModuleKey) =>
  adminModules.find((item) => item.key === moduleKey);

export const getModuleByPath = (pathname: string) =>
  adminModules.find((item) => pathname.startsWith(item.routePrefix));

export const roleCanAccessModule = (
  roleId: string | undefined,
  moduleKey: AdminModuleKey,
) => {
  const role = getRoleConfig(roleId);
  return Boolean(role?.modules.includes(moduleKey));
};

export const roleCanAccessFeedbackQueue = (roleId: string | undefined) =>
  Boolean(
    roleId &&
      [
        'super_admin',
        'customer_support',
        'content_operator',
        'teaching_reviewer',
        'ai_operator',
      ].includes(roleId),
  );

export const roleCanAccessUserList = (roleId: string | undefined) =>
  Boolean(
    roleId && ['super_admin', 'customer_support', 'data_analyst'].includes(roleId),
  );

export const roleCanAccessUserDetail = (roleId: string | undefined) =>
  Boolean(roleId && ['super_admin', 'customer_support'].includes(roleId));

export const roleCanAccessUserArea = (roleId: string | undefined) =>
  roleCanAccessUserList(roleId) || roleCanAccessFeedbackQueue(roleId);

export const roleCanAccessRoute = (
  roleId: string | undefined,
  pathname: string,
) => {
  const moduleConfig = getModuleByPath(pathname);
  if (!moduleConfig) return false;
  return roleCanAccessModule(roleId, moduleConfig.key);
};

export const roleCanPerformAction = (
  roleId: string | undefined,
  moduleKey: AdminModuleKey,
  action: PermissionAction,
) => {
  const role = getRoleConfig(roleId);
  if (!role?.modules.includes(moduleKey)) return false;
  return Boolean(role.actions[moduleKey]?.includes(action));
};

export const getRolePermissionsPayload = (roleId: AdminRoleId) => {
  const role = roleConfigs[roleId];
  return {
    roleId: role.id,
    roleName: role.name,
    menuPermissions: role.modules,
    actionPermissions: role.actions,
    dataScopes: role.dataScopes,
  };
};
