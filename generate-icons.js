const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create minimal uncompressed PNG generator
function createSolidPNG(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data: height scanlines, each starting with filter byte 0
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      
      // Draw a stylish gradient/pattern with an 'M' or lightning bolt accent
      const isBorder = (x < 2 || x >= width - 2 || y < 2 || y >= height - 2);
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      
      // Base vibrant purple/pink Meesho-like gradient
      let pr = 158, pg = 37, pb = 120; // Deep berry / Meesho magenta
      if (y > height / 2) {
        pr = 194; pg = 45; pb = 145; // brighter magenta
      }

      // Draw lightning bolt / 'M' in center in golden yellow
      let isAccent = false;
      const nx = x / width;
      const ny = y / height;
      if (nx >= 0.25 && nx <= 0.75 && ny >= 0.25 && ny <= 0.75) {
        // Diagonal zig-zag or center marker
        if ((nx > 0.3 && nx < 0.45 && ny < 0.6) || 
            (nx > 0.55 && nx < 0.7 && ny > 0.4) || 
            (ny >= 0.45 && ny <= 0.55 && nx >= 0.35 && nx <= 0.65)) {
          isAccent = true;
        }
      }

      if (isAccent) {
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 215;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 255;
      } else {
        rawData[pixelOffset] = pr;
        rawData[pixelOffset + 1] = pg;
        rawData[pixelOffset + 2] = pb;
        rawData[pixelOffset + 3] = a;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(len, 0);

  const body = Buffer.concat([typeBuf, data]);
  const crc = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, body, crcBuf]);
}

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }

  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngBuf = createSolidPNG(size, size, 158, 37, 120, 255);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), pngBuf);
  console.log(`Generated icon${size}.png (${size}x${size})`);
});
