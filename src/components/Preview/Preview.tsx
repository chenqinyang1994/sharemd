import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import styles from './Preview.module.css';
import 'highlight.js/styles/github-dark.css';

interface PreviewProps {
  content: string;
  previewRef: React.RefObject<HTMLDivElement>;
  previewContentRef: React.RefObject<HTMLDivElement>;
}

export const Preview: React.FC<PreviewProps> = ({ content, previewRef, previewContentRef }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.preview} ref={previewRef}>
      <div className={styles.previewContent} ref={previewContentRef}>
        {content.trim() === '' ? (
          <div className={styles.emptyState}>
            <p>{t('preview.emptyPlaceholder')}</p>
          </div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
};
