// デバイスID設定の管理
let settingDeviceId = '1';
let displayDeviceId = '2';

// 入力値の検証
function validateDeviceId(input) {
    // ... (既存のvalidateDeviceId関数)
}

// デバイスID設定の保存
function saveDeviceSettings() {
    // ... (既存のsaveDeviceSettings関数)
}

// デバイスIDを取得する関数（他のJSファイルから使用）
function getSettingDeviceId() {
    return settingDeviceId;
}

function getDisplayDeviceId() {
    return displayDeviceId;
}

// DOMContentLoadedイベントでイベントリスナーを設定
document.addEventListener('DOMContentLoaded', () => {
    // ... (既存のイベントリスナー設定)
});