import { useRender } from '@base-ui/react/use-render';
import { mergeProps } from '@base-ui/react/merge-props';
import { cva, type VariantProps } from 'class-variance-authority';
import { LucideProvider } from 'lucide-react';
import styles from './icon-button.module.css';

const iconButton = cva(styles.iconButton, {
  variants: {
    variant: {
      outline: styles.outline,
      card: styles.card,
      quiet: styles.quiet,
    },
  },
  defaultVariants: {
    variant: 'outline',
  },
});

type IconButtonProps = useRender.ComponentProps<'button'> &
  VariantProps<typeof iconButton>;

function IconButton(props: IconButtonProps) {
  const { render, className, variant, children, ...rest } = props;

  return useRender({
    defaultTagName: 'button',
    render,
    props: mergeProps<'button'>(
      {
        className: iconButton({ variant, className }),
        children: (
          <LucideProvider className={styles.glyph}>{children}</LucideProvider>
        ),
      },
      rest
    ),
  });
}

export { IconButton };
export type { IconButtonProps };
