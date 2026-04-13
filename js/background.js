class DOMGridCell {
  constructor(container, imgPool) {
    this.imgPool = imgPool;
    this.el = document.createElement("div");
    this.el.className = "bg-card";

    this.inner = document.createElement("div");
    this.inner.className = "bg-card-inner";

    this.front = document.createElement("div");
    this.front.className = "bg-card-front";

    this.back = document.createElement("div");
    this.back.className = "bg-card-back";

    this.inner.appendChild(this.front);
    this.inner.appendChild(this.back);
    this.el.appendChild(this.inner);
    container.appendChild(this.el);

    this.currentImg = this.getRandomImage();
    this.front.style.backgroundImage = `url(photo/${this.currentImg})`;
    this.isFlipped = false;
    this.lastFlipTime = 0;
  }

  getRandomImage() {
    return this.imgPool[Math.floor(Math.random() * this.imgPool.length)];
  }

  flip() {
    const now = Date.now();
    if (now - this.lastFlipTime < 1500) return;
    this.lastFlipTime = now;

    const nextImg = this.getRandomImage();
    if (this.isFlipped) {
      this.front.style.backgroundImage = `url(photo/${nextImg})`;
      this.el.classList.remove("flipped");
    } else {
      this.back.style.backgroundImage = `url(photo/${nextImg})`;
      this.el.classList.add("flipped");
    }
    this.isFlipped = !this.isFlipped;
  }
}

export class DynamicBackground {
  constructor() {
    this.rows = 5;
    this.cols = 8;
    this.cells = [];
    this.imageNames = [
      "20260412215636_21_74.png",
      "20260412215648_22_74.png",
      "20260412215655_23_74.png",
      "20260412220028_24_74.png",
      "20260412220049_25_74.png",
      "20260412220122_26_74.png",
      "20260412220144_27_74.png",
      "20260412220156_28_74.png",
      "20260412220203_29_74.png",
      "20260412220209_30_74.png",
      "20260412220217_31_74.png",
      "20260412220230_32_74.png",
      "20260412220237_33_74.png",
      "20260412220242_34_74.png",
      "20260412220252_35_74.png",
      "20260412220259_36_74.png",
      "20260412220305_37_74.png",
      "20260412220324_38_74.png",
      "20260412220332_39_74.png",
      "20260412220431_40_74.png",
      "Jay.png",
      "xx.png",
    ];
    this.container = document.getElementById("bg-wall");
    this.nextFlipTime = 0;
    this.init();
  }

  init() {
    if (!this.container) return;
    this.container.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
    this.container.style.gridTemplateRows = `repeat(${this.rows}, 1fr)`;

    for (let i = 0; i < this.rows * this.cols; i++) {
      this.cells.push(new DOMGridCell(this.container, this.imageNames));
    }
  }

  update() {
    const now = Date.now();
    if (now >= this.nextFlipTime && this.cells.length > 0) {
      const numFlips = Math.random() > 0.5 ? 2 : 1;
      for (let i = 0; i < numFlips; i++) {
        const randomIndex = Math.floor(Math.random() * this.cells.length);
        this.cells[randomIndex].flip();
      }
      this.nextFlipTime = now + (Math.random() * 2000 + 1000);
    }
  }
}
