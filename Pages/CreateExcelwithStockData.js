const XLSX = require('xlsx');
const fs = require('fs').promises; // Use fs.promises for async file operations

async function addJsonToExcel(outputExcelfilePath, jsonFilePath) {
    console.log(`Adding data from '${jsonFilePath}' to Excel file '${outputExcelfilePath}'...`);
    let workbook;
    let sheetData = [];

    // Check if the Excel file exists
    try {
        await fs.access(outputExcelfilePath); // Check if the file exists
        workbook = XLSX.readFile(outputExcelfilePath);
        console.log(`Excel file '${outputExcelfilePath}' found. Appending data.`);
    } catch (error) {
        workbook = XLSX.utils.book_new(); // Create a new workbook
        console.log(`Excel file '${outputExcelfilePath}' not found. Creating a new file.`);
    }

    // Load the JSON data
    const jsonData = await readJsonFile(jsonFilePath);
  //  console.log('Loaded JSON Data:', JSON.stringify(jsonData, null, 2)); // Debugging: show loaded JSON data

    // Prepare headers for the new worksheet
    const headers = [
        "Stock Name", "Stock Company", "Today's Price", "Transaction Type",
        "Purchased date", "Purchased value", "Quantity", "Total Invested Price",
        "Holding Days", "Gain as of today per share", "Overall gain as of today",
        "One day gain", "One day gain percentage", "One year projected gain",
        "One year projected gain percentage", "AngleOne Commission per share",
        "Total angleOne commission"
    ];

    // Check if we already have a worksheet
    let worksheet = workbook.Sheets['Stock Data'];
    if (!worksheet) {
        // Create a new worksheet if it doesn't exist
        sheetData.push(headers); // Add headers to sheetData
        console.log("New worksheet created with headers.");
    } else {
        // Load existing data from the worksheet
        sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      //  console.log('Existing sheet data loaded:', JSON.stringify(sheetData, null, 2)); // Debugging: show existing sheet data
    }

    // Add the JSON data as rows
    jsonData.transaction_details.forEach(transaction => {
        if (transaction.type) {
            const row = [
                jsonData.stock_name,
                jsonData.stock_details,
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
                transaction.angleOne_commission_per_share,
                transaction.total_angleOne_commission
            ];
         //   console.log("Adding transaction row:", JSON.stringify(row)); // Debugging: show each transaction row being added
            sheetData.push(row);
        }
    });

    // Check if we have valid rows to write
    if (sheetData.length > 1) { // Ensure there's at least one data row (beyond headers)
        // Create or update the worksheet with the combined data
        worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        workbook.Sheets['Stock Data'] = worksheet; // Associate the worksheet with the workbook
        if(workbook.SheetNames.length===0) {
            workbook.SheetNames.push('Stock Data'); // Add the sheet name to SheetNames
        }
        // Write the updated workbook to the file
        await XLSX.writeFile(workbook, outputExcelfilePath);
        console.log(`Data for '${jsonData.stock_name}' transaction on '${jsonData.transaction_details[0].date}' added to '${outputExcelfilePath}' successfully!`);
    } else {
        console.log('No valid data to add to the Excel file.'); // No valid data found
    }
}

// Helper function to read a JSON file
async function readJsonFile(jsonFilePath) {
    try {
        const fileContent = await fs.readFile(jsonFilePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error(`Error reading or parsing JSON file '${jsonFilePath}': ${error.message}`);
        throw error;
    }
}

module.exports = addJsonToExcel;
