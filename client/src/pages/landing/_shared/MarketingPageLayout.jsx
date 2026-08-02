/*
 * MarketingPageLayout — the landing's chrome around a standalone marketing page.
 *
 * The homepage is one long scroll that opens with the hero, so its nav lives
 * inside Hero's stage. A page like /challenges has no hero to hang it on, and
 * before this it grew a slim logo-and-one-link header of its own — which meant
 * a visitor who clicked "Challenge" in the nav arrived somewhere the nav had
 * vanished.
 *
 * This gives those pages the same navbar and the same footer, from the same two
 * components the homepage uses, so there is no second copy to drift.
 *
 * landing.css is imported here rather than by the page: `.ckl` carries the
 * custom properties the nav and footer read, so it is the chrome's dependency,
 * not the content's. A page's own stylesheet stays self-contained.
 */
import MarketingNav from "./MarketingNav";
import Footer from "../sections/Footer/Footer";
import "../landing.css";

export default function MarketingPageLayout({ children, className = "" }) {
  return (
    <div className={`ckl ckl-marketing-page ${className}`.trim()}>
      <MarketingNav page />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
