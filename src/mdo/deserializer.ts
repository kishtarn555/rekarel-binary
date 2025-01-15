import { DumpTypes, KarelNumbers, World } from "@rekarel/core";

/**
 * Deserializes a MDO and a KEC file into a world
 * @param {World} world: World to deserialize the data into.
 * @param {Uint16Array} mdo MDO file, this contains the world structure
 * @param {Uint16Array} kec KEC file, this contains the execution limits, if not provided, it will use the default values.
 */
export function deserializeMdoKec(world: World, mdo: Uint16Array, kec?:Uint16Array) {
    if (mdo.length < 20 || (kec != null && kec.length < 30)) {
      throw new Error('Invalid file format');
    }
  
    if (
      mdo[0] != 0x414b ||
      mdo[1] != 0x4552 ||
      mdo[2] != 0x204c ||
      mdo[3] != 0x4d4f ||
      mdo[4] != 0x2e49
    ) {
      throw new Error('Invalid magic number');
    }
  
    // let x1 = mdo[5];
    let width = mdo[6];
    let height = mdo[7];

    world.resize(width, height);
    world.clear();
    //All MDO are 1.0 version only
    world.targetVersion = "1.0";
    world.setBagBuzzers(
        mdo[8] === 0xFFFF ?
        KarelNumbers.a_infinite
        : mdo[8]
    );
    world.move(mdo[10], mdo[9]);
    world.orientation = world.startOrientation = mdo[11] % 4;
    let wallCount = mdo[12];
    let heapCount = mdo[13];
    // let x10 = mdo[14];
  
    if (kec?.[0]) {
      world.maxInstructions = kec[1];
    }
    if (kec?.[3]) {
      world.maxMove = kec[4];
    }
    if (kec?.[6]) {
      world.maxTurnLeft = kec[7];
    }
    if (kec?.[9]) {
      world.maxPickBuzzer = kec[10];
    }
    if (kec?.[12]) {
      world.maxLeaveBuzzer = kec[13];
    }
    // This were deprecated in rekarel
    // if (kec?.[15]) {
    //   world.maxKarelBuzzers = kec[16];
    // }
    // if (kec?.[18]) {
    //   world.maxBuzzers = kec[19];
    // }
    if (kec?.[21]) {
      world.setDumps(DumpTypes.DUMP_POSITION, true);
    }
    if (kec?.[24]) {
      world.setDumps(DumpTypes.DUMP_ORIENTATION, true);
    }
    let dumpCount = kec?.[27] ? kec[28] : 0;
    if (dumpCount) {
      world.setDumps(DumpTypes.DUMP_WORLD, true);
    }
  
    function decodeWalls(tx: number, ty: number, tmask: number) {
      for (let i = 0; i < 4; i++) {
        if (tmask & (1 << i)) {
          world.addWall(ty, tx, (i + 1) % 4);
        }
      }
    }
  
    for (let i = 15; i < 15 + 3 * wallCount; i += 3) {
      decodeWalls(mdo[i], mdo[i + 1], mdo[i + 2]);
    }
  
    for (
      let i = 15 + 3 * wallCount;
      i < 15 + 3 * (wallCount + heapCount);
      i += 3
    ) {
      world.setBuzzers(
        mdo[i + 1], 
        mdo[i], 
        mdo[i + 2] === 0xFFFF?
            KarelNumbers.a_infinite
            : mdo[i + 2]
    );
    }
  
    for (let i = 30; i < 30 + 3 * dumpCount; i += 3) {
      world.setDumpCell(kec[i + 1], kec[i], true);
    }
  };