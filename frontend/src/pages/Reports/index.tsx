import React, { useEffect, useRef } from 'react';
import { Card, Row, Col, Typography, List, Tag, Spin, Empty } from 'antd';
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
  StarOutlined
} from '@ant-design/icons';
import * as echarts from 'echarts';
import type { ActivityItem } from '../../services/report';
import { useDashboardStore } from '../../stores/dashboard';
import './index.css';

const { Title, Text } = Typography;

const iconMapping: Record<string, React.ReactNode> = {
  'FileTextOutlined': <FileTextOutlined />,
  'TrophyOutlined': <TrophyOutlined />,
  'TeamOutlined': <TeamOutlined />,
  'CalendarOutlined': <CalendarOutlined />,
  'FileImageOutlined': <FileImageOutlined />,
  'VideoCameraOutlined': <VideoCameraOutlined />,
  'EditOutlined': <EditOutlined />,
  'PlusCircleOutlined': <PlusCircleOutlined />,
  'CheckCircleOutlined': <CheckCircleOutlined />,
  'StarOutlined': <StarOutlined />,
  'BookOutlined': <BookOutlined />,
  'UserOutlined': <UserOutlined />,
  'BarChartOutlined': <BarChartOutlined />,
  'LineChartOutlined': <LineChartOutlined />,
  'PieChartOutlined': <PieChartOutlined />,
  'ClockCircleOutlined': <ClockCircleOutlined />,
};

const getIconComponent = (iconName: string): React.ReactNode => {
  return iconMapping[iconName] || <FileTextOutlined />;
};

const processActivities = (activities: ActivityItem[] | undefined): Array<ActivityItem & { iconComponent: React.ReactNode }> => {
  if (!activities || activities.length === 0) {
    return [];
  }
  return activities.map(activity => ({
    ...activity,
    iconComponent: getIconComponent(activity.icon)
  }));
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

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (reportsLoading || reportsError) return;

    if (pieChartContainerRef.current && courseData?.categoryStats) {
      if (pieChartRef.current) {
        pieChartRef.current.dispose();
      }
      pieChartRef.current = echarts.init(pieChartContainerRef.current);

      const pieOption: echarts.EChartsOption = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c}门 ({d}%)'
        },
        legend: {
          orient: 'vertical',
          right: '5%',
          top: 'center',
          itemWidth: 12,
          itemHeight: 12,
          textStyle: {
            fontSize: 12
          }
        },
        series: [
          {
            name: '课程分类',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['35%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 6,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: false
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: 'bold'
              }
            },
            labelLine: {
              show: false
            },
            data: courseData.categoryStats.map(item => ({
              value: item.value,
              name: item.name,
              itemStyle: { color: item.color }
            }))
          }
        ]
      };
      pieChartRef.current.setOption(pieOption);
    }

    if (barChartContainerRef.current && studentData?.gradeDistribution) {
      if (barChartRef.current) {
        barChartRef.current.dispose();
      }
      barChartRef.current = echarts.init(barChartContainerRef.current);

      const barOption: echarts.EChartsOption = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: '{b}: {c}人'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: {
            lineStyle: {
              color: '#f0f0f0'
            }
          }
        },
        yAxis: {
          type: 'category',
          data: studentData.gradeDistribution.map(item => item.grade).reverse(),
          axisLine: { show: false },
          axisTick: { show: false }
        },
        series: [
          {
            name: '学生人数',
            type: 'bar',
            data: studentData.gradeDistribution.map(item => ({
              value: item.count,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: item.color + '80' },
                  { offset: 1, color: item.color }
                ]),
                borderRadius: [0, 4, 4, 0]
              }
            })).reverse(),
            barWidth: '60%'
          }
        ]
      };
      barChartRef.current.setOption(barOption);
    }

    if (lineChartContainerRef.current && monthlyTrends.length > 0) {
      if (lineChartRef.current) {
        lineChartRef.current.dispose();
      }
      lineChartRef.current = echarts.init(lineChartContainerRef.current);

      const months = monthlyTrends.map(t => t.month.slice(5) + '月');
      const lineOption: echarts.EChartsOption = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        legend: {
          data: ['课程', '学生', '教案'],
          bottom: 0,
          itemWidth: 12,
          itemHeight: 12,
          textStyle: {
            fontSize: 11
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '10%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: months,
          axisLine: {
            lineStyle: {
              color: '#e0e0e0'
            }
          },
          axisLabel: {
            color: '#999',
            fontSize: 10
          }
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: {
            lineStyle: {
              color: '#f0f0f0'
            }
          },
          axisLabel: {
            color: '#999',
            fontSize: 10
          }
        },
        series: [
          {
            name: '课程',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            data: monthlyTrends.map(t => t.newCourses),
            itemStyle: { color: '#c9a87c' },
            lineStyle: { width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#c9a87c40' },
                { offset: 1, color: '#c9a87c05' }
              ])
            }
          },
          {
            name: '学生',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            data: monthlyTrends.map(t => t.newStudents),
            itemStyle: { color: '#6b9b7a' },
            lineStyle: { width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#6b9b7a40' },
                { offset: 1, color: '#6b9b7a05' }
              ])
            }
          },
          {
            name: '教案',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            data: monthlyTrends.map(t => t.newLessonPlans),
            itemStyle: { color: '#7a9ab8' },
            lineStyle: { width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#7a9ab840' },
                { offset: 1, color: '#7a9ab805' }
              ])
            }
          }
        ]
      };
      lineChartRef.current.setOption(lineOption);
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
    {
      title: '总课程数',
      value: dashboardData?.totalCourses || 0,
      icon: <BookOutlined />,
      color: '#c9a87c',
      trend: dashboardData?.courseTrend || '+0%',
      trendUp: true
    },
    {
      title: '总学生数',
      value: dashboardData?.totalStudents || 0,
      icon: <UserOutlined />,
      color: '#6b9b7a',
      trend: dashboardData?.studentTrend || '+0%',
      trendUp: true
    }
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
          <Empty
            description={reportsError}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`reports-container ${reportsLoading && dashboardData ? 'reports-updating' : ''}`}>
      <div className="reports-header">
        <div className="reports-header-left">
          <Title level={2} className="reports-title">教学数据分析报告</Title>
          <Text className="reports-subtitle">全面了解教学数据，助力教育决策</Text>
        </div>
        <div className="reports-header-right">
          {reportsLoading && dashboardData && (
            <div className="refresh-indicator">
              <Spin size="small" />
              <span className="refresh-text">数据更新中...</span>
            </div>
          )}
        </div>
      </div>

      <Row gutter={[24, 24]} className="stats-row">
        {statCards.map((stat, index) => (
          <Col xs={24} sm={12} lg={12} key={index}>
            <Card className="stat-card" variant="borderless">
              <div className="stat-card-content">
                <div
                  className="stat-icon-wrapper"
                  style={{ background: `${stat.color}20`, color: stat.color }}
                >
                  {stat.icon}
                </div>
                <div className="stat-info">
                  <div className="stat-value">{stat.value.toLocaleString()}</div>
                  <div className="stat-label">{stat.title}</div>
                  <div className={`stat-trend ${stat.trendUp ? 'up' : 'down'}`}>
                    {stat.trendUp ? <RiseOutlined /> : <FallOutlined />}
                    <span>{stat.trend}</span>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]} className="charts-row">
        <Col xs={24} lg={8}>
          <Card
            title={<span><PieChartOutlined /> 课程分类统计</span>}
            className="chart-card"
            variant="borderless"
          >
            <div
              ref={pieChartContainerRef}
              style={{ width: '100%', height: '280px' }}
            >
              {!courseData?.categoryStats?.length && (
                <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={<span><BarChartOutlined /> 学生年级分布</span>}
            className="chart-card"
            variant="borderless"
          >
            <div
              ref={barChartContainerRef}
              style={{ width: '100%', height: '280px' }}
            >
              {!studentData?.gradeDistribution?.length && (
                <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={<span><LineChartOutlined /> 月度教学趋势</span>}
            className="chart-card"
            variant="borderless"
          >
            <div
              ref={lineChartContainerRef}
              style={{ width: '100%', height: '280px' }}
            >
              {monthlyTrends.length === 0 && (
                <Empty description="暂无趋势数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} className="activity-row">
        <Col xs={24}>
          <Card
            title={<span><ClockCircleOutlined /> 最近活动</span>}
            className="activity-card"
            variant="borderless"
          >
            {recentActivities.length > 0 ? (
              <List
                dataSource={recentActivities}
                renderItem={(item) => (
                  <List.Item className="activity-item">
                    <div className="activity-icon-wrapper" style={{ background: `${item.color}20`, color: item.color }}>
                      {item.iconComponent}
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">{item.title}</div>
                      <div className="activity-desc">{item.desc}</div>
                    </div>
                    <Tag className="activity-time">{item.time}</Tag>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无活动记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Reports;