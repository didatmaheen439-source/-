import { Image, Typography } from 'antd';
import type React from 'react';

type PreviewValue = Pick<
  API.DailySentenceItem,
  'contentDate' | 'quote' | 'translation' | 'displaySource'
> & {
  imageUrl?: string;
};

const DailySentencePreview: React.FC<{ value: PreviewValue }> = ({ value }) => {
  const [year = '2026', month = '01', day = '01'] = (value.contentDate || '').split('-');
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 390,
        aspectRatio: '3 / 4',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 8,
        background: '#1f2937',
      }}
    >
      {value.imageUrl ? (
        <Image
          preview={false}
          src={value.imageUrl}
          alt="每日一句配图预览"
          width="100%"
          height="100%"
          style={{ objectFit: 'cover' }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#fff',
          background: 'rgba(15, 23, 42, 0.48)',
        }}
      >
        <div>
          <Typography.Text style={{ color: 'rgba(255,255,255,.82)', fontSize: 14 }}>{year}</Typography.Text>
          <div style={{ color: '#fff', fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>{month}.{day}</div>
        </div>
        <div>
          <Typography.Paragraph
            style={{ color: '#fff', fontSize: 24, lineHeight: 1.35, fontWeight: 600, marginBottom: 12 }}
            ellipsis={{ rows: 5 }}
          >
            {value.quote || 'English sentence'}
          </Typography.Paragraph>
          <Typography.Paragraph style={{ color: 'rgba(255,255,255,.9)', fontSize: 15, marginBottom: 18 }} ellipsis={{ rows: 3 }}>
            {value.translation || '中文译文'}
          </Typography.Paragraph>
          <Typography.Text style={{ color: 'rgba(255,255,255,.78)', fontSize: 13 }}>
            {value.displaySource || '内容出处'}
          </Typography.Text>
        </div>
      </div>
    </div>
  );
};

export default DailySentencePreview;
