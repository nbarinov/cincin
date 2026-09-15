import { useRender } from '@base-ui/react/use-render';
import { mergeProps } from '@base-ui/react/merge-props';
import styles from './pill.module.css';

type PillProps = useRender.ComponentProps<'button'>;

function Pill(props: PillProps) {
  const { render, ...rest } = props;

  return useRender({
    defaultTagName: 'button',
    render,
    props: mergeProps<'button'>({ className: styles.pill }, rest),
  });
}

export { Pill };
export type { PillProps };
