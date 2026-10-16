import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslations } from 'use-intl';
import {
  FRAMEWORK_NAMES,
  FRAMEWORKS,
  type Framework,
} from '@/content/frameworks';
import { START_PAGE } from '@/content/pages';
import { FrameworkLogo } from './framework-logo';
import styles from './framework-switcher.module.css';

function FrameworkChips() {
  const t = useTranslations('docs.frameworkSwitcher');
  const labelId = React.useId();

  return (
    <nav className={styles.chips} aria-labelledby={labelId}>
      <p id={labelId} className={styles.heading}>
        {t('label')}
      </p>
      <ul className={styles.grid}>
        {FRAMEWORKS.map((name) => (
          <li key={name} className={styles.cell}>
            <FrameworkLink name={name} className={styles.chip}>
              <FrameworkLogo name={name} className={styles.logo} aria-hidden />
              {FRAMEWORK_NAMES[name]}
            </FrameworkLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export { FrameworkChips };

// components

type FrameworkLinkProps = Omit<React.ComponentProps<'a'>, 'href'> & {
  name: Framework;
};

function FrameworkLink({ name, ...props }: FrameworkLinkProps) {
  return (
    <Link
      to="/{-$locale}/docs/$framework/$"
      params={(prev) => ({
        locale: prev.locale,
        framework: name,
        _splat: prev._splat ?? START_PAGE,
      })}
      {...props}
    />
  );
}
