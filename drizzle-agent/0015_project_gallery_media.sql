ALTER TABLE `hg_project_feed`
ADD COLUMN `media_json` text DEFAULT '{"gallery":[],"exteriors":[],"interiors":[],"floorplans":[]}' NOT NULL;
