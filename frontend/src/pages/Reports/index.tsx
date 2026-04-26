import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, List, Tag, Spin, message, Empty } from 'antd';
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
import { getDashboardReport, getCourseReport, getStudentReport, getMonthlyTrends } from '../../services/report';
import type { DashboardReport, CourseReport, StudentReport, ActivityItem, MonthlyTrendItem } from '../../services/report';
import './index.css';

const { Title, Text } = Typography;

// 图标映射表
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

// 获取图标组件
const getIconComponent = (iconName: string): React.ReactNode => {
  return iconMapping[iconName] || <FileTextOutlined />;
};

// 处理活动数据，将字符串图标转换为组件
const processActivities = (activities: ActivityItem[] | undefined): Array<ActivityItem & { iconComponent: React.ReactNode }> => {
  if (!activities || activities.length === 0) {
    return [];
  }
  return activities.map(activity => ({
    ...activity,
    iconComponent: getIconComponent(activity.icon)
  }));
};

// 自动刷新间隔（毫秒）- 60秒
const AUTO_REFRESH_INTERVAL = 60 * 1000;

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardReport | null>(null);
  const [courseData, setCourseData] = useState<CourseReport | null>(null);
  const [studentData, setStudentData] = useState<StudentReport | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrendItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = React.useRef<number | null>(null);

  const fetchReportData = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);
      const [dashboard, courses, students, trends] = await Promise.all([
        getDashboardReport(),
        getCourseReport(),
        getStudentReport(),
        getMonthlyTrends(7) // 获取最近7个月的数据
      ]);
      setDashboardData(dashboard);
      setCourseData(courses);
      setStudentData(students);
      setMonthlyTrends(trends);
    } catch (error) {
      if (!silent) {
        message.error('获取报告数据失败');
        setError('获取报告数据失败，请稍后重试');
      }
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // 初始加载和启动自动刷新
  useEffect(() => {
    fetchReportData();

    // 启动自动刷新
    refreshIntervalRef.current = window.setInterval(() => {
      // 静默刷新，不显示loading状态
      fetchReportData(true);
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        window.clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // 监听页面可见性变化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面重新可见时立即刷新并恢复自动刷新
        fetchReportData(true);
        if (refreshIntervalRef.current) {
          window.clearInterval(refreshIntervalRef.current);
        }
        refreshIntervalRef.current = window.setInterval(() => {
          fetchReportData(true);
        }, AUTO_REFRESH_INTERVAL);
      } else {
        // 页面不可见时停止自动刷新
        if (refreshIntervalRef.current) {
          window.clearInterval(refreshIntervalRef.current);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 统计卡片数据
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

  // 处理后的活动数据
  const recentActivities = processActivities(dashboardData?.recentActivities);

  if (loading) {
    return (
      <div className="reports-container">
        <div className="reports-loading">
          <Spin size="large" />
          <p>加载报告数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-container">
        <div className="reports-loading">
          <Empty
            description={error}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`reports-container ${isRefreshing ? 'reports-updating' : ''}`}>
      {/* 页面标题 */}
      <div className="reports-header">
        <div className="reports-header-left">
          <Title level={2} className="reports-title">教学数据分析报告</Title>
          <Text className="reports-subtitle">全面了解教学数据，助力教育决策</Text>
        </div>
        <div className="reports-header-right">
          {isRefreshing && (
            <div className="refresh-indicator">
              <Spin size="small" />
              <span className="refresh-text">数据更新中...</span>
            </div>
          )}
        </div>
      </div>

      {/* 统计卡片区域 */}
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

      {/* 图表区域 */}
      <Row gutter={[24, 24]} className="charts-row">
        {/* 课程分类统计 */}
        <Col xs={24} lg={8}>
          <Card
            title={<span><PieChartOutlined /> 课程分类统计</span>}
            className="chart-card"
            variant="borderless"
          >
            <div className="chart-placeholder pie-chart">
              {courseData?.categoryStats && courseData.categoryStats.length > 0 ? (
                courseData.categoryStats.map((item, index) => (
                  <div key={index} className="chart-legend-item">
                    <span
                      className="legend-color"
                      style={{ background: item.color }}
                    />
                    <span className="legend-label">{item.name}</span>
                    <span className="legend-value">{item.value}门</span>
                    <span className="legend-percent">({item.percent}%)</span>
                  </div>
                ))
              ) : (
                <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Card>
        </Col>

        {/* 学生年级分布 */}
        <Col xs={24} lg={8}>
          <Card
            title={<span><BarChartOutlined /> 学生年级分布</span>}
            className="chart-card"
            variant="borderless"
          >
            <div className="chart-placeholder bar-chart">
              {studentData?.gradeDistribution && studentData.gradeDistribution.length > 0 ? (
                studentData.gradeDistribution.map((item, index) => (
                  <div key={index} className="bar-chart-item">
                    <span className="bar-label">{item.grade}</span>
                    <div className="bar-wrapper">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${item.percent}%`,
                          background: item.color
                        }}
                      />
                    </div>
                    <span className="bar-value">{item.count}人</span>
                  </div>
                ))
              ) : (
                <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Card>
        </Col>

        {/* 月度教学趋势 */}
        <Col xs={24} lg={8}>
          <Card
            title={<span><LineChartOutlined /> 月度教学趋势</span>}
            className="chart-card"
            variant="borderless"
          >
            <div className="chart-placeholder line-chart">
              <div className="trend-summary">
                <div className="trend-item">
                  <Text className="trend-label">本月课程</Text>
                  <Text className="trend-value" style={{ color: '#c9a87c' }}>
                    {dashboardData?.monthlyCourses || 0}门
                  </Text>
                </div>
                <div className="trend-item">
                  <Text className="trend-label">本月学生</Text>
                  <Text className="trend-value" style={{ color: '#6b9b7a' }}>
                    {dashboardData?.monthlyStudents || 0}人
                  </Text>
                </div>
                <div className="trend-item">
                  <Text className="trend-label">本月教案</Text>
                  <Text className="trend-value" style={{ color: '#7a9ab8' }}>
                    {(monthlyTrends[monthlyTrends.length - 1]?.newLessonPlans || 0)}个
                  </Text>
                </div>
              </div>
              <div className="mini-chart">
                {monthlyTrends.length > 0 ? (
                  <>
                    <div className="mini-chart-bars">
                      {(() => {
                        // 计算最大值用于归一化
                        const maxValue = Math.max(
                          ...monthlyTrends.map(t => Math.max(t.newCourses, t.newStudents, t.newLessonPlans || 0)),
                          1 // 避免除以0
                        );
                        return monthlyTrends.map((trend, index) => {
                          const height = Math.max((trend.newCourses / maxValue) * 100, 10);
                          const isLast = index === monthlyTrends.length - 1;
                          return (
                            <div
                              key={index}
                              className="mini-bar"
                              style={{
                                height: `${height}%`,
                                background: isLast ? '#c9a87c' : '#e0e0e0'
                              }}
                              title={`${trend.month}: 新增${trend.newCourses}门课程, ${trend.newStudents}名学生, ${trend.newLessonPlans || 0}个教案`}
                            />
                          );
                        });
                      })()}
                    </div>
                    <div className="mini-chart-labels">
                      {monthlyTrends.map((trend, index) => (
                        <span key={index}>{trend.month.slice(5).replace('月', '')}月</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <Empty description="暂无趋势数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 最近活动列表 */}
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
