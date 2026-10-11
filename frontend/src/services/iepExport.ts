import api from './api';
import { toBlob } from './response';

/**
 * 导出 IEP 为 PDF 并触发浏览器下载
 */
export const exportIEP = async (id: string, nameHint?: string): Promise<void> => {
  const resp = await api.get(`/ieps/${id}/export`, {
    responseType: 'blob',
  });
  const blob = toBlob(resp);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safe = (nameHint || id).replace(/[\\/:*?"<>|]/g, '_');
  link.href = url;
  link.download = `IEP_${safe}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
