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

    private ensureCapacity(size: number, writeOffset: number) {
        const requiredSize = writeOffset + size;
        if (requiredSize > this.buffer.byteLength) {
            const newSize = Math.max(this.buffer.byteLength * 2, requiredSize);
            const newBuffer = new ArrayBuffer(newSize);
            new Uint8Array(newBuffer).set(new Uint8Array(this.buffer)); // Copy old data
            this.buffer = newBuffer;
            this.view = new DataView(this.buffer);
        }
    }

    writeInt8(value: number, offset?: number) {
        const writeOffset = offset !== undefined ? offset : this.offset;
        this.ensureCapacity(1, writeOffset);
        this.view.setInt8(writeOffset, value);
        if (offset === undefined) this.offset = Math.max(this.offset, writeOffset+1);
    }

    writeUint8(value: number, offset?: number) {
        const writeOffset = offset !== undefined ? offset : this.offset;
        this.ensureCapacity(1, writeOffset);
        this.view.setUint8(writeOffset, value);
        if (offset === undefined) this.offset = Math.max(this.offset, writeOffset+1);
    }

    writeUint16(value: number, offset?: number) {
        const writeOffset = offset !== undefined ? offset : this.offset;
        this.ensureCapacity(2, writeOffset);
        this.view.setUint16(writeOffset, value, true);
        if (offset === undefined) this.offset = Math.max(this.offset, writeOffset+2);
    }

    writeUint32(value: number, offset?: number) {
        const writeOffset = offset !== undefined ? offset : this.offset;
        this.ensureCapacity(4, writeOffset);
        this.view.setUint32(writeOffset, value, true);
        if (offset === undefined) this.offset = Math.max(this.offset, writeOffset+4);
    }

    writeChar(value: string, offset?: number) {
        if (value.length !== 1) {
            throw new Error("writeChar expects a single character.");
        }
        const writeOffset = offset !== undefined ? offset : this.offset;
        this.ensureCapacity(1, writeOffset);
        this.view.setUint8(writeOffset, value.charCodeAt(0));
        if (offset === undefined) this.offset = Math.max(this.offset, writeOffset+1);
    }

    writeString(value: string, offset?: number) {
        const writeOffset = offset !== undefined ? offset : this.offset;
        for (let i = 0; i < value.length; i++) {
            this.writeChar(value[i], writeOffset + i);
        }
        this.writeChar('\0', writeOffset + value.length); // Null-terminate the string
        if (offset === undefined) this.offset = Math.max(this.offset, writeOffset+value.length+1);;
    }

    reserve8() {
        let offset = this.offset;
        this.ensureCapacity(1, this.offset);
        this.offset += 1;
        return offset;
    }
    
    reserve16() {
        let offset = this.offset;
        this.ensureCapacity(2, this.offset);
        this.offset += 2;
        return offset;
    }
    
    reserve32() {
        let offset = this.offset;
        this.ensureCapacity(4, this.offset);
        this.offset += 4;
        return offset;
    }

    /**
     * Gets the size of the written data
     * @returns The size of the data
     */
    getSize() {
        return this.offset;
    }

    /**
     * Returns the size of the buffer, including unwritten memory
     * @returns the size of the buffer.
     */
    getCapacity() {
        return this.buffer.byteLength;
    }

    getBuffer(): ArrayBuffer {
        return this.buffer.slice(0, this.offset); // Return only the used portion
    }
}