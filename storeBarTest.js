require("./testBase");
require("psknode/bundles/psknode");
const utils = require("./utils/utils");

require("edfs-brick-storage");
const bar = require("bar");
const assert = require("double-check").assert;

const createFsAdapter = bar.createFsBarWorker;

const ArchiveConfigurator = bar.ArchiveConfigurator;

ArchiveConfigurator.prototype.registerDiskAdapter("fsAdapter", createFsAdapter);
const archiveConfigurator = new ArchiveConfigurator();
archiveConfigurator.setDiskAdapter("fsAdapter");
archiveConfigurator.setBufferSize(256);

const folders = ["fld/fld2", 'dot'];
const files = [
    "fld/a.txt", "fld/fld2/b.txt"
];

const text = ["asta e un text", "asta e un alt text"];
const folderPath = "fld";
let savePath = "dot";

assert.callback("StoreBarInEDFSTest", (callback) => {
    utils.ensureFilesExist(folders, files, text, (err) => {
        assert.true(err === null || typeof err === "undefined", "Received error");

        utils.computeFoldersHashes([folderPath], (err, initialHashes) => {
            assert.true(err === null || typeof err === "undefined", "Received error");
                console.log(initialHashes);
                archiveConfigurator.setStorageProvider("EDFSBrickStorage", "http://localhost:9091");
                const archive = new bar.Archive(archiveConfigurator);
                archive.addFolder(folderPath, (err, mapDigest) => {
                    console.log("Folder Added");
                    assert.true(err === null || typeof err === "undefined", "Failed to add folder");
                    assert.true(typeof mapDigest !== "undefined", "Did not receive mapDigest");

                    archive.extractFolder(savePath, (err) => {
                        assert.true(err === null || typeof err === "undefined", "Failed to extract folder");

                        utils.computeFoldersHashes([savePath], (err, decompressedHashes) => {
                            assert.true(err === null || typeof err === "undefined", "Failed to compute folders hashes");
                            assert.true(utils.hashArraysAreEqual(initialHashes, decompressedHashes), "Files are not identical");
                            callback();

                        });
                    });
                });
            });
        });
}, 4000);


