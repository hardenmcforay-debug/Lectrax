-- Class sessions: add Class field, remove unused Description column
-- Run in Supabase SQL Editor after migrations 001–008

-- Add program/class label (e.g. Pre BSc in Nursing)
ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS class_name TEXT;

COMMENT ON COLUMN public.class_sessions.class_name IS
  'Program or class group, e.g. Pre BSc in Nursing';

-- Remove description column (no longer used in create session form)
ALTER TABLE public.class_sessions
  DROP COLUMN IF EXISTS description;
