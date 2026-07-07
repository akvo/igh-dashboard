import StatCard from '@/components/ui/StatCard';
import { ChartEmptyState } from '@/components/charts';

function EmptyStub() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <h3 className="text-base sm:text-lg font-bold text-black mb-2">
        Individual priority analysis
      </h3>
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-12 h-12 rounded-md bg-orange-100 mb-4" />
        <h4 className="text-lg font-bold text-black mb-1">Nothing selected</h4>
        <p className="text-sm text-gray-500 max-w-xs text-center">
          Please select filters you&apos;d like to include in the overview
        </p>
      </div>
    </div>
  );
}

function ActiveStub() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col gap-6">
      <h3 className="text-base sm:text-lg font-bold text-black">
        Individual priority analysis
      </h3>
      <h4 className="text-base font-bold text-black">
        Pipeline for priority: TPP: For next generation drug-susceptibility testing
      </h4>
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <div className="flex flex-col gap-4">
          <StatCard
            title="Number of candidates linked to selected priority"
            value="—"
            description="Pending data confirmation"
            variant="number"
          />
          <StatCard
            title="Target population"
            value="Pending data confirmation."
            variant="text"
          />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-base font-bold text-black mb-2">Pipeline build up</h4>
          <ChartEmptyState variant="bar" height={220} />
        </div>
      </div>
    </div>
  );
}

export default {
  title: 'WHO Priority alignment/IndividualPriorityAnalysisSection',
};

export const EmptyState = { render: () => <EmptyStub /> };
export const ActiveLayoutPlaceholder = { render: () => <ActiveStub /> };
