import { checkAndSendAutoEmails } from '../controllers/autoEmailController';
import { advertisementRotationService } from './advertisementRotationService';

class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private adRotationIntervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('Starting schedulers...');
    this.isRunning = true;

    // Check every 5 minutes for auto emails
    this.intervalId = setInterval(async () => {
      try {
        await checkAndSendAutoEmails();
      } catch (error: unknown) {
        console.error('Error in scheduled auto email check:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Check every minute for advertisement rotation (expire old, activate waiting)
    this.adRotationIntervalId = setInterval(async () => {
      try {
        await advertisementRotationService.rotateAdvertisements();
      } catch (error: unknown) {
        console.error('Error in scheduled advertisement rotation:', error);
      }
    }, 60 * 1000); // 1 minute

    console.log('✅ Auto email scheduler started (checking every 5 minutes)');
    console.log('✅ Advertisement rotation scheduler started (checking every 1 minute)');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.adRotationIntervalId) {
      clearInterval(this.adRotationIntervalId);
      this.adRotationIntervalId = null;
    }
    this.isRunning = false;
    console.log('Schedulers stopped');
  }

  isActive() {
    return this.isRunning;
  }

  // Manual trigger for testing
  async triggerCheck() {
    try {
      await checkAndSendAutoEmails();
      return { success: true, message: 'Auto email check completed' };
    } catch (error: unknown) {
      console.error('Error in manual auto email trigger:', error);
      return { success: false, message: 'Failed to trigger auto email check' };
    }
  }
}

export const schedulerService = new SchedulerService();
