// CMart073 File Uploads API
// POST /api/uploads - Upload files to R2

import type { R2Bucket } from '@cloudflare/workers-types';

interface Env {
  R2: R2Bucket;
}

interface UploadResult {
  r2Key: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const contentType = context.request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ error: 'Expected multipart form data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await context.request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: 'No files provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (files.length < 2) {
      return new Response(JSON.stringify({ error: 'Please upload at least 2 photos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (files.length > 10) {
      return new Response(JSON.stringify({ error: 'Maximum 10 photos allowed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const uploads: UploadResult[] = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return new Response(JSON.stringify({ 
          error: `Invalid file type: ${file.name}. Only JPEG, PNG, and WebP are allowed.` 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Validate file size
      if (file.size > MAX_SIZE) {
        return new Response(JSON.stringify({ 
          error: `File too large: ${file.name}. Maximum size is 10MB.` 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Generate unique R2 key
      const timestamp = Date.now();
      const randomId = crypto.randomUUID().split('-')[0];
      const ext = file.name.split('.').pop() || 'jpg';
      const r2Key = `uploads/${timestamp}-${randomId}.${ext}`;

      // Upload to R2
      const arrayBuffer = await file.arrayBuffer();
      await context.env.R2.put(r2Key, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          originalFilename: file.name,
        },
      });

      uploads.push({
        r2Key,
        originalFilename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      uploads 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Upload failed. Please try again.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
