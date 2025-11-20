import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
config();

const REPLIT_DB_URL = process.env.REPLIT_DATABASE_URL;
const NEON_DB_URL = process.env.NEON_DATABASE_URL;

if (!REPLIT_DB_URL || !NEON_DB_URL) {
  console.error('❌ Missing database URLs. Please set REPLIT_DATABASE_URL and NEON_DATABASE_URL in .env');
  process.exit(1);
}

const replitDb = neon(REPLIT_DB_URL);
const neonDb = neon(NEON_DB_URL);

async function migrateData() {
  try {
    console.log('🚀 Starting migration from Replit to Neon...\n');

    // Migrate articles from last 24 hours only
    console.log('📰 Migrating articles from last 24 hours...');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const articles = await replitDb`
      SELECT * FROM articles 
      WHERE published_at >= ${oneDayAgo}
      ORDER BY published_at DESC
    `;
    console.log(`   Found ${articles.length} articles from last 24 hours`);

    for (const article of articles) {
      await neonDb`
        INSERT INTO articles (
          id, slug, title, content, excerpt, original_title, original_content,
          image_url, image_urls, image_hash, source_url, source_name, category,
          published_at, is_published, journalist_id, entities, is_developing,
          is_manually_created, parent_story_id, merged_into_id, last_enriched_at,
          enrichment_count
        ) VALUES (
          ${article.id}, ${article.slug}, ${article.title}, ${article.content},
          ${article.excerpt}, ${article.original_title}, ${article.original_content},
          ${article.image_url}, ${article.image_urls}, ${article.image_hash},
          ${article.source_url}, ${article.source_name}, ${article.category},
          ${article.published_at}, ${article.is_published}, ${article.journalist_id},
          ${article.entities}, ${article.is_developing}, ${article.is_manually_created},
          ${article.parent_story_id}, ${article.merged_into_id}, ${article.last_enriched_at},
          ${article.enrichment_count}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log('   ✅ Articles migrated\n');

    // Migrate journalists
    console.log('👤 Migrating journalists...');
    const journalists = await replitDb`SELECT * FROM journalists`;
    console.log(`   Found ${journalists.length} journalists`);

    for (const journalist of journalists) {
      await neonDb`
        INSERT INTO journalists (id, nickname, full_name, surname, headshot, bio, beat, fun_fact)
        VALUES (
          ${journalist.id}, 
          ${journalist.nickname || journalist.name || 'Unknown'}, 
          ${journalist.full_name || journalist.name || 'Unknown'},
          ${journalist.surname || ''},
          ${journalist.headshot || journalist.image_url || ''},
          ${journalist.bio || ''},
          ${journalist.beat || 'General'},
          ${journalist.fun_fact || ''}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log('   ✅ Journalists migrated\n');

    // Migrate users
    console.log('🔐 Migrating users...');
    const users = await replitDb`SELECT * FROM users`;
    console.log(`   Found ${users.length} users`);

    for (const user of users) {
      await neonDb`
        INSERT INTO users (id, username, password, role)
        VALUES (${user.id}, ${user.username}, ${user.password}, ${user.role})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log('   ✅ Users migrated\n');

    console.log('🎉 Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update Railway DATABASE_URL to use Neon');
    console.log('2. Test the site');
    console.log('3. Shut down Replit');

  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error);
    process.exit(1);
  }
}

migrateData();
