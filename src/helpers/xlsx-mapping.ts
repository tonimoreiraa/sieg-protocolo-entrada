import xlsx from 'xlsx'

function xlsxToJson(file?: string)
{
    if (!file)
        return []

    const workbook = xlsx.readFile(file)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const data = xlsx.utils.sheet_to_json(sheet)

    return data
}

function excelSerialToLocaleDateString(serialNumber: number) {
    const baseDate = new Date(1899, 11, 30);
    const date = new Date(baseDate.getTime() + serialNumber * 24 * 60 * 60 * 1000);
    return date.toLocaleDateString('pt-BR')
}

type B = {
    Numero: string
    CnpjEmit: string
    RzEmit: string
    CnpjDest: string
    RzDest: string,
    Valor: number,
    DtEmissao: number,
    DtDownload: number,
    Chave: string
}

const cnpjFormat = (cnpj: string) => cnpj.slice(0, 2) + '.' + 
    cnpj.slice(2, 5) + '.' + 
    cnpj.slice(5, 8) + '/' + 
    cnpj.slice(8, 12) + '-' + 
    cnpj.slice(12, 14);

export async function xlsxMapping(outputs: { [key: string]: string })
{
    const nfe = xlsxToJson(outputs['nfe']) as B[]
    const cte = xlsxToJson(outputs['cte']) as B[]

    const data = [nfe, cte].reduce<any>((acc, array) => {
        return acc.concat(array.filter(row => row.Chave).map(row => ({
            'Tipo': array === nfe ? 'NFe' : 'CTe',
            'Chave': row.Chave,
            'Número': row.Numero,
            'CNPJ Emitente': cnpjFormat(row.CnpjEmit),
            'Razão Emitente': row.RzEmit,
            'CNPJ Destinatário': cnpjFormat(row.CnpjDest),
            'Razão Social Destinatário': row.RzDest,
            'Valor': row.Valor,
            'Data Emissão': excelSerialToLocaleDateString(row.DtEmissao),
            'Data de recebimento na empresa': '',
            'Destinação do Produto (USO/ATIVO/REVENDA/MATERIA-PRIMA)': ''
        })))
    }, [])

    console.log(data)

    return data
}