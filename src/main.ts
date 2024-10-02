import { Actor } from 'apify';
import { PuppeteerCrawler, RequestQueue } from 'crawlee';
import { router } from './routes.js';
import puppeteer from 'puppeteer';

await Actor.init();

interface Input {
    email: string;
    password: string;
}

const input = await Actor.getInput<Input>() as Input

const proxyConfiguration = await Actor.createProxyConfiguration();

async function login(page: puppeteer.Page): Promise<void> {
    await page.goto('https://auth.sieg.com');
    await page.waitForSelector('#btnSubmit');
    await page.type('#txtEmail', input.email);
    await page.type('#txtPassword', input.password);
    await page.click('#btnSubmit');
    await page.waitForSelector('.pointer.trHub.even')
}

const requestQueue = await RequestQueue.open()
await requestQueue.addRequest({ url: 'https://auth.sieg.com' });

const crawler = new PuppeteerCrawler({
    maxConcurrency: 1,
    headless: false,
    requestQueue,
    proxyConfiguration,
    requestHandler: async ({ page, request }) => {
        await page.waitForSelector('#xmlDownload-tab', {timeout: 3000}).catch(_e => {})
        if (request.loadedUrl.includes('auth.sieg.com')) {
            await login(page)
            if (requestQueue.getTotalCount() < 2) {
                let urls: { url: string }[] = []
                let isTotalEqualToCurrentPointer = false;

                while (!isTotalEqualToCurrentPointer) {
                    const tableDescriptionElement = await page.waitForSelector('#lblTableAllCompany')
                    const tableDescription = (await page.evaluate(el => el?.textContent, tableDescriptionElement))?.trim() as string
                    const numbers = tableDescription.match(/\d+/g)
                    
                    const currentUrls = await page.evaluate(() => {
                        return Array.from(document.querySelectorAll('.pointer.trHub.even'))
                            .map(i => ({
                                url: `https://hub.sieg.com/detalhes-do-cliente?id=${i.getAttribute('onclick')?.split('id=')[1].slice(0, -12)}`
                            }))
                    })
                    urls = urls.concat(...currentUrls)
                    
                    // Next page
                    await page.click('a.page-link:nth-child(7)')
                    
                    await page.waitForFunction(() => {
                        const loader = document.querySelector('#loader-sieg');
                        return loader && !loader.classList.contains('hide');
                    })
            
                    await page.waitForSelector('#loader-sieg.hide')
                    
                    await new Promise(r => setTimeout(r, 500))

                    isTotalEqualToCurrentPointer = numbers
                        ? numbers[numbers.length - 1] === numbers[numbers.length - 2]
                        : true
                }
    
                console.log(urls.length)
                await requestQueue.addRequests(urls)
            }
        } else {
            await router({ page, request });
        }
    },
});

await crawler.run()

await Actor.exit();
