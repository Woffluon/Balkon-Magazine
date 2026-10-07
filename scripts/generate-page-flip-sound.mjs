import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLE_RATE = 44100;
const DURATION_SEC = 0.26; // ~260ms natural flip
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION_SEC);

// Biquad filter implementation (Audio EQ Cookbook)
class BiquadFilter {
  constructor() {
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
    this.b0 = 1;
    this.b1 = 0;
    this.b2 = 0;
    this.a1 = 0;
    this.a2 = 0;
  }

  setBandpass(freq, q, sampleRate) {
    const w0 = (2 * Math.PI * freq) / sampleRate;
    const alpha = Math.sin(w0) / (2 * q);
    const a0 = 1 + alpha;

    this.b0 = (alpha) / a0;
    this.b1 = 0;
    this.b2 = (-alpha) / a0;
    this.a1 = (-2 * Math.cos(w0)) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  setHighpass(freq, q, sampleRate) {
    const w0 = (2 * Math.PI * freq) / sampleRate;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw0 = Math.cos(w0);
    const a0 = 1 + alpha;

    this.b0 = ((1 + cosw0) / 2) / a0;
    this.b1 = (-(1 + cosw0)) / a0;
    this.b2 = ((1 + cosw0) / 2) / a0;
    this.a1 = (-2 * cosw0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

function generatePaperFlipWaveform() {
  const samples = new Float32Array(NUM_SAMPLES);

  // Filters for paper texture
  const hpFilter = new BiquadFilter();
  hpFilter.setHighpass(900, 0.7, SAMPLE_RATE);

  const bpFilter = new BiquadFilter();
  bpFilter.setBandpass(2600, 1.4, SAMPLE_RATE);

  const bpFilter2 = new BiquadFilter();
  bpFilter2.setBandpass(4200, 1.8, SAMPLE_RATE);

  // Pre-seed pseudo random for repeatable, organic sound
  let seed = 42;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return (seed / 233280) * 2 - 1; // -1 to 1
  };

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;

    // Fast attack (15ms), followed by exponential decay (245ms)
    const attackDuration = 0.015;
    let envelope;
    if (t < attackDuration) {
      envelope = Math.sin((t / attackDuration) * (Math.PI / 2));
    } else {
      const decayTime = t - attackDuration;
      envelope = Math.exp(-14.5 * decayTime);
    }

    // White noise source
    const rawNoise = pseudoRandom();

    // Highpass + dual bandpass for crisp fibrous rustle
    const filteredRustle = hpFilter.process(rawNoise) * 0.45 +
                           bpFilter.process(rawNoise) * 0.45 +
                           bpFilter2.process(rawNoise) * 0.35;

    // Subtle low frequency air displacement body (140Hz sweeping down to 70Hz)
    const bodyFreq = 140 - 70 * (t / DURATION_SEC);
    const bodyPhase = 2 * Math.PI * bodyFreq * t;
    const bodyDecay = Math.exp(-22 * t);
    const bodySound = Math.sin(bodyPhase) * bodyDecay * 0.22;

    // Subtle micro-snap / page edge flick at ~30ms
    const flickOffset = t - 0.032;
    const flickImpulse = Math.exp(-Math.pow(flickOffset / 0.008, 2)) * pseudoRandom() * 0.25;

    // Combine layers
    const composite = (filteredRustle * envelope * 0.85) + bodySound + flickImpulse;
    samples[i] = composite;
  }

  // Normalize to -1.5 dB peak (approx 0.84)
  let peak = 0;
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }

  const targetPeak = 0.84;
  const gain = peak > 0 ? targetPeak / peak : 1;
  for (let i = 0; i < NUM_SAMPLES; i++) {
    samples[i] *= gain;
  }

  return samples;
}

function createWavBuffer(samples, sampleRate) {
  const byteRate = sampleRate * 2; // 16-bit mono = 2 bytes per sample
  const dataSize = samples.length * 2;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = Buffer.alloc(totalSize);

  // RIFF Chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalSize - 8, 4);
  buffer.write('WAVE', 8);

  // fmt Subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(byteRate, 28);   // ByteRate
  buffer.writeUInt16LE(2, 32);  // BlockAlign (2 bytes)
  buffer.writeUInt16LE(16, 34); // BitsPerSample (16 bits)

  // data Subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write PCM 16-bit samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.round(val), offset);
    offset += 2;
  }

  return buffer;
}

function main() {
  const outputDir = path.resolve(__dirname, '../public/sounds');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const wavPath = path.join(outputDir, 'page-flip.wav');
  const mp3Path = path.join(outputDir, 'page-flip.mp3');

  console.log('Generating natural paper flip waveform...');
  const samples = generatePaperFlipWaveform();
  const wavBuffer = createWavBuffer(samples, SAMPLE_RATE);

  fs.writeFileSync(wavPath, wavBuffer);
  console.log(`Saved WAV: ${wavPath} (${wavBuffer.length} bytes)`);

  // Convert to lightweight MP3 using ffmpeg
  try {
    console.log('Converting WAV to MP3 using ffmpeg...');
    execSync(`ffmpeg -y -i "${wavPath}" -codec:a libmp3lame -qscale:a 2 "${mp3Path}"`, {
      stdio: 'inherit'
    });
    console.log(`Saved MP3: ${mp3Path}`);
  } catch (err) {
    console.error('Failed to convert to MP3 via ffmpeg:', err.message);
    process.exit(1);
  }

  console.log('Page flip sound files generated successfully!');
}

main();
