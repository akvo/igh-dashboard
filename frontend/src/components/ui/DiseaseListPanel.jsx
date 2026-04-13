'use client';

import { useMemo } from 'react';
import { CloseIcon } from '../icons';
import { MALARIA_GROUP } from '@/lib/filterGroups';
import { displayHealthArea } from '@/lib/transformations/constants';

/**
 * Build a grouped, alphabetically sorted disease map keyed by global health area.
 * Malaria strains are nested under a "Malaria" sub-header.
 */
function groupDiseases(diseases) {
  if (!diseases?.length) return {};
  const map = {};
  const seen = new Set();
  for (const d of diseases) {
    const area = d.global_health_area;
    const name = d.disease_group_name;
    const key = `${area}::${name}`;
    if (!area || !name || seen.has(key)) continue;
    seen.add(key);
    if (!map[area]) map[area] = [];
    map[area].push(name);
  }
  for (const area of Object.keys(map)) {
    map[area].sort((a, b) => a.localeCompare(b));
  }
  return map;
}

function DiseaseSection({ title, grouped, onExplore }) {
  const sortedAreas = useMemo(
    () => Object.keys(grouped).sort((a, b) => a.localeCompare(b)),
    [grouped],
  );

  if (sortedAreas.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        {title}
      </h3>
      {sortedAreas.map((area) => {
        const malariaStrains = MALARIA_GROUP.members.filter(
          (m) => m !== MALARIA_GROUP.label && grouped[area]?.includes(m),
        );
        const otherDiseases = (grouped[area] || []).filter(
          (name) => !malariaStrains.includes(name),
        );
        return (
          <div key={area} className="mb-5">
            <h4 className="text-sm font-bold text-black mb-2">{displayHealthArea(area)}</h4>
            {malariaStrains.length > 0 && (
              <div className="mb-2">
                <h5 className="text-sm font-semibold text-black mb-1.5 pl-1">Malaria</h5>
                <div className="flex flex-col gap-1 pl-3">
                  {malariaStrains.map((name) => (
                    <button
                      key={name}
                      onClick={() => onExplore(name, area)}
                      className="group flex items-center justify-between text-sm text-gray-700 hover:text-black hover:bg-gray-50 rounded px-2 py-1.5 -mx-1 transition-colors cursor-pointer bg-transparent border-0 text-left w-full"
                    >
                      <span>{name}</span>
                      <span className="text-xs text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                        Explore &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1">
              {otherDiseases.map((name) => (
                <button
                  key={name}
                  onClick={() => onExplore(name)}
                  className="group flex items-center justify-between text-sm text-gray-700 hover:text-black hover:bg-gray-50 rounded px-2 py-1.5 -mx-1 transition-colors cursor-pointer bg-transparent border-0 text-left w-full"
                >
                  <span>{name}</span>
                  <span className="text-xs text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    Explore &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DiseaseListPanel({ isOpen, onClose, diseases = [], secondaryDiseases = [] }) {
  const primaryGrouped = useMemo(() => groupDiseases(diseases), [diseases]);
  const secondaryGrouped = useMemo(() => groupDiseases(secondaryDiseases), [secondaryDiseases]);

  const handleExplore = (diseaseName, globalHealthArea) => {
    onClose();
    if (diseaseName) {
      const params = new URLSearchParams();
      if (globalHealthArea) params.set('gha', globalHealthArea);
      params.set('disease', diseaseName);
      window.location.href = `/portfolio-analysis?${params.toString()}`;
    } else {
      window.location.href = '/portfolio-analysis';
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-black">
            Diseases covered in platform
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExplore('')}
              className="text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors cursor-pointer bg-transparent border-0 whitespace-nowrap"
            >
              Find out more &rarr;
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer bg-transparent border-0"
              aria-label="Close panel"
            >
              <CloseIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100%-73px)] p-6">
          <DiseaseSection
            title="Primary diseases"
            grouped={primaryGrouped}
            onExplore={handleExplore}
          />
          <DiseaseSection
            title="Secondary diseases"
            grouped={secondaryGrouped}
            onExplore={handleExplore}
          />
        </div>
      </div>
    </>
  );
}
