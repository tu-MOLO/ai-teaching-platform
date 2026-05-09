/**
 * AbilityRadar 能力雷达图组件
 *
 * 用于展示学生能力发展的雷达图组件，基于学生的评价记录计算各项能力的平均值。
 * 支持认知理解、操作技能、创意表达、合作参与、注意力维持五个维度的可视化展示。
 *
 * @component
 * @example
 * ```tsx
 * import AbilityRadar from './components/Portfolio/AbilityRadar';
 *
 * // 展示特定学生的能力雷达图
 * <AbilityRadar studentId="student-123" />
 * ```
 *
 * @interface AbilityData
 * @property {number} cognitive - 认知理解能力得分
 * @property {number} skill - 操作技能得分
 * @property {number} creativity - 创意表达能力得分
 * @property {number} cooperation - 合作参与得分
 * @property {number} attention - 注意力维持得分
 *
 * @interface AbilityRadarProps
 * @property {string} studentId - 学生ID，用于获取该学生的评价数据
 */

import React, { useState, useEffect } from 'react';
import { Card, Spin, Empty, Button } from 'antd';
import { RadarChartOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { portfolioService } from '@/services/portfolio';
import type { PortfolioItem } from '@/types/portfolio';

const PORTFOLIO_PAGE_SIZE = 100;

/**
 * 能力数据接口
 */
export interface AbilityData {
  /** 认知理解能力得分 */
  cognitive: number;
  /** 操作技能得分 */
  skill: number;
  /** 创意表达能力得分 */
  creativity: number;
  /** 合作参与得分 */
  cooperation: number;
  /** 注意力维持得分 */
  attention: number;
}

/**
 * 能力雷达图组件Props接口
 */
interface AbilityRadarProps {
  /** 学生ID，用于获取该学生的评价数据 */
  studentId: string;
}

/**
 * 能力雷达图组件
 *
 * 基于学生的评价记录数据，使用ECharts渲染能力发展雷达图
 *
 * @param props - 组件属性
 * @returns React组件
 */
const AbilityRadar: React.FC<AbilityRadarProps> = ({ studentId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);
  const [evaluationItems, setEvaluationItems] = useState<PortfolioItem[]>([]);

  /**
   * 获取学生档案数据并计算能力平均值
   */
  const fetchPortfolio = async () => {
    try {
      const items: PortfolioItem[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const response = await portfolioService.getPortfolios({
          student_id: studentId,
          page,
          page_size: PORTFOLIO_PAGE_SIZE,
        });
        items.push(...(response.data || []));
        totalPages = response.pages || 1;
        page += 1;
      } while (page <= totalPages);

      // 筛选评价类型的记录
      const filteredItems = items.filter((item: PortfolioItem) => item.type === 'evaluation');
      setEvaluationItems(filteredItems);

      // 如果没有评价数据，不设置图表数据
      if (filteredItems.length === 0) {
        setLoading(false);
        return;
      }

      // 计算各项能力的平均分
      const avgScores: AbilityData = {
        cognitive: 0,
        skill: 0,
        creativity: 0,
        cooperation: 0,
        attention: 0,
      };

      // 累加各项评分
      filteredItems.forEach((item: PortfolioItem) => {
        if (item.cognitive_score !== undefined) avgScores.cognitive += item.cognitive_score;
        if (item.skill_score !== undefined) avgScores.skill += item.skill_score;
        if (item.creativity_score !== undefined) avgScores.creativity += item.creativity_score;
        if (item.cooperation_score !== undefined) avgScores.cooperation += item.cooperation_score;
        if (item.attention_score !== undefined) avgScores.attention += item.attention_score;
      });

      // 计算平均值
      Object.keys(avgScores).forEach((key) => {
        (avgScores as any)[key] = ((avgScores as any)[key] / filteredItems.length) / 20;
      });

      // 设置图表数据
      setChartData({
        radar: {
          indicator: [
            { name: '认知理解', max: 5 },
            { name: '操作技能', max: 5 },
            { name: '创意表达', max: 5 },
            { name: '合作参与', max: 5 },
            { name: '注意力维持', max: 5 },
          ],
          radius: '65%',
          splitNumber: 5,
          axisName: {
            color: '#333',
            fontSize: 12,
          },
        },
        tooltip: {
          trigger: 'item',
        },
        legend: {
          data: ['当前水平'],
          bottom: 0,
        },
        series: [
          {
            name: '能力发展',
            type: 'radar',
            data: [
              {
                value: [
                  avgScores.cognitive || 0,
                  avgScores.skill || 0,
                  avgScores.creativity || 0,
                  avgScores.cooperation || 0,
                  avgScores.attention || 0,
                ],
                name: '当前水平',
                areaStyle: {
                  color: 'rgba(24, 144, 255, 0.3)',
                },
                lineStyle: {
                  color: '#1890ff',
                  width: 2,
                },
                itemStyle: {
                  color: '#1890ff',
                },
              },
            ],
          },
        ],
      });
    } catch (error) {
      console.error('获取能力数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载或studentId变化时获取数据
  useEffect(() => {
    fetchPortfolio();
  }, [studentId]);

  // 加载状态显示
  if (loading) {
    return <Spin />;
  }

  // 无评价数据时显示空状态
  if (evaluationItems.length === 0) {
    return (
      <Card className="ability-radar-card">
        <Empty
          image={<RadarChartOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
          description="暂无评价数据"
          style={{ padding: '40px 0' }}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/portfolio/${studentId}/add-record`)}
          >
            添加评价记录
          </Button>
        </Empty>
      </Card>
    );
  }

  return (
    <Card className="ability-radar-card">
      <ReactECharts option={chartData} style={{ height: 400 }} />
    </Card>
  );
};

export default AbilityRadar;
