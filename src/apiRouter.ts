import express from "express";
import {Response} from "express";
import bcrypt from 'bcrypt';
import {v4 as uuid} from 'uuid';
import {getAccount, getAccountByDwsp, getAccountById, saveAccount} from "./database";
import jwt from "jsonwebtoken";

const DWSP_ADDR = "https://31.133.60.137:3001"


const router = express.Router();

export const apiRouter = router;

router.post("/login", async (req, res) => {
    const data = req.body;

    if (!data || !data.username || !data.password) {
        return res.status(400).send({error:"Data required"});
    }

    const account = await getAccount(data.username);

    if (!account) {
        return res.status(403).send({error:"Wrong username or password"});
    }

    const isValid = bcrypt.compare(data.password, account.password);

    if (!isValid) {
        return res.status(403).send({error:"Wrong username or password"});
    }

    const tokenPayload = {
        sub: account.uuid
    }

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET||"", {algorithm: "HS256",expiresIn:"1h"})

    res.cookie("accessToken", token, {
        httpOnly: true,
        sameSite: "lax",
        path: '/',
        domain:"localhost",
        expires: new Date(Date.now() + 216000000),
    });

    res.json({success:true});

    console.log(`User ${data.username} logged in successfully.`);

})

router.post("/register", async (req: express.Request, res: express.Response) => {
    const data = req.body;



    if (!data || !data.username || !data.password) {
        return res.status(400).send({error:"Data required"});
    }

    const existingAccount = await getAccount(data.username);

    if (existingAccount) {
        return res.status(409).send({error:"Account already exists"});
    }

    bcrypt.hash(data.password, 12, async function(err, hash) {
        if (err) {
            return res.status(500).send({error: err});
        }

        const uid = uuid()

        await saveAccount(data.username, hash, uid);

        const tokenPayload = {
            sub: uid
        }

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET||"", {algorithm: "HS256",expiresIn:"1h"})

        res.cookie("accessToken", token, {
            httpOnly: true,
            sameSite: "lax",
            path: '/',
            domain:"localhost",
            expires: new Date(Date.now() + 216000000),
        });

        res.json({success:true});
        console.log(`User ${data.username} registered successfully.`);
    });
})

// Эндпоинт для выхода из аккаунта
router.get("/logout", (req: express.Request, res: express.Response) => {
    res.clearCookie("accessToken");
    res.json({success:true,msg:"Logged out"});
})

// Имитируем логику для которой нужна авторизация
router.get("/users/me", async (req: express.Request, res: express.Response) => {
    // Рекомендуется выносить проверку токена в отдельный middleware
    const token = req.cookies.accessToken;

    if (!token) {
        // Пользователь не предоставил токен, он не авторизован
        console.warn("No token provided")
        res.status(401).send({error:"Token required"});
        return
    }

    try {
        // Валидируем JWT
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET||"");

        if (!decodedToken) {
            // Неверный или просроченный токен
            console.warn("Invalid or expired token")
            res.status(401).send({error:"Token invalid"});
            return
        }

        const userId:string|undefined = decodedToken.sub as string|undefined;

        if (!userId) {
            // Айди пользователя нет в токене,
            // Можно вернуть и 500 статус-код, но для простоты пусть будет 401
            console.warn("No user id in token:")
            console.warn(decodedToken)
            res.status(401).send({error:"Token invalid"});
            return
        }

        const account = await getAccountById(userId);

        if (!account) {
            // Пользователь не существует
            // Можно вернуть и 404 статус-код, но опять же, для простоты пусть будет 401
            console.warn("User: "+userId+" dont exists")
            res.status(401).send({error:"Token invalid"});
            return
        }


        const respAccount = {
            username:account.username,
            uuid:account.uuid,
            createdAt: account.createdAt,
            dwspConnected: account.dwspId !== null,
        }

        // Возвращаем аккаунт клиенту
        res.status(200).json({success:true,account:respAccount});
    } catch (e) {
        // Неверный или просроченный токен
        console.warn("Invalid or expired token:")
        console.warn(e)
        res.status(401).send({error:"Token invalid"});
        return
    }
})

interface AppCredentials {
    authorizationCode: string;
    clientId: string;
    clientSecret: string;
}
const getPublicApiToken = async (credentials:AppCredentials, res: Response) => {

    try {
        const tokenHeaders = { Accept: 'application/json', 'content-type': 'application/json' };
        const tokenUrl = DWSP_ADDR+"/s/auth/oauth/token";
        const body = {
            authorizationCode: credentials.authorizationCode,
            clientId:credentials.clientId,
            clientSecret:credentials.clientSecret,
        }

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: tokenHeaders,
            body: JSON.stringify(body),
        })

        if(response.status !== 200) {
            const data = await response.json()
            console.error("Failed to get access token ("+response.status+"): ");
            console.error(data)

            res.status(500).send({error:"Something went wrong. Try again later"});
            return null
        }

        const data = await response.json()
        const token = data.token;

        if(!token) {
            console.error("Failed to get access token: token is null");
            res.status(500).send({error:"Something went wrong. Try again later"});
            return null
        }

        return token
    } catch (e){
        console.error("Failed to get access token:",e);
        res.status(500).send({error:"Internal error. Try again later"});
        return null
    }
}

const useDwspApi = async (publicApiToken:string, res:Response) => {
    try {
        const uInfoHeaders = { Accept: 'application/json', 'api-token': publicApiToken };
        const uInfoUrl = DWSP_ADDR+"/s/users/public/api/user/";

        const response = await fetch(uInfoUrl, {
            method: 'GET',
            headers: uInfoHeaders
        })

        if(response.status !== 200) {
            console.error("Failed to get user info: "+response.status);
            const data = await response.json()
            console.error(data);
            return res.status(500).send({error:"Something went wrong. Try again later"});
        }

        const data2 = await response.json()
        const dwspAccount = data2.account;

        if(!dwspAccount) {
            console.error("Failed to get user info: account is null. Does your client have required scopes?");
            return res.status(500).send({error:"Something went wrong. Try again later"});
        }

        if (!dwspAccount.uuid) {
            console.error("No uuid id received data ("+response.status+"):");
            console.error(dwspAccount);
            return res.status(500).send({error:"Received bad data from dwsp"});
        }

        const existingAccount = await getAccountByDwsp(dwspAccount.uuid);

        if (existingAccount) {

            const tokenPayload = {
                sub: existingAccount.uuid
            }

            const token = jwt.sign(tokenPayload, process.env.JWT_SECRET||"", {algorithm: "HS256",expiresIn:"1h"})

            res.cookie("accessToken", token, {
                httpOnly: true,
                sameSite: "lax",
                path: '/',
                domain:"localhost",
                expires: new Date(Date.now() + 216000000),
            });

            return res.status(200).redirect("http://localhost:8080/");
        }

        const accId = uuid()
        await saveAccount(dwspAccount.username, null, accId, dwspAccount.uuid)

        const tokenPayload = {
            sub: accId
        }

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET||"", {algorithm: "HS256",expiresIn:"1h"})

        res.cookie("accessToken", token, {
            httpOnly: true,
            sameSite: "lax",
            path: '/',
            domain:"localhost",
            expires: new Date(Date.now() + 216000000),
        });

        // Возвращаем 201 статус код т.к. мы создали новый аккаунт
        return res.status(201).redirect("http://localhost:8080/");

    } catch (e){
        console.error("Failed to get user info:",e);
        return res.status(500).send({error:"Internal error. Try again later"});
    }
}

router.get("/oauth/callback", async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send({error:"auth code required"});
    }

    const CLIENT_ID = process.env.DWSP_CLIENT_ID;
    const CLIENT_SECRET = process.env.DWSP_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET){
        console.error("No client id or client secret");
        return res.status(500).send({error:"Internal error. Try again later"});
    }

    const credentials:AppCredentials = {
        authorizationCode: String(code),
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
    }

    const token = await getPublicApiToken(credentials, res)
    useDwspApi(token, res).then()
})
