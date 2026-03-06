/**
 * Intelligent Visual Sketch - app.js
 * リアルタイム・オーディオ・ビジュアライザー
 */

let audioContext;
let analyser;
let source;
let animationId;
let dataArray;

const canvas = document.getElementById('visCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const styleSelect = document.getElementById('styleSelect');
const statusDiv = document.getElementById('status');

// キャンバスのサイズをウィンドウに合わせる
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

/**
 * マイクを開始する
 * iOS Safari対策としてユーザー操作（クリック）内で AudioContext を再開させる
 */
async function startMic() {
    try {
        // AudioContextの初期化
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // iOS対策: ユーザー操作の中で明示的にresumeを呼び出す必要がある
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // マイクストリームの取得
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024; // 解析の解像度

        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        statusDiv.textContent = 'ステータス: 解析中... マイクに向かって音を出してください。';
        startBtn.disabled = true;
        stopBtn.disabled = false;

        // 描画ループ開始
        requestAnimationFrame(draw);
    } catch (err) {
        console.error('マイクのアクセスに失敗しました。', err);
        statusDiv.textContent = 'エラー: マイクにアクセスできませんでした。（HTTPSまたはlocalhostが必要です）';
    }
}

/**
 * マイクを停止する
 */
function stopMic() {
    if (audioContext && audioContext.state !== 'closed') {
        source.disconnect();
        audioContext.close();
        audioContext = null;
    }
    cancelAnimationFrame(animationId);
    statusDiv.textContent = 'ステータス: 停止中';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * 描画ループ関数
 */
function draw() {
    animationId = requestAnimationFrame(draw);
    if (!analyser) return;

    // リアルタイムの周波数データを取得
    analyser.getByteFrequencyData(dataArray);

    const style = styleSelect.value;
    if (style === 'circles') {
        drawCircles();
    } else if (style === 'waves') {
        drawWaves();
    }
}

/**
 * 描画スタイル1: 抽象円 (Abstract Circles)
 */
function drawCircles() {
    const bufferLength = analyser.frequencyBinCount;
    
    // 半透明の黒でクリアして残像を作る
    ctx.fillStyle = 'rgba(17, 17, 17, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const lowEnd = Math.floor(bufferLength * 0.1);
    const midEnd = Math.floor(bufferLength * 0.4);

    let lowEnergy = 0;
    for (let i = 0; i < lowEnd; i++) lowEnergy += dataArray[i];
    lowEnergy /= lowEnd;

    let midEnergy = 0;
    for (let i = lowEnd; i < midEnd; i++) midEnergy += dataArray[i];
    midEnergy /= (midEnd - lowEnd);

    let highEnergy = 0;
    for (let i = midEnd; i < bufferLength; i++) highEnergy += dataArray[i];
    highEnergy /= (bufferLength - midEnd);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // 低音: 赤
    ctx.beginPath();
    ctx.arc(cx - 250, cy, lowEnergy * 1.5 + 20, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(255, 50, 50, ${lowEnergy / 255 + 0.1})`;
    ctx.fill();

    // 中音: 緑
    ctx.beginPath();
    ctx.arc(cx, cy, midEnergy * 1.5 + 20, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(50, 255, 50, ${midEnergy / 255 + 0.1})`;
    ctx.fill();

    // 高音: 青
    ctx.beginPath();
    ctx.arc(cx + 250, cy, highEnergy * 1.5 + 20, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(50, 50, 255, ${highEnergy / 255 + 0.1})`;
    ctx.fill();
}

/**
 * 描画スタイル2: 浮世絵波風 (Ukiyo-e Waves)
 */
function drawWaves() {
    const bufferLength = analyser.frequencyBinCount;
    
    // 背景（和紙のような淡い黄色）
    ctx.fillStyle = '#f7f1e3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const lowEnd = Math.floor(bufferLength * 0.1);
    let lowEnergy = 0;
    for (let i = 0; i < lowEnd; i++) lowEnergy += dataArray[i];
    lowEnergy /= lowEnd;

    const waveHeightBase = canvas.height * 0.3;
    const waveAmplitude = lowEnergy * 1.8 + 30;

    // 波の描画
    ctx.fillStyle = '#114488'; // 藍色
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height - waveHeightBase + Math.sin(x * 0.02 + Date.now() * 0.01) * waveAmplitude;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.fill();

    // 高音のエネルギーを飛沫にする
    const midEnd = Math.floor(bufferLength * 0.4);
    let highEnergy = 0;
    for (let i = midEnd; i < bufferLength; i++) highEnergy += dataArray[i];
    highEnergy /= (bufferLength - midEnd);

    // 飛沫の描画
    const splashCount = Math.floor(highEnergy / 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < splashCount; i++) {
        ctx.beginPath();
        const splashX = Math.random() * canvas.width;
        const splashYBase = canvas.height - waveHeightBase + Math.sin(splashX * 0.02 + Date.now() * 0.01) * waveAmplitude;
        const splashY = splashYBase - Math.random() * 50 - highEnergy * 0.5;
        const splashSize = Math.random() * highEnergy * 0.1 + 3;
        ctx.arc(splashX, splashY, splashSize, 0, 2 * Math.PI);
        ctx.fill();
    }
}

// イベントリスナーの登録
startBtn.addEventListener('click', startMic);
stopBtn.addEventListener('click', stopMic);
