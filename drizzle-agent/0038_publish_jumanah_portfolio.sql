UPDATE hg_agent_advisor_profiles
SET onboarding_complete = 1,
    portfolio_public = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE lower(agent_email) = 'jummanah@psrhomes.ae';
