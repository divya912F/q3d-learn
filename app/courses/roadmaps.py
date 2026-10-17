"""Career roadmaps — "where this course can take you".

Each roadmap is attached to its course by the registry so the frontend can render a
"Where this takes you" section: the roles you grow into, a four-stage learning ladder,
things you can build to prove it, and the courses to go to next.

Nothing here is graded or simulated; it is guidance. Salary bands are rough global
ranges for context only and are deliberately broad.
"""
from __future__ import annotations

ROADMAPS: dict[str, dict] = {
    # ------------------------------------------------------------------ Quantum
    "quantum": {
        "tagline": "From one qubit to real quantum algorithms — the skills behind a field that is still being invented.",
        "become": [
            {"role": "Quantum Software Engineer", "blurb": "Write and optimise circuits in Qiskit/Cirq, run them on simulators and real hardware.", "band": "high", "tags": ["Qiskit", "Python", "Linear algebra"]},
            {"role": "Quantum Algorithms Researcher", "blurb": "Design new algorithms (search, chemistry, optimisation) and prove what they cost.", "band": "high", "tags": ["Complexity", "Maths", "Papers"]},
            {"role": "Quantum Error-Correction Engineer", "blurb": "Fight decoherence with codes and fault-tolerant protocols so computations survive noise.", "band": "high", "tags": ["Stabiliser codes", "Noise models"]},
            {"role": "Quantum Educator / Dev-Advocate", "blurb": "Explain qubits to the world, build demos and teaching tools like this one.", "band": "mid", "tags": ["Communication", "Demos"]},
        ],
        "path": [
            {"stage": "Foundations", "detail": "Qubits, superposition, the Bloch sphere, single-qubit gates and measurement.", "lessons": ["qubits", "bloch", "pauli", "measurement"]},
            {"stage": "Multi-qubit", "detail": "Phase, interference, entanglement and the Bell/CHSH test.", "lessons": ["hadamard-phase", "entanglement", "interference"]},
            {"stage": "Algorithms", "detail": "Deutsch–Jozsa, Grover, the QFT and quantum walks.", "lessons": ["grover", "quantum-walk"]},
            {"stage": "Real machines", "detail": "Noise, decoherence, error correction and running on cloud hardware.", "lessons": []},
        ],
        "build": ["A teleportation circuit on real IBM hardware", "Grover search for a 4-bit secret", "A variational solver for the H₂ molecule", "A noise-vs-fidelity dashboard"],
        "next": [("ml", "Quantum machine learning sits on top of ML"), ("dsa", "Complexity theory makes the speed-ups meaningful")],
    },

    # ------------------------------------------------------------------ Machine Learning
    "ml": {
        "tagline": "The most in-demand skill of the decade: teach computers to find patterns and make predictions.",
        "become": [
            {"role": "Machine Learning Engineer", "blurb": "Ship models to production: features, training pipelines, serving and monitoring.", "band": "high", "tags": ["Python", "scikit-learn", "PyTorch", "MLOps"]},
            {"role": "Data Scientist", "blurb": "Turn messy data into models and decisions; A/B tests, forecasting, experimentation.", "band": "high", "tags": ["Statistics", "pandas", "SQL"]},
            {"role": "Applied Research Scientist", "blurb": "Push accuracy on hard problems — vision, language, recommendations.", "band": "high", "tags": ["Maths", "Papers", "Deep learning"]},
            {"role": "ML Product Analyst", "blurb": "Decide what to build, measure impact and keep models honest and fair.", "band": "mid", "tags": ["Metrics", "Communication"]},
        ],
        "path": [
            {"stage": "Foundations", "detail": "What learning is, features and labels, train/test splits, the bias–variance trade-off.", "lessons": ["ml-intro", "ml-evaluation"]},
            {"stage": "Core models", "detail": "Linear & logistic regression, gradient descent, k-NN, decision trees.", "lessons": ["ml-regression", "ml-classification", "ml-trees"]},
            {"stage": "Going deeper", "detail": "Neural networks, regularisation, ensembles, dimensionality reduction.", "lessons": ["ml-neural", "ml-clustering"]},
            {"stage": "Production", "detail": "Pipelines, validation, metrics that matter, deploying and monitoring models.", "lessons": []},
        ],
        "build": ["A spam / sentiment classifier", "A house-price predictor with a clean pipeline", "A movie recommender", "A model card comparing precision and recall"],
        "next": [("dl", "Deep learning is where ML scales to vision & language"), ("ds", "Data Science gives you the statistics underneath"), ("ai", "AI adds search, planning and agents")],
    },

    # ------------------------------------------------------------------ Data Science
    "ds": {
        "tagline": "Ask a question, find the data, clean it, test it, and tell the story that changes a decision.",
        "become": [
            {"role": "Data Analyst", "blurb": "Answer business questions with SQL, dashboards and clear charts.", "band": "mid", "tags": ["SQL", "Excel", "Visualisation"]},
            {"role": "Data Scientist", "blurb": "Experiments, statistics and models that drive product and strategy.", "band": "high", "tags": ["Statistics", "pandas", "A/B testing"]},
            {"role": "Data Engineer", "blurb": "Build the pipelines and warehouses that everyone else's data flows through.", "band": "high", "tags": ["Pipelines", "SQL", "Cloud"]},
            {"role": "Business Intelligence Analyst", "blurb": "Turn metrics into decisions leaders actually trust.", "band": "mid", "tags": ["Dashboards", "Storytelling"]},
        ],
        "path": [
            {"stage": "Foundations", "detail": "The data lifecycle, types of data, summary statistics.", "lessons": ["ds-intro", "ds-describe"]},
            {"stage": "Explore", "detail": "Visualisation, correlation vs causation, cleaning dirty data.", "lessons": ["ds-viz", "ds-correlation", "ds-cleaning"]},
            {"stage": "Infer", "detail": "Probability, sampling, the Central Limit Theorem, hypothesis tests and A/B tests.", "lessons": ["ds-probability"]},
            {"stage": "Communicate", "detail": "Forecasting, honest charts, dashboards and telling the story.", "lessons": []},
        ],
        "build": ["An A/B test write-up with a confidence interval", "A cleaned dataset + data-quality report", "A sales forecast with trend and seasonality", "A one-page dashboard"],
        "next": [("ml", "Modelling is the natural next step"), ("dsa", "Algorithms make your data code fast")],
    },

    # ------------------------------------------------------------------ Artificial Intelligence
    "ai": {
        "tagline": "Agents that search, plan, play and learn — the classical AI that modern systems are built on.",
        "become": [
            {"role": "AI Engineer", "blurb": "Build agents, search, planning and LLM-powered features into products.", "band": "high", "tags": ["Python", "LLMs", "Search", "RL"]},
            {"role": "Robotics / Planning Engineer", "blurb": "Path-planning, decision-making and control for machines that act in the world.", "band": "high", "tags": ["A*", "Planning", "Controls"]},
            {"role": "Reinforcement-Learning Researcher", "blurb": "Teach agents to master games, control and optimisation by reward.", "band": "high", "tags": ["RL", "Maths", "Simulation"]},
            {"role": "Game AI Programmer", "blurb": "Minimax, behaviour trees and pathfinding that make NPCs feel alive.", "band": "mid", "tags": ["Minimax", "Pathfinding"]},
        ],
        "path": [
            {"stage": "Foundations", "detail": "What an agent is, state spaces, and uninformed search (BFS/DFS/UCS).", "lessons": ["ai-intro", "ai-search"]},
            {"stage": "Smarter search", "detail": "Heuristics and A*, adversarial games and minimax with pruning.", "lessons": ["ai-astar", "ai-games"]},
            {"stage": "Learning agents", "detail": "Reinforcement learning and Q-learning; language models and generation.", "lessons": ["ai-rl", "ai-lm"]},
            {"stage": "Responsible AI", "detail": "Bias, alignment, safety and deploying agents people can trust.", "lessons": ["ai-ethics"]},
        ],
        "build": ["A maze solver that races five algorithms", "An unbeatable tic-tac-toe / Connect-4 bot", "A Q-learning agent for a small game", "A tiny autocomplete language model"],
        "next": [("ml", "Most modern AI is machine learning underneath"), ("dl", "Deep learning powers today's agents"), ("dsa", "Search and graphs are pure algorithms")],
    },

    # ------------------------------------------------------------------ DSA
    "dsa": {
        "tagline": "The interview language of software engineering — and the difference between code that crawls and code that flies.",
        "become": [
            {"role": "Software Engineer (SDE)", "blurb": "The core skill every product company screens for. Build fast, correct systems.", "band": "high", "tags": ["Java/C++/Python", "Problem solving"]},
            {"role": "Backend / Systems Engineer", "blurb": "Design data structures and algorithms that scale to millions of users.", "band": "high", "tags": ["Complexity", "Concurrency", "Databases"]},
            {"role": "Competitive Programmer", "blurb": "Solve hard problems under time pressure — Codeforces, ICPC, Google Kick Start.", "band": "mid", "tags": ["Speed", "Maths", "Practice"]},
            {"role": "Quant / Algo Developer", "blurb": "Latency-critical code where every microsecond and every Big-O matters.", "band": "high", "tags": ["Optimisation", "C++", "Maths"]},
        ],
        "path": [
            {"stage": "Foundations", "detail": "Big-O, arrays, strings, stacks, queues and linked lists.", "lessons": ["dsa-bigo", "dsa-linear"]},
            {"stage": "Core algorithms", "detail": "Sorting, searching, recursion and divide-and-conquer.", "lessons": ["dsa-sorting", "dsa-divide"]},
            {"stage": "Non-linear", "detail": "Trees, heaps, hash tables and graphs.", "lessons": ["dsa-trees", "dsa-hashing", "dsa-graphs"]},
            {"stage": "Mastery", "detail": "Dynamic programming, greedy, backtracking and interview patterns.", "lessons": []},
        ],
        "build": ["50 LeetCode problems across every pattern", "Your own hash map and balanced tree", "A Dijkstra route-finder on a real map", "A DP solver you can explain on a whiteboard"],
        "next": [("ml", "Algorithms power ML under the hood"), ("chain", "Hashing & Merkle trees are DSA in the wild"), ("ai", "Search & graphs are classical AI")],
    },

    # ------------------------------------------------------------------ Cybersecurity
    "cyber": {
        "tagline": "Think like an attacker, defend like an engineer — one of the fastest-growing and least-filled fields in tech.",
        "become": [
            {"role": "Security Engineer", "blurb": "Build defences: secure code, crypto, auth, and harden systems before attackers do.", "band": "high", "tags": ["Crypto", "AppSec", "Cloud"]},
            {"role": "Penetration Tester / Ethical Hacker", "blurb": "Legally break into systems to find holes before criminals find them.", "band": "high", "tags": ["Exploits", "Networking", "Tools"]},
            {"role": "Security Analyst (SOC / Blue Team)", "blurb": "Watch, detect and respond to attacks in real time.", "band": "mid", "tags": ["SIEM", "IDS", "Forensics"]},
            {"role": "Cryptography Engineer", "blurb": "Design and implement the maths that keeps everything secret and signed.", "band": "high", "tags": ["RSA/ECC", "Protocols", "Maths"]},
        ],
        "path": [
            {"stage": "Foundations", "detail": "The CIA triad, threat modelling and classical ciphers.", "lessons": ["cy-basics", "cy-classical"]},
            {"stage": "Modern crypto", "detail": "Symmetric encryption, hashing, RSA and public-key exchange.", "lessons": ["cy-symmetric", "cy-hashing", "cy-rsa"]},
            {"stage": "Attack & defend", "detail": "Common attacks, firewalls, intrusion detection and phishing.", "lessons": ["cy-attacks"]},
            {"stage": "Stay safe", "detail": "2FA, patching, backups, and building a security mindset for teams.", "lessons": ["cy-defense"]},
        ],
        "build": ["A password-strength + breach checker", "A tool that cracks a Caesar/Vigenère cipher", "A mini firewall rule-set and log analyser", "A phishing-awareness quiz for your campus"],
        "next": [("chain", "Blockchain is applied cryptography"), ("dsa", "Hashing & number theory come from DSA"), ("ai", "ML now powers threat detection")],
    },

    # ------------------------------------------------------------------ Blockchain
    "chain": {
        "tagline": "Trust without a middleman — the cryptography, consensus and contracts behind Web3.",
        "become": [
            {"role": "Blockchain / Smart-Contract Developer", "blurb": "Write and audit Solidity contracts on Ethereum and other chains.", "band": "high", "tags": ["Solidity", "EVM", "Security"]},
            {"role": "Protocol Engineer", "blurb": "Build the consensus, networking and crypto at the base layer of a chain.", "band": "high", "tags": ["Consensus", "Cryptography", "Rust/Go"]},
            {"role": "Smart-Contract Auditor", "blurb": "Hunt for re-entrancy, overflow and logic bugs before millions are lost.", "band": "high", "tags": ["Security", "EVM", "Testing"]},
            {"role": "Web3 Full-Stack Developer", "blurb": "Connect wallets, contracts and front-ends into dApps people use.", "band": "mid", "tags": ["JS", "ethers.js", "Wallets"]},
        ],
        "path": [
            {"stage": "Foundations", "detail": "What a blockchain is, cryptographic hashing and proof-of-work.", "lessons": ["bc-ledger", "bc-hash", "bc-pow"]},
            {"stage": "Structure & trust", "detail": "Merkle trees, consensus and the 51% attack.", "lessons": ["bc-merkle", "bc-consensus"]},
            {"stage": "Programmable money", "detail": "Keys & wallets (ECC), smart contracts and tokens.", "lessons": ["bc-contracts"]},
            {"stage": "Build dApps", "detail": "Security, gas, testing and shipping a decentralised app.", "lessons": []},
        ],
        "build": ["Your own toy blockchain with mining", "A Merkle-proof verifier", "An ERC-20-style token contract", "A re-entrancy exploit — and the fix"],
        "next": [("cyber", "Blockchain is built on cryptography"), ("dsa", "Hashing & trees are core DSA")],
    },

    # ------------------------------------------------------------------ Deep Learning
    "dl": {
        "tagline": "The engine behind modern AI — vision, language and generative models that feel like magic.",
        "become": [
            {"role": "Deep Learning Engineer", "blurb": "Design, train and ship neural networks for vision, speech and language.", "band": "high", "tags": ["PyTorch", "GPUs", "CNNs/Transformers"]},
            {"role": "Computer Vision Engineer", "blurb": "Detection, segmentation and recognition for cameras, medicine and robots.", "band": "high", "tags": ["CNNs", "OpenCV", "Detection"]},
            {"role": "NLP / LLM Engineer", "blurb": "Build on transformers: search, chatbots, RAG and fine-tuning.", "band": "high", "tags": ["Transformers", "Tokenisers", "RAG"]},
            {"role": "Generative-AI / Research Engineer", "blurb": "Diffusion and generative models that create images, audio and text.", "band": "high", "tags": ["Diffusion", "GANs", "Research"]},
        ],
        "path": [
            {"stage": "Foundations", "detail": "Why depth helps, activations, and images as tensors.", "lessons": ["dl-deep", "dl-images"]},
            {"stage": "Vision", "detail": "Convolution, CNN architectures and how networks see.", "lessons": ["dl-conv", "dl-cnn"]},
            {"stage": "Training", "detail": "Backprop, optimisers, regularisation and feature visualisation.", "lessons": ["dl-training"]},
            {"stage": "Modern AI", "detail": "Attention, transformers, embeddings and generative models.", "lessons": ["dl-attention", "dl-generative"]},
        ],
        "build": ["A digit / cat-vs-dog classifier", "An attention visualiser for a sentence", "A tiny diffusion model that denoises to a shape", "Feature-visualisation art from a neuron"],
        "next": [("ml", "Deep learning is a branch of ML"), ("ai", "DL now powers most AI agents"), ("quantum", "Quantum ML is the frontier")],
    },
}
