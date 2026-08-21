import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import projectRoutes from "./Routes/projectRoutes";
import taskRoutes from "./Routes/taskRoutes";
import searchRoutes from "./Routes/searchRoutes";
import userRoutes from "./Routes/userRoutes";
import teamRoutes from "./Routes/teamRoutes";


/* ROUTE IMPORTS */
dotenv.config();
const app = express();
app.use(express.json( ));
app.use(helmet( ));
app.use(helmet.crossOriginResourcePolicy({policy: "cross-origin"}));
app.use(morgan("common")); 
app.use(bodyParser.json());

/* ROUTES */
app.get("/", (req, res) => {
    res. send( "This is home route");
})

app.use(cors());

app.use("/projects", projectRoutes)
app.use("/tasks", taskRoutes);
app.use("/search", searchRoutes);
app.use("/users", userRoutes);
app.use("/teams", teamRoutes);



/* SERVER */

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on part ${port}`);
});