import { describe, expect, it } from 'vitest';
import routes from '../../config/routes';
import zhCNMenu from '../locales/zh-CN/menu';

type RouteItem = {
  path?: string;
  name?: string;
  component?: string;
  redirect?: string;
  hideInMenu?: boolean;
  parentKeys?: string[];
  routes?: RouteItem[];
};

const routeTree = routes as RouteItem[];

const findRoute = (path: string, items: RouteItem[] = routeTree): RouteItem | undefined => {
  for (const item of items) {
    if (item.path === path) return item;
    const nested = item.routes ? findRoute(path, item.routes) : undefined;
    if (nested) return nested;
  }
  return undefined;
};

const collectRoutes = (
  items: RouteItem[] = routeTree,
  ancestorHidden = false,
): { route: RouteItem; hidden: boolean }[] =>
  items.flatMap((route) => {
    const hidden = ancestorHidden || route.hideInMenu === true;
    return [
      { route, hidden },
      ...collectRoutes(route.routes ?? [], hidden),
    ];
  });

const businessPaths = [
  '/dashboard',
  '/users',
  '/content',
  '/content-operations',
  '/learning-path',
  '/ai-coach',
  '/writing-translation',
  '/mock-exam',
  '/analytics',
  '/review-release',
  '/system',
];

const visibleSecondLevelPaths = [
  '/dashboard/workbench',
  '/users/list',
  '/content/questions',
  '/content/question-groups',
  '/content/wrong-reason-tags',
  '/content-operations/articles',
  '/learning-path/onboarding',
  '/learning-path/diagnosis-rules',
  '/learning-path/task-templates',
  '/ai-coach/prompts',
  '/writing-translation/writing-topics',
  '/writing-translation/translation-topics',
  '/mock-exam/papers',
  '/analytics/overview',
  '/review-release/pending',
  '/system/accounts',
  '/system/roles',
  '/system/operation-logs',
];

describe('admin navigation structure', () => {
  it('defines eleven visible business modules after external articles are implemented', () => {
    const businessRoutes = businessPaths.map((path) => findRoute(path));

    expect(businessRoutes.every(Boolean)).toBe(true);
    expect(businessRoutes.filter((route) => route?.hideInMenu)).toEqual([]);
  });

  it('exposes only the implemented second-level entries', () => {
    const visiblePaths = businessPaths.flatMap((path) => {
      const parent = findRoute(path);
      if (!parent || parent.hideInMenu) return [];
      return (parent.routes ?? [])
        .filter(
          (route) =>
            route.name &&
            !route.hideInMenu &&
            !route.redirect &&
            route.component,
        )
        .map((route) => route.path as string);
    });

    expect(visiblePaths).toEqual(visibleSecondLevelPaths);
  });

  it('never exposes a placeholder route in the menu', () => {
    const placeholders = collectRoutes().filter(
      ({ route }) => route.component === './prd-placeholder',
    );

    expect(placeholders.length).toBeGreaterThan(0);
    expect(placeholders.every(({ hidden }) => hidden)).toBe(true);
  });

  it('keeps only same-capability legacy redirects', () => {
    expect(findRoute('/dashboard/review-tasks')?.redirect).toBe(
      '/review-release/pending',
    );
    expect(findRoute('/content/daily-sentences')?.redirect).toBe(
      '/content-operations/daily-sentences',
    );
    expect(findRoute('/content/articles')?.redirect).toBe(
      '/content-operations/articles',
    );
    expect(
      findRoute('/analytics')?.routes?.find(
        (route) => route.path === '/analytics',
      )?.redirect,
    ).toBe('/analytics/overview');
    expect(
      findRoute('/learning-path')?.routes?.find(
        (route) => route.path === '/learning-path',
      )?.redirect,
    ).toBe('/learning-path/onboarding');
  });

  it('maps hidden semantic views back to their consolidated menu entry', () => {
    expect(findRoute('/analytics/users')?.parentKeys).toEqual([
      '/analytics/overview',
    ]);
    expect(findRoute('/system/sensitive-access-logs')?.parentKeys).toEqual([
      '/system/operation-logs',
    ]);
    expect(findRoute('/review-release/versions')?.parentKeys).toEqual([
      '/review-release/pending',
    ]);
  });

  it('provides labels for the new and renamed navigation entries', () => {
    expect(zhCNMenu['menu.users']).toBe('用户与反馈');
    expect(zhCNMenu['menu.content']).toBe('题库管理');
    expect(zhCNMenu['menu.content.questions']).toBe('题目管理');
    expect(zhCNMenu['menu.content-operations']).toBe('内容运营');
    expect(zhCNMenu['menu.ai-coach']).toBe('AI 陪练');
    expect(zhCNMenu['menu.writing-translation']).toBe('写译批改');
    expect(zhCNMenu['menu.system']).toBe('系统与审计');
    expect(zhCNMenu['menu.system.operation-logs']).toBe('审计日志');
  });
});
