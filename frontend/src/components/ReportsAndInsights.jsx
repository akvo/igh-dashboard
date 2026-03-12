import { TextLink } from '@/components/ui/Button';

const reports = [
  {
    title: 'Funding for global health R&D in 2024',
    description: 'An overview of key takeaways from the G-FINDER survey',
    image:
      'https://cdn.impactglobalhealth.org/media/2025%20G-FINDER%20cover-404x341.webp',
    url: 'https://www.impactglobalhealth.org/insights/report-library/funding-for-global-health-rd-in-2024',
  },
  {
    title: 'The Ripple Effect 2.0: from global health to domestic value',
    description:
      'Executive briefing presenting findings from three case studies demonstrating how selected global health innovations enhance health outcomes and provide economic value across the US, UK, Japan, and Europe.',
    image:
      'https://cdn.impactglobalhealth.org/media/Ripple%20effect%202.0%20image.jpg',
    url: 'https://www.impactglobalhealth.org/insights/report-library/ripple-effect-2',
  },
  {
    title: '100 Days Mission: 5th Implementation Report and Scorecard',
    description:
      "The 100 Days Mission's 5th Implementation Report and Scorecard highlight limited progress has been made in an R&D ecosystem that remains reactive and reliant on US funding.",
    image:
      'https://cdn.impactglobalhealth.org/media/Untitled%20design%20(7)-404x404.webp',
    url: 'https://www.impactglobalhealth.org/insights/report-library/ipps-report-2026',
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
          Read more
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
          Read more
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
          Reports and insights
        </h2>
        <a
          href="https://www.impactglobalhealth.org/insights/report-library"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2 text-sm font-medium text-white bg-transparent border border-white cursor-pointer hover:bg-white hover:text-black transition-colors"
        >
          View all insights
        </a>
      </div>
      <p className="text-sm text-white/60 mb-6">
        Discover the insights that two decades of global health data have given
        us.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-6">
        <HorizontalCard report={reports[0]} />
        <FeaturedCard report={reports[1]} />
        <HorizontalCard report={reports[2]} />
      </div>
    </div>
  );
}
