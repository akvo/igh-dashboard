import PriorityKeyInfoPanel from '@/components/who-priority-alignment/PriorityKeyInfoPanel';

const full = {
  priority_key: 1,
  priority_name: 'Vaccines to reduce malaria morbidity and mortality',
  indication: 'To prevent infection with Malaria',
  intended_use:
    'To maximize the public health impact of a malaria infection-prevention vaccine, the immediate need will be to target populations or age groups who experience high incidence of clinical malaria.',
  target_population:
    'To maximize the public health impact of an infection-prevention vaccine, the immediate need will be to target populations or age groups who experience high incidence of infection.',
  efficacy:
    'The vaccine should dramatically reduce incidence of blood-stage infection (e.g. 90% over 12 months of follow-up post-immunisation) at the individual level.',
  safety:
    'The safety and reactogenicity of the vaccine should be comparable to or better than WHO-recommended vaccines in use in LMICs.',
  publication_date: '2022-09-13',
  source: 'https://www.who.int/example',
};

export default {
  title: 'WHO Priority alignment/PriorityKeyInfoPanel',
  component: PriorityKeyInfoPanel,
};

export const Full = {
  args: { isOpen: true, onClose: () => {}, priority: full },
};

export const OnlyIntendedUse = {
  args: {
    isOpen: true,
    onClose: () => {},
    priority: {
      ...full,
      indication: null,
      // intended_use stays populated; subtitle should fall back to it.
    },
  },
};

export const MissingOptionalFields = {
  args: {
    isOpen: true,
    onClose: () => {},
    priority: {
      ...full,
      indication: null,
      intended_use: null,
      target_population: null,
      efficacy: null,
      publication_date: null,
    },
  },
};

export const NoSourceUrl = {
  args: {
    isOpen: true,
    onClose: () => {},
    priority: { ...full, source: '' },
  },
};

export const Loading = {
  args: { isOpen: true, onClose: () => {}, loading: true },
};
