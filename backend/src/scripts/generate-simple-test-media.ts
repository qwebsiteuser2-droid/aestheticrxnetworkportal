/**
 * Simple test media generator that creates basic test files
 * Works without ffmpeg or ImageMagick
 * 
 * Run with: npx ts-node src/scripts/generate-simple-test-media.ts
 */

import fs from 'fs';
import path from 'path';

// Use writable directory
const getTestMediaDir = (): string => {
  const possibleDirs = [
    path.join(process.cwd(), 'tests', 'test-media'),
    path.join(process.cwd(), 'uploads', 'test-media'),
    path.join(__dirname, '../../../tests/test-media'),
    path.join(__dirname, '../../../uploads/test-media')
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

// Ensure directories exist
const ensureDirExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create simple SVG images
const createSVGImage = (outputPath: string, width: number, height: number, color: string, text: string): void => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#${color}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>`;
  
  fs.writeFileSync(outputPath, svg);
  console.log(`✅ Created SVG: ${path.basename(outputPath)}`);
};

// Create placeholder files with instructions
const createPlaceholderFile = (outputPath: string, type: string, instructions: string): void => {
  const content = `# ${type} Placeholder File

This is a placeholder file for testing purposes.

${instructions}

To use real ${type} files:
1. Replace this file with an actual ${type} file
2. Keep the same filename
3. Ensure the file meets the requirements:
   - Videos: MP4 format, max 20 seconds, max 50MB
   - Animations: GIF format, max 5MB
   - Images: PNG/JPEG format, max 2MB

Generated: ${new Date().toISOString()}
`;
  
  fs.writeFileSync(outputPath, content);
  console.log(`✅ Created placeholder: ${path.basename(outputPath)}`);
};

// Generate test media
const generateTestMedia = () => {
  console.log('🎬 Starting simple test media generation...\n');
  
  ensureDirExists(VIDEO_DIR);
  ensureDirExists(IMAGE_DIR);
  ensureDirExists(ANIMATION_DIR);

  console.log('📁 Creating test media files...\n');

  // Generate SVG images (can be used as placeholders or converted)
  console.log('🖼️  Generating test images (SVG format)...');
  const imageColors = ['0066cc', '28a745', 'dc3545', 'ffc107', '17a2b8', '6f42c1', 'e83e8c', 'fd7e14'];
  const imageTexts = ['Banner Ad 1', 'Banner Ad 2', 'Banner Ad 3', 'Banner Ad 4', 'Banner Ad 5', 'Banner Ad 6', 'Banner Ad 7', 'Banner Ad 8'];
  
  for (let i = 0; i < imageColors.length; i++) {
    createSVGImage(
      path.join(IMAGE_DIR, `test-image-${i + 1}.svg`),
      800,
      400,
      imageColors[i] || '0066cc',
      imageTexts[i] || `Banner Ad ${i + 1}`
    );
  }
  console.log('');

  // Create slides set (10 images for slideshow)
  console.log('📸 Generating slides set (10 images for slideshow)...');
  const slideColors = ['0066cc', '28a745', 'dc3545', 'ffc107', '17a2b8', '6f42c1', 'e83e8c', 'fd7e14', '20c997', '343a40'];
  
  for (let i = 0; i < 10; i++) {
    createSVGImage(
      path.join(IMAGE_DIR, `slide-${i + 1}.svg`),
      800,
      400,
      slideColors[i] || '0066cc',
      `Slide ${i + 1}`
    );
  }
  console.log('');

  // Create placeholder files for videos and animations
  console.log('📹 Creating video placeholders...');
  const videoDurations = [5, 10, 15, 20];
  videoDurations.forEach(duration => {
    createPlaceholderFile(
      path.join(VIDEO_DIR, `test-video-${duration}s.mp4.placeholder`),
      'Video',
      `This should be a ${duration}-second MP4 video file.\nUse ffmpeg or video editing software to create the actual video.`
    );
  });
  console.log('');

  console.log('🎞️  Creating animation placeholders...');
  const animationFrames = [8, 10, 12, 15];
  animationFrames.forEach(frames => {
    createPlaceholderFile(
      path.join(ANIMATION_DIR, `test-animation-${frames}frames.gif.placeholder`),
      'Animation',
      `This should be a GIF animation with ${frames} frames.\nUse ImageMagick or animation software to create the actual GIF.`
    );
  });
  console.log('');

  // Create README with instructions
  const readme = `# Test Media Files

This directory contains test media files for advertisement testing.

## Files Generated

### Images (SVG format)
- \`test-image-*.svg\` - 8 test banner images
- \`slide-*.svg\` - 10 slides for slideshow testing

### Placeholders
- \`videos/*.placeholder\` - Placeholder files for videos
- \`animations/*.placeholder\` - Placeholder files for animations

## Converting SVG to PNG/JPEG

To convert SVG files to PNG or JPEG for testing:

\`\`\`bash
# Using ImageMagick
convert test-image-1.svg test-image-1.png

# Using Inkscape
inkscape test-image-1.svg --export-filename=test-image-1.png

# Using online tools
# Upload SVG to https://cloudconvert.com/svg-to-png
\`\`\`

## Generating Videos

To generate test videos using ffmpeg:

\`\`\`bash
# 5-second video
ffmpeg -f lavfi -i color=c=0066cc:size=800x400:duration=5 -vf "drawtext=text='Test Video 5s':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p test-video-5s.mp4
\`\`\`

## Generating Animations

To generate test GIF animations using ImageMagick:

\`\`\`bash
# Create frames
for i in {0..9}; do
  convert -size 800x400 xc:"hsl(\$((i*36)),70%,50%)" -pointsize 48 -fill white -gravity center -annotate +0+0 "Slide \$((i+1))" frame_\${i}.png
done

# Combine into GIF
convert -delay 10 -loop 0 frame_*.png test-animation.gif
\`\`\`

## Usage

1. **For testing while coding**: Use the SVG images directly or convert them to PNG/JPEG
2. **For user upload testing**: Replace placeholders with actual video/animation files
3. **For slideshow testing**: Use the \`slide-*.svg\` files (convert to PNG/JPEG if needed)

## File Requirements

- **Videos**: MP4 format, max 20 seconds, max 50MB
- **Animations**: GIF format, max 5MB
- **Images**: PNG/JPEG format, max 2MB

Generated: ${new Date().toISOString()}
`;

  fs.writeFileSync(path.join(TEST_MEDIA_DIR, 'README.md'), readme);

  // Create summary
  const summary = {
    generated_at: new Date().toISOString(),
    location: TEST_MEDIA_DIR,
    images: fs.readdirSync(IMAGE_DIR).filter(f => f.endsWith('.svg')),
    slides: fs.readdirSync(IMAGE_DIR).filter(f => f.startsWith('slide-')),
    video_placeholders: fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.placeholder')),
    animation_placeholders: fs.readdirSync(ANIMATION_DIR).filter(f => f.endsWith('.placeholder')),
    note: 'SVG images can be used directly or converted to PNG/JPEG. Placeholder files indicate where actual video/animation files should be placed.'
  };

  fs.writeFileSync(
    path.join(TEST_MEDIA_DIR, 'media-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log('✅ Simple test media generation complete!');
  console.log(`\n📊 Generated:`);
  console.log(`   Images (SVG): ${summary.images.length}`);
  console.log(`   Slides: ${summary.slides.length}`);
  console.log(`   Video placeholders: ${summary.video_placeholders.length}`);
  console.log(`   Animation placeholders: ${summary.animation_placeholders.length}`);
  console.log(`\n📁 Location: ${TEST_MEDIA_DIR}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Convert SVG images to PNG/JPEG if needed`);
  console.log(`   2. Generate actual videos using ffmpeg (see README.md)`);
  console.log(`   3. Generate actual animations using ImageMagick (see README.md)`);
  console.log(`   4. Use these files for testing advertisement uploads`);
};

// Run the script
generateTestMedia();

