import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: String,
    apiKey: String
});

export const User = mongoose.model("User", userSchema);