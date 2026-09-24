import assert from "node:assert/strict";
import test from "node:test";
import { parsePropertyFinderProfileHtml, validPropertyFinderAgentUrl } from "../worker/property-finder-listings";

function profileHtml(agentEmail = "mehul@psrhomes.ae") {
  const data = {
    props: {
      pageProps: {
        agent: {
          name: "Mehul Mistry",
          email: agentEmail,
          totalProperties: 27,
        },
        property: {
          meta: { total_count: 22 },
          properties: [{
            id: "99976844",
            property_type: "Apartment",
            price: { value: 1_139_000, currency: "AED", period: "sell" },
            title: "Sea and pool view residence",
            location: { full_name: "Aya Beachfront Residences, Al Raudah, Umm Al Quwain" },
            images: [{ medium: "https://static.shared.propertyfinder.ae/media/images/listing/example/668x452.jpg" }],
            agent: { name: "Mehul Mistry", email: agentEmail },
            broker: { name: "HAUS&GRACE PROPERTIES" },
            bedrooms: "1",
            bathrooms: "2",
            size: { value: 656, unit: "sqft" },
            share_url: "https://www.propertyfinder.ae/en/plp/buy/apartment-for-sale-umm-al-quwain-al-raudah-aya-beachfront-residences-99976844.html",
            reference: "HG-TEST-1",
            listed_date: "2026-07-20T12:00:00Z",
            is_featured: true,
          }],
        },
      },
    },
  };
  return `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></body></html>`;
}

test("parses current listings for the canonical PSR advisor email", () => {
  const snapshot = parsePropertyFinderProfileHtml(profileHtml(), "mehul@psrhomes.ae");
  assert.equal(snapshot.agentEmail, "mehul@psrhomes.ae");
  assert.equal(snapshot.totalCount, 27);
  assert.equal(snapshot.listings.length, 1);
  assert.deepEqual(snapshot.listings[0], {
    externalId: "99976844",
    externalUrl: "https://www.propertyfinder.ae/en/plp/buy/apartment-for-sale-umm-al-quwain-al-raudah-aya-beachfront-residences-99976844.html",
    reference: "HG-TEST-1",
    title: "Sea and pool view residence",
    location: "Aya Beachfront Residences, Al Raudah, Umm Al Quwain",
    propertyType: "Apartment",
    listingType: "sale",
    bedrooms: "1",
    bathrooms: 2,
    sizeSqft: 656,
    priceAed: 1_139_000,
    imageUrl: "https://static.shared.propertyfinder.ae/media/images/listing/example/668x452.jpg",
    listedAt: "2026-07-20T12:00:00Z",
    featured: true,
  });
});

test("accepts the same local-part on the allowlisted legacy PSR domain", () => {
  const snapshot = parsePropertyFinderProfileHtml(
    profileHtml("mehul@psr.espacios.me"),
    "mehul@psrhomes.ae",
  );
  assert.equal(snapshot.agentEmail, "mehul@psrhomes.ae");
  assert.equal(snapshot.listings.length, 1);
});

test("rejects a different advisor across the two allowlisted PSR domains", () => {
  assert.throws(
    () => parsePropertyFinderProfileHtml(profileHtml("someone@psr.espacios.me"), "mehul@psrhomes.ae"),
    /No listings owned by this advisor/,
  );
});

test("does not treat an arbitrary domain as an equivalent advisor identity", () => {
  assert.throws(
    () => parsePropertyFinderProfileHtml(profileHtml("mehul@example.com"), "mehul@psrhomes.ae"),
    /No listings owned by this advisor/,
  );
  assert.throws(
    () => parsePropertyFinderProfileHtml(profileHtml(), "mehul@example.com"),
    /valid PSR advisor email/,
  );
});

test("accepts only secure Property Finder agent profile URLs", () => {
  assert.equal(
    validPropertyFinderAgentUrl("https://www.propertyfinder.ae/en/agent/mehulkumar-mistry-269366"),
    "https://www.propertyfinder.ae/en/agent/mehulkumar-mistry-269366",
  );
  assert.equal(validPropertyFinderAgentUrl("https://example.com/en/agent/mehulkumar-mistry-269366"), "");
  assert.equal(validPropertyFinderAgentUrl("https://www.propertyfinder.ae/en/broker/hausgrace-properties-7582"), "");
});
