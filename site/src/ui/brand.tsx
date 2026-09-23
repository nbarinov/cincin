import { Link } from '@tanstack/react-router';
import styles from './brand.module.css';

function Brand() {
  return (
    <Link
      to="/{-$locale}"
      params={(prev) => ({ locale: prev.locale })}
      activeOptions={{ exact: true }}
      className={styles.brand}
      lang="en"
    >
      🥂 cincin
    </Link>
  );
}

export { Brand };
