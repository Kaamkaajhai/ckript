import { Link } from "react-router-dom";
import { ROUTES } from "../../_shared/theme";
import { FORMATS } from "./formats.data";
import "./Formats.css";

export default function Formats() {
  return (
    <section className="ckl-formats">
      <div className="ckl-formats-inner">
        <div className="ckl-formats-head" data-ra="ckl-fadeUp">
          <div className="ckl-kicker">Built for every story</div>
          <h2 className="ckl-h2">
            One platform.<br /><span className="ckl-h2-em">Every format.</span>
          </h2>
          <p className="ckl-lead ckl-formats-lead">
            From features to anime, writers showcase their work across every screen and every genre.
          </p>
        </div>

        <div className="ckl-format-grid">
          {FORMATS.map((f) => (
            <Link
              key={f.title}
              to={ROUTES.join}
              data-ra="ckl-fadeUp"
              data-rd={f.rd}
              className="ckl-format-card hov-format"
              style={{ marginTop: f.offset ? 34 : 0 }}
            >
              <img src={`https://picsum.photos/seed/${f.seed}/600/880`} alt="" />
              <div className="ckl-format-card-overlay" />
              <div className="ckl-format-card-cap">
                <div className="ckl-format-card-title">{f.title}</div>
                <div className="ckl-format-card-sub">{f.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
