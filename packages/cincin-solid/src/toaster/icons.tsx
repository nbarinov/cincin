import type { ToastType } from 'cincin';
import type { Component, JSX } from 'solid-js';

/**
 * Static outline icons per toast type, as components: Solid JSX makes
 * real DOM nodes, so an element allocated once at module scope could
 * live in only one card at a time (unlike React's reusable
 * descriptors). Colors ride currentColor: the accent lands via CSS on
 * [data-cincin-icon], the loading spin animation lives in the skin
 * stylesheet. `message` renders no icon on purpose.
 */
const TYPE_ICONS: Partial<Record<ToastType, Component>> = {
  success: icon(() => (
    <>
      <circle cx="10" cy="10" r="8.2" />
      <path d="M6.6 10.4l2.3 2.3 4.5-4.9" />
    </>
  )),
  error: icon(() => (
    <>
      <circle cx="10" cy="10" r="8.2" />
      <path d="M7.4 7.4l5.2 5.2M12.6 7.4l-5.2 5.2" />
    </>
  )),
  warning: icon(() => (
    <>
      <path d="M10 3.4 18 16.6H2L10 3.4Z" />
      <path d="M10 8.6v3.2" />
      <path d="M10 14.3v.01" />
    </>
  )),
  info: icon(() => (
    <>
      <circle cx="10" cy="10" r="8.2" />
      <path d="M10 6.4v.01" />
      <path d="M10 9.4v4.2" />
    </>
  )),
  loading: icon(() => <path d="M18.2 10a8.2 8.2 0 0 0-8.2-8.2" />),
};

/** The dismiss cross: an svg glyph holds its optical size, a text one
 * drifts with the font. */
const CloseIcon: Component = icon(() => <path d="M6 6l8 8M14 6l-8 8" />);

export { TYPE_ICONS, CloseIcon };

// utils

// No focusable="false" on the svg, unlike the sibling skins: the
// attribute guards IE/legacy Edge, which Solid never ran on, and
// Solid's SVG types reject it.
function icon(children: () => JSX.Element): Component {
  return () => (
    <svg
      data-cincin-icon
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {children()}
    </svg>
  );
}
