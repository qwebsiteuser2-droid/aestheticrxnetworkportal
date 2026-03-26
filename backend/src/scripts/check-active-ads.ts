import { AppDataSource } from '../db/data-source';
import { VideoAdvertisement, AdvertisementStatus } from '../models/VideoAdvertisement';

async function checkActiveAds() {
  try {
    await AppDataSource.initialize();
    
    console.log('🔍 Checking all active advertisements...\n');

    const now = new Date();
    
    // Get all active ads
    const allActiveAds = await AppDataSource.query(`
      SELECT 
        id, 
        title, 
        selected_area, 
        status, 
        start_date, 
        end_date,
        created_at
      FROM video_advertisements
      WHERE status = $1
      ORDER BY selected_area, created_at
    `, [AdvertisementStatus.ACTIVE]);

    console.log(`📊 Total ACTIVE ads: ${allActiveAds.length}\n`);

    // Group by area
    const adsByArea: { [area: string]: any[] } = {};
    for (const ad of allActiveAds) {
      const area = ad.selected_area || 'UNKNOWN';
      if (!adsByArea[area]) {
        adsByArea[area] = [];
      }
      adsByArea[area].push(ad);
    }

    // Show ads that are in their date range
    console.log('📅 Ads within their date range (currently showing):\n');
    let totalInRange = 0;
    for (const [area, ads] of Object.entries(adsByArea)) {
      const inRange = ads.filter((ad: any) => {
        if (!ad.start_date || !ad.end_date) return false;
        const start = new Date(ad.start_date);
        const end = new Date(ad.end_date);
        return start <= now && end >= now;
      });

      if (inRange.length > 0) {
        console.log(`📍 ${area}: ${inRange.length} ad(s)`);
        inRange.forEach((ad: any, index: number) => {
          const start = new Date(ad.start_date);
          const end = new Date(ad.end_date);
          console.log(`   ${index + 1}. ${ad.title}`);
          console.log(`      ID: ${ad.id}`);
          console.log(`      Dates: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
        });
        console.log('');
        totalInRange += inRange.length;
      }
    }

    if (totalInRange === 0) {
      console.log('   (No ads currently in their date range)\n');
    }

    // Show all active ads grouped by area
    console.log('📋 All ACTIVE ads (regardless of date range):\n');
    for (const [area, ads] of Object.entries(adsByArea)) {
      console.log(`📍 ${area}: ${ads.length} ad(s)`);
      ads.forEach((ad: any, index: number) => {
        const start = ad.start_date ? new Date(ad.start_date) : null;
        const end = ad.end_date ? new Date(ad.end_date) : null;
        const inRange = start && end && start <= now && end >= now;
        console.log(`   ${index + 1}. ${ad.title} ${inRange ? '✅ (in range)' : '⏳ (waiting)'}`);
        if (start && end) {
          console.log(`      Dates: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
        } else {
          console.log(`      Dates: ${start ? start.toLocaleDateString() : 'N/A'} - ${end ? end.toLocaleDateString() : 'N/A'}`);
        }
      });
      console.log('');
    }

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkActiveAds();

