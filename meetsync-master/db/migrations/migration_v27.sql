-- M-4 security: include password_reset_tokens in delete_user_account
-- The v12 version omitted this table, leaving tokens behind after erasure.

CREATE OR REPLACE FUNCTION delete_user_account(target_user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM bookings               WHERE user_id = target_user_id;
  DELETE FROM one_time_links         WHERE user_id = target_user_id;
  DELETE FROM permanent_links        WHERE user_id = target_user_id;
  DELETE FROM availability_overrides WHERE user_id = target_user_id;
  DELETE FROM availability_settings  WHERE user_id = target_user_id;
  DELETE FROM api_keys               WHERE user_id = target_user_id;
  DELETE FROM webhooks               WHERE user_id = target_user_id;
  DELETE FROM google_tokens          WHERE user_id = target_user_id;
  DELETE FROM password_reset_tokens  WHERE user_id = target_user_id;
  DELETE FROM user_profiles          WHERE user_id = target_user_id;
  DELETE FROM users                  WHERE id      = target_user_id;
END;
$$;
