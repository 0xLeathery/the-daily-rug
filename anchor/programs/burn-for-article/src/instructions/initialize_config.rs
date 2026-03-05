use anchor_lang::prelude::*;
use crate::state::BurnConfig;

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    /// Admin wallet that pays for PDA creation and becomes the config authority
    #[account(mut)]
    pub admin: Signer<'info>,

    /// BurnConfig PDA — init constraint means it can only be created once
    #[account(
        init,
        payer = admin,
        space = 8 + BurnConfig::INIT_SPACE,
        seeds = [b"burn_config"],
        bump,
    )]
    pub burn_config: Account<'info, BurnConfig>,

    /// The SPL mint to pin as the only allowed burn token
    pub allowed_mint: Account<'info, anchor_spl::token::Mint>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeConfig>, min_burn_amount: u64) -> Result<()> {
    let config = &mut ctx.accounts.burn_config;
    config.allowed_mint = ctx.accounts.allowed_mint.key();
    config.min_burn_amount = min_burn_amount;
    config.admin = ctx.accounts.admin.key();
    config.bump = ctx.bumps.burn_config;

    msg!(
        "BurnConfig initialized: mint={}, min_amount={}",
        config.allowed_mint,
        config.min_burn_amount
    );

    Ok(())
}
