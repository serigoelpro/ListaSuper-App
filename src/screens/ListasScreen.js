import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, StyleSheet, Alert, Modal, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { cargarListas, guardarListas, genId } from '../storage/storage';
import { CATEGORIAS } from '../constants/categorias';
import { useTheme } from '../theme';
import {
  estadoRecordatorio, etiquetaRecordatorio,
  recordatoriosPendientes, ordenarListasPorRecordatorio,
} from '../utils/recordatorios';

export default function ListasScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [listas, setListas] = useState([]);
  const [nombreNueva, setNombreNueva] = useState('');

  const [listaEnEdicion, setListaEnEdicion] = useState(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [errorEdicion, setErrorEdicion] = useState('');

  const [listaRecordatorio, setListaRecordatorio] = useState(null);
  const [fechaRec, setFechaRec] = useState(new Date());
  const [mensajeRec, setMensajeRec] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [tick, setTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      const cargar = async () => {
        const listasGuardadas = await cargarListas();
        if (!cancelado) {
          setListas(listasGuardadas);
          setTick(t => t + 1);
        }
      };
      cargar();
      return () => { cancelado = true; };
    }, [])
  );

  const ahora = useMemo(() => new Date(), [tick, listas]);

  const listasOrdenadas = useMemo(
    () => ordenarListasPorRecordatorio(listas, ahora),
    [listas, ahora]
  );

  const pendientes = useMemo(
    () => recordatoriosPendientes(listas, ahora),
    [listas, ahora]
  );

  const agregarLista = () => {
    const nombre = nombreNueva.trim();
    if (!nombre) return;
    const nueva = {
      id: genId(),
      nombre,
      productos: [],
    };
    const nuevasListas = [...listas, nueva];
    setListas(nuevasListas);
    guardarListas(nuevasListas);
    setNombreNueva('');
  };

  const eliminarLista = (id) => {
    const borrar = () => {
      const nuevas = listas.filter(l => l.id !== id);
      setListas(nuevas);
      guardarListas(nuevas);
    };
    confirmar('Eliminar lista', '¿Estás seguro?', borrar);
  };

  const abrirEdicion = (lista) => {
    setListaEnEdicion(lista);
    setNombreEditado(lista.nombre);
    setErrorEdicion('');
  };

  const cerrarEdicion = () => {
    setListaEnEdicion(null);
    setNombreEditado('');
    setErrorEdicion('');
  };

  const guardarEdicion = () => {
    const nombre = nombreEditado.trim();
    if (!nombre) {
      setErrorEdicion('El nombre no puede estar vacío.');
      return;
    }
    const nuevas = listas.map(l =>
      l.id === listaEnEdicion.id ? { ...l, nombre } : l
    );
    setListas(nuevas);
    guardarListas(nuevas);
    cerrarEdicion();
  };

  const abrirRecordatorio = (lista) => {
    setListaRecordatorio(lista);
    if (lista.recordatorio && lista.recordatorio.fecha) {
      setFechaRec(new Date(lista.recordatorio.fecha));
      setMensajeRec(lista.recordatorio.mensaje || '');
    } else {
      const mañana = new Date();
      mañana.setDate(mañana.getDate() + 1);
      mañana.setHours(10, 0, 0, 0);
      setFechaRec(mañana);
      setMensajeRec('');
    }
  };

  const cerrarRecordatorio = () => {
    setListaRecordatorio(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const guardarRecordatorio = () => {
    if (!listaRecordatorio) return;
    const nuevas = listas.map(l =>
      l.id === listaRecordatorio.id
        ? {
            ...l,
            recordatorio: {
              fecha: fechaRec.toISOString(),
              mensaje: mensajeRec.trim(),
              completado: false,
            },
          }
        : l
    );
    setListas(nuevas);
    guardarListas(nuevas);
    cerrarRecordatorio();
  };

  const quitarRecordatorio = () => {
    if (!listaRecordatorio) return;
    const nuevas = listas.map(l =>
      l.id === listaRecordatorio.id ? { ...l, recordatorio: null } : l
    );
    setListas(nuevas);
    guardarListas(nuevas);
    cerrarRecordatorio();
  };

  const marcarHecho = (listaId) => {
    const nuevas = listas.map(l =>
      l.id === listaId && l.recordatorio
        ? { ...l, recordatorio: { ...l.recordatorio, completado: true } }
        : l
    );
    setListas(nuevas);
    guardarListas(nuevas);
  };

  const accionesLista = (lista) => {
    if (Platform.OS === 'web') {
      const accion = window.prompt(
        `"${lista.nombre}"\nEscribe "editar", "recordatorio" o "eliminar":`,
        'editar'
      );
      if (accion === 'editar') abrirEdicion(lista);
      else if (accion === 'recordatorio') abrirRecordatorio(lista);
      else if (accion === 'eliminar') eliminarLista(lista.id);
      return;
    }
    Alert.alert(
      lista.nombre,
      '¿Qué querés hacer?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Editar nombre', onPress: () => abrirEdicion(lista) },
        { text: '⏰ Recordatorio', onPress: () => abrirRecordatorio(lista) },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => eliminarLista(lista.id),
        },
      ],
    );
  };

  const getStats = (productos) => {
    const total = productos.length;
    let comprados = 0;
    let totalPesos = 0;
    const cuentaCats = new Map();
    for (const p of productos) {
      if (p.comprado) comprados++;
      totalPesos += (p.precio || 0) * (p.cantidad || 0);
      const catId = p.categoriaId || '8';
      cuentaCats.set(catId, (cuentaCats.get(catId) || 0) + 1);
    }
    const progreso = total === 0 ? 0 : comprados / total;
    const categoriasPresentes = [...cuentaCats.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
    return { total, comprados, totalPesos, progreso, categoriasPresentes };
  };

  const getCategoria = (id) =>
    CATEGORIAS.find(c => c.id === id) || CATEGORIAS[7];

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🛒</Text>
      <Text style={styles.emptyTitulo}>No tienes listas aún</Text>
      <Text style={styles.emptySubtitulo}>
        Crea tu primera lista arriba{'\n'}y empieza a planear tu compra
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Nueva lista (ej. Semana del 7...)"
          placeholderTextColor={theme.textMuted}
          value={nombreNueva}
          onChangeText={setNombreNueva}
          onSubmitEditing={agregarLista}
        />
        <TouchableOpacity style={styles.btnAgregar} onPress={agregarLista}>
          <Text style={styles.btnTexto}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={listasOrdenadas}
        keyExtractor={item => item.id}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={listas.length === 0 && { flex: 1 }}
        ListHeaderComponent={
          pendientes.length > 0 ? (
            <View style={styles.banner}>
              <Text style={styles.bannerEmoji}>⏰</Text>
              <Text style={styles.bannerTexto}>
                {pendientes.length === 1
                  ? 'Tenés 1 recordatorio pendiente'
                  : `Tenés ${pendientes.length} recordatorios pendientes`}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const { total, comprados, totalPesos, progreso, categoriasPresentes } = getStats(item.productos);
          const terminada = total > 0 && comprados === total;
          const estado = estadoRecordatorio(item.recordatorio, ahora);
          const etiqueta = etiquetaRecordatorio(item.recordatorio, ahora);
          const urgente = estado === 'hoy' || estado === 'vencido';
          const catsVisibles = categoriasPresentes.slice(0, 5);
          const catsExtras = Math.max(0, categoriasPresentes.length - 5);

          return (
            <TouchableOpacity
              style={[
                styles.tarjeta,
                terminada && styles.tarjetaTerminada,
                urgente && styles.tarjetaUrgente,
              ]}
              onPress={() => navigation.navigate('DetalleLista', {
                listaId: item.id,
                nombre: item.nombre,
              })}
              onLongPress={() => accionesLista(item)}
              activeOpacity={0.8}
            >
              <View style={styles.tarjetaHeader}>
                <Text style={styles.nombreLista} numberOfLines={1}>
                  {terminada ? '✅ ' : '🛒 '}{item.nombre}
                </Text>
                <Text style={styles.totalPesos}>
                  ${totalPesos.toFixed(2)}
                </Text>
                <TouchableOpacity
                  style={styles.btnMenu}
                  onPress={() => accionesLista(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Opciones de la lista"
                >
                  <Text style={styles.btnMenuTxt}>⋮</Text>
                </TouchableOpacity>
              </View>

              {catsVisibles.length > 0 && (
                <View style={styles.catChipsRow}>
                  {catsVisibles.map(catId => {
                    const cat = getCategoria(catId);
                    return (
                      <Text key={catId} style={styles.catChipEmoji}>
                        {cat.emoji}
                      </Text>
                    );
                  })}
                  {catsExtras > 0 && (
                    <Text style={styles.catChipExtras}>+{catsExtras}</Text>
                  )}
                </View>
              )}

              {etiqueta && (
                <View style={[
                  styles.badgeRec,
                  estado === 'vencido'   && styles.badgeVencido,
                  estado === 'hoy'       && styles.badgeHoy,
                  estado === 'pendiente' && styles.badgePendiente,
                  estado === 'completado'&& styles.badgeCompletado,
                ]}>
                  <Text style={styles.badgeTexto}>
                    {estado === 'vencido' ? '⚠️ ' : estado === 'completado' ? '' : '⏰ '}
                    {etiqueta}
                  </Text>
                  {item.recordatorio?.mensaje ? (
                    <Text style={styles.badgeMensaje} numberOfLines={1}>
                      {' · '}{item.recordatorio.mensaje}
                    </Text>
                  ) : null}
                </View>
              )}

              <Text style={styles.contador}>
                {total === 0
                  ? 'Sin productos aún'
                  : `${comprados} de ${total} producto${total !== 1 ? 's' : ''} comprado${comprados !== 1 ? 's' : ''}`}
              </Text>

              {total > 0 && (
                <View style={styles.barraFondo}>
                  <View style={[
                    styles.barraRelleno,
                    { width: `${progreso * 100}%` },
                    terminada && styles.barraTerminada
                  ]} />
                </View>
              )}

              {urgente && (
                <TouchableOpacity
                  style={styles.btnHecho}
                  onPress={() => marcarHecho(item.id)}
                >
                  <Text style={styles.btnHechoTxt}>✓ Marcar recordatorio como hecho</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.hint}>Tocá ⋮ para opciones</Text>
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        visible={listaRecordatorio !== null}
        animationType="fade"
        transparent
        onRequestClose={cerrarRecordatorio}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>
              ⏰ Recordatorio
            </Text>
            <Text style={styles.recordatorioSubtitulo} numberOfLines={1}>
              {listaRecordatorio?.nombre}
            </Text>

            <Text style={styles.recordatorioLabel}>Fecha</Text>
            <TouchableOpacity
              style={styles.recordatorioPickerBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.recordatorioPickerTxt}>
                📅 {fechaRec.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <Text style={styles.recordatorioLabel}>Hora</Text>
            <TouchableOpacity
              style={styles.recordatorioPickerBtn}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.recordatorioPickerTxt}>
                🕐 {String(fechaRec.getHours()).padStart(2, '0')}
                :{String(fechaRec.getMinutes()).padStart(2, '0')}
              </Text>
            </TouchableOpacity>

            <Text style={styles.recordatorioLabel}>Mensaje (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              value={mensajeRec}
              onChangeText={setMensajeRec}
              placeholder="Ej: antes del almuerzo"
              placeholderTextColor={theme.textMuted}
            />

            {showDatePicker && (
              <DateTimePicker
                value={fechaRec}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (event.type === 'set' && selectedDate) {
                    const nueva = new Date(selectedDate);
                    nueva.setHours(fechaRec.getHours(), fechaRec.getMinutes(), 0, 0);
                    setFechaRec(nueva);
                  }
                }}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={fechaRec}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (event.type === 'set' && selectedTime) {
                    const nueva = new Date(fechaRec);
                    nueva.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                    setFechaRec(nueva);
                  }
                }}
              />
            )}

            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { flex: 1 }]}
                onPress={cerrarRecordatorio}
              >
                <Text style={styles.modalBtnCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              {listaRecordatorio?.recordatorio && (
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnQuitar, { flex: 1, marginLeft: 8 }]}
                  onPress={quitarRecordatorio}
                >
                  <Text style={styles.modalBtnQuitarTxt}>Quitar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnOk, { flex: 1 }]}
                onPress={guardarRecordatorio}
              >
                <Text style={styles.modalBtnOkTxt}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={listaEnEdicion !== null}
        animationType="fade"
        transparent
        onRequestClose={cerrarEdicion}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Renombrar lista</Text>
            <TextInput
              style={styles.modalInput}
              value={nombreEditado}
              onChangeText={setNombreEditado}
              placeholder="Nombre de la lista"
              placeholderTextColor={theme.textMuted}
              autoFocus
              onSubmitEditing={guardarEdicion}
            />
            {errorEdicion ? (
              <Text style={styles.errorTexto}>{errorEdicion}</Text>
            ) : null}
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { flex: 1 }]}
                onPress={cerrarEdicion}
              >
                <Text style={styles.modalBtnCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnOk, { flex: 1 }]}
                onPress={guardarEdicion}
              >
                <Text style={styles.modalBtnOkTxt}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function confirmar(titulo, mensaje, onConfirmar) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensaje}`)) onConfirmar();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: onConfirmar },
  ]);
}

const makeStyles = (theme) => StyleSheet.create({
  container:        { flex: 1, padding: 16, backgroundColor: theme.bg },
  inputRow:         { flexDirection: 'row', marginBottom: 16, gap: 8 },
  input:            { flex: 1, backgroundColor: theme.surface, borderRadius: 10,
                      paddingHorizontal: 14, paddingVertical: 10,
                      borderWidth: 1, borderColor: theme.border, fontSize: 16,
                      color: theme.textPrimary },
  btnAgregar:       { backgroundColor: theme.primary, borderRadius: 10,
                      width: 48, alignItems: 'center', justifyContent: 'center' },
  btnTexto:         { color: theme.onPrimary, fontSize: 28, lineHeight: 32 },
  tarjeta:          { backgroundColor: theme.surface, borderRadius: 14, padding: 16,
                      marginBottom: 12, elevation: 2,
                      shadowColor: theme.shadow, shadowOpacity: 0.08, shadowRadius: 6 },
  tarjetaTerminada: { borderLeftWidth: 4, borderLeftColor: theme.primary },
  tarjetaHeader:    { flexDirection: 'row', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: 4 },
  nombreLista:      { fontSize: 17, fontWeight: '700', color: theme.textPrimary, flex: 1 },
  totalPesos:       { fontSize: 17, fontWeight: '700', color: theme.primary, marginLeft: 8 },
  btnMenu:          { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2,
                      borderRadius: 6, backgroundColor: theme.surfaceAlt },
  btnMenuTxt:       { fontSize: 20, color: theme.textSecondary,
                      fontWeight: '700', lineHeight: 22 },
  catChipsRow:      { flexDirection: 'row', alignItems: 'center',
                      marginTop: 2, marginBottom: 6 },
  catChipEmoji:     { fontSize: 14, marginRight: 4 },
  catChipExtras:    { fontSize: 11, color: theme.textSecondary,
                      fontWeight: '700', marginLeft: 2 },
  contador:         { fontSize: 13, color: theme.textSecondary, marginBottom: 10 },
  barraFondo:       { height: 6, backgroundColor: theme.progressTrack, borderRadius: 3, marginBottom: 8 },
  barraRelleno:     { height: 6, backgroundColor: theme.primary, borderRadius: 3 },
  barraTerminada:   { backgroundColor: theme.primaryDark },
  hint:             { fontSize: 10, color: theme.textMuted, textAlign: 'right' },
  emptyContainer:   { flex: 1, alignItems: 'center', justifyContent: 'center',
                      paddingBottom: 60 },
  emptyEmoji:       { fontSize: 64, marginBottom: 16 },
  emptyTitulo:      { fontSize: 20, fontWeight: '700', color: theme.textPrimary, marginBottom: 8 },
  emptySubtitulo:   { fontSize: 15, color: theme.textMuted, textAlign: 'center', lineHeight: 22 },
  modalOverlay:     { flex: 1, backgroundColor: theme.overlay,
                      justifyContent: 'center', padding: 24 },
  modalContent:     { backgroundColor: theme.surface, borderRadius: 16, padding: 24 },
  modalTitulo:      { fontSize: 18, fontWeight: '700', marginBottom: 16, color: theme.textPrimary },
  modalInput:       { backgroundColor: theme.surfaceAlt, borderRadius: 10, padding: 12,
                      fontSize: 16, marginBottom: 12, color: theme.textPrimary },
  modalRow:         { flexDirection: 'row' },
  modalBtn:         { padding: 14, borderRadius: 10, alignItems: 'center' },
  errorTexto:       { color: theme.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  modalBtnCancel:   { backgroundColor: theme.surfaceAlt },
  modalBtnCancelTxt:{ color: theme.textSecondary, fontWeight: '600' },
  modalBtnOk:       { backgroundColor: theme.primary, marginLeft: 8 },
  modalBtnOkTxt:    { color: theme.onPrimary, fontWeight: '600' },
  modalBtnQuitar:   { backgroundColor: theme.dangerSoft },
  modalBtnQuitarTxt:{ color: theme.danger, fontWeight: '600' },

  banner:           { flexDirection: 'row', alignItems: 'center',
                      backgroundColor: theme.dangerSoft, borderRadius: 12,
                      padding: 12, marginBottom: 12,
                      borderLeftWidth: 4, borderLeftColor: theme.danger },
  bannerEmoji:      { fontSize: 20, marginRight: 10 },
  bannerTexto:      { flex: 1, fontSize: 14, fontWeight: '600',
                      color: theme.textPrimary },

  tarjetaUrgente:   { borderLeftWidth: 4, borderLeftColor: theme.danger },

  badgeRec:         { flexDirection: 'row', alignItems: 'center',
                      alignSelf: 'flex-start', paddingHorizontal: 8,
                      paddingVertical: 3, borderRadius: 6, marginBottom: 6,
                      maxWidth: '100%' },
  badgeVencido:     { backgroundColor: theme.dangerSoft },
  badgeHoy:         { backgroundColor: theme.primarySoft },
  badgePendiente:   { backgroundColor: theme.surfaceAlt },
  badgeCompletado:  { backgroundColor: theme.surfaceAlt },
  badgeTexto:       { fontSize: 11, fontWeight: '700', color: theme.textPrimary },
  badgeMensaje:     { fontSize: 11, color: theme.textSecondary, flexShrink: 1 },

  btnHecho:         { marginTop: 8, paddingVertical: 8,
                      backgroundColor: theme.primarySoft, borderRadius: 8,
                      alignItems: 'center' },
  btnHechoTxt:      { color: theme.primary, fontSize: 13, fontWeight: '600' },

  recordatorioSubtitulo:  { fontSize: 13, color: theme.textSecondary,
                            marginBottom: 16, marginTop: -12 },
  recordatorioLabel:      { fontSize: 13, fontWeight: '600',
                            color: theme.textSecondary, marginBottom: 6 },
  recordatorioPickerBtn:  { backgroundColor: theme.surfaceAlt, borderRadius: 10,
                            padding: 12, marginBottom: 12 },
  recordatorioPickerTxt:  { fontSize: 15, color: theme.textPrimary },
});
