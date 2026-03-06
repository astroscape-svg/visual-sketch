/**
 * デバッグ強化版 app.js
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

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

async function startMic() {
    // 1. 実行されたことを即座に表示
    statusDiv.textContent = 'ステータス: 起動処理中...';
    console.log('Starting Mic...');

    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // 2. マイクの権限取得を試行
        statusDiv.textContent = 'ステータス: マイク許可を待機中...';
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;

        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        // 3. 成功
        statusDiv.textContent = 'ステータス: 解析中！音を出してください。';
        startBtn.disabled = true;
        stopBtn.disabled = false;

        requestAnimationFrame(draw);
    } catch (err) {
        // 4. エラー内容を画面に表示
        console.error(err);
        statusDiv.textContent = `エラー: ${err.name} - ${err.message}`;
    }
}

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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function draw() {
    animationId = requestAnimationFrame(draw);
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    const style = styleSelect.value;
    if (style === 'circles') { drawCircles(); } else if (style === 'waves') { drawWaves(); }
}

function drawCircles() {
    const bufferLength = analyser.frequencyBinCount;
    ctx.fillStyle = 'rgba(17, 17, 17, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const lowEnd = Math.floor(bufferLength * 0.1);
    const midEnd = Math.floor(bufferLength * 0.4);
    let lowEnergy = 0; for (let i = 0; i < lowEnd; i++) lowEnergy += dataArray[i]; lowEnergy /= lowEnd;
    let midEnergy = 0; for (let i = lowEnd; i < midEnd; i++) midEnergy += dataArray[i]; midEnergy /= (midEnd - lowEnd);
    let highEnergy = 0; for (let i = midEnd; i < bufferLength; i++) highEnergy += dataArray[i]; highEnergy /= (bufferLength - midEnd);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.beginPath(); ctx.arc(cx - 250, cy, lowEnergy * 1.5 + 20, 0, 2 * Math.PI); ctx.fillStyle = `rgba(255, 50, 50, ${lowEnergy / 255 + 0.1})`; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, midEnergy * 1.5 + 20, 0, 2 * Math.PI); ctx.fillStyle = `rgba(50, 255, 50, ${midEnergy / 255 + 0.1})`; ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 250, cy, highEnergy * 1.5 + 20, 0, 2 * Math.PI); ctx.fillStyle = `rgba(50, 50, 255, ${highEnergy / 255 + 0.1})`; ctx.fill();
}

function drawWaves() {
    const bufferLength = analyser.frequencyBinCount;
    ctx.fillStyle = '#f7f1e3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const lowEnd = Math.floor(bufferLength * 0.1);
    let lowEnergy = 0; for (let i = 0; i < lowEnd; i++) lowEnergy += dataArray[i]; lowEnergy /= lowEnd;
    const waveHeightBase = canvas.height * 0.3;
    const waveAmplitude = lowEnergy * 1.8 + 30;
    ctx.fillStyle = '#114488';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height - waveHeightBase + Math.sin(x * 0.02 + Date.now() * 0.01) * waveAmplitude;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.fill();
    const midEnd = Math.floor(bufferLength * 0.4);
    let highEnergy = 0; for (let i = midEnd; i < bufferLength; i++) highEnergy += dataArray[i]; highEnergy /= (bufferLength - midEnd);
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

startBtn.addEventListener('click', startMic);
stopBtn.addEventListener('click', stopMic);
