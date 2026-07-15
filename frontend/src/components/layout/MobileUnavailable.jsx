'use client';

import { InfoIcon } from '@/components/icons';
import { t } from '@/content';

// Fallback screen shown below the 1024px breakpoint. Pure presentation —
// no state, no props. Sized to fill the viewport below the 90px fixed
// Header so the CTA is always vertically centred regardless of the
// user's screen height.

export default function MobileUnavailable() {
  return (
    <div className="min-h-[calc(100vh-90px)] flex items-center justify-center px-4">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="bg-orange-50 rounded-lg p-3 mb-6">
          <InfoIcon className="w-6 h-6 text-orange-500" />
        </div>
        <h1 className="text-3xl font-bold text-black mb-3">
          {t('layout.mobile.heading')}
        </h1>
        <p className="text-base text-gray-500 mb-8">
          {t('layout.mobile.body')}
        </p>
        <a
          href="https://www.impactglobalhealth.org/"
          className="inline-flex items-center bg-orange-500 text-black px-4 py-2.5 text-sm font-medium no-underline cursor-pointer hover:bg-black hover:text-white transition-colors"
        >
          {t('layout.mobile.cta')}
        </a>
      </div>
    </div>
  );
}
