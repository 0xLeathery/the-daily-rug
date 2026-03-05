use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct BurnConfig {
    pub allowed_mint: Pubkey,    // 32 bytes — the only SPL mint accepted for burns
    pub min_burn_amount: u64,    // 8 bytes — minimum raw token amount (with decimals)
    pub admin: Pubkey,           // 32 bytes — authority who can update config
    pub bump: u8,                // 1 byte
}
// Total data: 73 bytes + 8 discriminator = 81 bytes
