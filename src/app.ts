import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import axios from 'axios';

import { axiosClient, getHeader } from './config/axiosConfig';
import { knex } from './config/knexConfig';

import mongoose, { createConnection, now } from 'mongoose';

import graphQLPowerCall from './graphQLPowerCall.json'; 

let fs = require('fs');
dotenv.config({path: '.env'});

const app = express();
const port = process.env.PORT || 3456;

const JWT_SECRET = process.env.JWT_SECRET || 'secrets_secrets_are_no_fun';
const MONGO_STRING = process.env.MONGO_STRING || '';
const baseURL = process.env.SOLAR_URL || '';

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

const keySchema = new mongoose.Schema({
    apiKey: String
});

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

const Key = mongoose.model('key', keySchema);
const Power = mongoose.model("Power", powerSchema);
const User = mongoose.model("User", userSchema);

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
});

// make simple mongoose post call to create API key
app.post('/key', async (req, res) => {
    const key = new Key({ apiKey: '' });
    try {
        await key.save();
    } catch (e){
        console.log(e)
        res.sendStatus(401);
    }
    res.status(200).send('Key written');
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

// uploadGivenTimestamp
// given timestamp requested in url, scrape data for that day and upload into db
app.post('/upload/:date', async (req, res) => {
    const date = req.params.date;

    let response: any;
    const config = getHeader();

    // console.log(JSON.stringify(graphQLPowerCall));

    try {
        response = await axios.post(baseURL + 'graphql', graphQLPowerCall, config);
    } catch (error) {
        console.log(error);
        return;
    }

    if(!response || response.length < 1){
        return;
    }

    console.log(response.data);

    const powerData = response.data[0].data.power;

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
    let sum_grid_usage = 0;
    let sum_grid_feeding = 0

    for(const d of dashData){
        if(d && d.production) sum_production += d.production;
        if(d && d.consumption) sum_consumption += d.consumption;
        if(d && d.storage) sum_storage += d.storage;
        if(d && d.grid){
            if(d.grid > 0){
                sum_grid_usage += d.grid;
            } else {
                sum_grid_feeding -= d.grid;
            }
        }
    }

    res.status(200).json({
        sum_production,
        sum_consumption,
        sum_storage,
        sum_grid_usage,
        sum_grid_feeding
    }).send();

    // MySunPower threshold test
});

// data may be inserted incorrectly, or correctly, into DB. looks like it comes in as local TS and the DB converts it into UTC
// which is 4 hours ahead. Which is fine, just need to keep that in mind
// so I need to localize anything coming out of the DB, and I need to ensure queries going out
// hit the external API with local minus trailing shit, 

app.get('/dbTest', async (req, res) => {
    // username from DB connection to get via match on API key
    const power = await Power.findOne().sort({timestamp: -1})
    
    const oldDate = power ? power.timestamp : null;
    if(!oldDate) return;

    const oldTs = new Date(oldDate);
    const currTs = new Date();
    const hours = 4; // might change during daylight savings time
    oldTs.setHours(oldTs.getHours() - hours + 1); // so we don't pull the same data and move forward
    currTs.setHours(currTs.getHours() - hours);

    if(currTs <= oldTs){ // ensures we don't grab data we already have
        return res.status(200).send('Threshold too low to request more data');
    }

    // I am looking for old ts = 2024-03-26T11:00:00.000Z
    // and 2024-03-28T8:00:00.000Z

    // probs needs an index and UNIQUE call on DB

    // if two dates are more than 1 hour apart
    // make call to MySolarPower
    graphQLPowerCall[0].variables.end = currTs.toISOString().split('.')[0];
    graphQLPowerCall[0].variables.start = oldTs.toISOString().split('.')[0];

    let response: any;
    const config = getHeader();

    try {
        response = await axios.post(baseURL + 'graphql', graphQLPowerCall, config);
    } catch (error) {
        console.log(error);
        return;
    }

    if(!response || response.length < 1){
        return;
    }

    const powerData = response.data[0].data.power;

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

    console.log(resultSolarData);

    // await Power.insertMany(resultSolarData);

    res.status(200).json(power);
});

app.listen(port, () => {
    console.log('Listening to you closely on port: ' + port);
});

// Need a call that polls db for latest document timestamp
// if greater than threshold, make call to mysunpower grabbing data from doc timestamp to Now()
// insert into mongodb

// upon refresh, data will be loaded