import {
  CopyOutlined,
  EditOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProForm, ProFormSelect, ProTable } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { Alert, App, Button, Card, Descriptions, Flex, Skeleton, Space, Tag } from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import StatusTag from '@/components/StatusTag';
import {
  completeMockOnboarding,
  copyOnboardingConfig,
  learningPathConfigs,
  onboardingOverview,
  resetMockOnboarding,
} from '@/services/ant-design-pro/api';
import PrecheckResult from '../components/PrecheckResult';

const fieldTypeLabels: Record<API.OnboardingFieldType, string> = {
  single_select: '单选',
  exam_date: '考试日期规则',
};

const canWriteLearningPath = (roleId?: string) =>
  roleId === 'super_admin' || roleId === 'teaching_reviewer';

const OnboardingPage: React.FC = () => {
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const roleId = initialState?.currentUser?.roleId;
  const canWrite = canWriteLearningPath(roleId);
  const [form] = ProForm.useForm<API.OnboardingSubmission>();
  const [data, setData] = useState<API.OnboardingOverview>();
  const [configs, setConfigs] = useState<API.LearningPathConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewResponse, configResponse] = await Promise.all([
        onboardingOverview(),
        learningPathConfigs({ pageSize: 100 }),
      ]);
      setData(overviewResponse.data);
      setConfigs(configResponse.data ?? []);
      const online = overviewResponse.data?.onlineConfig;
      const enabledValue = (
        key: API.OnboardingFieldKey,
        preferred: string | number,
      ) => {
        const options = online?.fields.find((field) => field.key === key)?.options ?? [];
        return options.find((item) => item.enabled && String(item.value) === String(preferred))?.value ??
          options.find((item) => item.enabled)?.value ??
          preferred;
      };
      form.setFieldsValue({
        examType: enabledValue('examType', 'CET4') as API.ExamType,
        targetScore: enabledValue('targetScore', 500) as 425 | 500 | 600,
        examDate: enabledValue('examDate', overviewResponse.data?.nextExamDates[0] ?? '') as string,
        dailyMinutes: enabledValue('dailyMinutes', 30) as 5 | 15 | 30,
        moodStatus: enabledValue('moodStatus', 'steady') as API.OnboardingMoodStatus,
      });
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || 'Onboarding 配置加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const associationCount = (key: API.OnboardingFieldKey) => {
    if (key === 'examDate' || key === 'moodStatus') return 0;
    return configs.filter((item) => item.userCondition).length;
  };

  const fieldColumns = useMemo<ProColumns<API.OnboardingField>[]>(
    () => [
      { title: '采集项', dataIndex: 'label', width: 150 },
      {
        title: '字段类型',
        dataIndex: 'type',
        width: 130,
        render: (_, record) => fieldTypeLabels[record.type],
      },
      {
        title: '启用选项',
        dataIndex: 'options',
        search: false,
        render: (_, record) => (
          <Space wrap size={[4, 4]}>
            {record.options
              .filter((item) => item.enabled)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => <Tag key={item.id}>{item.label}</Tag>)}
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'enabled',
        width: 90,
        render: (_, record) => <Tag color={record.enabled ? 'success' : 'default'}>{record.enabled ? '启用' : '停用'}</Tag>,
      },
      {
        title: '关联规则',
        dataIndex: 'associationCount',
        width: 100,
        search: false,
        render: (_, record) => associationCount(record.key),
      },
    ],
    [configs],
  );

  const copyDraft = async () => {
    if (!data?.onlineConfig) return;
    setActionLoading(true);
    try {
      const response = await copyOnboardingConfig(data.onlineConfig.id);
      message.success('已复制为新草稿');
      if (response.data) history.push(`/learning-path/onboarding/${response.data.id}/edit`);
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '复制失败');
    } finally {
      setActionLoading(false);
    }
  };

  const completeMock = async (values: API.OnboardingSubmission) => {
    setActionLoading(true);
    try {
      const response = await completeMockOnboarding(values);
      setData(response.data);
      message.success('固定 Mock 用户已完成 Onboarding');
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || 'Mock Onboarding 失败');
    } finally {
      setActionLoading(false);
    }
  };

  const resetMock = async () => {
    setActionLoading(true);
    try {
      const response = await resetMockOnboarding();
      setData(response.data);
      message.success('固定 Mock 用户已重置');
    } catch (error: any) {
      message.error(error?.data?.errorMessage || error?.message || '重置失败');
    } finally {
      setActionLoading(false);
    }
  };

  const enabledOptions = (key: API.OnboardingFieldKey) =>
    data?.onlineConfig?.fields
      .find((field) => field.key === key)
      ?.options.filter((item) => item.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({ label: item.label, value: item.value })) ?? [];

  if (loading) {
    return <PageContainer title="Onboarding 配置"><Skeleton active /></PageContainer>;
  }

  const config = data?.config;
  const match = data?.match;
  const mockCompleted = data?.mockUser.learningStatus.onboardingStatus === 'completed';

  return (
    <PageContainer
      title="Onboarding 配置"
      content="维护移动端五项目标采集配置，并验证发布版本对诊断与任务匹配的影响。"
      extra={[
        <Button key="reload" icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>,
        canWrite && config && ['draft', 'rejected'].includes(config.status) ? (
          <Button key="edit" type="primary" icon={<EditOutlined />} onClick={() => history.push(`/learning-path/onboarding/${config.id}/edit`)}>
            编辑草稿
          </Button>
        ) : null,
        canWrite && data?.onlineConfig && config?.status === 'published' ? (
          <Button key="copy" type="primary" icon={<CopyOutlined />} loading={actionLoading} onClick={copyDraft}>
            复制为新草稿
          </Button>
        ) : null,
      ]}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        {config ? (
          <Card title="配置状态">
            <Descriptions column={{ xs: 1, sm: 2, lg: 4 }}>
              <Descriptions.Item label="当前处理版本">{config.version}</Descriptions.Item>
              <Descriptions.Item label="状态"><StatusTag domain="reviewPublish" value={config.status} /></Descriptions.Item>
              <Descriptions.Item label="线上版本">{data?.onlineConfig?.version ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{config.updatedAt}</Descriptions.Item>
              <Descriptions.Item label="配置名称" span={2}>{config.name}</Descriptions.Item>
              <Descriptions.Item label="更新人">{config.updatedBy}</Descriptions.Item>
              <Descriptions.Item label="审核任务">
                {config.reviewTaskId ? (
                  <Button type="link" size="small" onClick={() => history.push(`/review-release/pending?keyword=${config.reviewTaskId}`)}>
                    {config.reviewTaskId}
                  </Button>
                ) : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Alert type="warning" showIcon title="暂无可用 Onboarding 配置" />}

        {config ? <PrecheckResult result={config.lastPrecheck} /> : null}

        <ProTable<API.OnboardingField>
          rowKey="key"
          headerTitle="五项采集配置"
          search={false}
          options={false}
          pagination={false}
          dataSource={config?.fields.slice().sort((a, b) => a.sortOrder - b.sortOrder) ?? []}
          columns={fieldColumns}
          scroll={{ x: 820 }}
        />

        <Card title="固定 Mock 用户回归">
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              title="Mock 诊断夹具"
              description="默认场景使用 CET4、目标 500 分、每日 30 分钟、稳定状态，并生成阅读正确率 60% 的诊断输入。"
            />
            <Descriptions column={{ xs: 1, sm: 2, lg: 4 }}>
              <Descriptions.Item label="用户">
                <Space>{data?.mockUser.nickname}<Tag>Mock</Tag></Space>
              </Descriptions.Item>
              <Descriptions.Item label="Onboarding">{mockCompleted ? <Tag color="success">已完成</Tag> : <Tag>未完成</Tag>}</Descriptions.Item>
              <Descriptions.Item label="诊断规则">
                {match?.diagnosisRule ? `${match.diagnosisRule.ruleName} ${match.diagnosisRule.version}` : '未命中'}
              </Descriptions.Item>
              <Descriptions.Item label="任务模板">
                {match?.todayTaskTemplate ? `${match.todayTaskTemplate.templateName} ${match.todayTaskTemplate.version}` : '未命中'}
              </Descriptions.Item>
            </Descriptions>
            {canWrite ? (
              <ProForm<API.OnboardingSubmission>
                form={form}
                layout="vertical"
                grid
                rowProps={{ gutter: 16 }}
                onFinish={completeMock}
                submitter={{
                  searchConfig: { submitText: '完成 Mock Onboarding' },
                  resetButtonProps: false,
                  submitButtonProps: { icon: <ExperimentOutlined />, loading: actionLoading, disabled: !data?.onlineConfig },
                }}
              >
                <ProFormSelect name="examType" label="考试类型" options={enabledOptions('examType')} colProps={{ xs: 24, md: 8 }} rules={[{ required: true }]} />
                <ProFormSelect name="targetScore" label="目标分" options={enabledOptions('targetScore')} colProps={{ xs: 24, md: 8 }} rules={[{ required: true }]} />
                <ProFormSelect name="examDate" label="考试日期" options={enabledOptions('examDate')} colProps={{ xs: 24, md: 8 }} rules={[{ required: true }]} />
                <ProFormSelect name="dailyMinutes" label="每日学习时长" options={enabledOptions('dailyMinutes')} colProps={{ xs: 24, md: 8 }} rules={[{ required: true }]} />
                <ProFormSelect name="moodStatus" label="最近状态" options={enabledOptions('moodStatus')} colProps={{ xs: 24, md: 8 }} rules={[{ required: true }]} />
              </ProForm>
            ) : <Alert type="info" showIcon title="当前角色可查看配置，但不能运行 Mock。" />}
            <Flex wrap gap={8}>
              <Button disabled={!mockCompleted} onClick={() => history.push(`/users/${data?.mockUser.id}`)}>
                查看用户详情 <RightOutlined />
              </Button>
              <Button disabled={!mockCompleted} onClick={() => history.push(`/analytics/learning-funnel?examType=${data?.mockUser.examProfile.examType}&module=learningPath`)}>
                查看学习路径漏斗 <RightOutlined />
              </Button>
              {canWrite ? <Button danger disabled={!mockCompleted} loading={actionLoading} onClick={resetMock}>重置 Mock 用户</Button> : null}
            </Flex>
          </Space>
        </Card>

        <ProTable<API.OnboardingConfigVersion>
          rowKey="id"
          headerTitle="版本记录"
          search={false}
          options={false}
          pagination={false}
          dataSource={config?.versionRecords ?? []}
          columns={[
            { title: '版本', dataIndex: 'version', width: 100 },
            { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => <StatusTag domain="reviewPublish" value={record.status} /> },
            { title: '变更说明', dataIndex: 'changeSummary' },
            { title: '操作人', dataIndex: 'createdBy', width: 130 },
            { title: '时间', dataIndex: 'createdAt', width: 180 },
            { title: '线上', dataIndex: 'currentOnline', width: 80, render: (_, record) => record.currentOnline ? <Tag color="success">当前</Tag> : '-' },
          ]}
          scroll={{ x: 780 }}
        />
      </Space>
    </PageContainer>
  );
};

export default OnboardingPage;
