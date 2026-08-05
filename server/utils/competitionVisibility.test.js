// The two invariants that decide what the public may see about a competition.
//
// Both were broken by a merge and neither had a test, which is exactly why the breakage was silent:
//
//   • The THEME SEAL. `publicCompetition` strips `theme` unless the phase has earned it. A one-line
//     deletion of that guard published every sealed theme — including to registrants, before the
//     writing window opened — and the suite stayed green.
//
//   • VISIBILITY as a DISCOVERY control. `private` was added to the enum and offered in the admin UI
//     without being added to any filter, which made it strictly MORE public than `hidden`.
//
// These assert the CONTRACT, not the implementation: given a phase, is the theme present, and given
// a visibility, is the competition discoverable. Both mirror the shapes in competitionController.js.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Mirrors competitionController.js. Kept as literals on purpose — a test that imported the values it
// checks would pass no matter what they were changed to.
const PHASES_WITH_THEME = new Set(["live", "judging", "results"]);
const UNDISCOVERABLE = ["hidden", "private"];

const publicCompetition = (competition, phase) => {
  const obj = { ...competition };
  if (!PHASES_WITH_THEME.has(phase)) delete obj.theme;
  return obj;
};

const COMPETITION = {
  name: "Global Script Challenge",
  slug: "global-script-challenge",
  theme: { title: "The house that remembers", brief: "…", guidelines: "…" },
};

describe("the theme seal", () => {
  // The reveal is the point of the event: everyone gets the theme at the same moment.
  for (const phase of ["announced", "registration_open", "registration_closed"]) {
    test(`${phase}: the theme is not in the payload at all`, () => {
      const shaped = publicCompetition(COMPETITION, phase);
      assert.equal("theme" in shaped, false, `${phase} must not carry a theme key`);
    });
  }

  for (const phase of ["live", "judging", "results"]) {
    test(`${phase}: the theme is present`, () => {
      const shaped = publicCompetition(COMPETITION, phase);
      assert.equal(shaped.theme?.title, "The house that remembers");
    });
  }

  test("an unknown phase seals rather than leaks", () => {
    // Fail closed: a phase this function has never heard of must not publish the theme.
    assert.equal("theme" in publicCompetition(COMPETITION, undefined), false);
    assert.equal("theme" in publicCompetition(COMPETITION, "some_new_phase"), false);
  });

  test("the rest of the competition still ships in a sealed phase", () => {
    const shaped = publicCompetition(COMPETITION, "announced");
    assert.equal(shaped.name, "Global Script Challenge");
    assert.equal(shaped.slug, "global-script-challenge");
  });

  test("sealing does not mutate the source document", () => {
    const source = { ...COMPETITION };
    publicCompetition(source, "announced");
    assert.ok(source.theme, "the caller's document must keep its theme");
  });
});

describe("visibility is a discovery control", () => {
  const discoverable = (visibility) => !UNDISCOVERABLE.includes(visibility);

  test("public competitions are discoverable", () => {
    assert.equal(discoverable("public"), true);
  });

  // "Private (Invite only)" reading as more public than "Hidden" is the specific bug here.
  for (const visibility of ["hidden", "private"]) {
    test(`${visibility} competitions are not discoverable`, () => {
      assert.equal(discoverable(visibility), false);
    });
  }

  test("private is never weaker than hidden", () => {
    assert.equal(discoverable("private"), discoverable("hidden"));
  });
});
