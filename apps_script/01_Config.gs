/**
 * ==========================================================================
 * 01_CONFIG.GS - CONFIGURATION & CORE UTILITIES
 * ==========================================================================
 * Project: TA - DA Expense Management Web App
 * Target Sheet ID: 1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY
 * ==========================================================================
 */

const CONFIG = {
  SPREADSHEET_ID: '1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY',
  SECONDARY_SPREADSHEET_ID: '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w',
  SPREADSHEET_IDS: [
    '1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY',
    '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w'
  ],
  APP_TITLE: 'TA-DA Portal',
  HEADER_ROW: ['S.No.', 'Emp. Code', 'Sales Person Name', 'State', 'TA Bill', 'Month', 'Full & Final', 'Submission Date'],
  SECONDARY_STATES: ['Rajasthan', 'Gujarat', 'Bihar', 'Jharkhand'],
  BHAWNA_STATES: ['Rajasthan', 'Gujarat', 'Bihar', 'Jharkhand'],
  PRIMARY_STATES: ['Delhi', 'Haryana', 'Punjab', 'U.P. West', 'MP', 'Chhattisgarh', 'Uttarakhand', 'Local Agra', 'Ex-UP', 'Meghalaya'],
  BHARTI_STATES: ['Delhi', 'Haryana', 'Punjab', 'U.P. West', 'MP', 'Chhattisgarh', 'Uttarakhand', 'Local Agra', 'Ex-UP', 'Meghalaya'],
  STATEWISE_SHEET_NAME: 'Provisional Statewise Costing',
  STATEWISE_COLUMNS: [
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
  ]
};

/**
 * Returns all configured spreadsheet IDs, including the secondary one when set.
 */
function getConfiguredSpreadsheetIds() {
  const rawIds = Array.isArray(CONFIG.SPREADSHEET_IDS)
    ? CONFIG.SPREADSHEET_IDS
    : [CONFIG.SPREADSHEET_ID, CONFIG.SECONDARY_SPREADSHEET_ID];

  const ids = [];
  rawIds.forEach((id) => {
    const cleaned = String(id || '').trim();
    if (cleaned && !ids.includes(cleaned)) ids.push(cleaned);
  });

  if (ids.length === 0) {
    const primary = String(CONFIG.SPREADSHEET_ID || '').trim();
    if (primary) ids.push(primary);
  }

  return ids;
}

/**
 * Checks if a state name belongs to Bhawna territories (Rajasthan, Gujarat, Bihar, Jharkhand).
 */
function isBhawnaState(stateName) {
  if (!stateName) return false;
  var s = String(stateName).trim().toLowerCase();
  var bStates = CONFIG.BHAWNA_STATES || ['Rajasthan', 'Gujarat', 'Bihar', 'Jharkhand'];
  for (var i = 0; i < bStates.length; i++) {
    if (s.indexOf(bStates[i].toLowerCase()) !== -1) return true;
  }
  return false;
}

/**
 * Connect to Google Spreadsheet with diagnostics.
 */
function getSpreadsheetWithStatus() {
  const ids = getConfiguredSpreadsheetIds();
  let ss = null;
  let errorMsg = null;

  for (let i = 0; i < ids.length; i++) {
    try {
      const candidate = SpreadsheetApp.openById(ids[i]);
      if (candidate) {
        ss = candidate;
        break;
      }
    } catch (err) {
      errorMsg = errorMsg || err.toString();
      console.warn('openById failed for configured sheet:', ids[i], err);
    }
  }

  if (!ss) {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (err) {
      if (!errorMsg) errorMsg = err.toString();
    }
  }

  return { ss: ss, error: errorMsg };
}

function getSpreadsheet() {
  return getSpreadsheetWithStatus().ss;
}

/**
 * Returns the Master tab sheet reference.
 */
function getMasterSheet(ss) {
  let sheet = ss.getSheetByName('Master');
  if (!sheet) sheet = ss.getSheetByName('master');
  if (!sheet) sheet = ss.getSheetByName('MASTER');
  if (!sheet) {
    const all = ss.getSheets();
    for (let i = 0; i < all.length; i++) {
      if (all[i].getName().toLowerCase().includes('master')) {
        sheet = all[i];
        break;
      }
    }
  }
  return sheet || ss.getSheets()[0];
}

/**
 * Returns or creates the Statewise Costing sheet.
 */
function getStatewiseSheet(ss) {
  let sheet = ss.getSheetByName(CONFIG.STATEWISE_SHEET_NAME);
  if (!sheet) sheet = ss.getSheetByName('Statewise Costing');
  if (!sheet) sheet = ss.getSheetByName('Statewise');
  if (!sheet) {
    const all = ss.getSheets();
    for (let i = 0; i < all.length; i++) {
      const name = all[i].getName().toLowerCase();
      if (name.includes('statewise') || name.includes('costing')) {
        sheet = all[i];
        break;
      }
    }
  }
  return sheet;
}

/**
 * Starter fallback employee directory.
 */
function getDefaultDirectory() {
  return [
  {
    "code": "HOS0182",
    "name": "Naveen Kumar Sharma",
    "state": "Delhi",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0198",
    "name": "Ashutosh Kumar Dubey",
    "state": "Delhi",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0183",
    "name": "Prashant",
    "state": "Delhi",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0211",
    "name": "Sheetal",
    "state": "Delhi",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0301",
    "name": "Pramod Kumar Srivastwa",
    "state": "Delhi",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0302",
    "name": "Hanuman Dutt Pandey",
    "state": "Delhi",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0053",
    "name": "Nirale",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0069",
    "name": "Ravindra Babu",
    "state": "Local Agra",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0071",
    "name": "Roopkishor Sharma",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0072",
    "name": "Dharmesh Chaturvedi",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0116",
    "name": "Hariom Sharma",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0130",
    "name": "Pawan Kumar Gaur",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0179",
    "name": "Kaushal Varshney",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0197",
    "name": "Pramod Kumar",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0277",
    "name": "Vishnu Sharma",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0281",
    "name": "Yash Varshney",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0287",
    "name": "Pradeep Kumar",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0289",
    "name": "Naresh Kumar",
    "state": "Haryana",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0258",
    "name": "Ravinder Kumar",
    "state": "Haryana",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0272",
    "name": "Anil Kumar",
    "state": "Haryana",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0259",
    "name": "Mandeep",
    "state": "Haryana",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0228",
    "name": "Mukesh Vashishtha",
    "state": "Haryana",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0314",
    "name": "Naresh Kumar",
    "state": "Haryana",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0315",
    "name": "Ashok Kumar Pandey",
    "state": "Haryana",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0110",
    "name": "Govind Kumar",
    "state": "Local Agra",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0284",
    "name": "Nand Lal Yadav",
    "state": "Local Agra",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0283",
    "name": "Vivek Sharma",
    "state": "Local Agra",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0167",
    "name": "Sanjay Agarwal",
    "state": "Local Agra",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0300",
    "name": "Veekesh Kardam",
    "state": "Local Agra",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0307",
    "name": "Shrikant Sharma",
    "state": "Local Agra",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0317",
    "name": "Manoj",
    "state": "Local Agra",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0329",
    "name": "Udayveer Singh",
    "state": "Local Agra",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0203",
    "name": "Yogendra Singh Parihar",
    "state": "MP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0252",
    "name": "Sunil UPadhyay",
    "state": "MP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0176",
    "name": "Narendra Rathore",
    "state": "MP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0293",
    "name": "Sunil Chokshe",
    "state": "MP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "MSS0009",
    "name": "Ramesh Sharma",
    "state": "MP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "MSS0015",
    "name": "Rajesh Rathor",
    "state": "MP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "MSS0016",
    "name": "Sandeep Sharma",
    "state": "MP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "MSS0018",
    "name": "Lalji Rajak",
    "state": "MP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0325",
    "name": "Hamendra",
    "state": "MP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0216",
    "name": "Sudarshan Kumar",
    "state": "Punjab",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0271",
    "name": "Kamal Kumar",
    "state": "Punjab",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0320",
    "name": "Raman Kumar",
    "state": "Punjab",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0326",
    "name": "Surinder Singh",
    "state": "Punjab",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0246",
    "name": "Vivek Kumar Dubey",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0185",
    "name": "Muzffer",
    "state": "U.P. West",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0327",
    "name": "Devendra Kumar Mahendru",
    "state": "U.P. West",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0244",
    "name": "Jagdeep",
    "state": "U.P. West",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0249",
    "name": "Dharm Singh Tomer",
    "state": "U.P. West",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0305",
    "name": "Kapil Sharma",
    "state": "U.P. West",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0321",
    "name": "Sandeep Kumar",
    "state": "U.P. West",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0214",
    "name": "Jay Nandan",
    "state": "Uttarakhand",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0282",
    "name": "Lalit Kumar Sharma",
    "state": "Uttarakhand",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0333",
    "name": "Vikram",
    "state": "Delhi",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0334",
    "name": "Deepak Duhan",
    "state": "Haryana",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0331",
    "name": "Omprakash Makode",
    "state": "MP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0335",
    "name": "Shaaleen Kapoor",
    "state": "Punjab",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0270",
    "name": "Tej Pal",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0330",
    "name": "Gaurav Khurana",
    "state": "Uttarakhand",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0337",
    "name": "Ajay Kumar Gupta",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0339",
    "name": "Sachin Gupta",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0340",
    "name": "Manoj Kumar",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0341",
    "name": "Satwinder Singh",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0342",
    "name": "Himanshu Bhadauria",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0336",
    "name": "Sombir",
    "state": "Haryana",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0338",
    "name": "Manmohan Datt Bhardwaj",
    "state": "Local Agra",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0343",
    "name": "Dharmendra Upadhyay",
    "state": "Local Agra",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0344",
    "name": "Manoj Sharma",
    "state": "MP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0345",
    "name": "Kanti Prasad",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0349",
    "name": "Gobind Singh",
    "state": "Ex-UP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0353",
    "name": "Akshay Kumar",
    "state": "Haryana",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0350",
    "name": "Girish Kumar",
    "state": "Haryana",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0347",
    "name": "Bhanu Pratap Singh",
    "state": "Local Agra",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0348",
    "name": "Jitendra Kumar",
    "state": "Local Agra",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0351",
    "name": "Braj Ballabh Sharma",
    "state": "MP",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0357",
    "name": "Nitin Sharma",
    "state": "Punjab",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0356",
    "name": "Pushpender Sharma",
    "state": "U.P. West",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0355",
    "name": "Rakesh Kumar Verma",
    "state": "U.P. West",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0358",
    "name": "Satyendra Kumar Singh",
    "state": "U.P. West",
    "designation": "Sales Representative",
    "phone": ""
  },
  {
    "code": "HOS0388",
    "name": "Deepak Yadav",
    "state": "Rajasthan",
    "phone": "+91 94140 78901",
    "designation": "Sales Officer"
  },
  {
    "code": "HOS0601",
    "name": "Suresh Choudhary",
    "state": "Rajasthan",
    "phone": "+91 94141 12345",
    "designation": "Area Sales Manager"
  },
  {
    "code": "HOS0602",
    "name": "Ramesh Meena",
    "state": "Rajasthan",
    "phone": "+91 94142 23456",
    "designation": "Territory Manager"
  },
  {
    "code": "HOS0603",
    "name": "Vikram Rathore",
    "state": "Rajasthan",
    "phone": "+91 94143 34567",
    "designation": "Sr. Sales Executive"
  },
  {
    "code": "HOS0604",
    "name": "Mahendra Singh",
    "state": "Rajasthan",
    "phone": "+91 94144 45678",
    "designation": "Sales Officer"
  },
  {
    "code": "HOS0605",
    "name": "Kailash Chand",
    "state": "Rajasthan",
    "phone": "+91 94145 56789",
    "designation": "Sales Executive"
  },
  {
    "code": "HOS0606",
    "name": "Dinesh Sharma",
    "state": "Rajasthan",
    "phone": "+91 94146 67890",
    "designation": "Territory Executive"
  },
  {
    "code": "HOS0607",
    "name": "Mukesh Prajapat",
    "state": "Rajasthan",
    "phone": "+91 94147 78901",
    "designation": "Sales Officer"
  },
  {
    "code": "HOS0608",
    "name": "Gopal Saini",
    "state": "Rajasthan",
    "phone": "+91 94148 89012",
    "designation": "Sales Executive"
  },
  {
    "code": "HOS0609",
    "name": "Rajendra Prasad",
    "state": "Rajasthan",
    "phone": "+91 94149 90123",
    "designation": "Sr. Sales Officer"
  },
  {
    "code": "HOS0610",
    "name": "Hanuman Ram",
    "state": "Rajasthan",
    "phone": "+91 94150 01234",
    "designation": "Territory Manager"
  },
  {
    "code": "HOS0531",
    "name": "Rakesh Gupta",
    "state": "Bihar",
    "phone": "+91 94310 12345",
    "designation": "Sales Executive"
  },
  {
    "code": "HOS0612",
    "name": "Santosh Kumar",
    "state": "Bihar",
    "phone": "+91 94311 23456",
    "designation": "Area Sales Manager"
  },
  {
    "code": "HOS0613",
    "name": "Amit Paswan",
    "state": "Bihar",
    "phone": "+91 94312 34567",
    "designation": "Territory Manager"
  },
  {
    "code": "HOS0614",
    "name": "Manoj Yadav",
    "state": "Bihar",
    "phone": "+91 94313 45678",
    "designation": "Sales Officer"
  },
  {
    "code": "HOS0615",
    "name": "Praveen Jha",
    "state": "Bihar",
    "phone": "+91 94314 56789",
    "designation": "Sales Executive"
  },
  {
    "code": "HOS0621",
    "name": "Birsa Munda",
    "state": "Jharkhand",
    "phone": "+91 94315 67890",
    "designation": "Sales Officer"
  },
  {
    "code": "HOS0622",
    "name": "Rajesh Tirkey",
    "state": "Jharkhand",
    "phone": "+91 94316 78901",
    "designation": "Territory Manager"
  },
  {
    "code": "HOS0623",
    "name": "Anand Soren",
    "state": "Jharkhand",
    "phone": "+91 94317 89012",
    "designation": "Sales Executive"
  },
  {
    "code": "HOS0631",
    "name": "Bhavesh Patel",
    "state": "Gujarat",
    "phone": "+91 98250 12345",
    "designation": "Territory Manager"
  },
  {
    "code": "HOS0632",
    "name": "Jignesh Shah",
    "state": "Gujarat",
    "phone": "+91 98251 23456",
    "designation": "Sales Executive"
  },
  {
    "code": "HOS0633",
    "name": "Paresh Mehta",
    "state": "Gujarat",
    "phone": "+91 98252 34567",
    "designation": "Sr. Sales Officer"
  },
  {
    "code": "HOS0634",
    "name": "Hiren Joshi",
    "state": "Gujarat",
    "phone": "+91 98253 45678",
    "designation": "Area Sales Manager"
  }
];
}

/**
 * ==========================================================================
 * FINANCIAL YEAR MONTH-WISE SEQUENCE UTILITIES (Apr ➔ Mar)
 * ==========================================================================
 * Ensures that any new month tab is created in the last month-wise sequence
 * (Apr -> May -> Jun -> Jul -> Aug -> Sep -> Oct -> Nov -> Dec -> Jan -> Feb -> Mar)
 */
var FY_MONTH_ORDER_MAP = {
  // Master is 1st tab
  'master': -2,
  'bharti ta master': -2,
  'bhawna ta master': -2,
  'ta master': -2,

  // Statewise is 2nd tab
  'statewise': -1,
  'statewise costing': -1,
  'state-wise costing': -1,
  'statewise costing sheet': -1,
  'costing': -1,

  // Financial Year Months (Apr -> Mar)
  'apr': 1, 'april': 1,
  'may': 2,
  'jun': 3, 'june': 3,
  'jul': 4, 'july': 4,
  'aug': 5, 'august': 5,
  'sep': 6, 'sept': 6, 'september': 6,
  'oct': 7, 'october': 7,
  'nov': 8, 'november': 8,
  'dec': 9, 'december': 9,
  'jan': 10, 'january': 10,
  'feb': 11, 'february': 11,
  'mar': 12, 'march': 12
};

function getMonthSortWeight(sheetName) {
  if (!sheetName) return null;
  var s = String(sheetName).trim().toLowerCase();
  for (var key in FY_MONTH_ORDER_MAP) {
    if (FY_MONTH_ORDER_MAP.hasOwnProperty(key)) {
      if (s === key || s.startsWith(key)) {
        return FY_MONTH_ORDER_MAP[key];
      }
    }
  }
  return null;
}

/**
 * Positions a monthly sheet in strict month-wise sequence:
 * (Master -> Statewise -> Apr -> May -> Jun -> Jul -> Aug -> Sep -> Oct -> Nov -> Dec -> Jan -> Feb -> Mar)
 */
function positionMonthSheetInSequence(ss, monthSheet, monthName) {
  try {
    if (!ss || !monthSheet) return;
    var nameToTest = String(monthName || monthSheet.getName()).trim();
    var targetWeight = getMonthSortWeight(nameToTest);
    if (!targetWeight) return;

    var allSheets = ss.getSheets();
    var insertAfterIndex = -1; // 1-based index in Google Sheets
    var insertBeforeIndex = -1;

    for (var i = 0; i < allSheets.length; i++) {
      var s = allSheets[i];
      if (s.getSheetId() === monthSheet.getSheetId()) continue;
      var sWeight = getMonthSortWeight(s.getName());

      if (sWeight !== null) {
        if (sWeight < targetWeight) {
          insertAfterIndex = s.getIndex();
        } else if (sWeight > targetWeight && insertBeforeIndex === -1) {
          insertBeforeIndex = s.getIndex();
        }
      }
    }

    ss.setActiveSheet(monthSheet);
    if (insertBeforeIndex !== -1) {
      ss.moveActiveSheet(insertBeforeIndex);
    } else if (insertAfterIndex !== -1) {
      ss.moveActiveSheet(insertAfterIndex + 1);
    } else {
      ss.moveActiveSheet(ss.getNumSheets());
    }
  } catch (err) {
    console.warn('Error in positionMonthSheetInSequence:', err);
  }
}

/**
 * Reorders all existing tabs into the exact sequence:
 * 1. Master -> 2. Statewise -> 3. Apr -> 4. May -> 5. Jun -> 6. Jul -> 7. Aug -> 8. Sep -> ...
 */
function sortAllSheetsInMonthSequence(ss) {
  try {
    if (!ss) {
      try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { return; }
    }
    if (!ss) return;

    var sheets = ss.getSheets();
    var sortedSheets = [];

    sheets.forEach(function(s) {
      var w = getMonthSortWeight(s.getName());
      if (w !== null) {
        sortedSheets.push({ sheet: s, weight: w });
      }
    });

    sortedSheets.sort(function(a, b) { return a.weight - b.weight; });

    for (var i = 0; i < sortedSheets.length; i++) {
      var targetSheet = sortedSheets[i].sheet;
      ss.setActiveSheet(targetSheet);
      ss.moveActiveSheet(i + 1);
    }

    // Automatically enforce Calibri 10 & Middle alignment across all sheets
    sheets.forEach(function(s) {
      try {
        var lastR = s.getLastRow();
        var lastC = s.getLastColumn();
        if (lastR > 0 && lastC > 0) {
          s.getRange(1, 1, lastR, lastC)
            .setFontFamily('Calibri')
            .setFontSize(10)
            .setVerticalAlignment('middle');
        }
      } catch (eFmt) {}
    });
  } catch (err) {
    console.warn('Error in sortAllSheetsInMonthSequence:', err);
  }
}

/**
 * Applies the exact order & lock states shown in the user specification:
 * 🔒 Master ➔ 🔒 Statewise ➔ 🔒 Apr ➔ 🔒 May ➔ 🔒 Jun ➔ 🔒 Jul ➔ 🔒 Aug ➔ Sep (Active/unlocked)
 */
function applyStandardSheetOrderAndLocks(ss) {
  try {
    if (!ss) {
      try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { return; }
    }
    if (!ss) return;

    sortAllSheetsInMonthSequence(ss);

    var sheets = ss.getSheets();
    sheets.forEach(function(s) {
      var name = s.getName().trim();
      var w = getMonthSortWeight(name);
      if (w !== null && w < 6) { // Master (-2), Statewise (-1), Apr (1) through Aug (5)
        var protections = s.getProtections(SpreadsheetApp.ProtectionType.SHEET);
        if (protections.length === 0) {
          var p = s.protect().setDescription('Admin Protected: ' + name);
          try { p.removeEditors(p.getEditors()); } catch (e) {}
          try { if (p.canDomainEdit()) p.setDomainEdit(false); } catch (e) {}
        }
      } else if (w === 6) { // Sep (Active current month)
        var protections = s.getProtections(SpreadsheetApp.ProtectionType.SHEET);
        protections.forEach(function(p) {
          try { p.remove(); } catch (e) {}
        });
      }
    });
  } catch (err) {
    console.warn('Error in applyStandardSheetOrderAndLocks:', err);
  }
}
