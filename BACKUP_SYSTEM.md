# Backup & Recovery System

## Overview

Your BCA application has a **built-in backup system** through the checkpoint feature. Every time you save a checkpoint, the entire project state (code, database schema, configuration) is saved and can be restored at any time.

## How Checkpoints Work as Backups

### What Gets Saved
- All source code files
- Database schema and migrations
- Environment configuration
- Dependencies and package versions
- Project metadata

### When to Create Checkpoints
- After completing major features
- Before making risky changes
- Before deploying to production
- After fixing critical bugs
- At regular intervals (daily/weekly)

## How to Rollback to a Previous Version

### Using the Management UI

1. **Open the Management UI**
   - Click the settings icon in the top-right corner of the chatbox
   - Or click any checkpoint card in the chat history

2. **View Checkpoint History**
   - Navigate to the "Dashboard" panel
   - Scroll down to see all saved checkpoints
   - Each checkpoint shows:
     - Screenshot of the app at that time
     - Timestamp
     - Description of changes
     - Version ID

3. **Rollback to a Checkpoint**
   - Click on any checkpoint (except the latest one)
   - Click the "Rollback" button
   - Confirm the rollback action
   - The system will restore your project to that exact state

### Using the API

You can also rollback programmatically:

```typescript
// In your code or via the assistant
await webdev_rollback_checkpoint({
  version_id: "543b16d4" // The checkpoint version you want to restore
});
```

## Best Practices

### Regular Backups
- Create checkpoints after each major feature
- Create checkpoints before risky operations
- Keep at least 3-5 recent checkpoints

### Naming Checkpoints
- Use descriptive messages that explain what changed
- Include feature names or bug fix descriptions
- Example: "Added project sharing with RBAC permissions"

### Testing After Rollback
- Always test the application after rolling back
- Verify database connectivity
- Check that all features work as expected
- Run the test suite: `pnpm test`

## Recovery Scenarios

### Scenario 1: Bad Code Deployment
**Problem**: You deployed code that breaks the application

**Solution**:
1. Open Management UI → Dashboard
2. Find the last working checkpoint (before the bad deployment)
3. Click "Rollback"
4. Test the application
5. Fix the issue in a new branch before redeploying

### Scenario 2: Database Migration Failure
**Problem**: A database migration failed and corrupted data

**Solution**:
1. Rollback to the checkpoint before the migration
2. Review the migration script
3. Fix the migration
4. Test in development
5. Create a new checkpoint
6. Run the migration again

### Scenario 3: Lost Work
**Problem**: You accidentally deleted important code

**Solution**:
1. Find the checkpoint that contains the lost work
2. Rollback to that checkpoint
3. Copy the code you need
4. Return to the latest checkpoint
5. Paste the recovered code

### Scenario 4: Testing a Risky Change
**Problem**: You want to test a major refactor without risk

**Solution**:
1. Create a checkpoint before starting: "Before refactor"
2. Make your changes
3. Test thoroughly
4. If it works: Create a new checkpoint: "After refactor"
5. If it fails: Rollback to "Before refactor"

## Checkpoint Metadata

Each checkpoint stores:
- **Version ID**: Unique identifier (e.g., `543b16d4`)
- **Timestamp**: When the checkpoint was created
- **Description**: What changed in this version
- **Screenshot**: Visual snapshot of the app
- **File Tree**: Complete list of all files
- **Database Schema**: Current database structure

## Limitations

### What Checkpoints DON'T Save
- Production database data (only schema)
- User-uploaded files in S3 (only references)
- Environment secrets (must be reconfigured)
- External service states

### Checkpoint Retention
- Checkpoints are stored indefinitely
- You can delete old checkpoints manually
- Recommended: Keep at least 10 recent checkpoints

## Emergency Recovery

If the project directory is completely lost or corrupted:

1. **Automatic Recovery**
   - The system will detect the missing directory
   - Automatically rollback to the latest checkpoint
   - Restore all files and configuration

2. **Manual Recovery**
   - Contact support at https://help.manus.im
   - Provide your project ID: `XnmtZZwX6e46H8JVZbq4Ta`
   - Support can restore from any checkpoint

## Monitoring Checkpoint Health

### Check Current Version
```bash
# View current project version
cat /home/ubuntu/bca-app/.version
```

### List All Checkpoints
- Open Management UI → Dashboard
- View checkpoint history
- Each checkpoint shows size and status

### Verify Checkpoint Integrity
- Click on a checkpoint to view details
- Check the screenshot matches expected state
- Review the file list for completeness

## Additional Backup Options

### Database Backups
The application also has a database backup system:

```typescript
// Trigger manual database backup
await db.createBackup();

// List all backups
const backups = await db.listBackups();

// Restore from backup
await db.restoreBackup(backupId);
```

### Export Project Data
You can export all project data as JSON:

```typescript
// Export all projects
const data = await trpc.projects.exportAll.query();

// Save to file
fs.writeFileSync('backup.json', JSON.stringify(data));
```

## Support

For backup and recovery assistance:
- Documentation: This file
- Support: https://help.manus.im
- Emergency: Contact Manus support team

## Summary

✅ **Checkpoints are your primary backup system**
✅ **Create checkpoints regularly**
✅ **Rollback is safe and reversible**
✅ **Test after every rollback**
✅ **Keep multiple checkpoint versions**

Your data is safe with the checkpoint system!
