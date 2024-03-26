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

import graphQLPowerCall from '../src/graphQLPowerCall.json'; 

// let body = require('graphQLPowerCall.json');

import { axiosClient } from './config/axiosConfig';
import { knex } from './config/knexConfig';

import mongoose, { createConnection, now } from 'mongoose';

const app = express();
const port = process.env.PORT || 3456;

const JWT_SECRET = process.env.JWT_SECRET || 'secrets_secrets_are_no_fun';
const MONGO_STRING = process.env.MONGO_STRING || '';

// import powerCall from './const/graphQLPowerCall.json' assert {type:'json'}

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
    user_id: Number,
    timestamp: Date,
    production: Number,
    consumption: Number,
    storage: Number,
    grid: Number
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

import axios from 'axios';
// import { API_URL } from './envVars'
// import getDilfCookie from './../Cookies';

const baseURL = process.env.SOLAR_URL || '';

/** i just did this so i didn't have to write the header every time */
function getHeader(){
    const config = {
        headers: {
            'Content-Type': 'application/json', //x-www-form-urlencoded application/json
            'Authorization': `Bearer ${process.env.SOLAR_TOKEN || ''}`,
            'timeout': 100000
        }
    }
    return config;
}

// uploadGivenTimestamp
// given timestamp requested in url, scrape data for that day and upload into db
app.post('/upload/:date', async (req, res) => {
    const date = req.params.date;
    const stringItUp = true;

    let response: any;
    const config = getHeader();

    try {
        response = await axios.post(baseURL + 'graphql', graphQLPowerCall, config);
    } catch (error) {
        console.log(error);
        return;
    }

    // console.log(response);

    if(!response || response.length < 1){
        return
    }

    const powerData = response.data.data.power;

    const production = powerData.powerDataSeries.production;
    const consumption = powerData.powerDataSeries.consumption;
    const storage = powerData.powerDataSeries.storage;
    const grid = powerData.powerDataSeries.grid;

    function logSeriesData () {
        console.log(production);console.log(production.length + '\n');
        console.log(consumption);console.log(consumption.length + '\n');
        console.log(storage);console.log(storage.length + '\n');
        console.log(grid);console.log(grid.length + '\n');
    } 
    // logSeriesData ();

    const resultSolarData = [];

    // powervalue is a timestamp + either consumption or generation
    while(production.length && consumption.length && storage.length && grid.length){
        const emptyArr = [null, null, null];

        const p = production.shift();
        const c = p[0] === consumption[0][0] ? consumption.shift() : emptyArr;
        const s = p[0] === storage[0][0] ? storage.shift() : emptyArr;
        const g = p[0] === grid[0][0] ? grid.shift() : emptyArr;

        const powerRow = {
            user_id: 1,
            timestamp: new Date(p[0]),
            production: parseFloat(p[1]),
            consumption: parseFloat(c[1]),
            storage: parseFloat(s[1]),
            grid: parseFloat(g[1])
        }

        // rectify timezones here if any gaps exist, discard any timestamps that are less than current p[0]

        resultSolarData.push(powerRow);
    }

    // console.log(resultSolarData);

    await Power.insertMany(resultSolarData);

    // Power.insertMany(resultSolarData).then(result => {
    //     console.log(result)
    // })

    // const solarData = axios.get(url, {Bearer $})
    // const { production, consumption, storage } = req.body;

    /*
    const user_id = 1;
    const power = new Power({ user_id, userame: 'admin', production, consumption, storage, timestamp });
    try {
        await power.save();
    } catch (e){
        console.log(e)
        res.sendStatus(401);
    }
    */
    console.log('wrote to db. allegedly')
    res.status(200).send('Data retrieved and sent to db');
});

// create 'insertMany' (if in mongoose) from JSON of downloaded data
// OR python call can do a bunch of calls for upload 
app.post('/uploadBulk', async (req, res) => {
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
    // console.log("api_key");console.log(api_key);

    const Key = mongoose.model('key', keySchema);
    const key = await Key.find({ 'apiKey': api_key });
    // console.log("key");console.log(key);

    if( !key || key.length < 1 ){
        res.status(401).send('The numbers mason, what do they mean?!');
        return;
    }

    const dashData = await Power.find();

    // console.log(dashData);

    let sum_production = 0;
    let sum_consumption = 0;
    let sum_storage = 0;
    let sum_grid = 0;

    for(const d of dashData){
        if(d && d.production) sum_production += d.production;
        if(d && d.consumption) sum_consumption += d.consumption;
        if(d && d.storage) sum_storage += d.storage;
        if(d && d.grid) sum_grid += d.grid;
    }

    // get data dump for dad

    // launch this app

    // worker to scrape data at some point, 1 to multiple times per day
    // download from sun service to grab data to ram to upload from service
    // one single upload and one bulk upload route

    // dashboard html (xml?) element to display data on forum main page via api key
    // make call to backend for dashboard, fetch and display data



    // get all entries from site creation till now
    // aggregate all of generation and use from site creation

    // get all from today, figure out top user for power generation at present and top consumer

    // i will store user data by 
    
    // check mongo API document for auth verification
    // Single value of all KW made from 
    // q. for dad. what is the measurement value ? kilowatts per hour?

    // get sum of all power generated and spent from TS of site creation (sum of all entries)

    // list of TOP 5 USERS ('just most recent for MVP') for both POWER GENERATION AND USE
    res.status(200).json({
        sum_production,
        sum_consumption,
        sum_storage,
        sum_grid
    });
});

app.listen(port, () => {
    console.log('Listening to you closely on port: ' + port);
});


// YYYY-MM-DD format. Ex: 2024-02-18
function powerCallBuilder(date: string){
    // return `[{"operationName": "FetchPowerData","variables": {"siteKey": "E_63596","interval": "five_minute","end": "${date}23:59:59","start": "${date}T00:00:00"},"query": "query FetchPowerData($interval: String!, $end: String!, $start: String!, $siteKey: String!) {\n  power(interval: $interval, end: $end, start: $start, siteKey: $siteKey) {\n    powerDataSeries {\n      production\n      consumption\n      storage\n      grid\n      __typename\n    }\n    __typename\n  }\n}\n"}]`
    return [
        {
          operationName: "FetchPowerData",
          variables: {
            siteKey: "E_63596",
            interval: "five_minute",
            end: date + "23:59:59",
            start: date + "T00:00:00"
          },
          query: "query FetchPowerData($interval: String!, $end: String!, $start: String!, $siteKey: String!) {\n  power(interval: $interval, end: $end, start: $start, siteKey: $siteKey) {\n    powerDataSeries {\n      production\n      consumption\n      storage\n      grid\n      __typename\n    }\n    __typename\n  }\n}\n"
        }
      ]
}

// let powerCall = powerCallBuilder(date);

// if(stringItUp){
//     JSON.stringify( powerCall );
// }
