/**
 * Official State-wise TA - DA Costing Matrix Data
 * Extracted directly from the "Provisional Statewise Costing" sheet.
 */

export const STATEWISE_COLUMNS = [
  'MP',
  'CG',
  'HARYANA',
  'MEGALAYA',
  'BIHAR',
  'JHARKHAND',
  'DELHI',
  'UP',
  'UK',
  'RAJ',
  'PUNJAB',
  'GUJRAT'
];

export const OFFICIAL_STATEWISE_DATA = [
  {
    month: 'Apr',
    expenseType: 'TA-Bills',
    total: 1282992,
    breakdown: {
      MP: 136879,
      CG: 0,
      HARYANA: 68038,
      MEGALAYA: 0,
      BIHAR: 54858,
      JHARKHAND: 49940,
      DELHI: 124082,
      UP: 271476,
      UK: 34350,
      RAJ: 448380,
      PUNJAB: 49032,
      GUJRAT: 45957
    }
  },
  {
    month: 'May',
    expenseType: 'TA-Bills',
    total: 1246460,
    breakdown: {
      MP: 160935,
      CG: 0,
      HARYANA: 69525,
      MEGALAYA: 0,
      BIHAR: 57380,
      JHARKHAND: 43983,
      DELHI: 71110,
      UP: 227753,
      UK: 39001,
      RAJ: 479916,
      PUNJAB: 48982,
      GUJRAT: 47875
    }
  },
  {
    month: 'Jun',
    expenseType: 'TA-Bills',
    total: 1257674,
    breakdown: {
      MP: 137841,
      CG: 0,
      HARYANA: 80265,
      MEGALAYA: 0,
      BIHAR: 54398,
      JHARKHAND: 20312,
      DELHI: 89558,
      UP: 256342,
      UK: 47643,
      RAJ: 494533,
      PUNJAB: 42286,
      GUJRAT: 34495
    }
  },
  {
    month: 'Jul',
    expenseType: 'TA-Bills',
    total: 1338900,
    breakdown: {
      MP: 171747,
      CG: 0,
      HARYANA: 82711,
      MEGALAYA: 0,
      BIHAR: 51383,
      JHARKHAND: 6893,
      DELHI: 77180,
      UP: 307269,
      UK: 44636,
      RAJ: 520563,
      PUNJAB: 49438,
      GUJRAT: 27080
    }
  },
  {
    month: 'Aug',
    expenseType: 'TA-Bills',
    total: 1150355,
    breakdown: {
      MP: 155511,
      CG: 0,
      HARYANA: 81663,
      MEGALAYA: 0,
      BIHAR: 0,
      JHARKHAND: 0,
      DELHI: 78120,
      UP: 275145,
      UK: 33691,
      RAJ: 494949,
      PUNJAB: 31276,
      GUJRAT: 0
    }
  }
];

export function getStatewiseTotals(data = OFFICIAL_STATEWISE_DATA) {
  const columnTotals = {};
  STATEWISE_COLUMNS.forEach(col => {
    columnTotals[col] = 0;
  });

  let grandTotal = 0;

  data.forEach(row => {
    grandTotal += row.total;
    STATEWISE_COLUMNS.forEach(col => {
      columnTotals[col] += (row.breakdown[col] || 0);
    });
  });

  return { columnTotals, grandTotal };
}
