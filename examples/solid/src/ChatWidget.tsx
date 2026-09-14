import { Show, createSignal, onCleanup } from 'solid-js';
import type { ToasterPosition } from 'cincin-solid';

type Clearance = {
  x: number;
  y: number;
};

type ChatWidgetProps = {
  position: ToasterPosition;
  onClearance: (clearance: Clearance) => void;
};

const GAP = 12;

function ChatWidget(props: ChatWidgetProps) {
  const [open, setOpen] = createSignal(false);

  const observe = (element: HTMLDivElement) => {
    const observer = new ResizeObserver(() => {
      props.onClearance({
        x: element.offsetWidth + GAP,
        y: element.offsetHeight + GAP,
      });
    });

    observer.observe(element);

    onCleanup(() => {
      observer.disconnect();
      props.onClearance({ x: 0, y: 0 });
    });
  };

  return (
    <div
      ref={observe}
      data-widget
      data-y={props.position.split('-')[0]}
      data-x={props.position.split('-')[1]}
      data-open={String(open())}
    >
      <button
        type="button"
        aria-expanded={open()}
        onClick={() => setOpen((current) => !current)}
      >
        {open() ? 'Chat ↓' : '💬'}
      </button>

      <Show when={open()}>
        <p>Hi! Nobody is reading this, it is here to take up room.</p>
      </Show>
    </div>
  );
}

export { ChatWidget };
export type { Clearance };
