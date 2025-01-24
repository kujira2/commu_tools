// グローバル変数
let voltageReadingInterval = null;

// 文字列と16進数の変換関数
function stringToHex(str) {
    return Array.from(str).map(char => 
        char.charCodeAt(0).toString(16).padStart(2, '0')
    ).join('');
}

function hexToString(hex) {
    const bytes = hex.match(/.{2}/g) || [];
    return bytes.map(byte => String.fromCharCode(parseInt(byte, 16))).join('');
}

function hexToUint8Array(hexString) {
    const pairs = hexString.match(/[\dA-F]{2}/gi);
    return new Uint8Array(pairs.map(pair => parseInt(pair, 16)));
}

// チェックサム計算関数
function calculateChecksum(hexString) {
    let sum = 0;
    for (let i = 0; i < hexString.length; i += 2) {
        sum += parseInt(hexString.substr(i, 2), 16);
    }
    const hexChecksum = (sum & 0xFF).toString(16).padStart(2, '0').toUpperCase();
    return stringToHex(hexChecksum);
}

// コマンド作成関数
function createReadCommand(deviceId, address) {
    const formattedDeviceId = deviceId.toString().padStart(3, '0');
    const formattedAddress = address.toString().padStart(4, '0');
    const cmdStr = `${formattedDeviceId}R${formattedAddress}`;
    const cmdHex = stringToHex(cmdStr);
    const fullCmdHex = `02${cmdHex}03`;
    const checksum = calculateChecksum(fullCmdHex);
    return `${fullCmdHex}${checksum}0D0A`;
}

function createWriteCommand(deviceId, address, value, sign = '+', digits = '4') {
    const formattedDeviceId = deviceId.toString().padStart(3, '0');
    const formattedAddress = address.toString().padStart(4, '0');
    const valueStr = Math.abs(value).toString().padStart(4, '0');
    const cmdStr = `${formattedDeviceId}W${formattedAddress}${sign}${digits}${valueStr}`;
    const cmdHex = stringToHex(cmdStr);
    const fullCmdHex = `02${cmdHex}03`;
    const checksum = calculateChecksum(fullCmdHex);
    return `${fullCmdHex}${checksum}0D0A`;
}

// コマンド送信関数
async function sendCommand(command) {
    if (!writer) return null;

    try {
        const data = hexToUint8Array(command);
        await writer.write(data);

        const response = await readResponse();
        return response;
    } catch (error) {
        console.error('送信エラー:', error);
        return null;
    }
}

// 応答読み取り関数
async function readResponse() {
    if (!reader) return null;

    try {
        const response = [];
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            response.push(...value);
            if (response.length >= 4 && 
                response[response.length - 2] === 0x0D && 
                response[response.length - 1] === 0x0A) {
                break;
            }
        }
        return new Uint8Array(response);
    } catch (error) {
        console.error('応答読み取りエラー:', error);
        return null;
    }
}

// 応答解析関数
function parseResponse(response) {
    if (!response) return null;

    const hexString = Array.from(response)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');

    const asciiString = hexToString(hexString.slice(2, -8));
    const pattern = /(\d{3})([RW])(\d{4})(\d{2})([+-])(\d)(\d+)/;
    const match = asciiString.match(pattern);

    if (!match) return null;

    return {
        deviceId: match[1],
        command: match[2],
        address: match[3],
        status: match[4],
        sign: match[5],
        digits: match[6],
        value: parseInt(match[7]) * (match[5] === '-' ? -1 : 1)
    };
}

// 電圧読み取り開始関数
function startVoltageReading() {
    // 既存のインターバルをクリア
    stopVoltageReading();

    const settingDeviceId = document.getElementById('settingDeviceId').value;
    const displayDeviceId = document.getElementById('displayDeviceId').value;

    // 1秒間隔で電圧読み取り
    voltageReadingInterval = setInterval(async () => {
        try {
            // 設定器の電圧読み取り
            const cmd1 = createReadCommand(settingDeviceId, '1000');
            const response1 = await sendCommand(cmd1);
            const data1 = parseResponse(response1);

            // 表示器の電圧読み取り
            const cmd2 = createReadCommand(displayDeviceId, '1000');
            const response2 = await sendCommand(cmd2);
            const data2 = parseResponse(response2);

            if (data1 && data2) {
                const voltage1 = data1.value / 1000;
                const voltage2 = data2.value / 1000;
                document.getElementById('currentVoltage1').textContent = voltage1.toFixed(3) + " [V]";
                document.getElementById('currentVoltage2').textContent = voltage2.toFixed(3) + " [V]";
            }
        } catch (error) {
            console.error('電圧読み取りエラー:', error);
            stopVoltageReading();
        }
    }, 1000);
}

// 電圧読み取り停止関数
function stopVoltageReading() {
    if (voltageReadingInterval) {
        clearInterval(voltageReadingInterval);
        voltageReadingInterval = null;
    }
    // 電圧表示をリセット
    document.getElementById('currentVoltage1').textContent = "0.000 [V]";
    document.getElementById('currentVoltage2').textContent = "0.000 [V]";
}


// 値書き込み関数
async function writeValue(mode = 'set') {
    try {
        const settingDeviceId = document.getElementById('settingDeviceId').value;

        if (mode === 'close') {
            // 全閉処理: 0100アドレスに2を書き込む
            const cmd = createWriteCommand(settingDeviceId, '0100', 2);
            const response = await sendCommand(cmd);
            if (response) {
                stopVoltageReading();
                document.getElementById('percentInput').value = '';
            } else {
                alert('全閉操作に失敗しました');
            }
            return;  // 全閉処理完了後に関数を終了
        }

        // 通常の流量設定処理
        const percent = parseFloat(document.getElementById('percentInput').value);
        if (isNaN(percent) || percent < 0 || percent > 100.0) {
            alert('0~100.0までの値を入力してください。');
            return;
        }

        const value = Math.round(percent * 5000 / 100);
        const cmd = createWriteCommand(settingDeviceId, '0300', value);
        const response = await sendCommand(cmd);

        if (response) {
            startVoltageReading();
        } else {
            alert('値の書き込みに失敗しました');
        }
    } catch (error) {
        console.error('値書き込みエラー:', error);
        alert('エラーが発生しました');
    }
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
    // 切断時に電圧読み取りを停止
    document.getElementById('disconnectButton').addEventListener('click', stopVoltageReading);
});