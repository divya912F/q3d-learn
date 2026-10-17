"""Blockchain — expanded curriculum (v2.3). Merged by content.py."""
from __future__ import annotations

TOPICS_EXTRA = {
    "keys": "Keys & wallets",
    "defi": "DeFi & dApps",
    "scaling": "Scaling",
    "security": "Security",
}

# Existing labs: ledger, merkle, attack, ecc, contract
LESSONS_EXTRA = [
    {
        "id": "bc-crypto-hash", "order": 7, "title": "Cryptographic Hashes in Depth", "topic": "hashing", "level": "Intermediate", "minutes": 8,
        "summary": "SHA-256's three properties are the bedrock the whole chain stands on.",
        "blocks": [
            {"type": "text", "html": "A <b>cryptographic hash</b> like SHA-256 maps any input to a fixed 256-bit fingerprint. Three properties make it useful: it's <b>deterministic</b>, <b>one-way</b> (can't invert), and <b>collision-resistant</b> (can't find two inputs with the same hash)."},
            {"type": "text", "html": "The <b>avalanche effect</b> means flipping one input bit flips about half the output bits — so you can't tweak data to keep its hash. This is what links blocks: each block stores the previous block's hash."},
            {"type": "formula", "tex": r"\text{block}_n.\text{prevHash} = \text{SHA256}(\text{block}_{n-1})"},
            {"type": "callout", "kind": "insight", "html": "Change any old transaction and its block's hash changes, which breaks the next block's link, and the next — the whole chain after it. That cascade is why a blockchain is tamper-evident."},
        ],
        "quiz": [
            {"q": "A cryptographic hash is one-way, meaning…", "options": ["It's reversible", "You can't recover the input from the hash", "It's random each time", "It's short"], "answer": 1, "explain": "Given the hash you cannot feasibly find the input."},
            {"q": "The avalanche effect means one input bit flip…", "options": ["Changes nothing", "Flips about half the output bits", "Reverses the hash", "Adds a byte"], "answer": 1, "explain": "Tiny input changes scramble the whole output."},
            {"q": "Blocks are linked by storing…", "options": ["The next block's hash", "The previous block's hash", "A random number", "Nothing"], "answer": 1, "explain": "Each block references the prior block's hash, forming the chain."},
        ],
    },
    {
        "id": "bc-keys", "order": 8, "title": "Keys, Wallets & Digital Signatures", "topic": "keys", "level": "Intermediate", "minutes": 9,
        "summary": "Elliptic-curve keys: your address is public, your signature proves it's you.",
        "blocks": [
            {"type": "text", "html": "A wallet is a <b>key pair</b>. The <b>private key</b> is a secret number; the <b>public key</b> (and address) is derived from it on an <b>elliptic curve</b> — easy forward, impossible to reverse."},
            {"type": "text", "html": "To spend, you <b>sign</b> the transaction with your private key. Anyone can verify the signature against your public key, proving you authorised it without ever revealing the secret."},
            {"type": "callout", "kind": "warning", "html": "\"Not your keys, not your coins.\" Lose the private key and the funds are gone forever; leak it and anyone can spend. The ECC lab shows how <b>reusing a signature nonce</b> leaks the whole private key — a real bug that has drained wallets."},
            {"type": "try", "target": "lab", "lab": "ecc", "label": "Build a key, sign a message, and see a nonce leak the key", "preset": {}},
        ],
        "quiz": [
            {"q": "Your blockchain address is derived from your…", "options": ["Private key (public key)", "Password", "Email", "Balance"], "answer": 0, "explain": "The public key/address comes from the private key via ECC."},
            {"q": "A digital signature proves…", "options": ["The network is fast", "You authorised a transaction without revealing your key", "The hash is valid", "Nothing"], "answer": 1, "explain": "It's verifiable against your public key."},
            {"q": "Reusing a signature nonce can…", "options": ["Speed up signing", "Leak the private key", "Lower fees", "Add security"], "answer": 1, "explain": "Nonce reuse lets attackers solve for the secret key."},
        ],
    },
    {
        "id": "bc-transactions", "order": 9, "title": "Transactions: UTXO vs Accounts", "topic": "ledger", "level": "Intermediate", "minutes": 8,
        "summary": "Two ways to track who owns what — Bitcoin's coins vs Ethereum's balances.",
        "blocks": [
            {"type": "text", "html": "How does a chain know your balance? Bitcoin uses the <b>UTXO</b> model — your wallet is a pile of 'unspent coins', and a transaction consumes some and creates new ones (like paying with cash and getting change)."},
            {"type": "text", "html": "Ethereum uses the <b>account</b> model — like a bank, each address just has a balance that goes up and down. Accounts are simpler for smart contracts; UTXO is more parallel and private."},
            {"type": "callout", "kind": "insight", "html": "In both models a transaction is only valid if signed by the owner and if the inputs exist and aren't already spent — preventing <b>double spending</b> without any central bank."},
        ],
        "quiz": [
            {"q": "Bitcoin's UTXO model treats your wallet as…", "options": ["A single balance", "A set of unspent transaction outputs (coins)", "A smart contract", "An email"], "answer": 1, "explain": "You spend whole outputs and receive change, like cash."},
            {"q": "Ethereum's account model is more like…", "options": ["A pile of cash", "A bank balance that goes up/down", "A hash", "A Merkle tree"], "answer": 1, "explain": "Each account holds a mutable balance."},
            {"q": "Both models prevent double spending by requiring…", "options": ["A central bank", "Valid signatures and unspent inputs", "Faster miners", "Bigger blocks"], "answer": 1, "explain": "Rules enforce ownership and no reuse of funds."},
        ],
    },
    {
        "id": "bc-pow-pos", "order": 10, "title": "Proof of Work vs Proof of Stake", "topic": "consensus", "level": "Intermediate", "minutes": 9,
        "summary": "Two ways thousands of strangers agree on one history — burning energy, or staking money.",
        "blocks": [
            {"type": "text", "html": "Consensus is the hard problem: who gets to add the next block? <b>Proof of Work</b> makes miners race to find a hash below a target by brute force. It's secure but burns enormous energy."},
            {"type": "text", "html": "<b>Proof of Stake</b> instead picks a validator in proportion to the coins they 'stake' as collateral. Cheat and you lose your stake (slashing). Ethereum's 2022 switch to PoS cut its energy use by ~99.9%."},
            {"type": "formula", "tex": r"\text{PoW: find nonce s.t. } \text{SHA256}(\text{block}) < \text{target}"},
            {"type": "callout", "kind": "insight", "html": "Both make attacking expensive: in PoW you'd need most of the world's hashing power; in PoS you'd need to buy (and risk losing) most of the staked coins."},
        ],
        "quiz": [
            {"q": "Proof of Work secures the chain by…", "options": ["Staking coins", "Spending energy to find a rare hash", "Trusting a bank", "Voting by email"], "answer": 1, "explain": "Miners brute-force a hash below the target."},
            {"q": "Proof of Stake picks validators by…", "options": ["Hash power", "Coins staked as collateral", "Alphabetical order", "Random IP"], "answer": 1, "explain": "Stake weight determines who proposes blocks."},
            {"q": "Ethereum's move to PoS mainly reduced…", "options": ["Security", "Energy use (~99.9%)", "The number of users", "Block size"], "answer": 1, "explain": "PoS removed energy-intensive mining."},
        ],
    },
    {
        "id": "bc-forks", "order": 11, "title": "Forks, Finality & the 51% Attack", "topic": "consensus", "level": "Advanced", "minutes": 8,
        "summary": "When two blocks arrive at once — and why merchants wait for confirmations.",
        "blocks": [
            {"type": "text", "html": "Two miners can find a block at the same time, creating a temporary <b>fork</b>. The network follows the <b>longest (heaviest) chain</b> rule; the shorter branch is orphaned. This is why a payment isn't final the instant it appears."},
            {"type": "text", "html": "Each later block is a <b>confirmation</b>. An attacker with over 50% of the power could secretly build a longer chain and reverse a payment — the <b>51% attack</b>. The chance of success falls exponentially with each confirmation."},
            {"type": "callout", "kind": "tip", "html": "The attack lab races an attacker's secret chain against honest miners and compares the result with Nakamoto's whitepaper formula — watch how 6 confirmations makes a double-spend vanishingly unlikely below 50%."},
            {"type": "try", "target": "lab", "lab": "attack", "label": "Race a 51% attack vs honest miners", "preset": {}},
        ],
        "quiz": [
            {"q": "When two blocks appear at once, the network follows…", "options": ["The first alphabetically", "The longest / heaviest chain", "Both forever", "The smallest block"], "answer": 1, "explain": "The heaviest chain wins; the other branch is orphaned."},
            {"q": "A 51% attack needs the attacker to control…", "options": ["Over half the mining/stake power", "One wallet", "A fast internet", "The exchange"], "answer": 0, "explain": "A majority lets them out-build the honest chain."},
            {"q": "More confirmations make a reversal…", "options": ["More likely", "Exponentially less likely", "Impossible immediately", "Unchanged"], "answer": 1, "explain": "Each block makes catching up exponentially harder."},
        ],
    },
    {
        "id": "bc-ethereum", "order": 12, "title": "Ethereum & the World Computer", "topic": "contracts", "level": "Intermediate", "minutes": 8,
        "summary": "From a ledger of coins to a global programmable computer.",
        "blocks": [
            {"type": "text", "html": "Bitcoin tracks coins. <b>Ethereum</b> added a <b>virtual machine (EVM)</b> so the chain can run code — <b>smart contracts</b> — the same way on every node, with the results agreed by consensus."},
            {"type": "text", "html": "Running code costs <b>gas</b>, paid in ETH, which stops infinite loops and spam — every operation has a price. The EVM is Turing-complete, so contracts can be anything from a token to an exchange."},
            {"type": "callout", "kind": "insight", "html": "A smart contract is just code plus storage living at an address. Once deployed it runs exactly as written, unstoppably — which is powerful and dangerous in equal measure."},
        ],
        "quiz": [
            {"q": "The EVM lets Ethereum…", "options": ["Only store coins", "Run smart-contract code identically on every node", "Mine faster", "Avoid consensus"], "answer": 1, "explain": "It's a shared virtual machine for programs."},
            {"q": "Gas exists to…", "options": ["Make ETH cheaper", "Price each operation and stop infinite loops/spam", "Speed up hashing", "Store data free"], "answer": 1, "explain": "Paying per operation bounds computation."},
            {"q": "A deployed smart contract…", "options": ["Can be freely edited by anyone", "Runs exactly as written at its address", "Needs no code", "Is off-chain"], "answer": 1, "explain": "Its code and storage live on-chain and execute deterministically."},
        ],
    },
    {
        "id": "bc-solidity", "order": 13, "title": "Smart Contracts & Tokens", "topic": "contracts", "level": "Advanced", "minutes": 9,
        "summary": "Writing programmable money — the ERC-20 and ERC-721 standards.",
        "blocks": [
            {"type": "text", "html": "<b>Solidity</b> is the main language for Ethereum contracts. A contract holds <b>state</b> (balances, owners) and exposes <b>functions</b> that users call in transactions."},
            {"type": "text", "html": "Standards make tokens interoperable: <b>ERC-20</b> defines fungible tokens (one unit equals another, like a currency) with <code>transfer</code>/<code>balanceOf</code>; <b>ERC-721</b> defines non-fungible tokens (<b>NFTs</b>), each unique."},
            {"type": "callout", "kind": "tip", "html": "The contract lab runs a token contract call by call so you can watch balances update — the same transfer/approve pattern every real token uses."},
            {"type": "try", "target": "lab", "lab": "contract", "label": "Run a token contract call by call", "preset": {}},
        ],
        "quiz": [
            {"q": "An ERC-20 token is…", "options": ["Unique and non-fungible", "Fungible (one unit equals another)", "A private key", "A hash"], "answer": 1, "explain": "ERC-20 defines interchangeable, currency-like tokens."},
            {"q": "An NFT uses which standard?", "options": ["ERC-20", "ERC-721", "SHA-256", "TCP/IP"], "answer": 1, "explain": "ERC-721 defines unique non-fungible tokens."},
            {"q": "A smart contract exposes state plus…", "options": ["Private keys", "Functions users call in transactions", "Miners", "Gas only"], "answer": 1, "explain": "Users invoke its functions to change state."},
        ],
    },
    {
        "id": "bc-defi", "order": 14, "title": "DeFi, NFTs & dApps", "topic": "defi", "level": "Intermediate", "minutes": 8,
        "summary": "What people actually build on chains — and the real risks.",
        "blocks": [
            {"type": "text", "html": "<b>Decentralised Finance (DeFi)</b> rebuilds finance as contracts: lending, trading on <b>automated market makers</b> (Uniswap), <b>stablecoins</b> pegged to the dollar. <b>dApps</b> connect a web front-end to these contracts through your wallet."},
            {"type": "text", "html": "<b>NFTs</b> represent unique ownership — art, tickets, in-game items. The promise is <b>composability</b>: contracts snap together like money Lego, since they all share the same open chain."},
            {"type": "callout", "kind": "warning", "html": "The risks are real and specific: smart-contract bugs, <b>rug pulls</b> (founders drain the funds), oracle manipulation and irreversible transactions. Code is law — including its mistakes."},
        ],
        "quiz": [
            {"q": "An automated market maker (like Uniswap) lets you…", "options": ["Mine faster", "Trade tokens against a pool via a formula", "Store private keys", "Avoid gas"], "answer": 1, "explain": "A pricing formula replaces an order book."},
            {"q": "'Composability' means contracts…", "options": ["Can't interact", "Snap together like money Lego", "Run off-chain", "Need no gas"], "answer": 1, "explain": "Open contracts build on one another."},
            {"q": "A 'rug pull' is when…", "options": ["Gas rises", "Founders drain a project's funds", "A block forks", "A hash collides"], "answer": 1, "explain": "Insiders exploit trust to steal the pooled money."},
        ],
    },
    {
        "id": "bc-scaling", "order": 15, "title": "Scaling & the Blockchain Trilemma", "topic": "scaling", "level": "Advanced", "minutes": 8,
        "summary": "Why chains are slow, and how layer-2 rollups speed them up.",
        "blocks": [
            {"type": "text", "html": "Every node re-runs every transaction, so base chains are slow (Bitcoin ~7, Ethereum ~15 tx/s). The <b>trilemma</b> says you can have at most two of <b>decentralisation</b>, <b>security</b> and <b>scalability</b> at once."},
            {"type": "text", "html": "<b>Layer-2</b> solutions keep security but add scale: <b>rollups</b> execute thousands of transactions off-chain and post a compressed proof back to layer-1. <b>Optimistic</b> rollups assume validity (with a challenge window); <b>ZK-rollups</b> post a cryptographic validity proof."},
            {"type": "callout", "kind": "insight", "html": "ZK-rollups use zero-knowledge proofs — the same maths as the CHSH/privacy frontier — to prove 'these transactions are valid' without revealing or re-running them all. That's the direction the whole industry is heading."},
        ],
        "quiz": [
            {"q": "The blockchain trilemma says you can maximise at most…", "options": ["All three of decentralisation, security, scalability", "Two of the three", "One only", "None"], "answer": 1, "explain": "Gaining one usually costs another."},
            {"q": "A rollup scales by…", "options": ["Bigger blocks only", "Executing many tx off-chain and posting a proof to L1", "Removing security", "Mining faster"], "answer": 1, "explain": "It batches work off-chain while anchoring to layer-1."},
            {"q": "A ZK-rollup proves validity using…", "options": ["Trust", "A zero-knowledge cryptographic proof", "More miners", "Longer blocks"], "answer": 1, "explain": "A succinct proof verifies the batch without re-running it."},
        ],
    },
    {
        "id": "bc-security", "order": 16, "title": "Smart-Contract Security & Audits", "topic": "security", "level": "Advanced", "minutes": 8,
        "summary": "Billions have been lost to bugs — the vulnerabilities every developer must know.",
        "blocks": [
            {"type": "text", "html": "Contracts hold real money and can't be patched easily, so bugs are catastrophic. The classic is <b>re-entrancy</b>: a contract calls out to another before updating its own balance, letting the callee call back in and drain it — the 2016 DAO hack lost $60M this way."},
            {"type": "text", "html": "Others: integer overflow, unchecked external calls, bad access control, and oracle manipulation. Defences: the <b>checks-effects-interactions</b> pattern, re-entrancy guards, audited libraries and professional <b>audits</b>."},
            {"type": "callout", "kind": "warning", "html": "The contract lab lets you trigger the re-entrancy bug to drain a bank, then apply the fix. Seeing the exploit run is the fastest way to never write it."},
            {"type": "try", "target": "lab", "lab": "contract", "label": "Exploit the re-entrancy bug, then fix it", "preset": {}},
        ],
        "quiz": [
            {"q": "A re-entrancy attack works by…", "options": ["Guessing keys", "Calling back in before the balance is updated", "Mining faster", "Flooding the network"], "answer": 1, "explain": "The external call re-enters and drains funds mid-update."},
            {"q": "The checks-effects-interactions pattern says…", "options": ["Interact first", "Update your own state before calling others", "Skip checks", "Never check inputs"], "answer": 1, "explain": "Effects before interactions closes the re-entrancy window."},
            {"q": "Because deployed contracts are hard to change, bugs are…", "options": ["Easy to patch", "Potentially catastrophic — hence audits", "Irrelevant", "Always caught by gas"], "answer": 1, "explain": "Immutable code holding money demands careful auditing."},
        ],
    },
]

KNOWLEDGE_EXTRA = {
    "hash-properties": {"keys": ["cryptographic hash", "sha-256", "avalanche", "collision resistance", "one-way"], "lesson": "bc-crypto-hash",
                        "text": "A **cryptographic hash** (SHA-256) is deterministic, one-way and collision-resistant, with an avalanche effect. Each block stores the previous block's hash, making tampering cascade and show."},
    "wallet-keys": {"keys": ["private key", "public key", "wallet", "digital signature", "elliptic curve", "ecc", "nonce"], "lesson": "bc-keys",
                    "text": "A wallet is an elliptic-curve **key pair**: the public key is your address, the private key signs transactions. Lose it and funds vanish; reuse a signature **nonce** and the key leaks."},
    "utxo": {"keys": ["utxo", "account model", "transaction", "double spend", "balance"], "lesson": "bc-transactions",
             "text": "Bitcoin's **UTXO** model spends unspent outputs (like cash + change); Ethereum's **account** model updates balances. Both block double-spending via signatures and validity rules."},
    "consensus-mechanisms": {"keys": ["proof of work", "proof of stake", "pow", "pos", "staking", "slashing", "validator"], "lesson": "bc-pow-pos",
                             "text": "**Proof of Work** spends energy to find a rare hash; **Proof of Stake** picks validators by staked collateral (slashed if they cheat). PoS cut Ethereum's energy ~99.9%."},
    "fork": {"keys": ["fork", "longest chain", "confirmation", "51% attack", "finality", "orphan"], "lesson": "bc-forks",
             "text": "Simultaneous blocks cause a **fork**; the network follows the longest chain and orphans the rest. Each **confirmation** makes a 51% double-spend exponentially less likely."},
    "evm": {"keys": ["ethereum", "evm", "gas", "world computer", "virtual machine"], "lesson": "bc-ethereum",
            "text": "**Ethereum** added the **EVM**, a shared virtual machine that runs smart contracts identically on every node. **Gas** prices each operation to prevent infinite loops and spam."},
    "token-standards": {"keys": ["solidity", "smart contract", "erc-20", "erc-721", "nft", "token"], "lesson": "bc-solidity",
                        "text": "**Smart contracts** (written in Solidity) hold state and functions. **ERC-20** defines fungible tokens; **ERC-721** defines unique NFTs — standards that make tokens interoperable."},
    "defi": {"keys": ["defi", "dapp", "amm", "uniswap", "stablecoin", "rug pull", "composability"], "lesson": "bc-defi",
             "text": "**DeFi** rebuilds finance as contracts (lending, AMMs, stablecoins); **dApps** connect web front-ends to them. Risks include contract bugs, rug pulls and irreversible transactions."},
    "scaling": {"keys": ["scaling", "trilemma", "layer 2", "rollup", "zk-rollup", "optimistic"], "lesson": "bc-scaling",
                "text": "The **trilemma** trades decentralisation, security and scalability. **Layer-2 rollups** batch transactions off-chain and post proofs to L1; ZK-rollups use zero-knowledge validity proofs."},
    "contract-security": {"keys": ["re-entrancy", "reentrancy", "audit", "checks-effects-interactions", "dao hack", "smart contract security"], "lesson": "bc-security",
                          "text": "Smart-contract bugs are catastrophic. **Re-entrancy** (calling out before updating state) caused the DAO hack. Defend with checks-effects-interactions, guards and professional audits."},
}

TERMS_EXTRA = {
    "hash-properties": ("Cryptographic hashes", ["sha-256", "avalanche"]),
    "wallet-keys": ("Keys, wallets & signatures", ["private key", "ecc"]),
    "utxo": ("UTXO vs account model", ["utxo"]),
    "consensus-mechanisms": ("Proof of Work vs Stake", ["pow", "pos"]),
    "fork": ("Forks & 51% attack", ["longest chain"]),
    "evm": ("Ethereum & the EVM", ["gas", "evm"]),
    "token-standards": ("Smart contracts & tokens", ["erc-20", "nft"]),
    "defi": ("DeFi & dApps", ["defi", "amm"]),
    "scaling": ("Scaling & rollups", ["layer 2", "rollup"]),
    "contract-security": ("Smart-contract security", ["re-entrancy", "audit"]),
}
