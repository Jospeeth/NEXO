import { useLanguage } from '../../shared/language/language';
import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, View, Platform, Pressable } from 'react-native';
import { GlassBackdrop } from '../../shared/ui/GlassView';
import { Ionicons } from '@expo/vector-icons';
import { radius, useTheme } from '../../shared/theme/theme';

export default function TabLayout() {
  const { t } = useLanguage();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 86 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 26 : 10,
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarBackground: () => <GlassBackdrop intensity={65} />,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      {/* 1. Inicio */}
      <Tabs.Screen
        name="index"
        options={{
          title: t("Inicio"),
          tabBarLabel: t("Inicio"),
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={23}
              color={focused ? colors.primary : colors.secondaryText}
            />
          ),
        }}
      />

      {/* 2. Movimientos */}
      <Tabs.Screen
        name="movements"
        options={{
          title: t("Movimientos"),
          tabBarLabel: t("Movimientos"),
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'swap-vertical' : 'swap-vertical-outline'}
              size={24}
              color={focused ? colors.primary : colors.secondaryText}
            />
          ),
        }}
      />

      {/* 3. Central Add (+) Button */}
      <Tabs.Screen
        name="add-tab"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarButton: () => (
            <Pressable
              onPress={() => router.push('/add')}
              style={styles.centralAddContainer}
              accessibilityRole="button"
              accessibilityLabel={t("Nueva transacción")}
            >
              <View
                style={[
                  styles.centralAddBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                ]}
              >
                <Ionicons name="add" size={28} color={colors.onPrimary} />
              </View>
            </Pressable>
          ),
        }}
      />

      {/* 4. Cuentas */}
      <Tabs.Screen
        name="accounts"
        options={{
          title: t("Cuentas"),
          tabBarLabel: t("Cuentas"),
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'wallet' : 'wallet-outline'}
              size={23}
              color={focused ? colors.primary : colors.secondaryText}
            />
          ),
        }}
      />

      {/* 5. Ajustes */}
      <Tabs.Screen
        name="settings"
        options={{
          title: t("Ajustes"),
          tabBarLabel: t("Ajustes"),
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={23}
              color={focused ? colors.primary : colors.secondaryText}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centralAddContainer: {
    top: -12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centralAddBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
});
