import { DumpTypes, KarelNumbers, World } from "@rekarel/core";

export function deserializeKarelBinary(target: World, data: ArrayBuffer) {
    new Deserialization(target, data);

}

class Deserialization {
    private world: World
    private data: DataView
    private offset: number;

    private aWord: number;
    private bWord: number;
    private cWord: number;
    constructor(target: World,data: ArrayBuffer) {
        this.data = new DataView(data);
        this.world = target;
        this.offset = 0;

        this.parse();

    }

    private parse() {
        this.world.clear();
        this.parseHead();
        this.parseConditions();
        this.parseWorld();
        this.parseProgramData();
    }

    private parseHead() {
        const MAGIC_WORD = `${String.fromCharCode(this.readUint8())}${String.fromCharCode(this.readUint8())}`;
        if (MAGIC_WORD !== "KW") {
            throw new Error("BAD FORMAT");
        }
        const version = this.readUint8();
        switch( version) {
            case 0:
                this.world.targetVersion = "1.0";
                break;
            case 1:
                this.world.targetVersion = "1.1";
                break;
            default:
                throw new Error("UNSUPPORTED VERSION");
        }
        const wordSize = this.readUint8();
        this.aWord = wordSize & 3;
        this.bWord = (wordSize >> 2) & 3;
        this.cWord = (wordSize >> 4) & 3;
    }

    private parseConditions() {
        this.world.maxInstructions = this.readUint32();
        this.world.maxStackSize = this.readUint32();
        this.world.maxStackMemory = this.readUint32();
        this.world.maxCallSize = this.readUint32();
        let maxMove = this.readUint32();
        let maxTurnLeft = this.readUint32();
        let maxPickBuzzer = this.readUint32();
        let maxLeaveBuzzer = this.readUint32();

        this.world.maxMove = maxMove === 0xFFFFFFFF ? -1 : maxMove;
        this.world.maxTurnLeft = maxTurnLeft === 0xFFFFFFFF ? -1 : maxTurnLeft;
        this.world.maxPickBuzzer = maxPickBuzzer === 0xFFFFFFFF ? -1 : maxPickBuzzer;
        this.world.maxLeaveBuzzer = maxLeaveBuzzer === 0xFFFFFFFF ? -1 : maxLeaveBuzzer;
    }

    private parseWorld() {
        let w = this.readWord(this.aWord) + 1;
        let h = this.readWord(this.aWord) + 1;
        this.world.resize(w, h);

        let worldName = this.readNullTerminatedString();
        if (worldName === "") {
            worldName = "mundo_0";
        }
        this.world.worldName = worldName;

        let beeperCount = this.readWord(this.cWord);
        let cellPairCount = this.readWord(this.cWord);

        for (let i = 0; i < beeperCount; i++) {
            this.readBeeperEntry();
        }
        for (let i = 0; i < cellPairCount; i++) {
            this.readCellPairEntry();
        }
    }

    private readBeeperEntry() {
        let coord = this.coordToIJ(this.readWord(this.cWord));
        let beeper = this.readWord(this.bWord);
        if (this.isInfinite(beeper, this.bWord)) {
            this.world.setBuzzers(coord.i, coord.j, KarelNumbers.a_infinite);
            return;
        }
        if (beeper !== 0) {
            this.world.setBuzzers(coord.i, coord.j, beeper);
            return;
        }
        let L = this.readWord(this.aWord) + 1;
        for (let i = 0; i < L; i++) {
            beeper = this.readWord(this.bWord);
            this.world.setBuzzers(coord.i, coord.j + i, beeper);
        }
    }

    private readCellPairEntry() {
        let coord = this.coordToIJ(this.readWord(this.cWord));
        let cell = this.readUint8();
        if (cell != 0) {
            this.parseCell(coord, cell);
            return;
        }
        let L = this.readWord(this.aWord) + 1;
        for (let i = 0; i < L; i++) {
            cell = this.readUint8();
            this.parseCell({ i: coord.i, j: coord.j + 2 * L }, cell);
        }
    }

    private parseCell(coord: { i: number, j: number }, value: number) {
        if ((value & (1 << 0)) != 0) {
            this.world.addWall(coord.i, coord.j, 1);
        }
        if ((value & (1 << 1)) != 0) {
            this.world.addWall(coord.i, coord.j, 2);
        }
        if ((value & (1 << 2)) != 0) {
            this.world.setDumpCell(coord.i, coord.j, true);
        }

        if ((value & (1 << 3)) != 0) {
            this.world.addWall(coord.i, coord.j + 1, 1);
        }
        if ((value & (1 << 4)) != 0) {
            this.world.addWall(coord.i, coord.j + 1, 2);
        }
        if ((value & (1 << 5)) != 0) {
            this.world.setDumpCell(coord.i, coord.j + 1, true);
        }
    }

    private parseProgramData() {
        let x = this.readWord(this.aWord) + 1;
        let y = this.readWord(this.aWord) + 1;
        this.world.move(y, x);
        let programName = this.readNullTerminatedString();
        if (programName === "") {
            programName = "p1";
        }
        this.world.programName = programName;
        let bag = this.readUint32();
        if (bag === 0xFFFFFFFF) {
            bag = KarelNumbers.a_infinite;
        }
        this.world.setBagBuzzers(bag);
        let programFlag = this.readUint16();
        this.world.rotate(
            (["OESTE", "NORTE", "ESTE", "SUR"] as ('OESTE' | 'NORTE' | 'ESTE' | 'SUR')[])
            [programFlag & 3]
        );
        if ((programFlag & (1 << 2))!==0) {
            this.world.setDumps(DumpTypes.DUMP_WORLD, true);
        }
        if ((programFlag & (1 << 3))!==0) {
            this.world.setDumps(DumpTypes.DUMP_ALL_BUZZERS, true);
        }
        if ((programFlag & (1 << 4))!==0) {
            this.world.setDumps(DumpTypes.DUMP_ORIENTATION, true);
        }
        if ((programFlag & (1 << 5))!==0) {
            this.world.setDumps(DumpTypes.DUMP_POSITION, true);
        }
        if ((programFlag & (1 << 6))!==0) {
            this.world.setDumps(DumpTypes.DUMP_BAG, true);
        }
        if ((programFlag & (1 << 7))!==0) {
            this.world.setDumps(DumpTypes.DUMP_MOVE, true);
        }
        if ((programFlag & (1 << 8))!==0) {
            this.world.setDumps(DumpTypes.DUMP_LEFT, true);
        }
        if ((programFlag & (1 << 9))!==0) {
            this.world.setDumps(DumpTypes.DUMP_LEAVE_BUZZER, true);
        }
        if ((programFlag & (1 << 10))!==0) {
            this.world.setDumps(DumpTypes.DUMP_PICK_BUZZER, true);
        }
    }

    private readUint8() {
        if (this.offset + 1 > this.data.byteLength) {
            throw new Error("Found unexpected EOF");
        }
        this.offset += 1;
        return this.data.getUint8(this.offset - 1);
    }

    private readUint16() {
        if (this.offset + 2 > this.data.byteLength) {
            throw new Error("Found unexpected EOF");
        }
        this.offset += 2;
        return this.data.getUint16(this.offset - 2, true);
    }

    private readUint32() {
        if (this.offset + 4 > this.data.byteLength) {
            throw new Error("Found unexpected EOF");
        }
        this.offset += 4;
        return this.data.getUint32(this.offset - 4, true);
    }

    private readNullTerminatedString(): string {
        let chars: number[] = [];
        while (this.offset < this.data.byteLength) {
            const byte = this.readUint8();
            if (byte === 0) { // Null terminator
                break;
            }
            chars.push(byte);
        }
        if (chars.length === 0) {
            return "";
        }
        return String.fromCharCode(...chars);
    }

    private readWord(wordSize: number) {
        switch (wordSize) {
            case 0:
                return this.readUint32();
            case 1:
                return this.readUint16();
            case 2:
                return this.readUint8();
        }
    }

    private isInfinite(value: number, wordSize: Number) {
        switch (wordSize) {
            case 0:
                return value === 0xFFFFFFFF;
            case 1:
                return value === 0xFFFF;
            case 2:
                return value === 0xFF;
        }
        return false;
    }

    private coordToIJ(coord: number) {
        let i = Math.floor(coord / this.world.w) + 1;
        let j = (coord % this.world.w) + 1;
        return { i, j };
    }

}