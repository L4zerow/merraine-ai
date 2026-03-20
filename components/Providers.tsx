'use client';

import { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';
import { UserProvider } from '@/lib/userContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </ToastProvider>
  );
}
