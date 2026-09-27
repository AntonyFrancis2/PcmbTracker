import { useColorScheme } from 'react-native';
import { THEMES } from '../logic/gamify';
import { useStore } from '../state/AppStore';
import type { SubjectKey } from '../data/chapters';

const light = {
  bg: '#f3f4fa',
  surface: '#ffffff',
  surfaceAlt: '#eceef6',
  ink: '#151a2d',
  muted: '#5c6480',
  faint: '#8d94ad',
  line: '#e1e4ef',
  done: '#1b9152',
  doneSoft: '#dcf4e6',
  rev: '#c86a00',
  revSoft: '#fdecd2',
  danger: '#c6362c',
  gold: '#b7791f',
  subject: { phy: '#2f6fd6', che: '#8a45c4', mat: '#d9480f', bio: '#23874a' } as Record<SubjectKey, string>,
};

const dark: typeof light = {
  bg: '#0d1019',
  surface: '#161a27',
  surfaceAlt: '#1e2334',
  ink: '#e9ecf5',
  muted: '#9aa2bc',
  faint: '#6d7591',
  line: '#262c40',
  done: '#4ad685',
  doneSoft: '#17362a',
  rev: '#f5b74a',
  revSoft: '#3a2b12',
  danger: '#f07167',
  gold: '#f2c14e',
  subject: { phy: '#76a4f2', che: '#bd8ceb', mat: '#fb8c55', bio: '#5cc98a' },
};

export type Palette = typeof light & { accent: string; accentSoft: string; onAccent: string; dark: boolean };

export function usePalette(): Palette {
  const scheme = useColorScheme();
  const { profile } = useStore();
  const isDark = scheme === 'dark';
  const base = isDark ? dark : light;
  const theme = THEMES.find((t) => t.id === profile.theme) ?? THEMES[0];
  const accent = isDark ? theme.accentDark : theme.accent;
  return { ...base, accent, accentSoft: accent + (isDark ? '2e' : '1c'), onAccent: isDark ? '#0d1019' : '#ffffff', dark: isDark };
}

export const radius = { sm: 10, md: 14, lg: 20 };
export const space = (n: number) => n * 4;
