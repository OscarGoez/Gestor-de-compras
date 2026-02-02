export const APP_NAME = 'Inventario del Hogar';
export const APP_VERSION = '1.0.0';

export const DEFAULT_CATEGORIES = [
  { id: 'alimentos', name: 'Alimentos', icon: '🍎' },
  { id: 'bebidas', name: 'Bebidas', icon: '🥤' },
  { id: 'limpieza', name: 'Limpieza', icon: '🧼' },
  { id: 'aseo', name: 'Aseo personal', icon: '🧴' },
  { id: 'medicamentos', name: 'Medicamentos', icon: '💊' },
  { id: 'otros', name: 'Otros', icon: '📦' }
];

export const UNITS = [
  { value: 'units', label: 'Unidades' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'oz', label: 'Onzas (oz)' },
  { value: 'lb', label: 'Libras (lb)' }
];

export const DEFAULT_LOW_STOCK_THRESHOLD = 0.2; // 20%