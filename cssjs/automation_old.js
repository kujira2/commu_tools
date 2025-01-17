// グローバル変数
let isRunning = false;
let currentRow = 0;
let totalTime = 0;
let progressInterval = null;

// 移動平均計算用の配列
let movingAverageData1 = [];
let movingAverageData2 = [];
const MOVING_AVERAGE_SIZE = 16;

// HTML要素の作成と追加
function createAutomationUI() {
    const controlPanel = document.querySelector('.control-panel');
    
    // 自動化設定テーブルの作成
    const tableDiv = document.createElement('div');
    tableDiv.innerHTML = `
        <h3>自動化設定</h3>
        <table id="automationTable" style="width: 100%; margin-bottom: 10px;">
            <thead>
                <tr>
                    <th>設定値 (%)</th>
                    <th>時間 (秒)</th>
                    <th>設定器出力 (V)</th>
                    <th>表示器出力 (V)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><input type="number" min="0" max="100" step="0.1" class="percent-input"></td>
                    <td><input type="number" min="1" max="120" class="time-input"></td>
                    <td><input type="number" disabled></td>
                    <td><input type="number" disabled></td>
                </tr>
            </tbody>
        </table>
        <button id="addRow">行追加</button>
        <button id="startAutomation">開始</button>
        <div id="progressBar" style="margin-top: 10px;">
            <div style="width: 100%; background-color: #f0f0f0; height: 20px; border-radius: 10px;">
                <div id="progress" style="width: 0%; background-color: #4CAF50; height: 20px; border-radius: 10px; transition: width 0.5s;"></div>
            </div>
            <div id="progressText" style="text-align: center;">0%</div>
        </div>
    `;
    controlPanel.appendChild(tableDiv);

    // イベントリスナーの追加
    document.getElementById('addRow').addEventListener('click', addNewRow);
    document.getElementById('startAutomation').addEventListener('click', toggleAutomation);
}

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
        document.getElementById('currentVoltage').textContent = 
            `設定器: ${avg1.toFixed(3)}V / 表示器: ${avg2.toFixed(3)}V`;

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

// DOMContentLoadedイベントでUI初期化
document.addEventListener('DOMContentLoaded', createAutomationUI);
