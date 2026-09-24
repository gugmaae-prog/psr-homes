UPDATE `hg_agent_profiles`
SET `display_name` = 'Priya Mistry',
    `title` = 'Chief Executive Officer',
    `updated_at` = CURRENT_TIMESTAMP
WHERE lower(`email`) = 'priya@cba.espacios.me';
--> statement-breakpoint
UPDATE `hg_agent_profiles`
SET `display_name` = 'Mehul Mistry',
    `title` = 'Sales Director',
    `updated_at` = CURRENT_TIMESTAMP
WHERE lower(`email`) = 'mehul@cba.espacios.me';
--> statement-breakpoint
UPDATE `hg_agent_advisor_profiles`
SET `property_finder_experience` = '5 years in the market',
    `updated_at` = CURRENT_TIMESTAMP
WHERE lower(`agent_email`) = 'irfan@cba.espacios.me';
