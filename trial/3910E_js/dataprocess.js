// 温度設定
async function setTemperature() {
    const temp = parseFloat(document.getElementById('tempInput').value);
    if (isNaN(temp)) {
        showStatus("無効な温度値です", "error");
        return;
    }
    try {
        const command = `15:ConstOpe T${temp.toFixed(1)}`;
        await sendSerialData(String.fromCharCode(0x02) + command + String.fromCharCode(0x03));
        showStatus(`温度を${temp}°Cに設定しました`, "success");
    } catch (error) {
        showStatus("温度設定エラー: " + error.message, "error");
    }
}

// 測定の開始/停止
async function toggleMeasurement() {
    const measureBtn = document.getElementById('measureBtn');
    
    if (!isMeasuring) {
        // 選択されているLineがあるか確認
        let hasSelectedLine = false;
        for (let line = 1; line <= 5; line++) {
            const checkbox = document.getElementById(`line-${line}`);
            if (checkbox && checkbox.checked) {
                hasSelectedLine = true;
                break;
            }
        }

        if (!hasSelectedLine) {
            showStatus("Lineを1つ以上選択してください", "error");
            return;
        }

        // 測定開始
        isMeasuring = true;
        isRunning = true;
        measureBtn.textContent = '測定停止';
        measureBtn.classList.add('active');
        updateData();
        showStatus("測定を開始しました", "success");
    } else {
        // 測定停止
        isMeasuring = false;
        isRunning = false;
        measureBtn.textContent = '測定開始';
        measureBtn.classList.remove('active');
        showStatus("測定を停止しました", "success");
    }
}

// データ更新
async function updateData() {
    if (!isRunning || !isMeasuring) return;

    try {
        // 選択されているLineのデータを取得
        for (let line = 1; line <= 5; line++) {
            const checkbox = document.getElementById(`line-${line}`);
            if (checkbox && checkbox.checked) {
                const command = `${line.toString().padStart(2, '0')}:Sensor`;
                await sendSerialData(String.fromCharCode(0x02) + command + String.fromCharCode(0x03));
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    } catch (err) {
        console.error("データ更新エラー:", err);
    }

    // 次回の更新をスケジュール
    setTimeout(updateData, measurementInterval * 1000);
}

// センサーデータの更新
function updateSensorData(packet) {
    const command = packet.substring(1, packet.length - 2); // STXとETX、BCCを除去
    const [id, content] = command.split(':');
    const line = parseInt(id);

    if (!isNaN(line) && line >= 1 && line <= 5 && content.length >= 14) {
        const time = new Date().toLocaleTimeString();
        let pos = 14; // センサーデータの開始位置

        for (let sensor = 1; sensor <= 10; sensor++) {
            if (pos + 4 > content.length) break;

            try {
                let vo = 0;
                vo = (atoh(content[pos]) << 12) +
                     (atoh(content[pos + 1]) << 8) +
                     (atoh(content[pos + 2]) << 4) +
                     atoh(content[pos + 3]);

                const chartId = `line${line}-sensor${sensor}`;
                const chart = charts[chartId];
                if (chart) {
                    chart.data.labels.push(time);
                    chart.data.datasets[0].data.push(vo);
                    
                    if (chart.data.labels.length > 30) {
                        chart.data.labels.shift();
                        chart.data.datasets[0].data.shift();
                    }
                    
                    chart.update();
                }

                pos += 12; // 次のセンサーデータへ
            } catch (err) {
                console.error(`Error processing data for Line ${line} Sensor ${sensor}:`, err);
            }
        }
    }
}

// 初期化時の実行
window.onload = function() {
    initialize();
};