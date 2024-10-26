const { Page } = require('./Page');
const Locators = require('./Locators');
import URL from '../Constants/URL';

exports.LoginPage = class LoginPage extends Page {
    constructor (page) {
        super(page);
        this.page = page;
        this.context = page.context();
    };

    async deleteResultFile(){
        await this.deleteFilesInFolder('./StockDetails/Individual');
        await this.deleteFilesInFolder('./StockDetails/Dividends');
        await this.deleteFilesInFolder('./StockDetails/Report');
    }

    async generateOTP(number) {
        await this.openAngleOneLoginPage();
        await this.type(Locators.loginPage.mobileNumber, number);
        console.log('Mobile entered:'+ number);
        await this.click(Locators.loginPage.submit);
        console.log('Proceed clicked');
        await this.waitForSuccessCall(URL.VERIFY_OTP);
        console.log('OTP verified');
    }

    async enterLoginPin(pin) {
        await this.type(Locators.loginPage.loginPin, pin);
        console.log('PIN entered:'+ pin);
        await this.click(Locators.loginPage.submit);
        console.log('Login clicked');
        await this.click(Locators.dashboardPage.notNow);
        console.log('Not Now clicked');
    }
};