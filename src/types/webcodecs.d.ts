/* eslint-disable @typescript-eslint/no-explicit-any */
interface VideoEncoderConfig {
  codec: string;
  width: number;
  height: number;
  bitrate?: number;
  framerate?: number;
  hardwareAcceleration?: string;
  avc?: { format: string };
}

interface VideoEncoderInit {
  output: (chunk: EncodedVideoChunk, meta?: any) => void;
  error: (error: DOMException) => void;
}

interface VideoFrameInit {
  timestamp: number;
  duration?: number;
}

declare class VideoEncoder {
  constructor(init: VideoEncoderInit);
  configure(config: VideoEncoderConfig): void;
  encode(frame: VideoFrame, options?: { keyFrame?: boolean }): void;
  flush(): Promise<void>;
  close(): void;
  readonly state: 'unconfigured' | 'configured' | 'closed';
  readonly encodeQueueSize: number;
  static isConfigSupported(config: VideoEncoderConfig): Promise<{ supported: boolean; config: VideoEncoderConfig }>;
}

declare class VideoFrame {
  constructor(source: HTMLCanvasElement | OffscreenCanvas | ImageBitmap, init?: VideoFrameInit);
  close(): void;
  readonly timestamp: number;
  readonly duration: number | null;
}

declare class EncodedVideoChunk {
  readonly type: string;
  readonly timestamp: number;
  readonly duration: number | null;
  readonly byteLength: number;
}

type AudioSampleFormat = 'u8' | 's16' | 's32' | 'f32' | 'u8-planar' | 's16-planar' | 's32-planar' | 'f32-planar';

interface AudioDataInit {
  format: AudioSampleFormat;
  sampleRate: number;
  numberOfFrames: number;
  numberOfChannels: number;
  timestamp: number;
  data: Float32Array | Int16Array | Int32Array | Uint8Array;
}

interface AudioEncoderConfig {
  codec: string;
  sampleRate: number;
  numberOfChannels: number;
  bitrate?: number;
}

interface AudioEncoderInit {
  output: (chunk: EncodedAudioChunk, meta?: any) => void;
  error: (error: DOMException) => void;
}

declare class AudioData {
  constructor(init: AudioDataInit);
  close(): void;
  readonly format: AudioSampleFormat;
  readonly sampleRate: number;
  readonly numberOfFrames: number;
  readonly numberOfChannels: number;
  readonly timestamp: number;
}

declare class AudioEncoder {
  constructor(init: AudioEncoderInit);
  configure(config: AudioEncoderConfig): void;
  encode(data: AudioData): void;
  flush(): Promise<void>;
  close(): void;
  readonly state: 'unconfigured' | 'configured' | 'closed';
  readonly encodeQueueSize: number;
  static isConfigSupported(config: AudioEncoderConfig): Promise<{ supported: boolean; config: AudioEncoderConfig }>;
}

declare class EncodedAudioChunk {
  readonly type: string;
  readonly timestamp: number;
  readonly duration: number | null;
  readonly byteLength: number;
}

export {};