import { TESTIMONIALS } from "./testimonials.data";
import "./Testimonials.css";

export default function Testimonials() {
  return (
    <section className="ckl-testi">
      <div className="ckl-testi-inner">
        <div className="ckl-testi-head" data-ra="ckl-fadeUp">
          <div className="ckl-kicker">Testimonials</div>
          <h2 className="ckl-h2">
            From the people<br /><span className="ckl-h2-em">who build films.</span>
          </h2>
        </div>

        <div className="ckl-testi-grid">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="ckl-testi-card" data-ra="ckl-fadeUp" data-rd={t.rd}>
              <div className="ckl-testi-quote-mark">&ldquo;</div>
              <p className="ckl-testi-quote">{t.quote}</p>
              <p className="ckl-testi-body">{t.body}</p>
              <div className="ckl-testi-foot">
                <img
                  className="ckl-testi-avatar"
                  src={t.avatar}
                  alt={`${t.name}, ${t.role}`}
                  width="256"
                  height="256"
                  loading="lazy"
                  decoding="async"
                />
                <div className="ckl-testi-meta">
                  <div className="ckl-testi-name">{t.name}</div>
                  <div className="ckl-testi-role">{t.role}</div>
                </div>
                <span className="ckl-testi-tag">{t.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
