import mongoose, { modelNames } from "mongoose";

// "production": [
//     [
//         "2024-02-17T00:00:00",
//         "0.006595502",
//         "0"
//     ],
// "consumption": [
//     [
//         "2024-02-17T00:00:00",
//         "0.839069605",
//         "0"
//     ],
// "storage": [
//     [
//         "2024-02-17T00:00:00",
//         "0",
//         "100"
//     ],

// should this be 3 different schemas? f it for now

const powerSchema = new mongoose.Schema({
    user_id: Number,
    timestamp: Date,
    production: Number,
    consumption: Number,
    storage: Number,
    grid: Number
});

export const Power = mongoose.model("Power", powerSchema);