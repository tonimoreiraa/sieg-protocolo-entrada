const now = new Date();

let month = now.getMonth()
let year = now.getFullYear()

if (month === 0) {
    month = 11;
    year -= 1;
} else {
    month -= 1;
}

export const startDate = new Date(year, month, 1).toLocaleDateString('pt-BR')

export const endDate = new Date(year, month + 1, 0).toLocaleDateString('pt-BR')