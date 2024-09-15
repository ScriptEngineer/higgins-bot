require('dotenv/config');
const { Account, Contract, num, RpcProvider } = require('starknet');
const ROUTER_ABI = require('./router-abi.json');
const fetch = require('node-fetch'); // If you're using node-fetch

const EKUBO_API_QUOTE_URL = process.env.EKUBO_API_QUOTE_URL;
const TOKEN_TO_ARBITRAGE = process.env.TOKEN_TO_ARBITRAGE;
const MAX_HOPS = Math.max(3, Number(process.env.MAX_HOPS));
const CHECK_INTERVAL_MS = Math.max(3000, Number(process.env.CHECK_INTERVAL_MS));
const MIN_POWER_OF_2 = Math.max(32, Number(process.env.MIN_POWER_OF_2));
const MAX_POWER_OF_2 = Math.max(
  MIN_POWER_OF_2 + 1,
  Math.min(65, Number(process.env.MAX_POWER_OF_2))
);
const MIN_PROFIT = BigInt(Math.max(0, Number(process.env.MIN_PROFIT)));
const NUM_TOP_QUOTES_TO_ESTIMATE = Math.max(
  1,
  Number(process.env.NUM_TOP_QUOTES_TO_ESTIMATE)
);

const JSON_RPC_URL = process.env.JSON_RPC_URL;

const RPC_PROVIDER = new RpcProvider({
  nodeUrl: JSON_RPC_URL,
});

const ACCOUNT = new Account(
  RPC_PROVIDER,
  process.env.ACCOUNT_ADDRESS,
  process.env.ACCOUNT_PRIVATE_KEY
);

const ROUTER_CONTRACT = new Contract(
  ROUTER_ABI,
  process.env.ROUTER_ADDRESS,
  RPC_PROVIDER
);

async function fetchQuote(amount) {
  const quote = await fetch(
    `${EKUBO_API_QUOTE_URL}/${amount}/${TOKEN_TO_ARBITRAGE}/${TOKEN_TO_ARBITRAGE}?maxHops=${MAX_HOPS}&maxSplits=0`
  );
  if (!quote.ok) {
    return null;
  }
  return await quote.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const AMOUNTS_TO_QUOTE = Array(MAX_POWER_OF_2 - MIN_POWER_OF_2)
  .fill(null)
  .map((_, ix) => 2n ** BigInt(ix + MIN_POWER_OF_2));

console.log('Starting with config', {
  EKUBO_API_QUOTE_URL,
  JSON_RPC_URL,
  TOKEN_TO_ARBITRAGE,
  CHECK_INTERVAL_MS,
  AMOUNTS_TO_QUOTE,
});

(async function () {
  while (true) {
    const topArbitrageResults = (
      await Promise.all(
        AMOUNTS_TO_QUOTE.map(async (amount) => {
          const quote = await fetchQuote(amount);

          if (!quote) {
            return null;
          }

          return {
            amount,
            quote,
            profit: BigInt(quote.total) - amount,
          };
        })
      )
    )
      .filter((quote) => Boolean(quote && quote.profit > MIN_PROFIT))
      .sort((a, b) => Number(b.profit - a.profit))
      .slice(0, NUM_TOP_QUOTES_TO_ESTIMATE)
      .map((result) => {
        const { amount, quote: { total, splits } } = result;

        if (splits.length === 0) {
          throw new Error('unexpected number of splits');
        }

        const transferCall = {
          contractAddress: TOKEN_TO_ARBITRAGE,
          entrypoint: 'transfer',
          calldata: [ROUTER_CONTRACT.address, num.toHex(amount), '0x0'],
        };

        const clearProfitsCall = ROUTER_CONTRACT.populate('clear_minimum', [
          { contract_address: TOKEN_TO_ARBITRAGE },
          amount,
        ]);

        if (splits.length === 1) {
          const split = splits[0];
          if (split.route.length === 1) {
            throw new Error('unexpected single hop route');
          } else {
            const calldata = [
              num.toHex(split.route.length),
              ...split.route.reduce(
                (memo, routeNode) => {
                  const isToken1 = BigInt(memo.token) === BigInt(routeNode.pool_key.token1);
                  return {
                    token: isToken1 ? routeNode.pool_key.token0 : routeNode.pool_key.token1,
                    encoded: memo.encoded.concat([
                      routeNode.pool_key.token0,
                      routeNode.pool_key.token1,
                      routeNode.pool_key.fee,
                      num.toHex(routeNode.pool_key.tick_spacing),
                      routeNode.pool_key.extension,
                      num.toHex(BigInt(routeNode.sqrt_ratio_limit) % 2n ** 128n),
                      num.toHex(BigInt(routeNode.sqrt_ratio_limit) >> 128n),
                      routeNode.skip_ahead,
                    ]),
                  };
                },
                { token: TOKEN_TO_ARBITRAGE, encoded: [] }
              ).encoded,
              TOKEN_TO_ARBITRAGE,
              num.toHex(BigInt(split.specifiedAmount)),
              '0x0',
            ];

            console.log('Calldata:', calldata); // Output calldata array

            return {
              ...result,
              calls: [
                transferCall,
                {
                  contractAddress: ROUTER_CONTRACT.address,
                  entrypoint: 'multihop_swap',
                  calldata,
                },
                clearProfitsCall,
              ],
            };
          }
        }

        const calldata = [
          num.toHex(splits.length),
          ...splits.reduce((memo, split) => {
            return memo.concat([
              num.toHex(split.route.length),
              ...split.route.reduce(
                (memo, routeNode) => {
                  const isToken1 = BigInt(memo.token) === BigInt(routeNode.pool_key.token1);
                  return {
                    token: isToken1 ? routeNode.pool_key.token0 : routeNode.pool_key.token1,
                    encoded: memo.encoded.concat([
                      routeNode.pool_key.token0,
                      routeNode.pool_key.token1,
                      routeNode.pool_key.fee,
                      num.toHex(routeNode.pool_key.tick_spacing),
                      routeNode.pool_key.extension,
                      num.toHex(BigInt(routeNode.sqrt_ratio_limit) % 2n ** 128n),
                      num.toHex(BigInt(routeNode.sqrt_ratio_limit) >> 128n),
                      routeNode.skip_ahead,
                    ]),
                  };
                },
                { token: TOKEN_TO_ARBITRAGE, encoded: [] }
              ).encoded,
              TOKEN_TO_ARBITRAGE,
              num.toHex(BigInt(split.specifiedAmount)),
              '0x0',
            ]);
          }, []),
        ];

        console.log('Calldata:', calldata); // Output calldata array

        return {
          ...result,
          calls: [
            transferCall,
            {
              contractAddress: ROUTER_CONTRACT.address,
              entrypoint: 'multi_multihop_swap',
              calldata,
            },
            clearProfitsCall,
          ],
        };
      });

    if (topArbitrageResults.length > 0) {
      console.log('Executing top arbitrage', topArbitrageResults[0]);

      try {
        const cost = await ACCOUNT.estimateFee(topArbitrageResults[0].calls);
        console.log('Estimated fee:', cost.suggestedMaxFee);

        /*
        const { transaction_hash } = await ACCOUNT.execute(
          topArbitrageResults[0].calls,
          { maxFee: cost.suggestedMaxFee * 2n }
        );

        console.log(
          'Sent transaction, waiting for receipt',
          `${process.env.EXPLORER_TX_PREFIX}${transaction_hash}`
        );

        const receipt = await RPC_PROVIDER.waitForTransaction(transaction_hash, {
          retryInterval: 3000,
        });

        console.log('Arbitrage receipt', receipt);
        */

      } catch (error) {
        console.error('Failed to send arbitrage transaction', error);
      }
    } else {
      console.log(new Date(), 'No arbitrage found');
    }

    await sleep(CHECK_INTERVAL_MS);
  }
})()
  .then((result) => {
    console.log('Completed', result);
  })
  .catch((e) => {
    console.error('Errored', e);
  });
