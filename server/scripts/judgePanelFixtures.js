/**
 * The documents judgePanelSmoke.js seeds, as plain objects.
 *
 * Extracted so they can be validated against the real schemas WITHOUT a database — see
 * judgePanelFixtures.test.js, which runs in the ordinary suite.
 *
 * That test exists because of a specific failure: the first live run of the smoke script died at
 * seeding on four required CompetitionEntry fields (registration.language, .experienceLevel,
 * acceptedRulesAt, acceptedCopyrightAt) that no test had ever exercised. Every other test for the
 * judge panel hands a plain object to a pure function or a stubbed handler, so the schema was never
 * in the loop — a whole class of mistake that only a live run could catch, and only after a round
 * trip through someone else's machine.
 *
 * `validateSync()` closes that: it runs required/enum/maxlength offline, in milliseconds, with no
 * connection. Keeping the shapes HERE rather than inline in the script is what stops the test and
 * the script drifting into validating different things.
 */

export const TAG = "smoke-judge-";

const DAY = 86_400_000;

/**
 * @param {number} now epoch ms, passed in so the caller controls the clock and the ids stay stable
 *                     within a run (eventId and slug are unique, so they carry it)
 */
export const buildFixtures = (now = Date.now()) => {
  const eventIds = {
    a: `${TAG}A1-${now}`,
    b: `${TAG}B2-${now}`,
    d: `${TAG}D3-${now}`,
    f: `${TAG}F4-${now}`,
  };

  const users = {
    writer: { name: "Smoke Writer", email: `${TAG}writer@example.com`, password: "Smoke!Pass9", role: "creator", emailVerified: true },
    // A SECOND writer, because CompetitionEntry has a unique index on (competitionId, userId): one
    // entry per writer per competition. The first live run died here — two entries for one writer in
    // one competition — and no offline check could have caught it, since an index is not a validator.
    writer2: { name: "Smoke Writer Two", email: `${TAG}writer2@example.com`, password: "Smoke!Pass9", role: "creator", emailVerified: true },
    judge: { name: "Smoke Judge", email: `${TAG}judge@example.com`, password: "Smoke!Pass9", role: "judge", emailVerified: true },
    otherJudge: { name: "Smoke Judge Two", email: `${TAG}judge2@example.com`, password: "Smoke!Pass9", role: "judge", emailVerified: true },
  };

  // Dated so getCompetitionPhase() derives "judging": submissions closed, results not declared.
  const dates = {
    regOpensAt: new Date(now - 10 * DAY),
    regClosesAt: new Date(now - 5 * DAY),
    startsAt: new Date(now - 4 * DAY),
    endsAt: new Date(now - DAY),
  };

  const competitions = {
    main: {
      name: `${TAG}Challenge`,
      slug: `${TAG}challenge-${now}`,
      dates,
      judging: {
        scale: 10,
        criteria: [
          { key: "structure", label: "Structure", weight: 3, order: 0 },
          { key: "dialogue", label: "Dialogue", weight: 2, order: 1 },
          { key: "originality", label: "Originality", weight: 1, order: 2 },
        ],
        awards: [{ key: "dialogue-award", label: "Best Dialogue", order: 0 }],
      },
    },
    other: { name: `${TAG}Other`, slug: `${TAG}other-${now}`, dates },
  };

  /**
   * CompetitionEntry requires more than the judging code ever reads. Centralised so a future
   * required field is one edit, and so the offline test catches it before anyone runs the script.
   */
  const entry = (overrides = {}) => ({
    registration: { country: "India", language: "Malayalam", experienceLevel: "intermediate" },
    acceptedRulesAt: new Date(now - 6 * DAY),
    acceptedCopyrightAt: new Date(now - 6 * DAY),
    status: "submitted",
    submittedAt: new Date(now - 2 * DAY),
    ...overrides,
  });

  /**
   * Each entry declares WHICH competition and WHICH writer it belongs to, by key.
   *
   * That pairing is not decoration: CompetitionEntry has a unique index on (competitionId, userId),
   * so two entries sharing a slot is a duplicate-key error at seed time. Declaring it here lets the
   * offline test assert the slots are distinct — the nearest thing to checking an index without a
   * database, and the check that would have caught the first live failure.
   */
  const entries = {
    // Deliberately carries every identifying field the model can hold, plus a TYPED-IN Fountain
    // title page, so the anonymisation checks have something real to fail on.
    a: {
      competition: "main", user: "writer",
      build: (writerName, writerEmail) => entry({
        eventId: eventIds.a,
        registration: {
          country: "India", language: "Malayalam", experienceLevel: "intermediate",
          portfolioUrl: "https://smoke-writer.example.com",
        },
        payment: { orderId: "order_SMOKE_LEAK", paymentId: "pay_SMOKE_LEAK", amount: 499 },
        ai: { evaluation: { overall: 91, notes: "AI thinks this is strong" } },
        snapshot: {
          title: "The Last Monsoon",
          logline: `A village resurfaces. Written by ${writerName}.`,
          synopsis: `Reach me at ${writerEmail}.`,
          fountainContent: `Title: The Last Monsoon\nAuthor: ${writerName}\nContact: ${writerEmail}\n\nINT. FERRY JETTY - DAWN\n\nRain hammers the tin roof.`,
          textContent: "INT. FERRY JETTY - DAWN",
          pageCount: 12, wordCount: 2780, sceneCount: 9,
        },
      }),
    },
    // A DIFFERENT writer from entry A, in the same competition — see the index note above.
    b: {
      competition: "main", user: "writer2",
      build: () => entry({
        eventId: eventIds.b,
        snapshot: { title: "Second Script", fountainContent: "INT. KITCHEN - NIGHT", pageCount: 8, wordCount: 1900, sceneCount: 5 },
      }),
    },
    draft: {
      competition: "main", user: "otherJudge",
      build: () => entry({
        eventId: eventIds.d, status: "registered", submittedAt: null,
        snapshot: { title: "Not Submitted", fountainContent: "INT. NOWHERE - DAY" },
      }),
    },
    // Same writer as entry A, but a different competition, so the pair is still unique.
    foreign: {
      competition: "other", user: "writer",
      build: () => entry({
        eventId: eventIds.f,
        snapshot: { title: "Other Competition", fountainContent: "INT. ELSEWHERE - DAY" },
      }),
    },
  };

  const scores = {
    submitted: { scores: { structure: 10, dialogue: 6, originality: 8 }, status: "submitted", submittedAt: new Date(now) },
    second: { scores: { structure: 6, dialogue: 8, originality: 4 }, status: "submitted", submittedAt: new Date(now) },
    draft: { scores: { structure: 9 }, status: "draft" },
  };

  const nomination = { awardKey: "dialogue-award", reason: "Every line earns its place" };

  return { eventIds, users, competitions, entries, scores, nomination };
};

export default buildFixtures;
