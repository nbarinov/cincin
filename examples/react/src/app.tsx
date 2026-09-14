import * as React from 'react';
import { Toaster, toast } from 'cincin-react';
import type { ToasterOffset, ToasterPosition } from 'cincin-react';
import { ChatWidget } from './chat-widget';
import type { Clearance } from './chat-widget';

const POSITIONS: ToasterPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

type OffsetAxes = 'none' | 'vertical' | 'horizontal' | 'both';

const OFFSET_AXES: OffsetAxes[] = ['none', 'vertical', 'horizontal', 'both'];

let counter = 0;

const scenarios: Array<[label: string, run: () => void]> = [
  [
    'Message',
    () => {
      counter += 1;
      toast.message({ title: `Plain toast #${counter}` });
    },
  ],
  ['Success', () => toast.success({ title: 'Saved' })],
  [
    'Error',
    () =>
      toast.error({
        title: 'Something broke',
        description: 'The request did not survive the round trip.',
      }),
  ],
  [
    'Sticky',
    () =>
      toast.info(
        { title: 'Sticky: swipe away or hit the cross' },
        { duration: Infinity }
      ),
  ],
  [
    'Action',
    () =>
      toast.warning({
        title: 'File deleted',
        description: 'You have a few seconds to change your mind.',
        actions: [{ label: 'Undo', onClick: () => console.log('undo!') }],
      }),
  ],
  [
    // No cross: the button reads as the way out, and without it the
    // skin keeps the whole toast on one line. The toast stays
    // dismissible though, so a flick still closes it. The click would
    // dismiss the toast; preventing it lets the confirmation morph the
    // same card in place instead (the type change to success also
    // rewinds the clock).
    'Undo',
    () => {
      const toastId = toast.message({
        title: 'Message archived',
        closeButton: false,
        actions: [
          {
            label: 'Undo',
            onClick: (event) => {
              event.preventDefault();
              toast.success({ title: 'Archive restored' }, { id: toastId });
            },
          },
        ],
      });
    },
  ],
  [
    // A pair asks a question, so the card waits for the answer: no
    // expiry and no swipe, silence is not a reply. Both answers morph
    // the same card in place, so the card that asked reports back. The
    // ask is an info and the answers are not: an upsert re-derives the
    // duration and the dismissibility only when the type changes, so
    // answering in the asking type would inherit the open-ended clock.
    'Decide',
    () => {
      const toastId = toast.info(
        {
          title: 'Anna wants to join',
          description: 'She asked for access to the workspace.',
          actions: [
            {
              label: 'Decline',
              variant: 'secondary',
              onClick: (event) => {
                event.preventDefault();
                toast.message(
                  { title: 'Invitation declined' },
                  { id: toastId }
                );
              },
            },
            {
              label: 'Accept',
              onClick: (event) => {
                event.preventDefault();
                toast.success(
                  { title: 'Anna joined the workspace' },
                  { id: toastId }
                );
              },
            },
          ],
        },
        { duration: Infinity, dismissible: false }
      );
    },
  ],
  [
    // Bidi coverage from both sides: on the LTR page the card carries
    // RTL content inside an LTR layout, and with the header toggle
    // flipped it exercises the mirrored skin. Sticky, so there is
    // time to look at the glyphs.
    'عربي',
    () =>
      toast.info(
        {
          title: 'أنّا تريد الانضمام',
          description: 'طلبت الوصول إلى مساحة العمل الخاصة بك.',
        },
        { duration: Infinity }
      ),
  ],
  [
    'Promise',
    () =>
      void toast
        .promise(fakeRequest(), {
          loading: { title: 'Uploading…' },
          success: (ms: number) => ({
            title: `Uploaded in ${Math.round(ms)}ms`,
          }),
          error: () => ({ title: 'Upload failed' }),
        })
        .catch(() => {
          // The rejection is already reported as an error toast.
        }),
  ],
  [
    'Burst ×8',
    () => {
      for (let i = 1; i <= 8; i += 1) {
        counter += 1;
        toast.message({ title: `Burst ${i}/8 (#${counter})` });
      }
    },
  ],
  ['Dismiss all', () => toast.remove()],
];

function App() {
  // Direction is page state, not a Toaster prop: the skin mirrors
  // purely by CSS inheritance, so projecting dir onto the root is
  // the whole integration. The cleanup restores the attribute-free
  // root on the way back.
  const [rtl, setRtl] = React.useState(false);
  const [position, setPosition] = React.useState<ToasterPosition | undefined>();
  const [widget, setWidget] = React.useState(false);
  const [axes, setAxes] = React.useState<OffsetAxes>('vertical');
  const [clearance, setClearance] = React.useState<Clearance>({ x: 0, y: 0 });

  // The corner the toasts actually land in. The page has to repeat the
  // component's own rule to put anything else there, because the
  // default is resolved inside the Toaster, from the document's dir.
  const corner = position ?? (rtl ? 'bottom-left' : 'bottom-right');

  React.useEffect(() => {
    if (rtl) {
      document.documentElement.dir = 'rtl';

      return () => document.documentElement.removeAttribute('dir');
    }
  }, [rtl]);

  return (
    <main>
      <header>
        <h1>🥂 cincin · react skin</h1>
        <div>
          <select
            aria-label="Toaster position"
            value={position ?? ''}
            onChange={(event) =>
              setPosition(
                event.target.value === ''
                  ? undefined
                  : (event.target.value as ToasterPosition)
              )
            }
          >
            <option value="">auto</option>
            {POSITIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setRtl(!rtl)}>
            {rtl ? 'LTR' : 'RTL'}
          </button>
          <button
            type="button"
            aria-pressed={widget}
            onClick={() => setWidget(!widget)}
          >
            Widget
          </button>
          <select
            aria-label="Offset axes"
            value={axes}
            disabled={!widget}
            onChange={(event) => setAxes(toOffsetAxes(event.target.value))}
          >
            {OFFSET_AXES.map((value) => (
              <option key={value} value={value}>
                offset: {value}
              </option>
            ))}
          </select>
        </div>
      </header>
      <p>
        The ready-to-use <code>&lt;Toaster /&gt;</code> over the package
        singleton. Swipe a toast right or down, hover or tap the stack to expand
        it.
      </p>
      <section>
        {scenarios.map(([label, run]) => (
          <button key={label} type="button" onClick={run}>
            {label}
          </button>
        ))}
      </section>

      {widget && <ChatWidget position={corner} onClearance={setClearance} />}

      {/* The whole integration: the page knows what hangs in the
          corner, so it says how far to step inward. Left out, the
          toasts ride over the widget. */}
      <Toaster position={position} offset={offsetFor(axes, clearance)} />
    </main>
  );
}

export { App };

// utils

function offsetFor(
  axes: OffsetAxes,
  clearance: Clearance
): ToasterOffset | undefined {
  if (axes === 'none') {
    return undefined;
  }

  if (axes === 'vertical') {
    return clearance.y;
  }

  if (axes === 'horizontal') {
    return { x: clearance.x };
  }

  return clearance;
}

function toOffsetAxes(value: string): OffsetAxes {
  const axes = OFFSET_AXES.find((candidate) => candidate === value);

  return axes ?? 'none';
}

function fakeRequest(): Promise<number> {
  const duration = 800 + Math.random() * 1200;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.3) {
        reject(new Error('flaky network'));
      } else {
        resolve(duration);
      }
    }, duration);
  });
}
