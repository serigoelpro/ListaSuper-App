import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ListasScreen from './src/screens/ListasScreen';
import DetalleListaScreen from './src/screens/DetalleListaScreen';
import EstadisticasScreen from './src/screens/EstadisticasScreen';
import InventarioScreen from './src/screens/InventarioScreen';
import { ThemeProvider, useTheme } from './src/theme';

const Stack = createStackNavigator();

function NavegadorConTema() {
  const { theme, toggle } = useTheme();

  const navTheme = theme.name === 'dark'
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: theme.bg,
          card: theme.primary,
          text: theme.onPrimary,
          border: theme.border,
          primary: theme.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: theme.bg,
          card: theme.primary,
          text: theme.onPrimary,
          border: theme.border,
          primary: theme.primary,
        },
      };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.primary },
          headerTintColor: theme.onPrimary,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen
          name="Listas"
          component={ListasScreen}
          options={({ navigation }) => ({
            title: '🛒 Mis Listas',
            headerRight: () => (
              <View style={{ flexDirection: 'row', marginRight: 12 }}>
                <TouchableOpacity
                  onPress={toggle}
                  style={{ padding: 4, marginRight: 4 }}
                  accessibilityLabel="Alternar modo oscuro"
                >
                  <Text style={{ fontSize: 20 }}>
                    {theme.name === 'dark' ? '☀️' : '🌙'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Inventario')}
                  style={{ padding: 4, marginRight: 4 }}
                  accessibilityLabel="Ver inventario"
                >
                  <Text style={{ fontSize: 22 }}>📦</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Estadisticas')}
                  style={{ padding: 4 }}
                  accessibilityLabel="Ver estadísticas"
                >
                  <Text style={{ fontSize: 22 }}>📊</Text>
                </TouchableOpacity>
              </View>
            ),
          })}
        />
        <Stack.Screen
          name="DetalleLista"
          component={DetalleListaScreen}
          options={({ route }) => ({ title: route.params?.nombre || 'Lista' })}
        />
        <Stack.Screen
          name="Estadisticas"
          component={EstadisticasScreen}
          options={{ title: '📊 Estadísticas' }}
        />
        <Stack.Screen
          name="Inventario"
          component={InventarioScreen}
          options={{ title: '📦 Mi Inventario' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NavegadorConTema />
    </ThemeProvider>
  );
}
