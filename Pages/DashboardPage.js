const { Page } = require("./Page");
const Locators = require("./Locators");
const URL = require("../Constants/URL");
const addJsonToExcel = require("./CreateExcelwithStockData");
const fs = require("fs").promises; // Use fs.promises for async operations
const path = require("path");
const generateDividendsDataForStock = require("./CaptureDividendDetails.js");
const generateNewDataForStock = require("./CalculatingNewValue");

exports.DashboardPage = class DashboardPage extends Page {
  constructor(page) {
    super(page);
    this.page = page;
    this.context = page.context();
  }

  async goToPortfolio() {
    const { response } = await this.captureApiDetailsOnClick(
      URL.PORTFOLIO,
      Locators.dashboardPage.portfolio
    );
    console.log("Navigated to Portfolio page");
    await this.minimizeBrowser();
    await this.generatePortfolioJsonFile(response);
  }

  async generateEachStockInProfile() {
    while (this.portfolioData === undefined) {
      await this.page.waitForTimeout(500);
      console.log("waiting....");
    }
    const holdingDetails = await this.portfolioData.data.EquityPortfolio
      .HoldingDetail;
    for (const stock of holdingDetails) {
      await this.createStockDetailsJsonFile(stock.isin); // Await for each async call
    }
  }

  async createStockDetailsJsonFile(isin) {
    console.log(`Creating individual Stock details for isIn: ${isin}`);
    const stockDetails = await this.getCurrentStockDetails(isin);
    console.log(
      `fetched Today stock detail for : ${stockDetails.data.symbol_name} successfully`
    );
    const transactionDetails = await this.getTransactionDetails(isin);
    console.log(
      `fetched Transaction detail for : ${stockDetails.data.symbol_name}  successfully`
    );
    const dividendDetails = await this.getDividendsDetails(isin);
    console.log(
      `fetched Dividend detail for : ${stockDetails.data.symbol_name}  successfully dividend`
    );
    await generateNewDataForStock(transactionDetails, stockDetails);
    await generateDividendsDataForStock(dividendDetails, stockDetails);
  }

  async generateExcelReport() {
    const directoryPath = "./StockDetails/Individual/"; // Directory containing JSON files
    const outputFilePath = "./StockDetails/Report/combined_stock_data.xlsx"; // Output Excel file path
    const dividendsDirectoryPath = "./StockDetails/Dividends/"; // Directory for dividends JSON files

    try {
      // Get all files from the directory
      const files = await fs.readdir(directoryPath);
      console.log(`Found ${files.length} files in '${directoryPath}'.`);

      // Filter out non-JSON files and the file 'portfolioData.json'
      const jsonFiles = files.filter(
        (file) =>
          path.extname(file) === ".json" && file !== "portfolioData.json"
      );
      console.log(`Filtered down to ${jsonFiles.length} JSON files.`);

      // Process each JSON file and append it to the Excel
      for (const jsonFile of jsonFiles) {
        const jsonFilePath = path.join(directoryPath, jsonFile);
        console.log(`Processing transaction JSON file: '${jsonFilePath}'`);

        // Check if a corresponding dividend file exists
        const dividendFilePath = path.join(dividendsDirectoryPath, jsonFile);
        console.log(
          `Checking for corresponding dividend file: '${dividendFilePath}'`
        );

        const dividendFileExists = await fs
          .access(dividendFilePath)
          .then(() => true)
          .catch(() => false);
        if (dividendFileExists) {
          console.log(`Dividend file exists: '${dividendFilePath}'`);
        } else {
          console.log(
            `No corresponding dividend file found for: '${jsonFilePath}'`
          );
        }

        // Call addJsonToExcel with the stock file path and the dividend file path if it exists
        await addJsonToExcel(
          outputFilePath,
          jsonFilePath,
          dividendFileExists ? dividendFilePath : null
        );
      }

      console.log(
        "All JSON files have been processed and added to the Excel sheet."
      );
    } catch (error) {
      console.error(`Error generating Excel report: ${error.message}`);
    }
  }
};
