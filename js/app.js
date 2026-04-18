const APP_TOKEN = 'E4RH3ltohJZbRdeK'; // TextAlive App Token

const SONGS = [
  { key: 'kotaete', url: 'https://piapro.jp/t/6W2N' },
  { key: 'curtain', url: 'https://piapro.jp/t/zoqO' },
  { key: 'shutter', url: 'https://piapro.jp/t/PNpQ' },
  { key: 'music_band', url: 'https://piapro.jp/t/B3yJ' },
  { key: 'trickology', url: 'https://piapro.jp/t/QBdL' },
  { key: 'takeover', url: 'https://piapro.jp/t/E2i3' }
];

class RhythmRoastApp {
  constructor() {
    this.player = null;
    this.physics = new window.PhysicsEngine('physics-canvas');
    this.scenarioData = null;
    this.currentSongParams = null;
    this.currentDialogues = null;
    this.lastChar = null;
    this.isChorus = false;

    // DOM要素
    this.mikuImg = document.getElementById('miku-img');
    this.msgText = document.getElementById('msg-text');
    this.playBtn = document.getElementById('play-btn');
    this.pauseBtn = document.getElementById('pause-btn');
    this.stopBtn = document.getElementById('stop-btn');
    this.startBtn = document.getElementById('start-btn');
    this.progressFill = document.getElementById('progress-fill');
    this.songTitle = document.getElementById('current-song-title');
    this.songArtist = document.getElementById('current-song-artist');

    this.init();
  }

  async init() {
    try {
      // シナリオの読み込み
      const res = await fetch('js/scenario.json');
      this.scenarioData = await res.json();
      this.setupTextAlive();
    } catch (e) {
      document.getElementById('loading-msg').innerText = 'シミュレーション用のシナリオ読み込みに失敗しました。';
      console.error(e);
    }
  }

  setupTextAlive() {
    // 認証トークンのフォールバック処理を含めたPlayer初期化
    const playerOptions = {
      app: {
        appAuthor: "AI Developer",
        appName: "#39C5BB Cafe Time",
        appToken: APP_TOKEN,
        token: APP_TOKEN
      },
      mediaElement: document.getElementById('player-controls')
    };

    this.player = new TextAliveApp.Player(playerOptions);

    this.player.addListener({
      onAppReady: (app) => {
        console.log('onAppReady', app);
        if (!app.managed) {
          this.loadSong();
        }
      },
      onVideoReady: (v) => {
        console.log('onVideoReady', v);
        document.getElementById('loading-msg').innerText = 'Ready!';
        this.startBtn.style.display = 'inline-block';
        this.songTitle.innerText = this.player.data.song.name;
        this.songArtist.innerText = this.player.data.song.artist.name;
      },
      onTimerReady: (t) => {
        console.log('onTimerReady', t);
      },
      onAppError: (e) => {
        console.error('onAppError', e);
        document.getElementById('loading-msg').innerText = 'Error loading song! Check console.';
      },
      onTimeUpdate: (position) => this.onTimeUpdate(position),
      onPlay: () => {
        this.changeMikuState('normal');
        this.showMessage(this.currentDialogues.playing);
      },
      onPause: () => {
        this.showMessage("……お待ちどうさま。ゆっくりしてってね。");
      },
      onStop: () => {
        this.showMessage(this.currentDialogues.closing);
        this.physics.clear();
      }
    });

    this.bindEvents();
  }

  loadSong(forcedKey = null) {
    let song;
    if (forcedKey) {
      song = SONGS.find(s => s.key === forcedKey) || SONGS[0];
    } else {
      song = SONGS[Math.floor(Math.random() * SONGS.length)];
    }
    this.currentSongParams = song;
    
    // シナリオパターンの抽選（1〜3）
    const patterns = this.scenarioData[song.key];
    const patternIndex = Math.floor(Math.random() * patterns.length);
    this.currentDialogues = patterns[patternIndex];

    // パターン番号に応じて背景時間を切り替え（0: 昼, 1: 夕方, 2: 夜）
    const bgApp = document.getElementById('app');
    if (patternIndex === 0) {
      bgApp.style.backgroundImage = "url('assets/images/bg_cafe.jpg')";
    } else if (patternIndex === 1) {
      bgApp.style.backgroundImage = "url('assets/images/bg_cafe_evening.jpg')";
    } else {
      bgApp.style.backgroundImage = "url('assets/images/bg_cafe_night.jpg')";
    }

    document.getElementById('loading-msg').innerText = 'Loading Song...';
    this.player.createFromSongUrl(song.url);
    this.physics.clear();

    // 4種類のミク画像からランダムで1つ選択
    this.currentMikuId = Math.floor(Math.random() * 4) + 1;
    
    // 画像初期化
    this.changeMikuState('normal');

    // フォールバック制御：TextAlive APIがURL判定でブロックして進まない場合、4秒後に強制的にUIを開放する
    setTimeout(() => {
      if (document.getElementById('splash-screen').classList.contains('active') && 
          document.getElementById('loading-msg').innerText === 'Loading Song...') {
        document.getElementById('loading-msg').innerText = 'API Timeout - Test Mode';
        this.startBtn.style.display = 'inline-block';
        this.songTitle.innerText = "Demo Track (UI Preview)";
        this.songArtist.innerText = "-";
      }
    }, 4000);
  }

  changeMikuState(state) {
    if (!this.currentSongParams || !this.currentMikuId) return;
    
    // 曲依存ではなく、ランダムで選ばれた 1.png 〜 4.png を使用する
    const path = `assets/images/miku/${this.currentMikuId}.png`;
    this.mikuImg.src = path;
    
    // サビや特別な状態のときは bounce クラスをつけてCSSアニメーションさせるようにする
    if (state === 'smile' || state === 'special') {
      this.mikuImg.classList.add('bounce');
    } else {
      this.mikuImg.classList.remove('bounce');
    }

    this.mikuImg.onerror = () => {
      this.mikuImg.classList.add('placeholder');
      this.mikuImg.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; // 1px transparent
    };
    this.mikuImg.onload = () => {
      if (this.mikuImg.src.indexOf('data:image') === -1) {
        this.mikuImg.classList.remove('placeholder');
      }
    };
  }


  showMessage(text) {
    this.msgText.innerHTML = '';
    // 簡単な文字送り演出
    let i = 0;
    const typeWriter = setInterval(() => {
      if (i < text.length) {
        this.msgText.innerHTML += text.charAt(i);
        i++;
      } else {
        clearInterval(typeWriter);
      }
    }, 40); // 40msごとの描画
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => {
      document.getElementById('splash-screen').classList.remove('active');
      document.getElementById('cafe-screen').classList.add('active');
      this.showMessage(this.currentDialogues.enter);
      this.physics.start();
      
      // 入店時に音楽を自動再生
      if (this.player && this.player.video) {
        this.player.requestPlay();
      }

      // 入店時はspecialなイメージにしてみる
      this.changeMikuState('special');
      setTimeout(() => this.changeMikuState('normal'), 3000);
    });

    this.playBtn.addEventListener('click', () => {
      if (this.player && this.player.video) {
        this.player.requestPlay();
      }
    });

    this.pauseBtn.addEventListener('click', () => {
      if (this.player && this.player.isPlaying) {
        this.player.requestPause();
      }
    });

    this.stopBtn.addEventListener('click', () => {
      if (this.player) {
        this.player.requestStop();
        this.loadSong();
      }
    });

    // ジュークボックス関連ボタン
    const jukeboxBtn = document.getElementById('jukebox-btn');
    const jukeboxModal = document.getElementById('jukebox-modal');
    const closeJukeboxBtn = document.getElementById('close-jukebox-btn');
    const songListItems = document.querySelectorAll('#song-list li');

    if (jukeboxBtn) {
      jukeboxBtn.addEventListener('click', () => {
        jukeboxModal.classList.add('active');
      });
    }

    if (closeJukeboxBtn) {
      closeJukeboxBtn.addEventListener('click', () => {
        jukeboxModal.classList.remove('active');
      });
    }

    if (songListItems) {
      songListItems.forEach(item => {
        item.addEventListener('click', () => {
          const key = item.getAttribute('data-key');
          jukeboxModal.classList.remove('active');
          if (this.player && this.player.isPlaying) {
            this.player.requestStop();
          }
          this.loadSong(key);
          
          // 曲変更後に自動再生をリクエストする（TextAliveの仕様上、少し待機してから発火させるのが安全）
          setTimeout(() => {
            if (this.player) this.player.requestPlay();
          }, 600);
        });
      });
    }
  }

  onTimeUpdate(position) {
    if (!this.player.video) return;

    // プログレスバー更新
    const duration = this.player.video.duration;
    this.progressFill.style.width = `${(position / duration) * 100}%`;

    // サビ検知
    const chorus = this.player.findChorus(position);
    if (chorus && !this.isChorus) {
      this.isChorus = true;
      this.changeMikuState('smile');
    } else if (!chorus && this.isChorus) {
      this.isChorus = false;
      this.changeMikuState('normal');
    }

    // 文字単位の検知と物理エンジンへの登録
    // loose: trueで現在再生中の文字を取得
    let char = this.player.video.findChar(position, { loose: true });
    if (char && char !== this.lastChar) {
      this.lastChar = char;
      
      // サビの間だけ物理演算を発生させる (あるいは全編でも良いが要件に沿って)
      if (this.isChorus) {
        // TextAliveの発声タイミングとのずれを100ms以内に抑えるため、即座にPhysics発火
        this.physics.addLyricChars(char, this.currentSongParams.key);
      }
    }
  }
}

// 起動
document.addEventListener('DOMContentLoaded', () => {
  window.appInstance = new RhythmRoastApp();
});
