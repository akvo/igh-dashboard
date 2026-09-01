'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { MailIcon, ChartIcon, ListIcon, CloseIcon } from '@/components/icons';
import { t } from '@/content';
import { Markdown } from '@/content/Markdown';

// -------------------------------------------------------------------
// Table of contents — one per tab
// -------------------------------------------------------------------
const METHODOLOGY_TOC = [
  { id: 'scope', label: t('methodology.toc_labels.scope') },
  { id: 'where-information-comes-from', label: t('methodology.toc_labels.where_information') },
  { id: 'how-a-record-reaches', label: t('methodology.toc_labels.how_record_reaches') },
  { id: 'definitions', label: t('methodology.toc_labels.definitions') },
  { id: 'limitations', label: t('methodology.toc_labels.limitations') },
  { id: 'corrections', label: t('methodology.toc_labels.corrections') },
  { id: 'version', label: t('methodology.toc_labels.version') },
];

const WHAT_WE_TRACK_TOC = [
  { id: 'annex-a', label: t('methodology.toc_annex_labels.annex_a'), prefix: 'A' },
  { id: 'annex-b', label: t('methodology.toc_annex_labels.annex_b'), prefix: 'B' },
  { id: 'annex-c', label: t('methodology.toc_annex_labels.annex_c'), prefix: 'C' },
];

// -------------------------------------------------------------------
// Disease-product tracking tables
// -------------------------------------------------------------------

// Partial cells are represented as objects: { v: 'Partial', criterion: '<id>', disease: '<name>', product: '<area>' }
// Full inclusion cells are just strings.
const p = (criterion, disease, product) => ({ v: 'Partial', criterion, disease, product });

const NEGLECTED_DISEASES = [
  ['Streptococcus pneumoniae', '\u2013', p('pneumococcal-vaccines', 'Streptococcus pneumoniae', 'Vaccines'), '\u2013', '\u2713', '\u2013', '\u2013'],
  ['Neisseria meningitidis', '\u2013', p('meningococcal-vaccines', 'Neisseria meningitidis', 'Vaccines'), '\u2013', '\u2713', '\u2013', '\u2013'],
  ['Both S. pneumoniae and N. meningitidis', '\u2013', '\u2013', '\u2013', '\u2713', '\u2013', '\u2013'],
  ['Buruli ulcer', '\u2713', '\u2713', '\u2013', '\u2713', '\u2013', '\u2013'],
  ['Cryptococcal meningitis', '\u2713', '\u2013', '\u2713', '\u2013', '\u2013', '\u2013'],
  ['Dengue', '\u2713', p('dengue-rotavirus-vaccines', 'Dengue', 'Vaccines'), '\u2713', '\u2713', '\u2013', '\u2713'],
  ['Rotavirus', '\u2013', p('dengue-rotavirus-vaccines', 'Rotavirus', 'Vaccines'), '\u2013', '\u2013', '\u2013', '\u2013'],
  ['Cholera', p('diarrhoeal', 'Cholera', 'Drugs'), '\u2713', p('diarrhoeal', 'Cholera', 'Biologics'), '\u2713', '\u2013', '\u2013'],
  ['Shigella', p('diarrhoeal', 'Shigella', 'Drugs'), '\u2713', p('diarrhoeal', 'Shigella', 'Biologics'), '\u2713', '\u2013', '\u2013'],
  ['Cryptosporidiosis', p('diarrhoeal', 'Cryptosporidiosis', 'Drugs'), '\u2713', p('diarrhoeal', 'Cryptosporidiosis', 'Biologics'), '\u2713', '\u2013', '\u2013'],
  ['Enterotoxigenic E. coli (ETEC)', '\u2013', '\u2713', '\u2013', '\u2713', '\u2013', '\u2013'],
  ['Enteroaggregative E. coli (EAEC)', '\u2013', '\u2713', '\u2013', '\u2713', '\u2013', '\u2013'],
  ['Multiple diarrhoeal diseases', p('diarrhoeal', 'Multiple diarrhoeal diseases', 'Drugs'), '\u2713', p('diarrhoeal', 'Multiple diarrhoeal diseases', 'Biologics'), '\u2713', '\u2013', '\u2013'],
  ['Schistosomiasis', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013', '\u2713'],
  ['Onchocerciasis (river blindness)', '\u2713', '\u2713', '\u2013', '\u2713', '\u2013', '\u2713'],
  ['Lymphatic filariasis (elephantiasis)', '\u2713', '\u2013', '\u2013', '\u2713', '\u2013', '\u2713'],
  ['Tapeworm (taeniasis / cysticercosis)', '\u2713', '\u2013', '\u2013', '\u2713', '\u2013', '\u2713'],
  ['Hookworm', '\u2713', '\u2713', '\u2013', '\u2013', '\u2013', '\u2013'],
  ['Whipworm (trichuriasis)', '\u2713', '\u2013', '\u2013', '\u2013', '\u2013', '\u2013'],
  ['Roundworm (ascariasis)', '\u2713', '\u2013', '\u2013', '\u2013', '\u2013', '\u2013'],
  ['Strongyloidiasis and other intestinal roundworms', '\u2713', '\u2713', '\u2013', '\u2713', '\u2013', '\u2013'],
  ['Multiple helminth infections', '\u2713', '\u2713', '\u2013', '\u2713', '\u2013', '\u2713'],
  ['Hepatitis B', p('hepatitis-b', 'Hepatitis B', 'Drugs'), '\u2013', p('hepatitis-b', 'Hepatitis B', 'Biologics'), '\u2713', '\u2013', '\u2013'],
  ['Hepatitis C', p('hepatitis-c', 'Hepatitis C', 'Drugs'), '\u2713', '\u2013', '\u2713', '\u2013', '\u2013'],
  ['Histoplasmosis', '\u2713', '\u2013', '\u2013', '\u2713', '\u2013', '\u2013'],
  ['HIV/AIDS', p('hiv-aids', 'HIV/AIDS', 'Drugs'), '\u2713', p('hiv-aids', 'HIV/AIDS', 'Biologics'), '\u2713', '\u2713', '\u2013'],
  ['Sleeping sickness (human African trypanosomiasis)', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013', '\u2713'],
  ['Leishmaniasis', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013', '\u2013'],
  ['Chagas\' disease', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013', '\u2713'],
  ['Multiple kinetoplastid diseases', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013', '\u2713'],
  ['Leprosy', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013', '\u2013'],
  ['Leptospirosis', '\u2013', '\u2013', '\u2013', p('leptospirosis-diagnostics', 'Leptospirosis', 'Diagnostics'), '\u2013', '\u2013'],
  ['Malaria \u2014 P. falciparum', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013', '\u2713'],
  ['Malaria \u2014 P. vivax', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013', '\u2713'],
  ['Malaria \u2014 multiple or other strains', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013', '\u2713'],
  ['Mycetoma', '\u2713', '\u2013', '\u2013', '\u2713', '\u2013', '\u2013'],
  ['Rheumatic fever', '\u2013', '\u2713', '\u2013', '\u2013', '\u2013', '\u2013'],
  ['Typhoid and paratyphoid fever', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013', '\u2013'],
  ['Non-typhoidal S. enterica', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013', '\u2013'],
  ['Multiple Salmonella infections', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013', '\u2013'],
  ['Scabies', '\u2713', '\u2013', '\u2013', '\u2713', '\u2013', '\u2013'],
  ['Snakebite envenoming', p('snakebite', 'Snakebite envenoming', 'Drugs'), '\u2013', p('snakebite', 'Snakebite envenoming', 'Biologics'), p('snakebite', 'Snakebite envenoming', 'Diagnostics'), '\u2013', '\u2013'],
  ['Trachoma', '\u2013', '\u2713', '\u2013', '\u2713', '\u2013', '\u2013'],
  ['Tuberculosis', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013', '\u2013'],
  ['Yaws', '\u2013', '\u2013', '\u2013', p('yaws-diagnostics', 'Yaws', 'Diagnostics'), '\u2013', '\u2013'],
];

const ND_HEADERS = ['Disease', 'Drugs', 'Vaccines', 'Biologics', 'Diagnostics', 'Microbicides', 'Vector control'];

const EID_PATHOGENS = [
  'Lassa fever', 'Crimean-Congo haemorrhagic fever', 'Rift Valley fever',
  'Hantaan virus', 'Andes virus', 'Sin Nombre virus', 'Middle East respiratory syndrome',
  'COVID-19', 'Ebola', 'Marburg', 'Zika', 'Highly pathogenic avian influenza A(H5N1)',
  'Nipah', 'mpox', 'chikungunya',
];

const GYNAE = [
  ['Endometriosis', '\u2713', '\u2713', '\u2713', '\u2713'],
  ['Polyendocrine metabolic ovarian syndrome (PMOS)', '\u2713', '\u2713', '\u2713', '\u2713'],
  ['Uterine fibroids', '\u2713', '\u2713', '\u2713', '\u2713'],
];

const MATERNAL = [
  ['Preterm labour/birth', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013'],
  ['Preeclampsia/eclampsia', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013'],
  ['Intrauterine growth restriction', '\u2713', '\u2713', '\u2713', '\u2713', '\u2013'],
  ['Postpartum haemorrhage', '\u2713', '\u2713', '\u2713', '\u2013', '\u2713'],
];

const STI = [
  ['Gonorrhoea', '\u2713', '\u2713', '\u2713', '\u2713', '\u2713'],
  ['Mycoplasma genitalium', '\u2713', '\u2713', '\u2713', '\u2713', '\u2713'],
  ['Trichomoniasis', '\u2713', '\u2713', '\u2713', '\u2713', '\u2713'],
];

// -------------------------------------------------------------------
// Partial-inclusion criteria content (10 criteria)
// -------------------------------------------------------------------
const CRITERIA = {
  'pneumococcal-vaccines': 'methodology.what_we_track.annex_a.partial_pneumo',
  'meningococcal-vaccines': 'methodology.what_we_track.annex_a.partial_meningo',
  'dengue-rotavirus-vaccines': 'methodology.what_we_track.annex_a.partial_dengue_rota',
  'diarrhoeal': 'methodology.what_we_track.annex_a.partial_diarrhoeal',
  'hepatitis-b': 'methodology.what_we_track.annex_a.partial_hepb',
  'hepatitis-c': 'methodology.what_we_track.annex_a.partial_hepc',
  'hiv-aids': 'methodology.what_we_track.annex_a.partial_hiv',
  'leptospirosis-diagnostics': 'methodology.what_we_track.annex_a.partial_lepto',
  'snakebite': 'methodology.what_we_track.annex_a.partial_snakebite',
  'yaws-diagnostics': 'methodology.what_we_track.annex_a.partial_yaws',
};

// -------------------------------------------------------------------
// Scroll-spy
// -------------------------------------------------------------------
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const scrollEl = document.querySelector('main');
    if (!scrollEl) return;

    const update = () => {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) current = id;
      }
      setActive(current);
    };

    scrollEl.addEventListener('scroll', update, { passive: true });
    window.addEventListener('scroll', update, { passive: true });
    update();

    return () => {
      scrollEl.removeEventListener('scroll', update);
      window.removeEventListener('scroll', update);
    };
  }, [ids]);
  return active;
}

// -------------------------------------------------------------------
// Reusable tracking table — uses tick marks, partial buttons
// -------------------------------------------------------------------
function TrackingTable({ headers, rows, onPartialClick }) {
  const renderCell = (cell, isFirst) => {
    if (isFirst) return cell;
    // Partial cell object
    if (typeof cell === 'object' && cell.v === 'Partial') {
      return (
        <button
          type="button"
          onClick={() => onPartialClick && onPartialClick(cell)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border-none cursor-pointer transition-colors hover:brightness-95"
          style={{ background: '#fef3c7', color: '#92400e' }}
        >
          Partial
        </button>
      );
    }
    if (cell === '\u2713') {
      return <span className="text-green-700 font-bold text-sm">{'\u2713'}</span>;
    }
    return <span className="text-gray-400">{'\u2013'}</span>;
  };

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-sm border-collapse min-w-[540px]">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left py-4 px-5 font-semibold text-black whitespace-nowrap" style={{ background: '#FBF6EB' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-200">
              {row.map((cell, j) => (
                <td key={j} className={`py-5 px-5 align-top ${j === 0 ? 'font-semibold text-black' : ''}`}>
                  {renderCell(cell, j === 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// -------------------------------------------------------------------
// Expandable section
// -------------------------------------------------------------------
function Expandable({ title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg my-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg border-none cursor-pointer"
      >
        <div>
          <span className="text-sm font-semibold">{title}</span>
          {subtitle && <span className="block text-xs text-gray-500 mt-0.5">{subtitle}</span>}
        </div>
        <span className={`transition-transform ${open ? 'rotate-45' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </span>
      </button>
      {open && <div className="px-4 py-3 border-t border-gray-200">{children}</div>}
    </div>
  );
}

// -------------------------------------------------------------------
// Slide-in panel for partial inclusion criteria
// -------------------------------------------------------------------
function SlideInPanel({ data, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!data) return null;

  const criterionPath = CRITERIA[data.criterion];

  return (
    <>
      {/* Scrim */}
      <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={onClose} />
      {/* Panel */}
      <aside className="fixed top-0 right-0 w-full max-w-md h-full bg-white shadow-2xl z-[9999] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-gray-200">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Partial inclusion criteria</span>
            <h2 className="text-lg font-bold text-black mt-1">{data.disease}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 border-none bg-transparent cursor-pointer text-gray-400 hover:text-black"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm text-gray-500 mb-4">
            {data.product} &middot; Neglected diseases &middot; Partial
          </p>
          {criterionPath && (
            <div className="text-sm text-gray-700 leading-relaxed">
              <Markdown path={criterionPath} className="[&_p]:mb-0 [&_strong]:text-black" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between p-4 border-t border-gray-200 text-xs text-gray-400">
          <span>Esc to close</span>
          <a href="#definitions" className="text-orange-500 no-underline hover:underline">Definition: {data.product} &rarr;</a>
        </div>
      </aside>
    </>
  );
}

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------
const ANNEX_ID_TO_KEY = { 'annex-a': 'a', 'annex-b': 'b', 'annex-c': 'c' };

export default function MethodologyPage() {
  const [activeTab, setActiveTab] = useState('methodology');
  const [openAnnex, setOpenAnnex] = useState(null);
  const [slideInData, setSlideInData] = useState(null);
  const toc = activeTab === 'methodology' ? METHODOLOGY_TOC : WHAT_WE_TRACK_TOC;
  const methodologyActive = useActiveSection(
    activeTab === 'methodology' ? toc.map((item) => item.id) : []
  );
  const activeSection = activeTab === 'methodology'
    ? methodologyActive
    : openAnnex
      ? `annex-${openAnnex}`
      : toc[0]?.id;

  const handleTocClick = (e, itemId) => {
    const annexKey = ANNEX_ID_TO_KEY[itemId];
    if (annexKey) {
      e.preventDefault();
      setOpenAnnex(annexKey);
      setTimeout(() => {
        const el = document.getElementById(itemId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] lg:min-h-0 lg:h-[calc(100vh-90px)] bg-cream-200">
      <Sidebar />

      <main className="flex-1 min-w-0 lg:overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Hero band */}
          <div className="bg-white p-4 sm:p-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-6 border-b border-gray-200">
            <h1 className="text-xl sm:text-2xl font-bold text-black mb-2" style={{ fontFamily: 'var(--font-align), serif' }}>
              {t('methodology.page.title')}
            </h1>
            <p className="text-sm text-gray-500">
              {t('methodology.page.intro')}
            </p>
          </div>

          <div className="flex gap-8">
            <article className="flex-1 min-w-0">
              {activeTab === 'methodology' && (
                <div className="mb-8">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {t('methodology.page.body_intro')}
                  </p>
                </div>
              )}
              {activeTab === 'methodology'
                ? <MethodologyContent />
                : <WhatWeTrackContent openAnnex={openAnnex} setOpenAnnex={setOpenAnnex} onPartialClick={setSlideInData} />
              }
            </article>

            {/* Right sidebar */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-4">
                {/* Tab toggle */}
                <div className="inline-flex items-center bg-[#F2F2F4] h-9 p-0.5 gap-0.5 mb-6">
                  {[
                    { key: 'methodology', label: t('methodology.tabs.methodology'), icon: ChartIcon },
                    { key: 'what-we-track', label: t('methodology.tabs.what_we_track'), icon: ListIcon },
                  ].map((tab) => {
                    const isActive = activeTab === tab.key;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-4 h-8 text-xs transition-all duration-200 border-0 cursor-pointer ${
                          isActive
                            ? 'bg-[#262626] text-white font-medium shadow-sm rounded'
                            : 'bg-transparent text-gray-400 font-normal hover:bg-white/50'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} strokeWidth={2} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* TOC */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t('methodology.toc.title')}</h4>
                  <nav className="space-y-1">
                    {toc.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={(e) => handleTocClick(e, item.id)}
                        className={`flex items-start gap-1.5 text-xs py-1 px-2 rounded no-underline transition-colors ${
                          activeSection === item.id
                            ? 'text-orange-600 bg-orange-50 font-semibold'
                            : 'text-gray-500 hover:text-black hover:bg-gray-50'
                        }`}
                      >
                        {item.prefix && <span className="font-bold shrink-0">{item.prefix}</span>}
                        <span>{item.label}</span>
                      </a>
                    ))}
                  </nav>
                </div>

                {/* CTA card */}
                <div className="p-0">
                  <h4 className="text-sm font-bold text-black mb-3">{t('methodology.cta.title')}</h4>
                  <div className="relative mb-3">
                    <input
                      type="email"
                      placeholder={t('methodology.cta.placeholder')}
                      className="w-full pl-3 pr-9 py-2.5 text-sm border-none focus:outline-none placeholder:text-gray-400"
                      style={{ borderRadius: 0, background: '#F2F2F4', boxShadow: 'inset 0 1px 3px 0 rgba(0,0,0,0.03)' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value) {
                          window.location.href = `mailto:info@impactgh.org?subject=Pipeline feedback&body=From: ${e.target.value}`;
                        }
                      }}
                    />
                    <MailIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  <a
                    href="mailto:info@impactgh.org"
                    className="flex items-center justify-center gap-2 text-black text-xs font-semibold py-2.5 px-3 no-underline hover:bg-gray-100 transition-colors w-full border border-gray-300"
                    style={{ borderRadius: 0, background: '#fff' }}
                  >
                    {t('methodology.cta.button')}
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Slide-in panel for partial inclusions */}
      <SlideInPanel data={slideInData} onClose={() => setSlideInData(null)} />
    </div>
  );
}

// -------------------------------------------------------------------
// Section heading helper
// -------------------------------------------------------------------
const SectionH2 = ({ children }) => (
  <h2 className="text-black mb-4" style={{ fontFamily: 'var(--font-align), serif', fontSize: 22, fontWeight: 700, lineHeight: '32px' }}>
    {children}
  </h2>
);

// -------------------------------------------------------------------
// Methodology tab content
// -------------------------------------------------------------------
function MethodologyContent() {
  const exclusions = [
    [t('methodology.scope.exclusion_1_title'), t('methodology.scope.exclusion_1_desc')],
    [t('methodology.scope.exclusion_2_title'), t('methodology.scope.exclusion_2_desc')],
    [t('methodology.scope.exclusion_3_title'), t('methodology.scope.exclusion_3_desc')],
    [t('methodology.scope.exclusion_4_title'), t('methodology.scope.exclusion_4_desc')],
    [t('methodology.scope.exclusion_5_title'), t('methodology.scope.exclusion_5_desc')],
  ];

  const steps = [
    t('methodology.how_record_reaches.step_1'),
    t('methodology.how_record_reaches.step_2'),
    t('methodology.how_record_reaches.step_3'),
    t('methodology.how_record_reaches.step_4'),
    t('methodology.how_record_reaches.step_5'),
    t('methodology.how_record_reaches.step_6'),
  ];

  const productAreas = [
    { key: 'drugs', label: 'Drugs' },
    { key: 'vaccines', label: 'Vaccines' },
    { key: 'biologics', label: 'Biologics' },
    { key: 'diagnostics', label: 'Diagnostics' },
    { key: 'microbicides', label: 'Microbicides' },
    { key: 'vector_control', label: 'Vector control products' },
    { key: 'dietary_supplements', label: 'Dietary supplements' },
    { key: 'devices', label: 'Devices' },
  ];

  return (
    <>
      {/* 1. Scope */}
      <section id="scope" className="mb-10">
        <SectionH2>{t('methodology.scope.title')}</SectionH2>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>{t('methodology.scope.p1')}</p>
          <p>{t('methodology.scope.p2')}</p>
          <p>{t('methodology.scope.p3')}</p>
          <p>{t('methodology.scope.p4')}</p>
          <p>{t('methodology.scope.p5')}</p>
          <p>{t('methodology.scope.exclusions_intro')}</p>
          <ul className="space-y-2 list-none pl-0">
            {exclusions.map(([title, desc]) => (
              <li key={title} className="flex gap-3 items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
                <div><strong className="text-black">{title}:</strong> {desc}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2. Where information comes from */}
      <section id="where-information-comes-from" className="mb-10 pt-10 border-t border-gray-200">
        <SectionH2>{t('methodology.where_information.title')}</SectionH2>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>{t('methodology.where_information.p1')}</p>
          <p>{t('methodology.where_information.p2')}</p>
          <p>{t('methodology.where_information.p3')}</p>
          <p>{t('methodology.where_information.p4')}</p>
          <p>{t('methodology.where_information.p5')}</p>
          <p>{t('methodology.where_information.p6')}</p>
          <p>{t('methodology.where_information.p7')}</p>
        </div>

        {/* Annex D expandable */}
        <Expandable
          title={t('methodology.where_information.expandable_title')}
          subtitle={t('methodology.where_information.expandable_subtitle')}
        >
          <div className="space-y-4 text-sm text-gray-700">
            <p>{t('methodology.where_information.expandable_intro_1')}</p>
            <p>{t('methodology.where_information.expandable_intro_2')}</p>

            <div>
              <h4 className="font-semibold text-black mb-1">{t('methodology.where_information.source_1_title')}</h4>
              <p className="text-xs text-green-700 font-medium mb-1">{t('methodology.where_information.source_1_badge')}</p>
              <p>{t('methodology.where_information.source_1_desc')}</p>
              <p>{t('methodology.where_information.source_1_nd')}</p>
              <p>{t('methodology.where_information.source_1_eid')}</p>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-1">{t('methodology.where_information.source_2_title')}</h4>
              <p className="text-xs text-green-700 font-medium mb-1">{t('methodology.where_information.source_2_badge')}</p>
              <p>{t('methodology.where_information.source_2_desc')}</p>
              <p>{t('methodology.where_information.source_2_wh')}</p>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-1">{t('methodology.where_information.source_3_title')}</h4>
              <p className="text-xs text-amber-700 font-medium mb-1">{t('methodology.where_information.source_3_badge')}</p>
              <p>{t('methodology.where_information.source_3_desc')}</p>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-1">{t('methodology.where_information.source_4_title')}</h4>
              <p className="text-xs text-gray-500 font-medium mb-1">{t('methodology.where_information.source_4_badge')}</p>
              <p>{t('methodology.where_information.source_4_desc')}</p>
            </div>
          </div>
        </Expandable>
      </section>

      {/* 3. How a record reaches the pipeline */}
      <section id="how-a-record-reaches" className="mb-10 pt-10 border-t border-gray-200">
        <SectionH2>{t('methodology.how_record_reaches.title')}</SectionH2>
        <div className="text-sm text-gray-700 leading-relaxed">
          <p className="mb-4">{t('methodology.how_record_reaches.intro')}</p>
          <ol className="space-y-3 pl-0 list-none">
            {steps.map((step, i) => (
              <li key={i}>
                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                  <span>{step}</span>
                </div>
                {/* Sign-off between steps */}
                {i < steps.length - 1 && (
                  <div className="flex items-center gap-2 ml-3 my-2">
                    <div className="w-px h-4 bg-gray-300" />
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Sign-off</span>
                  </div>
                )}
              </li>
            ))}
          </ol>
          <p className="text-xs text-gray-500 mt-4 italic">
            {t('methodology.how_record_reaches.spine_note')}
          </p>

          <h3 className="text-base font-bold text-black mt-6 mb-3">{t('methodology.how_record_reaches.ai_title')}</h3>
          <div className="space-y-3">
            <p>{t('methodology.how_record_reaches.ai_p1')}</p>
            <Markdown path="methodology.how_record_reaches.ai_p2" className="[&_p]:mb-0" />
            <p>{t('methodology.how_record_reaches.ai_p3')}</p>
          </div>
        </div>
      </section>

      {/* 4. Definitions */}
      <section id="definitions" className="mb-10 pt-10 border-t border-gray-200">
        <SectionH2>{t('methodology.definitions.title')}</SectionH2>

        <div className="text-sm text-gray-700 leading-relaxed divide-y divide-gray-200">
          {/* Candidate */}
          <div className="flex gap-8 py-6 first:pt-0">
            <div className="w-40 shrink-0">
              <h4 className="font-bold text-black">{t('methodology.definitions.candidate_title')}</h4>
            </div>
            <p className="flex-1">{t('methodology.definitions.candidate_desc')}</p>
          </div>

          {/* Approved */}
          <div className="flex gap-8 py-6">
            <div className="w-40 shrink-0">
              <h4 className="font-bold text-black mb-3">{t('methodology.definitions.approved_title')}</h4>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded text-xs font-medium" style={{ background: '#cbecd7', color: '#4e765d' }}>Approved</span>
                <span className="px-2.5 py-1 rounded text-xs font-medium" style={{ background: '#cbecd7', color: '#4e765d' }}>Emergency Use Authorisation</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="px-2.5 py-1 rounded text-xs font-medium" style={{ background: '#fef3c7', color: '#92400e' }}>Application under review</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="px-2.5 py-1 rounded text-xs font-medium" style={{ background: '#fdd', color: '#b91c1c' }}>Approval withdrawn</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="px-2.5 py-1 rounded text-xs font-medium" style={{ background: '#f3f3f3', color: '#888' }}>Used off-label</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="px-2.5 py-1 rounded text-xs font-medium" style={{ background: '#f3f3f3', color: '#888' }}>Approval status unclear</span>
              </div>
            </div>
            <div className="flex-1">
              <p>{t('methodology.definitions.approved_desc')}</p>
            </div>
          </div>

          {/* Product areas */}
          <div className="flex gap-8 py-6">
            <div className="w-40 shrink-0">
              <h4 className="font-bold text-black mb-3">{t('methodology.definitions.product_areas_title')}</h4>
              <div className="flex flex-wrap gap-1.5">
                {productAreas.map((pa) => (
                  <span key={pa.key} className="px-2.5 py-1 rounded text-xs font-medium" style={{ background: '#e8e8ea', color: '#444' }}>
                    {pa.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <p className="mb-3">{t('methodology.definitions.product_areas_intro')}</p>
              <div className="space-y-3">
                <div><h5 className="font-semibold text-black text-sm mb-0.5">Drugs</h5><p>{t('methodology.definitions.product_areas_drugs')}</p></div>
                <div><h5 className="font-semibold text-black text-sm mb-0.5">Vaccines</h5><p>{t('methodology.definitions.product_areas_vaccines')}</p></div>
                <div><h5 className="font-semibold text-black text-sm mb-0.5">Biologics</h5><p>{t('methodology.definitions.product_areas_biologics')}</p></div>
                <div><h5 className="font-semibold text-black text-sm mb-0.5">Diagnostics</h5><p>{t('methodology.definitions.product_areas_diagnostics')}</p></div>
                <div><h5 className="font-semibold text-black text-sm mb-0.5">Microbicides</h5><p>{t('methodology.definitions.product_areas_microbicides')}</p></div>
                <div><h5 className="font-semibold text-black text-sm mb-0.5">Vector control products</h5><p>{t('methodology.definitions.product_areas_vector_control')}</p></div>
                <div><h5 className="font-semibold text-black text-sm mb-0.5">Dietary supplements</h5><p>{t('methodology.definitions.product_areas_dietary_supplements')}</p></div>
                <div><h5 className="font-semibold text-black text-sm mb-0.5">Devices</h5><p>{t('methodology.definitions.product_areas_devices')}</p></div>
              </div>
            </div>
          </div>

          {/* R&D stage */}
          <div className="flex gap-8 py-6">
            <div className="w-40 shrink-0">
              <h4 className="font-bold text-black mb-3">{t('methodology.definitions.rd_stage_title')}</h4>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded text-xs font-medium text-white" style={{ background: '#AD5133' }}>Discovery</span>
                <span className="px-2.5 py-1 rounded text-xs font-medium text-white" style={{ background: '#FE7449' }}>Preclinical</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="px-2.5 py-1 rounded text-xs font-medium text-white" style={{ background: '#F9A78D' }}>Phase I</span>
                <span className="px-2.5 py-1 rounded text-xs font-medium text-white" style={{ background: '#B28FC9' }}>Phase II</span>
                <span className="px-2.5 py-1 rounded text-xs font-medium text-white" style={{ background: '#CBAFDE' }}>Phase III</span>
              </div>
            </div>
            <div className="flex-1">
              <p>{t('methodology.definitions.rd_stage_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Limitations */}
      <section id="limitations" className="mb-10 pt-10 border-t border-gray-200">
        <SectionH2>{t('methodology.limitations.title')}</SectionH2>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>{t('methodology.limitations.p1')}</p>
          <p>{t('methodology.limitations.p2')}</p>
          <p>{t('methodology.limitations.p3')}</p>
          <p>{t('methodology.limitations.p4')}</p>
        </div>
      </section>

      {/* 6. Corrections and feedback */}
      <section id="corrections" className="mb-10 pt-10 border-t border-gray-200">
        <SectionH2>{t('methodology.corrections.title')}</SectionH2>
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>{t('methodology.corrections.p1')}</p>
          <p>{t('methodology.corrections.p2')}</p>
          <p>{t('methodology.corrections.p3')}</p>
        </div>
      </section>

      {/* 7. Version and review cycle */}
      <section id="version" className="mb-10 pt-10 border-t border-gray-200">
        <SectionH2>{t('methodology.version.title')}</SectionH2>
        <div className="text-sm text-gray-700 leading-relaxed">
          <p className="mb-4 text-gray-500">{t('methodology.version.version_label')}</p>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-4 px-5 font-semibold text-black" style={{ background: '#FBF6EB' }}>{t('methodology.version.col_area')}</th>
                  <th className="text-left py-4 px-5 font-semibold text-black" style={{ background: '#FBF6EB' }}>{t('methodology.version.col_cycle')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-200">
                  <td className="py-5 px-5 font-medium text-black align-top">{t('methodology.version.row_nd_area')}</td>
                  <td className="py-5 px-5 text-gray-700 align-top">{t('methodology.version.row_nd_cycle')}</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="py-5 px-5 font-medium text-black align-top">{t('methodology.version.row_eid_area')}</td>
                  <td className="py-5 px-5 text-gray-700 align-top">{t('methodology.version.row_eid_cycle')}</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="py-5 px-5 font-medium text-black align-top">{t('methodology.version.row_wh_area')}</td>
                  <td className="py-5 px-5 text-gray-700 align-top">{t('methodology.version.row_wh_cycle')}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            {t('methodology.version.footnote')}
          </p>
        </div>
      </section>
    </>
  );
}

// -------------------------------------------------------------------
// What we track tab content
// -------------------------------------------------------------------
function WhatWeTrackContent({ openAnnex, setOpenAnnex, onPartialClick }) {
  const toggle = (id) => setOpenAnnex(openAnnex === id ? null : id);

  const eidNotes = [
    'methodology.what_we_track.annex_b.note_1',
    'methodology.what_we_track.annex_b.note_2',
    'methodology.what_we_track.annex_b.note_3',
    'methodology.what_we_track.annex_b.note_4',
  ];

  return (
    <>
      <h2 className="text-black mb-6" style={{ fontFamily: 'var(--font-align), serif', fontSize: 22, fontWeight: 700, lineHeight: '32px' }}>{t('methodology.what_we_track.title')}</h2>

      {/* Annex A — Neglected diseases */}
      <div id="annex-a" className="border border-gray-200 rounded-lg mb-4">
        <button
          onClick={() => toggle('a')}
          className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors rounded-lg border-none cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="font-bold text-black text-base">{t('methodology.what_we_track.annex_a.title')}</span>
            <span className="text-xs font-medium" style={{ color: '#fe7449' }}>{t('methodology.what_we_track.annex_a.label')}</span>
            {openAnnex === 'a' && <span className="w-2 h-2 rounded-full bg-green-500" />}
          </div>
          {openAnnex === 'a' ? (
            <CloseIcon className="w-5 h-5 text-gray-400" strokeWidth={2} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          )}
        </button>
        {openAnnex === 'a' && (
          <div className="px-5 pb-5 border-t border-gray-200">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-4 mb-3">
              {NEGLECTED_DISEASES.length} DISEASES &middot; {ND_HEADERS.length - 1} PRODUCT AREAS
            </p>
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              {t('methodology.what_we_track.annex_a.subtitle')}
            </p>
            <TrackingTable headers={ND_HEADERS} rows={NEGLECTED_DISEASES} onPartialClick={onPartialClick} />

            <h3 className="text-base font-bold text-black mt-8 mb-3">{t('methodology.what_we_track.annex_a.vector_title')}</h3>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>{t('methodology.what_we_track.annex_a.vector_p1')}</p>
              <p>{t('methodology.what_we_track.annex_a.vector_p2')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Annex B — Emerging infectious diseases */}
      <div id="annex-b" className="border border-gray-200 rounded-lg mb-4">
        <button
          onClick={() => toggle('b')}
          className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors rounded-lg border-none cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="font-bold text-black text-base">{t('methodology.what_we_track.annex_b.title')}</span>
            <span className="text-xs font-medium" style={{ color: '#fe7449' }}>{t('methodology.what_we_track.annex_b.label')}</span>
            {openAnnex === 'b' && <span className="w-2 h-2 rounded-full bg-green-500" />}
          </div>
          {openAnnex === 'b' ? (
            <CloseIcon className="w-5 h-5 text-gray-400" strokeWidth={2} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          )}
        </button>
        {openAnnex === 'b' && (
          <div className="px-5 pb-5 border-t border-gray-200">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-4 mb-3">
              {EID_PATHOGENS.length} PATHOGENS
            </p>
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              {t('methodology.what_we_track.annex_b.subtitle')}
            </p>

            {/* Info callout */}
            <div className="flex gap-3 items-start rounded-lg p-4 mb-6" style={{ background: '#FBF6EB' }}>
              <span className="shrink-0 w-5 h-5 rounded-full border-2 border-orange-400 flex items-center justify-center text-orange-400 text-xs font-bold mt-0.5">i</span>
              <div className="text-sm text-gray-700 leading-relaxed">
                <Markdown path="methodology.what_we_track.annex_b.callout" className="[&_p]:mb-0 [&_strong]:text-black" />
              </div>
            </div>

            <h3 className="text-base font-bold text-black mb-3">{t('methodology.what_we_track.annex_b.notes_title')}</h3>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              {eidNotes.map((path, i) => (
                <div key={i}>
                  <Markdown path={path} className="[&_p]:mb-0 [&_strong]:text-black" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Annex C — Women's health */}
      <div id="annex-c" className="border border-gray-200 rounded-lg mb-4">
        <button
          onClick={() => toggle('c')}
          className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors rounded-lg border-none cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="font-bold text-black text-base">{t('methodology.what_we_track.annex_c.title')}</span>
            <span className="text-xs font-medium" style={{ color: '#fe7449' }}>{t('methodology.what_we_track.annex_c.label')}</span>
            {openAnnex === 'c' && <span className="w-2 h-2 rounded-full bg-green-500" />}
          </div>
          {openAnnex === 'c' ? (
            <CloseIcon className="w-5 h-5 text-gray-400" strokeWidth={2} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          )}
        </button>
        {openAnnex === 'c' && (
          <div className="px-5 pb-5 border-t border-gray-200">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-4 mb-3">
              10 CONDITIONS &middot; 3 GROUPS
            </p>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed mb-6">
              <p>{t('methodology.what_we_track.annex_c.summary')}</p>
              <p>{t('methodology.what_we_track.annex_c.qualifying')}</p>
            </div>

            {/* Gynaecological conditions */}
            <div className="mb-8">
              <h3 className="text-base font-bold text-black mb-3">{t('methodology.what_we_track.annex_c.gynae_title')}</h3>
              <TrackingTable headers={['Condition', 'Drugs', 'Biologics', 'Devices', 'Diagnostics']} rows={GYNAE} />
              <div className="mt-4 space-y-3 text-sm text-gray-700 leading-relaxed">
                <p>{t('methodology.what_we_track.annex_c.gynae_p1')}</p>
                <p>{t('methodology.what_we_track.annex_c.gynae_p2')}</p>
                <p>{t('methodology.what_we_track.annex_c.gynae_p3')}</p>
              </div>
            </div>

            {/* Maternal conditions */}
            <div className="mb-8">
              <h3 className="text-base font-bold text-black mb-3">{t('methodology.what_we_track.annex_c.maternal_title')}</h3>
              <TrackingTable headers={['Condition', 'Drugs', 'Biologics', 'Dietary supplements', 'Diagnostics', 'Devices']} rows={MATERNAL} />
              <div className="mt-4 space-y-3 text-sm text-gray-700 leading-relaxed">
                <p>{t('methodology.what_we_track.annex_c.maternal_p1')}</p>
                <p>{t('methodology.what_we_track.annex_c.maternal_p2')}</p>
                <Markdown path="methodology.what_we_track.annex_c.maternal_p3" className="[&_p]:mb-0 [&_strong]:text-black" />
                <Markdown path="methodology.what_we_track.annex_c.maternal_p4" className="[&_p]:mb-0 [&_strong]:text-black" />
              </div>
            </div>

            {/* STIs */}
            <div className="mb-4">
              <h3 className="text-base font-bold text-black mb-3">{t('methodology.what_we_track.annex_c.sti_title')}</h3>
              <TrackingTable headers={['Condition', 'Drugs', 'Biologics', 'Vaccines', 'Microbicides', 'Diagnostics']} rows={STI} />
              <div className="mt-4 space-y-3 text-sm text-gray-700 leading-relaxed">
                <p>{t('methodology.what_we_track.annex_c.sti_p1')}</p>
                <p>{t('methodology.what_we_track.annex_c.sti_p2')}</p>
                <p>{t('methodology.what_we_track.annex_c.sti_p3')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
