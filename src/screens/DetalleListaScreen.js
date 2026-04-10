import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, ScrollView, Platform
} from 'react-native';
import {
  cargarListas, actualizarLista, genId,
  cargarInventario, guardarInventario,
} from '../storage/storage';
import { CATEGORIAS } from '../constants/categorias';
import {
  construirSugerencias, filtrarSugerencias,
} from '../utils/sugerencias';
import {
  agregarAInventario, enStock,
} from '../utils/inventario';
import { useTheme } from '../theme';

const CATEGORIA_DEFAULT = '8';

export default function DetalleListaScreen({ route }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { listaId } = route.params;

  const [productos, setProductos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [productoEnEdicion, setProductoEnEdicion] = useState(null);
  const [otrasListas, setOtrasListas] = useState([]);
  const [inventario, setInventario] = useState([]);

  const [nombre, setNombre]       = useState('');
  const [precio, setPrecio]       = useState('');
  const [cantidad, setCantidad]   = useState('1');
  const [categoriaId, setCategoriaId] = useState(CATEGORIA_DEFAULT);
  const [errorForm, setErrorForm] = useState('');

  const cargadoRef = useRef(false);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      const [listas, inv] = await Promise.all([
        cargarListas(),
        cargarInventario(),
      ]);
      const lista = listas.find(l => l.id === listaId);
      if (!cancelado) {
        setProductos(lista ? lista.productos : []);
        setOtrasListas(listas.filter(l => l.id !== listaId));
        setInventario(inv);
        cargadoRef.current = true;
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [listaId]);

  const diccionarioSugerencias = useMemo(
    () => construirSugerencias([...otrasListas, { productos }]),
    [otrasListas, productos]
  );

  const sugerenciasVisibles = useMemo(() => {
    if (productoEnEdicion) return [];
    return filtrarSugerencias(diccionarioSugerencias, nombre, 5);
  }, [diccionarioSugerencias, nombre, productoEnEdicion]);

  const enStockEnForm = useMemo(
    () => enStock(inventario, nombre),
    [inventario, nombre]
  );

  useEffect(() => {
    if (!cargadoRef.current) return;
    actualizarLista(listaId, { productos });
  }, [productos, listaId]);

  const limpiarFormulario = () => {
    setNombre('');
    setPrecio('');
    setCantidad('1');
    setCategoriaId(CATEGORIA_DEFAULT);
    setErrorForm('');
    setProductoEnEdicion(null);
  };

  const abrirModalNuevo = () => {
    limpiarFormulario();
    setModalVisible(true);
  };

  const abrirModalEdicion = (producto) => {
    setProductoEnEdicion(producto);
    setNombre(producto.nombre);
    setPrecio(producto.precio ? String(producto.precio) : '');
    setCantidad(String(producto.cantidad));
    setCategoriaId(producto.categoriaId);
    setErrorForm('');
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    limpiarFormulario();
  };

  const aplicarSugerencia = (sug) => {
    setNombre(sug.nombre);
    setPrecio(sug.precio ? String(sug.precio) : '');
    setCategoriaId(sug.categoriaId || CATEGORIA_DEFAULT);
    setErrorForm('');
  };

  const validarFormulario = () => {
    if (!nombre.trim()) return 'El nombre es obligatorio.';
    if (precio.trim() !== '') {
      const p = parseFloat(precio.replace(',', '.'));
      if (Number.isNaN(p) || p < 0) return 'El precio no puede ser negativo.';
    }
    const c = parseInt(cantidad, 10);
    if (Number.isNaN(c) || c < 1) return 'La cantidad debe ser al menos 1.';
    return null;
  };

  const guardarProducto = () => {
    const error = validarFormulario();
    if (error) {
      setErrorForm(error);
      return;
    }

    const precioNum = precio.trim() === ''
      ? 0
      : parseFloat(precio.replace(',', '.'));
    const cantidadNum = parseInt(cantidad, 10);

    if (productoEnEdicion) {
      setProductos(productos.map(p =>
        p.id === productoEnEdicion.id
          ? {
              ...p,
              nombre: nombre.trim(),
              precio: precioNum,
              cantidad: cantidadNum,
              categoriaId,
            }
          : p
      ));
    } else {
      setProductos([
        ...productos,
        {
          id: genId(),
          nombre: nombre.trim(),
          precio: precioNum,
          cantidad: cantidadNum,
          categoriaId,
          comprado: false,
        },
      ]);
    }

    cerrarModal();
  };

  const toggleComprado = (id) => {
    setProductos(productos.map(p =>
      p.id === id ? { ...p, comprado: !p.comprado } : p
    ));
  };

  const eliminarProducto = (id) => {
    confirmar(
      'Eliminar producto',
      '¿Estás seguro?',
      () => setProductos(productos.filter(p => p.id !== id)),
    );
  };

  const moverAInventario = (producto) => {
    const nuevoInventario = agregarAInventario(inventario, {
      id: genId(),
      nombre: producto.nombre,
      categoriaId: producto.categoriaId,
      cantidad: 1,
    });
    setInventario(nuevoInventario);
    guardarInventario(nuevoInventario);
    if (Platform.OS === 'web') {
      window.alert(`"${producto.nombre}" agregado a tu inventario`);
    } else {
      Alert.alert('✓ Agregado al inventario', `"${producto.nombre}" está ahora en tu inventario.`);
    }
  };

  const accionesProducto = (producto) => {
    if (Platform.OS === 'web') {
      const accion = window.prompt(
        `"${producto.nombre}"\nEscribe "editar", "inventario" o "eliminar":`,
        'editar'
      );
      if (accion === 'editar') abrirModalEdicion(producto);
      else if (accion === 'inventario') moverAInventario(producto);
      else if (accion === 'eliminar') eliminarProducto(producto.id);
      return;
    }
    Alert.alert(
      producto.nombre,
      '¿Qué querés hacer?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Editar', onPress: () => abrirModalEdicion(producto) },
        { text: '📦 Agregar al inventario', onPress: () => moverAInventario(producto) },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => eliminarProducto(producto.id),
        },
      ],
    );
  };

  const totalGeneral  = productos.reduce((s, p) => s + p.precio * p.cantidad, 0);
  const totalComprado = productos
    .filter(p => p.comprado)
    .reduce((s, p) => s + p.precio * p.cantidad, 0);

  const getCategoria = (id) =>
    CATEGORIAS.find(c => c.id === id) || CATEGORIAS[7];

  return (
    <View style={styles.container}>

      <View style={styles.presupuesto}>
        <View style={styles.presupuestoItem}>
          <Text style={styles.presupuestoLabel}>Total</Text>
          <Text style={styles.presupuestoValor}>${totalGeneral.toFixed(2)}</Text>
        </View>
        <View style={styles.separador} />
        <View style={styles.presupuestoItem}>
          <Text style={styles.presupuestoLabel}>Comprado</Text>
          <Text style={[styles.presupuestoValor, { color: theme.primary }]}>
            ${totalComprado.toFixed(2)}
          </Text>
        </View>
        <View style={styles.separador} />
        <View style={styles.presupuestoItem}>
          <Text style={styles.presupuestoLabel}>Restante</Text>
          <Text style={[styles.presupuestoValor, { color: theme.danger }]}>
            ${(totalGeneral - totalComprado).toFixed(2)}
          </Text>
        </View>
      </View>

      <FlatList
        data={productos}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text style={styles.vacio}>Sin productos. ¡Agrega el primero!</Text>
        }
        renderItem={({ item }) => {
          const cat = getCategoria(item.categoriaId);
          const stock = enStock(inventario, item.nombre);
          return (
            <TouchableOpacity
              style={[styles.tarjeta, item.comprado && styles.tarjetaComprada]}
              onPress={() => toggleComprado(item.id)}
              onLongPress={() => accionesProducto(item)}
            >
              <Text style={styles.emoji}>{cat.emoji}</Text>
              <View style={styles.info}>
                <Text style={[styles.nombreProducto, item.comprado && styles.tachado]}>
                  {item.nombre}
                </Text>
                <Text style={styles.subtext}>
                  {cat.nombre} · x{item.cantidad}
                </Text>
                {stock && (
                  <View style={styles.stockBadge}>
                    <Text style={styles.stockBadgeTxt}>
                      📦 En stock ({stock.cantidad})
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.precioBox}>
                <Text style={styles.precio}>
                  ${(item.precio * item.cantidad).toFixed(2)}
                </Text>
                {item.comprado && <Text style={styles.check}>✓</Text>}
              </View>
              <TouchableOpacity
                style={styles.btnMenu}
                onPress={() => accionesProducto(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Opciones del producto"
              >
                <Text style={styles.btnMenuTxt}>⋮</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={abrirModalNuevo}
      >
        <Text style={styles.fabTexto}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent
             onRequestClose={cerrarModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>
              {productoEnEdicion ? 'Editar Producto' : 'Nuevo Producto'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre del producto"
              placeholderTextColor={theme.textMuted}
              value={nombre}
              onChangeText={setNombre}
            />

            {sugerenciasVisibles.length > 0 && (
              <View style={styles.sugerenciasBox}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  style={styles.sugerenciasScroll}
                >
                  {sugerenciasVisibles.map((sug, idx) => {
                    const cat = getCategoria(sug.categoriaId);
                    return (
                      <TouchableOpacity
                        key={`${sug.nombre}-${idx}`}
                        style={[
                          styles.sugerenciaItem,
                          idx === sugerenciasVisibles.length - 1 && { borderBottomWidth: 0 },
                        ]}
                        onPress={() => aplicarSugerencia(sug)}
                        activeOpacity={0.6}
                      >
                        <Text style={styles.sugerenciaEmoji}>{cat.emoji}</Text>
                        <Text style={styles.sugerenciaNombre} numberOfLines={1}>
                          {sug.nombre}
                        </Text>
                        <Text style={styles.sugerenciaPrecio}>
                          ${sug.precio.toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Precio"
                placeholderTextColor={theme.textMuted}
                value={precio}
                onChangeText={setPrecio}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, { width: 70, marginLeft: 8 }]}
                placeholder="Cant."
                placeholderTextColor={theme.textMuted}
                value={cantidad}
                onChangeText={setCantidad}
                keyboardType="number-pad"
              />
            </View>

            <Text style={styles.label}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}>
              {CATEGORIAS.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catChip,
                    categoriaId === cat.id && styles.catChipActivo
                  ]}
                  onPress={() => setCategoriaId(cat.id)}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[
                    styles.catNombre,
                    categoriaId === cat.id && styles.catNombreActivo,
                  ]}>
                    {cat.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {enStockEnForm && !productoEnEdicion && (
              <View style={styles.avisoStock}>
                <Text style={styles.avisoStockTxt}>
                  📦 Ya tenés {enStockEnForm.cantidad} en tu inventario
                </Text>
              </View>
            )}

            {errorForm ? (
              <Text style={styles.errorTexto}>{errorForm}</Text>
            ) : null}

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel, { flex: 1 }]}
                onPress={cerrarModal}
              >
                <Text style={styles.btnCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnOk, { flex: 1 }]}
                onPress={guardarProducto}
              >
                <Text style={styles.btnOkTxt}>
                  {productoEnEdicion ? 'Guardar' : 'Agregar'}
                </Text>
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
  container:       { flex: 1, backgroundColor: theme.bg },
  presupuesto:     { flexDirection: 'row', backgroundColor: theme.surface, margin: 16,
                     borderRadius: 12, padding: 16, elevation: 2,
                     shadowColor: theme.shadow, shadowOpacity: 0.08, shadowRadius: 4 },
  presupuestoItem: { flex: 1, alignItems: 'center' },
  presupuestoLabel:{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 },
  presupuestoValor:{ fontSize: 18, fontWeight: '700', color: theme.textPrimary },
  separador:       { width: 1, backgroundColor: theme.borderSubtle },
  tarjeta:         { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface,
                     marginHorizontal: 16, marginBottom: 8, borderRadius: 12,
                     padding: 12, elevation: 1 },
  tarjetaComprada: { opacity: 0.5 },
  emoji:           { fontSize: 28, marginRight: 12 },
  info:            { flex: 1 },
  nombreProducto:  { fontSize: 16, fontWeight: '600', color: theme.textPrimary },
  tachado:         { textDecorationLine: 'line-through', color: theme.textMuted },
  subtext:         { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  precioBox:       { alignItems: 'flex-end' },
  precio:          { fontSize: 15, fontWeight: '700', color: theme.textPrimary },
  check:           { color: theme.primary, fontWeight: '700', fontSize: 16 },
  btnMenu:         { marginLeft: 10, paddingHorizontal: 6, paddingVertical: 2,
                     borderRadius: 6, backgroundColor: theme.surfaceAlt,
                     alignSelf: 'center' },
  btnMenuTxt:      { fontSize: 18, color: theme.textSecondary,
                     fontWeight: '700', lineHeight: 20 },
  vacio:           { textAlign: 'center', color: theme.textMuted, marginTop: 60, fontSize: 16 },
  fab:             { position: 'absolute', bottom: 24, right: 24, backgroundColor: theme.primary,
                     width: 56, height: 56, borderRadius: 28,
                     alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabTexto:        { color: theme.onPrimary, fontSize: 32, lineHeight: 36 },
  modalOverlay:    { flex: 1, backgroundColor: theme.overlay,
                     justifyContent: 'flex-end' },
  modalContent:    { backgroundColor: theme.surface, borderTopLeftRadius: 20,
                     borderTopRightRadius: 20, padding: 24 },
  modalTitulo:     { fontSize: 20, fontWeight: '700', marginBottom: 16, color: theme.textPrimary },
  input:           { backgroundColor: theme.surfaceAlt, borderRadius: 10, padding: 12,
                     fontSize: 16, marginBottom: 12, color: theme.textPrimary },
  row:             { flexDirection: 'row' },
  label:           { fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 },
  catChip:         { alignItems: 'center', backgroundColor: theme.primarySoft,
                     borderRadius: 10, padding: 8, marginRight: 8, minWidth: 70 },
  catChipActivo:   { backgroundColor: theme.primary },
  catEmoji:        { fontSize: 20 },
  catNombre:       { fontSize: 10, color: theme.textSecondary, marginTop: 2, textAlign: 'center' },
  catNombreActivo: { color: theme.onPrimary },
  btn:             { padding: 14, borderRadius: 10, alignItems: 'center' },
  btnCancel:       { backgroundColor: theme.surfaceAlt },
  btnCancelTxt:    { color: theme.textSecondary, fontWeight: '600' },
  btnOk:           { backgroundColor: theme.primary, marginLeft: 8 },
  btnOkTxt:        { color: theme.onPrimary, fontWeight: '600' },
  errorTexto:      { color: theme.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  sugerenciasBox:  { backgroundColor: theme.surface, borderRadius: 10, marginBottom: 12,
                     borderWidth: 1, borderColor: theme.border,
                     shadowColor: theme.shadow, shadowOpacity: 0.06, shadowRadius: 4,
                     shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sugerenciasScroll:{ maxHeight: 200 },
  sugerenciaItem:  { flexDirection: 'row', alignItems: 'center',
                     paddingHorizontal: 12, paddingVertical: 10,
                     borderBottomWidth: 1, borderBottomColor: theme.borderSubtle },
  sugerenciaEmoji: { fontSize: 18, marginRight: 10 },
  sugerenciaNombre:{ flex: 1, fontSize: 15, color: theme.textPrimary },
  sugerenciaPrecio:{ fontSize: 13, color: theme.textSecondary, marginLeft: 8 },
  stockBadge:      { alignSelf: 'flex-start', marginTop: 4,
                     paddingHorizontal: 6, paddingVertical: 2,
                     backgroundColor: theme.primarySoft, borderRadius: 4 },
  stockBadgeTxt:   { fontSize: 10, color: theme.primary, fontWeight: '700' },
  avisoStock:      { backgroundColor: theme.primarySoft, borderRadius: 8,
                     padding: 10, marginBottom: 12,
                     borderLeftWidth: 3, borderLeftColor: theme.primary },
  avisoStockTxt:   { fontSize: 13, color: theme.primary, fontWeight: '600' },
});
