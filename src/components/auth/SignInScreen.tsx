import React from 'react';
import { SignIn } from '@clerk/clerk-react';

/**
 * The sign-in panel itself — no page chrome, so it can be embedded wherever
 * it's needed (currently: docked into LandingPage.tsx). Facilitators/
 * workspace owners sign in here; guests never see this at all — they go
 * straight in via a share link (see the auth gate in App.tsx).
 *
 * Two overrides here matter and are easy to lose on a future edit:
 *  - `header: 'hidden'` — Clerk's own default heading reads "Sign in to My
 *    Application" (that's the Clerk *application* name, set in the Clerk
 *    Dashboard, not something this code controls) which duplicates/clashes
 *    with our own "Sign in to your workspace" caption above the widget.
 *  - `socialButtonsBlockButton` / `socialButtonsIconButton` get an explicit
 *    light background — without it, provider marks that are dark by default
 *    (GitHub's especially) render as good as invisible against this app's
 *    near-black theme.
 */
export const SignInScreen: React.FC = () => {
  return (
    <div className="w-full">
      <SignIn
        appearance={{
          variables: {
            colorPrimary: '#d4af37',
            colorBackground: '#121318',
            colorText: '#e5e7eb',
            colorTextSecondary: '#a8a29e',
            colorInputBackground: '#18191c',
            colorInputText: '#e5e7eb',
            borderRadius: '0.75rem',
          },
          elements: {
            rootBox: 'w-full mx-auto',
            card: 'w-full shadow-xl',
            header: 'hidden',
            socialButtonsBlockButton: 'bg-white hover:bg-stone-100 border border-stone-200 text-stone-900',
            socialButtonsBlockButtonText: 'text-stone-900 font-semibold',
            socialButtonsIconButton: 'bg-white hover:bg-stone-100 border border-stone-200',
            dividerLine: 'bg-[#1f222c]',
            dividerText: 'text-stone-500',
            formFieldLabel: 'text-stone-300',
            footerActionText: 'text-stone-500',
            footer: 'bg-transparent',
          },
        }}
      />

      <p className="text-[11px] text-stone-500 mt-5 max-w-sm text-center leading-relaxed mx-auto">
        Joining a workshop from a shared link? You don't need an account — open
        the link you were sent and you'll go straight in as a guest.
      </p>
    </div>
  );
};
