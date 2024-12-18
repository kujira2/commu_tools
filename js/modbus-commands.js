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

    // 制御コマンドを生成（Start/Stop）
    static createControlCommand(isOn) {
        // 46001に0を書き込む
        const writeZeroTo46001 = new Uint8Array([
            0x0B,       // スレーブアドレス
            0x06,       // ファンクションコード (Write Single Register)
            0xB3, 0xB0, // リファレンス番号 46001 (0xB3B0)
            0x00, 0x00  // 値: 0
        ]);
        const crc1 = this.calculateCRC(writeZeroTo46001, 6);
        
        // 46002に制御値を書き込む（Start:1, Stop:0）
        const writeControlTo46002 = new Uint8Array([
            0x0B,       // スレーブアドレス
            0x06,       // ファンクションコード (Write Single Register)
            0xB3, 0xB1, // リファレンス番号 46002 (0xB3B1)
            0x00, isOn ? 0x01 : 0x00  // 値: Start=1, Stop=0
        ]);
        const crc2 = this.calculateCRC(writeControlTo46002, 6);

        // 46001の値を読み取る
        const read46001 = new Uint8Array([
            0x0B,       // スレーブアドレス
            0x03,       // ファンクションコード (Read Holding Registers)
            0xB3, 0xB0, // リファレンス番号 46001
            0x00, 0x01  // レジスタ数: 1
        ]);
        const crc3 = this.calculateCRC(read46001, 6);

        // 46002の値を読み取る
        const read46002 = new Uint8Array([
            0x0B,       // スレーブアドレス
            0x03,       // ファンクションコード (Read Holding Registers)
            0xB3, 0xB1, // リファレンス番号 46002
            0x00, 0x01  // レジスタ数: 1
        ]);
        const crc4 = this.calculateCRC(read46002, 6);

        // すべてのコマンドを結合して返す
        return {
            write46001: new Uint8Array([...writeZeroTo46001, crc1[0], crc1[1]]),
            write46002: new Uint8Array([...writeControlTo46002, crc2[0], crc2[1]]),
            read46001: new Uint8Array([...read46001, crc3[0], crc3[1]]),
            read46002: new Uint8Array([...read46002, crc4[0], crc4[1]])
        };
    }
}
