import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'use-intl';
import { VisuallyHidden } from '@/ui/visually-hidden';
import styles from './code-panel.module.css';

type CodePanelProps = React.ComponentProps<'pre'> & {
  title?: string;
  allowCopy?: string;
};

function CodePanel({
  title,
  allowCopy,
  className,
  children,
  ...props
}: CodePanelProps) {
  const ref = React.useRef<HTMLPreElement>(null);

  return (
    <div className={styles.panel}>
      <div className={styles.bar}>
        <span className={styles.file}>{title}</span>
        <div className={styles.actions}>
          {allowCopy !== 'false' && <CopyButton target={ref} />}
        </div>
      </div>
      <pre {...props} ref={ref} className={[styles.pre, className].join(' ')}>
        {children}
      </pre>
    </div>
  );
}

type CopyButtonProps = { target: React.RefObject<HTMLElement | null> };

function CopyButton({ target }: CopyButtonProps) {
  const t = useTranslations('docs.code');
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), 1500);

    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className={styles.button}
      data-copied={copied || undefined}
      onClick={() => {
        const text = target.current?.textContent ?? '';

        void navigator.clipboard.writeText(text).then(() => setCopied(true));
      }}
    >
      <Copy className={styles.copy} aria-hidden />
      <Check className={styles.check} aria-hidden />
      <VisuallyHidden>{copied ? t('copied') : t('copy')}</VisuallyHidden>
    </button>
  );
}

export { CodePanel };
