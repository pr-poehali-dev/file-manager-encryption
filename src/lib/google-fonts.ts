const FONTS = [
  { name: 'Sans-serif', family: 'sans-serif', google: false },
  { name: 'Serif', family: 'serif', google: false },
  { name: 'Mono', family: 'monospace', google: false },
  { name: 'Roboto', family: 'Roboto', google: true },
  { name: 'Open Sans', family: 'Open Sans', google: true },
  { name: 'Montserrat', family: 'Montserrat', google: true },
  { name: 'Oswald', family: 'Oswald', google: true },
  { name: 'Raleway', family: 'Raleway', google: true },
  { name: 'Playfair Display', family: 'Playfair Display', google: true },
  { name: 'Bebas Neue', family: 'Bebas Neue', google: true },
  { name: 'Russo One', family: 'Russo One', google: true },
  { name: 'Pacifico', family: 'Pacifico', google: true },
  { name: 'Lobster', family: 'Lobster', google: true },
  { name: 'Comfortaa', family: 'Comfortaa', google: true },
  { name: 'Rubik', family: 'Rubik', google: true },
  { name: 'Nunito', family: 'Nunito', google: true },
  { name: 'Ubuntu', family: 'Ubuntu', google: true },
  { name: 'Fira Sans', family: 'Fira Sans', google: true },
  { name: 'PT Sans', family: 'PT Sans', google: true },
  { name: 'PT Serif', family: 'PT Serif', google: true },
  { name: 'Caveat', family: 'Caveat', google: true },
  { name: 'Permanent Marker', family: 'Permanent Marker', google: true },
  { name: 'Press Start 2P', family: 'Press Start 2P', google: true },
  { name: 'Bangers', family: 'Bangers', google: true },
  { name: 'Dela Gothic One', family: 'Dela Gothic One', google: true },
];

const loadedFonts = new Set<string>();

export function loadGoogleFont(family: string): void {
  const font = FONTS.find(f => f.family === family);
  if (!font || !font.google || loadedFonts.has(family)) return;

  loadedFonts.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;600;700;800&display=swap`;
  document.head.appendChild(link);
}

export function getFontList() {
  return FONTS;
}

export function ensureFontLoaded(family: string | undefined): string {
  if (!family) return 'sans-serif';
  const font = FONTS.find(f => f.family === family);
  if (!font) return 'sans-serif';
  if (font.google) loadGoogleFont(family);
  return font.google ? `"${family}", sans-serif` : family;
}

export default FONTS;
