import app from "../server.js";
import contactRoutes from "./contactRoutes.js";
import verificationRoutes from "./verificationRoutes.js";

app.use("/contact", contactRoutes);
app.use("/verification", verificationRoutes);

export default app;
