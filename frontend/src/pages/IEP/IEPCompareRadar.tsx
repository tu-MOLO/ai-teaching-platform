import React, { useEffect, useRef } from 'react';
import { Card, Table, Tag } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { IEPCompare } from '../../services/iep';

const DOMAIN_ORDER = [
  'perception',
  'cognition',
  'language',
  'motor',
  'self_care',
  'social',
];

const keyOf = (d: { domain_code?: string; domain_name: string }) =>
  d.domain_code || d.domain_name;

const IEPCompareRadar: React.FC<{ compare: IEPCompare }> = ({ compare }) => {
  const chartRef = useRef<InstanceType<typeof ReactECharts> | null>(null);

  // 冷启动（整页刷新直达深层页）时，echarts 可能在布局稳定前初始化，
  // 导致首次未绘制 canvas；在布局稳定后主动 resize 一次以确保渲染。
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        chartRef.current?.getEchartsInstance().resize();
      });
    });
    const timer = setTimeout(() => {
      chartRef.current?.getEchartsInstance().resize();
    }, 300);
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      clearTimeout(timer);
    };
  }, []);

  const curMap = new Map(compare.current.map((d) => [keyOf(d), d]));
  const prevMap = new Map(compare.previous.map((d) => [keyOf(d), d]));
  const allKeys = Array.from(
    new Set([
      ...compare.current.map(keyOf),
      ...compare.previous.map(keyOf),
    ])
  );
  allKeys.sort((a, b) => {
    const ia = DOMAIN_ORDER.indexOf(a);
    const ib = DOMAIN_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const nameOf = (k: string) =>
    curMap.get(k)?.domain_name || prevMap.get(k)?.domain_name || k;
  const prevName = compare.previous_term || '上学期';
  const curName = compare.current_term || '本学期';
  const prevValues = allKeys.map(
    (k) => prevMap.get(k)?.overall_level ?? null
  );
  const curValues = allKeys.map(
    (k) => curMap.get(k)?.overall_level ?? null
  );

  const option = {
    tooltip: {},
    legend: { data: [prevName, curName], bottom: 0 },
    radar: {
      indicator: allKeys.map((k) => ({ name: nameOf(k), max: 3 })),
      radius: '62%',
      splitNumber: 3,
    },
    series: [
      {
        type: 'radar',
        data: [
          { value: prevValues, name: prevName, areaStyle: { opacity: 0.1 } },
          { value: curValues, name: curName, areaStyle: { opacity: 0.2 } },
        ],
      },
    ],
  };

  const rows = allKeys.map((k) => {
    const p = prevMap.get(k)?.overall_level ?? null;
    const c = curMap.get(k)?.overall_level ?? null;
    let delta: React.ReactNode = '—';
    if (p !== null && c !== null) {
      const d = c - p;
      delta =
        d > 0 ? (
          <Tag color="success">+{d}</Tag>
        ) : d < 0 ? (
          <Tag color="error">{d}</Tag>
        ) : (
          <Tag>0</Tag>
        );
    } else if (c !== null) {
      delta = <Tag>新评</Tag>;
    }
    return {
      key: k,
      name: nameOf(k),
      prev: p === null ? '未评' : p,
      cur: c === null ? '未评' : c,
      delta,
    };
  });

  return (
    <Card className="iep-detail-section" title="期初 / 期末领域对比">
      <ReactECharts ref={chartRef} option={option} style={{ height: 380 }} />
      <Table
        size="small"
        rowKey="key"
        pagination={false}
        dataSource={rows}
        columns={[
          { title: '领域', dataIndex: 'name' },
          { title: prevName, dataIndex: 'prev', width: 130 },
          { title: curName, dataIndex: 'cur', width: 130 },
          { title: '变化', dataIndex: 'delta', width: 100 },
        ]}
      />
      <p style={{ color: '#999', margin: '8px 0 0' }}>
        注：级别 0–3（数字越大越独立）；未评估的时点留空，不参与变化计算。
      </p>
    </Card>
  );
};

export default IEPCompareRadar;
