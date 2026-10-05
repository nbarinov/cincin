import * as React from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { isPackageManager, packageManager } from '@/shared/package-manager';
import styles from './code-tabs.module.css';

type TabsProps = { defaultValue?: string; children: React.ReactNode };

function CodeBlockTabs({ defaultValue, children }: TabsProps) {
  const stored = React.useSyncExternalStore(
    packageManager.subscribe,
    packageManager.getSnapshot,
    packageManager.getServerSnapshot
  );

  return (
    <Tabs.Root
      className={styles.tabs}
      value={stored ?? defaultValue ?? null}
      onValueChange={(value) => {
        if (isPackageManager(value)) {
          packageManager.apply(value);
        }
      }}
    >
      {children}
    </Tabs.Root>
  );
}

function CodeBlockTabsList({ children }: { children: React.ReactNode }) {
  return <Tabs.List className={styles.list}>{children}</Tabs.List>;
}

type TabProps = { value: string; children: React.ReactNode };

function CodeBlockTabsTrigger({ value, children }: TabProps) {
  return (
    <Tabs.Tab value={value} className={styles.tab}>
      {children}
    </Tabs.Tab>
  );
}

function CodeBlockTab({ value, children }: TabProps) {
  return <Tabs.Panel value={value}>{children}</Tabs.Panel>;
}

export { CodeBlockTabs, CodeBlockTabsList, CodeBlockTabsTrigger, CodeBlockTab };
