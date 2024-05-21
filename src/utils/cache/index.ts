import { keccak256, PublicClient, toBytes } from 'viem';
import { jsonStringifyWithBigInt } from '@utils/json';
import fs from 'fs';
import { verifyCacheRevision } from '@utils/cache/revision';

verifyCacheRevision();

interface CacheFile {
  fileName: string;
  filePath: string;
  directoryPath: string;
  exists: () => boolean;
  write: (str: string) => void;
  read: () => string;
}

export function getCacheFile(
  directory: string,
  client: PublicClient,
  args: any,
): CacheFile {
  const chainId = client.chain?.id;
  const hash = keccak256(toBytes(jsonStringifyWithBigInt({
    chainId,
    ...args,
  })));
  const fileName = `${chainId}.${hash.slice(-64)}.json`;
  const directoryPath = `./cache/${directory}/`;
  const filePath = `${directoryPath}${fileName}`;

  return {
    fileName,
    directoryPath,
    filePath,
    exists: () => fs.existsSync(filePath),
    write: (str: string) => {
      fs.mkdirSync(directoryPath, { recursive: true });
      fs.writeFileSync(filePath, str);
    },
    read: () => fs.readFileSync(filePath).toString(),
  }
}
