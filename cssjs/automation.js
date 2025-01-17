// グローバル変数
let isRunning = false;
let currentRow = 0;
let totalTime = 0;
let progressInterval = null;
// デバイスID設定の管理
let settingDeviceId = '1';
let displayDeviceId = '2';

// 入力値の検証
function validateDeviceId(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    if (value === '') value = '0';
    const numValue = parseInt(value);
    if (numValue > 999) value = '999';
    input.value = value;
    return value;
}

// デバイスID設定の保存
function saveDeviceSettings() {
    const settingInput = document.getElementById('settingDeviceId');
    const displayInput = document.getElementById('displayDeviceId');

    settingDeviceId = validateDeviceId(settingInput);
    displayDeviceId = validateDeviceId(displayInput);

    // IDが同じ場合はエラー
    if (settingDeviceId === displayDeviceId) {
        alert('設定器IDと表示器IDは異なる値を設定してください。');
        return;
    }

    alert('デバイスID設定を保存しました。');
}

// 入力イベントの設定
document.addEventListener('DOMContentLoaded', () => {
    const settingInput = document.getElementById('settingDeviceId');
    const displayInput = document.getElementById('displayDeviceId');

    settingInput.addEventListener('input', () => validateDeviceId(settingInput));
    displayInput.addEventListener('input', () => validateDeviceId(displayInput));

    document.getElementById('saveDeviceSettings').addEventListener('click', saveDeviceSettings);

    // 接続状態に応じてID設定の有効/無効を切り替え
    const toggleDeviceSettings = (isConnected) => {
        settingInput.disabled = isConnected;
        displayInput.disabled = isConnected;
        document.getElementById('saveDeviceSettings').disabled = isConnected;
    };

    // 接続ボタンのイベントに連動
    document.getElementById('connectButton').addEventListener('click', () => {
        if (settingDeviceId === displayDeviceId) {
            alert('設定器IDと表示器IDは異なる値を設定してください。');
            return;
        }
        toggleDeviceSettings(true);
    });

    document.getElementById('disconnectButton').addEventListener('click', () => {
        toggleDeviceSettings(false);
    });
});

// デバイスIDを取得する関数（他のJSファイルから使用）
function getSettingDeviceId() {
    return settingDeviceId;
}

function getDisplayDeviceId() {
    return displayDeviceId;
}

// 移動平均計算用の配列
let movingAverageData1 = [];
let movingAverageData2 = [];
const MOVING_AVERAGE_SIZE = 16;

// 新しい行の追加
function addNewRow() {
    const tbody = document.querySelector('#automationTable tbody');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="number" min="0" max="100" step="0.1" class="percent-input"></td>
        <td><input type="number" min="1" max="120" class="time-input"></td>
        <td><input type="number" disabled></td>
        <td><input type="number" disabled></td>
    `;
    tbody.appendChild(newRow);
}

// 移動平均の計算
function calculateMovingAverage(data) {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
}

// 電圧読み取りと移動平均の更新
async function readVoltageWithMovingAverage() {
    // 設定器(ID: 1)の読み取り
    const cmd1 = createReadCommand('1', '1000');
    const response1 = await sendCommand(cmd1);
    const data1 = parseResponse(response1);

    // 表示器(ID: 2)の読み取り
    const cmd2 = createReadCommand('2', '1000');
    const response2 = await sendCommand(cmd2);
    const data2 = parseResponse(response2);

    if (data1 && data2) {
        // 移動平均の更新
        movingAverageData1.push(data1.value / 1000);
        movingAverageData2.push(data2.value / 1000);

        if (movingAverageData1.length > MOVING_AVERAGE_SIZE) {
            movingAverageData1.shift();
        }
        if (movingAverageData2.length > MOVING_AVERAGE_SIZE) {
            movingAverageData2.shift();
        }

        const avg1 = calculateMovingAverage(movingAverageData1);
        const avg2 = calculateMovingAverage(movingAverageData2);

        // 電圧表示の更新
        document.getElementById('currentVoltage1').textContent = `${avg1.toFixed(3)} [V]`;
        document.getElementById('currentVoltage2').textContent = `${avg2.toFixed(3)} [V]`;

        return { avg1, avg2 };
    }
    return null;
}

// 自動化の開始/停止
async function toggleAutomation() {
    const startButton = document.getElementById('startAutomation');
    const writeButton = document.getElementById('writeButton');

    if (!isRunning) {
        // 自動化開始
        isRunning = true;
        startButton.textContent = '中止';
        writeButton.disabled = true;
        currentRow = 0;
        totalTime = calculateTotalTime();
        await startAutomation();
    } else {
        // 自動化中止
        isRunning = false;
        startButton.textContent = '開始';
        writeButton.disabled = false;
        await sendCommand(createWriteCommand('1', '0100', 2));
        clearInterval(progressInterval);
        updateProgress(0);
    }
}

// 合計時間の計算
function calculateTotalTime() {
    const timeInputs = document.querySelectorAll('.time-input');
    return Array.from(timeInputs).reduce((total, input) => {
        return total + (parseInt(input.value) || 0);
    }, 0);
}

// 進捗の更新
function updateProgress(percent) {
    document.getElementById('progress').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = `${percent.toFixed(1)}%`;
}

// 自動化のメイン処理
async function startAutomation() {
    if (!isRunning) return;

    const rows = document.querySelectorAll('#automationTable tbody tr');
    if (currentRow >= rows.length) {
        // 全行の処理が完了
        await sendCommand(createWriteCommand('1', '0100', 2));
        isRunning = false;
        document.getElementById('startAutomation').textContent = '開始';
        document.getElementById('writeButton').disabled = false;
        clearInterval(progressInterval);
        updateProgress(100);
        return;
    }

    const row = rows[currentRow];
    const percentValue = parseFloat(row.querySelector('.percent-input').value);
    const timeValue = parseInt(row.querySelector('.time-input').value);

    if (isNaN(percentValue) || isNaN(timeValue)) {
        alert('設定値または時間が正しく入力されていません。');
        isRunning = false;
        document.getElementById('startAutomation').textContent = '開始';
        document.getElementById('writeButton').disabled = false;
        return;
    }

    // 初期化コマンドの送信
    await sendCommand(createWriteCommand('1', '0100', 0));

    // 設定値の送信
    const value = Math.round(percentValue * 5000 / 100);
    await sendCommand(createWriteCommand('1', '0300', value));

    // 指定時間の計測と電圧読み取り
    let elapsedTime = 0;
    const measurementInterval = setInterval(async () => {
        if (!isRunning) {
            clearInterval(measurementInterval);
            return;
        }

        const voltages = await readVoltageWithMovingAverage();
        if (voltages) {
            const outputs = row.querySelectorAll('input[type="number"]:disabled');
            outputs[0].value = voltages.avg1.toFixed(3);
            outputs[1].value = voltages.avg2.toFixed(3);
        }
    }, 1);

    // 進捗表示の更新
    let previousTime = 0;
    for (let i = 0; i < currentRow; i++) {
        previousTime += parseInt(rows[i].querySelector('.time-input').value) || 0;
    }

    await new Promise(resolve => {
        setTimeout(() => {
            clearInterval(measurementInterval);
            currentRow++;
            const progress = (previousTime + timeValue) / totalTime * 100;
            updateProgress(progress);
            resolve();
        }, timeValue * 1000);
    });

    // 次の行の処理を開始
    await startAutomation();
}

// DOMContentLoadedイベントでイベントリスナーを設定
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addRow').addEventListener('click', addNewRow);
    document.getElementById('startAutomation').addEventListener('click', toggleAutomation);
});
