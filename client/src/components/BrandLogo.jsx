import { Link } from "react-router-dom";

const BrandLogo = ({ className = "h-10 w-auto", title = "Ckript" }) => {
  const logoSrc = "/cklogo-nobg.png";

  return (
    <Link to="/" className="inline-flex items-center" aria-label="Go to home page" title={title}>
      <img
        src={logoSrc}
        alt="Ckript"
        className={`${className} object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.12)]`}
      />
    </Link>
  );
};

export default BrandLogo;
