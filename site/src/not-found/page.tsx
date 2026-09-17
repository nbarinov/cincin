import { Link } from '@tanstack/react-router';
import { useTranslations } from 'use-intl';
import { isLocale } from '@/shared/i18n/config';
import { REPO_URL } from '@/shared/site';
import { Pill } from '@/ui/pill';
import styles from './page.module.css';

function NotFoundPage() {
  const t = useTranslations('notFound');

  return (
    <main className={styles.main}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.lede}>{t('lede')}</p>

      <ul className={styles.links} aria-label={t('links.label')}>
        <li>
          <Pill
            variant="card"
            render={
              <Link
                to="/{-$locale}"
                params={(prev) => ({
                  locale:
                    prev.locale !== undefined && isLocale(prev.locale)
                      ? prev.locale
                      : undefined,
                })}
                activeOptions={{ exact: true }}
              >
                {t('links.home')}
              </Link>
            }
          />
        </li>
        <li>
          <Pill
            variant="card"
            render={
              <a href={`${REPO_URL}/tree/main/examples`}>
                {t('links.examples')}
              </a>
            }
          />
        </li>
        <li>
          <Pill
            variant="card"
            render={
              <a href={`${REPO_URL}/blob/main/CONTRIBUTING.md`}>
                {t('links.contributing')}
              </a>
            }
          />
        </li>
      </ul>

      <a className={styles.report} href={`${REPO_URL}/issues`}>
        {t('report')}
      </a>
    </main>
  );
}

export { NotFoundPage };
