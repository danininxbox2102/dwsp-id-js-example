import express from 'express'
import cors from 'cors'
import {apiRouter} from "./apiRouter";
import * as path from "node:path";
import {initDB} from "./database";
import dotenv from "dotenv";
import cookieParser from 'cookie-parser'

initDB().then()

dotenv.config({path: './src/config/secret.env'})

// Отключаем проверку SSL сертификата
// Крайне рекомендую убрать эту строчку кода
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

if (!process.env.DWSP_CLIENT_ID) {
    console.error("No DWSP_CLIENT_ID provided in @/config/secret.env");
    process.exit(1);
}

if (!process.env.DWSP_CLIENT_SECRET) {
    console.error("No DWSP_CLIENT_SECRET provided in @/config/secret.env");
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.error("No JWT_SECRET provided in @/config/secret.env");
    process.exit(1);
}

const app = express()

// Middleware
app.use(express.json())
app.use(cors())
app.use(express.static('public'))
app.use(cookieParser())

// frontend

app.get("/", (req: express.Request, res: express.Response) => {
    res.sendFile("index.html");
})

app.get("/auth", (req: express.Request, res: express.Response) => {
    const authPagePath = path.join(__dirname, "../public/auth/index.html");
    res.sendFile(authPagePath);
})

// API

app.use("/api", apiRouter)

app.listen(8080, () => {
    console.log("Server is running on port 8080");
});

