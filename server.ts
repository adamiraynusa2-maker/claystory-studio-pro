/**
 * ClayStory Studio Pro
 * Express Backend Server with Vite Middleware Mode
 * Handles secure Gemini AI and Imagen predictions.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { VIRAL_SYSTEM_PROMPT, THUMBNAIL_SYSTEM_PROMPT, SAMPLE_CONTEXT } from './src/services/systemPrompts';

// Ensure dotenv is imported and config is loaded (fallback for local environments)
import 'dotenv/config';

const PORT = 3000;

// Lazy initialize Gemini client to prevent crashing on boot if key is temporarily missing
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set. Please set it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const FORBIDDEN_SCENE_1_OPENINGS = [
  'bayangkan',
  'coba bayangkan',
  'halo semua',
  'guys',
  'teman-teman',
  'tahukah kamu',
  'apakah kamu tahu',
  'hari ini kita akan',
  'kita akan bahas',
  'pernahkah kamu',
  'ternyata',
  'diam-diam',
];

function enforceNarrationStyle(scene: any, index: number): any {
  const narration = String(scene?.narrationScript || '').trim();
  if (!narration) return scene;

  let refinedNarration = narration.replace(/(\.\.\.)+/g, '...');
  const lowerNarration = refinedNarration.toLowerCase();
  const firstSentence = refinedNarration.split(/[.!?]/)[0] || refinedNarration;
  const hasForbiddenOpening = FORBIDDEN_SCENE_1_OPENINGS.some((opening) => lowerNarration.startsWith(opening));
  const opensWithQuestion = /^\s*(?:apa|apakah|kenapa|mengapa|bagaimana|pernahkah|tahukah|\?)/i.test(refinedNarration) || firstSentence.includes('?');

  if (index === 0 && (hasForbiddenOpening || opensWithQuestion)) {
    refinedNarration = refinedNarration
      .replace(/^(coba\s+bayangkan|bayangkan|halo semua|guys|teman-teman|tahukah kamu|apakah kamu tahu|hari ini kita akan|kita akan bahas|pernahkah kamu|ternyata|diam-diam)[,:\s.]*/i, '')
      .replace(/^\?+\s*/, '')
      .trim();

    refinedNarration = refinedNarration
      ? `Ini bukan permulaan biasa. ${refinedNarration}`
      : 'Ini bukan bocoran. Ini sudah terjadi.';
  }

  return {
    ...scene,
    narrationScript: refinedNarration,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // ==========================================
  // API ROUTES
  // ==========================================

  // 1. Lightweight prompt pre-analysis endpoint
  app.post('/api/analyze-prompt', async (req: Request, res: Response) => {
    try {
      const { prompt } = req.body;
      if (!prompt || String(prompt).trim().length < 20) {
        return res.status(400).json({ error: 'Prompt minimal 20 karakter untuk dianalisis.' });
      }

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analisis cepat prompt ClayStory berikut untuk persiapan Google AI Studio. Jangan buat storyboard penuh.\n\nPROMPT:\n${prompt}`,
        config: {
          systemInstruction: `Anda adalah pre-analysis engine untuk ClayStory Studio Pro.
Kembalikan JSON singkat, praktis, dan siap dicopy ke Google AI Studio.
Fokus pada profil audio, konsep visual satu paragraf, konsep motion satu paragraf, hook awal, emosi dominan, dan sampleContext.
Gunakan Bahasa Indonesia natural kecuali istilah teknis prompt visual.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              audioProfile: {
                type: Type.OBJECT,
                properties: {
                  voiceTone: { type: Type.STRING },
                  sfxStyle: { type: Type.STRING },
                  pacing: { type: Type.STRING },
                  emotion: { type: Type.STRING },
                },
                required: ['voiceTone', 'sfxStyle', 'pacing', 'emotion'],
              },
              scenePreview: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  visualConcept: { type: Type.STRING },
                  motionConcept: { type: Type.STRING },
                  hook: { type: Type.STRING },
                  emotion: { type: Type.STRING },
                },
                required: ['title', 'visualConcept', 'motionConcept', 'hook', 'emotion'],
              },
              sampleContext: { type: Type.STRING },
            },
            required: ['audioProfile', 'scenePreview', 'sampleContext'],
          },
          temperature: 0.45,
          maxOutputTokens: 1200,
        } as any,
      });

      const text = response.text;
      if (!text) {
        throw new Error('Empty response received from Gemini prompt analyzer.');
      }

      res.json(JSON.parse(text.trim()));
    } catch (error: any) {
      console.error('[API Error] analyze-prompt:', error);
      res.status(500).json({ error: error.message || 'Gagal menganalisis prompt awal' });
    }
  });

  // 2. Storyboard blueprint generation endpoint
  app.post('/api/storyboard', async (req: Request, res: Response) => {
    try {
      const { prompt, numScenes, referenceImage } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Storyboard prompt is required.' });
      }

      let totalRequested = Number(numScenes) || 8;
      if (totalRequested < 1) totalRequested = 1;
      if (totalRequested > 15) totalRequested = 15;

      const ai = getAI();

      const storyboardSchema = {
        type: Type.OBJECT,
        properties: {
          audioProfile: {
            type: Type.OBJECT,
            properties: {
              voiceTone: { type: Type.STRING },
              sfxStyle: { type: Type.STRING },
              pacing: { type: Type.STRING },
              emotion: { type: Type.STRING },
            },
            required: ['voiceTone', 'sfxStyle', 'pacing', 'emotion'],
          },
          sampleContext: { type: Type.STRING },
          educationalCaption: {
            type: Type.OBJECT,
            properties: {
              caption: { type: Type.STRING },
              cta: { type: Type.STRING },
            },
            required: ['caption', 'cta'],
          },
          overallViralityScore: { type: Type.INTEGER },
          thumbnailViralityScore: { type: Type.INTEGER },
          endingScene: {
            type: Type.OBJECT,
            properties: {
              transitionSentence: { type: Type.STRING },
              ctaNarration: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              videoPrompt: { type: Type.STRING },
            },
            required: ['transitionSentence', 'ctaNarration', 'imagePrompt', 'videoPrompt'],
          },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sceneTitle: { type: Type.STRING },
                narrationScript: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
                videoPrompt: { type: Type.STRING },
                viralityScore: { type: Type.INTEGER },
                audioDirection: {
                  type: Type.OBJECT,
                  properties: {
                    sfx: { type: Type.STRING },
                    voiceEmotion: { type: Type.STRING },
                    environmentSound: { type: Type.STRING },
                  },
                  required: ['sfx', 'voiceEmotion', 'environmentSound'],
                },
              },
              required: ['sceneTitle', 'narrationScript', 'imagePrompt', 'videoPrompt', 'viralityScore', 'audioDirection'],
            },
          },
        },
        required: ['audioProfile', 'sampleContext', 'educationalCaption', 'overallViralityScore', 'thumbnailViralityScore', 'endingScene', 'scenes'],
      };

      let finalResult: any;

      if (totalRequested <= 8) {
        const userMessage = `Generate exactly ${totalRequested} scenes. Buatkan storyboard ${totalRequested} adegan cinematic tentang: ${prompt}${
          referenceImage ? '\nContext: Perhatikan referensi gambar yang dikoordinasikan.' : ''
        }\n\nNarrative Rules: ${SAMPLE_CONTEXT}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userMessage,
          config: {
            systemInstruction: VIRAL_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: storyboardSchema,
            temperature: 0.8,
            maxOutputTokens: 16000,
            generationConfig: {
              maxOutputTokens: 16000,
              temperature: 0.8,
            }
          } as any,
        });

        const text = response.text;
        if (!text) {
          throw new Error('Empty response received from Gemini model.');
        }
        finalResult = JSON.parse(text.trim());
      } else {
        // Automatically split generation into multiple API calls and merge the results
        const numPart1 = Math.ceil(totalRequested / 2);
        const numPart2 = totalRequested - numPart1;

        console.log(`[Large Scene Safety] Splitting ${totalRequested} scenes into Part 1 (${numPart1} scenes) and Part 2 (${numPart2} scenes)`);

        // Part 1 generation call
        const userMessagePart1 = `Generate exactly ${totalRequested} scenes. Buatkan storyboard BAGIAN PERTAMA (scene 1 s/d ${numPart1}) dari TOTAL ${totalRequested} adegan cinematic tentang: ${prompt}${
          referenceImage ? '\nContext: Perhatikan referensi gambar yang dikoordinasikan.' : ''
        }\n\nNarrative Rules: ${SAMPLE_CONTEXT}\n\nMANDATORY: Anda harus menghasilkan tepat ${numPart1} adegan di dalam array 'scenes' untuk bagian pertama ini.`;

        const responsePart1 = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userMessagePart1,
          config: {
            systemInstruction: VIRAL_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: storyboardSchema,
            temperature: 0.8,
            maxOutputTokens: 16000,
            generationConfig: {
              maxOutputTokens: 16000,
              temperature: 0.8,
            }
          } as any,
        });

        const textPart1 = responsePart1.text;
        if (!textPart1) {
          throw new Error('Empty response received for Part 1.');
        }
        const resultPart1 = JSON.parse(textPart1.trim());

        // Extract a scannable preview of Part 1 scenes for chain of thought consistency
        const part1ScenesPreview = (resultPart1.scenes || []).map((s: any, idx: number) => ({
          sceneNumber: idx + 1,
          sceneTitle: s.sceneTitle,
          narrationScript: s.narrationScript,
        }));

        // Part 2 generation call
        const userMessagePart2 = `Generate exactly ${totalRequested} scenes. Buatkan storyboard BAGIAN KEDUA (scene ${numPart1 + 1} s/d ${totalRequested}) dari TOTAL ${totalRequested} adegan cinematic tentang: ${prompt}${
          referenceImage ? '\nContext: Perhatikan referensi gambar yang dikoordinasikan.' : ''
        }\n\nBerikut adalah alur cerita BAGIAN PERTAMA yang wajib Anda lanjutkan agar cerita tetap mengalir berkesinambungan:\n${JSON.stringify(part1ScenesPreview)}\n\nNarrative Rules: ${SAMPLE_CONTEXT}\n\nMANDATORY: Anda harus melanjutkan kisah di atas secara halus dan menghasilkan tepat ${numPart2} adegan berikutnya di dalam array 'scenes'. Dan hasilkan endingScene penutup sesungguhnya di akhir.`;

        const responsePart2 = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userMessagePart2,
          config: {
            systemInstruction: VIRAL_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: storyboardSchema,
            temperature: 0.8,
            maxOutputTokens: 16000,
            generationConfig: {
              maxOutputTokens: 16000,
              temperature: 0.8,
            }
          } as any,
        });

        const textPart2 = responsePart2.text;
        if (!textPart2) {
          throw new Error('Empty response received for Part 2.');
        }
        const resultPart2 = JSON.parse(textPart2.trim());

        const mergedScenes = [...(resultPart1.scenes || []), ...(resultPart2.scenes || [])];

        finalResult = {
          audioProfile: resultPart2.audioProfile || resultPart1.audioProfile,
          sampleContext: resultPart2.sampleContext || resultPart1.sampleContext,
          educationalCaption: resultPart2.educationalCaption || resultPart1.educationalCaption,
          overallViralityScore: Math.round(((resultPart1.overallViralityScore || 75) + (resultPart2.overallViralityScore || 75)) / 2),
          thumbnailViralityScore: resultPart2.thumbnailViralityScore || resultPart1.thumbnailViralityScore || 75,
          endingScene: resultPart2.endingScene || resultPart1.endingScene,
          scenes: mergedScenes,
        };
      }

      // Exact Scene Count Validation & Fallback Scoring Pipeline (Points 7, 11)
      if (finalResult && finalResult.scenes) {
        let validatedScenes = [...finalResult.scenes];
        
        // Ensure scene lengths match totalRequested exactly
        if (validatedScenes.length > totalRequested) {
          console.log(`[Validation] Truncating scenes from ${validatedScenes.length} to ${totalRequested}`);
          validatedScenes = validatedScenes.slice(0, totalRequested);
        } else if (validatedScenes.length < totalRequested) {
          console.log(`[Validation] Padding scenes from ${validatedScenes.length} to ${totalRequested}. Adding synthetic compliant scenes.`);
          const template = validatedScenes[0] || {
            sceneTitle: "Continuous Story Flow",
            narrationScript: "Keputusan kecil itu mulai terlihat mahal, dan semua pihak kini bergerak dalam tekanan.",
            imagePrompt: "A detailed 3D clay style close-up of character, soft warm light",
            videoPrompt: "Slow camera drift onto character face, beautiful polished clay, blink and subtle mouth movement",
            viralityScore: 85,
            audioDirection: {
              sfx: "subtle high-quality ambient swoosh",
              voiceEmotion: "dramatic narration",
              environmentSound: "low wind hum"
            }
          };
          while (validatedScenes.length < totalRequested) {
            const nextIdx = validatedScenes.length + 1;
            validatedScenes.push({
              sceneTitle: `Lanjutan Adegan ${nextIdx}`,
              narrationScript: `Satu detail baru muncul, membuat keputusan sebelumnya terasa jauh lebih berisiko.`,
              imagePrompt: `A detailed 3D clay rendering of the central theme, matching the visual consistency and stylistic diorama depth, soft studio cinematic lighting.`,
              videoPrompt: `Slow handheld tracking camera panning across the scene with micro-movements of soft dust, lifelike animated textures.`,
              viralityScore: template.viralityScore !== undefined ? Number(template.viralityScore) : 85,
              audioDirection: {
                sfx: template.audioDirection?.sfx || "subtle warm ambient swoosh",
                voiceEmotion: template.audioDirection?.voiceEmotion || "dramatic Indonesian voice explanation",
                environmentSound: template.audioDirection?.environmentSound || "soft atmospheric room hum"
              }
            });
          }
        }

        // Apply fallback virality scores for each scene if missing or invalid (Point 11)
        validatedScenes = validatedScenes.map((scene: any, index: number) => {
          const score = Number(scene.viralityScore);
          const styleCheckedScene = enforceNarrationStyle(scene, index);
          return {
            ...styleCheckedScene,
            viralityScore: !isNaN(score) && score > 0 ? score : Math.floor(Math.random() * 15) + 80 // fallback to highly engaging score (80-95)
          };
        });

        finalResult.scenes = validatedScenes;
      }

      // Ensure overall and thumbnail virality scores exist (Point 11)
      const overallVal = Number(finalResult.overallViralityScore);
      finalResult.overallViralityScore = !isNaN(overallVal) && overallVal > 0 ? overallVal : 88;

      const thumbVal = Number(finalResult.thumbnailViralityScore);
      finalResult.thumbnailViralityScore = !isNaN(thumbVal) && thumbVal > 0 ? thumbVal : 85;

      res.json(finalResult);
    } catch (error: any) {
      console.error('[API Error] storyboard:', error);
      res.status(500).json({ error: error.message || 'Gagal menghasilkan storyboard' });
    }
  });

  // 3. Thumbnail blueprint generation endpoint
  app.post('/api/thumbnail', async (req: Request, res: Response) => {
    try {
      const { prompt, referenceImage } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Thumbnail prompt is required.' });
      }

      const ai = getAI();
      const userMessage = `Buatkan thumbnail viral cinematic tentang: ${prompt}${
        referenceImage ? '\nContext: Ambil inspirasi visual dari referensi gambar.' : ''
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userMessage,
        config: {
          systemInstruction: THUMBNAIL_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              thumbnailTitle: { type: Type.STRING },
              thumbnailSubtext: { type: Type.STRING },
              thumbnailPrompt: { type: Type.STRING },
              thumbnailExpression: { type: Type.STRING },
              thumbnailLighting: { type: Type.STRING },
              thumbnailComposition: { type: Type.STRING },
              thumbnailColorTone: { type: Type.STRING },
              thumbnailViralityScore: { type: Type.INTEGER },
            },
            required: [
              'thumbnailTitle',
              'thumbnailSubtext',
              'thumbnailPrompt',
              'thumbnailExpression',
              'thumbnailLighting',
              'thumbnailComposition',
              'thumbnailColorTone',
              'thumbnailViralityScore',
            ],
          },
          temperature: 0.8,
          maxOutputTokens: 16000,
          generationConfig: {
            maxOutputTokens: 16000,
            temperature: 0.8,
          }
        } as any,
      });

      const text = response.text;
      if (!text) {
        throw new Error('Empty response received from Gemini model.');
      }

      res.json(JSON.parse(text.trim()));
    } catch (error: any) {
      console.error('[API Error] thumbnail:', error);
      res.status(500).json({ error: error.message || 'Gagal menghasilkan thumbnail' });
    }
  });

  // 4. Text-To-Speech generation endpoint
  app.post('/api/generate-speech', async (req: Request, res: Response) => {
    try {
      const { text, voiceName } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Speech text is required.' });
      }

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Bacakan dengan gaya narasi Bahasa Indonesia yang natural, komunikatif, dan ekspresif: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Aoede' },
            },
          },
          temperature: 0.8,
          maxOutputTokens: 16000,
          generationConfig: {
            maxOutputTokens: 16000,
            temperature: 0.8,
          }
        } as any,
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error('Failed to extract audio stream from TTS model candidates.');
      }

      res.json({ audio: base64Audio });
    } catch (error: any) {
      console.error('[API Error] generate-speech', error);
      res.status(500).json({ error: error.message || 'Gagal menghasilkan audio' });
    }
  });

  // 5. Imagen Image Generation endpoint
  app.post('/api/generate-image', async (req: Request, res: Response) => {
    try {
      const { prompt, aspectRatio } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Image prompt is required.' });
      }

      const ai = getAI();
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio || '9:16',
        },
      });

      const base64Bytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (!base64Bytes) {
        throw new Error('Failed to retrieve image bytes from Imagen model.');
      }

      const imageUrl = `data:image/jpeg;base64,${base64Bytes}`;
      res.json({ imageUrl });
    } catch (error: any) {
      console.error('[API Error] generate-image', error);
      res.status(500).json({ error: error.message || 'Gagal menghasilkan gambar' });
    }
  });

  // ==========================================
  // VITE RUNTIME MIDDLEWARE / STATIC SERVING
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ClayStory Server] Running locally on http://0.0.0.0:${PORT}`);
  });
}

startServer();
