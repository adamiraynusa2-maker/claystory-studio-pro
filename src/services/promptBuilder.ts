/**
 * ClayStory Studio Pro
 * Prompt Building and Custom Enhancer Engines
 */

import { MASTER_IMAGE_PROMPT, MASTER_VIDEO_PROMPT } from './systemPrompts';

/**
 * Sanitizes characters or forbidden action phrases to prevent safety filter blocks
 * using context-aware replacements that keep the narration grammatically correct.
 */
export function sanitizeVideoPrompt(prompt: string = ''): string {
  if (!prompt) return '';
  let clean = prompt;

  // Swap out sensitive entities with generic cinematic designations
  clean = clean.replace(/\bDonald Trump\b/gi, "the main leader caricature");
  clean = clean.replace(/\bTrump\b/gi, "the leader caricature");
  clean = clean.replace(/\bXi Jinping\b/gi, "the east-asian leader caricature");
  clean = clean.replace(/\bXi\b/gi, "the leader caricature");
  clean = clean.replace(/\bPutin\b/gi, "the northern leader caricature");

  // Fix blind talking/speaking verb replacements to preserve natural syntax structure
  const patterns = [
    { pattern: /\bis talking\b/gi, replacement: "has subtle expressive lip and gesture movements" },
    { pattern: /\bis speaking\b/gi, replacement: "has subtle expressive lip and gesture movements" },
    { pattern: /\bas he talks\b/gi, replacement: "while exhibiting quiet mouth and hand animations" },
    { pattern: /\bas she talks\b/gi, replacement: "while exhibiting quiet mouth and hand animations" },
    { pattern: /\bas they talk\b/gi, replacement: "while exhibiting quiet mouth and hand animations" },
    { pattern: /\bwhile talking\b/gi, replacement: "while showing expressive lip movements" },
    { pattern: /\bwhile speaking\b/gi, replacement: "while showing expressive lip movements" },
    { pattern: /\btalking to\b/gi, replacement: "exhibiting expressive lip movements with" },
    { pattern: /\bspeaking to\b/gi, replacement: "exhibiting expressive lip movements with" },
    { pattern: /\bstart talking\b/gi, replacement: "begin expressing subtle mouth movements" },
    { pattern: /\bstart speaking\b/gi, replacement: "begin expressing subtle mouth movements" },
    { pattern: /\btalking\b/gi, replacement: "exhibiting expressive facial movements" },
    { pattern: /\bspeaking\b/gi, replacement: "exhibiting expressive facial movements" }
  ];

  for (const { pattern, replacement } of patterns) {
    clean = clean.replace(pattern, replacement);
  }

  return clean.trim();
}

/**
 * Enforces rigid aesthetic bounds on the final generated prompt (clay render styling).
 */
export function enforceHardRules(prompt: string): string {
  return `${prompt}\n\nSTRICT ENFORCEMENT:\n- character skin is solid polished clay\n- all objects are realistic wool structures\n- hair and cloth are fuzzy wool\n- no metal or plastic`;
}

/**
 * Detects scene mood and returns one of the 8 customized moods:
 * tension, revelation, danger, hopeful, suspense, triumph, grief, urgency
 */
export function detectMood(
  title: string,
  narration: string
): 'tension' | 'revelation' | 'danger' | 'hopeful' | 'suspense' | 'triumph' | 'grief' | 'urgency' {
  const text = `${title} ${narration}`.toLowerCase();

  if (
    text.includes('bahaya') ||
    text.includes('krisis') ||
    text.includes('ancaman') ||
    text.includes('darurat') ||
    text.includes('hancur') ||
    text.includes('ledakan') ||
    text.includes('danger') ||
    text.includes('crisis') ||
    text.includes('conflict') ||
    text.includes('explosion')
  ) {
    return 'danger';
  }
  if (
    text.includes('cepat') ||
    text.includes('segera') ||
    text.includes('buru-buru') ||
    text.includes('kejar') ||
    text.includes('lari') ||
    text.includes('urgency') ||
    text.includes('rush') ||
    text.includes('immediate') ||
    text.includes('swift') ||
    text.includes('fast') ||
    text.includes('panik')
  ) {
    return 'urgency';
  }
  if (
    text.includes('sedih') ||
    text.includes('duka') ||
    text.includes('tangis') ||
    text.includes('menangis') ||
    text.includes('kecewa') ||
    text.includes('kehilangan') ||
    text.includes('menyesal') ||
    text.includes('grief') ||
    text.includes('sad') ||
    text.includes('cry') ||
    text.includes('regret') ||
    text.includes('loss') ||
    text.includes('tragedy')
  ) {
    return 'grief';
  }
  if (
    text.includes('menang') ||
    text.includes('sukses') ||
    text.includes('berhasil') ||
    text.includes('hebat') ||
    text.includes('juara') ||
    text.includes('bangga') ||
    text.includes('triumph') ||
    text.includes('victory') ||
    text.includes('win') ||
    text.includes('success')
  ) {
    return 'triumph';
  }
  if (
    text.includes('selamat') ||
    text.includes('damai') ||
    text.includes('tenang') ||
    text.includes('ramah') ||
    text.includes('bahagia') ||
    text.includes('harap') ||
    text.includes('harapan') ||
    text.includes('hopeful') ||
    text.includes('peace') ||
    text.includes('positive')
  ) {
    return 'hopeful';
  }
  if (
    text.includes('bongkar') ||
    text.includes('rahasia') ||
    text.includes('ternyata') ||
    text.includes('terungkap') ||
    text.includes('baru tahu') ||
    text.includes('twist') ||
    text.includes('reveal') ||
    text.includes('revelation') ||
    text.includes('discover')
  ) {
    return 'revelation';
  }
  if (
    text.includes('misteri') ||
    text.includes('curiga') ||
    text.includes('sembunyi') ||
    text.includes('heran') ||
    text.includes('aneh') ||
    text.includes('suspense') ||
    text.includes('mystery') ||
    text.includes('suspicious') ||
    text.includes('secretive')
  ) {
    return 'suspense';
  }

  return 'tension'; // Default mood
}

/**
 * Enhanced Shot and Color Grading Prompt Builder for Scene Images
 */
export function buildImagePrompt(
  scene: {
    sceneTitle: string;
    narrationScript: string;
    imagePrompt: string;
    isOutro?: boolean;
  },
  index: number = 1, // 1-based index (Hook = 1)
  totalScenes: number = 8,
  referenceImage?: string
): string {
  // Explicit Shot Type Rules per Scene Position (Point 9)
  let shotTypeRule = '';
  if (index === 1) {
    shotTypeRule = 'SHOT TYPE: extreme close-up face, 85mm lens simulation, subject fills 80% of frame, providing maximum visual engagement.';
  } else if (index > 1 && index < totalScenes) {
    shotTypeRule = 'SHOT TYPE: medium shot with 50mm lens OR cinematic wide establishing shot with 24-35mm lens.';
  } else if (index === totalScenes || scene.isOutro) {
    shotTypeRule = 'SHOT TYPE: wide emotional closing shot with balanced composition.';
  } else {
    shotTypeRule = 'SHOT TYPE: wide shot, 24–35mm lens.';
  }

  // Expanded 8-mood Color Grading Rules (Point 10)
  const mood = detectMood(scene.sceneTitle, scene.narrationScript);
  let colorGradingRule = '';
  if (mood === 'danger') {
    colorGradingRule = 'COLOR GRADING: Danger (stark high-contrast orange-red rim lighting, heavy deep shadows).';
  } else if (mood === 'urgency') {
    colorGradingRule = 'COLOR GRADING: Urgency (hyper-saturated high-frequency warm tones, long dramatic shadow lines).';
  } else if (mood === 'grief') {
    colorGradingRule = 'COLOR GRADING: Grief (overcast bleak cool gray, desaturated muted color palette).';
  } else if (mood === 'triumph') {
    colorGradingRule = 'COLOR GRADING: Triumph (golden hour backlight, vibrant primary colors, soft organic lens flares).';
  } else if (mood === 'hopeful') {
    colorGradingRule = 'COLOR GRADING: Hopeful (soft glowing pastel colors, lifted black levels, gentle overall illumination).';
  } else if (mood === 'revelation') {
    colorGradingRule = 'COLOR GRADING: Revelation (warm golden amber light rays, soft glowing background, epic highlight roll-off).';
  } else if (mood === 'suspense') {
    colorGradingRule = 'COLOR GRADING: Suspense (low-key chiaroscuro lighting, deep mysterious indigo shadows, heavy vignette edges).';
  } else {
    colorGradingRule = 'COLOR GRADING: Tension (cool high-contrast teal shadows, desaturated midtones).';
  }

  let hookPrompt = '';
  if (index === 1) {
    hookPrompt = `
HOOK SCENE PRIORITY:
- create an ultra-scroll-stopping thumbnail composition
- visually surprising and emotionally intense
- strong central focal point
- dramatic foreground, midground, and background
- cinematic movie-poster quality
- powerful symbolic storytelling
- high contrast lighting
- highly clickable YouTube/TikTok thumbnail aesthetic
`;
  }

  let referenceImageGuideline = '';
  if (referenceImage) {
    referenceImageGuideline = `
STRICT VISUAL INTEGRATION RULE:
- Closely align the stylistic characters, clothes, face anatomy, colors, and setting with the provided reference image.
- Preserve consistent visual elements from the reference image.
`;
  }

  const prompt = `
${MASTER_IMAGE_PROMPT}
${hookPrompt}
${referenceImageGuideline}

${shotTypeRule}
${colorGradingRule}

SCENE CONTEXT:
${scene.narrationScript}

VISUAL:
${scene.imagePrompt}

VISUAL STORYTELLING PRIORITY (STRICT VISUAL CONSISTENCY):
- Only generate visual elements that are explicitly mentioned in the narration context or the reference image.
- Communicate the message entirely through direct visual elements of the narration.
- Use dramatic character expressions and only the essential objects needed.
- Use cinematic lighting and atmospheric effects.
- Maximize emotional impact.
- Absolute NO text of any kind.
- Absolute NO flags, NO holograms, NO infographic icons, NO futuristic UI, NO charts, and NO decorative background elements that are not directly mentioned in the narration.
`.trim();

  return enforceHardRules(prompt);
}

/**
 * Enhanced Duration and Camera Movement Builder for Scene Videos
 */
export function buildVideoPrompt(
  scene: {
    sceneTitle: string;
    narrationScript: string;
    videoPrompt: string;
    isOutro?: boolean;
  },
  index: number = 1, // 1-based index
  totalScenes: number = 8
): string {
  // Target duration rules (Point 8)
  const durationRule = 'TARGET DURATION: Exactly around 10 seconds and 20–25 words per scene narration script.';

  // Camera Speed Rule
  let cameraSpeedRule = '';
  if (index === 1) {
    cameraSpeedRule = 'CAMERA SPEED: hook: ultra slow push-in (0.3x).';
  } else if (scene.isOutro) {
    cameraSpeedRule = 'CAMERA SPEED: outro: slow pull back (0.4x).';
  } else {
    const text = `${scene.sceneTitle} ${scene.narrationScript}`.toLowerCase();
    if (text.includes('bongkar') || text.includes('twist') || text.includes('reveal') || text.includes('ternyata')) {
      cameraSpeedRule = 'CAMERA SPEED: reveal/twist: snap then settle.';
    } else {
      cameraSpeedRule = 'CAMERA SPEED: middle: slow to medium (0.5–0.7x).';
    }
  }

  // Emotion to Motion Rule
  let emotionToMotionRule = '';
  const text = `${scene.sceneTitle} ${scene.narrationScript}`.toLowerCase();
  if (
    text.includes('bahaya') ||
    text.includes('krisis') ||
    text.includes('darurat') ||
    text.includes('rusak') ||
    text.includes('hancur') ||
    text.includes('ledakan') ||
    text.includes('chaos')
  ) {
    emotionToMotionRule = 'EMOTION TO MOTION: danger/urgency: micro-jitter handheld camera shake, dynamic diagonal tracking.';
  } else if (
    text.includes('cepat') ||
    text.includes('segera') ||
    text.includes('buru-buru') ||
    text.includes('kejar') ||
    text.includes('lari')
  ) {
    emotionToMotionRule = 'EMOTION TO MOTION: fast tracking pan shot chasing character, energetic action camera.';
  } else if (
    text.includes('sedih') ||
    text.includes('duka') ||
    text.includes('menangis') ||
    text.includes('menyesal')
  ) {
    emotionToMotionRule = 'EMOTION TO MOTION: evocative/grief: super slow camera pull-back, slowly rising vertically to emphasize loneliness.';
  } else if (
    text.includes('menang') ||
    text.includes('sukses') ||
    text.includes('berhasil') ||
    text.includes('bangga')
  ) {
    emotionToMotionRule = 'EMOTION TO MOTION: triumph: slow rising perspective, grand cinematic motion.';
  } else if (
    text.includes('bongkar') ||
    text.includes('rahasia') ||
    text.includes('reveal')
  ) {
    emotionToMotionRule = 'EMOTION TO MOTION: revelation: slow push-in, rising camera angle.';
  } else if (
    text.includes('tenang') ||
    text.includes('damai') ||
    text.includes('calm')
  ) {
    emotionToMotionRule = 'EMOTION TO MOTION: hopeful/calm: static locked camera, gentle slow dolly.';
  } else {
    emotionToMotionRule = 'EMOTION TO MOTION: suspense: subtle handheld breathing drift, slow edge-vignetted panning.';
  }

  // Character Identity Lock Rule (Point 2)
  const characterLockRule = `
CHARACTER IDENTITY LOCK:
- Keep the face structure, hair style, clothing, and primary clay/wool colors of the main character 100% consistent with other scenes.
- Do not let the character's facial characteristics or attire mutate, drift, or change across scenes.
- Handcrafted miniature clay styling must stay uniform.
`;

  const prompt = `
${MASTER_VIDEO_PROMPT}

${durationRule}
${cameraSpeedRule}
${emotionToMotionRule}
${characterLockRule}

VIDEO SCENE:
${sanitizeVideoPrompt(scene.videoPrompt)}

VIDEO ENHANCEMENT:
- dynamic camera movement
- natural character gestures
- environmental motion (smoke, sparks, dust) that is strictly natural and logical to the scene context
`.trim();

  return enforceHardRules(prompt);
}

/**
 * Enhances a storyboard scene prompt with specific styling, rules, and reference image tracking.
 */
export function enhanceScene(
  scene: {
    sceneTitle: string;
    narrationScript: string;
    imagePrompt: string;
    videoPrompt: string;
    isOutro?: boolean;
    transitionSentence?: string;
  },
  index: number = 1,
  referenceImage?: string,
  totalScenes: number = 8
): {
  sceneTitle: string;
  narrationScript: string;
  imagePrompt: string;
  videoPrompt: string;
  isOutro?: boolean;
  transitionSentence?: string;
  enhancedImagePrompt: string;
  enhancedVideoPrompt: string;
} {
  const enhancedImagePrompt = buildImagePrompt(scene, index, totalScenes, referenceImage);
  const enhancedVideoPrompt = buildVideoPrompt(scene, index, totalScenes);

  return {
    ...scene,
    enhancedImagePrompt,
    enhancedVideoPrompt,
  };
}

/**
 * Generates the full master prompt for the viral thumbnail (Scene 0).
 */
export function generateThumbnailMasterPrompt(
  data: {
    thumbnailTitle: string;
    thumbnailSubtext: string;
    thumbnailPrompt: string;
  },
  userPrompt: string,
  referenceImage?: string
): string {
  let referenceImageGuideline = '';
  if (referenceImage) {
    referenceImageGuideline = `
STRICT MATCH TO REFERENCED STYLE AND ASSETS:
- Incorporate matching details from the reference image (colors, main face structure, general layout theme).
`;
  }

  const prompt = `
ULTRA VIRAL CINEMATIC THUMBNAIL

THUMBNAIL TITLE:
"${data.thumbnailTitle}"

THUMBNAIL SUBTEXT:
"${data.thumbnailSubtext}"

MAIN STORY CONTEXT:
${userPrompt}
${referenceImageGuideline}

SPACE COMPOSITION RULE (EXPLOSION TEXT AREA):
- reserve text area at upper-middle frame
- place headline directly above explosion/fire area
- main explosion becomes background for typography
- create cinematic empty smoke area behind text
- keep character lower in frame
- DO NOT place text too close to top edge
- maintain 10-15% padding from top border
- allow explosion/fire glow behind title for contrast
- text should sit inside cinematic chaos area
- leave dark smoke pockets behind white typography

THUMBNAIL FRAMING RULE:
- move entire composition slightly downward
- explosion area positioned at upper-middle frame
- character occupies lower 45% frame
- headline overlays explosion naturally
- maintain strong separation between character and text
- top section dominated by smoke, fire, and cinematic atmosphere
- composition must feel like movie poster layout
- text hierarchy centered around explosion zone
- ensure mobile readability under 1 second

STYLE: Pixar-like exaggerated realism, clay character, wool environment.
VISUAL: ${data.thumbnailPrompt}`;

  return enforceHardRules(prompt);
}
