import { useState, useEffect, useCallback } from 'react';

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

      if (!blob) throw new Error('生成图片失败');

      if (action === 'download') {
        downloadImage(blob);
        setExportResult({ success: true, message: '图片已开始下载' });
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
          setExportResult({ success: true, message: '已复制图片到剪贴板' });
        } catch (err) {
          console.error('复制尝试失败:', err);

          // 仅在明确失败时才降级下载
          downloadImage(blob);

          let errorMsg = '复制失败，已自动下载';

          // 智能错误提示
          if (err instanceof Error) {
             if (err.message === 'InsecureContext') {
               errorMsg = 'HTTP 环境不支持复制，已自动下载';
             } else if (err.name === 'NotAllowedError') {
               errorMsg = '复制权限被拒，已自动下载';
             } else if (err.message.includes('unavailable')) {
               errorMsg = '浏览器不支持复制图片，已自动下载';
             }
          }

          setExportResult({ success: false, message: errorMsg });
        }
      }
    } catch (error) {
      console.error('导出流程异常:', error);
      setExportResult({
        success: false,
        message: '导出失败，请重试'
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
