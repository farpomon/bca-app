# BCA App Backup & Restore Guide

## Overview

Your BCA app includes a comprehensive backup system that automatically creates encrypted backups of all your assessment data, photos, projects, and settings. This guide explains how to set up automatic daily backups and retrieve them when needed.

## Accessing the Backup System

1. **Log in as Admin** - Only users with admin role can access backup features
2. **Navigate to Admin Panel** - Click on "Administration" in the main navigation
3. **Open Backup & Restore Tab** - Click on the "Backup & Restore" tab (Database icon)

## Setting Up Automatic Daily Backups

### Step 1: Create a Backup Schedule

1. In the Backup & Restore tab, click on the **"Schedules"** sub-tab
2. Click the **"Create Schedule"** button
3. Fill in the schedule details:
   - **Name**: "Daily Automatic Backup" (or your preferred name)
   - **Description**: "Automated daily backup at 3:00 AM"
   - **Schedule Time**: 
     - Hour: 3 (3:00 AM - recommended for minimal disruption)
     - Minute: 0
   - **Retention Days**: 30 (keeps backups for 30 days before auto-deletion)
   - **Enable Encryption**: ✓ (recommended for security)
4. Click **"Create Schedule"**

### Step 2: Verify Schedule is Active

- The schedule will appear in the Schedules list with a green "Enabled" badge
- **Next Run Time** shows when the next backup will execute
- **Last Run Status** will update after each backup completes

### Schedule Details

- **Frequency**: Daily at the specified time (e.g., 3:00 AM)
- **Automatic Cleanup**: Old backups are automatically deleted after the retention period
- **Encryption**: Backups are encrypted using AES-256-GCM for security
- **Storage**: Backups are stored in secure S3-compatible cloud storage

## Retrieving Backups

### Method 1: View Available Backups

1. Go to **Admin Panel → Backup & Restore → Backups** tab
2. You'll see a list of all available backups with:
   - **Creation Date/Time**
   - **Size** (in MB/GB)
   - **Record Count** (number of records backed up)
   - **Status** (completed, in progress, failed)
   - **Encryption Status** (encrypted/unencrypted)

### Method 2: Download a Backup

1. In the Backups list, find the backup you want to download
2. Click the **"Download"** button (↓ icon) next to the backup
3. The encrypted backup file will download to your computer
4. **Save this file** to your Dropbox, Google Drive, or external storage

**File Format**: `.json.enc` (encrypted JSON) or `.json` (unencrypted)

### Method 3: Restore from Backup

**⚠️ WARNING: Restoring will replace current data. Create a backup first!**

1. In the Backups list, find the backup you want to restore
2. Click the **"Restore"** button next to the backup
3. Choose restore options:
   - **Clear Existing Data**: ✓ (recommended - replaces all data)
   - **Merge with Existing**: ☐ (advanced - may cause duplicates)
4. Confirm the restore operation
5. Wait for the restore to complete (progress bar will show status)
6. **Refresh the page** after restore completes

### Method 4: Restore from Downloaded File

If you have a backup file saved to Dropbox/Google Drive:

1. Download the backup file to your computer
2. Go to **Admin Panel → Backup & Restore → Backups** tab
3. Click **"Upload & Restore"** button
4. Select the backup file from your computer
5. Choose restore options (same as Method 3)
6. Confirm and wait for restore to complete

## Backup to Dropbox/Google Drive

While the app stores backups in secure cloud storage, you can create an additional backup layer:

### Manual Backup to Cloud Storage

1. **Download backups regularly** using the Download button
2. **Upload to Dropbox/Google Drive** manually
3. **Organize by date** (e.g., `BCA_Backups/2026-01-24/`)

### Recommended Schedule

- **Daily**: Download the latest automated backup
- **Weekly**: Verify backup integrity by checking file size
- **Monthly**: Test restore process in a test environment

## Backup Best Practices

### Security

- ✓ Always enable encryption for backups
- ✓ Store downloaded backups in secure cloud storage (Dropbox/Drive)
- ✓ Never share backup files publicly (they contain sensitive data)
- ✓ Use strong passwords for your Dropbox/Google Drive accounts

### Retention

- ✓ Keep at least 30 days of backups
- ✓ Store monthly backups for 1 year
- ✓ Archive critical project backups permanently

### Testing

- ✓ Test restore process quarterly
- ✓ Verify backup file integrity monthly
- ✓ Document restore procedures for your team

## Monitoring Backups

### Check Backup Status

1. Go to **Admin Panel → Backup & Restore**
2. View **Backup Statistics** card:
   - Total Backups
   - Total Size
   - Last Backup Date
   - Success Rate

### Schedule Statistics

1. Click on **Schedules** tab
2. View schedule performance:
   - Total Runs
   - Successful Runs
   - Failed Runs
   - Average Duration

### Troubleshooting

**Backup Failed**
- Check database connection
- Verify sufficient storage space
- Review error logs in the backup details

**Restore Failed**
- Ensure backup file is not corrupted
- Verify you have admin permissions
- Check database is accessible

**Schedule Not Running**
- Verify schedule is enabled
- Check Next Run Time is in the future
- Ensure server time is correct

## Emergency Recovery

If you need to recover data after a critical failure:

1. **Identify the most recent good backup** (before the failure)
2. **Download the backup file** (if not already saved externally)
3. **Restore from backup** using Method 3 or 4 above
4. **Verify data integrity** after restore
5. **Create a new backup** immediately after successful restore

## Support

If you encounter issues with backups:

1. Check the backup logs in the Admin Panel
2. Verify your admin permissions
3. Contact support at https://help.manus.im with:
   - Backup ID
   - Error message
   - Timestamp of the issue

---

**Last Updated**: January 2026
**Version**: 1.0
