import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

export function MetallicSheen() {
  return <LinearGradient pointerEvents="none"
    colors={['#FFFFFF00', '#FFFFFF14', '#FFFFFF02', '#00000016']}
    locations={[0.12, 0.43, 0.66, 1]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
    style={StyleSheet.absoluteFill} />;
}

