const BIG_INT_KEY = 'BigInt.';

export function jsonStringifyWithBigInt(obj: any, replacer: any = null, space: any = null): string {
  const customReplacer = (key: any, value: any) => {
    if (typeof value === 'bigint') {
      return `${BIG_INT_KEY}${value.toString()}`;
    }

    return replacer ? replacer(key, value) : value;
  };

  return JSON.stringify(obj, customReplacer, space);
}

export function jsonParseWithBigInt<T = any>(jsonStr: string, reviver: any = null): T {
  const customReviver = (key: any, value: any) => {
    if (typeof value === 'string' && value.startsWith(BIG_INT_KEY)) {
      return BigInt(value.slice(BIG_INT_KEY.length));
    }
    return reviver ? reviver(key, value) : value;
  };

  return JSON.parse(jsonStr, customReviver);
}
