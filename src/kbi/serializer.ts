import { DumpTypes, KarelNumbers, World } from "@rekarel/core";
import { DynamicBuffer } from "../dynamicBuffer";

const VERSION = 1;

/**
 * This class allows to serialize a Karel World into a Binary format
 */
export class KarelBinarySerializer {

    serialize(world: World): ArrayBuffer {
        return (new KarelSerialization(world)).getBuffer();
    }

}

/**
 * This class represents a current serialization 
 */
class KarelSerialization {
    private world: World
    private target: DynamicBuffer
    private aWord: number;
    private bWord: number;
    private cWord: number;
    constructor(world: World) {
        this.world = world;
        this.target = new DynamicBuffer();
        this.aWord = 0;
        this.bWord = 0;
        this.cWord = 0;
        this.serialize();
    }

    getBuffer(): ArrayBuffer {
        return this.target.getBuffer();
    }

    private serialize() {
        this.calculateWords();

        this.writeHeader();
        this.writeConditions();
        this.writeWorldData();
        this.writeProgramData();
    }

    private calculateWords() {
        this.calculateAWord()
        this.calculateBWord()
        this.calculateCWord()
    }

    private writeHeader() {
        // HEADER
        this.target.writeChar("K");
        this.target.writeChar("W");
        // File Version
        this.target.writeUint8(
            this.world.targetVersion === "1.0"?
            0 : VERSION
        );
        // Words sizes
        this.target.writeUint8(
            this.aWord +
            (this.bWord << 2) +
            (this.cWord << 4)
        )
    }

    private writeConditions() {
        this.target.writeUint32(this.world.maxInstructions)
        this.target.writeUint32(this.world.maxStackSize)
        this.target.writeUint32(this.world.maxStackMemory)
        this.target.writeUint32(this.world.maxCallSize)
        this.target.writeUint32(this.world.maxMove)
        this.target.writeUint32(this.world.maxTurnLeft)
        this.target.writeUint32(this.world.maxPickBuzzer)
        this.target.writeUint32(this.world.maxLeaveBuzzer)
    }

    private writeWorldData() {
        this.writeWord(this.world.w - 1, this.aWord);
        this.writeWord(this.world.h - 1, this.aWord);
        if (this.world.worldName==="mundo_0") {
            this.target.writeChar("\0");
        } else {
            this.target.writeString(this.world.worldName);
        }
        let beepersOffset = this.reserveWord(this.cWord);
        let cellsOffset = this.reserveWord(this.cWord);

        let beepers = this.writeBeepers();
        this.writeWord(beepers, this.cWord, beepersOffset);

        let pairs = this.writeCellPairs();
        this.writeWord(pairs, this.cWord, cellsOffset);

    }

    private writeBeepers() : number{
        let beeperCount = 0;
        for (let i =1; i <= this.world.h; i++) {
            beeperCount += this.writeBeepersRow(i);
        }
        return beeperCount;
    }

    private writeBeepersRow(row:number):number {
        let beepers:[number, number][] = []
        let currentBeeper:number;
        for (let j=1; j <= this.world.w; j++) {
            currentBeeper = this.world.startBuzzers(row, j) ;
            if (currentBeeper != 0) {
                beepers.push([
                    j,
                    KarelNumbers.isInfinite(currentBeeper) ? -1 : currentBeeper
                ]);
            }
        }
        //TODO: Implement better packing
        for (let i =0; i < beepers.length; i++) {
            this.writeWord(this.getCellAsCoord(row, beepers[i][0]), this.cWord); 
            this.writeWord(beepers[i][1], this.bWord); 
        }
        return beepers.length;
    }

    private writeCellPairs() : number{
        let pairsCount = 0;
        for (let i =1; i <= this.world.h; i++) {
            pairsCount += this.writeCellPairRow(i);
        }
        return pairsCount;
    }
    private writeCellPairRow(row:number) : number{
        let pairsCount = 0;
        let cells:number[] = [] 
        for (let j = 1; j <= this.world.w; j++) {
            if (
                this.world.getDumpCell(row, j)
                || ((this.world.walls(row, j) & 2) != 0 && row != this.world.h)
                || ((this.world.walls(row, j) & 4) != 0 && j != this.world.w)
            ) {
                cells.push(j);
            }
        }
        let column: number = 0;
        // TODO: Implement proper packing
        for (let i = 0; i < cells.length; i++) {
            pairsCount++;
            column = cells[i]
            this.writeWord(this.getCellAsCoord(row, column), this.cWord);
            let number = 
                ((this.world.walls(row, column) & 2)!=0 && row != this.world.h? 1 : 0)
                | ((this.world.walls(row, column) & 4) !=0 && column != this.world.w? 2 : 0)
                | (this.world.getDumpCell(row,column)? 4 : 0);
            if (i + 1 < cells.length && cells[i+1]=== column + 1) {
                number +=                 
                    ((this.world.walls(row, column+1) & 2)!=0 && row != this.world.h? 8 : 0)
                    | ((this.world.walls(row, column+1) & 4)!=0&& column+1 != this.world.w? 16 : 0)
                    | (this.world.getDumpCell(row,column+1)? 32 : 0);
                i++; // Skip next
            }
            this.target.writeUint8(number);
        }
        return pairsCount;
    }

    private writeProgramData() {
        this.writeWord(this.world.start_j - 1, this.aWord);
        this.writeWord(this.world.start_i - 1, this.aWord);
        if (this.world.programName === "p1") {
            this.target.writeChar("\0");
        } else {
            this.target.writeString(this.world.programName);
        }
        this.target.writeUint32(
            KarelNumbers.isInfinite(this.world.startBagBuzzers) ? -1 : this.world.startBagBuzzers
        )
        let programFlag = 
            this.world.orientation
            | (this.world.getDumps(DumpTypes.DUMP_WORLD)? (1<<2): 0)
            | (this.world.getDumps(DumpTypes.DUMP_ALL_BUZZERS)? (1<<3): 0)
            | (this.world.getDumps(DumpTypes.DUMP_ORIENTATION)? (1<<4): 0)
            | (this.world.getDumps(DumpTypes.DUMP_POSITION)? (1<<5): 0)
            | (this.world.getDumps(DumpTypes.DUMP_BAG)? (1<<6): 0)
            | (this.world.getDumps(DumpTypes.DUMP_MOVE)? (1<<7): 0)
            | (this.world.getDumps(DumpTypes.DUMP_LEFT)? (1<<8): 0)
            | (this.world.getDumps(DumpTypes.DUMP_LEAVE_BUZZER)? (1<<9): 0)
            | (this.world.getDumps(DumpTypes.DUMP_PICK_BUZZER)? (1<<10): 0)
            ;
        this.target.writeUint16(programFlag);
    }

    private calculateAWord(): void {
        let dimension = Math.max(this.world.w - 1, this.world.h - 1);
        this.aWord = this.getWordSize(dimension);
    }

    private calculateBWord(): void {
        let maxValue = 0;
        for (let i = 1; i <= this.world.h; i++) {
            for (let j = 1; j <= this.world.w; j++) {
                let buzzers = this.world.startBuzzers(i, j)
                if (!KarelNumbers.isInfinite(buzzers))
                    maxValue = Math.max(maxValue, buzzers);
            }
        }
        this.bWord = this.getWordSize(maxValue + 1); //We add 1 to allow infinite values
    }

    private calculateCWord(): void {
        let maxValue = 0;
        let count = 0
        for (let i = 1; i <= this.world.h; i++) {
            for (let j = 1; j <= this.world.w; j++) {
                if (
                    this.world.startBuzzers(i, j) != 0
                    || this.world.getDumpCell(i, j)
                    || ((this.world.walls(i, j) & 2) != 0 && i != this.world.h)
                    || ((this.world.walls(i, j) & 4) != 0 && j != this.world.w)
                ) {
                    maxValue = Math.max(maxValue, this.getCellAsCoord(i, j));
                    count++;
                }
            }
        }
        maxValue = Math.max(count, maxValue)// This could be better factored in.
        this.cWord = this.getWordSize(maxValue);
    }

    private getWordSize(value: number): number {
        if (value < (1 << 8)) return 2; //Uint8
        if (value < (1 << 16)) return 1; //Uint16
        return 0; //Uint32
    }

    private getCellAsCoord(i: number, j: number): number {
        return (i - 1) * this.world.w + (j - 1);
    }

    private writeWord(value: number, wordSize:number, offset?:number) {
        switch(wordSize) {
            case 0:
                this.target.writeUint32(value, offset);
                break;
            case 1:
                this.target.writeUint16(value, offset);
                break;
            case 2: 
                this.target.writeUint8(value, offset);
                break;
            default:
                throw new Error("Unknown word size");
        }
    }
    
    private reserveWord(wordSize:number):number {
        switch(wordSize) {
            case 0:
                return this.target.reserve32();
            case 1:
                return this.target.reserve16();
            case 2: 
                return this.target.reserve8();
            default:
                throw new Error("Unknown word size");
        }
    }
}