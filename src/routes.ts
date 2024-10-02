import { Request } from 'crawlee';
import { Page } from 'puppeteer';
import { endDate, startDate } from './dates.js';
import fs from 'fs'
import path from 'path'
import { waitForTargetDownload } from './helpers/wait-download.js';
import { log } from 'apify';
import { xlsxMapping } from './helpers/xlsx-mapping.js';
import { jsonToCsv } from './helpers/json-to-xlsx.js';

const downloadPath = './tmp/downloads'
const outputPath = './tmp/output'

export async function router({ page }: { page: Page; request: Request })
{
    (await page.waitForSelector('#xmlDownload-tab'))?.click()

    let companyName = ''
    let cnpj = ''
    const outputs: { [key: string]: string } = {}

    for (const fileType of ['1', '2']) {
        await page.waitForSelector('#selectTypeFile')
        await new Promise(r => setTimeout(r, 500))

        await page.select('#selectTypeFile', fileType)

        if (fileType == '1') {
            await page.type('#dateStartEmission', startDate)
            await page.type('#dateEndEmission', endDate)
        }

        await page.evaluate(() => {
            // @ts-ignore
            SearchXmlDownload()
        })

        await page.waitForFunction(() => {
            const loader = document.querySelector('#loader-sieg');
            return loader && !loader.classList.contains('hide');
        })

        await page.waitForSelector('#loader-sieg.hide')
        
        await new Promise(r => setTimeout(r, 500))
        
        const isCheckedAll = await (await page.$('#selectAll'))?.evaluate((e: any) => e.checked)
        if (isCheckedAll)
            await page.click('#selectAll')
        await page.click('#selectAll')

        await new Promise(r => setTimeout(r, 500))

        const countSelectedXmlElement = await page.$('#countSelectedXml')
        const countSelectedXml = await page.evaluate(el => el?.textContent, countSelectedXmlElement) as string
        
        const companyNameElement = await page.$('#span-companyName')
        companyName = (await page.evaluate(el => el?.textContent, companyNameElement))?.trim() as string

        cnpj = companyName?.replace(')', '').split('(')[1]

        if (countSelectedXml == '0') {
            log.info(`${companyName} doesn't has any ${fileType == '1' ? 'NFe' : 'CTe'}`)
            continue;
        }

        const currentDownloadPath = path.join(downloadPath, cnpj)

        const client = await page.target().createCDPSession()
        client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: currentDownloadPath
        })

        if (!fs.existsSync(currentDownloadPath))
            fs.mkdirSync(currentDownloadPath)

        log.info(`Downloading ${fileType == '1' ? 'NFe' : 'CTe'} from ${companyName}`)

        await (await page.waitForSelector('#btnExcelXmlDownload', { timeout: 7000 }))?.click()

        const fileName = await waitForTargetDownload(currentDownloadPath)

        const newFilePath = path.join(currentDownloadPath, fileType + '.xlsx')
        await fs.promises.rename(fileName, newFilePath)

        outputs[fileType == '1' ? 'nfe' : 'cte'] = newFilePath
        
        log.info(`Output ${fileType == '1' ? 'NFe' : 'CTe'} (${companyName}) saved at ${fileName}`)
    }
    const outputData = await xlsxMapping(outputs)
    const outputFile = path.join(outputPath, companyName + '.csv')

    jsonToCsv(outputFile, outputData)
    await page.close();


    log.info('Output report saved at: ' + outputFile)
}