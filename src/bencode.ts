/**
 * A minimal bencode implementation for nREPL communication.
 * Supports only the types needed: strings, integers, lists, and dictionaries.
 */

export type BencodeValue =
  | string
  | number
  | BencodeValue[]
  | { [key: string]: BencodeValue };

export class BencodeEncoder {
  static encode(value: BencodeValue): string {
    if (typeof value === 'string') {
      return `${value.length}:${value}`;
    }
    if (typeof value === 'number') {
      return `i${value}e`;
    }
    if (Array.isArray(value)) {
      return `l${value.map((v) => BencodeEncoder.encode(v)).join('')}e`;
    }
    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
      return `d${entries
        .map(([k, v]) => BencodeEncoder.encode(k) + BencodeEncoder.encode(v))
        .join('')}e`;
    }
    throw new Error(`Unsupported bencode type: ${typeof value}`);
  }
}

export class BencodeDecoder {
  private pos = 0;
  private data: string;
  private startPos = 0;

  constructor(data: string) {
    this.data = data;
    this.startPos = this.pos;
  }

  getProcessedLength(): number {
    return this.pos - this.startPos;
  }

  decode(): BencodeValue {
    const char = this.data[this.pos];
    if (char === 'i') {
      return this.decodeInteger();
    }
    if (char === 'l') {
      return this.decodeList();
    }
    if (char === 'd') {
      return this.decodeDictionary();
    }
    if (char >= '0' && char <= '9') {
      return this.decodeString();
    }
    throw new Error(`Invalid bencode data at position ${this.pos}`);
  }

  private decodeInteger(): number {
    this.pos++; // Skip 'i'
    const start = this.pos;
    while (this.data[this.pos] !== 'e') {
      if (this.pos >= this.data.length) {
        throw new Error('Unterminated integer');
      }
      this.pos++;
    }
    const num = parseInt(this.data.slice(start, this.pos), 10);
    this.pos++; // Skip 'e'
    return num;
  }

  private decodeString(): string {
    const colonPos = this.data.indexOf(':', this.pos);
    if (colonPos === -1) {
      throw new Error('Invalid string format');
    }
    const length = parseInt(this.data.slice(this.pos, colonPos), 10);
    const start = colonPos + 1;
    const end = start + length;
    if (end > this.data.length) {
      throw new Error('String length exceeds data');
    }
    this.pos = end;
    return this.data.slice(start, end);
  }

  private decodeList(): BencodeValue[] {
    this.pos++; // Skip 'l'
    const result: BencodeValue[] = [];
    while (this.data[this.pos] !== 'e') {
      if (this.pos >= this.data.length) {
        throw new Error('Unterminated list');
      }
      result.push(this.decode());
    }
    this.pos++; // Skip 'e'
    return result;
  }

  private decodeDictionary(): { [key: string]: BencodeValue } {
    this.pos++; // Skip 'd'
    const result: { [key: string]: BencodeValue } = {};
    while (this.data[this.pos] !== 'e') {
      if (this.pos >= this.data.length) {
        throw new Error('Unterminated dictionary');
      }
      const key = this.decode();
      if (typeof key !== 'string') {
        throw new Error('Dictionary key must be a string');
      }
      const value = this.decode();
      result[key] = value;
    }
    this.pos++; // Skip 'e'
    return result;
  }

  static decode(data: string): BencodeValue {
    const decoder = new BencodeDecoder(data);
    return decoder.decode();
  }
}
