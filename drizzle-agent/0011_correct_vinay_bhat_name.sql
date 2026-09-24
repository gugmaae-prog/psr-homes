UPDATE `hg_agent_profiles`
SET `display_name` = 'Vinay Bhat',
    `updated_at` = CURRENT_TIMESTAMP
WHERE lower(`email`) = 'vinay@cba.espacios.me';
