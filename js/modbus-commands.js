export class ModbusCommands {
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

    static createReadTempCommand() {
        const data = new Uint8Array([
            0x0B,       // スレーブアドレス
            0x04,       // ファンクションコード
            0x00, 0x64, // 開始アドレス (100)
            0x00, 0x02  // レジスタ数
        ]);
        const crc = this.calculateCRC(data, 6);
        return new Uint8Array([...data, crc[0], crc[1]]);
    }

    static createSetTempCommand(temp) {
        const tempValue = Math.round(temp * 10);
        const data = new Uint8Array([
            0x0B,       // スレーブアドレス
            0x06,       // ファンクションコード (Write Single Register)
            0x00, 0x00, // リファレンス番号 40001
            (tempValue >> 8) & 0xFF, tempValue & 0xFF
        ]);
        const crc = this.calculateCRC(data, 6);
        return new Uint8Array([...data, crc[0], crc[1]]);
    }

    static createReadSetpointCommand() {
        const data = new Uint8Array([
            0x0B,       // スレーブアドレス
            0x03,       // ファンクションコード (Read Holding Registers)
            0x00, 0x00, // リファレンス番号 40001
            0x00, 0x01  // レジスタ数
        ]);
        const crc = this.calculateCRC(data, 6);
        return new Uint8Array([...data, crc[0], crc[1]]);
    }

    static createControlCommand(isOn) {
        const data = new Uint8Array([
            0x0B,       // スレーブアドレス
            0x04,       // ファンクションコード
            0x76, 0x6B, // リファレンス番号 30107
            0x00, isOn ? 0x01 : 0x02  // 制御値（ON: 1, OFF: 2）
        ]);
        const crc = this.calculateCRC(data, 6);
        return new Uint8Array([...data, crc[0], crc[1]]);
    }
}
