export class SerialConnection {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.monitor = null;
    }

    setMonitor(monitor) {
        this.monitor = monitor;
    }

    async connect() {
        try {
            if (this.port) {
                await this.disconnect();
                return false;
            }

            const baudRate = parseInt(document.getElementById('baudRate').value);
            const parity = document.getElementById('parity').value;

            this.port = await navigator.serial.requestPort();
            await this.port.open({
                baudRate: baudRate,
                dataBits: 8,
                stopBits: 1,
                parity: parity,
                bufferSize: 255
            });

            this.reader = this.port.readable.getReader();
            this.writer = this.port.writable.getWriter();
            return true;
        } catch (error) {
            console.error('Connection error:', error);
            if (this.monitor) {
                this.monitor.addErrorLog(error);
            }
            return false;
        }
    }

    async disconnect() {
        try {
            if (this.reader) {
                await this.reader.cancel();
                await this.reader.releaseLock();
            }
            if (this.writer) {
                await this.writer.close();
                await this.writer.releaseLock();
            }
            if (this.port) {
                await this.port.close();
            }
        } finally {
            this.port = null;
            this.reader = null;
            this.writer = null;
        }
    }

    async readResponse() {
        if (!this.reader) return null;
        try {
            const response = [];
            let timeout = setTimeout(() => {
                this.reader.cancel();
            }, 1000);

            while (true) {
                const { value, done } = await this.reader.read();
                if (done) break;
                response.push(...value);
                if (response.length >= 3 && response.length >= response[2] + 5) {
                    break;
                }
            }
            clearTimeout(timeout);
            return new Uint8Array(response);
        } catch (error) {
            console.error('Read response error:', error);
            if (this.monitor) {
                this.monitor.addErrorLog(error);
            }
            return null;
        }
    }

    async sendCommand(command) {
        if (!this.writer) return null;
        try {
            if (this.monitor) {
                this.monitor.addLogEntry('send', command, this.getCommandDescription(command));
            }
            await this.writer.write(command);
            const response = await this.readResponse();
            if (response && this.monitor) {
                this.monitor.addLogEntry('receive', response, this.getResponseDescription(response));
            }
            return response;
        } catch (error) {
            console.error('Send command error:', error);
            if (this.monitor) {
                this.monitor.addErrorLog(error);
            }
            return null;
        }
    }

    getCommandDescription(command) {
        if (!command || command.length < 2) return '';
        
        const fc = command[1];
        switch (fc) {
            case 0x01: return 'Read Coil Status';
            case 0x03: 
                const addr = (command[2] << 8) | command[3];
                switch (addr) {
                    case 0x08: return 'Read Decimal Point (40009)';
                    case 0x1B: return 'Read Flow Rate Range (40028)';
                    default: return `Read Holding Registers (${addr + 40001})`;
                }
            case 0x04: return 'Read Flow Rate Output (30001)';
            case 0x06:
                const writeAddr = (command[2] << 8) | command[3];
                const value = (command[4] << 8) | command[5];
                switch (writeAddr) {
                    case 0x1B: return `Write Flow Rate Setpoint (40028): ${value}`;
                    case 0x1C: return `Write Control Mode (40029): ${value}`;
                    default: return `Write Single Register (${writeAddr + 40001}): ${value}`;
                }
            default: return '';
        }
    }

    getResponseDescription(response) {
        if (!response || response.length < 3) return '';
        
        const fc = response[1];
        switch (fc) {
            case 0x01: {
                const data = response[3];
                return `Coil Status: ${data.toString(2).padStart(8, '0')}`;
            }
            case 0x03:
            case 0x04: {
                const value = (response[3] << 8) | response[4];
                return `Value: ${value}`;
            }
            case 0x06: {
                const value = (response[4] << 8) | response[5];
                return `Written Value: ${value}`;
            }
            default: return '';
        }
    }

    isConnected() {
        return this.port !== null;
    }
}