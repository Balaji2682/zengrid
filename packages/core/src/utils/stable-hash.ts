const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function stableHashValue(value: unknown): string {
  const hasher = new StableHasher();
  const seen = new WeakSet<object>();

  hashValue(hasher, value, seen);
  return hasher.digest();
}

class StableHasher {
  private hash = FNV_OFFSET_BASIS;

  write(token: string): void {
    for (let index = 0; index < token.length; index += 1) {
      this.hash ^= token.charCodeAt(index);
      this.hash = Math.imul(this.hash, FNV_PRIME);
    }
  }

  digest(): string {
    return (this.hash >>> 0).toString(16).padStart(8, '0');
  }
}

function hashValue(hasher: StableHasher, value: unknown, seen: WeakSet<object>): void {
  if (value === null) {
    hasher.write('null');
    return;
  }

  if (value === undefined) {
    hasher.write('undefined');
    return;
  }

  if (value instanceof Date) {
    hasher.write('date');
    hasher.write(value.toISOString());
    return;
  }

  if (Array.isArray(value)) {
    hasher.write('array[');
    for (const item of value) {
      hashValue(hasher, item, seen);
      hasher.write(',');
    }
    hasher.write(']');
    return;
  }

  switch (typeof value) {
    case 'string':
      hasher.write('string');
      hasher.write(value);
      return;

    case 'number':
      hasher.write('number');
      hasher.write(Number.isFinite(value) ? value.toString() : String(value));
      return;

    case 'boolean':
      hasher.write(value ? 'true' : 'false');
      return;

    case 'bigint':
      hasher.write('bigint');
      hasher.write(value.toString());
      return;

    case 'symbol':
      hasher.write('symbol');
      hasher.write(value.description ?? '');
      return;

    case 'function':
      hasher.write('function');
      hasher.write(value.name);
      return;

    case 'object':
      break;

    default:
      hasher.write(String(value));
      return;
  }

  if (seen.has(value)) {
    hasher.write('[Circular]');
    return;
  }

  seen.add(value);
  hasher.write('{');

  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  for (const [key, nested] of entries) {
    hasher.write(key);
    hasher.write(':');
    hashValue(hasher, nested, seen);
    hasher.write(';');
  }

  hasher.write('}');
  seen.delete(value);
}
