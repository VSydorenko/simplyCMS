#!/usr/bin/env node

/**
 * Застосування Supabase міграцій через Management API.
 *
 * Використовує SUPABASE_PROJECT_ID та SUPABASE_ACCESS_TOKEN
 * для підключення до проекту та застосування міграцій.
 *
 * Використання:
 *   pnpm db:migrate
 *
 * Змінні оточення (.env.local):
 *   SUPABASE_PROJECT_ID=your-project-ref
 *   SUPABASE_ACCESS_TOKEN=sbp_xxxx
 *
 * Отримати токен: https://app.supabase.com/account/tokens
 */

import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// ── Шляхи ───────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');
const MIGRATIONS_DIR = join(PROJECT_ROOT, 'supabase', 'migrations');

// ── Завантажити .env.local та .env ──────────────────────────────────────────
config({ path: join(PROJECT_ROOT, '.env.local') });
config({ path: join(PROJECT_ROOT, '.env') });

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

// ── Перевірка передумов ─────────────────────────────────────────────────────
function checkPrerequisites() {
  console.log('🔍 Перевірка передумов...\n');

  // Supabase CLI
  try {
    const version = execSync('supabase --version', { encoding: 'utf8' })
      .trim()
      .split('\n')[0];
    console.log(`  ✅ Supabase CLI: ${version}`);
  } catch {
    console.error('  ❌ Supabase CLI не знайдено!');
    console.log('  💡 Встанови: https://supabase.com/docs/guides/cli/getting-started');
    return false;
  }

  // PROJECT_ID
  if (!PROJECT_ID) {
    console.error('  ❌ SUPABASE_PROJECT_ID не задано!');
    console.log('  💡 Додай в .env.local:');
    console.log('     SUPABASE_PROJECT_ID=your-project-ref');
    return false;
  }
  console.log(`  ✅ Project ID: ${PROJECT_ID}`);

  // ACCESS_TOKEN
  if (!ACCESS_TOKEN) {
    console.error('  ❌ SUPABASE_ACCESS_TOKEN не задано!');
    console.log('  💡 Додай в .env.local:');
    console.log('     SUPABASE_ACCESS_TOKEN=sbp_xxxx');
    console.log('  💡 Отримай токен: https://app.supabase.com/account/tokens');
    return false;
  }
  console.log('  ✅ Access token: знайдено');

  // Показати кількість локальних міграцій
  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'));
    console.log(`  ✅ Локальних міграцій: ${files.length}`);
  } catch {
    console.warn('  ⚠️  Директорія міграцій не знайдена');
  }

  console.log();
  return true;
}

// ── Підключення до проекту ──────────────────────────────────────────────────
function linkProject() {
  console.log('🔗 Підключення до проекту...\n');

  const env = {
    ...process.env,
    SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN,
    SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD || '',
  };

  const command = `supabase link --project-ref ${PROJECT_ID}`;
  console.log(`  📡 ${command}\n`);

  try {
    execSync(command, {
      encoding: 'utf8',
      cwd: PROJECT_ROOT,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    const stderr = error.stderr?.toString() || '';
    // "Already linked" — не помилка
    if (stderr.includes('already linked') || stderr.includes('Finished')) {
      return;
    }
    throw error;
  }
}

// ── Застосування міграцій ───────────────────────────────────────────────────
function applyMigrations() {
  console.log('🔄 Застосування міграцій...\n');

  const env = {
    ...process.env,
    SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN,
    SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD || '',
  };

  const command = 'supabase db push --linked';
  console.log(`  📡 ${command}\n`);

  try {
    const output = execSync(command, {
      encoding: 'utf8',
      cwd: PROJECT_ROOT,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (output.trim()) {
      console.log(output);
    }
  } catch (error) {
    const stderr = error.stderr?.toString() || '';
    const stdout = error.stdout?.toString() || '';

    // "Applied" або "up to date" — нормальний результат
    if (
      stderr.includes('Applied') ||
      stderr.includes('up to date') ||
      stdout.includes('Applied') ||
      stdout.includes('up to date')
    ) {
      console.log(stderr || stdout);
      return;
    }
    throw error;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
try {
  console.log('\n🚀 SimplyCMS — Застосування міграцій\n');

  if (!checkPrerequisites()) {
    process.exit(1);
  }

  linkProject();
  applyMigrations();

  console.log('✅ Міграції успішно застосовано!\n');
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`\n❌ Помилка: ${msg}`);

  if (msg.includes('authentication') || msg.includes('token')) {
    console.log('💡 Перевір SUPABASE_ACCESS_TOKEN — можливо він протермінований');
  }
  if (msg.includes('project')) {
    console.log('💡 Перевір SUPABASE_PROJECT_ID — він має відповідати вашому проекту');
  }
  if (msg.includes('network') || msg.includes('ECONNREFUSED')) {
    console.log('💡 Перевір підключення до інтернету');
  }
  if (msg.includes('password') || msg.includes('password authentication')) {
    console.log('💡 Додай SUPABASE_DB_PASSWORD в .env.local');
  }
  if (msg.includes('already applied') || msg.includes('up to date')) {
    console.log('💡 Всі міграції вже застосовані.');
    process.exit(0);
  }

  process.exit(1);
}
