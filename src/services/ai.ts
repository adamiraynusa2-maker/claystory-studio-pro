/**
 * ClayStory Studio Pro
 * Client API Proxy Service to securely connect to Express backend.
 */

import { PromptAnalysisResponse, StoryboardResponse, ThumbnailData } from '../types';

export const aiService = {
  /**
   * Runs a lightweight prompt pre-analysis before full storyboard synthesis.
   */
  async analyzePrompt(prompt: string, signal?: AbortSignal): Promise<PromptAnalysisResponse> {
    const response = await fetch('/api/analyze-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Gagal menganalisis prompt awal');
    }

    return response.json();
  },

  /**
   * Triggers the full storyboard blueprint creation with Gemini 3.5 Flash
   */
  async generateStoryboard(
    prompt: string,
    numScenes: number,
    referenceImage?: string
  ): Promise<StoryboardResponse> {
    const response = await fetch('/api/storyboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, numScenes, referenceImage }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Gagal menghasilkan storyboard');
    }

    return response.json();
  },

  /**
   * Generates the optimized thumbnail assets & structural copy
   */
  async generateThumbnail(
    prompt: string,
    referenceImage?: string
  ): Promise<ThumbnailData> {
    const response = await fetch('/api/thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, referenceImage }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Gagal menghasilkan thumbnail');
    }

    return response.json();
  },

  /**
   * Synthesizes Voiceover using Gemini 2.5 Flash Text-to-Speech Model
   */
  async generateAudio(text: string, voiceName: string = 'Kore'): Promise<string> {
    const response = await fetch('/api/generate-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceName }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Gagal menghasilkan audio voiceover');
    }

    const data = await response.json();
    if (!data.audio) {
      throw new Error('Data audio kosong dari server');
    }

    // Convert base64 audio to object URL
    const binaryString = atob(data.audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Reconstruct Wav format or custom binary blob
    const sampleRate = 24000;
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + bytes.byteLength, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // Linear PCM
    view.setUint16(22, 1, true); // Mono channel
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // 16 bits mono
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, bytes.byteLength, true);

    const combined = new Uint8Array(wavHeader.byteLength + bytes.byteLength);
    combined.set(new Uint8Array(wavHeader), 0);
    combined.set(bytes, wavHeader.byteLength);

    const blob = new Blob([combined], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  },

  /**
   * Generates cinematic visual images using Imagen 4.0 Model
   */
  async generateImage(prompt: string, aspectRatio: string = '9:16'): Promise<string> {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Gagal mensintesis gambar');
    }

    const data = await response.json();
    if (!data.imageUrl) {
      throw new Error('Data gambar kosong dari server');
    }

    return data.imageUrl;
  },
};
