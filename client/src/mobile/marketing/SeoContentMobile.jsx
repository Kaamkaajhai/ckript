import { Link, useLocation } from "react-router-dom";
import { useAuthModal } from "../../context/AuthModalContext";
import { homepageFaqs } from "../../seo/seoContent";
import { resolveSeoPageContent, titleFromPath } from "../../seo/seoPageContent";
import { LOGO_SRC } from "../../pages/landing/_shared/theme";
import Button from "../components/buttons/Button";
import MobileShell from "../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../shell/mobileShellModes";
import { landingAccountPath, landingActionLabels } from "./landingModel";
import "./SeoContentMobile.css";

export default function SeoContentMobile({ user = null }) {
  const { pathname } = useLocation();
  const { openAuthModal } = useAuthModal();
  const { content, found, seo, smartLinks } = resolveSeoPageContent(pathname);
  const labels = landingActionLabels(user);
  const accountPath = landingAccountPath(user);

  const appBar = (
    <header className="ckm-seo-page__bar">
      <Link className="ckm-seo-page__brand" to="/" aria-label="Ckript home">
        <img src={LOGO_SRC} alt="Ckript" width="3600" height="1028" />
      </Link>
      {user ? (
        <Button to={accountPath} size="sm" variant="tertiary">{labels.account}</Button>
      ) : (
        <Button size="sm" variant="tertiary" onClick={() => openAuthModal({ redirect: pathname })}>Sign in</Button>
      )}
    </header>
  );

  return (
    <MobileShell
      mode={MOBILE_SHELL_MODE.PUBLIC}
      screenId="seo-content"
      className="ckm-seo-page"
      appBar={appBar}
    >
      <article className="ckm-seo-page__page">
        <nav className="ckm-seo-page__trail" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          {seo.breadcrumbs.slice(1).map((item, index) => {
            const current = index === seo.breadcrumbs.length - 2;
            const href = new URL(item.item).pathname;
            return (
              <span key={item.item || item.name}>
                <i aria-hidden="true">/</i>
                {current ? <span aria-current="page">{item.name}</span> : <Link to={href}>{item.name}</Link>}
              </span>
            );
          })}
        </nav>

        <header className="ckm-seo-page__hero">
          <p className="ckm-seo-page__eyebrow">{content.eyebrow}</p>
          <h1>{content.h1 || seo.title}</h1>
          <p>{found ? seo.description : content.description}</p>
        </header>

        {content.eyebrow !== "FAQ" && content.sections.length ? (
          <section className="ckm-seo-page__chapters" aria-label="Ckript capabilities">
            {content.sections.map((section, index) => (
              <article key={section}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h2>{titleFromPath(section.split(" ").slice(0, 4).join("-"))}</h2>
                <p>{section}</p>
              </article>
            ))}
          </section>
        ) : null}

        {content.eyebrow === "FAQ" ? (
          <section className="ckm-seo-page__faq" aria-labelledby="seo-faq-title">
            <p className="ckm-seo-page__eyebrow">Straight answers</p>
            <h2 id="seo-faq-title">Frequently asked questions</h2>
            {homepageFaqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </section>
        ) : null}

        <aside className="ckm-seo-page__related" aria-labelledby="seo-related-title">
          <p className="ckm-seo-page__eyebrow">Keep exploring</p>
          <h2 id="seo-related-title">Related Ckript pages</h2>
          <nav aria-label="Related Ckript pages">
            {smartLinks.map((href) => (
              <Link key={href} to={href}>
                <span>{titleFromPath(href)}</span>
                <i aria-hidden="true">→</i>
              </Link>
            ))}
          </nav>
        </aside>

        <section className="ckm-seo-page__cta" aria-labelledby="seo-cta-title">
          <p className="ckm-seo-page__eyebrow">From reading to doing</p>
          <h2 id="seo-cta-title">Put the next story in motion.</h2>
          <p>Develop, package, discover, and move entertainment projects forward in one connected marketplace.</p>
          {user ? (
            <Button to={accountPath} fullWidth>{labels.account}</Button>
          ) : (
            <Button fullWidth onClick={() => openAuthModal({ redirect: pathname })}>Join Ckript</Button>
          )}
        </section>

        <footer className="ckm-seo-page__footer">
          <Link to="/privacy-policy">Privacy</Link>
          <Link to="/terms-of-service">Terms</Link>
          <Link to="/contact">Contact</Link>
          <p>© Ckript Technologies Private Limited</p>
        </footer>
      </article>
    </MobileShell>
  );
}
