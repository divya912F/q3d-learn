"""Deep Learning & Computer Vision course: CNNs, training deep nets, attention/transformers and generative models."""
from __future__ import annotations

import numpy as np

from . import engine

COURSE = {
    "id": "dl",
    "title": "Deep Learning & Computer Vision",
    "short": "Deep Learning",
    "tagline": "Slide kernels over images, peek inside attention heads and watch neurons dream.",
    "description": "How deep networks see and read: images as tensors, convolution and pooling, training tricks, self-attention "
                   "and transformers, and feature visualisation — the surreal images that show what a neuron is looking for.",
    "color": "#ae3ec9",
    "icon": "eye",
    "level": "Intermediate",
    "labs": [
        {"id": "conv", "title": "Convolution Studio", "icon": "image",
         "description": "Draw or pick an image, slide a 3×3 kernel over it and watch feature maps, ReLU and pooling appear."},
        {"id": "attention", "title": "Attention Lens", "icon": "focus",
         "description": "Type a sentence and see which words each attention head looks at — arcs, heatmaps and temperature."},
        {"id": "dream", "title": "Dream Machine", "icon": "sparkle",
         "description": "Gradient ascent paints the image a neuron loves most — surreal, psychedelic feature visualisations."},
        {"id": "diffusion", "title": "Diffusion Studio", "icon": "sparkle",
         "description": "Turn pure noise into a shape step by step — the same idea behind modern image generators, in 2-D so you can watch it."},
        {"id": "embeddings", "title": "Word Embeddings", "icon": "compass",
         "description": "Fly through a galaxy of words where direction is meaning: king − man + woman ≈ queen."},
    ],
    "topics": {
        "deep": "Deep networks", "images": "Images as tensors", "conv": "Convolution", "cnn": "CNN architectures",
        "training": "Training deep nets", "attention": "Attention & transformers", "generative": "Inside & generative AI",
    },
}

LESSONS = [
    {
        "id": "dl-deep", "order": 1, "title": "Why Go Deep?", "topic": "deep", "level": "Intermediate", "minutes": 7,
        "summary": "Stacking layers builds features from simple to complex.",
        "blocks": [
            {"type": "text", "html": "A deep network stacks many layers of simple units. Early layers learn <b>simple features</b> (edges, colours), middle layers combine them into <b>textures and parts</b>, and late layers recognise <b>whole objects</b>. Depth lets a network reuse features instead of learning everything from scratch."},
            {"type": "formula", "tex": r"\mathbf{h}^{(l)} = \mathrm{ReLU}\big(W^{(l)} \mathbf{h}^{(l-1)} + \mathbf{b}^{(l)}\big), \qquad \hat{y} = f^{(L)} \circ \dots \circ f^{(1)}(\mathbf{x})"},
            {"type": "callout", "kind": "insight", "html": "Deep learning took off around 2012 when three things met: <b>big labelled datasets</b> (ImageNet), <b>GPUs</b> and better tricks (ReLU, dropout, smarter initialisation)."},
            {"type": "try", "target": "lab", "lab": "dream", "label": "See what layer-1 and layer-2 neurons respond to", "preset": {"layer": 1}},
        ],
        "quiz": [
            {"q": "Early layers of an image network typically detect…", "options": ["Whole faces", "Edges and colour blobs", "Sentences", "Labels"], "answer": 1, "explain": "Simple, local patterns come first."},
            {"q": "ReLU outputs…", "options": ["max(0, x)", "1/(1+e⁻ˣ)", "x²", "tanh x"], "answer": 0, "explain": "It zeroes negatives and passes positives."},
            {"q": "Which was NOT a key ingredient of the 2012 deep-learning boom?", "options": ["GPUs", "Large labelled datasets", "Quantum computers", "ReLU / dropout"], "answer": 2, "explain": "Classical GPUs did the heavy lifting."},
        ],
    },
    {
        "id": "dl-images", "order": 2, "title": "Images as Tensors", "topic": "images", "level": "Beginner", "minutes": 6,
        "summary": "Pixels, channels and shapes — how a computer stores a picture.",
        "blocks": [
            {"type": "text", "html": "A greyscale image is a 2-D grid of numbers (0 = black, 1 = white). A colour image has three <b>channels</b> (red, green, blue), so its shape is <code>H × W × 3</code>. A batch of images adds one more dimension — a 4-D <b>tensor</b>."},
            {"type": "formula", "tex": r"\text{224} \times \text{224} \times 3 = 150{,}528 \text{ numbers per photo}"},
            {"type": "text", "html": "Connecting every pixel to every neuron would need millions of weights per layer and ignores the fact that nearby pixels belong together. Convolution fixes both problems."},
            {"type": "try", "target": "lab", "lab": "conv", "label": "Draw your own 32×32 image", "preset": {"kernel": "identity"}},
        ],
        "quiz": [
            {"q": "A 64×64 RGB image contains how many numbers?", "options": ["4,096", "12,288", "64", "192"], "answer": 1, "explain": "64 × 64 × 3."},
            {"q": "In an RGB image, a channel is…", "options": ["A row of pixels", "One colour plane", "A filter", "A label"], "answer": 1, "explain": "Red, green and blue planes."},
            {"q": "Why not use a fully connected layer on raw pixels?", "options": ["It's too accurate", "Too many weights and it ignores locality", "It can't use ReLU", "Images are text"], "answer": 1, "explain": "Convolutions share weights across positions."},
        ],
    },
    {
        "id": "dl-conv", "order": 3, "title": "Convolution: Filters & Feature Maps", "topic": "conv", "level": "Intermediate", "minutes": 9,
        "summary": "Slide a small kernel over the image; the same weights everywhere.",
        "blocks": [
            {"type": "text", "html": "A <b>convolution</b> slides a small kernel (e.g. 3×3) across the image. At each position it multiplies the kernel with the patch under it and sums the result into one output pixel. The output grid is a <b>feature map</b>: bright where the pattern matches."},
            {"type": "formula", "tex": r"(I * K)[i,j] = \sum_{u=-1}^{1}\sum_{v=-1}^{1} I[i+u,\,j+v]\;K[u,v]"},
            {"type": "text", "html": "A Sobel kernel <code>[[-1,0,1],[-2,0,2],[-1,0,1]]</code> responds to vertical edges; a blur kernel averages neighbours. In a CNN the kernel values are <b>learned</b>, and the same 9 weights are reused at every position (<b>weight sharing</b>), which makes CNNs translation-friendly and tiny."},
            {"type": "callout", "kind": "tip", "html": "Watch the kernel slide in the lab, then switch to the kernel bank: the same image lights up differently for every filter."},
            {"type": "try", "target": "lab", "lab": "conv", "label": "Detect vertical edges in a hand-drawn 7", "preset": {"image": "seven", "kernel": "vertical"}},
        ],
        "quiz": [
            {"q": "A 3×3 convolution kernel on one greyscale channel has how many weights (no bias)?", "options": ["3", "6", "9", "Depends on image size"], "answer": 2, "explain": "3 × 3, shared across all positions."},
            {"q": "A feature map is bright where…", "options": ["The image is bright", "The kernel's pattern matches the image", "The loss is high", "Pixels are missing"], "answer": 1, "explain": "High dot product = good match."},
            {"q": "Weight sharing means…", "options": ["Two networks share a GPU", "The same kernel is used at every position", "Weights are copied between layers", "All weights equal 1"], "answer": 1, "explain": "That keeps parameter counts small."},
        ],
    },
    {
        "id": "dl-cnn", "order": 4, "title": "Pooling, Stride & CNN Architectures", "topic": "cnn", "level": "Intermediate", "minutes": 8,
        "summary": "Shrink, stack and classify: from LeNet to ResNet.",
        "blocks": [
            {"type": "text", "html": "<b>Max-pooling</b> keeps the strongest response in each 2×2 block, halving width and height — cheaper and a little more robust to small shifts. <b>Stride</b> skips positions; <b>padding</b> keeps the border. A typical CNN repeats <i>conv → ReLU → pool</i>, then flattens into dense layers for the final classes."},
            {"type": "formula", "tex": r"\text{params} = (k_h \cdot k_w \cdot C_{in} + 1)\cdot C_{out}, \qquad \text{out} = \Big\lfloor \tfrac{n + 2p - k}{s} \Big\rfloor + 1"},
            {"type": "text", "html": "Landmarks: <b>LeNet</b> (digits, 1998) · <b>AlexNet</b> (ImageNet, 2012) · <b>VGG</b> (deep 3×3 stacks) · <b>ResNet</b> (skip connections let networks go 100+ layers deep without the gradient vanishing)."},
            {"type": "try", "target": "lab", "lab": "conv", "label": "Toggle ReLU and pooling on a feature map", "preset": {"image": "house", "kernel": "edges"}},
        ],
        "quiz": [
            {"q": "2×2 max-pooling turns a 32×32 map into…", "options": ["32×32", "16×16", "8×8", "30×30"], "answer": 1, "explain": "Each 2×2 block becomes one value."},
            {"q": "Parameters of a 3×3 conv from 16 to 32 channels (with bias)?", "options": ["288", "4,608", "4,640", "9,216"], "answer": 2, "explain": "(3·3·16 + 1)·32 = 4,640."},
            {"q": "ResNet's key idea is…", "options": ["Bigger kernels", "Skip (residual) connections", "No activation functions", "Pooling only"], "answer": 1, "explain": "Skips let gradients flow through very deep stacks."},
        ],
    },
    {
        "id": "dl-training", "order": 5, "title": "Training Deep Networks", "topic": "training", "level": "Intermediate", "minutes": 8,
        "summary": "Backprop at scale — and the tricks that make it work.",
        "blocks": [
            {"type": "text", "html": "Deep nets are trained with <b>mini-batch gradient descent</b>: backpropagation computes how every weight affects the loss, and an optimiser such as <b>Adam</b> updates them. The data passes through the network many times (<b>epochs</b>)."},
            {"type": "text", "html": "<ul><li><b>Data augmentation</b> — flips, crops, colour jitter create “new” examples and reduce overfitting.</li><li><b>Dropout</b> — randomly silences neurons during training so they can't co-depend.</li><li><b>Batch normalisation</b> — keeps activations well-scaled, allowing higher learning rates.</li><li><b>Transfer learning</b> — start from a network pre-trained on ImageNet and fine-tune it on your small dataset.</li></ul>"},
            {"type": "callout", "kind": "insight", "html": "Transfer learning is why you can build a good plant-disease detector with only a few hundred photos: the early layers already know edges and textures."},
            {"type": "try", "target": "lab", "lab": "dream", "label": "Gradient ascent: the training idea run backwards", "preset": {"layer": 2, "palette": "aurora"}},
        ],
        "quiz": [
            {"q": "Data augmentation mainly helps to…", "options": ["Speed up inference", "Reduce overfitting", "Shrink the model", "Remove the need for labels"], "answer": 1, "explain": "More varied training examples."},
            {"q": "Dropout during training…", "options": ["Deletes data", "Randomly disables neurons", "Lowers the learning rate", "Removes layers forever"], "answer": 1, "explain": "A cheap ensemble effect."},
            {"q": "Transfer learning means…", "options": ["Copying test answers", "Starting from a pre-trained network and fine-tuning", "Moving a model to a GPU", "Training two models at once"], "answer": 1, "explain": "Reuse learned features."},
        ],
    },
    {
        "id": "dl-attention", "order": 6, "title": "Attention & Transformers", "topic": "attention", "level": "Advanced", "minutes": 10,
        "summary": "Every token decides which other tokens matter — the engine of modern AI.",
        "blocks": [
            {"type": "text", "html": "In <b>self-attention</b>, every token makes a <b>query</b>, a <b>key</b> and a <b>value</b> vector. A token's query is compared with every key; the softmax of those scores says how much of each value to mix in. Each row of attention weights sums to 1."},
            {"type": "formula", "tex": r"\mathrm{Attention}(Q,K,V) = \mathrm{softmax}\!\left(\frac{QK^{\top}}{\sqrt{d_k}}\right) V"},
            {"type": "text", "html": "A <b>transformer</b> stacks many layers of multi-head attention and small feed-forward networks. Different <b>heads</b> learn different jobs — looking at the previous word, at matching words, at the subject of a verb. GPT-style models add a <b>causal mask</b> so a token can only look backwards; Vision Transformers apply the same idea to image patches."},
            {"type": "callout", "kind": "tip", "html": "In the lab, lower the temperature to make heads “sharper” (one strong focus) or raise it to spread attention out."},
            {"type": "try", "target": "lab", "lab": "attention", "label": "See three attention heads read a sentence", "preset": {}},
        ],
        "quiz": [
            {"q": "Each row of an attention weight matrix sums to…", "options": ["0", "1", "d", "The sentence length"], "answer": 1, "explain": "It's a softmax distribution."},
            {"q": "Why divide by √dₖ?", "options": ["To save memory", "To keep dot products from growing too large before softmax", "To make it causal", "It is optional decoration"], "answer": 1, "explain": "Large scores make softmax saturate."},
            {"q": "A causal mask lets each token attend to…", "options": ["Every token", "Only earlier tokens (and itself)", "Only later tokens", "No tokens"], "answer": 1, "explain": "That's how GPT generates left to right."},
        ],
    },
    {
        "id": "dl-generative", "order": 7, "title": "Seeing Inside Networks & Generative AI", "topic": "generative", "level": "Intermediate", "minutes": 8,
        "summary": "Feature visualisation, GANs, diffusion — and deepfake responsibility.",
        "blocks": [
            {"type": "text", "html": "<b>Feature visualisation</b> runs gradient ascent on the <i>input</i>: start from noise and nudge the pixels to make one neuron fire as strongly as possible. The result — often surreal, swirling patterns — shows what that neuron is looking for. DeepDream (2015) made this famous."},
            {"type": "formula", "tex": r"\mathbf{x} \leftarrow \mathbf{x} + \eta\,\frac{\partial\, a_c(\mathbf{x})}{\partial \mathbf{x}} \quad (\text{maximise channel } c)"},
            {"type": "text", "html": "Generative models create new data: <b>GANs</b> pit a generator against a discriminator; <b>diffusion models</b> (Stable Diffusion, DALL·E) learn to remove noise step by step; <b>large language models</b> generate text token by token with transformers."},
            {"type": "callout", "kind": "warning", "html": "Generated images and voices can be used for <b>deepfakes</b>. Label AI content, respect consent and copyright, and check sources before you share."},
            {"type": "try", "target": "lab", "lab": "dream", "label": "Make a neuron dream in neon", "preset": {"layer": 2, "palette": "neon", "channel": 3}},
        ],
        "quiz": [
            {"q": "Feature visualisation changes…", "options": ["The network's weights", "The input image", "The labels", "The loss function only"], "answer": 1, "explain": "Weights are frozen; pixels are optimised."},
            {"q": "Diffusion models generate images by…", "options": ["Copying training images", "Removing noise step by step", "Sorting pixels", "Searching the web"], "answer": 1, "explain": "They learn to reverse a noising process."},
            {"q": "A responsible practice with generated media is…", "options": ["Sharing it as real", "Labelling it as AI-generated", "Removing watermarks", "Using anyone's face"], "answer": 1, "explain": "Transparency and consent."},
        ],
    },
]

SENTENCE = "the cat sat on the mat because the cat was tired"
PATCH = [[1, 2, 1], [0, 3, 0], [1, 1, 1]]
SHARPEN = [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]

CHALLENGES = [
    {"id": "dl-patch", "title": "Kernel by Hand", "difficulty": "Easy", "points": 50, "topic": "conv",
     "kind": "answer", "answer_type": "number", "tolerance": 0,
     "description": "Apply the sharpen kernel [[0,−1,0],[−1,5,−1],[0,−1,0]] to the 3×3 patch [[1,2,1],[0,3,0],[1,1,1]]. What is the output value at the centre?",
     "goal": "Multiply element-wise and add everything up.", "hint": "Only the centre and its four neighbours have non-zero kernel weights.",
     "open_lab": {"lab": "conv", "preset": {"kernel": "sharpen"}}, "compute": "patch"},
    {"id": "dl-edge", "title": "Edge Detective", "difficulty": "Easy", "points": 50, "topic": "conv",
     "kind": "answer", "answer_type": "choice", "options": ["vertical", "horizontal", "blur", "gaussian"],
     "description": "Of these four kernels, which produces the strongest average activation (after ReLU) on the vertical-stripes image?",
     "goal": "Pick the kernel.", "hint": "Load the stripes image and compare the kernel bank.",
     "open_lab": {"lab": "conv", "preset": {"image": "stripes", "kernel": "vertical"}}, "compute": "edge"},
    {"id": "dl-params", "title": "Count the Weights", "difficulty": "Medium", "points": 70, "topic": "cnn",
     "kind": "answer", "answer_type": "number", "tolerance": 0,
     "description": "A conv layer has 3×3 kernels, 16 input channels and 32 output channels, with one bias per output channel. How many learnable parameters does it have?",
     "goal": "Type the number.", "hint": "(k·k·C_in + 1) · C_out", "compute": "params"},
    {"id": "dl-attn", "title": "Who Is It Looking At?", "difficulty": "Medium", "points": 70, "topic": "attention",
     "kind": "answer", "answer_type": "choice", "options": ["the", "cat", "mat", "tired"],
     "description": f"In the sentence “{SENTENCE}”, which word does the SECOND “cat” attend to most in the similar-word head?",
     "goal": "Pick the word.", "hint": "Open the Attention Lens, choose the similar-word head and click the second “cat”.",
     "open_lab": {"lab": "attention", "preset": {"sentence": SENTENCE}}, "compute": "attn"},
]


def check_challenge(ch: dict, payload: dict) -> dict:
    given = payload.get("answer")
    if ch["compute"] == "patch":
        truth = float(engine.conv2d(np.asarray(PATCH, float), np.asarray(SHARPEN, float))[1, 1])
        fb_ok = f"Correct — 5×3 − (2 + 0 + 0 + 1) = {truth:g}. The centre is boosted against its neighbours: that's sharpening."
    elif ch["compute"] == "params":
        truth = (3 * 3 * 16 + 1) * 32
        fb_ok = f"Correct — (3·3·16 + 1) × 32 = {truth:,}. A dense layer on a 32×32×16 input would need millions."
    elif ch["compute"] == "edge":
        res = engine.convolve_lab("stripes", "vertical")
        means = {k: float(np.mean(res["bank"][k])) for k in ch["options"]}
        truth = max(means, key=means.get)
        ok = given == truth
        return {"solved": ok, "score": 1.0 if ok else 0.0,
                "feedback": [f"Correct — the {truth} Sobel kernel fires on every left/right brightness change." if ok else f"{given} gives a mean of {means.get(given, 0):.2f}; another kernel does much better."]}
    else:
        att = engine.attention_lab(SENTENCE)
        truth = att["tokens"][att["heads"]["similar"]["focus"][8]]
        ok = given == truth
        return {"solved": ok, "score": 1.0 if ok else 0.0,
                "feedback": [f"Correct — the head links the two copies of “{truth}”, the same trick transformers use to track repeated names." if ok else "Not that one — click the second “cat” in the lab."]}
    try:
        ok = abs(float(given) - truth) <= ch.get("tolerance", 0)
    except (TypeError, ValueError):
        ok = False
    return {"solved": ok, "score": 1.0 if ok else 0.0, "feedback": [fb_ok if ok else "Not quite — try again step by step."]}


KNOWLEDGE = {
    "deep-network": {"keys": ["deep learning", "deep network", "layers", "hierarchy of features"], "lesson": "dl-deep",
                     "text": "**Deep learning** stacks many layers so features build up from simple (edges) to complex (objects). It took off with big datasets, GPUs and tricks such as ReLU and dropout."},
    "relu": {"keys": ["relu", "rectified"], "lesson": "dl-deep",
             "text": "**ReLU** (rectified linear unit) outputs max(0, x). It's cheap, doesn't saturate for positive inputs and made training deep networks much easier than sigmoid or tanh."},
    "tensor": {"keys": ["tensor", "channel", "rgb", "pixel"], "lesson": "dl-images",
               "text": "Images are **tensors**: a greyscale image is H × W numbers, a colour image H × W × 3 (RGB channels), and a batch adds another dimension. A 224×224 photo is 150,528 numbers."},
    "convolution": {"keys": ["convolution", "kernel", "filter", "feature map", "sobel", "weight sharing"], "lesson": "dl-conv",
                    "text": "A **convolution** slides a small kernel over the image, taking a weighted sum at each position to produce a **feature map**. The same weights are reused everywhere (weight sharing), and in CNNs the kernel values are learned."},
    "pooling": {"keys": ["pooling", "max pool", "maxpool", "stride", "padding"], "lesson": "dl-cnn",
                "text": "**Max-pooling** keeps the largest value in each window (e.g. 2×2), halving width and height. **Stride** skips positions and **padding** adds a border; output size = ⌊(n + 2p − k)/s⌋ + 1."},
    "cnn": {"keys": ["cnn", "convolutional neural network", "lenet", "alexnet", "vgg", "resnet", "skip connection"], "lesson": "dl-cnn",
            "text": "A **CNN** repeats conv → ReLU → pool and ends with dense layers. Landmarks: LeNet, AlexNet (2012 ImageNet win), VGG and ResNet, whose **skip connections** allow 100+ layer networks."},
    "augmentation": {"keys": ["augmentation", "dropout", "batch norm", "batchnorm", "regularis", "regulariz"], "lesson": "dl-training",
                     "text": "Deep nets fight overfitting with **data augmentation** (flips, crops, colour jitter), **dropout** (randomly silence neurons) and **batch normalisation** (stable activations, faster training)."},
    "transfer": {"keys": ["transfer learning", "fine-tun", "pretrained", "pre-trained", "imagenet"], "lesson": "dl-training",
                 "text": "**Transfer learning** starts from a network pre-trained on a big dataset (e.g. ImageNet) and fine-tunes it for a new task, so small datasets can still give strong results."},
    "attention": {"keys": ["attention", "query", "key", "value", "softmax", "self-attention", "multi-head"], "lesson": "dl-attention",
                  "text": "**Self-attention** computes softmax(QKᵀ/√dₖ)·V: each token's query is compared with every key, and the resulting weights (rows sum to 1) mix the value vectors. **Multi-head** attention runs several of these in parallel, each learning a different pattern."},
    "transformer": {"keys": ["transformer", "gpt", "bert", "causal mask", "vision transformer", "vit"], "lesson": "dl-attention",
                    "text": "A **transformer** stacks multi-head self-attention and feed-forward layers with residual connections. GPT uses a **causal mask** (look only backwards) to generate text; Vision Transformers apply attention to image patches."},
    "feature-viz": {"keys": ["feature visualisation", "feature visualization", "deepdream", "deep dream", "gradient ascent", "dream"], "lesson": "dl-generative",
                    "text": "**Feature visualisation** freezes the network and runs gradient ascent on the input image to maximise one neuron's activation, revealing (often surreal) patterns it detects — the idea behind DeepDream."},
    "generative": {"keys": ["generative", "gan", "diffusion", "stable diffusion", "deepfake", "dall"], "lesson": "dl-generative",
                   "text": "**Generative models** create new data: GANs (generator vs discriminator), **diffusion models** (learn to remove noise step by step) and LLMs. Use them responsibly — label AI content and avoid deceptive deepfakes."},
}

# --- v2.3 expanded curriculum (see extra.py) ---
from .extra import KNOWLEDGE_EXTRA, LESSONS_EXTRA, TOPICS_EXTRA  # noqa: E402

COURSE["topics"].update(TOPICS_EXTRA)
LESSONS = LESSONS + LESSONS_EXTRA
KNOWLEDGE.update(KNOWLEDGE_EXTRA)
