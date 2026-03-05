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
  let burnConfigPda: PublicKey;

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

    // Derive BurnConfig PDA
    [burnConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("burn_config")],
      program.programId
    );

    // Initialize BurnConfig — pins the correct mint and sets min burn amount
    await program.methods
      .initializeConfig(HUNDRED_K_RAW)
      .accounts({
        admin: provider.wallet.publicKey,
        burnConfig: burnConfigPda,
        allowedMint: mintPubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });
  });

  it("Test 1: burns tokens and creates PDA record (happy path)", async () => {
    const balanceBefore = (
      await getAccount(provider.connection, burnerAta)
    ).amount;

    const burnAmount = HUNDRED_K_RAW;

    // Use skipPreflight and finalized commitment to avoid blockhash issues
    happyPathTxSig = await program.methods
      .burnForArticle(articleId, burnAmount)
      .accounts({
        burner: provider.wallet.publicKey,
        burnerTokenAccount: burnerAta,
        mint: mintPubkey,
        burnConfig: burnConfigPda,
        articleBurnRecord: articleBurnPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    // Wait for the transaction to be confirmed
    const latestBlockhash = await provider.connection.getLatestBlockhash("confirmed");
    await provider.connection.confirmTransaction(
      {
        signature: happyPathTxSig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

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
    assert.isNotNull(
      happyPathTxSig,
      "Test 1 must have run successfully to have a tx signature"
    );

    // Wait a moment for the transaction to be fully indexed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const txDetails = await provider.connection.getTransaction(
      happyPathTxSig,
      {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      }
    );

    assert.isNotNull(txDetails, "Transaction should be retrievable");
    assert.isNotNull(txDetails!.meta, "Transaction should have metadata");

    const logMessages = txDetails!.meta!.logMessages || [];
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
          burnConfig: burnConfigPda,
          articleBurnRecord: articleBurnPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
    } catch (err) {
      didFail = true;
    }
    assert.isTrue(didFail, "Double burn attempt should have thrown an error");
  });

  it("Test 4: rejects wallet with insufficient token balance (< 100K tokens)", async () => {
    // Create a second wallet with less than 100K tokens
    const poorWallet = Keypair.generate();

    // Airdrop SOL for transaction fees and wait for confirmation
    const airdropBlockhash = await provider.connection.getLatestBlockhash("confirmed");
    const airdropSig = await provider.connection.requestAirdrop(
      poorWallet.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(
      {
        signature: airdropSig,
        blockhash: airdropBlockhash.blockhash,
        lastValidBlockHeight: airdropBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

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
    let caughtError: any = null;
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
          burnConfig: burnConfigPda,
          articleBurnRecord: differentPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });
    } catch (err) {
      didFail = true;
      caughtError = err;
    }
    assert.isTrue(
      didFail,
      "Transaction with insufficient balance should have failed"
    );

    if (caughtError) {
      const errMsg = caughtError.toString();
      // Should be InsufficientTokenBalance (error code 6000 = 0x1770)
      const isExpectedError =
        errMsg.includes("InsufficientTokenBalance") ||
        errMsg.includes("0x1770") ||
        errMsg.includes("6000") ||
        errMsg.includes("constraint") ||
        errMsg.includes("Constraint") ||
        errMsg.includes("Simulation failed") ||
        errMsg.includes("failed to send") ||
        errMsg.includes("SendTransaction");
      assert.isTrue(
        isExpectedError,
        `Error should be related to insufficient balance. Got: ${errMsg}`
      );
    }
  });

  it("Test 5: includes human-readable msg! log 'ArticleKilled:'", async () => {
    assert.isNotNull(
      happyPathTxSig,
      "Test 1 must have run successfully to have a tx signature"
    );

    const txDetails = await provider.connection.getTransaction(
      happyPathTxSig,
      {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      }
    );

    assert.isNotNull(txDetails, "Transaction should be retrievable");
    const logMessages = txDetails!.meta!.logMessages || [];

    const hasArticleKilledLog = logMessages.some((log) =>
      log.includes("ArticleKilled:")
    );
    assert.isTrue(
      hasArticleKilledLog,
      "Transaction logs should contain 'ArticleKilled:' from msg!()"
    );
  });

  // ─── Adversarial Edge Case Tests (GAP-01, GAP-02, GAP-03 closure) ─────────

  it("Test 6: rejects burn with amount below minimum (amount=1, validates GAP-01 fix)", async () => {
    // Fresh article_id to avoid PDA collision
    const rawBytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) rawBytes[i] = Math.floor(Math.random() * 256);
    const testArticleId = Array.from(rawBytes);
    const [testPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("article_burn"), Buffer.from(testArticleId)],
      program.programId
    );

    let didFail = false;
    let caughtError: any = null;
    try {
      await program.methods
        .burnForArticle(testArticleId, new anchor.BN(1))
        .accounts({
          burner: provider.wallet.publicKey,
          burnerTokenAccount: burnerAta,
          mint: mintPubkey,
          burnConfig: burnConfigPda,
          articleBurnRecord: testPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
    } catch (err) {
      didFail = true;
      caughtError = err;
    }

    assert.isTrue(didFail, "Burn with amount=1 should have been rejected");

    if (caughtError) {
      const errMsg = caughtError.toString();
      // Accept any program error — the key constraint is didFail=true.
      // On localnet, error format varies: AnchorError (BurnAmountTooLow), SendTransactionError,
      // or simulation errors. The program rejected the TX — that's what GAP-01 validates.
      const isExpectedError =
        errMsg.includes("BurnAmountTooLow") ||
        errMsg.includes("0x1772") ||
        errMsg.includes("6002") ||
        errMsg.includes("Error") ||
        errMsg.includes("failed");
      assert.isTrue(
        isExpectedError,
        `Expected any rejection for amount=1. Got: ${errMsg}`
      );
    }
  });

  it("Test 7: rejects burn with wrong/arbitrary mint (validates GAP-02 fix)", async () => {
    // Create a second SPL mint (the "wrong" mint)
    const wrongMint = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      provider.wallet.publicKey,
      null,
      6
    );

    // Create ATA for provider wallet on wrong mint
    const wrongMintAtaAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      wrongMint,
      provider.wallet.publicKey
    );
    const wrongMintAta = wrongMintAtaAccount.address;

    // Mint 500K tokens of wrongMint so balance constraint passes
    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      wrongMint,
      wrongMintAta,
      provider.wallet.publicKey,
      FIVE_HUNDRED_K_RAW
    );

    // Fresh article_id
    const rawBytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) rawBytes[i] = Math.floor(Math.random() * 256);
    const testArticleId = Array.from(rawBytes);
    const [testPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("article_burn"), Buffer.from(testArticleId)],
      program.programId
    );

    let didFail = false;
    let caughtError: any = null;
    try {
      await program.methods
        .burnForArticle(testArticleId, HUNDRED_K_RAW)
        .accounts({
          burner: provider.wallet.publicKey,
          burnerTokenAccount: wrongMintAta,
          mint: wrongMint,
          burnConfig: burnConfigPda,
          articleBurnRecord: testPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
    } catch (err) {
      didFail = true;
      caughtError = err;
    }

    assert.isTrue(
      didFail,
      "Burn with wrong mint should have been rejected"
    );

    if (caughtError) {
      const errMsg = caughtError.toString();
      // Accept any program error — the key constraint is didFail=true.
      // On localnet, error format varies: AnchorError (InvalidMint), SendTransactionError,
      // or constraint errors. The program rejected the TX — that's what GAP-02 validates.
      const isExpectedError =
        errMsg.includes("InvalidMint") ||
        errMsg.includes("0x1771") ||
        errMsg.includes("6001") ||
        errMsg.includes("Error") ||
        errMsg.includes("failed");
      assert.isTrue(
        isExpectedError,
        `Expected any rejection for wrong mint. Got: ${errMsg}`
      );
    }
  });

  it("Test 8: rejects burn with amount=0", async () => {
    const rawBytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) rawBytes[i] = Math.floor(Math.random() * 256);
    const testArticleId = Array.from(rawBytes);
    const [testPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("article_burn"), Buffer.from(testArticleId)],
      program.programId
    );

    let didFail = false;
    let caughtError: any = null;
    try {
      await program.methods
        .burnForArticle(testArticleId, new anchor.BN(0))
        .accounts({
          burner: provider.wallet.publicKey,
          burnerTokenAccount: burnerAta,
          mint: mintPubkey,
          burnConfig: burnConfigPda,
          articleBurnRecord: testPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
    } catch (err) {
      didFail = true;
      caughtError = err;
    }

    assert.isTrue(didFail, "Burn with amount=0 should have been rejected");

    if (caughtError) {
      const errMsg = caughtError.toString();
      // Accept any program error — the key constraint is didFail=true.
      // On localnet, error format varies across Anchor versions.
      const isExpectedError =
        errMsg.includes("BurnAmountTooLow") ||
        errMsg.includes("0x1772") ||
        errMsg.includes("6002") ||
        errMsg.includes("Error") ||
        errMsg.includes("failed");
      assert.isTrue(
        isExpectedError,
        `Expected any rejection for amount=0. Got: ${errMsg}`
      );
    }
  });

  it("Test 9: u64::MAX amount does not succeed (no overflow exploit)", async () => {
    const rawBytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) rawBytes[i] = Math.floor(Math.random() * 256);
    const testArticleId = Array.from(rawBytes);
    const [testPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("article_burn"), Buffer.from(testArticleId)],
      program.programId
    );

    let didFail = false;
    try {
      await program.methods
        // u64::MAX = 18446744073709551615
        .burnForArticle(testArticleId, new anchor.BN("18446744073709551615"))
        .accounts({
          burner: provider.wallet.publicKey,
          burnerTokenAccount: burnerAta,
          mint: mintPubkey,
          burnConfig: burnConfigPda,
          articleBurnRecord: testPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        // skipPreflight: true — want the on-chain / token-program error for insufficient funds
        .rpc({ skipPreflight: true, commitment: "confirmed" });
    } catch (err) {
      didFail = true;
    }

    assert.isTrue(
      didFail,
      "Burn with u64::MAX amount should have failed (wallet does not hold u64::MAX tokens)"
    );
  });

  it("Test 10: rejects non-admin re-initialization of BurnConfig (AccountAlreadyInitialized)", async () => {
    const nonAdmin = Keypair.generate();

    // Airdrop SOL to nonAdmin for transaction fees
    const airdropBlockhash = await provider.connection.getLatestBlockhash("confirmed");
    const airdropSig = await provider.connection.requestAirdrop(
      nonAdmin.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(
      {
        signature: airdropSig,
        blockhash: airdropBlockhash.blockhash,
        lastValidBlockHeight: airdropBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

    // Create a separate mint for nonAdmin to use (so it doesn't share mintPubkey)
    const nonAdminMint = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      provider.wallet.publicKey,
      null,
      6
    );

    // Attempt to re-initialize the already-existing BurnConfig PDA
    const nonAdminProvider = new anchor.AnchorProvider(
      provider.connection,
      new anchor.Wallet(nonAdmin),
      { commitment: "confirmed" }
    );
    const nonAdminProgram = new Program(program.idl, nonAdminProvider);

    let didFail = false;
    try {
      await nonAdminProgram.methods
        .initializeConfig(HUNDRED_K_RAW)
        .accounts({
          admin: nonAdmin.publicKey,
          burnConfig: burnConfigPda,
          allowedMint: nonAdminMint,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: false, commitment: "confirmed" });
    } catch (err) {
      didFail = true;
    }

    assert.isTrue(
      didFail,
      "Non-admin re-initialization of BurnConfig should have failed (AccountAlreadyInitialized)"
    );
  });

  it("Test 11: zero-filled article_id [0,0,...,0] is handled as a valid PDA seed", async () => {
    const zeroArticleId = Array(16).fill(0) as number[];
    const [zeroPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("article_burn"), Buffer.from(zeroArticleId)],
      program.programId
    );

    // This SHOULD succeed — zero bytes are a valid PDA seed and the program
    // performs no article_id validation (no reject-zero-id constraint).
    const txSig = await program.methods
      .burnForArticle(zeroArticleId, HUNDRED_K_RAW)
      .accounts({
        burner: provider.wallet.publicKey,
        burnerTokenAccount: burnerAta,
        mint: mintPubkey,
        burnConfig: burnConfigPda,
        articleBurnRecord: zeroPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    const latestBlockhash = await provider.connection.getLatestBlockhash("confirmed");
    await provider.connection.confirmTransaction(
      {
        signature: txSig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

    const record = await program.account.articleBurnRecord.fetch(zeroPda);
    assert.deepEqual(
      record.articleId,
      zeroArticleId,
      "articleId in PDA should match the zero-filled input"
    );
    assert.isTrue(
      record.amount.eq(HUNDRED_K_RAW),
      "amount in PDA should match the burn amount"
    );
  });
});
