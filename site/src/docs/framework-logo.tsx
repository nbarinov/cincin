import type * as React from 'react';
import { Avatar } from '@base-ui/react/avatar';
import { mergeProps } from '@base-ui/react/merge-props';
import { FRAMEWORK_NAMES, type Framework } from '@/content/frameworks';
import angular from './logos/angular.svg';
import preact from './logos/preact.svg';
import react from './logos/react.svg';
import solid from './logos/solid.svg';
import vue from './logos/vue.svg';
import styles from './framework-logo.module.css';

const LOGOS: Partial<Record<Framework, string>> = {
  react,
  preact,
  vue,
  solid,
  angular,
};

type FrameworkLogoProps = Omit<React.ComponentProps<'span'>, 'children'> & {
  name: Framework;
};

function FrameworkLogo({ name, ...rest }: FrameworkLogoProps) {
  const src = LOGOS[name];
  const hasLogo = src !== undefined;
  const fallbackName = FRAMEWORK_NAMES[name].slice(0, 2);

  return (
    <Avatar.Root {...mergeProps<'span'>({ className: styles.logo }, rest)}>
      {hasLogo && (
        <Avatar.Image
          className={styles.image}
          src={src}
          role="presentation"
          alt=""
          keepMounted
        />
      )}
      <Avatar.Fallback
        delay={hasLogo ? 600 : undefined}
        className={styles.monogram}
      >
        {fallbackName}
      </Avatar.Fallback>
    </Avatar.Root>
  );
}

export { FrameworkLogo };
