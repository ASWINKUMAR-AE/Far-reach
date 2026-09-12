import cron from 'node-cron';
import Parser from 'rss-parser';
import crypto from 'crypto';
import { prisma, io } from '../server';

const parser = new Parser();

// Normalize text for duplicate detection
function hashContent(title: string, summary: string): string {
  const normalized = (title + summary).toLowerCase().replace(/[^a-z0-9]/g, '');
  return crypto.createHash('md5').update(normalized).digest('hex');
}

// Ingestion Logic
export async function syncNewsSources() {
  console.log('[Ingestion] Starting scheduled news sync...');
  
  try {
    const sources = await prisma.newsSource.findMany({
      where: { is_active: true, type: 'RSS' }
    });

    for (const source of sources) {
      if (!source.rss_url) continue;

      try {
        const feed = await parser.parseURL(source.rss_url);
        let newItemsAdded = 0;

        for (const item of feed.items) {
          const title = item.title || 'Untitled';
          const summary = item.contentSnippet || item.content || '';
          const url = item.link || source.url || '';
          
          const content_hash = hashContent(title, summary);

          // Check for duplicate
          const existing = await prisma.news.findUnique({
            where: { content_hash }
          });

          if (!existing) {
            // Determine category and priority (simple keyword based for now)
            let category = "AGRICULTURE_NEWS";
            let priority = "LOW";
            
            const lowerTitle = title.toLowerCase();
            if (lowerTitle.includes('procurement') || lowerTitle.includes('mandi')) {
              category = "PROCUREMENT";
              priority = "HIGH";
            } else if (lowerTitle.includes('scheme') || lowerTitle.includes('subsidy')) {
              category = "GOVERNMENT_SCHEME";
              priority = "MEDIUM";
            } else if (lowerTitle.includes('weather') || lowerTitle.includes('rain')) {
              category = "WEATHER";
              priority = "CRITICAL";
            }

            const newsItem = await prisma.news.create({
              data: {
                title,
                summary: summary.substring(0, 500),
                content: item.content || '',
                category,
                priority,
                source_name: source.name,
                source_url: url,
                published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
                is_verified: source.trust_level === 'OFFICIAL' || source.trust_level === 'GOVERNMENT',
                verification_method: 'OFFICIAL_RSS',
                verified_at: new Date(),
                verified_by: 'SYSTEM',
                content_hash,
              }
            });
            
            // If it's highly important, emit a live update
            if (priority === 'HIGH' || priority === 'CRITICAL') {
               io.emit('NEW_UPDATE', newsItem);
            }
            
            newItemsAdded++;
          }
        }
        
        await prisma.newsSource.update({
          where: { id: source.id },
          data: { last_sync: new Date(), last_error: null }
        });
        
        console.log(`[Ingestion] Synced ${source.name} - Added ${newItemsAdded} items.`);
        
      } catch (err: any) {
        console.error(`[Ingestion] Failed to sync ${source.name}:`, err.message);
        await prisma.newsSource.update({
          where: { id: source.id },
          data: { last_error: err.message }
        });
      }
    }
  } catch (error) {
    console.error('[Ingestion] Database error during sync:', error);
  }
}

// Scheduled Cron Jobs
export function startIngestionScheduler() {
  // Sync every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    syncNewsSources();
  });

  // Clean up expired news every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await prisma.news.updateMany({
        where: {
          expires_at: { lt: new Date() },
          is_active: true
        },
        data: { is_active: false }
      });
      console.log('[Ingestion] Expired news deactivated.');
    } catch (e) {
      console.error('[Ingestion] Error expiring news:', e);
    }
  });
  
  console.log('[Ingestion] Scheduler started.');
}
