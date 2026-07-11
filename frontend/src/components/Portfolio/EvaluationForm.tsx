/**
 * EvaluationForm 评价表单组件
 *
 * @description
 * 用于对学生作品进行多维度评价的表单组件，支持自定义评价维度、评分统计展示和响应式布局。
 * 适用于教学场景中的作品评价、能力评估等场景。
 *
 * @example
 * // 基础用法 - 使用默认评价维度
 * <EvaluationForm />
 *
 * @example
 * // 自定义评价维度
 * <EvaluationForm
 *   dimensions={[
 *     { name: '逻辑思维', description: '学生逻辑推理和分析能力的表现', maxScore: 5 },
 *     { name: '创新能力', description: '学生在解决问题时的创新思维', maxScore: 5 },
 *     { name: '团队协作', description: '学生在小组活动中的合作表现', maxScore: 5 }
 *   ]}
 * />
 *
 * @author AI Teaching Platform
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import {
  Form,
  Rate,
  Space,
  Typography,
  Tooltip,
  Card,
  Statistic,
  Row,
  Col,
  Collapse,
  theme,
  Divider
} from 'antd';
import {
  InfoCircleOutlined,
  StarOutlined,
  CheckCircleOutlined,
  CalculatorOutlined,
  BarChartOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { Panel } = Collapse;
const { useToken } = theme;

/**
 * 评价维度配置接口
 */
export interface EvaluationDimension {
  /** 维度名称 */
  name: string;
  /** 维度说明/描述 */
  description: string;
  /** 最大分值（默认为5） */
  maxScore?: number;
}

/**
 * 评价表单Props接口
 */
export interface EvaluationFormProps {
  /** 自定义评价维度配置，不传则使用默认维度 */
  dimensions?: EvaluationDimension[];
  /** 是否显示统计信息（默认为true） */
  showStatistics?: boolean;
  /** 是否使用折叠面板分组显示（默认为false） */
  useCollapse?: boolean;
  /** 表单名称前缀 */
  formNamePrefix?: string;
}

/**
 * 默认评价维度配置
 */
const DEFAULT_DIMENSIONS: EvaluationDimension[] = [
  {
    name: '认知理解',
    description: '学生对知识概念的理解程度，包括记忆、理解和应用能力'
  },
  {
    name: '操作技能',
    description: '学生动手操作和实践技能的掌握程度'
  },
  {
    name: '创意表达',
    description: '学生在作品中的创新思维和个性化表达能力'
  },
  {
    name: '合作参与',
    description: '学生在小组活动中的参与度、协作精神和沟通能力'
  },
  {
    name: '注意力维持',
    description: '学生在学习过程中的专注度和任务坚持性'
  }
];

/**
 * 评价表单组件
 *
 * @param props - 组件属性
 * @returns React组件
 */
const EvaluationForm: React.FC<EvaluationFormProps> = ({
  dimensions,
  showStatistics = true,
  useCollapse = false,
  formNamePrefix = 'evaluation'
}) => {
  const { token } = useToken();
  const form = Form.useFormInstance();
  const evaluationValues = Form.useWatch(formNamePrefix, form) || {};

  // 使用传入的维度或默认维度
  const effectiveDimensions = dimensions || DEFAULT_DIMENSIONS;

  /**
   * 计算评分统计数据
   */
  const statistics = useMemo(() => {
    const scores: number[] = [];
    let ratedCount = 0;

    effectiveDimensions.forEach((dim) => {
      const score = evaluationValues[dim.name];
      if (typeof score === 'number' && score > 0) {
        scores.push(score);
        ratedCount++;
      }
    });

    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const averageScore = scores.length > 0 ? totalScore / scores.length : 0;
    const maxPossibleScore = effectiveDimensions.reduce(
      (sum, dim) => sum + (dim.maxScore || 5),
      0
    );

    return {
      totalScore,
      averageScore: Number(averageScore.toFixed(1)),
      ratedCount,
      totalCount: effectiveDimensions.length,
      maxPossibleScore,
      completionRate: Math.round((ratedCount / effectiveDimensions.length) * 100)
    };
  }, [evaluationValues, effectiveDimensions]);

  /**
   * 渲染维度标签（带Tooltip提示）
   */
  const renderDimensionLabel = (dimension: EvaluationDimension) => (
    <Space size={4}>
      <span>{dimension.name}</span>
      <Tooltip
        title={dimension.description}
        placement="right"
        styles={{ root: { maxWidth: 300 } }}
      >
        <InfoCircleOutlined
          style={{
            color: token.colorPrimary,
            cursor: 'help',
            fontSize: 14
          }}
        />
      </Tooltip>
    </Space>
  );

  /**
   * 渲染单个评分项
   */
  const renderRateItem = (dimension: EvaluationDimension, index: number) => (
    <Form.Item
      key={dimension.name}
      name={[formNamePrefix, dimension.name]}
      label={renderDimensionLabel(dimension)}
      style={{ marginBottom: index === effectiveDimensions.length - 1 ? 0 : 16 }}
    >
      <Rate
        allowHalf
        count={dimension.maxScore || 5}
        character={<StarOutlined />}
        style={{
          fontSize: 24,
          color: token.colorWarning
        }}
      />
    </Form.Item>
  );

  /**
   * 渲染统计信息卡片
   */
  const renderStatistics = () => (
    <Card
      size="small"
      title={
        <Space>
          <BarChartOutlined />
          <span>评分统计</span>
        </Space>
      }
      style={{
        marginTop: 24,
        backgroundColor: token.colorBgContainer,
        borderRadius: token.borderRadiusLG
      }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Statistic
            title="总分"
            value={statistics.totalScore}
            suffix={`/ ${statistics.maxPossibleScore}`}
            prefix={<CalculatorOutlined />}
            valueStyle={{ color: token.colorPrimary }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="平均分"
            value={statistics.averageScore}
            suffix="分"
            prefix={<StarOutlined />}
            valueStyle={{ color: token.colorWarning }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="已评维度"
            value={statistics.ratedCount}
            suffix={`/ ${statistics.totalCount}`}
            prefix={<CheckCircleOutlined />}
            valueStyle={{
              color:
                statistics.ratedCount === statistics.totalCount
                  ? token.colorSuccess
                  : token.colorTextSecondary
            }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="完成度"
            value={statistics.completionRate}
            suffix="%"
            prefix={<BarChartOutlined />}
            valueStyle={{
              color:
                statistics.completionRate === 100
                  ? token.colorSuccess
                  : token.colorInfo
            }}
          />
        </Col>
      </Row>

      <Divider style={{ margin: '16px 0' }} />

      <Text type="secondary" style={{ fontSize: 12 }}>
        注：评分范围 0.5 - 5 分，支持半星评分。请将鼠标悬停在维度名称旁的
        <InfoCircleOutlined style={{ margin: '0 4px' }} />
        图标查看详细说明。
      </Text>
    </Card>
  );

  /**
   * 渲染折叠面板形式
   */
  const renderCollapseForm = () => (
    <Collapse
      defaultActiveKey={['1']}
      style={{
        backgroundColor: token.colorBgContainer,
        borderRadius: token.borderRadiusLG
      }}
    >
      <Panel
        header={
          <Space>
            <StarOutlined style={{ color: token.colorWarning }} />
            <span>评价维度</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              (已评 {statistics.ratedCount}/{statistics.totalCount})
            </Text>
          </Space>
        }
        key="1"
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {effectiveDimensions.map((dimension, index) =>
            renderRateItem(dimension, index)
          )}
        </Space>
      </Panel>
    </Collapse>
  );

  /**
   * 渲染卡片形式
   */
  const renderCardForm = () => (
    <Card
      title={
        <Space>
          <StarOutlined style={{ color: token.colorWarning }} />
          <span>评价维度</span>
        </Space>
      }
      style={{
        backgroundColor: token.colorBgContainer,
        borderRadius: token.borderRadiusLG
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {effectiveDimensions.map((dimension, index) =>
          renderRateItem(dimension, index)
        )}
      </Space>
    </Card>
  );

  return (
    <div className="evaluation-form" style={{ width: '100%' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {useCollapse ? renderCollapseForm() : renderCardForm()}

        {showStatistics && renderStatistics()}
      </Space>
    </div>
  );
};

export default EvaluationForm;
