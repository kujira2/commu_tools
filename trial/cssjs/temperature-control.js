// temperature-control.js
import { ModbusCommands } from './modbus-commands.js';
import { writer, reader } from './connect.js';

// グローバル変数
let tempReadInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    // 各ボタンのイベントリスナー設定
    document.getElementById('modeButton').addEventListener('click', setOperationMode);
    document.getElementById('controlButton').addEventListener('click', setControlMode);
    document.getElementById('setTempButton').addEventListener('click', setTemperature);
    document.getElementById('return25').addEventListener('click', returnTo25);
});

// 定値運転モード設定
async function setOperationMode() {
    try {
        const cmd = ModbusCommands.createControlCommand(true).write46001;
        await writer.write(cmd);
        // レスポンスの読み取りを追加
        const response = await reader.read();
        if (response.value[1] === 0x06) {  // 正常応答確認
            const button = document.getElementById('modeButton');
            button.classList.remove('mode-off');
            button.classList.add('mode-on');
            button.textContent = '定値運転中';
            document.getElementById('controlButton').disabled = false;
        }
    } catch (error) {
        console.error('モード設定エラー:', error);
    }
}

// 運転ON/OFF制御
async function setControlMode() {
    try {
        const button = document.getElementById('controlButton');
        const isOn = !button.classList.contains('control-on');
        const cmd = ModbusCommands.createControlCommand(isOn).write46002;
        await writer.write(cmd);

        if (isOn) {
            button.classList.remove('control-off');
            button.classList.add('control-on');
            button.textContent = '運転\nON';
        } else {
            button.classList.remove('control-on');
            button.classList.add('control-off');
            button.textContent = '運転\nOFF';
        }
    } catch (error) {
        console.error('運転制御エラー:', error);
    }
}

// 温度設定
async function setTemperature() {
    try {
        const temp = parseFloat(document.getElementById('tempValue').value);
        if (isNaN(temp) || temp < 0 || temp > 60) {
            alert('温度は0-60℃の範囲で入力してください');
            return;
        }
        const cmd = ModbusCommands.createSetTempCommand(temp);
        await writer.write(cmd);
    } catch (error) {
        console.error('温度設定エラー:', error);
    }
}

// 25℃復帰
async function returnTo25() {
    try {
        const cmd = ModbusCommands.createSetTempCommand(25.0);
        await writer.write(cmd);
        document.getElementById('tempValue').value = '25.0';
    } catch (error) {
        console.error('温度設定エラー:', error);
    }
}

// 温度読み取り
async function readTemperature() {
    try {
        const cmd = ModbusCommands.createReadTempCommand();
        await writer.write(cmd);
        const { value } = await reader.read();
        if (value) {
            const temp = parseFloat(value) / 10;
            document.getElementById('currentTemp').textContent = `${temp.toFixed(1)} ℃`;
        }
    } catch (error) {
        console.error('温度読み取りエラー:', error);
    }
}

// 接続時の初期化
function initializeTemperatureControl() {
    if (tempReadInterval) clearInterval(tempReadInterval);
    tempReadInterval = setInterval(readTemperature, 1000);
    document.getElementById('setTempButton').disabled = false;
    document.getElementById('modeButton').disabled = false;
    document.getElementById('controlButton').disabled = false;
    document.getElementById('return25').disabled = false;
}

// 切断時のクリーンアップ
function cleanupTemperatureControl() {
    if (tempReadInterval) clearInterval(tempReadInterval);
    document.getElementById('setTempButton').disabled = true;
    document.getElementById('modeButton').disabled = true;
    document.getElementById('controlButton').disabled = true;
    document.getElementById('return25').disabled = true;
    document.getElementById('currentTemp').textContent = '-- ℃';
}