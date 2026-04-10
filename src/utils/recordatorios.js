
export const diasDeDiferencia = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  da.setHours(0, 0, 0, 0);
  db.setHours(0, 0, 0, 0);
  const msDia = 24 * 60 * 60 * 1000;
  return Math.round((da.getTime() - db.getTime()) / msDia);
};

export const estadoRecordatorio = (recordatorio, ahora = new Date()) => {
  if (!recordatorio || !recordatorio.fecha) return 'ninguno';
  if (recordatorio.completado) return 'completado';
  const fecha = new Date(recordatorio.fecha);
  if (Number.isNaN(fecha.getTime())) return 'ninguno';
  const diff = diasDeDiferencia(fecha, ahora);
  if (diff === 0) return 'hoy';
  if (diff > 0) return 'pendiente';
  return 'vencido';
};

const formatHora = (d) => {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const formatFechaCorta = (d) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
};

export const etiquetaRecordatorio = (recordatorio, ahora = new Date()) => {
  const estado = estadoRecordatorio(recordatorio, ahora);
  if (estado === 'ninguno') return null;
  if (estado === 'completado') return '✓ Hecho';

  const fecha = new Date(recordatorio.fecha);
  const diff = diasDeDiferencia(fecha, ahora);
  const hora = formatHora(fecha);

  if (diff === 0)  return `Hoy ${hora}`;
  if (diff === 1)  return `Mañana ${hora}`;
  if (diff > 1 && diff <= 6) return `En ${diff} días`;
  if (diff > 6)    return formatFechaCorta(fecha);
  if (diff === -1) return `Ayer ${hora}`;
  return `Hace ${Math.abs(diff)} días`;
};

export const recordatoriosPendientes = (listas, ahora = new Date()) => {
  if (!Array.isArray(listas)) return [];
  return listas.filter(l => {
    const estado = estadoRecordatorio(l?.recordatorio, ahora);
    return estado === 'hoy' || estado === 'vencido';
  });
};

export const ordenarListasPorRecordatorio = (listas, ahora = new Date()) => {
  if (!Array.isArray(listas)) return [];

  const prioridad = (lista) => {
    const estado = estadoRecordatorio(lista?.recordatorio, ahora);
    if (estado === 'vencido')   return 0;
    if (estado === 'hoy')       return 1;
    if (estado === 'pendiente') return 2;
    return 3;
  };

  const conIndice = listas.map((l, i) => ({ l, i }));
  conIndice.sort((a, b) => {
    const pa = prioridad(a.l);
    const pb = prioridad(b.l);
    if (pa !== pb) return pa - pb;
    if (pa < 3) {
      const fa = new Date(a.l.recordatorio.fecha).getTime();
      const fb = new Date(b.l.recordatorio.fecha).getTime();
      if (fa !== fb) return fa - fb;
    }
    return a.i - b.i;
  });
  return conIndice.map(x => x.l);
};
