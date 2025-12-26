const XLSX = require("xlsx");
const fs = require("fs").promises;

async function addJsonToExcel(
  outputExcelfilePath,
  transactionJsonFilePath,
  dividendJsonFilePath
) {
  console.log(
    `Adding data from '${transactionJsonFilePath}' and '${
      dividendJsonFilePath || "No dividend data"
    }' to Excel file '${outputExcelfilePath}'.`
  );
  let workbook;

  // Check if the Excel file exists, otherwise create a new workbook
  try {
    await fs.access(outputExcelfilePath);
    workbook = XLSX.readFile(outputExcelfilePath);
    console.log(`Excel file '${outputExcelfilePath}' found. Appending data.`);
  } catch (error) {
    workbook = XLSX.utils.book_new();
    console.log(
      `Excel file '${outputExcelfilePath}' not found. Creating a new file.`
    );
  }

  // Process the transactions and add to 'Stock Data' sheet
  const transactionData = await readJsonFile(transactionJsonFilePath);
  await addTransactionSheet(workbook, transactionData);

  // Process the dividends only if the file path is not null
  if (dividendJsonFilePath) {
    const dividendData = await readJsonFile(dividendJsonFilePath);
    await addDividendSheet(workbook, dividendData);
  } else {
    console.log(
      "No dividend file path provided; skipping dividend processing."
    );
  }

  // Write the workbook to the file
  await XLSX.writeFile(workbook, outputExcelfilePath);
  console.log(`Data successfully added to '${outputExcelfilePath}'!`);
}

async function addTransactionSheet(workbook, jsonData) {
  const headers = [
    "Stock Name",
    "Stock Company",
    "Today's Price",
    "Transaction Type",
    "Purchased date",
    "Purchased value",
    "Quantity",
    "Total Invested Price",
    "Holding Days",
    "Gain as of today per share",
    "Overall gain as of today",
    "One day gain",
    "One day gain percentage",
    "One year projected gain",
    "One year projected gain percentage",
    "AngleOne Commission per share",
    "Total angleOne commission",
  ];

  let sheetData = [];
  let worksheet = workbook.Sheets["Stock Data"];
  if (!worksheet) {
    sheetData.push(headers);
    console.log("New 'Stock Data' worksheet created with headers.");
  } else {
    sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  }

  jsonData.transaction_details.forEach((transaction) => {
    if (transaction.type) {
      const stockName =
        jsonData.symbol_name && jsonData.symbol_name.trim() !== ""
          ? jsonData.symbol_name
          : jsonData.comp_name;
      const stockDetails =
        jsonData.stock_details && jsonData.stock_details.trim() !== ""
          ? jsonData.stock_details
          : jsonData.comp_name;

      const row = [
        stockName,
        stockDetails,
        jsonData.today_stock_price,
        transaction.type,
        transaction.date,
        transaction.bought_price,
        transaction.quantity,
        transaction.total_invested_price,
        transaction.holding_days,
        transaction.gain_as_of_today_per_share,
        transaction.overall_gain_as_of_today,
        transaction.one_day_gain,
        transaction.one_day_gain_percentage,
        transaction.one_year_projected_gain,
        transaction.one_year_projected_gain_percentage,
        jsonData.angleOne_commission_per_share,
        jsonData.total_angleOne_commission,
      ];
      sheetData.push(row);
    }
  });

  if (sheetData.length > 1) {
    worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    workbook.Sheets["Stock Data"] = worksheet;
    if (!workbook.SheetNames.includes("Stock Data")) {
      workbook.SheetNames.push("Stock Data");
    }
  }
}

async function addDividendSheet(workbook, jsonData) {
  const headers = [
    "Stock Name",
    "Stock Details",
    "Date Dividend Provided",
    "Quantity",
    "Total Amount",
  ];
  let sheetData = [];
  let worksheet = workbook.Sheets["Dividends"];

  if (!worksheet) {
    sheetData.push(headers);
    console.log("New 'Dividends' worksheet created with headers.");
  } else {
    sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  }

  jsonData.dividends_details.forEach((dividend) => {
    const stockName =
      jsonData.symbol_name && jsonData.symbol_name.trim() !== ""
        ? jsonData.symbol_name
        : jsonData.comp_name;
    const stockDetails =
      jsonData.stock_details && jsonData.stock_details.trim() !== ""
        ? jsonData.stock_details
        : jsonData.comp_name;

    const row = [
      stockName,
      stockDetails,
      dividend.dividend_provided_date,
      dividend.quantity,
      dividend.total_dividend_amount,
    ];
    sheetData.push(row);
  });

  if (sheetData.length > 1) {
    worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    workbook.Sheets["Dividends"] = worksheet;
    if (!workbook.SheetNames.includes("Dividends")) {
      workbook.SheetNames.push("Dividends");
    }
  }
}

// Helper function to read a JSON file
async function readJsonFile(jsonFilePath) {
  try {
    const fileContent = await fs.readFile(jsonFilePath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(
      `Error reading or parsing JSON file '${jsonFilePath}': ${error.message}`
    );
    throw error;
  }
}

// Export only the addJsonToExcel function
module.exports = addJsonToExcel;
