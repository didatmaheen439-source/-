/**
 * 过级搭子运营管理后台路由。
 * 官方示例页保留在隐藏的 /examples 下，业务菜单只暴露 PRD 对应的十个一级模块。
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        path: '/user/login',
        name: 'login',
        component: './user/login',
      },
      {
        path: '/user',
        redirect: '/user/login',
      },
      {
        name: 'register-result',
        icon: 'checkCircle',
        path: '/user/register-result',
        component: './user/register-result',
      },
      {
        name: 'register',
        icon: 'userAdd',
        path: '/user/register',
        component: './user/register',
      },
      {
        name: '404',
        component: './exception/404',
        path: '/user/*',
      },
    ],
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    icon: 'dashboard',
    access: 'canAccessDashboard',
    routes: [
      {
        path: '/dashboard',
        redirect: '/dashboard/overview',
      },
      {
        path: '/dashboard/overview',
        name: 'overview',
        component: './dashboard/overview',
      },
    ],
  },
  {
    path: '/users',
    name: 'users',
    icon: 'team',
    access: 'canAccessUsers',
    routes: [
      {
        path: '/users',
        redirect: '/users/list',
      },
      {
        path: '/users/list',
        name: 'list',
        component: './users/list',
      },
      {
        path: '/users/:id',
        name: 'detail',
        hideInMenu: true,
        component: './users/detail/index',
      },
    ],
  },
  {
    path: '/content',
    name: 'content',
    icon: 'database',
    access: 'canAccessContent',
    routes: [
      {
        path: '/content',
        redirect: '/content/questions',
      },
      {
        path: '/content/questions',
        name: 'questions',
        component: './content/questions',
      },
      {
        path: '/content/questions/create',
        name: 'question-create',
        hideInMenu: true,
        component: './content/questions/edit/index',
      },
      {
        path: '/content/questions/:id/edit',
        name: 'question-edit',
        hideInMenu: true,
        component: './content/questions/edit/index',
      },
    ],
  },
  {
    path: '/learning-path',
    name: 'learning-path',
    icon: 'branches',
    access: 'canAccessLearningPath',
    routes: [
      {
        path: '/learning-path',
        redirect: '/learning-path/diagnosis-rules',
      },
      {
        path: '/learning-path/diagnosis-rules',
        name: 'diagnosis-rules',
        component: './learning-path/diagnosis-rules',
      },
      {
        path: '/learning-path/diagnosis-rules/new',
        name: 'diagnosis-rule-new',
        hideInMenu: true,
        component: './learning-path/diagnosis-rules/edit/index',
      },
      {
        path: '/learning-path/diagnosis-rules/:id/edit',
        name: 'diagnosis-rule-edit',
        hideInMenu: true,
        component: './learning-path/diagnosis-rules/edit/index',
      },
      {
        path: '/learning-path/diagnosis-rules/:id',
        name: 'diagnosis-rule-detail',
        hideInMenu: true,
        component: './learning-path/diagnosis-rules/detail/index',
      },
      {
        path: '/learning-path/task-templates/new',
        name: 'task-template-new',
        hideInMenu: true,
        component: './learning-path/task-templates/edit/index',
      },
      {
        path: '/learning-path/task-templates/:id/edit',
        name: 'task-template-edit',
        hideInMenu: true,
        component: './learning-path/task-templates/edit/index',
      },
      {
        path: '/learning-path/task-templates/:id',
        name: 'task-template-detail',
        hideInMenu: true,
        component: './learning-path/task-templates/detail/index',
      },
    ],
  },
  {
    path: '/ai-coach',
    name: 'ai-coach',
    icon: 'robot',
    access: 'canAccessAiCoach',
    routes: [
      {
        path: '/ai-coach',
        redirect: '/ai-coach/prompts',
      },
      {
        path: '/ai-coach/prompts',
        name: 'prompts',
        component: './ai-coach/prompts',
      },
      {
        path: '/ai-coach/prompts/new',
        name: 'prompt-new',
        hideInMenu: true,
        component: './ai-coach/prompts/edit/index',
      },
      {
        path: '/ai-coach/prompts/:id/edit',
        name: 'prompt-edit',
        hideInMenu: true,
        component: './ai-coach/prompts/edit/index',
      },
      {
        path: '/ai-coach/prompts/:id',
        name: 'prompt-detail',
        hideInMenu: true,
        component: './ai-coach/prompts/detail/index',
      },
    ],
  },
  {
    path: '/writing-translation',
    name: 'writing-translation',
    icon: 'edit',
    access: 'canAccessWritingTranslation',
    routes: [
      {
        path: '/writing-translation',
        redirect: '/writing-translation/topics',
      },
      {
        path: '/writing-translation/topics',
        name: 'topics',
        component: './writing-translation/topics',
      },
    ],
  },
  {
    path: '/mock-exam',
    name: 'mock-exam',
    icon: 'fileDone',
    access: 'canAccessMockExam',
    routes: [
      {
        path: '/mock-exam',
        redirect: '/mock-exam/papers',
      },
      {
        path: '/mock-exam/papers',
        name: 'papers',
        component: './mock-exam/papers',
      },
    ],
  },
  {
    path: '/analytics',
    name: 'analytics',
    icon: 'lineChart',
    access: 'canAccessAnalytics',
    routes: [
      {
        path: '/analytics',
        redirect: '/analytics/overview',
      },
      {
        path: '/analytics/overview',
        name: 'overview',
        component: './analytics/overview',
      },
    ],
  },
  {
    path: '/review-release',
    name: 'review-release',
    icon: 'audit',
    access: 'canAccessReviewRelease',
    routes: [
      {
        path: '/review-release',
        redirect: '/review-release/pending',
      },
      {
        path: '/review-release/pending',
        name: 'pending',
        component: './review-release/pending',
      },
    ],
  },
  {
    path: '/system',
    name: 'system',
    icon: 'setting',
    access: 'canAccessSystem',
    routes: [
      {
        path: '/system',
        redirect: '/system/accounts',
      },
      {
        path: '/system/accounts',
        name: 'accounts',
        component: './system/accounts',
      },
    ],
  },
  {
    path: '/examples',
    hideInMenu: true,
    routes: [
      {
        path: '/examples/list/table-list',
        component: './table-list',
      },
      {
        path: '/examples/form/basic-form',
        component: './form/basic-form',
      },
      {
        path: '/examples/profile/basic',
        component: './profile/basic',
      },
      {
        path: '/examples/dashboard/analysis',
        component: './dashboard/analysis',
      },
      {
        path: '/examples',
        redirect: '/examples/list/table-list',
      },
    ],
  },
  {
    name: 'exception',
    path: '/exception',
    hideInMenu: true,
    routes: [
      {
        path: '/exception',
        redirect: '/exception/403',
      },
      {
        name: '403',
        path: '/exception/403',
        component: './exception/403',
      },
      {
        name: '404',
        path: '/exception/404',
        component: './exception/404',
      },
      {
        name: '500',
        path: '/exception/500',
        component: './exception/500',
      },
    ],
  },
  {
    path: '*',
    layout: false,
    component: './exception/404',
  },
];
