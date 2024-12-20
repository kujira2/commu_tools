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

    // Read Coil Status (FC01)
    static createReadCoilStatus() {
        const data = new Uint8Array([
            0x01,       // スレーブアドレス
            0x01,       // ファンクションコード
            0x00, 0x00, // 開始アドレス (00001~00006)
            0x00, 0x06  // レジスタ数 (6個に修正)
        ]);
        const crc = this.calculateCRC(data, 6);
        return new Uint8Array([...data, crc[0], crc[1]]);
    }

    // Read Flow Rate Output (30001)
    static createReadFlowRateOutput() {
        const data = new Uint8Array([
            0x01,       // スレーブアドレス
            0x04,       // ファンクションコード (Read Input Registers)
            0x00, 0x00, // リファレンス番号 30001
            0x00, 0x01  // レジスタ数
        ]);
        return new Uint8Array([...data, 0x31, 0xCA]);
    }

    // Read Flow Rate Range (40028)
    static createReadFlowRateRange() {
        const data = new Uint8Array([
            0x01,       // スレーブアドレス
            0x03,       // ファンクションコード (Read Holding Registers)
            0x00, 0x1B, // リファレンス番号 40028
            0x00, 0x01  // レジスタ数
        ]);
        const crc = this.calculateCRC(data, 6);
        return new Uint8Array([...data, crc[0], crc[1]]);
    }

    // Read Decimal Point Position (40009)
    static createReadDecimalPoint() {
        const data = new Uint8Array([
            0x01,       // スレーブアドレス
            0x03,       // ファンクションコード (Read Holding Registers)
            0x00, 0x08, // リファレンス番号 40009
            0x00, 0x01  // レジスタ数
        ]);
        const crc = this.calculateCRC(data, 6);
        return new Uint8Array([...data, crc[0], crc[1]]);
    }

    // Write Flow Rate Setpoint (40028)
    static createWriteFlowRateSetpoint(value) {
        const data = new Uint8Array([
            0x01,       // スレーブアドレス
            0x06,       // ファンクションコード (Write Single Register)
            0x00, 0x1B, // リファレンス番号 40028
            (value >> 8) & 0xFF, value & 0xFF  // 設定値
        ]);
        const crc = this.calculateCRC(data, 6);
        return new Uint8Array([...data, crc[0], crc[1]]);
    }

    // Write Control Mode (40029)
    static createWriteControlMode(mode) {
        const data = new Uint8Array([
            0x01,       // スレーブアドレス
            0x06,       // ファンクションコード (Write Single Register)
            0x00, 0x1C, // リファレンス番号 40029
            0x00, mode  // モード値 (1: control, 2: fullyclosed)
        ]);
        const crc = this.calculateCRC(data, 6);
        return new Uint8Array([...data, crc[0], crc[1]]);
    }
}