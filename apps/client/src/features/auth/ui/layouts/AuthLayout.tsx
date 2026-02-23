import * as React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="bg-gray-dark-mode-950 relative min-h-screen flex flex-col">
      {/* Fun gradient background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top-right blob */}
        <div className="absolute -top-20 right-1/4 w-125 h-125 rounded-full bg-brand-solid opacity-40 blur-[100px]" />
        {/* Bottom-left blob */}
        <div className="absolute -bottom-32 -left-20 w-100 h-100 rounded-full bg-brand-solid opacity-50 blur-[80px]" />
        {/* Center-right accent */}
        <div className="absolute top-1/2 -right-20 w-75 h-75 rounded-full bg-brand-solid opacity-30 blur-[60px]" />
      </div>

      {/* Main content - centered */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <div className="w-full max-w-100">{children}</div>
      </main>

      {/* Footer */}
      {/* TODO change to avila footer */}
      <footer className="relative z-10 py-6 text-center text-xs txt-quaternary-400">
        <p>© {new Date().getFullYear()} HabitFlow</p>
      </footer>
    </div>
  );
}
