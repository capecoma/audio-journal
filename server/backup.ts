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
      maxBackups: config.maxBackups || 7,
      backupDir: config.backupDir || 'backups',
    };
  }

  async createBackup(): Promise<string> {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    try {
      // Create backup directory if it doesn't exist
      await fs.mkdir(this.config.backupDir, { recursive: true });

      const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss');
      const filename = `backup-${timestamp}.sql`;
      const filepath = path.join(this.config.backupDir, filename);

      // Parse database URL
      const url = new URL(process.env.DATABASE_URL);
      const config = {
        host: url.hostname,
        port: url.port || '5432',
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
      };

      // For Neon database, we need to handle special connection parameters
      const sslMode = url.searchParams.get('sslmode') || 'require';
      
      // Construct pg_dump command with proper escaping and format
      const command = `PGPASSWORD=${config.password} PGSSLMODE=${sslMode} pg_dump -Fc -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -f ${filepath} --verbose --no-owner --no-acl`;

      console.log('Starting database backup...');
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.warn('pg_dump warnings:', stderr);
      }

      console.log(`Database backup created successfully: ${filename}`);
      
      // Rotate old backups
      await this.rotateBackups();

      return filepath;
    } catch (error: any) {
      const errorMessage = error.stderr || error.message;
      console.error('Error creating database backup:', errorMessage);
      throw new Error(`Failed to create database backup: ${errorMessage}`);
    }
  }

  private async rotateBackups(): Promise<void> {
    try {
      // List all backup files
      const files = await fs.readdir(this.config.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
        .sort()
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
      const url = new URL(process.env.DATABASE_URL);
      const config = {
        host: url.hostname,
        port: url.port || '5432',
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
      };

      const sslMode = url.searchParams.get('sslmode') || 'require';

      // Construct pg_restore command with proper environment variables
      const command = `PGPASSWORD=${config.password} PGSSLMODE=${sslMode} pg_restore -Fc -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} --verbose --clean --no-owner --no-acl ${backupPath}`;

      console.log('Starting database restore...');
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.warn('pg_restore warnings:', stderr);
      }

      console.log('Database restored successfully');
    } catch (error: any) {
      const errorMessage = error.stderr || error.message;
      console.error('Error restoring database:', errorMessage);
      throw new Error(`Failed to restore database: ${errorMessage}`);
    }
  }
}
