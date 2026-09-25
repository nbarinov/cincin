import type { ComponentProps } from 'react';
import styles from './typography.module.css';

function H2({ children, ...props }: ComponentProps<'h2'>) {
  return (
    <h2 {...props} className={styles.h2}>
      {children}
    </h2>
  );
}

function H3({ children, ...props }: ComponentProps<'h3'>) {
  return (
    <h3 {...props} className={styles.h3}>
      {children}
    </h3>
  );
}

function Paragraph(props: ComponentProps<'p'>) {
  return <p {...props} className={styles.paragraph} />;
}

function UnorderedList(props: ComponentProps<'ul'>) {
  return <ul {...props} className={styles.list} />;
}

function OrderedList(props: ComponentProps<'ol'>) {
  return <ol {...props} className={styles.list} />;
}

function Anchor({ children, ...props }: ComponentProps<'a'>) {
  return (
    <a {...props} className={styles.anchor}>
      {children}
    </a>
  );
}

function Code(props: ComponentProps<'code'>) {
  return <code {...props} className={styles.code} />;
}

export { H2, H3, Paragraph, UnorderedList, OrderedList, Anchor, Code };
