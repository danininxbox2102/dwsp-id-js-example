import sqlite3 from 'sqlite3'
import {Database, open} from 'sqlite'
import * as fs from "node:fs";
import {Account} from "./interfaces/Account";

const dbName = "accounts";
let db:Database;

export const initDB = async () => {

    const dbPath = './src/db/'+dbName+'.db';

    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '');

    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    })

    await db.run(`

        CREATE TABLE IF NOT EXISTS users
        (
            username TEXT NOT NULL UNIQUE,
            password TEXT,
            uuid TEXT NOT NULL UNIQUE,
            createdAt date NOT NULL,
            dwspId TEXT UNIQUE
        )

    `)

    console.log("Database initialized");
}

export const saveAccount = async (username:string, password:string|null, uuid:string, dwspId?:string) => {
    await db.run('INSERT INTO users (username, password, uuid, createdAt, dwspId) VALUES (?,?,?,?,?)',
        [username, password, uuid, Date.now(), dwspId])
}

export const getAccount = async (username:string):Promise<Account | undefined> => {
    return await db.get('SELECT * FROM users WHERE username= ?', [username]);
}

export const getAccountById = async (uuid:string):Promise<Account | undefined> => {
    return await db.get('SELECT * FROM users WHERE uuid= ?', [uuid]);
}

export const getAccountByDwsp = async (dwspId:string):Promise<Account | undefined> => {
    return await db.get('SELECT * FROM users WHERE dwspId= ?', [dwspId]);
}
