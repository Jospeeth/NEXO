import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import SettingsScreen from '../../features/settings/settings-screen';
import { settingsSections, type SettingsSection } from '../../features/settings/settings-menu';
import { useLanguage } from '../../shared/language/language';

export default function SettingsDetail() {
  const { t } = useLanguage();
  const { section } = useLocalSearchParams<{ section: string }>();
  if (!Object.prototype.hasOwnProperty.call(settingsSections, section)) return <Redirect href="/settings" />;
  const key = section as SettingsSection;
  return <>
    <Stack.Screen options={{ headerShown: true, title: t(settingsSections[key]), headerBackTitle: t('Ajustes') }} />
    <SettingsScreen section={key} />
  </>;
}
