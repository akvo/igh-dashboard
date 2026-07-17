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
import { t } from '@/content';

export default function PageHeader({ title, description }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Accept a single string, an array of strings (rendered as separate <p>
  // blocks), or a React element (rendered directly — used when the caller
  // passes a <Markdown> node for formatted multi-paragraph intros).
  const isNode = description !== null && typeof description === 'object' && !Array.isArray(description);
  const paragraphs = isNode ? null : (Array.isArray(description) ? description : [description]);

  return (
    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
      <div className="flex-1">
        <h1 className="text-xl sm:text-2xl font-bold text-black mb-2">{title}</h1>
        <div className="space-y-3 text-sm text-gray-500">
          {isNode ? description : paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
      <button
        data-tour="share-button"
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-black bg-orange-500 hover:bg-black hover:text-white whitespace-nowrap transition-colors"
        onClick={handleShare}
      >
        {copied ? t('layout.page_header.share_copied') : t('layout.page_header.share')}
        <UploadIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
