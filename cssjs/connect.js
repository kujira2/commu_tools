let baudRate = 9600;
let port = null;
let reader = null;
let writer = null;
let isConnecting = false;

// シリアル接続関数
async function connectSerial() {
    if (isConnecting) return;
    isConnecting = true;

    try {
        // 接続状態をUIに反映
        updateConnectionStatus('connecting');

        // ポートの選択と開放
        port = await navigator.serial.requestPort();
        await port.open({
            baudRate: baudRate,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            flowControl: 'none'
        });

        // リーダーとライターの初期化
        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
        const textEncoder = new TextEncoderStream();
        const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);

        reader = port.readable.getReader();
        writer = port.writable.getWriter();

        // 接続成功後のUI更新
        document.getElementById('connectButton').disabled = true;
        document.getElementById('disconnectButton').disabled = false;
        document.getElementById('writeButton').disabled = false;
        updateConnectionStatus('connected');

        // 初期値の読み取り
        await readInitialSettings();

    } catch (error) {
        console.error('接続エラー:', error);
        // エラーメッセージの詳細を表示
        let errorMessage = 'ポート接続に失敗しました。\n';
        if (error.message) {
            errorMessage += `エラー詳細: ${error.message}`;
        }
        alert(errorMessage);

        // エラー時の後処理
        await disconnectSerial();
    } finally {
        isConnecting = false;
    }
}

// シリアル切断関数
async function disconnectSerial() {
    try {
        // 記録停止
        if (typeof stopRecording === 'function') {
            stopRecording();
        }

        // リーダーとライターの解放
        if (reader) {
            try {
                await reader.cancel();
                await reader.releaseLock();
            } catch (error) {
                console.error('Reader解放エラー:', error);
            }
            reader = null;
        }

        if (writer) {
            try {
                await writer.releaseLock();
            } catch (error) {
                console.error('Writer解放エラー:', error);
            }
            writer = null;
        }

        // ポートのクローズ
        if (port) {
            try {
                await port.close();
            } catch (error) {
                console.error('Port終了エラー:', error);
            }
            port = null;
        }

        // UI更新
        document.getElementById('connectButton').disabled = false;
        document.getElementById('disconnectButton').disabled = true;
        document.getElementById('writeButton').disabled = true;
        updateConnectionStatus('disconnected');

    } catch (error) {
        console.error('切断エラー:', error);
    }
}

// 接続状態の更新
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    switch (status) {
        case 'connecting':
            statusElement.textContent = '接続中...';
            statusElement.className = 'status connecting';
            break;
        case 'connected':
            statusElement.textContent = '接続済み';
            statusElement.className = 'status connected';
            break;
        case 'disconnected':
            statusElement.textContent = '未接続';
            statusElement.className = 'status disconnected';
            break;
    }
}

// 初期設定の読み取り
async function readInitialSettings() {
    try {
        // 設定器のFS値読み取り
        const cmd1 = createReadCommand(getSettingDeviceId(), '0000');
        const response1 = await sendCommand(cmd1);
        if (response1) {
            const data1 = parseResponse(response1);
            if (data1) {
                document.getElementById('id1-fullscale').textContent = data1.value;
            }
        }

        // 表示器のFS値読み取り
        const cmd2 = createReadCommand(getDisplayDeviceId(), '0000');
        const response2 = await sendCommand(cmd2);
        if (response2) {
            const data2 = parseResponse(response2);
            if (data2) {
                document.getElementById('id2-fullscale').textContent = data2.value;
            }
        }
    } catch (error) {
        console.error('初期設定読み取りエラー:', error);
    }
}

// シリアルポートが利用可能かチェック
async function checkSerialAvailability() {
    if (!('serial' in navigator)) {
        alert('お使いのブラウザはシリアル通信に対応していません。\nChrome/Edge/Operaの最新版をご使用ください。');
        document.getElementById('connectButton').disabled = true;
        return false;
    }
    return true;
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', async () => {
    // シリアルポートの利用可能性チェック
    await checkSerialAvailability();

    document.getElementById('connectButton').addEventListener('click', connectSerial);
    document.getElementById('disconnectButton').addEventListener('click', disconnectSerial);
});