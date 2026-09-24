import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const leads = sqliteTable("haus_grace_leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  message: text("message").notNull().default(""),
  source: text("source").notNull().default("website"),
  propertyReference: text("property_reference"),
  consent: integer("consent", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const graceMemories = sqliteTable("hg_grace_memories", {
  sessionId: text("session_id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  email: text("email").notNull().default(""),
  preferencesJson: text("preferences_json").notNull().default("{}"),
  behaviorJson: text("behavior_json").notNull().default("{}"),
  summary: text("summary").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_grace_memories_email").on(table.email, table.updatedAt),
]);

export const clientBriefs = sqliteTable("hg_client_briefs", {
  id: text("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  briefType: text("brief_type").notNull().default("grace_finder"),
  status: text("status").notNull().default("generated"),
  projectSlugsJson: text("project_slugs_json").notNull().default("[]"),
  generatedAt: text("generated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  sentAt: text("sent_at").notNull().default(""),
  errorMessage: text("error_message").notNull().default(""),
}, (table) => [
  index("idx_hg_client_briefs_lead").on(table.leadId, table.generatedAt),
  index("idx_hg_client_briefs_email").on(table.email, table.generatedAt),
]);

export const publicBriefDownloads = sqliteTable("psr_public_brief_downloads", {
  tokenHash: text("token_hash").primaryKey(),
  leadId: integer("lead_id").notNull(),
  objectKey: text("object_key").notNull(),
  filename: text("filename").notNull(),
  expiresAt: text("expires_at").notNull(),
  downloadedAt: text("downloaded_at").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_psr_public_brief_expiry").on(table.expiresAt),
]);

export const brochureDownloads = sqliteTable("psr_brochure_downloads", {
  tokenHash: text("token_hash").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  projectSlug: text("project_slug").notNull(),
  expiresAt: text("expires_at").notNull(),
  downloadedAt: text("downloaded_at").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_psr_brochure_download_expiry").on(table.expiresAt),
  index("idx_psr_brochure_download_project").on(table.projectSlug, table.createdAt),
]);

export const importRuns = sqliteTable("haus_grace_import_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(),
  status: text("status").notNull(),
  received: integer("received").notNull().default(0),
  published: integer("published").notNull().default(0),
  rejected: integer("rejected").notNull().default(0),
  details: text("details").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const agentProfiles = sqliteTable("hg_agent_profiles", {
  email: text("email").primaryKey(),
  displayName: text("display_name").notNull(),
  phone: text("phone").notNull().default(""),
  title: text("title").notNull().default("Property Advisor"),
  avatarUrl: text("avatar_url").notNull().default(""),
  role: text("role").notNull().default("agent"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const leadRatUserMappings = sqliteTable("psr_leadrat_user_mappings", {
  psrEmail: text("psr_email").primaryKey(),
  leadRatEmail: text("leadrat_email").notNull(),
  note: text("note").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_psr_leadrat_user_mappings_target").on(table.leadRatEmail, table.active),
]);

export const leadRatLeadSyncs = sqliteTable("psr_leadrat_lead_syncs", {
  websiteLeadId: integer("website_lead_id").primaryKey().references(() => leads.id, { onDelete: "cascade" }),
  leadRatLeadId: text("leadrat_lead_id").notNull().default(""),
  targetPsrEmail: text("target_psr_email").notNull(),
  targetLeadRatEmail: text("target_leadrat_email").notNull().default(""),
  targetLeadRatUserId: text("target_leadrat_user_id").notNull().default(""),
  status: text("status").notNull(),
  errorMessage: text("error_message").notNull().default(""),
  attemptCount: integer("attempt_count").notNull().default(0),
  attemptedAt: text("attempted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_psr_leadrat_lead_syncs_status").on(table.status, table.attemptedAt),
  index("idx_psr_leadrat_lead_syncs_target").on(table.targetPsrEmail, table.targetLeadRatEmail, table.attemptedAt),
]);

export const agentAdvisorProfiles = sqliteTable("hg_agent_advisor_profiles", {
  agentEmail: text("agent_email").primaryKey().references(() => agentProfiles.email, { onDelete: "cascade" }),
  topDevelopersJson: text("top_developers_json").notNull().default("[]"),
  topProjectsJson: text("top_projects_json").notNull().default("[]"),
  customProjectsJson: text("custom_projects_json").notNull().default("[]"),
  aiHeadline: text("ai_headline").notNull().default(""),
  aiBio: text("ai_bio").notNull().default(""),
  aiSpecialtiesJson: text("ai_specialties_json").notNull().default("[]"),
  aiRecommendationsJson: text("ai_recommendations_json").notNull().default("[]"),
  portfolioHeadline: text("portfolio_headline").notNull().default(""),
  portfolioBio: text("portfolio_bio").notNull().default(""),
  portfolioSpecialtiesJson: text("portfolio_specialties_json").notNull().default("[]"),
  portfolioRecommendationsJson: text("portfolio_recommendations_json").notNull().default("[]"),
  portfolioPublic: integer("portfolio_public", { mode: "boolean" }).notNull().default(false),
  portfolioSlug: text("portfolio_slug").notNull().unique(),
  whatsappPhone: text("whatsapp_phone").notNull().default(""),
  linkedinUrl: text("linkedin_url").notNull().default(""),
  instagramUrl: text("instagram_url").notNull().default(""),
  propertyFinderProfileUrl: text("property_finder_profile_url").notNull().default(""),
  propertyFinderBrn: text("property_finder_brn").notNull().default(""),
  propertyFinderExperience: text("property_finder_experience").notNull().default(""),
  propertyFinderLanguagesJson: text("property_finder_languages_json").notNull().default("[]"),
  propertyFinderAreasJson: text("property_finder_areas_json").notNull().default("[]"),
  propertyFinderVerifiedAt: text("property_finder_verified_at").notNull().default(""),
  onboardingComplete: integer("onboarding_complete", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_agent_advisor_profiles_public").on(table.portfolioPublic, table.portfolioSlug),
]);

export const agentSecondaryUnits = sqliteTable("hg_agent_secondary_units", {
  id: text("id").primaryKey(),
  agentEmail: text("agent_email").notNull().references(() => agentProfiles.email, { onDelete: "cascade" }),
  title: text("title").notNull(),
  community: text("community").notNull(),
  emirate: text("emirate").notNull().default("Dubai"),
  propertyType: text("property_type").notNull(),
  bedrooms: text("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull().default(0),
  sizeSqft: integer("size_sqft").notNull().default(0),
  priceAed: integer("price_aed").notNull().default(0),
  reference: text("reference").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("available"),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_agent_secondary_units_owner").on(table.agentEmail, table.updatedAt),
  index("idx_hg_agent_secondary_units_public").on(table.agentEmail, table.published, table.status),
]);

export const agentSecondaryUnitMedia = sqliteTable("hg_agent_secondary_unit_media", {
  id: text("id").primaryKey(),
  unitId: text("unit_id").notNull().references(() => agentSecondaryUnits.id, { onDelete: "cascade" }),
  r2Key: text("r2_key").notNull().unique(),
  originalFilename: text("original_filename").notNull().default(""),
  mimeType: text("mime_type").notNull().default("image/webp"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  width: integer("width").notNull().default(0),
  height: integer("height").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_agent_secondary_unit_media_unit").on(table.unitId, table.sortOrder, table.createdAt),
]);

export const agentPropertyFinderListings = sqliteTable("hg_agent_property_finder_listings", {
  id: text("id").primaryKey(),
  agentEmail: text("agent_email").notNull().references(() => agentProfiles.email, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(),
  externalUrl: text("external_url").notNull(),
  reference: text("reference").notNull().default(""),
  title: text("title").notNull(),
  location: text("location").notNull(),
  propertyType: text("property_type").notNull(),
  listingType: text("listing_type").notNull(),
  bedrooms: text("bedrooms").notNull().default(""),
  bathrooms: integer("bathrooms").notNull().default(0),
  sizeSqft: integer("size_sqft").notNull().default(0),
  priceAed: integer("price_aed").notNull().default(0),
  imageUrl: text("image_url").notNull().default(""),
  listedAt: text("listed_at").notNull().default(""),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("active"),
  fetchedAt: text("fetched_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_pf_listings_owner").on(table.agentEmail, table.status, table.updatedAt),
  uniqueIndex("uq_hg_pf_listings_owner_external").on(table.agentEmail, table.externalId),
]);

export const agentPropertyFinderSync = sqliteTable("hg_agent_property_finder_sync", {
  agentEmail: text("agent_email").primaryKey().references(() => agentProfiles.email, { onDelete: "cascade" }),
  profileUrl: text("profile_url").notNull(),
  status: text("status").notNull().default("pending"),
  listingCount: integer("listing_count").notNull().default(0),
  totalCount: integer("total_count").notNull().default(0),
  error: text("error").notNull().default(""),
  lastAttemptedAt: text("last_attempted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSyncedAt: text("last_synced_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_pf_sync_status").on(table.status, table.lastAttemptedAt),
]);

export const agentLoginCodes = sqliteTable("hg_agent_login_codes", {
  email: text("email").primaryKey(),
  nonce: text("nonce").notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const agentSessions = sqliteTable("hg_agent_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull().references(() => agentProfiles.email, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_agent_sessions_email").on(table.email),
  index("idx_hg_agent_sessions_expires").on(table.expiresAt),
]);

export const agentRateLimits = sqliteTable("hg_agent_rate_limits", {
  key: text("key").primaryKey(),
  windowStartedAt: text("window_started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  count: integer("count").notNull().default(0),
});

export const siteAnalyticsEvents = sqliteTable("hg_site_analytics_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  visitorId: text("visitor_id").notNull(),
  eventType: text("event_type").notNull(),
  path: text("path").notNull(),
  section: text("section").notNull().default(""),
  target: text("target").notNull().default(""),
  xPct: real("x_pct"),
  yPct: real("y_pct"),
  scrollDepth: integer("scroll_depth").notNull().default(0),
  viewportWidth: integer("viewport_width").notNull().default(0),
  viewportHeight: integer("viewport_height").notNull().default(0),
  deviceType: text("device_type").notNull().default("unknown"),
  referrerHost: text("referrer_host").notNull().default(""),
  country: text("country").notNull().default(""),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_analytics_created").on(table.createdAt),
  index("idx_hg_analytics_path_type").on(table.path, table.eventType, table.createdAt),
  index("idx_hg_analytics_session").on(table.sessionId, table.createdAt),
]);

export const agentCredentials = sqliteTable("hg_agent_credentials", {
  email: text("email").primaryKey().references(() => agentProfiles.email, { onDelete: "cascade" }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordIterations: integer("password_iterations").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(false),
  passwordChangedAt: text("password_changed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: text("last_login_at"),
}, (table) => [
  index("idx_hg_agent_credentials_locked").on(table.lockedUntil),
]);

export const agentAdminAudit = sqliteTable("hg_agent_admin_audit", {
  id: text("id").primaryKey(),
  adminEmail: text("admin_email").notNull(),
  action: text("action").notNull(),
  targetEmail: text("target_email").notNull(),
  details: text("details").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_agent_admin_audit_target").on(table.targetEmail, table.createdAt),
]);

export const crmContacts = sqliteTable("hg_crm_contacts", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull().references(() => agentProfiles.email, { onDelete: "restrict" }),
  createdBy: text("created_by").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  nationality: text("nationality").notNull().default(""),
  preferredLanguage: text("preferred_language").notNull().default(""),
  clientType: text("client_type").notNull().default("buyer"),
  source: text("source").notNull().default("manual"),
  status: text("status").notNull().default("new"),
  consentStatus: text("consent_status").notNull().default("unknown"),
  tagsJson: text("tags_json").notNull().default("[]"),
  notes: text("notes").notNull().default(""),
  lastContactAt: text("last_contact_at").notNull().default(""),
  nextFollowUpAt: text("next_follow_up_at").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_crm_contacts_owner_updated").on(table.ownerEmail, table.status, table.updatedAt),
  index("idx_hg_crm_contacts_owner_email").on(table.ownerEmail, table.email),
  index("idx_hg_crm_contacts_owner_phone").on(table.ownerEmail, table.phone),
  uniqueIndex("uq_hg_crm_contacts_owner_email_active").on(table.ownerEmail, table.email).where(sql`${table.email} <> '' AND ${table.status} <> 'archived'`),
  uniqueIndex("uq_hg_crm_contacts_owner_phone_active").on(table.ownerEmail, table.phone).where(sql`${table.phone} <> '' AND ${table.status} <> 'archived'`),
]);

export const crmOpportunities = sqliteTable("hg_crm_opportunities", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
  ownerEmail: text("owner_email").notNull().references(() => agentProfiles.email, { onDelete: "restrict" }),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("purchase"),
  stage: text("stage").notNull().default("new"),
  estimatedValueAed: integer("estimated_value_aed").notNull().default(0),
  probability: integer("probability").notNull().default(10),
  projectSlug: text("project_slug").notNull().default(""),
  propertyReference: text("property_reference").notNull().default(""),
  communitiesJson: text("communities_json").notNull().default("[]"),
  bedroomsJson: text("bedrooms_json").notNull().default("[]"),
  budgetMinAed: integer("budget_min_aed").notNull().default(0),
  budgetMaxAed: integer("budget_max_aed").notNull().default(0),
  moveTimeline: text("move_timeline").notNull().default(""),
  nextStep: text("next_step").notNull().default(""),
  expectedCloseAt: text("expected_close_at").notNull().default(""),
  lostReason: text("lost_reason").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_crm_opportunities_owner_stage").on(table.ownerEmail, table.stage, table.updatedAt),
  index("idx_hg_crm_opportunities_contact").on(table.contactId, table.updatedAt),
  index("idx_hg_crm_opportunities_close").on(table.ownerEmail, table.expectedCloseAt),
]);

export const crmTasks = sqliteTable("hg_crm_tasks", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
  opportunityId: text("opportunity_id").references(() => crmOpportunities.id, { onDelete: "set null" }),
  ownerEmail: text("owner_email").notNull().references(() => agentProfiles.email, { onDelete: "restrict" }),
  assignedBy: text("assigned_by").notNull(),
  title: text("title").notNull(),
  notes: text("notes").notNull().default(""),
  dueAt: text("due_at").notNull().default(""),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("open"),
  completedAt: text("completed_at").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_crm_tasks_owner_due").on(table.ownerEmail, table.status, table.dueAt),
  index("idx_hg_crm_tasks_contact").on(table.contactId, table.status, table.dueAt),
]);

export const crmActivities = sqliteTable("hg_crm_activities", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
  opportunityId: text("opportunity_id").references(() => crmOpportunities.id, { onDelete: "set null" }),
  taskId: text("task_id").references(() => crmTasks.id, { onDelete: "set null" }),
  ownerEmail: text("owner_email").notNull(),
  actorEmail: text("actor_email").notNull(),
  type: text("type").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull().default(""),
  occurredAt: text("occurred_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_crm_activities_contact").on(table.contactId, table.occurredAt),
  index("idx_hg_crm_activities_owner").on(table.ownerEmail, table.occurredAt),
]);

export const crmLeadLinks = sqliteTable("hg_crm_lead_links", {
  websiteLeadId: integer("website_lead_id").primaryKey().references(() => leads.id, { onDelete: "cascade" }),
  contactId: text("contact_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
  importedBy: text("imported_by").notNull(),
  importedAt: text("imported_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_crm_lead_links_contact").on(table.contactId, table.importedAt),
]);

export const crmAuditLog = sqliteTable("hg_crm_audit_log", {
  id: text("id").primaryKey(),
  actorEmail: text("actor_email").notNull(),
  ownerEmail: text("owner_email").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  changesJson: text("changes_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_crm_audit_owner_created").on(table.ownerEmail, table.createdAt),
  index("idx_hg_crm_audit_entity").on(table.entityType, table.entityId, table.createdAt),
]);

export const agentConversations = sqliteTable("hg_agent_conversations", {
  id: text("id").primaryKey(),
  agentEmail: text("agent_email").notNull().references(() => agentProfiles.email, { onDelete: "cascade" }),
  title: text("title").notNull(),
  mode: text("mode").notNull().default("advisory"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_agent_conversations_owner").on(table.agentEmail, table.updatedAt),
]);

export const agentMessages = sqliteTable("hg_agent_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => agentConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_agent_messages_conversation").on(table.conversationId, table.createdAt),
]);

export const agentDocuments = sqliteTable("hg_agent_documents", {
  id: text("id").primaryKey(),
  agentEmail: text("agent_email").notNull().references(() => agentProfiles.email, { onDelete: "cascade" }),
  library: text("library").notNull().default("personal"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  clientName: text("client_name").notNull(),
  contentJson: text("content_json").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_agent_documents_owner").on(table.agentEmail, table.updatedAt),
  index("idx_hg_agent_documents_library").on(table.library, table.updatedAt),
]);

export const agentEmailLog = sqliteTable("hg_agent_email_log", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => agentDocuments.id, { onDelete: "cascade" }),
  agentEmail: text("agent_email").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull(),
  error: text("error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hg_agent_email_log_document").on(table.documentId, table.createdAt),
]);

export const projectFeed = sqliteTable("hg_project_feed", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  developer: text("developer").notNull(),
  emirate: text("emirate").notNull(),
  area: text("area").notNull(),
  startingPrice: integer("starting_price").notNull().default(0),
  paymentPlan: text("payment_plan").notNull().default("On request"),
  handover: text("handover").notNull().default("To be confirmed"),
  imageUrl: text("image_url").notNull().default(""),
  mediaJson: text("media_json").notNull().default('{"gallery":[],"exteriors":[],"interiors":[],"floorplans":[]}'),
  bedroomsJson: text("bedrooms_json").notNull().default("[]"),
  propertyTypesJson: text("property_types_json").notNull().default("[]"),
  summary: text("summary").notNull().default(""),
  sourceUrl: text("source_url").notNull(),
  status: text("status").notNull().default("draft"),
  sourceCheckedAt: text("source_checked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  discoveredAt: text("discovered_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("uq_hg_project_feed_source").on(table.sourceUrl),
  index("idx_hg_project_feed_status_discovered").on(table.status, table.discoveredAt),
  index("idx_hg_project_feed_market").on(table.emirate, table.developer),
]);

export const dailyInsights = sqliteTable("hg_daily_insights", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  dek: text("dek").notNull(),
  bodyJson: text("body_json").notNull().default("[]"),
  category: text("category").notNull().default("Daily market lens"),
  sourceLabel: text("source_label").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourcePublishedAt: text("source_published_at").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  marketDate: text("market_date").notNull(),
  status: text("status").notNull().default("draft"),
  publishedAt: text("published_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("uq_hg_daily_insights_market_date").on(table.marketDate),
  index("idx_hg_daily_insights_status_date").on(table.status, table.marketDate),
]);
