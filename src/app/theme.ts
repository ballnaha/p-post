import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      // Indigo, similar to mock highlight color
      main: '#6366F1',
      light: '#A5B4FC',
      dark: '#4F46E5',
    },
    secondary: {
      main: '#00BFA5',
      light: '#1DE9B6',
      dark: '#00897B',
    },
    success: {
      main: '#00BFA5',
      light: '#1DE9B6',
      dark: '#00897B',
    },
    background: {
      default: '#f5f7fa', // light gray canvas
      paper: '#ffffff', // white cards/surfaces
    },
    text: {
      primary: '#111827',
      secondary: '#6B7280',
    }
  },
  typography: {
    fontFamily: '"Sarabun", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, fontFamily: '"Sarabun", sans-serif' },
    h2: { fontWeight: 600, fontFamily: '"Sarabun", sans-serif' },
    h3: { fontWeight: 600, fontFamily: '"Sarabun", sans-serif' },
    h4: { fontWeight: 600, fontFamily: '"Sarabun", sans-serif' },
    h5: { fontWeight: 500, fontFamily: '"Sarabun", sans-serif' },
    h6: { fontWeight: 500, fontFamily: '"Sarabun", sans-serif' },
    body1: { fontFamily: '"Sarabun", sans-serif', fontWeight: 400 },
    body2: { fontFamily: '"Sarabun", sans-serif', fontWeight: 400 },
    button: { fontFamily: '"Sarabun", sans-serif', fontWeight: 500 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e5e7eb',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#111827',
          boxShadow: '0 2px 6px rgba(17,24,39,0.04)',
          borderBottom: '1px solid #e5e7eb',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: '"Sarabun", sans-serif',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: '"Sarabun", sans-serif',
          borderRadius: 10,
        },
      },
    },
  },
});

export default theme;
