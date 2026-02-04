


export const detectCurrency = (text) => {
  const currencyPatterns = [
    { pattern: /(?:руб|₽|рубл|RUB)/i, currency: 'RUB', symbol: '₽' },
    { pattern: /(?:\$|USD|долл)/i, currency: 'USD', symbol: '$' },
    { pattern: /(?:€|EUR|евро)/i, currency: 'EUR', symbol: '€' },
    { pattern: /(?:₸|KZT|тенге)/i, currency: 'KZT', symbol: '₸' },
    { pattern: /(?:₴|UAH|грн)/i, currency: 'UAH', symbol: '₴' },
    { pattern: /(?:Br|BYN|бел)/i, currency: 'BYN', symbol: 'Br' },
  ];

  for (const { pattern, currency, symbol } of currencyPatterns) {
    if (pattern.test(text)) {
      return { currency, symbol };
    }
  }

  
  return { currency: 'RUB', symbol: '₽' };
};


export const extractPrice = (text) => {
  
  const pricePatterns = [
    
    /(\d+[\.,]\d{2})\s*(?:руб|₽|р\.?|RUB|\$|€)?/gi,
    
    /(\d+)\s*(?:руб|₽|р\.?|RUB|\$|€)/gi,
    
    /цена[:\s]*(\d+[\.,]?\d*)/gi,
    
    /стоимость[:\s]*(\d+[\.,]?\d*)/gi,
  ];

  const prices = [];

  for (const pattern of pricePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const priceStr = match[1].replace(',', '.');
      const price = parseFloat(priceStr);
      if (price > 0 && price < 1000000) { 
        prices.push(price);
      }
    }
  }

  return [...new Set(prices)].sort((a, b) => a - b);
};


export const detectPromo = (text) => {
  const promoPatterns = [
    { pattern: /акци[яи]/i, type: 'акция' },
    { pattern: /скидк[аи]/i, type: 'скидка' },
    { pattern: /распродаж/i, type: 'распродажа' },
    { pattern: /специальн.*цен/i, type: 'спеццена' },
    { pattern: /выгодн/i, type: 'выгодная цена' },
    { pattern: /sale/i, type: 'sale' },
    { pattern: /промо/i, type: 'промо' },
    { pattern: /-\s*\d+\s*%/i, type: 'скидка' },
    { pattern: /\d+\s*%\s*(?:скидк|off)/i, type: 'скидка' },
    { pattern: /старая\s*цена/i, type: 'скидка' },
    { pattern: /было/i, type: 'скидка' },
    { pattern: /красн.*цен/i, type: 'красная цена' },
    { pattern: /жёлт.*цен|желт.*цен/i, type: 'желтая цена' },
  ];

  for (const { pattern, type } of promoPatterns) {
    if (pattern.test(text)) {
      return { isPromo: true, promoType: type };
    }
  }

  return { isPromo: false, promoType: null };
};


export const extractDiscount = (text) => {
  const discountPattern = /-?\s*(\d+)\s*%/g;
  let match;
  const discounts = [];

  while ((match = discountPattern.exec(text)) !== null) {
    const discount = parseInt(match[1]);
    if (discount > 0 && discount <= 99) {
      discounts.push(discount);
    }
  }

  return discounts.length > 0 ? Math.max(...discounts) : null;
};


export const extractBarcode = (text) => {
  
  const ean13 = text.match(/\b(\d{13})\b/);
  if (ean13) return ean13[1];

  
  const ean8 = text.match(/\b(\d{8})\b/);
  if (ean8) return ean8[1];

  
  const upc = text.match(/\b(\d{12})\b/);
  if (upc) return upc[1];

  return null;
};


export const extractUnit = (text) => {
  const unitPatterns = [
    { pattern: /за\s*кг|\/кг|килограмм/i, unit: 'кг' },
    { pattern: /за\s*шт|\/шт|штук/i, unit: 'шт' },
    { pattern: /за\s*л|\/л|литр/i, unit: 'л' },
    { pattern: /за\s*г|\/г(?!р)|грамм/i, unit: 'г' },
    { pattern: /за\s*мл|\/мл|миллилитр/i, unit: 'мл' },
    { pattern: /за\s*уп|\/уп|упаковк/i, unit: 'уп' },
  ];

  for (const { pattern, unit } of unitPatterns) {
    if (pattern.test(text)) {
      return unit;
    }
  }

  return null;
};


export const parseOcrResult = (text) => {
  const prices = extractPrice(text);
  const { currency, symbol } = detectCurrency(text);
  const { isPromo, promoType } = detectPromo(text);
  const discountPercent = extractDiscount(text);
  const barcode = extractBarcode(text);
  const unit = extractUnit(text);

  
  let price = null;
  let originalPrice = null;

  if (prices.length >= 2 && isPromo) {
    
    price = prices[0];
    originalPrice = prices[prices.length - 1];
  } else if (prices.length >= 1) {
    price = prices[0];
  }

  
  const pricePerUnit = prices.length > 1 ? Math.min(...prices) : null;

  return {
    price,
    originalPrice,
    pricePerUnit,
    currency,
    currencySymbol: symbol,
    unit,
    barcode,
    isPromo,
    promoType,
    discountPercent,
    rawText: text
  };
};

export default {
  detectCurrency,
  extractPrice,
  detectPromo,
  extractDiscount,
  extractBarcode,
  extractUnit,
  parseOcrResult
};
