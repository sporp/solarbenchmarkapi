/**
 * Call Sam
 * Call via POST route to push data to mongo db if api-key matches to a user id
 * in a different doc
 * 
 * cron user that calls get to grab api data from Solar Provider
 * 
 * 
 * 
 * Get via api-key that matches key to user_id, such that all user_id (or all users) data is
 * processed for requested call.
 * 
 * 
 * Aggregate all power generated and spentfrom site creation
 * till this day, aggregate all power created and used today
 * 
 * Need API key to get
 */

import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';

let fs = require('fs');
dotenv.config({path: '.env'});

import { knex } from './config/knexConfig';

import mongoose, { createConnection, now } from 'mongoose';

const app = express();
const port = process.env.PORT || 3456;
const JWT_SECRET = process.env.JWT_SECRET || 'secrets_secrets_are_no_fun';
const MONGO_STRING = process.env.MONGO_STRING || '';

app.use(cors({
    allowedHeaders: '*',
    origin: '*',
    methods: '*',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(MONGO_STRING)
  .then(() => console.log('Connected!'));

const userSchema = new mongoose.Schema({
    username: String,
    apiKey: String
});

const powerSchema = new mongoose.Schema({
    username: String,
    production: Array,
    consumption: Array,
    storage: Array,
    timestamp: String
});

const User = mongoose.model("User", userSchema);
const Power = mongoose.model("Power", powerSchema);

function authenticateToken(req: any, res: any, next: any) {
    const authHeader = req.headers['Authorization'] || req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
  
    if (token == null) return res.sendStatus(401);
  
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if(err){
            console.log(err);
            return res.sendStatus(403);
        }

        req.user = user;
        next();
    })
}

// GET method route
app.get('/', (req, res) => {
    console.log('test');
    res.send('GET request to the homepage');
});

app.get('/login', async (req, res) => {
    console.log('begin login');
    let {email, password} = req.query;
    try {
        const [user] = await knex('dilf_user')
            .where({ email })
            .where('password', knex.raw(`crypt('${password}', password)`))
            .select('*');

        console.log(user);

        const hours = 24 * 30; // 24 hours, 30 days
        let token = jwt.sign({
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * hours),
            user_id: user.id,
            email: user.email
            }, JWT_SECRET);
        
        res.status(200).json(token)
    } catch (e){
        console.log(e)
        res.sendStatus(401);
    }
});

app.get('/webhook', async (req, res) => {
    // username from DB connection to get via match on API key

    //check db for webhook/user auth, then push changes if auth is functional 

    const { production, consumption, storage, timestamp } = req.body;
    const power = new Power({ userame: 'admin', production, consumption, storage, timestamp });
    try {
        await power.save();
    } catch (e){
        console.log(e)
        res.sendStatus(401);
    }
    res.status(200).send('Data saved from webhook');
})

const keySchema = new mongoose.Schema({
    apiKey: String
});

// make simple mongoose post call to create API key

app.post('/key', async (req, res) => {
    const Key = mongoose.model('key', keySchema);

    const key = new Key({ apiKey: '' });
    try {
        await key.save();
    } catch (e){
        console.log(e)
        res.sendStatus(401);
    }
    res.status(200).send('Key written');

    // find each person with a last name matching 'Ghost', selecting the `name` and `occupation` fields
    // const person = await Key.findOne({ 'name.last': 'Ghost' }, 'name occupation');
    // // Prints "Space Ghost is a talk show host".
    // console.log('%s %s is a %s.', person.name.first, person.name.last, person.occupation);
});

// create 'insertMany' (if in mongoose) from JSON of downloaded data
// OR python call can do a bunch of calls for upload 
app.post('/upload', async (req, res) => {
    const { production, consumption, storage, timestamp } = req.body;
    const user_id = 1;
    const power = new Power({ user_id, userame: 'admin', production, consumption, storage, timestamp });
    try {
        await power.save();
    } catch (e){
        console.log(e)
        res.sendStatus(401);
    }
    res.status(200).send('Data saved from webhook');
});

app.get('/dashboard', async (req, res) => {

    const { api_key } = req.query;
    console.log("api_key");
    console.log(api_key);

    const Key = mongoose.model('key', keySchema);
    const key = await Key.find({ 'apiKey': api_key });
    console.log("key")
    console.log(key);

    if( !key ){
        return;
    }

    // get data dump for dad

    // launch this app

    // worker to scrape data at some point, 1 to multiple times per day
    // download from sun service to grab data to ram to upload from service

    // dashboard html (xml?) element to display data on forum main page via api key



    // get all entries from site creation till now
    // aggregate all of generation and use from site creation

    // get all from today, figure out top user for power generation at present and top consumer

    // i will store user data by 
    
    // check mongo API document for auth verification
    // Single value of all KW made from 
    // q. for dad. what is the measurement value ? kilowatts per hour?

    // get sum of all power generated and spent from TS of site creation (sum of all entries)

    // list of TOP 5 USERS ('just most recent for MVP') for both POWER GENERATION AND USE
    res.status(200).send('Key found');
});

app.listen(port, () => {
    console.log('Listening to you closely on port: ' + port);
});
