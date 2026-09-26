/**
 * =============================================================================
 * DUT ESPORTS — PURE TYPESCRIPT QR CODE GENERATOR (SVG / DATA-URI)
 * Zero external dependencies. Self-contained Reed-Solomon & QR Matrix encoder.
 * =============================================================================
 */

// Galois Field GF(256) with primitive polynomial 0x11d (285)
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 256) x ^= 285;
  }
  LOG_TABLE[0] = 0;
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function polyMul(p1: Uint8Array | number[], p2: Uint8Array | number[]): Uint8Array {
  const result = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return result;
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let gen: Uint8Array = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    gen = new Uint8Array(polyMul(gen, [1, EXP_TABLE[i]]));
  }
  return gen;
}

function rsComputeRemainder(data: Uint8Array, numEcBytes: number): Uint8Array {
  const gen = rsGeneratorPoly(numEcBytes);
  const remainder = new Uint8Array(numEcBytes);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    for (let j = 0; j < numEcBytes - 1; j++) {
      remainder[j] = remainder[j + 1] ^ gfMul(gen[j + 1], factor);
    }
    remainder[numEcBytes - 1] = gfMul(gen[numEcBytes], factor);
  }
  return remainder;
}

// QR Code Version Spec (Version 1 to 6 - EC Level M)
interface VersionSpec {
  version: number;
  totalDataBytes: number;
  ecBytesPerBlock: number;
  numBlocks: number;
  alignmentPositions: number[];
}

const VERSION_SPECS: VersionSpec[] = [
  { version: 1, totalDataBytes: 16, ecBytesPerBlock: 10, numBlocks: 1, alignmentPositions: [] },
  { version: 2, totalDataBytes: 28, ecBytesPerBlock: 16, numBlocks: 1, alignmentPositions: [6, 18] },
  { version: 3, totalDataBytes: 44, ecBytesPerBlock: 26, numBlocks: 1, alignmentPositions: [6, 22] },
  { version: 4, totalDataBytes: 64, ecBytesPerBlock: 18, numBlocks: 2, alignmentPositions: [6, 26] },
  { version: 5, totalDataBytes: 86, ecBytesPerBlock: 24, numBlocks: 2, alignmentPositions: [6, 30] },
  { version: 6, totalDataBytes: 108, ecBytesPerBlock: 16, numBlocks: 4, alignmentPositions: [6, 34] },
];

export class QRCodeEncoder {
  private text: string;

  constructor(text: string) {
    this.text = text;
  }

  public generateMatrix(): boolean[][] {
    const textBytes = new TextEncoder().encode(this.text);
    let chosenSpec = VERSION_SPECS.find((s) => s.totalDataBytes >= textBytes.length + 3);
    if (!chosenSpec) {
      chosenSpec = VERSION_SPECS[VERSION_SPECS.length - 1];
    }

    const { version, totalDataBytes, ecBytesPerBlock, numBlocks, alignmentPositions } = chosenSpec;
    const size = version * 4 + 17;

    // Bit buffer encoding (Byte Mode: 0100)
    const bitBuffer: number[] = [];
    const pushBits = (val: number, len: number) => {
      for (let i = len - 1; i >= 0; i--) {
        bitBuffer.push((val >> i) & 1);
      }
    };

    // Mode 0100 (Byte mode)
    pushBits(0b0100, 4);
    // Character count (8 bits for V1-V9)
    pushBits(textBytes.length, 8);
    // Data bytes
    for (const b of textBytes) {
      pushBits(b, 8);
    }

    // Terminator (up to 4 zeroes)
    const maxBits = totalDataBytes * 8;
    const termLen = Math.min(4, maxBits - bitBuffer.length);
    for (let i = 0; i < termLen; i++) bitBuffer.push(0);

    // Padding to byte boundary
    while (bitBuffer.length % 8 !== 0) bitBuffer.push(0);

    // Pad bytes (0xEC, 0x11)
    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (bitBuffer.length < maxBits) {
      pushBits(padBytes[padIdx % 2], 8);
      padIdx++;
    }

    // Pack into bytes
    const dataBytes = new Uint8Array(totalDataBytes);
    for (let i = 0; i < totalDataBytes; i++) {
      let byteVal = 0;
      for (let j = 0; j < 8; j++) {
        byteVal = (byteVal << 1) | (bitBuffer[i * 8 + j] || 0);
      }
      dataBytes[i] = byteVal;
    }

    // Split into blocks and compute EC
    const dataBlockLen = Math.floor(totalDataBytes / numBlocks);
    const ecCodewords: Uint8Array[] = [];
    const dataCodewords: Uint8Array[] = [];

    for (let b = 0; b < numBlocks; b++) {
      const blockData = dataBytes.slice(b * dataBlockLen, (b + 1) * dataBlockLen);
      dataCodewords.push(blockData);
      ecCodewords.push(rsComputeRemainder(blockData, ecBytesPerBlock));
    }

    // Interleave data and EC bytes
    const finalBytes: number[] = [];
    for (let i = 0; i < dataBlockLen; i++) {
      for (let b = 0; b < numBlocks; b++) {
        finalBytes.push(dataCodewords[b][i]);
      }
    }
    for (let i = 0; i < ecBytesPerBlock; i++) {
      for (let b = 0; b < numBlocks; b++) {
        finalBytes.push(ecCodewords[b][i]);
      }
    }

    // Initialize module matrix and isFunction matrix
    const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
    const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Helper: set finder pattern
    const setFinder = (rStart: number, cStart: number) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const row = rStart + r;
          const col = cStart + c;
          if (row >= 0 && row < size && col >= 0 && col < size) {
            isFunction[row][col] = true;
            if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
              const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
              const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
              matrix[row][col] = isBorder || isCenter;
            } else {
              matrix[row][col] = false;
            }
          }
        }
      }
    };

    setFinder(0, 0);
    setFinder(0, size - 7);
    setFinder(size - 7, 0);

    // Alignment patterns (for version >= 2)
    if (alignmentPositions.length > 0) {
      for (const r of alignmentPositions) {
        for (const c of alignmentPositions) {
          if (isFunction[r][c]) continue;
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const row = r + dr;
              const col = c + dc;
              isFunction[row][col] = true;
              const isOuter = Math.abs(dr) === 2 || Math.abs(dc) === 2;
              const isDot = dr === 0 && dc === 0;
              matrix[row][col] = isOuter || isDot;
            }
          }
        }
      }
    }

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      if (!isFunction[6][i]) {
        isFunction[6][i] = true;
        matrix[6][i] = i % 2 === 0;
      }
      if (!isFunction[i][6]) {
        isFunction[i][6] = true;
        matrix[i][6] = i % 2 === 0;
      }
    }

    // Dark module (4 * version + 9, 8)
    const darkRow = 4 * version + 9;
    if (darkRow < size) {
      isFunction[darkRow][8] = true;
      matrix[darkRow][8] = true;
    }

    // Format info reserve
    for (let i = 0; i <= 8; i++) {
      if (!isFunction[8][i]) isFunction[8][i] = true;
      if (!isFunction[i][8]) isFunction[i][8] = true;
    }
    for (let i = 0; i < 8; i++) {
      if (!isFunction[8][size - 1 - i]) isFunction[8][size - 1 - i] = true;
      if (!isFunction[size - 1 - i][8]) isFunction[size - 1 - i][8] = true;
    }

    // Fill data bits
    let bitIdx = 0;
    const totalBits = finalBytes.length * 8;
    let right = size - 1;
    let upward = true;

    while (right > 0) {
      if (right === 6) right--; // Skip vertical timing pattern
      const colPairs = [right, right - 1];
      const rows = upward
        ? Array.from({ length: size }, (_, i) => size - 1 - i)
        : Array.from({ length: size }, (_, i) => i);

      for (const r of rows) {
        for (const c of colPairs) {
          if (!isFunction[r][c]) {
            let bit = 0;
            if (bitIdx < totalBits) {
              const byteIdx = Math.floor(bitIdx / 8);
              const bOffset = 7 - (bitIdx % 8);
              bit = (finalBytes[byteIdx] >> bOffset) & 1;
              bitIdx++;
            }
            // Mask pattern 0: (row + col) % 2 === 0
            const mask = (r + c) % 2 === 0;
            matrix[r][c] = (bit === 1) !== mask;
          }
        }
      }
      right -= 2;
      upward = !upward;
    }

    // Apply format information (EC Level M: 00, Mask 0: 000 -> 00000)
    // 15 bits format with BCH error correction for (00000): 0x5412 XOR with 0x5412 = 0
    // Standard format bits for EC M + Mask 0 with mask 0x5412: 101010000010010
    const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
    for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1;
    matrix[8][7] = formatBits[6] === 1;
    matrix[8][8] = formatBits[7] === 1;
    matrix[7][8] = formatBits[8] === 1;
    for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1;

    for (let i = 0; i < 8; i++) matrix[size - 1 - i][8] = formatBits[i] === 1;
    for (let i = 8; i < 15; i++) matrix[8][size - 15 + i] = formatBits[i] === 1;

    return matrix;
  }

  public toSVG(options?: { size?: number; margin?: number; color?: string; bgColor?: string }): string {
    const matrix = this.generateMatrix();
    const count = matrix.length;
    const margin = options?.margin ?? 4;
    const totalModules = count + margin * 2;
    const size = options?.size ?? 240;
    const color = options?.color ?? '#2e259e';
    const bgColor = options?.bgColor ?? '#ffffff';

    let path = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (matrix[r][c]) {
          const x = c + margin;
          const y = r + margin;
          path += `M${x},${y}h1v1h-1z `;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="${size}" height="${size}">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <path d="${path}" fill="${color}"/>
    </svg>`;
  }

  public toDataURL(options?: { size?: number; margin?: number; color?: string; bgColor?: string }): string {
    const svg = this.toSVG(options);
    if (typeof window !== 'undefined') {
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}

export function createQRCodeDataURL(text: string, size = 240, color = '#D40000'): string {
  const encoder = new QRCodeEncoder(text);
  return encoder.toDataURL({ size, color, bgColor: '#ffffff' });
}
