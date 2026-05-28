import React, { useEffect, useRef } from 'react';
import { Typography, Spin, Empty } from 'antd';
import {
  BookOutlined,
  UserOutlined,
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  TrophyOutlined,
  TeamOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  CalendarOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  EditOutlined,
  PlusCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  FundOutlined
} from '@ant-design/icons';
import * as echarts from 'echarts';
import type { ActivityItem } from '../../services/report';
import { useDashboardStore } from '../../stores/dashboard';
import './index.css';

const { Title, Text } = Typography;

const iconMapping: Record<string, React.ReactNode> = {
  'FileTextOutlined': <FileTextOutlined />, 'TrophyOutlined': <TrophyOutlined />,
  'TeamOutlined': <TeamOutlined />, 'CalendarOutlined': <CalendarOutlined />,
  'FileImageOutlined': <FileImageOutlined />, 'VideoCameraOutlined': <VideoCameraOutlined />,
  'EditOutlined': <EditOutlined />, 'PlusCircleOutlined': <PlusCircleOutlined />,
  'CheckCircleOutlined': <CheckCircleOutlined />, 'StarOutlined': <StarOutlined />,
  'BookOutlined': <BookOutlined />, 'UserOutlined': <UserOutlined />,
  'BarChartOutlined': <BarChartOutlined />, 'LineChartOutlined': <LineChartOutlined />,
  'PieChartOutlined': <PieChartOutlined />, 'ClockCircleOutlined': <ClockCircleOutlined />,
};

const getIconComponent = (iconName: string): React.ReactNode => iconMapping[iconName] || <FileTextOutlined />;

const processActivities = (activities: ActivityItem[] | undefined): Array<ActivityItem & { iconComponent: React.ReactNode }> => {
  if (!activities || activities.length === 0) return [];
  return activities.map(activity => ({ ...activity, iconComponent: getIconComponent(activity.icon) }));
};

const Reports: React.FC = () => {
  const { reportData, reportsLoading, reportsError, fetchReports } = useDashboardStore();
  const { dashboardData, courseData, studentData, monthlyTrends } = reportData;

  const pieChartRef = useRef<echarts.ECharts | null>(null);
  const barChartRef = useRef<echarts.ECharts | null>(null);
  const lineChartRef = useRef<echarts.ECharts | null>(null);
  const pieChartContainerRef = useRef<HTMLDivElement>(null);
  const barChartContainerRef = useRef<HTMLDivElement>(null);
  const lineChartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  useEffect(() => {
    if (reportsLoading || reportsError) return;

    if (pieChartContainerRef.current && courseData?.categoryStats) {
      if (pieChartRef.current) pieChartRef.current.dispose();
      pieChartRef.current = echarts.init(pieChartContainerRef.current);
      pieChartRef.current.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c}门 ({d}%)' },
        series: [{
          name: '课程分类', type: 'pie', radius: ['40%', '70%'], center: ['50%', '50%'],
          avoidLabelOverlap: false, label: { show: false }, labelLine: { show: false },
          emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
          itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
          data: courseData.categoryStats.map(item => ({
            value: item.value, name: item.name,
            itemStyle: { color: item.color }
          }))
        }]
      });
    }

    if (barChartContainerRef.current && studentData?.gradeDistribution) {
      if (barChartRef.current) barChartRef.current.dispose();
      barChartRef.current = echarts.init(barChartContainerRef.current);
      barChartRef.current.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}: {c}人' },
        grid: { left: '3%', right: '12%', bottom: '3%', top: '3%', containLabel: true },
        xAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
        yAxis: { type: 'category', data: studentData.gradeDistribution.map(item => item.grade).reverse(), axisLine: { show: false }, axisTick: { show: false } },
        series: [{
          type: 'bar', barWidth: '50%', name: '学生人数',
          data: studentData.gradeDistribution.map(item => ({
            value: item.count,
            itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: item.color + '80' }, { offset: 1, color: item.color }]), borderRadius: [0, 4, 4, 0] }
          })).reverse(),
        }]
      });
    }

    if (lineChartContainerRef.current && monthlyTrends.length > 0) {
      if (lineChartRef.current) lineChartRef.current.dispose();
      lineChartRef.current = echarts.init(lineChartContainerRef.current);
      const months = monthlyTrends.map(t => t.month.slice(5) + '月');
      lineChartRef.current.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['课程', '学生', '教案'], bottom: 0, itemWidth: 12, itemHeight: 12 },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: months, axisLabel: { color: '#999', fontSize: 10 } },
        yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f0f0f0' } }, axisLabel: { color: '#999', fontSize: 10 } },
        series: [
          { name: '课程', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: monthlyTrends.map(t => t.newCourses), itemStyle: { color: '#548CA8' }, lineStyle: { width: 2 } },
          { name: '学生', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: monthlyTrends.map(t => t.newStudents), itemStyle: { color: '#6b9b7a' }, lineStyle: { width: 2 } },
          { name: '教案', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: monthlyTrends.map(t => t.newLessonPlans), itemStyle: { color: '#7a9ab8' }, lineStyle: { width: 2 } },
        ]
      });
    }

    const handleResize = () => {
      pieChartRef.current?.resize();
      barChartRef.current?.resize();
      lineChartRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      pieChartRef.current?.dispose();
      barChartRef.current?.dispose();
      lineChartRef.current?.dispose();
    };
  }, [courseData, studentData, monthlyTrends, reportsLoading, reportsError]);

  const statCards = [
    { title: '总课程数', value: dashboardData?.totalCourses || 0, icon: <BookOutlined />, color: '#548CA8', trend: dashboardData?.courseTrend || '+0%', trendUp: true },
    { title: '总学生数', value: dashboardData?.totalStudents || 0, icon: <UserOutlined />, color: '#6b9b7a', trend: dashboardData?.studentTrend || '+0%', trendUp: true },
  ];

  const recentActivities = processActivities(dashboardData?.recentActivities);

  if (reportsLoading && !dashboardData) {
    return (
      <div className="reports-container">
        <div className="reports-loading">
          <Spin size="large" />
          <p>加载报告数据中...</p>
        </div>
      </div>
    );
  }

  if (reportsError && !dashboardData) {
    return (
      <div className="reports-container">
        <div className="reports-loading">
          <Empty description={reportsError} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div className="reports-header-left">
          <Title level={2} className="reports-title">
            <FundOutlined className="reports-title-icon" />
            教学数据分析报告
          </Title>
          <Text className="reports-subtitle">全面了解教学数据，助力教育决策</Text>
        </div>
        <div className="reports-header-right">
          {reportsLoading && dashboardData && (
            <div className="refresh-indicator">
              <Spin size="small" />
              <span>数据更新中...</span>
            </div>
          )}
        </div>
      </div>

      {/* 统计数据行内条 */}
      <div className="stats-strip">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-item">
            <div className="stat-item-icon" style={{ background: `${stat.color}14`, color: stat.color }}>{stat.icon}</div>
            <div className="stat-item-body">
              <div className="stat-item-value">{stat.value.toLocaleString()}</div>
              <div className="stat-item-label">{stat.title}</div>
              <div className={`stat-item-trend ${stat.trendUp ? 'up' : 'down'}`}>
                {stat.trendUp ? <RiseOutlined /> : <FallOutlined />}
                <span>{stat.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 图表 - 三列无卡片框 */}
      <div className="charts-grid">
        <div className="chart-wrapper">
          <div className="chart-header">
            <PieChartOutlined className="chart-header-icon" />
            <span className="chart-header-title">课程分类统计</span>
          </div>
          <div ref={pieChartContainerRef} className="chart-body">
            {!courseData?.categoryStats?.length && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            )}
          </div>
        </div>

        <div className="chart-wrapper">
          <div className="chart-header">
            <BarChartOutlined className="chart-header-icon" />
            <span className="chart-header-title">学生年级分布</span>
          </div>
          <div ref={barChartContainerRef} className="chart-body">
            {!studentData?.gradeDistribution?.length && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            )}
          </div>
        </div>

        <div className="chart-wrapper">
          <div className="chart-header">
            <LineChartOutlined className="chart-header-icon" />
            <span className="chart-header-title">月度教学趋势</span>
          </div>
          <div ref={lineChartContainerRef} className="chart-body">
            {monthlyTrends.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Empty description="暂无趋势数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 最近活动 */}
      <div className="content-section activity-section">
        <div className="section-heading">
          <ClockCircleOutlined className="section-heading-icon" />
          <span className="section-heading-text">最近活动</span>
        </div>
        {recentActivities.length > 0 ? (
          <div className="activity-list">
            {recentActivities.map((item, idx) => (
              <div key={idx} className="activity-item">
                <div className="activity-icon" style={{ background: `${item.color}14`, color: item.color }}>
                  {item.iconComponent}
                </div>
                <div className="activity-content">
                  <div className="activity-title-text">{item.title}</div>
                  <div className="activity-desc-text">{item.desc}</div>
                </div>
                <span className="activity-time">{item.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="暂无活动记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>
    </div>
  );
};

export default Reports;
