// Site-wide settings. Edit these in one place.
export const SITE = {
  name: 'Alex Tramiel',
  description:
    'Alex Tramiel runs operations for hardware companies and builds robots that fight and play hockey.',
  links: [
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/alextramiel' },
    { label: 'GitHub', url: 'https://github.com/atramiel' },
  ],
};

export const GROUPS = ['Work', 'Robots', 'Home and shop'] as const;

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
