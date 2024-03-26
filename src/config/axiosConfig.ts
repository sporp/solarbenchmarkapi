import axios from 'axios';
// import { API_URL } from './envVars'
// import getDilfCookie from './../Cookies';

const baseURL = process.env.SOLAR_URL || '';

export const axiosClient = axios.create({
    baseURL: baseURL
});

/** i just did this so i didn't have to write the header every time */
export function getHeader(){
    const config = {
        headers: {
            'Content-Type': 'application/json', //x-www-form-urlencoded application/json
            'Authorization': `Bearer ${process.env.SOLAR_TOKEN || ''}`,
            'timeout': 100000
        }
    }
    return config;
}

// /** i just did this so i didn't have to write the header every time */
// function getHeader(){
//     const config = {
//         headers: {
//             'Content-Type': 'application/json', //x-www-form-urlencoded application/json
//             'Authorization': `Bearer ${process.env.SOLAR_TOKEN || ''}`
//         }
//     }

//     return config;
// }

export async function get (url: string) {
    const config = getHeader();
    try {
        let response = await axios.get(url, config);
        return response;
    } catch (error) {
        console.log(error);
    }
}

export async function getBlob (url: string) {
    const config = getHeader();
    try {
        let response = await axios.get(url, config);
        return response;
    } catch (error) {
        console.log(error);
    }
}

export async function post (url: string, body: any) {
    const config = getHeader();
    try {
        let response = await axios.post(url, body, config);
        return response;
    } catch (error) {
        console.log(error);
    }
}
