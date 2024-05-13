import { EstimateReport } from '../model/EstimateReport'
import OpenAI from "openai";
import { OPENAI_API_KEY } from '../config/envVars'

export default class Estimator {
    async create(body: any){
        const {
            user_id,
            exposure,
            angle,
            interference,
            panel_num,
            panel_rating,
            consumption,
            comsumption_timeline,
            zip
        } = body;
    
        // TODO recieve from OpenAI results in a standardized predetermined format,
        // any additional editorialization should be in the object field "message"
        // if there is any issues with generating the report, please put them in the field "error"
    
        // the main thing I want is a full grid, a series of columns, basically a CSV
        // consumption and timeline will be average out into yearly. Yearly stays the same, monthly * 12, daily * 365
        
        // As each of the following rows data changes, the 4 quarter productions will 
        // Exposure (Cardinal Direction)
        // Angle (degrees)
        // Interference (%)
        // Number Of Panels
        // Panel Rating
        // Yearly Consumption
        // Zip Code
        // Spring Production (kWh)
        // Summer Production (kWh)
        // Fall Production   (kWh)
        // Winter Production (kWh)
    
        let estimateResult = {};
    
        estimateResult = {
            user_id,
            timestamp: new Date(),
            ...estimateResult
        }
    
        const estimateReport = new EstimateReport( estimateResult );
        // send immediate report to display, trigger frontend to display
        try {
            await estimateReport.save();
        } catch (e){
            console.log(e)
            // res.send(401).send('Error in data insertion');
            // TODO replace with with an error that trickles up into res.send(401)
        }
    
        return estimateReport;
    }

    async openai_test() {
        const openai = new OpenAI({
            apiKey: OPENAI_API_KEY, // This is the default and can be omitted
        });
    
        const chatCompletion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: 'Say this is a test' }],
            model: 'gpt-3.5-turbo',
        });
        console.log(chatCompletion);

        const chatGptToggle = false;

        // console.log(process.env.OPENAI_API_KEY);
        //    if(chatGptToggle) main();
    }
}