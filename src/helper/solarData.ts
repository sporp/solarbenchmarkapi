export default class solarData {
    formatSolarData(production: any, consumption: any, storage: any, grid: any){

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

        return resultSolarData;
    }
}