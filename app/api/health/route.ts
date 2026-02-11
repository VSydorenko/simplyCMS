import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Diagnostic endpoint для перевірки конфігурації
// Використання: відвідайте /api/health на продакшені
export async function GET() {
  try {
    const diagnostics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {},
    };

    // Перевірка змінних середовища
    diagnostics.checks.envVars = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrlValue: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...',
    };

    // Перевірка підключення до Supabase
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (c) => {
              c.forEach(({ name, value, options }) => {
                try {
                  cookieStore.set(name, value, options);
                } catch {}
              });
            },
          },
        }
      );

      // Простий запит для перевірки підключення
      const { data, error } = await supabase.from('banners').select('count').limit(1);
      
      diagnostics.checks.supabaseConnection = {
        success: !error,
        error: error?.message || null,
        dataReceived: !!data,
      };
    } catch (supabaseError) {
      diagnostics.checks.supabaseConnection = {
        success: false,
        error: supabaseError instanceof Error ? supabaseError.message : 'Unknown error',
      };
    }

    // Визначення загального статусу
    const allChecksPass = Object.values(diagnostics.checks).every(
      (check: any) => check.success !== false
    );

    return NextResponse.json(
      {
        status: allChecksPass ? 'healthy' : 'degraded',
        ...diagnostics,
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
