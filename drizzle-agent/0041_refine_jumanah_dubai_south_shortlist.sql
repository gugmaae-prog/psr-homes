-- Keep Jumanah's public Dubai South shortlist aligned with the revised
-- client brief: remove the near-handover Cresswell Plaza option and reserve
-- rental-return analysis for completed properties.
UPDATE `hg_agent_advisor_profiles`
SET `top_projects_json` = '["south-square-by-dubai-south-properties","south-living-by-dubai-south-in-dubai-south-dubai","golf-fields-emaar-south-dubai","emaar-south-golf-views-apartments","mag-5-boulevard-dubai-south","windsor-house-dubai-south-ellington-properties","terra-woods-emaar-expo-city-dubai","azizi-venice-dubai-south","altura-waada-bt-properties-dubai-south","expo-valley-views-expo-city-dubai","avenew-888-apartments-dubai-south","enre-residence-imtiaz-dubai-south","golf-trails-emaar-emaar-south-dubai","divine-elements-takmeel-dubai-south","windsor-house-ii-ellington-dubai-south"]',
    `portfolio_bio` = 'PSR Homes provides evidence-led private client advisory through Jumanah''s leadership desk. We structure Dubai South and wider UAE project comparisons around unit economics, current documentation, acquisition costs, completed-property rental analysis and transaction execution. Off-plan reviews focus on price, fees, payment timing and delivery evidence. Prices, inventory, incentives, fees, service charges, completion dates and commercial terms may change and require current written confirmation.',
    `portfolio_specialties_json` = '["Dubai South investment briefs","Ready and off-plan comparison","Unit economics and AED per sqft","Completed-property rental analysis","Acquisition and ownership costs","Transaction coordination"]',
    `updated_at` = CURRENT_TIMESTAMP
WHERE `agent_email` = 'jumanah@psrhomes.ae';

INSERT OR IGNORE INTO `hg_agent_admin_audit`
  (`id`, `admin_email`, `action`, `target_email`, `details`, `created_at`)
VALUES
  ('migration-0041-jumanah-shortlist', 'system@psrhomes.ae', 'portfolio_updated', 'jumanah@psrhomes.ae', '{"removedProject":"cresswell-plaza-merath-dubai-south","projectCount":15,"offPlanRoi":false}', CURRENT_TIMESTAMP);
