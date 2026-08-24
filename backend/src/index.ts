import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./config/routes";
import authRoutes from "./endpoints/auth/postVerify";
import { accessKeyMiddleware } from "./utils/accessKey";
import { errorHandler } from "./middleware/ErrorHandler";
import { createTables } from "./config/migration";
import { seedPlayers } from "./config/seedPlayers";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "X-App-Key"],
}));

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));
app.use("/api/auth", authRoutes);
app.use("/api", accessKeyMiddleware, routes);
app.use(errorHandler);

async function startServer() {
    await createTables();
    await seedPlayers();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer();
