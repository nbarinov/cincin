import { useRender } from '@base-ui/react/use-render';
import { mergeProps } from '@base-ui/react/merge-props';
import { cva, type VariantProps } from 'class-variance-authority';
import styles from './pill.module.css';

const pill = cva(styles.pill, {
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

type PillProps = useRender.ComponentProps<'button'> & VariantProps<typeof pill>;

function Pill(props: PillProps) {
  const { render, variant, className, ...rest } = props;

  return useRender({
    defaultTagName: 'button',
    render,
    props: mergeProps<'button'>(
      { className: pill({ variant, className }) },
      rest
    ),
  });
}

export { Pill };
export type { PillProps };
