import { useSearchParams } from "react-router-dom";
import {
  normalizeReaderDiscoverPage,
  READER_HOME_STATUS,
} from "../../pages/reader-home/readerHome";
import ReaderDiscoverMobile from "../screens/reader/ReaderDiscoverMobile";
import ReaderHomeMobile from "../screens/reader/ReaderHomeMobile";

const retry = () => {};
const project = (id, title, genre = "Drama") => ({
  _id: id,
  title,
  genre,
  contentType: "movie",
  status: "published",
  logline: "A determined outsider risks everything to bring a buried story into the light.",
  views: 1280,
  readsCount: 214,
  rating: 4.6,
  verifiedBadge: true,
  creator: { _id: `writer-${id}`, name: "Maya Rao", username: "maya-rao" },
  scriptScore: { overall: 86 },
});

const projects = [
  project("reader-1", "The Last Lantern"),
  project("reader-2", "A Map of Rain", "Mystery"),
  project("reader-3", "After the Monsoon"),
];

export default function ReaderWorkspaceHarness({ user }) {
  const [params] = useSearchParams();
  const view = params.get("view") || "home";
  const state = params.get("state") || "ready";
  const fixtureUser = {
    ...user,
    _id: "preview-reader",
    name: "Leela Thomas",
    role: "reader",
    favoriteScripts: [projects[1]._id],
  };

  if (view === "discover") {
    const previewState = state === "loading"
      ? { status: READER_HOME_STATUS.LOADING, data: null, retry }
      : state === "error"
        ? { status: READER_HOME_STATUS.FAILED, data: null, failure: { message: "Reader discovery is unavailable." }, retry }
        : {
          status: READER_HOME_STATUS.READY,
          data: normalizeReaderDiscoverPage({
            scripts: state === "empty" ? [] : projects,
            page: 1,
            total: state === "empty" ? 0 : 15,
            totalPages: state === "empty" ? 1 : 5,
          }),
          retry,
        };
    return <ReaderDiscoverMobile user={fixtureUser} previewState={previewState} />;
  }

  const readyData = {
    read: projects.slice(0, 2),
    favorites: projects.slice(1, 2),
    fresh: projects,
    counts: { read: 8, favorites: 3 },
    degraded: state === "partial" ? { fresh: false, read: false, favorites: true } : {},
  };
  const previewState = state === "loading"
    ? { status: READER_HOME_STATUS.LOADING, data: null, retry }
    : state === "error"
      ? { status: READER_HOME_STATUS.FAILED, data: null, failure: { message: "Your reader home is unavailable." }, retry }
      : {
        status: READER_HOME_STATUS.READY,
        data: state === "empty"
          ? { read: [], favorites: [], fresh: [], counts: { read: 0, favorites: 0 }, degraded: {} }
          : readyData,
        retry,
      };
  return <ReaderHomeMobile user={fixtureUser} previewState={previewState} />;
}
