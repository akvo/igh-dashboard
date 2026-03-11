'use client';

import { useMemo } from 'react';
import { CloseIcon } from '../icons';
import { MALARIA_GROUP } from '@/lib/filterGroups';
import { displayHealthArea } from '@/lib/transformations/constants';

export default function DiseaseListPanel({ isOpen, onClose, diseases = [] }) {
  const grouped = useMemo(() => {
    if (!diseases.length) return {};
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
  }, [diseases]);

  const sortedAreas = useMemo(
    () => Object.keys(grouped).sort((a, b) => a.localeCompare(b)),
    [grouped],
  );

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
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer bg-transparent border-0"
            aria-label="Close panel"
          >
            <CloseIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-73px)] p-6">
          {sortedAreas.map((area) => {
            const malariaStrains = MALARIA_GROUP.members.filter(
              (m) => m !== MALARIA_GROUP.label && grouped[area]?.includes(m),
            );
            const otherDiseases = (grouped[area] || []).filter(
              (name) => !malariaStrains.includes(name),
            );
            return (
              <div key={area} className="mb-6">
                <h3 className="text-sm font-bold text-black mb-3">{displayHealthArea(area)}</h3>
                {malariaStrains.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-black mb-1.5">Malaria</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-3">
                      {malariaStrains.map((name) => (
                        <span key={name} className="text-sm text-gray-700">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {otherDiseases.map((name) => (
                    <span key={name} className="text-sm text-gray-700">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
