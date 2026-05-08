
export const mallasData = [
    { mesh: 5, apertura: 5.000 },
    { mesh: 6, apertura: 4.000 },
    { mesh: 8, apertura: 3.000 },
    { mesh: 10, apertura: 2.000 },
    { mesh: 12, apertura: 1.600 },
    { mesh: 20, apertura: 1.000 },
    { mesh: 30, apertura: 0.600 },
    { mesh: 80, apertura: 0.200 },
    { mesh: 140, apertura: 0.105 },
    { mesh: 200, apertura: 0.075 },
    { mesh: 325, apertura: 0.044 },
    { mesh: 400, apertura: 0.038 },
    { mesh: 500, apertura: 0.030 },
    { mesh: 600, apertura: 0.026 },
    { mesh: 800, apertura: 0.022 },
    { mesh: 1000, apertura: 0.015 },
];


export function formatDateToDDMMYYYY(dateString) {
    const dateParts = dateString.split('/');
    let day = dateParts[1];
    let month = dateParts[0];
    const year = dateParts[2];
    if (month.length === 1) {
        month = `0${month}`;
    }
    if (day.length === 1) {
        day = `0${day}`
    }
    return `${year}-${day}-${month}`;
}