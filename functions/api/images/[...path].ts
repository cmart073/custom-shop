// CMart073 Image Serving API
// GET /api/images/[...path] - Serve images from R2

import type { R2Bucket } from '@cloudflare/workers-types';

interface Env {
  R2: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // Get the full path from params
    const pathParts = context.params.path;
    const r2Key = Array.isArray(pathParts) ? pathParts.join('/') : pathParts;

    if (!r2Key) {
      return new Response('Not found', { status: 404 });
    }

    const object = await context.env.R2.get(r2Key);

    if (!object) {
      return new Response('Not found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Security headers
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(object.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Image serving error:', error);
    return new Response('Error loading image', { status: 500 });
  }
};
