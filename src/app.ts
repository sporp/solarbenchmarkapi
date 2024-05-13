import express from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import mongoose, { createConnection, now } from 'mongoose';
import multer from 'multer';
const pdf = require('pdf-parse');

import { knex } from './config/knexConfig';

import Estimator from './class/Estimator';
import Dashboard from './class/Dashboard';
import Test from './class/Test';

let fs = require('fs');
import { port, JWT_SECRET, MONGO_STRING } from './config/envVars'

const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// MODELS
import { EstimateReport } from './model/EstimateReport';
import { Key } from './model/Key';
import { Power } from './model/Power';
import { PowerDay } from './model/PowerDay';
import { PowerMonth } from './model/PowerMonth';
import { User } from './model/User';

const whitelist = ['https://solarbenchmark.com/']
const dash = new Dashboard();
const est = new Estimator();
const test = new Test();

app.use(cors({
    allowedHeaders: '*',
    origin: 'https://solarbenchmark.com',// whitelist,
    methods: '*',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(MONGO_STRING)
  .then(() => console.log('Connected!'));

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

async function verifyKey(req: any, res: any, next: any) {
    const { api_key } = req.query;
    const key = await Key.find({ 'apiKey': api_key });
    if( !key || key.length < 1 ){
        res.status(401).send('The numbers mason, what do they mean?!');
        return;
    }
    next();
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

/**
 * process file, scrape for data
 * somehow relate the data to current user
 * aggregate all users
 * have a custom field under user on profile and on forum messages that show a single user's power inputs and outputs
 */
app.post('/upload', upload.any(), async (req: any, res) => {
    let type = '';
    console.log(req.query);
    console.log(req.files);
    if(req.files[0] && req.files[0].mimetype) type = req.files[0].mimetype;
    if(req.files[0] && req.files[0].type) type = req.files[0].type;

    let pdfRam = req.files[0];

    // const dataBuffer = fs.readFileSync(pdfRam);
    const data = await pdf(pdfRam.buffer);
    console.log(data.text); // TODO TEXT IS NOW AVAILABLE, PROCESS AND SEND TO DB

    const user_id = 1;
    // const power = new Power({ user_id, userame: 'admin', production, consumption, storage, timestamp });
    try {
        // await power.save();
    } catch (e){
        console.log(e)
        res.sendStatus(401);
    }
    res.status(200).send('Data saved from webhook');
});

/**
 * sends list of all reports for given user
 */
app.get('/solar-estimator-list', verifyKey, async (req, res)=> {
    // TODO get all estimate timestamps, ordered
    // retrieve latest report and tack into data (?)
    const estimate = await EstimateReport.findOne().sort({timestamp: -1})

    res.status(200).send('Data saved from webhook');
});

/**
 * latest report for given user
 */
app.get('/solar-estimator/:user_id/latest', verifyKey, async (req, res)=> {
    const { user_id } = req.params;

    const estimate = await EstimateReport.findOne({ user_id }).sort({timestamp: -1})

    res.status(200).send(estimate);
});

/**
 * This endpoint recieves the data fields from the solar panel estimator page
 * Sends them as a prompt to openai, receives data in standardized format, json or csv
 * Save report to DB for user
 * Sends generated report to dashboard
 */
app.post('/solar-estimator', verifyKey, async (req, res)=> {
    try {
        const estimateResult = est.create(req.body);
        res.status(200).send(estimateResult);
    } catch (e){
        console.log(e)
        res.send(401).send('Error in data insertion');
    }
});

app.post('/upload-month', verifyKey, async (req, res)=> {
    const { user_id, month, year, production, consumption,} = req.body;
    // let [ month, year ] = date.split('-');
    // month = month.parseInt();
    // year = year.parseInt();
    const prevEntry = await PowerMonth.deleteOne({ user_id, month, year });

    const powerMonth = new PowerMonth({ user_id, month, year, production, consumption });

    try {
        await powerMonth.save();
    } catch (e){
        console.log(e)
        res.send(401).send('Error in data insertion');
    }
    res.status(200).send('Data saved from webhook');
});

// FRONTEND Always display yesterday as the latest applicable value and what can be displayed
// So, how are we going to interpolate this data?
// I guess we pull the month for production and consumption from both month and year data
// If data exists in day, we use that. If month and day, we use day and ignore that in the rollup
// if data only exists in monthly, we use that
app.post('/upload-day', verifyKey, async (req, res)=> {
    const { user_id, day, month, year, production, consumption,} = req.body;

    const prevEntry = await PowerDay.deleteOne({ user_id, day, month, year }); // delete if exists
    console.log(prevEntry)

    const powerDay = new PowerDay({ user_id, month, year, production, consumption });

    try {
        await powerDay.save();
    } catch (e){
        console.log(e)
        res.send(401).send('Error in data insertion');
    }
    res.status(200).send('Data saved from webhook');
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

app.get('/dashboard', verifyKey, async (req, res) => {
    const dashboardData = await dash.buildDashboardObject();

    res.status(200).json(dashboardData);
});

app.get('/user-dashboard/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const { api_key } = req.query;

    const key = await Key.find({ 'apiKey': api_key });

    if( !key || key.length < 1 ){
        res.status(401).send('The numbers mason, what do they mean?!');
        return;
    }

    const dashDataMonth = await PowerMonth.find({ user_id });
    let responseData = [];

    for(let d of dashDataMonth){
        responseData.push({
            user_id: d.user_id,
            month: d.month,
            year: d.year,
            production: d.production,
            consumption: d.consumption
        });
    }

    responseData.sort( (a: any, b: any) => { return  a.month + a.year * 100 - b.month + b.year * 100});

    res.status(200).json(responseData);
});

// data may be inserted incorrectly, or correctly, into DB. looks like it comes in as local TS and the DB converts it into UTC
// which is 4 hours ahead. Which is fine, just need to keep that in mind
// so I need to localize anything coming out of the DB, and I need to ensure queries going out
// hit the external API with local minus trailing shit
app.get('/dbTest', async (req, res) => {
    // username from DB connection to get via match on API key
    const power = await test.dbTest();

    res.status(200).json(power);
});

app.listen(port, () => {
    console.log('Listening to you closely on port: ' + port);
});

// Need a call that polls db for latest document timestamp
// if greater than threshold, make call to mysunpower grabbing data from doc timestamp to Now()
// insert into mongodb

// upon refresh, data will be loaded