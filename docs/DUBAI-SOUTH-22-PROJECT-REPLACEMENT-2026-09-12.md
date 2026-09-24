# Dubai South replacement shortlist

The user supplied 22 projects and explicitly replaced the earlier shortlist. The authoritative new intake is `data/dubai-south-floorplan-register.json`. Previous delivered financial reports and the public catalogue have not been deleted or represented as updated.

## Implemented locally

- 22 distinct project records, with source pages, retrieval timestamps, published layouts and downloaded-image SHA-256 checksums.
- 13 projects have visually inspected one-bedroom reference images. Nine remain pending; no generated plans or wrong-building substitutes were inserted.
- A Venice 14 Building G drawing is now published in Property Finder's library. The reviewed Building G drawing replaces the initially proposed Building A reference. It remains a building reference, not a verified selected-unit drawing.
- New report snapshots use reviewed references for matching projects, preserve provenance and qualification, and reject bedroom mismatches. An empty reviewed collection prevents fallback to older imported floorplans. Saved historical reports retain their own snapshots.
- A 23-page internal floorplan review PDF preserves the original drawings, links to sources, lists all 22 projects and identifies outstanding source checks.

## Outstanding before client issue

Suitable one-bedroom source/match confirmation: The Pulse Residence Park B3, The Harmony 2, Celestia B, Seraya by Zoya, Golf Point Tower 2, Golf Trails, South Living, Enre Residence, Terra Heights Building 2.

The three priced client reports and their online presentations have NOT yet been rebuilt from this new shortlist. Revalidate selected-unit availability, price, area, payment schedule and itemised fees before assigning records to the ready <= AED 1.2M all-in, off-plan <= AED 1.7M all-in, and above-budget off-plan reports. Do not transfer old project financial assumptions to newly named buildings. ROI/rent belong only in the ready report. The register is a floorplan-intake source, not an inventory or price feed.

No deployment was performed by this change. Do not call the new register a live Agent Workspace shortlist preset: the resolver is integrated locally, but catalogue selection and the three financial datasets still require replacement and verification.

## Verification

- 25 tests passed across `tests/curated-brief.test.ts` and `tests/dubai-south-floorplans.test.ts`, including new snapshot integration, building/bedroom rejection, existing report rendering and legacy snapshot behavior.
- Standalone TypeScript checking of the new resolver passed. Both changed TypeScript modules transpiled without syntax diagnostics.
- Full-repository TypeScript checking did not finish and was stopped after over six minutes without output. No production build or deployment is claimed.
- All PDF pages rendered successfully; source-image contact sheets and representative cover, register, plan and pending-source pages were visually inspected.
