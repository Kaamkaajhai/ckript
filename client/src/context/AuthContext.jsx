import { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const login = async (email, password) => {
    const { data } = await axios.post("http://localhost:5001/api/auth/login", { email, password });
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
  };

  const signup = async (formData) => {
    const { data } = await axios.post("http://localhost:5001/api/auth/signup", formData);
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
