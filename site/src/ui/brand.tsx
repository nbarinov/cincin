import { Link } from '@tanstack/react-router';
import styles from './brand.module.css';

function Brand({ section }: { section?: string }) {
  return (
    <Link
      to="/{-$locale}"
      params={(prev) => ({ locale: prev.locale })}
      activeOptions={{ exact: true }}
      className={styles.brand}
      lang="en"
    >
      <span className={styles.mark} aria-hidden>
        🥂
      </span>
      cincin
      {section && <span className={styles.section}>{section}</span>}
    </Link>
  );
}

export { Brand };
