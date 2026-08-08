// Can a signup body make this server call a host we did not choose?
//
// The postal lookup interpolates a user-supplied postal code into a URL. Both callers validate it
// today, which is why the hole was never exploitable — but the validation lived in the callers, and
// a guarantee held one level away from the sink is the normal way server-side request forgery comes
// back. These pin the behaviour at the sink itself.
//
// No network is touched: every rejection happens before fetch is reached.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { POSTAL_API_ORIGINS, resolveAllowedUrl, asPostalPathSegment } from "./outboundRequest.js";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("the outbound allowlist refuses everything it did not choose", () => {
  for (const origin of POSTAL_API_ORIGINS) {
    test(`allows ${origin}`, () => {
      assert.equal(resolveAllowedUrl(`${origin}/pincode/411001`).origin, origin);
    });
  }

  const attacks = [
    ["a plain external host", "https://attacker.example/steal"],
    // The classic bypass: everything before "@" is credentials, so the real host is the attacker's.
    ["credentials smuggled before the host", "https://api.postalpincode.in@attacker.example/x"],
    ["the cloud metadata endpoint", "http://169.254.169.254/latest/meta-data/"],
    ["localhost", "http://127.0.0.1:5002/admin/users"],
    ["an internal address", "http://10.0.0.5/"],
    ["a non-http scheme", "file:///etc/passwd"],
    // Same host, wrong scheme — a silent downgrade to plaintext is not a caller's to choose.
    ["the right host over http", "http://api.postalpincode.in/pincode/411001"],
    ["a lookalike suffix", "https://api.postalpincode.in.attacker.example/x"],
    ["a non-standard port on the right host", "https://api.postalpincode.in:8443/x"],
  ];

  for (const [name, url] of attacks) {
    test(`refuses ${name}`, () => {
      assert.throws(() => resolveAllowedUrl(url), /non-allowlisted origin/);
    });
  }

  test("refuses a malformed URL rather than passing it to fetch", () => {
    assert.throws(() => resolveAllowedUrl("not a url"), /malformed URL/);
  });
});

describe("a postal code reaches the URL only as a single encoded path segment", () => {
  test("an Indian PIN passes through unchanged", () => {
    assert.equal(asPostalPathSegment("411001"), "411001");
  });

  test("a spaced or hyphenated international code survives, encoded", () => {
    // Rejecting these would break signup for everyone outside India — the fix must not cost that.
    assert.equal(asPostalPathSegment("SW1A 1AA"), "SW1A%201AA");
    assert.equal(asPostalPathSegment("K1A-0B1"), "K1A-0B1");
  });

  for (const [name, value] of [
    ["path traversal", "../../admin"],
    ["an encoded traversal", "%2e%2e%2fadmin"],
    ["a query-string append", "411001?x=1"],
    ["a fragment", "411001#x"],
    ["a full URL", "https://attacker.example/"],
    ["a CRLF injection", "411001\r\nX-Injected: 1"],
    ["an empty value", ""],
    ["a null", null],
    ["an object", { toString: () => "../../etc" }],
  ]) {
    test(`refuses ${name}`, () => {
      assert.equal(asPostalPathSegment(value), "", `${JSON.stringify(String(value))} produced a segment`);
    });
  }

  test("nothing that survives the guard can change the URL's host, depth or query", () => {
    for (const value of ["411001", "SW1A 1AA", "K1A-0B1"]) {
      const url = resolveAllowedUrl(`https://api.postalpincode.in/pincode/${asPostalPathSegment(value)}`);
      assert.equal(url.origin, "https://api.postalpincode.in");
      assert.equal(url.pathname.split("/").length, 3, `"${value}" changed the path depth`);
      assert.equal(url.search, "");
      assert.equal(url.username, "");
    }
  });
});

describe("the controller actually uses the guard", () => {
  // The tests above prove the utility is correct. This one proves authController reaches it — the
  // utility being right is worth nothing if the fetch site quietly builds its own URL again.
  const source = fs.readFileSync(path.join(here, "..", "controllers", "authController.js"), "utf8");

  test("imports the shared allowlist", () => {
    assert.match(source, /import\s*\{[^}]*resolveAllowedUrl[^}]*\}\s*from\s*["']\.\.\/utils\/outboundRequest\.js["']/);
  });

  test("no postal fetch builds a bare URL of its own", () => {
    assert.match(source, /const target = resolveAllowedUrl\(url\)/);
    assert.doesNotMatch(source, /await fetch\(`http/, "a fetch is bypassing the allowlist");
  });

  test("both providers encode the postal code before interpolating it", () => {
    const interpolations = source.match(/fetchJsonWithTimeout\(`[^`]+`\)/g) || [];
    assert.ok(interpolations.length >= 2, "expected both postal providers");
    for (const call of interpolations) {
      assert.match(call, /\$\{segment\}/, `${call} interpolates something other than the guarded segment`);
    }
  });
});
