'use client';

import { useEffect, useState } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';

const GA_MEASUREMENT_ID = 'G-6KD1ZFE7PF';

export default function Analytics() {
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    setIsProduction(
      window.location.hostname === 'pipeline.impactglobalhealth.org'
    );
  }, []);

  if (!isProduction) return null;
  return <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />;
}
