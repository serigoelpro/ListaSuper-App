
const normalizar = (texto) => (texto || '').trim().toLowerCase();

export const construirSugerencias = (listas) => {
  const dict = new Map();
  if (!Array.isArray(listas)) return dict;

  for (const lista of listas) {
    if (!lista || !Array.isArray(lista.productos)) continue;
    for (const p of lista.productos) {
      const clave = normalizar(p?.nombre);
      if (!clave) continue;
      const existente = dict.get(clave);
      if (existente) {
        existente.usos += 1;
        existente.nombre = p.nombre;
        existente.precio = typeof p.precio === 'number' ? p.precio : existente.precio;
        existente.categoriaId = p.categoriaId || existente.categoriaId;
      } else {
        dict.set(clave, {
          nombre: p.nombre,
          precio: typeof p.precio === 'number' ? p.precio : 0,
          categoriaId: p.categoriaId || '8',
          usos: 1,
        });
      }
    }
  }
  return dict;
};

export const filtrarSugerencias = (diccionario, textoBusqueda, limite = 5) => {
  const q = normalizar(textoBusqueda);
  if (!q || !diccionario || diccionario.size === 0) return [];

  const empiezan = [];
  const contienen = [];

  for (const [clave, data] of diccionario) {
    if (clave === q) continue;
    if (clave.startsWith(q)) {
      empiezan.push(data);
    } else if (clave.includes(q)) {
      contienen.push(data);
    }
  }

  const porUsos = (a, b) => b.usos - a.usos;
  empiezan.sort(porUsos);
  contienen.sort(porUsos);

  return [...empiezan, ...contienen].slice(0, limite);
};
