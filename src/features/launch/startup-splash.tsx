import { requireNativeView, requireOptionalNativeModule } from 'expo';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { database } from '../../infrastructure/storage/database';
import { useLanguage } from '../../shared/language/language';
import { useTheme } from '../../shared/theme/theme';

type NativeProps = ViewProps & { showProgress: boolean; loadingLabel: string };
const NativeSplash = Platform.OS === 'ios' && requireOptionalNativeModule('NexoLaunch')
  ? requireNativeView<NativeProps>('NexoLaunch') : null;

export function useStartupPending() {
  const [pending, setPending] = useState(true);
  useEffect(() => {
    let active = true;
    function finish() {
      if (active) setPending(false);
    }
    // Home shares this initialization promise and handles any storage error itself.
    void database().then(finish, finish);
    return () => { active = false; };
  }, []);
  return pending;
}

export function StartupSplash() {
  const [showProgress, setShowProgress] = useState(false);
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const loadingLabel = t('Cargando saldos…');

  useEffect(() => {
    const timer = setTimeout(() => setShowProgress(true), 250);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      {NativeSplash ? <NativeSplash style={StyleSheet.absoluteFill} showProgress={showProgress} loadingLabel={loadingLabel} />
        : <>
          <Image source={isDark ? require('../../../assets/branding/launch-dark.png') : require('../../../assets/branding/launch-light.png')}
            resizeMode="stretch" style={StyleSheet.absoluteFill} />
          <Image source={require('../../../assets/branding/launch-logo.png')} style={styles.logo} />
          {showProgress && <ActivityIndicator color="#FFFFFF" accessibilityLabel={loadingLabel} style={styles.progress} />}
        </>}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: '#241345', zIndex: 100, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 110, height: 110, resizeMode: 'contain' },
  progress: { position: 'absolute', top: '50%', marginTop: 76 },
});
