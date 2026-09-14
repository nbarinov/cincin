import * as React from 'react';
import type { RefCallback } from 'react';
import type { ToasterPosition } from 'cincin-react';

type Clearance = {
  x: number;
  y: number;
};

type ChatWidgetProps = {
  position: ToasterPosition;
  onClearance: (clearance: Clearance) => void;
};

const GAP = 12;

function ChatWidget({ position, onClearance }: ChatWidgetProps) {
  const [open, setOpen] = React.useState(false);
  const [y, x] = position.split('-');

  const ref = React.useCallback<RefCallback<HTMLElement>>(
    (element) => {
      if (element === null) {
        return;
      }

      const observer = new ResizeObserver(() => {
        onClearance({
          x: element.offsetWidth + GAP,
          y: element.offsetHeight + GAP,
        });
      });

      observer.observe(element);

      return () => {
        observer.disconnect();
        onClearance({ x: 0, y: 0 });
      };
    },
    [onClearance]
  );

  return (
    <div ref={ref} data-widget data-y={y} data-x={x} data-open={open}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Chat ↓' : '💬'}
      </button>

      {open && <p>Hi! Nobody is reading this, it is here to take up room.</p>}
    </div>
  );
}

export { ChatWidget };
export type { Clearance };
