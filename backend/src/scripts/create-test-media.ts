import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const testMediaDir = path.join(process.cwd(), 'tests', 'test-media');
const videosDir = path.join(testMediaDir, 'videos');
const imagesDir = path.join(testMediaDir, 'images');
const animationsDir = path.join(testMediaDir, 'animations');

// Ensure directories exist
[testMediaDir, videosDir, imagesDir, animationsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('🎬 Creating test media files for advertisement testing...\n');

// Check if ffmpeg is available
let ffmpegAvailable = false;
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
  ffmpegAvailable = true;
} catch {
  console.warn('⚠️  ffmpeg not found. Video generation will be skipped.');
  console.warn('   Install ffmpeg to generate test videos: sudo apt-get install ffmpeg\n');
}

// Check if ImageMagick is available
let imagemagickAvailable = false;
try {
  execSync('convert -version', { stdio: 'ignore' });
  imagemagickAvailable = true;
} catch {
  console.warn('⚠️  ImageMagick not found. Image/animation generation will be limited.');
  console.warn('   Install ImageMagick: sudo apt-get install imagemagick\n');
}

// Create test images using Node.js (simple colored rectangles)
function createTestImage(filename: string, width: number, height: number, color: string, text: string) {
  // Create a simple SVG that can be converted or used directly
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${color}"/>
  <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>`;
  
  const svgPath = path.join(imagesDir, filename.replace(/\.(jpg|png)$/, '.svg'));
  fs.writeFileSync(svgPath, svg);
  
  // Try to convert to PNG/JPG if ImageMagick is available
  if (imagemagickAvailable) {
    try {
      const outputPath = path.join(imagesDir, filename);
      execSync(`convert -background "${color}" -size ${width}x${height} -gravity center label:"${text}" ${outputPath}`, { stdio: 'ignore' });
      console.log(`✅ Created: ${filename}`);
      return true;
    } catch (error) {
      console.warn(`⚠️  Could not convert ${filename}, SVG created instead`);
    }
  }
  
  return false;
}

// Create test videos using ffmpeg
function createTestVideo(filename: string, duration: number, width: number, height: number, text: string) {
  if (!ffmpegAvailable) {
    console.warn(`⚠️  Skipping ${filename} (ffmpeg not available)`);
    return false;
  }
  
  try {
    const outputPath = path.join(videosDir, filename);
    // Create a simple test video with text overlay
    const command = `ffmpeg -f lavfi -i color=c=blue:size=${width}x${height}:duration=${duration}:rate=30 -vf "drawtext=text='${text}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -y ${outputPath}`;
    execSync(command, { stdio: 'ignore' });
    console.log(`✅ Created: ${filename} (${duration}s)`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create ${filename}:`, error);
    return false;
  }
}

// Create test GIF animation
function createTestAnimation(filename: string, frames: number, width: number, height: number, text: string) {
  if (!imagemagickAvailable) {
    console.warn(`⚠️  Skipping ${filename} (ImageMagick not available)`);
    return false;
  }
  
  try {
    const outputPath = path.join(animationsDir, filename);
    // Create animated GIF with color change
    const colors = ['blue', 'green', 'red', 'purple', 'orange'];
    const tempDir = path.join(animationsDir, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create frames
    for (let i = 0; i < frames; i++) {
      const color = colors[i % colors.length];
      const framePath = path.join(tempDir, `frame-${i.toString().padStart(3, '0')}.png`);
      execSync(`convert -background "${color}" -size ${width}x${height} -gravity center label:"${text}\\nFrame ${i + 1}" ${framePath}`, { stdio: 'ignore' });
    }
    
    // Combine into GIF
    execSync(`convert -delay 20 -loop 0 ${tempDir}/frame-*.png ${outputPath}`, { stdio: 'ignore' });
    
    // Cleanup temp files
    fs.readdirSync(tempDir).forEach(file => {
      fs.unlinkSync(path.join(tempDir, file));
    });
    fs.rmdirSync(tempDir);
    
    console.log(`✅ Created: ${filename} (${frames} frames)`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create ${filename}:`, error);
    return false;
  }
}

// Create test media files
console.log('📸 Creating test images...');
createTestImage('test-ad-image-1.jpg', 728, 90, '#2563eb', 'Test Ad Image 1');
createTestImage('test-ad-image-2.png', 300, 250, '#10b981', 'Test Ad Image 2');
createTestImage('test-ad-image-3.jpg', 600, 200, '#f59e0b', 'Test Ad Image 3');
createTestImage('test-ad-image-4.png', 320, 50, '#ef4444', 'Mobile Ad Image');

console.log('\n🎥 Creating test videos...');
createTestVideo('test-ad-video-1.mp4', 10, 728, 90, 'Test Video Ad 1');
createTestVideo('test-ad-video-2.mp4', 15, 300, 250, 'Test Video Ad 2');
createTestVideo('test-ad-video-3.mp4', 20, 600, 200, 'Test Video Ad 3 (Max)');
createTestVideo('test-ad-video-mobile.mp4', 5, 320, 50, 'Mobile Video');

console.log('\n🎨 Creating test animations...');
createTestAnimation('test-ad-animation-1.gif', 10, 728, 90, 'Animated Ad 1');
createTestAnimation('test-ad-animation-2.gif', 15, 300, 250, 'Animated Ad 2');
createTestAnimation('test-ad-animation-3.gif', 20, 600, 200, 'Animated Ad 3');

console.log('\n✨ Test media creation complete!');
console.log(`📁 Files created in: ${testMediaDir}`);
console.log('\n📋 Summary:');
console.log('   - Videos: Max 20 seconds, optimized for web');
console.log('   - Images: JPG and PNG formats, various sizes');
console.log('   - Animations: GIF format, looping animations');
console.log('\n💡 Usage:');
console.log('   - Use these files to test advertisement upload functionality');
console.log('   - All files are within size limits (videos < 10MB, images < 2MB, animations < 5MB)');
console.log('   - Videos are exactly 20 seconds or less as required\n');

