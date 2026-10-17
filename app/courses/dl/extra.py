"""Deep Learning & Computer Vision — expanded curriculum (v2.3). Merged by content.py."""
from __future__ import annotations

TOPICS_EXTRA = {
    "sequence": "Sequences & RNNs",
    "transfer": "Transfer learning",
    "ethics": "Limits & ethics",
}

# Existing labs: conv, attention, dream, diffusion, embeddings
LESSONS_EXTRA = [
    {
        "id": "dl-perceptron", "order": 8, "title": "The Neuron & the Perceptron", "topic": "deep", "level": "Beginner", "minutes": 7,
        "summary": "The tiny unit everything is built from — a weighted sum and a switch.",
        "blocks": [
            {"type": "text", "html": "A single <b>neuron</b> takes inputs, multiplies each by a weight, adds a bias, and fires through an activation. That's it — a weighted vote with a threshold:"},
            {"type": "formula", "tex": r"y = \phi\!\Big(\sum_i w_i x_i + b\Big)"},
            {"type": "text", "html": "One neuron (a <b>perceptron</b>) can only draw a straight line, so it can't solve XOR. The fix that launched deep learning: stack neurons into <b>layers</b>, and a multi-layer network can carve any shape."},
            {"type": "callout", "kind": "insight", "html": "The weights <i>are</i> the knowledge. Training is nothing more than finding the billions of weight values that make the whole network's output right."},
        ],
        "quiz": [
            {"q": "A neuron computes…", "options": ["A random number", "A weighted sum passed through an activation", "A sort", "A hash"], "answer": 1, "explain": "φ(Σ wᵢxᵢ + b)."},
            {"q": "A single perceptron cannot solve XOR because it…", "options": ["Is too slow", "Can only draw a linear boundary", "Has no weights", "Needs a GPU"], "answer": 1, "explain": "XOR isn't linearly separable; you need hidden layers."},
            {"q": "In a trained network, the 'knowledge' lives in the…", "options": ["Weights", "Input data", "Learning rate", "Activation name"], "answer": 0, "explain": "Learned weight values encode what the model knows."},
        ],
    },
    {
        "id": "dl-backprop", "order": 9, "title": "Backpropagation & Gradients", "topic": "training", "level": "Intermediate", "minutes": 9,
        "summary": "The chain rule, run backwards, is how a billion-parameter network learns.",
        "blocks": [
            {"type": "text", "html": "To learn, the network needs to know how each weight affects the <b>loss</b>. <b>Backpropagation</b> computes every gradient in one backward pass by applying the <b>chain rule</b> layer by layer, from the output error back to the inputs."},
            {"type": "formula", "tex": r"\frac{\partial L}{\partial w^{(l)}} = \frac{\partial L}{\partial a^{(l)}}\cdot\frac{\partial a^{(l)}}{\partial z^{(l)}}\cdot\frac{\partial z^{(l)}}{\partial w^{(l)}}"},
            {"type": "text", "html": "Each weight then steps against its gradient (gradient descent). Modern frameworks do this automatically with <b>autograd</b> — you define the forward pass and they derive the backward one."},
            {"type": "callout", "kind": "warning", "html": "Very deep networks suffer <b>vanishing</b> or <b>exploding gradients</b> — the signal shrinks or blows up over many layers. ReLU activations, careful initialisation and normalisation are the standard fixes."},
        ],
        "quiz": [
            {"q": "Backpropagation is fundamentally…", "options": ["Random search", "The chain rule applied backward through layers", "Sorting weights", "A hash"], "answer": 1, "explain": "It propagates the loss gradient from output to input."},
            {"q": "Autograd lets you…", "options": ["Skip training", "Define the forward pass and get gradients automatically", "Avoid data", "Remove layers"], "answer": 1, "explain": "Frameworks derive the backward pass for you."},
            {"q": "Vanishing gradients mean the learning signal…", "options": ["Grows huge", "Shrinks toward zero across deep layers", "Stays perfect", "Is random"], "answer": 1, "explain": "Early layers barely update; ReLU/normalisation help."},
        ],
    },
    {
        "id": "dl-optim", "order": 10, "title": "Training Tricks: Batch Norm, Dropout & More", "topic": "training", "level": "Advanced", "minutes": 8,
        "summary": "The practical tricks that make deep networks actually train.",
        "blocks": [
            {"type": "text", "html": "Raw backprop isn't enough. <b>Mini-batches</b> and optimisers like <b>Adam</b> speed descent. <b>Batch normalisation</b> re-centres each layer's activations so training stays stable and fast."},
            {"type": "text", "html": "To fight overfitting: <b>dropout</b> randomly silences neurons each step so the network can't rely on any one path; <b>data augmentation</b> (flips, crops) multiplies your images; <b>early stopping</b> halts when validation loss turns up."},
            {"type": "callout", "kind": "tip", "html": "Watch two curves: training and validation loss. Both falling = good. Training falling while validation rises = overfitting — add regularisation or data."},
        ],
        "quiz": [
            {"q": "Dropout fights overfitting by…", "options": ["Adding layers", "Randomly silencing neurons during training", "Removing data", "Raising the learning rate"], "answer": 1, "explain": "It stops the net relying on any single path."},
            {"q": "Batch normalisation mainly…", "options": ["Deletes batches", "Stabilises and speeds training by re-centring activations", "Removes weights", "Replaces backprop"], "answer": 1, "explain": "Normalised activations keep gradients well-behaved."},
            {"q": "Validation loss rising while training loss falls signals…", "options": ["Underfitting", "Overfitting", "A bug in data loading only", "Perfect training"], "answer": 1, "explain": "The model is memorising the training set."},
        ],
    },
    {
        "id": "dl-cnn-arch", "order": 11, "title": "CNN Architectures: From LeNet to ResNet", "topic": "cnn", "level": "Advanced", "minutes": 8,
        "summary": "How vision networks got deeper — and the skip connection that unlocked it.",
        "blocks": [
            {"type": "text", "html": "CNNs stack convolution + pooling to build a <b>hierarchy of features</b>: edges → textures → parts → objects. <b>LeNet</b> (1998) read digits; <b>AlexNet</b> (2012) crushed ImageNet and started the deep-learning boom; <b>VGG</b> went deeper."},
            {"type": "text", "html": "But past ~20 layers, accuracy got <i>worse</i> — gradients degraded. <b>ResNet</b>'s <b>skip connection</b> lets a layer learn a small residual on top of its input, so signals and gradients flow freely. Suddenly 150+ layers trained fine."},
            {"type": "formula", "tex": r"\text{ResNet block: } y = \mathcal{F}(x) + x"},
            {"type": "callout", "kind": "insight", "html": "The skip connection is one of the most important ideas in deep learning — the same 'add the input back' trick reappears inside transformers."},
            {"type": "try", "target": "lab", "lab": "conv", "label": "See a convolution build a feature map", "preset": {}},
        ],
        "quiz": [
            {"q": "CNNs build features in a…", "options": ["Flat list", "Hierarchy (edges → parts → objects)", "Random order", "Single layer"], "answer": 1, "explain": "Depth composes simple features into complex ones."},
            {"q": "ResNet's key idea is the…", "options": ["Bigger kernel", "Skip (residual) connection y = F(x) + x", "Removing pooling", "No activations"], "answer": 1, "explain": "Residual links let very deep nets train."},
            {"q": "AlexNet (2012) is famous for…", "options": ["Losing ImageNet", "Igniting the deep-learning boom by winning ImageNet", "Being shallow by design", "Avoiding GPUs"], "answer": 1, "explain": "Its win showed deep CNNs + GPUs work."},
        ],
    },
    {
        "id": "dl-rnn", "order": 12, "title": "Sequences: RNNs & LSTMs", "topic": "sequence", "level": "Intermediate", "minutes": 8,
        "summary": "Networks with memory for text, audio and time — the era before transformers.",
        "blocks": [
            {"type": "text", "html": "Images are fixed-size, but language and audio are <b>sequences</b> of varying length. A <b>recurrent neural network</b> processes one element at a time, carrying a <b>hidden state</b> that acts as memory of what came before."},
            {"type": "text", "html": "Plain RNNs forget quickly (vanishing gradients again). The <b>LSTM</b> adds gates that learn what to keep, update and forget, letting it remember far longer. LSTMs powered translation and speech for years."},
            {"type": "callout", "kind": "insight", "html": "RNNs process strictly left-to-right, so they're slow and struggle with very long contexts. That bottleneck is exactly what the transformer's attention removed — but the sequence mindset still matters."},
        ],
        "quiz": [
            {"q": "An RNN handles sequences by…", "options": ["Seeing all of it at once", "Carrying a hidden state across steps", "Sorting the input", "Using convolution only"], "answer": 1, "explain": "The hidden state is memory of prior elements."},
            {"q": "An LSTM improves on plain RNNs with…", "options": ["More layers only", "Gates that control what to keep/forget", "No memory", "Bigger images"], "answer": 1, "explain": "Gating fights vanishing gradients over long sequences."},
            {"q": "A key RNN limitation transformers fixed is…", "options": ["Too much parallelism", "Slow, strictly sequential processing", "No weights", "No training"], "answer": 1, "explain": "Attention processes a whole sequence in parallel."},
        ],
    },
    {
        "id": "dl-transformers", "order": 13, "title": "Transformers & Self-Attention", "topic": "attention", "level": "Advanced", "minutes": 9,
        "summary": "The architecture behind every modern LLM — attention is all you need.",
        "blocks": [
            {"type": "text", "html": "The <b>transformer</b> (2017) replaced recurrence with <b>self-attention</b>: every token computes a <b>query</b>, <b>key</b> and <b>value</b>, and attends to every other token by how well queries match keys."},
            {"type": "formula", "tex": r"\text{Attention}(Q,K,V) = \text{softmax}\!\Big(\frac{QK^\top}{\sqrt{d}}\Big)V"},
            {"type": "text", "html": "Because every position sees every other at once, it trains in parallel and captures long-range meaning. <b>Multi-head</b> attention runs several of these in parallel, each learning a different kind of relationship."},
            {"type": "callout", "kind": "tip", "html": "The attention lab draws these connections as glowing arcs — type a sentence and watch which words each head looks at."},
            {"type": "try", "target": "lab", "lab": "attention", "label": "See which words each attention head looks at", "preset": {}},
        ],
        "quiz": [
            {"q": "Self-attention lets each token…", "options": ["Ignore others", "Attend to every other token by query–key match", "See only its neighbour", "Use no weights"], "answer": 1, "explain": "Q·K scores decide how much each token attends to others."},
            {"q": "Transformers train faster than RNNs because they…", "options": ["Are smaller", "Process the whole sequence in parallel", "Skip training", "Use no GPU"], "answer": 1, "explain": "No step-by-step recurrence means parallelism."},
            {"q": "Multi-head attention provides…", "options": ["One relationship", "Several attention patterns learned in parallel", "Fewer parameters always", "No softmax"], "answer": 1, "explain": "Each head captures a different kind of relation."},
        ],
    },
    {
        "id": "dl-embeddings", "order": 14, "title": "Embeddings: Meaning as Geometry", "topic": "generative", "level": "Intermediate", "minutes": 8,
        "summary": "Turn words and images into vectors where distance is similarity.",
        "blocks": [
            {"type": "text", "html": "Networks don't read words — they read <b>embeddings</b>, vectors where similar things sit close together. Trained on context, these vectors capture meaning as <b>geometry</b>:"},
            {"type": "formula", "tex": r"\vec{\text{king}} - \vec{\text{man}} + \vec{\text{woman}} \approx \vec{\text{queen}}"},
            {"type": "text", "html": "The same idea embeds images, songs and products. It powers <b>semantic search</b> (find by meaning, not keywords) and <b>recommendations</b> (near vectors = similar items), and is the backbone of retrieval-augmented LLMs."},
            {"type": "callout", "kind": "tip", "html": "The embeddings lab flies you through a galaxy of words where direction <i>is</i> meaning — gender, tense and category each become a consistent direction in space."},
            {"type": "try", "target": "lab", "lab": "embeddings", "label": "Fly through a galaxy of word vectors", "preset": {}},
        ],
        "quiz": [
            {"q": "An embedding represents an item as…", "options": ["A single id", "A vector where distance means similarity", "A hash", "A label only"], "answer": 1, "explain": "Nearby vectors = semantically similar items."},
            {"q": "king − man + woman ≈ queen shows that embeddings capture…", "options": ["Random noise", "Meaning as directions in space", "File sizes", "Pixel values"], "answer": 1, "explain": "Relationships become consistent vector offsets."},
            {"q": "Semantic search uses embeddings to find results by…", "options": ["Exact keywords", "Meaning / nearness in vector space", "Alphabet", "Date"], "answer": 1, "explain": "It matches on vector similarity, not literal words."},
        ],
    },
    {
        "id": "dl-generative-models", "order": 15, "title": "Generative Models: GANs, VAEs & Diffusion", "topic": "generative", "level": "Advanced", "minutes": 9,
        "summary": "How machines learned to create images — and why diffusion won.",
        "blocks": [
            {"type": "text", "html": "Generative models learn a data distribution so they can <b>sample new examples</b>. A <b>GAN</b> pits a generator against a discriminator in a forger-vs-detective game. A <b>VAE</b> learns a smooth latent space you can interpolate through."},
            {"type": "text", "html": "<b>Diffusion models</b> (behind Stable Diffusion, DALL·E) now dominate: they add noise to images in training, then learn to <b>reverse</b> it, generating a picture by denoising pure static step by step — guided by a text embedding."},
            {"type": "callout", "kind": "tip", "html": "The diffusion lab turns pure noise into a shape step by step in 2-D so you can watch the denoising process that powers modern image generators."},
            {"type": "try", "target": "lab", "lab": "diffusion", "label": "Turn noise into a shape, step by step", "preset": {}},
        ],
        "quiz": [
            {"q": "A GAN trains…", "options": ["One network alone", "A generator against a discriminator", "No networks", "Only a classifier"], "answer": 1, "explain": "The adversarial game drives realistic samples."},
            {"q": "Diffusion models generate by…", "options": ["Sorting pixels", "Reversing a noising process (denoising)", "Hashing", "Copying training images"], "answer": 1, "explain": "They learn to turn noise into data step by step."},
            {"q": "Modern text-to-image tools (Stable Diffusion) are mostly…", "options": ["GANs", "Diffusion models", "RNNs", "Decision trees"], "answer": 1, "explain": "Diffusion now leads image generation."},
        ],
    },
    {
        "id": "dl-transfer", "order": 16, "title": "Transfer Learning & Fine-Tuning", "topic": "transfer", "level": "Intermediate", "minutes": 8,
        "summary": "Don't start from scratch — stand on a giant pretrained model's shoulders.",
        "blocks": [
            {"type": "text", "html": "Training a big model from zero needs millions of examples and huge compute. <b>Transfer learning</b> reuses a model already pretrained on a vast dataset, then adapts it to your task with a little data."},
            {"type": "text", "html": "You can <b>freeze</b> the pretrained layers and train just a new head, or <b>fine-tune</b> the whole thing at a low learning rate. For LLMs, cheap methods like <b>LoRA</b> adjust only a tiny fraction of the weights."},
            {"type": "callout", "kind": "insight", "html": "This is why a student can build a strong classifier on 200 images today: the pretrained backbone already learned edges, textures and shapes. You only teach it your specific labels."},
        ],
        "quiz": [
            {"q": "Transfer learning means…", "options": ["Training from scratch", "Reusing a pretrained model and adapting it", "Deleting the model", "Avoiding data"], "answer": 1, "explain": "A pretrained backbone jump-starts your task."},
            {"q": "'Freezing' layers means you…", "options": ["Delete them", "Keep their weights fixed and train a new head", "Cool the GPU", "Randomise them"], "answer": 1, "explain": "Only the new part learns your task."},
            {"q": "LoRA fine-tunes an LLM by…", "options": ["Retraining everything", "Adjusting a tiny fraction of weights cheaply", "Removing attention", "Adding data only"], "answer": 1, "explain": "Low-rank adapters make fine-tuning affordable."},
        ],
    },
    {
        "id": "dl-ethics", "order": 17, "title": "Limits, Bias & Responsible Deep Learning", "topic": "ethics", "level": "Intermediate", "minutes": 8,
        "summary": "Powerful models fail in specific ways — know them before you ship.",
        "blocks": [
            {"type": "text", "html": "Deep models are brilliant pattern-matchers but have real limits. They inherit <b>bias</b> from training data, are <b>black boxes</b> (hard to explain), and can be fooled by <b>adversarial examples</b> — tiny pixel changes that flip a confident prediction."},
            {"type": "text", "html": "They also <b>hallucinate</b> (state false things confidently) and are hungry for data, compute and energy. Deployed carelessly, they can automate discrimination at scale behind a veneer of objectivity."},
            {"type": "callout", "kind": "warning", "html": "Responsible DL means: audit for bias across groups, measure real-world performance not just test accuracy, keep humans in the loop for high-stakes decisions, and be honest about uncertainty."},
        ],
        "quiz": [
            {"q": "An adversarial example is…", "options": ["A bad dataset", "A tiny input change that fools the model", "A slow GPU", "A missing label"], "answer": 1, "explain": "Imperceptible perturbations can flip predictions."},
            {"q": "Deep models inherit bias from…", "options": ["The GPU", "Their training data", "The activation function", "The optimiser"], "answer": 1, "explain": "Biased data produces biased, confident models."},
            {"q": "Responsible DL for high-stakes decisions keeps…", "options": ["Humans in the loop", "Only the model deciding", "No auditing", "Accuracy secret"], "answer": 0, "explain": "Oversight, bias audits and honesty about uncertainty matter."},
        ],
    },
]

KNOWLEDGE_EXTRA = {
    "perceptron": {"keys": ["neuron", "perceptron", "weighted sum", "xor"], "lesson": "dl-perceptron",
                   "text": "A **neuron** computes φ(Σ wᵢxᵢ + b). A single **perceptron** draws only a line (can't do XOR); stacking neurons into layers lets a network carve any shape. The weights are the knowledge."},
    "backpropagation": {"keys": ["backpropagation", "backprop", "chain rule", "gradient", "vanishing gradient", "autograd"], "lesson": "dl-backprop",
                        "text": "**Backpropagation** applies the chain rule backward through layers to get every weight's gradient in one pass. Deep nets risk vanishing/exploding gradients; ReLU and normalisation help."},
    "training-tricks": {"keys": ["batch normalisation", "batch norm", "dropout", "data augmentation", "early stopping"], "lesson": "dl-optim",
                        "text": "Deep nets train well with mini-batches + Adam, **batch normalisation** for stability, and **dropout**, data augmentation and early stopping to fight overfitting."},
    "resnet": {"keys": ["cnn architecture", "resnet", "skip connection", "residual", "alexnet", "vgg"], "lesson": "dl-cnn-arch",
               "text": "CNNs build a feature hierarchy (edges→objects). **ResNet**'s **skip connection** y = F(x) + x lets gradients flow, enabling 100+ layers — a trick reused inside transformers."},
    "rnn": {"keys": ["rnn", "recurrent", "lstm", "hidden state", "sequence"], "lesson": "dl-rnn",
            "text": "A **recurrent neural network** carries a hidden state across a sequence. **LSTMs** add gates to remember longer. RNNs are strictly sequential — the bottleneck transformers removed."},
    "transformer-dl": {"keys": ["transformer", "self-attention", "query key value", "multi-head", "attention"], "lesson": "dl-transformers",
                       "text": "The **transformer** uses **self-attention** (softmax(QKᵀ/√d)V) so every token attends to every other in parallel. **Multi-head** attention learns several relationships at once — the basis of every LLM."},
    "embedding": {"keys": ["embedding", "word vector", "semantic search", "latent space", "representation"], "lesson": "dl-embeddings",
                  "text": "An **embedding** maps items to vectors where distance = similarity (king−man+woman≈queen). Embeddings power semantic search, recommendations and retrieval-augmented LLMs."},
    "generative": {"keys": ["gan", "vae", "diffusion", "generative model", "stable diffusion"], "lesson": "dl-generative-models",
                   "text": "**Generative models** sample new data. GANs pit generator vs discriminator; VAEs learn a smooth latent space; **diffusion** models denoise from static and now lead image generation."},
    "transfer-learning": {"keys": ["transfer learning", "fine-tuning", "pretrained", "freeze", "lora"], "lesson": "dl-transfer",
                          "text": "**Transfer learning** adapts a pretrained model to your task with little data — freeze the backbone and train a new head, or fine-tune (LoRA adjusts a tiny fraction of weights cheaply)."},
    "dl-ethics": {"keys": ["adversarial example", "bias", "black box", "hallucination", "responsible ai"], "lesson": "dl-ethics",
                  "text": "Deep models inherit **bias**, are black boxes, hallucinate, and can be fooled by **adversarial examples**. Responsible DL audits bias, keeps humans in the loop and is honest about uncertainty."},
}

TERMS_EXTRA = {
    "perceptron": ("The neuron / perceptron", ["perceptron"]),
    "backpropagation": ("Backpropagation", ["backprop", "chain rule"]),
    "training-tricks": ("Batch norm & dropout", ["dropout"]),
    "resnet": ("CNN architectures (ResNet)", ["skip connection"]),
    "rnn": ("RNNs & LSTMs", ["lstm"]),
    "transformer-dl": ("Transformers & attention", ["self-attention"]),
    "embedding": ("Embeddings", ["word vector", "semantic search"]),
    "generative": ("Generative models", ["gan", "diffusion"]),
    "transfer-learning": ("Transfer learning", ["fine-tuning", "lora"]),
    "dl-ethics": ("Limits, bias & ethics", ["adversarial example"]),
}
