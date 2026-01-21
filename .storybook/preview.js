import '../src/app/globals.css';

/** @type { import('@storybook/nextjs-vite').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'cream',
      values: [
        { name: 'cream', value: '#fbf6eb' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
};

export default preview;