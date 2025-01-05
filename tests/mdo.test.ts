import { deserializeMdoKec } from "../src/index"
import { World } from "@rekarel/core";
import { DOMParser } from '@xmldom/xmldom';

import fs from 'fs'
import path from 'path'

const MDODir = path.join(__dirname, 'mdo');

function ParseWorld(doc: Document) {
    const world = new World(10, 10);
    world.load(doc);
    return world;
}

function processMDODirs() {
    const files = fs.readdirSync(MDODir);
    files.forEach((file) => {
        if (path.extname(file) !== '.in') {
            return;
        }
        test.concurrent(`case ${file}`, async () => {

            const inFilePath = path.join(MDODir, file);
            const mdoFilePath = path.join(MDODir, file.replace('.in', '.mdo'));
            const kecFilePath = path.join(MDODir, file.replace('.in', '.kec'));

            const XMLIn = fs.readFileSync(inFilePath).toString();
            const inputDocument = new DOMParser().parseFromString(XMLIn, 'text/xml') as unknown as Document;
            const world = ParseWorld(inputDocument);

            const mdoBuffer = fs.readFileSync(mdoFilePath)
            const mdo = new Uint16Array(new Uint8Array(mdoBuffer).buffer);
            const kecBuffer = fs.readFileSync(kecFilePath)
            const kec = new Uint16Array(new Uint8Array(kecBuffer).buffer);
            const outputWorld = new World(10, 10);
            deserializeMdoKec(outputWorld, mdo, kec);

            const firstSave = world.save("start");
            const binarySave = outputWorld.save("start");
            expect(binarySave).toEqual(firstSave)
            expect(outputWorld.getDumpCellCount()).toEqual(world.getDumpCellCount())


        }, 10000);
    });
}

processMDODirs();