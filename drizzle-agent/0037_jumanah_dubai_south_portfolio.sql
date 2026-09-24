UPDATE hg_agent_advisor_profiles
SET top_developers_json = '["Dubai South Properties","Emaar","Expo City Dubai","Ellington Properties","MAG Lifestyle Development","Azizi Developments","BT Properties","Imtiaz Developments"]',
    top_projects_json = '["south-square-by-dubai-south-properties","south-living-by-dubai-south-in-dubai-south-dubai","golf-fields-emaar-south-dubai","emaar-south-golf-views-apartments","mag-5-boulevard-dubai-south","windsor-house-dubai-south-ellington-properties","terra-woods-emaar-expo-city-dubai","azizi-venice-dubai-south","altura-waada-bt-properties-dubai-south","expo-valley-views-expo-city-dubai","avenew-888-apartments-dubai-south","enre-residence-imtiaz-dubai-south","golf-trails-emaar-emaar-south-dubai","divine-elements-takmeel-dubai-south","windsor-house-ii-ellington-dubai-south","cresswell-plaza-merath-dubai-south"]',
    custom_projects_json = '[]',
    portfolio_headline = 'Dubai South investment briefs and private client advisory',
    portfolio_bio = 'PSR Homes provides evidence-led private client advisory through Jumanah''s leadership desk. We structure Dubai South and wider UAE project comparisons around unit economics, current documentation, acquisition costs, rental sensitivities and transaction execution. Prices, inventory, incentives, fees, service charges, completion dates and commercial terms may change and require current written confirmation.',
    portfolio_specialties_json = '["Dubai South investment briefs","Ready and off-plan comparison","Unit economics and AED per sqft","Rental return sensitivities","Acquisition and ownership costs","Transaction coordination"]',
    portfolio_public = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE lower(agent_email) = 'jummanah@psrhomes.ae';
