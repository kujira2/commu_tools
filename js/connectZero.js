// シリアル通信の基本設定
let baudRate = 9600;
let port = null;
let reader = null;
let writer = null;

// シリアル接続関数
async function connectSerial() {
    try {
        // ポート選択と開放
        port = await navigator.serial.requestPort();
        await port.open({
            baudRate: baudRate,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            flowControl: 'none'
        });

        // リーダーとライターの初期化
        reader = port.readable.getReader();
        writer = port.writable.getWriter();

        // UI状態の更新
        document.getElementById('connectButton').disabled = true;
        document.getElementById('disconnectButton').disabled = false;
        document.getElementById('connectionStatus').textContent = '接続済み';
        document.getElementById('connectionStatus').className = 'status connected';

        // 初期値の読み取り
        await readInitialValues();

        console.log('シリアル接続成功');

    } catch (error) {
        console.error('接続エラー:', error);
        alert('ポート接続に失敗しました');
        await disconnectSerial();
    }
}

// シリアル切断関数
async function disconnectSerial() {
    try {
        if (reader) {
            await reader.cancel();
            await reader.releaseLock();
            reader = null;
        }

        if (writer) {
            await writer.releaseLock();
            writer = null;
        }

        if (port) {
            await port.close();
            port = null;
        }

        // UI状態の更新
        document.getElementById('connectButton').disabled = false;
        document.getElementById('disconnectButton').disabled = true;
        document.getElementById('connectionStatus').textContent = '未接続';
        document.getElementById('connectionStatus').className = 'status disconnected';

        // フルスケール値をリセット
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`id${i}-fullscale`).textContent = '-';
        }

        console.log('シリアル切断完了');

    } catch (error) {
        console.error('切断エラー:', error);
    }
}

// 初期値の読み取り
async function readInitialValues() {
    try {
        // まず全てのフルスケール値をリセット
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`id${i}-fullscale`).textContent = '-';
        }

        // 選択されているデバイスのみ読み取り
        for (let i = 1; i <= 4; i++) {
            const checkbox = document.getElementById(`device${i}Checkbox`);
            if (!checkbox || !checkbox.checked) continue;

            let deviceId;
            switch (i) {
                case 1:
                    deviceId = document.getElementById('settingDeviceId').value;
                    break;
                case 2:
                    deviceId = document.getElementById('displayDeviceId1').value;
                    break;
                case 3:
                    deviceId = document.getElementById('displayDeviceId2').value;
                    break;
                case 4:
                    deviceId = document.getElementById('displayDeviceId3').value;
                    break;
            }

            const cmd = createReadCommand(deviceId, '0000');
            const response = await sendCommand(cmd);
            if (response) {
                const data = parseResponse(response);
                if (data && checkbox.checked) {  // 再度チェック状態を確認
                    document.getElementById(`id${i}-fullscale`).textContent = data.value;
                }
            }
        }
    } catch (error) {
        console.error('初期値読み取りエラー:', error);
    }
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
    // シリアルポートの利用可能性チェック
    if (!('serial' in navigator)) {
        alert('このブラウザはシリアル通信に対応していません。\nChrome/Edge/Operaの最新版をご使用ください。');
        document.getElementById('connectButton').disabled = true;
        return;
    }

    document.getElementById('connectButton').addEventListener('click', connectSerial);
    document.getElementById('disconnectButton').addEventListener('click', disconnectSerial);
});