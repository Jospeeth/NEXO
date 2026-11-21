export const bankGroups = {
  'Bancos tradicionales': [
    'Bancolombia', 'Davivienda', 'Banco de Bogotá', 'BBVA Colombia', 'Banco de Occidente', 'Banco Popular',
    'Banco AV Villas', 'Banco Caja Social', 'Banco Agrario', 'Banco Falabella', 'Banco Pichincha', 'Banco Itaú',
    'Banco GNB Sudameris', 'Banco Serfinanza', 'Bancoomeva', 'Banco Finandina', 'Banco W', 'Banco Mundo Mujer',
    'Bancamía', 'Banco Unión', 'Banco Contactar', 'Ban100', 'Citibank Colombia', 'Banco Santander Colombia',
  ],
  'Productos digitales': ['Nu Colombia', 'Lulo Bank', 'Nequi', 'DaviPlata', 'Rappi', 'RappiPay', 'Ualá', 'MOVii', 'dale!',
    'Pibank', 'Coink', 'Global66', 'Bold', 'Powwi'],
} as const;

export const creditProducts = {
  'RappiCard': { issuer: 'Banco Davivienda S.A.' },
} as const;

export function creditProduct(name: string) {
  return Object.entries(creditProducts).find(([product]) => institutionSearch(product) === institutionSearch(name))?.[1];
}

export function institutionSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function canonicalInstitution(value: string) {
  const key = institutionSearch(value);
  const aliases: Record<string, string> = {
    bbva: 'BBVA Colombia', nu: 'Nu Colombia', nubank: 'Nu Colombia', itau: 'Banco Itaú',
    citibank: 'Citibank Colombia', santander: 'Banco Santander Colombia',
  };
  if (Object.hasOwn(aliases, key)) return aliases[key] ?? value.trim();
  return [...Object.values(bankGroups).flat(), ...Object.keys(creditProducts)].find(name => institutionSearch(name) === key) ?? value.trim();
}

export function bankInitials(name: string) {
  const words = name.replace(/^Banco\s+(de\s+)?/i, '').split(/\s+/);
  return (words.length > 1 ? words.slice(0, 2).map(word => word[0]).join('') : (words[0] ?? '').slice(0, 2)).toUpperCase();
}
