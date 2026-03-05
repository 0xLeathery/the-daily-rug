use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};

use crate::errors::BurnError;
use crate::state::ArticleBurnRecord;
use crate::ArticleKilled;

#[derive(Accounts)]
#[instruction(article_id: [u8; 16])]
pub struct BurnForArticle<'info> {
    /// The wallet initiating the burn (pays for PDA rent)
    #[account(mut)]
    pub burner: Signer<'info>,

    /// Caller's token account - must hold >= 100K tokens
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = burner,
        constraint = burner_token_account.amount >= 100_000 * 10u64.pow(mint.decimals as u32)
            @ BurnError::InsufficientTokenBalance,
    )]
    pub burner_token_account: Account<'info, TokenAccount>,

    /// The SPL token mint being burned
    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// PDA keyed to article_id - prevents double-burn via init constraint
    #[account(
        init,
        payer = burner,
        space = 8 + ArticleBurnRecord::INIT_SPACE,
        seeds = [b"article_burn", article_id.as_ref()],
        bump,
    )]
    pub article_burn_record: Account<'info, ArticleBurnRecord>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<BurnForArticle>, article_id: [u8; 16], amount: u64) -> Result<()> {
    // 1. Burn tokens via CPI to the SPL Token Program
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.burner_token_account.to_account_info(),
            authority: ctx.accounts.burner.to_account_info(),
        },
    );
    token::burn(cpi_ctx, amount)?;

    // 2. Record the burn on the PDA
    let record = &mut ctx.accounts.article_burn_record;
    record.article_id = article_id;
    record.burner = ctx.accounts.burner.key();
    record.amount = amount;
    record.timestamp = Clock::get()?.unix_timestamp;
    record.mint = ctx.accounts.mint.key();
    record.bump = ctx.bumps.article_burn_record;

    // 3. Emit structured event for Helius webhook consumption
    emit!(ArticleKilled {
        article_id,
        burner: ctx.accounts.burner.key(),
        amount,
        timestamp: record.timestamp,
        mint: ctx.accounts.mint.key(),
    });

    // 4. Human-readable log for Solana Explorer visibility
    msg!(
        "ArticleKilled: burner={} amount={}",
        ctx.accounts.burner.key(),
        amount
    );

    Ok(())
}
