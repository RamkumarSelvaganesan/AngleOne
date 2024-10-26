const fs = require('fs');
const URL = require("../Constants/URL");
const UserDetails = require("../Constants/UserDetails");
const { promisify } = require('util');

// Promisify fs methods to use them with async/await
const access = promisify(fs.access);
const unlink = promisify(fs.unlink);
exports.Page = class Page {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
    }
    portfolioData;
    authorizationHeader;

    async openAngleOneLoginPage() {
        await this.page.goto('https://www.angelone.in/login/');
    }

    async type(locator, text) {
        await this.page.fill(locator, text);
    }
    async click(locator) {
        await this.page.click(locator);
    }

    async waitForSuccessCall(url) {
        await this.page.waitForResponse(async response => {
            return response.url() === url &&
                response.status() === 200; // Wait for HTTP 200 success response
        });
    }

    async captureApiDetailsOnClick(url, clickLocator) {
        let responseDetails ;
        let responseBody;

        // Set up a route to intercept requests matching the URL
        await this.page.route(url, async (route) => {
            const request = route.request();

            // Capture the Authorization header
            const headers = request.headers();
            this.authorizationHeader = headers['token'] || null; // Return null if not present

            // Continue the request
            await route.continue();
        });

        // Click the button that triggers navigation and the API call
        await this.click(clickLocator); // Modify this selector to your actual button

        // Wait for the API response to complete
        const response = await this.page.waitForResponse((response) => {
            return response.url() === url && response.status() === 200;
        }); // Increase timeout if necessary

        // Get the response body
        responseBody = await response.body(); // Get the response body

        try {
            const jsonResponse = JSON.parse(responseBody.toString());

            // Store response details
            responseDetails = {
                success: jsonResponse.success,
                statusCode: jsonResponse.statusCode,
                message: jsonResponse.message,
                data: jsonResponse.data // This is the actual data
            };
        } catch (error) {
            console.error('Failed to parse JSON response:', error);
            responseDetails = { success: false, message: 'Invalid JSON response' };
        }

       // console.log('Response Details:', responseDetails);

        // Return both the Authorization header and response details
        return {
            response: responseDetails
        };
    }

    async generatePortfolioJsonFile(response) {
        let totalSummary = response.data.TotalSummary;
        const formattedResponse = {
        success: response.success,
        statusCode: response.statusCode,
        message: response.message,
        data: {
            TotalSummary: {
                TotalHolding:totalSummary.TotalHolding,
                TotalInvestedValue: totalSummary.TotalInvValue,
                TotalActiveInvValue: totalSummary.TotalActiveInvValue,
                TotalGainOrLose: totalSummary.TotalGL,
                TotalGainOrLosePercentage: totalSummary.TotalGLPer

            },
            EquityPortfolio: {
                HoldingDetail: response.data.EquityPortfolio.HoldingDetail.map(item => ({
                    details: item.details,
                    symbolName: item.symbolName,
                    isin: item.isin
                }))
            }
        },
    };

        // Write the formatted response to a JSON file
        const filePath = 'StockDetails/portfolioData.json'; // Define your desired file path
        await fs.writeFile(filePath, JSON.stringify(formattedResponse, null, 2), (err) => {
            if (err) {
                console.error('Error writing to file', err);
            } else {
                console.log('Created Entire Portofilo details in ', filePath);
                this.loadPortfolioData();
            }
        });
    }

    async hitApi(url, body = null, headers = {}, method = 'POST') {
       // console.log(`======url:${url}, body:${JSON.stringify(body)}, header: ${JSON.stringify(headers)}, method:${method} =========`);
        try {
            // Send the POST request
            return await this.page.evaluate(async ({ url, body, headers, method }) => { // Include method here
                const res = await fetch(url, {
                    method: method,
                    headers: {
                        ...headers // Add any custom headers passed
                    },
                    body: JSON.stringify(body), // Convert body to JSON for POST request
                });
                return res.json(); // Return the JSON response
            }, { url, body, headers, method }); // Pass method as well


        } catch (error) {
            console.error('Error hitting the API:', error);
            return { success: false, message: 'API call failed' };
        }
    }

    async loadPortfolioData() {
        await fs.readFile('StockDetails/portfolioData.json', 'utf-8', (err, data) => {
            if (err) {
                console.error('Error reading the file:', err);
                return;
            }

            // Parse the JSON data into a JavaScript object
            this.portfolioData = JSON.parse(data);
            console.log('Entire Portfolio data loaded successfully:');
        });
    }

    async getTransactionDetails(isin){

        const method = 'POST'; // Change to 'GET' if necessary
        const body = {
            isin: isin,
            party_code: UserDetails.clientID
        };
        const headers = {
            'token': `${this.authorizationHeader}`,
            'Content-Type': 'application/json'
        };
        return await this.hitApi(URL.TRANSACTIONS,body, headers,method);
    }

    async getCurrentStockDetails(isin){
        const method = 'POST'; // Change to 'GET' if necessary
        const body = {
            isin: isin,
            partyCode: UserDetails.clientID
        };
        const headers = {
            'accesstoken': `${this.authorizationHeader}`,
            'Content-Type': 'application/json'
        };
        return await this.hitApi(URL.CURRENT_STOCK_DETAILS,body, headers,method);
    }

    async deleteFileIfExists(filePath) {
        try {
            // Check if the file exists
            await access(filePath);  // No callback needed, since it's now promisified.
            // If the file exists, delete it
            await unlink(filePath);
            console.log(`File '${filePath}' deleted successfully.`);
        } catch (error) {
            // Handle cases where the file doesn't exist or other errors occur
            if (error.code === 'ENOENT') {
                console.log(`File '${filePath}' does not exist.`);
            } else {
                console.error(`Error checking or deleting file '${filePath}':`, error);
            }
        }
    }

    async minimizeBrowser() {
        const session = await this.page.context().newCDPSession(this.page);

        // Minimize the window using Browser.setWindowBounds
        const { windowId } = await session.send('Browser.getWindowForTarget');
        await session.send('Browser.setWindowBounds', {
            windowId: windowId,
            bounds: { windowState: 'minimized' }
        });
    }

};