// api/order/services/pdfService.js
module.exports = {
  createPDF: async (htmlContent) => {
    console.log('HTML Content: ', htmlContent);
      const puppeteer = require('puppeteer');

      const browser = await puppeteer.launch({args: ['--disable-web-security']});
      const page = await browser.newPage();

      page.on('console', message => {
        console.log(`Browser console: ${message.text()}`);
      });

      try {
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4',   printBackground: true,   });
        await browser.close();
        return pdfBuffer;
      } catch (error) {
        console.error('Error generating PDF:', error);
        await browser.close();
        throw error; // Re-throw the error to handle it further up the call stack if necessary
      }
  },

};
