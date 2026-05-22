/**
 * ClayStory Studio Pro
 * Type Safety Declarations
 */

export interface ClayStyle {
  id: string;
  name: string;
  previewClass: string;
  promptAddon: string;
}

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:3';

export type AudioMode = 'SFX + BGM' | 'VO Only' | 'No Audio';

export interface StoryConfig {
  prompt: string;
  scenes: number;
  format: AspectRatio;
  audioMode: AudioMode;
  languageStyle: string;
  style: ClayStyle;
  referenceImage?: string; // Base64 or URL
  numScenes?: number;
}

export interface AudioProfile {
  voiceTone: string;
  sfxStyle: string;
  pacing: string;
  emotion: string;
}

export interface EducationalCaption {
  caption: string;
  cta: string;
}

export interface AudioDirection {
  sfx: string;
  voiceEmotion: string;
  environmentSound: string;
}

export interface Scene {
  id: string;
  sceneTitle: string;
  narrationScript: string;
  imagePrompt: string;
  videoPrompt: string;
  audioDirection: AudioDirection;
  sceneType: 'CHARACTER' | 'ENVIRONMENT' | 'OUTRO';
  fullImagePrompt: string;
  fullVideoPrompt?: string;
  imageUrl?: string;
  audioUrl?: string;
  loadingAudio?: boolean;
  renderStatus: 'WAITING' | 'RENDERING' | 'DONE' | 'FAILED';
  isOutro?: boolean;
  transitionSentence?: string;
  viralityScore?: number;
}

export interface ThumbnailData {
  thumbnailTitle: string;
  thumbnailSubtext: string;
  thumbnailPrompt: string;
  fullThumbnailPrompt: string;
  thumbnailExpression: string;
  thumbnailLighting: string;
  thumbnailComposition: string;
  thumbnailColorTone: string;
  imageUrl?: string;
  renderStatus: 'WAITING' | 'RENDERING' | 'DONE' | 'FAILED';
  thumbnailViralityScore?: number;
}

export interface StoryboardResponse {
  audioProfile: AudioProfile;
  sampleContext: string;
  educationalCaption: EducationalCaption;
  overallViralityScore: number;
  thumbnailViralityScore?: number;
  endingScene: {
    transitionSentence: string;
    ctaNarration: string;
    imagePrompt: string;
    videoPrompt: string;
  };
  scenes: Omit<Scene, 'id' | 'fullImagePrompt' | 'renderStatus'>[];
}

export interface PromptAnalysisResponse {
  audioProfile: AudioProfile;
  scenePreview: {
    title: string;
    visualConcept: string;
    motionConcept: string;
    hook: string;
    emotion: string;
  };
  sampleContext: string;
}

export interface ProjectHistoryItem {
  id: string;
  title: string;
  createdAt: string;
  config: StoryConfig;
  scenes: Scene[];
  thumbnail?: ThumbnailData;
  audioProfile?: AudioProfile;
  sampleContext?: string;
  educationalCaption?: EducationalCaption;
  viralityScore?: number;
  numScenes?: number;
}

export type StoryProject = ProjectHistoryItem;
