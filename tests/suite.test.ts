import {KarelBinarySerializer, deserializeKarelBinary} from "../src/index"
import { World } from "@rekarel/core";
import { DOMParser } from '@xmldom/xmldom';

import fs from 'fs'
import path from 'path'

const problemsDir = path.join(__dirname, 'test_suite', 'problems');

function ParseWorld(doc:Document) {
    const world = new World(10, 10);
    world.load(doc);
    return world;
}

function parseProblem (dirname:string) {
    const dirPath = `${dirname}/cases`;
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        if (path.extname(file) !== '.in') {
            return;
        }
        test.concurrent(`case ${file}`, async ()=>{
            
            const inFilePath = path.join(dirPath, file);

            // Check if the file has a .in extension
            if (path.extname(file) === '.in') {
                const XMLIn = fs.readFileSync(inFilePath).toString();
                const inputDocument = new DOMParser().parseFromString(XMLIn, 'text/xml') as unknown as Document;
                const world = ParseWorld(inputDocument);
                const binary = (new KarelBinarySerializer().serialize(world));
                const outputWorld = new World(10, 10);
                deserializeKarelBinary(binary, outputWorld);

                const firstSave = world.save("start");
                const binarySave = outputWorld.save("start");
                expect(binarySave).toEqual(firstSave)
                expect(outputWorld.getDumpCellCount()).toEqual(world.getDumpCellCount())

            }
        }, 10000);
    });
}

function processProblemDirs() {
    // Get all subdirectories in problemsDir
    const problemDirs = fs.readdirSync(problemsDir).filter(dir => fs.lstatSync(path.join(problemsDir, dir)).isDirectory());

    problemDirs.forEach(problemDir => {
        const problemPath = path.join(problemsDir, problemDir);
        describe(`Problem ${problemDir}`,()=>parseProblem(problemPath));
    });
}


processProblemDirs();