import mongoose from "mongoose";

const powerDaySchema = new mongoose.Schema({
    user_id: Number,
    day: Number,
    month: Number,
    year: Number,
    production: Number,
    consumption: Number,
});

export const PowerDay = mongoose.model("PowerDay", powerDaySchema);