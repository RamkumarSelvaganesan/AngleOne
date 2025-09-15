const fs = require("fs");
const URL = require("../Constants/URL");
const UserDetails = require("../Constants/UserDetails");
const { promisify } = require("util");
const path = require("path");

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
    await this.page.goto("https://www.angelone.in/login/");
  }

  async type(locator, text) {
    await this.page.fill(locator, text);
  }
  async click(locator) {
    await this.page.click(locator);
  }

  async waitForSuccessCall(url) {
    await this.page.waitForResponse(async (response) => {
      return response.url() === url && response.status() === 200; // Wait for HTTP 200 success response
    });
  }

  async captureApiDetailsOnClick(url, clickLocator) {
    let responseDetails;
    let responseBody;

    // Set up a route to intercept requests matching the URL
    await this.page.route(url, async (route) => {
      const request = route.request();

      // Capture the Authorization header
      const headers = request.headers();
      this.authorizationHeader = headers["Cookie"] || headers["cookie"] || null; // Return null if not present
      //console.log("this ---" + this.authorizationHeader);
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
        data: jsonResponse.data, // This is the actual data
      };
    } catch (error) {
      console.error("Failed to parse JSON response:", error);
      responseDetails = { success: false, message: "Invalid JSON response" };
    }

    // console.log('Response Details:', responseDetails);

    // Return both the Authorization header and response details
    return {
      response: responseDetails,
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
          TotalHolding: totalSummary.TotalHolding,
          TotalInvestedValue: totalSummary.TotalInvValue,
          TotalActiveInvValue: totalSummary.TotalActiveInvValue,
          TotalGainOrLose: totalSummary.TotalGL,
          TotalGainOrLosePercentage: totalSummary.TotalGLPer,
        },
        EquityPortfolio: {
          HoldingDetail: response.data.EquityPortfolio.HoldingDetail.map(
            (item) => ({
              details:
                item.details && item.details.length > 0
                  ? item.details
                  : item.compName,
              symbolName:
                item.symbolName && item.symbolName.length > 0
                  ? item.symbolName
                  : item.compName,
              isin: item.isin,
              ltp: item.ltp,
              as_on_date: item.AsOnDate,
            }),
          ),
        },
      },
    };

    // Write the formatted response to a JSON file
    const filePath = "StockDetails/portfolioData.json"; // Define your desired file path
    await fs.writeFile(
      filePath,
      JSON.stringify(formattedResponse, null, 2),
      (err) => {
        if (err) {
          console.error("Error writing to file", err);
        } else {
          console.log("Created Entire Portofilo details in ", filePath);
          this.loadPortfolioData();
        }
      },
    );
  }

  async hitApi(endpoint, body = null, headers = {}, method = "POST") {
    console.log(
      `====== url: ${endpoint}, body: ${JSON.stringify(body)}, headers: ${JSON.stringify(
        headers,
      )}, method: ${method} ======`,
    );

    const response = await this.request.fetch(endpoint, {
      method,
      headers: {
        ...headers,
      },
      data: body || undefined,
    });

    console.log(`Status: ${response.status()}`);
    let jsonResponse = {};
    try {
      jsonResponse = await response.json();
    } catch (e) {
      console.log("Response is not JSON, returning empty object");
    }

   //console.log("API Response:", JSON.stringify(jsonResponse, null, 2));
    return { status: response.status(), body: jsonResponse };
  }

  async loadPortfolioData() {
    await fs.readFile(
      "StockDetails/portfolioData.json",
      "utf-8",
      (err, data) => {
        if (err) {
          console.error("Error reading the file:", err);
          return;
        }

        // Parse the JSON data into a JavaScript object
        this.portfolioData = JSON.parse(data);
        console.log("Entire Portfolio data loaded successfully:");
      },
    );
  }

  async getTransactionDetails(isin) {
    const method = "POST"; // Change to 'GET' if necessary
    const body = {
      isin: isin,
      party_code: UserDetails.clientID,
    };
    const headers = {
      cookie: `${this.authorizationHeader}`,
      "Content-Type": "application/json",
    };
    return await this.hitApi(URL.TRANSACTIONS, body, headers, method);
  }

  async getCurrentStockDetails(isin) {
    const method = "POST"; // Change to 'GET' if necessary
    const body = {
      isin: isin,
      partyCode: UserDetails.clientID,
    };
    const headers = {
      cookie: `${this.authorizationHeader}`,
      "Content-Type": "application/json",
    };
    return await this.hitApi(URL.CURRENT_STOCK_DETAILS, body, headers, method);
  }

  async getDividendsDetails(isin) {
    const method = "POST"; // Change to 'GET' if necessary
    const body = {
      isin: isin,
      party_code: UserDetails.clientID,
    };
    const headers = {
      cookie: `${this.authorizationHeader}`,
      "Content-Type": "application/json",
    };
    return await this.hitApi(URL.DIVIDENDS, body, headers, method);
  }

  async deleteFilesInFolder(folderPath) {
    fs.readdir(folderPath, (err, files) => {
      if (err) {
        console.error(`Error reading folder '${folderPath}':`, err);
        return;
      }

      files.forEach((file) => {
        const filePath = path.join(folderPath, file);

        // Check if it's a file (not a subfolder)
        fs.stat(filePath, (statErr, stats) => {
          if (statErr) {
            return; // Skip this file if there was an error
          }

          if (stats.isFile()) {
            fs.unlink(filePath, (unlinkErr) => {
              if (!unlinkErr) {
                console.log(`File '${filePath}' deleted successfully.`);
              }
            });
          }
        });
      });
    });
  }

  async minimizeBrowser() {
    const session = await this.page.context().newCDPSession(this.page);

    // Minimize the window using Browser.setWindowBounds
    const { windowId } = await session.send("Browser.getWindowForTarget");
    await session.send("Browser.setWindowBounds", {
      windowId: windowId,
      bounds: { windowState: "minimized" },
    });
  }
};
