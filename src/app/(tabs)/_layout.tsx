import { useLanguage } from '../../shared/language/language';
import { Tabs, useRouter } from 'expo-router';
import { Image, StyleSheet, View, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassBackdrop } from '../../shared/ui/GlassView';
import { Ionicons } from '@expo/vector-icons';
import { radius, useTheme } from '../../shared/theme/theme';

export default function TabLayout() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { colors } = useTheme();
  const activityLabel = language === 'en' ? 'Activity' : t("Movimientos");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: Math.max(bottom, 10) + 2,
          height: 62,
          paddingTop: 6,
          paddingBottom: 5,
          borderTopWidth: 0,
          borderRadius: radius.hero,
          backgroundColor: 'transparent',
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.13,
          shadowRadius: 12,
          elevation: 0,
        },
        tabBarBackground: () => <GlassBackdrop borderRadius={radius.hero} intensity={65} />,
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
          tabBarIcon: ({ focused }) => Platform.OS === 'ios' ? (
            <TabSymbol name="home" color={focused ? colors.primary : colors.secondaryText} />
          ) : (
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
          title: activityLabel,
          tabBarLabel: activityLabel,
          tabBarIcon: ({ focused }) => Platform.OS === 'ios' ? (
            <TabSymbol name="movements" color={focused ? colors.primary : colors.secondaryText} />
          ) : (
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
              style={({ pressed }) => [styles.centralAddContainer, pressed && { opacity: 0.8 }]}
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
                <LinearGradient colors={['#A259F4', '#651CC7']} start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }} style={styles.addGradient} />
                {Platform.OS === 'ios' ? <TabSymbol name="add" color="#FFFFFF" size={29} />
                  : <Ionicons name="add" size={28} color="#FFFFFF" />}
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
          tabBarIcon: ({ focused }) => Platform.OS === 'ios' ? (
            <TabSymbol name="accounts" color={focused ? colors.primary : colors.secondaryText} />
          ) : (
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
          tabBarIcon: ({ focused }) => Platform.OS === 'ios' ? (
            <TabSymbol name="settings" color={focused ? colors.primary : colors.secondaryText} />
          ) : (
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

const tabSymbols = {
  home: require('../../../assets/home/tab-home.png'),
  movements: require('../../../assets/home/tab-movements.png'),
  add: require('../../../assets/home/tab-add.png'),
  accounts: require('../../../assets/home/tab-accounts.png'),
  settings: require('../../../assets/home/tab-settings.png'),
};

function TabSymbol({ name, color, size = 29 }: { name: keyof typeof tabSymbols; color: string; size?: number }) {
  return <Image source={tabSymbols[name]} style={{ width: size, height: size, tintColor: color }} />;
}

const styles = StyleSheet.create({
  addGradient: { ...StyleSheet.absoluteFill, borderRadius: radius.pill },
  centralAddContainer: {
    top: -10,
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
