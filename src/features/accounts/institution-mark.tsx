import { Image, Text, View } from 'react-native';
import { radius, useTheme } from '../../shared/theme/theme';
import { bankInitials, institutionSearch } from './institutions';
import { institutionMarks } from './institution-marks';

export function InstitutionMark({ name, size = 34 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const source = institutionMarks[institutionSearch(name)];
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: radius.sm, overflow: 'hidden',
        backgroundColor: source ? '#FFFFFF' : colors.lavender, alignItems: 'center', justifyContent: 'center' }}>
      {source ? <Image source={source} resizeMode="contain" style={{ width: size - 6, height: size - 6 }} />
        : <Text style={{ color: colors.primary, fontWeight: '700', fontSize: size * 0.34 }}>{bankInitials(name)}</Text>}
    </View>
  );
}
