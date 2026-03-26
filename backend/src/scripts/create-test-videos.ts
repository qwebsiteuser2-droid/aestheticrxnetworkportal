/**
 * Script to create test video files for advertisements
 * Creates simple 10-second MP4 videos using ffmpeg or base64 encoded videos
 */

import { AppDataSource } from '../db/data-source';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const createTestVideos = async () => {
  try {
    console.log('🔄 Initializing database connection...');
    
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    console.log('✅ Database connected');
    
    // Create test videos directory
    const videosDir = path.join(process.cwd(), 'uploads', 'advertisements', 'videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
      console.log(`✅ Created directory: ${videosDir}`);
    }
    
    // Check if ffmpeg is available
    let ffmpegAvailable = false;
    try {
      await execAsync('which ffmpeg');
      ffmpegAvailable = true;
      console.log('✅ ffmpeg is available');
    } catch {
      console.log('⚠️  ffmpeg not available - will create placeholder files');
    }
    
    // Create test videos
    const testVideos = [
      { name: 'test-video-1.mp4', color: 'blue', text: 'Test Video 1' },
      { name: 'test-video-2.mp4', color: 'green', text: 'Test Video 2' },
      { name: 'test-video-3.mp4', color: 'red', text: 'Test Video 3' },
      { name: 'test-video-4.mp4', color: 'purple', text: 'Test Video 4' },
      { name: 'test-video-5.mp4', color: 'orange', text: 'Test Video 5' }
    ];
    
    if (ffmpegAvailable) {
      console.log('📹 Creating test videos with ffmpeg...');
      for (const video of testVideos) {
        const outputPath = path.join(videosDir, video.name);
        const ffmpegCommand = `ffmpeg -y -f lavfi -i "color=c=${video.color}:s=1280x720:d=10,drawtext=text='${video.text}':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=48:fontcolor=white" -f lavfi -i "sine=frequency=1000:duration=10" -c:a aac -strict experimental "${outputPath}"`;
        
        try {
          await execAsync(ffmpegCommand);
          console.log(`  ✅ Created ${video.name}`);
        } catch (error) {
          console.error(`  ❌ Failed to create ${video.name}:`, error);
        }
      }
    } else {
      console.log('📝 Creating placeholder files (install ffmpeg to generate actual videos)');
      for (const video of testVideos) {
        const outputPath = path.join(videosDir, video.name);
        fs.writeFileSync(outputPath, `# Placeholder for ${video.name}\n# Install ffmpeg and run this script to generate actual videos`);
        console.log(`  ✅ Created placeholder ${video.name}`);
      }
    }
    
    // Update database to use local video URLs
    console.log('\n🔄 Updating database with local video URLs...');
    const videoAds = await AppDataSource.query(`
      SELECT id, title, type, video_url 
      FROM video_advertisements 
      WHERE type = 'video' AND status IN ('approved', 'active')
      LIMIT 10
    `);
    
    let updatedCount = 0;
    for (let i = 0; i < videoAds.length && i < testVideos.length; i++) {
      const ad = videoAds[i];
      if (!ad) continue;
      
      const videoFile = testVideos[i]?.name;
      if (!videoFile) continue;
      
      const localUrl = `/uploads/advertisements/videos/${videoFile}`;
      
      await AppDataSource.query(
        `UPDATE video_advertisements SET video_url = $1 WHERE id = $2`,
        [localUrl, ad.id]
      );
      
      console.log(`  ✅ Updated ${ad.title}: ${localUrl}`);
      updatedCount++;
    }
    
    console.log(`\n✅ Updated ${updatedCount} advertisements with local video URLs`);
    console.log(`📁 Videos saved to: ${videosDir}`);
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: unknown) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
};

createTestVideos();

