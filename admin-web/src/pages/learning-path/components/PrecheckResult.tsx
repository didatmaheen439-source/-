import { Alert, List, Space, Tag, Typography } from 'antd';
import type React from 'react';
import {
  precheckLevelColor,
  precheckLevelText,
} from '../config';

type PrecheckResultProps = {
  result?: API.LearningPathPrecheckResult;
};

const PrecheckResult: React.FC<PrecheckResultProps> = ({ result }) => {
  if (!result) {
    return (
      <Alert
        type="info"
        showIcon
        title="保存或提交审核前会执行结构化预校验。"
      />
    );
  }

  return (
    <Space orientation="vertical" size={8} style={{ width: '100%' }}>
      <Alert
        type={result.level === 'passed' ? 'success' : result.level}
        showIcon
        title={
          <Space>
            <Tag color={precheckLevelColor[result.level]}>
              {precheckLevelText[result.level]}
            </Tag>
            <Typography.Text>{result.summary}</Typography.Text>
          </Space>
        }
        description={`校验时间：${result.checkedAt}`}
      />
      {result.issues.length ? (
        <List
          size="small"
          dataSource={result.issues}
          renderItem={(item) => (
            <List.Item>
              <Space orientation="vertical" size={2}>
                <Space>
                  <Tag color={precheckLevelColor[item.level]}>
                    {precheckLevelText[item.level]}
                  </Tag>
                  <Typography.Text strong>{item.field}</Typography.Text>
                  <Typography.Text>{item.message}</Typography.Text>
                </Space>
                <Typography.Text type="secondary">
                  {item.suggestion}
                </Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      ) : null}
    </Space>
  );
};

export default PrecheckResult;
