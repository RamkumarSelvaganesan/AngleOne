const fs = require("fs").promises;

async function generateDividendsDataForStock(dividendDetails, stockDetails) {
  const dividendsData = dividendDetails.data;
  const stockData = stockDetails.data;

  // Log the structure of dividendDetails to check if data is present
  // console.log("dividendDetails:", JSON.stringify(dividendDetails, null, 2));

  if (!Array.isArray(dividendsData) || dividendsData.length === 0) {
    console.log(
      `No dividend data available for ${stockData.symbol_name}. Skipping file creation.`
    );
    return null;
  }

  const newJsonObject = {
    stock_name: stockData.symbol_name,
    stock_details: stockData.details,
    comp_name: stockData.comp_name,
    dividends_details: [],
  };

  dividendsData.forEach((dividend) => {
    const dividendDataObj = {
      dividend_provided_date: dividend.AsOnDate,
      quantity: dividend.HoldingQty,
      total_dividend_amount: dividend.DividendAmt,
    };
    newJsonObject.dividends_details.push(dividendDataObj);
  });

  const filePath = `StockDetails/Dividends/${
    stockData.symbol_name.trim() !== ""
      ? stockData.symbol_name
      : stockData.comp_name
  }.json`;

  try {
    await fs.writeFile(filePath, JSON.stringify(newJsonObject, null, 2));
    console.log(
      "Computed Dividend details for",
      stockData.symbol_name.trim() !== ""
        ? stockData.symbol_name
        : stockData.comp_name
    );
  } catch (err) {
    console.error("Error writing to file", err);
  }

  return newJsonObject;
}

module.exports = generateDividendsDataForStock;
