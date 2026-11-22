/**
 * Pure deterministic service for cleaning Indian banking/UPI narrations,
 * auto-tagging categories, pairing reversals, and detecting friend splits.
 */

const DEFAULT_MERCHANT_RULES = [
  // Income / Salary & Interest
  {
    pattern: /ADMINWARE\s+SALARY|SALARY/i,
    category: "Salary",
    type: "income",
    payee: "Adminware Software",
    defaultNote: "Monthly Salary",
    isSalary: true,
  },
  {
    pattern: /INTEREST\s+PAID/i,
    category: "Interest",
    type: "income",
    payee: "Bank Interest",
    defaultNote: "Savings Account Interest",
  },
  // Reversals & Refunds
  {
    pattern: /^REV-UPI|REVERSAL|REFUND/i,
    category: "Refund / Reversal",
    type: "income",
    isReversal: true,
    defaultNote: "Reversal Refund",
  },
  // Known Statement Merchants (from HDFC / SBI user data)
  {
    pattern: /SELVA\s+KUMAR\s+K/i,
    category: "Food & Dining",
    subcategory: "Breakfast",
    payee: "Selva Kumar K",
    defaultNote: "Breakfast / Tea",
  },
  {
    pattern: /ZUBAITHA\s+RESTAURANT/i,
    category: "Food & Dining",
    subcategory: "Dinner",
    payee: "Zubaitha Restaurant",
    defaultNote: "Dinner / Dining",
  },
  {
    pattern: /CHALLENGE\s+HOTEL/i,
    category: "Food & Dining",
    subcategory: "Lunch",
    payee: "Challenge Hotel",
    defaultNote: "Dining / Meals",
  },
  {
    pattern: /SENTHUR\s+MURUGAN\s+STOR/i,
    category: "Groceries",
    subcategory: "Fresh Produce",
    payee: "Senthur Murugan Stores",
    defaultNote: "Daily Provisions",
  },
  {
    pattern: /LOUISE\s+KALA\s+M/i,
    category: "Food & Dining",
    subcategory: "Cafes & Fast Food",
    payee: "Louise Kala M",
    defaultNote: "Food & Refreshments",
  },
  {
    pattern: /CUMTA|CHENNAI\s+METRO|CMRL/i,
    category: "Travel",
    subcategory: "Bus & Transit",
    payee: "CUMTA Metro",
    defaultNote: "Metro Commute",
  },
  {
    pattern: /IRCTC|INDIAN\s+RAIL/i,
    category: "Travel",
    subcategory: "Train",
    payee: "IRCTC",
    defaultNote: "Train Travel",
  },
  {
    pattern: /UBER|OLA\s+CABS|RAPIDO/i,
    category: "Travel",
    subcategory: "Taxi & Cab",
    defaultNote: "Cab / Auto Ride",
  },
  {
    pattern: /AIRTEL|JIO|VODAFONE|IDEA|BSNL/i,
    category: "Bills & Utilities",
    subcategory: "Mobile & Internet",
    defaultNote: "Mobile / Broadband",
  },
  {
    pattern: /ELECTRICITY|TNEB|BESCOM|WATER\s+BOARD/i,
    category: "Bills & Utilities",
    subcategory: "Electricity",
    defaultNote: "Utility Bill",
  },
  {
    pattern: /SWIGGY|ZOMATO|ZEPTO|BLINKIT|INSTAMART/i,
    category: "Food & Dining",
    subcategory: "Cafes & Fast Food",
    defaultNote: "Food Delivery / Quick Commerce",
  },
  {
    pattern: /AMAZON|FLIPKART|MYNTRA|AJIO|MEESHO|DRESS|CLOTHES?|CLOTHING|SHIRT|PANTS?|SHORTS|SHOES|CHURIDAR|\bCHUR\b/i,
    category: "Shopping",
    subcategory: "Clothing",
    defaultNote: "Online Shopping",
  },
  {
    pattern: /APOLLO|PHARMACY|MEDPLUS|MEDICAL|CLINIC|HOSPITAL/i,
    category: "Health",
    subcategory: "Medicines & Pharmacy",
    defaultNote: "Medical & Health",
  },
  {
    pattern: /PVR|INOX|CINEMAS?|BOOKMYSHOW|NETFLIX|SPOTIFY|HOTSTAR|YOUTUBE|PRIME\s*VIDEO|\bMOVI\b|MOVIE/i,
    category: "Entertainment",
    subcategory: "Streaming & OTT",
    defaultNote: "Entertainment & Streaming",
  },
  {
    pattern: /ZERODHA|GROWW|UPSTOX|MUTUAL\s*FUND|SIP|INDMONEY|KFINTECH|CAMS|NPS|PPF/i,
    category: "Investment",
    subcategory: "Mutual Funds & SIP",
    defaultNote: "Investment & Wealth",
  },
  {
    pattern: /HOUSE\s*RENT|FLAT\s*RENT|\bRENT\b|\bHOUS\b|MAINTENANCE\s*FEE|SOCIETY\s*MAINT/i,
    category: "Bills & Utilities",
    subcategory: "House Rent",
    defaultNote: "Rent & Housing",
  },
  {
    pattern: /PETROL|DIESEL|FUEL|HPCL|BPCL|IOCL|INDIAN\s*OIL|SHELL\s*PETROL/i,
    category: "Travel",
    subcategory: "Petrol & Fuel",
    defaultNote: "Fuel / Petrol",
  },
  {
    pattern: /DINNER|DINNET|\bDINN\b|\bDI\b|LUNCH|BREAKFAST|FOOD|MEAL|TIFFIN|BIRIYANI|BIRAYANI|BAJJI|DOSA|IDLY|IDLI|CHICKEN|CHICKRN|\bCHIC\b|MUTTON|FISH|EATERY|SWEETS?|SNACKS?|TEA|COFFEE|BAKERY|BAKES|CAFE|RESTAURANT|HOTEL|JUICE|ICE\s*CREAM|PAROTTA|ROTI|NOODLES|PIZZA|BURGER|SHAWARMA|\bCHIP\b|\bLAYS\b|\bSUNDA\b|CATERING|BOTTLE|WARER\s*BOTTLE|WATER\s*BOTTLE/i,
    category: "Food & Dining",
  },
  {
    pattern: /HONEY|MILK|EGGS?|VEGETABLES?|VEG|FRUITS?|TOMATO|ONION|COCONUT|TENDER\s*COCONUT|APPLE|BANANA|PROVISIONS?|GROCERY|SUPER\s*MARKET|HYPERMARKET|MART|STORES?|RICE|OIL|ATTA|MAIDA|MASALA|DAIRY|PAZHAMUD|\bGROC\b|\bGRO\b|\bCARR\b/i,
    category: "Groceries",
  },
  {
    pattern: /PETROL|DIESEL|FUEL|TOLL|FASTAG|PARKING|BUS|RED\s*BUS|FLIGHT|INDIGO|AIR\s*INDIA|TRANSPORT|IRCTC|INDIAN\s*RAIL|INDIAN\s*R|\bTRAI\b|\bTICK\b|AUTO|CAB|UBER|OLA|RAPIDO|METRO/i,
    category: "Travel",
  },
  {
    pattern: /SALON|SPA|GROOM|BEAUTY|PARLOUR|HAIR\s*CUT|\bWASH\b|LAUNDRY/i,
    category: "Personal Care",
    defaultNote: "Grooming & Personal Care",
  },
  {
    pattern: /RECHARGE|ACT\s*FIBER|CURRENT|\bCURR\b|INTERNET|WIFI|BROADBAND|\bINTE\b|WATER\s*CAN|NEWSPAPER|GAS|CYLINDER|BHARAT\s*GAS|INDANE|HP\s*GAS|GOOGLE\s*INDIA|GOOGLE\s*I\b/i,
    category: "Bills & Utilities",
  },
  {
    pattern: /TABLETS?|MEDICINE|DOCTOR|LAB|SCAN|DIAGNOSTICS?/i,
    category: "Health",
  },
  {
    pattern: /LENDING|LENT|BORROW|BORROWED|HOMIES|HOMIESBROOM|SPLIT|SHARE|ROOMMATE|FLAT\s*SHARE|\bINSU\b|INSURANCE/i,
    category: "Transfer",
    defaultNote: "Split / Shared Spend",
  },
  {
    pattern: /MOM|MOTHER|DAD|FATHER|FAMILY|PARENTS|EXPENSES|\bSELA\b/i,
    category: "Transfer",
    defaultNote: "Family / Personal Transfer",
  },
];

const SPLIT_KEYWORDS = [
  "LENDING",
  "LENT",
  "BORROW",
  "BORROWED",
  "HOMIES",
  "HOMIESBROOM",
  "SPLIT",
  "SHARE",
  "ROOMMATE",
  "FLAT",
  "RENT SHARE",
];

const REMARK_MAP = {
  dinn: "Dinner",
  di: "Dinner",
  chic: "Chicken",
  sunda: "Sundal",
  lays: "Lays",
  chip: "Chips",
  trea: "Treat",
  chal: "Tea / Snacks",
  dosa: "Dosa",
  ic: "Ice Cream",
  trai: "Train",
  tick: "Ticket",
  curr: "Current Bill",
  inte: "Internet Bill",
  bill: "Utility Bill",
  milk: "Milk",
  gro: "Groceries",
  eggs: "Eggs",
  carr: "Vegetables",
  movi: "Movie",
  chur: "Churidar / Dress",
  wash: "Washing / Laundry",
  sela: "Expenses",
  babu: "Babu",
  jail: "Snacks",
  sang: "General Expense",
  mirr: "Personal Expense",
  refu: "Refund",
};

export class MerchantRuleService {
  /**
   * Cleans a raw bank narration string (UPI, FT, POS, REV-UPI) into
   * a human-readable payee, contextual note, reference, and split/reversal flags.
   */
  static cleanNarration(rawNarration, rawType = "expense") {
    const raw = String(rawNarration ?? "").trim();
    if (!raw) {
      return {
        payee: "Transaction",
        note: "",
        reference: "",
        type: rawType,
        isReversal: false,
        isSplit: false,
        isSalary: false,
      };
    }

    let payee = raw;
    let note = "";
    let reference = "";
    let isReversal = false;
    let isSplit = false;
    let splitPerson = null;
    let splitType = null;
    let isSalary = false;

    // 1. Slash UPI format: [WDL|DEP TFR ]UPI/(DR|CR)/<RRN>/<PAYEE>/<BANK>/<VPA>/<REMARK>
    const slashUpiMatch = raw.match(
      /^(?:(?:WDL|DEP)\s+TFR\s+)?UPI\/(DR|CR)\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)(?:\/(.*))?$/i
    );
    if (slashUpiMatch) {
      const [, drCr, rrn, rawPayee, , , rawTail] = slashUpiMatch;
      reference = rrn ? rrn.trim() : "";
      payee = this.titleCase(rawPayee.trim());
      const isCredit = drCr.toUpperCase() === "CR";
      if (rawTail && /REFUND|REVERSAL|REFU/i.test(rawTail)) {
        isReversal = true;
      }
      if (rawTail) {
        const firstToken = rawTail.trim().split(/\s+/)[0].toLowerCase();
        if (REMARK_MAP[firstToken]) {
          note = REMARK_MAP[firstToken];
        } else if (!/^\d+$/.test(firstToken) && firstToken !== "upi" && firstToken !== "pay") {
          note = this.titleCase(firstToken);
        }
      }
      if (!note) note = payee;
    }
    // 2. Dash UPI format: UPI-<PAYEE>-<VPA>-<IFSC>-<REF>-<REMARK>
    else if (raw.toUpperCase().startsWith("UPI-")) {
      const parts = raw.split("-").map((p) => p.trim()).filter(Boolean);
      // parts[0] is 'UPI'
      const rawPayee = parts[1] || "";
      payee = this.titleCase(rawPayee);

      // Extract UTR/reference (usually 12-digit numeric part)
      for (const p of parts) {
        if (/^\d{12}$/.test(p)) {
          reference = p;
          break;
        }
      }

      // Context remark at the tail (e.g. BREAKFAST, DINNER, LENDING, HOMIESBROOM)
      if (parts.length >= 6) {
        note = parts.slice(5).join(" ").trim();
      } else if (parts.length >= 3) {
        const lastPart = parts[parts.length - 1];
        if (!/^\d{10,}$/.test(lastPart) && !lastPart.includes("@")) {
          note = lastPart;
        }
      }

      if (note) {
        note = this.titleCase(note);
      }
    }
    // 2. UPI Reversal: REV-UPI-<ACC>-<VPA>-<REF>-<REMARK>
    else if (raw.toUpperCase().startsWith("REV-UPI")) {
      isReversal = true;
      const parts = raw.split("-").map((p) => p.trim()).filter(Boolean);
      const tail = parts.length > 3 ? parts[parts.length - 1] : "";
      payee = tail ? `Reversal: ${this.titleCase(tail)}` : "UPI Reversal Refund";
      note = `Reversal credit for failed payment (${raw.slice(0, 40)})`;
      for (const p of parts) {
        if (/^\d{12}$/.test(p)) {
          reference = p;
          break;
        }
      }
    }
    // 3. Salary transfer: FT- ADMINWARE SALARY <MONTH>-<ACC> - <COMPANY>
    else if (/ADMINWARE\s+SALARY|FT-\s*ADMINWARE/i.test(raw)) {
      isSalary = true;
      payee = "Adminware Software";
      const monthMatch = raw.match(/SALARY\s+([A-Za-z]{3,9})/i);
      note = monthMatch ? `Salary ${this.titleCase(monthMatch[1])}` : "Monthly Salary";
    }
    // 4. Bank Interest: INTEREST PAID TILL <DATE>
    else if (/INTEREST\s+PAID/i.test(raw)) {
      payee = "HDFC Bank Interest";
      const dateMatch = raw.match(/TILL\s*([\d/-]+)/i);
      note = dateMatch ? `Interest till ${dateMatch[1]}` : "Quarterly Savings Interest";
    }
    // 5. POS Card Swipes: POS 4160... <MERCHANT>
    else if (raw.toUpperCase().startsWith("POS ")) {
      const cleaned = raw.replace(/^POS\s+\d+\s+/i, "").trim();
      payee = this.titleCase(cleaned.slice(0, 48));
      note = "Card Swipe Purchase";
    }
    // 6. ATM Withdrawal: NWD-... or ATW-...
    else if (/^(?:NWD|ATW)-/i.test(raw)) {
      payee = "ATM Cash Withdrawal";
      note = raw.slice(4).trim();
    } else {
      payee = this.titleCase(raw.slice(0, 48));
      note = raw.slice(0, 80);
    }

    // Check for peer lending / split markers in payee, narration, or note
    const combinedForSplits = `${raw} ${note}`.toUpperCase();
    for (const kw of SPLIT_KEYWORDS) {
      if (combinedForSplits.includes(kw)) {
        isSplit = true;
        splitPerson = payee;
        if (rawType === "income") {
          splitType = "settlement"; // friend settled/repaid me
          if (!note) note = "Repayment / Settlement";
        } else {
          splitType = "lent"; // I lent money to friend
          if (!note) note = "Lent to friend";
        }
        break;
      }
    }

    return {
      payee: payee || "Transaction",
      note: note || payee,
      reference,
      type: isReversal || isSalary ? "income" : rawType,
      isReversal,
      isSplit,
      splitPerson,
      splitType,
      isSalary,
    };
  }

  /**
   * Matches a transaction narration against custom user rules and built-in heuristics
   * to determine category, clean payee, and flags without calling an LLM.
   */
  static categorizeTransaction(
    row,
    { customRules = [], existingCategories = [] } = {}
  ) {
    const rawNarration = row.rawNarration || row.note || row.payee || "";
    const rawType = row.type || "expense";
    const cleaned = this.cleanNarration(rawNarration, rawType);

    // If payee or note already has high-quality values (e.g. from Google Pay parser or direct input), preserve them
    if (row.payee && row.payee !== "Transaction" && !row.payee.includes("/")) {
      cleaned.payee = this.titleCase(row.payee);
    }
    if (row.note && row.note !== row.payee && !row.note.includes("/")) {
      cleaned.note = this.titleCase(row.note);
    }

    // 1. Check custom user rules first (configured in user preferences)
    for (const rule of customRules || []) {
      if (!rule?.pattern) continue;
      const regex = typeof rule.pattern === "string" ? new RegExp(rule.pattern, "i") : rule.pattern;
      const target = rule.matchField === "payee" ? cleaned.payee : `${rawNarration} ${cleaned.payee} ${row.payee || ""}`;
      if (regex.test(target)) {
        return {
          ...cleaned,
          category: rule.category || (cleaned.isSalary ? "Salary" : "Uncategorized"),
          subcategory: rule.subcategory || null,
          type: rule.type || cleaned.type,
          note: rule.note || cleaned.note,
          payee: rule.payee || cleaned.payee,
          matchedRule: rule.name || rule.pattern,
          isMicroSpend: Number(row.amount) <= 200,
        };
      }
    }

    // 2. Check default built-in heuristics
    const targetString = `${rawNarration} ${cleaned.payee} ${cleaned.note} ${row.payee || ""} ${row.note || ""}`.toUpperCase();
    for (const rule of DEFAULT_MERCHANT_RULES) {
      if (rule.pattern.test(targetString)) {
        // Resolve closest match in existingCategories if possible
        const resolvedCategory = this.resolveCategoryName(rule.category, existingCategories);
        return {
          ...cleaned,
          category: resolvedCategory,
          subcategory: rule.subcategory || null,
          type: rule.type || cleaned.type,
          note: rule.defaultNote || cleaned.note,
          payee: rule.payee || cleaned.payee,
          isReversal: Boolean(rule.isReversal || cleaned.isReversal),
          isSalary: Boolean(rule.isSalary || cleaned.isSalary),
          isMicroSpend: Number(row.amount) <= 200,
        };
      }
    }

    // 3. Fallback
    const fallbackCategory =
      cleaned.type === "income"
        ? this.resolveCategoryName("Income", existingCategories)
        : this.resolveCategoryName("Uncategorized", existingCategories);

    return {
      ...cleaned,
      category: fallbackCategory,
      subcategory: null,
      isMicroSpend: Number(row.amount) <= 200,
    };
  }

  static resolveCategoryName(candidate, existingCategories = []) {
    if (!candidate) return "Uncategorized";
    const lower = candidate.toLowerCase();
    const match = existingCategories.find((c) => c.name?.toLowerCase() === lower);
    return match ? match.name : candidate;
  }

  static titleCase(str) {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/(?:^|\s|-)\S/g, (c) => c.toUpperCase())
      .replace(/\s+/g, " ")
      .trim();
  }
}

