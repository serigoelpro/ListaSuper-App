import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
} from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { cargarListas } from '../storage/storage';
import { calcularEstadisticas } from '../utils/estadisticas';
import { CATEGORIAS } from '../constants/categorias';
import { useTheme } from '../theme';

const fmt = (n) => `$${(n || 0).toFixed(2)}`;

const getCategoria = (id) =>
  CATEGORIAS.find(c => c.id === id) || CATEGORIAS[7];

const generarColores = (n) => {
  if (n <= 0) return [];
  const pasos = 360 / n;
  return Array.from({ length: n }, (_, i) =>
    hslAHex((i * pasos) % 360, 0.62, 0.55)
  );
};

function hslAHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if      (h < 60)  { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  const to255 = (v) => Math.round((v + m) * 255);
  const toHex = (v) => to255(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function PieChart({ items, size = 180 }) {
  const total = items.reduce((s, it) => s + (it.value || 0), 0);
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 2;

  if (total <= 0) return null;

  if (items.length === 1 || items[0].value / total > 0.999) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} fill={items[0].color} />
      </Svg>
    );
  }

  let anguloAcum = 0;
  const paths = items.map((it, idx) => {
    const fraccion = it.value / total;
    const anguloInicio = anguloAcum;
    const anguloFin = anguloAcum + fraccion * Math.PI * 2;
    anguloAcum = anguloFin;

    const x1 = cx + r * Math.sin(anguloInicio);
    const y1 = cy - r * Math.cos(anguloInicio);
    const x2 = cx + r * Math.sin(anguloFin);
    const y2 = cy - r * Math.cos(anguloFin);

    const largeArc = fraccion > 0.5 ? 1 : 0;

    const d = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    return <Path key={idx} d={d} fill={it.color} />;
  });

  return (
    <Svg width={size} height={size}>
      <G>{paths}</G>
    </Svg>
  );
}

export default function EstadisticasScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [stats, setStats] = useState(() => calcularEstadisticas([]));

  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      const cargar = async () => {
        const listas = await cargarListas();
        if (!cancelado) setStats(calcularEstadisticas(listas));
      };
      cargar();
      return () => { cancelado = true; };
    }, [])
  );

  const datosPastel = useMemo(() => {
    const coloresCats = generarColores(stats.porCategoria.length);
    const total = stats.porCategoria.reduce((s, c) => s + c.gasto, 0) || 1;
    return stats.porCategoria.map((c, i) => {
      const cat = getCategoria(c.categoriaId);
      return {
        value: c.gasto,
        color: coloresCats[i],
        label: cat.nombre,
        emoji: cat.emoji,
        porcentaje: (c.gasto / total) * 100,
      };
    });
  }, [stats.porCategoria]);

  if (!stats.tieneData) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={styles.emptyTitulo}>Sin datos todavía</Text>
        <Text style={styles.emptySubtitulo}>
          Empezá a marcar productos como comprados{'\n'}
          para ver tus estadísticas.
        </Text>
      </View>
    );
  }

  const maxGastoCategoria = stats.porCategoria[0]?.gasto || 1;
  const mostrarMasBarata =
    stats.listaMasCara &&
    stats.listaMasBarata &&
    stats.listaMasCara.id !== stats.listaMasBarata.id;
  const maxGastoLista = stats.gastoPorLista[0]?.gasto || 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Resumen</Text>
        <Fila styles={styles} label="Gasto total" valor={fmt(stats.totalGastado)} color={theme.primary} />
        <Fila styles={styles} label="Planeado (sin comprar)" valor={fmt(stats.totalPlaneado)} color={theme.danger} />
        <Fila styles={styles} label="Cantidad de listas" valor={String(stats.cantidadListas)} />
        <Fila styles={styles} label="Promedio por lista" valor={fmt(stats.promedioPorLista)} />
      </View>

      {datosPastel.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>🥧 Distribución por categoría</Text>
          <View style={styles.pieWrapper}>
            <PieChart items={datosPastel} size={180} />
          </View>
          <View style={styles.leyenda}>
            {datosPastel.map((d, i) => (
              <View key={i} style={styles.leyendaFila}>
                <View style={[styles.leyendaSwatch, { backgroundColor: d.color }]} />
                <Text style={styles.leyendaTexto} numberOfLines={1}>
                  {d.emoji} {d.label}
                </Text>
                <Text style={styles.leyendaPct}>{d.porcentaje.toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {stats.porCategoria.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Gasto por categoría</Text>
          {stats.porCategoria.map((item) => {
            const cat = getCategoria(item.categoriaId);
            const pct = (item.gasto / maxGastoCategoria) * 100;
            return (
              <View key={item.categoriaId} style={styles.catRow}>
                <View style={styles.catHeader}>
                  <Text style={styles.catNombre}>
                    {cat.emoji}  {cat.nombre}
                  </Text>
                  <Text style={styles.catGasto}>{fmt(item.gasto)}</Text>
                </View>
                <View style={styles.barraFondo}>
                  <View style={[styles.barraRelleno, { width: `${pct}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {stats.gastoPorLista.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>📊 Gasto por lista</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.barrasVertContainer}
          >
            {stats.gastoPorLista.map((l) => {
              const altura = Math.max((l.gasto / maxGastoLista) * 140, 4);
              return (
                <View key={l.id} style={styles.barraVertCol}>
                  <Text style={styles.barraVertMonto} numberOfLines={1}>
                    {fmt(l.gasto)}
                  </Text>
                  <View style={styles.barraVertTrack}>
                    <View
                      style={[
                        styles.barraVertRelleno,
                        { height: altura },
                      ]}
                    />
                  </View>
                  <Text style={styles.barraVertLabel} numberOfLines={1}>
                    {l.nombre}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {stats.topProductos.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Productos más frecuentes</Text>
          {stats.topProductos.map((p, i) => (
            <View key={`${p.nombre}-${i}`} style={styles.topRow}>
              <Text style={styles.topIndex}>#{i + 1}</Text>
              <Text style={styles.topNombre} numberOfLines={1}>{p.nombre}</Text>
              <Text style={styles.topVeces}>{p.veces}x</Text>
              <Text style={styles.topGasto}>{fmt(p.gastoTotal)}</Text>
            </View>
          ))}
        </View>
      )}

      {stats.listaMasCara && (
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Listas destacadas</Text>
          <FilaDestacada
            styles={styles}
            label="🔥 Más cara"
            nombre={stats.listaMasCara.nombre}
            monto={fmt(stats.listaMasCara.gasto)}
          />
          {mostrarMasBarata && (
            <FilaDestacada
              styles={styles}
              label="🌱 Más barata"
              nombre={stats.listaMasBarata.nombre}
              monto={fmt(stats.listaMasBarata.gasto)}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Fila({ styles, label, valor, color }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.filaLabel}>{label}</Text>
      <Text style={[styles.filaValor, color && { color }]}>{valor}</Text>
    </View>
  );
}

function FilaDestacada({ styles, label, nombre, monto }) {
  return (
    <View style={styles.destacadaRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.destacadaLabel}>{label}</Text>
        <Text style={styles.destacadaNombre} numberOfLines={1}>{nombre}</Text>
      </View>
      <Text style={styles.destacadaMonto}>{monto}</Text>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container:       { flex: 1, backgroundColor: theme.bg },

  emptyContainer:  { flex: 1, alignItems: 'center', justifyContent: 'center',
                     padding: 32, backgroundColor: theme.bg },
  emptyEmoji:      { fontSize: 64, marginBottom: 16 },
  emptyTitulo:     { fontSize: 20, fontWeight: '700', color: theme.textPrimary, marginBottom: 8 },
  emptySubtitulo:  { fontSize: 15, color: theme.textMuted, textAlign: 'center', lineHeight: 22 },

  card:            { backgroundColor: theme.surface, borderRadius: 14, padding: 16,
                     marginBottom: 12, elevation: 2,
                     shadowColor: theme.shadow, shadowOpacity: 0.08, shadowRadius: 6 },
  cardTitulo:      { fontSize: 14, fontWeight: '700', color: theme.textSecondary,
                     textTransform: 'uppercase', letterSpacing: 0.5,
                     marginBottom: 12 },

  fila:            { flexDirection: 'row', justifyContent: 'space-between',
                     alignItems: 'center', paddingVertical: 6 },
  filaLabel:       { fontSize: 14, color: theme.textSecondary },
  filaValor:       { fontSize: 16, fontWeight: '700', color: theme.textPrimary },

  catRow:          { marginBottom: 12 },
  catHeader:       { flexDirection: 'row', justifyContent: 'space-between',
                     alignItems: 'center', marginBottom: 4 },
  catNombre:       { fontSize: 14, color: theme.textPrimary, fontWeight: '600' },
  catGasto:        { fontSize: 14, color: theme.primary, fontWeight: '700' },
  barraFondo:      { height: 8, backgroundColor: theme.progressTrack, borderRadius: 4 },
  barraRelleno:    { height: 8, backgroundColor: theme.primary, borderRadius: 4 },

  topRow:          { flexDirection: 'row', alignItems: 'center',
                     paddingVertical: 8, borderBottomWidth: 1,
                     borderBottomColor: theme.borderSubtle },
  topIndex:        { fontSize: 13, color: theme.textMuted, fontWeight: '700',
                     width: 28 },
  topNombre:       { flex: 1, fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
  topVeces:        { fontSize: 12, color: theme.textSecondary, marginRight: 8,
                     backgroundColor: theme.surfaceAlt, paddingHorizontal: 6,
                     paddingVertical: 2, borderRadius: 4 },
  topGasto:        { fontSize: 13, color: theme.primary, fontWeight: '700',
                     minWidth: 70, textAlign: 'right' },

  destacadaRow:    { flexDirection: 'row', alignItems: 'center',
                     paddingVertical: 10, borderBottomWidth: 1,
                     borderBottomColor: theme.borderSubtle },
  destacadaLabel:  { fontSize: 12, color: theme.textSecondary, marginBottom: 2 },
  destacadaNombre: { fontSize: 15, color: theme.textPrimary, fontWeight: '600' },
  destacadaMonto:  { fontSize: 16, color: theme.primary, fontWeight: '700',
                     marginLeft: 8 },

  pieWrapper:      { alignItems: 'center', justifyContent: 'center',
                     marginVertical: 8 },
  leyenda:         { marginTop: 12 },
  leyendaFila:     { flexDirection: 'row', alignItems: 'center',
                     paddingVertical: 4 },
  leyendaSwatch:   { width: 14, height: 14, borderRadius: 3, marginRight: 10 },
  leyendaTexto:    { flex: 1, fontSize: 13, color: theme.textPrimary },
  leyendaPct:      { fontSize: 13, color: theme.textSecondary, fontWeight: '700',
                     marginLeft: 8 },

  barrasVertContainer: { paddingVertical: 8, paddingHorizontal: 4,
                         alignItems: 'flex-end', minHeight: 200 },
  barraVertCol:    { alignItems: 'center', marginHorizontal: 8,
                     width: 64 },
  barraVertMonto:  { fontSize: 11, color: theme.textSecondary, fontWeight: '700',
                     marginBottom: 4, textAlign: 'center' },
  barraVertTrack:  { height: 140, width: 36, justifyContent: 'flex-end',
                     backgroundColor: theme.progressTrack, borderRadius: 4,
                     overflow: 'hidden' },
  barraVertRelleno:{ width: '100%', backgroundColor: theme.primary,
                     borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barraVertLabel:  { fontSize: 11, color: theme.textSecondary, marginTop: 6,
                     textAlign: 'center', maxWidth: 64 },
});
