import { ModbusCommands } from './modbus-commands.js';
// シリアル通信の基本設定
let baudRate = 9600;
let port = null;
let reader = null;
let writer = null;

// シリアル接続関数
async function connectSerial() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            flowControl: 'none'
        });

        reader = port.readable.getReader();
        writer = port.writable.getWriter();

        // UI状態の更新
        document.getElementById('connectButton').disabled = true;
        document.getElementById('disconnectButton').disabled = false;
        document.getElementById('writeButton').disabled = false;
        document.getElementById('setTempButton').disabled = false;
        document.getElementById('modeButton').disabled = false;
        document.getElementById('controlButton').disabled = false;
        document.getElementById('return25').disabled = false;
        document.getElementById('connectionStatus').textContent = '接続済み';
        document.getElementById('connectionStatus').className = 'status connected';

        // 初期値の読み取り
        await readInitialValues();
        startContinuousReading();

        console.log('シリアル接続成功');

    } catch (error) {
        console.error('接続エラー:', error);
        alert('ポート接続に失敗しました');
        await disconnectSerial();
    }
}

// 継続的な読み取り処理を追加
let isReading = false;
async function startContinuousReading() {
    isReading = true;
    while (isReading && reader) {
        try {
            // CR-400の値を読み取り
            await readFlowValues();

            // 温度値を読み取り
            const tempCmd = ModbusCommands.createReadTempCommand();
            await writer.write(tempCmd);
            const tempResponse = await reader.read();
            if (tempResponse.value) {
                const temp = parseFloat(tempResponse.value) / 10;
                document.getElementById('currentTemp').textContent = `${temp.toFixed(1)} ℃`;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('読み取りエラー:', error);
            break;
        }
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
        document.getElementById('writeButton').disabled = true;
        document.getElementById('connectionStatus').textContent = '未接続';
        document.getElementById('connectionStatus').className = 'status disconnected';

        console.log('シリアル切断完了');

    } catch (error) {
        console.error('切断エラー:', error);
    }
}

// 初期値の読み取り
async function readInitialValues() {
    try {
        const settingDeviceId = document.getElementById('settingDeviceId').value;
        const displayDeviceId = document.getElementById('displayDeviceId').value;

        // 設定器の読み取り
        const cmd1 = createReadCommand(settingDeviceId, '0000');
        const response1 = await sendCommand(cmd1);
        if (response1) {
            const data1 = parseResponse(response1);
            if (data1) {
                document.getElementById('id1-fullscale').textContent = data1.value;
            }
        }

        // 表示器の読み取り
        const cmd2 = createReadCommand(displayDeviceId, '0000');
        const response2 = await sendCommand(cmd2);
        if (response2) {
            const data2 = parseResponse(response2);
            if (data2) {
                document.getElementById('id2-fullscale').textContent = data2.value;
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

// readFlowValues関数の追加
async function readFlowValues() {
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
        document.getElementById('currentVoltage1').textContent = `${(data1.value / 1000).toFixed(3)} [V]`;
        document.getElementById('currentVoltage2').textContent = `${(data2.value / 1000).toFixed(3)} [V]`;
    }
}