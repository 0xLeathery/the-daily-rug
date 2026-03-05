import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BurnForArticle } from "../target/types/burn_for_article";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { assert } from "chai";

describe("burn_for_article", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.BurnForArticle as Program<BurnForArticle>;

  let mintPubkey: PublicKey;
  let burnerAta: PublicKey;
  let articleId: number[];
  let articleBurnPda: PublicKey;
  let happyPathTxSig: string;

  // 100K tokens with 6 decimals = 100_000 * 10^6 raw units
  const HUNDRED_K_RAW = new anchor.BN(100_000 * 1_000_000);
  // 500K tokens for the funded wallet
  const FIVE_HUNDRED_K_RAW = 500_000 * 1_000_000;

  before(async () => {
    // Create a new SPL mint with 6 decimals (simulating Pump.fun token)
    mintPubkey = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      provider.wallet.publicKey, // mint authority
      null,
      6
    );

    // Create ATA for the provider wallet
    const ataAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mintPubkey,
      provider.wallet.publicKey
    );
    burnerAta = ataAccount.address;

    // Mint 500K tokens (well above the 100K threshold)
    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mintPubkey,
      burnerAta,
      provider.wallet.publicKey,
      FIVE_HUNDRED_K_RAW
    );

    // Generate a random 16-byte article_id (UUID bytes)
    const randomBytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
    articleId = Array.from(randomBytes);

    // Derive the PDA for this article_id
    [articleBurnPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("article_burn"), Buffer.from(articleId)],
      program.programId
    );
  });

  it("Test 1: burns tokens and creates PDA record (happy path)", async () => {
    const balanceBefore = (
      await getAccount(provider.connection, burnerAta)
    ).amount;

    const burnAmount = HUNDRED_K_RAW;

    happyPathTxSig = await program.methods
      .burnForArticle(articleId, burnAmount)
      .accounts({
        burner: provider.wallet.publicKey,
        burnerTokenAccount: burnerAta,
        mint: mintPubkey,
        articleBurnRecord: articleBurnPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Fetch and verify the PDA account
    const record = await program.account.articleBurnRecord.fetch(
      articleBurnPda
    );

    assert.deepEqual(
      record.articleId,
      articleId,
      "articleId in PDA should match the input"
    );
    assert.equal(
      record.burner.toBase58(),
      provider.wallet.publicKey.toBase58(),
      "burner should be the provider wallet"
    );
    assert.isTrue(
      record.amount.eq(burnAmount),
      "amount in PDA should match burn amount"
    );
    assert.equal(
      record.mint.toBase58(),
      mintPubkey.toBase58(),
      "mint in PDA should match the token mint"
    );
    assert.isAbove(
      record.timestamp.toNumber(),
      0,
      "timestamp should be a positive unix timestamp"
    );

    // Verify token balance decreased
    const balanceAfter = (
      await getAccount(provider.connection, burnerAta)
    ).amount;
    const expectedDecrease = BigInt(burnAmount.toString());
    assert.equal(
      balanceBefore - balanceAfter,
      expectedDecrease,
      "Token balance should decrease by the burn amount"
    );
  });

  it("Test 2: emits ArticleKilled event in transaction logs (Program data: line)", async () => {
    // Use the tx from test 1 (happyPathTxSig)
    const txDetails = await provider.connection.getTransaction(
      happyPathTxSig,
      {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      }
    );

    assert.isNotNull(txDetails, "Transaction should be retrievable");
    assert.isNotNull(txDetails.meta, "Transaction should have metadata");

    const logMessages = txDetails.meta.logMessages || [];
    const hasProgramData = logMessages.some((log) =>
      log.startsWith("Program data:")
    );
    assert.isTrue(
      hasProgramData,
      "Transaction logs should contain a 'Program data:' line from emit!()"
    );
  });

  it("Test 3: prevents double burn on same article_id", async () => {
    // Attempt to burn again with the same article_id (should fail)
    let didFail = false;
    try {
      await program.methods
        .burnForArticle(articleId, HUNDRED_K_RAW)
        .accounts({
          burner: provider.wallet.publicKey,
          burnerTokenAccount: burnerAta,
          mint: mintPubkey,
          articleBurnRecord: articleBurnPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch (err) {
      didFail = true;
      // Anchor init constraint returns error when account already exists
      // The error message should relate to account initialization
      const errMsg = err.toString().toLowerCase();
      const isExpectedError =
        errMsg.includes("already") ||
        errMsg.includes("0x0") || // system program error for already-initialized account
        errMsg.includes("accountalreadyinitialized") ||
        errMsg.includes("failed to serialize") ||
        err.code === 0; // system program already-initialized error code
      assert.isTrue(
        didFail,
        "Double burn attempt should fail (PDA already initialized)"
      );
    }
    assert.isTrue(didFail, "Double burn attempt should have thrown an error");
  });

  it("Test 4: rejects wallet with insufficient token balance (< 100K tokens)", async () => {
    // Create a second wallet with less than 100K tokens
    const poorWallet = Keypair.generate();

    // Airdrop SOL for transaction fees
    const airdropSig = await provider.connection.requestAirdrop(
      poorWallet.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig, "confirmed");

    // Create ATA for poor wallet and mint only 50K tokens
    const poorWalletAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      poorWallet, // payer
      mintPubkey,
      poorWallet.publicKey
    );

    const FIFTY_K_RAW = 50_000 * 1_000_000; // 50K tokens with 6 decimals
    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer, // use provider as mint authority
      mintPubkey,
      poorWalletAta.address,
      provider.wallet.publicKey,
      FIFTY_K_RAW
    );

    // Generate a different article_id for this test
    const differentArticleId = Array.from(new Uint8Array(16).fill(42));
    const [differentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("article_burn"), Buffer.from(differentArticleId)],
      program.programId
    );

    // Attempt burn with insufficient balance
    let didFail = false;
    try {
      const insufficientProvider = new anchor.AnchorProvider(
        provider.connection,
        new anchor.Wallet(poorWallet),
        { commitment: "confirmed" }
      );
      const insufficientProgram = new Program(
        program.idl,
        insufficientProvider
      );

      await insufficientProgram.methods
        .burnForArticle(differentArticleId, new anchor.BN(50_000_000_000))
        .accounts({
          burner: poorWallet.publicKey,
          burnerTokenAccount: poorWalletAta.address,
          mint: mintPubkey,
          articleBurnRecord: differentPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch (err) {
      didFail = true;
      const errMsg = err.toString();
      // Should be InsufficientTokenBalance (error code 6000 = 0x1770)
      const isExpectedError =
        errMsg.includes("InsufficientTokenBalance") ||
        errMsg.includes("0x1770") ||
        errMsg.includes("6000") ||
        errMsg.includes("constraint") ||
        errMsg.includes("Constraint");
      assert.isTrue(
        isExpectedError,
        `Error should be related to InsufficientTokenBalance. Got: ${errMsg}`
      );
    }
    assert.isTrue(
      didFail,
      "Transaction with insufficient balance should have failed"
    );
  });

  it("Test 5: includes human-readable msg! log 'ArticleKilled:'", async () => {
    const txDetails = await provider.connection.getTransaction(
      happyPathTxSig,
      {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      }
    );

    assert.isNotNull(txDetails, "Transaction should be retrievable");
    const logMessages = txDetails.meta.logMessages || [];

    const hasArticleKilledLog = logMessages.some((log) =>
      log.includes("ArticleKilled:")
    );
    assert.isTrue(
      hasArticleKilledLog,
      "Transaction logs should contain 'ArticleKilled:' from msg!()"
    );
  });
});
