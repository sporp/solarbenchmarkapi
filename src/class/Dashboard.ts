import { PowerMonth } from "../model/PowerMonth";

export default class Dashboard {
    dailyDataToggle = false;

    async buildDashboardObject(){
        console.log('building object')
        const dashDataMonth = await PowerMonth.find();
        console.log('data get')
    
        let currDate = new Date();
    
        console.log(currDate.getFullYear() === dashDataMonth[0].year);
        console.log(dashDataMonth[0].year);
    
        let sum_production = 0;
        let sum_consumption = 0;
    
        let production_lifetime = 0
        let consumption_lifetime = 0;
        let production_ytd = 0;
        let consumption_ytd = 0;
    
        let sum_storage = 0;
        let sum_grid_usage = 0;
        let sum_grid_feeding = 0

    
        for(const d of dashDataMonth){
            if(d && d.production){
                if(currDate.getFullYear() === d.year) { production_ytd += d.production; }
                production_lifetime += d.production;
                sum_production += d.production;
            }
            if(d && d.consumption){
                if(currDate.getFullYear() === d.year) { consumption_ytd += d.consumption; }
                consumption_lifetime += d.consumption;
                sum_consumption += d.consumption;
            }
        }
    
        const leaderboard = await this.getLeaderboard(currDate);
        console.log('donezies')
    
        return {
            sum_production,
            sum_consumption,
    
            production_ytd,
            consumption_ytd,
            production_lifetime,
            consumption_lifetime,
            // sum_storage,
            // sum_grid_usage,
            // sum_grid_feeding
            // yearly,
            leaderboard,
            // daily,
        }
    }

    // create 3 leaderboards, top producers and consumers for the past month, eventually expand out to year and day as well
    async getLeaderboard(currDate: Date){
        let currentMonth = currDate.getMonth(); // needs to be -1
        if(currentMonth === 0) currentMonth = 12;
        const currentYear = currDate.getFullYear();

        const producers = await PowerMonth.aggregate([
            {
              $match: {
                month: currentMonth,
                year: currentYear
              }
            },
            {
              $sort: { production: -1 }
            },
            {
              $limit: 3
            }
          ]);
          
          const consumers = await PowerMonth.aggregate([
            {
              $match: {
                month: currentMonth,
                year: currentYear
              }
            },
            {
              $sort: { consumption: -1 }
            },
            {
              $limit: 3
            }
          ]);

        return {
            producers,
            consumers
        };
    }

    // TODO whenever daily data is figured out, add that here
    /*
    getDataDaily(){
        const dashDataMonth = await PowerMonth.find();
        const dashDataDay = await PowerDay.find();
    
        let currDate = new Date();
    
        console.log(currDate.getFullYear() === dashDataMonth[0].year);
        console.log(dashDataMonth[0].year);
    
        let sum_production = 0;
        let sum_consumption = 0;
    
        let production_lifetime = 0
        let consumption_lifetime = 0;
        let production_ytd = 0;
        let consumption_ytd = 0;
    
        let sum_storage = 0;
        let sum_grid_usage = 0;
        let sum_grid_feeding = 0
    
        // iterate through ALL months for user id, delete any doubles for months
    
        function dupeCheck(dayD: any, monthD: any){
            if(dayD.user_id === monthD.user_id && dayD.month === monthD.month && dayD.year === monthD.year ){
                return true;
            }
            return false;
        }
    
        for(let i = dashDataDay.length - 1; i >=0; i--){
            for(let j = dashDataMonth.length - 1; j >=0; j--){
                if( dupeCheck(dashDataDay[i], dashDataMonth[j]) ){
                    dashDataMonth.splice(j, 1);
                }
            }
        }
    
        // PULL DATA FROM BOTH MONTHLY AND DAILY UPLOAD - DONE
    
        // FOR USER, IF ANY DAILY FOR MONTH, PULL SAID DATA
        // OTHERWISE, PULL MONTHLY
    
        for(const d of dashDataMonth){
            if(d && d.production){
                if(currDate.getFullYear() === d.year) { production_ytd += d.production; }
                production_lifetime += d.production;
                sum_production += d.production;
            }
            if(d && d.consumption){
                if(currDate.getFullYear() === d.year) { consumption_ytd += d.consumption; }
                consumption_lifetime += d.consumption;
                sum_consumption += d.consumption;
            }
            // if(d && d.storage) sum_storage += d.storage;
            // if(d && d.grid){
            //     if(d.grid > 0){
            //         sum_grid_usage += d.grid;
            //     } else {
            //         sum_grid_feeding -= d.grid;
            //     }
            // }
        }
    
        for(const d of dashDataDay){
            if(d && d.production){
                if(currDate.getFullYear() === d.year) { production_ytd += d.production; }
                production_lifetime += d.production;
                sum_production += d.production;
            }
            if(d && d.consumption){
                if(currDate.getFullYear() === d.year) { consumption_ytd += d.consumption; }
                consumption_lifetime += d.consumption;
                sum_consumption += d.consumption;
            }
        }
    
        // create 3 leaderboards, top producers and consumers for the past month, eventually expand out to year and day as well
        const leaderboard = 0;
    
        return {
            sum_production,
            sum_consumption,
    
            production_ytd,
            consumption_ytd,
            production_lifetime,
            consumption_lifetime,
            // sum_storage,
            // sum_grid_usage,
            // sum_grid_feeding
            // yearly,
            leaderboard,
            // daily,
        }
    }
    */
}