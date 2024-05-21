import { GetLogsParameters, GetLogsReturnType, PublicClient } from 'viem';
import type { AbiEvent } from 'abitype';
import type { BlockNumber } from 'viem/types/block';
import { divCeilBI, minBI } from '@utils/bigint-math';
import { wait } from '@utils/promise';

type GetLogsParametersAdjusted = GetLogsParameters<AbiEvent, AbiEvent[], boolean, BlockNumber, BlockNumber>;
type GetLogsReturnTypeAdjusted = GetLogsReturnType<AbiEvent, AbiEvent[], boolean, BlockNumber, BlockNumber>;

const LIMIT_EXCEEDED_ERRORS = [
  'logs matched by query exceeds limit of 10000',
  'log query timed out',
  'Log response size exceeded.',
  'exceed maximum block range',
];

function isLimitExceededError(error: Error) {
  for (const ERR of LIMIT_EXCEEDED_ERRORS) {
    if ((error as any)?.details?.includes(ERR)) {
      return true;
    }
  }

  return false;
}

function splitBlocksRange(fromBlock: bigint, toBlock: bigint) {
  const count = toBlock - fromBlock + 1n;
  const newCount = divCeilBI(count, 2n);

  const fromBlock1 = fromBlock;
  const toBlock1 = minBI(fromBlock + newCount, toBlock);
  const fromBlock2 = minBI(toBlock1 + 1n, toBlock);
  const toBlock2 = minBI(fromBlock2 + newCount, toBlock);

  if (
    newCount < 0n ||
    fromBlock2 > toBlock2 ||
    fromBlock1 > toBlock1 ||
    (fromBlock1 === fromBlock && toBlock1 === toBlock) ||
    (fromBlock2 === fromBlock && toBlock2 === toBlock)
  ) {
    throw new Error('Insufficient range requested');
  }

  return {
    fromBlockLeft: fromBlock1,
    toBlockLeft: toBlock1,
    fromBlockRight: fromBlock2,
    toBlockRight: toBlock2,
  }
}

async function getLogs(
  client: PublicClient,
  args: GetLogsParametersAdjusted
): Promise<GetLogsReturnTypeAdjusted> {
  return client.getLogs<AbiEvent, AbiEvent[], boolean, BlockNumber, BlockNumber>(args);
}

async function getLogsWithRetry(
  client: PublicClient,
  args: GetLogsParametersAdjusted,
  options: { retry: number; delay: number; retryCallback: (error: Error, attempt: number) => boolean },
  attempt = 0,
): Promise<GetLogsReturnTypeAdjusted> {
  try {
    console.log(`Logs Request: [${args.fromBlock} ... ${args.toBlock}]`, `${(args.toBlock as bigint) - (args.fromBlock as bigint) + 1n} blocks`);
    return await getLogs(client, args);
  } catch (error) {
    console.log(`Logs Error: [${args.fromBlock} ... ${args.toBlock}]`, (error as any)?.details);
    if (attempt >= options.retry) {
      throw error;
    } else if (options.retryCallback(error as Error, attempt)) {
      await wait(options.delay);
      return await getLogsWithRetry(client, args, options, attempt + 1);
    } else {
      throw error;
    }
  }
}

export async function getAllLogs(
  client: PublicClient,
  args: GetLogsParametersAdjusted
): Promise<GetLogsReturnTypeAdjusted> {
  try {
    return await getLogsWithRetry(client, args, {
      retry: 5,
      delay: 60000,
      retryCallback: (err) => !isLimitExceededError(err)
    });
  } catch (error) {
    if (isLimitExceededError(error as Error)) {
      const newRange = splitBlocksRange(args.fromBlock as bigint, args.toBlock as bigint);

      const logsLeft = await getAllLogs(client, {
        ...(args as any),
        fromBlock: newRange.fromBlockLeft,
        toBlock: newRange.toBlockLeft,
      });

      const logsRight = await getAllLogs(client, {
        ...(args as any),
        fromBlock: newRange.fromBlockRight,
        toBlock: newRange.toBlockRight,
      });

      return [...logsLeft, ...logsRight];
    } else {
      throw error;
    }
  }
}
