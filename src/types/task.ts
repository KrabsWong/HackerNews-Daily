import { ProcessedStory } from './shared';

/**
 * 批次任务元数据
 * 用于跟踪单个批次的处理状态
 */
export interface BatchTask {
  taskId: string;
  batchIndex: number;
  batchSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
}

/**
 * 批次处理结果
 * 包含处理后的 stories 和 subrequest 计数
 */
export interface BatchResult {
  batchIndex: number;
  stories: ProcessedStory[];
  subrequestCount: number;
  error?: string;
}

/**
 * 任务总体元数据
 * 用于协调多个批次的处理
 */
export interface TaskMetadata {
  taskId: string;
  totalBatches: number;
  completedBatches: number;
  createdAt: number;
  status: 'running' | 'completed' | 'failed';
}
