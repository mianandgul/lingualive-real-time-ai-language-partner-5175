/**
 * Audio Utilities for Gemini Live API
 * - 16kHz PCM little-endian audio capture for user mic
 * - 24kHz PCM little-endian gapless playback for model output
 * - Volume metering and interruption support
 */

export class LiveAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private analyser: AnalyserNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazily initialized upon user interaction
  }

  public initContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Enqueue a 24kHz PCM 16-bit chunk for seamless playback
   */
  public playChunk(base64Pcm: string) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx || !this.analyser) return;

    try {
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit Little-Endian PCM to Float32
      const numSamples = Math.floor(bytes.length / 2);
      const float32Data = new Float32Array(numSamples);
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

      for (let i = 0; i < numSamples; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        float32Data[i] = int16 < 0 ? int16 / 32768.0 : int16 / 32767.0;
      }

      const audioBuffer = this.audioCtx.createBuffer(1, numSamples, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyser);

      const currentTime = this.audioCtx.currentTime;
      const startTime = Math.max(currentTime, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
      };
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  }

  /**
   * Stop all playing audio immediately (e.g. on interruption / barge-in)
   */
  public interrupt() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source may already have finished
      }
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
  }

  public getVolume(): number {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / dataArray.length / 255;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.interrupt();
    }
  }

  public close() {
    this.interrupt();
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {
        // Ignore
      }
      this.audioCtx = null;
    }
  }
}

export class LiveAudioRecorder {
  private inputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private onAudioChunk: ((base64: string) => void) | null = null;
  private isRecording: boolean = false;

  public isReady(): boolean {
    return this.isRecording && !!this.mediaStream;
  }

  public async start(onAudioChunk: (base64: string) => void): Promise<void> {
    this.onAudioChunk = onAudioChunk;

    // Fast-path: if already actively capturing, reuse existing stream without duplicate permission prompt
    if (this.isRecording && this.mediaStream && this.processor) {
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtxClass();
      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }

      this.source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);

      this.analyser = this.inputAudioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      this.source.connect(this.analyser);

      // Low-latency buffer size (2048 samples ~ 43ms at 48kHz)
      const bufferSize = 2048;
      this.processor = this.inputAudioCtx.createScriptProcessor(bufferSize, 1, 1);

      const targetSampleRate = 16000;
      const inputSampleRate = this.inputAudioCtx.sampleRate;

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // Downsample inputData to 16000 Hz PCM
        const downsampled = downsampleBuffer(inputData, inputSampleRate, targetSampleRate);
        const pcm16 = floatTo16BitPCM(downsampled);
        const base64 = bufferToBase64(pcm16);

        if (this.onAudioChunk && base64) {
          this.onAudioChunk(base64);
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.inputAudioCtx.destination);
      this.isRecording = true;
    } catch (err: any) {
      console.error('Error starting audio recorder:', err);
      throw new Error(err?.message || 'Could not access microphone');
    }
  }

  public getVolume(): number {
    if (!this.analyser || !this.isRecording) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / dataArray.length / 255;
  }

  public stop() {
    this.isRecording = false;
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch {
        // Ignore
      }
      this.inputAudioCtx = null;
    }
  }
}

/**
 * Resample a Float32Array from inputRate to outputRate
 */
function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) {
    return buffer;
  }
  const sampleRateRatio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

/**
 * Convert Float32Array audio data to Int16 Little-Endian PCM
 */
function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

/**
 * Convert Int16Array to Base64 String
 */
function bufferToBase64(buffer: Int16Array): string {
  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
