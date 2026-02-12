import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@simplycms/core/supabase/server';

// Diagnostic endpoint для перевірки конфігурації
// Використання: відвідайте /api/health на продакшені
export async function GET() {
  try {
    interface HealthCheck {
      success?: boolean;
      error?: string | null;
      [key: string]: unknown;
    }

    const checks: Record<string, HealthCheck> = {};

    // Перевірка змінних середовища
    checks.envVars = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrlValue: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...',
    };

    // Перевірка підключення до Supabase
    try {
      const supabase = await createServerSupabaseClient();

      // Простий запит для перевірки підключення
      const { data, error } = await supabase.from('banners').select('count').limit(1);
      
      checks.supabaseConnection = {
        success: !error,
        error: error?.message || null,
        dataReceived: !!data,
      };
    } catch (supabaseError) {
      checks.supabaseConnection = {
        success: false,
        error: supabaseError instanceof Error ? supabaseError.message : 'Unknown error',
      };
    }

    // Визначення загального статусу
    const allChecksPass = Object.values(checks).every(
      (check) => check.success !== false
    );

    return NextResponse.json(
      {
        status: allChecksPass ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        checks,
      },
      { status: allChecksPass ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
