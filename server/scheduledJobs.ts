import cron from 'node-cron';
import { runScheduledCleanupJob } from './cleanupJobs';

/**
 * Initialize scheduled jobs
 * 
 * This module sets up cron jobs for automated tasks like weekly cleanup
 */
export function initializeScheduledJobs() {
  console.log('[ScheduledJobs] Initializing scheduled jobs...');

  // Weekly cleanup job - runs every Sunday at 2:00 AM
  // Cron format: second minute hour day month weekday
  // '0 0 2 * * 0' = At 2:00 AM on Sunday
  const weeklyCleanupJob = cron.schedule('0 0 2 * * 0', async () => {
    console.log('[ScheduledJobs] Running weekly cleanup job...');
    try {
      await runScheduledCleanupJob('read_only');
      console.log('[ScheduledJobs] Weekly cleanup job completed successfully');
    } catch (error) {
      console.error('[ScheduledJobs] Weekly cleanup job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/Toronto" // Adjust timezone as needed
  });

  console.log('[ScheduledJobs] Weekly cleanup job scheduled for Sundays at 2:00 AM (America/Toronto)');

  // Optional: Daily integrity check - runs every day at 3:00 AM
  // Uncomment to enable daily checks
  /*
  const dailyIntegrityCheck = cron.schedule('0 0 3 * * *', async () => {
    console.log('[ScheduledJobs] Running daily integrity check...');
    try {
      await runScheduledCleanupJob('read_only');
      console.log('[ScheduledJobs] Daily integrity check completed successfully');
    } catch (error) {
      console.error('[ScheduledJobs] Daily integrity check failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/Toronto"
  });

  console.log('[ScheduledJobs] Daily integrity check scheduled for 3:00 AM (America/Toronto)');
  */

  return {
    weeklyCleanupJob,
    // dailyIntegrityCheck, // Uncomment if enabled
  };
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduledJobs(jobs: ReturnType<typeof initializeScheduledJobs>) {
  console.log('[ScheduledJobs] Stopping scheduled jobs...');
  
  if (jobs.weeklyCleanupJob) {
    jobs.weeklyCleanupJob.stop();
  }
  
  // if (jobs.dailyIntegrityCheck) {
  //   jobs.dailyIntegrityCheck.stop();
  // }

  console.log('[ScheduledJobs] All scheduled jobs stopped');
}
