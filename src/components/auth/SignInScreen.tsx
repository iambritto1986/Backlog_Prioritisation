import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { BananaLogo } from '../common/BananaLogo';

/**
 * Shown when a visitor is not signed in AND is not on a guest workshop link
 * (see the auth gate in App.tsx). Facilitators/workspace owners sign in here;
 * guests never see this screen at all — they go straight in via a share link.
 */
export const SignInScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#e5e7eb] flex flex-col items-center justify-center px-4 py-12 font-sans">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#14161f] border border-[#d4af37]/40 flex items-center justify-center shadow-xs">
          <BananaLogo className="w-6 h-6" />
        </div>
        <span className="font-black text-xl tracking-tight text-white">Banana OS</span>
      </div>

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
        }}
      />

      <p className="text-[11px] text-stone-500 mt-6 max-w-sm text-center leading-relaxed">
        Joining a workshop from a shared link? You don't need an account — open
        the link you were sent and you'll go straight in as a guest.
      </p>
    </div>
  );
};
