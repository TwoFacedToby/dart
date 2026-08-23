import dotenv from "dotenv";

dotenv.config();
export const inProduction = process.env.NODE_ENV === "production";
