import mongoose from "mongoose";

const keySchema = new mongoose.Schema({
    apiKey: String
});

export const Key = mongoose.model('key', keySchema);