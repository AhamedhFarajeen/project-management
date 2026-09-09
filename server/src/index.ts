import "dotenv/config";
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import { requireAppUser } from "./middleware/auth";
import bodyParser from "body-parser";
import cors from "cors";
import { getAllowedOrigins, getCorsOptions } from "./config/cors";
import helmet from "helmet";
import morgan from "morgan";
import projectRoutes from "./Routes/projectRoutes";
import taskRoutes from "./Routes/taskRoutes";
import searchRoutes from "./Routes/searchRoutes";
import userRoutes from "./Routes/userRoutes";
import teamRoutes from "./Routes/teamRoutes";


/* ROUTE IMPORTS */
const app = express();
app.use(express.json( ));
app.use(helmet( ));
app.use(helmet.crossOriginResourcePolicy({policy: "cross-origin"}));
app.use(morgan("common")); 
app.use(bodyParser.json());

const allowedOrigins = getAllowedOrigins();
app.use(cors(getCorsOptions(allowedOrigins)));

/* ROUTES */
app.get("/", (req, res) => {
    res. send( "This is home route");
})

if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
  throw new Error("CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY must be configured");
}
app.use(clerkMiddleware({ authorizedParties: allowedOrigins }));
app.use(requireAppUser);

app.use("/projects", projectRoutes)
app.use("/tasks", taskRoutes);
app.use("/search", searchRoutes);
app.use("/users", userRoutes);
app.use("/teams", teamRoutes);



/* SERVER */

const port = Number(process.env.PORT) || 8000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});