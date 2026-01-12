'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navigation />
      <main className="pt-28 pb-24 md:pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </>
  );
}
