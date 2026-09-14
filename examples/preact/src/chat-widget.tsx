import { useEffect, useRef, useState } from 'preact/hooks';
import type { ToasterPosition } from 'cincin-preact';

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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [y, x] = position.split('-');

  useEffect(() => {
    const element = ref.current;

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
  }, [onClearance]);

  return (
    <div ref={ref} data-widget data-y={y} data-x={x} data-open={open}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? 'Chat ↓' : '💬'}
      </button>

      {open && <p>Hi! Nobody is reading this, it is here to take up room.</p>}
    </div>
  );
}

export { ChatWidget };
export type { Clearance };
