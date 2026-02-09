import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Editor } from './components/Editor/Editor';
import { Preview } from './components/Preview/Preview';
import { ResizableDivider } from './components/ResizableDivider/ResizableDivider';
import { BackToTop } from './components/BackToTop/BackToTop';
import { ExportToolbar } from './components/ExportToolbar/ExportToolbar';
import { ViewModeToggle } from './components/ViewModeToggle/ViewModeToggle';
import { SyncScrollToggle } from './components/SyncScrollToggle/SyncScrollToggle';
import { LanguageSwitcher } from './components/LanguageSwitcher/LanguageSwitcher';
import { Message } from './components/Message/Message';
import { useSyncScroll } from './hooks/useSyncScroll';
import { useImageExport } from './hooks/useImageExport';
import { useViewMode } from './hooks/useViewMode';
import { useSyncScrollToggle } from './hooks/useSyncScrollToggle';
import { DEFAULT_MARKDOWN } from './constants/defaultContent';
import logoImage from './assets/images/logo.webp';
import styles from './App.module.css';

function App() {
  const { t } = useTranslation();
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [leftWidth, setLeftWidth] = useState(window.innerWidth / 2);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<{ content: string; duration?: number } | null>(null);

  const editorScrollerRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);

  // 追踪 ref 更新的版本号，确保在 ref 变化时触发 useSyncScroll
  const [refVersion, setRefVersion] = useState(0);

  // 使用 ref 而非 state 来暂停同步滚动，确保在同步调用栈中立即生效
  const syncScrollPausedRef = useRef(false);

  // 视图模式管理
  const {
    viewMode,
    contentMode,
    isFullscreen,
    showMessage: showFullscreenMessage,
    handleModeChange,
    handleMessageClose: handleFullscreenMessageClose
  } = useViewMode();

  // 同步滚动开关管理
  const { isSyncScrollEnabled, toggleSyncScroll } = useSyncScrollToggle();

  // 监听全屏提示
  useEffect(() => {
    if (showFullscreenMessage) {
      setGlobalMessage({ content: t('fullscreen.exitHint') });
    }
  }, [showFullscreenMessage, t]);

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
    // ref 更新时递增版本号，触发 useSyncScroll 重新执行
    setRefVersion(v => v + 1);
  }, []);

  // 同步滚动（支持开关控制，传递 contentMode 和 refVersion 确保视图切换时重新设置监听器）
  // 通过 pauseRef 在回到顶部动画期间立即暂停同步，无需等待 React 渲染周期
  useSyncScroll(editorScrollerRef, previewRef, isSyncScrollEnabled, contentMode, refVersion, syncScrollPausedRef);

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
      {!isFullscreen && (
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
            <h1 className={styles.title}>{t('header.logo')}</h1>
          </div>
          <nav className={styles.headerToolbar} aria-label="Toolbar">
            {/* View Mode Toggle */}
            <ViewModeToggle currentMode={viewMode} onModeChange={handleModeChangeWithTransition} />
            {/* Sync Scroll Toggle */}
            <SyncScrollToggle enabled={isSyncScrollEnabled} onToggle={toggleSyncScroll} />
            {/* Export Toolbar */}
            <ExportToolbar
              onDownload={handleDownload}
              onCopy={handleCopy}
              onMouseEnter={preload}
              exportingType={exportingType}
            />
            {/* Language Switcher */}
            <LanguageSwitcher />
          </nav>
        </header>
      )}

      {/* Main Content */}
      <main className={styles.main} id="main-content" role="main">
        {/* Editor - 仅预览区时隐藏 */}
        {contentMode !== 'preview' && (
          <section
            className={styles.editorPanel}
            style={{
              width: contentMode === 'editor' ? '100%' : leftWidth,
            }}
            aria-label="Markdown Editor"
          >
            <Editor
              value={markdown}
              onChange={setMarkdown}
              onScrollerReady={handleEditorScrollerReady}
            />
          </section>
        )}

        {/* Divider - Only show in dual-pane mode */}
        {contentMode === 'both' && (
          <ResizableDivider onResize={setLeftWidth} />
        )}

        {/* Preview - Hide in editor-only mode */}
        {contentMode !== 'editor' && (
          <section
            className={styles.previewPanel}
            aria-label="Markdown Preview"
          >
            <Preview content={markdown} previewRef={previewRef} previewContentRef={previewContentRef} />
          </section>
        )}
      </main>

      {/* BackToTop */}
      <BackToTop
        editorRef={editorScrollerRef}
        previewRef={previewRef}
        onScrollStart={() => { syncScrollPausedRef.current = true; }}
        onScrollEnd={() => { syncScrollPausedRef.current = false; }}
      />

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
