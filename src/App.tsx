import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Video,
  Layout,
  Palette,
  Send,
  Download,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ImageIcon,
  History,
  Copy,
  Check,
  Clapperboard,
  Music,
  Monitor,
  Fingerprint,
  Cloud,
  Camera,
  Film,
  Zap,
  Trash2,
  Type as FontIcon,
  Share2,
  FileText,
  MousePointer2,
  Maximize2,
  Minimize2,
  Mic2,
  ListMusic,
  MessageSquareText,
  Hash,
  RefreshCw,
  Languages,
  Wand2,
  BookOpen,
  FolderDown,
  AlertCircle,
  Laugh,
  ArrowUp,
  ArrowDown,
  Settings,
  X,
  Eye,
  BookMarked
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types and Services
import { AspectRatio, AudioMode, ClayStyle, StoryConfig, Scene, ThumbnailData, ProjectHistoryItem, EducationalCaption, AudioProfile, PromptAnalysisResponse } from './types';
import { storageService } from './services/storageService';
import { aiService } from './services/ai';
import { enhanceScene, generateThumbnailMasterPrompt } from './services/promptBuilder';

// Constant Presets
const STYLE_PRESETS: ClayStyle[] = [
  {
    id: 'cinematic-epic',
    name: 'Cinematic Epic',
    previewClass: 'bg-indigo-950 border-indigo-700 from-indigo-950 to-slate-900',
    promptAddon: 'Ultra detailed 3D cinematic clay render, deep volumetric theatrical shadows, intense emotional expressions',
  },
  {
    id: 'soft-dreamy',
    name: 'Soft Dreamy',
    previewClass: 'bg-gradient-to-tr from-pink-300 to-purple-400 border-pink-400',
    promptAddon: 'Whimsical fairytale clay illustration, soft fluffy pastel background, warm ambient morning sunshine glow',
  },
  {
    id: 'stop-motion',
    name: 'Stop-Motion',
    previewClass: 'bg-amber-800 border-amber-600 from-amber-850 to-amber-950',
    promptAddon: 'Handcrafted stop-motion look, subtle fingerprint clay textures, wool felt structures, miniature dioramas',
  },
  {
    id: 'fuzzy-felt',
    name: 'Fuzzy Felt',
    previewClass: 'bg-emerald-950 border-emerald-700 from-emerald-950 to-slate-900',
    promptAddon: 'Textured fuzzy wool environments, needle felted character models, organic handmade felt details, soft shadows',
  },
];

const estimateDuration = (text: string) => {
  if (!text) return 0;
  return Math.round(text.trim().split(/\s+/).length / 2.2);
};

export default function App() {
  // Config state
  const [config, setConfig] = useState<StoryConfig>({
    prompt: '',
    scenes: 8,
    numScenes: 8,
    format: '9:16',
    audioMode: 'SFX + BGM',
    languageStyle: 'Indonesia Natural',
    style: STYLE_PRESETS[0],
    referenceImage: undefined,
  });

  // Main UI coordination states
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Active storyboard projects context
  const [projectId, setProjectId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [thumbnail, setThumbnail] = useState<ThumbnailData | null>(null);
  const [audioProfile, setAudioProfile] = useState<AudioProfile | null>(null);
  const [sampleContext, setSampleContext] = useState<string>('');
  const [educationalCaption, setEducationalCaption] = useState<EducationalCaption | null>(null);
  const [viralityScore, setViralityScore] = useState<number>(0);
  const [preAnalysis, setPreAnalysis] = useState<PromptAnalysisResponse | null>(null);
  const [preAnalysisLoading, setPreAnalysisLoading] = useState(false);
  const [preAnalysisError, setPreAnalysisError] = useState<string | null>(null);

  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [batchRendering, setBatchRendering] = useState(false);

  // Audio player progress and seek state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Fullscreen modal state
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  // History state list
  const [historyItems, setHistoryItems] = useState<ProjectHistoryItem[]>([]);

  // HTML Audio synchronization and handlers
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [activeSceneIndex, projectId]);

  const activeScene = scenes[activeSceneIndex];

  useEffect(() => {
    const prompt = config.prompt.trim();
    if (prompt.length < 30) {
      setPreAnalysis(null);
      setPreAnalysisLoading(false);
      setPreAnalysisError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setPreAnalysisLoading(true);
        setPreAnalysisError(null);
        const result = await aiService.analyzePrompt(prompt, controller.signal);
        setPreAnalysis(result);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setPreAnalysisError(e.message || 'Gagal membaca prompt awal.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setPreAnalysisLoading(false);
        }
      }
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [config.prompt]);

  // Theme Sync load
  useEffect(() => {
    const isDarkSetting = storageService.getDarkMode();
    setDarkMode(isDarkSetting);
    syncDarkClass(isDarkSetting);
    setHistoryItems(storageService.getProjects());
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    storageService.setDarkMode(nextDark);
    syncDarkClass(nextDark);
  };

  const syncDarkClass = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Clipboard copy utilities
  const handleCopy = (text: string | undefined, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Reference visual file upload handler
  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig((prev) => ({ ...prev, referenceImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const clearReferenceImage = () => {
    setConfig((prev) => ({ ...prev, referenceImage: undefined }));
  };

  /**
   * Generates a fully coherent story, containing scenes, voiceover translations,
   * narrative timelines, educational captions, and social CTA triggers.
   */
  const handleGenerateStory = async () => {
    if (!config.prompt.trim()) {
      setError('Masukkan ide cerita atau blueprint naratif terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError(null);
    setScenes([]);
    setThumbnail(null);

    const generatedPid = 'proj_' + Date.now();
    setProjectId(generatedPid);

    try {
      // 1. Synthesize the Thumbnail structures (Scene 0 metadata)
      const thumbnailBlueprint = await aiService.generateThumbnail(config.prompt, config.referenceImage);
      const fullThumbnailPrompt = generateThumbnailMasterPrompt(thumbnailBlueprint, config.prompt, config.referenceImage);
      const structuredThumb: ThumbnailData = {
        ...thumbnailBlueprint,
        fullThumbnailPrompt,
        renderStatus: 'WAITING',
        thumbnailViralityScore: thumbnailBlueprint.thumbnailViralityScore || 75,
      };
      setThumbnail(structuredThumb);

      // 2. Synthesize the dynamic Storyboard Response Blueprint
      const storyboardRes = await aiService.generateStoryboard(config.prompt, config.numScenes || config.scenes || 8, config.referenceImage);

      // 3. Coordinate scenes mapping + Outro generation
      const mappedScenes: Scene[] = storyboardRes.scenes.map((s, idx) => {
        const enhanced = enhanceScene(
          {
            sceneTitle: s.sceneTitle,
            narrationScript: s.narrationScript,
            imagePrompt: s.imagePrompt,
            videoPrompt: s.videoPrompt,
          },
          idx + 1,
          config.referenceImage,
          storyboardRes.scenes.length
        );

        return {
          id: `sc_${Date.now()}_${idx}`,
          sceneTitle: s.sceneTitle,
          narrationScript: s.narrationScript,
          imagePrompt: s.imagePrompt,
          videoPrompt: s.videoPrompt,
          audioDirection: s.audioDirection,
          sceneType: classifySceneText(s.sceneTitle, s.narrationScript),
          fullImagePrompt: enhanced.enhancedImagePrompt,
          fullVideoPrompt: enhanced.enhancedVideoPrompt,
          renderStatus: 'WAITING',
          loadingAudio: false,
          viralityScore: s.viralityScore || 75,
        };
      });

      // Append Outro CTA trigger if existing
      if (storyboardRes.endingScene) {
        const outroScene = {
          sceneTitle: 'ENDING CTA',
          narrationScript: storyboardRes.endingScene.ctaNarration,
          imagePrompt: storyboardRes.endingScene.imagePrompt,
          videoPrompt: storyboardRes.endingScene.videoPrompt,
          isOutro: true,
          transitionSentence: storyboardRes.endingScene.transitionSentence,
        };

        const enhancedOutro = enhanceScene(outroScene, mappedScenes.length + 1, config.referenceImage, mappedScenes.length + 1);

        mappedScenes.push({
          id: `sc_ending_${Date.now()}`,
          sceneTitle: outroScene.sceneTitle,
          narrationScript: outroScene.narrationScript,
          imagePrompt: outroScene.imagePrompt,
          videoPrompt: outroScene.videoPrompt,
          audioDirection: {
            sfx: 'cinematic trailer impact, organic subscription chime',
            voiceEmotion: 'cheerful and inspiring',
            environmentSound: 'soft inspiring acoustic chords background',
          },
          sceneType: 'OUTRO',
          fullImagePrompt: enhancedOutro.enhancedImagePrompt,
          fullVideoPrompt: enhancedOutro.enhancedVideoPrompt,
          renderStatus: 'WAITING',
          loadingAudio: false,
          isOutro: true,
          transitionSentence: outroScene.transitionSentence,
          viralityScore: storyboardRes.overallViralityScore || 75,
        });
      }

      // Read real overallViralityScore from the AI response
      const score = storyboardRes.overallViralityScore || 75;
      setViralityScore(score);

      // Save components states
      setScenes(mappedScenes);
      setActiveSceneIndex(0);
      setAudioProfile(storyboardRes.audioProfile);
      setSampleContext(storyboardRes.sampleContext);
      setEducationalCaption(storyboardRes.educationalCaption);

      // Initialize speech files in background
      mappedScenes.forEach((s, idx) => triggerSceneAudioSynth(idx, s.narrationScript, mappedScenes));

      // Append project registry into LocalStorage history
      const historyRecord: ProjectHistoryItem = {
        id: generatedPid,
        title: config.prompt.substring(0, 40) + '...',
        createdAt: new Date().toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        config,
        scenes: mappedScenes,
        thumbnail: structuredThumb,
        audioProfile: storyboardRes.audioProfile,
        sampleContext: storyboardRes.sampleContext,
        educationalCaption: storyboardRes.educationalCaption,
        viralityScore: score,
        numScenes: config.numScenes || config.scenes || 8,
      };

      const updatedHistory = storageService.saveProject(historyRecord);
      setHistoryItems(updatedHistory);

    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Layanan AI mengalami kendala. Sila coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Triggers Text-to-Speech prediction request for a target scene
   */
  const triggerSceneAudioSynth = async (index: number, text: string, currentScenesList: Scene[]) => {
    // Flag starting audio synth loading status
    setScenes((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], loadingAudio: true };
      }
      return copy;
    });

    try {
      const audioUrl = await aiService.generateAudio(text);
      setScenes((prev) => {
        const copy = [...prev];
        if (copy[index]) {
          copy[index] = { ...copy[index], audioUrl, loadingAudio: false };
        }
        return copy;
      });
    } catch (err) {
      console.error('TTS synthesis error on scene index ' + index, err);
      setScenes((prev) => {
        const copy = [...prev];
        if (copy[index]) {
          copy[index] = { ...copy[index], loadingAudio: false };
        }
        return copy;
      });
    }
  };

  /**
   * Helper classifier for mapping characters/environments
   */
  const classifySceneText = (title: string, script: string): 'CHARACTER' | 'ENVIRONMENT' => {
    const combined = `${title} ${script}`.toLowerCase();
    const characterTriggers = ['man', 'woman', 'tokoh', 'gadis', 'pria', 'anak', 'orang', 'character', 'leader', 'soldier', 'raja', 'ratu'];
    return characterTriggers.some((keyword) => combined.includes(keyword)) ? 'CHARACTER' : 'ENVIRONMENT';
  };

  /**
   * Invokes Imagen 4.0 visual rendering for a specific scene index
   */
  const handleRenderSceneVisual = async (index: number) => {
    if (!scenes[index]) return;

    setScenes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], renderStatus: 'RENDERING' };
      return copy;
    });

    try {
      const promptToUse = scenes[index].fullImagePrompt;
      const imageUrl = await aiService.generateImage(promptToUse, config.format);

      setScenes((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], imageUrl, renderStatus: 'DONE' };
        
        // Sync project update inside history
        if (projectId) {
          syncProjectToHistory(projectId, copy, thumbnail);
        }
        return copy;
      });
    } catch (err) {
      console.error('Render scene visual failure', err);
      setScenes((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], renderStatus: 'FAILED' };
        return copy;
      });
    }
  };

  /**
   * Synthesize/Render the visual thumbnail (Scene 0) using Imagen 4.0
   */
  const handleRenderThumbnailVisual = async () => {
    if (!thumbnail) return;

    setThumbnail((prev) => prev ? { ...prev, renderStatus: 'RENDERING' } : null);

    try {
      const imageUrl = await aiService.generateImage(thumbnail.fullThumbnailPrompt, config.format);
      setThumbnail((prev) => {
        if (!prev) return null;
        const updated = { ...prev, imageUrl, renderStatus: 'DONE' as const };
        
        // Sync thumbnail visual to LocalStorage registry
        if (projectId) {
          syncProjectToHistory(projectId, scenes, updated);
        }
        return updated;
      });
    } catch (err) {
      console.error('Render Thumbnail Visual failure', err);
      setThumbnail((prev) => prev ? { ...prev, renderStatus: 'FAILED' } : null);
    }
  };

  /**
   * Sequential Batch Renderer that processes all waiting scenes automatically
   */
  const handleBatchRenderAll = async () => {
    if (scenes.length === 0) return;
    setBatchRendering(true);

    try {
      // First, render thumbnail if not done
      if (thumbnail && thumbnail.renderStatus !== 'DONE') {
        await handleRenderThumbnailVisual();
      }

      // Chain synthesis processes consecutively
      for (let i = 0; i < scenes.length; i++) {
        if (scenes[i].renderStatus !== 'DONE') {
          setActiveSceneIndex(i);
          await handleRenderSceneVisual(i);
        }
      }
    } catch (err) {
      console.error('Batch rendering chain interrupted', err);
    } finally {
      setBatchRendering(false);
    }
  };

  /**
   * Reorders scenes index placement dynamically
   */
  const handleReorderScene = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= scenes.length) return;

    const copy = [...scenes];
    const temporary = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temporary;

    setScenes(copy);
    setActiveSceneIndex(targetIdx);

    if (projectId) {
      syncProjectToHistory(projectId, copy, thumbnail);
    }
  };

  /**
   * Regenerate a Single Scene text template and associated image parameters
   */
  const handleRegenerateSingleScene = async (index: number) => {
    if (!scenes[index]) return;

    const targetScene = scenes[index];
    setScenes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], renderStatus: 'RENDERING', loadingAudio: true };
      return copy;
    });

    try {
      // Use standard Gemini text task to adapt this specific cell context
      const userInstruction = `
Buat ulang naskah narasi dan petunjuk visual khusus untuk adegan berjudul "${targetScene.sceneTitle}" ini.
Konteks seluruh video: ${config.prompt}.
Naskah asli: "${targetScene.narrationScript}".
Pertahankan gaya narasi bahasa indonesia santai dan deskripsi visual clay caricature.
Return a clean, valid and simple JSON matching structural keys: {"sceneTitle": "...", "narrationScript": "...", "imagePrompt": "...", "videoPrompt": "..."}
`;
      const response = await fetch('/api/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userInstruction, numScenes: 1, referenceImage: config.referenceImage }),
      });

      if (!response.ok) throw new Error('Regeneration requested cell returned an error.');
      const responseBody = await response.json();
      
      // Get output parameters
      const refreshedCell = responseBody.scenes?.[0] || responseBody;
      const enhanced = enhanceScene(
        {
          sceneTitle: refreshedCell.sceneTitle || targetScene.sceneTitle,
          narrationScript: refreshedCell.narrationScript || targetScene.narrationScript,
          imagePrompt: refreshedCell.imagePrompt || targetScene.imagePrompt,
          videoPrompt: refreshedCell.videoPrompt || targetScene.videoPrompt,
        },
        index + 1,
        config.referenceImage,
        scenes.length
      );

      const finalRefreshedScene: Scene = {
        ...targetScene,
        sceneTitle: refreshedCell.sceneTitle || targetScene.sceneTitle,
        narrationScript: refreshedCell.narrationScript || targetScene.narrationScript,
        imagePrompt: refreshedCell.imagePrompt || targetScene.imagePrompt,
        videoPrompt: refreshedCell.videoPrompt || targetScene.videoPrompt,
        fullImagePrompt: enhanced.enhancedImagePrompt,
        fullVideoPrompt: enhanced.enhancedVideoPrompt,
        renderStatus: 'WAITING',
        imageUrl: undefined, // Clear visual image so they re-render
        audioUrl: undefined, // Clear audio voiceover to re-render
      };

      setScenes((prev) => {
        const copy = [...prev];
        copy[index] = finalRefreshedScene;
        return copy;
      });

      // Spawn new audio synth in background
      triggerSceneAudioSynth(index, finalRefreshedScene.narrationScript, scenes);

      if (projectId) {
        syncProjectToHistory(projectId, [...scenes.slice(0, index), finalRefreshedScene, ...scenes.slice(index + 1)], thumbnail);
      }

    } catch (e) {
      console.error(e);
      setScenes((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], renderStatus: 'FAILED', loadingAudio: false };
        return copy;
      });
    }
  };

  /**
   * Direct inline prompt builder modifier changes
   */
  const handleUpdatePromptBuilderValues = (index: number, imagePrompt: string, videoPrompt: string) => {
    setScenes((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        const updatedRaw = {
          ...copy[index],
          imagePrompt,
          videoPrompt,
        };
        const enhanced = enhanceScene(updatedRaw, index + 1, config.referenceImage, copy.length);
        copy[index] = {
          ...updatedRaw,
          fullImagePrompt: enhanced.enhancedImagePrompt,
          fullVideoPrompt: enhanced.enhancedVideoPrompt,
        };
      }
      if (projectId) {
        syncProjectToHistory(projectId, copy, thumbnail);
      }
      return copy;
    });
  };

  /**
   * Syncs active visual additions immediately into LocalStorage history model
   */
  const syncProjectToHistory = (pId: string, currentScenes: Scene[], currentThumb: ThumbnailData | null) => {
    const projects = storageService.getProjects();
    const foundIdx = projects.findIndex((p) => p.id === pId);
    if (foundIdx !== -1) {
      projects[foundIdx].scenes = currentScenes;
      if (currentThumb) {
        projects[foundIdx].thumbnail = currentThumb;
      }
      storageService.saveProject(projects[foundIdx]);
      setHistoryItems(storageService.getProjects());
    }
  };

  /**
   * Exports assets specific to an individual scene (script, prompts, media file link etc.)
   */
  const handleExportPerScene = (index: number) => {
    const target = scenes[index];
    if (!target) return;

    const metaTxt = `======== CLAYSTORY STUDIO PRO ========\nSCENE ${index} : ${target.sceneTitle.toUpperCase()}\n\nNaskah / Voiceover:\n"${target.narrationScript}"\n\nImage Prompt (Aesthetic):\n${target.fullImagePrompt}\n\nMotion Animation Prompt:\n${target.fullVideoPrompt || target.videoPrompt}\n\nStatus Render: ${target.renderStatus}\nLink Gambar: ${target.imageUrl || 'Belum di-render'}\nLink Audio VO: ${target.audioUrl || 'Belum di-sintesis'}\n`;
    
    const blob = new Blob([metaTxt], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `claystory_scene_${index}_export.txt`;
    link.click();
  };

  /**
   * Exports everything in a consolidated JSON Project Package
   */
  const handleDownloadFullProject = () => {
    const backupObj = {
      projectId,
      title: config.prompt,
      config,
      scenes,
      thumbnail,
      audioProfile,
      sampleContext,
      educationalCaption,
      viralityScore,
    };

    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `claystory_project_${projectId || 'export'}.json`;
    link.click();
  };

  /**
   * Load history project registry into the state
   */
  const handleLoadSelectedProject = (project: ProjectHistoryItem) => {
    setProjectId(project.id);
    setConfig(project.config);
    setScenes(project.scenes);
    setThumbnail(project.thumbnail || null);
    setViralityScore(project.viralityScore || 75);
    setAudioProfile(project.audioProfile || null);
    setSampleContext(project.sampleContext || project.title);
    setEducationalCaption(project.educationalCaption || null);
    setActiveSceneIndex(0);
    setActiveTab('editor');
  };

  /**
   * Remove project record from Storage
   */
  const handleDeleteSelectedProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = storageService.deleteProject(id);
    setHistoryItems(updated);
    if (projectId === id) {
      setProjectId(null);
      setScenes([]);
      setThumbnail(null);
    }
  };

  // Custom audio elements controls
  const handleAudioPlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((ex) => console.log('Playback start error', ex));
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetVal = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = targetVal;
      setCurrentTime(targetVal);
    }
  };

  const handleAudioVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    setIsMuted(val === 0);
  };

  const handleToggleMute = () => {
    if (audioRef.current) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      audioRef.current.muted = nextMute;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080B11] text-slate-900 dark:text-slate-100 p-3 md:p-8 font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        
        {/* TOP SYSTEM NAV AREA */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-slate-200/50 dark:border-slate-800/50 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-md transform rotate-2 border-2 border-white dark:border-slate-800">
              <Zap className="text-white w-6 h-6 fill-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">ClayStory <span className="text-indigo-600 italic">Studio Pro</span></h1>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5 leading-none">
                <Sparkles className="w-3 h-3 text-indigo-500" /> Premium Modular Story Generator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-200/60 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-300/35 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'editor'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                id="tab-editor-btn"
              >
                <Wand2 className="w-3.5 h-3.5" /> Storyboard Editor
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                id="tab-history-btn"
              >
                <History className="w-3.5 h-3.5" /> Project History ({historyItems.length})
              </button>
            </div>

            <button
              onClick={toggleDarkMode}
              className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              aria-label="Toggle dark mode"
              id="theme-toggler-btn"
            >
              {darkMode ? <Sparkles className="w-4 h-4 text-yellow-400" /> : <Film className="w-4 h-4 text-indigo-500" />}
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 border border-red-200/60 dark:border-red-900 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2.5 animate-bounce">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* EDITOR TAB CONTENT */}
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* CONFIG SIDE PANEL */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* STORY BLUEPRINT CONFIG CARD */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
                <h2 className="text-sm font-extrabold uppercase text-indigo-500 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-[#6366F1]" /> 01. Story Blueprint
                </h2>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                    NARRATIVE PROMPT
                  </p>
                  <textarea
                    value={config.prompt}
                    onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                    placeholder="Contoh: Sang penemu jam kayu terbang di atas awan, dicari oleh ksatria yang butuh koordinat waktu rahasia..."
                    className="w-full h-36 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-sm font-medium leading-relaxed"
                  />
                  {(preAnalysisLoading || preAnalysis || preAnalysisError) && (
                    <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                          {preAnalysisLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                          Pre-Analysis Guide
                        </p>
                        {preAnalysis && (
                          <button
                            onClick={() => handleCopy(
                              `Audio Profile: ${preAnalysis.audioProfile.voiceTone}; ${preAnalysis.audioProfile.pacing}; ${preAnalysis.audioProfile.sfxStyle}; ${preAnalysis.audioProfile.emotion}\n\nScene Preview: ${preAnalysis.scenePreview.title}\n${preAnalysis.scenePreview.visualConcept}\n${preAnalysis.scenePreview.motionConcept}\n\nSample Context: ${preAnalysis.sampleContext}`,
                              'pre_analysis_all'
                            )}
                            className="p-1.5 rounded-lg hover:bg-white/70 dark:hover:bg-slate-900 text-indigo-600 dark:text-indigo-300 cursor-pointer"
                            title="Copy pre-analysis"
                          >
                            {copiedKey === 'pre_analysis_all' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>

                      {preAnalysisError && (
                        <p className="text-[10px] font-bold text-rose-500">{preAnalysisError}</p>
                      )}

                      {preAnalysis && (
                        <div className="space-y-2 text-[10.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-white/70 dark:bg-slate-950/60 border border-indigo-100/70 dark:border-slate-800 p-2">
                              <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Voice</span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-100">{preAnalysis.audioProfile.voiceTone}</span>
                            </div>
                            <div className="rounded-xl bg-white/70 dark:bg-slate-950/60 border border-indigo-100/70 dark:border-slate-800 p-2">
                              <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Pacing</span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-100">{preAnalysis.audioProfile.pacing}</span>
                            </div>
                          </div>
                          <div className="rounded-xl bg-white/70 dark:bg-slate-950/60 border border-indigo-100/70 dark:border-slate-800 p-2">
                            <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Scene Preview</span>
                            <p className="font-extrabold text-slate-800 dark:text-slate-100">{preAnalysis.scenePreview.title}</p>
                            <p className="mt-1">{preAnalysis.scenePreview.visualConcept}</p>
                            <p className="mt-1 italic">{preAnalysis.scenePreview.motionConcept}</p>
                          </div>
                          <div className="rounded-xl bg-white/70 dark:bg-slate-950/60 border border-indigo-100/70 dark:border-slate-800 p-2">
                            <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Sample Context</span>
                            <p>{preAnalysis.sampleContext}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                      Format
                    </p>
                    <select
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold focus:border-indigo-500 outline-none"
                      value={config.format}
                      onChange={(e) => setConfig({ ...config, format: e.target.value as AspectRatio })}
                    >
                      <option value="9:16">Vertical TikTok (9:16)</option>
                      <option value="16:9">Widescreen (16:9)</option>
                      <option value="1:1">Square Post (1:1)</option>
                      <option value="4:3">Card Size (4:3)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                      Language Style
                    </p>
                    <div className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5 text-indigo-500" /> Natural Indo V5
                    </div>
                  </div>
                </div>

                {/* SCENES COUNT SELECTION */}
                <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/55">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      Total Scenes: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{(config.numScenes || config.scenes)}</span>
                    </span>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-black shrink-0">
                      ⌛ Estimated Duration: {(config.numScenes || config.scenes) * 10} sec
                    </span>
                  </div>

                  {/* Range slider */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="1"
                      value={config.numScenes || config.scenes}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setConfig({ ...config, scenes: val, numScenes: val });
                      }}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-semibold px-0.5">
                      <span>1 Scene</span>
                      <span>8 (Default)</span>
                      <span>15 Scenes</span>
                    </div>
                  </div>

                  {/* Preset Buttons */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                      Quick Presets
                    </p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[5, 8, 10, 12, 15].map((num) => {
                        const isPresetActive = (config.numScenes || config.scenes) === num;
                        return (
                          <button
                            type="button"
                            key={num}
                            onClick={() => setConfig({ ...config, scenes: num, numScenes: num })}
                            className={`py-2 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                              isPresetActive
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm scale-110'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Safety Alert for Long Generations */}
                  {(config.numScenes || config.scenes) > 8 && (
                    <div className="p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold flex items-start gap-1.5 leading-normal">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Large projects (&gt; 8 scenes) may take longer to generate, and are automatically split into sequence parts to prevent API timeouts.</span>
                    </div>
                  )}
                </div>

                {/* REFERENCE IMAGE UPLOAD MODULE (NEW REQUIREMENT) */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                      Aesthetic Style Reference Guide
                    </p>
                    {config.referenceImage && (
                      <button onClick={clearReferenceImage} className="text-[10px] font-bold text-red-500 hover:underline">
                        Remove
                      </button>
                    )}
                  </div>

                  {config.referenceImage ? (
                    <div className="relative rounded-2xl border border-indigo-200/50 dark:border-indigo-900/40 bg-indigo-50/20 p-3 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                        <img src={config.referenceImage} alt="Ref Template" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 truncate">Consistent Reference.png</p>
                        <p className="text-[10px] text-slate-400 font-bold tracking-tight">Image injected in prompts engine</p>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 rounded-2xl cursor-pointer p-4 transition-all">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Upload referensi gaya karakter...</span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleReferenceImageUpload} className="hidden" />
                    </label>
                  )}
                </div>

                {/* AESTHETIC STYLE SELECTION */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                    Select Clay DNA Presets
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {STYLE_PRESETS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setConfig({ ...config, style: s })}
                        className={`p-2.5 rounded-2xl border transition-all flex items-center gap-2 text-left ${
                          config.style.id === s.id
                            ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full shrink-0 shadow-sm bg-gradient-to-tr ${s.previewClass}`} />
                        <div className="min-w-0">
                          <p className="text-[11px] font-extrabold text-slate-800 dark:text-slate-300 truncate leading-tight">
                            {s.name}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleGenerateStory}
                    disabled={loading}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl shadow-md cursor-pointer flex items-center justify-center gap-2.5 transition-all text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>MENGHUBUNGKAN AI MODEL...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 text-white" />
                        <span>SYNTHESIZE STORYBOARD</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* STATS VIRALITY MODULE */}
              {scenes.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 dark:from-slate-900 dark:to-[#0f141f] rounded-3xl border border-indigo-800/20 p-6 text-white space-y-4 shadow-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-widest">ESTIMASI DETEKTSI</p>
                      <h3 className="text-sm font-extrabold text-white">Social Trend Virality Score</h3>
                    </div>
                    <div className="w-12 h-12 rounded-full border border-indigo-400 bg-indigo-950 flex items-center justify-center">
                      <span className="text-sm font-black text-indigo-300 italic">Pro</span>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">{viralityScore}/100</span>
                    <span className={`text-xs font-bold ${
                      viralityScore >= 85
                        ? 'text-emerald-400'
                        : viralityScore >= 70
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}>
                      Level: {viralityScore >= 85 ? 'Highly Viral' : viralityScore >= 70 ? 'Strong Potential' : 'Weak Potential'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-2 w-full bg-indigo-950 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        viralityScore >= 85
                          ? 'bg-emerald-500'
                          : viralityScore >= 70
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`} style={{ width: `${viralityScore}%` }} />
                    </div>
                    <p className="text-[10px] text-indigo-200/60 leading-normal font-medium">
                      Ditakar dari parameter hook adegan pertama, durasi ideal shorts, gaya bahasa santai Indonesia, serta kualitas ClayCaricature 3D.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* MAIN PREVIEW AND EDIT ACTIONS */}
            <div className="lg:col-span-8 space-y-6">
              
              {scenes.length > 0 ? (
                <div className="space-y-6">
                  
                  {/* CENTRAL STORY LAYOUT PLATFORM */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* VISUAL VIEWER FRAME */}
                    <div className="md:col-span-6 bg-slate-50 dark:bg-slate-950 rounded-2xl relative border border-slate-200 dark:border-slate-800 shadow-inner p-3 min-h-[360px] flex items-center justify-center overflow-hidden">
                      
                      {activeScene?.renderStatus === 'DONE' && activeScene?.imageUrl ? (
                        <div className="relative group rounded-xl overflow-hidden shadow-md max-w-[240px] aspect-[9/16] w-full bg-slate-900 transition-all">
                          <img src={activeScene.imageUrl} className="w-full h-full object-cover" alt="Render Output" referrerPolicy="no-referrer" />
                          
                          {/* Conditional floating overlay context for Thumbnail preview */}
                          {activeSceneIndex === 0 && thumbnail && (
                            <div className="absolute inset-x-0 top-[15%] p-4 flex flex-col items-center justify-center text-center drop-shadow-lg pointer-events-none">
                              <h2 className="text-xl font-extrabold text-white leading-tight uppercase bg-black/50 px-3 py-1.5 rounded-lg border-2 border-indigo-400">
                                {thumbnail.thumbnailTitle}
                              </h2>
                              <span className="text-[8px] mt-1 font-bold text-yellow-300 uppercase bg-slate-900/80 px-2 py-0.5 rounded-md">
                                {thumbnail.thumbnailSubtext}
                              </span>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                            <button
                              onClick={() => setIsFullscreenPreview(true)}
                              className="p-3 bg-white hover:bg-slate-100 text-slate-900 rounded-full cursor-pointer shadow-md transition-transform hover:scale-105"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRenderSceneVisual(activeSceneIndex)}
                              className="p-3 bg-white hover:bg-slate-100 text-indigo-600 rounded-full cursor-pointer shadow-md transition-transform hover:scale-105"
                              title="Re-render scene image"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center max-w-sm text-center p-6 space-y-4">
                          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-slate-900 border border-indigo-100/60 dark:border-slate-800 flex items-center justify-center text-indigo-600">
                            {activeScene?.renderStatus === 'RENDERING' ? (
                              <Loader2 className="w-8 h-8 animate-spin" />
                            ) : (
                              <ImageIcon className="w-8 h-8" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none">
                              {activeScene?.isOutro ? 'Scene Outro CTA' : `Adegan #${activeSceneIndex + 1}`}
                            </span>
                            <h3 className="text-base font-extrabold text-slate-800 dark:text-white mt-1 leading-snug">
                              Ready for Clay Caricature synthesis
                            </h3>
                            <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1 italic">
                              Membangun model klay Pixar sesuai naskah visual di bawah.
                            </p>
                          </div>
                          <button
                            onClick={() => handleRenderSceneVisual(activeSceneIndex)}
                            disabled={activeScene?.renderStatus === 'RENDERING'}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            {activeScene?.renderStatus === 'RENDERING' ? 'RENDERING VIA IMAGEN...' : 'SYNTHESIZE CINEMATIC IMAGE'}
                          </button>
                        </div>
                      )}

                      {/* Floating status badges */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="bg-indigo-600 text-white text-[9px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                          {activeScene?.sceneType}
                        </span>
                        <span className="bg-slate-900 dark:bg-slate-800 text-slate-300 text-[9px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                          {activeScene?.isOutro ? 'OUTRO' : `SCENE ${activeSceneIndex + 1}`}
                        </span>
                      </div>

                      {/* PROGRESS DETECTOR IN THE IMAGE BORDER */}
                      <div className="absolute top-4 right-4 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          activeScene?.renderStatus === 'DONE' ? 'bg-green-500' :
                          activeScene?.renderStatus === 'RENDERING' ? 'bg-orange-500 animate-ping' :
                          activeScene?.renderStatus === 'FAILED' ? 'bg-red-500' : 'bg-slate-400'
                        }`} />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">
                          {activeScene?.renderStatus}
                        </span>
                      </div>

                    </div>

                    {/* CONTENT SCRIPT & AUDIO ENGINE DETAILS */}
                    <div className="md:col-span-6 flex flex-col justify-between py-1">
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                            <BookOpen className="w-3.5 h-3.5" /> VOICE OVER DIALOGUE
                          </p>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleCopy(activeScene?.narrationScript, 'script_' + activeSceneIndex)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
                              title="Copy script"
                            >
                              {copiedKey === 'script_' + activeSceneIndex ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleRegenerateSingleScene(activeSceneIndex)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-indigo-500 transition-colors cursor-pointer"
                              title="Rewrite script context via AI"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* OUTRO CTA BRIDGE OR REGULAR HEADER INFO */}
                        {activeScene?.isOutro && activeScene.transitionSentence && (
                          <div className="p-3 bg-pink-50 dark:bg-pink-950/20 border-l-4 border-pink-500 rounded-r-xl">
                            <p className="text-[10.5px] font-extrabold text-pink-700 dark:text-pink-400 italic">
                              Bridge: "{activeScene.transitionSentence}"
                            </p>
                          </div>
                        )}

                        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 italic text-base font-extrabold leading-relaxed text-slate-800 dark:text-slate-200 shadow-inner">
                          {activeScene?.narrationScript}
                        </div>

                        {/* VOICE PROFILE META */}
                        {audioProfile && (
                          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg grid grid-cols-2 gap-3 text-[10px] text-slate-500">
                            <div>Voice: <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase">{audioProfile.voiceTone}</span></div>
                            <div>Pacing: <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase">{audioProfile.pacing}</span></div>
                            <div>SFX: <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase">{audioProfile.sfxStyle}</span></div>
                            <div>Emotion: <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase">{audioProfile.emotion}</span></div>
                          </div>
                        )}

                        {sampleContext && (
                          <div className="p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 text-[10.5px] leading-relaxed text-slate-600 dark:text-slate-300 relative">
                            <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-300 uppercase tracking-widest mb-1">Story Context Summary</p>
                            <p>{sampleContext}</p>
                            <button
                              onClick={() => handleCopy(sampleContext, 'sample_context')}
                              className="absolute top-2 right-2 p-1.5 hover:bg-white/70 dark:hover:bg-slate-900 rounded-lg text-indigo-500 cursor-pointer"
                              title="Copy story context"
                            >
                              {copiedKey === 'sample_context' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}

                      </div>

                      {/* INTEGRATED IMPROVED AUDIO PLAYER (NEW REQUIREMENT) */}
                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        
                        {activeScene?.audioUrl ? (
                          <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <audio
                              ref={(el) => {
                                audioRef.current = el;
                              }}
                              src={activeScene.audioUrl}
                              onPlay={() => setIsPlaying(true)}
                              onPause={() => setIsPlaying(false)}
                              onTimeUpdate={() => {
                                if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
                              }}
                              onLoadedMetadata={() => {
                                if (audioRef.current) setDuration(audioRef.current.duration);
                              }}
                              onEnded={() => setIsPlaying(false)}
                            />

                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                                <Mic2 className="w-3 h-3 text-indigo-500" /> Premium Voice AI Active
                              </span>
                              <span className="text-[9px] font-bold text-slate-400">
                                {Math.floor(currentTime)}s / {Math.floor(duration || 0)}s
                              </span>
                            </div>

                            {/* PROGRESS RANGE SCRUB */}
                            <input
                              type="range"
                              min={0}
                              max={duration || 100}
                              value={currentTime}
                              onChange={handleAudioScrub}
                              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />

                            {/* CONTROLS ROW */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleAudioPlayPause}
                                  className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
                                  aria-label="Play or Pause"
                                >
                                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white text-white" /> : <Play className="w-3.5 h-3.5 fill-white text-white" />}
                                </button>
                                <button
                                  onClick={handleToggleMute}
                                  className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
                                  aria-label="Mute or Unmute"
                                >
                                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                </button>
                                <input
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.1}
                                  value={volume}
                                  onChange={handleAudioVolumeChange}
                                  className="w-16 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                              </div>

                              <a
                                href={activeScene.audioUrl}
                                download={`claystory_scene_${activeSceneIndex}_voiceover.wav`}
                                className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-slate-900 dark:hover:bg-slate-800 text-[10px] font-extrabold rounded-lg flex items-center gap-1.5 transition-all text-decoration-none"
                              >
                                <Download className="w-3.5 h-3.5" /> WAV
                              </a>
                            </div>

                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                              {activeScene?.loadingAudio ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                                  <span>Mengolah File Suara...</span>
                                </>
                              ) : (
                                <>
                                  <Mic2 className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Suara belum tersedia</span>
                                </>
                              )}
                            </span>
                            {!activeScene?.loadingAudio && (
                              <button
                                onClick={() => triggerSceneAudioSynth(activeSceneIndex, activeScene?.narrationScript, scenes)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold rounded-lg cursor-pointer transition-all"
                              >
                                Buat Suara
                              </button>
                            )}
                          </div>
                        )}

                      </div>

                    </div>

                  </div>

                  {/* THUMBNAIL META OVERVIEW CELL (SCENE 0) */}
                  {thumbnail && (
                    <div className="bg-slate-500/5 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <span className="bg-amber-100 text-amber-700 text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-wider">
                            SCENE 0: ULTRA THUMBNAIL BLUEPRINT
                          </span>
                          
                          {thumbnail.thumbnailViralityScore !== undefined && (
                            <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider shadow-sm ${
                              thumbnail.thumbnailViralityScore >= 85
                                ? 'bg-emerald-500 text-white'
                                : thumbnail.thumbnailViralityScore >= 70
                                ? 'bg-amber-500 text-slate-900'
                                : 'bg-rose-500 text-white'
                            }`}>
                              Virality Score: {thumbnail.thumbnailViralityScore}/100
                            </span>
                          )}

                          <span className={`w-2.5 h-2.5 rounded-full ${thumbnail.renderStatus === 'DONE' ? 'bg-green-500' : 'bg-slate-400'}`} />
                        </div>

                        <div>
                          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase">
                            {thumbnail.thumbnailTitle}
                          </h3>
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 leading-normal italic mt-1">
                            {thumbnail.thumbnailSubtext}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-semibold text-slate-500">
                          <div>Expression: <span className="font-extrabold text-slate-800 dark:text-slate-300">{thumbnail.thumbnailExpression}</span></div>
                          <div>Lighting: <span className="font-extrabold text-slate-800 dark:text-slate-300">{thumbnail.thumbnailLighting}</span></div>
                          <div>Composition: <span className="font-extrabold text-slate-800 dark:text-slate-300">{thumbnail.thumbnailComposition}</span></div>
                          <div>Palette: <span className="font-extrabold text-slate-800 dark:text-slate-300">{thumbnail.thumbnailColorTone}</span></div>
                        </div>
                      </div>

                      <div className="w-full md:w-[200px] flex flex-col gap-2 items-center justify-center border-l-0 md:border-l border-slate-200 dark:border-slate-800 md:pl-6 shrink-0">
                        {thumbnail.imageUrl ? (
                          <div className="relative group max-h-[140px] aspect-[9/16] overflow-hidden rounded-xl border border-slate-200 bg-black">
                            <img src={thumbnail.imageUrl} className="w-full h-full object-cover" alt="Thumbnail Preview" referrerPolicy="no-referrer" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 flex justify-center opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={handleRenderThumbnailVisual} className="text-[10px] font-extrabold text-white uppercase hover:underline cursor-pointer">
                                Re-render
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={handleRenderThumbnailVisual}
                            disabled={thumbnail.renderStatus === 'RENDERING'}
                            className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold tracking-tight rounded-xl shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {thumbnail.renderStatus === 'RENDERING' ? 'RENDERING THUMBNAIL...' : 'GENERATE THUMBNAIL IMAGE'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SCENE TIMELINE WITH REORDER CONTROLS */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                        Story Timeline & Order Platform
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={handleBatchRenderAll}
                          disabled={batchRendering}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {batchRendering ? 'BATCH RENDERING IN ACTION...' : 'BATCH RENDER ALL SCENES'}
                        </button>
                        <button
                          onClick={handleDownloadFullProject}
                          className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-extrabold rounded-xl cursor-pointer"
                        >
                          EXPORT JSON PACKAGE
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x custom-scrollbar">
                      {scenes.map((scene, idx) => {
                        const isSelected = activeSceneIndex === idx;
                        return (
                          <div
                            key={scene.id}
                            className={`flex flex-col gap-2 shrink-0 snap-align-start w-[200px] p-3 rounded-2xl border-2 transition-all ${
                              isSelected
                                ? 'bg-white dark:bg-slate-900 border-indigo-600 shadow-md'
                                : 'bg-slate-100 dark:bg-slate-900/30 border-transparent hover:border-slate-300'
                            }`}
                          >
                            <button
                              onClick={() => setActiveSceneIndex(idx)}
                              className="text-left w-full cursor-pointer group"
                            >
                              <div className="w-full aspect-[4/3] rounded-xl bg-slate-200 dark:bg-slate-950 overflow-hidden relative border border-slate-300/40 shadow-inner flex items-center justify-center">
                                {scene.imageUrl ? (
                                  <img src={scene.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Preview small" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="text-[10px] font-bold text-slate-400 flex flex-col items-center gap-1">
                                    {scene.renderStatus === 'RENDERING' ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                    ) : (
                                      <ImageIcon className="w-5 h-5" />
                                    )}
                                    <span>Re-render</span>
                                  </div>
                                )}
                                <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded">
                                  {scene.isOutro ? 'OUTRO' : `SCENE ${idx + 1}`}
                                </span>
                                
                                {scene.viralityScore !== undefined && (
                                  <span className={`absolute top-1.5 right-1.5 text-[8px] font-black px-1.5 py-0.5 rounded shadow ${
                                    scene.viralityScore >= 85
                                      ? 'bg-emerald-500 text-white'
                                      : scene.viralityScore >= 70
                                      ? 'bg-amber-500 text-slate-900'
                                      : 'bg-rose-500 text-white'
                                  }`}>
                                    VIRAL {scene.viralityScore}/100
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] font-extrabold text-slate-800 dark:text-slate-300 line-clamp-1 mt-1.5">
                                {scene.sceneTitle}
                              </p>
                              <div className="flex items-center justify-between gap-1.5 mt-0.5 text-[9px] font-bold text-slate-400">
                                <span className="line-clamp-1 italic max-w-[70%]">
                                  {scene.narrationScript}
                                </span>
                                <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[8px] font-black shrink-0 whitespace-nowrap">
                                  ⌛ {estimateDuration(scene.narrationScript)}s
                                </span>
                              </div>
                            </button>

                            {/* TIMELINE CONTROLS - REORDER AND EXPORTCELL */}
                            <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/80 pt-1.5 mt-0.5 text-slate-400">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleReorderScene(idx, 'UP')}
                                  disabled={idx === 0}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-600 cursor-pointer disabled:opacity-30"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleReorderScene(idx, 'DOWN')}
                                  disabled={idx === scenes.length - 1}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-600 cursor-pointer disabled:opacity-30"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <button
                                onClick={() => handleExportPerScene(idx)}
                                className="p-1 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded text-indigo-500 cursor-pointer"
                                title="Export scene txt metadata"
                              >
                                <FolderDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* PROMPT BUILDER DETAILS BOX */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl p-6 space-y-4">
                    <h3 className="text-sm font-extrabold uppercase text-indigo-500 flex items-center gap-1.5">
                      <Settings className="w-4 h-4" /> Interactive Prompt Builder
                    </h3>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                            MODIFIABLE STYLISTIC IMAGE PROMPT
                          </p>
                          <textarea
                            value={activeScene?.imagePrompt || ''}
                            onChange={(e) => handleUpdatePromptBuilderValues(activeSceneIndex, e.target.value, activeScene?.videoPrompt || '')}
                            className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-[10.5px] leading-relaxed"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                            MODIFIABLE VIDEO MOTION PROMPT
                          </p>
                          <textarea
                            value={activeScene?.videoPrompt || ''}
                            onChange={(e) => handleUpdatePromptBuilderValues(activeSceneIndex, activeScene?.imagePrompt || '', e.target.value)}
                            className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-[10.5px] leading-relaxed"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px]">
                        <p className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase">Compiled Master System Image Prompt sent to Imagen:</p>
                        <p className="text-slate-500 font-mono leading-relaxed mt-1">{activeScene?.fullImagePrompt}</p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px]">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase">Compiled Master Video Prompt for Google AI Studio:</p>
                          <button
                            onClick={() => handleCopy(activeScene?.fullVideoPrompt || activeScene?.videoPrompt, 'full_video_' + activeSceneIndex)}
                            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-indigo-500 cursor-pointer"
                            title="Copy master video prompt"
                          >
                            {copiedKey === 'full_video_' + activeSceneIndex ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-slate-500 font-mono leading-relaxed mt-1">{activeScene?.fullVideoPrompt || activeScene?.videoPrompt}</p>
                      </div>
                    </div>
                  </div>

                  {/* VIRAL SMART CAPTION PLATFORM SCREEN */}
                  {educationalCaption && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/60 dark:border-emerald-900/40 rounded-3xl p-6">
                      
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquareText className="w-4 h-4" /> Premium Caption Copy
                        </h4>
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-emerald-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic relative">
                          {educationalCaption.caption}
                          <button
                            onClick={() => handleCopy(educationalCaption.caption, 'cap')}
                            className="absolute top-2 right-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer"
                          >
                            {copiedKey === 'cap' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Laugh className="w-4 h-4" /> SPARKS INTERACTION CALL-TO-ACTION (CTA)
                        </h4>
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-emerald-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic relative">
                          "{educationalCaption.cta}"
                          <button
                            onClick={() => handleCopy(educationalCaption.cta, 'cta')}
                            className="absolute top-2 right-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer"
                          >
                            {copiedKey === 'cta' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              ) : (
                <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl py-32 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-slate-900 flex items-center justify-center text-indigo-600 mb-4">
                    <Wand2 className="w-8 h-8 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-white uppercase tracking-tight">
                    ClayStory Project Studio Empty
                  </h3>
                  <p className="text-xs text-slate-400 font-bold max-w-sm mt-1 mb-6 leading-relaxed">
                    Masukkan ide cerita visual Anda di panel kiri lalu klik "Synthesize Storyboard" untuk memulai kolaborasi.
                  </p>
                </div>
              )}

            </div>

          </div>
        )}

        {/* HISTORY TAB CONTENT */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <h2 className="text-sm font-black uppercase text-indigo-500 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <History className="w-4 h-4" /> ClayStory Projects History Log ({historyItems.length})
            </h2>

            {historyItems.length === 0 ? (
              <div className="py-24 text-center">
                <BookMarked className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">Belum ada project yang tersimpan di LocalStorage.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadSelectedProject(item)}
                    className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50 dark:bg-slate-950/40 hover:border-indigo-500/80 transition-all cursor-pointer flex flex-col justify-between h-[200px]"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] text-slate-400 font-extrabold tracking-wider">{item.createdAt}</span>
                        <button
                          onClick={(e) => handleDeleteSelectedProject(item.id, e)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-red-500 rounded transition-colors"
                          title="Hapus project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white mt-1.5 uppercase leading-normal line-clamp-2">
                        {item.scenes?.[0]?.sceneTitle || 'Project Storyboard'}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 italic mt-1 line-clamp-2 leading-relaxed">
                        "{item.config.prompt}"
                      </p>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800/80 pt-2 text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded text-[8px] uppercase">
                          {item.scenes?.length} Scenes
                        </span>
                        <span className="text-slate-400 font-bold">{item.config.style.name}</span>
                      </div>
                      <span className="text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-500" /> Virality: {item.viralityScore}%
                      </span>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* DETAILED FULLSCREEN PREVIEW OVERLAY (NEW REQUIREMENT) */}
      <AnimatePresence>
        {isFullscreenPreview && activeScene && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-hidden"
          >
            <div className="max-w-4xl w-full bg-[#0d121c] rounded-3xl border border-slate-800 overflow-hidden flex flex-col md:flex-row h-[90vh] shadow-2xl relative">
              
              {/* Closee control button */}
              <button
                onClick={() => setIsFullscreenPreview(false)}
                className="absolute top-4 right-4 z-[10010] p-2.5 bg-black/60 hover:bg-black text-white rounded-full transition-all cursor-pointer border border-slate-700"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Portrait frame visualization screen */}
              <div className="flex-1 md:col-span-1 border-r border-slate-800/60 bg-black flex items-center justify-center p-6 h-full relative overflow-hidden">
                {activeScene.imageUrl ? (
                  <div className="relative aspect-[9/16] h-full max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl">
                    <img src={activeScene.imageUrl} className="w-full h-full object-cover" alt="Fullscreen Visual Render" referrerPolicy="no-referrer" />
                    
                    {activeSceneIndex === 0 && thumbnail && (
                      <div className="absolute inset-x-0 top-[18%] p-6 text-center drop-shadow-2xl">
                        <h2 className="text-2xl font-black text-white uppercase bg-black/40 px-3 py-1.5 rounded-lg border border-indigo-400">
                          {thumbnail.thumbnailTitle}
                        </h2>
                        <span className="text-[10px] font-bold text-yellow-300 uppercase mt-2 block tracking-wider bg-slate-900/60 px-2 py-0.5 rounded-md w-max mx-auto">
                          {thumbnail.thumbnailSubtext}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-8 space-y-4">
                    <ImageIcon className="w-16 h-16 text-slate-700 mx-auto animate-pulse" />
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Visual rendering pending</p>
                  </div>
                )}
              </div>

              {/* Sidebar information controller */}
              <div className="w-full md:w-[360px] p-6 shrink-0 flex flex-col justify-between h-full bg-[#0f1524]">
                <div className="space-y-6">
                  <div>
                    <span className="bg-indigo-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{activeScene.sceneType}</span>
                    <h2 className="text-xl font-extrabold text-white uppercase mt-2">{activeScene.sceneTitle || 'PREVIEW FULLSCREEN'}</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interactive Playback Overlay</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest leading-none">Voiceover Script Copy</h4>
                    <p className="p-4 rounded-xl bg-slate-950 italic text-sm font-extrabold leading-relaxed text-slate-200 border border-slate-800 shadow-inner">
                      "{activeScene.narrationScript}"
                    </p>
                  </div>

                  {activeScene.isOutro && activeScene.transitionSentence && (
                    <div className="p-3 rounded-lg bg-pink-500/10 border-l-4 border-pink-500 text-pink-400 text-xs">
                      {activeScene.transitionSentence}
                    </div>
                  )}

                  {activeScene.audioUrl && (
                    <div className="space-y-2 pt-4 border-t border-slate-800">
                      <p className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest leading-none">Voice Audio Track Playback</p>
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                        <button
                          onClick={handleAudioPlayPause}
                          className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center cursor-pointer shadow-md"
                        >
                          {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                        </button>
                        <div className="text-[11px] font-bold text-slate-300">
                          Play ambient dialogue overlay
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-800/80">
                  <button
                    onClick={() => setIsFullscreenPreview(false)}
                    className="w-full h-11 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase rounded-xl tracking-wider transition-all cursor-pointer"
                  >
                    Kembali ke Dasbor
                  </button>
                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
      `}</style>
    </div>
  );
}
