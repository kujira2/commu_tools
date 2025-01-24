// グローバル変数
let isRunning = false;
let currentRow = 0;
let totalTime = 0;

// 新しい行の追加
function addNewRow() {
    const tbody = document.querySelector('#automationTable tbody');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="text" class="percent-input" maxlength="6"></td>
        <td><input type="text" class="time-input" maxlength="3"></td>
        <td><input type="text" disabled></td>
        <td><input type="text" disabled></td>
    `;
    tbody.appendChild(newRow);
}

// 電圧読み取り関数
async function readVoltage() {
    const settingDeviceId = document.getElementById('settingDeviceId').value;
    const displayDeviceId = document.getElementById('displayDeviceId').value;

    // 設定器の読み取り
    const cmd1 = createReadCommand(settingDeviceId, '1000');
    const response1 = await sendCommand(cmd1);
    const data1 = parseResponse(response1);

    // 表示器の読み取り
    const cmd2 = createReadCommand(displayDeviceId, '1000');
    const response2 = await sendCommand(cmd2);
    const data2 = parseResponse(response2);

    if (data1 && data2) {
        return {
            setting: (data1.value / 1000).toFixed(3),
            display: (data2.value / 1000).toFixed(3)
        };
    }
    return null;
}

// CSV出力機能
function exportTableToCSV() {
    try {
        const rows = document.querySelectorAll('#automationTable tbody tr');
        if (rows.length === 0) {
            alert('エクスポートするデータがありません');
            return;
        }

        // CSVヘッダー
        const csvContent = [
            '設定値(%),待機時間(s),設定器出力(V),表示器出力(V)'
        ];

        // データ行の追加
        rows.forEach(row => {
            const percentValue = row.querySelector('.percent-input').value;
            const timeValue = row.querySelector('.time-input').value;
            const settingOutput = row.querySelectorAll('input[type="text"]:disabled')[0].value;
            const displayOutput = row.querySelectorAll('input[type="text"]:disabled')[1].value;

            csvContent.push(`${percentValue},${timeValue},${settingOutput},${displayOutput}`);
        });

        // CSVファイルの作成と保存
        const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `flow_control_log_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.csv`;
        link.click();

    } catch (error) {
        console.error('CSV出力エラー:', error);
        alert('CSVファイルの出力中にエラーが発生しました');
    }
}

// 自動化の開始/停止
async function toggleAutomation() {
    const startButton = document.getElementById('startAutomation');
    const writeButton = document.getElementById('writeButton');
    const settingDeviceId = document.getElementById('settingDeviceId').value;

    if (!isRunning) {
        // 自動化開始前の入力値チェック
        const rows = document.querySelectorAll('#automationTable tbody tr');
        for (let i = 0; i < rows.length; i++) {
            const percentValue = parseFloat(rows[i].querySelector('.percent-input').value);
            const timeValue = parseInt(rows[i].querySelector('.time-input').value);

            if (isNaN(percentValue) || percentValue < 0 || percentValue > 100 ||
                isNaN(timeValue) || timeValue < 1 || timeValue > 120) {
                alert(`${i + 1}行目の入力値が正しくありません。\n設定値: 0-100%\n待機時間: 1-120秒`);
                return;
            }
        }

        // 自動化開始
        isRunning = true;
        startButton.textContent = '中止';
        writeButton.disabled = true;
        document.getElementById('exportCSV').disabled = true;
        currentRow = 0;
        totalTime = calculateTotalTime();
        await startAutomation();
    } else {
        // 自動化中止
        isRunning = false;
        startButton.textContent = '開始';
        writeButton.disabled = false;
        document.getElementById('exportCSV').disabled = false;
        await sendCommand(createWriteCommand(settingDeviceId, '0100', 2));
        updateProgress(0);
        document.getElementById('progressText').textContent = '0%';
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
    const settingDeviceId = document.getElementById('settingDeviceId').value;

    if (currentRow >= rows.length) {
        // 全行の処理が完了
        await sendCommand(createWriteCommand(settingDeviceId, '0100', 2));
        isRunning = false;
        document.getElementById('startAutomation').textContent = '開始';
        document.getElementById('writeButton').disabled = false;
        document.getElementById('exportCSV').disabled = false;
        updateProgress(100);

        // 完了時にCSV保存を提案
        //if (confirm('測定が完了しました。データをCSVファイルに保存しますか？')) {
        //    exportTableToCSV();
        //}
        return;
    }

    const row = rows[currentRow];
    const percentValue = parseFloat(row.querySelector('.percent-input').value);
    const timeValue = parseInt(row.querySelector('.time-input').value);

    try {
        // 初期化コマンドの送信
        await sendCommand(createWriteCommand(settingDeviceId, '0100', 0));

        // 設定値の送信
        const value = Math.round(percentValue * 5000 / 100);
        await sendCommand(createWriteCommand(settingDeviceId, '0300', value));

        // 指定された待機時間後に電圧値を読み取り
        await new Promise(resolve => {
            setTimeout(async () => {
                const voltages = await readVoltage();
                if (voltages) {
                    const outputs = row.querySelectorAll('input[type="text"]:disabled');
                    outputs[0].value = voltages.setting;
                    outputs[1].value = voltages.display;
                }

                // 進捗更新
                let previousTime = 0;
                for (let i = 0; i < currentRow; i++) {
                    previousTime += parseInt(rows[i].querySelector('.time-input').value) || 0;
                }
                const progress = (previousTime + timeValue) / totalTime * 100;
                updateProgress(progress);

                currentRow++;
                resolve();
            }, timeValue * 1000);  // 指定された待機時間
        });

        // 次の行の処理を開始
        await startAutomation();
    } catch (error) {
        console.error('自動化処理エラー:', error);
        isRunning = false;
        document.getElementById('startAutomation').textContent = '開始';
        document.getElementById('writeButton').disabled = false;
        document.getElementById('exportCSV').disabled = false;
        alert('自動化処理中にエラーが発生しました');
    }
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addRow').addEventListener('click', addNewRow);
    document.getElementById('startAutomation').addEventListener('click', toggleAutomation);
    document.getElementById('exportCSV').addEventListener('click', exportTableToCSV);
});