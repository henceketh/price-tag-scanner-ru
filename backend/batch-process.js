import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import FormData from 'form-data';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = process.env.API_URL || 'http://localhost:3001';
const DATASET_DIR = path.join(__dirname, '..', 'dataset');
const OUTPUT_FILE = path.join(__dirname, 'batch-results.json');
const LIMIT = parseInt(process.env.LIMIT) || 0;
const ENHANCE_IMAGE = process.env.ENHANCE_IMAGE === 'true';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

async function getImageFiles() {
  try {
    const files = await fs.readdir(DATASET_DIR);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext);
    });

    if (LIMIT > 0) {
      return imageFiles.slice(0, LIMIT);
    }

    return imageFiles;
  } catch (error) {
    console.error(`Error reading dataset directory: ${error.message}`);
    return [];
  }
}

async function processImage(filename) {
  const filePath = path.join(DATASET_DIR, filename);

  try {
    const fileBuffer = await fs.readFile(filePath);
    const formData = new FormData();
    formData.append('image', fileBuffer, filename);

    if (ENHANCE_IMAGE) {
      formData.append('enhanceImage', 'true');
    }

    console.log(`\n[${"=".repeat(60)}]`);
    console.log(`Processing: ${filename}`);
    console.log(`File size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);

    const startTime = Date.now();
    const response = await axios.post(`${API_URL}/api/scan`, formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 300000
    });

    const processingTime = Date.now() - startTime;
    console.log(`✓ Completed in ${(processingTime / 1000).toFixed(2)}s`);

    return {
      filename,
      success: true,
      data: response.data,
      processingTime
    };
  } catch (error) {
    console.error(`✗ Error processing ${filename}:`, error.response?.data?.error || error.message);
    return {
      filename,
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}

function formatResult(result) {
  if (!result.success) {
    return `${result.filename} - ERROR: ${result.error}`;
  }

  const { parsed, text, model, processingTime, imageEnhanced } = result.data;

  let output = `\n${result.filename}`;
  output += `\n  Model: ${model}`;
  output += `\n  Processing Time: ${(processingTime / 1000).toFixed(2)}s`;
  output += `\n  Image Enhanced: ${imageEnhanced ? 'Yes' : 'No'}`;
  output += `\n  Product: ${parsed.productName || 'N/A'}`;

  if (parsed.price) {
    output += `\n  Price: ${parsed.price} ${parsed.currency || ''}`;
  }

  if (parsed.originalPrice && parsed.originalPrice !== parsed.price) {
    output += `\n  Original Price: ${parsed.originalPrice} ${parsed.currency || ''}`;
  }

  if (parsed.pricePerUnit) {
    output += `\n  Price per Unit: ${parsed.pricePerUnit}`;
  }

  if (parsed.unit) {
    output += `\n  Unit: ${parsed.unit}`;
  }

  if (parsed.barcode) {
    output += `\n  Barcode: ${parsed.barcode}`;
  }

  if (parsed.isPromo) {
    output += `\n  Promo: Yes${parsed.promoType ? ` (${parsed.promoType})` : ''}`;
    if (parsed.discountPercent) {
      output += ` - ${parsed.discountPercent}% off`;
    }
  }

  output += `\n  Raw Text:\n    ${text.split('\n').join('\n    ')}`;

  return output;
}

async function main() {
  console.log('='.repeat(80));
  console.log('BATCH PROCESSING DATASET');
  console.log('='.repeat(80));
  console.log(`API URL: ${API_URL}`);
  console.log(`Dataset Directory: ${DATASET_DIR}`);
  console.log(`Limit: ${LIMIT > 0 ? LIMIT : 'No limit'}`);
  console.log(`Enhance Images: ${ENHANCE_IMAGE ? 'Yes' : 'No'}`);
  console.log('='.repeat(80));

  const imageFiles = await getImageFiles();

  if (imageFiles.length === 0) {
    console.log('No image files found in dataset directory.');
    return;
  }

  console.log(`\nFound ${imageFiles.length} image file(s) to process.\n`);

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    console.log(`\nProgress: [${i + 1}/${imageFiles.length}]`);

    const result = await processImage(filename);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }

    console.log(formatResult(result));

    if (i < imageFiles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Processed: ${results.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  const totalTime = results.reduce((sum, r) => sum + (r.processingTime || 0), 0);
  console.log(`Total Processing Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Average Time per Image: ${(totalTime / results.length / 1000).toFixed(2)}s`);

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${OUTPUT_FILE}`);
  console.log('='.repeat(80));
}

main().catch(console.error);
