import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ProfileWorkspaceActivity,
  ProfileWorkspaceBookmarks,
  ProfileWorkspaceOverview,
} from "./ProfileWorkspaceSections";

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

describe("profile workspace collections", () => {
  it("renders projected activity counts without raw relationship data", () => {
    const html = renderToStaticMarkup(<ProfileWorkspaceActivity posts={[{
      _id: "post-1",
      content: "Production update",
      counts: { likes: 3, comments: 2, saves: 1 },
      likes: ["viewer-secret"],
    }]} />);
    expect(html).toContain("Production update");
    expect(html).toContain("3 likes");
    expect(html).not.toContain("viewer-secret");
  });

  it("keeps the saved search controls visible when a server query has no matches", () => {
    const html = renderToStaticMarkup(<ProfileWorkspaceBookmarks
      scripts={[]}
      navigate={() => {}}
      query="missing"
      pagination={{ total: 0, savedTotal: 4, page: 1, totalPages: 1 }}
    />);
    expect(html).toContain("Search saved projects");
    expect(html).toContain("No saved projects match");
    expect(html).toContain("4 saved total");
  });
});
