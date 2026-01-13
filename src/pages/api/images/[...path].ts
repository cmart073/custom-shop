// GET /api/images/[...path] - Serve images from R2
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const r2 = locals.runtime.env.R2;
    
    if (!r2) {
      return new Response('Storage not configured', { status: 500 });
    }

    const pathParts = params.path;
    const r2Key = Array.isArray(pathParts) ? pathParts.join('/') : pathParts;

    if (!r2Key) {
      return new Response('Not found', { status: 404 });
    }

    const object = await r2.get(r2Key);

    if (!object) {
      return new Response('Not found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(object.body, { status: 200, headers });

  } catch (error) {
    console.error('Image serving error:', error);
    return new Response('Error loading image', { status: 500 });
  }
};
