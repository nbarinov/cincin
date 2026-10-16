import * as React from 'react';
import { NavigationMenu } from '@base-ui/react/navigation-menu';
import { Link, useParams } from '@tanstack/react-router';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useTranslations } from 'use-intl';
import {
  DEFAULT_FRAMEWORK,
  FRAMEWORK_NAMES,
  FRAMEWORKS,
  type Framework,
} from '@/content/frameworks';
import { START_PAGE } from '@/content/pages';
import { FrameworkLogo } from './framework-logo';
import styles from './framework-switcher.module.css';

function FrameworkMenu() {
  const t = useTranslations('docs.frameworkSwitcher');
  const { framework: current = DEFAULT_FRAMEWORK } = useParams({
    strict: false,
  });

  return (
    <NavigationMenu.Root aria-label={t('label')}>
      <NavigationMenu.List className={styles.menuList}>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger className={styles.trigger}>
            <FrameworkLogo
              name={current}
              className={styles.triggerLogo}
              aria-hidden
            />
            <span className={styles.triggerName}>
              {FRAMEWORK_NAMES[current]}
            </span>
            <ChevronsUpDown className={styles.chevron} aria-hidden />
          </NavigationMenu.Trigger>

          <NavigationMenu.Content>
            <ul className={styles.options}>
              {FRAMEWORKS.map((name) => (
                <li key={name}>
                  <NavigationMenu.Link
                    closeOnClick
                    render={<FrameworkLink name={name} />}
                    className={styles.option}
                  >
                    <FrameworkLogo
                      name={name}
                      className={styles.optionLogo}
                      aria-hidden
                    />
                    <span className={styles.optionName}>
                      {FRAMEWORK_NAMES[name]}
                    </span>
                    {name === current && (
                      <Check className={styles.check} aria-hidden />
                    )}
                  </NavigationMenu.Link>
                </li>
              ))}
            </ul>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>

      <NavigationMenu.Portal>
        <NavigationMenu.Positioner
          className={styles.positioner}
          side="bottom"
          align="start"
          sideOffset={4}
        >
          <NavigationMenu.Popup className={styles.popup}>
            <NavigationMenu.Viewport />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}

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

export { FrameworkMenu, FrameworkChips };

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
