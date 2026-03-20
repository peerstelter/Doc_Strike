/**
 * Naval Strike — visual themes
 * Each theme has:
 *   cssVars   → applied to document.documentElement via style.setProperty
 *   canvas    → used by Renderer directly
 */
export const THEMES = {
  ocean: {
    id: 'ocean', label: '🌊', name: 'Ocean',
    canvas: {
      bg:       '#090d18',
      cellEven: '#0c2040',
      cellOdd:  '#09182e',
      gridLine: '#112236',
      label:    '#5f8ab8',
      miss:     '#4fc3f7',
      hit:      '#ff5722',
      hover:    '#00d4ff',
      preview:  { valid: 'rgba(0,230,118,0.45)', invalid: 'rgba(255,87,34,0.45)' },
      fog:      'rgba(4,8,20,0.84)',
    },
    cssVars: {
      '--bg':          '#0a0e1a',
      '--bg2':         '#0d1526',
      '--bg3':         '#111d33',
      '--accent':      '#00d4ff',
      '--accent2':     '#0099cc',
      '--hit':         '#ff5722',
      '--miss':        '#4fc3f7',
      '--text':        '#e0eaf8',
      '--text-muted':  '#7fb3d3',
      '--border':      '#1a3a5c',
      '--card':        '#0f1e35',
    },
  },
  arctic: {
    id: 'arctic', label: '❄️', name: 'Arctic',
    canvas: {
      bg:       '#071520',
      cellEven: '#0d2535',
      cellOdd:  '#0a1c2a',
      gridLine: '#183040',
      label:    '#7ab8d4',
      miss:     '#90e0ef',
      hit:      '#e63946',
      hover:    '#90e0ef',
      preview:  { valid: 'rgba(80,200,230,0.45)', invalid: 'rgba(230,57,70,0.45)' },
      fog:      'rgba(4,12,22,0.84)',
    },
    cssVars: {
      '--bg':          '#060f18',
      '--bg2':         '#0a1a28',
      '--bg3':         '#0f2035',
      '--accent':      '#90e0ef',
      '--accent2':     '#48cae4',
      '--hit':         '#e63946',
      '--miss':        '#90e0ef',
      '--text':        '#ddf4f8',
      '--text-muted':  '#7ab8d4',
      '--border':      '#1a3a4a',
      '--card':        '#0d1e2e',
    },
  },
  inferno: {
    id: 'inferno', label: '🌋', name: 'Inferno',
    canvas: {
      bg:       '#120806',
      cellEven: '#2a0d06',
      cellOdd:  '#1e0904',
      gridLine: '#3d1506',
      label:    '#c4622a',
      miss:     '#ffaa66',
      hit:      '#ffee00',
      hover:    '#ff6622',
      preview:  { valid: 'rgba(255,160,40,0.45)', invalid: 'rgba(255,255,0,0.35)' },
      fog:      'rgba(10,3,1,0.84)',
    },
    cssVars: {
      '--bg':          '#0e0504',
      '--bg2':         '#180a06',
      '--bg3':         '#221008',
      '--accent':      '#ff6622',
      '--accent2':     '#cc4400',
      '--hit':         '#ffee00',
      '--miss':        '#ffaa66',
      '--text':        '#ffe0cc',
      '--text-muted':  '#c4622a',
      '--border':      '#4a1a08',
      '--card':        '#1a0906',
    },
  },
  jungle: {
    id: 'jungle', label: '🌿', name: 'Jungle',
    canvas: {
      bg:       '#060e06',
      cellEven: '#0c1f0a',
      cellOdd:  '#091508',
      gridLine: '#152612',
      label:    '#5a9a48',
      miss:     '#82c878',
      hit:      '#ff6644',
      hover:    '#44cc44',
      preview:  { valid: 'rgba(68,204,68,0.45)', invalid: 'rgba(255,100,68,0.45)' },
      fog:      'rgba(2,6,2,0.84)',
    },
    cssVars: {
      '--bg':          '#040c04',
      '--bg2':         '#081408',
      '--bg3':         '#0d1e0d',
      '--accent':      '#44cc44',
      '--accent2':     '#22aa22',
      '--hit':         '#ff6644',
      '--miss':        '#82c878',
      '--text':        '#d0f0cc',
      '--text-muted':  '#5a9a48',
      '--border':      '#1c381a',
      '--card':        '#0b1a0a',
    },
  },
};

export const THEME_ORDER = ['ocean', 'arctic', 'inferno', 'jungle'];

export function applyTheme(themeId) {
  const theme = THEMES[themeId] || THEMES.ocean;
  document.documentElement.dataset.theme = theme.id;
  for (const [k, v] of Object.entries(theme.cssVars)) {
    document.documentElement.style.setProperty(k, v);
  }
  return theme;
}
