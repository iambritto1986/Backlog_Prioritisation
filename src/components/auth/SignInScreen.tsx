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
          layout: {
            logoPlacement: 'none',
          },
          variables: {
            colorPrimary: '#d4af37',
            colorBackground: '#16181f',
            colorText: '#e5e7eb',
            colorTextSecondary: '#a8a29e',
            colorInputBackground: '#1c1e26',
            colorInputText: '#e5e7eb',
            borderRadius: '0.75rem',
            colorDanger: '#ef4444',
          },
          elements: {
            rootBox: 'w-full mx-auto',
            cardBox: 'w-full shadow-none bg-transparent',
            header: 'hidden',
            formButtonPrimary: 'bg-[#d4af37] text-[#121318] hover:bg-[#c29e2f] font-bold border border-[#b8952c]',
            socialButtonsBlockButton: 'bg-[#f8f9fa] hover:bg-[#e2e8f0] border border-[#cbd5e1] text-[#0f172a] shadow-sm',
            socialButtonsBlockButtonText: 'text-[#0f172a] font-bold',
            socialButtonsIconButton: 'bg-[#f8f9fa] hover:bg-[#e2e8f0] border border-[#cbd5e1] shadow-sm text-[#0f172a]',
            dividerLine: 'bg-[#2e303a]',
            dividerText: 'text-[#94a3b8] font-medium text-xs',
            formFieldLabel: 'text-[#cbd5e1] font-semibold text-sm',
            formFieldInput: 'border-[#2e303a] bg-[#14151b] focus:border-[#d4af37] text-white',
            footerActionText: 'text-[#94a3b8]',
            footerActionLink: 'text-[#d4af37] hover:text-[#c29e2f] font-bold',
            footer: 'hidden',
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
