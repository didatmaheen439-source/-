import { Tag } from 'antd';
import type React from 'react';
import type { StatusDomain } from '@/foundation/status';
import { getStatusConfig } from '@/foundation/status';

type StatusTagProps = {
  domain: StatusDomain;
  value: string;
};

const StatusTag: React.FC<StatusTagProps> = ({ domain, value }) => {
  const config = getStatusConfig(domain, value);

  if (!config) {
    return <Tag>{value}</Tag>;
  }

  return <Tag color={config.color}>{config.label}</Tag>;
};

export default StatusTag;
