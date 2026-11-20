import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../shared/language/language';
import { spacing, type, useTheme } from '../../shared/theme/theme';
import type { HomeOverview } from './home-overview';

export function HomeFlow({ flow }: { flow: HomeOverview['flow'] }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [width, setWidth] = useState(0);
  const data = flow.flatMap(({ day, income, expense }) =>
    income.kind === 'available' && expense.kind === 'available'
      ? [{ day, income: income.minor, expense: expense.minor }] : []);
  const height = 78;
  const maximum = Math.max(1, ...data.flatMap(({ income, expense }) => [income, expense]));
  const inset = 4;

  if (data.length === 0 || data.length !== flow.length) {
    return <Text style={{ color: colors.secondaryText }}>{t('Flujo no disponible')}</Text>;
  }

  return (
    <View accessible accessibilityLabel={t('Gráfico de ingresos y gastos acumulados del mes')}>
      <View style={{ height }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
        {[0, 0.25, 0.5, 0.75, 1].map(tick => (
          <View key={tick} style={{ position: 'absolute', top: tick * (height - 1), left: 0, right: 0,
            height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
        ))}
        {width > 2 * inset && (['income', 'expense'] as const).map(key => {
          const tint = key === 'income' ? colors.income : colors.primary;
          const points = data.map((point, index) => ({
            x: data.length === 1 ? width / 2 : inset + index * (width - 2 * inset) / (data.length - 1),
            y: height - inset - point[key] / maximum * (height - 2 * inset),
          }));
          return <View key={key} style={StyleSheet.absoluteFill}>
            {points.map(({ x, y }, index) => {
              const previous = points[index - 1];
              if (!previous) return null;
              const dx = x - previous.x;
              const dy = y - previous.y;
              const length = Math.hypot(dx, dy);
              return <View key={index} style={{ position: 'absolute', width: length, height: 2, borderRadius: 1,
                left: (x + previous.x - length) / 2, top: (y + previous.y) / 2 - 1,
                transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }], backgroundColor: tint }} />;
            })}
            {points.slice(-1).map(({ x, y }) => <View key={key} style={{ position: 'absolute', width: 8, height: 8,
              left: x - 4, top: y - 4, borderRadius: 4, borderWidth: 2, borderColor: tint, backgroundColor: colors.surface }} />)}
          </View>;
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: data.length === 1 ? 'center' : 'space-between', marginTop: spacing.xs }}>
        {data.map(({ day }) => <Text key={day} style={{ color: colors.secondaryText, fontSize: type.micro }}>{day}</Text>)}
      </View>
    </View>
  );
}
