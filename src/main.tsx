import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {ClerkProvider} from '@clerk/clerk-react';
import {dark} from '@clerk/themes';
import App from './App.tsx';
import './index.css';

// Vite inlines VITE_-prefixed env vars into the bundle at BUILD TIME.
// This is the publishable key — it's meant to be public, safe in the browser.
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing VITE_CLERK_PUBLISHABLE_KEY. Set it as an environment variable ' +
      'before running `vite build` (on Render: add it to the product-planner ' +
      'service so it is present during the build step, not just at runtime).'
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      // App-wide dark theme for every Clerk-rendered surface — the
      // UserButton popover, and critically the "Manage account" UserProfile
      // modal it opens, which is a separate portalled component tree that
      // per-component `appearance` overrides elsewhere (SignInScreen,
      // AppHeader) never reached. Without this, that modal fell back to
      // Clerk's default light theme regardless of the rest of the app.
      // `baseTheme` is the base layer; SignInScreen.tsx and AppHeader.tsx
      // still layer their own `appearance` on top for fine-tuning, and
      // Clerk merges the two rather than one replacing the other.
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#d4af37',
          colorBackground: '#121318',
          colorText: '#e5e7eb',
          colorTextSecondary: '#a8a29e',
          colorInputBackground: '#18191c',
          colorInputText: '#e5e7eb',
          borderRadius: '0.75rem',
        },
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
);
