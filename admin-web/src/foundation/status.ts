export type AntTagColor = string;

export type StatusDomain =
  | 'reviewPublish'
  | 'feedback'
  | 'account'
  | 'exception'
  | 'systemHealth';

export type StatusConfig = {
  value: string;
  label: string;
  color: AntTagColor;
  editable: boolean;
  nextActions: string[];
};

export const reviewPublishStatuses: StatusConfig[] = [
  {
    value: 'draft',
    label: '草稿',
    color: 'default',
    editable: true,
    nextActions: ['submit'],
  },
  {
    value: 'pending_review',
    label: '待审核',
    color: 'processing',
    editable: false,
    nextActions: ['approve', 'reject'],
  },
  {
    value: 'rejected',
    label: '已驳回',
    color: 'error',
    editable: true,
    nextActions: ['edit', 'submit'],
  },
  {
    value: 'approved',
    label: '已通过',
    color: 'success',
    editable: false,
    nextActions: ['scheduleRelease'],
  },
  {
    value: 'pending_publish',
    label: '待发布',
    color: 'warning',
    editable: false,
    nextActions: ['publish'],
  },
  {
    value: 'published',
    label: '已发布',
    color: 'success',
    editable: false,
    nextActions: ['offline', 'rollback'],
  },
  {
    value: 'offline',
    label: '已下架',
    color: 'default',
    editable: false,
    nextActions: ['rollback'],
  },
  {
    value: 'rolled_back',
    label: '已回滚',
    color: 'magenta',
    editable: false,
    nextActions: ['createVersion'],
  },
];

export const feedbackStatuses: StatusConfig[] = [
  {
    value: 'pending',
    label: '待处理',
    color: 'warning',
    editable: true,
    nextActions: ['process', 'close'],
  },
  {
    value: 'processing',
    label: '处理中',
    color: 'processing',
    editable: true,
    nextActions: ['resolve', 'noAction'],
  },
  {
    value: 'resolved',
    label: '已处理',
    color: 'success',
    editable: false,
    nextActions: ['close'],
  },
  {
    value: 'no_action',
    label: '无需处理',
    color: 'default',
    editable: false,
    nextActions: ['close'],
  },
  {
    value: 'closed',
    label: '已关闭',
    color: 'default',
    editable: false,
    nextActions: [],
  },
];

export const accountStatuses: StatusConfig[] = [
  {
    value: 'enabled',
    label: '启用',
    color: 'success',
    editable: true,
    nextActions: ['disable', 'lock'],
  },
  {
    value: 'disabled',
    label: '停用',
    color: 'default',
    editable: true,
    nextActions: ['enable'],
  },
  {
    value: 'locked',
    label: '锁定',
    color: 'error',
    editable: true,
    nextActions: ['unlock'],
  },
];

export const exceptionStatuses: StatusConfig[] = [
  {
    value: 'pending',
    label: '待处理',
    color: 'warning',
    editable: true,
    nextActions: ['process'],
  },
  {
    value: 'processing',
    label: '处理中',
    color: 'processing',
    editable: true,
    nextActions: ['resolve'],
  },
  {
    value: 'resolved',
    label: '已解决',
    color: 'success',
    editable: false,
    nextActions: ['close'],
  },
  {
    value: 'closed',
    label: '已关闭',
    color: 'default',
    editable: false,
    nextActions: [],
  },
];

export const systemHealthStatuses: StatusConfig[] = [
  {
    value: 'normal',
    label: '正常',
    color: 'success',
    editable: false,
    nextActions: [],
  },
  {
    value: 'exception',
    label: '异常',
    color: 'error',
    editable: false,
    nextActions: ['process'],
  },
];

export const statusGroups: Record<StatusDomain, StatusConfig[]> = {
  reviewPublish: reviewPublishStatuses,
  feedback: feedbackStatuses,
  account: accountStatuses,
  exception: exceptionStatuses,
  systemHealth: systemHealthStatuses,
};

export const statusMap = Object.entries(statusGroups).reduce(
  (acc, [domain, configs]) => {
    acc[domain as StatusDomain] = configs.reduce<Record<string, StatusConfig>>(
      (domainAcc, item) => {
        domainAcc[item.value] = item;
        return domainAcc;
      },
      {},
    );
    return acc;
  },
  {} as Record<StatusDomain, Record<string, StatusConfig>>,
);

export const getStatusConfig = (domain: StatusDomain, value: string) =>
  statusMap[domain]?.[value];
