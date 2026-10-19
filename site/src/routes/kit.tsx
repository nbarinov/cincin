import { createFileRoute, redirect } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { FRAMEWORKS } from '@/content/frameworks';
import { FrameworkLogo } from '@/docs/framework-logo';
import { FrameworkChips, FrameworkMenu } from '@/docs/framework-switcher';
import { Toc } from '@/docs/toc';
import { IconButton } from '@/ui/icon-button';
import { VisuallyHidden } from '@/ui/visually-hidden';

const SCHEMES = ['light', 'dark'] as const;
const VARIANTS = ['outline', 'card', 'quiet'] as const;
const ANCHORS = [
  { url: '#basic-usage', title: 'Basic usage', depth: 2 },
  { url: '#types', title: 'Types', depth: 2 },
  { url: '#promise', title: 'toast.promise()', depth: 3 },
  { url: '#options', title: 'Options', depth: 2 },
  { url: '#dismissing', title: 'Dismissing', depth: 2 },
];

export const Route = createFileRoute('/kit')({
  component: RouteComponent,
  beforeLoad() {
    if (!import.meta.env.DEV) {
      throw redirect({ to: '/{-$locale}' });
    }
  },
});

function RouteComponent() {
  return (
    <div>
      {SCHEMES.map((scheme) => (
        <section
          key={scheme}
          style={{
            colorScheme: scheme,
            padding: '2rem',
            backgroundColor: 'var(--gray-1)',
            color: 'var(--gray-12)',
          }}
        >
          <h2>IconButton · {scheme}</h2>

          <div style={{ display: 'flex', gap: '1rem' }}>
            {VARIANTS.map((variant) => (
              <IconButton key={variant} variant={variant}>
                <X />
                <VisuallyHidden>Close</VisuallyHidden>
              </IconButton>
            ))}
          </div>

          <h2>FrameworkLogo · {scheme}</h2>

          {[16, 22, 32].map((size) => (
            <div
              key={size}
              style={{
                display: 'flex',
                gap: '1rem',
                fontSize: size,
                marginBlock: '0.75rem',
              }}
            >
              {FRAMEWORKS.map((framework) => (
                <FrameworkLogo key={framework} name={framework} />
              ))}
            </div>
          ))}

          <h2>FrameworkChips · {scheme}</h2>

          <div
            style={{
              inlineSize: '20rem',
              padding: '1rem 0.875rem',
              border: '1px solid var(--gray-6)',
              borderRadius: '1rem',
              backgroundColor: 'var(--panel)',
            }}
          >
            <FrameworkChips />
          </div>

          <h2>FrameworkMenu · {scheme}</h2>

          <div style={{ inlineSize: '13.75rem' }}>
            <FrameworkMenu />
          </div>

          <h2>Toc · {scheme}</h2>

          <div style={{ minBlockSize: '2.75rem', inlineSize: '30rem' }}>
            <Toc anchors={ANCHORS} />
          </div>
        </section>
      ))}
    </div>
  );
}
