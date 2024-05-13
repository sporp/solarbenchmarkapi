import mongoose from "mongoose";

const powerMonthSchema = new mongoose.Schema({
    user_id: Number,
    month: Number,
    year: Number,
    production: Number,
    consumption: Number,
});

export const PowerMonth = mongoose.model("PowerMonth", powerMonthSchema);
