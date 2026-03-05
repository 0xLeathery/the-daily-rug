# The Daily Rug

**The Web3 tabloid. AI-generated gossip on Solana whale activity — verified on-chain, silenced by the highest bidder.**

[thedailyrug.fun](https://thedailyrug.fun) · Token: `$TICKER` (launching on Pump.fun)

---

## What is this

The Daily Rug publishes gossip articles about meme coin whale activity, coordinated dumps, stealth accumulation, and on-chain drama. Stories are written by AI, edited by humans, and permanently killable by anyone willing to burn enough tokens.

The mechanic is simple:

- **Hold** ≥1M `$TICKER` tokens → unlock Alpha Gossip articles before they go public
- **Burn** tokens → permanently redact any article, on-chain, forever
- **Watch** the burn price update in real time — hotter stories cost more to silence

Every burn is deflationary. Every redaction is a confession.

---

## The Burn-to-Redact Mechanic

When a community burns tokens to kill a story, three things happen simultaneously:

1. The Anchor program emits an on-chain `ArticleKilled` event with the article ID
2. A Helius webhook picks up the event and updates the article status to `Redacted`
3. The article is replaced with a tombstone — permanently, across all sessions

The burned tokens are destroyed. The story is gone. The chart goes up.

This is not a vote. There is no governance. Burn the tokens, kill the story.

---

## Smart Contract

The on-chain program handles the burn-for-article instruction. It validates the burn, enforces the minimum amount, and emits the event that drives the redaction pipeline.

```
Program: burn_for_article
Network:  Solana Devnet → Mainnet (at token launch)
```

| Network | Program ID |
|---------|-----------|
| Devnet  | `DPJfqPk8yu6Fzu2aUQLY2DvFCPmhJ4zkZa2G8ZjKNeQW` |
| Mainnet | TBD at token launch |

The full source is in [`anchor/programs/burn-for-article/`](./anchor/programs/burn-for-article/).
The IDL is at [`idl/burn_for_article.json`](./idl/burn_for_article.json).

### Auditing the contract

```bash
# Clone and build
git clone https://github.com/YOUR_ORG/TMZolana
cd TMZolana/anchor
anchor build

# Run tests against a local validator
anchor test
```

Requires: [Rust](https://rustup.rs/), [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools), [Anchor CLI](https://www.anchor-lang.com/docs/installation)

---

## Token

`$TICKER` launches on [Pump.fun](https://pump.fun). Token address announced at launch.

- **Mint**: TBD
- **Token gate threshold**: 1,000,000 tokens (low barrier by design)
- **Alpha gate**: New articles are token-gated for 2 hours, then fully public
- **Burn mechanic**: Per-article burn price set at publish time

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) + Tailwind |
| Wallet | `@solana/wallet-adapter-react` |
| Smart Contract | Anchor (Rust) on Solana |
| Database | Supabase (Postgres + RLS) |
| Event Listening | Helius webhooks |
| Image Storage | Cloudflare R2 |
| AI Drafts | Anthropic Claude |

---

## Database Schema

Supabase migrations are in [`supabase/migrations/`](./supabase/migrations/) and are safe to review. Row Level Security is enabled on all tables.

---

## License

The Anchor smart contract (`anchor/`) is MIT licensed.

The web application is proprietary and not licensed for reuse.

---

*Built on Solana. Every burn is on-chain. Every redaction is permanent.*
