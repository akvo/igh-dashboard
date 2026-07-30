import { TextLink } from '@/components/ui/Button';
import { t } from '@/content';

const reports = [
  {
    title: t('home.reports.cards.1.title'),
    description: t('home.reports.cards.1.description'),
    image: t('home.reports.cards.1.image'),
    url: t('home.reports.cards.1.url'),
  },
  {
    title: t('home.reports.cards.2.title'),
    description: t('home.reports.cards.2.description'),
    image: t('home.reports.cards.2.image'),
    url: t('home.reports.cards.2.url'),
  },
  {
    title: t('home.reports.cards.3.title'),
    description: t('home.reports.cards.3.description'),
    image: t('home.reports.cards.3.image'),
    url: t('home.reports.cards.3.url'),
  },
];

function HorizontalCard({ report }) {
  return (
    <div className="bg-[#FBF6EB] rounded-xl overflow-hidden flex flex-col sm:flex-row">
      <div className="h-36 sm:h-auto sm:w-40 shrink-0 relative">
        <img
          src={report.image}
          alt={report.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <h4 className="text-sm font-semibold text-black mb-2">
          {report.title}
        </h4>
        <p className="text-xs text-gray-500 mb-3">{report.description}</p>
        <TextLink
          className="mt-auto"
          href={report.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('home.reports.read_more')}
        </TextLink>
      </div>
    </div>
  );
}

function FeaturedCard({ report }) {
  return (
    <div className="bg-[#FBF6EB] rounded-xl overflow-hidden md:row-span-2 flex flex-col">
      <div className="h-44 sm:h-56 relative shrink-0">
        <img
          src={report.image}
          alt={report.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <h4 className="text-sm sm:text-base font-semibold text-black mb-2">
          {report.title}
        </h4>
        <p className="text-xs text-gray-500 mb-3">{report.description}</p>
        <TextLink
          className="mt-auto"
          href={report.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('home.reports.read_more')}
        </TextLink>
      </div>
    </div>
  );
}

export default function ReportsAndInsights() {
  return (
    <div
      className="bg-black p-5 sm:p-8 lg:p-10 mb-10"
      style={{ margin: '0 -32px' }}
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          {t('home.reports.title')}
        </h2>
        <a
          href="https://www.impactglobalhealth.org/insights/report-library"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2 text-sm font-medium text-white bg-transparent border border-white cursor-pointer hover:bg-white hover:text-black transition-colors"
        >
          {t('home.reports.cta_all')}
        </a>
      </div>
      <p className="text-sm text-white/60 mb-6">
        {t('home.reports.subtitle')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-6">
        <HorizontalCard report={reports[0]} />
        <FeaturedCard report={reports[1]} />
        <HorizontalCard report={reports[2]} />
      </div>
    </div>
  );
}
