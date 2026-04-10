import AsyncStorage from '@react-native-async-storage/async-storage';

const CLAVE_LISTAS = 'listas_supermercado';
const CLAVE_INVENTARIO = 'inventario_productos';

export const cargarListas = async () => {
  try {
    const datos = await AsyncStorage.getItem(CLAVE_LISTAS);
    return datos ? JSON.parse(datos) : [];
  } catch (e) {
    console.error('Error al cargar listas:', e);
    return [];
  }
};

export const guardarListas = async (listas) => {
  try {
    await AsyncStorage.setItem(CLAVE_LISTAS, JSON.stringify(listas));
  } catch (e) {
    console.error('Error al guardar listas:', e);
  }
};

export const actualizarLista = async (id, patch) => {
  const listas = await cargarListas();
  const actualizadas = listas.map(l =>
    l.id === id ? { ...l, ...patch } : l
  );
  await guardarListas(actualizadas);
  return actualizadas;
};

export const cargarInventario = async () => {
  try {
    const datos = await AsyncStorage.getItem(CLAVE_INVENTARIO);
    return datos ? JSON.parse(datos) : [];
  } catch (e) {
    console.error('Error al cargar inventario:', e);
    return [];
  }
};

export const guardarInventario = async (inventario) => {
  try {
    await AsyncStorage.setItem(CLAVE_INVENTARIO, JSON.stringify(inventario));
  } catch (e) {
    console.error('Error al guardar inventario:', e);
  }
};

export const genId = () => {
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
  } catch {
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};
