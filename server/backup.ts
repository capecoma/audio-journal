import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';

const execAsync = promisify(exec);

interface BackupConfig {
  maxBackups: number;
  backupDir: string;
}

export class DatabaseBackup {
  private config: BackupConfig;

  constructor(config: BackupConfig) {
    this.config = {
      maxBackups: config.maxBackups || 7, // Keep a week's worth of backups by default
      backupDir: config.backupDir || 'backups',
    };
  }

  async createBackup(): Promise<string> {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Create backup directory if it doesn't exist
    await fs.mkdir(this.config.backupDir, { recursive: true });

    const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss');
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join(this.config.backupDir, filename);

    try {
      const databaseUrl = new URL(process.env.DATABASE_URL);
      
      // Extract credentials from DATABASE_URL
      const password = databaseUrl.password;
      const user = databaseUrl.username;
      const host = databaseUrl.hostname;
      const port = databaseUrl.port || '5432'; // Default to 5432 if port is not specified
      const database = databaseUrl.pathname.slice(1); // Remove leading '/'

      if (!port || isNaN(parseInt(port))) {
        throw new Error('Invalid port number in DATABASE_URL');
      }

      // Set environment variables for pg_dump
      const env = {
        PGPASSWORD: password,
        ...process.env,
      };

      // Execute pg_dump
      await execAsync(
        `pg_dump -Fc -U ${user} -h ${host} -p ${port} ${database} > ${filepath}`,
        { env }
      );

      console.log(`Database backup created successfully: ${filename}`);
      
      // Rotate old backups
      await this.rotateBackups();

      return filepath;
    } catch (error) {
      console.error('Error creating database backup:', error);
      throw new Error(`Failed to create database backup: ${error}`);
    }
  }

  private async rotateBackups(): Promise<void> {
    try {
      // List all backup files
      const files = await fs.readdir(this.config.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
        .sort() // Sort by name (which includes timestamp)
        .reverse(); // Most recent first

      // Remove old backups if we have more than maxBackups
      if (backupFiles.length > this.config.maxBackups) {
        const filesToRemove = backupFiles.slice(this.config.maxBackups);
        for (const file of filesToRemove) {
          const filepath = path.join(this.config.backupDir, file);
          await fs.unlink(filepath);
          console.log(`Removed old backup: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error rotating backups:', error);
    }
  }

  async restoreFromBackup(backupPath: string): Promise<void> {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    try {
      const databaseUrl = new URL(process.env.DATABASE_URL);
      
      // Extract credentials from DATABASE_URL
      const password = databaseUrl.password;
      const user = databaseUrl.username;
      const host = databaseUrl.hostname;
      const port = databaseUrl.port || '5432'; // Default to 5432 if port is not specified
      const database = databaseUrl.pathname.slice(1);

      if (!port || isNaN(parseInt(port))) {
        throw new Error('Invalid port number in DATABASE_URL');
      }

      // Set environment variables for pg_restore
      const env = {
        PGPASSWORD: password,
        ...process.env,
      };

      // Execute pg_restore
      await execAsync(
        `pg_restore -c -U ${user} -h ${host} -p ${port} -d ${database} ${backupPath}`,
        { env }
      );

      console.log('Database restored successfully');
    } catch (error) {
      console.error('Error restoring database:', error);
      throw new Error(`Failed to restore database: ${error}`);
    }
  }
}
