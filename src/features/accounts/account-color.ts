export function normalizeAccountColor(value: string): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  return match?.[1] ? '#' + match[1].toUpperCase() : null;
}

export function accountColorGradient(hex: string): [string, string] {
  const rgb = [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
  const toHex = (channels: number[]) =>
    '#' + channels.map(value => Math.round(value).toString(16).padStart(2, '0')).join('').toUpperCase();
  const scale = (factor: number) => rgb.map(value => value * factor);
  const linear = (value: number) => {
    const channel = Math.round(value) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (channels: number[]) => channels.reduce(
    (sum, value, index) => sum + (index === 0 ? 0.2126 : index === 1 ? 0.7152 : 0.0722) * linear(value), 0
  );

  // Keep even the lighter stop dark enough for white text.
  let factor = 1;
  while (luminance(scale(factor)) > 1.05 / 4.5 - 0.05) factor *= 0.95;
  if (Math.max(...rgb) < 32) {
    return [toHex(rgb.map(value => value + 28)), toHex(scale(0.6))];
  }
  return [toHex(scale(factor)), toHex(scale(factor * 0.58))];
}
