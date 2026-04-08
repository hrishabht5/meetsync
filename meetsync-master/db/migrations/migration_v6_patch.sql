-- Migration V6 Patch
-- Fix user_profiles FK: was pointing to google_tokens, now points to users.
-- This allows email/password users (who have no google_tokens row) to get a profile.

ALTER TABLE user_profiles
    DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
