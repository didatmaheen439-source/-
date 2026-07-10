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
    redirect: '/dashboard/workbench',
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    icon: 'dashboard',
    access: 'canAccessDashboard',
    routes: [
      {
        path: '/dashboard',
        redirect: '/dashboard/workbench',
      },
      {
        path: '/dashboard/workbench',
        name: 'workbench',
        component: './dashboard/overview',
      },
      {
        path: '/dashboard/review-tasks',
        name: 'review-tasks',
        component: './prd-placeholder',
      },
      {
        path: '/dashboard/overview',
        name: 'overview',
        hideInMenu: true,
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
        path: '/users/feedback',
        name: 'feedback',
        component: './prd-placeholder',
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
        path: '/content/question-groups',
        name: 'question-groups',
        component: './prd-placeholder',
      },
      {
        path: '/content/wrong-reason-tags',
        name: 'wrong-reason-tags',
        component: './content/wrong-reason-tags',
      },
      {
        path: '/content/wrong-reason-tags/new',
        name: 'wrong-reason-tag-new',
        hideInMenu: true,
        component: './content/wrong-reason-tags/edit/index',
      },
      {
        path: '/content/wrong-reason-tags/:id/edit',
        name: 'wrong-reason-tag-edit',
        hideInMenu: true,
        component: './content/wrong-reason-tags/edit/index',
      },
      {
        path: '/content/wrong-reason-tags/:id',
        name: 'wrong-reason-tag-detail',
        hideInMenu: true,
        component: './content/wrong-reason-tags/detail/index',
      },
      {
        path: '/content/daily-sentences',
        name: 'daily-sentences',
        component: './prd-placeholder',
      },
      {
        path: '/content/articles',
        name: 'articles',
        component: './prd-placeholder',
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
        path: '/learning-path/task-templates',
        name: 'task-templates',
        component: './learning-path/diagnosis-rules',
      },
      {
        path: '/learning-path/light-task-strategies',
        name: 'light-task-strategies',
        component: './prd-placeholder',
      },
      {
        path: '/learning-path/extra-practice-strategies',
        name: 'extra-practice-strategies',
        component: './prd-placeholder',
      },
      {
        path: '/learning-path/review-recommendation-strategies',
        name: 'review-recommendation-strategies',
        component: './prd-placeholder',
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
        path: '/ai-coach/intents',
        name: 'intents',
        component: './prd-placeholder',
      },
      {
        path: '/ai-coach/prompts',
        name: 'prompts',
        component: './ai-coach/prompts',
      },
      {
        path: '/ai-coach/response-structures',
        name: 'response-structures',
        component: './prd-placeholder',
      },
      {
        path: '/ai-coach/dependency-rules',
        name: 'dependency-rules',
        component: './prd-placeholder',
      },
      {
        path: '/ai-coach/session-review',
        name: 'session-review',
        component: './prd-placeholder',
      },
      {
        path: '/ai-coach/abnormal-replies',
        name: 'abnormal-replies',
        component: './prd-placeholder',
      },
      {
        path: '/ai-coach/strategy-versions',
        name: 'strategy-versions',
        component: './prd-placeholder',
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
        redirect: '/writing-translation/writing-topics',
      },
      {
        path: '/writing-translation/writing-topics',
        name: 'writing-topics',
        component: './writing-translation/topics',
      },
      {
        path: '/writing-translation/writing-topics/new',
        name: 'writing-topic-new',
        hideInMenu: true,
        component: './writing-translation/topics/edit/index',
      },
      {
        path: '/writing-translation/writing-topics/:id/edit',
        name: 'writing-topic-edit',
        hideInMenu: true,
        component: './writing-translation/topics/edit/index',
      },
      {
        path: '/writing-translation/writing-topics/:id',
        name: 'writing-topic-detail',
        hideInMenu: true,
        component: './writing-translation/topics/detail/index',
      },
      {
        path: '/writing-translation/translation-topics',
        name: 'translation-topics',
        component: './writing-translation/topics',
      },
      {
        path: '/writing-translation/translation-topics/new',
        name: 'translation-topic-new',
        hideInMenu: true,
        component: './writing-translation/topics/edit/index',
      },
      {
        path: '/writing-translation/translation-topics/:id/edit',
        name: 'translation-topic-edit',
        hideInMenu: true,
        component: './writing-translation/topics/edit/index',
      },
      {
        path: '/writing-translation/translation-topics/:id',
        name: 'translation-topic-detail',
        hideInMenu: true,
        component: './writing-translation/topics/detail/index',
      },
      {
        path: '/writing-translation/scoring-dimensions',
        name: 'scoring-dimensions',
        component: './prd-placeholder',
      },
      {
        path: '/writing-translation/feedback-templates',
        name: 'feedback-templates',
        component: './prd-placeholder',
      },
      {
        path: '/writing-translation/topics',
        name: 'topics',
        hideInMenu: true,
        component: './writing-translation/topics',
      },
      {
        path: '/writing-translation/topics/new',
        name: 'topic-new',
        hideInMenu: true,
        component: './writing-translation/topics/edit/index',
      },
      {
        path: '/writing-translation/topics/:id/edit',
        name: 'topic-edit',
        hideInMenu: true,
        component: './writing-translation/topics/edit/index',
      },
      {
        path: '/writing-translation/topics/:id',
        name: 'topic-detail',
        hideInMenu: true,
        component: './writing-translation/topics/detail/index',
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
      {
        path: '/mock-exam/papers/new',
        name: 'paper-new',
        hideInMenu: true,
        component: './mock-exam/papers/edit/index',
      },
      {
        path: '/mock-exam/papers/:id/edit',
        name: 'paper-edit',
        hideInMenu: true,
        component: './mock-exam/papers/edit/index',
      },
      {
        path: '/mock-exam/papers/:id',
        name: 'paper-detail',
        hideInMenu: true,
        component: './mock-exam/papers/detail/index',
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
        redirect: '/analytics/users',
      },
      {
        path: '/analytics/users',
        name: 'users',
        component: './analytics/overview',
      },
      {
        path: '/analytics/learning-funnel',
        name: 'learning-funnel',
        component: './analytics/overview',
      },
      {
        path: '/analytics/content',
        name: 'content',
        component: './analytics/overview',
      },
      {
        path: '/analytics/questions',
        name: 'questions',
        component: './analytics/overview',
      },
      {
        path: '/analytics/wrong-reasons',
        name: 'wrong-reasons',
        component: './analytics/overview',
      },
      {
        path: '/analytics/writing-translation',
        name: 'writing-translation',
        component: './analytics/overview',
      },
      {
        path: '/analytics/mock-exam',
        name: 'mock-exam',
        component: './analytics/overview',
      },
      {
        path: '/analytics/ai',
        name: 'ai',
        component: './analytics/overview',
      },
      {
        path: '/analytics/overview',
        name: 'overview',
        hideInMenu: true,
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
      {
        path: '/review-release/versions',
        name: 'versions',
        component: './prd-placeholder',
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
      {
        path: '/system/roles',
        name: 'roles',
        component: './system/accounts',
      },
      {
        path: '/system/operation-logs',
        name: 'operation-logs',
        component: './system/accounts',
      },
      {
        path: '/system/sensitive-access-logs',
        name: 'sensitive-access-logs',
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
