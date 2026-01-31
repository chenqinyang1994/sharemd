import { useState, useRef, useCallback, useEffect } from 'react';
import { Editor } from './components/Editor/Editor';
import { Preview } from './components/Preview/Preview';
import { ResizableDivider } from './components/ResizableDivider/ResizableDivider';
import { BackToTop } from './components/BackToTop/BackToTop';
import { ExportToolbar } from './components/ExportToolbar/ExportToolbar';
import { ViewModeToggle } from './components/ViewModeToggle/ViewModeToggle';
import { Message } from './components/Message/Message';
import { useSyncScroll } from './hooks/useSyncScroll';
import { useImageExport } from './hooks/useImageExport';
import { useViewMode } from './hooks/useViewMode';
import { DEFAULT_MARKDOWN } from './constants/defaultContent';
import logoImage from './assets/images/logo.webp';
import styles from './App.module.css';

function App() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [leftWidth, setLeftWidth] = useState(window.innerWidth / 2);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<{ content: string; duration?: number } | null>(null);

  const editorScrollerRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);

  // 视图模式管理
  const { viewMode, showMessage: showFullscreenMessage, handleModeChange, handleMessageClose: handleFullscreenMessageClose } = useViewMode();

  // 监听全屏提示
  useEffect(() => {
    if (showFullscreenMessage) {
      setGlobalMessage({ content: '按 ESC 退出全屏' });
    }
  }, [showFullscreenMessage]);

  // 包装 handleModeChange 以控制过渡动画
  const handleModeChangeWithTransition = useCallback((mode: typeof viewMode) => {
    setIsTransitioning(true);
    handleModeChange(mode);

    // 动画结束后移除过渡状态
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, [handleModeChange]);

  // 处理编辑器滚动容器准备就绪
  const handleEditorScrollerReady = useCallback((scroller: HTMLElement) => {
    (editorScrollerRef as React.MutableRefObject<HTMLElement>).current = scroller;
  }, []);

  // 同步滚动
  useSyncScroll(editorScrollerRef, previewRef);

  // 长图导出
  const { exportAsImage, exportingType, exportResult, clearResult, preload } = useImageExport(previewContentRef);

  // 监听导出结果
  useEffect(() => {
    if (exportResult) {
      setGlobalMessage({ content: exportResult.message });
      // 消费完消息后立即清理状态，防止重渲染时重复触发
      // 但这里不需要 setTimeout，因为 Message 组件自己会控制显示时长
      clearResult();
    }
  }, [exportResult, clearResult]);

  const handleDownload = () => {
    exportAsImage('download');
  };

  const handleCopy = () => {
    exportAsImage('copy');
  };

  // 使用 useCallback 确保函数引用稳定，防止 Message 组件内部 timer 被重置
  const handleMessageClose = useCallback(() => {
    setGlobalMessage(null);
    handleFullscreenMessageClose();
  }, [handleFullscreenMessageClose]);

  return (
    <div className={styles.app} data-view-mode={viewMode} data-transitioning={isTransitioning}>
      {/* Header - 全屏模式下隐藏 */}
      {viewMode !== 'fullscreen' && (
        <header className={styles.header} role="banner">
          <div className={styles.headerLeft}>
            <div className={styles.logoWrapper}>
              <img
                src={logoImage}
                alt="ShareMD Logo"
                className={styles.logo}
                width="40"
                height="40"
              />
            </div>
            <h1 className={styles.title}>ShareMD</h1>
          </div>
          <nav className={styles.headerToolbar} aria-label="工具栏">
            {/* 视图模式切换 */}
            <ViewModeToggle currentMode={viewMode} onModeChange={handleModeChangeWithTransition} />
            {/* 导出工具 */}
            <ExportToolbar
              onDownload={handleDownload}
              onCopy={handleCopy}
              onMouseEnter={preload} // 鼠标移入时预加载
              exportingType={exportingType}
            />
          </nav>
        </header>
      )}

      {/* Main Content */}
      <main className={styles.main} id="main-content" role="main">
        {/* Editor - 仅预览区时隐藏 */}
        {viewMode !== 'preview' && (
          <section
            className={styles.editorPanel}
            style={{
              width: viewMode === 'editor' ? '100%' : leftWidth,
            }}
            aria-label="Markdown 编辑器"
          >
            <Editor
              value={markdown}
              onChange={setMarkdown}
              onScrollerReady={handleEditorScrollerReady}
            />
          </section>
        )}

        {/* Divider - 仅在双栏模式和全屏模式下显示 */}
        {(viewMode === 'both' || viewMode === 'fullscreen') && (
          <ResizableDivider onResize={setLeftWidth} />
        )}

        {/* Preview - 仅编辑区时隐藏 */}
        {viewMode !== 'editor' && (
          <section
            className={styles.previewPanel}
            aria-label="Markdown 预览"
          >
            <Preview content={markdown} previewRef={previewRef} previewContentRef={previewContentRef} />
          </section>
        )}
      </main>

      {/* BackToTop */}
      <BackToTop editorRef={editorScrollerRef} previewRef={previewRef} />

      {/* 全局消息提示 */}
      {globalMessage && (
        <Message
          key={globalMessage.content} // 确保内容变化时重新触发动画
          content={globalMessage.content}
          duration={globalMessage.duration || 3000}
          onClose={handleMessageClose}
        />
      )}
    </div>
  );
}

export default App;
