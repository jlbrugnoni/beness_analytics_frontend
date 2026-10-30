// Fit against calendar day numbers, excluding days without scheduled capacity.
export const addOccupancyTrends = (rows) => {
    const result = rows.map((row) => ({ ...row }));
    for (const key of ["current", "previous"]) {
        const points = rows.filter((row) => row[key] != null && Number.isFinite(Number(row[key])));
        if (points.length < 2) continue;
        const meanX = points.reduce((sum, row) => sum + Number(row.label), 0) / points.length;
        const meanY = points.reduce((sum, row) => sum + Number(row[key]), 0) / points.length;
        const variance = points.reduce((sum, row) => sum + (Number(row.label) - meanX) ** 2, 0);
        const slope = variance ? points.reduce((sum, row) => sum + (Number(row.label) - meanX) * (Number(row[key]) - meanY), 0) / variance : 0;
        for (const row of result) {
            row[`${key}_trend`] = row[key] == null ? null : Number((meanY + slope * (Number(row.label) - meanX)).toFixed(2));
        }
    }
    return result;
};
