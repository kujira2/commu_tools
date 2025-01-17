let baudRate = 9600;
let port = null;
let reader = null;
let writer = null;
let isConnecting = false;

// シリアル接続関数
async function connectSerial() {
    if (isConnecting) {
        console.log('既に接続処理中です');
        return;
    }
    isConnecting = true;
    console.log('接続開始');

    try {
        // まず既存の接続をすべて解放
        await forceCloseAllPorts();

        updateConnectionStatus('connecting');

        // ポート選択
        console.log('ポート選択中...');
        port = await navigator.serial.requestPort();

        // 選択されたポートが開いている場合は閉じる
        if (port && port.readable) {
            try {
                await port.close();
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
            } catch (closeError) {
                console.warn('既存ポートのクローズ中にエラー:', closeError);
            }
        }

        console.log('ポート選択完了:', port);

        // ポートオープン前の待機
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機

        // ポート設定
        const portConfig = {
            baudRate: baudRate,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            flowControl: 'none'
        };
        console.log('ポート設定:', portConfig);

        // ポートオープン（リトライ機能付き）
        let retryCount = 3;
        while (retryCount > 0) {
            try {
                await port.open(portConfig);
                console.log('ポートオープン成功');
                break;
            } catch (openError) {
                console.warn(`ポートオープン失敗 (残りリトライ: ${retryCount - 1}):`, openError);
                retryCount--;
                if (retryCount === 0) {
                    throw openError;
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
            }
        }

        // リーダーとライターの設定
        reader = port.readable.getReader();
        writer = port.writable.getWriter();

        // UI更新
        document.getElementById('connectButton').disabled = true;
        document.getElementById('disconnectButton').disabled = false;
        document.getElementById('writeButton').disabled = false;
        updateConnectionStatus('connected');
        console.log('接続完了');

    } catch (error) {
        console.error('接続エラーの詳細:', error);
        let errorMessage = '接続エラー:\n';

        if (error.name) {
            errorMessage += `種類: ${error.name}\n`;
        }
        if (error.message) {
            errorMessage += `内容: ${error.message}\n`;
        }

        alert(errorMessage);
        await disconnectSerial();
    } finally {
        isConnecting = false;
    }
}

// 既存のポートをすべて強制的に閉じる
async function forceCloseAllPorts() {
    try {
        const ports = await navigator.serial.getPorts();
        console.log(`${ports.length}個の既存ポートを検出`);

        for (const p of ports) {
            try {
                if (p.readable) {
                    await p.close();
                    console.log('既存ポートを閉じました');
                }
            } catch (error) {
                console.warn('ポートクローズ中にエラー:', error);
            }
        }
    } catch (error) {
        console.warn('既存ポートの検索中にエラー:', error);
    }
}

// シリアル切断関数
async function disconnectSerial() {
    console.log('切断処理開始');
    try {
        if (reader) {
            try {
                await reader.cancel();
                await reader.releaseLock();
                console.log('Reader解放完了');
            } catch (error) {
                console.error('Reader解放エラー:', error);
            }
            reader = null;
        }

        if (writer) {
            try {
                await writer.releaseLock();
                console.log('Writer解放完了');
            } catch (error) {
                console.error('Writer解放エラー:', error);
            }
            writer = null;
        }

        if (port) {
            try {
                await port.close();
                console.log('ポート終了完了');
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
            } catch (error) {
                console.error('ポート終了エラー:', error);
            }
            port = null;
        }

        // UI更新
        document.getElementById('connectButton').disabled = false;
        document.getElementById('disconnectButton').disabled = true;
        document.getElementById('writeButton').disabled = true;
        updateConnectionStatus('disconnected');
        console.log('切断処理完了');

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
