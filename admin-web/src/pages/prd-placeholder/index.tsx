import { Result } from 'antd';
import type React from 'react';
import BusinessModulePlaceholder from '@/components/BusinessModulePlaceholder';
import { modulePlaceholderConfigs } from '@/foundation/module-placeholders';
import { useLocation } from '@umijs/max';

const toRouteKey = (pathname: string) =>
  pathname.replace(/^\/+/, '').replace(/\/+$/, '').replaceAll('/', '-');

const PrdPlaceholderPage: React.FC = () => {
  const location = useLocation();
  const routeKey = toRouteKey(location.pathname);

  if (!modulePlaceholderConfigs[routeKey]) {
    return (
      <Result
        status="404"
        title="页面未配置"
        subTitle="当前 PRD 二级入口缺少占位配置。"
      />
    );
  }

  return <BusinessModulePlaceholder routeKey={routeKey} />;
};

export default PrdPlaceholderPage;
