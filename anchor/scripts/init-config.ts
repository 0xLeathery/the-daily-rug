/**
 * BurnConfig initialization script for devnet / mainnet.
 *
 * Run this ONCE after deploying the hardened Anchor program to pin the
 * allowed token mint and minimum burn amount on-chain. Because the program
 * uses plain `init` (not `init_if_needed`), a second invocation will fail
 * with AccountAlreadyInitialized — that is by design and is the re-init
 * protection.
 *
 * Usage:
 *   # Devnet (using Anchor's ANCHOR_PROVIDER_URL env var):
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *   TOKEN_MINT=<your-token-mint-address> \
 *   npx tsx scripts/init-config.ts
 *
 *   # Or with ts-mocha (requires Anchor.toml to point at devnet):
 *   solana config set --url devnet
 *   npx ts-mocha -p ./tsconfig.json -t 30000 scripts/init-config.ts
 *
 * Required env vars:
 *   TOKEN_MINT  — SPL token mint address to pin in BurnConfig.
 *                 Defaults to BONK test mint for devnet testing.
 *
 * NOTE: BurnConfig is NOT yet initialized on devnet. Init is deferred until
 * the project's real token mint is live. The devnet program itself is deployed
 * and executable at DPJfqPk8yu6Fzu2aUQLY2DvFCPmhJ4zkZa2G8ZjKNeQW.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { BurnForArticle } from "../target/types/burn_for_article";

async function main() {
  // Use Anchor's env-based provider (reads from Anchor.toml + CLI config).
  // Override with ANCHOR_PROVIDER_URL for devnet:
  //   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com npx tsx scripts/init-config.ts
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BurnForArticle as Program<BurnForArticle>;

  // Token mint to pin — must be the project's real Pump.fun token mint.
  // Default BONK is provided only for devnet smoke testing.
  const TOKEN_MINT = new PublicKey(
    process.env.TOKEN_MINT || "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
  );

  // Minimum burn amount: 100K tokens with 6 decimals = 100_000 * 10^6 raw units.
  // This matches the threshold enforced in BurnButton eligibility and the
  // Helius webhook handler's validation.
  const MIN_BURN_AMOUNT = new anchor.BN("100000000000");

  // Derive the singleton BurnConfig PDA.
  const [burnConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("burn_config")],
    program.programId
  );

  console.log("Program ID:      ", program.programId.toBase58());
  console.log("Admin wallet:    ", provider.wallet.publicKey.toBase58());
  console.log("BurnConfig PDA:  ", burnConfigPda.toBase58());
  console.log("Token mint:      ", TOKEN_MINT.toBase58());
  console.log(
    "Min burn amount: ",
    MIN_BURN_AMOUNT.toString(),
    "(raw u64 — 100K tokens with 6 decimals)"
  );

  // Guard: skip if BurnConfig is already initialized.
  const existingAccount = await provider.connection.getAccountInfo(burnConfigPda);
  if (existingAccount) {
    console.log("\nBurnConfig PDA already initialized. Skipping.");
    console.log("Account data length:", existingAccount.data.length, "bytes");
    return;
  }

  console.log("\nInitializing BurnConfig...");

  const tx = await program.methods
    .initializeConfig(MIN_BURN_AMOUNT)
    .accounts({
      admin: provider.wallet.publicKey,
      burnConfig: burnConfigPda,
      allowedMint: TOKEN_MINT,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc({ commitment: "confirmed", skipPreflight: true });

  console.log("BurnConfig initialized!");
  console.log("Transaction signature:", tx);
  console.log("\nVerifying...");

  const account = await provider.connection.getAccountInfo(burnConfigPda);
  if (account) {
    console.log("BurnConfig PDA exists, data length:", account.data.length, "bytes");
    console.log("SUCCESS: BurnConfig initialized.");
  } else {
    console.error("FAILED: BurnConfig PDA not found after initialization.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
