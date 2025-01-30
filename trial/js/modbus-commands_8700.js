export class ModbusCommands {
    // 既存のメソッド
    static calculateCRC(data, length) {
        let crc = 0xFFFF;
        for (let i = 0; i < length; i++) {
            crc ^= data[i];
            for (let j = 0; j < 8; j++) {
                if (crc & 0x0001) {
                    crc = (crc >> 1) ^ 0xA001;
                } else {
                    crc = crc >> 1;
                }
            }
        }
        return [crc & 0xFF, (crc >> 8) & 0xFF];
    }

    static createCommand(command, deviceId = 1) {
        // デバイスIDを置き換える
        command[0] = deviceId;
        const crc = this.calculateCRC(command, command.length - 2);
        command[command.length - 2] = crc[0];
        command[command.length - 1] = crc[1];
        return command;
    }

    // Read Coil Status (FC01)
    static createReadCoilStatus() {
        const deviceId = parseInt(document.getElementById('deviceId').value) || 1;
        const data = new Uint8Array([
            deviceId,    // デバイスID（可変）
            0x01,       // ファンクションコード
            0x00, 0x00, // 開始アドレス
            0x00, 0x06, // レジスタ数
            0x00, 0x00  // CRCのためのプレースホルダー
        ]);
        return this.createCommand(data);
    }

    // Read Flow Rate Output (30001)
    static createReadFlowRateOutput() {
        const deviceId = parseInt(document.getElementById('deviceId').value) || 1;
        const data = new Uint8Array([
            deviceId,    // デバイスID（可変）
            0x04,       // ファンクションコード
            0x00, 0x00, // リファレンス番号
            0x00, 0x01, // レジスタ数
            0x00, 0x00  // CRCのためのプレースホルダー
        ]);
        return this.createCommand(data);
    }

    // Read Flow Rate Range (40028)
    static createReadFlowRateRange() {
        const deviceId = parseInt(document.getElementById('deviceId').value) || 1;
        const data = new Uint8Array([
            deviceId,    // デバイスID（可変）
            0x03,       // ファンクションコード (Read Holding Registers)
            0x00, 0x1B, // リファレンス番号 40028
            0x00, 0x01  // レジスタ数
            0x00, 0x00  // CRCのためのプレースホルダー
        ]);
        return this.createCommand(data);
    }

    // Read Decimal Point Position (40009)
    static createReadDecimalPoint() {
        const deviceId = parseInt(document.getElementById('deviceId').value) || 1;
        const data = new Uint8Array([
            deviceId,    // デバイスID（可変）
            0x03,       // ファンクションコード (Read Holding Registers)
            0x00, 0x08, // リファレンス番号 40009
            0x00, 0x01  // レジスタ数
            0x00, 0x00  // CRCのためのプレースホルダー
        ]);
        return this.createCommand(data);
    }

    // Write Flow Rate(40022)
    static createWriteFlowRateSetpoint(value) {
        const deviceId = parseInt(document.getElementById('deviceId').value) || 1;
        const data = new Uint8Array([
            deviceId,    // デバイスID（可変）
            0x06,       // ファンクションコード (Write Single Register)
            0x00, 0x15, // リファレンス番号 40022
            (value >> 8) & 0xFF, value & 0xFF  // 設定値
            0x00, 0x00  // CRCのためのプレースホルダー
        ]);
        return this.createCommand(data);
    }

    // Write Control Mode (40029)
    static createWriteControlMode(mode) {
        const deviceId = parseInt(document.getElementById('deviceId').value) || 1;
        const data = new Uint8Array([
            deviceId,    // デバイスID（可変）
            0x06,       // ファンクションコード (Write Single Register)
            0x00, 0x1C, // リファレンス番号 40029
            0x00, mode  // モード値 (1: control, 2: fullyclosed)
            0x00, 0x00  // CRCのためのプレースホルダー
        ]);
        return this.createCommand([...data, crc[0], crc[1]]);
    }
}
