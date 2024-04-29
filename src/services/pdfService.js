// const puppeteer = require('puppeteer');

// async function createPDF(htmlContent) {
//     const browser = await puppeteer.launch({args: ['--disable-web-security']});
//     const page = await browser.newPage();
//     await page.setContent(htmlContent);
//     const pdfBuffer = await page.pdf({ format: 'A4' });
//     await browser.close();
//     return pdfBuffer;
// }

// module.exports = { createPDF };
