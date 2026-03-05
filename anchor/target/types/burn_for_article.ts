/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/burn_for_article.json`.
 */
export type BurnForArticle = {
  "address": "DPJfqPk8yu6Fzu2aUQLY2DvFCPmhJ4zkZa2G8ZjKNeQW",
  "metadata": {
    "name": "burnForArticle",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Burn SPL tokens to permanently redact an article on-chain"
  },
  "instructions": [
    {
      "name": "burnForArticle",
      "discriminator": [
        82,
        81,
        59,
        127,
        92,
        88,
        216,
        242
      ],
      "accounts": [
        {
          "name": "burner",
          "docs": [
            "The wallet initiating the burn (pays for PDA rent)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "burnerTokenAccount",
          "docs": [
            "Caller's token account - must hold >= 100K tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "burner"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mint",
          "docs": [
            "The SPL token mint being burned"
          ],
          "writable": true
        },
        {
          "name": "articleBurnRecord",
          "docs": [
            "PDA keyed to article_id - prevents double-burn via init constraint"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  114,
                  116,
                  105,
                  99,
                  108,
                  101,
                  95,
                  98,
                  117,
                  114,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "articleId"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "articleId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "articleBurnRecord",
      "discriminator": [
        16,
        88,
        245,
        237,
        125,
        220,
        174,
        201
      ]
    }
  ],
  "events": [
    {
      "name": "articleKilled",
      "discriminator": [
        200,
        123,
        34,
        65,
        1,
        20,
        248,
        179
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientTokenBalance",
      "msg": "Wallet must hold at least 100,000 tokens to burn an article"
    }
  ],
  "types": [
    {
      "name": "articleBurnRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "articleId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "burner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "articleKilled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "articleId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "burner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
