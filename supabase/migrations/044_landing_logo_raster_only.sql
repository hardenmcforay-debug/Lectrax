-- Site logos are rasterized server-side; never store raw SVG in the public bucket.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]
WHERE id = 'landing-assets';
