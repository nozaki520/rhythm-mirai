class PhysicsEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animationId = null;
    this.lastTime = 0;
    
    // Canvasのリサイズ対応
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    // コンテナのサイズに合わせる
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
  }

  start() {
    if (!this.animationId) {
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clear();
  }

  clear() {
    this.particles = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // 歌詞が発話されたタイミングで呼ばれる
  addLyricChars(charData, songType) {
    // charData: TextAliveのCharインスタンス（文字、位置、サイズなどの情報を含む想定）
    // 実際にはAPIで取得できるテキスト文字列と適当な初期位置を使う
    const text = charData.text;
    const x = this.canvas.width / 2 + (Math.random() - 0.5) * 50;
    const y = this.canvas.height / 2 + (Math.random() - 0.5) * 50;
    
    const p = {
      text: text,
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      rotation: 0,
      vr: 0,
      life: 1.0,
      scale: 1.0,
      color: `hsl(${Math.random() * 60 + 180}, 100%, 70%)`, // ベースの色
      type: songType
    };

    // 各曲の雰囲気に合わせた初期化
    switch (songType) {
      case 'kotaete': // 浮遊・シャボン玉
        p.vx = (Math.random() - 0.5) * 0.5;
        p.vy = -Math.random() * 2 - 1;
        p.lifeDecay = 0.005;
        p.color = `rgba(255, 255, 255, 0.8)`;
        break;
      case 'curtain': // 水平スライド
        p.x = 0; // 左から
        p.y = this.canvas.height / 2 + (Math.random() - 0.5) * 200;
        p.vx = Math.random() * 3 + 2;
        p.vy = 0;
        p.lifeDecay = 0.01;
        break;
      case 'shutter': // 放射状飛散
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 5;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.vr = (Math.random() - 0.5) * 0.2;
        p.lifeDecay = 0.02;
        p.color = `hsl(${Math.random() * 360}, 80%, 60%)`;
        break;
      case 'music_band': // 円運動（星屑）
        p.angle = Math.random() * Math.PI * 2;
        p.radius = Math.random() * 50 + 50;
        p.cx = this.canvas.width / 2;
        p.cy = this.canvas.height / 2;
        p.speed = (Math.random() * 0.05 + 0.02) * (Math.random() > 0.5 ? 1 : -1);
        p.lifeDecay = 0.008;
        p.color = `hsl(60, 100%, 70%)`; // 黄色系
        break;
      case 'trickology': // ランダム回転落下
        p.y = -50;
        p.x = Math.random() * this.canvas.width;
        p.vx = (Math.random() - 0.5) * 2;
        p.vy = Math.random() * 2 + 1;
        p.rotation = Math.random() * Math.PI * 2;
        p.vr = (Math.random() - 0.5) * 0.5;
        p.lifeDecay = 0.005;
        break;
      case 'takeover': // 激しい衝突・バウンド
        p.vx = (Math.random() - 0.5) * 10;
        p.vy = (Math.random() - 0.5) * 10;
        p.vr = (Math.random() - 0.5) * 0.5;
        p.lifeDecay = 0.01;
        p.color = `hsl(0, 100%, 60%)`; // 赤系
        break;
      default:
        p.vy = -1;
        p.lifeDecay = 0.01;
    }

    this.particles.push(p);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      switch (p.type) {
        case 'kotaete':
          p.x += p.vx;
          p.y += p.vy;
          p.x += Math.sin(Date.now() / 500 + p.y) * 0.5; // ゆらゆら
          break;
        case 'curtain':
          p.x += p.vx;
          break;
        case 'shutter':
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.vr;
          p.vx *= 0.95; // 減速
          p.vy *= 0.95;
          break;
        case 'music_band':
          p.angle += p.speed;
          p.radius += 0.5;
          p.x = p.cx + Math.cos(p.angle) * p.radius;
          p.y = p.cy + Math.sin(p.angle) * p.radius;
          break;
        case 'trickology':
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.1; // 重力
          p.rotation += p.vr;
          break;
        case 'takeover':
          p.vy += 0.2; // 重力
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.vr;
          // 壁バウンド
          if (p.x < 0 || p.x > this.canvas.width) p.vx *= -0.8;
          if (p.y > this.canvas.height) {
            p.y = this.canvas.height;
            p.vy *= -0.8;
          }
          break;
        default:
          p.x += p.vx; p.y += p.vy;
      }

      p.life -= p.lifeDecay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.font = 'bold 36px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.scale(p.scale, p.scale);
      this.ctx.globalAlpha = Math.max(0, p.life);
      
      // 特殊描画オプション
      if (p.type === 'kotaete') {
        this.ctx.shadowColor = '#fff';
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = p.color;
      } else {
        this.ctx.fillStyle = p.color;
        this.ctx.shadowColor = 'black';
        this.ctx.shadowBlur = 4;
      }
      
      this.ctx.fillText(p.text, 0, 0);
      this.ctx.restore();
    }
  }

  loop(timestamp) {
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    this.animationId = requestAnimationFrame((ts) => this.loop(ts));
  }
}

// グローバルに公開
window.PhysicsEngine = PhysicsEngine;
