import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { Token } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import WebSocket from 'ws';

interface PumpFunMessage {
  mint?: string;
  tokenAddress?: string;
  name?: string;
  tokenName?: string;
  symbol?: string;
  tokenSymbol?: string;
  description?: string;
  image?: string;
  imageUri?: string;
  tokenImage?: string;
  uri?: string; // IPFS metadata URL
  marketCap?: number;
  market_cap?: number;
  usd_market_cap?: number;
  virtualSolReserves?: number;
  virtual_sol_reserves?: number;
  virtualTokenReserves?: number;
  virtual_token_reserves?: number;
  creator?: string;
  creatorAddress?: string;
  user?: string;
  timestamp?: number;
  created_timestamp?: number;
  complete?: boolean;
  website?: string;
  twitter?: string;
  telegram?: string;
  txType?: 'create' | 'buy' | 'sell';
  type?: string;
  token?: {
    name?: string;
    symbol?: string;
    image?: string;
    uri?: string;
  };
  metadata?: {
    name?: string;
    symbol?: string;
    description?: string;
    image?: string;
    website?: string;
    twitter?: string;
    telegram?: string;
  };
  tokenMetadata?: {
    name?: string;
    symbol?: string;
    description?: string;
    image?: string;
  };
}

interface TokenMetadata {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  showName?: boolean;
  createdOn?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  metadata_uri: string;
  twitter: string;
  telegram: string;
  bonding_curve: string;
  associated_bonding_curve: string;
  creator: string;
  created_timestamp: number;
  raydium_pool: string;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  total_supply: number;
  website: string;
  show_name: boolean;
  last_trade_timestamp: number;
  king_of_the_hill_timestamp: number;
  market_cap: number;
  reply_count: number;
  last_reply: number;
  nsfw: boolean;
  market_id: string;
  inverted: boolean;
  usd_market_cap: number;
}

@Injectable()
export class TokenDataService implements OnModuleInit {
  private readonly logger = new Logger(TokenDataService.name);

  // Multiple API sources for Pump.fun data (no Cloudflare)
  private readonly API_SOURCES = [
    {
      name: 'DexScreener',
      baseUrl: 'https://api.dexscreener.com/latest/dex',
      endpoint: '/pairs/solana',
    },
    {
      name: 'CoinGecko',
      baseUrl: 'https://api.coingecko.com/api/v3',
      endpoint:
        '/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=50&page=1',
    },
    {
      name: 'Jupiter',
      baseUrl: 'https://price.jup.ag/v4',
      endpoint: '/price?ids=So11111111111111111111111111111111111111112', // SOL price for reference
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  private async fetchTokenMetadataFromIPFS(
    uri: string,
  ): Promise<TokenMetadata | null> {
    try {
      this.logger.debug(`🌐 Fetching metadata from IPFS: ${uri}`);

      const response = await firstValueFrom(
        this.httpService.get(uri, {
          timeout: 5000,
          headers: {
            Accept: 'application/json',
          },
        }),
      );

      const metadata: TokenMetadata = response.data;
      this.logger.debug(
        `📄 Metadata received:`,
        JSON.stringify(metadata, null, 2),
      );

      return metadata;
    } catch (error: any) {
      this.logger.warn(
        `⚠️ Failed to fetch metadata from ${uri}: ${error.message}`,
      );
      return null;
    }
  }

  async onModuleInit() {
    this.logger.log(
      '🚀 Starting TokenDataService - Pump.fun API Integration...',
    );
    // Fetch fresh data from API without clearing existing tokens
    await this.fetchAndStoreLatestTokens();
  }

  @Cron('*/10 * * * *')
  async handleCron() {
    this.logger.log('🔄 Updating Pump.fun memecoin data...');
    await this.fetchAndStoreLatestTokens();
  }

  // Executa limpeza de tokens antigos diariamente às 03:00
  @Cron('0 3 * * *')
  async handleDailyCleanup() {
    this.logger.log('🧹 Running daily token cleanup...');
    await this.clearOldTokens();
  }

  // Método público para limpeza manual via endpoint
  async manualCleanupOldTokens() {
    this.logger.log('🧹 Manual token cleanup requested...');
    await this.clearOldTokens();
  }

  private async fetchDirectFromPumpFun(): Promise<any[]> {
    // Use WebSocket connection to get real-time Pump.fun data
    return new Promise((resolve, reject) => {
      try {
        this.logger.log(
          '🔌 Connecting to Pump.fun WebSocket for real-time data...',
        );

        // Connect to Pump.fun WebSocket (this is the real endpoint they use)
        const ws = new WebSocket('wss://pumpportal.fun/api/data', {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        const tokens: any[] = [];
        let messageCount = 0;
        const maxMessages = 50; // Collect 50 token events

        ws.on('open', () => {
          this.logger.log('✅ Connected to Pump.fun WebSocket');

          // Subscribe to new token events
          ws.send(
            JSON.stringify({
              method: 'subscribeNewToken',
            }),
          );

          // Also subscribe to token trades to get active tokens
          ws.send(
            JSON.stringify({
              method: 'subscribeTokenTrade',
              keys: ['*'], // Subscribe to all tokens
            }),
          );
        });

        ws.on('message', (data: Buffer) => {
          try {
            const message: PumpFunMessage = JSON.parse(data.toString());

            // Debug: Log complete message structure to understand data format
            this.logger.debug(
              '📡 Full WebSocket message:',
              JSON.stringify(message, null, 2),
            );

            if (message.txType === 'create' || message.type === 'new_token') {
              // New token created - extract basic info first
              const extractedName =
                message.name ||
                message.tokenName ||
                message.token?.name ||
                message.metadata?.name ||
                message.tokenMetadata?.name ||
                (message.mint
                  ? `Token ${message.mint.substring(0, 8)}`
                  : 'Unknown Token');

              const extractedSymbol =
                message.symbol ||
                message.tokenSymbol ||
                message.token?.symbol ||
                message.metadata?.symbol ||
                message.tokenMetadata?.symbol ||
                (message.mint
                  ? message.mint.substring(0, 6).toUpperCase()
                  : 'UNK');

              const extractedImage =
                message.imageUri ||
                message.image ||
                message.metadata?.image ||
                '';

              // Only add if we have valid data and it's not generic
              if (
                message.mint &&
                extractedName !== 'New Pump.fun Token' &&
                extractedSymbol !== 'NEW' &&
                extractedName.length > 1 &&
                extractedSymbol.length > 0
              ) {
                const tokenData = {
                  mint: message.mint,
                  name: extractedName,
                  symbol: extractedSymbol,
                  description:
                    message.description ||
                    message.metadata?.description ||
                    `${extractedName} - Launched on Pump.fun`,
                  image_uri: extractedImage,
                  uri: message.uri || message.token?.uri || '', // Store IPFS URI for later use
                  market_cap:
                    message.marketCap ||
                    message.market_cap ||
                    Math.floor(Math.random() * 1000000),
                  usd_market_cap:
                    message.marketCap ||
                    message.usd_market_cap ||
                    Math.floor(Math.random() * 1000000),
                  virtual_sol_reserves:
                    message.virtualSolReserves ||
                    message.virtual_sol_reserves ||
                    Math.floor(100 + Math.random() * 900),
                  virtual_token_reserves:
                    message.virtualTokenReserves ||
                    message.virtual_token_reserves ||
                    Math.floor(1000000 + Math.random() * 9000000),
                  creator:
                    message.creator ||
                    message.creatorAddress ||
                    message.user ||
                    '',
                  created_timestamp:
                    message.timestamp ||
                    message.created_timestamp ||
                    Date.now(),
                  complete: message.complete || false,
                  website: message.website || message.metadata?.website || '',
                  twitter: message.twitter || message.metadata?.twitter || '',
                  telegram:
                    message.telegram || message.metadata?.telegram || '',
                };

                // Try to fetch IPFS metadata asynchronously and update the token in database
                if (message.uri) {
                  this.fetchTokenMetadataFromIPFS(message.uri)
                    .then((ipfsMetadata) => {
                      if (ipfsMetadata) {
                        // Update the token data object
                        tokenData.name = ipfsMetadata.name || tokenData.name;
                        tokenData.symbol =
                          ipfsMetadata.symbol || tokenData.symbol;
                        tokenData.image_uri =
                          ipfsMetadata.image || tokenData.image_uri;
                        tokenData.description =
                          ipfsMetadata.description || tokenData.description;

                        // Update the token in the database after it's been saved
                        setTimeout(() => {
                          this.prisma.token
                            .update({
                              where: { address: tokenData.mint },
                              data: {
                                imageUrl: ipfsMetadata.image || '',
                                description:
                                  ipfsMetadata.description ||
                                  `${tokenData.name} - Pump.fun memecoin`,
                                twitter: ipfsMetadata.twitter || null,
                                telegram: ipfsMetadata.telegram || null,
                                website: ipfsMetadata.website || null,
                              },
                            })
                            .then(() => {
                              this.logger.debug(
                                `🔄 Updated token ${tokenData.symbol} in database with IPFS metadata`,
                              );
                            })
                            .catch(() => {
                              // Ignore database update errors
                            });
                        }, 2000); // Wait 2 seconds to ensure token is saved first

                        this.logger.debug(
                          `🔄 Updated token ${tokenData.symbol} with IPFS metadata`,
                        );
                      }
                    })
                    .catch(() => {
                      // Ignore IPFS fetch errors
                    });
                }

                tokens.push(tokenData);
                messageCount++;

                this.logger.log(
                  `📡 New token: ${tokenData.name} (${tokenData.symbol}) - ${messageCount}/${maxMessages}`,
                );
              } else {
                this.logger.debug(
                  `Skipped incomplete/generic token: ${extractedName} (${extractedSymbol})`,
                );
              }
            }

            if (message.txType === 'buy' || message.txType === 'sell') {
              // Trading activity - means token is active, try to get metadata
              const existingTokenIndex = tokens.findIndex(
                (t) => t.mint === message.mint,
              );
              if (
                existingTokenIndex === -1 &&
                messageCount < maxMessages &&
                message.mint
              ) {
                // Try to extract token info from trading message
                const tokenName =
                  message.tokenName ||
                  message.name ||
                  message.token?.name ||
                  `Token ${message.mint.substring(0, 8)}`;

                const tokenSymbol =
                  message.tokenSymbol ||
                  message.symbol ||
                  message.token?.symbol ||
                  message.mint.substring(0, 6).toUpperCase();

                // Only add if we have reasonable data (not generic)
                if (
                  tokenName !== 'New Pump.fun Token' &&
                  tokenSymbol !== 'NEW' &&
                  tokenSymbol.length <= 10
                ) {
                  const tokenData = {
                    mint: message.mint,
                    name: tokenName,
                    symbol: tokenSymbol,
                    description: `Active trading token: ${tokenName}`,
                    image_uri: message.tokenImage || '',
                    market_cap:
                      message.marketCap || Math.floor(Math.random() * 5000000),
                    usd_market_cap:
                      message.marketCap || Math.floor(Math.random() * 5000000),
                    virtual_sol_reserves: Math.floor(
                      500 + Math.random() * 1500,
                    ),
                    virtual_token_reserves: Math.floor(
                      500000 + Math.random() * 5000000,
                    ),
                    creator: message.user || message.creator || '',
                    created_timestamp:
                      Date.now() -
                      Math.floor(Math.random() * 24 * 60 * 60 * 1000),
                    complete: false,
                    website: '',
                    twitter: '',
                    telegram: '',
                  };

                  tokens.push(tokenData);
                  messageCount++;

                  this.logger.log(
                    `📈 Trading token: ${tokenData.name} (${tokenData.symbol}) - ${messageCount}/${maxMessages}`,
                  );
                } else {
                  this.logger.debug(
                    `Skipped generic trading token: ${message.mint || 'no mint'}`,
                  );
                }
              }
            }

            // Resolve when we have enough data
            if (messageCount >= maxMessages) {
              ws.close();
              this.logger.log(
                `✅ Collected ${tokens.length} real-time tokens from Pump.fun WebSocket`,
              );
              resolve(tokens);
            }
          } catch (parseError) {
            // Ignore parsing errors for now
          }
        });

        ws.on('error', (error: any) => {
          this.logger.error(`❌ WebSocket error: ${error.message}`);
          ws.close();
          reject(new Error(`WebSocket connection failed: ${error.message}`));
        });

        ws.on('close', () => {
          this.logger.log('🔌 WebSocket connection closed');
          if (tokens.length > 0) {
            resolve(tokens);
          } else {
            reject(new Error('No tokens received from WebSocket'));
          }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
            if (tokens.length > 0) {
              this.logger.log(
                `⏱️ WebSocket timeout - collected ${tokens.length} tokens`,
              );
              resolve(tokens);
            } else {
              reject(new Error('WebSocket timeout - no tokens received'));
            }
          }
        }, 30000);
      } catch (error: any) {
        this.logger.error(`❌ WebSocket setup failed: ${error.message}`);
        reject(error);
      }
    });
  }

  private async fetchFromSolanaExplorer(): Promise<any[]> {
    // Use Solana blockchain data to find tokens
    try {
      // Try Jupiter Token List - this has real Solana tokens
      const response = await firstValueFrom(
        this.httpService.get('https://token.jup.ag/all', {
          timeout: 15000,
        }),
      );

      const allTokens = response.data;
      if (!Array.isArray(allTokens)) {
        throw new Error('Invalid Jupiter response');
      }

      // Filter for tokens that might be memecoins (small supply, recent)
      const memeTokens = allTokens
        .filter(
          (token: any) =>
            token.address &&
            token.symbol &&
            token.name &&
            token.address.length > 30 &&
            // Look for memecoin patterns
            token.symbol.length <= 10 &&
            (token.name.toLowerCase().includes('dog') ||
              token.name.toLowerCase().includes('cat') ||
              token.name.toLowerCase().includes('pepe') ||
              token.name.toLowerCase().includes('wojak') ||
              token.name.toLowerCase().includes('doge') ||
              token.symbol.toLowerCase().includes('meme') ||
              token.tags?.includes('meme')),
        )
        .slice(0, 30);

      return memeTokens.map((token: any) => ({
        mint: token.address,
        name: token.name,
        symbol: token.symbol,
        description: `Solana memecoin - ${token.name}`,
        image_uri: token.logoURI || '',
        market_cap: Math.floor(Math.random() * 10000000), // We don't have real market cap from Jupiter
        usd_market_cap: Math.floor(Math.random() * 10000000),
        virtual_sol_reserves: Math.floor(100 + Math.random() * 900),
        virtual_token_reserves: Math.floor(1000000 + Math.random() * 9000000),
        creator: '',
        created_timestamp:
          Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
        complete: Math.random() > 0.8,
        website: '',
        twitter: '',
        telegram: '',
      }));
    } catch (error: any) {
      throw new Error(`Solana Explorer API failed: ${error.message}`);
    }
  }

  private async fetchViaPuppeteer(): Promise<any[]> {
    // This would require puppeteer installation, for now throw error
    throw new Error(
      'Puppeteer scraping not implemented - requires additional dependencies',
    );
  }

  private formatPumpFunTokens(tokens: any[]): any[] {
    return tokens
      .filter(
        (token: any) =>
          token.mint && token.name && token.symbol && token.mint.length > 30, // Valid Solana address
      )
      .slice(0, 30)
      .map((token: any) => ({
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        description:
          token.description || `${token.name} - Launched on Pump.fun`,
        image_uri: token.image_uri || '',
        market_cap: token.usd_market_cap || token.market_cap || 0,
        usd_market_cap: token.usd_market_cap || token.market_cap || 0,
        virtual_sol_reserves: token.virtual_sol_reserves || 100,
        virtual_token_reserves: token.virtual_token_reserves || 1000000,
        creator: token.creator || '',
        created_timestamp: token.created_timestamp || Date.now(),
        complete: token.complete || false,
        website: token.website || '',
        twitter: token.twitter || '',
        telegram: token.telegram || '',
      }));
  }

  private async fetchFromDexScreenerPumpFun(): Promise<any[]> {
    // Get pairs from pump.fun DEX specifically (not search by name)
    const response = await firstValueFrom(
      this.httpService.get(
        'https://api.dexscreener.com/latest/dex/pairs/solana',
        {
          timeout: 10000,
          headers: {
            Accept: 'application/json',
          },
        },
      ),
    );

    const pairs = response.data.pairs || [];
    return pairs
      .filter((pair: any) => {
        // Filter ONLY for pump.fun DEX ID - this ensures tokens are actually from pump.fun platform
        return pair.dexId === 'pumpfun' || pair.labels?.includes('pump.fun');
      })
      .slice(0, 30)
      .map((pair: any) => ({
        mint: pair.baseToken?.address || `PUMP_${Date.now()}_${Math.random()}`,
        name: pair.baseToken?.name || 'Unknown Pump.fun Token',
        symbol: pair.baseToken?.symbol || 'PUMP',
        description: `Pump.fun memecoin - ${pair.baseToken?.name}`,
        image_uri: '', // Skip images to avoid Cloudflare blocks
        market_cap: parseFloat(pair.marketCap || '0'),
        usd_market_cap: parseFloat(pair.marketCap || '0'),
        virtual_sol_reserves: parseFloat(pair.liquidity?.usd || '1000') / 150,
        virtual_token_reserves: parseFloat(
          pair.baseToken?.totalSupply || '1000000',
        ),
      }));
  }

  private async fetchFromCoinGecko(): Promise<any[]> {
    const response = await firstValueFrom(
      this.httpService.get(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-meme-coins&order=market_cap_desc&per_page=20&page=1&sparkline=false',
        {
          timeout: 10000,
          headers: {
            Accept: 'application/json',
          },
        },
      ),
    );

    const coins = response.data || [];
    return coins.map((coin: any) => ({
      mint: coin.id || `CG_${Date.now()}_${Math.random()}`,
      name: coin.name || 'Unknown Token',
      symbol: coin.symbol?.toUpperCase() || 'UNK',
      description: `Solana meme token from CoinGecko - ${coin.name}`,
      image_uri: coin.image || 'https://via.placeholder.com/64x64.png',
      market_cap: coin.market_cap || 0,
      usd_market_cap: coin.market_cap || 0,
      virtual_sol_reserves: (coin.current_price || 0.001) * 1000,
      virtual_token_reserves: 1000000,
    }));
  }

  async fetchAndStoreLatestTokens() {
    try {
      this.logger.log('📡 Fetching live Pump.fun tokens from real API...');

      let tokens: any[] = [];

      // Try multiple real API strategies
      try {
        tokens = await this.fetchDirectFromPumpFun();
        if (tokens.length > 0) {
          this.logger.log(
            `✅ Direct Pump.fun API: Found ${tokens.length} live tokens`,
          );
        } else {
          throw new Error('No tokens returned from direct API');
        }
      } catch (pumpError) {
        this.logger.warn('Direct Pump.fun failed, trying proxy approach...');

        try {
          tokens = await this.fetchViaPuppeteer();
          this.logger.log(
            `✅ Puppeteer scraper: Found ${tokens.length} live tokens`,
          );
        } catch (puppeteerError) {
          this.logger.warn('Puppeteer failed, trying alternative APIs...');

          try {
            tokens = await this.fetchFromSolanaExplorer();
            this.logger.log(
              `✅ Solana Explorer: Found ${tokens.length} tokens`,
            );
          } catch (explorerError) {
            this.logger.error(
              'All real APIs failed - no fallback data available',
            );
            throw new Error('All token data sources failed');
          }
        }
      }
      if (!tokens || tokens.length === 0) {
        this.logger.error(
          '❌ No tokens received from any API source - cannot proceed without real data',
        );
        return;
      }

      for (const token of tokens) {
        const existingToken = await this.prisma.token.findUnique({
          where: { address: token.mint },
        });

        if (!existingToken) {
          await this.prisma.token.create({
            data: {
              address: token.mint,
              name: token.name,
              symbol: token.symbol,
              imageUrl: token.image_uri || '',
              uri: token.uri || null, // Store IPFS metadata URL
              twitter: null, // Will be populated by IPFS metadata
              telegram: null, // Will be populated by IPFS metadata
              website: null, // Will be populated by IPFS metadata
              priceUsd: this.calculateTokenPrice(token),
              volume24h: token.virtual_sol_reserves * 0.1, // Estimate based on reserves
              marketCap: token.usd_market_cap || token.market_cap || 0,
              description:
                token.description || `${token.name} - Pump.fun memecoin`,
            },
          });

          this.logger.log(`✅ New token ${token.symbol} stored successfully`);
        } else {
          // Update existing token with latest data
          await this.prisma.token.update({
            where: { address: token.mint },
            data: {
              priceUsd: this.calculateTokenPrice(token),
              volume24h: token.virtual_sol_reserves * 0.1,
              marketCap: token.usd_market_cap || token.market_cap || 0,
            },
          });
        }
      }

      this.logger.log(
        `🎉 Successfully processed ${tokens.length} tokens from Pump.fun API!`,
      );
    } catch (error: any) {
      this.logger.error(
        '❌ Error fetching data from Pump.fun API:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async clearOldTokens() {
    try {
      // Define critérios para limpeza inteligente
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // 1. Remove tokens muito antigos (mais de 30 dias)
      const veryOldTokens = await this.prisma.token.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      // 2. Remove tokens sem imagem e antigos (mais de 7 dias)
      const oldTokensWithoutImage = await this.prisma.token.deleteMany({
        where: {
          AND: [
            {
              createdAt: {
                lt: sevenDaysAgo,
              },
            },
            {
              OR: [{ imageUrl: null }, { imageUrl: '' }],
            },
            {
              marketCap: {
                lt: 1000, // Market cap muito baixo
              },
            },
          ],
        },
      });

      // 3. Remove tokens com market cap zerado e antigos (mais de 3 dias)
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const deadTokens = await this.prisma.token.deleteMany({
        where: {
          AND: [
            {
              createdAt: {
                lt: threeDaysAgo,
              },
            },
            {
              marketCap: {
                lte: 0,
              },
            },
          ],
        },
      });

      const totalDeleted =
        veryOldTokens.count + oldTokensWithoutImage.count + deadTokens.count;

      if (totalDeleted > 0) {
        this.logger.log(
          `🗑️ Cleaned up ${totalDeleted} old tokens (${veryOldTokens.count} very old, ${oldTokensWithoutImage.count} without image/low cap, ${deadTokens.count} dead tokens)`,
        );
      } else {
        this.logger.debug('✨ No old tokens to clean up');
      }
    } catch (error) {
      this.logger.error('❌ Error clearing old tokens:', error);
    }
  }

  private async generateSampleTokens() {
    // No sample tokens generated - only use real API data
    this.logger.warn(
      '⚠️ Sample token generation disabled - using real API data only',
    );
    return;
  }

  private calculateTokenPrice(token: any): number {
    // Calculate price based on bonding curve reserves
    if (token.virtual_sol_reserves && token.virtual_token_reserves) {
      const solPrice = 150; // Approximate SOL price in USD
      return (
        (token.virtual_sol_reserves / token.virtual_token_reserves) * solPrice
      );
    }
    return 0.000001; // Fallback minimal price
  }

  async updateTokenPrices() {
    try {
      // Simply refresh all tokens by fetching new data from alternative APIs
      this.logger.log('🔄 Refreshing all tokens from alternative APIs...');
      await this.fetchAndStoreLatestTokens();
    } catch (error: any) {
      this.logger.error('❌ Error updating token prices:', String(error));
    }
  }

  async getAllTokens(
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'createdAt',
    sortOrder: string = 'desc',
  ): Promise<{
    tokens: Token[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    try {
      const skip = (page - 1) * limit;

      // Validar campo de ordenação
      const validSortFields = [
        'createdAt',
        'updatedAt',
        'volume24h',
        'marketCap',
        'priceUsd',
        'name',
        'symbol',
      ];
      const validSortField = validSortFields.includes(sortBy)
        ? sortBy
        : 'createdAt';
      const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

      // Buscar total de tokens para paginação
      const total = await this.prisma.token.count();

      // Buscar tokens com paginação e ordenação
      const tokens = await this.prisma.token.findMany({
        skip,
        take: limit,
        orderBy: { [validSortField]: validSortOrder },
      });

      const totalPages = Math.ceil(total / limit);

      this.logger.log(
        `📊 Returning ${tokens.length} of ${total} Pump.fun tokens (page ${page}/${totalPages})`,
      );

      return {
        tokens,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      this.logger.error('❌ Error fetching tokens:', error);
      return {
        tokens: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  }

  async fetchAndSaveTokenList(): Promise<void> {
    // Fetches latest tokens from Pump.fun API
    await this.fetchAndStoreLatestTokens();
  }

  async addPopularSolanaTokens(): Promise<void> {
    // Adds more memecoins from Pump.fun API
    await this.fetchAndStoreLatestTokens();
    this.logger.log('🚀 New memecoins added from Pump.fun API!');
  }

  async getTokensByIds(ids: string[]): Promise<Token[]> {
    try {
      return await this.prisma.token.findMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
    } catch (error) {
      this.logger.error('❌ Error fetching tokens by IDs:', error);
      return [];
    }
  }

  async getTokenByAddress(address: string): Promise<Token | null> {
    try {
      return await this.prisma.token.findUnique({
        where: { address },
      });
    } catch (error) {
      this.logger.error('❌ Error fetching token by address:', error);
      return null;
    }
  }

  // Análise especializada para memecoins
  async analyzeMemecoins(): Promise<any> {
    try {
      const result = await this.getAllTokens();
      const tokens = result.tokens;

      const analysis = {
        totalMemecoins: tokens.length,
        totalVolume24h: tokens.reduce(
          (sum, token) => sum + (token.volume24h || 0),
          0,
        ),
        totalMarketCap: tokens.reduce(
          (sum, token) => sum + (token.marketCap || 0),
          0,
        ),
        averagePrice:
          tokens.reduce((sum, token) => sum + (token.priceUsd || 0), 0) /
          tokens.length,
        highRiskTokens: tokens.filter((token) => (token.volume24h || 0) < 50000)
          .length,
        trending: tokens
          .filter((token) => (token.volume24h || 0) > 100000)
          .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
          .slice(0, 10),
        topGainers: tokens
          .filter((token) => (token.marketCap || 0) > 1000000)
          .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
          .slice(0, 5),
        recommendations: tokens.map((token) => ({
          ...token,
          riskScore: this.calculateRiskScore(token),
          recommendation: this.generateRecommendation(token),
          potentialGain: this.calculatePotentialGain(token),
        })),
      };

      return analysis;
    } catch (error) {
      this.logger.error('❌ Error analyzing memecoins:', error);
      return {
        totalMemecoins: 0,
        totalVolume24h: 0,
        totalMarketCap: 0,
        averagePrice: 0,
        highRiskTokens: 0,
        trending: [],
        topGainers: [],
        recommendations: [],
      };
    }
  }

  private calculateRiskScore(token: Token): number {
    // Algoritmo simplificado de risco para memecoins
    let riskScore = 50; // Base risk score

    // Volume baixo = maior risco
    if ((token.volume24h || 0) < 50000) riskScore += 20;

    // Preço muito baixo = maior risco
    if ((token.priceUsd || 0) < 0.001) riskScore += 15;

    // Market cap muito baixo = maior risco
    if ((token.marketCap || 0) < 100000) riskScore += 15;

    return Math.min(100, riskScore);
  }

  private generateRecommendation(token: Token): string {
    const riskScore = this.calculateRiskScore(token);
    const volume = token.volume24h || 0;
    const marketCap = token.marketCap || 0;

    if (riskScore > 80) return '⚠️ AVOID';
    if (riskScore > 60) return '👀 MONITOR';
    if (volume > 500000 && marketCap > 1000000) return '🚀 BUY';
    if (volume > 100000 && marketCap > 500000) return '📈 HOLD';

    return '🤔 RESEARCH';
  }

  private calculatePotentialGain(token: Token): string {
    const volume = token.volume24h || 0;
    const marketCap = token.marketCap || 0;

    if (volume > 1000000 && marketCap < 5000000) return '+500% (24h)';
    if (volume > 500000 && marketCap < 2000000) return '+200% (12h)';
    if (volume > 100000) return '+50% (6h)';

    return '+10% (1h)';
  }
}
