import { Modal, Alert, Tag, Space, Divider, Empty, Button } from 'antd';
import type { GrowthReportAI } from '../../services/iep';

interface Props {
  open: boolean;
  report: GrowthReportAI | null;
  onClose: () => void;
  /** 导出文件名前缀（一般是「学生姓名 学期」）。 */
  exportName?: string;
}

const LEVEL = ['0 不能完成', '1 大量辅助', '2 少量辅助', '3 独立完成'];

/**
 * AI 输出不保证严格贴合模板：列表项可能是字符串，也可能是 { description, evidence_refs }
 * 这类对象。这里统一压成可读文本，避免把对象直接当成 React 子节点渲染而崩溃。
 */
const asText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(asText).filter(Boolean).join('；');
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const mainKey = ['description', 'text', 'content', 'summary', 'goal', 'title'].find(
      (k) => typeof obj[k] === 'string' && (obj[k] as string).trim()
    );
    const main = mainKey ? (obj[mainKey] as string).trim() : '';
    const refs = Array.isArray(obj.evidence_refs)
      ? obj.evidence_refs.map(asText).filter(Boolean)
      : [];
    return [main, refs.length > 0 ? `（依据：${refs.join('、')}）` : '']
      .filter(Boolean)
      .join(' ');
  }
  return String(value);
};

/** 把「字符串数组 / 单值 / 非法值」统一成字符串数组。 */
const asTextList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(asText).filter(Boolean);
  const text = asText(value);
  return text ? [text] : [];
};

/** 把报告转成便于保存/分享的 Markdown 文本。 */
export const buildReportMarkdown = (
  report: GrowthReportAI,
  exportName?: string
): string => {
  const lines: string[] = [];
  lines.push(`# ${exportName ? `${exportName} ` : ''}学期成长报告（草稿）`);

  const disclaimer = asText(report.ai_disclaimer);
  if (disclaimer) lines.push(`> ${disclaimer}`);

  const needsReview = asTextList(report.needs_review);
  if (needsReview.length > 0) {
    lines.push('', '## 待核实（缺证据，请勿直接作为结论）');
    needsReview.forEach((m) => lines.push(`- ${m}`));
  }

  const overview = asText(report.overview);
  if (overview) lines.push('', '## 总体概述', '', overview);

  const domainProgress = Array.isArray(report.domain_progress)
    ? report.domain_progress
    : [];
  if (domainProgress.length > 0) {
    lines.push('', '## 领域变化');
    domainProgress.forEach((d) => {
      lines.push('', `### ${asText(d?.domain) || '未分领域'}`);
      lines.push(`- 期初：${d?.start_level != null ? LEVEL[d.start_level] : '未评'}`);
      lines.push(`- 期末：${d?.end_level != null ? LEVEL[d.end_level] : '未评'}`);
      const desc = asText(d?.description);
      if (desc) lines.push(`- 变化：${desc}`);
      const evidence = asTextList(d?.evidence_refs);
      if (evidence.length > 0) lines.push(`- 证据：${evidence.join('、')}`);
    });
  }

  const achieved = asTextList(report.goals_summary?.achieved);
  const inProgress = asTextList(report.goals_summary?.in_progress);
  const nextTermFocus = asTextList(report.goals_summary?.next_term_focus);
  if (achieved.length > 0 || inProgress.length > 0 || nextTermFocus.length > 0) {
    lines.push('', '## 目标小结');
    if (achieved.length > 0) lines.push(`- 已达成：${achieved.join('；')}`);
    if (inProgress.length > 0) lines.push(`- 进行中：${inProgress.join('；')}`);
    if (nextTermFocus.length > 0)
      lines.push(`- 下学期重点：${nextTermFocus.join('；')}`);
  }

  const highlights = asTextList(report.highlights);
  if (highlights.length > 0) {
    lines.push('', '## 亮点事例');
    highlights.forEach((h) => lines.push(`- ${h}`));
  }

  const familySuggestions = asTextList(report.family_suggestions);
  if (familySuggestions.length > 0) {
    lines.push('', '## 给家长的建议');
    familySuggestions.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }

  return `${lines.join('\n')}\n`;
};

const ReportModal = ({ open, report, onClose, exportName }: Props) => {
  const needsReview = asTextList(report?.needs_review);
  const domainProgress = Array.isArray(report?.domain_progress)
    ? report.domain_progress
    : [];
  const achieved = asTextList(report?.goals_summary?.achieved);
  const inProgress = asTextList(report?.goals_summary?.in_progress);
  const nextTermFocus = asTextList(report?.goals_summary?.next_term_focus);
  const highlights = asTextList(report?.highlights);
  const familySuggestions = asTextList(report?.family_suggestions);
  const overview = asText(report?.overview);
  const disclaimer = asText(report?.ai_disclaimer);

  const handleExport = () => {
    if (!report) return;
    const blob = new Blob([buildReportMarkdown(report, exportName)], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportName ? `${exportName}_` : ''}学期成长报告.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      title="AI 学期成长报告（草稿，需教师审定）"
      open={open}
      onCancel={onClose}
      width={720}
      zIndex={1050}
      footer={
        <Space>
          <Button onClick={handleExport} disabled={!report}>
            导出为 Markdown
          </Button>
          <Button type="primary" onClick={onClose}>
            关闭
          </Button>
        </Space>
      }
    >
      {disclaimer && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={disclaimer}
        />
      )}

      {needsReview.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="以下内容缺少证据，需教师核实，请勿直接作为结论"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {needsReview.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          }
        />
      )}

      {!report && <Empty description="尚未生成报告" />}

      {overview && (
        <>
          <h4>总体概述</h4>
          <p>{overview}</p>
        </>
      )}

      {domainProgress.length > 0 && (
        <>
          <Divider orientation="left">领域变化（含证据）</Divider>
          {domainProgress.map((d, i) => {
            const evidence = asTextList(d?.evidence_refs);
            return (
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
                  <Tag color="blue">{asText(d?.domain) || '未分领域'}</Tag>
                  <Tag>
                    期初：{d?.start_level != null ? LEVEL[d.start_level] : '未评'}
                  </Tag>
                  <Tag color="green">
                    期末：{d?.end_level != null ? LEVEL[d.end_level] : '未评'}
                  </Tag>
                </Space>
                <div style={{ marginBottom: 6 }}>{asText(d?.description)}</div>
                {evidence.length > 0 && (
                  <Space wrap>
                    <span className="muted">证据：</span>
                    {evidence.map((r) => (
                      <Tag key={r}>{r}</Tag>
                    ))}
                  </Space>
                )}
              </div>
            );
          })}
        </>
      )}

      {(achieved.length > 0 ||
        inProgress.length > 0 ||
        nextTermFocus.length > 0) && (
        <>
          <Divider orientation="left">目标小结</Divider>
          {achieved.length > 0 && (
            <p>
              <Tag color="success">已达成</Tag>
              {achieved.join('；')}
            </p>
          )}
          {inProgress.length > 0 && (
            <p>
              <Tag color="processing">进行中</Tag>
              {inProgress.join('；')}
            </p>
          )}
          {nextTermFocus.length > 0 && (
            <p>
              <Tag>下学期重点</Tag>
              {nextTermFocus.join('；')}
            </p>
          )}
        </>
      )}

      {highlights.length > 0 && (
        <>
          <Divider orientation="left">亮点事例</Divider>
          <ul style={{ paddingLeft: 18 }}>
            {highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </>
      )}

      {familySuggestions.length > 0 && (
        <>
          <Divider orientation="left">给家长的建议</Divider>
          <ol style={{ paddingLeft: 18 }}>
            {familySuggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </>
      )}
    </Modal>
  );
};

export default ReportModal;
