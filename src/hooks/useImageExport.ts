import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export type ExportType = 'download' | 'copy' | null;

interface ExportResult {
  success: boolean;
  message: string;
}

// 全局缓存 Promise，确保只加载一次
let html2canvasPromise: Promise<any> | null = null;

const loadHtml2Canvas = () => {
  if (!html2canvasPromise) {
    html2canvasPromise = import('html2canvas');
  }
  return html2canvasPromise;
};

export const useImageExport = (previewRef: React.RefObject<HTMLElement>) => {
  const { t } = useTranslation();
  const [exportingType, setExportingType] = useState<ExportType>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  // 组件挂载后延迟预加载
  useEffect(() => {
    const timer = setTimeout(() => {
      loadHtml2Canvas();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const clearResult = () => setExportResult(null);

  const preload = useCallback(() => {
    loadHtml2Canvas();
  }, []);

  const downloadImage = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sharemd-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsImage = async (action: 'download' | 'copy') => {
    if (!previewRef.current) return;

    setExportingType(action);
    setExportResult(null);

    try {
      await document.fonts.ready;
      const module = await loadHtml2Canvas();
      const html2canvas = module.default;
      const element = previewRef.current;

      // 焦点管理
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.focus();

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        // 保持性能优化：忽略脚本
        ignoreElements: (element: Element) => element.tagName === 'SCRIPT',
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!blob) throw new Error(t('message.downloadError'));

      if (action === 'download') {
        downloadImage(blob);
        setExportResult({ success: true, message: t('message.downloadSuccess') });
      } else {
        try {
          // 预检查：如果不在安全上下文（如 http ip），直接抛出明确错误，进入降级流程
          if (!window.isSecureContext) {
            throw new Error('InsecureContext');
          }

          // 强制使用 window 对象访问，绕过局部作用域可能的遮蔽
          // @ts-ignore
          const ClipboardItemPolyfill = window.ClipboardItem;

          if (!ClipboardItemPolyfill) {
            throw new Error('ClipboardItem API unavailable');
          }

          const item = new ClipboardItemPolyfill({
            [blob.type]: blob
          });

          await navigator.clipboard.write([item]);
          setExportResult({ success: true, message: t('message.copySuccess') });
        } catch (err) {
          console.error('Copy attempt failed:', err);

          // 仅在明确失败时才降级下载
          downloadImage(blob);

          let errorMsg = t('message.copyError');

          // 智能错误提示
          if (err instanceof Error) {
             if (err.message === 'InsecureContext') {
               errorMsg = t('message.copyError');
             } else if (err.name === 'NotAllowedError') {
               errorMsg = t('message.copyError');
             } else if (err.message.includes('unavailable')) {
               errorMsg = t('message.copyError');
             }
          }

          setExportResult({ success: false, message: errorMsg });
        }
      }
    } catch (error) {
      console.error('Export process error:', error);
      setExportResult({
        success: false,
        message: t('message.downloadError')
      });
    } finally {
      setExportingType(null);
    }
  };

  return {
    exportAsImage,
    exportingType,
    exportResult,
    clearResult,
    preload
  };
};
