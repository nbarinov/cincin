<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { Toaster, toast } from 'cincin-vue';

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

// Direction is page state, not a Toaster prop: the skin mirrors
// purely by CSS inheritance, so projecting dir onto the root is
// the whole integration. The cleanup restores the attribute-free
// root on the way back.
const rtl = ref(false);

watchEffect((onCleanup) => {
  if (rtl.value) {
    document.documentElement.dir = 'rtl';
    onCleanup(() => document.documentElement.removeAttribute('dir'));
  }
});

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
</script>

<template>
  <main>
    <header>
      <h1>🥂 cincin · vue skin</h1>
      <button type="button" @click="rtl = !rtl">
        {{ rtl ? 'LTR' : 'RTL' }}
      </button>
    </header>
    <p>
      The ready-to-use <code>&lt;Toaster /&gt;</code> over the package
      singleton. Swipe a toast right or down, hover or tap the stack to expand
      it.
    </p>
    <section>
      <button
        v-for="[label, run] of scenarios"
        :key="label"
        type="button"
        @click="run"
      >
        {{ label }}
      </button>
    </section>

    <Toaster />
  </main>
</template>
