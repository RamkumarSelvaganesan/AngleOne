const { Page } = require('./Page');
const Locators = require('./Locators');
const URL = require('../Constants/URL');
const  addJsonToExcel= require('./CreateExcelwithStockData');
const fs = require('fs').promises; // Use fs.promises for async operations
const path = require('path');


const generateNewDataForStock = require('./CalculatingNewValue');

exports.DashboardPage = class DashboardPage extends Page {
    constructor(page) {
        super(page);
        this.page = page;
        this.context = page.context();
    }

    async goToPortfolio() {
        const {  response } = await this.captureApiDetailsOnClick(URL.PORTFOLIO, Locators.dashboardPage.portfolio);
        console.log('Navigated to Portfolio page');
        await this.minimizeBrowser();
        await this.generatePortfolioJsonFile(response);

    }

    async generateEachStockInProfile() {
        while(this.portfolioData === undefined) {
            await this.page.waitForTimeout(500);
            console.log('waiting....');
        }
        const holdingDetails = await this.portfolioData.data.EquityPortfolio.HoldingDetail;
        for (const stock of holdingDetails) {
            await this.createStockDetailsJsonFile(stock.isin);  // Await for each async call
        }
    }


    async createStockDetailsJsonFile(isin) {
    console.log(`Creating individual Stock details for isIn: ${isin}`);
    const stockDetails = await this.getCurrentStockDetails(isin);
    console.log(`fetched Today stock detail for : ${stockDetails.data.symbol_name} successfully`);
    const transactionDetails = await this.getTransactionDetails(isin);
    console.log(`fetched Transaction detail for : ${stockDetails.data.symbol_name}  successfully`);
    await generateNewDataForStock(transactionDetails, stockDetails);
    }

    async generateExcelReport() {
        const directoryPath = './StockDetails/'; // Directory containing JSON files
        const outputFilePath = './StockDetails/Report/combined_stock_data.xlsx'; // Output Excel file path

        // Get all files from the directory
        const files = await fs.readdir(directoryPath);

        // Filter out non-JSON files and the file 'portfolioData.json'
        const jsonFiles = files.filter(file => path.extname(file) === '.json' && file !== 'portfolioData.json');

        // Process each JSON file and append it to the Excel
        for (const jsonFile of jsonFiles) {
            const jsonFilePath = path.join(directoryPath, jsonFile);
            await addJsonToExcel(outputFilePath, jsonFilePath);
        }

        console.log("All JSON files have been processed and added to the Excel sheet.");
    }

};