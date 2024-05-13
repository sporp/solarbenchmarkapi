import mongoose from "mongoose";

// timestamp so we can get latest report? maybe an ascending id?
const estimateReportSchema = new mongoose.Schema({
    user_id: Number,
    timestamp: Date,
    report: Object
});

export const EstimateReport = mongoose.model("EstimateReport", estimateReportSchema);