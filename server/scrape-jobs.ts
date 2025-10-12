import { randomUUID } from "crypto";

// In-memory job tracking for async scraping
export type ScrapeJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ScrapeJob {
  id: string;
  status: ScrapeJobStatus;
  startedAt: Date;
  completedAt?: Date;
  progress: {
    totalPosts: number;
    processedPosts: number;
    createdArticles: number;
    skippedNotNews: number;
  };
  error?: string;
}

class ScrapeJobManager {
  private jobs: Map<string, ScrapeJob> = new Map();
  
  createJob(): ScrapeJob {
    const id = randomUUID();
    const job: ScrapeJob = {
      id,
      status: 'pending',
      startedAt: new Date(),
      progress: {
        totalPosts: 0,
        processedPosts: 0,
        createdArticles: 0,
        skippedNotNews: 0,
      },
    };
    
    this.jobs.set(id, job);
    
    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      this.jobs.delete(id);
    }, 5 * 60 * 1000);
    
    return job;
  }
  
  getJob(id: string): ScrapeJob | undefined {
    return this.jobs.get(id);
  }
  
  updateJob(id: string, updates: Partial<ScrapeJob>): void {
    const job = this.jobs.get(id);
    if (job) {
      Object.assign(job, updates);
    }
  }
  
  updateProgress(id: string, progress: Partial<ScrapeJob['progress']>): void {
    const job = this.jobs.get(id);
    if (job) {
      Object.assign(job.progress, progress);
    }
  }
  
  markCompleted(id: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'completed';
      job.completedAt = new Date();
    }
  }
  
  markFailed(id: string, error: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'failed';
      job.error = error;
      job.completedAt = new Date();
    }
  }
}

export const scrapeJobManager = new ScrapeJobManager();
