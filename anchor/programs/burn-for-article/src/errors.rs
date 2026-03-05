use anchor_lang::prelude::*;

#[error_code]
pub enum BurnError {
    #[msg("Wallet must hold at least 100,000 tokens to burn an article")]
    InsufficientTokenBalance,

    #[msg("Token mint does not match the allowed mint in BurnConfig")]
    InvalidMint,

    #[msg("Burn amount is below the minimum required by BurnConfig")]
    BurnAmountTooLow,
}
