'use client';

// =========================================================
// <PageHeader/> — title + description + Share button
// =========================================================
//
// Generic page header used at the top of dashboard pages.
// The Share button copies the current URL to the clipboard
// so a teammate can land on the same view (filters carried
// via query string).

import { useState } from 'react';
import { UploadIcon } from '@/components/icons';

export default function PageHeader({ title, description }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
      <div className="flex-1">
        <h1 className="text-xl sm:text-2xl font-bold text-black mb-2">{title}</h1>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-black bg-orange-500 hover:bg-black hover:text-white whitespace-nowrap transition-colors"
        onClick={handleShare}
      >
        {copied ? 'Copied!' : 'Share this view'}
        <UploadIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
