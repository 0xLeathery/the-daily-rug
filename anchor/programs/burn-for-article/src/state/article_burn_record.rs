use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ArticleBurnRecord {
    pub article_id: [u8; 16], // 16 bytes
    pub burner: Pubkey,        // 32 bytes
    pub amount: u64,           // 8 bytes
    pub timestamp: i64,        // 8 bytes
    pub mint: Pubkey,          // 32 bytes
    pub bump: u8,              // 1 byte
}
// Total data: 97 bytes + 8 discriminator = 105 bytes
