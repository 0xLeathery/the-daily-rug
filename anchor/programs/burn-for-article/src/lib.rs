use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::burn_for_article::*;
use instructions::initialize_config::*;

declare_id!("DPJfqPk8yu6Fzu2aUQLY2DvFCPmhJ4zkZa2G8ZjKNeQW");

#[event]
pub struct ArticleKilled {
    pub article_id: [u8; 16],
    pub burner: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub mint: Pubkey,
}

#[program]
pub mod burn_for_article {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        min_burn_amount: u64,
    ) -> Result<()> {
        instructions::initialize_config::handler(ctx, min_burn_amount)
    }

    pub fn burn_for_article(
        ctx: Context<BurnForArticle>,
        article_id: [u8; 16],
        amount: u64,
    ) -> Result<()> {
        instructions::burn_for_article::handler(ctx, article_id, amount)
    }
}
