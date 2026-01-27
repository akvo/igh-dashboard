import Dropdown from '../components/ui/Dropdown';
import { useState } from 'react';

export default {
  title: 'UI/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    label: 'Global health area',
    placeholder: 'All',
    options: ['All', 'Infectious Disease', 'Oncology', 'Neurology', 'Cardiology', 'Rare Disease'],
  },
};

export const WithValue = {
  args: {
    label: 'Diseases',
    placeholder: 'All',
    value: 'Malaria',
    options: ['All', 'Malaria', 'TB', 'HIV', 'COVID-19', 'Dengue'],
  },
};

export const ObjectOptions = {
  args: {
    label: 'Least/most common',
    placeholder: 'All',
    options: [
      { label: 'All', value: 'all' },
      { label: 'Most common', value: 'most' },
      { label: 'Least common', value: 'least' },
    ],
  },
};

// Multiple dropdowns in a row (as shown in design)
export const FilterRow = {
  render: () => {
    const FilterRowDemo = () => {
      const [healthArea, setHealthArea] = useState('');
      const [disease, setDisease] = useState('');
      const [sorting, setSorting] = useState('');

      return (
        <div style={{ display: 'flex', gap: '16px', width: '900px' }}>
          <div style={{ flex: 1 }}>
            <Dropdown
              label="Global health area"
              value={healthArea}
              onChange={setHealthArea}
              placeholder="All"
              options={['All', 'Infectious Disease', 'Oncology', 'Neurology', 'Cardiology']}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Dropdown
              label="Diseases"
              value={disease}
              onChange={setDisease}
              placeholder="All"
              options={['All', 'Malaria', 'TB', 'HIV', 'COVID-19', 'Dengue']}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Dropdown
              label="Least/most common"
              value={sorting}
              onChange={setSorting}
              placeholder="All"
              options={['All', 'Most common', 'Least common']}
            />
          </div>
        </div>
      );
    };

    return <FilterRowDemo />;
  },
};

export const NoLabel = {
  args: {
    placeholder: 'Select option',
    options: ['Option 1', 'Option 2', 'Option 3'],
  },
};
