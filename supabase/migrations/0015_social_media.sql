-- Migration: 0015_social_media
-- Adds Facebook and TikTok URL fields to business_settings.

alter table public.business_settings
  add column if not exists facebook_url text,
  add column if not exists tiktok_url   text;
