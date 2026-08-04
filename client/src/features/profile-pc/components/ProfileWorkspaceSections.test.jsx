import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileWorkspaceOverview } from "./ProfileWorkspaceSections";

describe("ProfileWorkspaceOverview", () => {
  it("renders an investor overview with the editorial professional brief", () => {
    const html = renderToStaticMarkup(
      <ProfileWorkspaceOverview
        profile={{
          role: "investor",
          bio: "Backing ambitious, character-led stories.",
          address: { city: "Mumbai", country: "India" },
          skills: ["Development", "Film finance"],
          industryProfile: {
            company: "North Star Pictures",
            jobTitle: "Managing Partner",
            subRole: "angel_investor",
            mandates: {
              genres: ["Drama", "Thriller"],
              formats: ["Feature"],
              specificHooks: ["Debut voices"],
              excludeGenres: ["Reality"],
            },
          },
        }}
        scripts={[]}
        isOwnProfile
        navigate={() => {}}
      />,
    );

    expect(html).toContain("Professional brief &amp; investment focus");
    expect(html).toContain("North Star Pictures");
    expect(html).toContain("Angel Investor");
    expect(html).toContain("Debut Voices");
    expect(html).not.toContain("Projects ·");
  });
});
