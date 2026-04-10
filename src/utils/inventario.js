
const normalizar = (s) => (s || '').trim().toLowerCase();

export const agregarAInventario = (inventario, itemNuevo) => {
  const base = Array.isArray(inventario) ? inventario : [];
  if (!itemNuevo) return base;
  const clave = normalizar(itemNuevo.nombre);
  if (!clave) return base;

  const idx = base.findIndex(i => normalizar(i?.nombre) === clave);
  const cantidadASumar = Number(itemNuevo.cantidad) > 0 ? Number(itemNuevo.cantidad) : 1;

  if (idx >= 0) {
    const nuevos = [...base];
    nuevos[idx] = {
      ...nuevos[idx],
      cantidad: (nuevos[idx].cantidad || 0) + cantidadASumar,
      categoriaId: itemNuevo.categoriaId || nuevos[idx].categoriaId,
    };
    return nuevos;
  }

  return [...base, {
    id: itemNuevo.id,
    nombre: itemNuevo.nombre.trim(),
    categoriaId: itemNuevo.categoriaId || '8',
    cantidad: cantidadASumar,
    fechaAgregado: itemNuevo.fechaAgregado || new Date().toISOString(),
  }];
};

export const quitarDeInventario = (inventario, id) => {
  if (!Array.isArray(inventario)) return [];
  return inventario.filter(i => i.id !== id);
};

export const ajustarCantidad = (inventario, id, delta) => {
  if (!Array.isArray(inventario)) return [];
  return inventario
    .map(i => i.id === id ? { ...i, cantidad: (i.cantidad || 0) + delta } : i)
    .filter(i => i.cantidad > 0);
};

export const editarItem = (inventario, id, patch) => {
  if (!Array.isArray(inventario)) return [];
  const nombreLimpio = patch.nombre !== undefined ? patch.nombre.trim() : undefined;
  if (nombreLimpio !== undefined && nombreLimpio === '') return inventario;

  return inventario
    .map(i => {
      if (i.id !== id) return i;
      return {
        ...i,
        nombre: nombreLimpio !== undefined ? nombreLimpio : i.nombre,
        categoriaId: patch.categoriaId !== undefined ? patch.categoriaId : i.categoriaId,
        cantidad: patch.cantidad !== undefined ? patch.cantidad : i.cantidad,
      };
    })
    .filter(i => (i.cantidad || 0) > 0);
};

export const enStock = (inventario, nombre) => {
  if (!Array.isArray(inventario)) return null;
  const clave = normalizar(nombre);
  if (!clave) return null;
  return inventario.find(i => normalizar(i?.nombre) === clave) || null;
};

export const agruparPorCategoria = (inventario) => {
  const grupos = new Map();
  if (!Array.isArray(inventario)) return grupos;
  for (const item of inventario) {
    if (!item) continue;
    const catId = item.categoriaId || '8';
    if (!grupos.has(catId)) grupos.set(catId, []);
    grupos.get(catId).push(item);
  }
  return grupos;
};
