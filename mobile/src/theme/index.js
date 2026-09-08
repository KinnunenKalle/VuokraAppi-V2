import { StyleSheet, Dimensions } from 'react-native';

// ============================================
// VÄRIT - Moderni, rauhallinen väripaletti
// ============================================
export const Colors = {
  // Taustat
  background: '#f8fafc',
  surface: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Tekstit
  text: {
    primary: '#0f172a',
    secondary: '#1e293b',
    muted: '#64748b',
    light: '#94a3b8',
    inverse: '#ffffff',
  },
  
  // Brändi
  primary: {
    main: '#0ea5e9',
    light: '#38bdf8',
    dark: '#0284c7',
  },
  
  // Semanttiset värit
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // Reunat ja dividerit
  border: {
    light: '#f1f5f9',
    main: '#e2e8f0',
    dark: '#cbd5e1',
  },
  
  // Input-kentät
  input: {
    background: '#f8fafc',
    border: '#e2e8f0',
    focus: '#0ea5e9',
    error: '#fecaca',
  },
};

// ============================================
// TYPOGRAFIA
// ============================================
export const Typography = {
  // Font sizes
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  
  // Font weights
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// ============================================
// SPACING
// ============================================
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

// ============================================
// BORDER RADIUS
// ============================================
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// ============================================
// VARJOSTUKSET
// ============================================
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
};

// ============================================
// LAYOUT
// ============================================
export const Layout = {
  window: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  isSmallDevice: Dimensions.get('window').width < 375,
};

// ============================================
// YLEISET TYYLIT
// ============================================
export const CommonStyles = StyleSheet.create({
  // Containerit
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  
  // Keskitys
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Flexbox helpers
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  // Padding helpers
  p_base: { padding: Spacing.base },
  px_base: { paddingHorizontal: Spacing.base },
  py_base: { paddingVertical: Spacing.base },
  
  p_lg: { padding: Spacing.lg },
  px_lg: { paddingHorizontal: Spacing.lg },
  py_lg: { paddingVertical: Spacing.lg },
  
  // Margin helpers
  mt_sm: { marginTop: Spacing.sm },
  mt_base: { marginTop: Spacing.base },
  mt_lg: { marginTop: Spacing.lg },
  mt_xl: { marginTop: Spacing.xl },
  
  mb_sm: { marginBottom: Spacing.sm },
  mb_base: { marginBottom: Spacing.base },
  mb_lg: { marginBottom: Spacing.lg },
  mb_xl: { marginBottom: Spacing.xl },
});
