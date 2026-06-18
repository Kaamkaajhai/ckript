# Backup and Restore Guide

This project now supports one-command backups for both:
- Code (Git bundle + working tree snapshot)
- MongoDB database (mongodump)

## Prerequisites

- Node.js installed.
- Git installed and available in PATH
- MongoDB Database Tools installed and available in PATH:
  - `mongodump`
  - `mongorestore`

## Backup Commands

Run from project root.

- Full backup (code + database):
  - `npm run backup`
- Only code backup:
  - `npm run backup:code`
- Only database backup:
  - `npm run backup:db`

Backups are stored in:
- `backups/YYYYMMDD-HHMMSS/`

## Restore Commands

- Restore latest database backup:
  - `npm run restore:db`
- Restore database from a specific backup folder:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/restore-db.ps1 -BackupPath "./backups/YYYYMMDD-HHMMSS"`

- Extract latest code backup into `restored/`:
  - `npm run restore:code`
- Extract code from a specific backup folder:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/restore-code.ps1 -BackupPath "./backups/YYYYMMDD-HHMMSS"`

## Recommended Safety Workflow

Before risky changes:
1. `npm run backup`
2. Make your code/database changes
3. If anything breaks, use restore commands above

## Optional Automation on Windows Task Scheduler

Create a scheduled task to run daily:

1. Open Task Scheduler -> Create Task
2. Trigger: Daily (or your preferred schedule)
3. Action:
   - Program/script: `powershell`
   - Add arguments:
     - `-NoProfile -ExecutionPolicy Bypass -Command "Set-Location 'C:\Users\yashc\OneDrive\Desktop\scriptbridge'; npm run backup"`

This gives you continuous backups even when you forget.