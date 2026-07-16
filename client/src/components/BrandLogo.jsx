import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const BrandLogo = ({ className = "h-10 w-auto" }) => {
  const { user } = useContext(AuthContext);

  const handleClick = (e) => {
    if (!user) return;
    e.preventDefault();
    window.location.href = "/";
  };

  return (
    <Link to="/" onClick={handleClick} className="flex items-center">
      <img
        src="/ckript-logo-official-nobg.png"
        alt="Ckript Logo"
        className={`${className} object-contain`}
      />
    </Link>
  );
};

export default BrandLogo;