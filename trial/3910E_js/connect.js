// シリアル接続の切り替え
async function toggleSerialConnection() {
    const connectBtn = document.getElementById('connectBtn');
    
    if (!isConnected) {
        try {
            port = await navigator.serial.requestPort();
            await port.open(serialOptions);
            
            isConnected = true;
            connectBtn.textContent = 'シリアルポート切断';
            connectBtn.classList.remove('disconnected');
            connectBtn.classList.add('connected');
            
            showStatus("シリアルポートに接続しました", "success");
            startReading();
        } catch (err) {
            showStatus("シリアルポート接続エラー: " + err.message, "error");
        }
    } else {
        try {
            isRunning = false;
            isConnected = false;
            isMeasuring = false;

            if (currentReader) {
                await currentReader.cancel();
                currentReader = null;
            }

            if (port) {
                await port.close();
                port = null;
            }
            
            connectBtn.textContent = 'シリアルポート接続';
            connectBtn.classList.remove('connected');
            connectBtn.classList.add('disconnected');
            
            clearAllGraphs();
            
            showStatus("シリアルポートを切断しました", "success");
        } catch (err) {
            showStatus("シリアルポート切断エラー: " + err.message, "error");
        }
    }
}

// シリアルデータの受信処理
async function startReading() {
    while (port && port.readable && isConnected) {
        try {
            currentReader = port.readable.getReader();
            try {
                while (true) {
                    const { value, done } = await currentReader.read();
                    if (done || !isConnected) {
                        break;
                    }
                    processReceivedData(value);
                }
            } finally {
                currentReader.releaseLock();
            }
        } catch (err) {
            if (isConnected) {
                showStatus("データ受信エラー: " + err.message, "error");
            }
        }
        
        if (!isConnected) {
            break;
        }
    }
}

// データ送信
async function sendSerialData(data) {
    if (!port || !port.writable || !isConnected) {
        showStatus("シリアルポートが接続されていません", "error");
        return;
    }

    const writer = port.writable.getWriter();
    try {
        const commandArray = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            commandArray[i] = data.charCodeAt(i);
        }
        await writer.write(commandArray);
    } catch (err) {
        showStatus("送信エラー: " + err.message, "error");
    } finally {
        writer.releaseLock();
    }
}

// 受信データの処理
function processReceivedData(data) {
    const decoder = new TextDecoder();
    receivedBuffer += decoder.decode(data);
    
    while (true) {
        const stxIndex = receivedBuffer.indexOf(String.fromCharCode(0x02));
        if (stxIndex === -1) break;
        
        const etxIndex = receivedBuffer.indexOf(String.fromCharCode(0x03), stxIndex);
        if (etxIndex === -1) break;
        
        const packet = receivedBuffer.substring(stxIndex, etxIndex + 2);
        receivedBuffer = receivedBuffer.substring(etxIndex + 2);

        // センサーデータの更新
        updateSensorData(packet);
    }
}

// グラフのクリア
function clearAllGraphs() {
    for (let line = 1; line <= 5; line++) {
        for (let sensor = 1; sensor <= 10; sensor++) {
            const chartId = `line${line}-sensor${sensor}`;
            const chart = charts[chartId];
            if (chart) {
                chart.data.labels = [];
                chart.data.datasets[0].data = [];
                chart.update();
            }
        }
    }
}

// ステータスメッセージの表示
function showStatus(message, type) {
    const status = document.getElementById('statusMessage');
    status.textContent = message;
    status.className = 'status ' + type;
    setTimeout(() => {
        status.textContent = '';
        status.className = 'status';
    }, 3000);
}