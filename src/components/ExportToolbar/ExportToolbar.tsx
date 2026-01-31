import styles from './ExportToolbar.module.css';
import { ExportType } from '../../hooks/useImageExport';

interface ExportToolbarProps {
  onDownload: () => void;
  onCopy: () => void;
  onMouseEnter?: () => void;
  exportingType: ExportType;
}

const LoadingSpinner = () => (
  <div className={styles.loadingIcon}>
    <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  </div>
);

export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  onDownload,
  onCopy,
  onMouseEnter,
  exportingType,
}) => {
  const isDownloading = exportingType === 'download';
  const isCopying = exportingType === 'copy';
  const isBusy = exportingType !== null;

  return (
    <div className={styles.toolbar} onMouseEnter={onMouseEnter}>
      <button
        className={`${styles.button} ${styles.downloadButton}`}
        onClick={onDownload}
        disabled={isBusy}
        data-tooltip="将预览内容生成长图并下载"
      >
        {isDownloading ? (
          <>
            <LoadingSpinner />
            生成中...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8.5 1.5V11.293L11.146 8.646L12.207 9.707L8 13.914L3.793 9.707L4.854 8.646L7.5 11.293V1.5H8.5Z" />
              <path d="M2 14.5H14V15.5H2V14.5Z" />
            </svg>
            下载图片
          </>
        )}
      </button>

      <button
        className={`${styles.button} ${styles.copyButton}`}
        onClick={onCopy}
        disabled={isBusy}
        data-tooltip="将预览长图复制到剪贴板"
      >
        {isCopying ? (
          <>
            <LoadingSpinner />
            复制中...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2H12V3H4V2Z" />
              <path d="M4 5H12V6H4V5Z" />
              <path d="M4 8H12V9H4V8Z" />
              <path d="M4 11H9V12H4V11Z" />
              <path d="M2 0V14H14V0H2ZM13 13H3V1H13V13Z" />
            </svg>
            复制图片
          </>
        )}
      </button>
    </div>
  );
};
