"""Blockchain course: hash chains, proof-of-work, Merkle trees, consensus and smart contracts."""
from __future__ import annotations

from . import engine

COURSE = {
    "id": "chain",
    "title": "Blockchain",
    "short": "Blockchain",
    "tagline": "Mine real SHA-256 blocks, tamper with history and watch the chain light up red.",
    "description": "Hash pointers, proof-of-work mining, Merkle trees, the 51% attack and smart contracts — every hash in the "
                   "labs is real SHA-256, so you can see exactly why a blockchain is tamper-evident.",
    "color": "#e8a700",
    "icon": "cube",
    "level": "Beginner → Intermediate",
    "labs": [
        {"id": "ledger", "title": "Chain Builder & Miner", "icon": "cube",
         "description": "Edit any block and watch every later block break — then mine new nonces to repair the chain."},
        {"id": "merkle", "title": "Merkle Tree Explorer", "icon": "tree",
         "description": "Hash transactions up to a single root, prove one payment with a few hashes, and catch tampering."},
        {"id": "attack", "title": "51% Attack Race", "icon": "trend",
         "description": "Race an attacker's secret chain against honest miners and see why merchants wait for confirmations."},
    ],
    "topics": {
        "ledger": "Distributed ledgers", "hashing": "Hash pointers", "pow": "Proof of work", "merkle": "Merkle trees",
        "consensus": "Consensus & attacks", "contracts": "Smart contracts & uses",
    },
}

LESSONS = [
    {
        "id": "bc-ledger", "order": 1, "title": "What Is a Blockchain?", "topic": "ledger", "level": "Beginner", "minutes": 6,
        "summary": "A shared, append-only ledger that nobody controls alone.",
        "blocks": [
            {"type": "text", "html": "A <b>blockchain</b> is a ledger copied across many computers (<b>nodes</b>). Records are grouped into <b>blocks</b>; each block points to the previous one, so the history forms a chain. Instead of trusting one bank or server, participants agree using a <b>consensus</b> rule."},
            {"type": "text", "html": "<ul><li><b>Append-only</b> — you add new blocks; you don't edit old ones.</li><li><b>Tamper-evident</b> — changing history breaks the hashes (you will see this in the lab).</li><li><b>Decentralised</b> — no single owner can rewrite it.</li></ul>"},
            {"type": "callout", "kind": "insight", "html": "A blockchain is useful when several parties who <b>don't fully trust each other</b> must share one record. If one organisation is trusted anyway, a normal database is faster and cheaper."},
            {"type": "try", "target": "lab", "lab": "ledger", "label": "Look inside a 4-block chain", "preset": {}},
        ],
        "quiz": [
            {"q": "Each block stores a link to…", "options": ["The next block", "The previous block's hash", "A random block", "The newest block"], "answer": 1, "explain": "That hash pointer forms the chain."},
            {"q": "Blockchains are most useful when…", "options": ["One trusted company runs everything", "Parties who don't trust each other share a record", "Data changes every millisecond", "You need to delete records often"], "answer": 1, "explain": "Otherwise a normal database is simpler."},
            {"q": "“Append-only” means…", "options": ["Blocks are added, not edited", "Only admins can write", "Data is encrypted", "Blocks are sorted"], "answer": 0, "explain": "History is extended, never rewritten."},
        ],
    },
    {
        "id": "bc-hash", "order": 2, "title": "Hash Pointers & Tamper Evidence", "topic": "hashing", "level": "Beginner", "minutes": 7,
        "summary": "Why changing one old block breaks everything after it.",
        "blocks": [
            {"type": "text", "html": "Each block's hash covers its index, its data, its nonce <i>and the previous block's hash</i>. A SHA-256 hash changes completely if any input bit changes (the avalanche effect)."},
            {"type": "formula", "tex": r"h_i = \mathrm{SHA256}(i \,\|\, h_{i-1} \,\|\, \text{data}_i \,\|\, \text{nonce}_i)"},
            {"type": "text", "html": "Edit block 1 and its hash changes → block 2's stored “previous hash” no longer matches → block 2 is invalid, and so is every block after it. To hide the edit, an attacker must <b>re-do the work</b> for every later block faster than everyone else."},
            {"type": "try", "target": "lab", "lab": "ledger", "label": "Tamper with block 1 and watch the chain break", "preset": {"tamper": 1}},
        ],
        "quiz": [
            {"q": "If block 2 of 5 is edited, which blocks become invalid?", "options": ["Only block 2", "Blocks 2–5", "Only block 5", "None"], "answer": 1, "explain": "Every later block depends on block 2's hash."},
            {"q": "SHA-256 outputs how many bits?", "options": ["64", "128", "256", "512"], "answer": 2, "explain": "64 hexadecimal characters × 4 bits."},
            {"q": "A hash pointer is…", "options": ["A memory address", "The hash of the previous block stored in the next block", "A private key", "A transaction id"], "answer": 1, "explain": "It links blocks and detects changes."},
        ],
    },
    {
        "id": "bc-pow", "order": 3, "title": "Proof of Work & Mining", "topic": "pow", "level": "Intermediate", "minutes": 8,
        "summary": "Make adding a block costly so rewriting history is impractical.",
        "blocks": [
            {"type": "text", "html": "In <b>proof of work</b>, a block is valid only if its hash starts with enough zeros (is below a <b>target</b>). Miners try nonce after nonce until they find one — pure trial and error. Checking a solution is instant; finding one is expensive."},
            {"type": "formula", "tex": r"\Pr[\text{a hash starts with } d \text{ hex zeros}] = 16^{-d} \;\Rightarrow\; \mathbb{E}[\text{attempts}] = 16^{d}"},
            {"type": "text", "html": "Each extra hex zero makes mining <b>16× harder</b>. Bitcoin adjusts difficulty every 2016 blocks so a block appears roughly every 10 minutes no matter how many miners join. Miners are paid with new coins and fees."},
            {"type": "callout", "kind": "warning", "html": "Proof of work uses a lot of electricity. Many newer chains (e.g. Ethereum since 2022) use <b>proof of stake</b>, where validators lock up coins instead of burning energy."},
            {"type": "try", "target": "lab", "lab": "ledger", "label": "Mine blocks at difficulty 1 → 4 and count the attempts", "preset": {"difficulty": 4}},
        ],
        "quiz": [
            {"q": "Going from difficulty 3 to 4 (hex zeros) multiplies the expected work by…", "options": ["2", "4", "16", "256"], "answer": 2, "explain": "Each hex digit has 16 values."},
            {"q": "Verifying a proof of work is…", "options": ["As slow as mining", "One hash — instant", "Impossible", "Done by banks"], "answer": 1, "explain": "Recompute one hash and check the zeros."},
            {"q": "A nonce is…", "options": ["A secret key", "A number miners change to search for a valid hash", "A coin", "A block timestamp"], "answer": 1, "explain": "“Number used once”."},
        ],
    },
    {
        "id": "bc-merkle", "order": 4, "title": "Merkle Trees & Light Clients", "topic": "merkle", "level": "Intermediate", "minutes": 8,
        "summary": "Summarise thousands of transactions in one hash — and prove one with a handful.",
        "blocks": [
            {"type": "text", "html": "A <b>Merkle tree</b> hashes every transaction, then hashes pairs of hashes level by level until one <b>Merkle root</b> remains. Only the root goes into the block header."},
            {"type": "formula", "tex": r"\text{proof size} = \lceil \log_2 N \rceil \text{ hashes} \qquad (N = 1024 \Rightarrow 10)"},
            {"type": "text", "html": "To prove “my payment is in this block”, you only need the sibling hash at each level — a <b>Merkle proof</b>. Phone wallets (<b>light clients</b>) use this instead of downloading every transaction. Change any transaction and the root changes."},
            {"type": "try", "target": "lab", "lab": "merkle", "label": "Prove one payment with three hashes", "preset": {"prove": 2}},
        ],
        "quiz": [
            {"q": "How many hashes prove one transaction among 8?", "options": ["1", "3", "8", "16"], "answer": 1, "explain": "log₂ 8 = 3 sibling hashes."},
            {"q": "If one transaction changes, the Merkle root…", "options": ["Stays the same", "Changes", "Is deleted", "Doubles"], "answer": 1, "explain": "The change propagates up every level."},
            {"q": "Light clients use Merkle proofs to…", "options": ["Mine faster", "Verify a payment without downloading the whole block", "Create coins", "Encrypt wallets"], "answer": 1, "explain": "Logarithmic proofs are tiny."},
        ],
    },
    {
        "id": "bc-consensus", "order": 5, "title": "Consensus & the 51% Attack", "topic": "consensus", "level": "Intermediate", "minutes": 9,
        "summary": "Longest chain wins — so how safe is a payment after z confirmations?",
        "blocks": [
            {"type": "text", "html": "Nodes follow the chain with the most accumulated work. An attacker who controls a share <i>q</i> of the mining power can try a <b>double spend</b>: pay a merchant, then secretly mine a competing chain without that payment and release it once it is longer."},
            {"type": "formula", "tex": r"P(\text{attacker catches up from } z \text{ behind}) = 1 - \sum_{k=0}^{z} \frac{\lambda^k e^{-\lambda}}{k!}\Big(1 - (q/p)^{z-k}\Big), \quad \lambda = z\frac{q}{p}"},
            {"type": "text", "html": "That is Nakamoto's formula from the Bitcoin whitepaper. With <i>q</i> < 50% the chance falls exponentially with each confirmation — that is why exchanges wait for 6 or more blocks. With <i>q</i> ≥ 50% the attacker eventually always wins: a <b>51% attack</b>."},
            {"type": "callout", "kind": "insight", "html": "The lab both computes the formula and <b>simulates</b> hundreds of races — the two numbers agree."},
            {"type": "try", "target": "lab", "lab": "attack", "label": "Race a 30% attacker against 6 confirmations", "preset": {"q": 0.3, "z": 6}},
        ],
        "quiz": [
            {"q": "Nodes accept the chain with…", "options": ["The most transactions", "The most accumulated work", "The newest timestamp", "The most coins"], "answer": 1, "explain": "The longest (heaviest) valid chain."},
            {"q": "With an attacker share below 50%, more confirmations make a double spend…", "options": ["More likely", "Exponentially less likely", "Impossible immediately", "Unaffected"], "answer": 1, "explain": "The catch-up probability decays exponentially in z."},
            {"q": "A 51% attacker can…", "options": ["Steal anyone's private key", "Rewrite recent history and double-spend", "Change the coin's code", "Mint unlimited coins instantly"], "answer": 1, "explain": "They control which chain is longest — not other people's keys."},
        ],
    },
    {
        "id": "bc-contracts", "order": 6, "title": "Smart Contracts, Uses & Limits", "topic": "contracts", "level": "Beginner", "minutes": 7,
        "summary": "Programs on a blockchain — and when not to use one.",
        "blocks": [
            {"type": "text", "html": "A <b>smart contract</b> is code stored on a blockchain (e.g. Ethereum) that runs exactly as written when called — for example, an escrow that releases payment when both sides confirm. Because it's public and immutable, bugs are public and permanent too."},
            {"type": "text", "html": "<b>Good fits:</b> cross-organisation records, supply-chain provenance, digital ownership, transparent donations. <b>Poor fits:</b> private data (everything is visible), high-speed systems, anything one trusted party already manages well."},
            {"type": "callout", "kind": "warning", "html": "Real-world issues: energy use (proof of work), scams and rug pulls, irreversible mistakes, and the “oracle problem” — a contract can't verify real-world facts on its own."},
            {"type": "try", "target": "lab", "lab": "merkle", "label": "See how a change anywhere changes the root", "preset": {"tamper": 2}},
        ],
        "quiz": [
            {"q": "A smart contract is…", "options": ["A legal PDF", "Code that runs on a blockchain", "A mining machine", "A wallet password"], "answer": 1, "explain": "Executed by every validating node."},
            {"q": "Which is a poor fit for a public blockchain?", "options": ["Supply-chain provenance", "Storing private medical records", "Transparent donations", "Shared ledgers between companies"], "answer": 1, "explain": "Public chains make data visible to everyone."},
            {"q": "The oracle problem is that contracts…", "options": ["Run too slowly", "Can't check real-world facts by themselves", "Need passwords", "Can't do maths"], "answer": 1, "explain": "They need a trusted data feed."},
        ],
    },
]

TAMPERED = "Diya pays Kabir 200 coins"


def _repair_preset() -> list[dict]:
    good = engine.chain_lab(difficulty=3)
    blocks = [{"data": b["data"], "nonce": b["nonce"]} for b in good["blocks"]]
    blocks[2]["data"] = TAMPERED
    return blocks


CHALLENGES = [
    {"id": "bc-repair", "title": "Rewrite History", "difficulty": "Medium", "points": 90, "topic": "pow",
     "kind": "lab", "lab": "ledger",
     "description": f"Someone changed block 2 to “{TAMPERED}”. Keep that edit but make the WHOLE chain valid again at difficulty 3.",
     "goal": "Every block valid · block 2 still says the edited text · difficulty 3.",
     "hint": "Mine block 2 first, then every block after it — each depends on the previous hash.",
     "preset": {"blocks": _repair_preset(), "difficulty": 3}, "lock": ["difficulty"]},
    {"id": "bc-break", "title": "Domino Effect", "difficulty": "Easy", "points": 50, "topic": "hashing",
     "kind": "answer", "answer_type": "choice",
     "options": ["Only block 1", "Block 1 and every block after it", "Every block, including the genesis block", "None — the hash fixes itself"],
     "description": "In a valid 4-block chain, someone edits the data in block 1. Which blocks stop being valid?",
     "goal": "Pick one.", "hint": "Try it in the Chain Builder: edit block 1 and look at the colours.",
     "open_lab": {"lab": "ledger", "preset": {"tamper": 1}}, "compute": "domino"},
    {"id": "bc-proof", "title": "Tiny Proof", "difficulty": "Easy", "points": 50, "topic": "merkle",
     "kind": "answer", "answer_type": "number", "tolerance": 0,
     "description": "A block contains 16 transactions. How many sibling hashes does a Merkle proof for one transaction need?",
     "goal": "Type a number.", "hint": "Each level halves the tree.", "open_lab": {"lab": "merkle", "preset": {}}, "compute": "proof16"},
    {"id": "bc-confirm", "title": "Safe to Ship?", "difficulty": "Medium", "points": 80, "topic": "consensus",
     "kind": "answer", "answer_type": "number", "tolerance": 0,
     "description": "An attacker controls 10% of the mining power. What is the smallest number of confirmations z that pushes their double-spend chance below 0.1%?",
     "goal": "Type z.", "hint": "Open the 51% Attack Race with q = 0.10 and read the confirmations curve.",
     "open_lab": {"lab": "attack", "preset": {"q": 0.1, "z": 2}}, "compute": "confirm"},
]


def check_challenge(ch: dict, payload: dict) -> dict:
    if ch["kind"] == "answer":
        given = payload.get("answer")
        if ch["compute"] == "domino":
            b = [{"data": x["data"], "nonce": x["nonce"]} for x in engine.chain_lab(difficulty=2)["blocks"]]
            b[1]["data"] += " (edited)"
            res = engine.chain_lab(b, difficulty=2)
            truth = "Block 1 and every block after it" if [x["valid"] for x in res["blocks"]] == [True, False, False, False] else ""
            ok = given == truth
            return {"solved": ok, "score": 1.0 if ok else 0.0,
                    "feedback": ["Correct — block 1's hash changes, so block 2's “previous hash” no longer matches, and so on down the chain." if ok else "Not quite — the genesis block before it is untouched. Try it in the lab."]}
        target = len(engine.merkle_lab([f"tx{i}" for i in range(16)])["proof"]) if ch["compute"] == "proof16" else engine.attack_lab(0.1, 1, 10)["confirmations_for_0_1pct"]
        try:
            ok = int(float(given)) == target
        except (TypeError, ValueError):
            ok = False
        fb = {"proof16": "Correct — log₂ 16 = 4 hashes, instead of downloading all 16 transactions.",
              "confirm": "Correct — z = 5, the same value as the table in the Bitcoin whitepaper."}[ch["compute"]] if ok else "Not quite — check it in the lab."
        return {"solved": ok, "score": 1.0 if ok else 0.0, "feedback": [fb]}
    cfg = {**dict(payload.get("config") or {}), **{k: ch["preset"][k] for k in ch.get("lock", [])}}
    blocks = cfg.get("blocks") or []
    res = engine.chain_lab(blocks, difficulty=3) if blocks else None
    kept = bool(blocks) and len(blocks) > 2 and blocks[2].get("data") == TAMPERED
    valid = bool(res and res["valid"])
    fb = [("✅ " if kept else "❌ ") + ("Block 2 keeps the edited text" if kept else "Block 2 must keep the edited text"),
          ("✅ " if valid else "❌ ") + ("All blocks valid at difficulty 3" if valid else f"Block {res['first_invalid'] if res else 0} is still invalid")]
    return {"solved": kept and valid, "score": round((kept + valid) / 2, 2), "feedback": fb}


KNOWLEDGE = {
    "blockchain": {"keys": ["blockchain", "ledger", "distributed ledger", "decentral", "node"], "lesson": "bc-ledger",
                   "text": "A **blockchain** is an append-only ledger replicated across many nodes. Blocks link to the previous block's hash, and a **consensus** rule decides which history everyone accepts — useful when parties don't fully trust each other."},
    "hash-pointer": {"keys": ["hash pointer", "previous hash", "prev hash", "tamper", "immutable"], "lesson": "bc-hash",
                     "text": "Each block stores the **previous block's hash**. Editing an old block changes its hash, breaking the link in the next block and every block after it — so tampering is evident."},
    "pow": {"keys": ["proof of work", "pow", "mining", "miner", "nonce", "difficulty", "target"], "lesson": "bc-pow",
            "text": "**Proof of work**: a block is valid only if its hash is below a target (starts with enough zeros). Miners vary the **nonce** until they find one; each extra hex zero means 16× more attempts. Checking takes one hash."},
    "pos": {"keys": ["proof of stake", "pos", "validator", "staking", "energy"], "lesson": "bc-pow",
            "text": "**Proof of stake** replaces mining with validators who lock up coins as collateral and can lose them for cheating. It uses far less energy than proof of work (Ethereum switched in 2022)."},
    "merkle": {"keys": ["merkle", "merkle root", "merkle proof", "light client", "spv"], "lesson": "bc-merkle",
               "text": "A **Merkle tree** hashes transactions pairwise up to one **root** stored in the block header. A **Merkle proof** needs only ⌈log₂ N⌉ sibling hashes, letting light clients verify a payment without the whole block."},
    "consensus": {"keys": ["consensus", "longest chain", "fork", "confirmation"], "lesson": "bc-consensus",
                  "text": "Nodes follow the valid chain with the most accumulated work. A transaction gets one more **confirmation** with each block built on top of it; waiting for confirmations makes reversing it exponentially unlikely."},
    "double-spend": {"keys": ["51%", "double spend", "double-spend", "majority attack", "nakamoto"], "lesson": "bc-consensus",
                     "text": "In a **double spend**, an attacker secretly mines a chain without their payment and releases it once longer. With hash share q < 50% the success chance falls exponentially with confirmations (Nakamoto's formula); with ≥ 50% — a **51% attack** — they eventually win."},
    "smart-contract": {"keys": ["smart contract", "ethereum", "solidity", "dapp", "oracle", "nft", "defi"], "lesson": "bc-contracts",
                       "text": "A **smart contract** is code stored and executed on a blockchain such as Ethereum. It runs exactly as written and is public and immutable — great for transparent rules, risky for bugs. Contracts need **oracles** for real-world data."},
}
