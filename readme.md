This package add support for some binary formats of Karel.

It adds support for

* Reading ReKarelBinaryInpunt format (.kbi)
* Writing ReKarelBinaryInpunt format (.kbi)
* Reading MDO/KEC (.mdo .kec)


# Examples

## Reading a kbi

```ts
import { World }  from "@rekarel/core"
import { deserializeKarelBinary } from "@rekarel/binary"

// Create world of arbitrary size
const world = new World(10, 10); 
// Read binary data
const kbiData = await readFileToArrayBuffer('world.kbi'); 

try {
    // Deserializes the data into world
    deserializeKarelBinary(world, kbiData); 
} catch(e) {
    console.error(e);
}
```


## Writing a kbi

```ts
import { World }  from "@rekarel/core"
import { KarelBinarySerializer } from "@rekarel/binary"

const world = new World(10, 10);

// Create a serializer configured to low compression
const serializer = new KarelBinarySerializer("low"); 

// Get an array buffer with the kbi data
const buffer = serializer.serialize(world);

// writeArrayBufferToFile implementation is n 
writeArrayBufferToFile("world.kbi", buffer);
```

## Import MDO/KEC
```ts
import { World }  from "@rekarel/core"
import { deserializeMdoKec } from "@rekarel/binary"

// Create world of arbitrary size
const world = new World(10, 10); 
// Read binary data
const mdoBinary = await readFileToArrayBuffer('world.mdo');
// Read binary data
const kecBinary = await readFileToArrayBuffer('world.kec'); 

// Convert buffers into Uint16 arrays
const mdo = new Uint16Array(mdoBinary)
const kec = new Uint16Array(kecBinary)

try {
    // Deserializes the data into world
    deserializeMdoKec(world, mdo, kec); 
} catch(e) {
    console.error(e);
}
```