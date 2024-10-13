const fs = require('fs');
async function generateNewDataForStock(transactionDetails, stockDetails) {
    const transactionData = transactionDetails.data; // Array of transaction objects
    const stockData = stockDetails.data; // Single stock details object
    const totalQty = stockData.total_qty; // Total quantity of stock

    // Creating new JSON object
    const newJsonObject = {
        stock_name: stockData.symbol_name,
        stock_details: stockData.details,
        today_stock_price: stockData.ltp,
        transaction_details: [],
       // angleOne_commission_per_share: stockData.charge_per_share,
       // total_angleOne_commission: stockData.charge_per_share * totalQty
    };

    // Initialize accumulators for calculating averages
    let totalBoughtPrice = 0;
    let totalInvestedPrice = 0;
    let totalHoldingDays = 0;
    let totalGainAsOfTodayPerShare = 0;
    let totalOverallGainAsOfToday = 0;
    let totalOneDayGain = 0;
    let totalOneDayGainPercentage = 0;
    let totalOneYearProjectedGain = 0;
    let totalOneYearProjectedGainPercentage = 0;

    // Iterating through transactionData to add each transaction detail to the transaction_details array
    transactionData.forEach((transaction) => {
        // Initialize a new object to hold transaction data
        const transactionObject = {
            type: transaction.transaction_type,
            date: transaction.transaction_date,
            quantity: transaction.qty,
            bought_price: transaction.average_price,
            total_invested_price: transaction.total_invested_price
        };

        const asOnDate = new Date(stockData.as_on_date);
        const transactionDate = new Date(transaction.transaction_date);
        const holdingDays = Math.floor((asOnDate - transactionDate) / (1000 * 60 * 60 * 24));

        // Calculating gain and holding days
        const gainAsOfTodayPerShare = (stockData.ltp - transaction.average_price);
        const overallGainAsOfToday = gainAsOfTodayPerShare * transaction.qty;
        const oneDayGain = overallGainAsOfToday / holdingDays;
        const oneDayGainPercentage = (oneDayGain / transaction.total_invested_price) * 100;
        const oneYearProjectedGain = oneDayGain * 365;
        const oneYearProjectedGainPercentage = oneDayGainPercentage * 365;

        // Adding values to the transaction object
        transactionObject.holding_days = holdingDays;
        transactionObject.gain_as_of_today_per_share = gainAsOfTodayPerShare;
        transactionObject.overall_gain_as_of_today = overallGainAsOfToday;
        transactionObject.one_day_gain = oneDayGain;
        transactionObject.one_day_gain_percentage = oneDayGainPercentage;
        transactionObject.one_year_projected_gain = oneYearProjectedGain;
        transactionObject.one_year_projected_gain_percentage = oneYearProjectedGainPercentage;
        transactionObject.angleOne_commission_per_share = stockData.charge_per_share;
        transactionObject.total_angleOne_commission= stockData.charge_per_share * transaction.qty


        // Push the transactionObject into the array
        newJsonObject.transaction_details.push(transactionObject);

        // Accumulate values for averages
        totalBoughtPrice += transaction.average_price * transaction.qty;
        totalInvestedPrice += transaction.total_invested_price;
        totalHoldingDays += holdingDays * transaction.qty;
        totalGainAsOfTodayPerShare += gainAsOfTodayPerShare * transaction.qty;
        totalOverallGainAsOfToday += overallGainAsOfToday;
        totalOneDayGain += oneDayGain * transaction.qty;
        totalOneDayGainPercentage += oneDayGainPercentage * transaction.qty;
        totalOneYearProjectedGain += oneYearProjectedGain * transaction.qty;
        totalOneYearProjectedGainPercentage += oneYearProjectedGainPercentage * transaction.qty;
    });

    // Calculating averages based on total quantity
    const averageTransactionDetails = {
        avg_bought_price: totalBoughtPrice / totalQty,
        avg_total_invested_price: totalInvestedPrice / totalQty,
        avg_holding_days: totalHoldingDays / totalQty,
        avg_gain_as_of_today_per_share: totalGainAsOfTodayPerShare / totalQty,
        avg_overall_gain_as_of_today: totalOverallGainAsOfToday / totalQty,
        avg_one_day_gain: totalOneDayGain / totalQty,
        avg_one_day_gain_percentage: totalOneDayGainPercentage / totalQty,
        avg_one_year_projected_gain: totalOneYearProjectedGain / totalQty,
        avg_one_year_projected_gain_percentage: totalOneYearProjectedGainPercentage / totalQty
    };

    // Push the average_transaction_details object into the transaction_details array
    newJsonObject.transaction_details.push({ average_transaction_details: averageTransactionDetails });

    const filePath =`StockDetails/${stockData.symbol_name}.json`;
    await fs.writeFile(filePath, JSON.stringify(newJsonObject, null, 2), (err) => {
        if (err) {
            console.error('Error writing to file', err);
        } else {
            console.log('Computed stock details for', stockData.symbol_name );
        }
    });

    //console.log('Combined Response:', JSON.stringify(newJsonObject, null, 2));
    return newJsonObject;
}
module.exports =  generateNewDataForStock;