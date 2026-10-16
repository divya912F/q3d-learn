"""Cybersecurity & Cryptography course (defensive, educational)."""
from __future__ import annotations

from . import engine

COURSE = {
    "id": "cyber",
    "title": "Cybersecurity & Cryptography",
    "short": "Cyber",
    "tagline": "Break old ciphers, watch hashes avalanche and build RSA keys by hand — then learn to defend.",
    "description": "The CIA triad, classical and modern cryptography, hashing and passwords, public-key crypto and the "
                   "most common attacks — all from a defender's point of view, with labs that compute every step.",
    "color": "#c2255c",
    "icon": "shield",
    "level": "Beginner → Intermediate",
    "labs": [
        {"id": "ciphers", "title": "Cipher Wheel", "icon": "key",
         "description": "Encrypt with Caesar, Vigenère, Atbash or XOR — then crack it with frequency analysis."},
        {"id": "hashing", "title": "Hash Avalanche & Passwords", "icon": "hash",
         "description": "Change one character and watch half of a SHA-256 hash flip; test how long a password would survive."},
        {"id": "rsa", "title": "RSA & Key-Exchange Workshop", "icon": "lock",
         "description": "Pick two primes, derive the keys, encrypt and sign — and mix secret colours with Diffie–Hellman."},
    ],
    "topics": {
        "basics": "Security basics", "classical": "Classical ciphers", "symmetric": "Symmetric crypto", "hashing": "Hashing & passwords",
        "publickey": "Public-key crypto", "attacks": "Common attacks", "defense": "Staying safe",
    },
}

LESSONS = [
    {
        "id": "cy-basics", "order": 1, "title": "The CIA Triad & Threat Thinking", "topic": "basics", "level": "Beginner", "minutes": 6,
        "summary": "Confidentiality, integrity, availability — and how defenders think about risk.",
        "blocks": [
            {"type": "text", "html": "Security protects three things: <b>Confidentiality</b> (only the right people can read data), <b>Integrity</b> (data is not secretly changed) and <b>Availability</b> (systems work when needed). Every control you will meet — encryption, hashing, backups — defends one of these."},
            {"type": "formula", "tex": r"\text{Risk} \approx \text{Likelihood} \times \text{Impact}"},
            {"type": "text", "html": "<b>Threat modelling</b> asks: what are we protecting, who might attack it, how, and what happens if they succeed? Defence in depth layers several controls so one failure is not a disaster."},
            {"type": "callout", "kind": "warning", "html": "Only test security on systems you own or have <b>written permission</b> to test. Everything in this course runs on toy data inside the lab."},
            {"type": "try", "target": "lab", "lab": "ciphers", "label": "Start with the oldest confidentiality trick", "preset": {"cipher": "caesar", "key": "3"}},
        ],
        "quiz": [
            {"q": "A hacker changes exam marks in a database. Which property is violated?", "options": ["Confidentiality", "Integrity", "Availability", "Authentication"], "answer": 1, "explain": "The data was altered without permission."},
            {"q": "A DDoS attack takes a website offline. Which property suffers?", "options": ["Confidentiality", "Integrity", "Availability", "Non-repudiation"], "answer": 2, "explain": "Users can't reach the service."},
            {"q": "“Defence in depth” means…", "options": ["One very strong password", "Several layers of controls", "Deep packet inspection only", "Encrypting twice"], "answer": 1, "explain": "If one layer fails, others still protect you."},
        ],
    },
    {
        "id": "cy-classical", "order": 2, "title": "Classical Ciphers & Frequency Analysis", "topic": "classical", "level": "Beginner", "minutes": 8,
        "summary": "Why Caesar and Vigenère fall to simple letter counting.",
        "blocks": [
            {"type": "text", "html": "A <b>Caesar cipher</b> shifts every letter by k positions — only 25 possible keys, so brute force is instant. The <b>Vigenère cipher</b> uses a keyword, shifting each letter by a different amount, which hides single-letter frequencies."},
            {"type": "formula", "tex": r"C_i = (P_i + K_{i \bmod m}) \bmod 26 \qquad \chi^2 = \sum_{a} \frac{(\text{observed}_a - \text{expected}_a)^2}{\text{expected}_a}"},
            {"type": "text", "html": "<b>Frequency analysis</b>: English uses e, t, a, o far more than q or z. Try every shift and keep the one whose letter counts are closest to English (smallest χ²). For Vigenère, the <b>index of coincidence</b> reveals the key length; then each column is just a Caesar cipher."},
            {"type": "callout", "kind": "insight", "html": "Cracking needs enough text: with a 6-letter key you want roughly 30+ letters per column. Short messages hide better — that is a clue, not a guarantee of safety."},
            {"type": "try", "target": "lab", "lab": "ciphers", "label": "Crack a Vigenère message automatically", "preset": {"cipher": "vigenere", "key": "srijan"}},
        ],
        "quiz": [
            {"q": "How many useful keys does a Caesar cipher have?", "options": ["2", "25", "26!", "Unlimited"], "answer": 1, "explain": "Shifts 1–25 (0 changes nothing)."},
            {"q": "Frequency analysis works because…", "options": ["Computers are fast", "Letters in a language are not equally common", "Keys are always short", "Ciphers use prime numbers"], "answer": 1, "explain": "The ciphertext keeps the plaintext's letter statistics (shifted)."},
            {"q": "The index of coincidence helps to find the Vigenère…", "options": ["Plaintext language", "Key length", "Author", "Hash"], "answer": 1, "explain": "Columns spaced by the key length look like English again."},
        ],
    },
    {
        "id": "cy-symmetric", "order": 3, "title": "Modern Symmetric Encryption", "topic": "symmetric", "level": "Intermediate", "minutes": 7,
        "summary": "XOR, the one-time pad and why AES is the standard.",
        "blocks": [
            {"type": "text", "html": "Symmetric ciphers use the <b>same secret key</b> to encrypt and decrypt. The building block is <b>XOR</b>: x ⊕ k ⊕ k = x. A <b>one-time pad</b> (a truly random key as long as the message, used once) is provably unbreakable — but sharing such keys is impractical."},
            {"type": "formula", "tex": r"C = P \oplus K, \qquad P = C \oplus K"},
            {"type": "text", "html": "<b>AES</b> (128/192/256-bit keys) mixes bits through many rounds of substitution and permutation. Use it in an authenticated mode such as <b>AES-GCM</b>, which also detects tampering. Never reuse a key stream: C₁ ⊕ C₂ = P₁ ⊕ P₂ leaks both messages."},
            {"type": "callout", "kind": "tip", "html": "Rule of thumb: never design your own crypto. Use well-reviewed libraries (e.g. <code>javax.crypto</code> with AES/GCM, or libsodium)."},
            {"type": "try", "target": "lab", "lab": "ciphers", "label": "XOR a message with a short repeating key", "preset": {"cipher": "xor", "key": "k3y"}},
        ],
        "quiz": [
            {"q": "In symmetric encryption, the decryption key is…", "options": ["The public key", "The same secret key", "A hash of the message", "Not needed"], "answer": 1, "explain": "Both sides share one secret."},
            {"q": "A one-time pad becomes insecure when…", "options": ["The message is long", "The key is reused", "XOR is used", "It is sent by email"], "answer": 1, "explain": "C₁ ⊕ C₂ cancels the key."},
            {"q": "Which mode gives AES both secrecy and tamper detection?", "options": ["ECB", "GCM", "Caesar", "Base64"], "answer": 1, "explain": "GCM is authenticated encryption."},
        ],
    },
    {
        "id": "cy-hashing", "order": 4, "title": "Hashing & Password Storage", "topic": "hashing", "level": "Beginner", "minutes": 8,
        "summary": "One-way fingerprints, the avalanche effect, salts and slow hashes.",
        "blocks": [
            {"type": "text", "html": "A <b>cryptographic hash</b> maps any input to a fixed-size fingerprint (SHA-256: 256 bits). It is one-way, and the <b>avalanche effect</b> means changing one character flips about half of the output bits. Hashes check integrity (downloads, Git commits, blockchains)."},
            {"type": "text", "html": "Websites must never store passwords in plain text. They store <b>salted, slow</b> hashes (bcrypt, scrypt, Argon2): the <b>salt</b> makes identical passwords hash differently and defeats pre-computed tables; slowness limits guesses per second."},
            {"type": "formula", "tex": r"\text{entropy} \approx L \cdot \log_2(\text{charset}) \text{ bits}, \qquad \text{guesses} \approx 2^{\text{entropy}}"},
            {"type": "callout", "kind": "insight", "html": "Length beats complexity: four random words (“correct horse battery staple”) are stronger and easier to remember than <code>P@ssw0rd!</code> — which is near the top of every attacker's list."},
            {"type": "try", "target": "lab", "lab": "hashing", "label": "Flip one character and watch the hash avalanche", "preset": {"text": "Q-3D Learn"}},
        ],
        "quiz": [
            {"q": "Changing one letter of the input to SHA-256 changes about…", "options": ["1 bit", "10% of the bits", "50% of the bits", "All bits"], "answer": 2, "explain": "The avalanche effect."},
            {"q": "Why add a salt before hashing a password?", "options": ["To make it shorter", "So equal passwords get different hashes", "To encrypt it", "To speed up login"], "answer": 1, "explain": "It defeats rainbow tables and reveals nothing about reuse."},
            {"q": "Which is the best choice for storing passwords?", "options": ["MD5", "SHA-1", "Plain SHA-256", "bcrypt / Argon2"], "answer": 3, "explain": "Deliberately slow, salted password hashes."},
        ],
    },
    {
        "id": "cy-rsa", "order": 5, "title": "Public-Key Crypto: RSA & Diffie–Hellman", "topic": "publickey", "level": "Intermediate", "minutes": 10,
        "summary": "Share a public key, keep a private one — and agree on a secret in public.",
        "blocks": [
            {"type": "text", "html": "<b>RSA</b>: pick primes p, q; n = p·q and φ(n) = (p−1)(q−1). Choose e coprime to φ(n) and compute d = e⁻¹ mod φ(n) with the extended Euclidean algorithm. Anyone can encrypt with (e, n); only the holder of d can decrypt. Security rests on how hard it is to factor n."},
            {"type": "formula", "tex": r"c = m^{e} \bmod n, \qquad m = c^{d} \bmod n, \qquad e\,d \equiv 1 \pmod{\varphi(n)}"},
            {"type": "text", "html": "<b>Digital signatures</b> flip the roles: sign a hash with d, verify with e. <b>Diffie–Hellman</b> lets two people agree on a shared secret over a public channel: Alice sends gᵃ mod p, Bob sends gᵇ mod p, and both compute gᵃᵇ mod p — an eavesdropper sees neither a nor b."},
            {"type": "callout", "kind": "warning", "html": "The lab uses tiny primes so you can follow every step. Real RSA uses 2048+ bit keys and padding (OAEP); “textbook RSA” as shown here is not safe to use directly."},
            {"type": "try", "target": "lab", "lab": "rsa", "label": "Build an RSA key pair from 61 and 53", "preset": {"p": 61, "q": 53, "e": 17}},
        ],
        "quiz": [
            {"q": "In RSA, which key is shared publicly?", "options": ["(d, n)", "(e, n)", "p and q", "φ(n)"], "answer": 1, "explain": "e and n form the public key."},
            {"q": "RSA's security relies on the difficulty of…", "options": ["Sorting", "Factoring n into p and q", "Hashing", "Guessing e"], "answer": 1, "explain": "Knowing p, q gives φ(n) and hence d."},
            {"q": "Diffie–Hellman is used to…", "options": ["Hash passwords", "Agree on a shared secret over an insecure channel", "Sign documents", "Compress files"], "answer": 1, "explain": "Key exchange — then a symmetric cipher takes over."},
        ],
    },
    {
        "id": "cy-attacks", "order": 6, "title": "Common Attacks & How to Stop Them", "topic": "attacks", "level": "Intermediate", "minutes": 8,
        "summary": "Phishing, injection, XSS and man-in-the-middle — from a defender's view.",
        "blocks": [
            {"type": "text", "html": "<ul><li><b>Phishing</b> — fake messages trick people into giving passwords. Defence: check the sender and link, use a password manager (it won't autofill on a fake domain) and 2FA.</li><li><b>SQL injection</b> — user input is glued into a query. Defence: <b>parameterised queries</b>, never string concatenation.</li><li><b>Cross-site scripting (XSS)</b> — attacker-supplied text runs as script in other users' browsers. Defence: escape output, Content-Security-Policy.</li><li><b>Man-in-the-middle</b> — someone intercepts traffic. Defence: HTTPS/TLS everywhere, certificate checks.</li></ul>"},
            {"type": "text", "html": "<pre><code>// ✅ Safe: parameterised query (Java JDBC)\nPreparedStatement ps = conn.prepareStatement(\n    \"SELECT * FROM users WHERE email = ?\");\nps.setString(1, email);</code></pre>"},
            {"type": "callout", "kind": "insight", "html": "Most breaches start with people, not maths: a reused password or a convincing email. Good crypto plus good habits is what keeps systems safe."},
            {"type": "try", "target": "lab", "lab": "hashing", "label": "See how fast a leaked password falls", "preset": {"password": "Password@123"}},
        ],
        "quiz": [
            {"q": "The correct fix for SQL injection is…", "options": ["Hiding error messages", "Parameterised queries", "Longer passwords", "Encrypting the database"], "answer": 1, "explain": "Data and code stay separate."},
            {"q": "A password manager helps against phishing because…", "options": ["It changes your password daily", "It won't autofill on a look-alike domain", "It blocks all emails", "It encrypts the website"], "answer": 1, "explain": "The domain doesn't match the saved login."},
            {"q": "HTTPS mainly protects against…", "options": ["Weak passwords", "Eavesdropping and tampering in transit", "Viruses on your laptop", "Phishing emails"], "answer": 1, "explain": "TLS encrypts and authenticates the connection."},
        ],
    },
    {
        "id": "cy-defense", "order": 7, "title": "Staying Safe: 2FA, Updates & Backups", "topic": "defense", "level": "Beginner", "minutes": 6,
        "summary": "The habits that stop most real-world attacks.",
        "blocks": [
            {"type": "text", "html": "<b>Multi-factor authentication</b> combines something you know (password), have (phone, security key) and are (fingerprint). Even a stolen password is useless without the second factor. Prefer authenticator apps or hardware keys over SMS."},
            {"type": "text", "html": "<b>Patch</b> quickly — most attacks use known, already-fixed bugs. Keep <b>3-2-1 backups</b> (3 copies, 2 media, 1 offline) to survive ransomware. Apply <b>least privilege</b>: give each account only the access it needs."},
            {"type": "callout", "kind": "tip", "html": "Personal checklist: unique passwords in a manager · 2FA on email and banking · automatic updates · offline backup · think before you click."},
            {"type": "try", "target": "lab", "lab": "hashing", "label": "Design a passphrase that would take centuries to crack", "preset": {"password": "correct horse battery staple"}},
        ],
        "quiz": [
            {"q": "Which second factor is generally strongest?", "options": ["SMS code", "Security question", "Hardware security key", "Email link"], "answer": 2, "explain": "It is phishing-resistant and can't be SIM-swapped."},
            {"q": "The “1” in 3-2-1 backups means…", "options": ["One password", "One copy offline / off-site", "Backup once a year", "One cloud provider"], "answer": 1, "explain": "An offline copy survives ransomware."},
            {"q": "Least privilege means…", "options": ["Everyone is an admin", "Accounts get only the access they need", "Nobody can log in", "Passwords are short"], "answer": 1, "explain": "It limits damage when an account is compromised."},
        ],
    },
]

CAESAR_SECRET = engine.caesar("Quantum computers will not break every cipher", 11)
VIGENERE_PLAIN = ("Cryptography is the art of writing secret messages. For centuries people believed that a simple substitution of "
                  "letters was unbreakable, until scholars noticed that some letters appear far more often than others. In English the "
                  "letter e is the most common, followed by t, a and o. By counting letters in a secret message and comparing the counts "
                  "with ordinary text, a careful reader can recover the hidden key.")
VIGENERE_SECRET = engine.vigenere(VIGENERE_PLAIN, "srijan")

CHALLENGES = [
    {"id": "cy-caesar", "title": "Ancient Secret", "difficulty": "Easy", "points": 50, "topic": "classical",
     "kind": "answer", "answer_type": "choice",
     "options": ["Quantum computers will not break every cipher", "Quantum computers will break every cipher",
                 "Classical computers can break every cipher", "Quantum keys will not break every computer"],
     "description": f"Decrypt this Caesar ciphertext: “{CAESAR_SECRET}”",
     "goal": "Pick the plaintext.", "hint": "Paste it into the Cipher Wheel in decrypt mode and let the χ² chart find the shift.",
     "open_lab": {"lab": "ciphers", "preset": {"cipher": "caesar", "mode": "decrypt", "text": CAESAR_SECRET, "key": "0"}}, "compute": "caesar"},
    {"id": "cy-vigenere", "title": "Keyword Hunter", "difficulty": "Medium", "points": 90, "topic": "classical",
     "kind": "answer", "answer_type": "choice", "options": ["cipher", "srijan", "secret", "quantum", "lemon"],
     "description": "A long message was encrypted with Vigenère. Use frequency analysis to recover the keyword (the lab loads the ciphertext).",
     "goal": "Pick the keyword.", "hint": "In decrypt mode, the crack panel estimates the key length from the index of coincidence, then solves each column.",
     "open_lab": {"lab": "ciphers", "preset": {"cipher": "vigenere", "mode": "decrypt", "text": VIGENERE_SECRET, "key": "a"}}, "compute": "vigenere"},
    {"id": "cy-rsa", "title": "Private Key by Hand", "difficulty": "Medium", "points": 90, "topic": "publickey",
     "kind": "answer", "answer_type": "number", "tolerance": 0,
     "description": "RSA with p = 61, q = 53 and public exponent e = 17. What is the private exponent d?",
     "goal": "Type d.", "hint": "φ(n) = 60 × 52. Find d with e·d ≡ 1 (mod φ(n)) — the workshop shows every Euclid step.",
     "open_lab": {"lab": "rsa", "preset": {"p": 61, "q": 53, "e": 17}}, "compute": "rsa"},
    {"id": "cy-password", "title": "Unbreakable Passphrase", "difficulty": "Easy", "points": 60, "topic": "hashing",
     "kind": "lab", "lab": "hashing",
     "description": "Create a password the strength meter rates “Strong” or better (≥ 60 bits) with no warnings — no common passwords, dictionary words, repeats or sequences.",
     "goal": "Strength ≥ Strong and zero warnings.", "hint": "Length beats symbols. Try several random words joined with spaces or dashes — but avoid words from the dictionary list.",
     "preset": {"password": "Password@123", "mode": "password"}, "lock": []},
]


def check_challenge(ch: dict, payload: dict) -> dict:
    if ch["kind"] == "answer":
        given = payload.get("answer")
        if ch["compute"] == "caesar":
            truth = engine.crack_caesar(CAESAR_SECRET)["plaintext"]
            ok = str(given) == truth
            fb = f"Correct — shift {engine.crack_caesar(CAESAR_SECRET)['shift']}. Brute force over 25 keys is instant." if ok else "Not that one — try every shift in the lab."
        elif ch["compute"] == "vigenere":
            key = engine.crack_vigenere(VIGENERE_SECRET)["key"]
            ok = str(given).lower() == key
            fb = f"Correct — the key length is {len(key)} and each column fell to frequency analysis." if ok else "Not the keyword — check the key-length chart first."
        else:
            d = engine.rsa_lab(61, 53, 17, "A")["d"]
            try:
                ok = int(float(given)) == d
            except (TypeError, ValueError):
                ok = False
            fb = f"Correct — d = {d}, because 17 × {d} = {17 * d} = 1 + 15 × 3120." if ok else "Check: e·d mod φ(n) must equal 1. Use the extended Euclidean algorithm."
        return {"solved": bool(ok), "score": 1.0 if ok else 0.0, "feedback": [fb]}
    cfg = dict(payload.get("config") or {})
    res = engine.password_strength(str(cfg.get("password", "")))
    strong = res["score"] >= 3
    clean = not res["warnings"]
    fb = [("✅ " if strong else "❌ ") + f"Strength: {res['label']} ({res['entropy']} bits, need ≥ 60)",
          ("✅ No warnings" if clean else "❌ " + res["warnings"][0])]
    return {"solved": strong and clean, "score": round((strong + clean) / 2, 2), "feedback": fb}


KNOWLEDGE = {
    "cia": {"keys": ["cia triad", "confidentiality", "integrity", "availability"], "lesson": "cy-basics",
            "text": "The **CIA triad**: **Confidentiality** (only authorised people read data), **Integrity** (data isn't changed undetected) and **Availability** (systems work when needed). Every security control protects at least one."},
    "threat-model": {"keys": ["threat model", "risk", "attack surface", "defence in depth", "defense in depth"], "lesson": "cy-basics",
                     "text": "**Threat modelling** asks what you protect, from whom, how they could attack and the impact. Risk ≈ likelihood × impact; **defence in depth** layers controls so one failure isn't fatal."},
    "caesar": {"keys": ["caesar", "shift cipher", "rot13", "substitution"], "lesson": "cy-classical",
               "text": "A **Caesar cipher** shifts each letter by a fixed amount — only 25 keys, so brute force or frequency analysis breaks it instantly."},
    "vigenere": {"keys": ["vigenere", "vigenère", "keyword cipher", "index of coincidence", "kasiski"], "lesson": "cy-classical",
                 "text": "The **Vigenère cipher** shifts letters by a repeating keyword. The **index of coincidence** reveals the key length; each column is then a Caesar cipher solvable by frequency analysis."},
    "frequency": {"keys": ["frequency analysis", "letter frequency", "chi-square", "chi squared", "χ²"], "lesson": "cy-classical",
                  "text": "**Frequency analysis** compares letter counts in ciphertext with typical English (e, t, a, o are common). The key whose decryption is closest to English (smallest χ²) is usually right."},
    "symmetric": {"keys": ["symmetric", "aes", "secret key", "block cipher", "gcm"], "lesson": "cy-symmetric",
                  "text": "**Symmetric encryption** uses one shared secret key for both directions. **AES** is the standard; use an authenticated mode such as AES-GCM so tampering is detected."},
    "xor-otp": {"keys": ["xor", "one-time pad", "one time pad", "otp", "key reuse"], "lesson": "cy-symmetric",
                "text": "**XOR** is reversible: P ⊕ K ⊕ K = P. A **one-time pad** (random key as long as the message, used once) is unbreakable, but reusing a key leaks P₁ ⊕ P₂."},
    "hash": {"keys": ["hash", "sha-256", "sha256", "md5", "sha1", "avalanche", "digest", "checksum"], "lesson": "cy-hashing",
             "text": "A **cryptographic hash** maps any input to a fixed-size, one-way fingerprint. The **avalanche effect** flips ~50% of output bits when one input bit changes. MD5 and SHA-1 are broken for collisions; use SHA-256+."},
    "password-storage": {"keys": ["salt", "bcrypt", "argon2", "scrypt", "rainbow table", "store password"], "lesson": "cy-hashing",
                         "text": "Store passwords as **salted, slow hashes** (bcrypt, scrypt, Argon2). The salt makes equal passwords hash differently and defeats rainbow tables; slowness limits guessing."},
    "entropy": {"keys": ["entropy", "password strength", "strong password", "passphrase", "brute force"], "lesson": "cy-hashing",
                "text": "Password **entropy** ≈ length × log₂(character set) bits; each extra bit doubles the guesses needed. Long random passphrases beat short complex passwords, and common passwords have almost no entropy."},
    "rsa": {"keys": ["rsa", "public key", "private key", "modular", "factor", "totient", "φ(n)"], "lesson": "cy-rsa",
            "text": "**RSA**: n = p·q, φ(n) = (p−1)(q−1), choose e coprime to φ(n), d = e⁻¹ mod φ(n). Encrypt c = mᵉ mod n, decrypt m = cᵈ mod n. Security relies on factoring n being hard."},
    "signature": {"keys": ["digital signature", "sign", "verify", "certificate"], "lesson": "cy-rsa",
                  "text": "A **digital signature** is a hash signed with a private key; anyone verifies it with the public key, proving who signed and that nothing changed. HTTPS certificates are signatures from trusted authorities."},
    "diffie-hellman": {"keys": ["diffie", "hellman", "key exchange", "shared secret"], "lesson": "cy-rsa",
                       "text": "**Diffie–Hellman** key exchange: publish gᵃ mod p and gᵇ mod p; both sides compute gᵃᵇ mod p. An eavesdropper would need to solve the discrete-logarithm problem."},
    "injection": {"keys": ["sql injection", "sqli", "injection", "prepared statement", "parameterised", "parameterized"], "lesson": "cy-attacks",
                  "text": "**SQL injection** happens when user input is concatenated into a query. The fix is **parameterised queries** (prepared statements), plus least-privilege database accounts."},
    "xss-phishing": {"keys": ["xss", "cross-site", "phishing", "man-in-the-middle", "mitm", "https", "tls"], "lesson": "cy-attacks",
                     "text": "**Phishing** tricks people with fake messages; **XSS** runs attacker script in other users' browsers (escape output, use CSP); **man-in-the-middle** attacks are stopped by HTTPS/TLS."},
    "mfa": {"keys": ["2fa", "mfa", "two-factor", "multi-factor", "authenticator", "backup", "ransomware", "least privilege", "patch"], "lesson": "cy-defense",
            "text": "**Multi-factor authentication** (password + phone/security key) stops most account takeovers. Add fast patching, 3-2-1 backups against ransomware and least-privilege access."},
}
