import { Link } from '@tanstack/react-router';
import { isLocale } from '@/shared/i18n/config';
import styles from './brand.module.css';

function Brand() {
  return (
    <Link
      to="/{-$locale}"
      params={(prev) => ({
        locale:
          prev.locale !== undefined && isLocale(prev.locale)
            ? prev.locale
            : undefined,
      })}
      activeOptions={{ exact: true }}
      className={styles.brand}
      lang="en"
    >
      🥂 cincin
    </Link>
  );
}

export { Brand };
