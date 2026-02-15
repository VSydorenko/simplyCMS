import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { secret, type, slug, sectionSlug, path } = await request.json();

    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
    }

    const revalidated: string[] = [];

    if (type === 'theme') {
      // Інвалідація кешу активної теми (unstable_cache tag)
      revalidateTag('active-theme', 'max');
      // Повна ревалідація layout (включає всі storefront сторінки)
      revalidatePath('/', 'layout');
      revalidated.push('/');
    } else if (type === 'product' && slug && sectionSlug) {
      revalidatePath(`/catalog/${sectionSlug}/${slug}`);
      revalidatePath(`/catalog/${sectionSlug}`);
      revalidatePath('/catalog');
      revalidated.push(`/catalog/${sectionSlug}/${slug}`, `/catalog/${sectionSlug}`, '/catalog');
    } else if (type === 'section' && slug) {
      revalidatePath(`/catalog/${slug}`);
      revalidatePath('/catalog');
      revalidated.push(`/catalog/${slug}`, '/catalog');
    } else if (type === 'banner') {
      revalidatePath('/');
      revalidated.push('/');
    } else if (path) {
      revalidatePath(path);
      revalidated.push(path);
    }

    return NextResponse.json({ revalidated: true, paths: revalidated, now: Date.now() });
  } catch {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}
