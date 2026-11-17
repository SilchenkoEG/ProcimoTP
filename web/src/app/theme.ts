import { alpha, createTheme } from '@mui/material';

const GREEN = '#1b6b4a'; // court green
const BORDER = '#e2e8e5';

export const theme = createTheme({
  palette: {
    primary: { main: GREEN },
    background: { default: '#f4f7f5', paper: '#ffffff' },
    text: { primary: '#14211b', secondary: '#5b6b63' },
    divider: BORDER,
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
    overline: { fontWeight: 600, letterSpacing: '0.08em' },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    // Flat cards with a hairline border instead of drop shadows.
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiPaper: { styleOverrides: { outlined: { borderColor: BORDER } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } } },
    MuiToggleButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, color: '#5b6b63', backgroundColor: '#f8faf9' },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          '&:hover:not(.Mui-focused) .MuiOutlinedInput-notchedOutline': { borderColor: alpha(GREEN, 0.5) },
        },
      },
    },
  },
});
