import {
  createContext, useContext, useEffect, useState, useCallback, useMemo,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const lightTheme = {
  name: 'light',

  bg:            '#f5f5f5',
  surface:       '#ffffff',
  surfaceAlt:    '#f5f5f5',
  overlay:       'rgba(0,0,0,0.4)',

  textPrimary:   '#222222',
  textSecondary: '#666666',
  textMuted:     '#aaaaaa',

  border:        '#e0e0e0',
  borderSubtle:  '#f0f0f0',

  primary:       '#3F51B5',
  primaryDark:   '#303F9F',
  onPrimary:     '#ffffff',
  primarySoft:   '#E8EAF6',

  danger:        '#f44336',
  dangerSoft:    '#ffebee',

  progressTrack: '#eeeeee',
  shadow:        '#000000',
};

export const darkTheme = {
  name: 'dark',

  bg:            '#121212',
  surface:       '#1e1e1e',
  surfaceAlt:    '#2a2a2a',
  overlay:       'rgba(0,0,0,0.6)',

  textPrimary:   '#f0f0f0',
  textSecondary: '#b0b0b0',
  textMuted:     '#777777',

  border:        '#2a2a2a',
  borderSubtle:  '#242424',

  primary:       '#7986CB',
  primaryDark:   '#5C6BC0',
  onPrimary:     '#ffffff',
  primarySoft:   '#2c2f4a',

  danger:        '#ef5350',
  dangerSoft:    '#3a1e1e',

  progressTrack: '#333333',
  shadow:        '#000000',
};

const CLAVE_STORAGE = 'tema_preferido';

const ThemeContext = createContext({
  theme: lightTheme,
  modo: 'auto',
  toggle: () => {},
  setModo: () => {},
});

export function ThemeProvider({ children }) {
  const sistema = useColorScheme();

  const [modo, setModoState] = useState('auto');

  useEffect(() => {
    let cancelado = false;
    AsyncStorage.getItem(CLAVE_STORAGE)
      .then(v => {
        if (cancelado) return;
        if (v === 'light' || v === 'dark') setModoState(v);
      })
      .catch(() => { });
    return () => { cancelado = true; };
  }, []);

  const theme = useMemo(() => {
    const efectivo = modo === 'auto'
      ? (sistema === 'dark' ? 'dark' : 'light')
      : modo;
    return efectivo === 'dark' ? darkTheme : lightTheme;
  }, [modo, sistema]);

  const toggle = useCallback(() => {
    setModoState(prev => {
      const actual = prev === 'auto'
        ? (sistema === 'dark' ? 'dark' : 'light')
        : prev;
      const siguiente = actual === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(CLAVE_STORAGE, siguiente).catch(() => {});
      return siguiente;
    });
  }, [sistema]);

  const setModo = useCallback((nuevo) => {
    setModoState(nuevo);
    if (nuevo === 'auto') {
      AsyncStorage.removeItem(CLAVE_STORAGE).catch(() => {});
    } else {
      AsyncStorage.setItem(CLAVE_STORAGE, nuevo).catch(() => {});
    }
  }, []);

  const value = useMemo(
    () => ({ theme, modo, toggle, setModo }),
    [theme, modo, toggle, setModo]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
