
const normalizar = (texto) => (texto || '').trim().toLowerCase();

const baseVacia = () => ({
  totalGastado: 0,
  totalPlaneado: 0,
  cantidadListas: 0,
  listasConGasto: 0,
  promedioPorLista: 0,
  tieneData: false,
  porCategoria: [],
  gastoPorLista: [],
  topProductos: [],
  listaMasCara: null,
  listaMasBarata: null,
});

export const calcularEstadisticas = (listas) => {
  const stats = baseVacia();
  if (!Array.isArray(listas) || listas.length === 0) return stats;

  stats.cantidadListas = listas.length;

  const gastoPorCategoria = new Map();
  const productosFrec = new Map();
  const gastoPorLista = [];

  for (const lista of listas) {
    if (!lista || !Array.isArray(lista.productos)) continue;
    let gastoEnEstaLista = 0;

    for (const p of lista.productos) {
      if (!p) continue;
      const precio = typeof p.precio === 'number' ? p.precio : 0;
      const cantidad = typeof p.cantidad === 'number' ? p.cantidad : 0;
      const subtotal = precio * cantidad;

      if (p.comprado) {
        stats.totalGastado += subtotal;
        gastoEnEstaLista += subtotal;

        const catId = p.categoriaId || '8';
        gastoPorCategoria.set(
          catId,
          (gastoPorCategoria.get(catId) || 0) + subtotal,
        );
      } else {
        stats.totalPlaneado += subtotal;
      }

      const clave = normalizar(p.nombre);
      if (clave) {
        const existente = productosFrec.get(clave);
        if (existente) {
          existente.veces += 1;
          if (p.comprado) existente.gastoTotal += subtotal;
        } else {
          productosFrec.set(clave, {
            nombre: p.nombre,
            veces: 1,
            gastoTotal: p.comprado ? subtotal : 0,
          });
        }
      }
    }

    if (gastoEnEstaLista > 0) {
      stats.listasConGasto += 1;
      gastoPorLista.push({
        id: lista.id,
        nombre: lista.nombre || 'Sin nombre',
        gasto: gastoEnEstaLista,
      });
    }
  }

  stats.tieneData = stats.totalGastado > 0;
  stats.promedioPorLista = stats.listasConGasto > 0
    ? stats.totalGastado / stats.listasConGasto
    : 0;

  stats.porCategoria = [...gastoPorCategoria.entries()]
    .map(([categoriaId, gasto]) => ({ categoriaId, gasto }))
    .sort((a, b) => b.gasto - a.gasto);

  stats.topProductos = [...productosFrec.values()]
    .sort((a, b) => b.veces - a.veces || b.gastoTotal - a.gastoTotal)
    .slice(0, 5);

  if (gastoPorLista.length > 0) {
    const orden = [...gastoPorLista].sort((a, b) => b.gasto - a.gasto);
    stats.listaMasCara = orden[0];
    stats.listaMasBarata = orden[orden.length - 1];
    stats.gastoPorLista = orden;
  }

  return stats;
};
