import * as React from 'react';
import styles from './visually-hidden.module.css';

type VisuallyHiddenProps = React.ComponentProps<'span'>;

function VisuallyHidden({ className, ...rest }: VisuallyHiddenProps) {
  const revealed = useAltHeld();

  return (
    <span
      className={
        revealed
          ? className
          : [styles.hidden, className].filter(Boolean).join(' ')
      }
      {...rest}
    />
  );
}

export { VisuallyHidden };

// utils

function useAltHeld(): boolean {
  const [held, setHeld] = React.useState(false);

  React.useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const down = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        setHeld(true);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        setHeld(false);
      }
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return held;
}
