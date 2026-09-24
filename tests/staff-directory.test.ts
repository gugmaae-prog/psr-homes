import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { canonicalCbaTeamSlug, cbaTeam, cbaTeamMember } from "../data/cba-team";
import { jumanahDubaiSouthPortfolio } from "../data/jumanah-dubai-south-portfolio";

const parvRoleMigration = fs.readFileSync(new URL("../drizzle-agent/0032_parv_managing_partner.sql", import.meta.url), "utf8");
const jummanahMigration = fs.readFileSync(new URL("../drizzle-agent/0033_jummanah_managing_partner.sql", import.meta.url), "utf8");
const jumanahNameMigration = fs.readFileSync(new URL("../drizzle-agent/0034_jumanah_display_name.sql", import.meta.url), "utf8");
const prateekIdentityMigration = fs.readFileSync(new URL("../drizzle-agent/0035_prateek_canonical_identity.sql", import.meta.url), "utf8");
const jumanahPortfolioMigration = fs.readFileSync(new URL("../drizzle-agent/0037_jumanah_dubai_south_portfolio.sql", import.meta.url), "utf8");
const jumanahIdentityMigration = fs.readFileSync(new URL("../drizzle-agent/0039_jumanah_canonical_identity.sql", import.meta.url), "utf8");
const jumanahContactMigration = fs.readFileSync(new URL("../drizzle-agent/0040_jumanah_contact_details.sql", import.meta.url), "utf8");

const expected = [
  ["Sourabh Das", "Property Consultant", "sourabh@psrhomes.ae"],
  ["Mazhar Khan", "Property Consultant", "majhar@psrhomes.ae"],
  ["Louay Betengane", "Property Consultant", "louay@psrhomes.ae"],
  ["Rohit Kumar Sinha", "Property Consultant", "rohit@psrhomes.ae"],
  ["Parv Sondhi", "Managing Partner", "parv@psrhomes.ae"],
  ["Adhiyaman Aathimulam", "Property Consultant", "adhiyaman@psrhomes.ae"],
  ["Sonu Sharma", "Managing Director", "sonu@psrhomes.ae"],
  ["Prateek Rawal", "Managing Partner", "prateek@psrhomes.ae"],
  ["Reegan Negi", "Managing Partner", "reegan@psrhomes.ae"],
  ["Jumanah", "Managing Partner", "jumanah@psrhomes.ae"],
  ["Neshva Chundayil", "Head Accountant", "sales@psrhomes.ae"],
  ["Janet Genabio", "Office Coordinator", "janet@psrhomes.ae"],
  ["Pratham Raval", "Property Consultant", "pratham@psrhomes.ae"],
  ["Ujwal Kumar", "Property Consultant", "ujwal@psrhomes.ae"],
  ["Harna Raval", "Property Consultant", "harna@psrhomes.ae"],
] as const;

test("the PSR public and workspace roster uses the approved staff identities", () => {
  assert.equal(cbaTeam.length, expected.length);
  const byName = new Map(cbaTeam.map((member) => [member.name, member]));
  for (const [name, role, email] of expected) {
    const member = byName.get(name);
    assert.ok(member, `${name} should be present`);
    assert.equal(member.role, role);
    assert.equal(member.email, email);
    assert.equal(member.image, `/api/agent/avatar/${member.slug}`);
  }
});

test("staff usernames, slugs, and canonical photo routes are unique", () => {
  assert.equal(new Set(cbaTeam.map((member) => member.email)).size, cbaTeam.length);
  assert.equal(new Set(cbaTeam.map((member) => member.slug)).size, cbaTeam.length);
  assert.equal(new Set(cbaTeam.map((member) => member.image)).size, cbaTeam.length);
});

test("Prateek uses the correctly spelled canonical email, username and public slug", () => {
  const prateek = cbaTeamMember("prateek-rawal");
  assert.equal(prateek?.email, "prateek@psrhomes.ae");
  assert.equal(prateek?.slug, "prateek-rawal");
  assert.equal(prateek?.fallbackImage, "/team/psr-advisors/prateek-rawal.webp");
  assert.equal(cbaTeamMember("pratheek")?.slug, "prateek-rawal");
  assert.equal(cbaTeamMember("pratheek-rawal")?.slug, "prateek-rawal");
  assert.equal(cbaTeamMember("prateek")?.slug, "prateek-rawal");
  assert.match(prateekIdentityMigration, /`email` = 'prateek@psrhomes\.ae'/);
  assert.match(prateekIdentityMigration, /`username` = 'prateek'/);
  assert.match(prateekIdentityMigration, /`mailbox` = 'prateek@psrhomes\.ae'/);
});

test("Parv is presented and grouped as a managing partner without changing account authorization", () => {
  const parv = cbaTeam.find((member) => member.slug === "parv-sondhi");
  assert.equal(parv?.role, "Managing Partner");
  assert.deepEqual(parv?.facts, ["PSR leadership", "Private client advisory"]);
  assert.deepEqual(cbaTeam.slice(0, 4).map((member) => member.slug), [
    "sonu-sharma",
    "prateek-rawal",
    "reegan-negi",
    "parv-sondhi",
  ]);
  assert.match(parvRoleMigration, /`title` = 'Managing Partner'/);
  assert.match(parvRoleMigration, /`team_name` = 'Leadership'/);
  assert.match(parvRoleMigration, /UPDATE `hg_agent_documents`/);
  assert.match(parvRoleMigration, /`status` = 'draft'/);
  assert.match(parvRoleMigration, /json_extract\(`content_json`, '\$\.advisor\.title'\) = 'Property Consultant'/);
  assert.doesNotMatch(parvRoleMigration, /`role`\s*=/);
  assert.doesNotMatch(parvRoleMigration, /`access_json`\s*=/);
});

test("Jumanah uses one canonical spelling across her public and portal identity", () => {
  const jumanah = cbaTeam.find((member) => member.slug === "jumanah");
  assert.equal(jumanah?.name, "Jumanah");
  assert.equal(jumanah?.role, "Managing Partner");
  assert.equal(jumanah?.email, "jumanah@psrhomes.ae");
  assert.equal(jumanah?.fallbackImage, "/team/psr-advisors/jummanah.webp");
  assert.deepEqual(jumanah?.facts, ["PSR leadership", "Dubai South investment briefs", "Ready and off-plan comparison", "Transaction coordination"]);
  assert.deepEqual(jumanah?.languages, ["English", "Arabic"]);
  assert.equal(canonicalCbaTeamSlug("jummanah"), "jumanah");
  assert.equal(cbaTeamMember("jummanah")?.slug, "jumanah");
  assert.deepEqual(cbaTeam.slice(0, 5).map((member) => member.slug), [
    "sonu-sharma",
    "prateek-rawal",
    "reegan-negi",
    "parv-sondhi",
    "jumanah",
  ]);
  assert.match(jummanahMigration, /'jummanah@psrhomes\.ae'/);
  assert.match(jummanahMigration, /'Managing Partner'/);
  assert.match(jummanahMigration, /'Leadership'/);
  assert.doesNotMatch(jummanahMigration, /`role`\s*=\s*'admin'/);
  assert.match(jumanahNameMigration, /`display_name` = 'Jumanah'/);
  assert.match(jumanahNameMigration, /`email` = 'jummanah@psrhomes\.ae'/);
  assert.match(jumanahIdentityMigration, /'jumanah@psrhomes\.ae'/);
  assert.match(jumanahIdentityMigration, /`username`[^\n]+[\s\S]*'jumanah'/);
  assert.match(jumanahIdentityMigration, /`portfolio_slug` = 'jumanah'/);
  assert.match(jumanahIdentityMigration, /`mailbox` = 'jumanah@psrhomes\.ae'/);
  assert.match(jumanahIdentityMigration, /json_set\(`content_json`, '\$\.advisor\.email', 'jumanah@psrhomes\.ae'\)/);
  assert.match(jumanahContactMigration, /`phone` = '\+971 58 680 1148'/);
  assert.match(jumanahContactMigration, /`whatsapp_phone` = '\+971 58 680 1148'/);
  assert.equal(jumanahDubaiSouthPortfolio.length, 15);
  assert.equal(new Set(jumanahDubaiSouthPortfolio.map((project) => project.slug)).size, 15);
  assert.equal(jumanahDubaiSouthPortfolio.some((project) => /cresswell/i.test(project.slug)), false);
  assert.match(jumanahPortfolioMigration, /portfolio_public = 1/);
  assert.match(jumanahPortfolioMigration, /mag-5-boulevard-dubai-south/);
  assert.match(jumanahPortfolioMigration, /azizi-venice-dubai-south/);
});

test("staff language listings follow the approved PSR roster convention", () => {
  for (const member of cbaTeam) {
    const expectedLanguages = member.slug === "louay-betengane" || member.slug === "jumanah"
      ? ["English", "Arabic"]
      : member.slug === "janet-genabio"
        ? ["English", "Filipino"]
        : ["English", "Hindi"];
    assert.deepEqual(member.languages, expectedLanguages, member.name);
  }
});

test("the supplied portraits are stored under their confirmed identities", () => {
  for (const [identity, filename] of [
    ["Sourabh Das", "sourabh-das.webp"],
    ["Mazhar Khan", "mazhar-khan.webp"],
    ["Louay Betengane", "louay-betengane.webp"],
    ["Rohit Kumar Sinha", "rohit-kumar-sinha.webp"],
    ["Sonu Sharma", "sonu-sharma.webp"],
    ["Prateek Rawal", "prateek-rawal.webp"],
    ["Ujwal Kumar", "ujwal-kumar.webp"],
    ["Neshva Chundayil", "neshva-chundayil.webp"],
    ["Janet Genabio", "janet-genabio.webp"],
    ["Pratham Raval", "pratham-raval.webp"],
    ["Jumanah", "jummanah.webp"],
  ]) {
    const portrait = fs.readFileSync(new URL(`../public/team/psr-advisors/${filename}`, import.meta.url));
    assert.equal(portrait.subarray(0, 4).toString(), "RIFF", `${identity} should have a WebP portrait`);
    assert.equal(portrait.subarray(8, 12).toString(), "WEBP", `${identity} should have a WebP portrait`);
  }

  const bySlug = new Map(cbaTeam.map((member) => [member.slug, member]));
  assert.equal(bySlug.get("sourabh-das")?.fallbackImage, "/team/psr-advisors/sourabh-das.webp");
  assert.equal(bySlug.get("majhar-khan")?.fallbackImage, "/team/psr-advisors/mazhar-khan.webp");
  assert.equal(bySlug.get("louay-betengane")?.fallbackImage, "/team/psr-advisors/louay-betengane.webp");
  assert.equal(bySlug.get("rohit-kumar-sinha")?.fallbackImage, "/team/psr-advisors/rohit-kumar-sinha.webp");
  assert.equal(bySlug.get("sonu-sharma")?.fallbackImage, "/team/psr-advisors/sonu-sharma.webp");
  assert.equal(bySlug.get("ujwal-kumar")?.fallbackImage, "/team/psr-advisors/ujwal-kumar.webp");
  assert.equal(bySlug.get("neshva-chundayil")?.fallbackImage, "/team/psr-advisors/neshva-chundayil.webp");
  assert.equal(bySlug.get("janet-genabio")?.fallbackImage, "/team/psr-advisors/janet-genabio.webp");
  assert.equal(bySlug.get("pratham-raval")?.fallbackImage, "/team/psr-advisors/pratham-raval.webp");
  assert.equal(bySlug.get("reegan-negi")?.fallbackImage, "/team/psr-advisors/reegan-negi.webp");
  assert.equal(bySlug.get("jumanah")?.fallbackImage, "/team/psr-advisors/jummanah.webp");
  assert.equal(bySlug.get("neshva-chundayil")?.profileKind, "operations");
  assert.equal(bySlug.get("janet-genabio")?.profileKind, "operations");
  assert.deepEqual(bySlug.get("neshva-chundayil")?.facts, ["Finance operations", "Transaction accounting"]);
  assert.deepEqual(bySlug.get("janet-genabio")?.facts, ["Office coordination", "Team administration"]);
});
