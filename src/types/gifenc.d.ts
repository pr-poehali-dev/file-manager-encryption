declare module 'gifenc' {
  interface GIFEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: { palette?: number[][]; delay?: number; transparent?: boolean; dispose?: number }
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    buffer: ArrayBuffer;
    stream: unknown;
  }

  export function GIFEncoder(opts?: { auto?: boolean }): GIFEncoderInstance;
  export function quantize(rgba: Uint8ClampedArray, maxColors: number, opts?: { format?: string; oneBitAlpha?: boolean | number }): number[][];
  export function applyPalette(rgba: Uint8ClampedArray, palette: number[][], format?: string): Uint8Array;
  export function prequantize(rgba: Uint8ClampedArray, opts?: { roundRGB?: number; oneBitAlpha?: boolean | number }): void;
  export function nearestColorIndex(palette: number[][], pixel: number[]): number;
  export function nearestColorIndexWithDistance(palette: number[][], pixel: number[]): [number, number];
  export function snapColorsToPalette(palette: number[][], knownColors: number[][], threshold?: number): void;
}
