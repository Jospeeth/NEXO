import { File, Paths } from 'expo-file-system';
import { Share } from 'react-native';

export async function shareCsv(name: string, contents: string) {
  const file = new File(Paths.cache, name);
  try {
    file.create({ overwrite: true });
    await file.write(contents);
    await Share.share({ url: file.uri });
  } finally {
    if (file.exists) file.delete();
  }
}
