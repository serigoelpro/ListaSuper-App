import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SectionList,
  StyleSheet, ScrollView, Modal, Alert, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  cargarInventario, guardarInventario, genId,
} from '../storage/storage';
import {
  agregarAInventario, quitarDeInventario, ajustarCantidad,
  editarItem, agruparPorCategoria,
} from '../utils/inventario';
import { CATEGORIAS } from '../constants/categorias';
import { useTheme } from '../theme';

const CATEGORIA_DEFAULT = '8';

const getCategoria = (id) =>
  CATEGORIAS.find(c => c.id === id) || CATEGORIAS[7];

export default function InventarioScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [inventario, setInventario] = useState([]);

  const [nombreNuevo, setNombreNuevo] = useState('');
  const [categoriaNueva, setCategoriaNueva] = useState(CATEGORIA_DEFAULT);

  const [editando, setEditando] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editCategoria, setEditCategoria] = useState(CATEGORIA_DEFAULT);
  const [editCantidad, setEditCantidad] = useState('1');
  const [editError, setEditError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      cargarInventario().then(inv => {
        if (!cancelado) setInventario(inv);
      });
      return () => { cancelado = true; };
    }, [])
  );

  const persistir = (nuevoInv) => {
    setInventario(nuevoInv);
    guardarInventario(nuevoInv);
  };

  const agregar = () => {
    const nombre = nombreNuevo.trim();
    if (!nombre) return;
    const nuevo = agregarAInventario(inventario, {
      id: genId(),
      nombre,
      categoriaId: categoriaNueva,
      cantidad: 1,
    });
    persistir(nuevo);
    setNombreNuevo('');
    setCategoriaNueva(CATEGORIA_DEFAULT);
  };

  const incrementar = (id) => persistir(ajustarCantidad(inventario, id, 1));
  const decrementar = (id) => persistir(ajustarCantidad(inventario, id, -1));

  const quitar = (item) => {
    const borrar = () => persistir(quitarDeInventario(inventario, item.id));
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar "${item.nombre}" del inventario?`)) borrar();
      return;
    }
    Alert.alert('Eliminar del inventario', `¿Eliminar "${item.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: borrar },
    ]);
  };

  const abrirEdit = (item) => {
    setEditando(item);
    setEditNombre(item.nombre);
    setEditCategoria(item.categoriaId || CATEGORIA_DEFAULT);
    setEditCantidad(String(item.cantidad));
    setEditError('');
  };

  const cerrarEdit = () => {
    setEditando(null);
    setEditError('');
  };

  const guardarEdit = () => {
    if (!editando) return;
    const nombre = editNombre.trim();
    if (!nombre) {
      setEditError('El nombre es obligatorio.');
      return;
    }
    const cantidad = parseInt(editCantidad, 10);
    if (Number.isNaN(cantidad) || cantidad < 1) {
      setEditError('La cantidad debe ser al menos 1.');
      return;
    }
    persistir(editarItem(inventario, editando.id, {
      nombre, categoriaId: editCategoria, cantidad,
    }));
    cerrarEdit();
  };

  const accionesItem = (item) => {
    if (Platform.OS === 'web') {
      const accion = window.prompt(
        `"${item.nombre}"\nEscribe "editar" o "eliminar":`, 'editar'
      );
      if (accion === 'editar') abrirEdit(item);
      else if (accion === 'eliminar') quitar(item);
      return;
    }
    Alert.alert(item.nombre, '¿Qué querés hacer?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Editar', onPress: () => abrirEdit(item) },
      { text: 'Eliminar', style: 'destructive', onPress: () => quitar(item) },
    ]);
  };

  const secciones = useMemo(() => {
    const grupos = agruparPorCategoria(inventario);
    return CATEGORIAS
      .filter(cat => grupos.has(cat.id))
      .map(cat => ({
        title: `${cat.emoji}  ${cat.nombre}`,
        data: grupos.get(cat.id),
      }));
  }, [inventario]);

  const totalItems = inventario.reduce((s, i) => s + (i.cantidad || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.addBox}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={nombreNuevo}
            onChangeText={setNombreNuevo}
            placeholder="Nuevo producto en casa"
            placeholderTextColor={theme.textMuted}
            onSubmitEditing={agregar}
          />
          <TouchableOpacity style={styles.btnAgregar} onPress={agregar}>
            <Text style={styles.btnAgregarTxt}>+</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10 }}
        >
          {CATEGORIAS.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catChip,
                categoriaNueva === cat.id && styles.catChipActivo,
              ]}
              onPress={() => setCategoriaNueva(cat.id)}
            >
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text style={[
                styles.catNombre,
                categoriaNueva === cat.id && styles.catNombreActivo,
              ]}>
                {cat.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {inventario.length > 0 && (
        <Text style={styles.resumen}>
          {inventario.length} producto{inventario.length !== 1 ? 's' : ''}
          {' · '}
          {totalItems} unidad{totalItems !== 1 ? 'es' : ''} en total
        </Text>
      )}

      <SectionList
        sections={secciones}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={
          secciones.length === 0 ? { flex: 1 } : { paddingBottom: 32 }
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyTitulo}>Inventario vacío</Text>
            <Text style={styles.emptySubtitulo}>
              Agregá lo que ya tenés en casa{'\n'}
              para evitar duplicar compras.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.seccionTitulo}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const cat = getCategoria(item.categoriaId);
          return (
            <View style={styles.itemRow}>
              <Text style={styles.itemEmoji}>{cat.emoji}</Text>
              <Text style={styles.itemNombre} numberOfLines={1}>
                {item.nombre}
              </Text>

              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => decrementar(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.stepBtnTxt}>−</Text>
              </TouchableOpacity>
              <Text style={styles.cantidadTxt}>{item.cantidad}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => incrementar(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.stepBtnTxt}>+</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnMenu}
                onPress={() => accionesItem(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.btnMenuTxt}>⋮</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <Modal
        visible={editando !== null}
        animationType="fade"
        transparent
        onRequestClose={cerrarEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Editar producto</Text>

            <Text style={styles.modalLabel}>Nombre</Text>
            <TextInput
              style={styles.modalInput}
              value={editNombre}
              onChangeText={setEditNombre}
              placeholder="Nombre"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={styles.modalLabel}>Cantidad</Text>
            <TextInput
              style={styles.modalInput}
              value={editCantidad}
              onChangeText={setEditCantidad}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={styles.modalLabel}>Categoría</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            >
              {CATEGORIAS.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catChip,
                    editCategoria === cat.id && styles.catChipActivo,
                  ]}
                  onPress={() => setEditCategoria(cat.id)}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[
                    styles.catNombre,
                    editCategoria === cat.id && styles.catNombreActivo,
                  ]}>
                    {cat.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {editError ? (
              <Text style={styles.errorTexto}>{editError}</Text>
            ) : null}

            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { flex: 1 }]}
                onPress={cerrarEdit}
              >
                <Text style={styles.modalBtnCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnOk, { flex: 1 }]}
                onPress={guardarEdit}
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

const makeStyles = (theme) => StyleSheet.create({
  container:       { flex: 1, backgroundColor: theme.bg },

  addBox:          { backgroundColor: theme.surface, padding: 16,
                     borderBottomWidth: 1, borderBottomColor: theme.borderSubtle },
  inputRow:        { flexDirection: 'row', gap: 8 },
  input:           { flex: 1, backgroundColor: theme.surfaceAlt, borderRadius: 10,
                     paddingHorizontal: 14, paddingVertical: 10,
                     fontSize: 16, color: theme.textPrimary,
                     borderWidth: 1, borderColor: theme.border },
  btnAgregar:      { backgroundColor: theme.primary, borderRadius: 10,
                     width: 48, alignItems: 'center', justifyContent: 'center' },
  btnAgregarTxt:   { color: theme.onPrimary, fontSize: 28, lineHeight: 32 },

  catChip:         { alignItems: 'center', backgroundColor: theme.primarySoft,
                     borderRadius: 10, padding: 8, marginRight: 8, minWidth: 70 },
  catChipActivo:   { backgroundColor: theme.primary },
  catEmoji:        { fontSize: 20 },
  catNombre:       { fontSize: 10, color: theme.textSecondary, marginTop: 2,
                     textAlign: 'center' },
  catNombreActivo: { color: theme.onPrimary },

  resumen:         { fontSize: 12, color: theme.textSecondary,
                     paddingHorizontal: 16, paddingVertical: 10 },

  seccionTitulo:   { fontSize: 13, fontWeight: '700', color: theme.textSecondary,
                     textTransform: 'uppercase', letterSpacing: 0.5,
                     paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },

  itemRow:         { flexDirection: 'row', alignItems: 'center',
                     backgroundColor: theme.surface,
                     marginHorizontal: 16, marginBottom: 6,
                     borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  itemEmoji:       { fontSize: 22, marginRight: 10 },
  itemNombre:      { flex: 1, fontSize: 15, fontWeight: '600',
                     color: theme.textPrimary },
  stepBtn:         { width: 28, height: 28, borderRadius: 14,
                     backgroundColor: theme.surfaceAlt,
                     alignItems: 'center', justifyContent: 'center',
                     marginHorizontal: 2 },
  stepBtnTxt:      { color: theme.textPrimary, fontSize: 18, fontWeight: '700',
                     lineHeight: 20 },
  cantidadTxt:     { fontSize: 15, fontWeight: '700', color: theme.primary,
                     minWidth: 24, textAlign: 'center' },
  btnMenu:         { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2,
                     borderRadius: 6, backgroundColor: theme.surfaceAlt },
  btnMenuTxt:      { fontSize: 18, color: theme.textSecondary,
                     fontWeight: '700', lineHeight: 20 },

  emptyContainer:  { flex: 1, alignItems: 'center', justifyContent: 'center',
                     padding: 32 },
  emptyEmoji:      { fontSize: 64, marginBottom: 16 },
  emptyTitulo:     { fontSize: 20, fontWeight: '700', color: theme.textPrimary,
                     marginBottom: 8 },
  emptySubtitulo:  { fontSize: 15, color: theme.textMuted, textAlign: 'center',
                     lineHeight: 22 },

  modalOverlay:    { flex: 1, backgroundColor: theme.overlay,
                     justifyContent: 'center', padding: 24 },
  modalContent:    { backgroundColor: theme.surface, borderRadius: 16, padding: 24 },
  modalTitulo:     { fontSize: 18, fontWeight: '700', marginBottom: 16,
                     color: theme.textPrimary },
  modalLabel:      { fontSize: 13, fontWeight: '600', color: theme.textSecondary,
                     marginBottom: 6 },
  modalInput:      { backgroundColor: theme.surfaceAlt, borderRadius: 10,
                     padding: 12, fontSize: 16, marginBottom: 12,
                     color: theme.textPrimary },
  modalRow:        { flexDirection: 'row' },
  modalBtn:        { padding: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnCancel:  { backgroundColor: theme.surfaceAlt },
  modalBtnCancelTxt:{ color: theme.textSecondary, fontWeight: '600' },
  modalBtnOk:      { backgroundColor: theme.primary, marginLeft: 8 },
  modalBtnOkTxt:   { color: theme.onPrimary, fontWeight: '600' },
  errorTexto:      { color: theme.danger, fontSize: 13, marginBottom: 12,
                     textAlign: 'center' },
});
