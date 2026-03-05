import React, { createContext, useContext, useState, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeContext = createContext();

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

const getDesignTokens = (mode) => {
  const isDark = mode === 'dark';

  const primary = {
    main: '#4f46e5',
    light: '#6366f1',
    dark: '#4338ca',
  };

  const secondary = {
    main: '#db2777',
    light: '#ec4899',
    dark: '#be185d',
  };

  const palette = {
    mode,
    primary,
    secondary,
    ...(isDark
      ? {
          background: {
            default: '#020617',
            paper: '#020617',
          },
          text: {
            primary: '#e2e8f0',
            secondary: '#94a3b8',
          },
          divider: 'rgba(148, 163, 184, 0.35)',
          success: {
            main: '#22c55e',
          },
          warning: {
            main: '#f59e0b',
          },
          error: {
            main: '#ef4444',
          },
          info: {
            main: '#38bdf8',
          },
          action: {
            hover: 'rgba(148, 163, 184, 0.15)',
            selected: 'rgba(148, 163, 184, 0.22)',
            disabled: 'rgba(148, 163, 184, 0.38)',
            focus: 'rgba(129, 140, 248, 0.5)',
          },
        }
      : {
          background: {
            default: '#f8fafc',
            paper: '#ffffff',
          },
          text: {
            primary: '#0f172a',
            secondary: '#64748b',
          },
          divider: 'rgba(148, 163, 184, 0.35)',
          success: {
            main: '#16a34a',
          },
          warning: {
            main: '#ea580c',
          },
          error: {
            main: '#dc2626',
          },
          info: {
            main: '#0284c7',
          },
          action: {
            hover: 'rgba(15, 23, 42, 0.04)',
            selected: 'rgba(79, 70, 229, 0.08)',
            disabled: 'rgba(148, 163, 184, 0.5)',
            focus: 'rgba(79, 70, 229, 0.45)',
          },
        }),
  };

  return {
    palette,
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
        letterSpacing: '-0.04em',
      },
      h2: {
        fontWeight: 700,
        letterSpacing: '-0.03em',
      },
      h3: {
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
      body1: {
        lineHeight: 1.6,
      },
      body2: {
        lineHeight: 1.5,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: 0,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*, *::before, *::after': {
            boxSizing: 'border-box',
          },
          body: {
            margin: 0,
            backgroundColor: palette.background.default,
            color: palette.text.primary,
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          },
          a: {
            color: primary.main,
            textDecorationThickness: '1px',
            textUnderlineOffset: '2px',
          },
          'a:hover': {
            textDecoration: 'underline',
          },
          ':focus-visible': {
            outline: `2px solid ${palette.action.focus}`,
            outlineOffset: 2,
          },
          '::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? '#1e293b' : '#cbd5f5',
            borderRadius: 999,
          },
        },
      },
      MuiButtonBase: {
        defaultProps: {
          disableRipple: false,
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 999,
            paddingInline: 20,
            paddingBlock: 9,
            lineHeight: 1.4,
            transition: 'background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: isDark
                ? '0 10px 25px rgba(15, 23, 42, 0.8)'
                : '0 8px 20px rgba(15, 23, 42, 0.12)',
            },
            '&:focus-visible': {
              boxShadow: `0 0 0 2px ${palette.background.paper}, 0 0 0 4px ${palette.action.focus}`,
            },
          },
          containedPrimary: {
            color: '#ffffff',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${palette.mode === 'dark' ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.3)'}`,
            backgroundImage: palette.mode === 'dark'
              ? 'linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.94))'
              : 'linear-gradient(145deg, #ffffff, #f9fafb)',
            boxShadow: palette.mode === 'dark'
              ? '0 18px 45px rgba(15,23,42,0.85)'
              : '0 18px 40px rgba(15,23,42,0.16)',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: palette.mode === 'dark'
                ? '0 22px 55px rgba(15,23,42,0.95)'
                : '0 22px 50px rgba(15,23,42,0.22)',
              borderColor: palette.primary.main,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              transition: 'border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease',
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: primary.main,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: primary.main,
                borderWidth: 2,
              },
            },
          },
        },
      },
    },
  };
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'dark';
  });

  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'dark' ? 'light' : 'dark';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  };

  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  const value = useMemo(
    () => ({
      mode,
      toggleTheme,
      isDark: mode === 'dark',
    }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
