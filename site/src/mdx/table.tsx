import type { ComponentProps } from 'react';
import styles from './table.module.css';

/* oxlint-disable jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role */
// A GFM table set as definition rows: the term in mono on the left,
// the prose on the right. The cells leave the table display for the
// grid, which strips the implicit table semantics in WebKit and Blink,
// so the roles go back on by hand: redundant to the linter, not to
// the browser.

function Table(props: ComponentProps<'table'>) {
  return <table {...props} role="table" className={styles.table} />;
}

function TableHead(props: ComponentProps<'thead'>) {
  return <thead {...props} role="rowgroup" className={styles.head} />;
}

function TableBody(props: ComponentProps<'tbody'>) {
  return <tbody {...props} role="rowgroup" className={styles.body} />;
}

function TableRow(props: ComponentProps<'tr'>) {
  return <tr {...props} role="row" className={styles.row} />;
}

function TableHeader(props: ComponentProps<'th'>) {
  return <th {...props} role="columnheader" className={styles.header} />;
}

function TableCell(props: ComponentProps<'td'>) {
  return <td {...props} role="cell" className={styles.cell} />;
}

export { Table, TableHead, TableBody, TableRow, TableHeader, TableCell };
