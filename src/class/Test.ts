import { Power } from "../model/Power";
import solarData from './../class/solarData';
import graphQLPowerCall from './../graphQLPowerCall.json';
import axios from 'axios';
import { axiosClient, getHeader } from './../config/axiosConfig';
import { baseURL } from "../config/envVars";

export default class Test {
    async dbTest(){
        const power = await Power.findOne().sort({timestamp: -1})
    
        const oldDate = power ? power.timestamp : null;
        if(!oldDate) return;

        const oldTs = new Date(oldDate);
        const currTs = new Date();
        const hours = 4; // might change during daylight savings time
        oldTs.setHours(oldTs.getHours() - hours + 1); // so we don't pull the same data and move forward
        currTs.setHours(currTs.getHours() - hours);

        if(currTs <= oldTs){ // ensures we don't grab data we already have
            console.log('Threshold too low to request more data')
            return {};
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

        let resultSolarData = [];
        resultSolarData = new solarData().formatSolarData(production, consumption, storage, grid);

        // console.log(resultSolarData);

        await Power.insertMany(resultSolarData);
        return power;
    }
}