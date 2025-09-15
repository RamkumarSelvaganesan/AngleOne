const { test } = require("@playwright/test");
const { LoginPage } = require("../Pages/LoginPage");
const { DashboardPage } = require("../Pages/DashboardPage");
const UserDetails = require("../Constants/UserDetails");

test("AngleOneLoginTest", async ({ page, request }) => {
  //Login to AngleOne
  const loginPage = new LoginPage(page);
  await loginPage.deleteResultFile();
  await loginPage.generateOTP(UserDetails.mobileNumber);
  await loginPage.enterLoginPin(UserDetails.loginPin);

  //Navigate to Portfolio page
  const dashboardPage = new DashboardPage(page, request);
  await dashboardPage.goToPortfolio();
  await dashboardPage.generateEachStockInProfile();
  await dashboardPage.generateExcelReport();
});
