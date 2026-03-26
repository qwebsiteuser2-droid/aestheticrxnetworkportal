/**
 * Generate proper test videos with audio and animations
 * Requires: ffmpeg (for videos) and ImageMagick (for animations)
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get writable directory
const getTestMediaDir = (): string => {
  const possibleDirs = [
    path.join(process.cwd(), 'uploads', 'test-media'),
    path.join(process.cwd(), 'tests', 'test-media'),
    path.join(__dirname, '../../../uploads/test-media'),
    path.join(__dirname, '../../../tests/test-media')
  ];
  
  for (const dir of possibleDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const testFile = path.join(dir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return dir;
    } catch {
      continue;
    }
  }
  
  const fallback = path.join(process.cwd(), 'test-media');
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
};

const TEST_MEDIA_DIR = getTestMediaDir();
const VIDEO_DIR = path.join(TEST_MEDIA_DIR, 'videos');
const IMAGE_DIR = path.join(TEST_MEDIA_DIR, 'images');
const ANIMATION_DIR = path.join(TEST_MEDIA_DIR, 'animations');

const ensureDirExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Check if ffmpeg is available
const checkFFmpeg = async (): Promise<boolean> => {
  try {
    await execAsync('which ffmpeg');
    return true;
  } catch {
    return false;
  }
};

// Check if ImageMagick is available
const checkImageMagick = async (): Promise<boolean> => {
  try {
    await execAsync('which convert');
    return true;
  } catch {
    return false;
  }
};

// Generate test video with audio
const createVideoWithAudio = async (
  outputPath: string,
  duration: number,
  width: number = 800,
  height: number = 400,
  color: string = '0066cc',
  text: string = 'Test Video'
): Promise<void> => {
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    console.warn('⚠️  ffmpeg not available, skipping video generation');
    return;
  }

  try {
    // Create a video with colored background, text, and audio tone
    // Generate a simple audio tone (440Hz sine wave)
    const audioFile = path.join(TEST_MEDIA_DIR, 'temp_audio.wav');
    const audioCommand = `ffmpeg -f lavfi -i "sine=frequency=440:duration=${duration}" -y "${audioFile}"`;
    await execAsync(audioCommand);

    // Create video with text overlay
    const videoCommand = `ffmpeg -f lavfi -i color=c=${color}:size=${width}x${height}:duration=${duration} -vf "drawtext=text='${text}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -i "${audioFile}" -c:a aac -b:a 128k -shortest -y "${outputPath}"`;
    await execAsync(videoCommand);

    // Cleanup temp audio file
    try {
      fs.unlinkSync(audioFile);
    } catch {}

    console.log(`✅ Created video with audio: ${path.basename(outputPath)} (${duration}s)`);
  } catch (error: unknown) {
    console.error(`❌ Error creating video ${outputPath}:`, error instanceof Error ? error.message : error);
  }
};

// Generate proper animation (GIF) with color transitions
const createAnimation = async (
  outputPath: string,
  frames: number = 10,
  width: number = 800,
  height: number = 400
): Promise<void> => {
  const hasImageMagick = await checkImageMagick();
  if (!hasImageMagick) {
    console.warn('⚠️  ImageMagick not available, skipping animation generation');
    return;
  }

  try {
    const tempDir = path.join(TEST_MEDIA_DIR, 'temp');
    ensureDirExists(tempDir);
    
    const frameFiles: string[] = [];
    const colors = ['0066cc', '28a745', 'dc3545', 'ffc107', '17a2b8', '6f42c1', 'e83e8c', 'fd7e14', '20c997', '343a40'];
    
    for (let i = 0; i < frames; i++) {
      const frameFile = path.join(tempDir, `frame_${i.toString().padStart(3, '0')}.png`);
      const color = colors[i % colors.length];
      const hue = (i * 360 / frames) % 360;
      const baseColor = `hsl(${hue},70%,50%)`;
      const command = `convert -size ${width}x${height} xc:"${baseColor}" -pointsize 48 -fill white -gravity center -annotate +0+0 "Slide ${i + 1}" "${frameFile}"`;
      await execAsync(command);
      frameFiles.push(frameFile);
    }
    
    const escapedFrameFiles = frameFiles.map(f => `"${f}"`).join(' ');
    const command = `convert -delay 10 -loop 0 ${escapedFrameFiles} "${outputPath}"`;
    await execAsync(command);
    
    // Cleanup
    frameFiles.forEach(file => {
      try {
        fs.unlinkSync(file);
      } catch {}
    });
    try {
      fs.rmdirSync(tempDir);
    } catch {}
    
    console.log(`✅ Created animation: ${path.basename(outputPath)} (${frames} frames)`);
  } catch (error: unknown) {
    console.error(`❌ Error creating animation ${outputPath}:`, error instanceof Error ? error.message : error);
  }
};

// Generate proper image
const createImage = async (
  outputPath: string,
  width: number = 800,
  height: number = 400,
  color: string = '0066cc',
  text: string = 'Test Image'
): Promise<void> => {
  const hasImageMagick = await checkImageMagick();
  if (!hasImageMagick) {
    console.warn('⚠️  ImageMagick not available, skipping image generation');
    return;
  }

  try {
    const command = `convert -size ${width}x${height} xc:"#${color}" -pointsize 48 -fill white -gravity center -annotate +0+0 "${text}" "${outputPath}"`;
    await execAsync(command);
    console.log(`✅ Created image: ${path.basename(outputPath)}`);
  } catch (error: unknown) {
    console.error(`❌ Error creating image ${outputPath}:`, error instanceof Error ? error.message : error);
  }
};

// Main generation function
const generateTestMedia = async () => {
  console.log('🎬 Generating proper test media (videos with audio, animations, images)...\n');
  
  ensureDirExists(VIDEO_DIR);
  ensureDirExists(IMAGE_DIR);
  ensureDirExists(ANIMATION_DIR);

  const hasFFmpeg = await checkFFmpeg();
  const hasImageMagick = await checkImageMagick();

  if (!hasFFmpeg && !hasImageMagick) {
    console.error('❌ Neither ffmpeg nor ImageMagick is available.');
    console.log('\nInstallation:');
    console.log('  Ubuntu/Debian: sudo apt-get install ffmpeg imagemagick');
    console.log('  macOS: brew install ffmpeg imagemagick');
    process.exit(1);
  }

  console.log('📁 Creating test media files...\n');

  // Generate videos with audio (5s, 10s, 15s, 20s)
  if (hasFFmpeg) {
    console.log('📹 Generating videos with audio...');
    const videoDurations = [5, 10, 15, 20];
    const videoColors = ['0066cc', '28a745', 'dc3545', 'ffc107'];
    const videoTexts = ['Test Video 5s', 'Test Video 10s', 'Test Video 15s', 'Test Video 20s'];
    
    for (let i = 0; i < videoDurations.length; i++) {
      const duration = videoDurations[i] || 10;
      const color = videoColors[i % videoColors.length] || '0066cc';
      const text = videoTexts[i] || `Test Video ${duration}s`;
      await createVideoWithAudio(
        path.join(VIDEO_DIR, `test-video-${duration}s.mp4`),
        duration,
        800,
        400,
        color,
        text
      );
    }
    console.log('');
  }

  // Generate animations
  if (hasImageMagick) {
    console.log('🎞️  Generating animations...');
    const animationFrames = [8, 10, 12, 15];
    
    for (let i = 0; i < animationFrames.length; i++) {
      const frames = animationFrames[i] || 10;
      await createAnimation(
        path.join(ANIMATION_DIR, `test-animation-${frames}frames.gif`),
        frames,
        800,
        400
      );
    }
    console.log('');
  }

  // Generate images
  if (hasImageMagick) {
    console.log('🖼️  Generating images...');
    const imageColors = ['0066cc', '28a745', 'dc3545', 'ffc107', '17a2b8', '6f42c1', 'e83e8c', 'fd7e14'];
    const imageTexts = ['Banner Ad 1', 'Banner Ad 2', 'Banner Ad 3', 'Banner Ad 4', 'Banner Ad 5', 'Banner Ad 6', 'Banner Ad 7', 'Banner Ad 8'];
    
    for (let i = 0; i < imageColors.length; i++) {
      await createImage(
        path.join(IMAGE_DIR, `test-image-${i + 1}.png`),
        800,
        400,
        imageColors[i] || '0066cc',
        imageTexts[i] || `Banner Ad ${i + 1}`
      );
    }
    console.log('');

    // Generate slides set (10 images for slideshow)
    console.log('📸 Generating slides set (10 images)...');
    const slideColors = ['0066cc', '28a745', 'dc3545', 'ffc107', '17a2b8', '6f42c1', 'e83e8c', 'fd7e14', '20c997', '343a40'];
    
    for (let i = 0; i < 10; i++) {
      await createImage(
        path.join(IMAGE_DIR, `slide-${i + 1}.png`),
        800,
        400,
        slideColors[i] || '0066cc',
        `Slide ${i + 1}`
      );
    }
    console.log('');
  }

  // Create summary
  const summary = {
    generated_at: new Date().toISOString(),
    location: TEST_MEDIA_DIR,
    videos: hasFFmpeg ? fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.mp4')) : [],
    animations: hasImageMagick ? fs.readdirSync(ANIMATION_DIR).filter(f => f.endsWith('.gif')) : [],
    images: hasImageMagick ? fs.readdirSync(IMAGE_DIR).filter(f => f.endsWith('.png') || f.endsWith('.jpg')) : [],
    slides: hasImageMagick ? fs.readdirSync(IMAGE_DIR).filter(f => f.startsWith('slide-')) : []
  };

  fs.writeFileSync(
    path.join(TEST_MEDIA_DIR, 'media-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log('✅ Test media generation complete!');
  console.log(`\n📊 Generated:`);
  console.log(`   Videos (with audio): ${summary.videos.length}`);
  console.log(`   Animations: ${summary.animations.length}`);
  console.log(`   Images: ${summary.images.length}`);
  console.log(`   Slides: ${summary.slides.length}`);
  console.log(`\n📁 Location: ${TEST_MEDIA_DIR}`);
};

// Run
generateTestMedia().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

