function resizeBuffer(buffer: ArrayBuffer, newSize: number): ArrayBuffer {
    const newBuffer = new ArrayBuffer(newSize);
    const oldBytes = new Uint8Array(buffer);
    const newBytes = new Uint8Array(newBuffer);
    newBytes.set(oldBytes); // Copy old data to the new buffer
    return newBuffer;
}

/**
 * A dynamically sized buffer
 */
export class DynamicBuffer {
    private buffer: ArrayBuffer;
    private view: DataView;
    private offset: number = 0;

    constructor(initialSize: number = 16) {
        this.buffer = new ArrayBuffer(initialSize);
        this.view = new DataView(this.buffer);
    }

    private ensureCapacity(size: number) {
        if (this.offset + size > this.buffer.byteLength) {
            const newSize = Math.max(this.buffer.byteLength * 2, this.offset + size);
            this.buffer = resizeBuffer(this.buffer, newSize);
            this.view = new DataView(this.buffer);
        }
    }

    writeInt8(value: number) {
        this.ensureCapacity(1);
        this.view.setInt8(this.offset, value);
        this.offset += 1;
    }

    writeUint8(value:number) {
        this.ensureCapacity(1);       
        this.view.setUint8(this.offset, value);
        this.offset += 1;
    }

    writeUint16(value:number) {
        this.ensureCapacity(2);       
        this.view.setUint16(this.offset, value);
        this.offset += 2;
    }

    writeUint32(value:number) {
        this.ensureCapacity(4);       
        this.view.setUint32(this.offset, value);
        this.offset += 4;
    }

    writeChar(value: string) {
        if (value.length !== 1) {
            throw new Error("writeChar expects a single character.");
        }
        this.ensureCapacity(1);
        this.view.setUint8(this.offset, value.charCodeAt(0));
        this.offset += 1;
    }

    writeString(value: string) {
        for (let i = 0; i < value.length; i++) {
            this.writeChar(value[i]);
        }
        this.writeChar('\0'); // Null-terminate the string
    }

    getBuffer(): ArrayBuffer {
        return this.buffer.slice(0, this.offset); // Return only the used portion
    }
}