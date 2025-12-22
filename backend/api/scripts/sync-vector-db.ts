#!/usr/bin/env npx tsx
/**
 * Vector Database Sync Script
 *
 * This script synchronizes existing MongoDB evidence documents to the vector database.
 * It should be run:
 * - After initial Pinecone setup to migrate existing data
 * - Periodically to fix any sync issues (failed syncs, orphaned vectors)
 * - After recovering from vector database outages
 *
 * Usage:
 *   npx tsx scripts/sync-vector-db.ts [options]
 *
 * Options:
 *   --dry-run       Preview changes without executing
 *   --force         Re-sync all documents, even if already synced
 *   --project <id>  Sync only a specific project
 *   --batch <size>  Batch size for processing (default: 50)
 *
 * Environment:
 *   MONGODB_URI          MongoDB connection string
 *   PINECONE_API_KEY     Pinecone API key
 *   PINECONE_INDEX_NAME  Pinecone index name
 *   OPENAI_API_KEY       OpenAI API key for embeddings
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force'),
  projectId: args.includes('--project') ? args[args.indexOf('--project') + 1] : null,
  batchSize: args.includes('--batch') ? parseInt(args[args.indexOf('--batch') + 1], 10) : 50,
};

// Statistics
const stats = {
  total: 0,
  synced: 0,
  skipped: 0,
  failed: 0,
  errors: [] as string[],
  startTime: Date.now(),
};

/**
 * Main sync function
 */
async function syncVectorDb(): Promise<void> {
  console.log('\n==============================================');
  console.log('  Vector Database Sync Script');
  console.log('==============================================\n');

  // Check environment
  const requiredEnv = ['MONGODB_URI', 'PINECONE_API_KEY', 'PINECONE_INDEX_NAME', 'OPENAI_API_KEY'];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);

  if (missingEnv.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnv.join(', '));
    console.error('\nPlease set these variables and try again.');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  - Dry run: ${options.dryRun}`);
  console.log(`  - Force re-sync: ${options.force}`);
  console.log(`  - Project filter: ${options.projectId || 'All projects'}`);
  console.log(`  - Batch size: ${options.batchSize}`);
  console.log('');

  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Import services after connection
    const { upsertEvidenceBatch, getVectorStats } = await import('../src/services/vectorStore');
    const { isVectorDbEnabled, checkVectorDbHealth } = await import('../src/config/vectordb');

    // Check vector DB health
    console.log('🔍 Checking vector database health...');
    const health = await checkVectorDbHealth();
    if (!health.healthy) {
      console.error(`❌ Vector database unhealthy: ${health.message}`);
      process.exit(1);
    }
    console.log(`✅ Vector database healthy: ${health.message}\n`);

    // Get current vector stats
    if (!options.dryRun) {
      const vectorStats = await getVectorStats();
      if (vectorStats) {
        console.log(`📊 Current vector DB stats:`);
        console.log(`   - Total vectors: ${vectorStats.totalVectors}`);
        console.log(`   - Dimensions: ${vectorStats.dimension}`);
        console.log('');
      }
    }

    // Build query for evidence to sync
    const Evidence = mongoose.model('Evidence');
    const query: Record<string, unknown> = { isActive: true };

    if (options.projectId) {
      query.project = new mongoose.Types.ObjectId(options.projectId);
    }

    if (!options.force) {
      // Only sync documents that haven't been synced or failed
      query.$or = [
        { 'vectorSync.status': { $ne: 'synced' } },
        { 'vectorSync.status': { $exists: false } },
      ];
    }

    // Count documents to sync
    stats.total = await Evidence.countDocuments(query);
    console.log(`📋 Found ${stats.total} evidence documents to sync\n`);

    if (stats.total === 0) {
      console.log('✅ Nothing to sync. All evidence is up to date.');
      await mongoose.disconnect();
      return;
    }

    // Process in batches
    const cursor = Evidence.find(query).cursor();
    let batch: Array<{
      id: string;
      text: string;
      metadata: {
        evidenceType: string;
        sourceType: string;
        sourceUrl: string;
        sourceTitle: string;
        projectId: string;
        createdAt: string;
        reliabilityScore: number;
        keywords: string[];
      };
    }> = [];
    let processed = 0;

    console.log('🔄 Starting sync...\n');

    for await (const doc of cursor) {
      // Prepare batch item
      batch.push({
        id: doc._id.toString(),
        text: doc.text,
        metadata: {
          evidenceType: doc.type,
          sourceType: doc.source?.type || 'unknown',
          sourceUrl: doc.source?.url || '',
          sourceTitle: doc.source?.title || '',
          projectId: doc.project.toString(),
          createdAt: doc.createdAt.toISOString(),
          reliabilityScore: doc.reliability?.score || 0,
          keywords: doc.keywords || [],
        },
      });

      // Process batch when full
      if (batch.length >= options.batchSize) {
        await processBatch(batch, Evidence, options.dryRun);
        processed += batch.length;
        printProgress(processed, stats.total);
        batch = [];
      }
    }

    // Process remaining items
    if (batch.length > 0) {
      await processBatch(batch, Evidence, options.dryRun);
      processed += batch.length;
      printProgress(processed, stats.total);
    }

    console.log('\n');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n❌ Sync failed: ${errorMsg}`);
    stats.errors.push(errorMsg);
  } finally {
    // Print summary
    printSummary();

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n📦 Disconnected from MongoDB');
  }
}

/**
 * Process a batch of evidence documents
 */
async function processBatch(
  batch: Array<{
    id: string;
    text: string;
    metadata: Record<string, unknown>;
  }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EvidenceModel: any,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    stats.synced += batch.length;
    return;
  }

  try {
    const { upsertEvidenceBatch } = await import('../src/services/vectorStore');

    const result = await upsertEvidenceBatch(batch as Array<{
      id: string;
      text: string;
      metadata: {
        evidenceType: string;
        sourceType: string;
        sourceUrl: string;
        sourceTitle: string;
        projectId: string;
        createdAt: string;
        reliabilityScore: number;
        keywords: string[];
      };
    }>);

    stats.synced += result.success;
    stats.failed += result.failed;

    if (result.errors.length > 0) {
      stats.errors.push(...result.errors);
    }

    // Update sync status in MongoDB for successful items
    if (result.success > 0) {
      const successIds = batch.slice(0, result.success).map((item) => item.id);
      await EvidenceModel.updateMany(
        { _id: { $in: successIds } },
        {
          $set: {
            'vectorSync.syncedAt': new Date(),
            'vectorSync.status': 'synced',
            'vectorSync.error': null,
          },
        }
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    stats.errors.push(`Batch error: ${errorMsg}`);
    stats.failed += batch.length;
  }
}

/**
 * Print progress bar
 */
function printProgress(current: number, total: number): void {
  const percent = Math.round((current / total) * 100);
  const filled = Math.round(percent / 2);
  const empty = 50 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  process.stdout.write(`\r[${bar}] ${percent}% (${current}/${total})`);
}

/**
 * Print final summary
 */
function printSummary(): void {
  const duration = Math.round((Date.now() - stats.startTime) / 1000);

  console.log('\n==============================================');
  console.log('  Sync Summary');
  console.log('==============================================\n');
  console.log(`  Total documents:  ${stats.total}`);
  console.log(`  ✅ Synced:        ${stats.synced}`);
  console.log(`  ⏭️  Skipped:       ${stats.skipped}`);
  console.log(`  ❌ Failed:        ${stats.failed}`);
  console.log(`  ⏱️  Duration:      ${duration}s`);

  if (stats.errors.length > 0) {
    console.log('\n  Errors:');
    const uniqueErrors = [...new Set(stats.errors)];
    uniqueErrors.slice(0, 5).forEach((err) => {
      console.log(`    - ${err.substring(0, 100)}`);
    });
    if (uniqueErrors.length > 5) {
      console.log(`    ... and ${uniqueErrors.length - 5} more errors`);
    }
  }

  console.log('\n==============================================\n');
}

// Run the sync
syncVectorDb().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
