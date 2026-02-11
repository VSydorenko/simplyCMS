import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Перевірка змінних середовища
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables in middleware');
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Логування помилок автентифікації
    if (userError) {
      console.error('Auth error in middleware:', userError.message);
    }

    const pathname = request.nextUrl.pathname;

    if (pathname.startsWith('/admin')) {
      if (!user) return NextResponse.redirect(new URL('/auth', request.url));
      
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (roleError) {
        console.error('Role check error:', roleError.message);
      }
      
      if (!role) return NextResponse.redirect(new URL('/', request.url));
    }

    if (pathname.startsWith('/profile')) {
      if (!user) return NextResponse.redirect(new URL('/auth', request.url));
    }

    if (pathname === '/auth' && user) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return supabaseResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    return supabaseResponse;
  }
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/auth'],
};
