import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView as NativeGlassView } from 'expo-glass-effect';
import type { PropsWithChildren } from 'react';
import { useAppearanceSettings } from '../theme/appearance';
import { radius, useTheme } from '../theme/theme';

interface GlassBackdropProps {
  borderRadius?: number;
  intensity?: number;
}

export function GlassBackdrop({ borderRadius = 0, intensity = 45 }: GlassBackdropProps) {
  const { glassKind } = useAppearanceSettings();
  const { colors, isDark } = useTheme();
  const style = [StyleSheet.absoluteFill, { borderRadius }];
  if (glassKind === 'native') {
    return <NativeGlassView pointerEvents="none" style={style} glassEffectStyle="regular"
      colorScheme={isDark ? 'dark' : 'light'} />;
  }
  if (glassKind === 'blur') {
    return <BlurView pointerEvents="none" intensity={intensity} tint={isDark ? 'dark' : 'light'}
      style={[style, { overflow: 'hidden' }]} />;
  }
  return <View pointerEvents="none" style={[style, { backgroundColor: colors.surface }]} />;
}

export function GlassView({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { colors } = useTheme();
  return (
    <View style={[{ borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, style]}>
      <GlassBackdrop borderRadius={radius.card} />
      {children}
    </View>
  );
}
