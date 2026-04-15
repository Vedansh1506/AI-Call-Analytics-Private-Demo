import React, { createContext, useContext, useState, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeContext = createContext();

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeContext must be used within a ThemeProvider');
  return context;
};

const getDesignTokens = (mode) => {
  const isDark = mode === 'dark';

  // ── Brand palette ──────────────────────────────────────────────────────────
  // Refined Editorial: warm near-black, amber gold accent, cool slate neutrals
  const brand = {
    amber:     '#E8A045',   // primary accent — warm gold
    amberLight:'#F0C070',   // hover / highlight
    amberDim:  '#9B6A1F',   // muted amber
    jade:      '#2CB67D',   // success green
    coral:     '#E05252',   // error red
    sky:       '#5B9CF6',   // info blue
    ink:       '#0C0B09',   // deepest dark
    obsidian:  '#111009',   // main bg dark
    graphite:  '#1A1915',   // paper dark
    slate:     '#28261F',   // elevated surface
    stone:     '#3A3830',   // border dark
    fog:       '#8C8880',   // secondary text dark
    mist:      '#C5C2BB',   // primary text dark
    cream:     '#F4F1EC',   // main bg light
    parchment: '#FDFCF8',   // paper light
    linen:     '#F0ECE4',   // elevated surface light
    sand:      '#DDD9D1',   // border light
    dusk:      '#7A7672',   // secondary text light
    char:      '#1C1B18',   // primary text light
  };

  const palette = {
    mode,
    primary: {
      main:          brand.amber,
      light:         brand.amberLight,
      dark:          brand.amberDim,
      contrastText:  isDark ? brand.ink : brand.ink,
    },
    secondary: {
      main:         brand.jade,
      light:        '#4ECDA0',
      dark:         '#1E8A5C',
      contrastText: '#fff',
    },
    success: { main: brand.jade, contrastText: '#fff' },
    error:   { main: brand.coral, contrastText: '#fff' },
    warning: { main: '#D4900A', contrastText: brand.ink },
    info:    { main: brand.sky, contrastText: '#fff' },
    background: isDark
      ? { default: brand.obsidian, paper: brand.graphite }
      : { default: brand.cream,    paper: brand.parchment },
    text: isDark
      ? { primary: brand.mist, secondary: brand.fog, disabled: '#5C5A54' }
      : { primary: brand.char, secondary: brand.dusk, disabled: '#ABA9A3' },
    divider: isDark ? brand.stone : brand.sand,
    action: isDark
      ? {
          hover:    'rgba(232,160,69,0.08)',
          selected: 'rgba(232,160,69,0.14)',
          disabled: 'rgba(197,194,187,0.28)',
          focus:    'rgba(232,160,69,0.35)',
          active:   'rgba(232,160,69,0.20)',
        }
      : {
          hover:    'rgba(28,27,24,0.04)',
          selected: 'rgba(232,160,69,0.10)',
          disabled: 'rgba(122,118,114,0.38)',
          focus:    'rgba(232,160,69,0.30)',
          active:   'rgba(232,160,69,0.16)',
        },
  };

  return {
    palette,
    typography: {
      // DM Serif Display for headings — editorial serif with personality
      // DM Sans for body — geometric, legible, refined
      fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
      h1: {
        fontFamily: '"DM Serif Display", Georgia, serif',
        fontWeight: 400,
        fontSize: '3rem',
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
      },
      h2: {
        fontFamily: '"DM Serif Display", Georgia, serif',
        fontWeight: 400,
        fontSize: '2.25rem',
        letterSpacing: '-0.02em',
        lineHeight: 1.15,
      },
      h3: {
        fontFamily: '"DM Serif Display", Georgia, serif',
        fontWeight: 400,
        fontSize: '1.75rem',
        letterSpacing: '-0.015em',
        lineHeight: 1.2,
      },
      h4: {
        fontFamily: '"DM Sans", sans-serif',
        fontWeight: 600,
        fontSize: '1.25rem',
        letterSpacing: '-0.01em',
      },
      h5: {
        fontFamily: '"DM Sans", sans-serif',
        fontWeight: 600,
        fontSize: '1.05rem',
        letterSpacing: '-0.005em',
      },
      h6: {
        fontFamily: '"DM Sans", sans-serif',
        fontWeight: 600,
        fontSize: '0.9rem',
        letterSpacing: '0.01em',
        textTransform: 'uppercase',
      },
      subtitle1: {
        fontFamily: '"DM Sans", sans-serif',
        fontWeight: 500,
        fontSize: '1rem',
        letterSpacing: '-0.005em',
      },
      subtitle2: {
        fontFamily: '"DM Sans", sans-serif',
        fontWeight: 500,
        fontSize: '0.875rem',
        letterSpacing: '0',
      },
      body1: {
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '0.9375rem',
        lineHeight: 1.65,
        letterSpacing: '0',
      },
      body2: {
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '0.8125rem',
        lineHeight: 1.6,
      },
      caption: {
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '0.75rem',
        letterSpacing: '0.01em',
        lineHeight: 1.5,
      },
      overline: {
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '0.6875rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      },
      button: {
        fontFamily: '"DM Sans", sans-serif',
        fontWeight: 500,
        fontSize: '0.875rem',
        letterSpacing: '0.005em',
        textTransform: 'none',
      },
    },
    shape: { borderRadius: 6 },
    shadows: [
      'none',
      isDark
        ? '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5)'
        : '0 1px 3px rgba(28,27,24,0.08), 0 1px 2px rgba(28,27,24,0.06)',
      isDark
        ? '0 3px 8px rgba(0,0,0,0.4)'
        : '0 3px 8px rgba(28,27,24,0.08)',
      isDark
        ? '0 6px 16px rgba(0,0,0,0.5)'
        : '0 6px 16px rgba(28,27,24,0.1)',
      isDark
        ? '0 12px 28px rgba(0,0,0,0.6)'
        : '0 12px 28px rgba(28,27,24,0.12)',
      isDark
        ? '0 20px 48px rgba(0,0,0,0.7)'
        : '0 20px 48px rgba(28,27,24,0.14)',
      ...Array(19).fill('none'),
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '@import': [
            "url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300;1,9..40,400&family=DM+Mono:wght@400;500&display=swap')"
          ],
          '*, *::before, *::after': { boxSizing: 'border-box' },
          body: {
            margin: 0,
            backgroundColor: palette.background.default,
            color: palette.text.primary,
            fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '::-webkit-scrollbar': { width: 6, height: 6 },
          '::-webkit-scrollbar-track': { background: 'transparent' },
          '::-webkit-scrollbar-thumb': {
            background: isDark ? brand.stone : brand.sand,
            borderRadius: 999,
            '&:hover': { background: isDark ? '#4A4840' : '#C5C2BB' },
          },
          '::selection': {
            background: isDark ? 'rgba(232,160,69,0.3)' : 'rgba(232,160,69,0.25)',
            color: isDark ? brand.amberLight : brand.amberDim,
          },
          // Mono number class for data
          '.mono': {
            fontFamily: '"DM Mono", "Fira Code", monospace',
            fontFeatureSettings: '"tnum" 1',
          },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 5,
            fontWeight: 500,
            fontSize: '0.875rem',
            paddingInline: 18,
            paddingBlock: 8,
            letterSpacing: '0.01em',
            transition: 'all 0.15s ease',
            '&:hover': { transform: 'translateY(-1px)' },
            '&:active': { transform: 'translateY(0)' },
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: isDark
                ? '0 6px 20px rgba(232,160,69,0.25)'
                : '0 6px 20px rgba(232,160,69,0.3)',
            },
          },
          containedPrimary: { color: brand.ink },
          outlined: {
            borderWidth: '1.5px',
            '&:hover': { borderWidth: '1.5px' },
          },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${palette.divider}`,
            borderRadius: 8,
            backgroundImage: 'none',
            backgroundColor: palette.background.paper,
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              borderColor: brand.amber + '60',
            },
          },
        },
      },

      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundImage: 'none',
            backgroundColor: palette.background.paper,
          },
          outlined: {
            border: `1px solid ${palette.divider}`,
          },
        },
      },

      MuiTabs: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${palette.divider}`,
            minHeight: 44,
          },
          indicator: {
            backgroundColor: brand.amber,
            height: 2,
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 44,
            fontSize: '0.8125rem',
            fontWeight: 500,
            letterSpacing: '0.01em',
            textTransform: 'none',
            color: palette.text.secondary,
            paddingInline: 16,
            '&.Mui-selected': {
              color: brand.amber,
              fontWeight: 600,
            },
            '&:hover': {
              color: palette.text.primary,
            },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            fontWeight: 500,
            fontSize: '0.75rem',
            letterSpacing: '0.01em',
            height: 24,
          },
          filled: {
            '&.MuiChip-colorSuccess': {
              background: isDark ? 'rgba(44,182,125,0.18)' : 'rgba(44,182,125,0.12)',
              color: brand.jade,
            },
            '&.MuiChip-colorError': {
              background: isDark ? 'rgba(224,82,82,0.18)' : 'rgba(224,82,82,0.12)',
              color: brand.coral,
            },
            '&.MuiChip-colorWarning': {
              background: isDark ? 'rgba(212,144,10,0.18)' : 'rgba(212,144,10,0.12)',
              color: '#D4900A',
            },
            '&.MuiChip-colorInfo': {
              background: isDark ? 'rgba(91,156,246,0.18)' : 'rgba(91,156,246,0.12)',
              color: brand.sky,
            },
            '&.MuiChip-colorDefault': {
              background: isDark ? brand.slate : brand.linen,
              color: palette.text.secondary,
            },
          },
        },
      },

      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 5,
              transition: 'border-color 0.15s ease',
              '& fieldset': { borderColor: palette.divider, borderWidth: '1.5px' },
              '&:hover fieldset': { borderColor: brand.amber + '80' },
              '&.Mui-focused fieldset': {
                borderColor: brand.amber,
                borderWidth: '1.5px',
                boxShadow: `0 0 0 3px ${brand.amber}20`,
              },
            },
            '& .MuiInputLabel-root.Mui-focused': { color: brand.amber },
            '& .MuiInputBase-input': { color: palette.text.primary },
          },
        },
      },

      MuiSelect: {
        styleOverrides: {
          outlined: {
            borderRadius: 5,
          },
        },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 500,
              fontSize: '0.75rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: palette.text.secondary,
              borderBottom: `1px solid ${palette.divider}`,
              backgroundColor: isDark ? brand.slate : brand.linen,
            },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: palette.divider,
            fontSize: '0.875rem',
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: palette.action.hover,
            },
            transition: 'background-color 0.12s ease',
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 999 },
          bar: { borderRadius: 999 },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            border: '1px solid',
            fontSize: '0.8125rem',
          },
          standardSuccess: {
            borderColor: brand.jade + '40',
            backgroundColor: isDark ? 'rgba(44,182,125,0.08)' : 'rgba(44,182,125,0.06)',
            color: isDark ? '#4ECDA0' : '#1E6A4A',
          },
          standardError: {
            borderColor: brand.coral + '40',
            backgroundColor: isDark ? 'rgba(224,82,82,0.08)' : 'rgba(224,82,82,0.06)',
            color: isDark ? '#F08080' : '#A03030',
          },
          standardWarning: {
            borderColor: '#D4900A40',
            backgroundColor: isDark ? 'rgba(212,144,10,0.08)' : 'rgba(212,144,10,0.06)',
            color: isDark ? '#F0B040' : '#8A6000',
          },
          standardInfo: {
            borderColor: brand.sky + '40',
            backgroundColor: isDark ? 'rgba(91,156,246,0.08)' : 'rgba(91,156,246,0.06)',
            color: isDark ? '#8DBDFF' : '#3060B0',
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: '0.75rem',
            fontWeight: 400,
            borderRadius: 4,
            padding: '5px 10px',
            backgroundColor: isDark ? brand.slate : brand.char,
            color: isDark ? brand.mist : '#fff',
            border: `1px solid ${isDark ? brand.stone : 'transparent'}`,
          },
          arrow: {
            color: isDark ? brand.slate : brand.char,
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? brand.graphite : brand.parchment,
            borderRight: `1px solid ${palette.divider}`,
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            border: `1px solid ${palette.divider}`,
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.6)'
              : '0 8px 32px rgba(28,27,24,0.12)',
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            paddingBlock: 8,
            transition: 'background-color 0.1s ease',
          },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: { borderColor: palette.divider },
        },
      },

      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(28,27,24,0.05)',
            borderRadius: 4,
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 5,
            transition: 'all 0.15s ease',
            '&:hover': {
              backgroundColor: palette.action.hover,
            },
          },
        },
      },

      MuiAccordion: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: 'transparent',
            boxShadow: 'none',
            border: `1px solid ${palette.divider}`,
            borderRadius: '6px !important',
            marginBottom: 8,
            '&:before': { display: 'none' },
          },
        },
      },
    },
  };
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('themeMode') || 'dark';
  });

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('themeMode', next);
      return next;
    });
  };

  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);
  const value = useMemo(() => ({ mode, toggleTheme, isDark: mode === 'dark' }), [mode]);

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};