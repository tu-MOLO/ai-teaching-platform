import { Modal, Alert, Tag, Space, Divider, Empty } from 'antd';
import type { GrowthReportAI } from '../../services/iep';

interface Props {
  open: boolean;
  report: GrowthReportAI | null;
  onClose: () => void;
}

const LEVEL = ['0 不能完成', '1 大量辅助', '2 少量辅助', '3 独立完成'];

const ReportModal = ({ open, report, onClose }: Props) => {
  return (
    <Modal
      title="AI 学期成长报告（草稿，需教师审定）"
      open={open}
      onCancel={onClose}
      width={720}
      footer={null}
    >
      {report?.ai_disclaimer && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={report.ai_disclaimer}
        />
      )}

      {report?.needs_review && report.needs_review.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="以下内容缺少证据，需教师核实，请勿直接作为结论"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {report.needs_review.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          }
        />
      )}

      {!report && <Empty description="尚未生成报告" />}

      {report?.overview && (
        <>
          <h4>总体概述</h4>
          <p>{report.overview}</p>
        </>
      )}

      {report?.domain_progress && report.domain_progress.length > 0 && (
        <>
          <Divider orientation="left">领域变化（含证据）</Divider>
          {report.domain_progress.map((d, i) => (
            <div
              key={i}
              style={{
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <Space wrap style={{ marginBottom: 6 }}>
                <Tag color="blue">{d.domain}</Tag>
                <Tag>期初：{d.start_level != null ? LEVEL[d.start_level] : '未评'}</Tag>
                <Tag color="green">
                  期末：{d.end_level != null ? LEVEL[d.end_level] : '未评'}
                </Tag>
              </Space>
              <div style={{ marginBottom: 6 }}>{d.description}</div>
              {d.evidence_refs && d.evidence_refs.length > 0 && (
                <Space wrap>
                  <span className="muted">证据：</span>
                  {d.evidence_refs.map((r) => (
                    <Tag key={r}>{r}</Tag>
                  ))}
                </Space>
              )}
            </div>
          ))}
        </>
      )}

      {report?.goals_summary && (
        <>
          <Divider orientation="left">目标小结</Divider>
          {(report.goals_summary.achieved ?? []).length > 0 && (
            <p>
              <Tag color="success">已达成</Tag>
              {(report.goals_summary.achieved ?? []).join('；')}
            </p>
          )}
          {(report.goals_summary.in_progress ?? []).length > 0 && (
            <p>
              <Tag color="processing">进行中</Tag>
              {(report.goals_summary.in_progress ?? []).join('；')}
            </p>
          )}
          {(report.goals_summary.next_term_focus ?? []).length > 0 && (
            <p>
              <Tag>下学期重点</Tag>
              {(report.goals_summary.next_term_focus ?? []).join('；')}
            </p>
          )}
        </>
      )}

      {report?.highlights && report.highlights.length > 0 && (
        <>
          <Divider orientation="left">亮点事例</Divider>
          <ul style={{ paddingLeft: 18 }}>
            {report.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </>
      )}

      {report?.family_suggestions && report.family_suggestions.length > 0 && (
        <>
          <Divider orientation="left">给家长的建议</Divider>
          <ol style={{ paddingLeft: 18 }}>
            {report.family_suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </>
      )}
    </Modal>
  );
};

export default ReportModal;
