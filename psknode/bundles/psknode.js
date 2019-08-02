psknodeRequire=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/home/privatesky/builds/tmp/psknode_intermediar.js":[function(require,module,exports){
(function (global){
global.psknodeLoadModules = function(){
	$$.__runtimeModules["yazl"] = require("yazl");
	$$.__runtimeModules["yauzl"] = require("yauzl");
	$$.__runtimeModules["pskwallet"] = require("pskwallet");
	$$.__runtimeModules["signsensus"] = require("signsensus");
	$$.__runtimeModules["foldermq"] = require("foldermq");
	$$.__runtimeModules["pskdb"] = require("pskdb");
	$$.__runtimeModules["buffer-crc32"] = require("buffer-crc32");
	$$.__runtimeModules["node-fd-slicer"] = require("node-fd-slicer");
	$$.__runtimeModules["interact"] = require("interact");
	$$.__runtimeModules["psk-http-client"] = require("psk-http-client");
	$$.__runtimeModules["edfs"] = require("edfs");
	$$.__runtimeModules["bar"] = require("bar");
	$$.__runtimeModules["csb"] = require("csb");
	$$.__runtimeModules["edfs-brick-storage"] = require("edfs-brick-storage");
	$$.__runtimeModules["domainBase"] = require("domainBase");
}
if (false) {
	psknodeLoadModules();
};
global.psknodeRequire = require;
if (typeof $$ !== "undefined") {
    $$.requireBundle("psknode");
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"bar":"bar","buffer-crc32":"buffer-crc32","csb":"csb","domainBase":"domainBase","edfs":"edfs","edfs-brick-storage":"edfs-brick-storage","foldermq":"foldermq","interact":"interact","node-fd-slicer":"node-fd-slicer","psk-http-client":"psk-http-client","pskdb":"pskdb","pskwallet":"pskwallet","signsensus":"signsensus","yauzl":"yauzl","yazl":"yazl"}],"/home/privatesky/libraries/domainBase/domainPubSub.js":[function(require,module,exports){
var pubSub = $$.require("soundpubsub").soundPubSub;
const path = require("path");
const fs = require("fs");

exports.create = function(folder, codeFolder ){

    $$.PSK_PubSub = pubSub;
    var sandBoxesRoot = path.join(folder, "sandboxes");

    try{
        fs.mkdirSync(sandBoxesRoot, {recursive: true});
    }catch(err){
        console.log("Failed to create sandboxes dir structure!", err);
        //TODO: maybe it is ok to call process.exit ???
    }

    $$.SandBoxManager = require("../../psknode/core/sandboxes/util/SandBoxManager").create(sandBoxesRoot, codeFolder, function(err, res){
        console.log($$.DI_components.sandBoxReady, err, res);
        $$.container.resolve($$.DI_components.sandBoxReady, true);
    });

    return pubSub;
};

},{"../../psknode/core/sandboxes/util/SandBoxManager":"/home/privatesky/psknode/core/sandboxes/util/SandBoxManager.js","fs":false,"path":false}],"/home/privatesky/modules/bar/lib/Archive.js":[function(require,module,exports){
(function (Buffer){
const Brick = require('./Brick');
const path = require("path");
const isStream = require("../utils/isStream");

function Archive(archiveConfigurator, mapDigest) { //configObj
    //numele si provider-ul pe care il vom utiliza, provider-ul va fi un string
    //in functie de valoarea acestui string vom crea in variabila storagePrv
    //un obiect de tipul StorageFile sau StorageFolder


    const diskAdapter = archiveConfigurator.getDiskAdapter();
    const storageProvider = archiveConfigurator.getStorageProvider();
    let barMap;

    function putBarMap(callback) {
        if (typeof mapDigest !== "undefined") {
            storageProvider.deleteBrick(mapDigest, (err) => {
                if (err) {
                    return callback(err);
                }

                __putBarMap(callback);
            });
            return;
        }

        __putBarMap(callback);
    }

    function __putBarMap(callback) {
        storageProvider.putBarMap(barMap, (err, newMapDigest) => {
            if (err) {
                return callback(err);
            }

            mapDigest = newMapDigest;
            callback(undefined, mapDigest);
        });
    }

    this.appendToFile = function (filePath, data, callback) {
        //fileName - numele fisierului in care vrem sa facem append
        //data - buffer-ul de citire, vom prelua din el datele
        //callback - aceeasi functie care se ocupa de prelucarea datelor,
        //de creerea de brick-uri si scrierea lor
        loadBarMapThenExecute(helperAppendToFile, callback);

        function helperAppendToFile() {
            filePath = validateFileName(filePath);

            if (typeof data === "string") {
                data = Buffer.from(data);
            }

            if (Buffer.isBuffer(data)) {
                const dataBrick = new Brick(data);
                storageProvider.putBrick(dataBrick, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    barMap.add(filePath, dataBrick);
                    putBarMap(callback);
                });
                return;
            }

            if (isStream.isReadable(data)) {
                data.on('error', (err) => {
                    return callback(err);
                }).on('data', (chunk) => {
                    const dataBrick = new Brick(chunk);
                    storageProvider.putBrick(dataBrick, (err) => {
                        if (err) {
                            return callback(err);
                        }

                        barMap.add(filePath, dataBrick);
                    });
                }).on("end", () => {
                    putBarMap(callback);
                });
                return;
            }
            callback(new Error("Invalid type of parameter data"));
        }
    };

    this.addFolder = function (folderPath, callback) {
        loadBarMapThenExecute(helperAddFolder, callback);

        function helperAddFolder() {
            diskAdapter.getNextFile(folderPath, __readFileCb);

            function __readFileCb(err, file) {
                if (err) {
                    return callback(err);
                }

                if (typeof file !== "undefined") {
                    const splitFolderPath = folderPath.split(path.sep);
                    splitFolderPath.pop();
                    console.log("read");
                    readFileAsBlocks(splitFolderPath.join(path.sep), file, archiveConfigurator.getBufferSize(), barMap, (err) => {
                        if (err) {
                            return callback(err);
                        }
                        console.log("raf")
                        diskAdapter.getNextFile(folderPath, __readFileCb);
                    });
                } else {
                    storageProvider.putBarMap(barMap, callback);
                }
            }
        }
    };

    function deleteForFileName(filename, hashList, length, index, callback) {
        if (index === length) {
            return callback();
        }
        storageProvider.deleteBrick(hashList[index], (err) => {
            if (err) {
                return callback(err);
            }

            deleteForFileName(filename, hashList, length, (index + 1), callback);
        });
    }

    this.replaceFile = function (fileName, stream, callback) {
        if (typeof stream !== 'object') {
            return callback(new Error('Wrong stream!'));
        }

        loadBarMapThenExecute(helperReplaceFile, callback);

        function helperReplaceFile() {
            fileName = validateFileName(fileName);
            stream.on('error', () => {
                return callback(new Error("File does not exist!"));
            }).on('open', () => {
                let hashList = barMap.getHashList(fileName);
                deleteForFileName(fileName, hashList, hashList.length, 0, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    barMap.emptyList(fileName);
                });
            }).on('data', (chunk) => {
                let tempBrick = new Brick(chunk);
                barMap.add(fileName, tempBrick);
                storageProvider.putBrick(tempBrick, (err) => {
                    if (err) {
                        return callback(err);
                    }
                    putBarMap(callback);
                });
            });
        }
    };

    this.addFile = function (filePath, callback) {
        loadBarMapThenExecute(helperAddFile, callback);

        function helperAddFile() {
            const folderPath = path.dirname(filePath);
            diskAdapter.getNextFile(filePath, (err, file) => {
                if (err) {
                    return callback(err);
                }

                readFileAsBlocks(folderPath, file, archiveConfigurator.getBufferSize(), barMap, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    storageProvider.putBarMap(barMap, callback);
                });
            });
        }
    };

    this.getFile = function (savePath, callback) {
        this.extractFolder(savePath, callback);
    };

    this.extractFile = function (fileName, location, callback) {
        loadBarMapThenExecute(helperExtractFile, callback);

        function helperExtractFile() {
            fileName = validateFileName(fileName);
            const hashList = barMap.getHashList(fileName);
            __getFileRecursively(hashList, hashList.length, 0, callback);
        }

        function __getFileRecursively(hashList, length, index, callback) {
            if (index === length) {
                return callback();
            }

            storageProvider.getBrick(hashList[index], (err, data) => {
                if (err) {
                    return callback(err);
                }
                __appender(err, data, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    __getFileRecursively(hashList, length, index + 1, callback);
                });
            });
        }

        function __appender(err, data, callback) {
            if (err) {
                return callback(err);
            }
            let base = path.basename(fileName);
            let pth = path.join(location, base.toString());
            diskAdapter.appendBlockToFile(pth, data.getData(), callback);
        }
    };

    this.extractFolder = function (savePath, callback) {
        //functia asta extrage un fisier din arhiva, si foloseste functia de callback
        //pentru a retine datele intr-o lista sau pentru a face o procesare ulterioara
        loadBarMapThenExecute(helperExtractFolder, callback);

        function helperExtractFolder() {
            let filePaths = barMap.getFileList();
            function __readFilesRecursively(fileIndex, readFilesCb) {

                function __getBricksRecursively(brickIndex, getBricksCb) {
                    const brickHash = brickList[brickIndex];
                    storageProvider.getBrick(brickHash, (err, brickData) => {
                        if (err) {
                            return getBricksCb(err);
                        }
                        const newPath = path.join(savePath, filePath);
                        diskAdapter.appendBlockToFile(newPath, brickData.getData(), (err) => {
                            if (err) {
                                return getBricksCb(err);
                            }

                            ++brickIndex;
                            if (brickIndex < brickList.length) {
                                __getBricksRecursively(brickIndex, getBricksCb);
                            } else {
                                getBricksCb();
                            }
                        });
                    });
                }

                const filePath = filePaths[fileIndex];
                const brickList = barMap.getHashList(filePath);
                if (brickList.length > 0) {
                    __getBricksRecursively(0, (err) => {
                        if (err) {
                            return readFilesCb(err);
                        }

                        ++fileIndex;
                        if (fileIndex < filePaths.length) {
                            __readFilesRecursively(fileIndex, readFilesCb);
                        } else {
                            readFilesCb();
                        }
                    });
                }
            }

            __readFilesRecursively(0, callback);
        }

    };

    this.getReadStream = function (filePath) {
        //ne va oferi un buffer care sa citeasca dintr-un fisier din arhiva noastra?
        //return diskAdapter.getReadStream(filePath,bufferSize);

    };

    this.getWriteStream = function (filePath) {
        //ne va oferi un buffer care sa scrie intr-un fisier din arhiva noastra
        //return diskAdapter.getWriteStream(filePath);

    };

    this.store = function (callback) {
        storageProvider.putBarMap(barMap, callback);
    };

    this.list = function (callback) {
        if (typeof barMap === "undefined") {
            storageProvider.getBarMap(mapDigest, (err, map) => {
                if (err) {
                    return callback(err);
                }

                barMap = map;
                callback(undefined, barMap.getFileList());
            });
        } else {
            callback(undefined, barMap.getFileList());
        }
        //aceasta functie va lista denumirile fisierelor din arhiva
        //nu inteleg ce ar trebui sa faca functia de callback
    };

    function readFileAsBlocks(folderPath, fileName, blockSize, barMap, callback) {
        const absolutePath = path.join(folderPath, fileName);
        diskAdapter.getFileSize(absolutePath, (err, fileSize) => {
            if (err) {
                return callback(err);
            }


            let noBlocks = Math.floor(fileSize / blockSize);
            if (fileSize % blockSize > 0) {
                ++noBlocks;
            }

            let blockIndex = 0;

            function __readCb(err, buffer) {
                if (err) {
                    return callback(err);
                }

                const brick = new Brick(buffer);
                barMap.add(fileName, brick);
                storageProvider.putBrick(brick, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    ++blockIndex;
                    if (blockIndex < noBlocks) {
                        diskAdapter.readBlockFromFile(absolutePath, blockIndex, blockSize, __readCb);
                    } else {
                        callback();
                    }

                });
            }

            diskAdapter.readBlockFromFile(absolutePath, blockIndex, blockSize, __readCb);
        });
    }

    function validateFileName(fileName) {
        if (fileName[0] !== '/') {
            fileName = path.sep + fileName;
        }
        for (let it = 0; it < fileName.length; it++) {
            if (fileName[it] === '/')
                fileName = fileName.replace('/', path.sep);
        }
        return fileName;
    }

    function loadBarMapThenExecute(functionToBeExecuted, callback) {
        if (typeof barMap === "undefined") {
            storageProvider.getBarMap(mapDigest, (err, map) => {
                if (err) {
                    return callback(err);
                }

                barMap = map;
                functionToBeExecuted();
            });
        } else {
            functionToBeExecuted();
        }
    }

}

module.exports = Archive;
}).call(this,require("buffer").Buffer)

},{"../utils/isStream":"/home/privatesky/modules/bar/utils/isStream.js","./Brick":"/home/privatesky/modules/bar/lib/Brick.js","buffer":false,"path":false}],"/home/privatesky/modules/bar/lib/ArchiveConfigurator.js":[function(require,module,exports){
const storageProviders = {};
const diskAdapters = {};

function ArchiveConfigurator() {
    const config = {};

    this.setBufferSize = function (bufferSize) {
        config.bufferSize = bufferSize;
    };

    this.getBufferSize = function () {
        return config.bufferSize;
    };

    this.setStorageProvider = function (storageProviderName, ...args) {
        config.storageProvider = storageProviders[storageProviderName](...args);
    };

    this.getStorageProvider = function () {

        return config.storageProvider;
    };

    this.setDiskAdapter = function (diskAdapterName, ...args) {
        config.diskAdapter = diskAdapters[diskAdapterName](...args);
    };
    this.getDiskAdapter = function () {
        return config.diskAdapter;
    }
}

ArchiveConfigurator.prototype.registerStorageProvider = function (storageProviderName, factory) {
    storageProviders[storageProviderName] = factory;
};

ArchiveConfigurator.prototype.registerDiskAdapter = function (diskAdapterName, factory) {
    diskAdapters[diskAdapterName] = factory;
};

module.exports = ArchiveConfigurator;
},{}],"/home/privatesky/modules/bar/lib/Brick.js":[function(require,module,exports){
const crypto = require('crypto');

function Brick(data){
    let hash;
    this.getHash = function () {
        if (typeof hash === "undefined") {
            const h = crypto.createHash('sha256');
            h.update(data);
            hash = h.digest('hex');
        }
        return hash;
    };

    this.getData = function(){
        return data;
    }
}

module.exports = Brick;
},{"crypto":false}],"/home/privatesky/modules/bar/lib/FileBarMap.js":[function(require,module,exports){
(function (Buffer){
const Brick = require("./Brick");

function FileBarMap(header){
    header = header || {};
    let brickPositions = [];
    let position = 0;
    let index=0;
    //header este un map in care vom retine datele intr-un format json
    //vom avea key-ul care va fi filename-ul, si datele care va fi lista de hash-uri
    this.add = function (filePath, brick) {
        //hashList-ul va fi direct lista de hash-uri, pentru ca o putem face pe masura
        //ce ne ocupam de salvarea brick-urilor
        let lastPosition = 96;
        if(index>0)
            lastPosition = brickPositions[index-1];
        if (typeof header[filePath] === "undefined") {
            header[filePath] = [];
            brickPositions.push((lastPosition+brick.getSize()));
            header[filePath].push(index);
            index++;
        }
        else{
            //let tempL = header[filePath].length;
            //let tempSize = header[filePath][tempL-1];
            brickPositions.push((lastPosition+brick.getSize()));
            header[filePath].push(index);
            index++;
        }
    };

    this.setBarMapPositon = function(actualPosition){
        position = actualPosition;
    }

    this.getHashList = function (filePath) {
        //avem nevoie de hash-uri ca sa putem obtine brick-urile unui fisier
        //un hash este de fapt denumirea unui brick
        //aceasta functie returneaza lista de hash-uri
        return header[filePath];
    };

    this.emptyList = function (filePath) {
        header[filePath] = [];
    };

    this.toBrick = function () {
        let tempMap = {};
        tempMap.positions = header;
        tempMap.indexes = brickPositions;
        return new Brick(Buffer.from(JSON.stringify(tempMap)));
    };

    this.getFileList = function(){
        return Object.keys(header);
    }

    this.getListOfBrickPositions = function(){
        return brickPositions;
    }

    this.getPosition = function(index){
        if(index>brickPositions.length)
            return undefined;
        return brickPositions[index];
    }

    this.setListOfBrickPositions = function(list){
        brickPositions = list;
    }
}

module.exports = FileBarMap;
}).call(this,require("buffer").Buffer)

},{"./Brick":"/home/privatesky/modules/bar/lib/Brick.js","buffer":false}],"/home/privatesky/modules/bar/lib/FileBrickStorage.js":[function(require,module,exports){
(function (Buffer){
const fs = require('fs');
const BarMap = require('./FileBarMap');
//const fileBarMap = require('FileBarMap');

function FileBrickStorage(location){
    //clasele acestea de storage, nu se mai ocupa de citiri si scrieri acum
    //deci aceste functii pe care le apelez, putBrick si getBrick sunt niste functii intermediare
    //toate procesarile se fac in BarWorker (partea de citire, mapare a header-ului arhivei)
    //si in storage, de exemplu append-ul de date la un Brick
    let map;
    let barMapPosition = 96;
    // this.putBrick = function(brick,callback){
    //     barMapPosition += brick.getData().length;
    //     brickSizes[brick.getHash()] = brick.getData().length;
    //     fs.appendFile(location,brick.getData(),(err)=>{
    //         if(err)
    //             callback(err);
    //         else
    //             callback();
    //     });
    //     //aceasta functie va primi un brick
    //     //si va apela o fucntie din BarWorker ce se va ocupa de scrierea datelor in fisier
    //     //va face append la fisierul .bar, cu datele respective
    // }

    // this.putBrick = function(brick,callback){
    //     barMapPosition += brick.getData().length;
    //     brickSizes[brick.getHash()] = brick.getData().length;
    //     let tempBuffer = Buffer.alloc(brick.getData().length,brick.getData());
    //     fs.open(location,'w',(err,fd)=>{
    //         fs.write(fd,tempBuffer,0,tempBuffer,barMapPosition,(err,wrr,str)=>{
    //             if(err)
    //                 throw err;
    //         });
    //     });
    // }

    this.putBrick = function(brick,callback){
        fs.stat(location,(err,stat)=>{
            if(err){
                fs.open(location,'r+',(err,fd)=>{
                    let tempBuffer = Buffer.alloc(brick.getSize(),brick.getData());
                    fs.write(fd,tempBuffer,0,tempBuffer.length,96,(err,wrt,buffer)=>{
                        if(err)
                            return callback(err);
                    });
                });
            }else{
                fs.appendFile(location,brick.getData(),(err)=>{
                    if(err)
                        return callback(err);
                });
            }
            callback();
        });
    }

    // this.putBarMap = function(barMap,callback){
    //     let map = {};
    //     barMap.getFileList().forEach(file=>{
    //         map[file] = [];
    //         let tempSize = [];
    //         barMap.getHashList(file).forEach(hash=>{
    //             tempSize.push(brickSizes[hash]);
    //         });
    //         map[file] = [barMap.getHashList(file),tempSize];
    //     });
    //     let buffer = JSON.stringify(map);
    //     let bufferNumber = Buffer.alloc(number.toString().length,number.toString());
    //     fs.open(location,'w',(err,fd)=>{
    //         fs.write(fd,bufferNumber,0,bufferNumber.length,0,(err,bytesRead,str)=>{
    //             if(err)
    //                 callback(err);
    //         });
    //         fs.write(fd,buffer,0,buffer.length,barMapPosition,(err,wrt,str)=>{
    //             if(err)
    //                 callback(err);
    //         });
    //     });
    // }

    this.putBarMap = function(barMap,callback){
        // barMap.getFileList().forEach(file=>{
        //     map[file] = [];
        //     let tempSize = [];
        //     barMap.getHashList(file).forEach(hash=>{
        //         tempSize.push(brickSizes[hash]);
        //     });
        //     map[file] = [barMap.getHashList(file),tempSize];
        // });
        // let buffer = JSON.stringify(map);
        // let bufferNumber = Buffer.alloc(number.toString().length,number.toString());
        // fs.open(location,'w',(err,fd)=>{
        //     fs.write(fd,bufferNumber,0,bufferNumber.length,0,(err,bytesRead,str)=>{
        //         if(err)
        //             callback(err);
        //     });
        //     fs.write(fd,buffer,0,buffer.length,barMapPosition,(err,wrt,str)=>{
        //         if(err)
        //             callback(err);
        //     });
        // });
        // let tempMap = {};
        // map.getFileList().forEach(key=>{
        //     map.getHashList(key).forEach(el=>{
        //         tempMap[key] = el;
        //     });
        // });
        // let mapToWrite = {};
        // mapToWrite.positions = tempMap;
        // mapToWrite.indexes = map.getListOfBrickPositions();
        // let stringToWrite = JSOn.stringify(mapToWrite);
        // let tempBuffer = Buffer.alloc(stringToWrite.length,stringToWrite);
        let map = barMap.toBrick();
        let tempBuffer = Buffer.alloc(map.getData().length,map.getData().toString());
        fs.open(location,'r+',(err,fd)=>{
            if(err)
                return callback(err);
            fs.write(fd,tempBuffer,0,tempBuffer.length,barMapPosition,(err,wrt,buff)=>{
                if(err)
                    return callback(err);
            });
        });
        callback(undefined,);
    }

    // this.getBarMap = function(callback){
    //     fs.open(location,'r+',(err,fd)=>{
    //         if(err)
    //             return callback(err);
    //         let buffer = Buffer.alloc(128);
    //         fs.read(fd,buffer,0,78,0,(err,bytesRead,buffer)=>{
    //             if(err)
    //                 return callback(err);
    //             let number = ParseInt(buffer.slice(0,bytesRead));
    //             barMapPosition = number;
    //             fs.stat(location,(err,stat)=>{
    //                 let bufferBM = Buffer.alloc(stat.size-number);
    //                 fs.read(fd,bufferBM,0,bufferBM.length,number,(err,bytesRead,buffer)=>{
    //                     let temp = JSON.parse(bufferBM.toString());
    //                     let tempHeader = {};
    //                     Object.keys(temp).forEach(key=>{
    //                         tempHeader[key] = temp[key][0];
    //                         let tempArr = temp[key][1];
    //                         let index = 0;
    //                         tempHeader[key].forEach(element=>{
    //                             brickSizes[element] = tempArr[index];
    //                             index++;
    //                         });
    //                     });
    //                 });
    //             });
    //         });
    //     })
    // }

    // this.getBarMap = function(callback){
    //     fs.open(location,'r+',(err,fd)=>{
    //         if(err)
    //             return callback(err);
    //         let buffer = Buffer.alloc(128);
    //         fs.read(fd,buffer,0,78,0,(err,bytesRead,buffer)=>{
    //             if(err)
    //                 return callback(err);
    //             let number = ParseInt(buffer.slice(0,bytesRead));
    //             barMapPosition = number;
    //             fs.stat(location,(err,stat)=>{
    //                 let bufferBM = Buffer.alloc(stat.size-number);
    //                 fs.read(fd,bufferBM,0,bufferBM.length,number,(err,bytesRead,buffer)=>{
    //                     let temp = JSON.parse(bufferBM.toString());
    //                     let tempHeader = {};
    //                     Object.keys(temp).forEach(key=>{
    //                         tempHeader[key] = temp[key][0];
    //                         let tempArr = temp[key][1];
    //                         let index = 0;
    //                         tempHeader[key].forEach(element=>{
    //                             brickSizes[element] = tempArr[index];
    //                             index++;
    //                         });
    //                     });
    //                 });
    //             });
    //         });
    //     })
    // }

    this.getBarMap = function(mapDigest,callback){
        if(mapDigest === undefined){
            callback(undefined,new BarMap());
        }
        fs.open(location,'r+',(err,fd)=>{
            if(err)
                return callback(err);
            fs.stat(location,(err,stat)=>{
                if(err)
                    return callback(err);
                let numberBuffer = Buffer.alloc(64);
                fs.read(fd,numberBuffer,0,numberBuffer.length,0,(err,bytesRead,numberBuffer)=>{
                    if(err)
                        return callback(err);
                    numberBuffer = numberBuffer.slice(0,bytesRead);
                    let tempBuffer = Buffer.alloc((stat.size-parseInt(numberBuffer.toString())));
                    fs.read(fd,tempBuffer,0,tempBuffer.length,parseInt(numberBuffer),(err,bytesRead,tempBuffer)=>{
                        if(err)
                            return callback(err);
                        tempBuffer = tempBuffer.slice(0,bytesRead);
                        let tempMap = JSON.parse(tempBuffer.toString());
                        map = new Map(tempMap.positions);
                        map.setListOfBrickPositions(tempMap.indexes);
                        callback(undefined,map);
                    });
                });
            });
        });
    }

    // this.getBrick = function(brickHash,callback){
    //     let buffer = Buffer.alloc(brickSizes[brickHash]);
    //     fs.open(location,'r+',(err,fd)=>{
    //         if(err)
    //             return callback(err);
    //
    //         fs.read(fd,buffer,0,buffer.length,relativePosition,(err,bytesRead,buff)=>{
    //             relativePosition += brickSizes[birkHash];
    //             callback(err,buffer.slice(0,bytesRead));
    //         });
    //     });
    // }

    this.getBrick = function(brickIndex,callback){
        let tempBuffer = Buffer.alloc(map.getPosition(brickIndex+1)-map.getPosition(brickIndex));
        fs.open(location,'r+',(err,fd)=>{
            fs.read(fd,tempBuffer,0,map.getPosition(brickIndex+1)-map.getPosition(brickIndex),map.getPosition(brickIndex),(err,bytesRead,tempBuffer)=>{
                if(err)
                    return callback(err);
                tempBuffer = tempBuffer.slice(0,bytesRead);
                callback(undefined,tempBuffer);
            });
        });
    }
}

module.exports = {
    createFileBrickStorage: function (location) {
        return new FileBrickStorage(location);
    }
};
}).call(this,require("buffer").Buffer)

},{"./FileBarMap":"/home/privatesky/modules/bar/lib/FileBarMap.js","buffer":false,"fs":false}],"/home/privatesky/modules/bar/lib/FolderBarMap.js":[function(require,module,exports){
(function (Buffer){
const Brick = require("./Brick");

function FolderBarMap(header){
    header = header || {};
    //header este un map in care vom retine datele intr-un format json
    //vom avea key-ul care va fi filename-ul, si datele care va fi lista de hash-uri
    this.add = function (filePath, brick) {
        //hashList-ul va fi direct lista de hash-uri, pentru ca o putem face pe masura
        //ce ne ocupam de salvarea brick-urilor
        if (typeof header[filePath] === "undefined") {
            header[filePath] = [];
        }

        header[filePath].push(brick.getHash());
    };

    this.getHashList = function (filePath) {
        //avem nevoie de hash-uri ca sa putem obtine brick-urile unui fisier
        //un hash este de fapt denumirea unui brick
        //aceasta functie returneaza lista de hash-uri
        return header[filePath];
    };

    this.emptyList = function (filePath) {
        header[filePath] = [];
    };

    this.toBrick = function () {
        return new Brick(Buffer.from(JSON.stringify(header)));
    };

    this.getFileList = function () {
        return Object.keys(header);
    };

}

module.exports = FolderBarMap;
}).call(this,require("buffer").Buffer)

},{"./Brick":"/home/privatesky/modules/bar/lib/Brick.js","buffer":false}],"/home/privatesky/modules/bar/lib/FolderBrickStorage.js":[function(require,module,exports){
const fs = require("fs");
const path = require("path");
const BarMap = require("./FolderBarMap");
const Brick = require("./Brick");

function FolderBrickStorage(location) {

    this.putBrick = function (brick, callback) {
        const writeStream = fs.createWriteStream(path.join(location, brick.getHash()));
        writeStream.write(brick.getData(), callback);
        //aceasta functie va primi un brick
        //si va apela o fucntie din BarWorker ce se va ocupa de scrierea datelor in fisier
    };

    this.getBrick = function (brickHash, callback) {
        fs.readFile(path.join(location, brickHash), (err, brickData) => {
            callback(err, new Brick(brickData));
        });
    };

    this.deleteBrick = function (brickHash, callback) {
        fs.unlink(path.join(location, brickHash), callback);
    };

    this.putBarMap = function (barMap, callback) {
        const barMapBrick = barMap.toBrick();
        this.putBrick(barMapBrick, (err) => {
            if (err)
                return callback(err);
            callback(undefined, barMapBrick.getHash());
        });
    };

    this.getBarMap = function (mapDigest, callback) {
        if (typeof mapDigest === "function") {
            callback = mapDigest;
            mapDigest = undefined;
        }

        if (typeof mapDigest === "undefined") {
            return callback(undefined, new BarMap());
        }

        this.getBrick(mapDigest, (err, mapBrick) => {
            callback(err, new BarMap(JSON.parse(mapBrick.getData().toString())));
        });
    }
    //aceasta functie va primi id-ul unui brick
    //va cauta fisierul caruia ii corespunde id-ul
    //il va citi tot prin intermediul BarWorker, printr-o functie
    //il va trimite in callback, unde va fi mai departe, salvat
    //partea de citire va fi facuta prin intermediul functiei 'readFromFile' din BarWorker
}

module.exports = {
    createFolderBrickStorage: function (location) {
        return new FolderBrickStorage(location);
    }
};
},{"./Brick":"/home/privatesky/modules/bar/lib/Brick.js","./FolderBarMap":"/home/privatesky/modules/bar/lib/FolderBarMap.js","fs":false,"path":false}],"/home/privatesky/modules/bar/lib/FsBarWorker.js":[function(require,module,exports){
(function (Buffer){
const fs = require('fs');
const path = require('path');
const AsyncDisptacher = require("../utils/AsyncDispatcher");

function PathAsyncIterator(inputPath) {
    let removablePathLen;
    const fileList = [];
    const folderList = [];
    let isFirstCall = true;
    let pathIsFolder;

    this.next = function (callback) {
        if (isFirstCall === true) {
            isDir(inputPath, (err, status) => {
                if (err) {
                    return callback(err);
                }

                isFirstCall = false;
                pathIsFolder = status;
                if (status === true) {
                    const splitInputPath = inputPath.split(path.sep);
                    splitInputPath.pop();
                    removablePathLen = splitInputPath.join(path.sep).length;
                    folderList.push(inputPath);
                    getNextFileFromFolder(callback);
                } else {
                    removablePathLen = path.dirname(inputPath).length;
                    const fileName = inputPath.substring(removablePathLen);

                    callback(undefined, fileName);
                }
            });
        }else if(pathIsFolder){
            getNextFileFromFolder(callback);
        }else {
            callback();
        }
    };

    //-----------------------------------------Internal methods-------------------------------------------------------
    function walkFolder(folderPath, callback) {
        const asyncDispatcher = new AsyncDisptacher((errors, results) => {
            if (fileList.length > 0) {
                const fileName = fileList.shift();
                return callback(undefined, fileName);
            }

            if (folderList.length > 0) {
                const folderName = folderList.shift();
                return walkFolder(folderName, callback);
            }

            return callback();
        });

        fs.readdir(folderPath, (err, files) => {
            if (err) {
                return callback(err);
            }

            if (files.length === 0 && folderList.length === 0) {
                return callback();
            }

            if (files.length === 0) {
                walkFolder(folderList.shift(), callback);
            }
            asyncDispatcher.dispatchEmpty(files.length);

            files.forEach(file => {
                let filePath = path.join(folderPath, file);
                isDir(filePath, (err, status) => {
                    if (err) {
                        return callback(err);
                    }

                    if (status) {
                        folderList.push(filePath);
                    } else {
                        fileList.push(filePath.substring(removablePathLen));
                    }

                    asyncDispatcher.markOneAsFinished();
                });
            });
        });
    }

    function isDir(filePath, callback) {
        fs.stat(filePath, (err, stats) => {
            if (err) {
                return callback(err);
            }

            return callback(undefined, stats.isDirectory());
        });
    }

    function getNextFileFromFolder(callback) {
        if (fileList.length === 0 && folderList.length === 0) {
            return callback();
        }

        if (fileList.length > 0) {
            const fileName = fileList.shift();
            return callback(undefined, fileName);
        }


        walkFolder(folderList.shift(), (err, file) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, file);
        });
    }
}

function FsBarWorker() {

    let pathAsyncIterator;

    this.getFileSize = function (filePath, callback) {
        fs.stat(filePath, (err, stats) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, stats.size);
        });
    };

    //readBlockFromFile
    this.readBlockFromFile = function (filePath, blockIndex, bufferSize, callback) {
        fs.open(filePath, 'r+', function (err, fd) {
            if (err) {
                return callback(err);
            }

            let buffer = Buffer.alloc(bufferSize);
            fs.read(fd, buffer, 0, bufferSize, bufferSize * blockIndex, (err, bytesRead, buffer) => {
                if (err) {
                    return callback(err);
                }

                fs.close(fd, (err) => {
                    callback(err, buffer.slice(0, bytesRead));
                });
            });
        });
    };

    this.getNextFile = function (inputPath, callback) {
        pathAsyncIterator = pathAsyncIterator || new PathAsyncIterator(inputPath);
        pathAsyncIterator.next(callback);
    };

    //appendToFile
    this.appendBlockToFile = function (filePath, data, callback) {
        const pth = constructPath(filePath);

        fs.mkdir(pth, {recursive: true}, (err) => {
            if (err && err.code !== "EEXIST") {
                return callback(err);
            }

            fs.appendFile(filePath, data, callback);
        });
    };

    // this.getReadStream = function(filePath,bufferSize){
    //     return fs.createReadStream(filePath,{highWaterMark:bufferSize});
    // }

    // this.getWriteStream = function(filePath){
    //     return fs.createWriteStream(filePath);
    // }
    //-------------------------------------------- Internal methods ----------------------------------------------------

    function constructPath(filePath) {
        let slices = filePath.split(path.sep);
        slices.pop();
        return slices.join(path.sep);
    }

}

module.exports = {
    createFsBarWorker: function () {
        return new FsBarWorker();
    }
};
}).call(this,require("buffer").Buffer)

},{"../utils/AsyncDispatcher":"/home/privatesky/modules/bar/utils/AsyncDispatcher.js","buffer":false,"fs":false,"path":false}],"/home/privatesky/modules/bar/utils/AsyncDispatcher.js":[function(require,module,exports){

function AsyncDispatcher(finalCallback) {
	let results = [];
	let errors = [];

	let started = 0;

	function markOneAsFinished(err, res) {
		if(err) {
			errors.push(err);
		}

		if(arguments.length > 2) {
			arguments[0] = undefined;
			res = arguments;
		}

		if(typeof res !== "undefined") {
			results.push(res);
		}

		if(--started <= 0) {
            return callCallback();
		}
	}

	function dispatchEmpty(amount = 1) {
		started += amount;
	}

	function callCallback() {
	    if(errors && errors.length === 0) {
	        errors = undefined;
        }

	    if(results && results.length === 0) {
	        results = undefined;
        }

        finalCallback(errors, results);
    }

	return {
		dispatchEmpty,
		markOneAsFinished
	};
}

module.exports = AsyncDispatcher;
},{}],"/home/privatesky/modules/bar/utils/isStream.js":[function(require,module,exports){
function isStream(stream){
    return stream !== null && typeof stream === 'object' && typeof stream.pipe === 'function';
}

function isWritable(stream) {
    return isStream(stream) &&
        stream.writable !== false &&
        typeof stream._write === 'function' &&
        typeof stream._writableState === 'object';

}

function isReadable(stream) {
    return isStream(stream) &&
        stream.readable !== false &&
        typeof stream._read === 'function' &&
        typeof stream._readableState === 'object';
}

function isDuplex(stream){
    return isWritable(stream) &&
        isReadable(stream);
}

module.exports = {
    isStream,
    isReadable,
    isWritable,
    isDuplex
};

},{}],"/home/privatesky/modules/csb/flows/addBackup.js":[function(require,module,exports){
const flowsUtils = require("../utils/flowsUtils");
const validator = require("../utils/validator");
const DseedCage = require("../utils/DseedCage");
const fs = require('fs');
const path = require('path');

$$.swarm.describe("addBackup", {
    start: function (backupUrl, localFolder = process.cwd()) {
        if(!backupUrl){
            return this.swarm("interaction", "handleError", new Error("No backup url provided"));
        }

        this.localFolder = localFolder;
        this.backupUrl = backupUrl;
        fs.stat(path.join(this.localFolder, ".privateSky", 'dseed'), (err, stats)=>{
            if(err){
                this.swarm("interaction", "createPin", flowsUtils.defaultPin, flowsUtils.noTries);
            }else{
                this.swarm("interaction", "readPin", flowsUtils.noTries);
            }
        });
    },

    validatePin: function (pin) {
        validator.validatePin(this.localFolder, this, "addBackup", pin, flowsUtils.noTries);
    },

    addBackup: function (pin = flowsUtils.defaultPin, backups) {
        backups = backups || [];
        backups.push(this.backupUrl);
        const dseedCage = new DseedCage(this.localFolder);
        dseedCage.saveDseedBackups(pin, this.csbIdentifier, backups, validator.reportOrContinue(this, 'finish', "Failed to save backups"));
    },

    finish: function () {
        this.swarm("interaction", 'printInfo', this.backupUrl + ' has been successfully added to backups list.');
    }
});
},{"../utils/DseedCage":"/home/privatesky/modules/csb/utils/DseedCage.js","../utils/flowsUtils":"/home/privatesky/modules/csb/utils/flowsUtils.js","../utils/validator":"/home/privatesky/modules/csb/utils/validator.js","fs":false,"path":false}],"/home/privatesky/modules/csb/flows/addCsb.js":[function(require,module,exports){
// var path = require("path");

const utils = require("./../utils/flowsUtils");
// const crypto = require("pskcrypto");
// var fs = require("fs");

$$.swarm.describe("addCsb", {
	start: function (aliasCsb, aliasDestCsb) {
		this.aliasCsb = aliasCsb;
		this.aliasDestCsb = aliasDestCsb;
		this.swarm("interaction", "readPin", 3);
	},
	validatePin: function (pin, noTries) {
		var self = this;
		utils.checkPinIsValid(pin, function (err) {
			if(err){
				self.swarm("interaction", "readPin", noTries-1);
			}else {
				self.addCsb(pin, self.aliasCsb);
			}
		});
	},
	addCsb: function (pin, aliasCSb, aliasDestCsb, callback) {
		var self = this;
		utils.getCsb(pin, aliasCSb, function (err, parentCsb) {
			if(err){
				self.swarm("interaction", "handleError", err, "Failed to get csb");
			}
		});
	}
});
},{"./../utils/flowsUtils":"/home/privatesky/modules/csb/utils/flowsUtils.js"}],"/home/privatesky/modules/csb/flows/attachFile.js":[function(require,module,exports){
const flowsUtils = require("./../utils/flowsUtils");
const utils = require("./../utils/utils");
const crypto = require("pskcrypto");
const fs = require("fs");
const path = require('path');
const validator = require("../utils/validator");
const CSBIdentifier = require("../lib/CSBIdentifier");
const HashCage = require('../utils/HashCage');
const RootCSB = require("../lib/RootCSB");

$$.swarm.describe("attachFile", { //url: CSB1/CSB2/aliasFile
    start: function (url, filePath, localFolder = process.cwd()) { //csb1:assetType:alias
        const {CSBPath, alias} = utils.processUrl(url, 'FileReference');
        this.CSBPath = CSBPath;
        this.alias = alias;
        this.filePath = filePath;
        this.localFolder = localFolder;
        this.swarm("interaction", "readPin", flowsUtils.noTries);
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, 'loadFileReference', pin, noTries);
    },

    withCSBIdentifier: function (id, url, filePath, localFolder = process.cwd()) {
        const {CSBPath, alias} = utils.processUrl(url, 'FileReference');
        this.CSBPath = CSBPath;
        this.alias = alias;
        this.filePath = filePath;
        this.localFolder = localFolder;
        this.csbIdentifier = new CSBIdentifier(id);
        RootCSB.loadWithIdentifier(this.localFolder, this.csbIdentifier, (err, rootCSB) => {
            if (err) {
                this.swarm("interaction", "handleError", err, "Failed to load rootCSB");
                return;
            }

            this.rootCSB = rootCSB;
            this.loadFileReference();

        });
    },

    loadFileReference: function () {
        this.rootCSB.loadRawCSB('', validator.reportOrContinue(this, 'loadAsset', 'Failed to load masterCSB.'));
    },

    loadAsset: function () {
        this.rootCSB.loadAssetFromPath(this.CSBPath, validator.reportOrContinue(this, 'saveFileToDisk', 'Failed to load asset'));
    },

    saveFileToDisk: function (fileReference) {
        if (fileReference.isPersisted()) {
            this.swarm("interaction", "handleError", new Error("File is persisted"), "A file with the same alias already exists ");
            return;
        }

        const csbIdentifier = new CSBIdentifier(undefined, this.csbIdentifier.getBackupUrls());
        this.fileID = utils.generatePath(this.localFolder, csbIdentifier);
        crypto.on('progress', (progress) => {
            this.swarm('interaction', 'reportProgress', progress);
        });
        crypto.encryptStream(this.filePath, this.fileID, csbIdentifier.getDseed(), validator.reportOrContinue(this, 'saveFileReference', "Failed at file encryption.", fileReference, csbIdentifier));

    },


    saveFileReference: function (fileReference, csbIdentifier) {
        crypto.removeAllListeners('progress');
        fileReference.init(this.alias, csbIdentifier.getSeed(), csbIdentifier.getDseed());
        this.rootCSB.saveAssetToPath(this.CSBPath, fileReference, validator.reportOrContinue(this, 'computeHash', "Failed to save file", this.fileID));
    },


    computeHash: function () {
        const fileStream = fs.createReadStream(this.fileID);
        crypto.pskHashStream(fileStream, validator.reportOrContinue(this, "loadHashObj", "Failed to compute hash"));
    },

    loadHashObj: function (digest) {
        this.hashCage = new HashCage(this.localFolder);
        this.hashCage.loadHash(validator.reportOrContinue(this, "addToHashObj", "Failed to load hashObj", digest));
    },

    addToHashObj: function (hashObj, digest) {
        hashObj[path.basename(this.fileID)] = digest.toString("hex");
        this.hashCage.saveHash(hashObj, validator.reportOrContinue(this, "printSuccess", "Failed to save hashObj"));
    },

    printSuccess: function () {
        this.swarm("interaction", "printInfo", this.filePath + " has been successfully added to " + this.CSBPath);
        this.swarm("interaction", "__return__");
    }
});

},{"../lib/CSBIdentifier":"/home/privatesky/modules/csb/lib/CSBIdentifier.js","../lib/RootCSB":"/home/privatesky/modules/csb/lib/RootCSB.js","../utils/HashCage":"/home/privatesky/modules/csb/utils/HashCage.js","../utils/validator":"/home/privatesky/modules/csb/utils/validator.js","./../utils/flowsUtils":"/home/privatesky/modules/csb/utils/flowsUtils.js","./../utils/utils":"/home/privatesky/modules/csb/utils/utils.js","fs":false,"path":false,"pskcrypto":false}],"/home/privatesky/modules/csb/flows/createCsb.js":[function(require,module,exports){
const flowsUtils = require('../utils/flowsUtils');
const RootCSB = require("../lib/RootCSB");
const RawCSB = require("../lib/RawCSB");
const validator = require("../utils/validator");
const DseedCage = require("../utils/DseedCage");
const CSBIdentifier = require("../lib/CSBIdentifier");

$$.swarm.describe("createCsb", {
    start: function (CSBPath, localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.CSBPath = CSBPath || '';
        validator.checkMasterCSBExists(localFolder, (err, status) => {
            if (err) {
                this.swarm("interaction", "createPin", flowsUtils.defaultPin);
            } else {
                this.swarm("interaction", "readPin", flowsUtils.noTries);
            }
        });
    },

    withoutPin: function (CSBPath, backups, localFolder = process.cwd(), seed, isMaster = false) {
        this.localFolder = localFolder;
        this.CSBPath = CSBPath;
        this.isMaster = isMaster;
        if (typeof backups === 'undefined' || backups.length === 0) {
            backups = [ flowsUtils.defaultBackup ];
        }

        validator.checkMasterCSBExists(localFolder, (err, status) => {
            if (err) {
                this.createMasterCSB(backups);
            } else {
                const csbIdentifier = new CSBIdentifier(seed);
                this.withCSBIdentifier(CSBPath, csbIdentifier);
            }
        });

    },

    withCSBIdentifier: function (CSBPath, csbIdentifier) {
        this.CSBPath = CSBPath;
        RootCSB.loadWithIdentifier(this.localFolder, csbIdentifier, validator.reportOrContinue(this, 'createCSB', 'Failed to load master with provided dseed'));
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, "createCSB", pin, noTries);
    },

    loadBackups: function (pin) {
        this.pin = pin;
        this.dseedCage = new DseedCage(this.localFolder);
        this.dseedCage.loadDseedBackups(this.pin, (err, csbIdentifier, backups) => {
            if (err) {
                this.createMasterCSB();
            } else {
                this.createMasterCSB(backups);
            }
        });
    },

    createMasterCSB: function (backups) {
        this.csbIdentifier = new CSBIdentifier(undefined, backups || flowsUtils.defaultBackup);

        this.swarm("interaction", "printSensitiveInfo", this.csbIdentifier.getSeed(), flowsUtils.defaultPin);

        const rawCSB = new RawCSB();
        const meta = rawCSB.getAsset('global.CSBMeta', 'meta');
        meta.init();
        meta.setIsMaster(true);
        if (typeof this.isMaster !== 'undefined') {
            meta.setIsMaster(this.isMaster);
        }
        rawCSB.saveAsset(meta);
        this.rootCSB = RootCSB.createNew(this.localFolder, this.csbIdentifier, rawCSB);
        const nextPhase = (this.CSBPath === '' || typeof this.CSBPath === 'undefined') ? 'saveRawCSB' : 'createCSB';
        if (this.pin) {
            this.dseedCage.saveDseedBackups(this.pin, this.csbIdentifier, backups, validator.reportOrContinue(this, nextPhase, "Failed to save dseed "));
        } else {
            this[nextPhase]();
        }
    },

    createCSB: function (rootCSB) {
        this.rootCSB = this.rootCSB || rootCSB;
        const rawCSB = new RawCSB();
        const meta = rawCSB.getAsset("global.CSBMeta", "meta");
        meta.init();
        meta.setIsMaster(false);
        rawCSB.saveAsset(meta);
        this.saveRawCSB(rawCSB);
    },

    saveRawCSB: function (rawCSB) {
        this.rootCSB.saveRawCSB(rawCSB, this.CSBPath, validator.reportOrContinue(this, "printSuccess", "Failed to save raw CSB"));

    },


    printSuccess: function () {
        let message = "Successfully saved CSB at path " + this.CSBPath;
        if (!this.CSBPath || this.CSBPath === '') {
            message = 'Successfully saved CSB root';
        }
        this.swarm("interaction", "printInfo", message);
        this.swarm('interaction', '__return__');
    }
});

},{"../lib/CSBIdentifier":"/home/privatesky/modules/csb/lib/CSBIdentifier.js","../lib/RawCSB":"/home/privatesky/modules/csb/lib/RawCSB.js","../lib/RootCSB":"/home/privatesky/modules/csb/lib/RootCSB.js","../utils/DseedCage":"/home/privatesky/modules/csb/utils/DseedCage.js","../utils/flowsUtils":"/home/privatesky/modules/csb/utils/flowsUtils.js","../utils/validator":"/home/privatesky/modules/csb/utils/validator.js"}],"/home/privatesky/modules/csb/flows/extractFile.js":[function(require,module,exports){
const flowsUtils = require("./../utils/flowsUtils");
const utils = require("./../utils/utils");
const crypto = require("pskcrypto");
const validator = require("../utils/validator");
const CSBIdentifier = require("../lib/CSBIdentifier");

$$.swarm.describe("extractFile", {
	start: function (url, localFolder = process.cwd()) {
		this.localFolder = localFolder;
		const {CSBPath, alias} = utils.processUrl(url, 'global.FileReference');
		this.CSBPath = CSBPath;
		this.alias = alias;
		this.swarm("interaction", "readPin", flowsUtils.noTries);
	},

	validatePin: function (pin, noTries) {
		validator.validatePin(this.localFolder, this, "loadFileAsset", pin, noTries);
	},

	loadFileAsset: function () {
		this.rootCSB.loadAssetFromPath(this.CSBPath, validator.reportOrContinue(this, "decryptFile", "Failed to load file asset " + this.alias));
	},

	decryptFile: function (fileReference) {
		const csbIdentifier = new CSBIdentifier(fileReference.dseed);
		const filePath = utils.generatePath(this.localFolder, csbIdentifier);

		crypto.on('progress', (progress) => {
            this.swarm('interaction', 'reportProgress', progress);
        });

		crypto.decryptStream(filePath, this.localFolder, csbIdentifier.getDseed(), (err, fileNames) => {
			if(err){
				return this.swarm("interaction", "handleError", err, "Failed to decrypt file" + filePath);
			}

			this.swarm("interaction", "printInfo", this.alias + " was successfully extracted. ");
			this.swarm("interaction", "__return__", fileNames);
		});
	}
});
},{"../lib/CSBIdentifier":"/home/privatesky/modules/csb/lib/CSBIdentifier.js","../utils/validator":"/home/privatesky/modules/csb/utils/validator.js","./../utils/flowsUtils":"/home/privatesky/modules/csb/utils/flowsUtils.js","./../utils/utils":"/home/privatesky/modules/csb/utils/utils.js","pskcrypto":false}],"/home/privatesky/modules/csb/flows/index.js":[function(require,module,exports){
require("callflow");

module.exports = $$.library(function () {
    require('./addCsb');
    require('./addBackup');
    require('./attachFile');
    require('./createCsb');
    require('./extractFile');
    require('./listCSBs');
    require('./resetPin');
    require('./restore');
    require('./receive');
	require('./saveBackup');
    require('./setPin');
});



},{"./addBackup":"/home/privatesky/modules/csb/flows/addBackup.js","./addCsb":"/home/privatesky/modules/csb/flows/addCsb.js","./attachFile":"/home/privatesky/modules/csb/flows/attachFile.js","./createCsb":"/home/privatesky/modules/csb/flows/createCsb.js","./extractFile":"/home/privatesky/modules/csb/flows/extractFile.js","./listCSBs":"/home/privatesky/modules/csb/flows/listCSBs.js","./receive":"/home/privatesky/modules/csb/flows/receive.js","./resetPin":"/home/privatesky/modules/csb/flows/resetPin.js","./restore":"/home/privatesky/modules/csb/flows/restore.js","./saveBackup":"/home/privatesky/modules/csb/flows/saveBackup.js","./setPin":"/home/privatesky/modules/csb/flows/setPin.js","callflow":false}],"/home/privatesky/modules/csb/flows/listCSBs.js":[function(require,module,exports){
const flowsUtils = require("./../utils/flowsUtils");
const validator = require("../utils/validator");
// const fs = require("fs");
const RootCSB = require("../lib/RootCSB");
const CSBIdentifier = require("../lib/CSBIdentifier");

$$.swarm.describe("listCSBs", {
    start: function (CSBPath, localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.CSBPath = CSBPath || '';
        validator.checkMasterCSBExists(localFolder, (err, status) => {
            if (err) {
                this.swarm("interaction", "noMasterCSBExists");
            } else {
                this.swarm("interaction", "readPin", flowsUtils.noTries);
            }
        });
    },

    withCSBIdentifier: function (id, CSBPath = '', localFolder = process.cwd()) {
        this.csbIdentifier = new CSBIdentifier(id);
        this.CSBPath = CSBPath;
        this.localFolder = localFolder;
        this.loadMasterRawCSB();
    },

    loadMasterRawCSB: function () {
        RootCSB.loadWithIdentifier(this.localFolder, this.csbIdentifier, validator.reportOrContinue(this, "loadRawCSB", "Failed to create RootCSB."));
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, 'loadRawCSB', pin, noTries);
    },

    loadRawCSB: function (rootCSB) {
        if(typeof this.rootCSB === "undefined" && rootCSB){
            this.rootCSB = rootCSB;
        }
        this.rootCSB.loadRawCSB(this.CSBPath, validator.reportOrContinue(this, 'getCSBs', 'Failed to load rawCSB'));
    },

    getCSBs: function (rawCSB) {
        const csbReferences = rawCSB.getAllAssets('global.CSBReference');
        const csbsAliases = csbReferences.map((ref) => ref.alias);

        const fileReferences = rawCSB.getAllAssets('global.FileReference');
        const filesAliases = fileReferences.map((ref) => ref.alias);

        this.swarm("interaction", "__return__", {
            csbs: csbsAliases,
            files: filesAliases
        });
    }

});

},{"../lib/CSBIdentifier":"/home/privatesky/modules/csb/lib/CSBIdentifier.js","../lib/RootCSB":"/home/privatesky/modules/csb/lib/RootCSB.js","../utils/validator":"/home/privatesky/modules/csb/utils/validator.js","./../utils/flowsUtils":"/home/privatesky/modules/csb/utils/flowsUtils.js"}],"/home/privatesky/modules/csb/flows/receive.js":[function(require,module,exports){

$$.swarm.describe("receive", {
    start: function (endpoint, channel) {

        const alias = 'remote';
        $$.remote.createRequestManager(1000);
        $$.remote.newEndPoint(alias, endpoint, channel);
        $$.remote[alias].on('*', '*', (err, swarm) => {
            if (err) {
                return this.swarm('interaction', 'handleError', err, 'Failed to get data from channel' + channel);
            }
            const seed = swarm.meta.args[0];
            this.swarm("interaction", "printSensitiveInfo", seed);

            $$.remote[alias].off("*", "*");
        });

    }
});
},{}],"/home/privatesky/modules/csb/flows/resetPin.js":[function(require,module,exports){
const utils = require("./../utils/flowsUtils");
const RootCSB = require("../lib/RootCSB");
const DseedCage = require("../utils/DseedCage");
const CSBIdentifier = require("../lib/CSBIdentifier");

$$.swarm.describe("resetPin", {
    start: function (localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.swarm("interaction", "readSeed", utils.noTries);
    },

    validateSeed: function (seed, noTries) {
        try{
            this.csbIdentifier = new CSBIdentifier(seed);
            RootCSB.loadWithIdentifier(this.localFolder, this.csbIdentifier, (err, rootCSB) => {
                if (err) {
                    this.swarm("interaction", "readSeed", noTries - 1);
                }else{
                    this.swarm("interaction", "insertPin", utils.noTries);
                }
            });
        } catch (e) {
            return this.swarm('interaction', 'handleError', new Error('Invalid seed'));
        }
    },

    actualizePin: function (pin) {
        const dseedCage = new DseedCage(this.localFolder);
        dseedCage.saveDseedBackups(pin, this.csbIdentifier, undefined, (err)=>{
            if(err){
                return this.swarm("interaction", "handleError", "Failed to save dseed.");
            }

            this.swarm("interaction", "printInfo", "The pin has been changed successfully.");
        });
    }
});

},{"../lib/CSBIdentifier":"/home/privatesky/modules/csb/lib/CSBIdentifier.js","../lib/RootCSB":"/home/privatesky/modules/csb/lib/RootCSB.js","../utils/DseedCage":"/home/privatesky/modules/csb/utils/DseedCage.js","./../utils/flowsUtils":"/home/privatesky/modules/csb/utils/flowsUtils.js"}],"/home/privatesky/modules/csb/flows/restore.js":[function(require,module,exports){
const path = require("path");
const flowsUtils = require("./../utils/flowsUtils");
const utils = require("./../utils/utils");
const crypto = require("pskcrypto");
const fs = require("fs");
const validator = require("../utils/validator");
const DseedCage = require("../utils/DseedCage");
const RootCSB = require('../lib/RootCSB');
const CSBIdentifier = require('../lib/CSBIdentifier');
const BackupEngine = require('../lib/BackupEngine');
const HashCage = require('../utils/HashCage');
const AsyncDispatcher = require('../utils/AsyncDispatcher');


$$.swarm.describe("restore", {
    start: function (url, localFolder = process.cwd()) {
        this.localFolder = localFolder;
        if (url) {
            const {CSBPath, alias} = utils.processUrl(url, 'global.CSBReference');
            this.CSBPath = CSBPath;
            this.CSBAlias = alias;
        }

        this.swarm("interaction", "readSeed");
    },

    withSeed: function (url, localFolder = process.cwd(), seedRestore, localSeed) {
        this.localFolder = localFolder;
        if (url) {
            const {CSBPath, alias} = utils.processUrl(url, 'global.CSBReference');
            this.CSBPath = CSBPath;
            this.CSBAlias = alias;
        }

        if (localSeed) {
            this.localCSBIdentifier = new CSBIdentifier(localSeed);
        }

        this.restoreCSB(seedRestore);
    },

    restoreCSB: function (restoreSeed) {
        this.hashCage = new HashCage(this.localFolder);
        this.hashObj = {};
        this.csbRestoreIdentifier = new CSBIdentifier(restoreSeed);
        let backupUrls;
        try {
            backupUrls = this.csbRestoreIdentifier.getBackupUrls();
        } catch (e) {
            return this.swarm('interaction', 'handleError', new Error('Invalid seed'));
        }

        this.backupUrls = backupUrls;
        this.restoreDseedCage = new DseedCage(this.localFolder);
        const backupEngine = new BackupEngine.getBackupEngine(this.backupUrls);

        backupEngine.load(this.csbRestoreIdentifier, (err, encryptedCSB) => {
            if (err) {
                return this.swarm("interaction", "handleError", err, "Failed to restore CSB");
            }

            this.__addCSBHash(this.csbRestoreIdentifier, encryptedCSB);
            this.encryptedCSB = encryptedCSB;

            validator.checkMasterCSBExists(this.localFolder, (err, status) => {
                if (err) {
                    console.log(err);
                }
                if (status === false) {
                    this.createAuxFolder();
                } else if (this.localCSBIdentifier) {
                    if (!this.CSBAlias) {
                        utils.deleteRecursively(this.localFolder, true, (err) => {
                            if (err) {
                                console.log(err);
                            }
                            return this.swarm("interaction", "handleError", new Error("No CSB alias was specified"));
                        });
                    } else {
                        this.writeCSB();
                    }
                } else {
                    if (!this.CSBAlias) {
                        return this.swarm("interaction", "handleError", new Error("No CSB alias was specified"));
                    } else {
                        this.swarm("interaction", "readPin", flowsUtils.noTries);
                    }
                }
            });
        });
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, "writeCSB", pin, noTries);
    },

    createAuxFolder: function () {
        fs.mkdir(path.join(this.localFolder, ".privateSky"), {recursive: true}, validator.reportOrContinue(this, "writeCSB", "Failed to create folder .privateSky"));
    },


    writeCSB: function () {
        fs.writeFile(utils.generatePath(this.localFolder, this.csbRestoreIdentifier), this.encryptedCSB, validator.reportOrContinue(this, "createRootCSB", "Failed to write masterCSB to disk"));
    },

    createRootCSB: function () {
        RootCSB.loadWithIdentifier(this.localFolder, this.csbRestoreIdentifier, validator.reportOrContinue(this, "loadRawCSB", "Failed to create rootCSB with dseed"));
    },

    loadRawCSB: function (rootCSB) {

        this.asyncDispatcher = new AsyncDispatcher(( errs, succs) => {
            this.hashCage.saveHash(this.hashObj, (err) => {
                if (err) {
                    return this.swarm('interaction', 'handleError', err, 'Failed to save hashObj');
                }
                this.swarm('interaction', 'printInfo', 'All CSBs have been restored.');
                this.swarm('interaction', '__return__');

            });
        });
        rootCSB.loadRawCSB('', validator.reportOrContinue(this, "checkCSBStatus", "Failed to load RawCSB", rootCSB));
    },

    checkCSBStatus: function (rawCSB, rootCSB) {
        this.rawCSB = rawCSB;
        const meta = this.rawCSB.getAsset('global.CSBMeta', 'meta');
        if (this.rootCSB) {
            this.attachCSB(this.rootCSB, this.CSBPath, this.CSBAlias, this.csbRestoreIdentifier);
        } else {
            if (meta.isMaster) {
                this.rootCSB = rootCSB;
                this.saveDseed();
            } else {
                this.createMasterCSB();
            }
        }
    },

    saveDseed: function () {
        this.restoreDseedCage.saveDseedBackups(flowsUtils.defaultPin, this.csbRestoreIdentifier, undefined, validator.reportOrContinue(this, "collectFiles", "Failed to save dseed", this.rawCSB, this.csbRestoreIdentifier, '', 'master'));
    },


    createMasterCSB: function () {
        const csbIdentifier = new CSBIdentifier(undefined, this.backupUrls);
        this.swarm("interaction", "printSensitiveInfo", csbIdentifier.getSeed(), flowsUtils.defaultPin);
        this.rootCSB = RootCSB.createNew(this.localFolder, csbIdentifier);
        this.restoreDseedCage.saveDseedBackups(flowsUtils.defaultPin, csbIdentifier, undefined, validator.reportOrContinue(this, "attachCSB", "Failed to save master dseed ", this.rootCSB, this.CSBPath, this.CSBAlias, this.csbRestoreIdentifier));
    },


    attachCSB: function (rootCSB, CSBPath, CSBAlias, csbIdentifier) {
        this.__attachCSB(rootCSB, CSBPath, CSBAlias, csbIdentifier, validator.reportOrContinue(this, 'loadRestoredRawCSB', 'Failed to attach rawCSB'));

    },

    loadRestoredRawCSB: function () {
        this.CSBPath = this.CSBPath.split(':')[0] + '/' + this.CSBAlias;
        this.rootCSB.loadRawCSB(this.CSBPath, validator.reportOrContinue(this, "collectFiles", "Failed to load restored RawCSB", this.csbRestoreIdentifier, this.CSBPath, this.CSBAlias));
    },

    collectFiles: function (rawCSB, csbIdentifier, currentPath, alias, callback) {

        const listFiles = rawCSB.getAllAssets('global.FileReference');
        const asyncDispatcher = new AsyncDispatcher((errs, succs) => {
            this.collectCSBs(rawCSB, csbIdentifier, currentPath, alias);
            if (callback) {
                return callback(errs, succs);
            }
        });

        if (listFiles.length === 0) {
            asyncDispatcher.markOneAsFinished();
        }

        listFiles.forEach((fileReference) => {
            const csbIdentifier = new CSBIdentifier(fileReference.dseed);
            const fileAlias = fileReference.alias;
            const urls = csbIdentifier.getBackupUrls();
            const backupEngine = BackupEngine.getBackupEngine(urls);
            asyncDispatcher.dispatchEmpty();
            backupEngine.load(csbIdentifier, (err, encryptedFile) => {
                if (err) {
                    return this.swarm('interaction', 'handleError', err, 'Could not download file ' + fileAlias);
                }

                this.__addCSBHash(csbIdentifier, encryptedFile);

                fs.writeFile(utils.generatePath(this.localFolder, csbIdentifier), encryptedFile, (err) => {
                    if (err) {
                        return this.swarm('interaction', 'handleError', err, 'Could not save file ' + fileAlias);
                    }

                    asyncDispatcher.markOneAsFinished(undefined, fileAlias);
                });
            });
        });
    },

    collectCSBs: function (rawCSB, csbIdentifier, currentPath, alias) {

        const listCSBs = rawCSB.getAllAssets('global.CSBReference');
        const nextArguments = [];
        let counter = 0;

        if (listCSBs.length === 0) {
            this.asyncDispatcher.dispatchEmpty();
            this.asyncDispatcher.markOneAsFinished();
        }

        if (listCSBs && listCSBs.length > 0) {
            listCSBs.forEach((CSBReference) => {
                const nextPath = currentPath + '/' + CSBReference.alias;
                const nextCSBIdentifier = new CSBIdentifier(CSBReference.dseed);
                const nextAlias = CSBReference.alias;
                const nextURLs = csbIdentifier.getBackupUrls();
                const backupEngine = BackupEngine.getBackupEngine(nextURLs);
                this.asyncDispatcher.dispatchEmpty();
                backupEngine.load(nextCSBIdentifier, (err, encryptedCSB) => {
                    if (err) {
                        return this.swarm('interaction', 'handleError', err, 'Could not download CSB ' + nextAlias);
                    }

                    this.__addCSBHash(nextCSBIdentifier, encryptedCSB);

                    fs.writeFile(utils.generatePath(this.localFolder, nextCSBIdentifier), encryptedCSB, (err) => {
                        if (err) {
                            return this.swarm('interaction', 'handleError', err, 'Could not save CSB ' + nextAlias);
                        }

                        this.rootCSB.loadRawCSB(nextPath, (err, nextRawCSB) => {

                            if (err) {
                                return this.swarm('interaction', 'handleError', err, 'Failed to load CSB ' + nextAlias);
                            }
                            nextArguments.push([ nextRawCSB, nextCSBIdentifier, nextPath, nextAlias ]);

                            if (++counter === listCSBs.length) {
                                nextArguments.forEach((args) => {
                                    this.collectFiles(...args, () => {
                                        this.asyncDispatcher.markOneAsFinished(undefined, alias);
                                    });
                                });
                            }
                        });
                    });
                });
            });
        }
    },

    __tryDownload(urls, csbIdentifier, index, callback) {
        if (index === urls.length) {
            return callback(new Error('Could not download resource'));
        }

        const url = urls[index];
        this.backupEngine.load(url, csbIdentifier, (err, resource) => {
            if (err) {
                return this.__tryDownload(urls, csbIdentifier, ++index, callback);
            }

            callback(undefined, resource);
        });

    },

    __addCSBHash: function (csbIdentifier, encryptedCSB) {
        const pskHash = new crypto.PskHash();
        pskHash.update(encryptedCSB);
        this.hashObj[csbIdentifier.getUid()] = pskHash.digest().toString('hex');

    },

    __attachCSB: function (rootCSB, CSBPath, CSBAlias, csbIdentifier, callback) {
        if (!CSBAlias) {
            return callback(new Error("No CSB alias was specified"));
        }

        rootCSB.loadRawCSB(CSBPath, (err, rawCSB) => {
            if (err) {
                rootCSB.loadAssetFromPath(CSBPath, (err, csbRef) => {
                    if (err) {
                        return callback(err);
                    }

                    csbRef.init(CSBAlias, csbIdentifier.getSeed(), csbIdentifier.getDseed());
                    rootCSB.saveAssetToPath(CSBPath, csbRef, (err) => {
                        if (err) {
                            return callback(err);
                        }

                        callback();
                    });

                });
            } else {
                return callback(new Error(`A CSB having the alias ${CSBAlias} already exists.`));
            }
        });
    }
});


},{"../lib/BackupEngine":"/home/privatesky/modules/csb/lib/BackupEngine.js","../lib/CSBIdentifier":"/home/privatesky/modules/csb/lib/CSBIdentifier.js","../lib/RootCSB":"/home/privatesky/modules/csb/lib/RootCSB.js","../utils/AsyncDispatcher":"/home/privatesky/modules/csb/utils/AsyncDispatcher.js","../utils/DseedCage":"/home/privatesky/modules/csb/utils/DseedCage.js","../utils/HashCage":"/home/privatesky/modules/csb/utils/HashCage.js","../utils/validator":"/home/privatesky/modules/csb/utils/validator.js","./../utils/flowsUtils":"/home/privatesky/modules/csb/utils/flowsUtils.js","./../utils/utils":"/home/privatesky/modules/csb/utils/utils.js","fs":false,"path":false,"pskcrypto":false}],"/home/privatesky/modules/csb/flows/saveBackup.js":[function(require,module,exports){
const utils = require("./../utils/utils");
const fs = require("fs");
const validator = require("../utils/validator");
const HashCage = require('../utils/HashCage');
const AsyncDispatcher = require("../utils/AsyncDispatcher");
const RootCSB = require('../lib/RootCSB');
const CSBIdentifier = require('../lib/CSBIdentifier');
const BackupEngine = require('../lib/BackupEngine');
const path = require('path');


$$.swarm.describe("saveBackup", {
    start: function (localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.swarm("interaction", "readPin", 3);
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, "loadHashFile", pin, noTries);
    },

    withCSBIdentifier: function (id, localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.csbIdentifier = new CSBIdentifier(id);
        RootCSB.loadWithIdentifier(localFolder, this.csbIdentifier, (err, rootCSB) => {
            if (err) {
                this.swarm('interaction', 'handleError', err, 'Failed to load root CSB');
                return;
            }

            this.rootCSB = rootCSB;
            this.loadHashFile();
        });
    },

    loadHashFile: function (pin, backups) {
        this.backups = backups;
        this.hashCage = new HashCage(this.localFolder);
        this.hashCage.loadHash(validator.reportOrContinue(this, 'readEncryptedMaster', 'Failed to load hash file'));
    },

    readEncryptedMaster: function (hashFile) {
        this.hashFile = hashFile;
        this.masterID = utils.generatePath(this.localFolder, this.csbIdentifier);
        fs.readFile(this.masterID, validator.reportOrContinue(this, 'loadMasterRawCSB', 'Failed to read masterCSB.'));
    },


    loadMasterRawCSB: function () {
        this.rootCSB.loadRawCSB('', validator.reportOrContinue(this, "dispatcher", "Failed to load masterCSB"));
    },

    dispatcher: function (rawCSB) {
        this.asyncDispatcher = new AsyncDispatcher((errors, results) => {
            if (errors) {
                this.swarm('interaction', 'handleError', JSON.stringify(errors, null, '\t'), 'Failed to collect all CSBs');
                return;
            }
            this.collectFiles(results);
        });

        this.asyncDispatcher.dispatchEmpty();
        this.collectCSBs(rawCSB, this.csbIdentifier, '', 'master');
    },

    collectCSBs: function (rawCSB, csbIdentifier, currentPath, alias) {
        const listCSBs = rawCSB.getAllAssets('global.CSBReference');

        const nextArguments = [];
        let counter = 0;

        listCSBs.forEach((CSBReference) => {
            const nextPath = currentPath + '/' + CSBReference.alias;
            const nextCSBIdentifier = new CSBIdentifier(CSBReference.dseed);
            const nextAlias = CSBReference.alias;
            this.rootCSB.loadRawCSB(nextPath, (err, nextRawCSB) => {
                if (err) {
                    console.log(err);
                }
                nextArguments.push([ nextRawCSB, nextCSBIdentifier, nextPath, nextAlias ]);
                if (++counter === listCSBs.length) {
                    nextArguments.forEach((args) => {
                        this.asyncDispatcher.dispatchEmpty();
                        this.collectCSBs(...args);
                    });
                    this.asyncDispatcher.markOneAsFinished(undefined, {rawCSB, csbIdentifier, alias});
                }
            });
        });

        if (listCSBs.length === 0) {
            this.asyncDispatcher.markOneAsFinished(undefined, {rawCSB, csbIdentifier, alias});
        }
    },

    collectFiles: function (collectedCSBs) {
        this.asyncDispatcher = new AsyncDispatcher((errors, newResults) => {
            if (errors) {
                this.swarm('interaction', 'handleError', JSON.stringify(errors, null, '\t'), 'Failed to collect files attached to CSBs');
            }

            if (!newResults) {
                newResults = [];
            }
            this.__categorize(collectedCSBs.concat(newResults));
        });

        this.asyncDispatcher.dispatchEmpty(collectedCSBs.length);
        collectedCSBs.forEach(({rawCSB, csbIdentifier, alias}) => {
            this.__collectFiles(rawCSB, alias);
        });

    },

    __categorize: function (files) {
        const categories = {};
        let backups;
        files.forEach(({csbIdentifier, alias}) => {
            if (!this.backups || this.backups.length === 0) {
                backups = csbIdentifier.getBackupUrls();
            } else {
                backups = this.backups;
            }
            const uid = csbIdentifier.getUid();
            categories[uid] = {backups, alias};
        });

        this.asyncDispatcher = new AsyncDispatcher((errors, successes) => {
            this.swarm('interaction', 'csbBackupReport', {errors, successes});
        });

        this.backupEngine = BackupEngine.getBackupEngine(backups);
        this.filterFiles(categories);
        // Object.entries(categories).forEach(([uid, {alias, backups}]) => {
        //     this.filterFiles(uid, alias, backups);
        // });
    },

    filterFiles: function (filesBackups) {
        const filesToUpdate = {};
        Object.keys(this.hashFile).forEach((uid) => {
            if (filesBackups[uid]) {
                filesToUpdate[uid] = this.hashFile[uid];
            }
        });

        this.asyncDispatcher.dispatchEmpty();
        this.backupEngine.compareVersions(filesToUpdate, (err, modifiedFiles) => {
            if (err) {
                return this.swarm("interaction", "handleError", err, "Failed to retrieve list of modified files");
            }

            this.__backupFiles(JSON.parse(modifiedFiles), filesBackups);
        });
    },

    __backupFiles: function (files, filesBackups) {
        this.asyncDispatcher.dispatchEmpty(files.length);
        files.forEach((file) => {
            const fileStream = fs.createReadStream(path.join(this.localFolder, file));
            const backupUrls = filesBackups[file].backups;
            const backupEngine = BackupEngine.getBackupEngine(backupUrls);
            backupEngine.save(new CSBIdentifier(file), fileStream, (err, url) => {
                if (err) {
                    return  this.asyncDispatcher.markOneAsFinished({alias: filesBackups[file].alias, backupURL: url});
                }

                this.asyncDispatcher.markOneAsFinished(undefined, {alias: filesBackups[file].alias, backupURL: url});
            });
        });

        this.asyncDispatcher.markOneAsFinished(); // for http request to compareVersions
    },

    __collectFiles: function (rawCSB, csbAlias) {
        const files = rawCSB.getAllAssets('global.FileReference');
        this.asyncDispatcher.dispatchEmpty(files.length);
        files.forEach((FileReference) => {
            const alias = FileReference.alias;
            const csbIdentifier = new CSBIdentifier(FileReference.dseed);
            this.asyncDispatcher.markOneAsFinished(undefined, {csbIdentifier, alias});
        });
        this.asyncDispatcher.markOneAsFinished();
    }
});


},{"../lib/BackupEngine":"/home/privatesky/modules/csb/lib/BackupEngine.js","../lib/CSBIdentifier":"/home/privatesky/modules/csb/lib/CSBIdentifier.js","../lib/RootCSB":"/home/privatesky/modules/csb/lib/RootCSB.js","../utils/AsyncDispatcher":"/home/privatesky/modules/csb/utils/AsyncDispatcher.js","../utils/HashCage":"/home/privatesky/modules/csb/utils/HashCage.js","../utils/validator":"/home/privatesky/modules/csb/utils/validator.js","./../utils/utils":"/home/privatesky/modules/csb/utils/utils.js","fs":false,"path":false}],"/home/privatesky/modules/csb/flows/setPin.js":[function(require,module,exports){
const validator = require("../utils/validator");
const DseedCage = require('../utils/DseedCage');

$$.swarm.describe("setPin", {
    start: function (localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.swarm("interaction", "readPin", 3);
    },

    validatePin: function (oldPin, noTries) {
        this.oldPin = oldPin;
        validator.validatePin(this.localFolder, this, "interactionJumper", oldPin, noTries);
    },

    interactionJumper: function () {
        this.swarm("interaction", "enterNewPin");
    },

    actualizePin: function (newPin) {
        this.dseedCage = new DseedCage(this.localFolder);
        this.dseedCage.loadDseedBackups(this.oldPin, validator.reportOrContinue(this, "saveDseed", "Failed to load dseed.", newPin));
    },

    saveDseed: function (csbIdentifier, backups, pin) {
        this.dseedCage.saveDseedBackups(pin, csbIdentifier, backups, validator.reportOrContinue(this, "successState", "Failed to save dseed"));
    },

    successState: function () {
        this.swarm("interaction", "printInfo", "The pin has been successfully changed.");
    }
});
},{"../utils/DseedCage":"/home/privatesky/modules/csb/utils/DseedCage.js","../utils/validator":"/home/privatesky/modules/csb/utils/validator.js"}],"/home/privatesky/modules/csb/lib/BackupEngine.js":[function(require,module,exports){
const AsyncDispatcher = require("../utils/AsyncDispatcher");
const EVFSResolver = require("./backupResolvers/EVFSResolver");
// const crypto = require("pskcrypto");

function BackupEngineBuilder() {
    const resolvers = {};
    this.addResolver = function (name, resolver) {
        resolvers[name] = resolver;
    };

    this.getBackupEngine = function(urls) {
        if (!urls || urls.length === 0) {
            throw new Error("No url was provided");
        }

        return new BackupEngine(urls, resolvers);
    };
}

function BackupEngine(urls, resolvers) {

    this.save = function (csbIdentifier, dataStream, callback) {
        const asyncDispatcher = new AsyncDispatcher(callback);
        asyncDispatcher.dispatchEmpty(urls.length);
        for (const url of urls) {
            resolverForUrl(url, (err, resolver) => {
                if(err){
                    return callback(err);
                }
                resolver.auth(url, undefined, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    resolver.save(url, csbIdentifier, dataStream, (err) => {
                        if (err) {
                            asyncDispatcher.markOneAsFinished(err);
                            return;
                        }
                        asyncDispatcher.markOneAsFinished(undefined, url);
                    });
                });
            });
        }
    };

    this.load = function (csbIdentifier, version, callback) {
        if (typeof version === "function") {
            callback = version;
            version = "";
        }

        tryDownload(csbIdentifier, version, 0, (err, resource) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, resource);
        });
    };

    this.getVersions = function (csbIdentifier, callback) {
        console.log("Empty function");
    };

    this.compareVersions = function (fileList, callback) {
        const url = urls[0];
        resolverForUrl(url, (err, resolver) => {
            if (err) {
                return callback(err);
            }

            resolver.auth(url, undefined, (err) => {
                if (err) {
                    return callback(err);
                }

                resolver.compareVersions(url, fileList, callback);
            });
        });
    };

    //------------------------------------------------ INTERNAL METHODS ------------------------------------------------

    function resolverForUrl(url, callback) {
        const keys = Object.keys(resolvers);
        let resolver;
        let i;

        for (i = 0; i < keys.length; ++i) {
            if (match(keys[i], url)) {
                resolver = resolvers[keys[i]];
                break;
            }
        }

        if (i === keys.length) {
            resolver = resolvers['evfs'];
            if (!resolver) {
                return callback(new Error(`No resolver matches the url ${url}`));
            }
        }

        callback(undefined, resolver);
    }

    function match(str1, str2) {
        return str1.includes(str2) || str2.includes(str1);
    }


    function tryDownload(csbIdentifier, version, index, callback) {
        if (index === urls.length) {
            return callback(new Error("Failed to download resource"));
        }

        const url = urls[index];
        resolverForUrl(url, (err, resolver) => {
            if (err) {
                return callback(err);
            }

            resolver.auth(url, undefined, (err) => {
                if (err) {
                    return tryDownload(csbIdentifier, version, ++index, callback);
                }

                resolver.load(url, csbIdentifier, version, (err, resource) =>{
                    if (err) {
                        return tryDownload(csbIdentifier, version, ++index, callback);
                    }

                    callback(undefined, resource);
                });
            });

        });
    }
}

const engineBuilder = new BackupEngineBuilder();

// engineBuilder.addResolver('dropbox', new DropboxResolver());
// engineBuilder.addResolver('drive', new DriveResolver());
engineBuilder.addResolver('evfs', new EVFSResolver());

module.exports = {
    getBackupEngine: function (urls) {
        return engineBuilder.getBackupEngine(urls);
    }
};

},{"../utils/AsyncDispatcher":"/home/privatesky/modules/csb/utils/AsyncDispatcher.js","./backupResolvers/EVFSResolver":"/home/privatesky/modules/csb/lib/backupResolvers/EVFSResolver.js"}],"/home/privatesky/modules/csb/lib/CSBIdentifier.js":[function(require,module,exports){
(function (Buffer){
const crypto = require("pskcrypto");


function CSBIdentifier(id, domain, keyLen = 32) {
    let seed;
    let dseed;
    let uid;
    let encSeed;

    //TODO: eliminate unused var
    // let encDseed;

    init();

    this.getSeed = function () {
        if(!seed){
            throw new Error("Cannot return seed. Access is denied.");
        }

        return generateCompactForm(seed);
    };

    this.getDseed = function () {
        if(dseed){
            return generateCompactForm(dseed);
        }

        if(seed){
            dseed = deriveSeed(seed);
            return generateCompactForm(dseed);
        }

        throw new Error("Cannot return derived seed. Access is denied.");
    };

    this.getUid = function () {
        if(uid){
            return generateCompactForm(uid).toString();
        }

        if(dseed){
            uid = computeUid(dseed);
            return generateCompactForm(uid).toString();
        }

        if(seed){
            dseed = deriveSeed(seed);
            uid = computeUid(dseed);
            return generateCompactForm(uid).toString();
        }

        throw new Error("Cannot return uid");
    };

    this.getEncSeed = function (encryptionKey) {
        if(encSeed){
            return generateCompactForm(encSeed);
        }

        if(!seed){
            throw new Error("Cannot return encSeed. Access is denied");
        }

        if (!encryptionKey) {
            throw new Error("Cannot return encSeed. No encryption key was provided");
        }

        //TODO: encrypt seed using encryptionKey. Encryption algorithm remains to be chosen
    };



    this.getDomain = function () {
        if(seed){
            return seed.domain;
        }

        if(dseed){
            return dseed.domain;
        }

        throw new Error("Backup URLs could not be retrieved. Access is denied");
    };

    //------------------------------ internal methods ------------------------------
    function init() {
        if (!id) {
            if (!domain) {
                throw new Error("No domains provided.");
            }

            seed = create();
        }else{
            classifyId();
        }
    }

    function classifyId() {
        if (typeof id !== "string" && !Buffer.isBuffer(id) && !(typeof id === "object" && !Buffer.isBuffer(id))) {
            throw new Error(`Id must be a string or a buffer. The type provided was ${typeof id}`);
        }

        const expandedId = load(id);
        switch(expandedId.tag){
            case 's':
                seed = expandedId;
                break;
            case 'd':
                dseed = expandedId;
                break;
            case 'u':
                uid = expandedId;
                break;
            case 'es':
                encSeed = expandedId;
                break;
            case 'ed':
                encDseed = expandedId;
                break;
            default:
                throw new Error('Invalid tag');
        }
    }

    function create() {
        const localSeed = {};
        if (!Array.isArray(domain)) {
            domain = [ domain ];
        }

        localSeed.tag    = 's';
        localSeed.random = crypto.randomBytes(keyLen);
        localSeed.domain = domain;

        return localSeed;
    }

    function deriveSeed(seed) {
        let compactSeed = seed;

        if (typeof seed === 'object' && !Buffer.isBuffer(seed)) {
            compactSeed = generateCompactForm(seed);
        }

        if (Buffer.isBuffer(seed)) {
            compactSeed = seed.toString();
        }

        if (compactSeed[0] === 'd') {
            throw new Error('Tried to derive an already derived seed.');
        }

        const decodedCompactSeed = decodeURIComponent(compactSeed);
        const splitCompactSeed = decodedCompactSeed.substring(1).split('|');
        const strSeed = Buffer.from(splitCompactSeed[0], 'base64').toString('hex');
        const domain = Buffer.from(splitCompactSeed[1], 'base64').toString();
        const dseed = {};

        dseed.tag = 'd';
        dseed.random = crypto.deriveKey(strSeed, null, keyLen);
        dseed.domain = JSON.parse(domain);

        return dseed;
    }

    function computeUid(dseed){
        if(!dseed){
            throw new Error("Dseed was not provided");
        }

        if (typeof dseed === "object" && !Buffer.isBuffer(dseed)) {
            dseed = generateCompactForm(dseed);
        }

        const uid = {};
        uid.tag = 'u';
        uid.random = Buffer.from(crypto.generateSafeUid(dseed));

        return uid;
    }

    function generateCompactForm({tag, random, domain}) {
        let compactId = tag + random.toString('base64');
        if (domain) {
            compactId += '|' + Buffer.from(JSON.stringify(domain)).toString('base64');
        }
        return Buffer.from(encodeURIComponent(compactId));
    }

    // TODO: unused function!!!
    // function encrypt(id, encryptionKey) {
    //     if(arguments.length !== 2){
    //         throw new Error(`Wrong number of arguments. Expected: 2; provided ${arguments.length}`);
    //     }

    //     let tag;
    //     if (typeof id === "object" && !Buffer.isBuffer(id)) {
    //         tag = id.tag;
    //         id = generateCompactForm(id);
    //     }

    //     if (tag === 's') {
    //         //TODO encrypt seed
    //     }else if (tag === 'd') {
    //         //TODO encrypt dseed
    //     }else{
    //         throw new Error("The provided id cannot be encrypted");
    //     }

    // }

    function load(compactId) {
        if(typeof compactId === "undefined") {
            throw new Error(`Expected type string or Buffer. Received undefined`);
        }

        if(typeof compactId !== "string"){
            if (typeof compactId === "object" && !Buffer.isBuffer(compactId)) {
                compactId = Buffer.from(compactId);
            }

            compactId = compactId.toString();
        }

        const decodedCompactId = decodeURIComponent(compactId);
        const id = {};
        const splitCompactId = decodedCompactId.substring(1).split('|');

        id.tag = decodedCompactId[0];
        id.random = Buffer.from(splitCompactId[0], 'base64');

        if(splitCompactId[1] && splitCompactId[1].length > 0){
            id.domain = JSON.parse(Buffer.from(splitCompactId[1], 'base64').toString());
        }

        return id;
    }
}

module.exports = CSBIdentifier;

}).call(this,require("buffer").Buffer)

},{"buffer":false,"pskcrypto":false}],"/home/privatesky/modules/csb/lib/Header.js":[function(require,module,exports){
const Brick = require("bar").Brick;
const pskCrypto = require("pskcrypto");

function Header(previousHeaderHash, files, transactions){
    previousHeaderHash = previousHeaderHash || "";
    files = files || {};
    transactions = transactions || [];

    this.toBrick = function (encryptionKey) {
        const headerObj = {previousHeaderHash, files, transactions};
        const encryptedHeaderObj = pskCrypto.encrypt(headerObj, encryptionKey);
        return new Brick(encryptedHeaderObj);
    };

    this.fromBrick = function (brick, decryptionKey) {
        const headerObj = JSON.parse(pskCrypto.decrypt(brick, decryptionKey));
        previousHeaderHash = headerObj.previousHeaderHash;
        files = headerObj.files;
        transactions = headerObj.transactions;
    };

    this.setPreviousHeaderHash = function (hash) {
        previousHeaderHash = hash;
    };

    this.getPreviousHeaderHash = function () {
        return previousHeaderHash;
    };

    this.addTransactions = function (newTransactions) {
        if (!Array.isArray(newTransactions)) {
            newTransactions = [ newTransactions ];
        }

        transactions = transactions.concat(newTransactions);
    };

    this.getTransactions = function () {
        return transactions;
    };

    this.addFiles = function (newFiles) {
        if (typeof newFiles !== "object" || Array.isArray(newFiles)) {
            throw new Error('Invalid type. Expected non-array object');
        }

        const newFilesKeys = Object.keys(newFiles);
        newFilesKeys.forEach((fileAlias) => {
            files[fileAlias] = newFiles[fileAlias];
        });
    };

    this.getFiles = function () {
        return files;
    };

    this.getHeaderObject = function () {

        return {
            previousHeaderHash,
            files,
            transactions
        };
    };

}

module.exports = Header;
},{"bar":"bar","pskcrypto":false}],"/home/privatesky/modules/csb/lib/HeadersHistory.js":[function(require,module,exports){
const Brick = require("bar").Brick;
const pskCrypto = require("pskcrypto");

function HeadersHistory(initHeaders) {

    let headers = initHeaders || [];
    this.addHeader = function (headerBrick, encryptionKey) {
        const headerEntry = {};
        const headerHash = headerBrick.generateHash();
        headerEntry[headerHash] = encryptionKey;
        headers.push(headerEntry);
    };

    this.getHeaders = function () {
        return headers;
    };

    this.getLastHeaderHash = function () {
        if (headers.length > 0) {
            const headerEntry = headers[headers.length - 1];
            return Object.keys(headerEntry)[0];
        }
    };

    this.toBrick = function (encryptionKey) {
        return new Brick(pskCrypto.encrypt(headers, encryptionKey));
    };

    this.fromBrick = function (brick, decryptionKey) {
        headers = JSON.parse(pskCrypto.decrypt(brick, decryptionKey).toString());
    };

}

module.exports = HeadersHistory;
},{"bar":"bar","pskcrypto":false}],"/home/privatesky/modules/csb/lib/RawCSB.js":[function(require,module,exports){
const OwM = require('swarmutils').OwM;
const pskdb = require('pskdb');

function RawCSB(initData) {
	const data = new OwM({blockchain: initData});
	const blockchain = pskdb.startDb({getInitValues, persist});

	if(!data.blockchain) {
		data.blockchain = {
			transactionLog: []
		};
	}

	data.attachFile = function (fileAlias, path, seed) {
		data.modifyAsset("global.FileReference", fileAlias, (file) => {
			if (!file.isEmpty()) {
				console.log(`File with alias ${fileAlias} already exists`);
				return;
			}

			file.init(fileAlias, path, seed);
		});
	};

	data.saveAsset = function(asset) {
		const transaction = blockchain.beginTransaction({});
		transaction.add(asset);
		blockchain.commit(transaction);
	};

	data.modifyAsset = function(assetType, aid, assetModifier) {
		const transaction = blockchain.beginTransaction({});
		const asset = transaction.lookup(assetType, aid);
		assetModifier(asset);

		transaction.add(asset);
		blockchain.commit(transaction);
	};

	data.getAsset = function (assetType, aid) {
		const transaction = blockchain.beginTransaction({});
		return transaction.lookup(assetType, aid);
	};

	data.getAllAssets = function(assetType) {
		const transaction = blockchain.beginTransaction({});
		return transaction.loadAssets(assetType);
	};

	data.applyTransaction = function (transactionSwarm) {
		// const transaction = blockchain.beginTransaction(transactionSwarm);
		blockchain.commitSwarm(transactionSwarm);
		// blockchain.commit(transaction);
	};

	data.getTransactionLog = function () {
		return data.blockchain.transactionLog;
	};
	/* internal functions */

	function persist(transactionLog, currentValues, currentPulse) {
		transactionLog.currentPulse = currentPulse;

		data.blockchain.currentValues = currentValues;
		data.blockchain.transactionLog.push(transactionLog);
	}

	function getInitValues () {
		if(!data.blockchain || !data.blockchain.currentValues) {
			return null;
		}
		return data.blockchain.currentValues;
	}

	return data;
}

module.exports = RawCSB;
},{"pskdb":"pskdb","swarmutils":false}],"/home/privatesky/modules/csb/lib/RootCSB.js":[function(require,module,exports){
const RawCSB = require('./RawCSB');
const crypto = require('pskcrypto');
const CSBIdentifier = require("./CSBIdentifier");
const Header = require("./Header");
const HeadersHistory = require("./HeadersHistory");
const EDFSBrickStorage = require("edfs-brick-storage");
const Bar = require("bar");
const AsyncDispatcher = require("../../edfs/utils/AsyncDispatcher");
const Brick = Bar.Brick;
/**
 *
 * @param currentRawCSB - optional
 * @param csbIdentifier - required
 * @constructor
 */
function RootCSB(currentRawCSB, csbIdentifier, accessPoint) {
    this.getMidRoot = function (CSBPath, callback) {
        throw new Error('Not implemented');
    };

    this.createRawCSB = function () {
        return new RawCSB();
    };

    this.loadRawCSB = function (CSBPath, callback) {
        if (!currentRawCSB) {
            edfsBlockchainProxy.getCSBAnchor(csbIdentifier, (err, csbAnchor) => {
                if (err) {
                    return callback(err);
                }

                __loadRawCSB(csbIdentifier, csbAnchor.headerHistoryHash,(err, rawCSB) => {
                    if (err) {
                        return callback(err);
                    }

                    currentRawCSB = rawCSB;

                    if (CSBPath || CSBPath !== '') {
                        this.loadRawCSB(CSBPath, callback);
                        return;
                    }

                    callback(undefined, currentRawCSB);
                });
            });
            return;
        }
        if (!CSBPath || CSBPath === '') {
            return callback(null, currentRawCSB);
        }

        this.loadAssetFromPath(CSBPath, (err, asset, rawCSB) => {

            if (err) {
                return callback(err);
            }

            if (!asset || !asset.dseed) {
                return callback(new Error(`The CSBPath ${CSBPath} is invalid.`));
            }

            __loadRawCSB(new CSBIdentifier(asset.dseed), asset.headerHistoryHash, callback);
        });
    };

    this.loadAssetFromPath = function (CSBPath, callback) {
        let processedPath = __splitPath(CSBPath);
        if (!currentRawCSB) {
            return callback(new Error('currentRawCSB does not exist'));
        }

        let CSBReference = null;
        if (processedPath.CSBAliases.length > 0) {
            const nextAlias = processedPath.CSBAliases[0];
            CSBReference = currentRawCSB.getAsset('global.CSBReference', nextAlias);
        } else {
            if (!processedPath.assetType || !processedPath.assetAid) {
                return callback(new Error('Not asset type or id specified in CSBPath'));
            }

            CSBReference = currentRawCSB.getAsset(processedPath.assetType, processedPath.assetAid);
        }

        if (processedPath.CSBAliases.length === 0) {
            return callback(null, CSBReference, currentRawCSB);
        }

        processedPath.CSBAliases.shift();

        if(!CSBReference || !CSBReference.dseed){
            return callback(new Error(`The CSBPath ${CSBPath} is invalid`));
        }
        __loadAssetFromPath(processedPath, new CSBIdentifier(CSBReference.dseed), CSBReference.barMapHash, 0, callback);
    };

    this.saveAssetToPath = function (CSBPath, asset, callback) {
        const splitPath = __splitPath(CSBPath, {keepAliasesAsString: true});
        this.loadRawCSB(splitPath.CSBAliases, (err, rawCSB) => {
            if (err) {
                return callback(err);
            }
            try {
                rawCSB.saveAsset(asset);
                this.saveRawCSB(rawCSB, splitPath.CSBAliases, callback);
            } catch (e) {
                return callback(e);
            }
        });
    };

    this.saveRawCSB = function (rawCSB, CSBPath, callback) {
        if (!CSBPath || CSBPath === '') {
            if (rawCSB) {
                currentRawCSB = rawCSB;
            }
        }

        const transactions = rawCSB.getTransactionLog();
        const headersHistory = new HeadersHistory();
        const header = new Header();
        edfsBlockchainProxy.getCSBAnchor(csbIdentifier, (err, csbAnchor) => {
            if (err) {
                console.log(err); //TODO: better handling
            }
            if (csbAnchor && typeof csbAnchor.headerHistoryHash !== "undefined") {
                edfsServiceProxy.getBrick(csbAnchor.headerHistoryHash, (err, headersHistoryBrick) => {
                    if (err) {
                        return callback(err);
                    }

                    headersHistory.fromBrick(headersHistoryBrick, csbIdentifier.getDseed());
                    header.setPreviousHeaderHash(headersHistory.getLastHeaderHash());
                    return __saveRawCSB(csbAnchor, headersHistory, header, transactions, callback);
                });
            }
            csbAnchor.init(csbIdentifier.getUid(), csbIdentifier.getUid());
            __saveRawCSB(csbAnchor, headersHistory, header, transactions, callback);
        });
    };


    /* ------------------- INTERNAL METHODS ------------------- */


    /**
     *
     * @param CSBPath: string - internal path that looks like /{CSBName1}/{CSBName2}:{assetType}:{assetAliasOrId}
     * @param options:object
     * @returns {{CSBAliases: [string], assetAid: (*|undefined), assetType: (*|undefined)}}
     * @private
     */
    function __splitPath(CSBPath, options = {}) {
        const pathSeparator = '/';

        if (CSBPath.startsWith(pathSeparator)) {
            CSBPath = CSBPath.substring(1);
        }

        let CSBAliases = CSBPath.split(pathSeparator);
        if (CSBAliases.length < 1) {
            throw new Error('CSBPath too short');
        }

        const lastIndex = CSBAliases.length - 1;
        const optionalAssetSelector = CSBAliases[lastIndex].split(':');

        if (optionalAssetSelector[0] === '') {
            CSBAliases = [];
        } else {
            CSBAliases[lastIndex] = optionalAssetSelector[0];
        }

        if (!optionalAssetSelector[1] && !optionalAssetSelector[2]) {
            optionalAssetSelector[1] = 'global.CSBReference';
            optionalAssetSelector[2] = CSBAliases[lastIndex];
            CSBAliases.pop();
        }

        if (options.keepAliasesAsString === true) {
            CSBAliases = CSBAliases.join('/');
        }
        return {
            CSBAliases: CSBAliases,
            assetType: optionalAssetSelector[1],
            assetAid: optionalAssetSelector[2]
        };
    }

    function __saveRawCSB(csbAnchor, headersHistory, header, transactions, callback) {
        const asyncDispatcher = new AsyncDispatcher(() => {
            const headerEncryptionKey = crypto.randomBytes(32);
            const headerBrick = header.toBrick(headerEncryptionKey);
            edfsServiceProxy.addBrick(headerBrick, (err) => {
                if (err) {
                    return callback(err);
                }

                headersHistory.addHeader(headerBrick, headerEncryptionKey);
                const historyBrick = headersHistory.toBrick(csbIdentifier.getDseed());
                edfsServiceProxy.addBrick(historyBrick, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    csbAnchor.updateHeaderHistoryHash(historyBrick.generateHash());
                    edfsBlockchainProxy.setCSBAnchor(csbAnchor, (err) => {
                        if (err) {
                            return callback(err);
                        }

                        callback();
                    });
                });
            });

        });

        asyncDispatcher.dispatchEmpty(transactions.length);
        transactions.forEach((transaction) => {
            const encryptionKey = crypto.randomBytes(32);
            const transactionBrick = new Brick(crypto.encrypt(transaction, encryptionKey));
            const transactionEntry = {};
            const transactionHash = transactionBrick.generateHash();
            transactionEntry[transactionHash] = encryptionKey;
            header.addTransactions(transactionEntry);
            edfsServiceProxy.addBrick(transactionBrick, (err) => {
                if (err) {
                    return callback(err);
                }

                asyncDispatcher.markOneAsFinished();
            });
        });
    }



    function __loadRawCSB(localCSBIdentifier, localHeaderHistoryHash, callback) {
        if(typeof localHeaderHistoryHash === "function"){
            callback = localHeaderHistoryHash;
        }

        const rawCSB = new RawCSB();
        edfsServiceProxy.getBrick(localHeaderHistoryHash, (err, headersHistoryBrickData) => {
            if (err) {
                return callback(err);
            }

            const headersHistory = new HeadersHistory();
            headersHistory.fromBrick(headersHistoryBrickData, localCSBIdentifier.getDseed());
            const headersAsyncDispatcher = new AsyncDispatcher((errors, results) => {
                callback(undefined, rawCSB);
            });

            const headers = headersHistory.getHeaders();
            headersAsyncDispatcher.dispatchEmpty(headers.length);
            headers.forEach((headerEntry) => {
                const headerHash = Object.keys(headerEntry)[0];
                edfsServiceProxy.getBrick(headerHash, (err, headerBrick) => {
                    if (err) {
                        return callback(err);
                    }
                    const header = new Header();
                    header.fromBrick(headerBrick, headerEntry[headerHash]);
                    const transactionsEntries = header.getTransactions();
                    const transactionsAsyncDispatcher = new AsyncDispatcher((errors, results) => {
                        const resultsObj = {};
                        results.forEach((result) => {
                            const key = Object.keys(result)[0];
                            resultsObj[key] = Object.values(result[key])[0];
                        });

                        transactionsEntries.forEach((transactionEntry) => {
                            const transactionHash = Object.keys(transactionEntry)[0];
                            rawCSB.applyTransaction(resultsObj[transactionHash].swarm);
                        });

                        headersAsyncDispatcher.markOneAsFinished();
                    });
                    transactionsAsyncDispatcher.dispatchEmpty(transactionsEntries.length);
                    transactionsEntries.forEach((transactionEntry) => {
                        const transactionHash = Object.keys(transactionEntry)[0];
                        edfsServiceProxy.getBrick(transactionHash, (err, transactionBrick) => {
                            if (err) {
                                return callback(err);
                            }

                            const transactionObj = {};
                            transactionObj[transactionHash] = crypto.decryptObject(transactionBrick, transactionEntry[transactionHash]);
                            transactionsAsyncDispatcher.markOneAsFinished(undefined, transactionObj);

                        });
                    });
                });
            });
        });
    }

    function __loadAssetFromPath(processedPath, localCSBIdentifier, localHeaderHistoryHash, currentIndex, callback) {
        __loadRawCSB(localCSBIdentifier, (err, rawCSB) => {
            if (err) {
                return callback(err);
            }

            if (currentIndex < processedPath.CSBAliases.length) {
                const nextAlias = processedPath.CSBAliases[currentIndex];
                const asset = rawCSB.getAsset("global.CSBReference", nextAlias);
                const newCSBIdentifier = new CSBIdentifier(asset.dseed);

                __loadAssetFromPath(processedPath, newCSBIdentifier, ++currentIndex, callback);
                return;
            }

            const asset = rawCSB.getAsset(processedPath.assetType, processedPath.assetAid);
            callback(null, asset, rawCSB);

        });

    }

}


module.exports = RootCSB;

},{"../../edfs/utils/AsyncDispatcher":"/home/privatesky/modules/edfs/utils/AsyncDispatcher.js","./CSBIdentifier":"/home/privatesky/modules/csb/lib/CSBIdentifier.js","./Header":"/home/privatesky/modules/csb/lib/Header.js","./HeadersHistory":"/home/privatesky/modules/csb/lib/HeadersHistory.js","./RawCSB":"/home/privatesky/modules/csb/lib/RawCSB.js","bar":"bar","edfs-brick-storage":"edfs-brick-storage","pskcrypto":false}],"/home/privatesky/modules/csb/lib/backupResolvers/EVFSResolver.js":[function(require,module,exports){

function EVFSResolver() {
    let isAuthenticated = false;

    this.auth = function (url, authObj, callback) {
        isAuthenticated = true;
        callback();
    };

    this.save = function (url, csbIdentifier, dataStream, callback) {
        if (!isAuthenticated) {
            return callback(new Error('Unauthenticated'));
        }

        $$.remote.doHttpPost(url + "/CSB/" + csbIdentifier.getUid(), dataStream, (err, res) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, res);
        });
    };

    this.load = function (url, csbIdentifier, version, callback) {
        if (!isAuthenticated) {
            return callback(new Error('Unauthenticated'));
        }

        if (typeof version === "function") {
            callback = version;
            version = "";
        }

        $$.remote.doHttpGet(url + "/CSB/" + csbIdentifier.getUid() + "/" + version, (err, resource) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, resource);
        });

    };

    this.getVersions = function (url, csbIdentifier, callback) {
        if (!isAuthenticated) {
            return callback(new Error('Unauthenticated'));
        }

        $$.remote.doHttpGet(url + "/CSB/" + csbIdentifier.getUid() + "/versions", (err, versions) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, JSON.parse(versions));
        });
    };

    this.compareVersions = function (url, filesList, callback) {
        if (!isAuthenticated) {
            return callback(new Error('Unauthenticated'));
        }

        $$.remote.doHttpPost(url + "/CSB/compareVersions", JSON.stringify(filesList), (err, modifiedFiles) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, modifiedFiles);
        });
    };
}

module.exports = EVFSResolver;
},{}],"/home/privatesky/modules/csb/utils/AsyncDispatcher.js":[function(require,module,exports){

function AsyncDispatcher(finalCallback) {
	let results = [];
	let errors = [];

	let started = 0;

	function markOneAsFinished(err, res) {
		if(err) {
			errors.push(err);
		}

		if(arguments.length > 2) {
			arguments[0] = undefined;
			res = arguments;
		}

		if(typeof res !== "undefined") {
			results.push(res);
		}

		if(--started <= 0) {
            callCallback();
		}
	}

	function dispatchEmpty(amount = 1) {
		started += amount;
	}

	function callCallback() {
	    if(errors.length === 0) {
	        errors = undefined;
        }

	    if(results.length === 0) {
	        results = undefined;
        }

        finalCallback(errors, results);
    }

	return {
		dispatchEmpty,
		markOneAsFinished
	};
}

module.exports = AsyncDispatcher;
},{}],"/home/privatesky/modules/csb/utils/DseedCage.js":[function(require,module,exports){
(function (Buffer){
const crypto = require('pskcrypto');
const path = require('path');
const fs = require("fs");
const CSBIdentifier = require("../lib/CSBIdentifier");

function DseedCage(localFolder) {
	const dseedFolder = path.join(localFolder, '.privateSky');
	const dseedPath = path.join(dseedFolder, 'dseed');

	function loadDseedBackups(pin, callback) {
		fs.mkdir(dseedFolder, {recursive: true}, (err) => {
			if (err) {
				return callback(err);
			}

			crypto.loadData(pin, dseedPath, (err, dseedBackups) => {
				if (err) {
					return callback(err);
				}
				try{
					dseedBackups = JSON.parse(dseedBackups.toString());
				}catch (e) {
					return callback(e);
				}

				let csbIdentifier;
				if (dseedBackups.dseed && !Buffer.isBuffer(dseedBackups.dseed)) {
					dseedBackups.dseed = Buffer.from(dseedBackups.dseed);
					csbIdentifier = new CSBIdentifier(dseedBackups.dseed);
				}

				callback(undefined, csbIdentifier, dseedBackups.backups);
			});
		});
	}

	function saveDseedBackups(pin, csbIdentifier, backups, callback) {
		fs.mkdir(dseedFolder, {recursive: true}, (err) => {
			if (err) {
				return callback(err);
			}

			let dseed;
			if(csbIdentifier){
				dseed = csbIdentifier.getDseed();
			}
			const dseedBackups = JSON.stringify({
				dseed,
				backups
			});

			crypto.saveData(Buffer.from(dseedBackups), pin, dseedPath, callback);
		});
	}


	return {
		loadDseedBackups,
		saveDseedBackups,
	};
}


module.exports = DseedCage;
}).call(this,require("buffer").Buffer)

},{"../lib/CSBIdentifier":"/home/privatesky/modules/csb/lib/CSBIdentifier.js","buffer":false,"fs":false,"path":false,"pskcrypto":false}],"/home/privatesky/modules/csb/utils/HashCage.js":[function(require,module,exports){
const path = require('path');
const fs = require('fs');

function HashCage(localFolder) {
	const hashFolder = path.join(localFolder, '.privateSky');
	const hashPath = path.join(hashFolder, 'hash');

	function loadHash(callback) {
		fs.mkdir(hashFolder, {recursive: true}, (err) => {
			if (err) {
				return callback(err);
			}

			fs.readFile(hashPath, (err, data) => {
				if(err){
					return callback(null, {});
				}

				callback(null, JSON.parse(data));
			});

		});
	}

	function saveHash(hashObj, callback) {
		fs.mkdir(hashFolder, {recursive: true}, (err) => {
			if (err) {
				return callback(err);
			}

			fs.writeFile(hashPath, JSON.stringify(hashObj, null, '\t'), (err) => {
				if (err) {
					return callback(err);
				}
				callback();
			});
		});
	}

	return {
		loadHash,
		saveHash
	};
}

module.exports = HashCage;

},{"fs":false,"path":false}],"/home/privatesky/modules/csb/utils/flowsUtils.js":[function(require,module,exports){
exports.defaultBackup = "http://localhost:8080";
exports.defaultPin = "12345678";
exports.noTries = 3;

},{}],"/home/privatesky/modules/csb/utils/utils.js":[function(require,module,exports){
const fs = require("fs");
const path = require('path');
// const crypto = require("pskcrypto");

function generatePath(localFolder, csbIdentifier) {
    return path.join(localFolder, csbIdentifier.getUid());
}

function processUrl(url, assetType) {
    const splitUrl = url.split('/');
    const aliasAsset = splitUrl.pop();
    const CSBPath = splitUrl.join('/');
    return {
        CSBPath: CSBPath + ':' + assetType + ':' + aliasAsset,
        alias: aliasAsset
    };
}

function deleteRecursively(inputPath, isRoot = true, callback) {

    fs.stat(inputPath, function (err, stats) {
        if (err) {
            callback(err, stats);
            return;
        }
        if (stats.isFile()) {
            fs.unlink(inputPath, (err) => {
                if (err) {
                    return callback(err, null);
                } else {
                    return callback(null, true);
                }
            });
        } else if (stats.isDirectory()) {
            fs.readdir(inputPath, (err, files) => {
                if (err) {
                    callback(err, null);
                    return;
                }
                const f_length = files.length;
                let f_delete_index = 0;

                const checkStatus = () => {
                    if (f_length === f_delete_index) {
                        if(!isRoot) {
                            fs.rmdir(inputPath, (err) => {
                                if (err) {
                                    return callback(err, null);
                                } else {
                                    return callback(null, true);
                                }
                            });
                        }
                        callback(null, true);
                        return true;
                    }
                    return false;
                };
                if (!checkStatus()) {
                    files.forEach((file) => {
                        const tempPath = path.join(inputPath, file);
                        deleteRecursively(tempPath, false,(err, status) => {
                            if (!err) {
                                f_delete_index++;
                                checkStatus();
                            } else {
                                return callback(err, null);
                            }
                        });
                    });
                }
            });
        }
    });
}

module.exports = {
    generatePath,
    processUrl,
    deleteRecursively
};


},{"fs":false,"path":false}],"/home/privatesky/modules/csb/utils/validator.js":[function(require,module,exports){
const RootCSB = require("../lib/RootCSB");
const fs = require("fs");
const path = require("path");


module.exports.validatePin = function (localFolder, swarm, phaseName, pin, noTries, ...args) {
	RootCSB.createRootCSB(localFolder, undefined, undefined, pin, (err, rootCSB, csbIdentifier, backups) =>{
		if(err){
			swarm.swarm("interaction", "readPin", noTries - 1);
		}else{
			if(csbIdentifier){
				swarm.rootCSB = rootCSB;
				swarm.csbIdentifier = csbIdentifier;
			}
			args.push(backups);
			swarm[phaseName](pin, ...args);
		}
	});
};

module.exports.reportOrContinue = function(swarm, phaseName, errorMessage, ...args){
	return function(err,...res) {
		if (err) {
			swarm.swarm("interaction", "handleError", err, errorMessage);
		} else {
			if (phaseName) {
					swarm[phaseName](...res, ...args);
			}
		}
	};
};

module.exports.checkMasterCSBExists = function (localFolder, callback) {
	fs.stat(path.join(localFolder, ".privateSky/hash"), (err, stats)=>{
		if(err){
			return callback(err, false);
		}

		return callback(undefined, true);
	});
};
},{"../lib/RootCSB":"/home/privatesky/modules/csb/lib/RootCSB.js","fs":false,"path":false}],"/home/privatesky/modules/edfs-brick-storage/EDFSBrickStorage.js":[function(require,module,exports){
require("psk-http-client");
const bar = require("bar");
const Brick = bar.Brick;

function EDFSBrickStorage(url) {

    this.putBrick = function (brick, callback) {
        $$.remote.doHttpPost(url + "/EDFS/" + brick.getHash(), brick.getData(), callback);
    };

    this.getBrick = function (brickHash, callback) {
        $$.remote.doHttpGet(url + "/EDFS/" + brickHash, (err, brickData) => {
            callback(err, new Brick(brickData));
        });
    };

    this.deleteBrick = function (brickHash, callback) {
        throw new Error("Not implemented");
    };

    this.putBarMap = function (barMap, callback) {
        const mapBrick = barMap.toBrick();
        this.putBrick(mapBrick, (err) => {
            callback(err, mapBrick.getHash());
        });
    };

    this.getBarMap = function (mapDigest, callback) {
        if (typeof mapDigest === "function") {
            callback = mapDigest;
            mapDigest = undefined;
        }

        if (typeof mapDigest === "undefined") {
            return callback(undefined, new bar.FolderBarMap());
        }

        this.getBrick(mapDigest, (err, mapBrick) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, new bar.FolderBarMap(JSON.parse(mapBrick.getData().toString())));
        });
    }
}

module.exports = {
    createEDFSBrickStorage(url) {
        return new EDFSBrickStorage(url);
    }
};


},{"bar":"bar","psk-http-client":"psk-http-client"}],"/home/privatesky/modules/edfs/flows/BricksManager.js":[function(require,module,exports){
const path = require("path");
const fs = require("fs");
const PskHash = require('pskcrypto').PskHash;

const folderNameSize = process.env.FOLDER_NAME_SIZE || 5;
const FILE_SEPARATOR = '-';
let rootfolder;

$$.flow.describe("BricksManager", {
    init: function (rootFolder, callback) {
        if (!rootFolder) {
            callback(new Error("No root folder specified!"));
            return;
        }
        rootFolder = path.resolve(rootFolder);
        this.__ensureFolderStructure(rootFolder, function (err, path) {
            rootfolder = rootFolder;
            callback(err, rootFolder);
        });
    },
    write: function (fileName, readFileStream, callback) {
        if (!this.__verifyFileName(fileName, callback)) {
            return;
        }

        if (!readFileStream || !readFileStream.pipe || typeof readFileStream.pipe !== "function") {
            callback(new Error("Something wrong happened"));
            return;
        }

        const folderName = path.join(rootfolder, fileName.substr(0, folderNameSize));

        const serial = this.serial(() => {
        });

        serial.__ensureFolderStructure(folderName, serial.__progress);
        serial.__writeFile(readFileStream, folderName, fileName, callback);
    },
    read: function (fileName, writeFileStream, callback) {
        if (!this.__verifyFileName(fileName, callback)) {
            return;
        }

        const folderPath = path.join(rootfolder, fileName.substr(0, folderNameSize));
        const filePath = path.join(folderPath, fileName);
        this.__verifyFileExistence(filePath, (err, result) => {
            if (!err) {
                this.__readFile(writeFileStream, filePath, callback);
            } else {
                callback(new Error("No file found."));
            }
        });
    },
    addAlias: function (filename, alias, callback) {
        if (!this.__verifyFileName(fileName, callback)) {
            return;
        }

        if (!alias) {
            return callback(new Error("No alias was provided"));
        }

        if (!this.aliases) {
            this.aliases = {};
        }

        this.aliases[alias] = filename;

        callback();
    },
    writeWithAlias: function (alias, readStream, callback) {
        const fileName = this.__getFileName(alias, callback);
        this.write(fileName, readStream, callback);
    },
    readWithAlias: function (alias, writeStream, callback) {
        const fileName = this.__getFileName(alias, callback);
        this.read(fileName, writeStream, callback);
    },
    readVersion: function (fileName, fileVersion, writeFileStream, callback) {
        if (!this.__verifyFileName(fileName, callback)) {
            return;
        }

        const folderPath = path.join(rootfolder, fileName.substr(0, folderNameSize));
        const filePath = path.join(folderPath, fileName, fileVersion);
        this.__verifyFileExistence(filePath, (err, result) => {
            if (!err) {
                this.__readFile(writeFileStream, path.join(filePath), callback);
            } else {
                callback(new Error("No file found."));
            }
        });
    },
    getVersionsForFile: function (fileName, callback) {
        if (!this.__verifyFileName(fileName, callback)) {
            return;
        }

        const folderPath = path.join(rootfolder, fileName.substr(0, folderNameSize), fileName);
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                return callback(err);
            }

            const totalNumberOfFiles = files.length;
            const filesData = [];

            let resolvedFiles = 0;

            for (let i = 0; i < totalNumberOfFiles; ++i) {
                fs.stat(path.join(folderPath, files[i]), (err, stats) => {
                    if (err) {
                        filesData.push({version: files[i], creationTime: null, creationTimeMs: null});
                        return;
                    }

                    filesData.push({
                        version: files[i],
                        creationTime: stats.birthtime,
                        creationTimeMs: stats.birthtimeMs
                    });

                    resolvedFiles += 1;

                    if (resolvedFiles >= totalNumberOfFiles) {
                        filesData.sort((first, second) => {
                            const firstCompareData = first.creationTimeMs || first.version;
                            const secondCompareData = second.creationTimeMs || second.version;

                            return firstCompareData - secondCompareData;
                        });
                        callback(undefined, filesData);
                    }
                });
            }
        });
    },
    compareVersions: function (bodyStream, callback) {
        let body = '';

        bodyStream.on('data', (data) => {
            body += data;
        });

        bodyStream.on('end', () => {
            try {
                body = JSON.parse(body);
                this.__compareVersions(body, callback);
            } catch (e) {
                callback(e);
            }
        });
    },
    __verifyFileName: function (fileName, callback) {
        if (!fileName || typeof fileName != "string") {
            callback(new Error("No fileId specified."));
            return;
        }

        if (fileName.length < folderNameSize) {
            callback(new Error("FileId too small. " + fileName));
            return;
        }

        return true;
    },
    __ensureFolderStructure: function (folder, callback) {
        fs.mkdir(folder, {recursive: true}, callback);
    },
    __writeFile: function (readStream, folderPath, fileName, callback) {
        const hash = require("crypto").createHash("sha256");
        const filePath = path.join(folderPath, fileName);
        fs.access(filePath, (err) => {
            if (err) {
                readStream.on('data', (data) => {
                    hash.update(data);
                });

                const writeStream = fs.createWriteStream(filePath, {mode: 0o444});

                writeStream.on("finish", () => {
                    const hashDigest = hash.digest("hex");
                    if (hashDigest !== fileName) {
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                return callback(err);
                            } else {
                                return callback(new Error("Content hash and filename are not the same"));
                            }
                        });
                    }
                });

                writeStream.on("error", function () {
                    writeStream.close();
                    readStream.close();
                    callback(...arguments);
                });

                readStream.pipe(writeStream);
            } else {
                callback();

            }
        });
    },
    __getNextVersionFileName: function (folderPath, fileName, callback) {
        this.__getLatestVersionNameOfFile(folderPath, (err, fileVersion) => {
            if (err) {
                console.error(err);
                return callback(err);
            }

            callback(undefined, fileVersion.numericVersion + 1);
        });
    }
    ,
    __getLatestVersionNameOfFile: function (folderPath, callback) {
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                console.error(err);
                callback(err);
                return;
            }

            let fileVersion = {numericVersion: 0, fullVersion: '0' + FILE_SEPARATOR};

            if (files.length > 0) {
                try {
                    const allVersions = files.map(file => file.split(FILE_SEPARATOR)[0]);
                    const latestFile = this.__maxElement(allVersions);
                    fileVersion = {
                        numericVersion: parseInt(latestFile),
                        fullVersion: files.filter(file => file.split(FILE_SEPARATOR)[0] === latestFile.toString())[0]
                    };

                } catch (e) {
                    e.code = 'invalid_file_name_found';
                    callback(e);
                }
            }

            callback(undefined, fileVersion);
        });
    }
    ,
    __maxElement: function (numbers) {
        let max = numbers[0];

        for (let i = 1; i < numbers.length; ++i) {
            max = Math.max(max, numbers[i]);
        }

        if (isNaN(max)) {
            throw new Error('Invalid element found');
        }

        return max;
    }
    ,
    __compareVersions: function (files, callback) {
        const filesWithChanges = [];
        const entries = Object.entries(files);
        let remaining = entries.length;

        if (entries.length === 0) {
            callback(undefined, filesWithChanges);
            return;
        }

        entries.forEach(([fileName, fileHash]) => {
            this.getVersionsForFile(fileName, (err, versions) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        versions = [];
                    } else {
                        callback(err);
                    }

                }

                const match = versions.some(version => {
                    const hash = version.version.split(FILE_SEPARATOR)[1];
                    return hash === fileHash;
                });

                if (!match) {
                    filesWithChanges.push(fileName);
                }

                if (--remaining === 0) {
                    callback(undefined, filesWithChanges);
                }
            })
        });
    }
    ,
    __readFile: function (writeFileStream, filePath, callback) {
        const readStream = fs.createReadStream(filePath);

        writeFileStream.on("finish", callback);
        writeFileStream.on("error", callback);

        readStream.pipe(writeFileStream);
    }
    ,
    __progress: function (err, result) {
        if (err) {
            console.error(err);
        }
    }
    ,
    __verifyFileExistence: function (filePath, callback) {
        fs.access(filePath, callback);
    }
    ,
    __getFileName: function (alias, callback) {
        if (!this.aliases) {
            return callback(new Error("No files have been associated with aliases"));
        }
        const fileName = this.aliases[alias];
        if (!fileName) {
            return callback(new Error("The specified alias was not associated with any file"));
        } else {
            return fileName;
        }
    }
    ,
});

},{"crypto":false,"fs":false,"path":false,"pskcrypto":false}],"/home/privatesky/modules/edfs/lib/EDFSMiddleware.js":[function(require,module,exports){
require("../flows/BricksManager");

function EDFSMiddleware(server) {

    server.post('/:fileId', (req, res) => {
        $$.flow.start("BricksManager").write(req.params.fileId, req, (err, result) => {
            res.statusCode = 201;
            if (err) {
                res.statusCode = 500;

                if (err.code === 'EACCES') {
                    res.statusCode = 409;
                }
            }
            res.end();
        });

    });

    server.get('/:fileId', (req, res) => {
        res.setHeader("content-type", "application/octet-stream");
        $$.flow.start("BricksManager").read(req.params.fileId, res, (err, result) => {
            res.statusCode = 200;
            if (err) {
                console.log(err);
                res.statusCode = 404;
            }
            res.end();
        });
    });

    server.post('/addAlias/:fileId', (req, res) => {
        $$.flow.start("BricksManager").addAlias(req.params.fileId, req,  (err, result) => {
            res.statusCode = 201;
            if (err) {
                res.statusCode = 500;

                if (err.code === 'EACCES') {
                    res.statusCode = 409;
                }
            }
            res.end();
        });

    });

    server.post('/alias/:alias', (req, res) => {
        $$.flow.start("BricksManager").writeWithAlias(req.params.alias, req,  (err, result) => {
            res.statusCode = 201;
            if (err) {
                res.statusCode = 500;

                if (err.code === 'EACCES') {
                    res.statusCode = 409;
                }
            }
            res.end();
        });
    });

    server.get('/alias/:alias', (req, res) => {
        res.setHeader("content-type", "application/octet-stream");
        $$.flow.start("BricksManager").readWithAlias(req.params.alias, res, (err, result) => {
            res.statusCode = 200;
            if (err) {
                console.log(err);
                res.statusCode = 404;
            }
            res.end();
        });
    });
}

module.exports = EDFSMiddleware;
},{"../flows/BricksManager":"/home/privatesky/modules/edfs/flows/BricksManager.js"}],"/home/privatesky/modules/edfs/utils/AsyncDispatcher.js":[function(require,module,exports){

function AsyncDispatcher(finalCallback) {
	let results = [];
	let errors = [];

	let started = 0;

	function markOneAsFinished(err, res) {
		if(err) {
			errors.push(err);
		}

		if(arguments.length > 2) {
			arguments[0] = undefined;
			res = arguments;
		}

		if(typeof res !== "undefined") {
			results.push(res);
		}

		if(--started <= 0) {
            return callCallback();
		}
	}

	function dispatchEmpty(amount = 1) {
		started += amount;
	}

	function callCallback() {
	    if(errors.length === 0) {
	        errors = undefined;
        }

	    if(results.length === 0) {
	        results = undefined;
        }

        finalCallback(errors, results);
    }

	return {
		dispatchEmpty,
		markOneAsFinished
	};
}

module.exports = AsyncDispatcher;
},{}],"/home/privatesky/modules/foldermq/lib/folderMQ.js":[function(require,module,exports){
const utils = require("swarmutils");
const OwM = utils.OwM;
var beesHealer = utils.beesHealer;
var fs = require("fs");
var path = require("path");


//TODO: prevent a class of race condition type of errors by signaling with files metadata to the watcher when it is safe to consume

function FolderMQ(folder, callback = () => {}){

	if(typeof callback !== "function"){
		throw new Error("Second parameter should be a callback function");
	}

	folder = path.normalize(folder);

	fs.mkdir(folder, {recursive: true}, function(err, res){
		fs.exists(folder, function(exists) {
			if (exists) {
				return callback(null, folder);
			} else {
				return callback(err);
			}
		});
	});

	function mkFileName(swarmRaw){
		let meta = OwM.prototype.getMetaFrom(swarmRaw);
		let name = `${folder}${path.sep}${meta.swarmId}.${meta.swarmTypeName}`;
		const unique = meta.phaseId || $$.uidGenerator.safe_uuid();

		name = name+`.${unique}`;
		return path.normalize(name);
	}

	this.getHandler = function(){
		if(producer){
			throw new Error("Only one consumer is allowed!");
		}
		producer = true;
		return {
			sendSwarmSerialization: function(serialization, callback){
				if(typeof callback !== "function"){
					throw new Error("Second parameter should be a callback function");
				}
				writeFile(mkFileName(JSON.parse(serialization)), serialization, callback);
			},
			addStream : function(stream, callback){
				if(typeof callback !== "function"){
					throw new Error("Second parameter should be a callback function");
				}

				if(!stream || !stream.pipe || typeof stream.pipe !== "function"){
					return callback(new Error("Something wrong happened"));
				}

				let swarm = "";
				stream.on('data', (chunk) =>{
					swarm += chunk;
				});

				stream.on("end", () => {
					writeFile(mkFileName(JSON.parse(swarm)), swarm, callback);
				});

				stream.on("error", (err) =>{
					callback(err);
				});
			},
			addSwarm : function(swarm, callback){
				if(!callback){
					callback = $$.defaultErrorHandlingImplementation;
				}else if(typeof callback !== "function"){
					throw new Error("Second parameter should be a callback function");
				}

				beesHealer.asJSON(swarm,null, null, function(err, res){
					if (err) {
						console.log(err);
					}
					writeFile(mkFileName(res), J(res), callback);
				});
			},
			sendSwarmForExecution: function(swarm, callback){
				if(!callback){
					callback = $$.defaultErrorHandlingImplementation;
				}else if(typeof callback !== "function"){
					throw new Error("Second parameter should be a callback function");
				}

				beesHealer.asJSON(swarm, OwM.prototype.getMetaFrom(swarm, "phaseName"), OwM.prototype.getMetaFrom(swarm, "args"), function(err, res){
					if (err) {
						console.log(err);
					}
					var file = mkFileName(res);
					var content = JSON.stringify(res);

					//if there are no more FD's for files to be written we retry.
					function wrapper(error, result){
						if(error){
							console.log(`Caught an write error. Retry to write file [${file}]`);
							setTimeout(()=>{
								writeFile(file, content, wrapper);
							}, 10);
						}else{
							return callback(error, result);
						}
					}

					writeFile(file, content, wrapper);
				});
			}
		};
	};

	var recipient;
	this.setIPCChannel = function(processChannel){
		if(processChannel && !processChannel.send || (typeof processChannel.send) != "function"){
			throw new Error("Recipient is not instance of process/child_process or it was not spawned with IPC channel!");
		}
		recipient = processChannel;
		if(consumer){
			console.log(`Channel updated`);
			(recipient || process).on("message", receiveEnvelope);
		}
	};


	var consumedMessages = {};

	function checkIfConsummed(name, message){
		const shortName = path.basename(name);
		const previousSaved = consumedMessages[shortName];
		let result = false;
		if(previousSaved && !previousSaved.localeCompare(message)){
			result = true;
		}
		return result;
	}

	function save2History(envelope){
		consumedMessages[path.basename(envelope.name)] = envelope.message;
	}

	function buildEnvelopeConfirmation(envelope, saveHistory){
		if(saveHistory){
			save2History(envelope);
		}
		return `Confirm envelope ${envelope.timestamp} sent to ${envelope.dest}`;
	}

	function buildEnvelope(name, message){
		return {
			dest: folder,
			src: process.pid,
			timestamp: new Date().getTime(),
			message: message,
			name: name
		};
	}

	function receiveEnvelope(envelope){
		if(!envelope || typeof envelope !== "object"){
			return;
		}
		//console.log("received envelope", envelope, folder);

		if(envelope.dest !== folder && folder.indexOf(envelope.dest)!== -1 && folder.length === envelope.dest+1){
			console.log("This envelope is not for me!");
			return;
		}

		let message = envelope.message;

		if(callback){
			//console.log("Sending confirmation", process.pid);
			recipient.send(buildEnvelopeConfirmation(envelope, true));
			consumer(null, JSON.parse(message));
		}
	}

	this.registerAsIPCConsumer = function(callback){
		if(typeof callback !== "function"){
			throw new Error("The argument should be a callback function");
		}
		registeredAsIPCConsumer = true;
		//will register as normal consumer in order to consume all existing messages but without setting the watcher
		this.registerConsumer(callback, true, (watcher) => !watcher);

		//console.log("Registered as IPC Consummer", );
		(recipient || process).on("message", receiveEnvelope);
	};

	this.registerConsumer = function (callback, shouldDeleteAfterRead = true, shouldWaitForMore = (watcher) => true) {
		if(typeof callback !== "function"){
			throw new Error("First parameter should be a callback function");
		}
		if (consumer) {
			throw new Error("Only one consumer is allowed! " + folder);
		}

		consumer = callback;

		fs.mkdir(folder, {recursive: true}, function (err, res) {
			if (err && (err.code !== 'EEXIST')) {
				console.log(err);
			}
			consumeAllExisting(shouldDeleteAfterRead, shouldWaitForMore);
		});
	};

	this.writeMessage = writeFile;

	this.unlinkContent = function (messageId, callback) {
		const messagePath = path.join(folder, messageId);

		fs.unlink(messagePath, (err) => {
			callback(err);
		});
	};

	this.dispose = function(force){
		if(typeof folder != "undefined"){
			var files;
			try{
				files = fs.readdirSync(folder);
			}catch(error){
				//..
			}

			if(files && files.length > 0 && !force){
				console.log("Disposing a channel that still has messages! Dir will not be removed!");
				return false;
			}else{
				try{
					fs.rmdirSync(folder);
				}catch(err){
					//..
				}
			}

			folder = null;
		}

		if(producer){
			//no need to do anything else
		}

		if(typeof consumer != "undefined"){
			consumer = () => {};
		}

		if(watcher){
			watcher.close();
			watcher = null;
		}

		return true;
	};


	/* ---------------- protected  functions */
	var consumer = null;
	var registeredAsIPCConsumer = false;
	var producer = null;

	function buildPathForFile(filename){
		return path.normalize(path.join(folder, filename));
	}

	function consumeMessage(filename, shouldDeleteAfterRead, callback) {
		var fullPath = buildPathForFile(filename);

		fs.readFile(fullPath, "utf8", function (err, data) {
			if (!err) {
				if (data !== "") {
					try {
						var message = JSON.parse(data);
					} catch (error) {
						console.log("Parsing error", error);
						err = error;
					}

					if(checkIfConsummed(fullPath, data)){
						//console.log(`message already consumed [${filename}]`);
						return ;
					}

					if (shouldDeleteAfterRead) {

						fs.unlink(fullPath, function (err, res) {
							if (err) {throw err;};
						});

					}
					return callback(err, message);
				}
			} else {
				console.log("Consume error", err);
				return callback(err);
			}
		});
	}

	function consumeAllExisting(shouldDeleteAfterRead, shouldWaitForMore) {

		let currentFiles = [];

		fs.readdir(folder, 'utf8', function (err, files) {
			if (err) {
				$$.errorHandler.error(err);
				return;
			}
			currentFiles = files;
			iterateAndConsume(files);

		});

		function startWatching(){
			if (shouldWaitForMore(true)) {
				watchFolder(shouldDeleteAfterRead, shouldWaitForMore);
			}
		}

		function iterateAndConsume(files, currentIndex = 0) {
			if (currentIndex === files.length) {
				//console.log("start watching", new Date().getTime());
				startWatching();
				return;
			}

			if (path.extname(files[currentIndex]) !== in_progress) {
				consumeMessage(files[currentIndex], shouldDeleteAfterRead, (err, data) => {
					if (err) {
						iterateAndConsume(files, ++currentIndex);
						return;
					}
					consumer(null, data, path.basename(files[currentIndex]));
					if (shouldWaitForMore()) {
						iterateAndConsume(files, ++currentIndex);
					}
				});
			} else {
				iterateAndConsume(files, ++currentIndex);
			}
		}
	}

	function writeFile(filename, content, callback){
		if(recipient){
			var envelope = buildEnvelope(filename, content);
			//console.log("Sending to", recipient.pid, recipient.ppid, "envelope", envelope);
			recipient.send(envelope);
			var confirmationReceived = false;

			function receiveConfirmation(message){
				if(message === buildEnvelopeConfirmation(envelope)){
					//console.log("Received confirmation", recipient.pid);
					confirmationReceived = true;
					try{
						recipient.off("message", receiveConfirmation);
					}catch(err){
						//...
					}

				}
			}

			recipient.on("message", receiveConfirmation);

			setTimeout(()=>{
				if(!confirmationReceived){
					//console.log("No confirmation...", process.pid);
					hidden_writeFile(filename, content, callback);
				}else{
					if(callback){
						return callback(null, content);
					}
				}
			}, 200);
		}else{
			hidden_writeFile(filename, content, callback);
		}
	}

	const in_progress = ".in_progress";
	function hidden_writeFile(filename, content, callback){
		var tmpFilename = filename+in_progress;
		try{
			if(fs.existsSync(tmpFilename) || fs.existsSync(filename)){
				console.log(new Error(`Overwriting file ${filename}`));
			}
			fs.writeFileSync(tmpFilename, content);
			fs.renameSync(tmpFilename, filename);
		}catch(err){
			return callback(err);
		}
		callback(null, content);
	}

	var alreadyKnownChanges = {};

	function alreadyFiredChanges(filename, change){
		var res = false;
		if(alreadyKnownChanges[filename]){
			res = true;
		}else{
			alreadyKnownChanges[filename] = change;
		}

		return res;
	}

	function watchFolder(shouldDeleteAfterRead, shouldWaitForMore){

		setTimeout(function(){
			fs.readdir(folder, 'utf8', function (err, files) {
				if (err) {
					$$.errorHandler.error(err);
					return;
				}

				for(var i=0; i<files.length; i++){
					watchFilesHandler("change", files[i]);
				}
			});
		}, 1000);

		function watchFilesHandler(eventType, filename){
			//console.log(`Got ${eventType} on ${filename}`);

			if(!filename || path.extname(filename) === in_progress){
				//caught a delete event of a file
				//or
				//file not ready to be consumed (in progress)
				return;
			}

			var f = buildPathForFile(filename);
			if(!fs.existsSync(f)){
				//console.log("File not found", f);
				return;
			}

			//console.log(`Preparing to consume ${filename}`);
			if(!alreadyFiredChanges(filename, eventType)){
				consumeMessage(filename, shouldDeleteAfterRead, (err, data) => {
					//allow a read a the file
					alreadyKnownChanges[filename] = undefined;

					if (err) {
						// ??
						console.log("\nCaught an error", err);
						return;
					}

					consumer(null, data, filename);


					if (!shouldWaitForMore()) {
						watcher.close();
					}
				});
			}else{
				console.log("Something happens...", filename);
			}
		}


		const watcher = fs.watch(folder, watchFilesHandler);

		const intervalTimer = setInterval(()=>{
			fs.readdir(folder, 'utf8', function (err, files) {
				if (err) {
					$$.errorHandler.error(err);
					return;
				}

				if(files.length > 0){
					console.log(`\n\nFound ${files.length} files not consumed yet in ${folder}`, new Date().getTime(),"\n\n");
					//faking a rename event trigger
					watchFilesHandler("rename", files[0]);
				}
			});
		}, 5000);
	}
}

exports.getFolderQueue = function(folder, callback){
	return new FolderMQ(folder, callback);
};

},{"fs":false,"path":false,"swarmutils":false}],"/home/privatesky/modules/interact/lib/interactionSpaceImpl/SoundPubSubMQBasedInteractionSpace.js":[function(require,module,exports){
function MemoryMQInteractionSpace() {
    var swarmInteract = require("./../swarmInteraction");
    var swarmHandlersSubscribers = {};

    function dispatchingSwarms(swarm){
		setTimeout(function(){
            var subsList = swarmHandlersSubscribers[swarm.meta.swarmId];
            if(subsList){
                for(var i=0; i<subsList.length; i++){
                    var handler = subsList[i];
                    handler(null, swarm);
                }
            }
        }, 1);
    }

    var initialized = false;
    function init(){
		if(!initialized){
			initialized = true;
			$$.PSK_PubSub.subscribe($$.CONSTANTS.SWARM_FOR_EXECUTION, dispatchingSwarms);
		}
    }

    var comm = {
        startSwarm: function (swarmName, ctor, args) {
			init();
            return $$.swarm.start(swarmName, ctor, ...args);
        },
        continueSwarm: function (swarmHandler, swarmSerialisation, ctor, args) {
			init();
            swarmHandler[ctor].apply(swarmHandler, args);
        },
        on: function (swarmHandler, callback) {
			init();
            if(!swarmHandlersSubscribers[swarmHandler.getInnerValue().meta.swarmId]){
				swarmHandlersSubscribers[swarmHandler.getInnerValue().meta.swarmId] = [ callback ];
            }else{
				swarmHandlersSubscribers[swarmHandler.getInnerValue().meta.swarmId].push(callback);
            }
        },
        off: function (swarmHandler) {
			if(swarmHandlersSubscribers[swarmHandler.getInnerValue().meta.swarmId]){
				swarmHandlersSubscribers[swarmHandler.getInnerValue().meta.swarmId] = [];
            }
        }
    };

    return swarmInteract.newInteractionSpace(comm);

}

var space;
module.exports.createInteractionSpace = function () {
    if(!space){
        space = new MemoryMQInteractionSpace();
    }else{
        console.log("MemoryMQInteractionSpace already created! Using same instance.");
    }
    return space;
};
},{"./../swarmInteraction":"/home/privatesky/modules/interact/lib/swarmInteraction.js"}],"/home/privatesky/modules/interact/lib/interactionSpaceImpl/WebViewMQInteractionSpace.js":[function(require,module,exports){
function WindowMQInteractionSpace(channelName, communicationWindow, secondCommunicationChannel){
    var swarmInteract = require("./../swarmInteraction");
    var childMessageMQ = require("./specificMQImpl/ChildWebViewMQ").createMQ(channelName, communicationWindow, secondCommunicationChannel);
    var swarmInstances = {};

    var comm = {
        startSwarm: function (swarmName, ctor, args) {
            var swarm = {meta:{
                    swarmTypeName:swarmName,
                    ctor:ctor,
                    args:args
                }};
            childMessageMQ.produce(swarm);
            return swarm;
        },
        continueSwarm: function (swarmHandler, swarmSerialisation, phaseName, args) {

            var newSerialization = JSON.parse(JSON.stringify(swarmSerialisation));
            newSerialization.meta.ctor = undefined;
            newSerialization.meta.phaseName = phaseName;
            newSerialization.meta.target = "iframe";
            newSerialization.meta.args = args;
            childMessageMQ.produce(newSerialization);
        },
        on: function (swarmHandler, callback) {
            childMessageMQ.registerConsumer(callback);
        },
        off: function (swarmHandler) {

        }
    };


    var space = swarmInteract.newInteractionSpace(comm);
    this.startSwarm = function (name, ctor, ...args) {
        return space.startSwarm(name, ctor, ...args);
    };

    this.init = function () {

        childMessageMQ.registerConsumer(function (err, data) {
            if (err) {
                console.log(err);
            }
            else {
                var swarm;
                if(data && data.meta && data.meta.swarmId && swarmInstances[data.meta.swarmId]){
                    swarm = swarmInstances[data.meta.swarmId];
                    swarm.update(data);
                    swarm[data.meta.phaseName].apply(swarm, data.meta.args);
                }else{

                    swarm = $$.swarm.start(data.meta.swarmTypeName, data.meta.ctor, ...data.meta.args);

                    swarmInstances[swarm.getInnerValue().meta.swarmId] = swarm;

                    swarm.onReturn(function(data){
                        console.log("Swarm is finished");
                        console.log(data);
                    });
                }
            }
        });
        const readyEvt = {webViewIsReady: true};
        parent.postMessage(JSON.stringify(readyEvt), "*");

    };

    function handler(message){
        log("sending swarm ", message);
        childMessageMQ.produce(message);
    }

    function filterInteractions(message){
        log("checking if message is 'interaction' ", message);
        return message && message.meta && message.meta.target && message.meta.target === "interaction";
    }
    //TODO fix this for nativeWebView

    $$.PSK_PubSub.subscribe($$.CONSTANTS.SWARM_FOR_EXECUTION, handler, function(){return true;}, filterInteractions);

    log("registering listener for handling interactions");

    function log(...args){
        args.unshift("[WindowMQInteractionSpace"+(window.frameElement ? "*": "")+"]" );
        //console.log.apply(this, args);
    }
}

module.exports.createInteractionSpace = function(channelName, communicationWindow, secondCommunicationChannel){
    return new WindowMQInteractionSpace(channelName, communicationWindow, secondCommunicationChannel);
};
},{"./../swarmInteraction":"/home/privatesky/modules/interact/lib/swarmInteraction.js","./specificMQImpl/ChildWebViewMQ":"/home/privatesky/modules/interact/lib/interactionSpaceImpl/specificMQImpl/ChildWebViewMQ.js"}],"/home/privatesky/modules/interact/lib/interactionSpaceImpl/WindowMQInteractionSpace.js":[function(require,module,exports){
/*TODO
For the moment I don't see any problems if it's not cryptographic safe.
This version keeps  compatibility with mobile browsers/webviews.
 */
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function WindowMQInteractionSpace(channelName, communicationWindow) {
    var swarmInteract = require("./../swarmInteraction");
    var childMessageMQ = require("./specificMQImpl/ChildWndMQ").createMQ(channelName, communicationWindow);
    var swarmInstances = {};

    var comm = {
        startSwarm: function (swarmName, ctor, args) {

            var uniqueId = uuidv4();
            var swarm = {
                meta: {
                    swarmTypeName: swarmName,
                    ctor: ctor,
                    args: args,
                    requestId: uniqueId,
                }
            };
            childMessageMQ.produce(swarm);
            return swarm;
        },
        continueSwarm: function (swarmHandler, swarmSerialisation, phaseName, args) {

            var newSerialization = JSON.parse(JSON.stringify(swarmSerialisation));
            newSerialization.meta.ctor = undefined;
            newSerialization.meta.phaseName = phaseName;
            newSerialization.meta.target = "iframe";
            newSerialization.meta.args = args;
            childMessageMQ.produce(newSerialization);
        },
        on: function (swarmHandler, callback) {
            childMessageMQ.registerCallback(swarmHandler.meta.requestId, callback);
        },
        off: function (swarmHandler) {
            console.log("Function not implemented!");
        }
    };


    var space = swarmInteract.newInteractionSpace(comm);
    this.startSwarm = function (name, ctor, ...args) {
        return space.startSwarm(name, ctor, ...args);
    };

    this.init = function () {

        childMessageMQ.registerConsumer(function (err, data) {
            if (err) {
                console.log(err);
            }
            else {
                var swarm;
                if (data && data.meta && data.meta.swarmId && swarmInstances[data.meta.swarmId]) {
                    swarm = swarmInstances[data.meta.swarmId];
                    swarm.update(data);
                    swarm[data.meta.phaseName].apply(swarm, data.meta.args);
                } else {

                    swarm = $$.swarm.start(data.meta.swarmTypeName, data.meta.ctor, ...data.meta.args);
                    swarm.setMetadata("requestId", data.meta.requestId);
                    swarmInstances[swarm.getInnerValue().meta.swarmId] = swarm;

                    swarm.onReturn(function (data) {
                        console.log("Swarm is finished");
                        console.log(data);
                    });
                }
            }
        });
        parent.postMessage({webViewIsReady: true}, "*");
    };

    function handler(message) {
        log("sending swarm ", message);
        childMessageMQ.produce(message);
    }

    function filterInteractions(message) {
        log("checking if message is 'interaction' ", message);
        return message && message.meta && message.meta.target && message.meta.target === "interaction";
    }

    $$.PSK_PubSub.subscribe($$.CONSTANTS.SWARM_FOR_EXECUTION, handler, function () {
        return true;
    }, filterInteractions);
    log("registering listener for handling interactions");

    function log(...args) {
        args.unshift("[WindowMQInteractionSpace" + (window.frameElement ? "*" : "") + "]");
        //console.log.apply(this, args);
    }
}

module.exports.createInteractionSpace = function (channelName, communicationWindow) {
    return new WindowMQInteractionSpace(channelName, communicationWindow);
};

},{"./../swarmInteraction":"/home/privatesky/modules/interact/lib/swarmInteraction.js","./specificMQImpl/ChildWndMQ":"/home/privatesky/modules/interact/lib/interactionSpaceImpl/specificMQImpl/ChildWndMQ.js"}],"/home/privatesky/modules/interact/lib/interactionSpaceImpl/folderMQBasedInteractionSpace.js":[function(require,module,exports){
var OwM = require("swarmutils").OwM;
var swarmInteract = require("./../swarmInteraction");
var folderMQ = require("foldermq");

function FolderMQInteractionSpace(agent, targetFolder, returnFolder) {
    var swarmHandlersSubscribers = {};
    var queueHandler = null;
    var responseQueue = null;

    var queue = folderMQ.createQue(targetFolder, (err , result) => {
        if(err){
           throw err;
        }
    });

    function createSwarmPack(swarmName, phaseName, ...args){
        var swarm = new OwM();

        swarm.setMeta("swarmId", $$.uidGenerator.safe_uuid());

        swarm.setMeta("requestId", swarm.getMeta("swarmId"));
        swarm.setMeta("swarmTypeName", swarmName);
        swarm.setMeta("phaseName", phaseName);
        swarm.setMeta("args", args);
        swarm.setMeta("command", "executeSwarmPhase");
        swarm.setMeta("target", agent);
        swarm.setMeta("homeSecurityContext", returnFolder);

        return swarm;
    }

    function dispatchingSwarms(err, swarm){
        if (err) {
            console.log(err);
        }
		setTimeout(function(){
            var subsList = swarmHandlersSubscribers[swarm.meta.swarmId];
            if(subsList){
                for(var i=0; i<subsList.length; i++){
                    let handler = subsList[i];
                    handler(null, swarm);
                }
            }
        }, 1);
    }

    function init(){
        if(!queueHandler){
            queueHandler = queue.getHandler();
        }
    }

	init();

    function prepareToConsume(){
        if(!responseQueue){
            responseQueue = folderMQ.createQue(returnFolder);
            responseQueue.registerConsumer(dispatchingSwarms);
        }
    }

    var communication = {
        startSwarm: function (swarmName, ctor, args) {
            prepareToConsume();
            var swarm = createSwarmPack(swarmName, ctor, ...args);
            queueHandler.sendSwarmForExecution(swarm);
            return swarm;
        },
        continueSwarm: function (swarmHandler, swarmSerialisation, ctor, ...args) {
            try{
                swarmHandler.update(swarmSerialisation);
                swarmHandler[ctor].apply(swarmHandler, args);
            }catch(err){
                console.log(err);
            }
        },
        on: function (swarmHandler, callback) {
            prepareToConsume();

            if(!swarmHandlersSubscribers[swarmHandler.meta.swarmId]){
                swarmHandlersSubscribers[swarmHandler.meta.swarmId] = [];
            }
            swarmHandlersSubscribers[swarmHandler.meta.swarmId].push(callback);

        },
        off: function (swarmHandler) {
            swarmHandlersSubscribers[swarmHandler.meta.swarmId] = [];
        }
    };

    return swarmInteract.newInteractionSpace(communication);
}

var spaces = {};

module.exports.createInteractionSpace = function (agent, targetFolder, returnFolder) {
    var index = targetFolder+returnFolder;
    if(!spaces[index]){
        spaces[index] = new FolderMQInteractionSpace(agent, targetFolder, returnFolder);
    }else{
        console.log(`FolderMQ interaction space based on [${targetFolder}, ${returnFolder}] already exists!`);
    }
    return spaces[index];
};
},{"./../swarmInteraction":"/home/privatesky/modules/interact/lib/swarmInteraction.js","foldermq":"foldermq","swarmutils":false}],"/home/privatesky/modules/interact/lib/interactionSpaceImpl/httpInteractionSpace.js":[function(require,module,exports){
require('psk-http-client');

function HTTPInteractionSpace(alias, remoteEndPoint, agentUid, cryptoInfo) {
    const swarmInteract = require("./../swarmInteraction");

    let initialized = false;
    function init(){
        if(!initialized){
            initialized = true;
            $$.remote.createRequestManager();
            $$.remote.newEndPoint(alias, remoteEndPoint, agentUid, cryptoInfo);
        }
    }

    const comm = {
        startSwarm: function (swarmName, ctor, args) {
            init();
            return $$.remote[alias].startSwarm(swarmName, ctor, ...args);
        },
        continueSwarm: function (swarmHandler, swarmSerialisation, ctor, args) {
            return $$.remote[alias].continueSwarm(swarmSerialisation, ctor, args);
        },
        on: function (swarmHandler, callback) {
            swarmHandler.on('*', callback);
        },
        off: function (swarmHandler) {
            swarmHandler.off('*');
        }
    };

    return swarmInteract.newInteractionSpace(comm);
}

module.exports.createInteractionSpace = function (alias, remoteEndPoint, agentUid, cryptoInfo) {
    //singleton
    return new HTTPInteractionSpace(alias, remoteEndPoint, agentUid, cryptoInfo);
};
},{"./../swarmInteraction":"/home/privatesky/modules/interact/lib/swarmInteraction.js","psk-http-client":"psk-http-client"}],"/home/privatesky/modules/interact/lib/interactionSpaceImpl/specificMQImpl/ChildWebViewMQ.js":[function(require,module,exports){
(function (global){
var channelsRegistry = {}; //keeps callbacks for consumers and windows references for producers
var callbacksRegistry = {};

function dispatchEvent(event) {
    var swarm = JSON.parse(event.data);
    if(swarm.meta){
        var callback = callbacksRegistry[swarm.meta.channelName];
        if (callback) {
            return callback(null, swarm);
        } else {
            throw new Error("");
        }
    }

}


function ChildWndMQ(channelName, mainWindow, secondCommunicationChannel) {
    //channel name is

    channelsRegistry[channelName] = mainWindow;

    this.produce = function (swarmMsg) {
        swarmMsg.meta.channelName = channelName;
        var message = {
            meta:swarmMsg.meta,
            publicVars:swarmMsg.publicVars,
            privateVars:swarmMsg.privateVars
        };

        message.meta.args = message.meta.args.map(function (argument) {
            if (argument instanceof Error) {
                var error = {};
                if (argument.message) {
                    error["message"] = argument.message;
                }
                if (argument.code) {
                    error["code"] = argument.code;
                }
                return error;
            }
            return argument;
        });
        mainWindow.postMessage(JSON.stringify(message), "*");
    };

    var consumer;

    this.registerConsumer = function (callback, shouldDeleteAfterRead = true) {
        if (typeof callback !== "function") {
            throw new Error("First parameter should be a callback function");
        }
        if (consumer) {
           // throw new Error("Only one consumer is allowed!");
        }

        consumer = callback;
        callbacksRegistry[channelName] = consumer;

        if (secondCommunicationChannel && typeof secondCommunicationChannel.addEventListener !== "undefined") {
            secondCommunicationChannel.addEventListener("message", dispatchEvent);
        }
      };
}


module.exports.createMQ = function createMQ(channelName, wnd, secondCommunicationChannel){
    return new ChildWndMQ(channelName, wnd, secondCommunicationChannel);
};


module.exports.initForSwarmingInChild = function(domainName){

    var pubSub = $$.require("soundpubsub").soundPubSub;

    var inbound = createMQ(domainName+"/inbound");
    var outbound = createMQ(domainName+"/outbound");


    inbound.registerConsumer(function(err, swarm){
        if (err) {
            console.log(err);
        }
        //restore and execute this tasty swarm
        global.$$.swarmsInstancesManager.revive_swarm(swarm);
    });

    pubSub.subscribe($$.CONSTANTS.SWARM_FOR_EXECUTION, function(swarm){
        outbound.sendSwarmForExecution(swarm);
    });
};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],"/home/privatesky/modules/interact/lib/interactionSpaceImpl/specificMQImpl/ChildWndMQ.js":[function(require,module,exports){
(function (global){
var channelsRegistry = {}; //keeps callbacks for consumers and windows references for producers
var callbacksRegistry = {};
var swarmCallbacks = {};

function dispatchEvent(event) {

    if (event.source !== window) {

        var swarm = event.data;

        if (swarm.meta) {
            let callback;
            if (!swarm.meta.requestId || !swarmCallbacks[swarm.meta.requestId]) {
                callback = callbacksRegistry[swarm.meta.channelName];
            }
            else {
                callback = swarmCallbacks[swarm.meta.requestId];
            }

            if (callback) {
                return callback(null, swarm);
            } else {
                throw new Error("");
            }

        }
    }
}


function ChildWndMQ(channelName, mainWindow) {
    //channel name is

    channelsRegistry[channelName] = mainWindow;

    this.produce = function (swarmMsg) {
        swarmMsg.meta.channelName = channelName;
        var message = {
            meta: swarmMsg.meta,
            publicVars: swarmMsg.publicVars,
            privateVars: swarmMsg.privateVars
        };
        //console.log(swarmMsg.getJSON());
        //console.log(swarmMsg.valueOf());
        message.meta.args = message.meta.args.map(function (argument) {
            if (argument instanceof Error) {
                var error = {};
                if (argument.message) {
                    error["message"] = argument.message;
                }
                if (argument.code) {
                    error["code"] = argument.code;
                }
                return error;
            }
            return argument;
        });
        mainWindow.postMessage(message, "*");
    };

    var consumer;

    this.registerConsumer = function (callback, shouldDeleteAfterRead = true) {
        if (typeof callback !== "function") {
            throw new Error("First parameter should be a callback function");
        }
        if (consumer) {
            // throw new Error("Only one consumer is allowed!");
        }

        consumer = callback;
        callbacksRegistry[channelName] = consumer;
        mainWindow.addEventListener("message", dispatchEvent);
    };

    this.registerCallback = function (requestId, callback) {
        swarmCallbacks[requestId] = callback;
        callbacksRegistry[channelName] = callback;
        mainWindow.addEventListener("message", dispatchEvent);
    };

}


module.exports.createMQ = function createMQ(channelName, wnd) {
    return new ChildWndMQ(channelName, wnd);
};


module.exports.initForSwarmingInChild = function (domainName) {

    var pubSub = $$.require("soundpubsub").soundPubSub;

    var inbound = createMQ(domainName + "/inbound");
    var outbound = createMQ(domainName + "/outbound");


    inbound.registerConsumer(function (err, swarm) {
        if (err) {
            console.log(err);
        }
        //restore and execute this tasty swarm
        global.$$.swarmsInstancesManager.revive_swarm(swarm);
    });

    pubSub.subscribe($$.CONSTANTS.SWARM_FOR_EXECUTION, function (swarm) {
        outbound.sendSwarmForExecution(swarm);
    });
};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],"/home/privatesky/modules/interact/lib/swarmInteraction.js":[function(require,module,exports){
if (typeof $$ == "undefined") {
    $$ = {};
}

function VirtualSwarm(innerObj, globalHandler){
    let knownExtraProps = [ "swarm" ];

    function buildHandler() {
        var utility = {};
        return {
            set: function (target, property, value, receiver) {
                switch (true) {
                    case target.privateVars && target.privateVars.hasOwnProperty(property):
                        target.privateVars[property] = value;
                        break;
                    case target.publicVars && target.publicVars.hasOwnProperty(property):
                        target.publicVars[property] = value;
                        break;
                    case target.hasOwnProperty(property):
                        target[property] = value;
                        break;
                    case knownExtraProps.indexOf(property) === -1:
                        if (!globalHandler.protected) {
                            globalHandler.protected = {};
                        }
                        globalHandler.protected[property] = value;
                        break;
                    default:
                        utility[property] = value;
                }
                return true;
            },
            get: function (target, property, receiver) {

                switch (true) {
                    case target.publicVars && target.publicVars.hasOwnProperty(property):
                        return target.publicVars[property];
                    case target.privateVars && target.privateVars.hasOwnProperty(property):
                        return target.privateVars[property];
                    case target.hasOwnProperty(property):
                        return target[property];
                    case globalHandler.protected && globalHandler.protected.hasOwnProperty(property):
                        return globalHandler.protected[property];
                    case utility.hasOwnProperty(property):
                        return utility[property];
                    default:
                        return undefined;
                }
            }
        };
    }

    return new Proxy(innerObj, buildHandler());
}

function SwarmInteraction(communicationInterface, swarmName, ctor, args) {

    var swarmHandler = communicationInterface.startSwarm(swarmName, ctor, args);

    this.on = function(description){
        communicationInterface.on(swarmHandler, function(err, swarmSerialisation){
            if (err) {
                console.log(err);
            }
            let phase = description[swarmSerialisation.meta.phaseName];
            let virtualSwarm = new VirtualSwarm(swarmSerialisation, swarmHandler);

            if(!phase){
                //TODO review and fix. Fix case when an interaction is started from another interaction
                if(swarmHandler && (!swarmHandler.Target || swarmHandler.Target.swarmId !== swarmSerialisation.meta.swarmId)){
                    console.log("Not my swarm!");
                    return;
                }
                var interactPhaseErr =  new Error("Interact method "+swarmSerialisation.meta.phaseName+" was not found.");
                if(description["onError"]){
                    description["onError"].call(virtualSwarm, interactPhaseErr);
                    return;
                }
                else{
                    throw interactPhaseErr;
                }
            }

            virtualSwarm.swarm = function(phaseName, ...args){
                communicationInterface.continueSwarm(swarmHandler, swarmSerialisation, phaseName, args);
            };

            phase.apply(virtualSwarm, swarmSerialisation.meta.args);
            if(virtualSwarm.meta.command === "asyncReturn"){
                communicationInterface.off(swarmHandler);
            }
        });
    };

    this.onReturn = function(callback){
        this.on({
            __return__: callback
        });
    };
}

var abstractInteractionSpace = {
    startSwarm: function (swarmName, ctor, args) {
        throw new Error("Overwrite  SwarmInteraction.prototype.startSwarm");
    },
    resendSwarm: function (swarmInstance, swarmSerialisation, ctor, args) {
        throw new Error("Overwrite  SwarmInteraction.prototype.continueSwarm ");
    },
    on: function (swarmInstance, phaseName, callback) {
        throw new Error("Overwrite  SwarmInteraction.prototype.onSwarm");
    },
off: function (swarmInstance) {
        throw new Error("Overwrite  SwarmInteraction.prototype.onSwarm");
    }
};

module.exports.newInteractionSpace = function (communicationInterface) {

    if(!communicationInterface) {
        communicationInterface = abstractInteractionSpace ;
    }
    return {
        startSwarm: function (swarmName, ctor, ...args) {
            return new SwarmInteraction(communicationInterface, swarmName, ctor, args);
        }
    };
};


},{}],"/home/privatesky/modules/node-fd-slicer/modules/node-pend/index.js":[function(require,module,exports){
module.exports = Pend;

function Pend() {
  this.pending = 0;
  this.max = Infinity;
  this.listeners = [];
  this.waiting = [];
  this.error = null;
}

Pend.prototype.go = function(fn) {
  if (this.pending < this.max) {
    pendGo(this, fn);
  } else {
    this.waiting.push(fn);
  }
};

Pend.prototype.wait = function(cb) {
  if (this.pending === 0) {
    cb(this.error);
  } else {
    this.listeners.push(cb);
  }
};

Pend.prototype.hold = function() {
  return pendHold(this);
};

function pendHold(self) {
  self.pending += 1;
  var called = false;
  return onCb;
  function onCb(err) {
    if (called) throw new Error("callback called twice");
    called = true;
    self.error = self.error || err;
    self.pending -= 1;
    if (self.waiting.length > 0 && self.pending < self.max) {
      pendGo(self, self.waiting.shift());
    } else if (self.pending === 0) {
      var listeners = self.listeners;
      self.listeners = [];
      listeners.forEach(cbListener);
    }
  }
  function cbListener(listener) {
    listener(self.error);
  }
}

function pendGo(self, fn) {
  fn(pendHold(self));
}

},{}],"/home/privatesky/modules/psk-http-client/lib/psk-abstract-client.js":[function(require,module,exports){
(function (Buffer){
const msgpack = require('@msgpack/msgpack');

/**********************  utility class **********************************/
function RequestManager(pollingTimeOut){
    if(!pollingTimeOut){
        pollingTimeOut = 1000; //1 second by default
    }

    var self = this;

    function Request(endPoint, initialSwarm){
        var onReturnCallbacks = [];
        var onErrorCallbacks = [];
        var onCallbacks = [];
        var requestId = initialSwarm.meta.requestId;
        initialSwarm = null;

        this.getRequestId = function(){
            return requestId;
        };

        this.on = function(phaseName, callback){
            if(typeof phaseName != "string"  && typeof callback != "function"){
                throw new Error("The first parameter should be a string and the second parameter should be a function");
            }

            onCallbacks.push({
                callback:callback,
                phase:phaseName
            });
            self.poll(endPoint, this);
            return this;
        };

        this.onReturn = function(callback){
            onReturnCallbacks.push(callback);
            self.poll(endPoint, this);
            return this;
        };

        this.onError = function(callback){
            if(onErrorCallbacks.indexOf(callback)!==-1){
                onErrorCallbacks.push(callback);
            }else{
                console.log("Error callback already registered!");
            }
        };

        this.dispatch = function(err, result){
            if(ArrayBuffer.isView(result) || Buffer.isBuffer(result)) {
                result = msgpack.decode(result);
            }

            result = typeof result === "string" ? JSON.parse(result) : result;

            result = OwM.prototype.convert(result);
            var resultReqId = result.getMeta("requestId");
            var phaseName = result.getMeta("phaseName");
            var onReturn = false;

            if(resultReqId === requestId){
                onReturnCallbacks.forEach(function(c){
                    c(null, result);
                    onReturn = true;
                });
                if(onReturn){
                    onReturnCallbacks = [];
                    onErrorCallbacks = [];
                }

                onCallbacks.forEach(function(i){
                    //console.log("XXXXXXXX:", phaseName , i);
                    if(phaseName === i.phase || i.phase === '*') {
                        i.callback(err, result);
                    }
                });
            }

            if(onReturnCallbacks.length === 0 && onCallbacks.length === 0){
                self.unpoll(endPoint, this);
            }
        };

        this.dispatchError = function(err){
            for(var i=0; i < onErrorCallbacks.length; i++){
                var errCb = onErrorCallbacks[i];
                errCb(err);
            }
        };

        this.off = function(){
            self.unpoll(endPoint, this);
        };
    }

    this.createRequest = function(remoteEndPoint, swarm){
        let request = new Request(remoteEndPoint, swarm);
        return request;
    };

    /* *************************** polling zone ****************************/

    var pollSet = {
    };

    var activeConnections = {
    };

    this.poll = function(remoteEndPoint, request){
        var requests = pollSet[remoteEndPoint];
        if(!requests){
            requests = {};
            pollSet[remoteEndPoint] = requests;
        }
        requests[request.getRequestId()] = request;
        pollingHandler();
    };

    this.unpoll = function(remoteEndPoint, request){
        var requests = pollSet[remoteEndPoint];
        if(requests){
            delete requests[request.getRequestId()];
            if(Object.keys(requests).length === 0){
                delete pollSet[remoteEndPoint];
            }
        }
        else {
            console.log("Unpolling wrong request:",remoteEndPoint, request);
        }
    };

    function createPollThread(remoteEndPoint){
        function reArm(){
            $$.remote.doHttpGet(remoteEndPoint, function(err, res){
                let requests = pollSet[remoteEndPoint];

                if(err){
                    for(let req_id in requests){
                        let err_handler = requests[req_id].dispatchError;
                        if(err_handler){
                            err_handler(err);
                        }
                    }
                    activeConnections[remoteEndPoint] = false;
                } else {
                    if(Buffer.isBuffer(res) || ArrayBuffer.isView(res)) {
                        res = msgpack.decode(res);
                    }

                    for(var k in requests){
                        requests[k].dispatch(null, res);
                    }

                    if(Object.keys(requests).length !== 0) {
                        reArm();
                    } else {
                        delete activeConnections[remoteEndPoint];
                        console.log("Ending polling for ", remoteEndPoint);
                    }
                }
            });
        }
        reArm();
    }

    function pollingHandler(){
        let setTimer = false;
        for(var v in pollSet){
            if(!activeConnections[v]){
                createPollThread(v);
                activeConnections[v] = true;
            }
            setTimer = true;
        }
        if(setTimer) {
            setTimeout(pollingHandler, pollingTimeOut);
        }
    }

    setTimeout( pollingHandler, pollingTimeOut);
}


function extractDomainAgentDetails(url){
    const vRegex = /([a-zA-Z0-9]*|.)*\/agent\/([a-zA-Z0-9]+(\/)*)+/g;

    if(!url.match(vRegex)){
        throw new Error("Invalid format. (Eg. domain[.subdomain]*/agent/[organisation/]*agentId)");
    }

    const devider = "/agent/";
    let domain;
    let agentUrl;

    const splitPoint = url.indexOf(devider);
    if(splitPoint !== -1){
        domain = url.slice(0, splitPoint);
        agentUrl = url.slice(splitPoint+devider.length);
    }

    return {domain, agentUrl};
}

function urlEndWithSlash(url){

    if(url[url.length - 1] !== "/"){
        url += "/";
    }

    return url;
}

const OwM = require("swarmutils").OwM;

/********************** main APIs on working with remote end points **********************************/
function PskHttpClient(remoteEndPoint, agentUid, options){
    var baseOfRemoteEndPoint = remoteEndPoint; //remove last id

    remoteEndPoint = urlEndWithSlash(remoteEndPoint);

    //domainInfo contains 2 members: domain (privateSky domain) and agentUrl
    const domainInfo = extractDomainAgentDetails(agentUid);
    let homeSecurityContext = domainInfo.agentUrl;
    let returnRemoteEndPoint = remoteEndPoint;

    if(options && typeof options.returnRemote != "undefined"){
        returnRemoteEndPoint = options.returnRemote;
    }

    if(!options || options && (typeof options.uniqueId == "undefined" || options.uniqueId)){
        homeSecurityContext += "_"+Math.random().toString(36).substr(2, 9);
    }

    returnRemoteEndPoint = urlEndWithSlash(returnRemoteEndPoint);

    this.startSwarm = function(swarmName, phaseName, ...args){
        const swarm = new OwM();
        swarm.setMeta("swarmId", $$.uidGenerator.safe_uuid());
        swarm.setMeta("requestId", swarm.getMeta("swarmId"));
        swarm.setMeta("swarmTypeName", swarmName);
        swarm.setMeta("phaseName", phaseName);
        swarm.setMeta("args", args);
        swarm.setMeta("command", "executeSwarmPhase");
        swarm.setMeta("target", domainInfo.agentUrl);
        swarm.setMeta("homeSecurityContext", returnRemoteEndPoint+$$.remote.base64Encode(homeSecurityContext));

        $$.remote.doHttpPost(getRemote(remoteEndPoint, domainInfo.domain), msgpack.encode(swarm), function(err, res){
            if(err){
                console.log(err);
            }
        });

        return $$.remote.requestManager.createRequest(swarm.getMeta("homeSecurityContext"), swarm);
    };

    this.continueSwarm = function(existingSwarm, phaseName, ...args){
        var swarm = new OwM(existingSwarm);
        swarm.setMeta("phaseName", phaseName);
        swarm.setMeta("args", args);
        swarm.setMeta("command", "executeSwarmPhase");
        swarm.setMeta("target", domainInfo.agentUrl);
        swarm.setMeta("homeSecurityContext", returnRemoteEndPoint+$$.remote.base64Encode(homeSecurityContext));

        $$.remote.doHttpPost(getRemote(remoteEndPoint, domainInfo.domain), msgpack.encode(swarm), function(err, res){
            if(err){
                console.log(err);
            }
        });
        //return $$.remote.requestManager.createRequest(swarm.getMeta("homeSecurityContext"), swarm);
    };

    var allCatchAlls = [];
    var requestsCounter = 0;
    function CatchAll(swarmName, phaseName, callback){ //same interface as Request
        var requestId = requestsCounter++;
        this.getRequestId = function(){
            let reqId = "swarmName" + "phaseName" + requestId;
            return reqId;
        };

        this.dispatch = function(err, result){
            result = OwM.prototype.convert(result);
            var currentPhaseName = result.getMeta("phaseName");
            var currentSwarmName = result.getMeta("swarmTypeName");
            if((currentSwarmName === swarmName || swarmName === '*') && (currentPhaseName === phaseName || phaseName === '*')) {
                return callback(err, result);
            }
        };
    }

    this.on = function(swarmName, phaseName, callback){
        var c = new CatchAll(swarmName, phaseName, callback);
        allCatchAlls.push({
            s:swarmName,
            p:phaseName,
            c:c
        });

        $$.remote.requestManager.poll(getRemote(remoteEndPoint, domainInfo.domain) , c);
    };

    this.off = function(swarmName, phaseName){
        allCatchAlls.forEach(function(ca){
            if((ca.s === swarmName || swarmName === '*') && (phaseName === ca.p || phaseName === '*')){
                $$.remote.requestManager.unpoll(getRemote(remoteEndPoint, domainInfo.domain), ca.c);
            }
        });
    };

    this.uploadCSB = function(cryptoUid, binaryData, callback){
        $$.remote.doHttpPost(baseOfRemoteEndPoint + "/CSB/" + cryptoUid, binaryData, callback);
    };

    this.downloadCSB = function(cryptoUid, callback){
        $$.remote.doHttpGet(baseOfRemoteEndPoint + "/CSB/" + cryptoUid, callback);
    };

    function getRemote(baseUrl, domain) {
        return urlEndWithSlash(baseUrl) + $$.remote.base64Encode(domain);
    }
}

/********************** initialisation stuff **********************************/
if (typeof $$ === "undefined") {
    $$ = {};
}

if (typeof  $$.remote === "undefined") {
    $$.remote = {};
    $$.remote.createRequestManager = function(timeOut){
        $$.remote.requestManager = new RequestManager(timeOut);
    };


    $$.remote.cryptoProvider = null;
    $$.remote.newEndPoint = function(alias, remoteEndPoint, agentUid, cryptoInfo){
        if(alias === "newRemoteEndPoint" || alias === "requestManager" || alias === "cryptoProvider"){
            console.log("PskHttpClient Unsafe alias name:", alias);
            return null;
        }

        $$.remote[alias] = new PskHttpClient(remoteEndPoint, agentUid, cryptoInfo);
    };


    $$.remote.doHttpPost = function (url, data, callback){
        throw new Error("Overwrite this!");
    };

    $$.remote.doHttpGet = function doHttpGet(url, callback){
        throw new Error("Overwrite this!");
    };

    $$.remote.base64Encode = function base64Encode(stringToEncode){
        throw new Error("Overwrite this!");
    };

    $$.remote.base64Decode = function base64Decode(encodedString){
        throw new Error("Overwrite this!");
    };
}



/*  interface
function CryptoProvider(){

    this.generateSafeUid = function(){

    }

    this.signSwarm = function(swarm, agent){

    }
} */

}).call(this,{"isBuffer":require("../../../node_modules/is-buffer/index.js")})

},{"../../../node_modules/is-buffer/index.js":"/home/privatesky/node_modules/is-buffer/index.js","@msgpack/msgpack":false,"swarmutils":false}],"/home/privatesky/modules/psk-http-client/lib/psk-browser-client.js":[function(require,module,exports){
(function (Buffer){
$$.remote.doHttpPost = function (url, data, callback) {
    const xhr = new XMLHttpRequest();

    xhr.onload = function () {
        if (xhr.readyState === 4 && (xhr.status >= 200 && xhr.status < 300)) {
            const data = xhr.response;
            callback(null, data);
        } else {
            if(xhr.status>=400){
                callback(new Error("An error occured. StatusCode: " + xhr.status));
            } else {
                console.log(`Status code ${xhr.status} received, response is ignored.`);
            }
        }
    };

    xhr.open("POST", url, true);
    //xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    if(data && data.pipe && typeof data.pipe === "function"){
        const buffers = [];
        data.on("data", function(data) {
            buffers.push(data);
        });
        data.on("end", function() {
            const actualContents = Buffer.concat(buffers);
            xhr.send(actualContents);
        });
    }
    else {
        if(ArrayBuffer.isView(data)) {
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        }

        xhr.send(data);
    }
};


$$.remote.doHttpGet = function doHttpGet(url, callback) {

    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
        //check if headers were received and if any action should be performed before receiving data
        if (xhr.readyState === 2) {
            var contentType = xhr.getResponseHeader("Content-Type");
            if (contentType === "application/octet-stream") {
                xhr.responseType = 'arraybuffer';
            }
        }
    };


    xhr.onload = function () {

        if (xhr.readyState == 4 && xhr.status == "200") {
            var contentType = xhr.getResponseHeader("Content-Type");

            if(contentType==="application/octet-stream"){
                let responseBuffer = Buffer.from(this.response);
                callback(null, responseBuffer);
            }
            else{
                callback(null, xhr.response);
            }

        } else {
            callback(new Error("An error occured. StatusCode: " + xhr.status));
        }
    };

    xhr.open("GET", url);
    xhr.send();
};


function CryptoProvider(){

    this.generateSafeUid = function(){
        let uid = "";
        var array = new Uint32Array(10);
        window.crypto.getRandomValues(array);


        for (var i = 0; i < array.length; i++) {
            uid += array[i].toString(16);
        }

        return uid;
    }

    this.signSwarm = function(swarm, agent){
        swarm.meta.signature = agent;
    }
}



$$.remote.cryptoProvider = new CryptoProvider();

$$.remote.base64Encode = function base64Encode(stringToEncode){
    return window.btoa(stringToEncode);
};

$$.remote.base64Decode = function base64Decode(encodedString){
    return window.atob(encodedString);
};

}).call(this,require("buffer").Buffer)

},{"buffer":false}],"/home/privatesky/modules/psk-http-client/lib/psk-node-client.js":[function(require,module,exports){
(function (Buffer){
require("./psk-abstract-client");

const http = require("http");
const https = require("https");
const URL = require("url");
const userAgent = 'PSK NodeAgent/0.0.1';

console.log("PSK node client loading");

function getNetworkForOptions(options) {
	if(options.protocol === 'http:') {
		return http;
	} else if(options.protocol === 'https:') {
		return https;
	} else {
		throw new Error(`Can't handle protocol ${options.protocol}`);
	}

}

$$.remote.doHttpPost = function (url, data, callback){
	const innerUrl = URL.parse(url);

	const options = {
		hostname: innerUrl.hostname,
		path: innerUrl.pathname,
		port: parseInt(innerUrl.port),
		headers: {
			'User-Agent': userAgent
		},
		method: 'POST'
	};

	const network = getNetworkForOptions(innerUrl);

	if(ArrayBuffer.isView(data) || Buffer.isBuffer(data)) {
		if(!Buffer.isBuffer(data)) {
			data = Buffer.from(data);
		}

		options.headers['Content-Type'] = 'application/octet-stream';
		options.headers['Content-Length'] = data.length;
	}

	const req = network.request(options, (res) => {
		const { statusCode } = res;

		let error;
		if (statusCode >= 400) {
			error = new Error('Request Failed.\n' +
				`Status Code: ${statusCode}`);
		}

		if (error) {
			callback(error);
			// free up memory
			res.resume();
			return ;
		}

		let rawData = '';
		res.on('data', (chunk) => { rawData += chunk; });
		res.on('end', () => {
			try {
				return callback(null, rawData);
			} catch (err) {
				return callback(err);
			}
		});
	}).on("error", (error) => {
        console.log("POST Error", error);
		callback(error);
	});

    if(data && data.pipe && typeof data.pipe === "function"){
        data.pipe(req);
        return;
    }

    if(typeof data !== 'string' && !Buffer.isBuffer(data) && !ArrayBuffer.isView(data)) {
		data = JSON.stringify(data);
	}

	req.write(data);
	req.end();
};

$$.remote.doHttpGet = function doHttpGet(url, callback){
    const innerUrl = URL.parse(url);

	const options = {
		hostname: innerUrl.hostname,
		path: innerUrl.pathname + (innerUrl.search || ''),
		port: parseInt(innerUrl.port),
		headers: {
			'User-Agent': userAgent
		},
		method: 'GET'
	};

	const network = getNetworkForOptions(innerUrl);

	const req = network.request(options, (res) => {
		const { statusCode } = res;

		let error;
		if (statusCode !== 200) {
			error = new Error('Request Failed.\n' +
				`Status Code: ${statusCode}`);
			error.code = statusCode;
		}

		if (error) {
			callback(error);
			// free up memory
			res.resume();
			return ;
		}

		let rawData;
		const contentType = res.headers['content-type'];

		if(contentType === "application/octet-stream"){
			rawData = [];
		}else{
			rawData = '';
		}

		res.on('data', (chunk) => {
			if(Array.isArray(rawData)){
				rawData.push(...chunk);
			}else{
				rawData += chunk;
			}
		});
		res.on('end', () => {
			try {
				if(Array.isArray(rawData)){
					rawData = Buffer.from(rawData);
				}
				return callback(null, rawData);
			} catch (err) {
				console.log("Client error:", err);
			}
		});
	});

	req.on("error", (error) => {
		if(error && error.code !== 'ECONNRESET'){
        	console.log("GET Error", error);
		}

		callback(error);
	});

	req.end();
};

$$.remote.base64Encode = function base64Encode(stringToEncode){
    return Buffer.from(stringToEncode).toString('base64');
};

$$.remote.base64Decode = function base64Decode(encodedString){
    return Buffer.from(encodedString, 'base64').toString('ascii');
};

}).call(this,require("buffer").Buffer)

},{"./psk-abstract-client":"/home/privatesky/modules/psk-http-client/lib/psk-abstract-client.js","buffer":false,"http":false,"https":false,"url":false}],"/home/privatesky/modules/pskdb/lib/Blockchain.js":[function(require,module,exports){
const consUtil = require('signsensus').consUtil;
const beesHealer = require("swarmutils").beesHealer;

function Blockchain(pds) {
    let swarm = null;

    this.beginTransaction = function (transactionSwarm) {
        if (!transactionSwarm) {
            throw new Error('Missing swarm');
        }

        swarm = transactionSwarm;
        return new Transaction(pds.getHandler());
    };

    this.commit = function (transaction) {

        const diff = pds.computeSwarmTransactionDiff(swarm, transaction.getHandler());
        const t = consUtil.createTransaction(0, diff);
        const set = {};
        set[t.digest] = t;
        pds.commit(set, 1);
    };
}


function Transaction(pdsHandler) {
    const ALIASES = '/aliases';


    this.add = function (asset) {
        const swarmTypeName = asset.getMetadata('swarmTypeName');
        const swarmId = asset.getMetadata('swarmId');

        const aliasIndex = new AliasIndex(swarmTypeName);
        if (asset.alias && aliasIndex.getUid(asset.alias) !== swarmId) {
            aliasIndex.create(asset.alias, swarmId);
        }

        asset.setMetadata('persisted', true);
        const serializedSwarm = beesHealer.asJSON(asset, null, null);

        pdsHandler.writeKey(swarmTypeName + '/' + swarmId, J(serializedSwarm));
    };

    this.lookup = function (assetType, aid) { // alias sau id
        let localUid = aid;

        if (hasAliases(assetType)) {
            const aliasIndex = new AliasIndex(assetType);
            localUid = aliasIndex.getUid(aid) || aid;
        }

        const value = pdsHandler.readKey(assetType + '/' + localUid);

        if (!value) {
            return $$.asset.start(assetType);
        } else {
            const swarm = $$.asset.continue(assetType, JSON.parse(value));
            swarm.setMetadata("persisted", true);
            return swarm;
        }
    };

    this.loadAssets = function (assetType) {
        const assets = [];

        const aliasIndex = new AliasIndex(assetType);
        Object.keys(aliasIndex.getAliases()).forEach((alias) => {
            assets.push(this.lookup(assetType, alias));
        });

        return assets;
    };

    this.getHandler = function () {
        return pdsHandler;
    };

    function hasAliases(spaceName) {
        return !!pdsHandler.readKey(spaceName + ALIASES);
    }

    function AliasIndex(assetType) {
        this.create = function (alias, uid) {
            const assetAliases = this.getAliases();

            if (typeof assetAliases[alias] !== "undefined") {
                $$.errorHandler.throwError(new Error(`Alias ${alias} for assets of type ${assetType} already exists`));
            }

            assetAliases[alias] = uid;

            pdsHandler.writeKey(assetType + ALIASES, J(assetAliases));
        };

        this.getUid = function (alias) {
            const assetAliases = this.getAliases();
            return assetAliases[alias];
        };

        this.getAliases = function () {
            let aliases = pdsHandler.readKey(assetType + ALIASES);
            return aliases ? JSON.parse(aliases) : {};
        };
    }
}

module.exports = Blockchain;
},{"signsensus":"signsensus","swarmutils":false}],"/home/privatesky/modules/pskdb/lib/FolderPersistentPDS.js":[function(require,module,exports){
var memoryPDS = require("./InMemoryPDS");
var fs = require("fs");
var path = require("path");


function FolderPersistentPDS(folder) {
    this.memCache = memoryPDS.newPDS(this);

    function mkSingleLine(str) {
        return str.replace(/[\n\r]/g, "");
    }

    function makeCurrentValueFilename() {
        return path.normalize(folder + '/currentVersion');
    }

    function getCurrentValue(path) {
        try {
            if(!fs.existsSync(path)) {
                return null;
            }

            return JSON.parse(fs.readFileSync(path).toString());
        } catch (e) {
            console.log('error ', e);
            return null;
        }
    }

    this.persist = function (transactionLog, currentValues, currentPulse) {

        transactionLog.currentPulse = currentPulse;
        transactionLog = mkSingleLine(JSON.stringify(transactionLog)) + "\n";

        fs.mkdir(folder, {recursive: true}, function (err, res) {
            if (err && err.code !== "EEXIST") {
                throw err;
            }

            fs.appendFileSync(folder + '/transactionsLog', transactionLog, 'utf8');
            fs.writeFileSync(makeCurrentValueFilename(), JSON.stringify(currentValues, null, 1));
        });
    };

    const innerValues = getCurrentValue(makeCurrentValueFilename());
    this.memCache.initialise(innerValues);
}

exports.newPDS = function (folder) {
    const pds = new FolderPersistentPDS(folder);
    return pds.memCache;
};

},{"./InMemoryPDS":"/home/privatesky/modules/pskdb/lib/InMemoryPDS.js","fs":false,"path":false}],"/home/privatesky/modules/pskdb/lib/InMemoryPDS.js":[function(require,module,exports){
(function (global){

var cutil   = require("../../signsensus/lib/consUtil");
var ssutil  = require("pskcrypto");


function Storage(parentStorage){
    var cset            = {};  // containes all keys in parent storage, contains only keys touched in handlers
    var writeSet        = !parentStorage ? cset : {};   //contains only keys modified in handlers

    var readSetVersions  = {}; //meaningful only in handlers
    var writeSetVersions = {}; //will store all versions generated by writeKey

    var vsd             = "empty"; //only for parent storage
    var previousVSD     = null;

    var myCurrentPulse    = 0;
    var self = this;


    function hasLocalKey(name){
        return cset.hasOwnProperty(name);
    }

    this.hasKey = function(name){
        return parentStorage ? parentStorage.hasKey(name) : hasLocalKey(name);
    };

    this.readKey = function readKey(name){
        var value;
        if(hasLocalKey(name)){
            value = cset[name];
        }else{
            if(this.hasKey(name)){
                value = parentStorage.readKey(name);
                cset[name] = value;
                readSetVersions[name] = parentStorage.getVersion(name);
            }else{
                cset[name] = undefined;
                readSetVersions[name] = 0;
            }
            writeSetVersions[name] = readSetVersions[name];
        }
        return value;
    };

    this.getVersion = function(name, realVersion){
        var version = 0;
        if(hasLocalKey(name)){
            version = readSetVersions[name];
        }else{
            if(this.hasKey(name)){
                cset[name] = parentStorage.readKey();
                version = readSetVersions[name] = parentStorage.getVersion(name);
            }else{
                cset[name] = undefined;
                readSetVersions[name] = version;
            }
        }
        return version;
    };

    this.writeKey = function modifyKey(name, value){
        var k = this.readKey(name); //TODO: unused var

        cset [name] = value;
        writeSetVersions[name]++;
        writeSet[name] = value;
    };

    this.getInputOutput = function () {
        return {
            input: readSetVersions,
            output: writeSet
        };
    };

    this.getInternalValues = function(currentPulse, updatePreviousVSD){
        if(updatePreviousVSD){
            myCurrentPulse = currentPulse;
            previousVSD = vsd;
        }
        return {
            cset:cset,
            writeSetVersions:writeSetVersions,
            previousVSD:previousVSD,
            vsd:vsd,
            currentPulse:currentPulse
        };
    };

    this.initialiseInternalValue = function(storedValues){
        if(!storedValues) {
            return;
        }

        cset = storedValues.cset;
        writeSetVersions = storedValues.writeSetVersions;
        vsd = storedValues.vsd;
        writeSet = cset;
        myCurrentPulse = storedValues.currentPulse;
        previousVSD = storedValues.previousVSD;
    };

    function applyTransaction(t){
        for(let k in t.output){
            if(!t.input.hasOwnProperty(k)){
                return false;
            }
        }
        for(let l in t.input){
            var transactionVersion = t.input[l];
            var currentVersion = self.getVersion(l);
            if(transactionVersion !== currentVersion){
                //console.log(l, transactionVersion , currentVersion);
                return false;
            }
        }

        for(let v in t.output){
            self.writeKey(v, t.output[v]);
        }

		var arr = process.hrtime();
		var current_second = arr[0];
		var diff = current_second-t.second;

		global["Tranzactions_Time"]+=diff;

		return true;
    }

    this.computePTBlock = function(nextBlockSet){   //make a transactions block from nextBlockSet by removing invalid transactions from the key versions point of view
        var validBlock = [];
        var orderedByTime = cutil.orderTransactions(nextBlockSet);
        var i = 0;

        while(i < orderedByTime.length){
            var t = orderedByTime[i];
            if(applyTransaction(t)){
                validBlock.push(t.digest);
            }
            i++;
        }
        return validBlock;
    };

    this.commit = function(blockSet){
        var i = 0;
        var orderedByTime = cutil.orderTransactions(blockSet);

        while(i < orderedByTime.length){
            var t = orderedByTime[i];
            if(!applyTransaction(t)){ //paranoid check,  fail to work if a majority is corrupted
                //pretty bad
                //throw new Error("Failed to commit an invalid block. This could be a nasty bug or the stakeholders majority is corrupted! It should never happen!");
                console.log("Failed to commit an invalid block. This could be a nasty bug or the stakeholders majority is corrupted! It should never happen!"); //TODO: replace with better error handling
            }
            i++;
        }
        this.getVSD(true);
    };

    this.getVSD = function(forceCalculation){
        if(forceCalculation){
            var tmp = this.getInternalValues(myCurrentPulse, true);
            vsd = ssutil.hashValues(tmp);
        }
        return vsd;
    };
}

function InMemoryPDS(permanentPersistence){

    var mainStorage = new Storage(null);


    this.getHandler = function(){ // a way to work with PDS
        var tempStorage = new Storage(mainStorage);
        return tempStorage;
    };

    this.computeSwarmTransactionDiff = function(swarm, forkedPds){
        var inpOutp     = forkedPds.getInputOutput();
        swarm.input     = inpOutp.input;
        swarm.output    = inpOutp.output;
        return swarm;
    };

    this.computePTBlock = function(nextBlockSet){
        var tempStorage = new Storage(mainStorage);
        return tempStorage.computePTBlock(nextBlockSet);

    };

    this.commit = function(blockSet, currentPulse){
        mainStorage.commit(blockSet);
        if(permanentPersistence) {
            permanentPersistence.persist(blockSet, mainStorage.getInternalValues(currentPulse, false), currentPulse);
        }
    };

    this.getVSD = function (){
        return mainStorage.getVSD(false);
    };

    this.initialise = function(savedInternalValues){
        mainStorage.initialiseInternalValue(savedInternalValues);
    };

}


exports.newPDS = function(persistence){
    return new InMemoryPDS(persistence);
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../signsensus/lib/consUtil":"/home/privatesky/modules/signsensus/lib/consUtil.js","pskcrypto":false}],"/home/privatesky/modules/pskdb/lib/PersistentPDS.js":[function(require,module,exports){
const memoryPDS = require("./InMemoryPDS");

function PersistentPDS({getInitValues, persist}) {
	this.memCache = memoryPDS.newPDS(this);
	this.persist = persist;

	const innerValues = getInitValues() || null;
	this.memCache.initialise(innerValues);
}


module.exports.newPDS = function (readerWriter) {
	const pds = new PersistentPDS(readerWriter);
	return pds.memCache;
};

},{"./InMemoryPDS":"/home/privatesky/modules/pskdb/lib/InMemoryPDS.js"}],"/home/privatesky/modules/pskdb/lib/domain/ACLScope.js":[function(require,module,exports){

$$.asset.describe("ACLScope", {
    public:{
        concern:"string:key",
        db:"json"
    },
    init:function(concern){
        this.concern = concern;
    },
    addResourceParent : function(resourceId, parentId){
        //TODO: empty functions!
    },
    addZoneParent : function(zoneId, parentId){
        //TODO: empty functions!
    },
    grant :function(agentId,  resourceId){
        //TODO: empty functions!
    },
    allow :function(agentId,  resourceId){
        return true;
    }
});
},{}],"/home/privatesky/modules/pskdb/lib/domain/Agent.js":[function(require,module,exports){

$$.asset.describe("Agent", {
    public:{
        alias:"string:key",
        publicKey:"string"
    },
    init:function(alias, value){
        this.alias      = alias;
        this.publicKey  = value;
    },
    update:function(value){
        this.publicKey = value;
    },
    addAgent: function () {
        throw new Error('Not Implemented');
    },
    listAgent: function () {
        throw new Error('Not Implemented');

    },
    removeAgent: function () {
        throw new Error('Not Implemented');

    }
});
},{}],"/home/privatesky/modules/pskdb/lib/domain/Backup.js":[function(require,module,exports){

$$.asset.describe("Backup", {
    public:{
        id:  "string",
        url: "string"
    },

    init:function(id, url){
        this.id = id;
        this.url = url;
    }
});

},{}],"/home/privatesky/modules/pskdb/lib/domain/CSBMeta.js":[function(require,module,exports){

$$.asset.describe("CSBMeta", {
	public:{
		isMaster:"string",
		alias:"string:key",
		description: "string",
		creationDate: "string",
		updatedDate : "string",
		id: "string",
		icon: "string"
	},
	init:function(id){
		this.alias = "meta";
		this.id = id;
	},

	setIsMaster: function (isMaster) {
		this.isMaster = isMaster;
	}

});

},{}],"/home/privatesky/modules/pskdb/lib/domain/CSBReference.js":[function(require,module,exports){

$$.asset.describe("CSBReference", {
    public:{
        alias:"string:key",
        seed :"string",
        dseed:"string"
    },
    init:function(alias, seed, dseed ){
        this.alias = alias;
        this.seed  = seed;
        this.dseed = dseed;
    },
    update:function(fingerprint){
        this.fingerprint = fingerprint;
        this.version++;
    },
    registerBackupUrl:function(backupUrl){
        this.backups.add(backupUrl);
    }
});

},{}],"/home/privatesky/modules/pskdb/lib/domain/DomainReference.js":[function(require,module,exports){

$$.asset.describe("DomainReference", {
    public:{
        role:"string:index",
        alias:"string:key",
        addresses:"map",
        constitution:"string",
        workspace:"string",
        remoteInterfaces:"map",
        localInterfaces:"map"
    },
    init:function(role, alias){
        this.role = role;
        this.alias = alias;
        this.addresses = {};
        this.remoteInterfaces = {};
        this.localInterfaces = {};
    },
    updateDomainAddress:function(replicationAgent, address){
        if(!this.addresses){
            this.addresses = {};
        }
        this.addresses[replicationAgent] = address;
    },
    removeDomainAddress:function(replicationAgent){
        this.addresses[replicationAgent] = undefined;
        delete this.addresses[replicationAgent];
    },
    addRemoteInterface:function(alias, remoteEndPoint){
        if(!this.remoteInterfaces){
            this.remoteInterfaces = {};
        }
        this.remoteInterfaces[alias] = remoteEndPoint;
    },
    removeRemoteInterface:function(alias){
        if(this.remoteInterface){
            this.remoteInterfaces[alias] = undefined;
            delete this.remoteInterfaces[alias];
        }
    },
    addLocalInterface:function(alias, path){
        if(!this.localInterfaces){
            this.localInterfaces = {};
        }
        this.localInterfaces[alias] = path;
    },
    removeLocalInterface:function(alias){
        if(this.localInterfaces){
            this.localInterfaces[alias] = undefined;
            delete this.localInterfaces[alias];
        }
    },
    setConstitution:function(pathOrUrlOrCSB){
        this.constitution = pathOrUrlOrCSB;
    },
    getConstitution:function(){
        return this.constitution;
    },
    setWorkspace:function(path){
        this.workspace = path;
    },
    getWorkspace:function(){
        return this.workspace;
    }
});
},{}],"/home/privatesky/modules/pskdb/lib/domain/EmbeddedFile.js":[function(require,module,exports){
$$.asset.describe("EmbeddedFile", {
	public:{
		alias:"string"
	},

	init:function(alias){
		this.alias = alias;
	}
});
},{}],"/home/privatesky/modules/pskdb/lib/domain/FileReference.js":[function(require,module,exports){
$$.asset.describe("FileReference", {
	public:{
		alias:"string",
		seed :"string",
		dseed:"string"
	},
	init:function(alias, seed, dseed){
		this.alias = alias;
		this.seed  = seed;
		this.dseed = dseed;
	}
});
},{}],"/home/privatesky/modules/pskdb/lib/domain/Key.js":[function(require,module,exports){

$$.asset.describe("key", {
    public:{
        alias:"string"
    },
    init:function(alias, value){
        this.alias = alias;
        this.value = value;
    },
    update:function(value){
        this.value = value;
    }
});
},{}],"/home/privatesky/modules/pskdb/lib/domain/index.js":[function(require,module,exports){
module.exports = $$.library(function(){
    require("./DomainReference");
    require("./CSBReference");
    require("./Agent");
    require("./Backup");
    require("./ACLScope");
    require("./Key");
    require("./transactions");
    require("./FileReference");
    require("./EmbeddedFile");
    require('./CSBMeta');
});
},{"./ACLScope":"/home/privatesky/modules/pskdb/lib/domain/ACLScope.js","./Agent":"/home/privatesky/modules/pskdb/lib/domain/Agent.js","./Backup":"/home/privatesky/modules/pskdb/lib/domain/Backup.js","./CSBMeta":"/home/privatesky/modules/pskdb/lib/domain/CSBMeta.js","./CSBReference":"/home/privatesky/modules/pskdb/lib/domain/CSBReference.js","./DomainReference":"/home/privatesky/modules/pskdb/lib/domain/DomainReference.js","./EmbeddedFile":"/home/privatesky/modules/pskdb/lib/domain/EmbeddedFile.js","./FileReference":"/home/privatesky/modules/pskdb/lib/domain/FileReference.js","./Key":"/home/privatesky/modules/pskdb/lib/domain/Key.js","./transactions":"/home/privatesky/modules/pskdb/lib/domain/transactions.js"}],"/home/privatesky/modules/pskdb/lib/domain/transactions.js":[function(require,module,exports){
$$.transaction.describe("transactions", {
    updateKey: function (key, value) {
        var transaction = $$.blockchain.beginTransaction(this);
        var key = transaction.lookup("Key", key);
        var keyPermissions = transaction.lookup("ACLScope", "KeysConcern");
        if (keyPermissions.allow(this.agentId, key)) {
            key.update(value);
            transaction.add(key);
            $$.blockchain.commit(transaction);
        } else {
            this.securityError("Agent " + this.agentId + " denied to change key " + key);
        }
    },
    addChild: function (alias) {
        var transaction = $$.blockchain.beginTransaction();
        var reference = $$.contract.start("DomainReference", "init", "child", alias);
        transaction.add(reference);
        $$.blockchain.commit(transaction);
    },
    addParent: function (value) {
        var reference = $$.contract.start("DomainReference", "init", "child", alias);
        this.transaction.save(reference);
        $$.blockchain.persist(this.transaction);
    },
    addAgent: function (alias, publicKey) {
        var reference = $$.contract.start("Agent", "init", alias, publicKey);
        this.transaction.save(reference);
        $$.blockchain.persist(this.transaction);
    },
    updateAgent: function (alias, publicKey) {
        var agent = this.transaction.lookup("Agent", alias);
        agent.update(publicKey);
        this.transaction.save(reference);
        $$.blockchain.persist(this.transaction);
    }
});


$$.newTransaction = function(transactionFlow,ctor,...args){
    var transaction = $$.swarm.start( transactionFlow);
    transaction.meta("agentId", $$.currentAgentId);
    transaction.meta("command", "runEveryWhere");
    transaction.meta("ctor", ctor);
    transaction.meta("args", args);
    transaction.sign();
    //$$.blockchain.sendForConsent(transaction);
    //temporary until consent layer is activated
    transaction[ctor].apply(transaction,args);
};

/*
usages:
    $$.newTransaction("domain.transactions", "updateKey", "key", "value")

 */

},{}],"/home/privatesky/modules/pskdb/lib/swarms/agentsSwarm.js":[function(require,module,exports){
// const sharedPhases = require('./sharedPhases');
// const beesHealer = require('swarmutils').beesHealer;

$$.swarms.describe("agents", {
    add: function (alias, publicKey) {
        const transaction = $$.blockchain.beginTransaction({});
        const agentAsset = transaction.lookup('global.Agent', alias);

        agentAsset.init(alias, publicKey);
        try {
            transaction.add(agentAsset);

            $$.blockchain.commit(transaction);
        } catch (err) {
            this.return(new Error("Agent already exists"));
            return;
        }

        this.return(null, alias);
    },
});

},{}],"/home/privatesky/modules/pskdb/lib/swarms/domainSwarms.js":[function(require,module,exports){
const sharedPhases = require('./sharedPhases');
const beesHealer = require('swarmutils').beesHealer;

$$.swarms.describe("domains", {
    add: function (role, alias) {
        const transaction = $$.blockchain.beginTransaction({});
        const domainsSwarm = transaction.lookup('global.DomainReference', alias);

        if (!domainsSwarm) {
            this.return(new Error('Could not find swarm named "global.DomainReference"'));
            return;
        }

        domainsSwarm.init(role, alias);
        try{
            transaction.add(domainsSwarm);

            $$.blockchain.commit(transaction);
        }catch(err){
            this.return(new Error("Domain allready exists!"));
            return;
        }

        this.return(null, alias);
    },
    getDomainDetails:function(alias){
        const transaction = $$.blockchain.beginTransaction({});
        const domain = transaction.lookup('global.DomainReference', alias);

        if (!domain) {
            this.return(new Error('Could not find swarm named "global.DomainReference"'));
            return;
        }

        this.return(null, beesHealer.asJSON(domain).publicVars);
    },
    connectDomainToRemote(domainName, alias, remoteEndPoint){
        const transaction = $$.blockchain.beginTransaction({});
        const domain = transaction.lookup('global.DomainReference', domainName);

        if (!domain) {
            this.return(new Error('Could not find swarm named "global.DomainReference"'));
            return;
        }

        domain.addRemoteInterface(alias, remoteEndPoint);

        try{
            transaction.add(domain);

            $$.blockchain.commit(transaction);
        }catch(err){
            console.log(err);
            this.return(new Error("Domain update failed!"));
            return;
        }

        this.return(null, alias);
    },
    // getDomainDetails: sharedPhases.getAssetFactory('global.DomainReference'),
    getDomains: sharedPhases.getAllAssetsFactory('global.DomainReference')
});

},{"./sharedPhases":"/home/privatesky/modules/pskdb/lib/swarms/sharedPhases.js","swarmutils":false}],"/home/privatesky/modules/pskdb/lib/swarms/index.js":[function(require,module,exports){
require('./domainSwarms');
require('./agentsSwarm');
},{"./agentsSwarm":"/home/privatesky/modules/pskdb/lib/swarms/agentsSwarm.js","./domainSwarms":"/home/privatesky/modules/pskdb/lib/swarms/domainSwarms.js"}],"/home/privatesky/modules/pskdb/lib/swarms/sharedPhases.js":[function(require,module,exports){
const beesHealer = require("swarmutils").beesHealer;

module.exports = {
    getAssetFactory: function(assetType) {
        return function(alias) {
            const transaction = $$.blockchain.beginTransaction({});
            const domainReferenceSwarm = transaction.lookup(assetType, alias);

            if(!domainReferenceSwarm) {
                this.return(new Error(`Could not find swarm named "${assetType}"`));
                return;
            }

            this.return(undefined, beesHealer.asJSON(domainReferenceSwarm));
        };
    },
    getAllAssetsFactory: function(assetType) {
        return function() {
            const transaction = $$.blockchain.beginTransaction({});
            const domains = transaction.loadAssets(assetType) || [];

            this.return(undefined, domains.map((domain) => beesHealer.asJSON(domain)));
        };
    }
};
},{"swarmutils":false}],"/home/privatesky/modules/pskwallet/libraries/BackupEngine.js":[function(require,module,exports){
arguments[4]["/home/privatesky/modules/csb/lib/BackupEngine.js"][0].apply(exports,arguments)
},{"../utils/AsyncDispatcher":"/home/privatesky/modules/pskwallet/utils/AsyncDispatcher.js","./backupResolvers/EVFSResolver":"/home/privatesky/modules/pskwallet/libraries/backupResolvers/EVFSResolver.js"}],"/home/privatesky/modules/pskwallet/libraries/CSBCache.js":[function(require,module,exports){
 function CSBCache(maxSize) {

     let cache = {};
    let size = 0;
    const clearingRatio = 0.5;


    this.load = function (uid) {
        // if (cache[uid]) {
        //     cache[uid].count += 1;
        //     return cache[uid].instance;
        // }

        return undefined;
    };

    this.put = function (uid, obj) {
        if (size > maxSize) {
            clear();
        } else {
            size++;
            cache[uid] = {
                instance: obj,
                count: 0
            };
        }

    };

    //-------------------------internal methods---------------------------------------

    function clear() {
        size = maxSize - Math.round(clearingRatio * maxSize);

        const entries = Object.entries(cache);
        cache = entries
            .sort((arr1, arr2) => arr2[1].count - arr1[1].count)
            .slice(0, size)
            .reduce((obj, [ k, v ]) => {
                obj[k] = v;
                return obj;
            }, {});
    }
}

module.exports = CSBCache;

},{}],"/home/privatesky/modules/pskwallet/libraries/CSBIdentifier.js":[function(require,module,exports){
(function (Buffer){
const crypto = require("pskcrypto");


function CSBIdentifier(id, backupUrls, keyLen = 32) {
    let seed;
    let dseed;
    let uid;
    let encSeed;
    // let encDseed;

    init();

    this.getSeed = function () {
        if(!seed){
            throw new Error("Cannot return seed. Access is denied.");
        }

        return generateCompactForm(seed);
    };

    this.getDseed = function () {
        if(dseed){
            return generateCompactForm(dseed);
        }

        if(seed){
            dseed = deriveSeed(seed);
            return generateCompactForm(dseed);
        }

        throw new Error("Cannot return derived seed. Access is denied.");
    };

    this.getUid = function () {
        if(uid){
            return generateCompactForm(uid).toString();
        }

        if(dseed){
            uid = computeUid(dseed);
            return generateCompactForm(uid).toString();
        }

        if(seed){
            dseed = deriveSeed(seed);
            uid = computeUid(dseed);
            return generateCompactForm(uid).toString();
        }

        throw new Error("Cannot return uid");
    };

    this.getEncSeed = function (encryptionKey) {
        if(encSeed){
            return generateCompactForm(encSeed);
        }

        if(!seed){
            throw new Error("Cannot return encSeed. Access is denied");
        }

        if (!encryptionKey) {
            throw new Error("Cannot return encSeed. No encryption key was provided");
        }

        //TODO: encrypt seed using encryptionKey. Encryption algorithm remains to be chosen
    };



    this.getBackupUrls = function () {
        if(seed){
            return seed.backup;
        }

        if(dseed){
            return dseed.backup;
        }

        throw new Error("Backup URLs could not be retrieved. Access is denied");
    };

    //------------------------------ internal methods ------------------------------
    function init() {
        if (!id) {
            if (!backupUrls) {
                throw new Error("No backups provided.");
            }

            seed = create();
        }else{
            classifyId();
        }
    }

    function classifyId() {
        if (typeof id !== "string" && !Buffer.isBuffer(id) && !(typeof id === "object" && !Buffer.isBuffer(id))) {
            throw new Error(`Id must be a string or a buffer. The type provided was ${typeof id}`);
        }

        const expandedId = load(id);
        switch(expandedId.tag){
            case 's':
                seed = expandedId;
                break;
            case 'd':
                dseed = expandedId;
                break;
            case 'u':
                uid = expandedId;
                break;
            case 'es':
                encSeed = expandedId;
                break;
            case 'ed':
                encDseed = expandedId;
                break;
            default:
                throw new Error('Invalid tag');
        }
    }



    function create() {
        const localSeed = {};
        if (!Array.isArray(backupUrls)) {
            backupUrls = [ backupUrls ];
        }

        localSeed.tag    = 's';
        localSeed.random = crypto.randomBytes(keyLen);
        localSeed.backup = backupUrls;

        return localSeed;
    }

    function deriveSeed(seed) {
        let compactSeed = seed;

        if (typeof seed === 'object' && !Buffer.isBuffer(seed)) {
            compactSeed = generateCompactForm(seed);
        }

        if (Buffer.isBuffer(seed)) {
            compactSeed = seed.toString();
        }

        if (compactSeed[0] === 'd') {
            throw new Error('Tried to derive an already derived seed.');
        }

        const decodedCompactSeed = decodeURIComponent(compactSeed);
        const splitCompactSeed = decodedCompactSeed.substring(1).split('|');

        const strSeed = Buffer.from(splitCompactSeed[0], 'base64').toString('hex');
        const backupUrls = Buffer.from(splitCompactSeed[1], 'base64').toString();
        const dseed = {};

        dseed.tag = 'd';
        dseed.random = crypto.deriveKey(strSeed, null, keyLen);
        dseed.backup = JSON.parse(backupUrls);

        return dseed;
    }

    function computeUid(dseed){
        if(!dseed){
            throw new Error("Dseed was not provided");
        }

        if (typeof dseed === "object" && !Buffer.isBuffer(dseed)) {
            dseed = generateCompactForm(dseed);
        }

        const uid = {};
        uid.tag = 'u';
        uid.random = Buffer.from(crypto.generateSafeUid(dseed));

        return uid;
    }

    function generateCompactForm({tag, random, backup}) {
        let compactId = tag + random.toString('base64');
        if (backup) {
            compactId += '|' + Buffer.from(JSON.stringify(backup)).toString('base64');
        }
        return Buffer.from(encodeURIComponent(compactId));
    }

    function encrypt(id, encryptionKey) {
        if(arguments.length !== 2){
            throw new Error(`Wrong number of arguments. Expected: 2; provided ${arguments.length}`);
        }

        let tag;
        if (typeof id === "object" && !Buffer.isBuffer(id)) {
            tag = id.tag;
            id = generateCompactForm(id);
        }

        if (tag === 's') {
            //TODO encrypt seed
        }else if (tag === 'd') {
            //TODO encrypt dseed
        }else{
            throw new Error("The provided id cannot be encrypted");
        }

    }

    function load(compactId) {
        if(typeof compactId === "undefined") {
            throw new Error(`Expected type string or Buffer. Received undefined`);
        }

        if(typeof compactId !== "string"){
            if (typeof compactId === "object" && !Buffer.isBuffer(compactId)) {
                compactId = Buffer.from(compactId);
            }

            compactId = compactId.toString();
        }

        const decodedCompactId = decodeURIComponent(compactId);
        const id = {};
        const splitCompactId = decodedCompactId.substring(1).split('|');

        id.tag = decodedCompactId[0];
        id.random = Buffer.from(splitCompactId[0], 'base64');

        if(splitCompactId[1] && splitCompactId[1].length > 0){
            id.backup = JSON.parse(Buffer.from(splitCompactId[1], 'base64').toString());
        }

        return id;
    }
}

module.exports = CSBIdentifier;

}).call(this,require("buffer").Buffer)

},{"buffer":false,"pskcrypto":false}],"/home/privatesky/modules/pskwallet/libraries/RawCSB.js":[function(require,module,exports){
const OwM = require('swarmutils').OwM;
const pskdb = require('pskdb');

function RawCSB(initData) {
	const data = new OwM({blockchain: initData});
	const blockchain = pskdb.startDb({getInitValues, persist});

	if(!data.blockchain) {
		data.blockchain = {
			transactionLog : '',
			embeddedFiles: {}
		};
	}

	data.embedFile = function (fileAlias, fileData) {
		const embeddedAsset = data.getAsset("global.EmbeddedFile", fileAlias);
		if(embeddedAsset.isPersisted()){
			console.log(`File with alias ${fileAlias} already exists`);
			return;
		}

		data.blockchain.embeddedFiles[fileAlias] = fileData;
		data.saveAsset(embeddedAsset);
	};

	data.attachFile = function (fileAlias, path, seed) {
		data.modifyAsset("global.FileReference", fileAlias, (file) => {
			if (!file.isEmpty()) {
				console.log(`File with alias ${fileAlias} already exists`);
				return;
			}

			file.init(fileAlias, path, seed);
		});
	};

	data.saveAsset = function(asset) {
		const transaction = blockchain.beginTransaction({});
		transaction.add(asset);
		blockchain.commit(transaction);
	};

	data.modifyAsset = function(assetType, aid, assetModifier) {
		const transaction = blockchain.beginTransaction({});
		const asset = transaction.lookup(assetType, aid);
		assetModifier(asset);

		transaction.add(asset);
		blockchain.commit(transaction);
	};

	data.getAsset = function (assetType, aid) {
		const transaction = blockchain.beginTransaction({});
		return transaction.lookup(assetType, aid);
	};

	data.getAllAssets = function(assetType) {
		const transaction = blockchain.beginTransaction({});
		return transaction.loadAssets(assetType);
	};

	/* internal functions */

	function persist(transactionLog, currentValues, currentPulse) {
		transactionLog.currentPulse = currentPulse;

		data.blockchain.currentValues = currentValues;
		data.blockchain.transactionLog += mkSingleLine(JSON.stringify(transactionLog)) + "\n";
	}

	function getInitValues () {
		if(!data.blockchain || !data.blockchain.currentValues) {
			return null;
		}
		return data.blockchain.currentValues;
	}

	function mkSingleLine(str) {
		return str.replace(/\n|\r/g, "");
	}

	return data;
}

module.exports = RawCSB;
},{"pskdb":"pskdb","swarmutils":false}],"/home/privatesky/modules/pskwallet/libraries/RootCSB.js":[function(require,module,exports){
const RawCSB = require('./RawCSB');
const fs = require('fs');
const crypto = require('pskcrypto');
const utils = require('../utils/utils');
const DseedCage = require('../utils/DseedCage');
const HashCage = require('../utils/HashCage');
const CSBCache = require("./CSBCache");
const CSBIdentifier = require("./CSBIdentifier");
const EventEmitter = require('events');

const rawCSBCache = new CSBCache(10);
const instances = {};

/**
 *
 * @param localFolder   - required
 * @param currentRawCSB - optional
 * @param csbIdentifier - required
 * @constructor
 */
function RootCSB(localFolder, currentRawCSB, csbIdentifier) {
    if (!localFolder || !csbIdentifier) {
        throw new Error('Missing required parameters');
    }


    const hashCage = new HashCage(localFolder);
    const event = new EventEmitter();
    this.on = event.on;
    this.off = event.removeListener;
    this.removeAllListeners = event.removeAllListeners;
    this.emit = event.emit;

    this.getMidRoot = function (CSBPath, callback) {
        throw new Error('Not implemented');
    };

    this.loadRawCSB = function (CSBPath, callback) {
        if (!currentRawCSB) {
            __loadRawCSB(csbIdentifier, (err, rawCSB) => {
                if (err) {
                    return callback(err);
                }

                currentRawCSB = rawCSB;

                if (CSBPath || CSBPath !== '') {
                    this.loadRawCSB(CSBPath, callback);
                    return;
                }

                callback(undefined, currentRawCSB);
            });
            return;
        }
        if (!CSBPath || CSBPath === '') {
            return callback(null, currentRawCSB);
        }

        this.loadAssetFromPath(CSBPath, (err, asset, rawCSB) => {

            if (err) {
                return callback(err);
            }

            if (!asset || !asset.dseed) {
                return callback(new Error(`The CSBPath ${CSBPath} is invalid.`));
            }

            __loadRawCSB(new CSBIdentifier(asset.dseed), callback);
        });
    };

    this.saveRawCSB = function (rawCSB, CSBPath, callback) {
        // save master
        if (!CSBPath || CSBPath === '') {
            if (rawCSB) {
                currentRawCSB = rawCSB;
            }

            __initializeAssets(currentRawCSB);
            return __writeRawCSB(currentRawCSB, csbIdentifier, callback);
        }

        // save csb in hierarchy
        const splitPath = __splitPath(CSBPath);
        this.loadAssetFromPath(CSBPath, (err, csbReference) => {
            if (err) {
                return callback(err);
            }
            if (!csbReference.dseed) {
                const backups = csbIdentifier.getBackupUrls();
                const newCSBIdentifier = new CSBIdentifier(undefined, backups);
                const localSeed = newCSBIdentifier.getSeed();
                const localDseed = newCSBIdentifier.getDseed();
                csbReference.init(splitPath.assetAid, localSeed, localDseed);

                this.saveAssetToPath(CSBPath, csbReference, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    this.loadAssetFromPath(CSBPath, (err, csbRef) => {
                        if (err) {
                            return callback(err);
                        }

                        __initializeAssets(rawCSB, csbRef, backups);
                        __writeRawCSB(rawCSB, new CSBIdentifier(csbReference.dseed), (err) => {
                            if (err) {
                                return callback(err);
                            }

                            this.emit('end');
                            callback();
                        });
                    });
                });
            } else {
                __writeRawCSB(rawCSB, new CSBIdentifier(csbReference.dseed), callback);
            }
        });
    };

    this.saveAssetToPath = function (CSBPath, asset, callback) {
        const splitPath = __splitPath(CSBPath, {keepAliasesAsString: true});
        this.loadRawCSB(splitPath.CSBAliases, (err, rawCSB) => {
            if (err) {
                return callback(err);
            }
            try {
                rawCSB.saveAsset(asset);
                this.saveRawCSB(rawCSB, splitPath.CSBAliases, callback);
            } catch (e) {
                return callback(e);
            }
        });
    };

    this.loadAssetFromPath = function (CSBPath, callback) {
        const processedPath = __splitPath(CSBPath);
        if (!currentRawCSB) {
            return callback(new Error('currentRawCSB does not exist'));
        }

        let CSBReference = null;
        if (processedPath.CSBAliases.length > 0) {
            const nextAlias = processedPath.CSBAliases[0];
            CSBReference = currentRawCSB.getAsset('global.CSBReference', nextAlias);
        } else {
            if (!processedPath.assetType || !processedPath.assetAid) {
                return callback(new Error('Not asset type or id specified in CSBPath'));
            }

            CSBReference = currentRawCSB.getAsset(processedPath.assetType, processedPath.assetAid);
        }

        if (processedPath.CSBAliases.length === 0) {
            return callback(null, CSBReference, currentRawCSB);
        }

        processedPath.CSBAliases.shift();

        if(!CSBReference || !CSBReference.dseed){
            return callback(new Error(`The CSBPath ${CSBPath} is invalid`));
        }
        __loadAssetFromPath(processedPath, new CSBIdentifier(CSBReference.dseed), 0, callback);
    };


    /* ------------------- INTERNAL METHODS ------------------- */

    function __loadRawCSB(localCSBIdentifier, callback) {
        const uid = localCSBIdentifier.getUid();
        const cachedRawCSB = rawCSBCache.load(uid);

        if (cachedRawCSB) {
            return callback(null, cachedRawCSB);
        }

        const rootPath = utils.generatePath(localFolder, localCSBIdentifier);
        fs.readFile(rootPath, (err, encryptedCsb) => {
            if (err) {
                return callback(err);
            }

            crypto.decryptObject(encryptedCsb, localCSBIdentifier.getDseed(), (err, csbData) => {
                if (err) {
                    return callback(err);
                }
                const csb = new RawCSB(csbData);
                rawCSBCache.put(uid, csb);
                callback(null, csb);
            });
        });
    }

    /**
     *
     * @param CSBPath: string - internal path that looks like /{CSBName1}/{CSBName2}:{assetType}:{assetAliasOrId}
     * @param options:object
     * @returns {{CSBAliases: [string], assetAid: (*|undefined), assetType: (*|undefined)}}
     * @private
     */
    function __splitPath(CSBPath, options = {}) {
        const pathSeparator = '/';

        if (CSBPath.startsWith(pathSeparator)) {
            CSBPath = CSBPath.substring(1);
        }

        let CSBAliases = CSBPath.split(pathSeparator);
        if (CSBAliases.length < 1) {
            throw new Error('CSBPath too short');
        }

        const lastIndex = CSBAliases.length - 1;
        const optionalAssetSelector = CSBAliases[lastIndex].split(':');

        if (optionalAssetSelector[0] === '') {
            CSBAliases = [];
        } else {
            CSBAliases[lastIndex] = optionalAssetSelector[0];
        }

        if (!optionalAssetSelector[1] && !optionalAssetSelector[2]) {
            optionalAssetSelector[1] = 'global.CSBReference';
            optionalAssetSelector[2] = CSBAliases[lastIndex];
            CSBAliases.pop();
        }

        if (options.keepAliasesAsString === true) {
            CSBAliases = CSBAliases.join('/');
        }
        return {
            CSBAliases: CSBAliases,
            assetType: optionalAssetSelector[1],
            assetAid: optionalAssetSelector[2]
        };
    }

    function __loadAssetFromPath(processedPath, localCSBIdentifier, currentIndex, callback) {
        __loadRawCSB(localCSBIdentifier, (err, rawCSB) => {
            if (err) {
                return callback(err);
            }

            if (currentIndex < processedPath.CSBAliases.length) {
                const nextAlias = processedPath.CSBAliases[currentIndex];
                const asset = rawCSB.getAsset("global.CSBReference", nextAlias);
                const newCSBIdentifier = new CSBIdentifier(asset.dseed);

                __loadAssetFromPath(processedPath, newCSBIdentifier, ++currentIndex, callback);
                return;
            }

            const asset = rawCSB.getAsset(processedPath.assetType, processedPath.assetAid);
            callback(null, asset, rawCSB);

        });

    }

    function __writeRawCSB(rawCSB, localCSBIdentifier, callback) {
        crypto.encryptObject(rawCSB.blockchain, localCSBIdentifier.getDseed(), null, (err, encryptedBlockchain) => {
            if (err) {
                return callback(err);
            }

            hashCage.loadHash((err, hashObj) => {
                if (err) {
                    return callback(err);
                }

                const key = localCSBIdentifier.getUid();
                hashObj[key] = crypto.pskHash(encryptedBlockchain).toString('hex');

                hashCage.saveHash(hashObj, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    fs.writeFile(utils.generatePath(localFolder, localCSBIdentifier), encryptedBlockchain, callback);
                });
            });
        });
    }

    function __initializeAssets(rawCSB, csbRef, backupUrls) {

        let isMaster;

        const csbMeta = rawCSB.getAsset('global.CSBMeta', 'meta');
        if (currentRawCSB === rawCSB) {
            isMaster = typeof csbMeta.isMaster === 'undefined' ? true : csbMeta.isMaster;
            if (!csbMeta.id) {
                csbMeta.init($$.uidGenerator.safe_uuid());
                csbMeta.setIsMaster(isMaster);
                rawCSB.saveAsset(csbMeta);
            }
        } else {
            backupUrls.forEach((url) => {
                const uid = $$.uidGenerator.safe_uuid();
                const backup = rawCSB.getAsset('global.Backup', uid);
                backup.init(uid, url);
                rawCSB.saveAsset(backup);
            });

            isMaster = typeof csbMeta.isMaster === 'undefined' ? false : csbMeta.isMaster;
            csbMeta.init(csbRef.getMetadata('swarmId'));
            csbMeta.setIsMaster(isMaster);
            rawCSB.saveAsset(csbMeta);
        }
    }
}


function createRootCSB(localFolder, masterRawCSB, csbIdentifier, pin, callback) {
    let masterDseed;

    if (csbIdentifier) {
        masterDseed = csbIdentifier.getDseed();
        if (masterRawCSB) {
            const rootCSB = new RootCSB(localFolder, masterRawCSB, masterDseed);
            return callback(null, rootCSB);
        }

        return loadWithIdentifier(localFolder, masterDseed, callback);
    } else if (pin) {

        return loadWithPin(localFolder, pin, callback);
    } else {
        return callback(new Error('Missing seed, dseed and pin, at least one is required'));
    }
}

function loadWithPin(localFolder, pin, callback) {
    new DseedCage(localFolder).loadDseedBackups(pin, (err, csbIdentifier, backups) => {
        if (err) {
            return callback(err);
        }

        if (!csbIdentifier && (!backups || backups.length === 0)) {
            return callback();
        }

        if (!csbIdentifier) {
            return callback(undefined, undefined, undefined, backups);
        }

        const dseed = csbIdentifier.getDseed();
        const key = crypto.generateSafeUid(dseed, localFolder);
        if (!instances[key]) {
            instances[key] = new RootCSB(localFolder, null, csbIdentifier);
        }

        const rootCSB = instances[key];

        rootCSB.loadRawCSB('', (err) => {
            if (err) {
                return callback(err);
            }
            callback(undefined, rootCSB, csbIdentifier, backups);
        });
    });
}

function loadWithIdentifier(localFolder, csbIdentifier, callback) {
    const masterDseed = csbIdentifier.getDseed();
    const key = crypto.generateSafeUid(masterDseed, localFolder);
    if (!instances[key]) {
        instances[key] = new RootCSB(localFolder, null, csbIdentifier);
    }

    const rootCSB = instances[key];
    rootCSB.loadRawCSB('', (err) => {
        if (err) {
            return callback(err);
        }
        callback(null, rootCSB);
    });
}

function createNew(localFolder, csbIdentifier, rawCSB) {
    if (!localFolder || !csbIdentifier) {
        throw new Error("Missing required arguments");
    }

    rawCSB = rawCSB || new RawCSB();
    const masterDseed = csbIdentifier.getDseed();
    const key = crypto.generateSafeUid(masterDseed, localFolder);
    if (!instances[key]) {
        instances[key] = new RootCSB(localFolder, rawCSB, csbIdentifier);
    }

    return instances[key];
}

function writeNewMasterCSB(localFolder, csbIdentifier, callback) {
    if (!localFolder || !csbIdentifier) {
        return callback(new Error('Missing required arguments'));
    }

    const masterDseed = csbIdentifier.getDseed();
    const key = crypto.generateSafeUid(masterDseed, localFolder);
    if (!instances[key]) {
        instances[key] = new RootCSB(localFolder, null, csbIdentifier);
    }

    const rootCSB = instances[key];
    rootCSB.saveRawCSB(new RawCSB(), '', callback);
}

module.exports = {
    createNew,
    createRootCSB,
    loadWithIdentifier,
    loadWithPin,
    writeNewMasterCSB
};
},{"../utils/DseedCage":"/home/privatesky/modules/pskwallet/utils/DseedCage.js","../utils/HashCage":"/home/privatesky/modules/pskwallet/utils/HashCage.js","../utils/utils":"/home/privatesky/modules/pskwallet/utils/utils.js","./CSBCache":"/home/privatesky/modules/pskwallet/libraries/CSBCache.js","./CSBIdentifier":"/home/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","./RawCSB":"/home/privatesky/modules/pskwallet/libraries/RawCSB.js","events":false,"fs":false,"pskcrypto":false}],"/home/privatesky/modules/pskwallet/libraries/backupResolvers/EVFSResolver.js":[function(require,module,exports){
arguments[4]["/home/privatesky/modules/csb/lib/backupResolvers/EVFSResolver.js"][0].apply(exports,arguments)
},{}],"/home/privatesky/modules/pskwallet/libraries/flows/addBackup.js":[function(require,module,exports){
const flowsUtils = require("../../utils/flowsUtils");
const validator = require("../../utils/validator");
const DseedCage = require("../../utils/DseedCage");
const fs = require('fs');
const path = require('path');

$$.swarm.describe("addBackup", {
    start: function (backupUrl, localFolder = process.cwd()) {
        if(!backupUrl){
            return this.swarm("interaction", "handleError", new Error("No backup url provided"));
        }

        this.localFolder = localFolder;
        this.backupUrl = backupUrl;
        fs.stat(path.join(this.localFolder, ".privateSky", 'dseed'), (err, stats)=>{
            if(err){
                this.swarm("interaction", "createPin", flowsUtils.defaultPin, flowsUtils.noTries);
            }else{
                this.swarm("interaction", "readPin", flowsUtils.noTries);
            }
        });
    },

    validatePin: function (pin) {
        validator.validatePin(this.localFolder, this, "addBackup", pin, flowsUtils.noTries);
    },

    addBackup: function (pin = flowsUtils.defaultPin, backups) {
        backups = backups || [];
        backups.push(this.backupUrl);
        const dseedCage = new DseedCage(this.localFolder);
        dseedCage.saveDseedBackups(pin, this.csbIdentifier, backups, validator.reportOrContinue(this, 'finish', "Failed to save backups"));
    },

    finish: function () {
        this.swarm("interaction", 'printInfo', this.backupUrl + ' has been successfully added to backups list.');
    }
});
},{"../../utils/DseedCage":"/home/privatesky/modules/pskwallet/utils/DseedCage.js","../../utils/flowsUtils":"/home/privatesky/modules/pskwallet/utils/flowsUtils.js","../../utils/validator":"/home/privatesky/modules/pskwallet/utils/validator.js","fs":false,"path":false}],"/home/privatesky/modules/pskwallet/libraries/flows/addCsb.js":[function(require,module,exports){
// var path = require("path");

const utils = require("./../../utils/flowsUtils");
// const crypto = require("pskcrypto");
// var fs = require("fs");

$$.swarm.describe("addCsb", {
	start: function (aliasCsb, aliasDestCsb) {
		this.aliasCsb = aliasCsb;
		this.aliasDestCsb = aliasDestCsb;
		this.swarm("interaction", "readPin", 3);
	},
	validatePin: function (pin, noTries) {
		var self = this;
		utils.checkPinIsValid(pin, function (err) {
			if(err){
				self.swarm("interaction", "readPin", noTries-1);
			}else {
				self.addCsb(pin, self.aliasCsb);
			}
		});
	},
	addCsb: function (pin, aliasCSb, aliasDestCsb, callback) {
		var self = this;
		utils.getCsb(pin, aliasCSb, function (err, parentCsb) {
			if(err){
				self.swarm("interaction", "handleError", err, "Failed to get csb");
			}
		});
	}
});
},{"./../../utils/flowsUtils":"/home/privatesky/modules/pskwallet/utils/flowsUtils.js"}],"/home/privatesky/modules/pskwallet/libraries/flows/attachFile.js":[function(require,module,exports){
const flowsUtils = require("./../../utils/flowsUtils");
const utils = require("./../../utils/utils");
const crypto = require("pskcrypto");
const fs = require("fs");
const path = require('path');
const validator = require("../../utils/validator");
const CSBIdentifier = require("../CSBIdentifier");
const HashCage = require('../../utils/HashCage');
const RootCSB = require("../RootCSB");

$$.swarm.describe("attachFile", { //url: CSB1/CSB2/aliasFile
    start: function (url, filePath, localFolder = process.cwd()) { //csb1:assetType:alias
        const {CSBPath, alias} = utils.processUrl(url, 'FileReference');
        this.CSBPath = CSBPath;
        this.alias = alias;
        this.filePath = filePath;
        this.localFolder = localFolder;
        this.swarm("interaction", "readPin", flowsUtils.noTries);
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, 'loadFileReference', pin, noTries);
    },

    withCSBIdentifier: function (id, url, filePath, localFolder = process.cwd()) {
        const {CSBPath, alias} = utils.processUrl(url, 'FileReference');
        this.CSBPath = CSBPath;
        this.alias = alias;
        this.filePath = filePath;
        this.localFolder = localFolder;
        this.csbIdentifier = new CSBIdentifier(id);
        RootCSB.loadWithIdentifier(this.localFolder, this.csbIdentifier, (err, rootCSB) => {
            if (err) {
                this.swarm("interaction", "handleError", err, "Failed to load rootCSB");
                return;
            }

            this.rootCSB = rootCSB;
            this.loadFileReference();

        });
    },

    loadFileReference: function () {
        this.rootCSB.loadRawCSB('', validator.reportOrContinue(this, 'loadAsset', 'Failed to load masterCSB.'));
    },

    loadAsset: function () {
        this.rootCSB.loadAssetFromPath(this.CSBPath, validator.reportOrContinue(this, 'saveFileToDisk', 'Failed to load asset'));
    },

    saveFileToDisk: function (fileReference) {
        if (fileReference.isPersisted()) {
            this.swarm("interaction", "handleError", new Error("File is persisted"), "A file with the same alias already exists ");
            return;
        }

        const csbIdentifier = new CSBIdentifier(undefined, this.csbIdentifier.getBackupUrls());
        this.fileID = utils.generatePath(this.localFolder, csbIdentifier);
        crypto.on('progress', (progress) => {
            this.swarm('interaction', 'reportProgress', progress);
        });
        crypto.encryptStream(this.filePath, this.fileID, csbIdentifier.getDseed(), validator.reportOrContinue(this, 'saveFileReference', "Failed at file encryption.", fileReference, csbIdentifier));

    },


    saveFileReference: function (fileReference, csbIdentifier) {
        crypto.removeAllListeners('progress');
        fileReference.init(this.alias, csbIdentifier.getSeed(), csbIdentifier.getDseed());
        this.rootCSB.saveAssetToPath(this.CSBPath, fileReference, validator.reportOrContinue(this, 'computeHash', "Failed to save file", this.fileID));
    },


    computeHash: function () {
        const fileStream = fs.createReadStream(this.fileID);
        crypto.pskHashStream(fileStream, validator.reportOrContinue(this, "loadHashObj", "Failed to compute hash"));
    },

    loadHashObj: function (digest) {
        this.hashCage = new HashCage(this.localFolder);
        this.hashCage.loadHash(validator.reportOrContinue(this, "addToHashObj", "Failed to load hashObj", digest));
    },

    addToHashObj: function (hashObj, digest) {
        hashObj[path.basename(this.fileID)] = digest.toString("hex");
        this.hashCage.saveHash(hashObj, validator.reportOrContinue(this, "printSuccess", "Failed to save hashObj"));
    },

    printSuccess: function () {
        this.swarm("interaction", "printInfo", this.filePath + " has been successfully added to " + this.CSBPath);
        this.swarm("interaction", "__return__");
    }
});

},{"../../utils/HashCage":"/home/privatesky/modules/pskwallet/utils/HashCage.js","../../utils/validator":"/home/privatesky/modules/pskwallet/utils/validator.js","../CSBIdentifier":"/home/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","../RootCSB":"/home/privatesky/modules/pskwallet/libraries/RootCSB.js","./../../utils/flowsUtils":"/home/privatesky/modules/pskwallet/utils/flowsUtils.js","./../../utils/utils":"/home/privatesky/modules/pskwallet/utils/utils.js","fs":false,"path":false,"pskcrypto":false}],"/home/privatesky/modules/pskwallet/libraries/flows/createCsb.js":[function(require,module,exports){
const flowsUtils = require('../../utils/flowsUtils');
const RootCSB = require("../RootCSB");
const RawCSB = require("../RawCSB");
const validator = require("../../utils/validator");
const DseedCage = require("../../utils/DseedCage");
const CSBIdentifier = require("../CSBIdentifier");

$$.swarm.describe("createCsb", {
    start: function (CSBPath, localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.CSBPath = CSBPath || '';
        validator.checkMasterCSBExists(localFolder, (err, status) => {
            if (err) {
                this.swarm("interaction", "createPin", flowsUtils.defaultPin);
            } else {
                this.swarm("interaction", "readPin", flowsUtils.noTries);
            }
        });
    },

    withoutPin: function (CSBPath, backups, localFolder = process.cwd(), seed, isMaster = false) {
        this.localFolder = localFolder;
        this.CSBPath = CSBPath;
        this.isMaster = isMaster;
        if (typeof backups === 'undefined' || backups.length === 0) {
            backups = [ flowsUtils.defaultBackup ];
        }

        validator.checkMasterCSBExists(localFolder, (err, status) => {
            if (err) {
                this.createMasterCSB(backups);
            } else {
                const csbIdentifier = new CSBIdentifier(seed);
                this.withCSBIdentifier(CSBPath, csbIdentifier);
            }
        });

    },

    withCSBIdentifier: function (CSBPath, csbIdentifier) {
        this.CSBPath = CSBPath;
        RootCSB.loadWithIdentifier(this.localFolder, csbIdentifier, validator.reportOrContinue(this, 'createCSB', 'Failed to load master with provided dseed'));
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, "createCSB", pin, noTries);
    },

    loadBackups: function (pin) {
        this.pin = pin;
        this.dseedCage = new DseedCage(this.localFolder);
        this.dseedCage.loadDseedBackups(this.pin, (err, csbIdentifier, backups) => {
            if (err) {
                this.createMasterCSB();
            } else {
                this.createMasterCSB(backups);
            }
        });
    },

    createMasterCSB: function (backups) {
        this.csbIdentifier = new CSBIdentifier(undefined, backups || flowsUtils.defaultBackup);

        this.swarm("interaction", "printSensitiveInfo", this.csbIdentifier.getSeed(), flowsUtils.defaultPin);

        const rawCSB = new RawCSB();
        const meta = rawCSB.getAsset('global.CSBMeta', 'meta');
        meta.init();
        meta.setIsMaster(true);
        if (typeof this.isMaster !== 'undefined') {
            meta.setIsMaster(this.isMaster);
        }
        rawCSB.saveAsset(meta);
        this.rootCSB = RootCSB.createNew(this.localFolder, this.csbIdentifier, rawCSB);
        const nextPhase = (this.CSBPath === '' || typeof this.CSBPath === 'undefined') ? 'saveRawCSB' : 'createCSB';
        if (this.pin) {
            this.dseedCage.saveDseedBackups(this.pin, this.csbIdentifier, backups, validator.reportOrContinue(this, nextPhase, "Failed to save dseed "));
        } else {
            this[nextPhase]();
        }
    },

    createCSB: function (rootCSB) {
        this.rootCSB = this.rootCSB || rootCSB;
        const rawCSB = new RawCSB();
        const meta = rawCSB.getAsset("global.CSBMeta", "meta");
        meta.init();
        meta.setIsMaster(false);
        rawCSB.saveAsset(meta);
        this.saveRawCSB(rawCSB);
    },

    saveRawCSB: function (rawCSB) {
        this.rootCSB.saveRawCSB(rawCSB, this.CSBPath, validator.reportOrContinue(this, "printSuccess", "Failed to save raw CSB"));

    },


    printSuccess: function () {
        let message = "Successfully saved CSB at path " + this.CSBPath;
        if (!this.CSBPath || this.CSBPath === '') {
            message = 'Successfully saved CSB root';
        }
        this.swarm("interaction", "printInfo", message);
        this.swarm('interaction', '__return__');
    }
});

},{"../../utils/DseedCage":"/home/privatesky/modules/pskwallet/utils/DseedCage.js","../../utils/flowsUtils":"/home/privatesky/modules/pskwallet/utils/flowsUtils.js","../../utils/validator":"/home/privatesky/modules/pskwallet/utils/validator.js","../CSBIdentifier":"/home/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","../RawCSB":"/home/privatesky/modules/pskwallet/libraries/RawCSB.js","../RootCSB":"/home/privatesky/modules/pskwallet/libraries/RootCSB.js"}],"/home/privatesky/modules/pskwallet/libraries/flows/extractFile.js":[function(require,module,exports){
const flowsUtils = require("./../../utils/flowsUtils");
const utils = require("./../../utils/utils");
const crypto = require("pskcrypto");
const validator = require("../../utils/validator");
const CSBIdentifier = require("../CSBIdentifier");

$$.swarm.describe("extractFile", {
	start: function (url, localFolder = process.cwd()) {
		this.localFolder = localFolder;
		const {CSBPath, alias} = utils.processUrl(url, 'global.FileReference');
		this.CSBPath = CSBPath;
		this.alias = alias;
		this.swarm("interaction", "readPin", flowsUtils.noTries);
	},

	validatePin: function (pin, noTries) {
		validator.validatePin(this.localFolder, this, "loadFileAsset", pin, noTries);
	},

	loadFileAsset: function () {
		this.rootCSB.loadAssetFromPath(this.CSBPath, validator.reportOrContinue(this, "decryptFile", "Failed to load file asset " + this.alias));
	},

	decryptFile: function (fileReference) {
		const csbIdentifier = new CSBIdentifier(fileReference.dseed);
		const filePath = utils.generatePath(this.localFolder, csbIdentifier);

		crypto.on('progress', (progress) => {
            this.swarm('interaction', 'reportProgress', progress);
        });

		crypto.decryptStream(filePath, this.localFolder, csbIdentifier.getDseed(), (err, fileNames) => {
			if(err){
				return this.swarm("interaction", "handleError", err, "Failed to decrypt file" + filePath);
			}

			this.swarm("interaction", "printInfo", this.alias + " was successfully extracted. ");
			this.swarm("interaction", "__return__", fileNames);
		});
	}
});
},{"../../utils/validator":"/home/privatesky/modules/pskwallet/utils/validator.js","../CSBIdentifier":"/home/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","./../../utils/flowsUtils":"/home/privatesky/modules/pskwallet/utils/flowsUtils.js","./../../utils/utils":"/home/privatesky/modules/pskwallet/utils/utils.js","pskcrypto":false}],"/home/privatesky/modules/pskwallet/libraries/flows/index.js":[function(require,module,exports){
arguments[4]["/home/privatesky/modules/csb/flows/index.js"][0].apply(exports,arguments)
},{"./addBackup":"/home/privatesky/modules/pskwallet/libraries/flows/addBackup.js","./addCsb":"/home/privatesky/modules/pskwallet/libraries/flows/addCsb.js","./attachFile":"/home/privatesky/modules/pskwallet/libraries/flows/attachFile.js","./createCsb":"/home/privatesky/modules/pskwallet/libraries/flows/createCsb.js","./extractFile":"/home/privatesky/modules/pskwallet/libraries/flows/extractFile.js","./listCSBs":"/home/privatesky/modules/pskwallet/libraries/flows/listCSBs.js","./receive":"/home/privatesky/modules/pskwallet/libraries/flows/receive.js","./resetPin":"/home/privatesky/modules/pskwallet/libraries/flows/resetPin.js","./restore":"/home/privatesky/modules/pskwallet/libraries/flows/restore.js","./saveBackup":"/home/privatesky/modules/pskwallet/libraries/flows/saveBackup.js","./setPin":"/home/privatesky/modules/pskwallet/libraries/flows/setPin.js","callflow":false}],"/home/privatesky/modules/pskwallet/libraries/flows/listCSBs.js":[function(require,module,exports){
const flowsUtils = require("./../../utils/flowsUtils");
const validator = require("../../utils/validator");
// const fs = require("fs");
const RootCSB = require("../RootCSB");
const CSBIdentifier = require("../CSBIdentifier");

$$.swarm.describe("listCSBs", {
    start: function (CSBPath, localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.CSBPath = CSBPath || '';
        validator.checkMasterCSBExists(localFolder, (err, status) => {
            if (err) {
                this.swarm("interaction", "noMasterCSBExists");
            } else {
                this.swarm("interaction", "readPin", flowsUtils.noTries);
            }
        });
    },

    withCSBIdentifier: function (id, CSBPath = '', localFolder = process.cwd()) {
        this.csbIdentifier = new CSBIdentifier(id);
        this.CSBPath = CSBPath;
        this.localFolder = localFolder;
        this.loadMasterRawCSB();
    },

    loadMasterRawCSB: function () {
        RootCSB.loadWithIdentifier(this.localFolder, this.csbIdentifier, validator.reportOrContinue(this, "loadRawCSB", "Failed to create RootCSB."));
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, 'loadRawCSB', pin, noTries);
    },

    loadRawCSB: function (rootCSB) {
        if(typeof this.rootCSB === "undefined" && rootCSB){
            this.rootCSB = rootCSB;
        }
        this.rootCSB.loadRawCSB(this.CSBPath, validator.reportOrContinue(this, 'getCSBs', 'Failed to load rawCSB'));
    },

    getCSBs: function (rawCSB) {
        const csbReferences = rawCSB.getAllAssets('global.CSBReference');
        const csbsAliases = csbReferences.map((ref) => ref.alias);

        const fileReferences = rawCSB.getAllAssets('global.FileReference');
        const filesAliases = fileReferences.map((ref) => ref.alias);

        this.swarm("interaction", "__return__", {
            csbs: csbsAliases,
            files: filesAliases
        });
    }

});

},{"../../utils/validator":"/home/privatesky/modules/pskwallet/utils/validator.js","../CSBIdentifier":"/home/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","../RootCSB":"/home/privatesky/modules/pskwallet/libraries/RootCSB.js","./../../utils/flowsUtils":"/home/privatesky/modules/pskwallet/utils/flowsUtils.js"}],"/home/privatesky/modules/pskwallet/libraries/flows/receive.js":[function(require,module,exports){
arguments[4]["/home/privatesky/modules/csb/flows/receive.js"][0].apply(exports,arguments)
},{}],"/home/privatesky/modules/pskwallet/libraries/flows/resetPin.js":[function(require,module,exports){
const utils = require("./../../utils/flowsUtils");
const RootCSB = require("../RootCSB");
const DseedCage = require("../../utils/DseedCage");
const CSBIdentifier = require("../CSBIdentifier");

$$.swarm.describe("resetPin", {
    start: function (localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.swarm("interaction", "readSeed", utils.noTries);
    },

    validateSeed: function (seed, noTries) {
        try{
            this.csbIdentifier = new CSBIdentifier(seed);
            RootCSB.loadWithIdentifier(this.localFolder, this.csbIdentifier, (err, rootCSB) => {
                if (err) {
                    this.swarm("interaction", "readSeed", noTries - 1);
                }else{
                    this.swarm("interaction", "insertPin", utils.noTries);
                }
            });
        } catch (e) {
            return this.swarm('interaction', 'handleError', new Error('Invalid seed'));
        }
    },

    actualizePin: function (pin) {
        const dseedCage = new DseedCage(this.localFolder);
        dseedCage.saveDseedBackups(pin, this.csbIdentifier, undefined, (err)=>{
            if(err){
                return this.swarm("interaction", "handleError", "Failed to save dseed.");
            }

            this.swarm("interaction", "printInfo", "The pin has been changed successfully.");
        });
    }
});

},{"../../utils/DseedCage":"/home/privatesky/modules/pskwallet/utils/DseedCage.js","../CSBIdentifier":"/home/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","../RootCSB":"/home/privatesky/modules/pskwallet/libraries/RootCSB.js","./../../utils/flowsUtils":"/home/privatesky/modules/pskwallet/utils/flowsUtils.js"}],"/home/privatesky/modules/pskwallet/libraries/flows/restore.js":[function(require,module,exports){
const path = require("path");
const flowsUtils = require("./../../utils/flowsUtils");
const utils = require("./../../utils/utils");
const crypto = require("pskcrypto");
const fs = require("fs");
const validator = require("../../utils/validator");
const DseedCage = require("../../utils/DseedCage");
const RootCSB = require('../RootCSB');
const CSBIdentifier = require('../CSBIdentifier');
const BackupEngine = require('../BackupEngine');
const HashCage = require('../../utils/HashCage');
const AsyncDispatcher = require('../../utils/AsyncDispatcher');


$$.swarm.describe("restore", {
    start: function (url, localFolder = process.cwd()) {
        this.localFolder = localFolder;
        if (url) {
            const {CSBPath, alias} = utils.processUrl(url, 'global.CSBReference');
            this.CSBPath = CSBPath;
            this.CSBAlias = alias;
        }

        this.swarm("interaction", "readSeed");
    },

    withSeed: function (url, localFolder = process.cwd(), seedRestore, localSeed) {
        this.localFolder = localFolder;
        if (url) {
            const {CSBPath, alias} = utils.processUrl(url, 'global.CSBReference');
            this.CSBPath = CSBPath;
            this.CSBAlias = alias;
        }

        if (localSeed) {
            this.localCSBIdentifier = new CSBIdentifier(localSeed);
        }

        this.restoreCSB(seedRestore);
    },

    restoreCSB: function (restoreSeed) {
        this.hashCage = new HashCage(this.localFolder);
        this.hashObj = {};
        this.csbRestoreIdentifier = new CSBIdentifier(restoreSeed);
        let backupUrls;
        try {
            backupUrls = this.csbRestoreIdentifier.getBackupUrls();
        } catch (e) {
            return this.swarm('interaction', 'handleError', new Error('Invalid seed'));
        }

        this.backupUrls = backupUrls;
        this.restoreDseedCage = new DseedCage(this.localFolder);
        const backupEngine = new BackupEngine.getBackupEngine(this.backupUrls);

        backupEngine.load(this.csbRestoreIdentifier, (err, encryptedCSB) => {
            if (err) {
                return this.swarm("interaction", "handleError", err, "Failed to restore CSB");
            }

            this.__addCSBHash(this.csbRestoreIdentifier, encryptedCSB);
            this.encryptedCSB = encryptedCSB;

            validator.checkMasterCSBExists(this.localFolder, (err, status) => {
                if (err) {
                    console.log(err);
                }
                if (status === false) {
                    this.createAuxFolder();
                } else if (this.localCSBIdentifier) {
                    if (!this.CSBAlias) {
                        utils.deleteRecursively(this.localFolder, true, (err) => {
                            if (err) {
                                console.log(err);
                            }
                            return this.swarm("interaction", "handleError", new Error("No CSB alias was specified"));
                        });
                    } else {
                        this.writeCSB();
                    }
                } else {
                    if (!this.CSBAlias) {
                        return this.swarm("interaction", "handleError", new Error("No CSB alias was specified"));
                    } else {
                        this.swarm("interaction", "readPin", flowsUtils.noTries);
                    }
                }
            });
        });
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, "writeCSB", pin, noTries);
    },

    createAuxFolder: function () {
        fs.mkdir(path.join(this.localFolder, ".privateSky"), {recursive: true}, validator.reportOrContinue(this, "writeCSB", "Failed to create folder .privateSky"));
    },


    writeCSB: function () {
        fs.writeFile(utils.generatePath(this.localFolder, this.csbRestoreIdentifier), this.encryptedCSB, validator.reportOrContinue(this, "createRootCSB", "Failed to write masterCSB to disk"));
    },

    createRootCSB: function () {
        RootCSB.loadWithIdentifier(this.localFolder, this.csbRestoreIdentifier, validator.reportOrContinue(this, "loadRawCSB", "Failed to create rootCSB with dseed"));
    },

    loadRawCSB: function (rootCSB) {

        this.asyncDispatcher = new AsyncDispatcher(( errs, succs) => {
            this.hashCage.saveHash(this.hashObj, (err) => {
                if (err) {
                    return this.swarm('interaction', 'handleError', err, 'Failed to save hashObj');
                }
                this.swarm('interaction', 'printInfo', 'All CSBs have been restored.');
                this.swarm('interaction', '__return__');

            });
        });
        rootCSB.loadRawCSB('', validator.reportOrContinue(this, "checkCSBStatus", "Failed to load RawCSB", rootCSB));
    },

    checkCSBStatus: function (rawCSB, rootCSB) {
        this.rawCSB = rawCSB;
        const meta = this.rawCSB.getAsset('global.CSBMeta', 'meta');
        if (this.rootCSB) {
            this.attachCSB(this.rootCSB, this.CSBPath, this.CSBAlias, this.csbRestoreIdentifier);
        } else {
            if (meta.isMaster) {
                this.rootCSB = rootCSB;
                this.saveDseed();
            } else {
                this.createMasterCSB();
            }
        }
    },

    saveDseed: function () {
        this.restoreDseedCage.saveDseedBackups(flowsUtils.defaultPin, this.csbRestoreIdentifier, undefined, validator.reportOrContinue(this, "collectFiles", "Failed to save dseed", this.rawCSB, this.csbRestoreIdentifier, '', 'master'));
    },


    createMasterCSB: function () {
        const csbIdentifier = new CSBIdentifier(undefined, this.backupUrls);
        this.swarm("interaction", "printSensitiveInfo", csbIdentifier.getSeed(), flowsUtils.defaultPin);
        this.rootCSB = RootCSB.createNew(this.localFolder, csbIdentifier);
        this.restoreDseedCage.saveDseedBackups(flowsUtils.defaultPin, csbIdentifier, undefined, validator.reportOrContinue(this, "attachCSB", "Failed to save master dseed ", this.rootCSB, this.CSBPath, this.CSBAlias, this.csbRestoreIdentifier));
    },


    attachCSB: function (rootCSB, CSBPath, CSBAlias, csbIdentifier) {
        this.__attachCSB(rootCSB, CSBPath, CSBAlias, csbIdentifier, validator.reportOrContinue(this, 'loadRestoredRawCSB', 'Failed to attach rawCSB'));

    },

    loadRestoredRawCSB: function () {
        this.CSBPath = this.CSBPath.split(':')[0] + '/' + this.CSBAlias;
        this.rootCSB.loadRawCSB(this.CSBPath, validator.reportOrContinue(this, "collectFiles", "Failed to load restored RawCSB", this.csbRestoreIdentifier, this.CSBPath, this.CSBAlias));
    },

    collectFiles: function (rawCSB, csbIdentifier, currentPath, alias, callback) {

        const listFiles = rawCSB.getAllAssets('global.FileReference');
        const asyncDispatcher = new AsyncDispatcher((errs, succs) => {
            this.collectCSBs(rawCSB, csbIdentifier, currentPath, alias);
            if (callback) {
                return callback(errs, succs);
            }
        });

        if (listFiles.length === 0) {
            asyncDispatcher.markOneAsFinished();
        }

        listFiles.forEach((fileReference) => {
            const csbIdentifier = new CSBIdentifier(fileReference.dseed);
            const fileAlias = fileReference.alias;
            const urls = csbIdentifier.getBackupUrls();
            const backupEngine = BackupEngine.getBackupEngine(urls);
            asyncDispatcher.dispatchEmpty();
            backupEngine.load(csbIdentifier, (err, encryptedFile) => {
                if (err) {
                    return this.swarm('interaction', 'handleError', err, 'Could not download file ' + fileAlias);
                }

                this.__addCSBHash(csbIdentifier, encryptedFile);

                fs.writeFile(utils.generatePath(this.localFolder, csbIdentifier), encryptedFile, (err) => {
                    if (err) {
                        return this.swarm('interaction', 'handleError', err, 'Could not save file ' + fileAlias);
                    }

                    asyncDispatcher.markOneAsFinished(undefined, fileAlias);
                });
            });
        });
    },

    collectCSBs: function (rawCSB, csbIdentifier, currentPath, alias) {

        const listCSBs = rawCSB.getAllAssets('global.CSBReference');
        const nextArguments = [];
        let counter = 0;

        if (listCSBs.length === 0) {
            this.asyncDispatcher.dispatchEmpty();
            this.asyncDispatcher.markOneAsFinished();
        }

        if (listCSBs && listCSBs.length > 0) {
            listCSBs.forEach((CSBReference) => {
                const nextPath = currentPath + '/' + CSBReference.alias;
                const nextCSBIdentifier = new CSBIdentifier(CSBReference.dseed);
                const nextAlias = CSBReference.alias;
                const nextURLs = csbIdentifier.getBackupUrls();
                const backupEngine = BackupEngine.getBackupEngine(nextURLs);
                this.asyncDispatcher.dispatchEmpty();
                backupEngine.load(nextCSBIdentifier, (err, encryptedCSB) => {
                    if (err) {
                        return this.swarm('interaction', 'handleError', err, 'Could not download CSB ' + nextAlias);
                    }

                    this.__addCSBHash(nextCSBIdentifier, encryptedCSB);

                    fs.writeFile(utils.generatePath(this.localFolder, nextCSBIdentifier), encryptedCSB, (err) => {
                        if (err) {
                            return this.swarm('interaction', 'handleError', err, 'Could not save CSB ' + nextAlias);
                        }

                        this.rootCSB.loadRawCSB(nextPath, (err, nextRawCSB) => {

                            if (err) {
                                return this.swarm('interaction', 'handleError', err, 'Failed to load CSB ' + nextAlias);
                            }
                            nextArguments.push([ nextRawCSB, nextCSBIdentifier, nextPath, nextAlias ]);

                            if (++counter === listCSBs.length) {
                                nextArguments.forEach((args) => {
                                    this.collectFiles(...args, () => {
                                        this.asyncDispatcher.markOneAsFinished(undefined, alias);
                                    });
                                });
                            }
                        });
                    });
                });
            });
        }
    },

    __tryDownload(urls, csbIdentifier, index, callback) {
        if (index === urls.length) {
            return callback(new Error('Could not download resource'));
        }

        const url = urls[index];
        this.backupEngine.load(url, csbIdentifier, (err, resource) => {
            if (err) {
                return this.__tryDownload(urls, csbIdentifier, ++index, callback);
            }

            callback(undefined, resource);
        });

    },

    __addCSBHash: function (csbIdentifier, encryptedCSB) {
        const pskHash = new crypto.PskHash();
        pskHash.update(encryptedCSB);
        this.hashObj[csbIdentifier.getUid()] = pskHash.digest().toString('hex');

    },

    __attachCSB: function (rootCSB, CSBPath, CSBAlias, csbIdentifier, callback) {
        if (!CSBAlias) {
            return callback(new Error("No CSB alias was specified"));
        }

        rootCSB.loadRawCSB(CSBPath, (err, rawCSB) => {
            if (err) {
                rootCSB.loadAssetFromPath(CSBPath, (err, csbRef) => {
                    if (err) {
                        return callback(err);
                    }

                    csbRef.init(CSBAlias, csbIdentifier.getSeed(), csbIdentifier.getDseed());
                    rootCSB.saveAssetToPath(CSBPath, csbRef, (err) => {
                        if (err) {
                            return callback(err);
                        }

                        callback();
                    });

                });
            } else {
                return callback(new Error(`A CSB having the alias ${CSBAlias} already exists.`));
            }
        });
    }
});


},{"../../utils/AsyncDispatcher":"/home/privatesky/modules/pskwallet/utils/AsyncDispatcher.js","../../utils/DseedCage":"/home/privatesky/modules/pskwallet/utils/DseedCage.js","../../utils/HashCage":"/home/privatesky/modules/pskwallet/utils/HashCage.js","../../utils/validator":"/home/privatesky/modules/pskwallet/utils/validator.js","../BackupEngine":"/home/privatesky/modules/pskwallet/libraries/BackupEngine.js","../CSBIdentifier":"/home/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","../RootCSB":"/home/privatesky/modules/pskwallet/libraries/RootCSB.js","./../../utils/flowsUtils":"/home/privatesky/modules/pskwallet/utils/flowsUtils.js","./../../utils/utils":"/home/privatesky/modules/pskwallet/utils/utils.js","fs":false,"path":false,"pskcrypto":false}],"/home/privatesky/modules/pskwallet/libraries/flows/saveBackup.js":[function(require,module,exports){
const utils = require("./../../utils/utils");
const fs = require("fs");
const validator = require("../../utils/validator");
const HashCage = require('../../utils/HashCage');
const AsyncDispatcher = require("../../utils/AsyncDispatcher");
const RootCSB = require('../RootCSB');
const CSBIdentifier = require('../CSBIdentifier');
const BackupEngine = require('../BackupEngine');
const path = require('path');


$$.swarm.describe("saveBackup", {
    start: function (localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.swarm("interaction", "readPin", 3);
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, "loadHashFile", pin, noTries);
    },

    withCSBIdentifier: function (id, localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.csbIdentifier = new CSBIdentifier(id);
        RootCSB.loadWithIdentifier(localFolder, this.csbIdentifier, (err, rootCSB) => {
            if (err) {
                this.swarm('interaction', 'handleError', err, 'Failed to load root CSB');
                return;
            }

            this.rootCSB = rootCSB;
            this.loadHashFile();
        });
    },

    loadHashFile: function (pin, backups) {
        this.backups = backups;
        this.hashCage = new HashCage(this.localFolder);
        this.hashCage.loadHash(validator.reportOrContinue(this, 'readEncryptedMaster', 'Failed to load hash file'));
    },

    readEncryptedMaster: function (hashFile) {
        this.hashFile = hashFile;
        this.masterID = utils.generatePath(this.localFolder, this.csbIdentifier);
        fs.readFile(this.masterID, validator.reportOrContinue(this, 'loadMasterRawCSB', 'Failed to read masterCSB.'));
    },


    loadMasterRawCSB: function () {
        this.rootCSB.loadRawCSB('', validator.reportOrContinue(this, "dispatcher", "Failed to load masterCSB"));
    },

    dispatcher: function (rawCSB) {
        this.asyncDispatcher = new AsyncDispatcher((errors, results) => {
            if (errors) {
                this.swarm('interaction', 'handleError', JSON.stringify(errors, null, '\t'), 'Failed to collect all CSBs');
                return;
            }
            this.collectFiles(results);
        });

        this.asyncDispatcher.dispatchEmpty();
        this.collectCSBs(rawCSB, this.csbIdentifier, '', 'master');
    },

    collectCSBs: function (rawCSB, csbIdentifier, currentPath, alias) {
        const listCSBs = rawCSB.getAllAssets('global.CSBReference');

        const nextArguments = [];
        let counter = 0;

        listCSBs.forEach((CSBReference) => {
            const nextPath = currentPath + '/' + CSBReference.alias;
            const nextCSBIdentifier = new CSBIdentifier(CSBReference.dseed);
            const nextAlias = CSBReference.alias;
            this.rootCSB.loadRawCSB(nextPath, (err, nextRawCSB) => {
                if (err) {
                    console.log(err);
                }
                nextArguments.push([ nextRawCSB, nextCSBIdentifier, nextPath, nextAlias ]);
                if (++counter === listCSBs.length) {
                    nextArguments.forEach((args) => {
                        this.asyncDispatcher.dispatchEmpty();
                        this.collectCSBs(...args);
                    });
                    this.asyncDispatcher.markOneAsFinished(undefined, {rawCSB, csbIdentifier, alias});
                }
            });
        });

        if (listCSBs.length === 0) {
            this.asyncDispatcher.markOneAsFinished(undefined, {rawCSB, csbIdentifier, alias});
        }
    },

    collectFiles: function (collectedCSBs) {
        this.asyncDispatcher = new AsyncDispatcher((errors, newResults) => {
            if (errors) {
                this.swarm('interaction', 'handleError', JSON.stringify(errors, null, '\t'), 'Failed to collect files attached to CSBs');
            }

            if (!newResults) {
                newResults = [];
            }
            this.__categorize(collectedCSBs.concat(newResults));
        });

        this.asyncDispatcher.dispatchEmpty(collectedCSBs.length);
        collectedCSBs.forEach(({rawCSB, csbIdentifier, alias}) => {
            this.__collectFiles(rawCSB, alias);
        });

    },

    __categorize: function (files) {
        const categories = {};
        let backups;
        files.forEach(({csbIdentifier, alias}) => {
            if (!this.backups || this.backups.length === 0) {
                backups = csbIdentifier.getBackupUrls();
            } else {
                backups = this.backups;
            }
            const uid = csbIdentifier.getUid();
            categories[uid] = {backups, alias};
        });

        this.asyncDispatcher = new AsyncDispatcher((errors, successes) => {
            this.swarm('interaction', 'csbBackupReport', {errors, successes});
        });

        this.backupEngine = BackupEngine.getBackupEngine(backups);
        this.filterFiles(categories);
        // Object.entries(categories).forEach(([uid, {alias, backups}]) => {
        //     this.filterFiles(uid, alias, backups);
        // });
    },

    filterFiles: function (filesBackups) {
        const filesToUpdate = {};
        Object.keys(this.hashFile).forEach((uid) => {
            if (filesBackups[uid]) {
                filesToUpdate[uid] = this.hashFile[uid];
            }
        });

        this.asyncDispatcher.dispatchEmpty();
        this.backupEngine.compareVersions(filesToUpdate, (err, modifiedFiles) => {
            if (err) {
                return this.swarm("interaction", "handleError", err, "Failed to retrieve list of modified files");
            }

            this.__backupFiles(JSON.parse(modifiedFiles), filesBackups);
        });
    },

    __backupFiles: function (files, filesBackups) {
        this.asyncDispatcher.dispatchEmpty(files.length);
        files.forEach((file) => {
            const fileStream = fs.createReadStream(path.join(this.localFolder, file));
            const backupUrls = filesBackups[file].backups;
            const backupEngine = BackupEngine.getBackupEngine(backupUrls);
            backupEngine.save(new CSBIdentifier(file), fileStream, (err, url) => {
                if (err) {
                    return  this.asyncDispatcher.markOneAsFinished({alias: filesBackups[file].alias, backupURL: url});
                }

                this.asyncDispatcher.markOneAsFinished(undefined, {alias: filesBackups[file].alias, backupURL: url});
            });
        });

        this.asyncDispatcher.markOneAsFinished(); // for http request to compareVersions
    },

    __collectFiles: function (rawCSB, csbAlias) {
        const files = rawCSB.getAllAssets('global.FileReference');
        this.asyncDispatcher.dispatchEmpty(files.length);
        files.forEach((FileReference) => {
            const alias = FileReference.alias;
            const csbIdentifier = new CSBIdentifier(FileReference.dseed);
            this.asyncDispatcher.markOneAsFinished(undefined, {csbIdentifier, alias});
        });
        this.asyncDispatcher.markOneAsFinished();
    }
});


},{"../../utils/AsyncDispatcher":"/home/privatesky/modules/pskwallet/utils/AsyncDispatcher.js","../../utils/HashCage":"/home/privatesky/modules/pskwallet/utils/HashCage.js","../../utils/validator":"/home/privatesky/modules/pskwallet/utils/validator.js","../BackupEngine":"/home/privatesky/modules/pskwallet/libraries/BackupEngine.js","../CSBIdentifier":"/home/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","../RootCSB":"/home/privatesky/modules/pskwallet/libraries/RootCSB.js","./../../utils/utils":"/home/privatesky/modules/pskwallet/utils/utils.js","fs":false,"path":false}],"/home/privatesky/modules/pskwallet/libraries/flows/setPin.js":[function(require,module,exports){
const validator = require("../../utils/validator");
const DseedCage = require('../../utils/DseedCage');

$$.swarm.describe("setPin", {
    start: function (localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.swarm("interaction", "readPin", 3);
    },

    validatePin: function (oldPin, noTries) {
        this.oldPin = oldPin;
        validator.validatePin(this.localFolder, this, "interactionJumper", oldPin, noTries);
    },

    interactionJumper: function () {
        this.swarm("interaction", "enterNewPin");
    },

    actualizePin: function (newPin) {
        this.dseedCage = new DseedCage(this.localFolder);
        this.dseedCage.loadDseedBackups(this.oldPin, validator.reportOrContinue(this, "saveDseed", "Failed to load dseed.", newPin));
    },

    saveDseed: function (csbIdentifier, backups, pin) {
        this.dseedCage.saveDseedBackups(pin, csbIdentifier, backups, validator.reportOrContinue(this, "successState", "Failed to save dseed"));
    },

    successState: function () {
        this.swarm("interaction", "printInfo", "The pin has been successfully changed.");
    }
});
},{"../../utils/DseedCage":"/home/privatesky/modules/pskwallet/utils/DseedCage.js","../../utils/validator":"/home/privatesky/modules/pskwallet/utils/validator.js"}],"/home/privatesky/modules/pskwallet/utils/AsyncDispatcher.js":[function(require,module,exports){
arguments[4]["/home/privatesky/modules/csb/utils/AsyncDispatcher.js"][0].apply(exports,arguments)
},{}],"/home/privatesky/modules/pskwallet/utils/DseedCage.js":[function(require,module,exports){
(function (Buffer){
const crypto = require('pskcrypto');
const path = require('path');
const fs = require("fs");
const CSBIdentifier = require("../libraries/CSBIdentifier");

function DseedCage(localFolder) {
	const dseedFolder = path.join(localFolder, '.privateSky');
	const dseedPath = path.join(dseedFolder, 'dseed');

	function loadDseedBackups(pin, callback) {
		fs.mkdir(dseedFolder, {recursive: true}, (err) => {
			if (err) {
				return callback(err);
			}

			crypto.loadData(pin, dseedPath, (err, dseedBackups) => {
				if (err) {
					return callback(err);
				}
				try{
					dseedBackups = JSON.parse(dseedBackups.toString());
				}catch (e) {
					return callback(e);
				}

				let csbIdentifier;
				if (dseedBackups.dseed && !Buffer.isBuffer(dseedBackups.dseed)) {
					dseedBackups.dseed = Buffer.from(dseedBackups.dseed);
					csbIdentifier = new CSBIdentifier(dseedBackups.dseed);
				}

				callback(undefined, csbIdentifier, dseedBackups.backups);
			});
		});
	}

	function saveDseedBackups(pin, csbIdentifier, backups, callback) {
		fs.mkdir(dseedFolder, {recursive: true}, (err) => {
			if (err) {
				return callback(err);
			}

			let dseed;
			if(csbIdentifier){
				dseed = csbIdentifier.getDseed();
			}
			const dseedBackups = JSON.stringify({
				dseed,
				backups
			});

			crypto.saveData(Buffer.from(dseedBackups), pin, dseedPath, callback);
		});
	}


	return {
		loadDseedBackups,
		saveDseedBackups,
	};
}


module.exports = DseedCage;
}).call(this,require("buffer").Buffer)

},{"../libraries/CSBIdentifier":"/home/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","buffer":false,"fs":false,"path":false,"pskcrypto":false}],"/home/privatesky/modules/pskwallet/utils/HashCage.js":[function(require,module,exports){
arguments[4]["/home/privatesky/modules/csb/utils/HashCage.js"][0].apply(exports,arguments)
},{"fs":false,"path":false}],"/home/privatesky/modules/pskwallet/utils/flowsUtils.js":[function(require,module,exports){
// const path = require("path");


exports.defaultBackup = "http://localhost:8080";
exports.defaultPin = "12345678";
exports.noTries = 3;


},{}],"/home/privatesky/modules/pskwallet/utils/utils.js":[function(require,module,exports){
arguments[4]["/home/privatesky/modules/csb/utils/utils.js"][0].apply(exports,arguments)
},{"fs":false,"path":false}],"/home/privatesky/modules/pskwallet/utils/validator.js":[function(require,module,exports){
const RootCSB = require("../libraries/RootCSB");
const fs = require("fs");
const path = require("path");


module.exports.validatePin = function (localFolder, swarm, phaseName, pin, noTries, ...args) {
	RootCSB.createRootCSB(localFolder, undefined, undefined, pin, (err, rootCSB, csbIdentifier, backups) =>{
		if(err){
			swarm.swarm("interaction", "readPin", noTries - 1);
		}else{
			if(csbIdentifier){
				swarm.rootCSB = rootCSB;
				swarm.csbIdentifier = csbIdentifier;
			}
			args.push(backups);
			swarm[phaseName](pin, ...args);
		}
	});
};

module.exports.reportOrContinue = function(swarm, phaseName, errorMessage, ...args){
	return function(err,...res) {
		if (err) {
			swarm.swarm("interaction", "handleError", err, errorMessage);
		} else {
			if (phaseName) {
					swarm[phaseName](...res, ...args);
			}
		}
	};
};

module.exports.checkMasterCSBExists = function (localFolder, callback) {
	fs.stat(path.join(localFolder, ".privateSky/hash"), (err, stats)=>{
		if(err){
			return callback(err, false);
		}

		return callback(undefined, true);
	});
};
},{"../libraries/RootCSB":"/home/privatesky/modules/pskwallet/libraries/RootCSB.js","fs":false,"path":false}],"/home/privatesky/modules/signsensus/lib/consUtil.js":[function(require,module,exports){
/*
consensus helper functions
*/

var pskcrypto = require("pskcrypto");


function Pulse(signer, currentPulseNumber, block, newTransactions, vsd, top, last) {
    this.signer         = signer;               //a.k.a. delegatedAgentName
    this.currentPulse   = currentPulseNumber;
    this.lset           = newTransactions;      //digest -> transaction
    this.ptBlock        = block;                //array of digests
    this.vsd            = vsd;
    this.top            = top;                  // a.k.a. topPulseConsensus
    this.last           = last;                 // a.k.a. lastPulseAchievedConsensus
}

function Transaction(currentPulse, swarm) {
    this.input      = swarm.input;
    this.output     = swarm.output;
    this.swarm      = swarm;

    var arr = process.hrtime();
    this.second     = arr[0];
    this.nanosecod  = arr[1];

    this.CP         = currentPulse;
    this.digest     = pskcrypto.hashValues(this);
}


exports.createTransaction = function (currentPulse, swarm) {
    return new Transaction(currentPulse, swarm);
}

exports.createPulse = function (signer, currentPulseNumber, block, newTransactions, vsd, top, last) {
    return new Pulse(signer, currentPulseNumber, block, newTransactions, vsd, top, last);
}

exports.orderTransactions = function (pset) { //order in place the pset array
    var arr = [];
    for (var d in pset) {
        arr.push(pset[d]);
    }

    arr.sort(function (t1, t2) {
        if (t1.CP < t2.CP) return -1;
        if (t1.CP > t2.CP) return 1;
        if (t1.second < t2.second) return -1;
        if (t1.second > t2.second) return 1;
        if (t1.nanosecod < t2.nanosecod) return -1;
        if (t1.nanosecod > t2.nanosecod) return 1;
        if (t1.digest < t2.digest) return -1;
        if (t1.digest > t2.digest) return 1;
        return 0; //only for identical transactions...
    })
    return arr;
}

function getMajorityFieldInPulses(allPulses, fieldName, extractFieldName, votingBox) {
    var counterFields = {};
    var majorityValue;
    var pulse;

    for (var agent in allPulses) {
        pulse = allPulses[agent];
        var v = pulse[fieldName];
        counterFields[v] = votingBox.vote(counterFields[v]);        // ++counterFields[v]
    }

    for (var i in counterFields) {
        if (votingBox.isMajoritarian(counterFields[i])) {
            majorityValue = i;
            if (fieldName == extractFieldName) {                    //??? "vsd", "vsd"
                return majorityValue;
            } else {                                                // "blockDigest", "ptBlock"
                for (var agent in allPulses) {
                    pulse = allPulses[agent];
                    if (pulse[fieldName] == majorityValue) {
                        return pulse[extractFieldName];
                    }
                }
            }
        }
    }
    return "none"; //there is no majority
}

exports.detectMajoritarianVSD = function (pulse, pulsesHistory, votingBox) {
    if (pulse == 0) return "none";
    var pulses = pulsesHistory[pulse];
    var majorityValue = getMajorityFieldInPulses(pulses, "vsd", "vsd", votingBox);
    return majorityValue;
}

/*
    detect a candidate block
 */
exports.detectMajoritarianPTBlock = function (pulse, pulsesHistory, votingBox) {
    if (pulse == 0) return "none";
    var pulses = pulsesHistory[pulse];
    var btBlock = getMajorityFieldInPulses(pulses, "blockDigest", "ptBlock", votingBox);
    return btBlock;
}

exports.makeSetFromBlock = function (knownTransactions, block) {
    var result = {};
    for (var i = 0; i < block.length; i++) {
        var item = block[i];
        result[item] = knownTransactions[item];
        if (!knownTransactions.hasOwnProperty(item)) {
            console.log(new Error("Do not give unknown transaction digests to makeSetFromBlock " + item));
        }
    }
    return result;
}

exports.setsConcat = function (target, from) {
    for (var d in from) {
        target[d] = from[d];
    }
    return target;
}

exports.setsRemoveArray = function (target, arr) {
    arr.forEach(item => delete target[item]);
    return target;
}

exports.setsRemovePtBlockAndPastTransactions = function (target, arr, maxPulse) {
    var toBeRemoved = [];
    for (var d in target) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] == d || target[d].CP < maxPulse) {
                toBeRemoved.push(d);
            }
        }
    }

    toBeRemoved.forEach(item => delete target[item]);
    return target;
}

exports.createDemocraticVotingBox = function (shareHoldersCounter) {
    return {
        vote: function (previosValue) {
            if (!previosValue) {
                previosValue = 0;
            }
            return previosValue + 1;
        },

        isMajoritarian: function (value) {
            //console.log(value , Math.floor(shareHoldersCounter/2) + 1);
            return value >= Math.floor(shareHoldersCounter / 2) + 1;
        }
    };
}

},{"pskcrypto":false}],"/home/privatesky/node_modules/is-buffer/index.js":[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],"/home/privatesky/psknode/core/sandboxes/util/SandBoxManager.js":[function(require,module,exports){
var mq = $$.require("foldermq");

const path = require('path');
const child_process = require("child_process");
const fs = require('fs');

const RESTART_TIMEOUT = 500;
const RESTART_TIMEOUT_LIMIT = 50000;

var sandboxes = {};
var exitHandler = require("../../utils/exitHandler")(sandboxes);

var bootSandBox = $$.flow.describe("PrivateSky.swarm.engine.bootInLauncher", {
    boot:function(sandBox, spaceName, folder, codeFolder, callback){
        // console.log("Booting in ", folder, " context ", spaceName);

        this.callback   = callback;
        this.folder     = folder;
        this.spaceName  = spaceName;
        this.sandBox    = sandBox;
        this.codeFolder    = codeFolder;
        this.timeoutMultiplier = 1;

        var task = this.serial(this.ensureFoldersExists);

        task.folderShouldExist(path.join(this.folder, "mq"),    task.progress);
        task.folderShouldExist(path.join(this.folder, "bundles"),  task.progress);
        task.folderShouldExist(path.join(this.folder, "tmp"),   task.progress);
    },
    folderShouldExist:  function(path, progress){
        fs.mkdir(path, {recursive: true}, progress);
    },
    copyFolder: function(sourcePath, targetPath, callback){
        let fsExt = require("utils").fsExt;
        try{
            fsExt.copy(sourcePath, targetPath, {overwrite: true}, callback);
        }catch(err){
            console.log("Got something...", err);
        }
    },
    ensureFoldersExists: function(err, res){
        if(err){
            console.log(err);
        } else {
            var task = this.parallel(this.runCode);
            this.sandBox.inbound = mq.createQue(path.join(this.folder, "mq/inbound"), this.progress);
            this.sandBox.outbound = mq.createQue(path.join(this.folder, "mq/outbound"), this.progress);

            console.log("Preparing to copy", path.join(this.codeFolder, "bundles"), path.resolve(path.join(this.folder, "bundles")));
            this.copyFolder(path.join(this.codeFolder, "bundles"), path.resolve(path.join(this.folder, "bundles")), task.progress);
        }

    },
    runCode: function(err, res){
        if(!err){
            var mainFile = path.join(process.env.PRIVATESKY_ROOT_FOLDER, "core", "sandboxes", "agentSandbox.js");
            var args = [this.spaceName, process.env.PRIVATESKY_ROOT_FOLDER, path.resolve(process.env.PRIVATESKY_DOMAIN_BUILD)];
            var opts = {stdio: [0, 1, 2, "ipc"]};

            var startChild = (mainFile, args, opts) => {
				console.log("Running: ", mainFile, args, opts);

				// passing options.env might break the agentSandbox, it relies on some inherited env variables from domain
				var child = child_process.fork(mainFile, args);
				sandboxes[this.spaceName] = child;

				this.sandBox.inbound.setIPCChannel(child);
				this.sandBox.outbound.setIPCChannel(child);

				child.on("exit", (code, signal)=>{
				    if(code === 0){
				        console.log(`Sandbox <${this.spaceName}> shutting down.`);
				        return;
                    }
				    let timeout = (this.timeoutMultiplier*RESTART_TIMEOUT) % RESTART_TIMEOUT_LIMIT;
				    console.log(`Sandbox <${this.spaceName}> exits with code ${code}. Restarting in ${timeout} ms.`);
					setTimeout(()=>{
						startChild(mainFile, args, opts);
                        this.timeoutMultiplier *= 1.5;
                    }, timeout);
				});

				return child;
            };

            this.callback(null, startChild(mainFile, args, opts));
        } else {
            console.log("Error executing sandbox!:", err);
            this.callback(err, null);
        }
    }

});

function SandBoxHandler(spaceName, folder, codeFolder, resultCallBack){

    var self = this;
    var mqHandler;


    bootSandBox().boot(this, spaceName,folder, codeFolder, function(err, childProcess){
        if(!err){
            self.childProcess = childProcess;


            /*self.outbound.registerConsumer(function(err, swarm){
                $$.PSK_PubSub.publish($$.CONSTANTS.SWARM_FOR_EXECUTION, swarm);
            });*/

            self.outbound.registerAsIPCConsumer(function(err, swarm){
                $$.PSK_PubSub.publish($$.CONSTANTS.SWARM_FOR_EXECUTION, swarm);
            });

            mqHandler = self.inbound.getHandler();
            if(pendingMessages.length){
                pendingMessages.map(function(item){
                    self.send(item);
                });
                pendingMessages = null;
            }
        }
    });

    var pendingMessages = [];

    this.send = function (swarm, callback) {
        if(mqHandler){
            mqHandler.sendSwarmForExecution(swarm, callback);
        } else {
            pendingMessages.push(swarm); //TODO: well, a deep clone will not be a better idea?
        }
    }

}


function SandBoxManager(sandboxesFolder, codeFolder, callback){
    var self = this;

    var sandBoxes = {

    };
    function belongsToReplicatedSpace(){
        return true;
    }

    //console.log("Subscribing to:", $$.CONSTANTS.SWARM_FOR_EXECUTION);
    $$.PSK_PubSub.subscribe($$.CONSTANTS.SWARM_FOR_EXECUTION, function(swarm){
        console.log("Executing in sandbox towards: ", swarm.meta.target);

        if(swarm.meta.target == "system" || swarm.meta.command == "asyncReturn"){
            $$.swarmsInstancesManager.revive_swarm(swarm);
            //$$.swarms.restart(swarm.meta.swarmTypeName, swarm);
        } else
        if(swarm.meta.target == "pds"){
            //
        } else
        if(belongsToReplicatedSpace(swarm.meta.target)){
            self.pushToSpaceASwarm(swarm.meta.target, swarm);
        } else {
            //TODO: send towards network
        }

    });


    function startSandBox(spaceName){
        var sandBox = new SandBoxHandler(spaceName, path.join(sandboxesFolder, spaceName), codeFolder);
        sandBoxes[spaceName] = sandBox;
        return sandBox;
    }


    this.pushToSpaceASwarm = function(spaceName, swarm, callback){

        console.log("pushToSpaceASwarm " , spaceName);
        var sandbox = sandBoxes[spaceName];
        if(!sandbox){
            sandbox = sandBoxes[spaceName] = startSandBox(spaceName);
        }
        sandbox.send(swarm, callback);
    }

    callback(null, this);
}


exports.create = function(folder, codeFolder, callback){
    new SandBoxManager(folder, codeFolder, callback);
};



},{"../../utils/exitHandler":"/home/privatesky/psknode/core/utils/exitHandler.js","child_process":false,"fs":false,"path":false,"utils":false}],"/home/privatesky/psknode/core/utils/exitHandler.js":[function(require,module,exports){
const events = ["exit", "SIGINT", "SIGUSR1", "SIGUSR2", "uncaughtException", "SIGTERM", "SIGHUP"];

module.exports = function manageShutdownProcess(childrenList){

    let shutting = false;
    function handler(){
        //console.log("Handling exit event on", process.pid, "arguments:", arguments);
        var childrenNames = Object.keys(childrenList);
        for(let j=0; j<childrenNames.length; j++){
            var child = childrenList[childrenNames[j]];
            //console.log(`[${process.pid}]`, "Sending kill signal to PID:", child.pid);
            try{
                process.kill(child.pid);
            }catch(err){
                //...
            }
        }

        if(!shutting){
            try{
                process.stdout.cursorTo(0);
                process.stdout.write(`[PID: ${process.pid}] [Timestamp: ${new Date().getTime()}] [Process argv: ${process.argv}]- Shutting down...\n`);
            }catch(err)
            {
                //...
            }
            shutting = true;
        }

        setTimeout(()=>{
            process.exit(0);
        }, 0);
    }

    process.stdin.resume();
    for(let i=0; i<events.length; i++){
        var eventType = events[i];
        process.on(eventType, handler);
    }
    //console.log("Exit handler setup!", `[${process.pid}]`);
};
},{}],"bar":[function(require,module,exports){
module.exports.Brick = require("./lib/Brick");
module.exports.Archive = require("./lib/Archive");
module.exports.FolderBarMap = require("./lib/FolderBarMap");
module.exports.createFsBarWorker = require("./lib/FsBarWorker").createFsBarWorker;
const ArchiveConfigurator = require("./lib/ArchiveConfigurator");
const createFolderBrickStorage = require("./lib/FolderBrickStorage").createFolderBrickStorage;
const createFileBrickStorage = require("./lib/FileBrickStorage").createFileBrickStorage;
ArchiveConfigurator.prototype.registerStorageProvider("FolderBrickStorage", createFolderBrickStorage);
ArchiveConfigurator.prototype.registerStorageProvider("FileBrickStorage", createFileBrickStorage);
module.exports.ArchiveConfigurator = ArchiveConfigurator;


},{"./lib/Archive":"/home/privatesky/modules/bar/lib/Archive.js","./lib/ArchiveConfigurator":"/home/privatesky/modules/bar/lib/ArchiveConfigurator.js","./lib/Brick":"/home/privatesky/modules/bar/lib/Brick.js","./lib/FileBrickStorage":"/home/privatesky/modules/bar/lib/FileBrickStorage.js","./lib/FolderBarMap":"/home/privatesky/modules/bar/lib/FolderBarMap.js","./lib/FolderBrickStorage":"/home/privatesky/modules/bar/lib/FolderBrickStorage.js","./lib/FsBarWorker":"/home/privatesky/modules/bar/lib/FsBarWorker.js"}],"buffer-crc32":[function(require,module,exports){
var Buffer = require('buffer').Buffer;

var CRC_TABLE = [
  0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419,
  0x706af48f, 0xe963a535, 0x9e6495a3, 0x0edb8832, 0x79dcb8a4,
  0xe0d5e91e, 0x97d2d988, 0x09b64c2b, 0x7eb17cbd, 0xe7b82d07,
  0x90bf1d91, 0x1db71064, 0x6ab020f2, 0xf3b97148, 0x84be41de,
  0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7, 0x136c9856,
  0x646ba8c0, 0xfd62f97a, 0x8a65c9ec, 0x14015c4f, 0x63066cd9,
  0xfa0f3d63, 0x8d080df5, 0x3b6e20c8, 0x4c69105e, 0xd56041e4,
  0xa2677172, 0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b,
  0x35b5a8fa, 0x42b2986c, 0xdbbbc9d6, 0xacbcf940, 0x32d86ce3,
  0x45df5c75, 0xdcd60dcf, 0xabd13d59, 0x26d930ac, 0x51de003a,
  0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423, 0xcfba9599,
  0xb8bda50f, 0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924,
  0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d, 0x76dc4190,
  0x01db7106, 0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f,
  0x9fbfe4a5, 0xe8b8d433, 0x7807c9a2, 0x0f00f934, 0x9609a88e,
  0xe10e9818, 0x7f6a0dbb, 0x086d3d2d, 0x91646c97, 0xe6635c01,
  0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e, 0x6c0695ed,
  0x1b01a57b, 0x8208f4c1, 0xf50fc457, 0x65b0d9c6, 0x12b7e950,
  0x8bbeb8ea, 0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3,
  0xfbd44c65, 0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2,
  0x4adfa541, 0x3dd895d7, 0xa4d1c46d, 0xd3d6f4fb, 0x4369e96a,
  0x346ed9fc, 0xad678846, 0xda60b8d0, 0x44042d73, 0x33031de5,
  0xaa0a4c5f, 0xdd0d7cc9, 0x5005713c, 0x270241aa, 0xbe0b1010,
  0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f,
  0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17,
  0x2eb40d81, 0xb7bd5c3b, 0xc0ba6cad, 0xedb88320, 0x9abfb3b6,
  0x03b6e20c, 0x74b1d29a, 0xead54739, 0x9dd277af, 0x04db2615,
  0x73dc1683, 0xe3630b12, 0x94643b84, 0x0d6d6a3e, 0x7a6a5aa8,
  0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1, 0xf00f9344,
  0x8708a3d2, 0x1e01f268, 0x6906c2fe, 0xf762575d, 0x806567cb,
  0x196c3671, 0x6e6b06e7, 0xfed41b76, 0x89d32be0, 0x10da7a5a,
  0x67dd4acc, 0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5,
  0xd6d6a3e8, 0xa1d1937e, 0x38d8c2c4, 0x4fdff252, 0xd1bb67f1,
  0xa6bc5767, 0x3fb506dd, 0x48b2364b, 0xd80d2bda, 0xaf0a1b4c,
  0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55, 0x316e8eef,
  0x4669be79, 0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236,
  0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f, 0xc5ba3bbe,
  0xb2bd0b28, 0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7, 0xb5d0cf31,
  0x2cd99e8b, 0x5bdeae1d, 0x9b64c2b0, 0xec63f226, 0x756aa39c,
  0x026d930a, 0x9c0906a9, 0xeb0e363f, 0x72076785, 0x05005713,
  0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38, 0x92d28e9b,
  0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21, 0x86d3d2d4, 0xf1d4e242,
  0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1,
  0x18b74777, 0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c,
  0x8f659eff, 0xf862ae69, 0x616bffd3, 0x166ccf45, 0xa00ae278,
  0xd70dd2ee, 0x4e048354, 0x3903b3c2, 0xa7672661, 0xd06016f7,
  0x4969474d, 0x3e6e77db, 0xaed16a4a, 0xd9d65adc, 0x40df0b66,
  0x37d83bf0, 0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9,
  0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605,
  0xcdd70693, 0x54de5729, 0x23d967bf, 0xb3667a2e, 0xc4614ab8,
  0x5d681b02, 0x2a6f2b94, 0xb40bbe37, 0xc30c8ea1, 0x5a05df1b,
  0x2d02ef8d
];

if (typeof Int32Array !== 'undefined') {
  CRC_TABLE = new Int32Array(CRC_TABLE);
}

function newEmptyBuffer(length) {
  var buffer = new Buffer(length);
  buffer.fill(0x00);
  return buffer;
}

function ensureBuffer(input) {
  if (Buffer.isBuffer(input)) {
    return input;
  }

  var hasNewBufferAPI =
      typeof Buffer.alloc === "function" &&
      typeof Buffer.from === "function";

  if (typeof input === "number") {
    return hasNewBufferAPI ? Buffer.alloc(input) : newEmptyBuffer(input);
  }
  else if (typeof input === "string") {
    return hasNewBufferAPI ? Buffer.from(input) : new Buffer(input);
  }
  else {
    throw new Error("input must be buffer, number, or string, received " +
                    typeof input);
  }
}

function bufferizeInt(num) {
  var tmp = ensureBuffer(4);
  tmp.writeInt32BE(num, 0);
  return tmp;
}

function _crc32(buf, previous) {
  buf = ensureBuffer(buf);
  if (Buffer.isBuffer(previous)) {
    previous = previous.readUInt32BE(0);
  }
  var crc = ~~previous ^ -1;
  for (var n = 0; n < buf.length; n++) {
    crc = CRC_TABLE[(crc ^ buf[n]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1);
}

function crc32() {
  return bufferizeInt(_crc32.apply(null, arguments));
}
crc32.signed = function () {
  return _crc32.apply(null, arguments);
};
crc32.unsigned = function () {
  return _crc32.apply(null, arguments) >>> 0;
};

module.exports = crc32;

},{"buffer":false}],"csb":[function(require,module,exports){
module.exports.RootCSB = RootCSB;
module.exports.RawCSB = require('./lib/RawCSB');
module.exports.CSBIdentifier = require('./lib/CSBIdentifier');
$$.loadLibrary("csb", require("./flows/index"));



},{"./flows/index":"/home/privatesky/modules/csb/flows/index.js","./lib/CSBIdentifier":"/home/privatesky/modules/csb/lib/CSBIdentifier.js","./lib/RawCSB":"/home/privatesky/modules/csb/lib/RawCSB.js"}],"domainBase":[function(require,module,exports){
exports.domainPubSub = require("./domainPubSub");
},{"./domainPubSub":"/home/privatesky/libraries/domainBase/domainPubSub.js"}],"edfs-brick-storage":[function(require,module,exports){
const bar = require("bar");
const ArchiveConfigurator = bar.ArchiveConfigurator;
const createEDFSBrickStorage = require("./EDFSBrickStorage").createEDFSBrickStorage;
ArchiveConfigurator.prototype.registerStorageProvider("EDFSBrickStorage", createEDFSBrickStorage);
module.exports.createEDFSBrickStorage = createEDFSBrickStorage;

},{"./EDFSBrickStorage":"/home/privatesky/modules/edfs-brick-storage/EDFSBrickStorage.js","bar":"bar"}],"edfs":[function(require,module,exports){
module.exports.EDFSMiddleware = require("./lib/EDFSMiddleware");



},{"./lib/EDFSMiddleware":"/home/privatesky/modules/edfs/lib/EDFSMiddleware.js"}],"foldermq":[function(require,module,exports){
module.exports = {
					createQue: require("./lib/folderMQ").getFolderQueue
					//folderMQ: require("./lib/folderMQ")
};
},{"./lib/folderMQ":"/home/privatesky/modules/foldermq/lib/folderMQ.js"}],"interact":[function(require,module,exports){
/*
Module that offers APIs to interact with PrivateSky web sandboxes
 */


const exportBrowserInteract = {
    enableIframeInteractions: function () {
        module.exports.createWindowMQ = require("./lib/interactionSpaceImpl/specificMQImpl/ChildWndMQ").createMQ;
        module.exports.createWindowInteractionSpace = require("./lib/interactionSpaceImpl/WindowMQInteractionSpace").createInteractionSpace;
    },
    enableReactInteractions: function () {
        module.exports.createWindowMQ = require("./lib/interactionSpaceImpl/specificMQImpl/ChildWndMQ").createMQ;
        module.exports.createWindowInteractionSpace = require("./lib/interactionSpaceImpl/WindowMQInteractionSpace").createInteractionSpace;
    },
    enableWebViewInteractions:function(){
        module.exports.createWindowInteractionSpace = require("./lib/interactionSpaceImpl/WebViewMQInteractionSpace").createInteractionSpace;
        module.exports.createWindowMQ = require("./lib/interactionSpaceImpl/specificMQImpl/ChildWebViewMQ").createMQ;
    },
    enableLocalInteractions: function () {
        module.exports.createInteractionSpace = require("./lib/interactionSpaceImpl/SoundPubSubMQBasedInteractionSpace").createInteractionSpace;
    },
    enableRemoteInteractions: function () {
        module.exports.createRemoteInteractionSpace = require('./lib/interactionSpaceImpl/httpInteractionSpace').createInteractionSpace;
    }
};


if (typeof navigator !== "undefined") {
    module.exports = exportBrowserInteract;
}
else {
    module.exports = {
        createNodeInteractionSpace: require("./lib/interactionSpaceImpl/folderMQBasedInteractionSpace").createInteractionSpace,
        createInteractionSpace: require("./lib/interactionSpaceImpl/SoundPubSubMQBasedInteractionSpace").createInteractionSpace,
        createRemoteInteractionSpace: require('./lib/interactionSpaceImpl/httpInteractionSpace').createInteractionSpace
    };
}
},{"./lib/interactionSpaceImpl/SoundPubSubMQBasedInteractionSpace":"/home/privatesky/modules/interact/lib/interactionSpaceImpl/SoundPubSubMQBasedInteractionSpace.js","./lib/interactionSpaceImpl/WebViewMQInteractionSpace":"/home/privatesky/modules/interact/lib/interactionSpaceImpl/WebViewMQInteractionSpace.js","./lib/interactionSpaceImpl/WindowMQInteractionSpace":"/home/privatesky/modules/interact/lib/interactionSpaceImpl/WindowMQInteractionSpace.js","./lib/interactionSpaceImpl/folderMQBasedInteractionSpace":"/home/privatesky/modules/interact/lib/interactionSpaceImpl/folderMQBasedInteractionSpace.js","./lib/interactionSpaceImpl/httpInteractionSpace":"/home/privatesky/modules/interact/lib/interactionSpaceImpl/httpInteractionSpace.js","./lib/interactionSpaceImpl/specificMQImpl/ChildWebViewMQ":"/home/privatesky/modules/interact/lib/interactionSpaceImpl/specificMQImpl/ChildWebViewMQ.js","./lib/interactionSpaceImpl/specificMQImpl/ChildWndMQ":"/home/privatesky/modules/interact/lib/interactionSpaceImpl/specificMQImpl/ChildWndMQ.js"}],"node-fd-slicer":[function(require,module,exports){
(function (Buffer,setImmediate){
var fs = require('fs');
var util = require('util');
var stream = require('stream');
var Readable = stream.Readable;
var Writable = stream.Writable;
var PassThrough = stream.PassThrough;
var Pend = require('./modules/node-pend');
var EventEmitter = require('events').EventEmitter;

exports.createFromBuffer = createFromBuffer;
exports.createFromFd = createFromFd;
exports.BufferSlicer = BufferSlicer;
exports.FdSlicer = FdSlicer;

util.inherits(FdSlicer, EventEmitter);
function FdSlicer(fd, options) {
  options = options || {};
  EventEmitter.call(this);

  this.fd = fd;
  this.pend = new Pend();
  this.pend.max = 1;
  this.refCount = 0;
  this.autoClose = !!options.autoClose;
}

FdSlicer.prototype.read = function(buffer, offset, length, position, callback) {
  var self = this;
  self.pend.go(function(cb) {
    fs.read(self.fd, buffer, offset, length, position, function(err, bytesRead, buffer) {
      cb();
      callback(err, bytesRead, buffer);
    });
  });
};

FdSlicer.prototype.write = function(buffer, offset, length, position, callback) {
  var self = this;
  self.pend.go(function(cb) {
    fs.write(self.fd, buffer, offset, length, position, function(err, written, buffer) {
      cb();
      callback(err, written, buffer);
    });
  });
};

FdSlicer.prototype.createReadStream = function(options) {
  return new ReadStream(this, options);
};

FdSlicer.prototype.createWriteStream = function(options) {
  return new WriteStream(this, options);
};

FdSlicer.prototype.ref = function() {
  this.refCount += 1;
};

FdSlicer.prototype.unref = function() {
  var self = this;
  self.refCount -= 1;

  if (self.refCount > 0) return;
  if (self.refCount < 0) throw new Error("invalid unref");

  if (self.autoClose) {
    fs.close(self.fd, onCloseDone);
  }

  function onCloseDone(err) {
    if (err) {
      self.emit('error', err);
    } else {
      self.emit('close');
    }
  }
};

util.inherits(ReadStream, Readable);
function ReadStream(context, options) {
  options = options || {};
  Readable.call(this, options);

  this.context = context;
  this.context.ref();

  this.start = options.start || 0;
  this.endOffset = options.end;
  this.pos = this.start;
  this.destroyed = false;
}

ReadStream.prototype._read = function(n) {
  var self = this;
  if (self.destroyed) return;

  var toRead = Math.min(self._readableState.highWaterMark, n);
  if (self.endOffset != null) {
    toRead = Math.min(toRead, self.endOffset - self.pos);
  }
  if (toRead <= 0) {
    self.destroyed = true;
    self.push(null);
    self.context.unref();
    return;
  }
  self.context.pend.go(function(cb) {
    if (self.destroyed) return cb();
    var buffer = new Buffer(toRead);
    fs.read(self.context.fd, buffer, 0, toRead, self.pos, function(err, bytesRead) {
      if (err) {
        self.destroy(err);
      } else if (bytesRead === 0) {
        self.destroyed = true;
        self.push(null);
        self.context.unref();
      } else {
        self.pos += bytesRead;
        self.push(buffer.slice(0, bytesRead));
      }
      cb();
    });
  });
};

ReadStream.prototype.destroy = function(err) {
  if (this.destroyed) return;
  err = err || new Error("stream destroyed");
  this.destroyed = true;
  this.emit('error', err);
  this.context.unref();
};

util.inherits(WriteStream, Writable);
function WriteStream(context, options) {
  options = options || {};
  Writable.call(this, options);

  this.context = context;
  this.context.ref();

  this.start = options.start || 0;
  this.endOffset = (options.end == null) ? Infinity : +options.end;
  this.bytesWritten = 0;
  this.pos = this.start;
  this.destroyed = false;

  this.on('finish', this.destroy.bind(this));
}

WriteStream.prototype._write = function(buffer, encoding, callback) {
  var self = this;
  if (self.destroyed) return;

  if (self.pos + buffer.length > self.endOffset) {
    var err = new Error("maximum file length exceeded");
    err.code = 'ETOOBIG';
    self.destroy();
    callback(err);
    return;
  }
  self.context.pend.go(function(cb) {
    if (self.destroyed) return cb();
    fs.write(self.context.fd, buffer, 0, buffer.length, self.pos, function(err, bytes) {
      if (err) {
        self.destroy();
        cb();
        callback(err);
      } else {
        self.bytesWritten += bytes;
        self.pos += bytes;
        self.emit('progress');
        cb();
        callback();
      }
    });
  });
};

WriteStream.prototype.destroy = function() {
  if (this.destroyed) return;
  this.destroyed = true;
  this.context.unref();
};

util.inherits(BufferSlicer, EventEmitter);
function BufferSlicer(buffer, options) {
  EventEmitter.call(this);

  options = options || {};
  this.refCount = 0;
  this.buffer = buffer;
  this.maxChunkSize = options.maxChunkSize || Number.MAX_SAFE_INTEGER;
}

BufferSlicer.prototype.read = function(buffer, offset, length, position, callback) {
  var end = position + length;
  var delta = end - this.buffer.length;
  var written = (delta > 0) ? delta : length;
  this.buffer.copy(buffer, offset, position, end);
  setImmediate(function() {
    callback(null, written);
  });
};

BufferSlicer.prototype.write = function(buffer, offset, length, position, callback) {
  buffer.copy(this.buffer, position, offset, offset + length);
  setImmediate(function() {
    callback(null, length, buffer);
  });
};

BufferSlicer.prototype.createReadStream = function(options) {
  options = options || {};
  var readStream = new PassThrough(options);
  readStream.destroyed = false;
  readStream.start = options.start || 0;
  readStream.endOffset = options.end;
  // by the time this function returns, we'll be done.
  readStream.pos = readStream.endOffset || this.buffer.length;

  // respect the maxChunkSize option to slice up the chunk into smaller pieces.
  var entireSlice = this.buffer.slice(readStream.start, readStream.pos);
  var offset = 0;
  while (true) {
    var nextOffset = offset + this.maxChunkSize;
    if (nextOffset >= entireSlice.length) {
      // last chunk
      if (offset < entireSlice.length) {
        readStream.write(entireSlice.slice(offset, entireSlice.length));
      }
      break;
    }
    readStream.write(entireSlice.slice(offset, nextOffset));
    offset = nextOffset;
  }

  readStream.end();
  readStream.destroy = function() {
    readStream.destroyed = true;
  };
  return readStream;
};

BufferSlicer.prototype.createWriteStream = function(options) {
  var bufferSlicer = this;
  options = options || {};
  var writeStream = new Writable(options);
  writeStream.start = options.start || 0;
  writeStream.endOffset = (options.end == null) ? this.buffer.length : +options.end;
  writeStream.bytesWritten = 0;
  writeStream.pos = writeStream.start;
  writeStream.destroyed = false;
  writeStream._write = function(buffer, encoding, callback) {
    if (writeStream.destroyed) return;

    var end = writeStream.pos + buffer.length;
    if (end > writeStream.endOffset) {
      var err = new Error("maximum file length exceeded");
      err.code = 'ETOOBIG';
      writeStream.destroyed = true;
      callback(err);
      return;
    }
    buffer.copy(bufferSlicer.buffer, writeStream.pos, 0, buffer.length);

    writeStream.bytesWritten += buffer.length;
    writeStream.pos = end;
    writeStream.emit('progress');
    callback();
  };
  writeStream.destroy = function() {
    writeStream.destroyed = true;
  };
  return writeStream;
};

BufferSlicer.prototype.ref = function() {
  this.refCount += 1;
};

BufferSlicer.prototype.unref = function() {
  this.refCount -= 1;

  if (this.refCount < 0) {
    throw new Error("invalid unref");
  }
};

function createFromBuffer(buffer, options) {
  return new BufferSlicer(buffer, options);
}

function createFromFd(fd, options) {
  return new FdSlicer(fd, options);
}

}).call(this,require("buffer").Buffer,require("timers").setImmediate)

},{"./modules/node-pend":"/home/privatesky/modules/node-fd-slicer/modules/node-pend/index.js","buffer":false,"events":false,"fs":false,"stream":false,"timers":false,"util":false}],"psk-http-client":[function(require,module,exports){
//to look nice the requireModule on Node
require("./lib/psk-abstract-client");
if(!$$.browserRuntime){
	require("./lib/psk-node-client");
}else{
	require("./lib/psk-browser-client");
}
},{"./lib/psk-abstract-client":"/home/privatesky/modules/psk-http-client/lib/psk-abstract-client.js","./lib/psk-browser-client":"/home/privatesky/modules/psk-http-client/lib/psk-browser-client.js","./lib/psk-node-client":"/home/privatesky/modules/psk-http-client/lib/psk-node-client.js"}],"pskdb":[function(require,module,exports){
const Blockchain = require('./lib/Blockchain');

module.exports = {
    startDB: function (folder) {
        if ($$.blockchain) {
            throw new Error('$$.blockchain is already defined');
        }
        $$.blockchain = this.createDBHandler(folder);
        return $$.blockchain;
    },
    createDBHandler: function(folder){
        require('./lib/domain');
        require('./lib/swarms');

        const fpds = require("./lib/FolderPersistentPDS");
        const pds = fpds.newPDS(folder);

        return new Blockchain(pds);
    },
    parseDomainUrl: function (domainUrl) {
        console.log("Empty function");
    },
    getDomainInfo: function () {
        console.log("Empty function");
    },
    startInMemoryDB: function() {
		require('./lib/domain');
		require('./lib/swarms');

		const pds = require('./lib/InMemoryPDS');

		return new Blockchain(pds.newPDS(null));
    },
    startDb: function(readerWriter) {
        require('./lib/domain');
        require('./lib/swarms');

        const ppds = require("./lib/PersistentPDS");
        const pds = ppds.newPDS(readerWriter);

        return new Blockchain(pds);
    }
};

},{"./lib/Blockchain":"/home/privatesky/modules/pskdb/lib/Blockchain.js","./lib/FolderPersistentPDS":"/home/privatesky/modules/pskdb/lib/FolderPersistentPDS.js","./lib/InMemoryPDS":"/home/privatesky/modules/pskdb/lib/InMemoryPDS.js","./lib/PersistentPDS":"/home/privatesky/modules/pskdb/lib/PersistentPDS.js","./lib/domain":"/home/privatesky/modules/pskdb/lib/domain/index.js","./lib/swarms":"/home/privatesky/modules/pskdb/lib/swarms/index.js"}],"pskwallet":[function(require,module,exports){
module.exports.utils  = require("./utils/flowsUtils");
const RootCSB = require('./libraries/RootCSB');
module.exports.createRootCSB = RootCSB.createRootCSB;
module.exports.loadWithIdentifier = RootCSB.loadWithIdentifier;
module.exports.loadWithPin   = RootCSB.loadWithPin;
module.exports.writeNewMasterCSB = RootCSB.writeNewMasterCSB;
module.exports.RootCSB = RootCSB;
module.exports.RawCSB = require('./libraries/RawCSB');
module.exports.CSBIdentifier = require('./libraries/CSBIdentifier');
module.exports.init = function () {
	$$.loadLibrary("pskwallet", require("./libraries/flows/index"));
};


},{"./libraries/CSBIdentifier":"/home/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","./libraries/RawCSB":"/home/privatesky/modules/pskwallet/libraries/RawCSB.js","./libraries/RootCSB":"/home/privatesky/modules/pskwallet/libraries/RootCSB.js","./libraries/flows/index":"/home/privatesky/modules/pskwallet/libraries/flows/index.js","./utils/flowsUtils":"/home/privatesky/modules/pskwallet/utils/flowsUtils.js"}],"signsensus":[function(require,module,exports){
module.exports = {
    consUtil: require('./consUtil')
};
},{"./consUtil":"/home/privatesky/modules/signsensus/lib/consUtil.js"}],"yauzl":[function(require,module,exports){
(function (Buffer,setImmediate){
var fs = require("fs");
var zlib = require("zlib");
const fd_slicer = require("node-fd-slicer");
var crc32 = require("buffer-crc32");
var util = require("util");
var EventEmitter = require("events").EventEmitter;
var Transform = require("stream").Transform;
var PassThrough = require("stream").PassThrough;
var Writable = require("stream").Writable;

exports.open = open;
exports.fromFd = fromFd;
exports.fromBuffer = fromBuffer;
exports.fromRandomAccessReader = fromRandomAccessReader;
exports.dosDateTimeToDate = dosDateTimeToDate;
exports.validateFileName = validateFileName;
exports.ZipFile = ZipFile;
exports.Entry = Entry;
exports.RandomAccessReader = RandomAccessReader;

function open(path, options, callback) {
	if (typeof options === "function") {
		callback = options;
		options = null;
	}
	if (options == null) options = {};
	if (options.autoClose == null) options.autoClose = true;
	if (options.lazyEntries == null) options.lazyEntries = false;
	if (options.decodeStrings == null) options.decodeStrings = true;
	if (options.validateEntrySizes == null) options.validateEntrySizes = true;
	if (options.strictFileNames == null) options.strictFileNames = false;
	if (callback == null) callback = defaultCallback;
	fs.open(path, "r", function (err, fd) {
		if (err) return callback(err);
		fromFd(fd, options, function (err, zipfile) {
			if (err) fs.close(fd, defaultCallback);
			callback(err, zipfile);
		});
	});
}

function fromFd(fd, options, callback) {
	if (typeof options === "function") {
		callback = options;
		options = null;
	}
	if (options == null) options = {};
	if (options.autoClose == null) options.autoClose = false;
	if (options.lazyEntries == null) options.lazyEntries = false;
	if (options.decodeStrings == null) options.decodeStrings = true;
	if (options.validateEntrySizes == null) options.validateEntrySizes = true;
	if (options.strictFileNames == null) options.strictFileNames = false;
	if (callback == null) callback = defaultCallback;
	fs.fstat(fd, function (err, stats) {
		if (err) return callback(err);
		var reader = fd_slicer.createFromFd(fd, {autoClose: true});
		fromRandomAccessReader(reader, stats.size, options, callback);
	});
}

function fromBuffer(buffer, options, callback) {
	if (typeof options === "function") {
		callback = options;
		options = null;
	}
	if (options == null) options = {};
	options.autoClose = false;
	if (options.lazyEntries == null) options.lazyEntries = false;
	if (options.decodeStrings == null) options.decodeStrings = true;
	if (options.validateEntrySizes == null) options.validateEntrySizes = true;
	if (options.strictFileNames == null) options.strictFileNames = false;
	// limit the max chunk size. see https://github.com/thejoshwolfe/yauzl/issues/87
	var reader = fd_slicer.createFromBuffer(buffer, {maxChunkSize: 0x10000});
	fromRandomAccessReader(reader, buffer.length, options, callback);
}

function fromRandomAccessReader(reader, totalSize, options, callback) {
	if (typeof options === "function") {
		callback = options;
		options = null;
	}
	if (options == null) options = {};
	if (options.autoClose == null) options.autoClose = true;
	if (options.lazyEntries == null) options.lazyEntries = false;
	if (options.decodeStrings == null) options.decodeStrings = true;
	var decodeStrings = !!options.decodeStrings;
	if (options.validateEntrySizes == null) options.validateEntrySizes = true;
	if (options.strictFileNames == null) options.strictFileNames = false;
	if (callback == null) callback = defaultCallback;
	if (typeof totalSize !== "number") throw new Error("expected totalSize parameter to be a number");
	if (totalSize > Number.MAX_SAFE_INTEGER) {
		throw new Error("zip file too large. only file sizes up to 2^52 are supported due to JavaScript's Number type being an IEEE 754 double.");
	}

	// the matching unref() call is in zipfile.close()
	reader.ref();

	// eocdr means End of Central Directory Record.
	// search backwards for the eocdr signature.
	// the last field of the eocdr is a variable-length comment.
	// the comment size is encoded in a 2-byte field in the eocdr, which we can't find without trudging backwards through the comment to find it.
	// as a consequence of this design decision, it's possible to have ambiguous zip file metadata if a coherent eocdr was in the comment.
	// we search backwards for a eocdr signature, and hope that whoever made the zip file was smart enough to forbid the eocdr signature in the comment.
	var eocdrWithoutCommentSize = 22;
	var maxCommentSize = 0xffff; // 2-byte size
	var bufferSize = Math.min(eocdrWithoutCommentSize + maxCommentSize, totalSize);
	var buffer = newBuffer(bufferSize);
	var bufferReadStart = totalSize - buffer.length;
	readAndAssertNoEof(reader, buffer, 0, bufferSize, bufferReadStart, function (err) {
		if (err) return callback(err);
		for (var i = bufferSize - eocdrWithoutCommentSize; i >= 0; i -= 1) {
			if (buffer.readUInt32LE(i) !== 0x06054b50) continue;
			// found eocdr
			var eocdrBuffer = buffer.slice(i);

			// 0 - End of central directory signature = 0x06054b50
			// 4 - Number of this disk
			var diskNumber = eocdrBuffer.readUInt16LE(4);
			if (diskNumber !== 0) {
				return callback(new Error("multi-disk zip files are not supported: found disk number: " + diskNumber));
			}
			// 6 - Disk where central directory starts
			// 8 - Number of central directory records on this disk
			// 10 - Total number of central directory records
			var entryCount = eocdrBuffer.readUInt16LE(10);
			// 12 - Size of central directory (bytes)
			// 16 - Offset of start of central directory, relative to start of archive
			var centralDirectoryOffset = eocdrBuffer.readUInt32LE(16);
			// 20 - Comment length
			var commentLength = eocdrBuffer.readUInt16LE(20);
			var expectedCommentLength = eocdrBuffer.length - eocdrWithoutCommentSize;
			if (commentLength !== expectedCommentLength) {
				return callback(new Error("invalid comment length. expected: " + expectedCommentLength + ". found: " + commentLength));
			}
			// 22 - Comment
			// the encoding is always cp437.
			var comment = decodeStrings ? decodeBuffer(eocdrBuffer, 22, eocdrBuffer.length, false)
				: eocdrBuffer.slice(22);

			if (!(entryCount === 0xffff || centralDirectoryOffset === 0xffffffff)) {
				return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options.autoClose, options.lazyEntries, decodeStrings, options.validateEntrySizes, options.strictFileNames));
			}

			// ZIP64 format

			// ZIP64 Zip64 end of central directory locator
			var zip64EocdlBuffer = newBuffer(20);
			var zip64EocdlOffset = bufferReadStart + i - zip64EocdlBuffer.length;
			readAndAssertNoEof(reader, zip64EocdlBuffer, 0, zip64EocdlBuffer.length, zip64EocdlOffset, function (err) {
				if (err) return callback(err);

				// 0 - zip64 end of central dir locator signature = 0x07064b50
				if (zip64EocdlBuffer.readUInt32LE(0) !== 0x07064b50) {
					return callback(new Error("invalid zip64 end of central directory locator signature"));
				}
				// 4 - number of the disk with the start of the zip64 end of central directory
				// 8 - relative offset of the zip64 end of central directory record
				var zip64EocdrOffset = readUInt64LE(zip64EocdlBuffer, 8);
				// 16 - total number of disks

				// ZIP64 end of central directory record
				var zip64EocdrBuffer = newBuffer(56);
				readAndAssertNoEof(reader, zip64EocdrBuffer, 0, zip64EocdrBuffer.length, zip64EocdrOffset, function (err) {
					if (err) return callback(err);

					// 0 - zip64 end of central dir signature                           4 bytes  (0x06064b50)
					if (zip64EocdrBuffer.readUInt32LE(0) !== 0x06064b50) {
						return callback(new Error("invalid zip64 end of central directory record signature"));
					}
					// 4 - size of zip64 end of central directory record                8 bytes
					// 12 - version made by                                             2 bytes
					// 14 - version needed to extract                                   2 bytes
					// 16 - number of this disk                                         4 bytes
					// 20 - number of the disk with the start of the central directory  4 bytes
					// 24 - total number of entries in the central directory on this disk         8 bytes
					// 32 - total number of entries in the central directory            8 bytes
					entryCount = readUInt64LE(zip64EocdrBuffer, 32);
					// 40 - size of the central directory                               8 bytes
					// 48 - offset of start of central directory with respect to the starting disk number     8 bytes
					centralDirectoryOffset = readUInt64LE(zip64EocdrBuffer, 48);
					// 56 - zip64 extensible data sector                                (variable size)
					return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options.autoClose, options.lazyEntries, decodeStrings, options.validateEntrySizes, options.strictFileNames));
				});
			});
			return;
		}
		callback(new Error("end of central directory record signature not found"));
	});
}

util.inherits(ZipFile, EventEmitter);

function ZipFile(reader, centralDirectoryOffset, fileSize, entryCount, comment, autoClose, lazyEntries, decodeStrings, validateEntrySizes, strictFileNames) {
	var self = this;
	EventEmitter.call(self);
	self.reader = reader;
	// forward close events
	self.reader.on("error", function (err) {
		// error closing the fd
		emitError(self, err);
	});
	self.reader.once("close", function () {
		self.emit("close");
	});
	self.readEntryCursor = centralDirectoryOffset;
	self.fileSize = fileSize;
	self.entryCount = entryCount;
	self.comment = comment;
	self.entriesRead = 0;
	self.autoClose = !!autoClose;
	self.lazyEntries = !!lazyEntries;
	self.decodeStrings = !!decodeStrings;
	self.validateEntrySizes = !!validateEntrySizes;
	self.strictFileNames = !!strictFileNames;
	self.isOpen = true;
	self.emittedError = false;

	if (!self.lazyEntries) self._readEntry();
}

ZipFile.prototype.close = function () {
	if (!this.isOpen) return;
	this.isOpen = false;
	this.reader.unref();
};

function emitErrorAndAutoClose(self, err) {
	if (self.autoClose) self.close();
	emitError(self, err);
}

function emitError(self, err) {
	if (self.emittedError) return;
	self.emittedError = true;
	self.emit("error", err);
}

ZipFile.prototype.readEntry = function () {
	if (!this.lazyEntries) throw new Error("readEntry() called without lazyEntries:true");
	this._readEntry();
};
ZipFile.prototype._readEntry = function () {
	var self = this;
	if (self.entryCount === self.entriesRead) {
		// done with metadata
		setImmediate(function () {
			if (self.autoClose) self.close();
			if (self.emittedError) return;
			self.emit("end");
		});
		return;
	}
	if (self.emittedError) return;
	var buffer = newBuffer(46);
	readAndAssertNoEof(self.reader, buffer, 0, buffer.length, self.readEntryCursor, function (err) {
		if (err) return emitErrorAndAutoClose(self, err);
		if (self.emittedError) return;
		var entry = new Entry();
		// 0 - Central directory file header signature
		var signature = buffer.readUInt32LE(0);
		if (signature !== 0x02014b50) return emitErrorAndAutoClose(self, new Error("invalid central directory file header signature: 0x" + signature.toString(16)));
		// 4 - Version made by
		entry.versionMadeBy = buffer.readUInt16LE(4);
		// 6 - Version needed to extract (minimum)
		entry.versionNeededToExtract = buffer.readUInt16LE(6);
		// 8 - General purpose bit flag
		entry.generalPurposeBitFlag = buffer.readUInt16LE(8);
		// 10 - Compression method
		entry.compressionMethod = buffer.readUInt16LE(10);
		// 12 - File last modification time
		entry.lastModFileTime = buffer.readUInt16LE(12);
		// 14 - File last modification date
		entry.lastModFileDate = buffer.readUInt16LE(14);
		// 16 - CRC-32
		entry.crc32 = buffer.readUInt32LE(16);
		// 20 - Compressed size
		entry.compressedSize = buffer.readUInt32LE(20);
		// 24 - Uncompressed size
		entry.uncompressedSize = buffer.readUInt32LE(24);
		// 28 - File name length (n)
		entry.fileNameLength = buffer.readUInt16LE(28);
		// 30 - Extra field length (m)
		entry.extraFieldLength = buffer.readUInt16LE(30);
		// 32 - File comment length (k)
		entry.fileCommentLength = buffer.readUInt16LE(32);
		// 34 - Disk number where file starts
		// 36 - Internal file attributes
		entry.internalFileAttributes = buffer.readUInt16LE(36);
		// 38 - External file attributes
		entry.externalFileAttributes = buffer.readUInt32LE(38);
		// 42 - Relative offset of local file header
		entry.relativeOffsetOfLocalHeader = buffer.readUInt32LE(42);

		if (entry.generalPurposeBitFlag & 0x40) return emitErrorAndAutoClose(self, new Error("strong encryption is not supported"));

		self.readEntryCursor += 46;

		buffer = newBuffer(entry.fileNameLength + entry.extraFieldLength + entry.fileCommentLength);
		readAndAssertNoEof(self.reader, buffer, 0, buffer.length, self.readEntryCursor, function (err) {
			if (err) return emitErrorAndAutoClose(self, err);
			if (self.emittedError) return;
			// 46 - File name
			var isUtf8 = (entry.generalPurposeBitFlag & 0x800) !== 0;
			entry.fileName = self.decodeStrings ? decodeBuffer(buffer, 0, entry.fileNameLength, isUtf8)
				: buffer.slice(0, entry.fileNameLength);

			// 46+n - Extra field
			var fileCommentStart = entry.fileNameLength + entry.extraFieldLength;
			var extraFieldBuffer = buffer.slice(entry.fileNameLength, fileCommentStart);
			entry.extraFields = [];
			var i = 0;
			while (i < extraFieldBuffer.length - 3) {
				var headerId = extraFieldBuffer.readUInt16LE(i + 0);
				var dataSize = extraFieldBuffer.readUInt16LE(i + 2);
				var dataStart = i + 4;
				var dataEnd = dataStart + dataSize;
				if (dataEnd > extraFieldBuffer.length) return emitErrorAndAutoClose(self, new Error("extra field length exceeds extra field buffer size"));
				var dataBuffer = newBuffer(dataSize);
				extraFieldBuffer.copy(dataBuffer, 0, dataStart, dataEnd);
				entry.extraFields.push({
					id: headerId,
					data: dataBuffer,
				});
				i = dataEnd;
			}

			// 46+n+m - File comment
			entry.fileComment = self.decodeStrings ? decodeBuffer(buffer, fileCommentStart, fileCommentStart + entry.fileCommentLength, isUtf8)
				: buffer.slice(fileCommentStart, fileCommentStart + entry.fileCommentLength);
			// compatibility hack for https://github.com/thejoshwolfe/yauzl/issues/47
			entry.comment = entry.fileComment;

			self.readEntryCursor += buffer.length;
			self.entriesRead += 1;

			if (entry.uncompressedSize === 0xffffffff ||
				entry.compressedSize === 0xffffffff ||
				entry.relativeOffsetOfLocalHeader === 0xffffffff) {
				// ZIP64 format
				// find the Zip64 Extended Information Extra Field
				var zip64EiefBuffer = null;
				for (var i = 0; i < entry.extraFields.length; i++) {
					var extraField = entry.extraFields[i];
					if (extraField.id === 0x0001) {
						zip64EiefBuffer = extraField.data;
						break;
					}
				}
				if (zip64EiefBuffer == null) {
					return emitErrorAndAutoClose(self, new Error("expected zip64 extended information extra field"));
				}
				var index = 0;
				// 0 - Original Size          8 bytes
				if (entry.uncompressedSize === 0xffffffff) {
					if (index + 8 > zip64EiefBuffer.length) {
						return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include uncompressed size"));
					}
					entry.uncompressedSize = readUInt64LE(zip64EiefBuffer, index);
					index += 8;
				}
				// 8 - Compressed Size        8 bytes
				if (entry.compressedSize === 0xffffffff) {
					if (index + 8 > zip64EiefBuffer.length) {
						return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include compressed size"));
					}
					entry.compressedSize = readUInt64LE(zip64EiefBuffer, index);
					index += 8;
				}
				// 16 - Relative Header Offset 8 bytes
				if (entry.relativeOffsetOfLocalHeader === 0xffffffff) {
					if (index + 8 > zip64EiefBuffer.length) {
						return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include relative header offset"));
					}
					entry.relativeOffsetOfLocalHeader = readUInt64LE(zip64EiefBuffer, index);
					index += 8;
				}
				// 24 - Disk Start Number      4 bytes
			}

			// check for Info-ZIP Unicode Path Extra Field (0x7075)
			// see https://github.com/thejoshwolfe/yauzl/issues/33
			if (self.decodeStrings) {
				for (var i = 0; i < entry.extraFields.length; i++) {
					var extraField = entry.extraFields[i];
					if (extraField.id === 0x7075) {
						if (extraField.data.length < 6) {
							// too short to be meaningful
							continue;
						}
						// Version       1 byte      version of this extra field, currently 1
						if (extraField.data.readUInt8(0) !== 1) {
							// > Changes may not be backward compatible so this extra
							// > field should not be used if the version is not recognized.
							continue;
						}
						// NameCRC32     4 bytes     File Name Field CRC32 Checksum
						var oldNameCrc32 = extraField.data.readUInt32LE(1);
						if (crc32.unsigned(buffer.slice(0, entry.fileNameLength)) !== oldNameCrc32) {
							// > If the CRC check fails, this UTF-8 Path Extra Field should be
							// > ignored and the File Name field in the header should be used instead.
							continue;
						}
						// UnicodeName   Variable    UTF-8 version of the entry File Name
						entry.fileName = decodeBuffer(extraField.data, 5, extraField.data.length, true);
						break;
					}
				}
			}

			// validate file size
			if (self.validateEntrySizes && entry.compressionMethod === 0) {
				var expectedCompressedSize = entry.uncompressedSize;
				if (entry.isEncrypted()) {
					// traditional encryption prefixes the file data with a header
					expectedCompressedSize += 12;
				}
				if (entry.compressedSize !== expectedCompressedSize) {
					var msg = "compressed/uncompressed size mismatch for stored file: " + entry.compressedSize + " != " + entry.uncompressedSize;
					return emitErrorAndAutoClose(self, new Error(msg));
				}
			}

			if (self.decodeStrings) {
				if (!self.strictFileNames) {
					// allow backslash
					entry.fileName = entry.fileName.replace(/\\/g, "/");
				}
				var errorMessage = validateFileName(entry.fileName, self.validateFileNameOptions);
				if (errorMessage != null) return emitErrorAndAutoClose(self, new Error(errorMessage));
			}
			self.emit("entry", entry);

			if (!self.lazyEntries) self._readEntry();
		});
	});
};

ZipFile.prototype.openReadStream = function (entry, options, callback) {
	var self = this;
	// parameter validation
	var relativeStart = 0;
	var relativeEnd = entry.compressedSize;
	if (callback == null) {
		callback = options;
		options = {};
	} else {
		// validate options that the caller has no excuse to get wrong
		if (options.decrypt != null) {
			if (!entry.isEncrypted()) {
				throw new Error("options.decrypt can only be specified for encrypted entries");
			}
			if (options.decrypt !== false) throw new Error("invalid options.decrypt value: " + options.decrypt);
			if (entry.isCompressed()) {
				if (options.decompress !== false) throw new Error("entry is encrypted and compressed, and options.decompress !== false");
			}
		}
		if (options.decompress != null) {
			if (!entry.isCompressed()) {
				throw new Error("options.decompress can only be specified for compressed entries");
			}
			if (!(options.decompress === false || options.decompress === true)) {
				throw new Error("invalid options.decompress value: " + options.decompress);
			}
		}
		if (options.start != null || options.end != null) {
			if (entry.isCompressed() && options.decompress !== false) {
				throw new Error("start/end range not allowed for compressed entry without options.decompress === false");
			}
			if (entry.isEncrypted() && options.decrypt !== false) {
				throw new Error("start/end range not allowed for encrypted entry without options.decrypt === false");
			}
		}
		if (options.start != null) {
			relativeStart = options.start;
			if (relativeStart < 0) throw new Error("options.start < 0");
			if (relativeStart > entry.compressedSize) throw new Error("options.start > entry.compressedSize");
		}
		if (options.end != null) {
			relativeEnd = options.end;
			if (relativeEnd < 0) throw new Error("options.end < 0");
			if (relativeEnd > entry.compressedSize) throw new Error("options.end > entry.compressedSize");
			if (relativeEnd < relativeStart) throw new Error("options.end < options.start");
		}
	}
	// any further errors can either be caused by the zipfile,
	// or were introduced in a minor version of yauzl,
	// so should be passed to the client rather than thrown.
	if (!self.isOpen) return callback(new Error("closed"));
	if (entry.isEncrypted()) {
		if (options.decrypt !== false) return callback(new Error("entry is encrypted, and options.decrypt !== false"));
	}
	// make sure we don't lose the fd before we open the actual read stream
	self.reader.ref();
	var buffer = newBuffer(30);
	readAndAssertNoEof(self.reader, buffer, 0, buffer.length, entry.relativeOffsetOfLocalHeader, function (err) {
		try {
			if (err) return callback(err);
			// 0 - Local file header signature = 0x04034b50
			var signature = buffer.readUInt32LE(0);
			if (signature !== 0x04034b50) {
				return callback(new Error("invalid local file header signature: 0x" + signature.toString(16)));
			}
			// all this should be redundant
			// 4 - Version needed to extract (minimum)
			// 6 - General purpose bit flag
			// 8 - Compression method
			// 10 - File last modification time
			// 12 - File last modification date
			// 14 - CRC-32
			// 18 - Compressed size
			// 22 - Uncompressed size
			// 26 - File name length (n)
			var fileNameLength = buffer.readUInt16LE(26);
			// 28 - Extra field length (m)
			var extraFieldLength = buffer.readUInt16LE(28);
			// 30 - File name
			// 30+n - Extra field
			var localFileHeaderEnd = entry.relativeOffsetOfLocalHeader + buffer.length + fileNameLength + extraFieldLength;
			var decompress;
			if (entry.compressionMethod === 0) {
				// 0 - The file is stored (no compression)
				decompress = false;
			} else if (entry.compressionMethod === 8) {
				// 8 - The file is Deflated
				decompress = options.decompress != null ? options.decompress : true;
			} else {
				return callback(new Error("unsupported compression method: " + entry.compressionMethod));
			}
			var fileDataStart = localFileHeaderEnd;
			var fileDataEnd = fileDataStart + entry.compressedSize;
			if (entry.compressedSize !== 0) {
				// bounds check now, because the read streams will probably not complain loud enough.
				// since we're dealing with an unsigned offset plus an unsigned size,
				// we only have 1 thing to check for.
				if (fileDataEnd > self.fileSize) {
					return callback(new Error("file data overflows file bounds: " +
						fileDataStart + " + " + entry.compressedSize + " > " + self.fileSize));
				}
			}
			var readStream = self.reader.createReadStream({
				start: fileDataStart + relativeStart,
				end: fileDataStart + relativeEnd,
			});
			var endpointStream = readStream;
			if (decompress) {
				var destroyed = false;
				var inflateFilter = zlib.createInflateRaw();
				readStream.on("error", function (err) {
					// setImmediate here because errors can be emitted during the first call to pipe()
					setImmediate(function () {
						if (!destroyed) inflateFilter.emit("error", err);
					});
				});
				readStream.pipe(inflateFilter);

				if (self.validateEntrySizes) {
					endpointStream = new AssertByteCountStream(entry.uncompressedSize);
					inflateFilter.on("error", function (err) {
						// forward zlib errors to the client-visible stream
						setImmediate(function () {
							if (!destroyed) endpointStream.emit("error", err);
						});
					});
					inflateFilter.pipe(endpointStream);
				} else {
					// the zlib filter is the client-visible stream
					endpointStream = inflateFilter;
				}
				// this is part of yauzl's API, so implement this function on the client-visible stream
				endpointStream.destroy = function () {
					destroyed = true;
					if (inflateFilter !== endpointStream) inflateFilter.unpipe(endpointStream);
					readStream.unpipe(inflateFilter);
					// TODO: the inflateFilter may cause a memory leak. see Issue #27.
					readStream.destroy();
				};
			}
			callback(null, endpointStream);
		} finally {
			self.reader.unref();
		}
	});
};

function Entry() {
}

Entry.prototype.getLastModDate = function () {
	return dosDateTimeToDate(this.lastModFileDate, this.lastModFileTime);
};
Entry.prototype.isEncrypted = function () {
	return (this.generalPurposeBitFlag & 0x1) !== 0;
};
Entry.prototype.isCompressed = function () {
	return this.compressionMethod === 8;
};

function dosDateTimeToDate(date, time) {
	var day = date & 0x1f; // 1-31
	var month = (date >> 5 & 0xf) - 1; // 1-12, 0-11
	var year = (date >> 9 & 0x7f) + 1980; // 0-128, 1980-2108

	var millisecond = 0;
	var second = (time & 0x1f) * 2; // 0-29, 0-58 (even numbers)
	var minute = time >> 5 & 0x3f; // 0-59
	var hour = time >> 11 & 0x1f; // 0-23

	return new Date(year, month, day, hour, minute, second, millisecond);
}

function validateFileName(fileName) {
	if (fileName.indexOf("\\") !== -1) {
		return "invalid characters in fileName: " + fileName;
	}
	if (/^[a-zA-Z]:/.test(fileName) || /^\//.test(fileName)) {
		return "absolute path: " + fileName;
	}
	if (fileName.split("/").indexOf("..") !== -1) {
		return "invalid relative path: " + fileName;
	}
	// all good
	return null;
}

function readAndAssertNoEof(reader, buffer, offset, length, position, callback) {
	if (length === 0) {
		// fs.read will throw an out-of-bounds error if you try to read 0 bytes from a 0 byte file
		return setImmediate(function () {
			callback(null, newBuffer(0));
		});
	}
	reader.read(buffer, offset, length, position, function (err, bytesRead) {
		if (err) return callback(err);
		if (bytesRead < length) {
			return callback(new Error("unexpected EOF"));
		}
		callback();
	});
}

util.inherits(AssertByteCountStream, Transform);

function AssertByteCountStream(byteCount) {
	Transform.call(this);
	this.actualByteCount = 0;
	this.expectedByteCount = byteCount;
}

AssertByteCountStream.prototype._transform = function (chunk, encoding, cb) {
	this.actualByteCount += chunk.length;
	if (this.actualByteCount > this.expectedByteCount) {
		var msg = "too many bytes in the stream. expected " + this.expectedByteCount + ". got at least " + this.actualByteCount;
		return cb(new Error(msg));
	}
	cb(null, chunk);
};
AssertByteCountStream.prototype._flush = function (cb) {
	if (this.actualByteCount < this.expectedByteCount) {
		var msg = "not enough bytes in the stream. expected " + this.expectedByteCount + ". got only " + this.actualByteCount;
		return cb(new Error(msg));
	}
	cb();
};

util.inherits(RandomAccessReader, EventEmitter);

function RandomAccessReader() {
	EventEmitter.call(this);
	this.refCount = 0;
}

RandomAccessReader.prototype.ref = function () {
	this.refCount += 1;
};
RandomAccessReader.prototype.unref = function () {
	var self = this;
	self.refCount -= 1;

	if (self.refCount > 0) return;
	if (self.refCount < 0) throw new Error("invalid unref");

	self.close(onCloseDone);

	function onCloseDone(err) {
		if (err) return self.emit('error', err);
		self.emit('close');
	}
};
RandomAccessReader.prototype.createReadStream = function (options) {
	var start = options.start;
	var end = options.end;
	if (start === end) {
		var emptyStream = new PassThrough();
		setImmediate(function () {
			emptyStream.end();
		});
		return emptyStream;
	}
	var stream = this._readStreamForRange(start, end);

	var destroyed = false;
	var refUnrefFilter = new RefUnrefFilter(this);
	stream.on("error", function (err) {
		setImmediate(function () {
			if (!destroyed) refUnrefFilter.emit("error", err);
		});
	});
	refUnrefFilter.destroy = function () {
		stream.unpipe(refUnrefFilter);
		refUnrefFilter.unref();
		stream.destroy();
	};

	var byteCounter = new AssertByteCountStream(end - start);
	refUnrefFilter.on("error", function (err) {
		setImmediate(function () {
			if (!destroyed) byteCounter.emit("error", err);
		});
	});
	byteCounter.destroy = function () {
		destroyed = true;
		refUnrefFilter.unpipe(byteCounter);
		refUnrefFilter.destroy();
	};

	return stream.pipe(refUnrefFilter).pipe(byteCounter);
};
RandomAccessReader.prototype._readStreamForRange = function (start, end) {
	throw new Error("not implemented");
};
RandomAccessReader.prototype.read = function (buffer, offset, length, position, callback) {
	var readStream = this.createReadStream({start: position, end: position + length});
	var writeStream = new Writable();
	var written = 0;
	writeStream._write = function (chunk, encoding, cb) {
		chunk.copy(buffer, offset + written, 0, chunk.length);
		written += chunk.length;
		cb();
	};
	writeStream.on("finish", callback);
	readStream.on("error", function (error) {
		callback(error);
	});
	readStream.pipe(writeStream);
};
RandomAccessReader.prototype.close = function (callback) {
	setImmediate(callback);
};

util.inherits(RefUnrefFilter, PassThrough);

function RefUnrefFilter(context) {
	PassThrough.call(this);
	this.context = context;
	this.context.ref();
	this.unreffedYet = false;
}

RefUnrefFilter.prototype._flush = function (cb) {
	this.unref();
	cb();
};
RefUnrefFilter.prototype.unref = function (cb) {
	if (this.unreffedYet) return;
	this.unreffedYet = true;
	this.context.unref();
};

var cp437 = '\u0000☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';

function decodeBuffer(buffer, start, end, isUtf8) {
	if (isUtf8) {
		return buffer.toString("utf8", start, end);
	} else {
		var result = "";
		for (var i = start; i < end; i++) {
			result += cp437[buffer[i]];
		}
		return result;
	}
}

function readUInt64LE(buffer, offset) {
	// there is no native function for this, because we can't actually store 64-bit integers precisely.
	// after 53 bits, JavaScript's Number type (IEEE 754 double) can't store individual integers anymore.
	// but since 53 bits is a whole lot more than 32 bits, we do our best anyway.
	var lower32 = buffer.readUInt32LE(offset);
	var upper32 = buffer.readUInt32LE(offset + 4);
	// we can't use bitshifting here, because JavaScript bitshifting only works on 32-bit integers.
	return upper32 * 0x100000000 + lower32;
	// as long as we're bounds checking the result of this function against the total file size,
	// we'll catch any overflow errors, because we already made sure the total file size was within reason.
}

// Node 10 deprecated new Buffer().
var newBuffer;
if (typeof Buffer.allocUnsafe === "function") {
	newBuffer = function (len) {
		return Buffer.allocUnsafe(len);
	};
} else {
	newBuffer = function (len) {
		return new Buffer(len);
	};
}

function defaultCallback(err) {
	if (err) throw err;
}

}).call(this,require("buffer").Buffer,require("timers").setImmediate)

},{"buffer":false,"buffer-crc32":"buffer-crc32","events":false,"fs":false,"node-fd-slicer":"node-fd-slicer","stream":false,"timers":false,"util":false,"zlib":false}],"yazl":[function(require,module,exports){
(function (Buffer,setImmediate){
var fs = require("fs");
var Transform = require("stream").Transform;
var PassThrough = require("stream").PassThrough;
var zlib = require("zlib");
var util = require("util");
var EventEmitter = require("events").EventEmitter;
var crc32 = require("buffer-crc32");

exports.ZipFile = ZipFile;
exports.dateToDosDateTime = dateToDosDateTime;

util.inherits(ZipFile, EventEmitter);

function ZipFile() {
	this.outputStream = new PassThrough();
	this.entries = [];
	this.outputStreamCursor = 0;
	this.ended = false; // .end() sets this
	this.allDone = false; // set when we've written the last bytes
	this.forceZip64Eocd = false; // configurable in .end()
}

ZipFile.prototype.addFile = function (realPath, metadataPath, options) {
	var self = this;
	metadataPath = validateMetadataPath(metadataPath, false);
	if (options == null) options = {};

	var entry = new Entry(metadataPath, false, options);
	self.entries.push(entry);
	fs.stat(realPath, function (err, stats) {
		if (err) return self.emit("error", err);
		if (!stats.isFile()) return self.emit("error", new Error("not a file: " + realPath));
		entry.uncompressedSize = stats.size;
		if (options.mtime == null) entry.setLastModDate(stats.mtime);
		if (options.mode == null) entry.setFileAttributesMode(stats.mode);
		entry.setFileDataPumpFunction(function () {
			var readStream = fs.createReadStream(realPath);
			entry.state = Entry.FILE_DATA_IN_PROGRESS;
			readStream.on("error", function (err) {
				self.emit("error", err);
			});
			pumpFileDataReadStream(self, entry, readStream);
		});
		pumpEntries(self);
	});
};

ZipFile.prototype.addReadStream = function (readStream, metadataPath, options) {
	var self = this;
	metadataPath = validateMetadataPath(metadataPath, false);
	if (options == null) options = {};
	var entry = new Entry(metadataPath, false, options);
	self.entries.push(entry);
	entry.setFileDataPumpFunction(function () {
		entry.state = Entry.FILE_DATA_IN_PROGRESS;
		pumpFileDataReadStream(self, entry, readStream);
	});
	pumpEntries(self);
};

ZipFile.prototype.addBuffer = function (buffer, metadataPath, options) {
	var self = this;
	metadataPath = validateMetadataPath(metadataPath, false);
	if (buffer.length > 0x3fffffff) throw new Error("buffer too large: " + buffer.length + " > " + 0x3fffffff);
	if (options == null) options = {};
	if (options.size != null) throw new Error("options.size not allowed");
	var entry = new Entry(metadataPath, false, options);
	entry.uncompressedSize = buffer.length;
	entry.crc32 = crc32.unsigned(buffer);
	entry.crcAndFileSizeKnown = true;
	self.entries.push(entry);
	if (!entry.compress) {
		setCompressedBuffer(buffer);
	} else {
		zlib.deflateRaw(buffer, function (err, compressedBuffer) {
			setCompressedBuffer(compressedBuffer);

		});
	}

	function setCompressedBuffer(compressedBuffer) {
		entry.compressedSize = compressedBuffer.length;
		entry.setFileDataPumpFunction(function () {
			writeToOutputStream(self, compressedBuffer);
			writeToOutputStream(self, entry.getDataDescriptor());
			entry.state = Entry.FILE_DATA_DONE;

			// don't call pumpEntries() recursively.
			// (also, don't call process.nextTick recursively.)
			setImmediate(function () {
				pumpEntries(self);
			});
		});
		pumpEntries(self);
	}
};


ZipFile.prototype.addEmptyDirectory = function (metadataPath, options) {
	var self = this;
	metadataPath = validateMetadataPath(metadataPath, true);
	if (options == null) options = {};
	if (options.size != null) throw new Error("options.size not allowed");
	if (options.compress != null) throw new Error("options.compress not allowed");
	var entry = new Entry(metadataPath, true, options);
	self.entries.push(entry);
	entry.setFileDataPumpFunction(function () {
		writeToOutputStream(self, entry.getDataDescriptor());
		entry.state = Entry.FILE_DATA_DONE;
		pumpEntries(self);
	});
	pumpEntries(self);
};

ZipFile.prototype.end = function (options, finalSizeCallback) {
	if (typeof options === "function") {
		finalSizeCallback = options;
		options = null;
	}
	if (options == null) options = {};
	if (this.ended) return;
	this.ended = true;
	this.finalSizeCallback = finalSizeCallback;
	this.forceZip64Eocd = !!options.forceZip64Format;
	pumpEntries(this);
};

function writeToOutputStream(self, buffer) {
	self.outputStream.write(buffer);
	self.outputStreamCursor += buffer.length;
}

function pumpFileDataReadStream(self, entry, readStream) {
	var crc32Watcher = new Crc32Watcher();
	var uncompressedSizeCounter = new ByteCounter();
	var compressor = entry.compress ? new zlib.DeflateRaw() : new PassThrough();
	var compressedSizeCounter = new ByteCounter();
	readStream.pipe(crc32Watcher)
		.pipe(uncompressedSizeCounter)
		.pipe(compressor)
		.pipe(compressedSizeCounter)
		.pipe(self.outputStream, {end: false});
	compressedSizeCounter.on("end", function () {
		entry.crc32 = crc32Watcher.crc32;
		if (entry.uncompressedSize == null) {
			entry.uncompressedSize = uncompressedSizeCounter.byteCount;
		} else {
			if (entry.uncompressedSize !== uncompressedSizeCounter.byteCount) return self.emit("error", new Error("file data stream has unexpected number of bytes"));
		}
		entry.compressedSize = compressedSizeCounter.byteCount;
		self.outputStreamCursor += entry.compressedSize;
		writeToOutputStream(self, entry.getDataDescriptor());
		entry.state = Entry.FILE_DATA_DONE;
		pumpEntries(self);
	});
}

function pumpEntries(self) {
	if (self.allDone) return;
	// first check if finalSize is finally known
	if (self.ended && self.finalSizeCallback != null) {
		var finalSize = calculateFinalSize(self);
		if (finalSize != null) {
			// we have an answer
			self.finalSizeCallback(finalSize);
			self.finalSizeCallback = null;
		}
	}

	// pump entries
	var entry = getFirstNotDoneEntry();

	function getFirstNotDoneEntry() {
		for (var i = 0; i < self.entries.length; i++) {
			var entry = self.entries[i];
			if (entry.state < Entry.FILE_DATA_DONE) return entry;
		}
		return null;
	}

	if (entry != null) {
		// this entry is not done yet
		if (entry.state < Entry.READY_TO_PUMP_FILE_DATA) return; // input file not open yet
		if (entry.state === Entry.FILE_DATA_IN_PROGRESS) return; // we'll get there
		// start with local file header
		entry.relativeOffsetOfLocalHeader = self.outputStreamCursor;
		var localFileHeader = entry.getLocalFileHeader();
		writeToOutputStream(self, localFileHeader);
		entry.doFileDataPump();
	} else {
		// all cought up on writing entries
		if (self.ended) {
			// head for the exit
			self.offsetOfStartOfCentralDirectory = self.outputStreamCursor;
			self.entries.forEach(function (entry) {
				var centralDirectoryRecord = entry.getCentralDirectoryRecord();
				writeToOutputStream(self, centralDirectoryRecord);
			});
			writeToOutputStream(self, getEndOfCentralDirectoryRecord(self));
			self.outputStream.end();
			self.allDone = true;
		}
	}
}

function calculateFinalSize(self) {
	var pretendOutputCursor = 0;
	var centralDirectorySize = 0;
	for (var i = 0; i < self.entries.length; i++) {
		var entry = self.entries[i];
		// compression is too hard to predict
		if (entry.compress) return -1;
		if (entry.state >= Entry.READY_TO_PUMP_FILE_DATA) {
			// if addReadStream was called without providing the size, we can't predict the final size
			if (entry.uncompressedSize == null) return -1;
		} else {
			// if we're still waiting for fs.stat, we might learn the size someday
			if (entry.uncompressedSize == null) return null;
		}
		// we know this for sure, and this is important to know if we need ZIP64 format.
		entry.relativeOffsetOfLocalHeader = pretendOutputCursor;
		var useZip64Format = entry.useZip64Format();

		pretendOutputCursor += LOCAL_FILE_HEADER_FIXED_SIZE + entry.utf8FileName.length;
		pretendOutputCursor += entry.uncompressedSize;
		if (!entry.crcAndFileSizeKnown) {
			// use a data descriptor
			if (useZip64Format) {
				pretendOutputCursor += ZIP64_DATA_DESCRIPTOR_SIZE;
			} else {
				pretendOutputCursor += DATA_DESCRIPTOR_SIZE;
			}
		}

		centralDirectorySize += CENTRAL_DIRECTORY_RECORD_FIXED_SIZE + entry.utf8FileName.length;
		if (useZip64Format) {
			centralDirectorySize += ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE;
		}
	}

	var endOfCentralDirectorySize = 0;
	if (self.forceZip64Eocd ||
		self.entries.length >= 0xffff ||
		centralDirectorySize >= 0xffff ||
		pretendOutputCursor >= 0xffffffff) {
		// use zip64 end of central directory stuff
		endOfCentralDirectorySize += ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE + ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE;
	}
	endOfCentralDirectorySize += END_OF_CENTRAL_DIRECTORY_RECORD_SIZE;
	return pretendOutputCursor + centralDirectorySize + endOfCentralDirectorySize;
}

var ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE = 56;
var ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE = 20;
var END_OF_CENTRAL_DIRECTORY_RECORD_SIZE = 22;

function getEndOfCentralDirectoryRecord(self, actuallyJustTellMeHowLongItWouldBe) {
	var needZip64Format = false;
	var normalEntriesLength = self.entries.length;
	if (self.forceZip64Eocd || self.entries.length >= 0xffff) {
		normalEntriesLength = 0xffff;
		needZip64Format = true;
	}
	var sizeOfCentralDirectory = self.outputStreamCursor - self.offsetOfStartOfCentralDirectory;
	var normalSizeOfCentralDirectory = sizeOfCentralDirectory;
	if (self.forceZip64Eocd || sizeOfCentralDirectory >= 0xffffffff) {
		normalSizeOfCentralDirectory = 0xffffffff;
		needZip64Format = true;
	}
	var normalOffsetOfStartOfCentralDirectory = self.offsetOfStartOfCentralDirectory;
	if (self.forceZip64Eocd || self.offsetOfStartOfCentralDirectory >= 0xffffffff) {
		normalOffsetOfStartOfCentralDirectory = 0xffffffff;
		needZip64Format = true;
	}
	if (actuallyJustTellMeHowLongItWouldBe) {
		if (needZip64Format) {
			return (
				ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE +
				ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE +
				END_OF_CENTRAL_DIRECTORY_RECORD_SIZE
			);
		} else {
			return END_OF_CENTRAL_DIRECTORY_RECORD_SIZE;
		}
	}

	var eocdrBuffer = new Buffer(END_OF_CENTRAL_DIRECTORY_RECORD_SIZE);
	// end of central dir signature                       4 bytes  (0x06054b50)
	eocdrBuffer.writeUInt32LE(0x06054b50, 0);
	// number of this disk                                2 bytes
	eocdrBuffer.writeUInt16LE(0, 4);
	// number of the disk with the start of the central directory  2 bytes
	eocdrBuffer.writeUInt16LE(0, 6);
	// total number of entries in the central directory on this disk  2 bytes
	eocdrBuffer.writeUInt16LE(normalEntriesLength, 8);
	// total number of entries in the central directory   2 bytes
	eocdrBuffer.writeUInt16LE(normalEntriesLength, 10);
	// size of the central directory                      4 bytes
	eocdrBuffer.writeUInt32LE(normalSizeOfCentralDirectory, 12);
	// offset of start of central directory with respect to the starting disk number  4 bytes
	eocdrBuffer.writeUInt32LE(normalOffsetOfStartOfCentralDirectory, 16);
	// .ZIP file comment length                           2 bytes
	eocdrBuffer.writeUInt16LE(0, 20);
	// .ZIP file comment                                  (variable size)
	// no comment

	if (!needZip64Format) return eocdrBuffer;

	// ZIP64 format
	// ZIP64 End of Central Directory Record
	var zip64EocdrBuffer = new Buffer(ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE);
	// zip64 end of central dir signature                                             4 bytes  (0x06064b50)
	zip64EocdrBuffer.writeUInt32LE(0x06064b50, 0);
	// size of zip64 end of central directory record                                  8 bytes
	writeUInt64LE(zip64EocdrBuffer, ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE - 12, 4);
	// version made by                                                                2 bytes
	zip64EocdrBuffer.writeUInt16LE(VERSION_MADE_BY, 12);
	// version needed to extract                                                      2 bytes
	zip64EocdrBuffer.writeUInt16LE(VERSION_NEEDED_TO_EXTRACT_ZIP64, 14);
	// number of this disk                                                            4 bytes
	zip64EocdrBuffer.writeUInt32LE(0, 16);
	// number of the disk with the start of the central directory                     4 bytes
	zip64EocdrBuffer.writeUInt32LE(0, 20);
	// total number of entries in the central directory on this disk                  8 bytes
	writeUInt64LE(zip64EocdrBuffer, self.entries.length, 24);
	// total number of entries in the central directory                               8 bytes
	writeUInt64LE(zip64EocdrBuffer, self.entries.length, 32);
	// size of the central directory                                                  8 bytes
	writeUInt64LE(zip64EocdrBuffer, sizeOfCentralDirectory, 40);
	// offset of start of central directory with respect to the starting disk number  8 bytes
	writeUInt64LE(zip64EocdrBuffer, self.offsetOfStartOfCentralDirectory, 48);
	// zip64 extensible data sector                                                   (variable size)
	// nothing in the zip64 extensible data sector


	// ZIP64 End of Central Directory Locator
	var zip64EocdlBuffer = new Buffer(ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE);
	// zip64 end of central dir locator signature                               4 bytes  (0x07064b50)
	zip64EocdlBuffer.writeUInt32LE(0x07064b50, 0);
	// number of the disk with the start of the zip64 end of central directory  4 bytes
	zip64EocdlBuffer.writeUInt32LE(0, 4);
	// relative offset of the zip64 end of central directory record             8 bytes
	writeUInt64LE(zip64EocdlBuffer, self.outputStreamCursor, 8);
	// total number of disks                                                    4 bytes
	zip64EocdlBuffer.writeUInt32LE(1, 16);


	return Buffer.concat([
		zip64EocdrBuffer,
		zip64EocdlBuffer,
		eocdrBuffer,
	]);
}

function validateMetadataPath(metadataPath, isDirectory) {
	if (metadataPath === "") throw new Error("empty metadataPath");
	metadataPath = metadataPath.replace(/\\/g, "/");
	if (/^[a-zA-Z]:/.test(metadataPath) || /^\//.test(metadataPath)) throw new Error("absolute path: " + metadataPath);
	if (metadataPath.split("/").indexOf("..") !== -1) throw new Error("invalid relative path: " + metadataPath);
	var looksLikeDirectory = /\/$/.test(metadataPath);
	if (isDirectory) {
		// append a trailing '/' if necessary.
		if (!looksLikeDirectory) metadataPath += "/";
	} else {
		if (looksLikeDirectory) throw new Error("file path cannot end with '/': " + metadataPath);
	}
	return metadataPath;
}

var defaultFileMode = parseInt("0100664", 8);
var defaultDirectoryMode = parseInt("040775", 8);

// this class is not part of the public API
function Entry(metadataPath, isDirectory, options) {
	this.utf8FileName = new Buffer(metadataPath);
	if (this.utf8FileName.length > 0xffff) throw new Error("utf8 file name too long. " + utf8FileName.length + " > " + 0xffff);
	this.isDirectory = isDirectory;
	this.state = Entry.WAITING_FOR_METADATA;
	this.setLastModDate(options.mtime != null ? options.mtime : new Date());
	if (options.mode != null) {
		this.setFileAttributesMode(options.mode);
	} else {
		this.setFileAttributesMode(isDirectory ? defaultDirectoryMode : defaultFileMode);
	}
	if (isDirectory) {
		this.crcAndFileSizeKnown = true;
		this.crc32 = 0;
		this.uncompressedSize = 0;
		this.compressedSize = 0;
	} else {
		// unknown so far
		this.crcAndFileSizeKnown = false;
		this.crc32 = null;
		this.uncompressedSize = null;
		this.compressedSize = null;
		if (options.size != null) this.uncompressedSize = options.size;
	}
	if (isDirectory) {
		this.compress = false;
	} else {
		this.compress = true; // default
		if (options.compress != null) this.compress = !!options.compress;
	}
	this.forceZip64Format = !!options.forceZip64Format;
}

Entry.WAITING_FOR_METADATA = 0;
Entry.READY_TO_PUMP_FILE_DATA = 1;
Entry.FILE_DATA_IN_PROGRESS = 2;
Entry.FILE_DATA_DONE = 3;
Entry.prototype.setLastModDate = function (date) {
	var dosDateTime = dateToDosDateTime(date);
	this.lastModFileTime = dosDateTime.time;
	this.lastModFileDate = dosDateTime.date;
};
Entry.prototype.setFileAttributesMode = function (mode) {
	if ((mode & 0xffff) !== mode) throw new Error("invalid mode. expected: 0 <= " + mode + " <= " + 0xffff);
	// http://unix.stackexchange.com/questions/14705/the-zip-formats-external-file-attribute/14727#14727
	this.externalFileAttributes = (mode << 16) >>> 0;
};
// doFileDataPump() should not call pumpEntries() directly. see issue #9.
Entry.prototype.setFileDataPumpFunction = function (doFileDataPump) {
	this.doFileDataPump = doFileDataPump;
	this.state = Entry.READY_TO_PUMP_FILE_DATA;
};
Entry.prototype.useZip64Format = function () {
	return (
		(this.forceZip64Format) ||
		(this.uncompressedSize != null && this.uncompressedSize > 0xfffffffe) ||
		(this.compressedSize != null && this.compressedSize > 0xfffffffe) ||
		(this.relativeOffsetOfLocalHeader != null && this.relativeOffsetOfLocalHeader > 0xfffffffe)
	);
}
var LOCAL_FILE_HEADER_FIXED_SIZE = 30;
var VERSION_NEEDED_TO_EXTRACT_UTF8 = 20;
var VERSION_NEEDED_TO_EXTRACT_ZIP64 = 45;
// 3 = unix. 63 = spec version 6.3
var VERSION_MADE_BY = (3 << 8) | 63;
var FILE_NAME_IS_UTF8 = 1 << 11;
var UNKNOWN_CRC32_AND_FILE_SIZES = 1 << 3;
Entry.prototype.getLocalFileHeader = function () {
	var crc32 = 0;
	var compressedSize = 0;
	var uncompressedSize = 0;
	if (this.crcAndFileSizeKnown) {
		crc32 = this.crc32;
		compressedSize = this.compressedSize;
		uncompressedSize = this.uncompressedSize;
	}

	var fixedSizeStuff = new Buffer(LOCAL_FILE_HEADER_FIXED_SIZE);
	var generalPurposeBitFlag = FILE_NAME_IS_UTF8;
	if (!this.crcAndFileSizeKnown) generalPurposeBitFlag |= UNKNOWN_CRC32_AND_FILE_SIZES;

	// local file header signature     4 bytes  (0x04034b50)
	fixedSizeStuff.writeUInt32LE(0x04034b50, 0);
	// version needed to extract       2 bytes
	fixedSizeStuff.writeUInt16LE(VERSION_NEEDED_TO_EXTRACT_UTF8, 4);
	// general purpose bit flag        2 bytes
	fixedSizeStuff.writeUInt16LE(generalPurposeBitFlag, 6);
	// compression method              2 bytes
	fixedSizeStuff.writeUInt16LE(this.getCompressionMethod(), 8);
	// last mod file time              2 bytes
	fixedSizeStuff.writeUInt16LE(this.lastModFileTime, 10);
	// last mod file date              2 bytes
	fixedSizeStuff.writeUInt16LE(this.lastModFileDate, 12);
	// crc-32                          4 bytes
	fixedSizeStuff.writeUInt32LE(crc32, 14);
	// compressed size                 4 bytes
	fixedSizeStuff.writeUInt32LE(compressedSize, 18);
	// uncompressed size               4 bytes
	fixedSizeStuff.writeUInt32LE(uncompressedSize, 22);
	// file name length                2 bytes
	fixedSizeStuff.writeUInt16LE(this.utf8FileName.length, 26);
	// extra field length              2 bytes
	fixedSizeStuff.writeUInt16LE(0, 28);
	return Buffer.concat([
		fixedSizeStuff,
		// file name (variable size)
		this.utf8FileName,
		// extra field (variable size)
		// no extra fields
	]);
};
var DATA_DESCRIPTOR_SIZE = 16;
var ZIP64_DATA_DESCRIPTOR_SIZE = 24;
Entry.prototype.getDataDescriptor = function () {
	if (this.crcAndFileSizeKnown) {
		// the Mac Archive Utility requires this not be present unless we set general purpose bit 3
		return new Buffer(0);
	}
	if (!this.useZip64Format()) {
		var buffer = new Buffer(DATA_DESCRIPTOR_SIZE);
		// optional signature (required according to Archive Utility)
		buffer.writeUInt32LE(0x08074b50, 0);
		// crc-32                          4 bytes
		buffer.writeUInt32LE(this.crc32, 4);
		// compressed size                 4 bytes
		buffer.writeUInt32LE(this.compressedSize, 8);
		// uncompressed size               4 bytes
		buffer.writeUInt32LE(this.uncompressedSize, 12);
		return buffer;
	} else {
		// ZIP64 format
		var buffer = new Buffer(ZIP64_DATA_DESCRIPTOR_SIZE);
		// optional signature (unknown if anyone cares about this)
		buffer.writeUInt32LE(0x08074b50, 0);
		// crc-32                          4 bytes
		buffer.writeUInt32LE(this.crc32, 4);
		// compressed size                 8 bytes
		writeUInt64LE(buffer, this.compressedSize, 8);
		// uncompressed size               8 bytes
		writeUInt64LE(buffer, this.uncompressedSize, 16);
		return buffer;
	}
};
var CENTRAL_DIRECTORY_RECORD_FIXED_SIZE = 46;
var ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE = 28;
Entry.prototype.getCentralDirectoryRecord = function () {
	var fixedSizeStuff = new Buffer(CENTRAL_DIRECTORY_RECORD_FIXED_SIZE);
	var generalPurposeBitFlag = FILE_NAME_IS_UTF8;
	if (!this.crcAndFileSizeKnown) generalPurposeBitFlag |= UNKNOWN_CRC32_AND_FILE_SIZES;

	var normalCompressedSize = this.compressedSize;
	var normalUncompressedSize = this.uncompressedSize;
	var normalRelativeOffsetOfLocalHeader = this.relativeOffsetOfLocalHeader;
	var versionNeededToExtract;
	var zeiefBuffer;
	if (this.useZip64Format()) {
		normalCompressedSize = 0xffffffff;
		normalUncompressedSize = 0xffffffff;
		normalRelativeOffsetOfLocalHeader = 0xffffffff;
		versionNeededToExtract = VERSION_NEEDED_TO_EXTRACT_ZIP64;

		// ZIP64 extended information extra field
		zeiefBuffer = new Buffer(ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE);
		// 0x0001                  2 bytes    Tag for this "extra" block type
		zeiefBuffer.writeUInt16LE(0x0001, 0);
		// Size                    2 bytes    Size of this "extra" block
		zeiefBuffer.writeUInt16LE(ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE - 4, 2);
		// Original Size           8 bytes    Original uncompressed file size
		writeUInt64LE(zeiefBuffer, this.uncompressedSize, 4);
		// Compressed Size         8 bytes    Size of compressed data
		writeUInt64LE(zeiefBuffer, this.compressedSize, 12);
		// Relative Header Offset  8 bytes    Offset of local header record
		writeUInt64LE(zeiefBuffer, this.relativeOffsetOfLocalHeader, 20);
		// Disk Start Number       4 bytes    Number of the disk on which this file starts
		// (omit)
	} else {
		versionNeededToExtract = VERSION_NEEDED_TO_EXTRACT_UTF8;
		zeiefBuffer = new Buffer(0);
	}

	// central file header signature   4 bytes  (0x02014b50)
	fixedSizeStuff.writeUInt32LE(0x02014b50, 0);
	// version made by                 2 bytes
	fixedSizeStuff.writeUInt16LE(VERSION_MADE_BY, 4);
	// version needed to extract       2 bytes
	fixedSizeStuff.writeUInt16LE(versionNeededToExtract, 6);
	// general purpose bit flag        2 bytes
	fixedSizeStuff.writeUInt16LE(generalPurposeBitFlag, 8);
	// compression method              2 bytes
	fixedSizeStuff.writeUInt16LE(this.getCompressionMethod(), 10);
	// last mod file time              2 bytes
	fixedSizeStuff.writeUInt16LE(this.lastModFileTime, 12);
	// last mod file date              2 bytes
	fixedSizeStuff.writeUInt16LE(this.lastModFileDate, 14);
	// crc-32                          4 bytes
	fixedSizeStuff.writeUInt32LE(this.crc32, 16);
	// compressed size                 4 bytes
	fixedSizeStuff.writeUInt32LE(normalCompressedSize, 20);
	// uncompressed size               4 bytes
	fixedSizeStuff.writeUInt32LE(normalUncompressedSize, 24);
	// file name length                2 bytes
	fixedSizeStuff.writeUInt16LE(this.utf8FileName.length, 28);
	// extra field length              2 bytes
	fixedSizeStuff.writeUInt16LE(zeiefBuffer.length, 30);
	// file comment length             2 bytes
	fixedSizeStuff.writeUInt16LE(0, 32);
	// disk number start               2 bytes
	fixedSizeStuff.writeUInt16LE(0, 34);
	// internal file attributes        2 bytes
	fixedSizeStuff.writeUInt16LE(0, 36);
	// external file attributes        4 bytes
	fixedSizeStuff.writeUInt32LE(this.externalFileAttributes, 38);
	// relative offset of local header 4 bytes
	fixedSizeStuff.writeUInt32LE(normalRelativeOffsetOfLocalHeader, 42);

	return Buffer.concat([
		fixedSizeStuff,
		// file name (variable size)
		this.utf8FileName,
		// extra field (variable size)
		zeiefBuffer,
		// file comment (variable size)
		// empty comment
	]);
};
Entry.prototype.getCompressionMethod = function () {
	var NO_COMPRESSION = 0;
	var DEFLATE_COMPRESSION = 8;
	return this.compress ? DEFLATE_COMPRESSION : NO_COMPRESSION;
};

function dateToDosDateTime(jsDate) {
	var date = 0;
	date |= jsDate.getDate() & 0x1f; // 1-31
	date |= ((jsDate.getMonth() + 1) & 0xf) << 5; // 0-11, 1-12
	date |= ((jsDate.getFullYear() - 1980) & 0x7f) << 9; // 0-128, 1980-2108

	var time = 0;
	time |= Math.floor(jsDate.getSeconds() / 2); // 0-59, 0-29 (lose odd numbers)
	time |= (jsDate.getMinutes() & 0x3f) << 5; // 0-59
	time |= (jsDate.getHours() & 0x1f) << 11; // 0-23

	return {date: date, time: time};
}

function writeUInt64LE(buffer, n, offset) {
	// can't use bitshift here, because JavaScript only allows bitshiting on 32-bit integers.
	var high = Math.floor(n / 0x100000000);
	var low = n % 0x100000000;
	buffer.writeUInt32LE(low, offset);
	buffer.writeUInt32LE(high, offset + 4);
}

function defaultCallback(err) {
	if (err) throw err;
}

util.inherits(ByteCounter, Transform);

function ByteCounter(options) {
	Transform.call(this, options);
	this.byteCount = 0;
}

ByteCounter.prototype._transform = function (chunk, encoding, cb) {
	this.byteCount += chunk.length;
	cb(null, chunk);
};

util.inherits(Crc32Watcher, Transform);

function Crc32Watcher(options) {
	Transform.call(this, options);
	this.crc32 = 0;
}

Crc32Watcher.prototype._transform = function (chunk, encoding, cb) {
	this.crc32 = crc32.unsigned(chunk, this.crc32);
	cb(null, chunk);
};
}).call(this,require("buffer").Buffer,require("timers").setImmediate)

},{"buffer":false,"buffer-crc32":"buffer-crc32","events":false,"fs":false,"stream":false,"timers":false,"util":false,"zlib":false}]},{},["/home/privatesky/builds/tmp/psknode_intermediar.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZHMvdG1wL3Bza25vZGVfaW50ZXJtZWRpYXIuanMiLCJsaWJyYXJpZXMvZG9tYWluQmFzZS9kb21haW5QdWJTdWIuanMiLCJtb2R1bGVzL2Jhci9saWIvQXJjaGl2ZS5qcyIsIm1vZHVsZXMvYmFyL2xpYi9BcmNoaXZlQ29uZmlndXJhdG9yLmpzIiwibW9kdWxlcy9iYXIvbGliL0JyaWNrLmpzIiwibW9kdWxlcy9iYXIvbGliL0ZpbGVCYXJNYXAuanMiLCJtb2R1bGVzL2Jhci9saWIvRmlsZUJyaWNrU3RvcmFnZS5qcyIsIm1vZHVsZXMvYmFyL2xpYi9Gb2xkZXJCYXJNYXAuanMiLCJtb2R1bGVzL2Jhci9saWIvRm9sZGVyQnJpY2tTdG9yYWdlLmpzIiwibW9kdWxlcy9iYXIvbGliL0ZzQmFyV29ya2VyLmpzIiwibW9kdWxlcy9iYXIvdXRpbHMvQXN5bmNEaXNwYXRjaGVyLmpzIiwibW9kdWxlcy9iYXIvdXRpbHMvaXNTdHJlYW0uanMiLCJtb2R1bGVzL2NzYi9mbG93cy9hZGRCYWNrdXAuanMiLCJtb2R1bGVzL2NzYi9mbG93cy9hZGRDc2IuanMiLCJtb2R1bGVzL2NzYi9mbG93cy9hdHRhY2hGaWxlLmpzIiwibW9kdWxlcy9jc2IvZmxvd3MvY3JlYXRlQ3NiLmpzIiwibW9kdWxlcy9jc2IvZmxvd3MvZXh0cmFjdEZpbGUuanMiLCJtb2R1bGVzL2NzYi9mbG93cy9pbmRleC5qcyIsIm1vZHVsZXMvY3NiL2Zsb3dzL2xpc3RDU0JzLmpzIiwibW9kdWxlcy9jc2IvZmxvd3MvcmVjZWl2ZS5qcyIsIm1vZHVsZXMvY3NiL2Zsb3dzL3Jlc2V0UGluLmpzIiwibW9kdWxlcy9jc2IvZmxvd3MvcmVzdG9yZS5qcyIsIm1vZHVsZXMvY3NiL2Zsb3dzL3NhdmVCYWNrdXAuanMiLCJtb2R1bGVzL2NzYi9mbG93cy9zZXRQaW4uanMiLCJtb2R1bGVzL2NzYi9saWIvQmFja3VwRW5naW5lLmpzIiwibW9kdWxlcy9jc2IvbGliL0NTQklkZW50aWZpZXIuanMiLCJtb2R1bGVzL2NzYi9saWIvSGVhZGVyLmpzIiwibW9kdWxlcy9jc2IvbGliL0hlYWRlcnNIaXN0b3J5LmpzIiwibW9kdWxlcy9jc2IvbGliL1Jhd0NTQi5qcyIsIm1vZHVsZXMvY3NiL2xpYi9Sb290Q1NCLmpzIiwibW9kdWxlcy9jc2IvbGliL2JhY2t1cFJlc29sdmVycy9FVkZTUmVzb2x2ZXIuanMiLCJtb2R1bGVzL2NzYi91dGlscy9Bc3luY0Rpc3BhdGNoZXIuanMiLCJtb2R1bGVzL2NzYi91dGlscy9Ec2VlZENhZ2UuanMiLCJtb2R1bGVzL2NzYi91dGlscy9IYXNoQ2FnZS5qcyIsIm1vZHVsZXMvY3NiL3V0aWxzL2Zsb3dzVXRpbHMuanMiLCJtb2R1bGVzL2NzYi91dGlscy91dGlscy5qcyIsIm1vZHVsZXMvY3NiL3V0aWxzL3ZhbGlkYXRvci5qcyIsIm1vZHVsZXMvZWRmcy1icmljay1zdG9yYWdlL0VERlNCcmlja1N0b3JhZ2UuanMiLCJtb2R1bGVzL2VkZnMvZmxvd3MvQnJpY2tzTWFuYWdlci5qcyIsIm1vZHVsZXMvZWRmcy9saWIvRURGU01pZGRsZXdhcmUuanMiLCJtb2R1bGVzL2VkZnMvdXRpbHMvQXN5bmNEaXNwYXRjaGVyLmpzIiwibW9kdWxlcy9mb2xkZXJtcS9saWIvZm9sZGVyTVEuanMiLCJtb2R1bGVzL2ludGVyYWN0L2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9Tb3VuZFB1YlN1Yk1RQmFzZWRJbnRlcmFjdGlvblNwYWNlLmpzIiwibW9kdWxlcy9pbnRlcmFjdC9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvV2ViVmlld01RSW50ZXJhY3Rpb25TcGFjZS5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1dpbmRvd01RSW50ZXJhY3Rpb25TcGFjZS5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL2ZvbGRlck1RQmFzZWRJbnRlcmFjdGlvblNwYWNlLmpzIiwibW9kdWxlcy9pbnRlcmFjdC9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvaHR0cEludGVyYWN0aW9uU3BhY2UuanMiLCJtb2R1bGVzL2ludGVyYWN0L2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9zcGVjaWZpY01RSW1wbC9DaGlsZFdlYlZpZXdNUS5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL3NwZWNpZmljTVFJbXBsL0NoaWxkV25kTVEuanMiLCJtb2R1bGVzL2ludGVyYWN0L2xpYi9zd2FybUludGVyYWN0aW9uLmpzIiwibW9kdWxlcy9ub2RlLWZkLXNsaWNlci9tb2R1bGVzL25vZGUtcGVuZC9pbmRleC5qcyIsIm1vZHVsZXMvcHNrLWh0dHAtY2xpZW50L2xpYi9wc2stYWJzdHJhY3QtY2xpZW50LmpzIiwibW9kdWxlcy9wc2staHR0cC1jbGllbnQvbGliL3Bzay1icm93c2VyLWNsaWVudC5qcyIsIm1vZHVsZXMvcHNrLWh0dHAtY2xpZW50L2xpYi9wc2stbm9kZS1jbGllbnQuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9CbG9ja2NoYWluLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvRm9sZGVyUGVyc2lzdGVudFBEUy5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL0luTWVtb3J5UERTLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvUGVyc2lzdGVudFBEUy5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9BQ0xTY29wZS5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9BZ2VudC5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9CYWNrdXAuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9kb21haW4vQ1NCTWV0YS5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9DU0JSZWZlcmVuY2UuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9kb21haW4vRG9tYWluUmVmZXJlbmNlLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0VtYmVkZGVkRmlsZS5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9GaWxlUmVmZXJlbmNlLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0tleS5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9pbmRleC5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi90cmFuc2FjdGlvbnMuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9zd2FybXMvYWdlbnRzU3dhcm0uanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9zd2FybXMvZG9tYWluU3dhcm1zLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvc3dhcm1zL2luZGV4LmpzIiwibW9kdWxlcy9wc2tkYi9saWIvc3dhcm1zL3NoYXJlZFBoYXNlcy5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9DU0JDYWNoZS5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9DU0JJZGVudGlmaWVyLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvbGlicmFyaWVzL1Jhd0NTQi5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9Sb290Q1NCLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvbGlicmFyaWVzL2Zsb3dzL2FkZEJhY2t1cC5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9mbG93cy9hZGRDc2IuanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvZmxvd3MvYXR0YWNoRmlsZS5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9mbG93cy9jcmVhdGVDc2IuanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvZmxvd3MvZXh0cmFjdEZpbGUuanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvZmxvd3MvbGlzdENTQnMuanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvZmxvd3MvcmVzZXRQaW4uanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvZmxvd3MvcmVzdG9yZS5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9mbG93cy9zYXZlQmFja3VwLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvbGlicmFyaWVzL2Zsb3dzL3NldFBpbi5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L3V0aWxzL0RzZWVkQ2FnZS5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L3V0aWxzL2Zsb3dzVXRpbHMuanMiLCJtb2R1bGVzL3Bza3dhbGxldC91dGlscy92YWxpZGF0b3IuanMiLCJtb2R1bGVzL3NpZ25zZW5zdXMvbGliL2NvbnNVdGlsLmpzIiwibm9kZV9tb2R1bGVzL2lzLWJ1ZmZlci9pbmRleC5qcyIsInBza25vZGUvY29yZS9zYW5kYm94ZXMvdXRpbC9TYW5kQm94TWFuYWdlci5qcyIsInBza25vZGUvY29yZS91dGlscy9leGl0SGFuZGxlci5qcyIsIm1vZHVsZXMvYmFyL2luZGV4LmpzIiwibW9kdWxlcy9idWZmZXItY3JjMzIvaW5kZXguanMiLCJtb2R1bGVzL2NzYi9pbmRleC5qcyIsImxpYnJhcmllcy9kb21haW5CYXNlL2luZGV4LmpzIiwibW9kdWxlcy9lZGZzLWJyaWNrLXN0b3JhZ2UvaW5kZXguanMiLCJtb2R1bGVzL2VkZnMvaW5kZXguanMiLCJtb2R1bGVzL2ZvbGRlcm1xL2luZGV4LmpzIiwibW9kdWxlcy9pbnRlcmFjdC9pbmRleC5qcyIsIm1vZHVsZXMvbm9kZS1mZC1zbGljZXIvaW5kZXguanMiLCJtb2R1bGVzL3Bzay1odHRwLWNsaWVudC9pbmRleC5qcyIsIm1vZHVsZXMvcHNrZGIvaW5kZXguanMiLCJtb2R1bGVzL3Bza3dhbGxldC9pbmRleC5qcyIsIm1vZHVsZXMvc2lnbnNlbnN1cy9saWIvaW5kZXguanMiLCJtb2R1bGVzL3lhdXpsL2luZGV4LmpzIiwibW9kdWxlcy95YXpsL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzdYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3RQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDak1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuYUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7OztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeFNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBOzs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDenlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiZ2xvYmFsLnBza25vZGVMb2FkTW9kdWxlcyA9IGZ1bmN0aW9uKCl7IFxuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wieWF6bFwiXSA9IHJlcXVpcmUoXCJ5YXpsXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wieWF1emxcIl0gPSByZXF1aXJlKFwieWF1emxcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJwc2t3YWxsZXRcIl0gPSByZXF1aXJlKFwicHNrd2FsbGV0XCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wic2lnbnNlbnN1c1wiXSA9IHJlcXVpcmUoXCJzaWduc2Vuc3VzXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wiZm9sZGVybXFcIl0gPSByZXF1aXJlKFwiZm9sZGVybXFcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJwc2tkYlwiXSA9IHJlcXVpcmUoXCJwc2tkYlwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImJ1ZmZlci1jcmMzMlwiXSA9IHJlcXVpcmUoXCJidWZmZXItY3JjMzJcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJub2RlLWZkLXNsaWNlclwiXSA9IHJlcXVpcmUoXCJub2RlLWZkLXNsaWNlclwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImludGVyYWN0XCJdID0gcmVxdWlyZShcImludGVyYWN0XCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wicHNrLWh0dHAtY2xpZW50XCJdID0gcmVxdWlyZShcInBzay1odHRwLWNsaWVudFwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImVkZnNcIl0gPSByZXF1aXJlKFwiZWRmc1wiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImJhclwiXSA9IHJlcXVpcmUoXCJiYXJcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJjc2JcIl0gPSByZXF1aXJlKFwiY3NiXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wiZWRmcy1icmljay1zdG9yYWdlXCJdID0gcmVxdWlyZShcImVkZnMtYnJpY2stc3RvcmFnZVwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImRvbWFpbkJhc2VcIl0gPSByZXF1aXJlKFwiZG9tYWluQmFzZVwiKTtcbn1cbmlmIChmYWxzZSkge1xuXHRwc2tub2RlTG9hZE1vZHVsZXMoKTtcbn07IFxuZ2xvYmFsLnBza25vZGVSZXF1aXJlID0gcmVxdWlyZTtcbmlmICh0eXBlb2YgJCQgIT09IFwidW5kZWZpbmVkXCIpIHsgICAgICAgICAgICBcbiAgICAkJC5yZXF1aXJlQnVuZGxlKFwicHNrbm9kZVwiKTtcbn07IiwidmFyIHB1YlN1YiA9ICQkLnJlcXVpcmUoXCJzb3VuZHB1YnN1YlwiKS5zb3VuZFB1YlN1YjtcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbmNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuXG5leHBvcnRzLmNyZWF0ZSA9IGZ1bmN0aW9uKGZvbGRlciwgY29kZUZvbGRlciApe1xuXG4gICAgJCQuUFNLX1B1YlN1YiA9IHB1YlN1YjtcbiAgICB2YXIgc2FuZEJveGVzUm9vdCA9IHBhdGguam9pbihmb2xkZXIsIFwic2FuZGJveGVzXCIpO1xuXG4gICAgdHJ5e1xuICAgICAgICBmcy5ta2RpclN5bmMoc2FuZEJveGVzUm9vdCwge3JlY3Vyc2l2ZTogdHJ1ZX0pO1xuICAgIH1jYXRjaChlcnIpe1xuICAgICAgICBjb25zb2xlLmxvZyhcIkZhaWxlZCB0byBjcmVhdGUgc2FuZGJveGVzIGRpciBzdHJ1Y3R1cmUhXCIsIGVycik7XG4gICAgICAgIC8vVE9ETzogbWF5YmUgaXQgaXMgb2sgdG8gY2FsbCBwcm9jZXNzLmV4aXQgPz8/XG4gICAgfVxuXG4gICAgJCQuU2FuZEJveE1hbmFnZXIgPSByZXF1aXJlKFwiLi4vLi4vcHNrbm9kZS9jb3JlL3NhbmRib3hlcy91dGlsL1NhbmRCb3hNYW5hZ2VyXCIpLmNyZWF0ZShzYW5kQm94ZXNSb290LCBjb2RlRm9sZGVyLCBmdW5jdGlvbihlcnIsIHJlcyl7XG4gICAgICAgIGNvbnNvbGUubG9nKCQkLkRJX2NvbXBvbmVudHMuc2FuZEJveFJlYWR5LCBlcnIsIHJlcyk7XG4gICAgICAgICQkLmNvbnRhaW5lci5yZXNvbHZlKCQkLkRJX2NvbXBvbmVudHMuc2FuZEJveFJlYWR5LCB0cnVlKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBwdWJTdWI7XG59O1xuIiwiY29uc3QgQnJpY2sgPSByZXF1aXJlKCcuL0JyaWNrJyk7XG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCBpc1N0cmVhbSA9IHJlcXVpcmUoXCIuLi91dGlscy9pc1N0cmVhbVwiKTtcblxuZnVuY3Rpb24gQXJjaGl2ZShhcmNoaXZlQ29uZmlndXJhdG9yLCBtYXBEaWdlc3QpIHsgLy9jb25maWdPYmpcbiAgICAvL251bWVsZSBzaSBwcm92aWRlci11bCBwZSBjYXJlIGlsIHZvbSB1dGlsaXphLCBwcm92aWRlci11bCB2YSBmaSB1biBzdHJpbmdcbiAgICAvL2luIGZ1bmN0aWUgZGUgdmFsb2FyZWEgYWNlc3R1aSBzdHJpbmcgdm9tIGNyZWEgaW4gdmFyaWFiaWxhIHN0b3JhZ2VQcnZcbiAgICAvL3VuIG9iaWVjdCBkZSB0aXB1bCBTdG9yYWdlRmlsZSBzYXUgU3RvcmFnZUZvbGRlclxuXG5cbiAgICBjb25zdCBkaXNrQWRhcHRlciA9IGFyY2hpdmVDb25maWd1cmF0b3IuZ2V0RGlza0FkYXB0ZXIoKTtcbiAgICBjb25zdCBzdG9yYWdlUHJvdmlkZXIgPSBhcmNoaXZlQ29uZmlndXJhdG9yLmdldFN0b3JhZ2VQcm92aWRlcigpO1xuICAgIGxldCBiYXJNYXA7XG5cbiAgICBmdW5jdGlvbiBwdXRCYXJNYXAoY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtYXBEaWdlc3QgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgIHN0b3JhZ2VQcm92aWRlci5kZWxldGVCcmljayhtYXBEaWdlc3QsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIF9fcHV0QmFyTWFwKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgX19wdXRCYXJNYXAoY2FsbGJhY2spO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9fcHV0QmFyTWFwKGNhbGxiYWNrKSB7XG4gICAgICAgIHN0b3JhZ2VQcm92aWRlci5wdXRCYXJNYXAoYmFyTWFwLCAoZXJyLCBuZXdNYXBEaWdlc3QpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbWFwRGlnZXN0ID0gbmV3TWFwRGlnZXN0O1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBtYXBEaWdlc3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLmFwcGVuZFRvRmlsZSA9IGZ1bmN0aW9uIChmaWxlUGF0aCwgZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy9maWxlTmFtZSAtIG51bWVsZSBmaXNpZXJ1bHVpIGluIGNhcmUgdnJlbSBzYSBmYWNlbSBhcHBlbmRcbiAgICAgICAgLy9kYXRhIC0gYnVmZmVyLXVsIGRlIGNpdGlyZSwgdm9tIHByZWx1YSBkaW4gZWwgZGF0ZWxlXG4gICAgICAgIC8vY2FsbGJhY2sgLSBhY2VlYXNpIGZ1bmN0aWUgY2FyZSBzZSBvY3VwYSBkZSBwcmVsdWNhcmVhIGRhdGVsb3IsXG4gICAgICAgIC8vZGUgY3JlZXJlYSBkZSBicmljay11cmkgc2kgc2NyaWVyZWEgbG9yXG4gICAgICAgIGxvYWRCYXJNYXBUaGVuRXhlY3V0ZShoZWxwZXJBcHBlbmRUb0ZpbGUsIGNhbGxiYWNrKTtcblxuICAgICAgICBmdW5jdGlvbiBoZWxwZXJBcHBlbmRUb0ZpbGUoKSB7XG4gICAgICAgICAgICBmaWxlUGF0aCA9IHZhbGlkYXRlRmlsZU5hbWUoZmlsZVBhdGgpO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGRhdGEgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gQnVmZmVyLmZyb20oZGF0YSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhQnJpY2sgPSBuZXcgQnJpY2soZGF0YSk7XG4gICAgICAgICAgICAgICAgc3RvcmFnZVByb3ZpZGVyLnB1dEJyaWNrKGRhdGFCcmljaywgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGJhck1hcC5hZGQoZmlsZVBhdGgsIGRhdGFCcmljayk7XG4gICAgICAgICAgICAgICAgICAgIHB1dEJhck1hcChjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaXNTdHJlYW0uaXNSZWFkYWJsZShkYXRhKSkge1xuICAgICAgICAgICAgICAgIGRhdGEub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9KS5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhQnJpY2sgPSBuZXcgQnJpY2soY2h1bmspO1xuICAgICAgICAgICAgICAgICAgICBzdG9yYWdlUHJvdmlkZXIucHV0QnJpY2soZGF0YUJyaWNrLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGJhck1hcC5hZGQoZmlsZVBhdGgsIGRhdGFCcmljayk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcHV0QmFyTWFwKGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJJbnZhbGlkIHR5cGUgb2YgcGFyYW1ldGVyIGRhdGFcIikpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuYWRkRm9sZGVyID0gZnVuY3Rpb24gKGZvbGRlclBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGxvYWRCYXJNYXBUaGVuRXhlY3V0ZShoZWxwZXJBZGRGb2xkZXIsIGNhbGxiYWNrKTtcblxuICAgICAgICBmdW5jdGlvbiBoZWxwZXJBZGRGb2xkZXIoKSB7XG4gICAgICAgICAgICBkaXNrQWRhcHRlci5nZXROZXh0RmlsZShmb2xkZXJQYXRoLCBfX3JlYWRGaWxlQ2IpO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBfX3JlYWRGaWxlQ2IoZXJyLCBmaWxlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGZpbGUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3BsaXRGb2xkZXJQYXRoID0gZm9sZGVyUGF0aC5zcGxpdChwYXRoLnNlcCk7XG4gICAgICAgICAgICAgICAgICAgIHNwbGl0Rm9sZGVyUGF0aC5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVhZEZpbGVBc0Jsb2NrcyhzcGxpdEZvbGRlclBhdGguam9pbihwYXRoLnNlcCksIGZpbGUsIGFyY2hpdmVDb25maWd1cmF0b3IuZ2V0QnVmZmVyU2l6ZSgpLCBiYXJNYXAsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgZGlza0FkYXB0ZXIuZ2V0TmV4dEZpbGUoZm9sZGVyUGF0aCwgX19yZWFkRmlsZUNiKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvcmFnZVByb3ZpZGVyLnB1dEJhck1hcChiYXJNYXAsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gZGVsZXRlRm9yRmlsZU5hbWUoZmlsZW5hbWUsIGhhc2hMaXN0LCBsZW5ndGgsIGluZGV4LCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoaW5kZXggPT09IGxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgc3RvcmFnZVByb3ZpZGVyLmRlbGV0ZUJyaWNrKGhhc2hMaXN0W2luZGV4XSwgKGVycikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkZWxldGVGb3JGaWxlTmFtZShmaWxlbmFtZSwgaGFzaExpc3QsIGxlbmd0aCwgKGluZGV4ICsgMSksIGNhbGxiYWNrKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5yZXBsYWNlRmlsZSA9IGZ1bmN0aW9uIChmaWxlTmFtZSwgc3RyZWFtLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAodHlwZW9mIHN0cmVhbSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ1dyb25nIHN0cmVhbSEnKSk7XG4gICAgICAgIH1cblxuICAgICAgICBsb2FkQmFyTWFwVGhlbkV4ZWN1dGUoaGVscGVyUmVwbGFjZUZpbGUsIGNhbGxiYWNrKTtcblxuICAgICAgICBmdW5jdGlvbiBoZWxwZXJSZXBsYWNlRmlsZSgpIHtcbiAgICAgICAgICAgIGZpbGVOYW1lID0gdmFsaWRhdGVGaWxlTmFtZShmaWxlTmFtZSk7XG4gICAgICAgICAgICBzdHJlYW0ub24oJ2Vycm9yJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJGaWxlIGRvZXMgbm90IGV4aXN0IVwiKSk7XG4gICAgICAgICAgICB9KS5vbignb3BlbicsICgpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgaGFzaExpc3QgPSBiYXJNYXAuZ2V0SGFzaExpc3QoZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUZvckZpbGVOYW1lKGZpbGVOYW1lLCBoYXNoTGlzdCwgaGFzaExpc3QubGVuZ3RoLCAwLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgYmFyTWFwLmVtcHR5TGlzdChmaWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgICAgICAgICAgIGxldCB0ZW1wQnJpY2sgPSBuZXcgQnJpY2soY2h1bmspO1xuICAgICAgICAgICAgICAgIGJhck1hcC5hZGQoZmlsZU5hbWUsIHRlbXBCcmljayk7XG4gICAgICAgICAgICAgICAgc3RvcmFnZVByb3ZpZGVyLnB1dEJyaWNrKHRlbXBCcmljaywgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBwdXRCYXJNYXAoY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5hZGRGaWxlID0gZnVuY3Rpb24gKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICBsb2FkQmFyTWFwVGhlbkV4ZWN1dGUoaGVscGVyQWRkRmlsZSwgY2FsbGJhY2spO1xuXG4gICAgICAgIGZ1bmN0aW9uIGhlbHBlckFkZEZpbGUoKSB7XG4gICAgICAgICAgICBjb25zdCBmb2xkZXJQYXRoID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcbiAgICAgICAgICAgIGRpc2tBZGFwdGVyLmdldE5leHRGaWxlKGZpbGVQYXRoLCAoZXJyLCBmaWxlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZWFkRmlsZUFzQmxvY2tzKGZvbGRlclBhdGgsIGZpbGUsIGFyY2hpdmVDb25maWd1cmF0b3IuZ2V0QnVmZmVyU2l6ZSgpLCBiYXJNYXAsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzdG9yYWdlUHJvdmlkZXIucHV0QmFyTWFwKGJhck1hcCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXRGaWxlID0gZnVuY3Rpb24gKHNhdmVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICB0aGlzLmV4dHJhY3RGb2xkZXIoc2F2ZVBhdGgsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgdGhpcy5leHRyYWN0RmlsZSA9IGZ1bmN0aW9uIChmaWxlTmFtZSwgbG9jYXRpb24sIGNhbGxiYWNrKSB7XG4gICAgICAgIGxvYWRCYXJNYXBUaGVuRXhlY3V0ZShoZWxwZXJFeHRyYWN0RmlsZSwgY2FsbGJhY2spO1xuXG4gICAgICAgIGZ1bmN0aW9uIGhlbHBlckV4dHJhY3RGaWxlKCkge1xuICAgICAgICAgICAgZmlsZU5hbWUgPSB2YWxpZGF0ZUZpbGVOYW1lKGZpbGVOYW1lKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc2hMaXN0ID0gYmFyTWFwLmdldEhhc2hMaXN0KGZpbGVOYW1lKTtcbiAgICAgICAgICAgIF9fZ2V0RmlsZVJlY3Vyc2l2ZWx5KGhhc2hMaXN0LCBoYXNoTGlzdC5sZW5ndGgsIDAsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIF9fZ2V0RmlsZVJlY3Vyc2l2ZWx5KGhhc2hMaXN0LCBsZW5ndGgsIGluZGV4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKGluZGV4ID09PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RvcmFnZVByb3ZpZGVyLmdldEJyaWNrKGhhc2hMaXN0W2luZGV4XSwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF9fYXBwZW5kZXIoZXJyLCBkYXRhLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgX19nZXRGaWxlUmVjdXJzaXZlbHkoaGFzaExpc3QsIGxlbmd0aCwgaW5kZXggKyAxLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIF9fYXBwZW5kZXIoZXJyLCBkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IGJhc2UgPSBwYXRoLmJhc2VuYW1lKGZpbGVOYW1lKTtcbiAgICAgICAgICAgIGxldCBwdGggPSBwYXRoLmpvaW4obG9jYXRpb24sIGJhc2UudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBkaXNrQWRhcHRlci5hcHBlbmRCbG9ja1RvRmlsZShwdGgsIGRhdGEuZ2V0RGF0YSgpLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5leHRyYWN0Rm9sZGVyID0gZnVuY3Rpb24gKHNhdmVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICAvL2Z1bmN0aWEgYXN0YSBleHRyYWdlIHVuIGZpc2llciBkaW4gYXJoaXZhLCBzaSBmb2xvc2VzdGUgZnVuY3RpYSBkZSBjYWxsYmFja1xuICAgICAgICAvL3BlbnRydSBhIHJldGluZSBkYXRlbGUgaW50ci1vIGxpc3RhIHNhdSBwZW50cnUgYSBmYWNlIG8gcHJvY2VzYXJlIHVsdGVyaW9hcmFcbiAgICAgICAgbG9hZEJhck1hcFRoZW5FeGVjdXRlKGhlbHBlckV4dHJhY3RGb2xkZXIsIGNhbGxiYWNrKTtcblxuICAgICAgICBmdW5jdGlvbiBoZWxwZXJFeHRyYWN0Rm9sZGVyKCkge1xuICAgICAgICAgICAgbGV0IGZpbGVQYXRocyA9IGJhck1hcC5nZXRGaWxlTGlzdCgpO1xuICAgICAgICAgICAgZnVuY3Rpb24gX19yZWFkRmlsZXNSZWN1cnNpdmVseShmaWxlSW5kZXgsIHJlYWRGaWxlc0NiKSB7XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfX2dldEJyaWNrc1JlY3Vyc2l2ZWx5KGJyaWNrSW5kZXgsIGdldEJyaWNrc0NiKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJyaWNrSGFzaCA9IGJyaWNrTGlzdFticmlja0luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgc3RvcmFnZVByb3ZpZGVyLmdldEJyaWNrKGJyaWNrSGFzaCwgKGVyciwgYnJpY2tEYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldEJyaWNrc0NiKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdQYXRoID0gcGF0aC5qb2luKHNhdmVQYXRoLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNrQWRhcHRlci5hcHBlbmRCbG9ja1RvRmlsZShuZXdQYXRoLCBicmlja0RhdGEuZ2V0RGF0YSgpLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0QnJpY2tzQ2IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArK2JyaWNrSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJyaWNrSW5kZXggPCBicmlja0xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9fZ2V0QnJpY2tzUmVjdXJzaXZlbHkoYnJpY2tJbmRleCwgZ2V0QnJpY2tzQ2IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldEJyaWNrc0NiKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gZmlsZVBhdGhzW2ZpbGVJbmRleF07XG4gICAgICAgICAgICAgICAgY29uc3QgYnJpY2tMaXN0ID0gYmFyTWFwLmdldEhhc2hMaXN0KGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAoYnJpY2tMaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgX19nZXRCcmlja3NSZWN1cnNpdmVseSgwLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlYWRGaWxlc0NiKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICsrZmlsZUluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVJbmRleCA8IGZpbGVQYXRocy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfX3JlYWRGaWxlc1JlY3Vyc2l2ZWx5KGZpbGVJbmRleCwgcmVhZEZpbGVzQ2IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkRmlsZXNDYigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9fcmVhZEZpbGVzUmVjdXJzaXZlbHkoMCwgY2FsbGJhY2spO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgdGhpcy5nZXRSZWFkU3RyZWFtID0gZnVuY3Rpb24gKGZpbGVQYXRoKSB7XG4gICAgICAgIC8vbmUgdmEgb2ZlcmkgdW4gYnVmZmVyIGNhcmUgc2EgY2l0ZWFzY2EgZGludHItdW4gZmlzaWVyIGRpbiBhcmhpdmEgbm9hc3RyYT9cbiAgICAgICAgLy9yZXR1cm4gZGlza0FkYXB0ZXIuZ2V0UmVhZFN0cmVhbShmaWxlUGF0aCxidWZmZXJTaXplKTtcblxuICAgIH07XG5cbiAgICB0aGlzLmdldFdyaXRlU3RyZWFtID0gZnVuY3Rpb24gKGZpbGVQYXRoKSB7XG4gICAgICAgIC8vbmUgdmEgb2ZlcmkgdW4gYnVmZmVyIGNhcmUgc2Egc2NyaWUgaW50ci11biBmaXNpZXIgZGluIGFyaGl2YSBub2FzdHJhXG4gICAgICAgIC8vcmV0dXJuIGRpc2tBZGFwdGVyLmdldFdyaXRlU3RyZWFtKGZpbGVQYXRoKTtcblxuICAgIH07XG5cbiAgICB0aGlzLnN0b3JlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgIHN0b3JhZ2VQcm92aWRlci5wdXRCYXJNYXAoYmFyTWFwLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIHRoaXMubGlzdCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICBpZiAodHlwZW9mIGJhck1hcCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgc3RvcmFnZVByb3ZpZGVyLmdldEJhck1hcChtYXBEaWdlc3QsIChlcnIsIG1hcCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYmFyTWFwID0gbWFwO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgYmFyTWFwLmdldEZpbGVMaXN0KCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGJhck1hcC5nZXRGaWxlTGlzdCgpKTtcbiAgICAgICAgfVxuICAgICAgICAvL2FjZWFzdGEgZnVuY3RpZSB2YSBsaXN0YSBkZW51bWlyaWxlIGZpc2llcmVsb3IgZGluIGFyaGl2YVxuICAgICAgICAvL251IGludGVsZWcgY2UgYXIgdHJlYnVpIHNhIGZhY2EgZnVuY3RpYSBkZSBjYWxsYmFja1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiByZWFkRmlsZUFzQmxvY2tzKGZvbGRlclBhdGgsIGZpbGVOYW1lLCBibG9ja1NpemUsIGJhck1hcCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgYWJzb2x1dGVQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGVOYW1lKTtcbiAgICAgICAgZGlza0FkYXB0ZXIuZ2V0RmlsZVNpemUoYWJzb2x1dGVQYXRoLCAoZXJyLCBmaWxlU2l6ZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIGxldCBub0Jsb2NrcyA9IE1hdGguZmxvb3IoZmlsZVNpemUgLyBibG9ja1NpemUpO1xuICAgICAgICAgICAgaWYgKGZpbGVTaXplICUgYmxvY2tTaXplID4gMCkge1xuICAgICAgICAgICAgICAgICsrbm9CbG9ja3M7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBibG9ja0luZGV4ID0gMDtcblxuICAgICAgICAgICAgZnVuY3Rpb24gX19yZWFkQ2IoZXJyLCBidWZmZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGJyaWNrID0gbmV3IEJyaWNrKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgYmFyTWFwLmFkZChmaWxlTmFtZSwgYnJpY2spO1xuICAgICAgICAgICAgICAgIHN0b3JhZ2VQcm92aWRlci5wdXRCcmljayhicmljaywgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICsrYmxvY2tJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2NrSW5kZXggPCBub0Jsb2Nrcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlza0FkYXB0ZXIucmVhZEJsb2NrRnJvbUZpbGUoYWJzb2x1dGVQYXRoLCBibG9ja0luZGV4LCBibG9ja1NpemUsIF9fcmVhZENiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkaXNrQWRhcHRlci5yZWFkQmxvY2tGcm9tRmlsZShhYnNvbHV0ZVBhdGgsIGJsb2NrSW5kZXgsIGJsb2NrU2l6ZSwgX19yZWFkQ2IpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZUZpbGVOYW1lKGZpbGVOYW1lKSB7XG4gICAgICAgIGlmIChmaWxlTmFtZVswXSAhPT0gJy8nKSB7XG4gICAgICAgICAgICBmaWxlTmFtZSA9IHBhdGguc2VwICsgZmlsZU5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaXQgPSAwOyBpdCA8IGZpbGVOYW1lLmxlbmd0aDsgaXQrKykge1xuICAgICAgICAgICAgaWYgKGZpbGVOYW1lW2l0XSA9PT0gJy8nKVxuICAgICAgICAgICAgICAgIGZpbGVOYW1lID0gZmlsZU5hbWUucmVwbGFjZSgnLycsIHBhdGguc2VwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmlsZU5hbWU7XG4gICAgfVxuICAgIFxuICAgIGZ1bmN0aW9uIGxvYWRCYXJNYXBUaGVuRXhlY3V0ZShmdW5jdGlvblRvQmVFeGVjdXRlZCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHR5cGVvZiBiYXJNYXAgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgIHN0b3JhZ2VQcm92aWRlci5nZXRCYXJNYXAobWFwRGlnZXN0LCAoZXJyLCBtYXApID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGJhck1hcCA9IG1hcDtcbiAgICAgICAgICAgICAgICBmdW5jdGlvblRvQmVFeGVjdXRlZCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmdW5jdGlvblRvQmVFeGVjdXRlZCgpO1xuICAgICAgICB9XG4gICAgfVxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gQXJjaGl2ZTsiLCJjb25zdCBzdG9yYWdlUHJvdmlkZXJzID0ge307XG5jb25zdCBkaXNrQWRhcHRlcnMgPSB7fTtcblxuZnVuY3Rpb24gQXJjaGl2ZUNvbmZpZ3VyYXRvcigpIHtcbiAgICBjb25zdCBjb25maWcgPSB7fTtcblxuICAgIHRoaXMuc2V0QnVmZmVyU2l6ZSA9IGZ1bmN0aW9uIChidWZmZXJTaXplKSB7XG4gICAgICAgIGNvbmZpZy5idWZmZXJTaXplID0gYnVmZmVyU2l6ZTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRCdWZmZXJTaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gY29uZmlnLmJ1ZmZlclNpemU7XG4gICAgfTtcblxuICAgIHRoaXMuc2V0U3RvcmFnZVByb3ZpZGVyID0gZnVuY3Rpb24gKHN0b3JhZ2VQcm92aWRlck5hbWUsIC4uLmFyZ3MpIHtcbiAgICAgICAgY29uZmlnLnN0b3JhZ2VQcm92aWRlciA9IHN0b3JhZ2VQcm92aWRlcnNbc3RvcmFnZVByb3ZpZGVyTmFtZV0oLi4uYXJncyk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0U3RvcmFnZVByb3ZpZGVyID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHJldHVybiBjb25maWcuc3RvcmFnZVByb3ZpZGVyO1xuICAgIH07XG5cbiAgICB0aGlzLnNldERpc2tBZGFwdGVyID0gZnVuY3Rpb24gKGRpc2tBZGFwdGVyTmFtZSwgLi4uYXJncykge1xuICAgICAgICBjb25maWcuZGlza0FkYXB0ZXIgPSBkaXNrQWRhcHRlcnNbZGlza0FkYXB0ZXJOYW1lXSguLi5hcmdzKTtcbiAgICB9O1xuICAgIHRoaXMuZ2V0RGlza0FkYXB0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBjb25maWcuZGlza0FkYXB0ZXI7XG4gICAgfVxufVxuXG5BcmNoaXZlQ29uZmlndXJhdG9yLnByb3RvdHlwZS5yZWdpc3RlclN0b3JhZ2VQcm92aWRlciA9IGZ1bmN0aW9uIChzdG9yYWdlUHJvdmlkZXJOYW1lLCBmYWN0b3J5KSB7XG4gICAgc3RvcmFnZVByb3ZpZGVyc1tzdG9yYWdlUHJvdmlkZXJOYW1lXSA9IGZhY3Rvcnk7XG59O1xuXG5BcmNoaXZlQ29uZmlndXJhdG9yLnByb3RvdHlwZS5yZWdpc3RlckRpc2tBZGFwdGVyID0gZnVuY3Rpb24gKGRpc2tBZGFwdGVyTmFtZSwgZmFjdG9yeSkge1xuICAgIGRpc2tBZGFwdGVyc1tkaXNrQWRhcHRlck5hbWVdID0gZmFjdG9yeTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXJjaGl2ZUNvbmZpZ3VyYXRvcjsiLCJjb25zdCBjcnlwdG8gPSByZXF1aXJlKCdjcnlwdG8nKTtcblxuZnVuY3Rpb24gQnJpY2soZGF0YSl7XG4gICAgbGV0IGhhc2g7XG4gICAgdGhpcy5nZXRIYXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodHlwZW9mIGhhc2ggPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IGggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMjU2Jyk7XG4gICAgICAgICAgICBoLnVwZGF0ZShkYXRhKTtcbiAgICAgICAgICAgIGhhc2ggPSBoLmRpZ2VzdCgnaGV4Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGhhc2g7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCcmljazsiLCJjb25zdCBCcmljayA9IHJlcXVpcmUoXCIuL0JyaWNrXCIpO1xuXG5mdW5jdGlvbiBGaWxlQmFyTWFwKGhlYWRlcil7XG4gICAgaGVhZGVyID0gaGVhZGVyIHx8IHt9O1xuICAgIGxldCBicmlja1Bvc2l0aW9ucyA9IFtdO1xuICAgIGxldCBwb3NpdGlvbiA9IDA7XG4gICAgbGV0IGluZGV4PTA7XG4gICAgLy9oZWFkZXIgZXN0ZSB1biBtYXAgaW4gY2FyZSB2b20gcmV0aW5lIGRhdGVsZSBpbnRyLXVuIGZvcm1hdCBqc29uXG4gICAgLy92b20gYXZlYSBrZXktdWwgY2FyZSB2YSBmaSBmaWxlbmFtZS11bCwgc2kgZGF0ZWxlIGNhcmUgdmEgZmkgbGlzdGEgZGUgaGFzaC11cmlcbiAgICB0aGlzLmFkZCA9IGZ1bmN0aW9uIChmaWxlUGF0aCwgYnJpY2spIHtcbiAgICAgICAgLy9oYXNoTGlzdC11bCB2YSBmaSBkaXJlY3QgbGlzdGEgZGUgaGFzaC11cmksIHBlbnRydSBjYSBvIHB1dGVtIGZhY2UgcGUgbWFzdXJhXG4gICAgICAgIC8vY2UgbmUgb2N1cGFtIGRlIHNhbHZhcmVhIGJyaWNrLXVyaWxvclxuICAgICAgICBsZXQgbGFzdFBvc2l0aW9uID0gOTY7XG4gICAgICAgIGlmKGluZGV4PjApXG4gICAgICAgICAgICBsYXN0UG9zaXRpb24gPSBicmlja1Bvc2l0aW9uc1tpbmRleC0xXTtcbiAgICAgICAgaWYgKHR5cGVvZiBoZWFkZXJbZmlsZVBhdGhdID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICBoZWFkZXJbZmlsZVBhdGhdID0gW107XG4gICAgICAgICAgICBicmlja1Bvc2l0aW9ucy5wdXNoKChsYXN0UG9zaXRpb24rYnJpY2suZ2V0U2l6ZSgpKSk7XG4gICAgICAgICAgICBoZWFkZXJbZmlsZVBhdGhdLnB1c2goaW5kZXgpO1xuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgLy9sZXQgdGVtcEwgPSBoZWFkZXJbZmlsZVBhdGhdLmxlbmd0aDtcbiAgICAgICAgICAgIC8vbGV0IHRlbXBTaXplID0gaGVhZGVyW2ZpbGVQYXRoXVt0ZW1wTC0xXTtcbiAgICAgICAgICAgIGJyaWNrUG9zaXRpb25zLnB1c2goKGxhc3RQb3NpdGlvbiticmljay5nZXRTaXplKCkpKTtcbiAgICAgICAgICAgIGhlYWRlcltmaWxlUGF0aF0ucHVzaChpbmRleCk7XG4gICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuc2V0QmFyTWFwUG9zaXRvbiA9IGZ1bmN0aW9uKGFjdHVhbFBvc2l0aW9uKXtcbiAgICAgICAgcG9zaXRpb24gPSBhY3R1YWxQb3NpdGlvbjtcbiAgICB9XG5cbiAgICB0aGlzLmdldEhhc2hMaXN0ID0gZnVuY3Rpb24gKGZpbGVQYXRoKSB7XG4gICAgICAgIC8vYXZlbSBuZXZvaWUgZGUgaGFzaC11cmkgY2Egc2EgcHV0ZW0gb2J0aW5lIGJyaWNrLXVyaWxlIHVudWkgZmlzaWVyXG4gICAgICAgIC8vdW4gaGFzaCBlc3RlIGRlIGZhcHQgZGVudW1pcmVhIHVudWkgYnJpY2tcbiAgICAgICAgLy9hY2Vhc3RhIGZ1bmN0aWUgcmV0dXJuZWF6YSBsaXN0YSBkZSBoYXNoLXVyaVxuICAgICAgICByZXR1cm4gaGVhZGVyW2ZpbGVQYXRoXTtcbiAgICB9O1xuXG4gICAgdGhpcy5lbXB0eUxpc3QgPSBmdW5jdGlvbiAoZmlsZVBhdGgpIHtcbiAgICAgICAgaGVhZGVyW2ZpbGVQYXRoXSA9IFtdO1xuICAgIH07XG5cbiAgICB0aGlzLnRvQnJpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCB0ZW1wTWFwID0ge307XG4gICAgICAgIHRlbXBNYXAucG9zaXRpb25zID0gaGVhZGVyO1xuICAgICAgICB0ZW1wTWFwLmluZGV4ZXMgPSBicmlja1Bvc2l0aW9ucztcbiAgICAgICAgcmV0dXJuIG5ldyBCcmljayhCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeSh0ZW1wTWFwKSkpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEZpbGVMaXN0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGhlYWRlcik7XG4gICAgfVxuXG4gICAgdGhpcy5nZXRMaXN0T2ZCcmlja1Bvc2l0aW9ucyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBicmlja1Bvc2l0aW9ucztcbiAgICB9XG5cbiAgICB0aGlzLmdldFBvc2l0aW9uID0gZnVuY3Rpb24oaW5kZXgpe1xuICAgICAgICBpZihpbmRleD5icmlja1Bvc2l0aW9ucy5sZW5ndGgpXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gYnJpY2tQb3NpdGlvbnNbaW5kZXhdO1xuICAgIH1cblxuICAgIHRoaXMuc2V0TGlzdE9mQnJpY2tQb3NpdGlvbnMgPSBmdW5jdGlvbihsaXN0KXtcbiAgICAgICAgYnJpY2tQb3NpdGlvbnMgPSBsaXN0O1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlQmFyTWFwOyIsImNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmNvbnN0IEJhck1hcCA9IHJlcXVpcmUoJy4vRmlsZUJhck1hcCcpO1xuLy9jb25zdCBmaWxlQmFyTWFwID0gcmVxdWlyZSgnRmlsZUJhck1hcCcpO1xuXG5mdW5jdGlvbiBGaWxlQnJpY2tTdG9yYWdlKGxvY2F0aW9uKXtcbiAgICAvL2NsYXNlbGUgYWNlc3RlYSBkZSBzdG9yYWdlLCBudSBzZSBtYWkgb2N1cGEgZGUgY2l0aXJpIHNpIHNjcmllcmkgYWN1bVxuICAgIC8vZGVjaSBhY2VzdGUgZnVuY3RpaSBwZSBjYXJlIGxlIGFwZWxleiwgcHV0QnJpY2sgc2kgZ2V0QnJpY2sgc3VudCBuaXN0ZSBmdW5jdGlpIGludGVybWVkaWFyZVxuICAgIC8vdG9hdGUgcHJvY2VzYXJpbGUgc2UgZmFjIGluIEJhcldvcmtlciAocGFydGVhIGRlIGNpdGlyZSwgbWFwYXJlIGEgaGVhZGVyLXVsdWkgYXJoaXZlaSlcbiAgICAvL3NpIGluIHN0b3JhZ2UsIGRlIGV4ZW1wbHUgYXBwZW5kLXVsIGRlIGRhdGUgbGEgdW4gQnJpY2tcbiAgICBsZXQgbWFwO1xuICAgIGxldCBiYXJNYXBQb3NpdGlvbiA9IDk2O1xuICAgIC8vIHRoaXMucHV0QnJpY2sgPSBmdW5jdGlvbihicmljayxjYWxsYmFjayl7XG4gICAgLy8gICAgIGJhck1hcFBvc2l0aW9uICs9IGJyaWNrLmdldERhdGEoKS5sZW5ndGg7XG4gICAgLy8gICAgIGJyaWNrU2l6ZXNbYnJpY2suZ2V0SGFzaCgpXSA9IGJyaWNrLmdldERhdGEoKS5sZW5ndGg7IFxuICAgIC8vICAgICBmcy5hcHBlbmRGaWxlKGxvY2F0aW9uLGJyaWNrLmdldERhdGEoKSwoZXJyKT0+e1xuICAgIC8vICAgICAgICAgaWYoZXJyKVxuICAgIC8vICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgLy8gICAgICAgICBlbHNlXG4gICAgLy8gICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAvLyAgICAgfSk7XG4gICAgLy8gICAgIC8vYWNlYXN0YSBmdW5jdGllIHZhIHByaW1pIHVuIGJyaWNrXG4gICAgLy8gICAgIC8vc2kgdmEgYXBlbGEgbyBmdWNudGllIGRpbiBCYXJXb3JrZXIgY2Ugc2UgdmEgb2N1cGEgZGUgc2NyaWVyZWEgZGF0ZWxvciBpbiBmaXNpZXJcbiAgICAvLyAgICAgLy92YSBmYWNlIGFwcGVuZCBsYSBmaXNpZXJ1bCAuYmFyLCBjdSBkYXRlbGUgcmVzcGVjdGl2ZVxuICAgIC8vIH1cblxuICAgIC8vIHRoaXMucHV0QnJpY2sgPSBmdW5jdGlvbihicmljayxjYWxsYmFjayl7XG4gICAgLy8gICAgIGJhck1hcFBvc2l0aW9uICs9IGJyaWNrLmdldERhdGEoKS5sZW5ndGg7XG4gICAgLy8gICAgIGJyaWNrU2l6ZXNbYnJpY2suZ2V0SGFzaCgpXSA9IGJyaWNrLmdldERhdGEoKS5sZW5ndGg7XG4gICAgLy8gICAgIGxldCB0ZW1wQnVmZmVyID0gQnVmZmVyLmFsbG9jKGJyaWNrLmdldERhdGEoKS5sZW5ndGgsYnJpY2suZ2V0RGF0YSgpKTtcbiAgICAvLyAgICAgZnMub3Blbihsb2NhdGlvbiwndycsKGVycixmZCk9PntcbiAgICAvLyAgICAgICAgIGZzLndyaXRlKGZkLHRlbXBCdWZmZXIsMCx0ZW1wQnVmZmVyLGJhck1hcFBvc2l0aW9uLChlcnIsd3JyLHN0cik9PntcbiAgICAvLyAgICAgICAgICAgICBpZihlcnIpXG4gICAgLy8gICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAvLyAgICAgICAgIH0pO1xuICAgIC8vICAgICB9KTtcbiAgICAvLyB9XG5cbiAgICB0aGlzLnB1dEJyaWNrID0gZnVuY3Rpb24oYnJpY2ssY2FsbGJhY2spe1xuICAgICAgICBmcy5zdGF0KGxvY2F0aW9uLChlcnIsc3RhdCk9PntcbiAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgZnMub3Blbihsb2NhdGlvbiwncisnLChlcnIsZmQpPT57XG4gICAgICAgICAgICAgICAgICAgIGxldCB0ZW1wQnVmZmVyID0gQnVmZmVyLmFsbG9jKGJyaWNrLmdldFNpemUoKSxicmljay5nZXREYXRhKCkpO1xuICAgICAgICAgICAgICAgICAgICBmcy53cml0ZShmZCx0ZW1wQnVmZmVyLDAsdGVtcEJ1ZmZlci5sZW5ndGgsOTYsKGVycix3cnQsYnVmZmVyKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIGZzLmFwcGVuZEZpbGUobG9jYXRpb24sYnJpY2suZ2V0RGF0YSgpLChlcnIpPT57XG4gICAgICAgICAgICAgICAgICAgIGlmKGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gdGhpcy5wdXRCYXJNYXAgPSBmdW5jdGlvbihiYXJNYXAsY2FsbGJhY2spe1xuICAgIC8vICAgICBsZXQgbWFwID0ge307XG4gICAgLy8gICAgIGJhck1hcC5nZXRGaWxlTGlzdCgpLmZvckVhY2goZmlsZT0+e1xuICAgIC8vICAgICAgICAgbWFwW2ZpbGVdID0gW107XG4gICAgLy8gICAgICAgICBsZXQgdGVtcFNpemUgPSBbXTtcbiAgICAvLyAgICAgICAgIGJhck1hcC5nZXRIYXNoTGlzdChmaWxlKS5mb3JFYWNoKGhhc2g9PntcbiAgICAvLyAgICAgICAgICAgICB0ZW1wU2l6ZS5wdXNoKGJyaWNrU2l6ZXNbaGFzaF0pO1xuICAgIC8vICAgICAgICAgfSk7XG4gICAgLy8gICAgICAgICBtYXBbZmlsZV0gPSBbYmFyTWFwLmdldEhhc2hMaXN0KGZpbGUpLHRlbXBTaXplXTtcbiAgICAvLyAgICAgfSk7XG4gICAgLy8gICAgIGxldCBidWZmZXIgPSBKU09OLnN0cmluZ2lmeShtYXApO1xuICAgIC8vICAgICBsZXQgYnVmZmVyTnVtYmVyID0gQnVmZmVyLmFsbG9jKG51bWJlci50b1N0cmluZygpLmxlbmd0aCxudW1iZXIudG9TdHJpbmcoKSk7XG4gICAgLy8gICAgIGZzLm9wZW4obG9jYXRpb24sJ3cnLChlcnIsZmQpPT57XG4gICAgLy8gICAgICAgICBmcy53cml0ZShmZCxidWZmZXJOdW1iZXIsMCxidWZmZXJOdW1iZXIubGVuZ3RoLDAsKGVycixieXRlc1JlYWQsc3RyKT0+e1xuICAgIC8vICAgICAgICAgICAgIGlmKGVycilcbiAgICAvLyAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAvLyAgICAgICAgIH0pO1xuICAgIC8vICAgICAgICAgZnMud3JpdGUoZmQsYnVmZmVyLDAsYnVmZmVyLmxlbmd0aCxiYXJNYXBQb3NpdGlvbiwoZXJyLHdydCxzdHIpPT57XG4gICAgLy8gICAgICAgICAgICAgaWYoZXJyKVxuICAgIC8vICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgIC8vICAgICAgICAgfSk7XG4gICAgLy8gICAgIH0pO1xuICAgIC8vIH1cblxuICAgIHRoaXMucHV0QmFyTWFwID0gZnVuY3Rpb24oYmFyTWFwLGNhbGxiYWNrKXtcbiAgICAgICAgLy8gYmFyTWFwLmdldEZpbGVMaXN0KCkuZm9yRWFjaChmaWxlPT57XG4gICAgICAgIC8vICAgICBtYXBbZmlsZV0gPSBbXTtcbiAgICAgICAgLy8gICAgIGxldCB0ZW1wU2l6ZSA9IFtdO1xuICAgICAgICAvLyAgICAgYmFyTWFwLmdldEhhc2hMaXN0KGZpbGUpLmZvckVhY2goaGFzaD0+e1xuICAgICAgICAvLyAgICAgICAgIHRlbXBTaXplLnB1c2goYnJpY2tTaXplc1toYXNoXSk7XG4gICAgICAgIC8vICAgICB9KTtcbiAgICAgICAgLy8gICAgIG1hcFtmaWxlXSA9IFtiYXJNYXAuZ2V0SGFzaExpc3QoZmlsZSksdGVtcFNpemVdO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgLy8gbGV0IGJ1ZmZlciA9IEpTT04uc3RyaW5naWZ5KG1hcCk7XG4gICAgICAgIC8vIGxldCBidWZmZXJOdW1iZXIgPSBCdWZmZXIuYWxsb2MobnVtYmVyLnRvU3RyaW5nKCkubGVuZ3RoLG51bWJlci50b1N0cmluZygpKTtcbiAgICAgICAgLy8gZnMub3Blbihsb2NhdGlvbiwndycsKGVycixmZCk9PntcbiAgICAgICAgLy8gICAgIGZzLndyaXRlKGZkLGJ1ZmZlck51bWJlciwwLGJ1ZmZlck51bWJlci5sZW5ndGgsMCwoZXJyLGJ5dGVzUmVhZCxzdHIpPT57XG4gICAgICAgIC8vICAgICAgICAgaWYoZXJyKVxuICAgICAgICAvLyAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAvLyAgICAgfSk7XG4gICAgICAgIC8vICAgICBmcy53cml0ZShmZCxidWZmZXIsMCxidWZmZXIubGVuZ3RoLGJhck1hcFBvc2l0aW9uLChlcnIsd3J0LHN0cik9PntcbiAgICAgICAgLy8gICAgICAgICBpZihlcnIpXG4gICAgICAgIC8vICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIC8vICAgICB9KTtcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIC8vIGxldCB0ZW1wTWFwID0ge307XG4gICAgICAgIC8vIG1hcC5nZXRGaWxlTGlzdCgpLmZvckVhY2goa2V5PT57XG4gICAgICAgIC8vICAgICBtYXAuZ2V0SGFzaExpc3Qoa2V5KS5mb3JFYWNoKGVsPT57XG4gICAgICAgIC8vICAgICAgICAgdGVtcE1hcFtrZXldID0gZWw7XG4gICAgICAgIC8vICAgICB9KTtcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIC8vIGxldCBtYXBUb1dyaXRlID0ge307XG4gICAgICAgIC8vIG1hcFRvV3JpdGUucG9zaXRpb25zID0gdGVtcE1hcDtcbiAgICAgICAgLy8gbWFwVG9Xcml0ZS5pbmRleGVzID0gbWFwLmdldExpc3RPZkJyaWNrUG9zaXRpb25zKCk7XG4gICAgICAgIC8vIGxldCBzdHJpbmdUb1dyaXRlID0gSlNPbi5zdHJpbmdpZnkobWFwVG9Xcml0ZSk7XG4gICAgICAgIC8vIGxldCB0ZW1wQnVmZmVyID0gQnVmZmVyLmFsbG9jKHN0cmluZ1RvV3JpdGUubGVuZ3RoLHN0cmluZ1RvV3JpdGUpO1xuICAgICAgICBsZXQgbWFwID0gYmFyTWFwLnRvQnJpY2soKTtcbiAgICAgICAgbGV0IHRlbXBCdWZmZXIgPSBCdWZmZXIuYWxsb2MobWFwLmdldERhdGEoKS5sZW5ndGgsbWFwLmdldERhdGEoKS50b1N0cmluZygpKTtcbiAgICAgICAgZnMub3Blbihsb2NhdGlvbiwncisnLChlcnIsZmQpPT57XG4gICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICBmcy53cml0ZShmZCx0ZW1wQnVmZmVyLDAsdGVtcEJ1ZmZlci5sZW5ndGgsYmFyTWFwUG9zaXRpb24sKGVycix3cnQsYnVmZik9PntcbiAgICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsKTtcbiAgICB9XG5cbiAgICAvLyB0aGlzLmdldEJhck1hcCA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAvLyAgICAgZnMub3Blbihsb2NhdGlvbiwncisnLChlcnIsZmQpPT57XG4gICAgLy8gICAgICAgICBpZihlcnIpXG4gICAgLy8gICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgLy8gICAgICAgICBsZXQgYnVmZmVyID0gQnVmZmVyLmFsbG9jKDEyOCk7XG4gICAgLy8gICAgICAgICBmcy5yZWFkKGZkLGJ1ZmZlciwwLDc4LDAsKGVycixieXRlc1JlYWQsYnVmZmVyKT0+e1xuICAgIC8vICAgICAgICAgICAgIGlmKGVycilcbiAgICAvLyAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgLy8gICAgICAgICAgICAgbGV0IG51bWJlciA9IFBhcnNlSW50KGJ1ZmZlci5zbGljZSgwLGJ5dGVzUmVhZCkpO1xuICAgIC8vICAgICAgICAgICAgIGJhck1hcFBvc2l0aW9uID0gbnVtYmVyO1xuICAgIC8vICAgICAgICAgICAgIGZzLnN0YXQobG9jYXRpb24sKGVycixzdGF0KT0+e1xuICAgIC8vICAgICAgICAgICAgICAgICBsZXQgYnVmZmVyQk0gPSBCdWZmZXIuYWxsb2Moc3RhdC5zaXplLW51bWJlcik7XG4gICAgLy8gICAgICAgICAgICAgICAgIGZzLnJlYWQoZmQsYnVmZmVyQk0sMCxidWZmZXJCTS5sZW5ndGgsbnVtYmVyLChlcnIsYnl0ZXNSZWFkLGJ1ZmZlcik9PntcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgIGxldCB0ZW1wID0gSlNPTi5wYXJzZShidWZmZXJCTS50b1N0cmluZygpKTtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgIGxldCB0ZW1wSGVhZGVyID0ge307XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyh0ZW1wKS5mb3JFYWNoKGtleT0+e1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBIZWFkZXJba2V5XSA9IHRlbXBba2V5XVswXTtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGVtcEFyciA9IHRlbXBba2V5XVsxXTtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5kZXggPSAwO1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBIZWFkZXJba2V5XS5mb3JFYWNoKGVsZW1lbnQ9PntcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJpY2tTaXplc1tlbGVtZW50XSA9IHRlbXBBcnJbaW5kZXhdO1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleCsrO1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgLy8gICAgICAgICAgICAgICAgIH0pO1xuICAgIC8vICAgICAgICAgICAgIH0pO1xuICAgIC8vICAgICAgICAgfSk7XG4gICAgLy8gICAgIH0pXG4gICAgLy8gfVxuXG4gICAgLy8gdGhpcy5nZXRCYXJNYXAgPSBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgLy8gICAgIGZzLm9wZW4obG9jYXRpb24sJ3IrJywoZXJyLGZkKT0+e1xuICAgIC8vICAgICAgICAgaWYoZXJyKVxuICAgIC8vICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgIC8vICAgICAgICAgbGV0IGJ1ZmZlciA9IEJ1ZmZlci5hbGxvYygxMjgpO1xuICAgIC8vICAgICAgICAgZnMucmVhZChmZCxidWZmZXIsMCw3OCwwLChlcnIsYnl0ZXNSZWFkLGJ1ZmZlcik9PntcbiAgICAvLyAgICAgICAgICAgICBpZihlcnIpXG4gICAgLy8gICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgIC8vICAgICAgICAgICAgIGxldCBudW1iZXIgPSBQYXJzZUludChidWZmZXIuc2xpY2UoMCxieXRlc1JlYWQpKTtcbiAgICAvLyAgICAgICAgICAgICBiYXJNYXBQb3NpdGlvbiA9IG51bWJlcjtcbiAgICAvLyAgICAgICAgICAgICBmcy5zdGF0KGxvY2F0aW9uLChlcnIsc3RhdCk9PntcbiAgICAvLyAgICAgICAgICAgICAgICAgbGV0IGJ1ZmZlckJNID0gQnVmZmVyLmFsbG9jKHN0YXQuc2l6ZS1udW1iZXIpO1xuICAgIC8vICAgICAgICAgICAgICAgICBmcy5yZWFkKGZkLGJ1ZmZlckJNLDAsYnVmZmVyQk0ubGVuZ3RoLG51bWJlciwoZXJyLGJ5dGVzUmVhZCxidWZmZXIpPT57XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICBsZXQgdGVtcCA9IEpTT04ucGFyc2UoYnVmZmVyQk0udG9TdHJpbmcoKSk7XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICBsZXQgdGVtcEhlYWRlciA9IHt9O1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXModGVtcCkuZm9yRWFjaChrZXk9PntcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wSGVhZGVyW2tleV0gPSB0ZW1wW2tleV1bMF07XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRlbXBBcnIgPSB0ZW1wW2tleV1bMV07XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGluZGV4ID0gMDtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wSGVhZGVyW2tleV0uZm9yRWFjaChlbGVtZW50PT57XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyaWNrU2l6ZXNbZWxlbWVudF0gPSB0ZW1wQXJyW2luZGV4XTtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXgrKztcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgIC8vICAgICAgICAgICAgICAgICB9KTtcbiAgICAvLyAgICAgICAgICAgICB9KTtcbiAgICAvLyAgICAgICAgIH0pO1xuICAgIC8vICAgICB9KVxuICAgIC8vIH1cblxuICAgIHRoaXMuZ2V0QmFyTWFwID0gZnVuY3Rpb24obWFwRGlnZXN0LGNhbGxiYWNrKXtcbiAgICAgICAgaWYobWFwRGlnZXN0ID09PSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLG5ldyBCYXJNYXAoKSk7XG4gICAgICAgIH1cbiAgICAgICAgZnMub3Blbihsb2NhdGlvbiwncisnLChlcnIsZmQpPT57XG4gICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICBmcy5zdGF0KGxvY2F0aW9uLChlcnIsc3RhdCk9PntcbiAgICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIGxldCBudW1iZXJCdWZmZXIgPSBCdWZmZXIuYWxsb2MoNjQpO1xuICAgICAgICAgICAgICAgIGZzLnJlYWQoZmQsbnVtYmVyQnVmZmVyLDAsbnVtYmVyQnVmZmVyLmxlbmd0aCwwLChlcnIsYnl0ZXNSZWFkLG51bWJlckJ1ZmZlcik9PntcbiAgICAgICAgICAgICAgICAgICAgaWYoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIG51bWJlckJ1ZmZlciA9IG51bWJlckJ1ZmZlci5zbGljZSgwLGJ5dGVzUmVhZCk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0ZW1wQnVmZmVyID0gQnVmZmVyLmFsbG9jKChzdGF0LnNpemUtcGFyc2VJbnQobnVtYmVyQnVmZmVyLnRvU3RyaW5nKCkpKSk7XG4gICAgICAgICAgICAgICAgICAgIGZzLnJlYWQoZmQsdGVtcEJ1ZmZlciwwLHRlbXBCdWZmZXIubGVuZ3RoLHBhcnNlSW50KG51bWJlckJ1ZmZlciksKGVycixieXRlc1JlYWQsdGVtcEJ1ZmZlcik9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBCdWZmZXIgPSB0ZW1wQnVmZmVyLnNsaWNlKDAsYnl0ZXNSZWFkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0ZW1wTWFwID0gSlNPTi5wYXJzZSh0ZW1wQnVmZmVyLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFwID0gbmV3IE1hcCh0ZW1wTWFwLnBvc2l0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXAuc2V0TGlzdE9mQnJpY2tQb3NpdGlvbnModGVtcE1hcC5pbmRleGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCxtYXApO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLy8gdGhpcy5nZXRCcmljayA9IGZ1bmN0aW9uKGJyaWNrSGFzaCxjYWxsYmFjayl7XG4gICAgLy8gICAgIGxldCBidWZmZXIgPSBCdWZmZXIuYWxsb2MoYnJpY2tTaXplc1ticmlja0hhc2hdKTtcbiAgICAvLyAgICAgZnMub3Blbihsb2NhdGlvbiwncisnLChlcnIsZmQpPT57XG4gICAgLy8gICAgICAgICBpZihlcnIpXG4gICAgLy8gICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgLy9cbiAgICAvLyAgICAgICAgIGZzLnJlYWQoZmQsYnVmZmVyLDAsYnVmZmVyLmxlbmd0aCxyZWxhdGl2ZVBvc2l0aW9uLChlcnIsYnl0ZXNSZWFkLGJ1ZmYpPT57XG4gICAgLy8gICAgICAgICAgICAgcmVsYXRpdmVQb3NpdGlvbiArPSBicmlja1NpemVzW2JpcmtIYXNoXTtcbiAgICAvLyAgICAgICAgICAgICBjYWxsYmFjayhlcnIsYnVmZmVyLnNsaWNlKDAsYnl0ZXNSZWFkKSk7XG4gICAgLy8gICAgICAgICB9KTtcbiAgICAvLyAgICAgfSk7XG4gICAgLy8gfVxuXG4gICAgdGhpcy5nZXRCcmljayA9IGZ1bmN0aW9uKGJyaWNrSW5kZXgsY2FsbGJhY2spe1xuICAgICAgICBsZXQgdGVtcEJ1ZmZlciA9IEJ1ZmZlci5hbGxvYyhtYXAuZ2V0UG9zaXRpb24oYnJpY2tJbmRleCsxKS1tYXAuZ2V0UG9zaXRpb24oYnJpY2tJbmRleCkpO1xuICAgICAgICBmcy5vcGVuKGxvY2F0aW9uLCdyKycsKGVycixmZCk9PntcbiAgICAgICAgICAgIGZzLnJlYWQoZmQsdGVtcEJ1ZmZlciwwLG1hcC5nZXRQb3NpdGlvbihicmlja0luZGV4KzEpLW1hcC5nZXRQb3NpdGlvbihicmlja0luZGV4KSxtYXAuZ2V0UG9zaXRpb24oYnJpY2tJbmRleCksKGVycixieXRlc1JlYWQsdGVtcEJ1ZmZlcik9PntcbiAgICAgICAgICAgICAgICBpZihlcnIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIHRlbXBCdWZmZXIgPSB0ZW1wQnVmZmVyLnNsaWNlKDAsYnl0ZXNSZWFkKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsdGVtcEJ1ZmZlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjcmVhdGVGaWxlQnJpY2tTdG9yYWdlOiBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGaWxlQnJpY2tTdG9yYWdlKGxvY2F0aW9uKTtcbiAgICB9XG59OyIsImNvbnN0IEJyaWNrID0gcmVxdWlyZShcIi4vQnJpY2tcIik7XG5cbmZ1bmN0aW9uIEZvbGRlckJhck1hcChoZWFkZXIpe1xuICAgIGhlYWRlciA9IGhlYWRlciB8fCB7fTtcbiAgICAvL2hlYWRlciBlc3RlIHVuIG1hcCBpbiBjYXJlIHZvbSByZXRpbmUgZGF0ZWxlIGludHItdW4gZm9ybWF0IGpzb25cbiAgICAvL3ZvbSBhdmVhIGtleS11bCBjYXJlIHZhIGZpIGZpbGVuYW1lLXVsLCBzaSBkYXRlbGUgY2FyZSB2YSBmaSBsaXN0YSBkZSBoYXNoLXVyaVxuICAgIHRoaXMuYWRkID0gZnVuY3Rpb24gKGZpbGVQYXRoLCBicmljaykge1xuICAgICAgICAvL2hhc2hMaXN0LXVsIHZhIGZpIGRpcmVjdCBsaXN0YSBkZSBoYXNoLXVyaSwgcGVudHJ1IGNhIG8gcHV0ZW0gZmFjZSBwZSBtYXN1cmFcbiAgICAgICAgLy9jZSBuZSBvY3VwYW0gZGUgc2FsdmFyZWEgYnJpY2stdXJpbG9yXG4gICAgICAgIGlmICh0eXBlb2YgaGVhZGVyW2ZpbGVQYXRoXSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgaGVhZGVyW2ZpbGVQYXRoXSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgaGVhZGVyW2ZpbGVQYXRoXS5wdXNoKGJyaWNrLmdldEhhc2goKSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0SGFzaExpc3QgPSBmdW5jdGlvbiAoZmlsZVBhdGgpIHtcbiAgICAgICAgLy9hdmVtIG5ldm9pZSBkZSBoYXNoLXVyaSBjYSBzYSBwdXRlbSBvYnRpbmUgYnJpY2stdXJpbGUgdW51aSBmaXNpZXJcbiAgICAgICAgLy91biBoYXNoIGVzdGUgZGUgZmFwdCBkZW51bWlyZWEgdW51aSBicmlja1xuICAgICAgICAvL2FjZWFzdGEgZnVuY3RpZSByZXR1cm5lYXphIGxpc3RhIGRlIGhhc2gtdXJpXG4gICAgICAgIHJldHVybiBoZWFkZXJbZmlsZVBhdGhdO1xuICAgIH07XG5cbiAgICB0aGlzLmVtcHR5TGlzdCA9IGZ1bmN0aW9uIChmaWxlUGF0aCkge1xuICAgICAgICBoZWFkZXJbZmlsZVBhdGhdID0gW107XG4gICAgfTtcblxuICAgIHRoaXMudG9CcmljayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBCcmljayhCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShoZWFkZXIpKSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0RmlsZUxpc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhoZWFkZXIpO1xuICAgIH07XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGb2xkZXJCYXJNYXA7IiwiY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCBCYXJNYXAgPSByZXF1aXJlKFwiLi9Gb2xkZXJCYXJNYXBcIik7XG5jb25zdCBCcmljayA9IHJlcXVpcmUoXCIuL0JyaWNrXCIpO1xuXG5mdW5jdGlvbiBGb2xkZXJCcmlja1N0b3JhZ2UobG9jYXRpb24pIHtcblxuICAgIHRoaXMucHV0QnJpY2sgPSBmdW5jdGlvbiAoYnJpY2ssIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ocGF0aC5qb2luKGxvY2F0aW9uLCBicmljay5nZXRIYXNoKCkpKTtcbiAgICAgICAgd3JpdGVTdHJlYW0ud3JpdGUoYnJpY2suZ2V0RGF0YSgpLCBjYWxsYmFjayk7XG4gICAgICAgIC8vYWNlYXN0YSBmdW5jdGllIHZhIHByaW1pIHVuIGJyaWNrXG4gICAgICAgIC8vc2kgdmEgYXBlbGEgbyBmdWNudGllIGRpbiBCYXJXb3JrZXIgY2Ugc2UgdmEgb2N1cGEgZGUgc2NyaWVyZWEgZGF0ZWxvciBpbiBmaXNpZXJcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRCcmljayA9IGZ1bmN0aW9uIChicmlja0hhc2gsIGNhbGxiYWNrKSB7XG4gICAgICAgIGZzLnJlYWRGaWxlKHBhdGguam9pbihsb2NhdGlvbiwgYnJpY2tIYXNoKSwgKGVyciwgYnJpY2tEYXRhKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIG5ldyBCcmljayhicmlja0RhdGEpKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZGVsZXRlQnJpY2sgPSBmdW5jdGlvbiAoYnJpY2tIYXNoLCBjYWxsYmFjaykge1xuICAgICAgICBmcy51bmxpbmsocGF0aC5qb2luKGxvY2F0aW9uLCBicmlja0hhc2gpLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIHRoaXMucHV0QmFyTWFwID0gZnVuY3Rpb24gKGJhck1hcCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgYmFyTWFwQnJpY2sgPSBiYXJNYXAudG9CcmljaygpO1xuICAgICAgICB0aGlzLnB1dEJyaWNrKGJhck1hcEJyaWNrLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBiYXJNYXBCcmljay5nZXRIYXNoKCkpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRCYXJNYXAgPSBmdW5jdGlvbiAobWFwRGlnZXN0LCBjYWxsYmFjaykge1xuICAgICAgICBpZiAodHlwZW9mIG1hcERpZ2VzdCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IG1hcERpZ2VzdDtcbiAgICAgICAgICAgIG1hcERpZ2VzdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgbWFwRGlnZXN0ID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sodW5kZWZpbmVkLCBuZXcgQmFyTWFwKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5nZXRCcmljayhtYXBEaWdlc3QsIChlcnIsIG1hcEJyaWNrKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIG5ldyBCYXJNYXAoSlNPTi5wYXJzZShtYXBCcmljay5nZXREYXRhKCkudG9TdHJpbmcoKSkpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vYWNlYXN0YSBmdW5jdGllIHZhIHByaW1pIGlkLXVsIHVudWkgYnJpY2tcbiAgICAvL3ZhIGNhdXRhIGZpc2llcnVsIGNhcnVpYSBpaSBjb3Jlc3B1bmRlIGlkLXVsXG4gICAgLy9pbCB2YSBjaXRpIHRvdCBwcmluIGludGVybWVkaXVsIEJhcldvcmtlciwgcHJpbnRyLW8gZnVuY3RpZVxuICAgIC8vaWwgdmEgdHJpbWl0ZSBpbiBjYWxsYmFjaywgdW5kZSB2YSBmaSBtYWkgZGVwYXJ0ZSwgc2FsdmF0XG4gICAgLy9wYXJ0ZWEgZGUgY2l0aXJlIHZhIGZpIGZhY3V0YSBwcmluIGludGVybWVkaXVsIGZ1bmN0aWVpICdyZWFkRnJvbUZpbGUnIGRpbiBCYXJXb3JrZXJcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY3JlYXRlRm9sZGVyQnJpY2tTdG9yYWdlOiBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGb2xkZXJCcmlja1N0b3JhZ2UobG9jYXRpb24pO1xuICAgIH1cbn07IiwiY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IEFzeW5jRGlzcHRhY2hlciA9IHJlcXVpcmUoXCIuLi91dGlscy9Bc3luY0Rpc3BhdGNoZXJcIik7XG5cbmZ1bmN0aW9uIFBhdGhBc3luY0l0ZXJhdG9yKGlucHV0UGF0aCkge1xuICAgIGxldCByZW1vdmFibGVQYXRoTGVuO1xuICAgIGNvbnN0IGZpbGVMaXN0ID0gW107XG4gICAgY29uc3QgZm9sZGVyTGlzdCA9IFtdO1xuICAgIGxldCBpc0ZpcnN0Q2FsbCA9IHRydWU7XG4gICAgbGV0IHBhdGhJc0ZvbGRlcjtcblxuICAgIHRoaXMubmV4dCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICBpZiAoaXNGaXJzdENhbGwgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGlzRGlyKGlucHV0UGF0aCwgKGVyciwgc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpc0ZpcnN0Q2FsbCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHBhdGhJc0ZvbGRlciA9IHN0YXR1cztcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNwbGl0SW5wdXRQYXRoID0gaW5wdXRQYXRoLnNwbGl0KHBhdGguc2VwKTtcbiAgICAgICAgICAgICAgICAgICAgc3BsaXRJbnB1dFBhdGgucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlbW92YWJsZVBhdGhMZW4gPSBzcGxpdElucHV0UGF0aC5qb2luKHBhdGguc2VwKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGZvbGRlckxpc3QucHVzaChpbnB1dFBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBnZXROZXh0RmlsZUZyb21Gb2xkZXIoY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlbW92YWJsZVBhdGhMZW4gPSBwYXRoLmRpcm5hbWUoaW5wdXRQYXRoKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gaW5wdXRQYXRoLnN1YnN0cmluZyhyZW1vdmFibGVQYXRoTGVuKTtcblxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfWVsc2UgaWYocGF0aElzRm9sZGVyKXtcbiAgICAgICAgICAgIGdldE5leHRGaWxlRnJvbUZvbGRlcihjYWxsYmFjayk7XG4gICAgICAgIH1lbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLUludGVybmFsIG1ldGhvZHMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgZnVuY3Rpb24gd2Fsa0ZvbGRlcihmb2xkZXJQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBhc3luY0Rpc3BhdGNoZXIgPSBuZXcgQXN5bmNEaXNwdGFjaGVyKChlcnJvcnMsIHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgIGlmIChmaWxlTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBmaWxlTGlzdC5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayh1bmRlZmluZWQsIGZpbGVOYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZvbGRlckxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlck5hbWUgPSBmb2xkZXJMaXN0LnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdhbGtGb2xkZXIoZm9sZGVyTmFtZSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnMucmVhZGRpcihmb2xkZXJQYXRoLCAoZXJyLCBmaWxlcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID09PSAwICYmIGZvbGRlckxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmaWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICB3YWxrRm9sZGVyKGZvbGRlckxpc3Quc2hpZnQoKSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkoZmlsZXMubGVuZ3RoKTtcblxuICAgICAgICAgICAgZmlsZXMuZm9yRWFjaChmaWxlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgZmlsZSk7XG4gICAgICAgICAgICAgICAgaXNEaXIoZmlsZVBhdGgsIChlcnIsIHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGF0dXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvbGRlckxpc3QucHVzaChmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlTGlzdC5wdXNoKGZpbGVQYXRoLnN1YnN0cmluZyhyZW1vdmFibGVQYXRoTGVuKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBhc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0RpcihmaWxlUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgZnMuc3RhdChmaWxlUGF0aCwgKGVyciwgc3RhdHMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHVuZGVmaW5lZCwgc3RhdHMuaXNEaXJlY3RvcnkoKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5leHRGaWxlRnJvbUZvbGRlcihjYWxsYmFjaykge1xuICAgICAgICBpZiAoZmlsZUxpc3QubGVuZ3RoID09PSAwICYmIGZvbGRlckxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmaWxlTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IGZpbGVMaXN0LnNoaWZ0KCk7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sodW5kZWZpbmVkLCBmaWxlTmFtZSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIHdhbGtGb2xkZXIoZm9sZGVyTGlzdC5zaGlmdCgpLCAoZXJyLCBmaWxlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgZmlsZSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gRnNCYXJXb3JrZXIoKSB7XG5cbiAgICBsZXQgcGF0aEFzeW5jSXRlcmF0b3I7XG5cbiAgICB0aGlzLmdldEZpbGVTaXplID0gZnVuY3Rpb24gKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICBmcy5zdGF0KGZpbGVQYXRoLCAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHN0YXRzLnNpemUpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy9yZWFkQmxvY2tGcm9tRmlsZVxuICAgIHRoaXMucmVhZEJsb2NrRnJvbUZpbGUgPSBmdW5jdGlvbiAoZmlsZVBhdGgsIGJsb2NrSW5kZXgsIGJ1ZmZlclNpemUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGZzLm9wZW4oZmlsZVBhdGgsICdyKycsIGZ1bmN0aW9uIChlcnIsIGZkKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBidWZmZXIgPSBCdWZmZXIuYWxsb2MoYnVmZmVyU2l6ZSk7XG4gICAgICAgICAgICBmcy5yZWFkKGZkLCBidWZmZXIsIDAsIGJ1ZmZlclNpemUsIGJ1ZmZlclNpemUgKiBibG9ja0luZGV4LCAoZXJyLCBieXRlc1JlYWQsIGJ1ZmZlcikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnMuY2xvc2UoZmQsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBidWZmZXIuc2xpY2UoMCwgYnl0ZXNSZWFkKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0TmV4dEZpbGUgPSBmdW5jdGlvbiAoaW5wdXRQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICBwYXRoQXN5bmNJdGVyYXRvciA9IHBhdGhBc3luY0l0ZXJhdG9yIHx8IG5ldyBQYXRoQXN5bmNJdGVyYXRvcihpbnB1dFBhdGgpO1xuICAgICAgICBwYXRoQXN5bmNJdGVyYXRvci5uZXh0KGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgLy9hcHBlbmRUb0ZpbGVcbiAgICB0aGlzLmFwcGVuZEJsb2NrVG9GaWxlID0gZnVuY3Rpb24gKGZpbGVQYXRoLCBkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBwdGggPSBjb25zdHJ1Y3RQYXRoKGZpbGVQYXRoKTtcblxuICAgICAgICBmcy5ta2RpcihwdGgsIHtyZWN1cnNpdmU6IHRydWV9LCAoZXJyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyICYmIGVyci5jb2RlICE9PSBcIkVFWElTVFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZzLmFwcGVuZEZpbGUoZmlsZVBhdGgsIGRhdGEsIGNhbGxiYWNrKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vIHRoaXMuZ2V0UmVhZFN0cmVhbSA9IGZ1bmN0aW9uKGZpbGVQYXRoLGJ1ZmZlclNpemUpe1xuICAgIC8vICAgICByZXR1cm4gZnMuY3JlYXRlUmVhZFN0cmVhbShmaWxlUGF0aCx7aGlnaFdhdGVyTWFyazpidWZmZXJTaXplfSk7XG4gICAgLy8gfVxuXG4gICAgLy8gdGhpcy5nZXRXcml0ZVN0cmVhbSA9IGZ1bmN0aW9uKGZpbGVQYXRoKXtcbiAgICAvLyAgICAgcmV0dXJuIGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGZpbGVQYXRoKTtcbiAgICAvLyB9XG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBJbnRlcm5hbCBtZXRob2RzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgIGZ1bmN0aW9uIGNvbnN0cnVjdFBhdGgoZmlsZVBhdGgpIHtcbiAgICAgICAgbGV0IHNsaWNlcyA9IGZpbGVQYXRoLnNwbGl0KHBhdGguc2VwKTtcbiAgICAgICAgc2xpY2VzLnBvcCgpO1xuICAgICAgICByZXR1cm4gc2xpY2VzLmpvaW4ocGF0aC5zZXApO1xuICAgIH1cblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjcmVhdGVGc0JhcldvcmtlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IEZzQmFyV29ya2VyKCk7XG4gICAgfVxufTsiLCJcbmZ1bmN0aW9uIEFzeW5jRGlzcGF0Y2hlcihmaW5hbENhbGxiYWNrKSB7XG5cdGxldCByZXN1bHRzID0gW107XG5cdGxldCBlcnJvcnMgPSBbXTtcblxuXHRsZXQgc3RhcnRlZCA9IDA7XG5cblx0ZnVuY3Rpb24gbWFya09uZUFzRmluaXNoZWQoZXJyLCByZXMpIHtcblx0XHRpZihlcnIpIHtcblx0XHRcdGVycm9ycy5wdXNoKGVycik7XG5cdFx0fVxuXG5cdFx0aWYoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcblx0XHRcdGFyZ3VtZW50c1swXSA9IHVuZGVmaW5lZDtcblx0XHRcdHJlcyA9IGFyZ3VtZW50cztcblx0XHR9XG5cblx0XHRpZih0eXBlb2YgcmVzICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdFx0XHRyZXN1bHRzLnB1c2gocmVzKTtcblx0XHR9XG5cblx0XHRpZigtLXN0YXJ0ZWQgPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxDYWxsYmFjaygpO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGRpc3BhdGNoRW1wdHkoYW1vdW50ID0gMSkge1xuXHRcdHN0YXJ0ZWQgKz0gYW1vdW50O1xuXHR9XG5cblx0ZnVuY3Rpb24gY2FsbENhbGxiYWNrKCkge1xuXHQgICAgaWYoZXJyb3JzICYmIGVycm9ycy5sZW5ndGggPT09IDApIHtcblx0ICAgICAgICBlcnJvcnMgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuXHQgICAgaWYocmVzdWx0cyAmJiByZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgICAgIHJlc3VsdHMgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBmaW5hbENhbGxiYWNrKGVycm9ycywgcmVzdWx0cyk7XG4gICAgfVxuXG5cdHJldHVybiB7XG5cdFx0ZGlzcGF0Y2hFbXB0eSxcblx0XHRtYXJrT25lQXNGaW5pc2hlZFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFzeW5jRGlzcGF0Y2hlcjsiLCJmdW5jdGlvbiBpc1N0cmVhbShzdHJlYW0pe1xuICAgIHJldHVybiBzdHJlYW0gIT09IG51bGwgJiYgdHlwZW9mIHN0cmVhbSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHN0cmVhbS5waXBlID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc1dyaXRhYmxlKHN0cmVhbSkge1xuICAgIHJldHVybiBpc1N0cmVhbShzdHJlYW0pICYmXG4gICAgICAgIHN0cmVhbS53cml0YWJsZSAhPT0gZmFsc2UgJiZcbiAgICAgICAgdHlwZW9mIHN0cmVhbS5fd3JpdGUgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgdHlwZW9mIHN0cmVhbS5fd3JpdGFibGVTdGF0ZSA9PT0gJ29iamVjdCc7XG5cbn1cblxuZnVuY3Rpb24gaXNSZWFkYWJsZShzdHJlYW0pIHtcbiAgICByZXR1cm4gaXNTdHJlYW0oc3RyZWFtKSAmJlxuICAgICAgICBzdHJlYW0ucmVhZGFibGUgIT09IGZhbHNlICYmXG4gICAgICAgIHR5cGVvZiBzdHJlYW0uX3JlYWQgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgdHlwZW9mIHN0cmVhbS5fcmVhZGFibGVTdGF0ZSA9PT0gJ29iamVjdCc7XG59XG5cbmZ1bmN0aW9uIGlzRHVwbGV4KHN0cmVhbSl7XG4gICAgcmV0dXJuIGlzV3JpdGFibGUoc3RyZWFtKSAmJlxuICAgICAgICBpc1JlYWRhYmxlKHN0cmVhbSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGlzU3RyZWFtLFxuICAgIGlzUmVhZGFibGUsXG4gICAgaXNXcml0YWJsZSxcbiAgICBpc0R1cGxleFxufTtcbiIsImNvbnN0IGZsb3dzVXRpbHMgPSByZXF1aXJlKFwiLi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi91dGlscy92YWxpZGF0b3JcIik7XG5jb25zdCBEc2VlZENhZ2UgPSByZXF1aXJlKFwiLi4vdXRpbHMvRHNlZWRDYWdlXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJhZGRCYWNrdXBcIiwge1xuICAgIHN0YXJ0OiBmdW5jdGlvbiAoYmFja3VwVXJsLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgICAgICAgaWYoIWJhY2t1cFVybCl7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgbmV3IEVycm9yKFwiTm8gYmFja3VwIHVybCBwcm92aWRlZFwiKSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuYmFja3VwVXJsID0gYmFja3VwVXJsO1xuICAgICAgICBmcy5zdGF0KHBhdGguam9pbih0aGlzLmxvY2FsRm9sZGVyLCBcIi5wcml2YXRlU2t5XCIsICdkc2VlZCcpLCAoZXJyLCBzdGF0cyk9PntcbiAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiY3JlYXRlUGluXCIsIGZsb3dzVXRpbHMuZGVmYXVsdFBpbiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHZhbGlkYXRlUGluOiBmdW5jdGlvbiAocGluKSB7XG4gICAgICAgIHZhbGlkYXRvci52YWxpZGF0ZVBpbih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLCBcImFkZEJhY2t1cFwiLCBwaW4sIGZsb3dzVXRpbHMubm9Ucmllcyk7XG4gICAgfSxcbiAgICBcbiAgICBhZGRCYWNrdXA6IGZ1bmN0aW9uIChwaW4gPSBmbG93c1V0aWxzLmRlZmF1bHRQaW4sIGJhY2t1cHMpIHtcbiAgICAgICAgYmFja3VwcyA9IGJhY2t1cHMgfHwgW107XG4gICAgICAgIGJhY2t1cHMucHVzaCh0aGlzLmJhY2t1cFVybCk7XG4gICAgICAgIGNvbnN0IGRzZWVkQ2FnZSA9IG5ldyBEc2VlZENhZ2UodGhpcy5sb2NhbEZvbGRlcik7XG4gICAgICAgIGRzZWVkQ2FnZS5zYXZlRHNlZWRCYWNrdXBzKHBpbiwgdGhpcy5jc2JJZGVudGlmaWVyLCBiYWNrdXBzLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAnZmluaXNoJywgXCJGYWlsZWQgdG8gc2F2ZSBiYWNrdXBzXCIpKTtcbiAgICB9LFxuXG4gICAgZmluaXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCAncHJpbnRJbmZvJywgdGhpcy5iYWNrdXBVcmwgKyAnIGhhcyBiZWVuIHN1Y2Nlc3NmdWxseSBhZGRlZCB0byBiYWNrdXBzIGxpc3QuJyk7XG4gICAgfVxufSk7IiwiLy8gdmFyIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcblxuY29uc3QgdXRpbHMgPSByZXF1aXJlKFwiLi8uLi91dGlscy9mbG93c1V0aWxzXCIpO1xuLy8gY29uc3QgY3J5cHRvID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcbi8vIHZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJhZGRDc2JcIiwge1xuXHRzdGFydDogZnVuY3Rpb24gKGFsaWFzQ3NiLCBhbGlhc0Rlc3RDc2IpIHtcblx0XHR0aGlzLmFsaWFzQ3NiID0gYWxpYXNDc2I7XG5cdFx0dGhpcy5hbGlhc0Rlc3RDc2IgPSBhbGlhc0Rlc3RDc2I7XG5cdFx0dGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFBpblwiLCAzKTtcblx0fSxcblx0dmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dXRpbHMuY2hlY2tQaW5Jc1ZhbGlkKHBpbiwgZnVuY3Rpb24gKGVycikge1xuXHRcdFx0aWYoZXJyKXtcblx0XHRcdFx0c2VsZi5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFBpblwiLCBub1RyaWVzLTEpO1xuXHRcdFx0fWVsc2Uge1xuXHRcdFx0XHRzZWxmLmFkZENzYihwaW4sIHNlbGYuYWxpYXNDc2IpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHRhZGRDc2I6IGZ1bmN0aW9uIChwaW4sIGFsaWFzQ1NiLCBhbGlhc0Rlc3RDc2IsIGNhbGxiYWNrKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHV0aWxzLmdldENzYihwaW4sIGFsaWFzQ1NiLCBmdW5jdGlvbiAoZXJyLCBwYXJlbnRDc2IpIHtcblx0XHRcdGlmKGVycil7XG5cdFx0XHRcdHNlbGYuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImhhbmRsZUVycm9yXCIsIGVyciwgXCJGYWlsZWQgdG8gZ2V0IGNzYlwiKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufSk7IiwiY29uc3QgZmxvd3NVdGlscyA9IHJlcXVpcmUoXCIuLy4uL3V0aWxzL2Zsb3dzVXRpbHNcIik7XG5jb25zdCB1dGlscyA9IHJlcXVpcmUoXCIuLy4uL3V0aWxzL3V0aWxzXCIpO1xuY29uc3QgY3J5cHRvID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcbmNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi91dGlscy92YWxpZGF0b3JcIik7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZShcIi4uL2xpYi9DU0JJZGVudGlmaWVyXCIpO1xuY29uc3QgSGFzaENhZ2UgPSByZXF1aXJlKCcuLi91dGlscy9IYXNoQ2FnZScpO1xuY29uc3QgUm9vdENTQiA9IHJlcXVpcmUoXCIuLi9saWIvUm9vdENTQlwiKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJhdHRhY2hGaWxlXCIsIHsgLy91cmw6IENTQjEvQ1NCMi9hbGlhc0ZpbGVcbiAgICBzdGFydDogZnVuY3Rpb24gKHVybCwgZmlsZVBhdGgsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkgeyAvL2NzYjE6YXNzZXRUeXBlOmFsaWFzXG4gICAgICAgIGNvbnN0IHtDU0JQYXRoLCBhbGlhc30gPSB1dGlscy5wcm9jZXNzVXJsKHVybCwgJ0ZpbGVSZWZlcmVuY2UnKTtcbiAgICAgICAgdGhpcy5DU0JQYXRoID0gQ1NCUGF0aDtcbiAgICAgICAgdGhpcy5hbGlhcyA9IGFsaWFzO1xuICAgICAgICB0aGlzLmZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFBpblwiLCBmbG93c1V0aWxzLm5vVHJpZXMpO1xuICAgIH0sXG5cbiAgICB2YWxpZGF0ZVBpbjogZnVuY3Rpb24gKHBpbiwgbm9Ucmllcykge1xuICAgICAgICB2YWxpZGF0b3IudmFsaWRhdGVQaW4odGhpcy5sb2NhbEZvbGRlciwgdGhpcywgJ2xvYWRGaWxlUmVmZXJlbmNlJywgcGluLCBub1RyaWVzKTtcbiAgICB9LFxuXG4gICAgd2l0aENTQklkZW50aWZpZXI6IGZ1bmN0aW9uIChpZCwgdXJsLCBmaWxlUGF0aCwgbG9jYWxGb2xkZXIgPSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgICAgIGNvbnN0IHtDU0JQYXRoLCBhbGlhc30gPSB1dGlscy5wcm9jZXNzVXJsKHVybCwgJ0ZpbGVSZWZlcmVuY2UnKTtcbiAgICAgICAgdGhpcy5DU0JQYXRoID0gQ1NCUGF0aDtcbiAgICAgICAgdGhpcy5hbGlhcyA9IGFsaWFzO1xuICAgICAgICB0aGlzLmZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgdGhpcy5jc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoaWQpO1xuICAgICAgICBSb290Q1NCLmxvYWRXaXRoSWRlbnRpZmllcih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLmNzYklkZW50aWZpZXIsIChlcnIsIHJvb3RDU0IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBlcnIsIFwiRmFpbGVkIHRvIGxvYWQgcm9vdENTQlwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMucm9vdENTQiA9IHJvb3RDU0I7XG4gICAgICAgICAgICB0aGlzLmxvYWRGaWxlUmVmZXJlbmNlKCk7XG5cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGxvYWRGaWxlUmVmZXJlbmNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucm9vdENTQi5sb2FkUmF3Q1NCKCcnLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAnbG9hZEFzc2V0JywgJ0ZhaWxlZCB0byBsb2FkIG1hc3RlckNTQi4nKSk7XG4gICAgfSxcblxuICAgIGxvYWRBc3NldDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJvb3RDU0IubG9hZEFzc2V0RnJvbVBhdGgodGhpcy5DU0JQYXRoLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAnc2F2ZUZpbGVUb0Rpc2snLCAnRmFpbGVkIHRvIGxvYWQgYXNzZXQnKSk7XG4gICAgfSxcblxuICAgIHNhdmVGaWxlVG9EaXNrOiBmdW5jdGlvbiAoZmlsZVJlZmVyZW5jZSkge1xuICAgICAgICBpZiAoZmlsZVJlZmVyZW5jZS5pc1BlcnNpc3RlZCgpKSB7XG4gICAgICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBuZXcgRXJyb3IoXCJGaWxlIGlzIHBlcnNpc3RlZFwiKSwgXCJBIGZpbGUgd2l0aCB0aGUgc2FtZSBhbGlhcyBhbHJlYWR5IGV4aXN0cyBcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIodW5kZWZpbmVkLCB0aGlzLmNzYklkZW50aWZpZXIuZ2V0QmFja3VwVXJscygpKTtcbiAgICAgICAgdGhpcy5maWxlSUQgPSB1dGlscy5nZW5lcmF0ZVBhdGgodGhpcy5sb2NhbEZvbGRlciwgY3NiSWRlbnRpZmllcik7XG4gICAgICAgIGNyeXB0by5vbigncHJvZ3Jlc3MnLCAocHJvZ3Jlc3MpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ3JlcG9ydFByb2dyZXNzJywgcHJvZ3Jlc3MpO1xuICAgICAgICB9KTtcbiAgICAgICAgY3J5cHRvLmVuY3J5cHRTdHJlYW0odGhpcy5maWxlUGF0aCwgdGhpcy5maWxlSUQsIGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKSwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgJ3NhdmVGaWxlUmVmZXJlbmNlJywgXCJGYWlsZWQgYXQgZmlsZSBlbmNyeXB0aW9uLlwiLCBmaWxlUmVmZXJlbmNlLCBjc2JJZGVudGlmaWVyKSk7XG5cbiAgICB9LFxuXG5cbiAgICBzYXZlRmlsZVJlZmVyZW5jZTogZnVuY3Rpb24gKGZpbGVSZWZlcmVuY2UsIGNzYklkZW50aWZpZXIpIHtcbiAgICAgICAgY3J5cHRvLnJlbW92ZUFsbExpc3RlbmVycygncHJvZ3Jlc3MnKTtcbiAgICAgICAgZmlsZVJlZmVyZW5jZS5pbml0KHRoaXMuYWxpYXMsIGNzYklkZW50aWZpZXIuZ2V0U2VlZCgpLCBjc2JJZGVudGlmaWVyLmdldERzZWVkKCkpO1xuICAgICAgICB0aGlzLnJvb3RDU0Iuc2F2ZUFzc2V0VG9QYXRoKHRoaXMuQ1NCUGF0aCwgZmlsZVJlZmVyZW5jZSwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgJ2NvbXB1dGVIYXNoJywgXCJGYWlsZWQgdG8gc2F2ZSBmaWxlXCIsIHRoaXMuZmlsZUlEKSk7XG4gICAgfSxcblxuXG4gICAgY29tcHV0ZUhhc2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc3QgZmlsZVN0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0odGhpcy5maWxlSUQpO1xuICAgICAgICBjcnlwdG8ucHNrSGFzaFN0cmVhbShmaWxlU3RyZWFtLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcImxvYWRIYXNoT2JqXCIsIFwiRmFpbGVkIHRvIGNvbXB1dGUgaGFzaFwiKSk7XG4gICAgfSxcblxuICAgIGxvYWRIYXNoT2JqOiBmdW5jdGlvbiAoZGlnZXN0KSB7XG4gICAgICAgIHRoaXMuaGFzaENhZ2UgPSBuZXcgSGFzaENhZ2UodGhpcy5sb2NhbEZvbGRlcik7XG4gICAgICAgIHRoaXMuaGFzaENhZ2UubG9hZEhhc2godmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJhZGRUb0hhc2hPYmpcIiwgXCJGYWlsZWQgdG8gbG9hZCBoYXNoT2JqXCIsIGRpZ2VzdCkpO1xuICAgIH0sXG5cbiAgICBhZGRUb0hhc2hPYmo6IGZ1bmN0aW9uIChoYXNoT2JqLCBkaWdlc3QpIHtcbiAgICAgICAgaGFzaE9ialtwYXRoLmJhc2VuYW1lKHRoaXMuZmlsZUlEKV0gPSBkaWdlc3QudG9TdHJpbmcoXCJoZXhcIik7XG4gICAgICAgIHRoaXMuaGFzaENhZ2Uuc2F2ZUhhc2goaGFzaE9iaiwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJwcmludFN1Y2Nlc3NcIiwgXCJGYWlsZWQgdG8gc2F2ZSBoYXNoT2JqXCIpKTtcbiAgICB9LFxuXG4gICAgcHJpbnRTdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInByaW50SW5mb1wiLCB0aGlzLmZpbGVQYXRoICsgXCIgaGFzIGJlZW4gc3VjY2Vzc2Z1bGx5IGFkZGVkIHRvIFwiICsgdGhpcy5DU0JQYXRoKTtcbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiX19yZXR1cm5fX1wiKTtcbiAgICB9XG59KTtcbiIsImNvbnN0IGZsb3dzVXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy9mbG93c1V0aWxzJyk7XG5jb25zdCBSb290Q1NCID0gcmVxdWlyZShcIi4uL2xpYi9Sb290Q1NCXCIpO1xuY29uc3QgUmF3Q1NCID0gcmVxdWlyZShcIi4uL2xpYi9SYXdDU0JcIik7XG5jb25zdCB2YWxpZGF0b3IgPSByZXF1aXJlKFwiLi4vdXRpbHMvdmFsaWRhdG9yXCIpO1xuY29uc3QgRHNlZWRDYWdlID0gcmVxdWlyZShcIi4uL3V0aWxzL0RzZWVkQ2FnZVwiKTtcbmNvbnN0IENTQklkZW50aWZpZXIgPSByZXF1aXJlKFwiLi4vbGliL0NTQklkZW50aWZpZXJcIik7XG5cbiQkLnN3YXJtLmRlc2NyaWJlKFwiY3JlYXRlQ3NiXCIsIHtcbiAgICBzdGFydDogZnVuY3Rpb24gKENTQlBhdGgsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuQ1NCUGF0aCA9IENTQlBhdGggfHwgJyc7XG4gICAgICAgIHZhbGlkYXRvci5jaGVja01hc3RlckNTQkV4aXN0cyhsb2NhbEZvbGRlciwgKGVyciwgc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiY3JlYXRlUGluXCIsIGZsb3dzVXRpbHMuZGVmYXVsdFBpbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHdpdGhvdXRQaW46IGZ1bmN0aW9uIChDU0JQYXRoLCBiYWNrdXBzLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCksIHNlZWQsIGlzTWFzdGVyID0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICB0aGlzLkNTQlBhdGggPSBDU0JQYXRoO1xuICAgICAgICB0aGlzLmlzTWFzdGVyID0gaXNNYXN0ZXI7XG4gICAgICAgIGlmICh0eXBlb2YgYmFja3VwcyA9PT0gJ3VuZGVmaW5lZCcgfHwgYmFja3Vwcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGJhY2t1cHMgPSBbIGZsb3dzVXRpbHMuZGVmYXVsdEJhY2t1cCBdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFsaWRhdG9yLmNoZWNrTWFzdGVyQ1NCRXhpc3RzKGxvY2FsRm9sZGVyLCAoZXJyLCBzdGF0dXMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZU1hc3RlckNTQihiYWNrdXBzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKHNlZWQpO1xuICAgICAgICAgICAgICAgIHRoaXMud2l0aENTQklkZW50aWZpZXIoQ1NCUGF0aCwgY3NiSWRlbnRpZmllcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIHdpdGhDU0JJZGVudGlmaWVyOiBmdW5jdGlvbiAoQ1NCUGF0aCwgY3NiSWRlbnRpZmllcikge1xuICAgICAgICB0aGlzLkNTQlBhdGggPSBDU0JQYXRoO1xuICAgICAgICBSb290Q1NCLmxvYWRXaXRoSWRlbnRpZmllcih0aGlzLmxvY2FsRm9sZGVyLCBjc2JJZGVudGlmaWVyLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAnY3JlYXRlQ1NCJywgJ0ZhaWxlZCB0byBsb2FkIG1hc3RlciB3aXRoIHByb3ZpZGVkIGRzZWVkJykpO1xuICAgIH0sXG5cbiAgICB2YWxpZGF0ZVBpbjogZnVuY3Rpb24gKHBpbiwgbm9Ucmllcykge1xuICAgICAgICB2YWxpZGF0b3IudmFsaWRhdGVQaW4odGhpcy5sb2NhbEZvbGRlciwgdGhpcywgXCJjcmVhdGVDU0JcIiwgcGluLCBub1RyaWVzKTtcbiAgICB9LFxuXG4gICAgbG9hZEJhY2t1cHM6IGZ1bmN0aW9uIChwaW4pIHtcbiAgICAgICAgdGhpcy5waW4gPSBwaW47XG4gICAgICAgIHRoaXMuZHNlZWRDYWdlID0gbmV3IERzZWVkQ2FnZSh0aGlzLmxvY2FsRm9sZGVyKTtcbiAgICAgICAgdGhpcy5kc2VlZENhZ2UubG9hZERzZWVkQmFja3Vwcyh0aGlzLnBpbiwgKGVyciwgY3NiSWRlbnRpZmllciwgYmFja3VwcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlTWFzdGVyQ1NCKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlTWFzdGVyQ1NCKGJhY2t1cHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgY3JlYXRlTWFzdGVyQ1NCOiBmdW5jdGlvbiAoYmFja3Vwcykge1xuICAgICAgICB0aGlzLmNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcih1bmRlZmluZWQsIGJhY2t1cHMgfHwgZmxvd3NVdGlscy5kZWZhdWx0QmFja3VwKTtcblxuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJwcmludFNlbnNpdGl2ZUluZm9cIiwgdGhpcy5jc2JJZGVudGlmaWVyLmdldFNlZWQoKSwgZmxvd3NVdGlscy5kZWZhdWx0UGluKTtcblxuICAgICAgICBjb25zdCByYXdDU0IgPSBuZXcgUmF3Q1NCKCk7XG4gICAgICAgIGNvbnN0IG1ldGEgPSByYXdDU0IuZ2V0QXNzZXQoJ2dsb2JhbC5DU0JNZXRhJywgJ21ldGEnKTtcbiAgICAgICAgbWV0YS5pbml0KCk7XG4gICAgICAgIG1ldGEuc2V0SXNNYXN0ZXIodHJ1ZSk7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5pc01hc3RlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIG1ldGEuc2V0SXNNYXN0ZXIodGhpcy5pc01hc3Rlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmF3Q1NCLnNhdmVBc3NldChtZXRhKTtcbiAgICAgICAgdGhpcy5yb290Q1NCID0gUm9vdENTQi5jcmVhdGVOZXcodGhpcy5sb2NhbEZvbGRlciwgdGhpcy5jc2JJZGVudGlmaWVyLCByYXdDU0IpO1xuICAgICAgICBjb25zdCBuZXh0UGhhc2UgPSAodGhpcy5DU0JQYXRoID09PSAnJyB8fCB0eXBlb2YgdGhpcy5DU0JQYXRoID09PSAndW5kZWZpbmVkJykgPyAnc2F2ZVJhd0NTQicgOiAnY3JlYXRlQ1NCJztcbiAgICAgICAgaWYgKHRoaXMucGluKSB7XG4gICAgICAgICAgICB0aGlzLmRzZWVkQ2FnZS5zYXZlRHNlZWRCYWNrdXBzKHRoaXMucGluLCB0aGlzLmNzYklkZW50aWZpZXIsIGJhY2t1cHMsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIG5leHRQaGFzZSwgXCJGYWlsZWQgdG8gc2F2ZSBkc2VlZCBcIikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpc1tuZXh0UGhhc2VdKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgY3JlYXRlQ1NCOiBmdW5jdGlvbiAocm9vdENTQikge1xuICAgICAgICB0aGlzLnJvb3RDU0IgPSB0aGlzLnJvb3RDU0IgfHwgcm9vdENTQjtcbiAgICAgICAgY29uc3QgcmF3Q1NCID0gbmV3IFJhd0NTQigpO1xuICAgICAgICBjb25zdCBtZXRhID0gcmF3Q1NCLmdldEFzc2V0KFwiZ2xvYmFsLkNTQk1ldGFcIiwgXCJtZXRhXCIpO1xuICAgICAgICBtZXRhLmluaXQoKTtcbiAgICAgICAgbWV0YS5zZXRJc01hc3RlcihmYWxzZSk7XG4gICAgICAgIHJhd0NTQi5zYXZlQXNzZXQobWV0YSk7XG4gICAgICAgIHRoaXMuc2F2ZVJhd0NTQihyYXdDU0IpO1xuICAgIH0sXG5cbiAgICBzYXZlUmF3Q1NCOiBmdW5jdGlvbiAocmF3Q1NCKSB7XG4gICAgICAgIHRoaXMucm9vdENTQi5zYXZlUmF3Q1NCKHJhd0NTQiwgdGhpcy5DU0JQYXRoLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcInByaW50U3VjY2Vzc1wiLCBcIkZhaWxlZCB0byBzYXZlIHJhdyBDU0JcIikpO1xuXG4gICAgfSxcblxuXG4gICAgcHJpbnRTdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBtZXNzYWdlID0gXCJTdWNjZXNzZnVsbHkgc2F2ZWQgQ1NCIGF0IHBhdGggXCIgKyB0aGlzLkNTQlBhdGg7XG4gICAgICAgIGlmICghdGhpcy5DU0JQYXRoIHx8IHRoaXMuQ1NCUGF0aCA9PT0gJycpIHtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSAnU3VjY2Vzc2Z1bGx5IHNhdmVkIENTQiByb290JztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJwcmludEluZm9cIiwgbWVzc2FnZSk7XG4gICAgICAgIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ19fcmV0dXJuX18nKTtcbiAgICB9XG59KTtcbiIsImNvbnN0IGZsb3dzVXRpbHMgPSByZXF1aXJlKFwiLi8uLi91dGlscy9mbG93c1V0aWxzXCIpO1xuY29uc3QgdXRpbHMgPSByZXF1aXJlKFwiLi8uLi91dGlscy91dGlsc1wiKTtcbmNvbnN0IGNyeXB0byA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5jb25zdCB2YWxpZGF0b3IgPSByZXF1aXJlKFwiLi4vdXRpbHMvdmFsaWRhdG9yXCIpO1xuY29uc3QgQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoXCIuLi9saWIvQ1NCSWRlbnRpZmllclwiKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJleHRyYWN0RmlsZVwiLCB7XG5cdHN0YXJ0OiBmdW5jdGlvbiAodXJsLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcblx0XHR0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG5cdFx0Y29uc3Qge0NTQlBhdGgsIGFsaWFzfSA9IHV0aWxzLnByb2Nlc3NVcmwodXJsLCAnZ2xvYmFsLkZpbGVSZWZlcmVuY2UnKTtcblx0XHR0aGlzLkNTQlBhdGggPSBDU0JQYXRoO1xuXHRcdHRoaXMuYWxpYXMgPSBhbGlhcztcblx0XHR0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkUGluXCIsIGZsb3dzVXRpbHMubm9Ucmllcyk7XG5cdH0sXG5cblx0dmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcblx0XHR2YWxpZGF0b3IudmFsaWRhdGVQaW4odGhpcy5sb2NhbEZvbGRlciwgdGhpcywgXCJsb2FkRmlsZUFzc2V0XCIsIHBpbiwgbm9Ucmllcyk7XG5cdH0sXG5cblx0bG9hZEZpbGVBc3NldDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMucm9vdENTQi5sb2FkQXNzZXRGcm9tUGF0aCh0aGlzLkNTQlBhdGgsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwiZGVjcnlwdEZpbGVcIiwgXCJGYWlsZWQgdG8gbG9hZCBmaWxlIGFzc2V0IFwiICsgdGhpcy5hbGlhcykpO1xuXHR9LFxuXHRcblx0ZGVjcnlwdEZpbGU6IGZ1bmN0aW9uIChmaWxlUmVmZXJlbmNlKSB7XG5cdFx0Y29uc3QgY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKGZpbGVSZWZlcmVuY2UuZHNlZWQpO1xuXHRcdGNvbnN0IGZpbGVQYXRoID0gdXRpbHMuZ2VuZXJhdGVQYXRoKHRoaXMubG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIpO1xuXG5cdFx0Y3J5cHRvLm9uKCdwcm9ncmVzcycsIChwcm9ncmVzcykgPT4ge1xuICAgICAgICAgICAgdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAncmVwb3J0UHJvZ3Jlc3MnLCBwcm9ncmVzcyk7XG4gICAgICAgIH0pO1xuXG5cdFx0Y3J5cHRvLmRlY3J5cHRTdHJlYW0oZmlsZVBhdGgsIHRoaXMubG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKSwgKGVyciwgZmlsZU5hbWVzKSA9PiB7XG5cdFx0XHRpZihlcnIpe1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgZXJyLCBcIkZhaWxlZCB0byBkZWNyeXB0IGZpbGVcIiArIGZpbGVQYXRoKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicHJpbnRJbmZvXCIsIHRoaXMuYWxpYXMgKyBcIiB3YXMgc3VjY2Vzc2Z1bGx5IGV4dHJhY3RlZC4gXCIpO1xuXHRcdFx0dGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiX19yZXR1cm5fX1wiLCBmaWxlTmFtZXMpO1xuXHRcdH0pO1xuXHR9XG59KTsiLCJyZXF1aXJlKFwiY2FsbGZsb3dcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gJCQubGlicmFyeShmdW5jdGlvbiAoKSB7XG4gICAgcmVxdWlyZSgnLi9hZGRDc2InKTtcbiAgICByZXF1aXJlKCcuL2FkZEJhY2t1cCcpO1xuICAgIHJlcXVpcmUoJy4vYXR0YWNoRmlsZScpO1xuICAgIHJlcXVpcmUoJy4vY3JlYXRlQ3NiJyk7XG4gICAgcmVxdWlyZSgnLi9leHRyYWN0RmlsZScpO1xuICAgIHJlcXVpcmUoJy4vbGlzdENTQnMnKTtcbiAgICByZXF1aXJlKCcuL3Jlc2V0UGluJyk7XG4gICAgcmVxdWlyZSgnLi9yZXN0b3JlJyk7XG4gICAgcmVxdWlyZSgnLi9yZWNlaXZlJyk7XG5cdHJlcXVpcmUoJy4vc2F2ZUJhY2t1cCcpO1xuICAgIHJlcXVpcmUoJy4vc2V0UGluJyk7XG59KTtcblxuXG4iLCJjb25zdCBmbG93c1V0aWxzID0gcmVxdWlyZShcIi4vLi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi91dGlscy92YWxpZGF0b3JcIik7XG4vLyBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IFJvb3RDU0IgPSByZXF1aXJlKFwiLi4vbGliL1Jvb3RDU0JcIik7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZShcIi4uL2xpYi9DU0JJZGVudGlmaWVyXCIpO1xuXG4kJC5zd2FybS5kZXNjcmliZShcImxpc3RDU0JzXCIsIHtcbiAgICBzdGFydDogZnVuY3Rpb24gKENTQlBhdGgsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuQ1NCUGF0aCA9IENTQlBhdGggfHwgJyc7XG4gICAgICAgIHZhbGlkYXRvci5jaGVja01hc3RlckNTQkV4aXN0cyhsb2NhbEZvbGRlciwgKGVyciwgc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwibm9NYXN0ZXJDU0JFeGlzdHNcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHdpdGhDU0JJZGVudGlmaWVyOiBmdW5jdGlvbiAoaWQsIENTQlBhdGggPSAnJywgbG9jYWxGb2xkZXIgPSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgICAgIHRoaXMuY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKGlkKTtcbiAgICAgICAgdGhpcy5DU0JQYXRoID0gQ1NCUGF0aDtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICB0aGlzLmxvYWRNYXN0ZXJSYXdDU0IoKTtcbiAgICB9LFxuXG4gICAgbG9hZE1hc3RlclJhd0NTQjogZnVuY3Rpb24gKCkge1xuICAgICAgICBSb290Q1NCLmxvYWRXaXRoSWRlbnRpZmllcih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLmNzYklkZW50aWZpZXIsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwibG9hZFJhd0NTQlwiLCBcIkZhaWxlZCB0byBjcmVhdGUgUm9vdENTQi5cIikpO1xuICAgIH0sXG5cbiAgICB2YWxpZGF0ZVBpbjogZnVuY3Rpb24gKHBpbiwgbm9Ucmllcykge1xuICAgICAgICB2YWxpZGF0b3IudmFsaWRhdGVQaW4odGhpcy5sb2NhbEZvbGRlciwgdGhpcywgJ2xvYWRSYXdDU0InLCBwaW4sIG5vVHJpZXMpO1xuICAgIH0sXG5cbiAgICBsb2FkUmF3Q1NCOiBmdW5jdGlvbiAocm9vdENTQikge1xuICAgICAgICBpZih0eXBlb2YgdGhpcy5yb290Q1NCID09PSBcInVuZGVmaW5lZFwiICYmIHJvb3RDU0Ipe1xuICAgICAgICAgICAgdGhpcy5yb290Q1NCID0gcm9vdENTQjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJvb3RDU0IubG9hZFJhd0NTQih0aGlzLkNTQlBhdGgsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsICdnZXRDU0JzJywgJ0ZhaWxlZCB0byBsb2FkIHJhd0NTQicpKTtcbiAgICB9LFxuXG4gICAgZ2V0Q1NCczogZnVuY3Rpb24gKHJhd0NTQikge1xuICAgICAgICBjb25zdCBjc2JSZWZlcmVuY2VzID0gcmF3Q1NCLmdldEFsbEFzc2V0cygnZ2xvYmFsLkNTQlJlZmVyZW5jZScpO1xuICAgICAgICBjb25zdCBjc2JzQWxpYXNlcyA9IGNzYlJlZmVyZW5jZXMubWFwKChyZWYpID0+IHJlZi5hbGlhcyk7XG5cbiAgICAgICAgY29uc3QgZmlsZVJlZmVyZW5jZXMgPSByYXdDU0IuZ2V0QWxsQXNzZXRzKCdnbG9iYWwuRmlsZVJlZmVyZW5jZScpO1xuICAgICAgICBjb25zdCBmaWxlc0FsaWFzZXMgPSBmaWxlUmVmZXJlbmNlcy5tYXAoKHJlZikgPT4gcmVmLmFsaWFzKTtcblxuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJfX3JldHVybl9fXCIsIHtcbiAgICAgICAgICAgIGNzYnM6IGNzYnNBbGlhc2VzLFxuICAgICAgICAgICAgZmlsZXM6IGZpbGVzQWxpYXNlc1xuICAgICAgICB9KTtcbiAgICB9XG5cbn0pO1xuIiwiXG4kJC5zd2FybS5kZXNjcmliZShcInJlY2VpdmVcIiwge1xuICAgIHN0YXJ0OiBmdW5jdGlvbiAoZW5kcG9pbnQsIGNoYW5uZWwpIHtcblxuICAgICAgICBjb25zdCBhbGlhcyA9ICdyZW1vdGUnO1xuICAgICAgICAkJC5yZW1vdGUuY3JlYXRlUmVxdWVzdE1hbmFnZXIoMTAwMCk7XG4gICAgICAgICQkLnJlbW90ZS5uZXdFbmRQb2ludChhbGlhcywgZW5kcG9pbnQsIGNoYW5uZWwpO1xuICAgICAgICAkJC5yZW1vdGVbYWxpYXNdLm9uKCcqJywgJyonLCAoZXJyLCBzd2FybSkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIGVyciwgJ0ZhaWxlZCB0byBnZXQgZGF0YSBmcm9tIGNoYW5uZWwnICsgY2hhbm5lbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBzZWVkID0gc3dhcm0ubWV0YS5hcmdzWzBdO1xuICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicHJpbnRTZW5zaXRpdmVJbmZvXCIsIHNlZWQpO1xuXG4gICAgICAgICAgICAkJC5yZW1vdGVbYWxpYXNdLm9mZihcIipcIiwgXCIqXCIpO1xuICAgICAgICB9KTtcblxuICAgIH1cbn0pOyIsImNvbnN0IHV0aWxzID0gcmVxdWlyZShcIi4vLi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IFJvb3RDU0IgPSByZXF1aXJlKFwiLi4vbGliL1Jvb3RDU0JcIik7XG5jb25zdCBEc2VlZENhZ2UgPSByZXF1aXJlKFwiLi4vdXRpbHMvRHNlZWRDYWdlXCIpO1xuY29uc3QgQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoXCIuLi9saWIvQ1NCSWRlbnRpZmllclwiKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJyZXNldFBpblwiLCB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uIChsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkU2VlZFwiLCB1dGlscy5ub1RyaWVzKTtcbiAgICB9LFxuXG4gICAgdmFsaWRhdGVTZWVkOiBmdW5jdGlvbiAoc2VlZCwgbm9Ucmllcykge1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICB0aGlzLmNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihzZWVkKTtcbiAgICAgICAgICAgIFJvb3RDU0IubG9hZFdpdGhJZGVudGlmaWVyKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMuY3NiSWRlbnRpZmllciwgKGVyciwgcm9vdENTQikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFNlZWRcIiwgbm9UcmllcyAtIDEpO1xuICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJpbnNlcnRQaW5cIiwgdXRpbHMubm9Ucmllcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIG5ldyBFcnJvcignSW52YWxpZCBzZWVkJykpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGFjdHVhbGl6ZVBpbjogZnVuY3Rpb24gKHBpbikge1xuICAgICAgICBjb25zdCBkc2VlZENhZ2UgPSBuZXcgRHNlZWRDYWdlKHRoaXMubG9jYWxGb2xkZXIpO1xuICAgICAgICBkc2VlZENhZ2Uuc2F2ZURzZWVkQmFja3VwcyhwaW4sIHRoaXMuY3NiSWRlbnRpZmllciwgdW5kZWZpbmVkLCAoZXJyKT0+e1xuICAgICAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgXCJGYWlsZWQgdG8gc2F2ZSBkc2VlZC5cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInByaW50SW5mb1wiLCBcIlRoZSBwaW4gaGFzIGJlZW4gY2hhbmdlZCBzdWNjZXNzZnVsbHkuXCIpO1xuICAgICAgICB9KTtcbiAgICB9XG59KTtcbiIsImNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbmNvbnN0IGZsb3dzVXRpbHMgPSByZXF1aXJlKFwiLi8uLi91dGlscy9mbG93c1V0aWxzXCIpO1xuY29uc3QgdXRpbHMgPSByZXF1aXJlKFwiLi8uLi91dGlscy91dGlsc1wiKTtcbmNvbnN0IGNyeXB0byA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi91dGlscy92YWxpZGF0b3JcIik7XG5jb25zdCBEc2VlZENhZ2UgPSByZXF1aXJlKFwiLi4vdXRpbHMvRHNlZWRDYWdlXCIpO1xuY29uc3QgUm9vdENTQiA9IHJlcXVpcmUoJy4uL2xpYi9Sb290Q1NCJyk7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZSgnLi4vbGliL0NTQklkZW50aWZpZXInKTtcbmNvbnN0IEJhY2t1cEVuZ2luZSA9IHJlcXVpcmUoJy4uL2xpYi9CYWNrdXBFbmdpbmUnKTtcbmNvbnN0IEhhc2hDYWdlID0gcmVxdWlyZSgnLi4vdXRpbHMvSGFzaENhZ2UnKTtcbmNvbnN0IEFzeW5jRGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL3V0aWxzL0FzeW5jRGlzcGF0Y2hlcicpO1xuXG5cbiQkLnN3YXJtLmRlc2NyaWJlKFwicmVzdG9yZVwiLCB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uICh1cmwsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIGlmICh1cmwpIHtcbiAgICAgICAgICAgIGNvbnN0IHtDU0JQYXRoLCBhbGlhc30gPSB1dGlscy5wcm9jZXNzVXJsKHVybCwgJ2dsb2JhbC5DU0JSZWZlcmVuY2UnKTtcbiAgICAgICAgICAgIHRoaXMuQ1NCUGF0aCA9IENTQlBhdGg7XG4gICAgICAgICAgICB0aGlzLkNTQkFsaWFzID0gYWxpYXM7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkU2VlZFwiKTtcbiAgICB9LFxuXG4gICAgd2l0aFNlZWQ6IGZ1bmN0aW9uICh1cmwsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSwgc2VlZFJlc3RvcmUsIGxvY2FsU2VlZCkge1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIGlmICh1cmwpIHtcbiAgICAgICAgICAgIGNvbnN0IHtDU0JQYXRoLCBhbGlhc30gPSB1dGlscy5wcm9jZXNzVXJsKHVybCwgJ2dsb2JhbC5DU0JSZWZlcmVuY2UnKTtcbiAgICAgICAgICAgIHRoaXMuQ1NCUGF0aCA9IENTQlBhdGg7XG4gICAgICAgICAgICB0aGlzLkNTQkFsaWFzID0gYWxpYXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobG9jYWxTZWVkKSB7XG4gICAgICAgICAgICB0aGlzLmxvY2FsQ1NCSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKGxvY2FsU2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlc3RvcmVDU0Ioc2VlZFJlc3RvcmUpO1xuICAgIH0sXG5cbiAgICByZXN0b3JlQ1NCOiBmdW5jdGlvbiAocmVzdG9yZVNlZWQpIHtcbiAgICAgICAgdGhpcy5oYXNoQ2FnZSA9IG5ldyBIYXNoQ2FnZSh0aGlzLmxvY2FsRm9sZGVyKTtcbiAgICAgICAgdGhpcy5oYXNoT2JqID0ge307XG4gICAgICAgIHRoaXMuY3NiUmVzdG9yZUlkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihyZXN0b3JlU2VlZCk7XG4gICAgICAgIGxldCBiYWNrdXBVcmxzO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYmFja3VwVXJscyA9IHRoaXMuY3NiUmVzdG9yZUlkZW50aWZpZXIuZ2V0QmFja3VwVXJscygpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBuZXcgRXJyb3IoJ0ludmFsaWQgc2VlZCcpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYmFja3VwVXJscyA9IGJhY2t1cFVybHM7XG4gICAgICAgIHRoaXMucmVzdG9yZURzZWVkQ2FnZSA9IG5ldyBEc2VlZENhZ2UodGhpcy5sb2NhbEZvbGRlcik7XG4gICAgICAgIGNvbnN0IGJhY2t1cEVuZ2luZSA9IG5ldyBCYWNrdXBFbmdpbmUuZ2V0QmFja3VwRW5naW5lKHRoaXMuYmFja3VwVXJscyk7XG5cbiAgICAgICAgYmFja3VwRW5naW5lLmxvYWQodGhpcy5jc2JSZXN0b3JlSWRlbnRpZmllciwgKGVyciwgZW5jcnlwdGVkQ1NCKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImhhbmRsZUVycm9yXCIsIGVyciwgXCJGYWlsZWQgdG8gcmVzdG9yZSBDU0JcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX19hZGRDU0JIYXNoKHRoaXMuY3NiUmVzdG9yZUlkZW50aWZpZXIsIGVuY3J5cHRlZENTQik7XG4gICAgICAgICAgICB0aGlzLmVuY3J5cHRlZENTQiA9IGVuY3J5cHRlZENTQjtcblxuICAgICAgICAgICAgdmFsaWRhdG9yLmNoZWNrTWFzdGVyQ1NCRXhpc3RzKHRoaXMubG9jYWxGb2xkZXIsIChlcnIsIHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHN0YXR1cyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVBdXhGb2xkZXIoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMubG9jYWxDU0JJZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5DU0JBbGlhcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuZGVsZXRlUmVjdXJzaXZlbHkodGhpcy5sb2NhbEZvbGRlciwgdHJ1ZSwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImhhbmRsZUVycm9yXCIsIG5ldyBFcnJvcihcIk5vIENTQiBhbGlhcyB3YXMgc3BlY2lmaWVkXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZUNTQigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLkNTQkFsaWFzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgbmV3IEVycm9yKFwiTm8gQ1NCIGFsaWFzIHdhcyBzcGVjaWZpZWRcIikpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFBpblwiLCBmbG93c1V0aWxzLm5vVHJpZXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICB2YWxpZGF0ZVBpbjogZnVuY3Rpb24gKHBpbiwgbm9Ucmllcykge1xuICAgICAgICB2YWxpZGF0b3IudmFsaWRhdGVQaW4odGhpcy5sb2NhbEZvbGRlciwgdGhpcywgXCJ3cml0ZUNTQlwiLCBwaW4sIG5vVHJpZXMpO1xuICAgIH0sXG5cbiAgICBjcmVhdGVBdXhGb2xkZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZnMubWtkaXIocGF0aC5qb2luKHRoaXMubG9jYWxGb2xkZXIsIFwiLnByaXZhdGVTa3lcIiksIHtyZWN1cnNpdmU6IHRydWV9LCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcIndyaXRlQ1NCXCIsIFwiRmFpbGVkIHRvIGNyZWF0ZSBmb2xkZXIgLnByaXZhdGVTa3lcIikpO1xuICAgIH0sXG5cblxuICAgIHdyaXRlQ1NCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZzLndyaXRlRmlsZSh1dGlscy5nZW5lcmF0ZVBhdGgodGhpcy5sb2NhbEZvbGRlciwgdGhpcy5jc2JSZXN0b3JlSWRlbnRpZmllciksIHRoaXMuZW5jcnlwdGVkQ1NCLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcImNyZWF0ZVJvb3RDU0JcIiwgXCJGYWlsZWQgdG8gd3JpdGUgbWFzdGVyQ1NCIHRvIGRpc2tcIikpO1xuICAgIH0sXG5cbiAgICBjcmVhdGVSb290Q1NCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIFJvb3RDU0IubG9hZFdpdGhJZGVudGlmaWVyKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMuY3NiUmVzdG9yZUlkZW50aWZpZXIsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwibG9hZFJhd0NTQlwiLCBcIkZhaWxlZCB0byBjcmVhdGUgcm9vdENTQiB3aXRoIGRzZWVkXCIpKTtcbiAgICB9LFxuXG4gICAgbG9hZFJhd0NTQjogZnVuY3Rpb24gKHJvb3RDU0IpIHtcblxuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlciA9IG5ldyBBc3luY0Rpc3BhdGNoZXIoKCBlcnJzLCBzdWNjcykgPT4ge1xuICAgICAgICAgICAgdGhpcy5oYXNoQ2FnZS5zYXZlSGFzaCh0aGlzLmhhc2hPYmosIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIGVyciwgJ0ZhaWxlZCB0byBzYXZlIGhhc2hPYmonKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAncHJpbnRJbmZvJywgJ0FsbCBDU0JzIGhhdmUgYmVlbiByZXN0b3JlZC4nKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdfX3JldHVybl9fJyk7XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcm9vdENTQi5sb2FkUmF3Q1NCKCcnLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcImNoZWNrQ1NCU3RhdHVzXCIsIFwiRmFpbGVkIHRvIGxvYWQgUmF3Q1NCXCIsIHJvb3RDU0IpKTtcbiAgICB9LFxuXG4gICAgY2hlY2tDU0JTdGF0dXM6IGZ1bmN0aW9uIChyYXdDU0IsIHJvb3RDU0IpIHtcbiAgICAgICAgdGhpcy5yYXdDU0IgPSByYXdDU0I7XG4gICAgICAgIGNvbnN0IG1ldGEgPSB0aGlzLnJhd0NTQi5nZXRBc3NldCgnZ2xvYmFsLkNTQk1ldGEnLCAnbWV0YScpO1xuICAgICAgICBpZiAodGhpcy5yb290Q1NCKSB7XG4gICAgICAgICAgICB0aGlzLmF0dGFjaENTQih0aGlzLnJvb3RDU0IsIHRoaXMuQ1NCUGF0aCwgdGhpcy5DU0JBbGlhcywgdGhpcy5jc2JSZXN0b3JlSWRlbnRpZmllcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAobWV0YS5pc01hc3Rlcikge1xuICAgICAgICAgICAgICAgIHRoaXMucm9vdENTQiA9IHJvb3RDU0I7XG4gICAgICAgICAgICAgICAgdGhpcy5zYXZlRHNlZWQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVNYXN0ZXJDU0IoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzYXZlRHNlZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5yZXN0b3JlRHNlZWRDYWdlLnNhdmVEc2VlZEJhY2t1cHMoZmxvd3NVdGlscy5kZWZhdWx0UGluLCB0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyLCB1bmRlZmluZWQsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwiY29sbGVjdEZpbGVzXCIsIFwiRmFpbGVkIHRvIHNhdmUgZHNlZWRcIiwgdGhpcy5yYXdDU0IsIHRoaXMuY3NiUmVzdG9yZUlkZW50aWZpZXIsICcnLCAnbWFzdGVyJykpO1xuICAgIH0sXG5cblxuICAgIGNyZWF0ZU1hc3RlckNTQjogZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zdCBjc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIodW5kZWZpbmVkLCB0aGlzLmJhY2t1cFVybHMpO1xuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJwcmludFNlbnNpdGl2ZUluZm9cIiwgY3NiSWRlbnRpZmllci5nZXRTZWVkKCksIGZsb3dzVXRpbHMuZGVmYXVsdFBpbik7XG4gICAgICAgIHRoaXMucm9vdENTQiA9IFJvb3RDU0IuY3JlYXRlTmV3KHRoaXMubG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIpO1xuICAgICAgICB0aGlzLnJlc3RvcmVEc2VlZENhZ2Uuc2F2ZURzZWVkQmFja3VwcyhmbG93c1V0aWxzLmRlZmF1bHRQaW4sIGNzYklkZW50aWZpZXIsIHVuZGVmaW5lZCwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJhdHRhY2hDU0JcIiwgXCJGYWlsZWQgdG8gc2F2ZSBtYXN0ZXIgZHNlZWQgXCIsIHRoaXMucm9vdENTQiwgdGhpcy5DU0JQYXRoLCB0aGlzLkNTQkFsaWFzLCB0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyKSk7XG4gICAgfSxcblxuXG4gICAgYXR0YWNoQ1NCOiBmdW5jdGlvbiAocm9vdENTQiwgQ1NCUGF0aCwgQ1NCQWxpYXMsIGNzYklkZW50aWZpZXIpIHtcbiAgICAgICAgdGhpcy5fX2F0dGFjaENTQihyb290Q1NCLCBDU0JQYXRoLCBDU0JBbGlhcywgY3NiSWRlbnRpZmllciwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgJ2xvYWRSZXN0b3JlZFJhd0NTQicsICdGYWlsZWQgdG8gYXR0YWNoIHJhd0NTQicpKTtcblxuICAgIH0sXG5cbiAgICBsb2FkUmVzdG9yZWRSYXdDU0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5DU0JQYXRoID0gdGhpcy5DU0JQYXRoLnNwbGl0KCc6JylbMF0gKyAnLycgKyB0aGlzLkNTQkFsaWFzO1xuICAgICAgICB0aGlzLnJvb3RDU0IubG9hZFJhd0NTQih0aGlzLkNTQlBhdGgsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwiY29sbGVjdEZpbGVzXCIsIFwiRmFpbGVkIHRvIGxvYWQgcmVzdG9yZWQgUmF3Q1NCXCIsIHRoaXMuY3NiUmVzdG9yZUlkZW50aWZpZXIsIHRoaXMuQ1NCUGF0aCwgdGhpcy5DU0JBbGlhcykpO1xuICAgIH0sXG5cbiAgICBjb2xsZWN0RmlsZXM6IGZ1bmN0aW9uIChyYXdDU0IsIGNzYklkZW50aWZpZXIsIGN1cnJlbnRQYXRoLCBhbGlhcywgY2FsbGJhY2spIHtcblxuICAgICAgICBjb25zdCBsaXN0RmlsZXMgPSByYXdDU0IuZ2V0QWxsQXNzZXRzKCdnbG9iYWwuRmlsZVJlZmVyZW5jZScpO1xuICAgICAgICBjb25zdCBhc3luY0Rpc3BhdGNoZXIgPSBuZXcgQXN5bmNEaXNwYXRjaGVyKChlcnJzLCBzdWNjcykgPT4ge1xuICAgICAgICAgICAgdGhpcy5jb2xsZWN0Q1NCcyhyYXdDU0IsIGNzYklkZW50aWZpZXIsIGN1cnJlbnRQYXRoLCBhbGlhcyk7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJycywgc3VjY3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAobGlzdEZpbGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKCk7XG4gICAgICAgIH1cblxuICAgICAgICBsaXN0RmlsZXMuZm9yRWFjaCgoZmlsZVJlZmVyZW5jZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKGZpbGVSZWZlcmVuY2UuZHNlZWQpO1xuICAgICAgICAgICAgY29uc3QgZmlsZUFsaWFzID0gZmlsZVJlZmVyZW5jZS5hbGlhcztcbiAgICAgICAgICAgIGNvbnN0IHVybHMgPSBjc2JJZGVudGlmaWVyLmdldEJhY2t1cFVybHMoKTtcbiAgICAgICAgICAgIGNvbnN0IGJhY2t1cEVuZ2luZSA9IEJhY2t1cEVuZ2luZS5nZXRCYWNrdXBFbmdpbmUodXJscyk7XG4gICAgICAgICAgICBhc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eSgpO1xuICAgICAgICAgICAgYmFja3VwRW5naW5lLmxvYWQoY3NiSWRlbnRpZmllciwgKGVyciwgZW5jcnlwdGVkRmlsZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2hhbmRsZUVycm9yJywgZXJyLCAnQ291bGQgbm90IGRvd25sb2FkIGZpbGUgJyArIGZpbGVBbGlhcyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5fX2FkZENTQkhhc2goY3NiSWRlbnRpZmllciwgZW5jcnlwdGVkRmlsZSk7XG5cbiAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGUodXRpbHMuZ2VuZXJhdGVQYXRoKHRoaXMubG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIpLCBlbmNyeXB0ZWRGaWxlLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIGVyciwgJ0NvdWxkIG5vdCBzYXZlIGZpbGUgJyArIGZpbGVBbGlhcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBhc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQodW5kZWZpbmVkLCBmaWxlQWxpYXMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBjb2xsZWN0Q1NCczogZnVuY3Rpb24gKHJhd0NTQiwgY3NiSWRlbnRpZmllciwgY3VycmVudFBhdGgsIGFsaWFzKSB7XG5cbiAgICAgICAgY29uc3QgbGlzdENTQnMgPSByYXdDU0IuZ2V0QWxsQXNzZXRzKCdnbG9iYWwuQ1NCUmVmZXJlbmNlJyk7XG4gICAgICAgIGNvbnN0IG5leHRBcmd1bWVudHMgPSBbXTtcbiAgICAgICAgbGV0IGNvdW50ZXIgPSAwO1xuXG4gICAgICAgIGlmIChsaXN0Q1NCcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkoKTtcbiAgICAgICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGlzdENTQnMgJiYgbGlzdENTQnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbGlzdENTQnMuZm9yRWFjaCgoQ1NCUmVmZXJlbmNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV4dFBhdGggPSBjdXJyZW50UGF0aCArICcvJyArIENTQlJlZmVyZW5jZS5hbGlhcztcbiAgICAgICAgICAgICAgICBjb25zdCBuZXh0Q1NCSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKENTQlJlZmVyZW5jZS5kc2VlZCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV4dEFsaWFzID0gQ1NCUmVmZXJlbmNlLmFsaWFzO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5leHRVUkxzID0gY3NiSWRlbnRpZmllci5nZXRCYWNrdXBVcmxzKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYmFja3VwRW5naW5lID0gQmFja3VwRW5naW5lLmdldEJhY2t1cEVuZ2luZShuZXh0VVJMcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eSgpO1xuICAgICAgICAgICAgICAgIGJhY2t1cEVuZ2luZS5sb2FkKG5leHRDU0JJZGVudGlmaWVyLCAoZXJyLCBlbmNyeXB0ZWRDU0IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2hhbmRsZUVycm9yJywgZXJyLCAnQ291bGQgbm90IGRvd25sb2FkIENTQiAnICsgbmV4dEFsaWFzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19hZGRDU0JIYXNoKG5leHRDU0JJZGVudGlmaWVyLCBlbmNyeXB0ZWRDU0IpO1xuXG4gICAgICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZSh1dGlscy5nZW5lcmF0ZVBhdGgodGhpcy5sb2NhbEZvbGRlciwgbmV4dENTQklkZW50aWZpZXIpLCBlbmNyeXB0ZWRDU0IsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBlcnIsICdDb3VsZCBub3Qgc2F2ZSBDU0IgJyArIG5leHRBbGlhcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9vdENTQi5sb2FkUmF3Q1NCKG5leHRQYXRoLCAoZXJyLCBuZXh0UmF3Q1NCKSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIGVyciwgJ0ZhaWxlZCB0byBsb2FkIENTQiAnICsgbmV4dEFsaWFzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEFyZ3VtZW50cy5wdXNoKFsgbmV4dFJhd0NTQiwgbmV4dENTQklkZW50aWZpZXIsIG5leHRQYXRoLCBuZXh0QWxpYXMgXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKytjb3VudGVyID09PSBsaXN0Q1NCcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEFyZ3VtZW50cy5mb3JFYWNoKChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxlY3RGaWxlcyguLi5hcmdzLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQodW5kZWZpbmVkLCBhbGlhcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgX190cnlEb3dubG9hZCh1cmxzLCBjc2JJZGVudGlmaWVyLCBpbmRleCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSB1cmxzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignQ291bGQgbm90IGRvd25sb2FkIHJlc291cmNlJykpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdXJsID0gdXJsc1tpbmRleF07XG4gICAgICAgIHRoaXMuYmFja3VwRW5naW5lLmxvYWQodXJsLCBjc2JJZGVudGlmaWVyLCAoZXJyLCByZXNvdXJjZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9fdHJ5RG93bmxvYWQodXJscywgY3NiSWRlbnRpZmllciwgKytpbmRleCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHJlc291cmNlKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgX19hZGRDU0JIYXNoOiBmdW5jdGlvbiAoY3NiSWRlbnRpZmllciwgZW5jcnlwdGVkQ1NCKSB7XG4gICAgICAgIGNvbnN0IHBza0hhc2ggPSBuZXcgY3J5cHRvLlBza0hhc2goKTtcbiAgICAgICAgcHNrSGFzaC51cGRhdGUoZW5jcnlwdGVkQ1NCKTtcbiAgICAgICAgdGhpcy5oYXNoT2JqW2NzYklkZW50aWZpZXIuZ2V0VWlkKCldID0gcHNrSGFzaC5kaWdlc3QoKS50b1N0cmluZygnaGV4Jyk7XG5cbiAgICB9LFxuXG4gICAgX19hdHRhY2hDU0I6IGZ1bmN0aW9uIChyb290Q1NCLCBDU0JQYXRoLCBDU0JBbGlhcywgY3NiSWRlbnRpZmllciwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCFDU0JBbGlhcykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcIk5vIENTQiBhbGlhcyB3YXMgc3BlY2lmaWVkXCIpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJvb3RDU0IubG9hZFJhd0NTQihDU0JQYXRoLCAoZXJyLCByYXdDU0IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByb290Q1NCLmxvYWRBc3NldEZyb21QYXRoKENTQlBhdGgsIChlcnIsIGNzYlJlZikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNzYlJlZi5pbml0KENTQkFsaWFzLCBjc2JJZGVudGlmaWVyLmdldFNlZWQoKSwgY3NiSWRlbnRpZmllci5nZXREc2VlZCgpKTtcbiAgICAgICAgICAgICAgICAgICAgcm9vdENTQi5zYXZlQXNzZXRUb1BhdGgoQ1NCUGF0aCwgY3NiUmVmLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoYEEgQ1NCIGhhdmluZyB0aGUgYWxpYXMgJHtDU0JBbGlhc30gYWxyZWFkeSBleGlzdHMuYCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59KTtcblxuIiwiY29uc3QgdXRpbHMgPSByZXF1aXJlKFwiLi8uLi91dGlscy91dGlsc1wiKTtcbmNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgdmFsaWRhdG9yID0gcmVxdWlyZShcIi4uL3V0aWxzL3ZhbGlkYXRvclwiKTtcbmNvbnN0IEhhc2hDYWdlID0gcmVxdWlyZSgnLi4vdXRpbHMvSGFzaENhZ2UnKTtcbmNvbnN0IEFzeW5jRGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi91dGlscy9Bc3luY0Rpc3BhdGNoZXJcIik7XG5jb25zdCBSb290Q1NCID0gcmVxdWlyZSgnLi4vbGliL1Jvb3RDU0InKTtcbmNvbnN0IENTQklkZW50aWZpZXIgPSByZXF1aXJlKCcuLi9saWIvQ1NCSWRlbnRpZmllcicpO1xuY29uc3QgQmFja3VwRW5naW5lID0gcmVxdWlyZSgnLi4vbGliL0JhY2t1cEVuZ2luZScpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuXG4kJC5zd2FybS5kZXNjcmliZShcInNhdmVCYWNrdXBcIiwge1xuICAgIHN0YXJ0OiBmdW5jdGlvbiAobG9jYWxGb2xkZXIgPSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFBpblwiLCAzKTtcbiAgICB9LFxuXG4gICAgdmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcbiAgICAgICAgdmFsaWRhdG9yLnZhbGlkYXRlUGluKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMsIFwibG9hZEhhc2hGaWxlXCIsIHBpbiwgbm9Ucmllcyk7XG4gICAgfSxcblxuICAgIHdpdGhDU0JJZGVudGlmaWVyOiBmdW5jdGlvbiAoaWQsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKGlkKTtcbiAgICAgICAgUm9vdENTQi5sb2FkV2l0aElkZW50aWZpZXIobG9jYWxGb2xkZXIsIHRoaXMuY3NiSWRlbnRpZmllciwgKGVyciwgcm9vdENTQikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2hhbmRsZUVycm9yJywgZXJyLCAnRmFpbGVkIHRvIGxvYWQgcm9vdCBDU0InKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMucm9vdENTQiA9IHJvb3RDU0I7XG4gICAgICAgICAgICB0aGlzLmxvYWRIYXNoRmlsZSgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgbG9hZEhhc2hGaWxlOiBmdW5jdGlvbiAocGluLCBiYWNrdXBzKSB7XG4gICAgICAgIHRoaXMuYmFja3VwcyA9IGJhY2t1cHM7XG4gICAgICAgIHRoaXMuaGFzaENhZ2UgPSBuZXcgSGFzaENhZ2UodGhpcy5sb2NhbEZvbGRlcik7XG4gICAgICAgIHRoaXMuaGFzaENhZ2UubG9hZEhhc2godmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgJ3JlYWRFbmNyeXB0ZWRNYXN0ZXInLCAnRmFpbGVkIHRvIGxvYWQgaGFzaCBmaWxlJykpO1xuICAgIH0sXG5cbiAgICByZWFkRW5jcnlwdGVkTWFzdGVyOiBmdW5jdGlvbiAoaGFzaEZpbGUpIHtcbiAgICAgICAgdGhpcy5oYXNoRmlsZSA9IGhhc2hGaWxlO1xuICAgICAgICB0aGlzLm1hc3RlcklEID0gdXRpbHMuZ2VuZXJhdGVQYXRoKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMuY3NiSWRlbnRpZmllcik7XG4gICAgICAgIGZzLnJlYWRGaWxlKHRoaXMubWFzdGVySUQsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsICdsb2FkTWFzdGVyUmF3Q1NCJywgJ0ZhaWxlZCB0byByZWFkIG1hc3RlckNTQi4nKSk7XG4gICAgfSxcblxuXG4gICAgbG9hZE1hc3RlclJhd0NTQjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJvb3RDU0IubG9hZFJhd0NTQignJywgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJkaXNwYXRjaGVyXCIsIFwiRmFpbGVkIHRvIGxvYWQgbWFzdGVyQ1NCXCIpKTtcbiAgICB9LFxuXG4gICAgZGlzcGF0Y2hlcjogZnVuY3Rpb24gKHJhd0NTQikge1xuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlciA9IG5ldyBBc3luY0Rpc3BhdGNoZXIoKGVycm9ycywgcmVzdWx0cykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9ycykge1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2hhbmRsZUVycm9yJywgSlNPTi5zdHJpbmdpZnkoZXJyb3JzLCBudWxsLCAnXFx0JyksICdGYWlsZWQgdG8gY29sbGVjdCBhbGwgQ1NCcycpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29sbGVjdEZpbGVzKHJlc3VsdHMpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KCk7XG4gICAgICAgIHRoaXMuY29sbGVjdENTQnMocmF3Q1NCLCB0aGlzLmNzYklkZW50aWZpZXIsICcnLCAnbWFzdGVyJyk7XG4gICAgfSxcblxuICAgIGNvbGxlY3RDU0JzOiBmdW5jdGlvbiAocmF3Q1NCLCBjc2JJZGVudGlmaWVyLCBjdXJyZW50UGF0aCwgYWxpYXMpIHtcbiAgICAgICAgY29uc3QgbGlzdENTQnMgPSByYXdDU0IuZ2V0QWxsQXNzZXRzKCdnbG9iYWwuQ1NCUmVmZXJlbmNlJyk7XG5cbiAgICAgICAgY29uc3QgbmV4dEFyZ3VtZW50cyA9IFtdO1xuICAgICAgICBsZXQgY291bnRlciA9IDA7XG5cbiAgICAgICAgbGlzdENTQnMuZm9yRWFjaCgoQ1NCUmVmZXJlbmNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXh0UGF0aCA9IGN1cnJlbnRQYXRoICsgJy8nICsgQ1NCUmVmZXJlbmNlLmFsaWFzO1xuICAgICAgICAgICAgY29uc3QgbmV4dENTQklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihDU0JSZWZlcmVuY2UuZHNlZWQpO1xuICAgICAgICAgICAgY29uc3QgbmV4dEFsaWFzID0gQ1NCUmVmZXJlbmNlLmFsaWFzO1xuICAgICAgICAgICAgdGhpcy5yb290Q1NCLmxvYWRSYXdDU0IobmV4dFBhdGgsIChlcnIsIG5leHRSYXdDU0IpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5leHRBcmd1bWVudHMucHVzaChbIG5leHRSYXdDU0IsIG5leHRDU0JJZGVudGlmaWVyLCBuZXh0UGF0aCwgbmV4dEFsaWFzIF0pO1xuICAgICAgICAgICAgICAgIGlmICgrK2NvdW50ZXIgPT09IGxpc3RDU0JzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0QXJndW1lbnRzLmZvckVhY2goKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGVjdENTQnMoLi4uYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCh1bmRlZmluZWQsIHtyYXdDU0IsIGNzYklkZW50aWZpZXIsIGFsaWFzfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChsaXN0Q1NCcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKHVuZGVmaW5lZCwge3Jhd0NTQiwgY3NiSWRlbnRpZmllciwgYWxpYXN9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBjb2xsZWN0RmlsZXM6IGZ1bmN0aW9uIChjb2xsZWN0ZWRDU0JzKSB7XG4gICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyID0gbmV3IEFzeW5jRGlzcGF0Y2hlcigoZXJyb3JzLCBuZXdSZXN1bHRzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3JzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBKU09OLnN0cmluZ2lmeShlcnJvcnMsIG51bGwsICdcXHQnKSwgJ0ZhaWxlZCB0byBjb2xsZWN0IGZpbGVzIGF0dGFjaGVkIHRvIENTQnMnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFuZXdSZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgbmV3UmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fX2NhdGVnb3JpemUoY29sbGVjdGVkQ1NCcy5jb25jYXQobmV3UmVzdWx0cykpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KGNvbGxlY3RlZENTQnMubGVuZ3RoKTtcbiAgICAgICAgY29sbGVjdGVkQ1NCcy5mb3JFYWNoKCh7cmF3Q1NCLCBjc2JJZGVudGlmaWVyLCBhbGlhc30pID0+IHtcbiAgICAgICAgICAgIHRoaXMuX19jb2xsZWN0RmlsZXMocmF3Q1NCLCBhbGlhcyk7XG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIF9fY2F0ZWdvcml6ZTogZnVuY3Rpb24gKGZpbGVzKSB7XG4gICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSB7fTtcbiAgICAgICAgbGV0IGJhY2t1cHM7XG4gICAgICAgIGZpbGVzLmZvckVhY2goKHtjc2JJZGVudGlmaWVyLCBhbGlhc30pID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5iYWNrdXBzIHx8IHRoaXMuYmFja3Vwcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBiYWNrdXBzID0gY3NiSWRlbnRpZmllci5nZXRCYWNrdXBVcmxzKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJhY2t1cHMgPSB0aGlzLmJhY2t1cHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB1aWQgPSBjc2JJZGVudGlmaWVyLmdldFVpZCgpO1xuICAgICAgICAgICAgY2F0ZWdvcmllc1t1aWRdID0ge2JhY2t1cHMsIGFsaWFzfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIgPSBuZXcgQXN5bmNEaXNwYXRjaGVyKChlcnJvcnMsIHN1Y2Nlc3NlcykgPT4ge1xuICAgICAgICAgICAgdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnY3NiQmFja3VwUmVwb3J0Jywge2Vycm9ycywgc3VjY2Vzc2VzfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYmFja3VwRW5naW5lID0gQmFja3VwRW5naW5lLmdldEJhY2t1cEVuZ2luZShiYWNrdXBzKTtcbiAgICAgICAgdGhpcy5maWx0ZXJGaWxlcyhjYXRlZ29yaWVzKTtcbiAgICAgICAgLy8gT2JqZWN0LmVudHJpZXMoY2F0ZWdvcmllcykuZm9yRWFjaCgoW3VpZCwge2FsaWFzLCBiYWNrdXBzfV0pID0+IHtcbiAgICAgICAgLy8gICAgIHRoaXMuZmlsdGVyRmlsZXModWlkLCBhbGlhcywgYmFja3Vwcyk7XG4gICAgICAgIC8vIH0pO1xuICAgIH0sXG5cbiAgICBmaWx0ZXJGaWxlczogZnVuY3Rpb24gKGZpbGVzQmFja3Vwcykge1xuICAgICAgICBjb25zdCBmaWxlc1RvVXBkYXRlID0ge307XG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuaGFzaEZpbGUpLmZvckVhY2goKHVpZCkgPT4ge1xuICAgICAgICAgICAgaWYgKGZpbGVzQmFja3Vwc1t1aWRdKSB7XG4gICAgICAgICAgICAgICAgZmlsZXNUb1VwZGF0ZVt1aWRdID0gdGhpcy5oYXNoRmlsZVt1aWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KCk7XG4gICAgICAgIHRoaXMuYmFja3VwRW5naW5lLmNvbXBhcmVWZXJzaW9ucyhmaWxlc1RvVXBkYXRlLCAoZXJyLCBtb2RpZmllZEZpbGVzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImhhbmRsZUVycm9yXCIsIGVyciwgXCJGYWlsZWQgdG8gcmV0cmlldmUgbGlzdCBvZiBtb2RpZmllZCBmaWxlc1wiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fX2JhY2t1cEZpbGVzKEpTT04ucGFyc2UobW9kaWZpZWRGaWxlcyksIGZpbGVzQmFja3Vwcyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBfX2JhY2t1cEZpbGVzOiBmdW5jdGlvbiAoZmlsZXMsIGZpbGVzQmFja3Vwcykge1xuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KGZpbGVzLmxlbmd0aCk7XG4gICAgICAgIGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVTdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKHBhdGguam9pbih0aGlzLmxvY2FsRm9sZGVyLCBmaWxlKSk7XG4gICAgICAgICAgICBjb25zdCBiYWNrdXBVcmxzID0gZmlsZXNCYWNrdXBzW2ZpbGVdLmJhY2t1cHM7XG4gICAgICAgICAgICBjb25zdCBiYWNrdXBFbmdpbmUgPSBCYWNrdXBFbmdpbmUuZ2V0QmFja3VwRW5naW5lKGJhY2t1cFVybHMpO1xuICAgICAgICAgICAgYmFja3VwRW5naW5lLnNhdmUobmV3IENTQklkZW50aWZpZXIoZmlsZSksIGZpbGVTdHJlYW0sIChlcnIsIHVybCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCh7YWxpYXM6IGZpbGVzQmFja3Vwc1tmaWxlXS5hbGlhcywgYmFja3VwVVJMOiB1cmx9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCh1bmRlZmluZWQsIHthbGlhczogZmlsZXNCYWNrdXBzW2ZpbGVdLmFsaWFzLCBiYWNrdXBVUkw6IHVybH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKCk7IC8vIGZvciBodHRwIHJlcXVlc3QgdG8gY29tcGFyZVZlcnNpb25zXG4gICAgfSxcblxuICAgIF9fY29sbGVjdEZpbGVzOiBmdW5jdGlvbiAocmF3Q1NCLCBjc2JBbGlhcykge1xuICAgICAgICBjb25zdCBmaWxlcyA9IHJhd0NTQi5nZXRBbGxBc3NldHMoJ2dsb2JhbC5GaWxlUmVmZXJlbmNlJyk7XG4gICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkoZmlsZXMubGVuZ3RoKTtcbiAgICAgICAgZmlsZXMuZm9yRWFjaCgoRmlsZVJlZmVyZW5jZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYWxpYXMgPSBGaWxlUmVmZXJlbmNlLmFsaWFzO1xuICAgICAgICAgICAgY29uc3QgY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKEZpbGVSZWZlcmVuY2UuZHNlZWQpO1xuICAgICAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQodW5kZWZpbmVkLCB7Y3NiSWRlbnRpZmllciwgYWxpYXN9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKCk7XG4gICAgfVxufSk7XG5cbiIsImNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi91dGlscy92YWxpZGF0b3JcIik7XG5jb25zdCBEc2VlZENhZ2UgPSByZXF1aXJlKCcuLi91dGlscy9Ec2VlZENhZ2UnKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJzZXRQaW5cIiwge1xuICAgIHN0YXJ0OiBmdW5jdGlvbiAobG9jYWxGb2xkZXIgPSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFBpblwiLCAzKTtcbiAgICB9LFxuXG4gICAgdmFsaWRhdGVQaW46IGZ1bmN0aW9uIChvbGRQaW4sIG5vVHJpZXMpIHtcbiAgICAgICAgdGhpcy5vbGRQaW4gPSBvbGRQaW47XG4gICAgICAgIHZhbGlkYXRvci52YWxpZGF0ZVBpbih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLCBcImludGVyYWN0aW9uSnVtcGVyXCIsIG9sZFBpbiwgbm9Ucmllcyk7XG4gICAgfSxcblxuICAgIGludGVyYWN0aW9uSnVtcGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImVudGVyTmV3UGluXCIpO1xuICAgIH0sXG5cbiAgICBhY3R1YWxpemVQaW46IGZ1bmN0aW9uIChuZXdQaW4pIHtcbiAgICAgICAgdGhpcy5kc2VlZENhZ2UgPSBuZXcgRHNlZWRDYWdlKHRoaXMubG9jYWxGb2xkZXIpO1xuICAgICAgICB0aGlzLmRzZWVkQ2FnZS5sb2FkRHNlZWRCYWNrdXBzKHRoaXMub2xkUGluLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcInNhdmVEc2VlZFwiLCBcIkZhaWxlZCB0byBsb2FkIGRzZWVkLlwiLCBuZXdQaW4pKTtcbiAgICB9LFxuXG4gICAgc2F2ZURzZWVkOiBmdW5jdGlvbiAoY3NiSWRlbnRpZmllciwgYmFja3VwcywgcGluKSB7XG4gICAgICAgIHRoaXMuZHNlZWRDYWdlLnNhdmVEc2VlZEJhY2t1cHMocGluLCBjc2JJZGVudGlmaWVyLCBiYWNrdXBzLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcInN1Y2Nlc3NTdGF0ZVwiLCBcIkZhaWxlZCB0byBzYXZlIGRzZWVkXCIpKTtcbiAgICB9LFxuXG4gICAgc3VjY2Vzc1N0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInByaW50SW5mb1wiLCBcIlRoZSBwaW4gaGFzIGJlZW4gc3VjY2Vzc2Z1bGx5IGNoYW5nZWQuXCIpO1xuICAgIH1cbn0pOyIsImNvbnN0IEFzeW5jRGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi91dGlscy9Bc3luY0Rpc3BhdGNoZXJcIik7XG5jb25zdCBFVkZTUmVzb2x2ZXIgPSByZXF1aXJlKFwiLi9iYWNrdXBSZXNvbHZlcnMvRVZGU1Jlc29sdmVyXCIpO1xuLy8gY29uc3QgY3J5cHRvID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcblxuZnVuY3Rpb24gQmFja3VwRW5naW5lQnVpbGRlcigpIHtcbiAgICBjb25zdCByZXNvbHZlcnMgPSB7fTtcbiAgICB0aGlzLmFkZFJlc29sdmVyID0gZnVuY3Rpb24gKG5hbWUsIHJlc29sdmVyKSB7XG4gICAgICAgIHJlc29sdmVyc1tuYW1lXSA9IHJlc29sdmVyO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEJhY2t1cEVuZ2luZSA9IGZ1bmN0aW9uKHVybHMpIHtcbiAgICAgICAgaWYgKCF1cmxzIHx8IHVybHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyB1cmwgd2FzIHByb3ZpZGVkXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ldyBCYWNrdXBFbmdpbmUodXJscywgcmVzb2x2ZXJzKTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBCYWNrdXBFbmdpbmUodXJscywgcmVzb2x2ZXJzKSB7XG5cbiAgICB0aGlzLnNhdmUgPSBmdW5jdGlvbiAoY3NiSWRlbnRpZmllciwgZGF0YVN0cmVhbSwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgYXN5bmNEaXNwYXRjaGVyID0gbmV3IEFzeW5jRGlzcGF0Y2hlcihjYWxsYmFjayk7XG4gICAgICAgIGFzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KHVybHMubGVuZ3RoKTtcbiAgICAgICAgZm9yIChjb25zdCB1cmwgb2YgdXJscykge1xuICAgICAgICAgICAgcmVzb2x2ZXJGb3JVcmwodXJsLCAoZXJyLCByZXNvbHZlcikgPT4ge1xuICAgICAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlci5hdXRoKHVybCwgdW5kZWZpbmVkLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZXIuc2F2ZSh1cmwsIGNzYklkZW50aWZpZXIsIGRhdGFTdHJlYW0sIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQodW5kZWZpbmVkLCB1cmwpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMubG9hZCA9IGZ1bmN0aW9uIChjc2JJZGVudGlmaWVyLCB2ZXJzaW9uLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAodHlwZW9mIHZlcnNpb24gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSB2ZXJzaW9uO1xuICAgICAgICAgICAgdmVyc2lvbiA9IFwiXCI7XG4gICAgICAgIH1cblxuICAgICAgICB0cnlEb3dubG9hZChjc2JJZGVudGlmaWVyLCB2ZXJzaW9uLCAwLCAoZXJyLCByZXNvdXJjZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHJlc291cmNlKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VmVyc2lvbnMgPSBmdW5jdGlvbiAoY3NiSWRlbnRpZmllciwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJFbXB0eSBmdW5jdGlvblwiKTtcbiAgICB9O1xuXG4gICAgdGhpcy5jb21wYXJlVmVyc2lvbnMgPSBmdW5jdGlvbiAoZmlsZUxpc3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHVybCA9IHVybHNbMF07XG4gICAgICAgIHJlc29sdmVyRm9yVXJsKHVybCwgKGVyciwgcmVzb2x2ZXIpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzb2x2ZXIuYXV0aCh1cmwsIHVuZGVmaW5lZCwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZXIuY29tcGFyZVZlcnNpb25zKHVybCwgZmlsZUxpc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gSU5URVJOQUwgTUVUSE9EUyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgIGZ1bmN0aW9uIHJlc29sdmVyRm9yVXJsKHVybCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHJlc29sdmVycyk7XG4gICAgICAgIGxldCByZXNvbHZlcjtcbiAgICAgICAgbGV0IGk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaChrZXlzW2ldLCB1cmwpKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZXIgPSByZXNvbHZlcnNba2V5c1tpXV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaSA9PT0ga2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJlc29sdmVyID0gcmVzb2x2ZXJzWydldmZzJ107XG4gICAgICAgICAgICBpZiAoIXJlc29sdmVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihgTm8gcmVzb2x2ZXIgbWF0Y2hlcyB0aGUgdXJsICR7dXJsfWApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgcmVzb2x2ZXIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1hdGNoKHN0cjEsIHN0cjIpIHtcbiAgICAgICAgcmV0dXJuIHN0cjEuaW5jbHVkZXMoc3RyMikgfHwgc3RyMi5pbmNsdWRlcyhzdHIxKTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHRyeURvd25sb2FkKGNzYklkZW50aWZpZXIsIHZlcnNpb24sIGluZGV4LCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoaW5kZXggPT09IHVybHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiRmFpbGVkIHRvIGRvd25sb2FkIHJlc291cmNlXCIpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHVybCA9IHVybHNbaW5kZXhdO1xuICAgICAgICByZXNvbHZlckZvclVybCh1cmwsIChlcnIsIHJlc29sdmVyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlc29sdmVyLmF1dGgodXJsLCB1bmRlZmluZWQsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnlEb3dubG9hZChjc2JJZGVudGlmaWVyLCB2ZXJzaW9uLCArK2luZGV4LCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZXIubG9hZCh1cmwsIGNzYklkZW50aWZpZXIsIHZlcnNpb24sIChlcnIsIHJlc291cmNlKSA9PntcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRyeURvd25sb2FkKGNzYklkZW50aWZpZXIsIHZlcnNpb24sICsraW5kZXgsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgcmVzb3VyY2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5jb25zdCBlbmdpbmVCdWlsZGVyID0gbmV3IEJhY2t1cEVuZ2luZUJ1aWxkZXIoKTtcblxuLy8gZW5naW5lQnVpbGRlci5hZGRSZXNvbHZlcignZHJvcGJveCcsIG5ldyBEcm9wYm94UmVzb2x2ZXIoKSk7XG4vLyBlbmdpbmVCdWlsZGVyLmFkZFJlc29sdmVyKCdkcml2ZScsIG5ldyBEcml2ZVJlc29sdmVyKCkpO1xuZW5naW5lQnVpbGRlci5hZGRSZXNvbHZlcignZXZmcycsIG5ldyBFVkZTUmVzb2x2ZXIoKSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGdldEJhY2t1cEVuZ2luZTogZnVuY3Rpb24gKHVybHMpIHtcbiAgICAgICAgcmV0dXJuIGVuZ2luZUJ1aWxkZXIuZ2V0QmFja3VwRW5naW5lKHVybHMpO1xuICAgIH1cbn07XG4iLCJjb25zdCBjcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuXG5cbmZ1bmN0aW9uIENTQklkZW50aWZpZXIoaWQsIGRvbWFpbiwga2V5TGVuID0gMzIpIHtcbiAgICBsZXQgc2VlZDtcbiAgICBsZXQgZHNlZWQ7XG4gICAgbGV0IHVpZDtcbiAgICBsZXQgZW5jU2VlZDtcblxuICAgIC8vVE9ETzogZWxpbWluYXRlIHVudXNlZCB2YXJcbiAgICAvLyBsZXQgZW5jRHNlZWQ7XG5cbiAgICBpbml0KCk7XG5cbiAgICB0aGlzLmdldFNlZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmKCFzZWVkKXtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZXR1cm4gc2VlZC4gQWNjZXNzIGlzIGRlbmllZC5cIik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZ2VuZXJhdGVDb21wYWN0Rm9ybShzZWVkKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXREc2VlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYoZHNlZWQpe1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlQ29tcGFjdEZvcm0oZHNlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoc2VlZCl7XG4gICAgICAgICAgICBkc2VlZCA9IGRlcml2ZVNlZWQoc2VlZCk7XG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVDb21wYWN0Rm9ybShkc2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgcmV0dXJuIGRlcml2ZWQgc2VlZC4gQWNjZXNzIGlzIGRlbmllZC5cIik7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VWlkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZih1aWQpe1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlQ29tcGFjdEZvcm0odWlkKS50b1N0cmluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoZHNlZWQpe1xuICAgICAgICAgICAgdWlkID0gY29tcHV0ZVVpZChkc2VlZCk7XG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVDb21wYWN0Rm9ybSh1aWQpLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZihzZWVkKXtcbiAgICAgICAgICAgIGRzZWVkID0gZGVyaXZlU2VlZChzZWVkKTtcbiAgICAgICAgICAgIHVpZCA9IGNvbXB1dGVVaWQoZHNlZWQpO1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlQ29tcGFjdEZvcm0odWlkKS50b1N0cmluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJldHVybiB1aWRcIik7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0RW5jU2VlZCA9IGZ1bmN0aW9uIChlbmNyeXB0aW9uS2V5KSB7XG4gICAgICAgIGlmKGVuY1NlZWQpe1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlQ29tcGFjdEZvcm0oZW5jU2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZighc2VlZCl7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgcmV0dXJuIGVuY1NlZWQuIEFjY2VzcyBpcyBkZW5pZWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWVuY3J5cHRpb25LZXkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZXR1cm4gZW5jU2VlZC4gTm8gZW5jcnlwdGlvbiBrZXkgd2FzIHByb3ZpZGVkXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9UT0RPOiBlbmNyeXB0IHNlZWQgdXNpbmcgZW5jcnlwdGlvbktleS4gRW5jcnlwdGlvbiBhbGdvcml0aG0gcmVtYWlucyB0byBiZSBjaG9zZW5cbiAgICB9O1xuXG5cblxuICAgIHRoaXMuZ2V0RG9tYWluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZihzZWVkKXtcbiAgICAgICAgICAgIHJldHVybiBzZWVkLmRvbWFpbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKGRzZWVkKXtcbiAgICAgICAgICAgIHJldHVybiBkc2VlZC5kb21haW47XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCYWNrdXAgVVJMcyBjb3VsZCBub3QgYmUgcmV0cmlldmVkLiBBY2Nlc3MgaXMgZGVuaWVkXCIpO1xuICAgIH07XG5cbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBpbnRlcm5hbCBtZXRob2RzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICAgIGlmICghaWQpIHtcbiAgICAgICAgICAgIGlmICghZG9tYWluKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gZG9tYWlucyBwcm92aWRlZC5cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlZWQgPSBjcmVhdGUoKTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBjbGFzc2lmeUlkKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGFzc2lmeUlkKCkge1xuICAgICAgICBpZiAodHlwZW9mIGlkICE9PSBcInN0cmluZ1wiICYmICFCdWZmZXIuaXNCdWZmZXIoaWQpICYmICEodHlwZW9mIGlkID09PSBcIm9iamVjdFwiICYmICFCdWZmZXIuaXNCdWZmZXIoaWQpKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJZCBtdXN0IGJlIGEgc3RyaW5nIG9yIGEgYnVmZmVyLiBUaGUgdHlwZSBwcm92aWRlZCB3YXMgJHt0eXBlb2YgaWR9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBleHBhbmRlZElkID0gbG9hZChpZCk7XG4gICAgICAgIHN3aXRjaChleHBhbmRlZElkLnRhZyl7XG4gICAgICAgICAgICBjYXNlICdzJzpcbiAgICAgICAgICAgICAgICBzZWVkID0gZXhwYW5kZWRJZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2QnOlxuICAgICAgICAgICAgICAgIGRzZWVkID0gZXhwYW5kZWRJZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3UnOlxuICAgICAgICAgICAgICAgIHVpZCA9IGV4cGFuZGVkSWQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlcyc6XG4gICAgICAgICAgICAgICAgZW5jU2VlZCA9IGV4cGFuZGVkSWQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlZCc6XG4gICAgICAgICAgICAgICAgZW5jRHNlZWQgPSBleHBhbmRlZElkO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdGFnJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGUoKSB7XG4gICAgICAgIGNvbnN0IGxvY2FsU2VlZCA9IHt9O1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZG9tYWluKSkge1xuICAgICAgICAgICAgZG9tYWluID0gWyBkb21haW4gXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvY2FsU2VlZC50YWcgICAgPSAncyc7XG4gICAgICAgIGxvY2FsU2VlZC5yYW5kb20gPSBjcnlwdG8ucmFuZG9tQnl0ZXMoa2V5TGVuKTtcbiAgICAgICAgbG9jYWxTZWVkLmRvbWFpbiA9IGRvbWFpbjtcblxuICAgICAgICByZXR1cm4gbG9jYWxTZWVkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlcml2ZVNlZWQoc2VlZCkge1xuICAgICAgICBsZXQgY29tcGFjdFNlZWQgPSBzZWVkO1xuXG4gICAgICAgIGlmICh0eXBlb2Ygc2VlZCA9PT0gJ29iamVjdCcgJiYgIUJ1ZmZlci5pc0J1ZmZlcihzZWVkKSkge1xuICAgICAgICAgICAgY29tcGFjdFNlZWQgPSBnZW5lcmF0ZUNvbXBhY3RGb3JtKHNlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzZWVkKSkge1xuICAgICAgICAgICAgY29tcGFjdFNlZWQgPSBzZWVkLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29tcGFjdFNlZWRbMF0gPT09ICdkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUcmllZCB0byBkZXJpdmUgYW4gYWxyZWFkeSBkZXJpdmVkIHNlZWQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkZWNvZGVkQ29tcGFjdFNlZWQgPSBkZWNvZGVVUklDb21wb25lbnQoY29tcGFjdFNlZWQpO1xuICAgICAgICBjb25zdCBzcGxpdENvbXBhY3RTZWVkID0gZGVjb2RlZENvbXBhY3RTZWVkLnN1YnN0cmluZygxKS5zcGxpdCgnfCcpO1xuICAgICAgICBjb25zdCBzdHJTZWVkID0gQnVmZmVyLmZyb20oc3BsaXRDb21wYWN0U2VlZFswXSwgJ2Jhc2U2NCcpLnRvU3RyaW5nKCdoZXgnKTtcbiAgICAgICAgY29uc3QgZG9tYWluID0gQnVmZmVyLmZyb20oc3BsaXRDb21wYWN0U2VlZFsxXSwgJ2Jhc2U2NCcpLnRvU3RyaW5nKCk7XG4gICAgICAgIGNvbnN0IGRzZWVkID0ge307XG5cbiAgICAgICAgZHNlZWQudGFnID0gJ2QnO1xuICAgICAgICBkc2VlZC5yYW5kb20gPSBjcnlwdG8uZGVyaXZlS2V5KHN0clNlZWQsIG51bGwsIGtleUxlbik7XG4gICAgICAgIGRzZWVkLmRvbWFpbiA9IEpTT04ucGFyc2UoZG9tYWluKTtcblxuICAgICAgICByZXR1cm4gZHNlZWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29tcHV0ZVVpZChkc2VlZCl7XG4gICAgICAgIGlmKCFkc2VlZCl7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEc2VlZCB3YXMgbm90IHByb3ZpZGVkXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBkc2VlZCA9PT0gXCJvYmplY3RcIiAmJiAhQnVmZmVyLmlzQnVmZmVyKGRzZWVkKSkge1xuICAgICAgICAgICAgZHNlZWQgPSBnZW5lcmF0ZUNvbXBhY3RGb3JtKGRzZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHVpZCA9IHt9O1xuICAgICAgICB1aWQudGFnID0gJ3UnO1xuICAgICAgICB1aWQucmFuZG9tID0gQnVmZmVyLmZyb20oY3J5cHRvLmdlbmVyYXRlU2FmZVVpZChkc2VlZCkpO1xuXG4gICAgICAgIHJldHVybiB1aWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVDb21wYWN0Rm9ybSh7dGFnLCByYW5kb20sIGRvbWFpbn0pIHtcbiAgICAgICAgbGV0IGNvbXBhY3RJZCA9IHRhZyArIHJhbmRvbS50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgIGNvbXBhY3RJZCArPSAnfCcgKyBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShkb21haW4pKS50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEJ1ZmZlci5mcm9tKGVuY29kZVVSSUNvbXBvbmVudChjb21wYWN0SWQpKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiB1bnVzZWQgZnVuY3Rpb24hISFcbiAgICAvLyBmdW5jdGlvbiBlbmNyeXB0KGlkLCBlbmNyeXB0aW9uS2V5KSB7XG4gICAgLy8gICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggIT09IDIpe1xuICAgIC8vICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBXcm9uZyBudW1iZXIgb2YgYXJndW1lbnRzLiBFeHBlY3RlZDogMjsgcHJvdmlkZWQgJHthcmd1bWVudHMubGVuZ3RofWApO1xuICAgIC8vICAgICB9XG5cbiAgICAvLyAgICAgbGV0IHRhZztcbiAgICAvLyAgICAgaWYgKHR5cGVvZiBpZCA9PT0gXCJvYmplY3RcIiAmJiAhQnVmZmVyLmlzQnVmZmVyKGlkKSkge1xuICAgIC8vICAgICAgICAgdGFnID0gaWQudGFnO1xuICAgIC8vICAgICAgICAgaWQgPSBnZW5lcmF0ZUNvbXBhY3RGb3JtKGlkKTtcbiAgICAvLyAgICAgfVxuXG4gICAgLy8gICAgIGlmICh0YWcgPT09ICdzJykge1xuICAgIC8vICAgICAgICAgLy9UT0RPIGVuY3J5cHQgc2VlZFxuICAgIC8vICAgICB9ZWxzZSBpZiAodGFnID09PSAnZCcpIHtcbiAgICAvLyAgICAgICAgIC8vVE9ETyBlbmNyeXB0IGRzZWVkXG4gICAgLy8gICAgIH1lbHNle1xuICAgIC8vICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIHByb3ZpZGVkIGlkIGNhbm5vdCBiZSBlbmNyeXB0ZWRcIik7XG4gICAgLy8gICAgIH1cblxuICAgIC8vIH1cblxuICAgIGZ1bmN0aW9uIGxvYWQoY29tcGFjdElkKSB7XG4gICAgICAgIGlmKHR5cGVvZiBjb21wYWN0SWQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgdHlwZSBzdHJpbmcgb3IgQnVmZmVyLiBSZWNlaXZlZCB1bmRlZmluZWRgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHR5cGVvZiBjb21wYWN0SWQgIT09IFwic3RyaW5nXCIpe1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb21wYWN0SWQgPT09IFwib2JqZWN0XCIgJiYgIUJ1ZmZlci5pc0J1ZmZlcihjb21wYWN0SWQpKSB7XG4gICAgICAgICAgICAgICAgY29tcGFjdElkID0gQnVmZmVyLmZyb20oY29tcGFjdElkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29tcGFjdElkID0gY29tcGFjdElkLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkZWNvZGVkQ29tcGFjdElkID0gZGVjb2RlVVJJQ29tcG9uZW50KGNvbXBhY3RJZCk7XG4gICAgICAgIGNvbnN0IGlkID0ge307XG4gICAgICAgIGNvbnN0IHNwbGl0Q29tcGFjdElkID0gZGVjb2RlZENvbXBhY3RJZC5zdWJzdHJpbmcoMSkuc3BsaXQoJ3wnKTtcblxuICAgICAgICBpZC50YWcgPSBkZWNvZGVkQ29tcGFjdElkWzBdO1xuICAgICAgICBpZC5yYW5kb20gPSBCdWZmZXIuZnJvbShzcGxpdENvbXBhY3RJZFswXSwgJ2Jhc2U2NCcpO1xuXG4gICAgICAgIGlmKHNwbGl0Q29tcGFjdElkWzFdICYmIHNwbGl0Q29tcGFjdElkWzFdLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgaWQuZG9tYWluID0gSlNPTi5wYXJzZShCdWZmZXIuZnJvbShzcGxpdENvbXBhY3RJZFsxXSwgJ2Jhc2U2NCcpLnRvU3RyaW5nKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGlkO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDU0JJZGVudGlmaWVyO1xuIiwiY29uc3QgQnJpY2sgPSByZXF1aXJlKFwiYmFyXCIpLkJyaWNrO1xuY29uc3QgcHNrQ3J5cHRvID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcblxuZnVuY3Rpb24gSGVhZGVyKHByZXZpb3VzSGVhZGVySGFzaCwgZmlsZXMsIHRyYW5zYWN0aW9ucyl7XG4gICAgcHJldmlvdXNIZWFkZXJIYXNoID0gcHJldmlvdXNIZWFkZXJIYXNoIHx8IFwiXCI7XG4gICAgZmlsZXMgPSBmaWxlcyB8fCB7fTtcbiAgICB0cmFuc2FjdGlvbnMgPSB0cmFuc2FjdGlvbnMgfHwgW107XG5cbiAgICB0aGlzLnRvQnJpY2sgPSBmdW5jdGlvbiAoZW5jcnlwdGlvbktleSkge1xuICAgICAgICBjb25zdCBoZWFkZXJPYmogPSB7cHJldmlvdXNIZWFkZXJIYXNoLCBmaWxlcywgdHJhbnNhY3Rpb25zfTtcbiAgICAgICAgY29uc3QgZW5jcnlwdGVkSGVhZGVyT2JqID0gcHNrQ3J5cHRvLmVuY3J5cHQoaGVhZGVyT2JqLCBlbmNyeXB0aW9uS2V5KTtcbiAgICAgICAgcmV0dXJuIG5ldyBCcmljayhlbmNyeXB0ZWRIZWFkZXJPYmopO1xuICAgIH07XG5cbiAgICB0aGlzLmZyb21CcmljayA9IGZ1bmN0aW9uIChicmljaywgZGVjcnlwdGlvbktleSkge1xuICAgICAgICBjb25zdCBoZWFkZXJPYmogPSBKU09OLnBhcnNlKHBza0NyeXB0by5kZWNyeXB0KGJyaWNrLCBkZWNyeXB0aW9uS2V5KSk7XG4gICAgICAgIHByZXZpb3VzSGVhZGVySGFzaCA9IGhlYWRlck9iai5wcmV2aW91c0hlYWRlckhhc2g7XG4gICAgICAgIGZpbGVzID0gaGVhZGVyT2JqLmZpbGVzO1xuICAgICAgICB0cmFuc2FjdGlvbnMgPSBoZWFkZXJPYmoudHJhbnNhY3Rpb25zO1xuICAgIH07XG5cbiAgICB0aGlzLnNldFByZXZpb3VzSGVhZGVySGFzaCA9IGZ1bmN0aW9uIChoYXNoKSB7XG4gICAgICAgIHByZXZpb3VzSGVhZGVySGFzaCA9IGhhc2g7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0UHJldmlvdXNIZWFkZXJIYXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gcHJldmlvdXNIZWFkZXJIYXNoO1xuICAgIH07XG5cbiAgICB0aGlzLmFkZFRyYW5zYWN0aW9ucyA9IGZ1bmN0aW9uIChuZXdUcmFuc2FjdGlvbnMpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG5ld1RyYW5zYWN0aW9ucykpIHtcbiAgICAgICAgICAgIG5ld1RyYW5zYWN0aW9ucyA9IFsgbmV3VHJhbnNhY3Rpb25zIF07XG4gICAgICAgIH1cblxuICAgICAgICB0cmFuc2FjdGlvbnMgPSB0cmFuc2FjdGlvbnMuY29uY2F0KG5ld1RyYW5zYWN0aW9ucyk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VHJhbnNhY3Rpb25zID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdHJhbnNhY3Rpb25zO1xuICAgIH07XG5cbiAgICB0aGlzLmFkZEZpbGVzID0gZnVuY3Rpb24gKG5ld0ZpbGVzKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbmV3RmlsZXMgIT09IFwib2JqZWN0XCIgfHwgQXJyYXkuaXNBcnJheShuZXdGaWxlcykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0eXBlLiBFeHBlY3RlZCBub24tYXJyYXkgb2JqZWN0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBuZXdGaWxlc0tleXMgPSBPYmplY3Qua2V5cyhuZXdGaWxlcyk7XG4gICAgICAgIG5ld0ZpbGVzS2V5cy5mb3JFYWNoKChmaWxlQWxpYXMpID0+IHtcbiAgICAgICAgICAgIGZpbGVzW2ZpbGVBbGlhc10gPSBuZXdGaWxlc1tmaWxlQWxpYXNdO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRGaWxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZpbGVzO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEhlYWRlck9iamVjdCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcHJldmlvdXNIZWFkZXJIYXNoLFxuICAgICAgICAgICAgZmlsZXMsXG4gICAgICAgICAgICB0cmFuc2FjdGlvbnNcbiAgICAgICAgfTtcbiAgICB9O1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSGVhZGVyOyIsImNvbnN0IEJyaWNrID0gcmVxdWlyZShcImJhclwiKS5CcmljaztcbmNvbnN0IHBza0NyeXB0byA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5cbmZ1bmN0aW9uIEhlYWRlcnNIaXN0b3J5KGluaXRIZWFkZXJzKSB7XG5cbiAgICBsZXQgaGVhZGVycyA9IGluaXRIZWFkZXJzIHx8IFtdO1xuICAgIHRoaXMuYWRkSGVhZGVyID0gZnVuY3Rpb24gKGhlYWRlckJyaWNrLCBlbmNyeXB0aW9uS2V5KSB7XG4gICAgICAgIGNvbnN0IGhlYWRlckVudHJ5ID0ge307XG4gICAgICAgIGNvbnN0IGhlYWRlckhhc2ggPSBoZWFkZXJCcmljay5nZW5lcmF0ZUhhc2goKTtcbiAgICAgICAgaGVhZGVyRW50cnlbaGVhZGVySGFzaF0gPSBlbmNyeXB0aW9uS2V5O1xuICAgICAgICBoZWFkZXJzLnB1c2goaGVhZGVyRW50cnkpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEhlYWRlcnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBoZWFkZXJzO1xuICAgIH07XG5cbiAgICB0aGlzLmdldExhc3RIZWFkZXJIYXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoaGVhZGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBoZWFkZXJFbnRyeSA9IGhlYWRlcnNbaGVhZGVycy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhoZWFkZXJFbnRyeSlbMF07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy50b0JyaWNrID0gZnVuY3Rpb24gKGVuY3J5cHRpb25LZXkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBCcmljayhwc2tDcnlwdG8uZW5jcnlwdChoZWFkZXJzLCBlbmNyeXB0aW9uS2V5KSk7XG4gICAgfTtcblxuICAgIHRoaXMuZnJvbUJyaWNrID0gZnVuY3Rpb24gKGJyaWNrLCBkZWNyeXB0aW9uS2V5KSB7XG4gICAgICAgIGhlYWRlcnMgPSBKU09OLnBhcnNlKHBza0NyeXB0by5kZWNyeXB0KGJyaWNrLCBkZWNyeXB0aW9uS2V5KS50b1N0cmluZygpKTtcbiAgICB9O1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSGVhZGVyc0hpc3Rvcnk7IiwiY29uc3QgT3dNID0gcmVxdWlyZSgnc3dhcm11dGlscycpLk93TTtcbmNvbnN0IHBza2RiID0gcmVxdWlyZSgncHNrZGInKTtcblxuZnVuY3Rpb24gUmF3Q1NCKGluaXREYXRhKSB7XG5cdGNvbnN0IGRhdGEgPSBuZXcgT3dNKHtibG9ja2NoYWluOiBpbml0RGF0YX0pO1xuXHRjb25zdCBibG9ja2NoYWluID0gcHNrZGIuc3RhcnREYih7Z2V0SW5pdFZhbHVlcywgcGVyc2lzdH0pO1xuXG5cdGlmKCFkYXRhLmJsb2NrY2hhaW4pIHtcblx0XHRkYXRhLmJsb2NrY2hhaW4gPSB7XG5cdFx0XHR0cmFuc2FjdGlvbkxvZzogW11cblx0XHR9O1xuXHR9XG5cblx0ZGF0YS5hdHRhY2hGaWxlID0gZnVuY3Rpb24gKGZpbGVBbGlhcywgcGF0aCwgc2VlZCkge1xuXHRcdGRhdGEubW9kaWZ5QXNzZXQoXCJnbG9iYWwuRmlsZVJlZmVyZW5jZVwiLCBmaWxlQWxpYXMsIChmaWxlKSA9PiB7XG5cdFx0XHRpZiAoIWZpbGUuaXNFbXB0eSgpKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGBGaWxlIHdpdGggYWxpYXMgJHtmaWxlQWxpYXN9IGFscmVhZHkgZXhpc3RzYCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0ZmlsZS5pbml0KGZpbGVBbGlhcywgcGF0aCwgc2VlZCk7XG5cdFx0fSk7XG5cdH07XG5cblx0ZGF0YS5zYXZlQXNzZXQgPSBmdW5jdGlvbihhc3NldCkge1xuXHRcdGNvbnN0IHRyYW5zYWN0aW9uID0gYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcblx0XHR0cmFuc2FjdGlvbi5hZGQoYXNzZXQpO1xuXHRcdGJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcblx0fTtcblxuXHRkYXRhLm1vZGlmeUFzc2V0ID0gZnVuY3Rpb24oYXNzZXRUeXBlLCBhaWQsIGFzc2V0TW9kaWZpZXIpIHtcblx0XHRjb25zdCB0cmFuc2FjdGlvbiA9IGJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG5cdFx0Y29uc3QgYXNzZXQgPSB0cmFuc2FjdGlvbi5sb29rdXAoYXNzZXRUeXBlLCBhaWQpO1xuXHRcdGFzc2V0TW9kaWZpZXIoYXNzZXQpO1xuXG5cdFx0dHJhbnNhY3Rpb24uYWRkKGFzc2V0KTtcblx0XHRibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG5cdH07XG5cblx0ZGF0YS5nZXRBc3NldCA9IGZ1bmN0aW9uIChhc3NldFR5cGUsIGFpZCkge1xuXHRcdGNvbnN0IHRyYW5zYWN0aW9uID0gYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcblx0XHRyZXR1cm4gdHJhbnNhY3Rpb24ubG9va3VwKGFzc2V0VHlwZSwgYWlkKTtcblx0fTtcblxuXHRkYXRhLmdldEFsbEFzc2V0cyA9IGZ1bmN0aW9uKGFzc2V0VHlwZSkge1xuXHRcdGNvbnN0IHRyYW5zYWN0aW9uID0gYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcblx0XHRyZXR1cm4gdHJhbnNhY3Rpb24ubG9hZEFzc2V0cyhhc3NldFR5cGUpO1xuXHR9O1xuXG5cdGRhdGEuYXBwbHlUcmFuc2FjdGlvbiA9IGZ1bmN0aW9uICh0cmFuc2FjdGlvblN3YXJtKSB7XG5cdFx0Ly8gY29uc3QgdHJhbnNhY3Rpb24gPSBibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24odHJhbnNhY3Rpb25Td2FybSk7XG5cdFx0YmxvY2tjaGFpbi5jb21taXRTd2FybSh0cmFuc2FjdGlvblN3YXJtKTtcblx0XHQvLyBibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG5cdH07XG5cblx0ZGF0YS5nZXRUcmFuc2FjdGlvbkxvZyA9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gZGF0YS5ibG9ja2NoYWluLnRyYW5zYWN0aW9uTG9nO1xuXHR9O1xuXHQvKiBpbnRlcm5hbCBmdW5jdGlvbnMgKi9cblxuXHRmdW5jdGlvbiBwZXJzaXN0KHRyYW5zYWN0aW9uTG9nLCBjdXJyZW50VmFsdWVzLCBjdXJyZW50UHVsc2UpIHtcblx0XHR0cmFuc2FjdGlvbkxvZy5jdXJyZW50UHVsc2UgPSBjdXJyZW50UHVsc2U7XG5cblx0XHRkYXRhLmJsb2NrY2hhaW4uY3VycmVudFZhbHVlcyA9IGN1cnJlbnRWYWx1ZXM7XG5cdFx0ZGF0YS5ibG9ja2NoYWluLnRyYW5zYWN0aW9uTG9nLnB1c2godHJhbnNhY3Rpb25Mb2cpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0SW5pdFZhbHVlcyAoKSB7XG5cdFx0aWYoIWRhdGEuYmxvY2tjaGFpbiB8fCAhZGF0YS5ibG9ja2NoYWluLmN1cnJlbnRWYWx1ZXMpIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRyZXR1cm4gZGF0YS5ibG9ja2NoYWluLmN1cnJlbnRWYWx1ZXM7XG5cdH1cblxuXHRyZXR1cm4gZGF0YTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSYXdDU0I7IiwiY29uc3QgUmF3Q1NCID0gcmVxdWlyZSgnLi9SYXdDU0InKTtcbmNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ3Bza2NyeXB0bycpO1xuY29uc3QgQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoXCIuL0NTQklkZW50aWZpZXJcIik7XG5jb25zdCBIZWFkZXIgPSByZXF1aXJlKFwiLi9IZWFkZXJcIik7XG5jb25zdCBIZWFkZXJzSGlzdG9yeSA9IHJlcXVpcmUoXCIuL0hlYWRlcnNIaXN0b3J5XCIpO1xuY29uc3QgRURGU0JyaWNrU3RvcmFnZSA9IHJlcXVpcmUoXCJlZGZzLWJyaWNrLXN0b3JhZ2VcIik7XG5jb25zdCBCYXIgPSByZXF1aXJlKFwiYmFyXCIpO1xuY29uc3QgQXN5bmNEaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL2VkZnMvdXRpbHMvQXN5bmNEaXNwYXRjaGVyXCIpO1xuY29uc3QgQnJpY2sgPSBCYXIuQnJpY2s7XG4vKipcbiAqXG4gKiBAcGFyYW0gY3VycmVudFJhd0NTQiAtIG9wdGlvbmFsXG4gKiBAcGFyYW0gY3NiSWRlbnRpZmllciAtIHJlcXVpcmVkXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gUm9vdENTQihjdXJyZW50UmF3Q1NCLCBjc2JJZGVudGlmaWVyLCBhY2Nlc3NQb2ludCkge1xuICAgIHRoaXMuZ2V0TWlkUm9vdCA9IGZ1bmN0aW9uIChDU0JQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH07XG5cbiAgICB0aGlzLmNyZWF0ZVJhd0NTQiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSYXdDU0IoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5sb2FkUmF3Q1NCID0gZnVuY3Rpb24gKENTQlBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghY3VycmVudFJhd0NTQikge1xuICAgICAgICAgICAgZWRmc0Jsb2NrY2hhaW5Qcm94eS5nZXRDU0JBbmNob3IoY3NiSWRlbnRpZmllciwgKGVyciwgY3NiQW5jaG9yKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBfX2xvYWRSYXdDU0IoY3NiSWRlbnRpZmllciwgY3NiQW5jaG9yLmhlYWRlckhpc3RvcnlIYXNoLChlcnIsIHJhd0NTQikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRSYXdDU0IgPSByYXdDU0I7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKENTQlBhdGggfHwgQ1NCUGF0aCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFJhd0NTQihDU0JQYXRoLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGN1cnJlbnRSYXdDU0IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFDU0JQYXRoIHx8IENTQlBhdGggPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgY3VycmVudFJhd0NTQik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmxvYWRBc3NldEZyb21QYXRoKENTQlBhdGgsIChlcnIsIGFzc2V0LCByYXdDU0IpID0+IHtcblxuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWFzc2V0IHx8ICFhc3NldC5kc2VlZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoYFRoZSBDU0JQYXRoICR7Q1NCUGF0aH0gaXMgaW52YWxpZC5gKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9fbG9hZFJhd0NTQihuZXcgQ1NCSWRlbnRpZmllcihhc3NldC5kc2VlZCksIGFzc2V0LmhlYWRlckhpc3RvcnlIYXNoLCBjYWxsYmFjayk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLmxvYWRBc3NldEZyb21QYXRoID0gZnVuY3Rpb24gKENTQlBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGxldCBwcm9jZXNzZWRQYXRoID0gX19zcGxpdFBhdGgoQ1NCUGF0aCk7XG4gICAgICAgIGlmICghY3VycmVudFJhd0NTQikge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignY3VycmVudFJhd0NTQiBkb2VzIG5vdCBleGlzdCcpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBDU0JSZWZlcmVuY2UgPSBudWxsO1xuICAgICAgICBpZiAocHJvY2Vzc2VkUGF0aC5DU0JBbGlhc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IG5leHRBbGlhcyA9IHByb2Nlc3NlZFBhdGguQ1NCQWxpYXNlc1swXTtcbiAgICAgICAgICAgIENTQlJlZmVyZW5jZSA9IGN1cnJlbnRSYXdDU0IuZ2V0QXNzZXQoJ2dsb2JhbC5DU0JSZWZlcmVuY2UnLCBuZXh0QWxpYXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFwcm9jZXNzZWRQYXRoLmFzc2V0VHlwZSB8fCAhcHJvY2Vzc2VkUGF0aC5hc3NldEFpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ05vdCBhc3NldCB0eXBlIG9yIGlkIHNwZWNpZmllZCBpbiBDU0JQYXRoJykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBDU0JSZWZlcmVuY2UgPSBjdXJyZW50UmF3Q1NCLmdldEFzc2V0KHByb2Nlc3NlZFBhdGguYXNzZXRUeXBlLCBwcm9jZXNzZWRQYXRoLmFzc2V0QWlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9jZXNzZWRQYXRoLkNTQkFsaWFzZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgQ1NCUmVmZXJlbmNlLCBjdXJyZW50UmF3Q1NCKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb2Nlc3NlZFBhdGguQ1NCQWxpYXNlcy5zaGlmdCgpO1xuXG4gICAgICAgIGlmKCFDU0JSZWZlcmVuY2UgfHwgIUNTQlJlZmVyZW5jZS5kc2VlZCl7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKGBUaGUgQ1NCUGF0aCAke0NTQlBhdGh9IGlzIGludmFsaWRgKSk7XG4gICAgICAgIH1cbiAgICAgICAgX19sb2FkQXNzZXRGcm9tUGF0aChwcm9jZXNzZWRQYXRoLCBuZXcgQ1NCSWRlbnRpZmllcihDU0JSZWZlcmVuY2UuZHNlZWQpLCBDU0JSZWZlcmVuY2UuYmFyTWFwSGFzaCwgMCwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICB0aGlzLnNhdmVBc3NldFRvUGF0aCA9IGZ1bmN0aW9uIChDU0JQYXRoLCBhc3NldCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3Qgc3BsaXRQYXRoID0gX19zcGxpdFBhdGgoQ1NCUGF0aCwge2tlZXBBbGlhc2VzQXNTdHJpbmc6IHRydWV9KTtcbiAgICAgICAgdGhpcy5sb2FkUmF3Q1NCKHNwbGl0UGF0aC5DU0JBbGlhc2VzLCAoZXJyLCByYXdDU0IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmF3Q1NCLnNhdmVBc3NldChhc3NldCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zYXZlUmF3Q1NCKHJhd0NTQiwgc3BsaXRQYXRoLkNTQkFsaWFzZXMsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLnNhdmVSYXdDU0IgPSBmdW5jdGlvbiAocmF3Q1NCLCBDU0JQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIUNTQlBhdGggfHwgQ1NCUGF0aCA9PT0gJycpIHtcbiAgICAgICAgICAgIGlmIChyYXdDU0IpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UmF3Q1NCID0gcmF3Q1NCO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdHJhbnNhY3Rpb25zID0gcmF3Q1NCLmdldFRyYW5zYWN0aW9uTG9nKCk7XG4gICAgICAgIGNvbnN0IGhlYWRlcnNIaXN0b3J5ID0gbmV3IEhlYWRlcnNIaXN0b3J5KCk7XG4gICAgICAgIGNvbnN0IGhlYWRlciA9IG5ldyBIZWFkZXIoKTtcbiAgICAgICAgZWRmc0Jsb2NrY2hhaW5Qcm94eS5nZXRDU0JBbmNob3IoY3NiSWRlbnRpZmllciwgKGVyciwgY3NiQW5jaG9yKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTsgLy9UT0RPOiBiZXR0ZXIgaGFuZGxpbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjc2JBbmNob3IgJiYgdHlwZW9mIGNzYkFuY2hvci5oZWFkZXJIaXN0b3J5SGFzaCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIGVkZnNTZXJ2aWNlUHJveHkuZ2V0QnJpY2soY3NiQW5jaG9yLmhlYWRlckhpc3RvcnlIYXNoLCAoZXJyLCBoZWFkZXJzSGlzdG9yeUJyaWNrKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyc0hpc3RvcnkuZnJvbUJyaWNrKGhlYWRlcnNIaXN0b3J5QnJpY2ssIGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKSk7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlci5zZXRQcmV2aW91c0hlYWRlckhhc2goaGVhZGVyc0hpc3RvcnkuZ2V0TGFzdEhlYWRlckhhc2goKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfX3NhdmVSYXdDU0IoY3NiQW5jaG9yLCBoZWFkZXJzSGlzdG9yeSwgaGVhZGVyLCB0cmFuc2FjdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNzYkFuY2hvci5pbml0KGNzYklkZW50aWZpZXIuZ2V0VWlkKCksIGNzYklkZW50aWZpZXIuZ2V0VWlkKCkpO1xuICAgICAgICAgICAgX19zYXZlUmF3Q1NCKGNzYkFuY2hvciwgaGVhZGVyc0hpc3RvcnksIGhlYWRlciwgdHJhbnNhY3Rpb25zLCBjYWxsYmFjayk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cblxuICAgIC8qIC0tLS0tLS0tLS0tLS0tLS0tLS0gSU5URVJOQUwgTUVUSE9EUyAtLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIENTQlBhdGg6IHN0cmluZyAtIGludGVybmFsIHBhdGggdGhhdCBsb29rcyBsaWtlIC97Q1NCTmFtZTF9L3tDU0JOYW1lMn06e2Fzc2V0VHlwZX06e2Fzc2V0QWxpYXNPcklkfVxuICAgICAqIEBwYXJhbSBvcHRpb25zOm9iamVjdFxuICAgICAqIEByZXR1cm5zIHt7Q1NCQWxpYXNlczogW3N0cmluZ10sIGFzc2V0QWlkOiAoKnx1bmRlZmluZWQpLCBhc3NldFR5cGU6ICgqfHVuZGVmaW5lZCl9fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX19zcGxpdFBhdGgoQ1NCUGF0aCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGNvbnN0IHBhdGhTZXBhcmF0b3IgPSAnLyc7XG5cbiAgICAgICAgaWYgKENTQlBhdGguc3RhcnRzV2l0aChwYXRoU2VwYXJhdG9yKSkge1xuICAgICAgICAgICAgQ1NCUGF0aCA9IENTQlBhdGguc3Vic3RyaW5nKDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IENTQkFsaWFzZXMgPSBDU0JQYXRoLnNwbGl0KHBhdGhTZXBhcmF0b3IpO1xuICAgICAgICBpZiAoQ1NCQWxpYXNlcy5sZW5ndGggPCAxKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NTQlBhdGggdG9vIHNob3J0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBsYXN0SW5kZXggPSBDU0JBbGlhc2VzLmxlbmd0aCAtIDE7XG4gICAgICAgIGNvbnN0IG9wdGlvbmFsQXNzZXRTZWxlY3RvciA9IENTQkFsaWFzZXNbbGFzdEluZGV4XS5zcGxpdCgnOicpO1xuXG4gICAgICAgIGlmIChvcHRpb25hbEFzc2V0U2VsZWN0b3JbMF0gPT09ICcnKSB7XG4gICAgICAgICAgICBDU0JBbGlhc2VzID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBDU0JBbGlhc2VzW2xhc3RJbmRleF0gPSBvcHRpb25hbEFzc2V0U2VsZWN0b3JbMF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW9wdGlvbmFsQXNzZXRTZWxlY3RvclsxXSAmJiAhb3B0aW9uYWxBc3NldFNlbGVjdG9yWzJdKSB7XG4gICAgICAgICAgICBvcHRpb25hbEFzc2V0U2VsZWN0b3JbMV0gPSAnZ2xvYmFsLkNTQlJlZmVyZW5jZSc7XG4gICAgICAgICAgICBvcHRpb25hbEFzc2V0U2VsZWN0b3JbMl0gPSBDU0JBbGlhc2VzW2xhc3RJbmRleF07XG4gICAgICAgICAgICBDU0JBbGlhc2VzLnBvcCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMua2VlcEFsaWFzZXNBc1N0cmluZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgQ1NCQWxpYXNlcyA9IENTQkFsaWFzZXMuam9pbignLycpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBDU0JBbGlhc2VzOiBDU0JBbGlhc2VzLFxuICAgICAgICAgICAgYXNzZXRUeXBlOiBvcHRpb25hbEFzc2V0U2VsZWN0b3JbMV0sXG4gICAgICAgICAgICBhc3NldEFpZDogb3B0aW9uYWxBc3NldFNlbGVjdG9yWzJdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX19zYXZlUmF3Q1NCKGNzYkFuY2hvciwgaGVhZGVyc0hpc3RvcnksIGhlYWRlciwgdHJhbnNhY3Rpb25zLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBhc3luY0Rpc3BhdGNoZXIgPSBuZXcgQXN5bmNEaXNwYXRjaGVyKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGhlYWRlckVuY3J5cHRpb25LZXkgPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpO1xuICAgICAgICAgICAgY29uc3QgaGVhZGVyQnJpY2sgPSBoZWFkZXIudG9CcmljayhoZWFkZXJFbmNyeXB0aW9uS2V5KTtcbiAgICAgICAgICAgIGVkZnNTZXJ2aWNlUHJveHkuYWRkQnJpY2soaGVhZGVyQnJpY2ssIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGhlYWRlcnNIaXN0b3J5LmFkZEhlYWRlcihoZWFkZXJCcmljaywgaGVhZGVyRW5jcnlwdGlvbktleSk7XG4gICAgICAgICAgICAgICAgY29uc3QgaGlzdG9yeUJyaWNrID0gaGVhZGVyc0hpc3RvcnkudG9Ccmljayhjc2JJZGVudGlmaWVyLmdldERzZWVkKCkpO1xuICAgICAgICAgICAgICAgIGVkZnNTZXJ2aWNlUHJveHkuYWRkQnJpY2soaGlzdG9yeUJyaWNrLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY3NiQW5jaG9yLnVwZGF0ZUhlYWRlckhpc3RvcnlIYXNoKGhpc3RvcnlCcmljay5nZW5lcmF0ZUhhc2goKSk7XG4gICAgICAgICAgICAgICAgICAgIGVkZnNCbG9ja2NoYWluUHJveHkuc2V0Q1NCQW5jaG9yKGNzYkFuY2hvciwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KHRyYW5zYWN0aW9ucy5sZW5ndGgpO1xuICAgICAgICB0cmFuc2FjdGlvbnMuZm9yRWFjaCgodHJhbnNhY3Rpb24pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGVuY3J5cHRpb25LZXkgPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpO1xuICAgICAgICAgICAgY29uc3QgdHJhbnNhY3Rpb25CcmljayA9IG5ldyBCcmljayhjcnlwdG8uZW5jcnlwdCh0cmFuc2FjdGlvbiwgZW5jcnlwdGlvbktleSkpO1xuICAgICAgICAgICAgY29uc3QgdHJhbnNhY3Rpb25FbnRyeSA9IHt9O1xuICAgICAgICAgICAgY29uc3QgdHJhbnNhY3Rpb25IYXNoID0gdHJhbnNhY3Rpb25Ccmljay5nZW5lcmF0ZUhhc2goKTtcbiAgICAgICAgICAgIHRyYW5zYWN0aW9uRW50cnlbdHJhbnNhY3Rpb25IYXNoXSA9IGVuY3J5cHRpb25LZXk7XG4gICAgICAgICAgICBoZWFkZXIuYWRkVHJhbnNhY3Rpb25zKHRyYW5zYWN0aW9uRW50cnkpO1xuICAgICAgICAgICAgZWRmc1NlcnZpY2VQcm94eS5hZGRCcmljayh0cmFuc2FjdGlvbkJyaWNrLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBhc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuXG4gICAgZnVuY3Rpb24gX19sb2FkUmF3Q1NCKGxvY2FsQ1NCSWRlbnRpZmllciwgbG9jYWxIZWFkZXJIaXN0b3J5SGFzaCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYodHlwZW9mIGxvY2FsSGVhZGVySGlzdG9yeUhhc2ggPT09IFwiZnVuY3Rpb25cIil7XG4gICAgICAgICAgICBjYWxsYmFjayA9IGxvY2FsSGVhZGVySGlzdG9yeUhhc2g7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByYXdDU0IgPSBuZXcgUmF3Q1NCKCk7XG4gICAgICAgIGVkZnNTZXJ2aWNlUHJveHkuZ2V0QnJpY2sobG9jYWxIZWFkZXJIaXN0b3J5SGFzaCwgKGVyciwgaGVhZGVyc0hpc3RvcnlCcmlja0RhdGEpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgaGVhZGVyc0hpc3RvcnkgPSBuZXcgSGVhZGVyc0hpc3RvcnkoKTtcbiAgICAgICAgICAgIGhlYWRlcnNIaXN0b3J5LmZyb21CcmljayhoZWFkZXJzSGlzdG9yeUJyaWNrRGF0YSwgbG9jYWxDU0JJZGVudGlmaWVyLmdldERzZWVkKCkpO1xuICAgICAgICAgICAgY29uc3QgaGVhZGVyc0FzeW5jRGlzcGF0Y2hlciA9IG5ldyBBc3luY0Rpc3BhdGNoZXIoKGVycm9ycywgcmVzdWx0cykgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgcmF3Q1NCKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBoZWFkZXJzID0gaGVhZGVyc0hpc3RvcnkuZ2V0SGVhZGVycygpO1xuICAgICAgICAgICAgaGVhZGVyc0FzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KGhlYWRlcnMubGVuZ3RoKTtcbiAgICAgICAgICAgIGhlYWRlcnMuZm9yRWFjaCgoaGVhZGVyRW50cnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXJIYXNoID0gT2JqZWN0LmtleXMoaGVhZGVyRW50cnkpWzBdO1xuICAgICAgICAgICAgICAgIGVkZnNTZXJ2aWNlUHJveHkuZ2V0QnJpY2soaGVhZGVySGFzaCwgKGVyciwgaGVhZGVyQnJpY2spID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbmV3IEhlYWRlcigpO1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXIuZnJvbUJyaWNrKGhlYWRlckJyaWNrLCBoZWFkZXJFbnRyeVtoZWFkZXJIYXNoXSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uc0VudHJpZXMgPSBoZWFkZXIuZ2V0VHJhbnNhY3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uc0FzeW5jRGlzcGF0Y2hlciA9IG5ldyBBc3luY0Rpc3BhdGNoZXIoKGVycm9ycywgcmVzdWx0cykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0c09iaiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5mb3JFYWNoKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBPYmplY3Qua2V5cyhyZXN1bHQpWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHNPYmpba2V5XSA9IE9iamVjdC52YWx1ZXMocmVzdWx0W2tleV0pWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uc0VudHJpZXMuZm9yRWFjaCgodHJhbnNhY3Rpb25FbnRyeSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uSGFzaCA9IE9iamVjdC5rZXlzKHRyYW5zYWN0aW9uRW50cnkpWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhd0NTQi5hcHBseVRyYW5zYWN0aW9uKHJlc3VsdHNPYmpbdHJhbnNhY3Rpb25IYXNoXS5zd2FybSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyc0FzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb25zQXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkodHJhbnNhY3Rpb25zRW50cmllcy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbnNFbnRyaWVzLmZvckVhY2goKHRyYW5zYWN0aW9uRW50cnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uSGFzaCA9IE9iamVjdC5rZXlzKHRyYW5zYWN0aW9uRW50cnkpWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWRmc1NlcnZpY2VQcm94eS5nZXRCcmljayh0cmFuc2FjdGlvbkhhc2gsIChlcnIsIHRyYW5zYWN0aW9uQnJpY2spID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uT2JqID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb25PYmpbdHJhbnNhY3Rpb25IYXNoXSA9IGNyeXB0by5kZWNyeXB0T2JqZWN0KHRyYW5zYWN0aW9uQnJpY2ssIHRyYW5zYWN0aW9uRW50cnlbdHJhbnNhY3Rpb25IYXNoXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb25zQXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKHVuZGVmaW5lZCwgdHJhbnNhY3Rpb25PYmopO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX19sb2FkQXNzZXRGcm9tUGF0aChwcm9jZXNzZWRQYXRoLCBsb2NhbENTQklkZW50aWZpZXIsIGxvY2FsSGVhZGVySGlzdG9yeUhhc2gsIGN1cnJlbnRJbmRleCwgY2FsbGJhY2spIHtcbiAgICAgICAgX19sb2FkUmF3Q1NCKGxvY2FsQ1NCSWRlbnRpZmllciwgKGVyciwgcmF3Q1NCKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50SW5kZXggPCBwcm9jZXNzZWRQYXRoLkNTQkFsaWFzZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV4dEFsaWFzID0gcHJvY2Vzc2VkUGF0aC5DU0JBbGlhc2VzW2N1cnJlbnRJbmRleF07XG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXQgPSByYXdDU0IuZ2V0QXNzZXQoXCJnbG9iYWwuQ1NCUmVmZXJlbmNlXCIsIG5leHRBbGlhcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Q1NCSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKGFzc2V0LmRzZWVkKTtcblxuICAgICAgICAgICAgICAgIF9fbG9hZEFzc2V0RnJvbVBhdGgocHJvY2Vzc2VkUGF0aCwgbmV3Q1NCSWRlbnRpZmllciwgKytjdXJyZW50SW5kZXgsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFzc2V0ID0gcmF3Q1NCLmdldEFzc2V0KHByb2Nlc3NlZFBhdGguYXNzZXRUeXBlLCBwcm9jZXNzZWRQYXRoLmFzc2V0QWlkKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGFzc2V0LCByYXdDU0IpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBSb290Q1NCO1xuIiwiXG5mdW5jdGlvbiBFVkZTUmVzb2x2ZXIoKSB7XG4gICAgbGV0IGlzQXV0aGVudGljYXRlZCA9IGZhbHNlO1xuXG4gICAgdGhpcy5hdXRoID0gZnVuY3Rpb24gKHVybCwgYXV0aE9iaiwgY2FsbGJhY2spIHtcbiAgICAgICAgaXNBdXRoZW50aWNhdGVkID0gdHJ1ZTtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9O1xuXG4gICAgdGhpcy5zYXZlID0gZnVuY3Rpb24gKHVybCwgY3NiSWRlbnRpZmllciwgZGF0YVN0cmVhbSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCFpc0F1dGhlbnRpY2F0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ1VuYXV0aGVudGljYXRlZCcpKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0KHVybCArIFwiL0NTQi9cIiArIGNzYklkZW50aWZpZXIuZ2V0VWlkKCksIGRhdGFTdHJlYW0sIChlcnIsIHJlcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHJlcyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLmxvYWQgPSBmdW5jdGlvbiAodXJsLCBjc2JJZGVudGlmaWVyLCB2ZXJzaW9uLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIWlzQXV0aGVudGljYXRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignVW5hdXRoZW50aWNhdGVkJykpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiB2ZXJzaW9uID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gdmVyc2lvbjtcbiAgICAgICAgICAgIHZlcnNpb24gPSBcIlwiO1xuICAgICAgICB9XG5cbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cEdldCh1cmwgKyBcIi9DU0IvXCIgKyBjc2JJZGVudGlmaWVyLmdldFVpZCgpICsgXCIvXCIgKyB2ZXJzaW9uLCAoZXJyLCByZXNvdXJjZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHJlc291cmNlKTtcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG4gICAgdGhpcy5nZXRWZXJzaW9ucyA9IGZ1bmN0aW9uICh1cmwsIGNzYklkZW50aWZpZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghaXNBdXRoZW50aWNhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdVbmF1dGhlbnRpY2F0ZWQnKSk7XG4gICAgICAgIH1cblxuICAgICAgICAkJC5yZW1vdGUuZG9IdHRwR2V0KHVybCArIFwiL0NTQi9cIiArIGNzYklkZW50aWZpZXIuZ2V0VWlkKCkgKyBcIi92ZXJzaW9uc1wiLCAoZXJyLCB2ZXJzaW9ucykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIEpTT04ucGFyc2UodmVyc2lvbnMpKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuY29tcGFyZVZlcnNpb25zID0gZnVuY3Rpb24gKHVybCwgZmlsZXNMaXN0LCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIWlzQXV0aGVudGljYXRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignVW5hdXRoZW50aWNhdGVkJykpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cFBvc3QodXJsICsgXCIvQ1NCL2NvbXBhcmVWZXJzaW9uc1wiLCBKU09OLnN0cmluZ2lmeShmaWxlc0xpc3QpLCAoZXJyLCBtb2RpZmllZEZpbGVzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgbW9kaWZpZWRGaWxlcyk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRVZGU1Jlc29sdmVyOyIsIlxuZnVuY3Rpb24gQXN5bmNEaXNwYXRjaGVyKGZpbmFsQ2FsbGJhY2spIHtcblx0bGV0IHJlc3VsdHMgPSBbXTtcblx0bGV0IGVycm9ycyA9IFtdO1xuXG5cdGxldCBzdGFydGVkID0gMDtcblxuXHRmdW5jdGlvbiBtYXJrT25lQXNGaW5pc2hlZChlcnIsIHJlcykge1xuXHRcdGlmKGVycikge1xuXHRcdFx0ZXJyb3JzLnB1c2goZXJyKTtcblx0XHR9XG5cblx0XHRpZihhcmd1bWVudHMubGVuZ3RoID4gMikge1xuXHRcdFx0YXJndW1lbnRzWzBdID0gdW5kZWZpbmVkO1xuXHRcdFx0cmVzID0gYXJndW1lbnRzO1xuXHRcdH1cblxuXHRcdGlmKHR5cGVvZiByZXMgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0XHRcdHJlc3VsdHMucHVzaChyZXMpO1xuXHRcdH1cblxuXHRcdGlmKC0tc3RhcnRlZCA8PSAwKSB7XG4gICAgICAgICAgICBjYWxsQ2FsbGJhY2soKTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBkaXNwYXRjaEVtcHR5KGFtb3VudCA9IDEpIHtcblx0XHRzdGFydGVkICs9IGFtb3VudDtcblx0fVxuXG5cdGZ1bmN0aW9uIGNhbGxDYWxsYmFjaygpIHtcblx0ICAgIGlmKGVycm9ycy5sZW5ndGggPT09IDApIHtcblx0ICAgICAgICBlcnJvcnMgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuXHQgICAgaWYocmVzdWx0cy5sZW5ndGggPT09IDApIHtcblx0ICAgICAgICByZXN1bHRzID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgZmluYWxDYWxsYmFjayhlcnJvcnMsIHJlc3VsdHMpO1xuICAgIH1cblxuXHRyZXR1cm4ge1xuXHRcdGRpc3BhdGNoRW1wdHksXG5cdFx0bWFya09uZUFzRmluaXNoZWRcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBc3luY0Rpc3BhdGNoZXI7IiwiY29uc3QgY3J5cHRvID0gcmVxdWlyZSgncHNrY3J5cHRvJyk7XG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZShcIi4uL2xpYi9DU0JJZGVudGlmaWVyXCIpO1xuXG5mdW5jdGlvbiBEc2VlZENhZ2UobG9jYWxGb2xkZXIpIHtcblx0Y29uc3QgZHNlZWRGb2xkZXIgPSBwYXRoLmpvaW4obG9jYWxGb2xkZXIsICcucHJpdmF0ZVNreScpO1xuXHRjb25zdCBkc2VlZFBhdGggPSBwYXRoLmpvaW4oZHNlZWRGb2xkZXIsICdkc2VlZCcpO1xuXG5cdGZ1bmN0aW9uIGxvYWREc2VlZEJhY2t1cHMocGluLCBjYWxsYmFjaykge1xuXHRcdGZzLm1rZGlyKGRzZWVkRm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgKGVycikgPT4ge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblxuXHRcdFx0Y3J5cHRvLmxvYWREYXRhKHBpbiwgZHNlZWRQYXRoLCAoZXJyLCBkc2VlZEJhY2t1cHMpID0+IHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRyeXtcblx0XHRcdFx0XHRkc2VlZEJhY2t1cHMgPSBKU09OLnBhcnNlKGRzZWVkQmFja3Vwcy50b1N0cmluZygpKTtcblx0XHRcdFx0fWNhdGNoIChlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGUpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0bGV0IGNzYklkZW50aWZpZXI7XG5cdFx0XHRcdGlmIChkc2VlZEJhY2t1cHMuZHNlZWQgJiYgIUJ1ZmZlci5pc0J1ZmZlcihkc2VlZEJhY2t1cHMuZHNlZWQpKSB7XG5cdFx0XHRcdFx0ZHNlZWRCYWNrdXBzLmRzZWVkID0gQnVmZmVyLmZyb20oZHNlZWRCYWNrdXBzLmRzZWVkKTtcblx0XHRcdFx0XHRjc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoZHNlZWRCYWNrdXBzLmRzZWVkKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNhbGxiYWNrKHVuZGVmaW5lZCwgY3NiSWRlbnRpZmllciwgZHNlZWRCYWNrdXBzLmJhY2t1cHMpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBzYXZlRHNlZWRCYWNrdXBzKHBpbiwgY3NiSWRlbnRpZmllciwgYmFja3VwcywgY2FsbGJhY2spIHtcblx0XHRmcy5ta2Rpcihkc2VlZEZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIChlcnIpID0+IHtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHR9XG5cblx0XHRcdGxldCBkc2VlZDtcblx0XHRcdGlmKGNzYklkZW50aWZpZXIpe1xuXHRcdFx0XHRkc2VlZCA9IGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGRzZWVkQmFja3VwcyA9IEpTT04uc3RyaW5naWZ5KHtcblx0XHRcdFx0ZHNlZWQsXG5cdFx0XHRcdGJhY2t1cHNcblx0XHRcdH0pO1xuXG5cdFx0XHRjcnlwdG8uc2F2ZURhdGEoQnVmZmVyLmZyb20oZHNlZWRCYWNrdXBzKSwgcGluLCBkc2VlZFBhdGgsIGNhbGxiYWNrKTtcblx0XHR9KTtcblx0fVxuXG5cblx0cmV0dXJuIHtcblx0XHRsb2FkRHNlZWRCYWNrdXBzLFxuXHRcdHNhdmVEc2VlZEJhY2t1cHMsXG5cdH07XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBEc2VlZENhZ2U7IiwiY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcblxuZnVuY3Rpb24gSGFzaENhZ2UobG9jYWxGb2xkZXIpIHtcblx0Y29uc3QgaGFzaEZvbGRlciA9IHBhdGguam9pbihsb2NhbEZvbGRlciwgJy5wcml2YXRlU2t5Jyk7XG5cdGNvbnN0IGhhc2hQYXRoID0gcGF0aC5qb2luKGhhc2hGb2xkZXIsICdoYXNoJyk7XG5cblx0ZnVuY3Rpb24gbG9hZEhhc2goY2FsbGJhY2spIHtcblx0XHRmcy5ta2RpcihoYXNoRm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgKGVycikgPT4ge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblxuXHRcdFx0ZnMucmVhZEZpbGUoaGFzaFBhdGgsIChlcnIsIGRhdGEpID0+IHtcblx0XHRcdFx0aWYoZXJyKXtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwge30pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgSlNPTi5wYXJzZShkYXRhKSk7XG5cdFx0XHR9KTtcblxuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2F2ZUhhc2goaGFzaE9iaiwgY2FsbGJhY2spIHtcblx0XHRmcy5ta2RpcihoYXNoRm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgKGVycikgPT4ge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblxuXHRcdFx0ZnMud3JpdGVGaWxlKGhhc2hQYXRoLCBKU09OLnN0cmluZ2lmeShoYXNoT2JqLCBudWxsLCAnXFx0JyksIChlcnIpID0+IHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0bG9hZEhhc2gsXG5cdFx0c2F2ZUhhc2hcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBIYXNoQ2FnZTtcbiIsImV4cG9ydHMuZGVmYXVsdEJhY2t1cCA9IFwiaHR0cDovL2xvY2FsaG9zdDo4MDgwXCI7XG5leHBvcnRzLmRlZmF1bHRQaW4gPSBcIjEyMzQ1Njc4XCI7XG5leHBvcnRzLm5vVHJpZXMgPSAzO1xuIiwiY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuLy8gY29uc3QgY3J5cHRvID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcblxuZnVuY3Rpb24gZ2VuZXJhdGVQYXRoKGxvY2FsRm9sZGVyLCBjc2JJZGVudGlmaWVyKSB7XG4gICAgcmV0dXJuIHBhdGguam9pbihsb2NhbEZvbGRlciwgY3NiSWRlbnRpZmllci5nZXRVaWQoKSk7XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NVcmwodXJsLCBhc3NldFR5cGUpIHtcbiAgICBjb25zdCBzcGxpdFVybCA9IHVybC5zcGxpdCgnLycpO1xuICAgIGNvbnN0IGFsaWFzQXNzZXQgPSBzcGxpdFVybC5wb3AoKTtcbiAgICBjb25zdCBDU0JQYXRoID0gc3BsaXRVcmwuam9pbignLycpO1xuICAgIHJldHVybiB7XG4gICAgICAgIENTQlBhdGg6IENTQlBhdGggKyAnOicgKyBhc3NldFR5cGUgKyAnOicgKyBhbGlhc0Fzc2V0LFxuICAgICAgICBhbGlhczogYWxpYXNBc3NldFxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGRlbGV0ZVJlY3Vyc2l2ZWx5KGlucHV0UGF0aCwgaXNSb290ID0gdHJ1ZSwgY2FsbGJhY2spIHtcblxuICAgIGZzLnN0YXQoaW5wdXRQYXRoLCBmdW5jdGlvbiAoZXJyLCBzdGF0cykge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIHN0YXRzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgIGZzLnVubGluayhpbnB1dFBhdGgsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIsIG51bGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICBmcy5yZWFkZGlyKGlucHV0UGF0aCwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgZl9sZW5ndGggPSBmaWxlcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgbGV0IGZfZGVsZXRlX2luZGV4ID0gMDtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGNoZWNrU3RhdHVzID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZl9sZW5ndGggPT09IGZfZGVsZXRlX2luZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZighaXNSb290KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnMucm1kaXIoaW5wdXRQYXRoLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmICghY2hlY2tTdGF0dXMoKSkge1xuICAgICAgICAgICAgICAgICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZW1wUGF0aCA9IHBhdGguam9pbihpbnB1dFBhdGgsIGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlUmVjdXJzaXZlbHkodGVtcFBhdGgsIGZhbHNlLChlcnIsIHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZfZGVsZXRlX2luZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyciwgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGdlbmVyYXRlUGF0aCxcbiAgICBwcm9jZXNzVXJsLFxuICAgIGRlbGV0ZVJlY3Vyc2l2ZWx5XG59O1xuXG4iLCJjb25zdCBSb290Q1NCID0gcmVxdWlyZShcIi4uL2xpYi9Sb290Q1NCXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5cblxubW9kdWxlLmV4cG9ydHMudmFsaWRhdGVQaW4gPSBmdW5jdGlvbiAobG9jYWxGb2xkZXIsIHN3YXJtLCBwaGFzZU5hbWUsIHBpbiwgbm9UcmllcywgLi4uYXJncykge1xuXHRSb290Q1NCLmNyZWF0ZVJvb3RDU0IobG9jYWxGb2xkZXIsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBwaW4sIChlcnIsIHJvb3RDU0IsIGNzYklkZW50aWZpZXIsIGJhY2t1cHMpID0+e1xuXHRcdGlmKGVycil7XG5cdFx0XHRzd2FybS5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFBpblwiLCBub1RyaWVzIC0gMSk7XG5cdFx0fWVsc2V7XG5cdFx0XHRpZihjc2JJZGVudGlmaWVyKXtcblx0XHRcdFx0c3dhcm0ucm9vdENTQiA9IHJvb3RDU0I7XG5cdFx0XHRcdHN3YXJtLmNzYklkZW50aWZpZXIgPSBjc2JJZGVudGlmaWVyO1xuXHRcdFx0fVxuXHRcdFx0YXJncy5wdXNoKGJhY2t1cHMpO1xuXHRcdFx0c3dhcm1bcGhhc2VOYW1lXShwaW4sIC4uLmFyZ3MpO1xuXHRcdH1cblx0fSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5yZXBvcnRPckNvbnRpbnVlID0gZnVuY3Rpb24oc3dhcm0sIHBoYXNlTmFtZSwgZXJyb3JNZXNzYWdlLCAuLi5hcmdzKXtcblx0cmV0dXJuIGZ1bmN0aW9uKGVyciwuLi5yZXMpIHtcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHRzd2FybS5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgZXJyLCBlcnJvck1lc3NhZ2UpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAocGhhc2VOYW1lKSB7XG5cdFx0XHRcdFx0c3dhcm1bcGhhc2VOYW1lXSguLi5yZXMsIC4uLmFyZ3MpO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLmNoZWNrTWFzdGVyQ1NCRXhpc3RzID0gZnVuY3Rpb24gKGxvY2FsRm9sZGVyLCBjYWxsYmFjaykge1xuXHRmcy5zdGF0KHBhdGguam9pbihsb2NhbEZvbGRlciwgXCIucHJpdmF0ZVNreS9oYXNoXCIpLCAoZXJyLCBzdGF0cyk9Pntcblx0XHRpZihlcnIpe1xuXHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVyciwgZmFsc2UpO1xuXHRcdH1cblxuXHRcdHJldHVybiBjYWxsYmFjayh1bmRlZmluZWQsIHRydWUpO1xuXHR9KTtcbn07IiwicmVxdWlyZShcInBzay1odHRwLWNsaWVudFwiKTtcbmNvbnN0IGJhciA9IHJlcXVpcmUoXCJiYXJcIik7XG5jb25zdCBCcmljayA9IGJhci5CcmljaztcblxuZnVuY3Rpb24gRURGU0JyaWNrU3RvcmFnZSh1cmwpIHtcblxuICAgIHRoaXMucHV0QnJpY2sgPSBmdW5jdGlvbiAoYnJpY2ssIGNhbGxiYWNrKSB7XG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0KHVybCArIFwiL0VERlMvXCIgKyBicmljay5nZXRIYXNoKCksIGJyaWNrLmdldERhdGEoKSwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEJyaWNrID0gZnVuY3Rpb24gKGJyaWNrSGFzaCwgY2FsbGJhY2spIHtcbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cEdldCh1cmwgKyBcIi9FREZTL1wiICsgYnJpY2tIYXNoLCAoZXJyLCBicmlja0RhdGEpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgbmV3IEJyaWNrKGJyaWNrRGF0YSkpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5kZWxldGVCcmljayA9IGZ1bmN0aW9uIChicmlja0hhc2gsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcbiAgICB9O1xuXG4gICAgdGhpcy5wdXRCYXJNYXAgPSBmdW5jdGlvbiAoYmFyTWFwLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBtYXBCcmljayA9IGJhck1hcC50b0JyaWNrKCk7XG4gICAgICAgIHRoaXMucHV0QnJpY2sobWFwQnJpY2ssIChlcnIpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgbWFwQnJpY2suZ2V0SGFzaCgpKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0QmFyTWFwID0gZnVuY3Rpb24gKG1hcERpZ2VzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtYXBEaWdlc3QgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBtYXBEaWdlc3Q7XG4gICAgICAgICAgICBtYXBEaWdlc3QgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG1hcERpZ2VzdCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHVuZGVmaW5lZCwgbmV3IGJhci5Gb2xkZXJCYXJNYXAoKSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmdldEJyaWNrKG1hcERpZ2VzdCwgKGVyciwgbWFwQnJpY2spID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBuZXcgYmFyLkZvbGRlckJhck1hcChKU09OLnBhcnNlKG1hcEJyaWNrLmdldERhdGEoKS50b1N0cmluZygpKSkpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNyZWF0ZUVERlNCcmlja1N0b3JhZ2UodXJsKSB7XG4gICAgICAgIHJldHVybiBuZXcgRURGU0JyaWNrU3RvcmFnZSh1cmwpO1xuICAgIH1cbn07XG5cbiIsImNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbmNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgUHNrSGFzaCA9IHJlcXVpcmUoJ3Bza2NyeXB0bycpLlBza0hhc2g7XG5cbmNvbnN0IGZvbGRlck5hbWVTaXplID0gcHJvY2Vzcy5lbnYuRk9MREVSX05BTUVfU0laRSB8fCA1O1xuY29uc3QgRklMRV9TRVBBUkFUT1IgPSAnLSc7XG5sZXQgcm9vdGZvbGRlcjtcblxuJCQuZmxvdy5kZXNjcmliZShcIkJyaWNrc01hbmFnZXJcIiwge1xuICAgIGluaXQ6IGZ1bmN0aW9uIChyb290Rm9sZGVyLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIXJvb3RGb2xkZXIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihcIk5vIHJvb3QgZm9sZGVyIHNwZWNpZmllZCFcIikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJvb3RGb2xkZXIgPSBwYXRoLnJlc29sdmUocm9vdEZvbGRlcik7XG4gICAgICAgIHRoaXMuX19lbnN1cmVGb2xkZXJTdHJ1Y3R1cmUocm9vdEZvbGRlciwgZnVuY3Rpb24gKGVyciwgcGF0aCkge1xuICAgICAgICAgICAgcm9vdGZvbGRlciA9IHJvb3RGb2xkZXI7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJvb3RGb2xkZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHdyaXRlOiBmdW5jdGlvbiAoZmlsZU5hbWUsIHJlYWRGaWxlU3RyZWFtLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIXRoaXMuX192ZXJpZnlGaWxlTmFtZShmaWxlTmFtZSwgY2FsbGJhY2spKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXJlYWRGaWxlU3RyZWFtIHx8ICFyZWFkRmlsZVN0cmVhbS5waXBlIHx8IHR5cGVvZiByZWFkRmlsZVN0cmVhbS5waXBlICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihcIlNvbWV0aGluZyB3cm9uZyBoYXBwZW5lZFwiKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmb2xkZXJOYW1lID0gcGF0aC5qb2luKHJvb3Rmb2xkZXIsIGZpbGVOYW1lLnN1YnN0cigwLCBmb2xkZXJOYW1lU2l6ZSkpO1xuXG4gICAgICAgIGNvbnN0IHNlcmlhbCA9IHRoaXMuc2VyaWFsKCgpID0+IHtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2VyaWFsLl9fZW5zdXJlRm9sZGVyU3RydWN0dXJlKGZvbGRlck5hbWUsIHNlcmlhbC5fX3Byb2dyZXNzKTtcbiAgICAgICAgc2VyaWFsLl9fd3JpdGVGaWxlKHJlYWRGaWxlU3RyZWFtLCBmb2xkZXJOYW1lLCBmaWxlTmFtZSwgY2FsbGJhY2spO1xuICAgIH0sXG4gICAgcmVhZDogZnVuY3Rpb24gKGZpbGVOYW1lLCB3cml0ZUZpbGVTdHJlYW0sIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghdGhpcy5fX3ZlcmlmeUZpbGVOYW1lKGZpbGVOYW1lLCBjYWxsYmFjaykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZvbGRlclBhdGggPSBwYXRoLmpvaW4ocm9vdGZvbGRlciwgZmlsZU5hbWUuc3Vic3RyKDAsIGZvbGRlck5hbWVTaXplKSk7XG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGVOYW1lKTtcbiAgICAgICAgdGhpcy5fX3ZlcmlmeUZpbGVFeGlzdGVuY2UoZmlsZVBhdGgsIChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFlcnIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9fcmVhZEZpbGUod3JpdGVGaWxlU3RyZWFtLCBmaWxlUGF0aCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJObyBmaWxlIGZvdW5kLlwiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgYWRkQWxpYXM6IGZ1bmN0aW9uIChmaWxlbmFtZSwgYWxpYXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghdGhpcy5fX3ZlcmlmeUZpbGVOYW1lKGZpbGVOYW1lLCBjYWxsYmFjaykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghYWxpYXMpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJObyBhbGlhcyB3YXMgcHJvdmlkZWRcIikpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLmFsaWFzZXMpIHtcbiAgICAgICAgICAgIHRoaXMuYWxpYXNlcyA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5hbGlhc2VzW2FsaWFzXSA9IGZpbGVuYW1lO1xuXG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfSxcbiAgICB3cml0ZVdpdGhBbGlhczogZnVuY3Rpb24gKGFsaWFzLCByZWFkU3RyZWFtLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHRoaXMuX19nZXRGaWxlTmFtZShhbGlhcywgY2FsbGJhY2spO1xuICAgICAgICB0aGlzLndyaXRlKGZpbGVOYW1lLCByZWFkU3RyZWFtLCBjYWxsYmFjayk7XG4gICAgfSxcbiAgICByZWFkV2l0aEFsaWFzOiBmdW5jdGlvbiAoYWxpYXMsIHdyaXRlU3RyZWFtLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHRoaXMuX19nZXRGaWxlTmFtZShhbGlhcywgY2FsbGJhY2spO1xuICAgICAgICB0aGlzLnJlYWQoZmlsZU5hbWUsIHdyaXRlU3RyZWFtLCBjYWxsYmFjayk7XG4gICAgfSxcbiAgICByZWFkVmVyc2lvbjogZnVuY3Rpb24gKGZpbGVOYW1lLCBmaWxlVmVyc2lvbiwgd3JpdGVGaWxlU3RyZWFtLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIXRoaXMuX192ZXJpZnlGaWxlTmFtZShmaWxlTmFtZSwgY2FsbGJhY2spKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmb2xkZXJQYXRoID0gcGF0aC5qb2luKHJvb3Rmb2xkZXIsIGZpbGVOYW1lLnN1YnN0cigwLCBmb2xkZXJOYW1lU2l6ZSkpO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBmaWxlTmFtZSwgZmlsZVZlcnNpb24pO1xuICAgICAgICB0aGlzLl9fdmVyaWZ5RmlsZUV4aXN0ZW5jZShmaWxlUGF0aCwgKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBpZiAoIWVycikge1xuICAgICAgICAgICAgICAgIHRoaXMuX19yZWFkRmlsZSh3cml0ZUZpbGVTdHJlYW0sIHBhdGguam9pbihmaWxlUGF0aCksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKFwiTm8gZmlsZSBmb3VuZC5cIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGdldFZlcnNpb25zRm9yRmlsZTogZnVuY3Rpb24gKGZpbGVOYW1lLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIXRoaXMuX192ZXJpZnlGaWxlTmFtZShmaWxlTmFtZSwgY2FsbGJhY2spKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmb2xkZXJQYXRoID0gcGF0aC5qb2luKHJvb3Rmb2xkZXIsIGZpbGVOYW1lLnN1YnN0cigwLCBmb2xkZXJOYW1lU2l6ZSksIGZpbGVOYW1lKTtcbiAgICAgICAgZnMucmVhZGRpcihmb2xkZXJQYXRoLCAoZXJyLCBmaWxlcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB0b3RhbE51bWJlck9mRmlsZXMgPSBmaWxlcy5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCBmaWxlc0RhdGEgPSBbXTtcblxuICAgICAgICAgICAgbGV0IHJlc29sdmVkRmlsZXMgPSAwO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRvdGFsTnVtYmVyT2ZGaWxlczsgKytpKSB7XG4gICAgICAgICAgICAgICAgZnMuc3RhdChwYXRoLmpvaW4oZm9sZGVyUGF0aCwgZmlsZXNbaV0pLCAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlc0RhdGEucHVzaCh7dmVyc2lvbjogZmlsZXNbaV0sIGNyZWF0aW9uVGltZTogbnVsbCwgY3JlYXRpb25UaW1lTXM6IG51bGx9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGZpbGVzRGF0YS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb246IGZpbGVzW2ldLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRpb25UaW1lOiBzdGF0cy5iaXJ0aHRpbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGlvblRpbWVNczogc3RhdHMuYmlydGh0aW1lTXNcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZWRGaWxlcyArPSAxO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNvbHZlZEZpbGVzID49IHRvdGFsTnVtYmVyT2ZGaWxlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXNEYXRhLnNvcnQoKGZpcnN0LCBzZWNvbmQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaXJzdENvbXBhcmVEYXRhID0gZmlyc3QuY3JlYXRpb25UaW1lTXMgfHwgZmlyc3QudmVyc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWNvbmRDb21wYXJlRGF0YSA9IHNlY29uZC5jcmVhdGlvblRpbWVNcyB8fCBzZWNvbmQudmVyc2lvbjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmaXJzdENvbXBhcmVEYXRhIC0gc2Vjb25kQ29tcGFyZURhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgZmlsZXNEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGNvbXBhcmVWZXJzaW9uczogZnVuY3Rpb24gKGJvZHlTdHJlYW0sIGNhbGxiYWNrKSB7XG4gICAgICAgIGxldCBib2R5ID0gJyc7XG5cbiAgICAgICAgYm9keVN0cmVhbS5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICBib2R5ICs9IGRhdGE7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGJvZHlTdHJlYW0ub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYm9keSA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fX2NvbXBhcmVWZXJzaW9ucyhib2R5LCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgX192ZXJpZnlGaWxlTmFtZTogZnVuY3Rpb24gKGZpbGVOYW1lLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIWZpbGVOYW1lIHx8IHR5cGVvZiBmaWxlTmFtZSAhPSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJObyBmaWxlSWQgc3BlY2lmaWVkLlwiKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZmlsZU5hbWUubGVuZ3RoIDwgZm9sZGVyTmFtZVNpemUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihcIkZpbGVJZCB0b28gc21hbGwuIFwiICsgZmlsZU5hbWUpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgX19lbnN1cmVGb2xkZXJTdHJ1Y3R1cmU6IGZ1bmN0aW9uIChmb2xkZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIGZzLm1rZGlyKGZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIGNhbGxiYWNrKTtcbiAgICB9LFxuICAgIF9fd3JpdGVGaWxlOiBmdW5jdGlvbiAocmVhZFN0cmVhbSwgZm9sZGVyUGF0aCwgZmlsZU5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGhhc2ggPSByZXF1aXJlKFwiY3J5cHRvXCIpLmNyZWF0ZUhhc2goXCJzaGEyNTZcIik7XG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGVOYW1lKTtcbiAgICAgICAgZnMuYWNjZXNzKGZpbGVQYXRoLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVhZFN0cmVhbS5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGhhc2gudXBkYXRlKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgd3JpdGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlUGF0aCwge21vZGU6IDBvNDQ0fSk7XG5cbiAgICAgICAgICAgICAgICB3cml0ZVN0cmVhbS5vbihcImZpbmlzaFwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhc2hEaWdlc3QgPSBoYXNoLmRpZ2VzdChcImhleFwiKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc2hEaWdlc3QgIT09IGZpbGVOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcy51bmxpbmsoZmlsZVBhdGgsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJDb250ZW50IGhhc2ggYW5kIGZpbGVuYW1lIGFyZSBub3QgdGhlIHNhbWVcIikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB3cml0ZVN0cmVhbS5vbihcImVycm9yXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVTdHJlYW0uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVhZFN0cmVhbS5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayguLi5hcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmVhZFN0cmVhbS5waXBlKHdyaXRlU3RyZWFtKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcblxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIF9fZ2V0TmV4dFZlcnNpb25GaWxlTmFtZTogZnVuY3Rpb24gKGZvbGRlclBhdGgsIGZpbGVOYW1lLCBjYWxsYmFjaykge1xuICAgICAgICB0aGlzLl9fZ2V0TGF0ZXN0VmVyc2lvbk5hbWVPZkZpbGUoZm9sZGVyUGF0aCwgKGVyciwgZmlsZVZlcnNpb24pID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgZmlsZVZlcnNpb24ubnVtZXJpY1ZlcnNpb24gKyAxKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgICxcbiAgICBfX2dldExhdGVzdFZlcnNpb25OYW1lT2ZGaWxlOiBmdW5jdGlvbiAoZm9sZGVyUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgZnMucmVhZGRpcihmb2xkZXJQYXRoLCAoZXJyLCBmaWxlcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGZpbGVWZXJzaW9uID0ge251bWVyaWNWZXJzaW9uOiAwLCBmdWxsVmVyc2lvbjogJzAnICsgRklMRV9TRVBBUkFUT1J9O1xuXG4gICAgICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFsbFZlcnNpb25zID0gZmlsZXMubWFwKGZpbGUgPT4gZmlsZS5zcGxpdChGSUxFX1NFUEFSQVRPUilbMF0pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsYXRlc3RGaWxlID0gdGhpcy5fX21heEVsZW1lbnQoYWxsVmVyc2lvbnMpO1xuICAgICAgICAgICAgICAgICAgICBmaWxlVmVyc2lvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG51bWVyaWNWZXJzaW9uOiBwYXJzZUludChsYXRlc3RGaWxlKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bGxWZXJzaW9uOiBmaWxlcy5maWx0ZXIoZmlsZSA9PiBmaWxlLnNwbGl0KEZJTEVfU0VQQVJBVE9SKVswXSA9PT0gbGF0ZXN0RmlsZS50b1N0cmluZygpKVswXVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBlLmNvZGUgPSAnaW52YWxpZF9maWxlX25hbWVfZm91bmQnO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgZmlsZVZlcnNpb24pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLFxuICAgIF9fbWF4RWxlbWVudDogZnVuY3Rpb24gKG51bWJlcnMpIHtcbiAgICAgICAgbGV0IG1heCA9IG51bWJlcnNbMF07XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBudW1iZXJzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBtYXggPSBNYXRoLm1heChtYXgsIG51bWJlcnNbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzTmFOKG1heCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBlbGVtZW50IGZvdW5kJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbWF4O1xuICAgIH1cbiAgICAsXG4gICAgX19jb21wYXJlVmVyc2lvbnM6IGZ1bmN0aW9uIChmaWxlcywgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgZmlsZXNXaXRoQ2hhbmdlcyA9IFtdO1xuICAgICAgICBjb25zdCBlbnRyaWVzID0gT2JqZWN0LmVudHJpZXMoZmlsZXMpO1xuICAgICAgICBsZXQgcmVtYWluaW5nID0gZW50cmllcy5sZW5ndGg7XG5cbiAgICAgICAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGZpbGVzV2l0aENoYW5nZXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZW50cmllcy5mb3JFYWNoKChbZmlsZU5hbWUsIGZpbGVIYXNoXSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5nZXRWZXJzaW9uc0ZvckZpbGUoZmlsZU5hbWUsIChlcnIsIHZlcnNpb25zKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9ucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSB2ZXJzaW9ucy5zb21lKHZlcnNpb24gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBoYXNoID0gdmVyc2lvbi52ZXJzaW9uLnNwbGl0KEZJTEVfU0VQQVJBVE9SKVsxXTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhc2ggPT09IGZpbGVIYXNoO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFtYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICBmaWxlc1dpdGhDaGFuZ2VzLnB1c2goZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICgtLXJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGZpbGVzV2l0aENoYW5nZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAsXG4gICAgX19yZWFkRmlsZTogZnVuY3Rpb24gKHdyaXRlRmlsZVN0cmVhbSwgZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHJlYWRTdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKGZpbGVQYXRoKTtcblxuICAgICAgICB3cml0ZUZpbGVTdHJlYW0ub24oXCJmaW5pc2hcIiwgY2FsbGJhY2spO1xuICAgICAgICB3cml0ZUZpbGVTdHJlYW0ub24oXCJlcnJvclwiLCBjYWxsYmFjayk7XG5cbiAgICAgICAgcmVhZFN0cmVhbS5waXBlKHdyaXRlRmlsZVN0cmVhbSk7XG4gICAgfVxuICAgICxcbiAgICBfX3Byb2dyZXNzOiBmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICB9XG4gICAgfVxuICAgICxcbiAgICBfX3ZlcmlmeUZpbGVFeGlzdGVuY2U6IGZ1bmN0aW9uIChmaWxlUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgZnMuYWNjZXNzKGZpbGVQYXRoLCBjYWxsYmFjayk7XG4gICAgfVxuICAgICxcbiAgICBfX2dldEZpbGVOYW1lOiBmdW5jdGlvbiAoYWxpYXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghdGhpcy5hbGlhc2VzKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiTm8gZmlsZXMgaGF2ZSBiZWVuIGFzc29jaWF0ZWQgd2l0aCBhbGlhc2VzXCIpKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHRoaXMuYWxpYXNlc1thbGlhc107XG4gICAgICAgIGlmICghZmlsZU5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJUaGUgc3BlY2lmaWVkIGFsaWFzIHdhcyBub3QgYXNzb2NpYXRlZCB3aXRoIGFueSBmaWxlXCIpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmaWxlTmFtZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAsXG59KTtcbiIsInJlcXVpcmUoXCIuLi9mbG93cy9Ccmlja3NNYW5hZ2VyXCIpO1xuXG5mdW5jdGlvbiBFREZTTWlkZGxld2FyZShzZXJ2ZXIpIHtcblxuICAgIHNlcnZlci5wb3N0KCcvOmZpbGVJZCcsIChyZXEsIHJlcykgPT4ge1xuICAgICAgICAkJC5mbG93LnN0YXJ0KFwiQnJpY2tzTWFuYWdlclwiKS53cml0ZShyZXEucGFyYW1zLmZpbGVJZCwgcmVxLCAoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAxO1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVyci5jb2RlID09PSAnRUFDQ0VTJykge1xuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwOTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICBzZXJ2ZXIuZ2V0KCcvOmZpbGVJZCcsIChyZXEsIHJlcykgPT4ge1xuICAgICAgICByZXMuc2V0SGVhZGVyKFwiY29udGVudC10eXBlXCIsIFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCIpO1xuICAgICAgICAkJC5mbG93LnN0YXJ0KFwiQnJpY2tzTWFuYWdlclwiKS5yZWFkKHJlcS5wYXJhbXMuZmlsZUlkLCByZXMsIChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSAyMDA7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBzZXJ2ZXIucG9zdCgnL2FkZEFsaWFzLzpmaWxlSWQnLCAocmVxLCByZXMpID0+IHtcbiAgICAgICAgJCQuZmxvdy5zdGFydChcIkJyaWNrc01hbmFnZXJcIikuYWRkQWxpYXMocmVxLnBhcmFtcy5maWxlSWQsIHJlcSwgIChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSAyMDE7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XG5cbiAgICAgICAgICAgICAgICBpZiAoZXJyLmNvZGUgPT09ICdFQUNDRVMnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxuICAgIHNlcnZlci5wb3N0KCcvYWxpYXMvOmFsaWFzJywgKHJlcSwgcmVzKSA9PiB7XG4gICAgICAgICQkLmZsb3cuc3RhcnQoXCJCcmlja3NNYW5hZ2VyXCIpLndyaXRlV2l0aEFsaWFzKHJlcS5wYXJhbXMuYWxpYXMsIHJlcSwgIChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSAyMDE7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XG5cbiAgICAgICAgICAgICAgICBpZiAoZXJyLmNvZGUgPT09ICdFQUNDRVMnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBzZXJ2ZXIuZ2V0KCcvYWxpYXMvOmFsaWFzJywgKHJlcSwgcmVzKSA9PiB7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoXCJjb250ZW50LXR5cGVcIiwgXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIik7XG4gICAgICAgICQkLmZsb3cuc3RhcnQoXCJCcmlja3NNYW5hZ2VyXCIpLnJlYWRXaXRoQWxpYXMocmVxLnBhcmFtcy5hbGlhcywgcmVzLCAoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwO1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVERlNNaWRkbGV3YXJlOyIsIlxuZnVuY3Rpb24gQXN5bmNEaXNwYXRjaGVyKGZpbmFsQ2FsbGJhY2spIHtcblx0bGV0IHJlc3VsdHMgPSBbXTtcblx0bGV0IGVycm9ycyA9IFtdO1xuXG5cdGxldCBzdGFydGVkID0gMDtcblxuXHRmdW5jdGlvbiBtYXJrT25lQXNGaW5pc2hlZChlcnIsIHJlcykge1xuXHRcdGlmKGVycikge1xuXHRcdFx0ZXJyb3JzLnB1c2goZXJyKTtcblx0XHR9XG5cblx0XHRpZihhcmd1bWVudHMubGVuZ3RoID4gMikge1xuXHRcdFx0YXJndW1lbnRzWzBdID0gdW5kZWZpbmVkO1xuXHRcdFx0cmVzID0gYXJndW1lbnRzO1xuXHRcdH1cblxuXHRcdGlmKHR5cGVvZiByZXMgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0XHRcdHJlc3VsdHMucHVzaChyZXMpO1xuXHRcdH1cblxuXHRcdGlmKC0tc3RhcnRlZCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbENhbGxiYWNrKCk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gZGlzcGF0Y2hFbXB0eShhbW91bnQgPSAxKSB7XG5cdFx0c3RhcnRlZCArPSBhbW91bnQ7XG5cdH1cblxuXHRmdW5jdGlvbiBjYWxsQ2FsbGJhY2soKSB7XG5cdCAgICBpZihlcnJvcnMubGVuZ3RoID09PSAwKSB7XG5cdCAgICAgICAgZXJyb3JzID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cblx0ICAgIGlmKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XG5cdCAgICAgICAgcmVzdWx0cyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZpbmFsQ2FsbGJhY2soZXJyb3JzLCByZXN1bHRzKTtcbiAgICB9XG5cblx0cmV0dXJuIHtcblx0XHRkaXNwYXRjaEVtcHR5LFxuXHRcdG1hcmtPbmVBc0ZpbmlzaGVkXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQXN5bmNEaXNwYXRjaGVyOyIsImNvbnN0IHV0aWxzID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIik7XG5jb25zdCBPd00gPSB1dGlscy5Pd007XG52YXIgYmVlc0hlYWxlciA9IHV0aWxzLmJlZXNIZWFsZXI7XG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG52YXIgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuXG5cbi8vVE9ETzogcHJldmVudCBhIGNsYXNzIG9mIHJhY2UgY29uZGl0aW9uIHR5cGUgb2YgZXJyb3JzIGJ5IHNpZ25hbGluZyB3aXRoIGZpbGVzIG1ldGFkYXRhIHRvIHRoZSB3YXRjaGVyIHdoZW4gaXQgaXMgc2FmZSB0byBjb25zdW1lXG5cbmZ1bmN0aW9uIEZvbGRlck1RKGZvbGRlciwgY2FsbGJhY2sgPSAoKSA9PiB7fSl7XG5cblx0aWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdH1cblxuXHRmb2xkZXIgPSBwYXRoLm5vcm1hbGl6ZShmb2xkZXIpO1xuXG5cdGZzLm1rZGlyKGZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIGZ1bmN0aW9uKGVyciwgcmVzKXtcblx0XHRmcy5leGlzdHMoZm9sZGVyLCBmdW5jdGlvbihleGlzdHMpIHtcblx0XHRcdGlmIChleGlzdHMpIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIGZvbGRlcik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cblx0ZnVuY3Rpb24gbWtGaWxlTmFtZShzd2FybVJhdyl7XG5cdFx0bGV0IG1ldGEgPSBPd00ucHJvdG90eXBlLmdldE1ldGFGcm9tKHN3YXJtUmF3KTtcblx0XHRsZXQgbmFtZSA9IGAke2ZvbGRlcn0ke3BhdGguc2VwfSR7bWV0YS5zd2FybUlkfS4ke21ldGEuc3dhcm1UeXBlTmFtZX1gO1xuXHRcdGNvbnN0IHVuaXF1ZSA9IG1ldGEucGhhc2VJZCB8fCAkJC51aWRHZW5lcmF0b3Iuc2FmZV91dWlkKCk7XG5cblx0XHRuYW1lID0gbmFtZStgLiR7dW5pcXVlfWA7XG5cdFx0cmV0dXJuIHBhdGgubm9ybWFsaXplKG5hbWUpO1xuXHR9XG5cblx0dGhpcy5nZXRIYW5kbGVyID0gZnVuY3Rpb24oKXtcblx0XHRpZihwcm9kdWNlcil7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IG9uZSBjb25zdW1lciBpcyBhbGxvd2VkIVwiKTtcblx0XHR9XG5cdFx0cHJvZHVjZXIgPSB0cnVlO1xuXHRcdHJldHVybiB7XG5cdFx0XHRzZW5kU3dhcm1TZXJpYWxpemF0aW9uOiBmdW5jdGlvbihzZXJpYWxpemF0aW9uLCBjYWxsYmFjayl7XG5cdFx0XHRcdGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHdyaXRlRmlsZShta0ZpbGVOYW1lKEpTT04ucGFyc2Uoc2VyaWFsaXphdGlvbikpLCBzZXJpYWxpemF0aW9uLCBjYWxsYmFjayk7XG5cdFx0XHR9LFxuXHRcdFx0YWRkU3RyZWFtIDogZnVuY3Rpb24oc3RyZWFtLCBjYWxsYmFjayl7XG5cdFx0XHRcdGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYoIXN0cmVhbSB8fCAhc3RyZWFtLnBpcGUgfHwgdHlwZW9mIHN0cmVhbS5waXBlICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJTb21ldGhpbmcgd3JvbmcgaGFwcGVuZWRcIikpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0bGV0IHN3YXJtID0gXCJcIjtcblx0XHRcdFx0c3RyZWFtLm9uKCdkYXRhJywgKGNodW5rKSA9Pntcblx0XHRcdFx0XHRzd2FybSArPSBjaHVuaztcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0c3RyZWFtLm9uKFwiZW5kXCIsICgpID0+IHtcblx0XHRcdFx0XHR3cml0ZUZpbGUobWtGaWxlTmFtZShKU09OLnBhcnNlKHN3YXJtKSksIHN3YXJtLCBjYWxsYmFjayk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHN0cmVhbS5vbihcImVycm9yXCIsIChlcnIpID0+e1xuXHRcdFx0XHRcdGNhbGxiYWNrKGVycik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdGFkZFN3YXJtIDogZnVuY3Rpb24oc3dhcm0sIGNhbGxiYWNrKXtcblx0XHRcdFx0aWYoIWNhbGxiYWNrKXtcblx0XHRcdFx0XHRjYWxsYmFjayA9ICQkLmRlZmF1bHRFcnJvckhhbmRsaW5nSW1wbGVtZW50YXRpb247XG5cdFx0XHRcdH1lbHNlIGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YmVlc0hlYWxlci5hc0pTT04oc3dhcm0sbnVsbCwgbnVsbCwgZnVuY3Rpb24oZXJyLCByZXMpe1xuXHRcdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHdyaXRlRmlsZShta0ZpbGVOYW1lKHJlcyksIEoocmVzKSwgY2FsbGJhY2spO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHRzZW5kU3dhcm1Gb3JFeGVjdXRpb246IGZ1bmN0aW9uKHN3YXJtLCBjYWxsYmFjayl7XG5cdFx0XHRcdGlmKCFjYWxsYmFjayl7XG5cdFx0XHRcdFx0Y2FsbGJhY2sgPSAkJC5kZWZhdWx0RXJyb3JIYW5kbGluZ0ltcGxlbWVudGF0aW9uO1xuXHRcdFx0XHR9ZWxzZSBpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJlZXNIZWFsZXIuYXNKU09OKHN3YXJtLCBPd00ucHJvdG90eXBlLmdldE1ldGFGcm9tKHN3YXJtLCBcInBoYXNlTmFtZVwiKSwgT3dNLnByb3RvdHlwZS5nZXRNZXRhRnJvbShzd2FybSwgXCJhcmdzXCIpLCBmdW5jdGlvbihlcnIsIHJlcyl7XG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coZXJyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dmFyIGZpbGUgPSBta0ZpbGVOYW1lKHJlcyk7XG5cdFx0XHRcdFx0dmFyIGNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShyZXMpO1xuXG5cdFx0XHRcdFx0Ly9pZiB0aGVyZSBhcmUgbm8gbW9yZSBGRCdzIGZvciBmaWxlcyB0byBiZSB3cml0dGVuIHdlIHJldHJ5LlxuXHRcdFx0XHRcdGZ1bmN0aW9uIHdyYXBwZXIoZXJyb3IsIHJlc3VsdCl7XG5cdFx0XHRcdFx0XHRpZihlcnJvcil7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGBDYXVnaHQgYW4gd3JpdGUgZXJyb3IuIFJldHJ5IHRvIHdyaXRlIGZpbGUgWyR7ZmlsZX1dYCk7XG5cdFx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdFx0XHRcdFx0XHR3cml0ZUZpbGUoZmlsZSwgY29udGVudCwgd3JhcHBlcik7XG5cdFx0XHRcdFx0XHRcdH0sIDEwKTtcblx0XHRcdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyb3IsIHJlc3VsdCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0d3JpdGVGaWxlKGZpbGUsIGNvbnRlbnQsIHdyYXBwZXIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9O1xuXHR9O1xuXG5cdHZhciByZWNpcGllbnQ7XG5cdHRoaXMuc2V0SVBDQ2hhbm5lbCA9IGZ1bmN0aW9uKHByb2Nlc3NDaGFubmVsKXtcblx0XHRpZihwcm9jZXNzQ2hhbm5lbCAmJiAhcHJvY2Vzc0NoYW5uZWwuc2VuZCB8fCAodHlwZW9mIHByb2Nlc3NDaGFubmVsLnNlbmQpICE9IFwiZnVuY3Rpb25cIil7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJSZWNpcGllbnQgaXMgbm90IGluc3RhbmNlIG9mIHByb2Nlc3MvY2hpbGRfcHJvY2VzcyBvciBpdCB3YXMgbm90IHNwYXduZWQgd2l0aCBJUEMgY2hhbm5lbCFcIik7XG5cdFx0fVxuXHRcdHJlY2lwaWVudCA9IHByb2Nlc3NDaGFubmVsO1xuXHRcdGlmKGNvbnN1bWVyKXtcblx0XHRcdGNvbnNvbGUubG9nKGBDaGFubmVsIHVwZGF0ZWRgKTtcblx0XHRcdChyZWNpcGllbnQgfHwgcHJvY2Vzcykub24oXCJtZXNzYWdlXCIsIHJlY2VpdmVFbnZlbG9wZSk7XG5cdFx0fVxuXHR9O1xuXG5cblx0dmFyIGNvbnN1bWVkTWVzc2FnZXMgPSB7fTtcblxuXHRmdW5jdGlvbiBjaGVja0lmQ29uc3VtbWVkKG5hbWUsIG1lc3NhZ2Upe1xuXHRcdGNvbnN0IHNob3J0TmFtZSA9IHBhdGguYmFzZW5hbWUobmFtZSk7XG5cdFx0Y29uc3QgcHJldmlvdXNTYXZlZCA9IGNvbnN1bWVkTWVzc2FnZXNbc2hvcnROYW1lXTtcblx0XHRsZXQgcmVzdWx0ID0gZmFsc2U7XG5cdFx0aWYocHJldmlvdXNTYXZlZCAmJiAhcHJldmlvdXNTYXZlZC5sb2NhbGVDb21wYXJlKG1lc3NhZ2UpKXtcblx0XHRcdHJlc3VsdCA9IHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBzYXZlMkhpc3RvcnkoZW52ZWxvcGUpe1xuXHRcdGNvbnN1bWVkTWVzc2FnZXNbcGF0aC5iYXNlbmFtZShlbnZlbG9wZS5uYW1lKV0gPSBlbnZlbG9wZS5tZXNzYWdlO1xuXHR9XG5cblx0ZnVuY3Rpb24gYnVpbGRFbnZlbG9wZUNvbmZpcm1hdGlvbihlbnZlbG9wZSwgc2F2ZUhpc3Rvcnkpe1xuXHRcdGlmKHNhdmVIaXN0b3J5KXtcblx0XHRcdHNhdmUySGlzdG9yeShlbnZlbG9wZSk7XG5cdFx0fVxuXHRcdHJldHVybiBgQ29uZmlybSBlbnZlbG9wZSAke2VudmVsb3BlLnRpbWVzdGFtcH0gc2VudCB0byAke2VudmVsb3BlLmRlc3R9YDtcblx0fVxuXG5cdGZ1bmN0aW9uIGJ1aWxkRW52ZWxvcGUobmFtZSwgbWVzc2FnZSl7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGRlc3Q6IGZvbGRlcixcblx0XHRcdHNyYzogcHJvY2Vzcy5waWQsXG5cdFx0XHR0aW1lc3RhbXA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZSxcblx0XHRcdG5hbWU6IG5hbWVcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gcmVjZWl2ZUVudmVsb3BlKGVudmVsb3BlKXtcblx0XHRpZighZW52ZWxvcGUgfHwgdHlwZW9mIGVudmVsb3BlICE9PSBcIm9iamVjdFwiKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Ly9jb25zb2xlLmxvZyhcInJlY2VpdmVkIGVudmVsb3BlXCIsIGVudmVsb3BlLCBmb2xkZXIpO1xuXG5cdFx0aWYoZW52ZWxvcGUuZGVzdCAhPT0gZm9sZGVyICYmIGZvbGRlci5pbmRleE9mKGVudmVsb3BlLmRlc3QpIT09IC0xICYmIGZvbGRlci5sZW5ndGggPT09IGVudmVsb3BlLmRlc3QrMSl7XG5cdFx0XHRjb25zb2xlLmxvZyhcIlRoaXMgZW52ZWxvcGUgaXMgbm90IGZvciBtZSFcIik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0bGV0IG1lc3NhZ2UgPSBlbnZlbG9wZS5tZXNzYWdlO1xuXG5cdFx0aWYoY2FsbGJhY2spe1xuXHRcdFx0Ly9jb25zb2xlLmxvZyhcIlNlbmRpbmcgY29uZmlybWF0aW9uXCIsIHByb2Nlc3MucGlkKTtcblx0XHRcdHJlY2lwaWVudC5zZW5kKGJ1aWxkRW52ZWxvcGVDb25maXJtYXRpb24oZW52ZWxvcGUsIHRydWUpKTtcblx0XHRcdGNvbnN1bWVyKG51bGwsIEpTT04ucGFyc2UobWVzc2FnZSkpO1xuXHRcdH1cblx0fVxuXG5cdHRoaXMucmVnaXN0ZXJBc0lQQ0NvbnN1bWVyID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuXHRcdGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlRoZSBhcmd1bWVudCBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHR9XG5cdFx0cmVnaXN0ZXJlZEFzSVBDQ29uc3VtZXIgPSB0cnVlO1xuXHRcdC8vd2lsbCByZWdpc3RlciBhcyBub3JtYWwgY29uc3VtZXIgaW4gb3JkZXIgdG8gY29uc3VtZSBhbGwgZXhpc3RpbmcgbWVzc2FnZXMgYnV0IHdpdGhvdXQgc2V0dGluZyB0aGUgd2F0Y2hlclxuXHRcdHRoaXMucmVnaXN0ZXJDb25zdW1lcihjYWxsYmFjaywgdHJ1ZSwgKHdhdGNoZXIpID0+ICF3YXRjaGVyKTtcblxuXHRcdC8vY29uc29sZS5sb2coXCJSZWdpc3RlcmVkIGFzIElQQyBDb25zdW1tZXJcIiwgKTtcblx0XHQocmVjaXBpZW50IHx8IHByb2Nlc3MpLm9uKFwibWVzc2FnZVwiLCByZWNlaXZlRW52ZWxvcGUpO1xuXHR9O1xuXG5cdHRoaXMucmVnaXN0ZXJDb25zdW1lciA9IGZ1bmN0aW9uIChjYWxsYmFjaywgc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkID0gdHJ1ZSwgc2hvdWxkV2FpdEZvck1vcmUgPSAod2F0Y2hlcikgPT4gdHJ1ZSkge1xuXHRcdGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkZpcnN0IHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHR9XG5cdFx0aWYgKGNvbnN1bWVyKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IG9uZSBjb25zdW1lciBpcyBhbGxvd2VkISBcIiArIGZvbGRlcik7XG5cdFx0fVxuXG5cdFx0Y29uc3VtZXIgPSBjYWxsYmFjaztcblxuXHRcdGZzLm1rZGlyKGZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIGZ1bmN0aW9uIChlcnIsIHJlcykge1xuXHRcdFx0aWYgKGVyciAmJiAoZXJyLmNvZGUgIT09ICdFRVhJU1QnKSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3VtZUFsbEV4aXN0aW5nKHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgc2hvdWxkV2FpdEZvck1vcmUpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHRoaXMud3JpdGVNZXNzYWdlID0gd3JpdGVGaWxlO1xuXG5cdHRoaXMudW5saW5rQ29udGVudCA9IGZ1bmN0aW9uIChtZXNzYWdlSWQsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgbWVzc2FnZVBhdGggPSBwYXRoLmpvaW4oZm9sZGVyLCBtZXNzYWdlSWQpO1xuXG5cdFx0ZnMudW5saW5rKG1lc3NhZ2VQYXRoLCAoZXJyKSA9PiB7XG5cdFx0XHRjYWxsYmFjayhlcnIpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHRoaXMuZGlzcG9zZSA9IGZ1bmN0aW9uKGZvcmNlKXtcblx0XHRpZih0eXBlb2YgZm9sZGVyICE9IFwidW5kZWZpbmVkXCIpe1xuXHRcdFx0dmFyIGZpbGVzO1xuXHRcdFx0dHJ5e1xuXHRcdFx0XHRmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKGZvbGRlcik7XG5cdFx0XHR9Y2F0Y2goZXJyb3Ipe1xuXHRcdFx0XHQvLy4uXG5cdFx0XHR9XG5cblx0XHRcdGlmKGZpbGVzICYmIGZpbGVzLmxlbmd0aCA+IDAgJiYgIWZvcmNlKXtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJEaXNwb3NpbmcgYSBjaGFubmVsIHRoYXQgc3RpbGwgaGFzIG1lc3NhZ2VzISBEaXIgd2lsbCBub3QgYmUgcmVtb3ZlZCFcIik7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHR0cnl7XG5cdFx0XHRcdFx0ZnMucm1kaXJTeW5jKGZvbGRlcik7XG5cdFx0XHRcdH1jYXRjaChlcnIpe1xuXHRcdFx0XHRcdC8vLi5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRmb2xkZXIgPSBudWxsO1xuXHRcdH1cblxuXHRcdGlmKHByb2R1Y2VyKXtcblx0XHRcdC8vbm8gbmVlZCB0byBkbyBhbnl0aGluZyBlbHNlXG5cdFx0fVxuXG5cdFx0aWYodHlwZW9mIGNvbnN1bWVyICE9IFwidW5kZWZpbmVkXCIpe1xuXHRcdFx0Y29uc3VtZXIgPSAoKSA9PiB7fTtcblx0XHR9XG5cblx0XHRpZih3YXRjaGVyKXtcblx0XHRcdHdhdGNoZXIuY2xvc2UoKTtcblx0XHRcdHdhdGNoZXIgPSBudWxsO1xuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xuXG5cblx0LyogLS0tLS0tLS0tLS0tLS0tLSBwcm90ZWN0ZWQgIGZ1bmN0aW9ucyAqL1xuXHR2YXIgY29uc3VtZXIgPSBudWxsO1xuXHR2YXIgcmVnaXN0ZXJlZEFzSVBDQ29uc3VtZXIgPSBmYWxzZTtcblx0dmFyIHByb2R1Y2VyID0gbnVsbDtcblxuXHRmdW5jdGlvbiBidWlsZFBhdGhGb3JGaWxlKGZpbGVuYW1lKXtcblx0XHRyZXR1cm4gcGF0aC5ub3JtYWxpemUocGF0aC5qb2luKGZvbGRlciwgZmlsZW5hbWUpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNvbnN1bWVNZXNzYWdlKGZpbGVuYW1lLCBzaG91bGREZWxldGVBZnRlclJlYWQsIGNhbGxiYWNrKSB7XG5cdFx0dmFyIGZ1bGxQYXRoID0gYnVpbGRQYXRoRm9yRmlsZShmaWxlbmFtZSk7XG5cblx0XHRmcy5yZWFkRmlsZShmdWxsUGF0aCwgXCJ1dGY4XCIsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcblx0XHRcdGlmICghZXJyKSB7XG5cdFx0XHRcdGlmIChkYXRhICE9PSBcIlwiKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdHZhciBtZXNzYWdlID0gSlNPTi5wYXJzZShkYXRhKTtcblx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJQYXJzaW5nIGVycm9yXCIsIGVycm9yKTtcblx0XHRcdFx0XHRcdGVyciA9IGVycm9yO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmKGNoZWNrSWZDb25zdW1tZWQoZnVsbFBhdGgsIGRhdGEpKXtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coYG1lc3NhZ2UgYWxyZWFkeSBjb25zdW1lZCBbJHtmaWxlbmFtZX1dYCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChzaG91bGREZWxldGVBZnRlclJlYWQpIHtcblxuXHRcdFx0XHRcdFx0ZnMudW5saW5rKGZ1bGxQYXRoLCBmdW5jdGlvbiAoZXJyLCByZXMpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGVycikge3Rocm93IGVycjt9O1xuXHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVyciwgbWVzc2FnZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiQ29uc3VtZSBlcnJvclwiLCBlcnIpO1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNvbnN1bWVBbGxFeGlzdGluZyhzaG91bGREZWxldGVBZnRlclJlYWQsIHNob3VsZFdhaXRGb3JNb3JlKSB7XG5cblx0XHRsZXQgY3VycmVudEZpbGVzID0gW107XG5cblx0XHRmcy5yZWFkZGlyKGZvbGRlciwgJ3V0ZjgnLCBmdW5jdGlvbiAoZXJyLCBmaWxlcykge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHQkJC5lcnJvckhhbmRsZXIuZXJyb3IoZXJyKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y3VycmVudEZpbGVzID0gZmlsZXM7XG5cdFx0XHRpdGVyYXRlQW5kQ29uc3VtZShmaWxlcyk7XG5cblx0XHR9KTtcblxuXHRcdGZ1bmN0aW9uIHN0YXJ0V2F0Y2hpbmcoKXtcblx0XHRcdGlmIChzaG91bGRXYWl0Rm9yTW9yZSh0cnVlKSkge1xuXHRcdFx0XHR3YXRjaEZvbGRlcihzaG91bGREZWxldGVBZnRlclJlYWQsIHNob3VsZFdhaXRGb3JNb3JlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpdGVyYXRlQW5kQ29uc3VtZShmaWxlcywgY3VycmVudEluZGV4ID0gMCkge1xuXHRcdFx0aWYgKGN1cnJlbnRJbmRleCA9PT0gZmlsZXMubGVuZ3RoKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coXCJzdGFydCB3YXRjaGluZ1wiLCBuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XG5cdFx0XHRcdHN0YXJ0V2F0Y2hpbmcoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocGF0aC5leHRuYW1lKGZpbGVzW2N1cnJlbnRJbmRleF0pICE9PSBpbl9wcm9ncmVzcykge1xuXHRcdFx0XHRjb25zdW1lTWVzc2FnZShmaWxlc1tjdXJyZW50SW5kZXhdLCBzaG91bGREZWxldGVBZnRlclJlYWQsIChlcnIsIGRhdGEpID0+IHtcblx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHRpdGVyYXRlQW5kQ29uc3VtZShmaWxlcywgKytjdXJyZW50SW5kZXgpO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjb25zdW1lcihudWxsLCBkYXRhLCBwYXRoLmJhc2VuYW1lKGZpbGVzW2N1cnJlbnRJbmRleF0pKTtcblx0XHRcdFx0XHRpZiAoc2hvdWxkV2FpdEZvck1vcmUoKSkge1xuXHRcdFx0XHRcdFx0aXRlcmF0ZUFuZENvbnN1bWUoZmlsZXMsICsrY3VycmVudEluZGV4KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aXRlcmF0ZUFuZENvbnN1bWUoZmlsZXMsICsrY3VycmVudEluZGV4KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiB3cml0ZUZpbGUoZmlsZW5hbWUsIGNvbnRlbnQsIGNhbGxiYWNrKXtcblx0XHRpZihyZWNpcGllbnQpe1xuXHRcdFx0dmFyIGVudmVsb3BlID0gYnVpbGRFbnZlbG9wZShmaWxlbmFtZSwgY29udGVudCk7XG5cdFx0XHQvL2NvbnNvbGUubG9nKFwiU2VuZGluZyB0b1wiLCByZWNpcGllbnQucGlkLCByZWNpcGllbnQucHBpZCwgXCJlbnZlbG9wZVwiLCBlbnZlbG9wZSk7XG5cdFx0XHRyZWNpcGllbnQuc2VuZChlbnZlbG9wZSk7XG5cdFx0XHR2YXIgY29uZmlybWF0aW9uUmVjZWl2ZWQgPSBmYWxzZTtcblxuXHRcdFx0ZnVuY3Rpb24gcmVjZWl2ZUNvbmZpcm1hdGlvbihtZXNzYWdlKXtcblx0XHRcdFx0aWYobWVzc2FnZSA9PT0gYnVpbGRFbnZlbG9wZUNvbmZpcm1hdGlvbihlbnZlbG9wZSkpe1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coXCJSZWNlaXZlZCBjb25maXJtYXRpb25cIiwgcmVjaXBpZW50LnBpZCk7XG5cdFx0XHRcdFx0Y29uZmlybWF0aW9uUmVjZWl2ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdHRyeXtcblx0XHRcdFx0XHRcdHJlY2lwaWVudC5vZmYoXCJtZXNzYWdlXCIsIHJlY2VpdmVDb25maXJtYXRpb24pO1xuXHRcdFx0XHRcdH1jYXRjaChlcnIpe1xuXHRcdFx0XHRcdFx0Ly8uLi5cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZWNpcGllbnQub24oXCJtZXNzYWdlXCIsIHJlY2VpdmVDb25maXJtYXRpb24pO1xuXG5cdFx0XHRzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHRcdGlmKCFjb25maXJtYXRpb25SZWNlaXZlZCl7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyhcIk5vIGNvbmZpcm1hdGlvbi4uLlwiLCBwcm9jZXNzLnBpZCk7XG5cdFx0XHRcdFx0aGlkZGVuX3dyaXRlRmlsZShmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spO1xuXHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHRpZihjYWxsYmFjayl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgY29udGVudCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LCAyMDApO1xuXHRcdH1lbHNle1xuXHRcdFx0aGlkZGVuX3dyaXRlRmlsZShmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spO1xuXHRcdH1cblx0fVxuXG5cdGNvbnN0IGluX3Byb2dyZXNzID0gXCIuaW5fcHJvZ3Jlc3NcIjtcblx0ZnVuY3Rpb24gaGlkZGVuX3dyaXRlRmlsZShmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spe1xuXHRcdHZhciB0bXBGaWxlbmFtZSA9IGZpbGVuYW1lK2luX3Byb2dyZXNzO1xuXHRcdHRyeXtcblx0XHRcdGlmKGZzLmV4aXN0c1N5bmModG1wRmlsZW5hbWUpIHx8IGZzLmV4aXN0c1N5bmMoZmlsZW5hbWUpKXtcblx0XHRcdFx0Y29uc29sZS5sb2cobmV3IEVycm9yKGBPdmVyd3JpdGluZyBmaWxlICR7ZmlsZW5hbWV9YCkpO1xuXHRcdFx0fVxuXHRcdFx0ZnMud3JpdGVGaWxlU3luYyh0bXBGaWxlbmFtZSwgY29udGVudCk7XG5cdFx0XHRmcy5yZW5hbWVTeW5jKHRtcEZpbGVuYW1lLCBmaWxlbmFtZSk7XG5cdFx0fWNhdGNoKGVycil7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHR9XG5cdFx0Y2FsbGJhY2sobnVsbCwgY29udGVudCk7XG5cdH1cblxuXHR2YXIgYWxyZWFkeUtub3duQ2hhbmdlcyA9IHt9O1xuXG5cdGZ1bmN0aW9uIGFscmVhZHlGaXJlZENoYW5nZXMoZmlsZW5hbWUsIGNoYW5nZSl7XG5cdFx0dmFyIHJlcyA9IGZhbHNlO1xuXHRcdGlmKGFscmVhZHlLbm93bkNoYW5nZXNbZmlsZW5hbWVdKXtcblx0XHRcdHJlcyA9IHRydWU7XG5cdFx0fWVsc2V7XG5cdFx0XHRhbHJlYWR5S25vd25DaGFuZ2VzW2ZpbGVuYW1lXSA9IGNoYW5nZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzO1xuXHR9XG5cblx0ZnVuY3Rpb24gd2F0Y2hGb2xkZXIoc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCBzaG91bGRXYWl0Rm9yTW9yZSl7XG5cblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRmcy5yZWFkZGlyKGZvbGRlciwgJ3V0ZjgnLCBmdW5jdGlvbiAoZXJyLCBmaWxlcykge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0JCQuZXJyb3JIYW5kbGVyLmVycm9yKGVycik7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yKHZhciBpPTA7IGk8ZmlsZXMubGVuZ3RoOyBpKyspe1xuXHRcdFx0XHRcdHdhdGNoRmlsZXNIYW5kbGVyKFwiY2hhbmdlXCIsIGZpbGVzW2ldKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgMTAwMCk7XG5cblx0XHRmdW5jdGlvbiB3YXRjaEZpbGVzSGFuZGxlcihldmVudFR5cGUsIGZpbGVuYW1lKXtcblx0XHRcdC8vY29uc29sZS5sb2coYEdvdCAke2V2ZW50VHlwZX0gb24gJHtmaWxlbmFtZX1gKTtcblxuXHRcdFx0aWYoIWZpbGVuYW1lIHx8IHBhdGguZXh0bmFtZShmaWxlbmFtZSkgPT09IGluX3Byb2dyZXNzKXtcblx0XHRcdFx0Ly9jYXVnaHQgYSBkZWxldGUgZXZlbnQgb2YgYSBmaWxlXG5cdFx0XHRcdC8vb3Jcblx0XHRcdFx0Ly9maWxlIG5vdCByZWFkeSB0byBiZSBjb25zdW1lZCAoaW4gcHJvZ3Jlc3MpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGYgPSBidWlsZFBhdGhGb3JGaWxlKGZpbGVuYW1lKTtcblx0XHRcdGlmKCFmcy5leGlzdHNTeW5jKGYpKXtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZyhcIkZpbGUgbm90IGZvdW5kXCIsIGYpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vY29uc29sZS5sb2coYFByZXBhcmluZyB0byBjb25zdW1lICR7ZmlsZW5hbWV9YCk7XG5cdFx0XHRpZighYWxyZWFkeUZpcmVkQ2hhbmdlcyhmaWxlbmFtZSwgZXZlbnRUeXBlKSl7XG5cdFx0XHRcdGNvbnN1bWVNZXNzYWdlKGZpbGVuYW1lLCBzaG91bGREZWxldGVBZnRlclJlYWQsIChlcnIsIGRhdGEpID0+IHtcblx0XHRcdFx0XHQvL2FsbG93IGEgcmVhZCBhIHRoZSBmaWxlXG5cdFx0XHRcdFx0YWxyZWFkeUtub3duQ2hhbmdlc1tmaWxlbmFtZV0gPSB1bmRlZmluZWQ7XG5cblx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHQvLyA/P1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJcXG5DYXVnaHQgYW4gZXJyb3JcIiwgZXJyKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb25zdW1lcihudWxsLCBkYXRhLCBmaWxlbmFtZSk7XG5cblxuXHRcdFx0XHRcdGlmICghc2hvdWxkV2FpdEZvck1vcmUoKSkge1xuXHRcdFx0XHRcdFx0d2F0Y2hlci5jbG9zZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJTb21ldGhpbmcgaGFwcGVucy4uLlwiLCBmaWxlbmFtZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0XHRjb25zdCB3YXRjaGVyID0gZnMud2F0Y2goZm9sZGVyLCB3YXRjaEZpbGVzSGFuZGxlcik7XG5cblx0XHRjb25zdCBpbnRlcnZhbFRpbWVyID0gc2V0SW50ZXJ2YWwoKCk9Pntcblx0XHRcdGZzLnJlYWRkaXIoZm9sZGVyLCAndXRmOCcsIGZ1bmN0aW9uIChlcnIsIGZpbGVzKSB7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHQkJC5lcnJvckhhbmRsZXIuZXJyb3IoZXJyKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZihmaWxlcy5sZW5ndGggPiAwKXtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhgXFxuXFxuRm91bmQgJHtmaWxlcy5sZW5ndGh9IGZpbGVzIG5vdCBjb25zdW1lZCB5ZXQgaW4gJHtmb2xkZXJ9YCwgbmV3IERhdGUoKS5nZXRUaW1lKCksXCJcXG5cXG5cIik7XG5cdFx0XHRcdFx0Ly9mYWtpbmcgYSByZW5hbWUgZXZlbnQgdHJpZ2dlclxuXHRcdFx0XHRcdHdhdGNoRmlsZXNIYW5kbGVyKFwicmVuYW1lXCIsIGZpbGVzWzBdKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgNTAwMCk7XG5cdH1cbn1cblxuZXhwb3J0cy5nZXRGb2xkZXJRdWV1ZSA9IGZ1bmN0aW9uKGZvbGRlciwgY2FsbGJhY2spe1xuXHRyZXR1cm4gbmV3IEZvbGRlck1RKGZvbGRlciwgY2FsbGJhY2spO1xufTtcbiIsImZ1bmN0aW9uIE1lbW9yeU1RSW50ZXJhY3Rpb25TcGFjZSgpIHtcbiAgICB2YXIgc3dhcm1JbnRlcmFjdCA9IHJlcXVpcmUoXCIuLy4uL3N3YXJtSW50ZXJhY3Rpb25cIik7XG4gICAgdmFyIHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVycyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gZGlzcGF0Y2hpbmdTd2FybXMoc3dhcm0pe1xuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBzdWJzTGlzdCA9IHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybS5tZXRhLnN3YXJtSWRdO1xuICAgICAgICAgICAgaWYoc3Vic0xpc3Qpe1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpPHN1YnNMaXN0Lmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBzdWJzTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcihudWxsLCBzd2FybSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCAxKTtcbiAgICB9XG5cbiAgICB2YXIgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICBmdW5jdGlvbiBpbml0KCl7XG5cdFx0aWYoIWluaXRpYWxpemVkKXtcblx0XHRcdGluaXRpYWxpemVkID0gdHJ1ZTtcblx0XHRcdCQkLlBTS19QdWJTdWIuc3Vic2NyaWJlKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBkaXNwYXRjaGluZ1N3YXJtcyk7XG5cdFx0fVxuICAgIH1cblxuICAgIHZhciBjb21tID0ge1xuICAgICAgICBzdGFydFN3YXJtOiBmdW5jdGlvbiAoc3dhcm1OYW1lLCBjdG9yLCBhcmdzKSB7XG5cdFx0XHRpbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gJCQuc3dhcm0uc3RhcnQoc3dhcm1OYW1lLCBjdG9yLCAuLi5hcmdzKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29udGludWVTd2FybTogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgc3dhcm1TZXJpYWxpc2F0aW9uLCBjdG9yLCBhcmdzKSB7XG5cdFx0XHRpbml0KCk7XG4gICAgICAgICAgICBzd2FybUhhbmRsZXJbY3Rvcl0uYXBwbHkoc3dhcm1IYW5kbGVyLCBhcmdzKTtcbiAgICAgICAgfSxcbiAgICAgICAgb246IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIGNhbGxiYWNrKSB7XG5cdFx0XHRpbml0KCk7XG4gICAgICAgICAgICBpZighc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXSl7XG5cdFx0XHRcdHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybUhhbmRsZXIuZ2V0SW5uZXJWYWx1ZSgpLm1ldGEuc3dhcm1JZF0gPSBbIGNhbGxiYWNrIF07XG4gICAgICAgICAgICB9ZWxzZXtcblx0XHRcdFx0c3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb2ZmOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyKSB7XG5cdFx0XHRpZihzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm1IYW5kbGVyLmdldElubmVyVmFsdWUoKS5tZXRhLnN3YXJtSWRdKXtcblx0XHRcdFx0c3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBzd2FybUludGVyYWN0Lm5ld0ludGVyYWN0aW9uU3BhY2UoY29tbSk7XG5cbn1cblxudmFyIHNwYWNlO1xubW9kdWxlLmV4cG9ydHMuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZighc3BhY2Upe1xuICAgICAgICBzcGFjZSA9IG5ldyBNZW1vcnlNUUludGVyYWN0aW9uU3BhY2UoKTtcbiAgICB9ZWxzZXtcbiAgICAgICAgY29uc29sZS5sb2coXCJNZW1vcnlNUUludGVyYWN0aW9uU3BhY2UgYWxyZWFkeSBjcmVhdGVkISBVc2luZyBzYW1lIGluc3RhbmNlLlwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHNwYWNlO1xufTsiLCJmdW5jdGlvbiBXaW5kb3dNUUludGVyYWN0aW9uU3BhY2UoY2hhbm5lbE5hbWUsIGNvbW11bmljYXRpb25XaW5kb3csIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsKXtcbiAgICB2YXIgc3dhcm1JbnRlcmFjdCA9IHJlcXVpcmUoXCIuLy4uL3N3YXJtSW50ZXJhY3Rpb25cIik7XG4gICAgdmFyIGNoaWxkTWVzc2FnZU1RID0gcmVxdWlyZShcIi4vc3BlY2lmaWNNUUltcGwvQ2hpbGRXZWJWaWV3TVFcIikuY3JlYXRlTVEoY2hhbm5lbE5hbWUsIGNvbW11bmljYXRpb25XaW5kb3csIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsKTtcbiAgICB2YXIgc3dhcm1JbnN0YW5jZXMgPSB7fTtcblxuICAgIHZhciBjb21tID0ge1xuICAgICAgICBzdGFydFN3YXJtOiBmdW5jdGlvbiAoc3dhcm1OYW1lLCBjdG9yLCBhcmdzKSB7XG4gICAgICAgICAgICB2YXIgc3dhcm0gPSB7bWV0YTp7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtVHlwZU5hbWU6c3dhcm1OYW1lLFxuICAgICAgICAgICAgICAgICAgICBjdG9yOmN0b3IsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6YXJnc1xuICAgICAgICAgICAgICAgIH19O1xuICAgICAgICAgICAgY2hpbGRNZXNzYWdlTVEucHJvZHVjZShzd2FybSk7XG4gICAgICAgICAgICByZXR1cm4gc3dhcm07XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRpbnVlU3dhcm06IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIHN3YXJtU2VyaWFsaXNhdGlvbiwgcGhhc2VOYW1lLCBhcmdzKSB7XG5cbiAgICAgICAgICAgIHZhciBuZXdTZXJpYWxpemF0aW9uID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzd2FybVNlcmlhbGlzYXRpb24pKTtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS5jdG9yID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgbmV3U2VyaWFsaXphdGlvbi5tZXRhLnBoYXNlTmFtZSA9IHBoYXNlTmFtZTtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS50YXJnZXQgPSBcImlmcmFtZVwiO1xuICAgICAgICAgICAgbmV3U2VyaWFsaXphdGlvbi5tZXRhLmFyZ3MgPSBhcmdzO1xuICAgICAgICAgICAgY2hpbGRNZXNzYWdlTVEucHJvZHVjZShuZXdTZXJpYWxpemF0aW9uKTtcbiAgICAgICAgfSxcbiAgICAgICAgb246IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjaGlsZE1lc3NhZ2VNUS5yZWdpc3RlckNvbnN1bWVyKGNhbGxiYWNrKTtcbiAgICAgICAgfSxcbiAgICAgICAgb2ZmOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyKSB7XG5cbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIHZhciBzcGFjZSA9IHN3YXJtSW50ZXJhY3QubmV3SW50ZXJhY3Rpb25TcGFjZShjb21tKTtcbiAgICB0aGlzLnN0YXJ0U3dhcm0gPSBmdW5jdGlvbiAobmFtZSwgY3RvciwgLi4uYXJncykge1xuICAgICAgICByZXR1cm4gc3BhY2Uuc3RhcnRTd2FybShuYW1lLCBjdG9yLCAuLi5hcmdzKTtcbiAgICB9O1xuXG4gICAgdGhpcy5pbml0ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGNoaWxkTWVzc2FnZU1RLnJlZ2lzdGVyQ29uc3VtZXIoZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgc3dhcm07XG4gICAgICAgICAgICAgICAgaWYoZGF0YSAmJiBkYXRhLm1ldGEgJiYgZGF0YS5tZXRhLnN3YXJtSWQgJiYgc3dhcm1JbnN0YW5jZXNbZGF0YS5tZXRhLnN3YXJtSWRdKXtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm0gPSBzd2FybUluc3RhbmNlc1tkYXRhLm1ldGEuc3dhcm1JZF07XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtLnVwZGF0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm1bZGF0YS5tZXRhLnBoYXNlTmFtZV0uYXBwbHkoc3dhcm0sIGRhdGEubWV0YS5hcmdzKTtcbiAgICAgICAgICAgICAgICB9ZWxzZXtcblxuICAgICAgICAgICAgICAgICAgICBzd2FybSA9ICQkLnN3YXJtLnN0YXJ0KGRhdGEubWV0YS5zd2FybVR5cGVOYW1lLCBkYXRhLm1ldGEuY3RvciwgLi4uZGF0YS5tZXRhLmFyZ3MpO1xuXG4gICAgICAgICAgICAgICAgICAgIHN3YXJtSW5zdGFuY2VzW3N3YXJtLmdldElubmVyVmFsdWUoKS5tZXRhLnN3YXJtSWRdID0gc3dhcm07XG5cbiAgICAgICAgICAgICAgICAgICAgc3dhcm0ub25SZXR1cm4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN3YXJtIGlzIGZpbmlzaGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IHJlYWR5RXZ0ID0ge3dlYlZpZXdJc1JlYWR5OiB0cnVlfTtcbiAgICAgICAgcGFyZW50LnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHJlYWR5RXZ0KSwgXCIqXCIpO1xuXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZXIobWVzc2FnZSl7XG4gICAgICAgIGxvZyhcInNlbmRpbmcgc3dhcm0gXCIsIG1lc3NhZ2UpO1xuICAgICAgICBjaGlsZE1lc3NhZ2VNUS5wcm9kdWNlKG1lc3NhZ2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlckludGVyYWN0aW9ucyhtZXNzYWdlKXtcbiAgICAgICAgbG9nKFwiY2hlY2tpbmcgaWYgbWVzc2FnZSBpcyAnaW50ZXJhY3Rpb24nIFwiLCBtZXNzYWdlKTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UgJiYgbWVzc2FnZS5tZXRhICYmIG1lc3NhZ2UubWV0YS50YXJnZXQgJiYgbWVzc2FnZS5tZXRhLnRhcmdldCA9PT0gXCJpbnRlcmFjdGlvblwiO1xuICAgIH1cbiAgICAvL1RPRE8gZml4IHRoaXMgZm9yIG5hdGl2ZVdlYlZpZXdcblxuICAgICQkLlBTS19QdWJTdWIuc3Vic2NyaWJlKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBoYW5kbGVyLCBmdW5jdGlvbigpe3JldHVybiB0cnVlO30sIGZpbHRlckludGVyYWN0aW9ucyk7XG5cbiAgICBsb2coXCJyZWdpc3RlcmluZyBsaXN0ZW5lciBmb3IgaGFuZGxpbmcgaW50ZXJhY3Rpb25zXCIpO1xuXG4gICAgZnVuY3Rpb24gbG9nKC4uLmFyZ3Mpe1xuICAgICAgICBhcmdzLnVuc2hpZnQoXCJbV2luZG93TVFJbnRlcmFjdGlvblNwYWNlXCIrKHdpbmRvdy5mcmFtZUVsZW1lbnQgPyBcIipcIjogXCJcIikrXCJdXCIgKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UgPSBmdW5jdGlvbihjaGFubmVsTmFtZSwgY29tbXVuaWNhdGlvbldpbmRvdywgc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwpe1xuICAgIHJldHVybiBuZXcgV2luZG93TVFJbnRlcmFjdGlvblNwYWNlKGNoYW5uZWxOYW1lLCBjb21tdW5pY2F0aW9uV2luZG93LCBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCk7XG59OyIsIi8qVE9ET1xuRm9yIHRoZSBtb21lbnQgSSBkb24ndCBzZWUgYW55IHByb2JsZW1zIGlmIGl0J3Mgbm90IGNyeXB0b2dyYXBoaWMgc2FmZS5cblRoaXMgdmVyc2lvbiBrZWVwcyAgY29tcGF0aWJpbGl0eSB3aXRoIG1vYmlsZSBicm93c2Vycy93ZWJ2aWV3cy5cbiAqL1xuZnVuY3Rpb24gdXVpZHY0KCkge1xuICAgIHJldHVybiAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uIChjKSB7XG4gICAgICAgIHZhciByID0gTWF0aC5yYW5kb20oKSAqIDE2IHwgMCwgdiA9IGMgPT09ICd4JyA/IHIgOiAociAmIDB4MyB8IDB4OCk7XG4gICAgICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gV2luZG93TVFJbnRlcmFjdGlvblNwYWNlKGNoYW5uZWxOYW1lLCBjb21tdW5pY2F0aW9uV2luZG93KSB7XG4gICAgdmFyIHN3YXJtSW50ZXJhY3QgPSByZXF1aXJlKFwiLi8uLi9zd2FybUludGVyYWN0aW9uXCIpO1xuICAgIHZhciBjaGlsZE1lc3NhZ2VNUSA9IHJlcXVpcmUoXCIuL3NwZWNpZmljTVFJbXBsL0NoaWxkV25kTVFcIikuY3JlYXRlTVEoY2hhbm5lbE5hbWUsIGNvbW11bmljYXRpb25XaW5kb3cpO1xuICAgIHZhciBzd2FybUluc3RhbmNlcyA9IHt9O1xuXG4gICAgdmFyIGNvbW0gPSB7XG4gICAgICAgIHN0YXJ0U3dhcm06IGZ1bmN0aW9uIChzd2FybU5hbWUsIGN0b3IsIGFyZ3MpIHtcblxuICAgICAgICAgICAgdmFyIHVuaXF1ZUlkID0gdXVpZHY0KCk7XG4gICAgICAgICAgICB2YXIgc3dhcm0gPSB7XG4gICAgICAgICAgICAgICAgbWV0YToge1xuICAgICAgICAgICAgICAgICAgICBzd2FybVR5cGVOYW1lOiBzd2FybU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGN0b3I6IGN0b3IsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IGFyZ3MsXG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3RJZDogdW5pcXVlSWQsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNoaWxkTWVzc2FnZU1RLnByb2R1Y2Uoc3dhcm0pO1xuICAgICAgICAgICAgcmV0dXJuIHN3YXJtO1xuICAgICAgICB9LFxuICAgICAgICBjb250aW51ZVN3YXJtOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBzd2FybVNlcmlhbGlzYXRpb24sIHBoYXNlTmFtZSwgYXJncykge1xuXG4gICAgICAgICAgICB2YXIgbmV3U2VyaWFsaXphdGlvbiA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc3dhcm1TZXJpYWxpc2F0aW9uKSk7XG4gICAgICAgICAgICBuZXdTZXJpYWxpemF0aW9uLm1ldGEuY3RvciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS5waGFzZU5hbWUgPSBwaGFzZU5hbWU7XG4gICAgICAgICAgICBuZXdTZXJpYWxpemF0aW9uLm1ldGEudGFyZ2V0ID0gXCJpZnJhbWVcIjtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS5hcmdzID0gYXJncztcbiAgICAgICAgICAgIGNoaWxkTWVzc2FnZU1RLnByb2R1Y2UobmV3U2VyaWFsaXphdGlvbik7XG4gICAgICAgIH0sXG4gICAgICAgIG9uOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2hpbGRNZXNzYWdlTVEucmVnaXN0ZXJDYWxsYmFjayhzd2FybUhhbmRsZXIubWV0YS5yZXF1ZXN0SWQsIGNhbGxiYWNrKTtcbiAgICAgICAgfSxcbiAgICAgICAgb2ZmOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkZ1bmN0aW9uIG5vdCBpbXBsZW1lbnRlZCFcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICB2YXIgc3BhY2UgPSBzd2FybUludGVyYWN0Lm5ld0ludGVyYWN0aW9uU3BhY2UoY29tbSk7XG4gICAgdGhpcy5zdGFydFN3YXJtID0gZnVuY3Rpb24gKG5hbWUsIGN0b3IsIC4uLmFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIHNwYWNlLnN0YXJ0U3dhcm0obmFtZSwgY3RvciwgLi4uYXJncyk7XG4gICAgfTtcblxuICAgIHRoaXMuaW5pdCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBjaGlsZE1lc3NhZ2VNUS5yZWdpc3RlckNvbnN1bWVyKGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHN3YXJtO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEubWV0YSAmJiBkYXRhLm1ldGEuc3dhcm1JZCAmJiBzd2FybUluc3RhbmNlc1tkYXRhLm1ldGEuc3dhcm1JZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm0gPSBzd2FybUluc3RhbmNlc1tkYXRhLm1ldGEuc3dhcm1JZF07XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtLnVwZGF0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm1bZGF0YS5tZXRhLnBoYXNlTmFtZV0uYXBwbHkoc3dhcm0sIGRhdGEubWV0YS5hcmdzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgIHN3YXJtID0gJCQuc3dhcm0uc3RhcnQoZGF0YS5tZXRhLnN3YXJtVHlwZU5hbWUsIGRhdGEubWV0YS5jdG9yLCAuLi5kYXRhLm1ldGEuYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtLnNldE1ldGFkYXRhKFwicmVxdWVzdElkXCIsIGRhdGEubWV0YS5yZXF1ZXN0SWQpO1xuICAgICAgICAgICAgICAgICAgICBzd2FybUluc3RhbmNlc1tzd2FybS5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXSA9IHN3YXJtO1xuXG4gICAgICAgICAgICAgICAgICAgIHN3YXJtLm9uUmV0dXJuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN3YXJtIGlzIGZpbmlzaGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHBhcmVudC5wb3N0TWVzc2FnZSh7d2ViVmlld0lzUmVhZHk6IHRydWV9LCBcIipcIik7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZXIobWVzc2FnZSkge1xuICAgICAgICBsb2coXCJzZW5kaW5nIHN3YXJtIFwiLCBtZXNzYWdlKTtcbiAgICAgICAgY2hpbGRNZXNzYWdlTVEucHJvZHVjZShtZXNzYWdlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWx0ZXJJbnRlcmFjdGlvbnMobWVzc2FnZSkge1xuICAgICAgICBsb2coXCJjaGVja2luZyBpZiBtZXNzYWdlIGlzICdpbnRlcmFjdGlvbicgXCIsIG1lc3NhZ2UpO1xuICAgICAgICByZXR1cm4gbWVzc2FnZSAmJiBtZXNzYWdlLm1ldGEgJiYgbWVzc2FnZS5tZXRhLnRhcmdldCAmJiBtZXNzYWdlLm1ldGEudGFyZ2V0ID09PSBcImludGVyYWN0aW9uXCI7XG4gICAgfVxuXG4gICAgJCQuUFNLX1B1YlN1Yi5zdWJzY3JpYmUoJCQuQ09OU1RBTlRTLlNXQVJNX0ZPUl9FWEVDVVRJT04sIGhhbmRsZXIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSwgZmlsdGVySW50ZXJhY3Rpb25zKTtcbiAgICBsb2coXCJyZWdpc3RlcmluZyBsaXN0ZW5lciBmb3IgaGFuZGxpbmcgaW50ZXJhY3Rpb25zXCIpO1xuXG4gICAgZnVuY3Rpb24gbG9nKC4uLmFyZ3MpIHtcbiAgICAgICAgYXJncy51bnNoaWZ0KFwiW1dpbmRvd01RSW50ZXJhY3Rpb25TcGFjZVwiICsgKHdpbmRvdy5mcmFtZUVsZW1lbnQgPyBcIipcIiA6IFwiXCIpICsgXCJdXCIpO1xuICAgICAgICAvL2NvbnNvbGUubG9nLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZSA9IGZ1bmN0aW9uIChjaGFubmVsTmFtZSwgY29tbXVuaWNhdGlvbldpbmRvdykge1xuICAgIHJldHVybiBuZXcgV2luZG93TVFJbnRlcmFjdGlvblNwYWNlKGNoYW5uZWxOYW1lLCBjb21tdW5pY2F0aW9uV2luZG93KTtcbn07XG4iLCJ2YXIgT3dNID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIikuT3dNO1xudmFyIHN3YXJtSW50ZXJhY3QgPSByZXF1aXJlKFwiLi8uLi9zd2FybUludGVyYWN0aW9uXCIpO1xudmFyIGZvbGRlck1RID0gcmVxdWlyZShcImZvbGRlcm1xXCIpO1xuXG5mdW5jdGlvbiBGb2xkZXJNUUludGVyYWN0aW9uU3BhY2UoYWdlbnQsIHRhcmdldEZvbGRlciwgcmV0dXJuRm9sZGVyKSB7XG4gICAgdmFyIHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVycyA9IHt9O1xuICAgIHZhciBxdWV1ZUhhbmRsZXIgPSBudWxsO1xuICAgIHZhciByZXNwb25zZVF1ZXVlID0gbnVsbDtcblxuICAgIHZhciBxdWV1ZSA9IGZvbGRlck1RLmNyZWF0ZVF1ZSh0YXJnZXRGb2xkZXIsIChlcnIgLCByZXN1bHQpID0+IHtcbiAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVTd2FybVBhY2soc3dhcm1OYW1lLCBwaGFzZU5hbWUsIC4uLmFyZ3Mpe1xuICAgICAgICB2YXIgc3dhcm0gPSBuZXcgT3dNKCk7XG5cbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInN3YXJtSWRcIiwgJCQudWlkR2VuZXJhdG9yLnNhZmVfdXVpZCgpKTtcblxuICAgICAgICBzd2FybS5zZXRNZXRhKFwicmVxdWVzdElkXCIsIHN3YXJtLmdldE1ldGEoXCJzd2FybUlkXCIpKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInN3YXJtVHlwZU5hbWVcIiwgc3dhcm1OYW1lKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInBoYXNlTmFtZVwiLCBwaGFzZU5hbWUpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiYXJnc1wiLCBhcmdzKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImNvbW1hbmRcIiwgXCJleGVjdXRlU3dhcm1QaGFzZVwiKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInRhcmdldFwiLCBhZ2VudCk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIsIHJldHVybkZvbGRlcik7XG5cbiAgICAgICAgcmV0dXJuIHN3YXJtO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpc3BhdGNoaW5nU3dhcm1zKGVyciwgc3dhcm0pe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICB9XG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHN1YnNMaXN0ID0gc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtLm1ldGEuc3dhcm1JZF07XG4gICAgICAgICAgICBpZihzdWJzTGlzdCl7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpPTA7IGk8c3Vic0xpc3QubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgICAgICAgICBsZXQgaGFuZGxlciA9IHN1YnNMaXN0W2ldO1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKG51bGwsIHN3YXJtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluaXQoKXtcbiAgICAgICAgaWYoIXF1ZXVlSGFuZGxlcil7XG4gICAgICAgICAgICBxdWV1ZUhhbmRsZXIgPSBxdWV1ZS5nZXRIYW5kbGVyKCk7XG4gICAgICAgIH1cbiAgICB9XG5cdFxuXHRpbml0KCk7XG5cbiAgICBmdW5jdGlvbiBwcmVwYXJlVG9Db25zdW1lKCl7XG4gICAgICAgIGlmKCFyZXNwb25zZVF1ZXVlKXtcbiAgICAgICAgICAgIHJlc3BvbnNlUXVldWUgPSBmb2xkZXJNUS5jcmVhdGVRdWUocmV0dXJuRm9sZGVyKTtcbiAgICAgICAgICAgIHJlc3BvbnNlUXVldWUucmVnaXN0ZXJDb25zdW1lcihkaXNwYXRjaGluZ1N3YXJtcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgY29tbXVuaWNhdGlvbiA9IHtcbiAgICAgICAgc3RhcnRTd2FybTogZnVuY3Rpb24gKHN3YXJtTmFtZSwgY3RvciwgYXJncykge1xuICAgICAgICAgICAgcHJlcGFyZVRvQ29uc3VtZSgpO1xuICAgICAgICAgICAgdmFyIHN3YXJtID0gY3JlYXRlU3dhcm1QYWNrKHN3YXJtTmFtZSwgY3RvciwgLi4uYXJncyk7XG4gICAgICAgICAgICBxdWV1ZUhhbmRsZXIuc2VuZFN3YXJtRm9yRXhlY3V0aW9uKHN3YXJtKTtcbiAgICAgICAgICAgIHJldHVybiBzd2FybTtcbiAgICAgICAgfSxcbiAgICAgICAgY29udGludWVTd2FybTogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgc3dhcm1TZXJpYWxpc2F0aW9uLCBjdG9yLCAuLi5hcmdzKSB7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgc3dhcm1IYW5kbGVyLnVwZGF0ZShzd2FybVNlcmlhbGlzYXRpb24pO1xuICAgICAgICAgICAgICAgIHN3YXJtSGFuZGxlcltjdG9yXS5hcHBseShzd2FybUhhbmRsZXIsIGFyZ3MpO1xuICAgICAgICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb246IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBwcmVwYXJlVG9Db25zdW1lKCk7XG5cbiAgICAgICAgICAgIGlmKCFzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm1IYW5kbGVyLm1ldGEuc3dhcm1JZF0pe1xuICAgICAgICAgICAgICAgIHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybUhhbmRsZXIubWV0YS5zd2FybUlkXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5tZXRhLnN3YXJtSWRdLnB1c2goY2FsbGJhY2spO1xuXG4gICAgICAgIH0sXG4gICAgICAgIG9mZjogZnVuY3Rpb24gKHN3YXJtSGFuZGxlcikge1xuICAgICAgICAgICAgc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5tZXRhLnN3YXJtSWRdID0gW107XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIHN3YXJtSW50ZXJhY3QubmV3SW50ZXJhY3Rpb25TcGFjZShjb21tdW5pY2F0aW9uKTtcbn1cblxudmFyIHNwYWNlcyA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVJbnRlcmFjdGlvblNwYWNlID0gZnVuY3Rpb24gKGFnZW50LCB0YXJnZXRGb2xkZXIsIHJldHVybkZvbGRlcikge1xuICAgIHZhciBpbmRleCA9IHRhcmdldEZvbGRlcityZXR1cm5Gb2xkZXI7XG4gICAgaWYoIXNwYWNlc1tpbmRleF0pe1xuICAgICAgICBzcGFjZXNbaW5kZXhdID0gbmV3IEZvbGRlck1RSW50ZXJhY3Rpb25TcGFjZShhZ2VudCwgdGFyZ2V0Rm9sZGVyLCByZXR1cm5Gb2xkZXIpO1xuICAgIH1lbHNle1xuICAgICAgICBjb25zb2xlLmxvZyhgRm9sZGVyTVEgaW50ZXJhY3Rpb24gc3BhY2UgYmFzZWQgb24gWyR7dGFyZ2V0Rm9sZGVyfSwgJHtyZXR1cm5Gb2xkZXJ9XSBhbHJlYWR5IGV4aXN0cyFgKTtcbiAgICB9XG4gICAgcmV0dXJuIHNwYWNlc1tpbmRleF07XG59OyIsInJlcXVpcmUoJ3Bzay1odHRwLWNsaWVudCcpO1xuXG5mdW5jdGlvbiBIVFRQSW50ZXJhY3Rpb25TcGFjZShhbGlhcywgcmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBjcnlwdG9JbmZvKSB7XG4gICAgY29uc3Qgc3dhcm1JbnRlcmFjdCA9IHJlcXVpcmUoXCIuLy4uL3N3YXJtSW50ZXJhY3Rpb25cIik7XG5cbiAgICBsZXQgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICBmdW5jdGlvbiBpbml0KCl7XG4gICAgICAgIGlmKCFpbml0aWFsaXplZCl7XG4gICAgICAgICAgICBpbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgICAgICAkJC5yZW1vdGUuY3JlYXRlUmVxdWVzdE1hbmFnZXIoKTtcbiAgICAgICAgICAgICQkLnJlbW90ZS5uZXdFbmRQb2ludChhbGlhcywgcmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBjcnlwdG9JbmZvKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbW0gPSB7XG4gICAgICAgIHN0YXJ0U3dhcm06IGZ1bmN0aW9uIChzd2FybU5hbWUsIGN0b3IsIGFyZ3MpIHtcbiAgICAgICAgICAgIGluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiAkJC5yZW1vdGVbYWxpYXNdLnN0YXJ0U3dhcm0oc3dhcm1OYW1lLCBjdG9yLCAuLi5hcmdzKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29udGludWVTd2FybTogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgc3dhcm1TZXJpYWxpc2F0aW9uLCBjdG9yLCBhcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gJCQucmVtb3RlW2FsaWFzXS5jb250aW51ZVN3YXJtKHN3YXJtU2VyaWFsaXNhdGlvbiwgY3RvciwgYXJncyk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgc3dhcm1IYW5kbGVyLm9uKCcqJywgY2FsbGJhY2spO1xuICAgICAgICB9LFxuICAgICAgICBvZmY6IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIpIHtcbiAgICAgICAgICAgIHN3YXJtSGFuZGxlci5vZmYoJyonKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gc3dhcm1JbnRlcmFjdC5uZXdJbnRlcmFjdGlvblNwYWNlKGNvbW0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVJbnRlcmFjdGlvblNwYWNlID0gZnVuY3Rpb24gKGFsaWFzLCByZW1vdGVFbmRQb2ludCwgYWdlbnRVaWQsIGNyeXB0b0luZm8pIHtcbiAgICAvL3NpbmdsZXRvblxuICAgIHJldHVybiBuZXcgSFRUUEludGVyYWN0aW9uU3BhY2UoYWxpYXMsIHJlbW90ZUVuZFBvaW50LCBhZ2VudFVpZCwgY3J5cHRvSW5mbyk7XG59OyIsInZhciBjaGFubmVsc1JlZ2lzdHJ5ID0ge307IC8va2VlcHMgY2FsbGJhY2tzIGZvciBjb25zdW1lcnMgYW5kIHdpbmRvd3MgcmVmZXJlbmNlcyBmb3IgcHJvZHVjZXJzXG52YXIgY2FsbGJhY2tzUmVnaXN0cnkgPSB7fTtcblxuZnVuY3Rpb24gZGlzcGF0Y2hFdmVudChldmVudCkge1xuICAgIHZhciBzd2FybSA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSk7XG4gICAgaWYoc3dhcm0ubWV0YSl7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGNhbGxiYWNrc1JlZ2lzdHJ5W3N3YXJtLm1ldGEuY2hhbm5lbE5hbWVdO1xuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBzd2FybSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbn1cblxuXG5mdW5jdGlvbiBDaGlsZFduZE1RKGNoYW5uZWxOYW1lLCBtYWluV2luZG93LCBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCkge1xuICAgIC8vY2hhbm5lbCBuYW1lIGlzXG5cbiAgICBjaGFubmVsc1JlZ2lzdHJ5W2NoYW5uZWxOYW1lXSA9IG1haW5XaW5kb3c7XG5cbiAgICB0aGlzLnByb2R1Y2UgPSBmdW5jdGlvbiAoc3dhcm1Nc2cpIHtcbiAgICAgICAgc3dhcm1Nc2cubWV0YS5jaGFubmVsTmFtZSA9IGNoYW5uZWxOYW1lO1xuICAgICAgICB2YXIgbWVzc2FnZSA9IHtcbiAgICAgICAgICAgIG1ldGE6c3dhcm1Nc2cubWV0YSxcbiAgICAgICAgICAgIHB1YmxpY1ZhcnM6c3dhcm1Nc2cucHVibGljVmFycyxcbiAgICAgICAgICAgIHByaXZhdGVWYXJzOnN3YXJtTXNnLnByaXZhdGVWYXJzXG4gICAgICAgIH07XG5cbiAgICAgICAgbWVzc2FnZS5tZXRhLmFyZ3MgPSBtZXNzYWdlLm1ldGEuYXJncy5tYXAoZnVuY3Rpb24gKGFyZ3VtZW50KSB7XG4gICAgICAgICAgICBpZiAoYXJndW1lbnQgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9IHt9O1xuICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudC5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yW1wibWVzc2FnZVwiXSA9IGFyZ3VtZW50Lm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudC5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yW1wiY29kZVwiXSA9IGFyZ3VtZW50LmNvZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhcmd1bWVudDtcbiAgICAgICAgfSk7XG4gICAgICAgIG1haW5XaW5kb3cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSksIFwiKlwiKTtcbiAgICB9O1xuXG4gICAgdmFyIGNvbnN1bWVyO1xuXG4gICAgdGhpcy5yZWdpc3RlckNvbnN1bWVyID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBzaG91bGREZWxldGVBZnRlclJlYWQgPSB0cnVlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25zdW1lcikge1xuICAgICAgICAgICAvLyB0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IG9uZSBjb25zdW1lciBpcyBhbGxvd2VkIVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVyID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrc1JlZ2lzdHJ5W2NoYW5uZWxOYW1lXSA9IGNvbnN1bWVyO1xuXG4gICAgICAgIGlmIChzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCAmJiB0eXBlb2Ygc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwuYWRkRXZlbnRMaXN0ZW5lciAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZGlzcGF0Y2hFdmVudCk7XG4gICAgICAgIH1cbiAgICAgIH07XG59XG5cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlTVEgPSBmdW5jdGlvbiBjcmVhdGVNUShjaGFubmVsTmFtZSwgd25kLCBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCl7XG4gICAgcmV0dXJuIG5ldyBDaGlsZFduZE1RKGNoYW5uZWxOYW1lLCB3bmQsIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMuaW5pdEZvclN3YXJtaW5nSW5DaGlsZCA9IGZ1bmN0aW9uKGRvbWFpbk5hbWUpe1xuXG4gICAgdmFyIHB1YlN1YiA9ICQkLnJlcXVpcmUoXCJzb3VuZHB1YnN1YlwiKS5zb3VuZFB1YlN1YjtcblxuICAgIHZhciBpbmJvdW5kID0gY3JlYXRlTVEoZG9tYWluTmFtZStcIi9pbmJvdW5kXCIpO1xuICAgIHZhciBvdXRib3VuZCA9IGNyZWF0ZU1RKGRvbWFpbk5hbWUrXCIvb3V0Ym91bmRcIik7XG5cblxuICAgIGluYm91bmQucmVnaXN0ZXJDb25zdW1lcihmdW5jdGlvbihlcnIsIHN3YXJtKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgfVxuICAgICAgICAvL3Jlc3RvcmUgYW5kIGV4ZWN1dGUgdGhpcyB0YXN0eSBzd2FybVxuICAgICAgICBnbG9iYWwuJCQuc3dhcm1zSW5zdGFuY2VzTWFuYWdlci5yZXZpdmVfc3dhcm0oc3dhcm0pO1xuICAgIH0pO1xuXG4gICAgcHViU3ViLnN1YnNjcmliZSgkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTiwgZnVuY3Rpb24oc3dhcm0pe1xuICAgICAgICBvdXRib3VuZC5zZW5kU3dhcm1Gb3JFeGVjdXRpb24oc3dhcm0pO1xuICAgIH0pO1xufTtcblxuIiwidmFyIGNoYW5uZWxzUmVnaXN0cnkgPSB7fTsgLy9rZWVwcyBjYWxsYmFja3MgZm9yIGNvbnN1bWVycyBhbmQgd2luZG93cyByZWZlcmVuY2VzIGZvciBwcm9kdWNlcnNcbnZhciBjYWxsYmFja3NSZWdpc3RyeSA9IHt9O1xudmFyIHN3YXJtQ2FsbGJhY2tzID0ge307XG5cbmZ1bmN0aW9uIGRpc3BhdGNoRXZlbnQoZXZlbnQpIHtcblxuICAgIGlmIChldmVudC5zb3VyY2UgIT09IHdpbmRvdykge1xuXG4gICAgICAgIHZhciBzd2FybSA9IGV2ZW50LmRhdGE7XG5cbiAgICAgICAgaWYgKHN3YXJtLm1ldGEpIHtcbiAgICAgICAgICAgIGxldCBjYWxsYmFjaztcbiAgICAgICAgICAgIGlmICghc3dhcm0ubWV0YS5yZXF1ZXN0SWQgfHwgIXN3YXJtQ2FsbGJhY2tzW3N3YXJtLm1ldGEucmVxdWVzdElkXSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2tzUmVnaXN0cnlbc3dhcm0ubWV0YS5jaGFubmVsTmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayA9IHN3YXJtQ2FsbGJhY2tzW3N3YXJtLm1ldGEucmVxdWVzdElkXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHN3YXJtKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuZnVuY3Rpb24gQ2hpbGRXbmRNUShjaGFubmVsTmFtZSwgbWFpbldpbmRvdykge1xuICAgIC8vY2hhbm5lbCBuYW1lIGlzXG5cbiAgICBjaGFubmVsc1JlZ2lzdHJ5W2NoYW5uZWxOYW1lXSA9IG1haW5XaW5kb3c7XG5cbiAgICB0aGlzLnByb2R1Y2UgPSBmdW5jdGlvbiAoc3dhcm1Nc2cpIHtcbiAgICAgICAgc3dhcm1Nc2cubWV0YS5jaGFubmVsTmFtZSA9IGNoYW5uZWxOYW1lO1xuICAgICAgICB2YXIgbWVzc2FnZSA9IHtcbiAgICAgICAgICAgIG1ldGE6IHN3YXJtTXNnLm1ldGEsXG4gICAgICAgICAgICBwdWJsaWNWYXJzOiBzd2FybU1zZy5wdWJsaWNWYXJzLFxuICAgICAgICAgICAgcHJpdmF0ZVZhcnM6IHN3YXJtTXNnLnByaXZhdGVWYXJzXG4gICAgICAgIH07XG4gICAgICAgIC8vY29uc29sZS5sb2coc3dhcm1Nc2cuZ2V0SlNPTigpKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhzd2FybU1zZy52YWx1ZU9mKCkpO1xuICAgICAgICBtZXNzYWdlLm1ldGEuYXJncyA9IG1lc3NhZ2UubWV0YS5hcmdzLm1hcChmdW5jdGlvbiAoYXJndW1lbnQpIHtcbiAgICAgICAgICAgIGlmIChhcmd1bWVudCBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yID0ge307XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50Lm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JbXCJtZXNzYWdlXCJdID0gYXJndW1lbnQubWVzc2FnZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50LmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JbXCJjb2RlXCJdID0gYXJndW1lbnQuY29kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFyZ3VtZW50O1xuICAgICAgICB9KTtcbiAgICAgICAgbWFpbldpbmRvdy5wb3N0TWVzc2FnZShtZXNzYWdlLCBcIipcIik7XG4gICAgfTtcblxuICAgIHZhciBjb25zdW1lcjtcblxuICAgIHRoaXMucmVnaXN0ZXJDb25zdW1lciA9IGZ1bmN0aW9uIChjYWxsYmFjaywgc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkID0gdHJ1ZSkge1xuICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpcnN0IHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uc3VtZXIpIHtcbiAgICAgICAgICAgIC8vIHRocm93IG5ldyBFcnJvcihcIk9ubHkgb25lIGNvbnN1bWVyIGlzIGFsbG93ZWQhXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZXIgPSBjYWxsYmFjaztcbiAgICAgICAgY2FsbGJhY2tzUmVnaXN0cnlbY2hhbm5lbE5hbWVdID0gY29uc3VtZXI7XG4gICAgICAgIG1haW5XaW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZGlzcGF0Y2hFdmVudCk7XG4gICAgfTtcblxuICAgIHRoaXMucmVnaXN0ZXJDYWxsYmFjayA9IGZ1bmN0aW9uIChyZXF1ZXN0SWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHN3YXJtQ2FsbGJhY2tzW3JlcXVlc3RJZF0gPSBjYWxsYmFjaztcbiAgICAgICAgY2FsbGJhY2tzUmVnaXN0cnlbY2hhbm5lbE5hbWVdID0gY2FsbGJhY2s7XG4gICAgICAgIG1haW5XaW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZGlzcGF0Y2hFdmVudCk7XG4gICAgfTtcblxufVxuXG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZU1RID0gZnVuY3Rpb24gY3JlYXRlTVEoY2hhbm5lbE5hbWUsIHduZCkge1xuICAgIHJldHVybiBuZXcgQ2hpbGRXbmRNUShjaGFubmVsTmFtZSwgd25kKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMuaW5pdEZvclN3YXJtaW5nSW5DaGlsZCA9IGZ1bmN0aW9uIChkb21haW5OYW1lKSB7XG5cbiAgICB2YXIgcHViU3ViID0gJCQucmVxdWlyZShcInNvdW5kcHVic3ViXCIpLnNvdW5kUHViU3ViO1xuXG4gICAgdmFyIGluYm91bmQgPSBjcmVhdGVNUShkb21haW5OYW1lICsgXCIvaW5ib3VuZFwiKTtcbiAgICB2YXIgb3V0Ym91bmQgPSBjcmVhdGVNUShkb21haW5OYW1lICsgXCIvb3V0Ym91bmRcIik7XG5cblxuICAgIGluYm91bmQucmVnaXN0ZXJDb25zdW1lcihmdW5jdGlvbiAoZXJyLCBzd2FybSkge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICB9XG4gICAgICAgIC8vcmVzdG9yZSBhbmQgZXhlY3V0ZSB0aGlzIHRhc3R5IHN3YXJtXG4gICAgICAgIGdsb2JhbC4kJC5zd2FybXNJbnN0YW5jZXNNYW5hZ2VyLnJldml2ZV9zd2FybShzd2FybSk7XG4gICAgfSk7XG5cbiAgICBwdWJTdWIuc3Vic2NyaWJlKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBmdW5jdGlvbiAoc3dhcm0pIHtcbiAgICAgICAgb3V0Ym91bmQuc2VuZFN3YXJtRm9yRXhlY3V0aW9uKHN3YXJtKTtcbiAgICB9KTtcbn07XG5cbiIsImlmICh0eXBlb2YgJCQgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICQkID0ge307XG59XG5cbmZ1bmN0aW9uIFZpcnR1YWxTd2FybShpbm5lck9iaiwgZ2xvYmFsSGFuZGxlcil7XG4gICAgbGV0IGtub3duRXh0cmFQcm9wcyA9IFsgXCJzd2FybVwiIF07XG5cbiAgICBmdW5jdGlvbiBidWlsZEhhbmRsZXIoKSB7XG4gICAgICAgIHZhciB1dGlsaXR5ID0ge307XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIHByb3BlcnR5LCB2YWx1ZSwgcmVjZWl2ZXIpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0YXJnZXQucHJpdmF0ZVZhcnMgJiYgdGFyZ2V0LnByaXZhdGVWYXJzLmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5wcml2YXRlVmFyc1twcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHRhcmdldC5wdWJsaWNWYXJzICYmIHRhcmdldC5wdWJsaWNWYXJzLmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5wdWJsaWNWYXJzW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdGFyZ2V0Lmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIGtub3duRXh0cmFQcm9wcy5pbmRleE9mKHByb3BlcnR5KSA9PT0gLTE6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWdsb2JhbEhhbmRsZXIucHJvdGVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsSGFuZGxlci5wcm90ZWN0ZWQgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbEhhbmRsZXIucHJvdGVjdGVkW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB1dGlsaXR5W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIHByb3BlcnR5LCByZWNlaXZlcikge1xuXG4gICAgICAgICAgICAgICAgc3dpdGNoICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdGFyZ2V0LnB1YmxpY1ZhcnMgJiYgdGFyZ2V0LnB1YmxpY1ZhcnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldC5wdWJsaWNWYXJzW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0YXJnZXQucHJpdmF0ZVZhcnMgJiYgdGFyZ2V0LnByaXZhdGVWYXJzLmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXQucHJpdmF0ZVZhcnNbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHRhcmdldC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSk6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBnbG9iYWxIYW5kbGVyLnByb3RlY3RlZCAmJiBnbG9iYWxIYW5kbGVyLnByb3RlY3RlZC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSk6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsSGFuZGxlci5wcm90ZWN0ZWRbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHV0aWxpdHkuaGFzT3duUHJvcGVydHkocHJvcGVydHkpOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHV0aWxpdHlbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm94eShpbm5lck9iaiwgYnVpbGRIYW5kbGVyKCkpO1xufVxuXG5mdW5jdGlvbiBTd2FybUludGVyYWN0aW9uKGNvbW11bmljYXRpb25JbnRlcmZhY2UsIHN3YXJtTmFtZSwgY3RvciwgYXJncykge1xuXG4gICAgdmFyIHN3YXJtSGFuZGxlciA9IGNvbW11bmljYXRpb25JbnRlcmZhY2Uuc3RhcnRTd2FybShzd2FybU5hbWUsIGN0b3IsIGFyZ3MpO1xuXG4gICAgdGhpcy5vbiA9IGZ1bmN0aW9uKGRlc2NyaXB0aW9uKXtcbiAgICAgICAgY29tbXVuaWNhdGlvbkludGVyZmFjZS5vbihzd2FybUhhbmRsZXIsIGZ1bmN0aW9uKGVyciwgc3dhcm1TZXJpYWxpc2F0aW9uKXtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IHBoYXNlID0gZGVzY3JpcHRpb25bc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEucGhhc2VOYW1lXTtcbiAgICAgICAgICAgIGxldCB2aXJ0dWFsU3dhcm0gPSBuZXcgVmlydHVhbFN3YXJtKHN3YXJtU2VyaWFsaXNhdGlvbiwgc3dhcm1IYW5kbGVyKTtcblxuICAgICAgICAgICAgaWYoIXBoYXNlKXtcbiAgICAgICAgICAgICAgICAvL1RPRE8gcmV2aWV3IGFuZCBmaXguIEZpeCBjYXNlIHdoZW4gYW4gaW50ZXJhY3Rpb24gaXMgc3RhcnRlZCBmcm9tIGFub3RoZXIgaW50ZXJhY3Rpb25cbiAgICAgICAgICAgICAgICBpZihzd2FybUhhbmRsZXIgJiYgKCFzd2FybUhhbmRsZXIuVGFyZ2V0IHx8IHN3YXJtSGFuZGxlci5UYXJnZXQuc3dhcm1JZCAhPT0gc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEuc3dhcm1JZCkpe1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk5vdCBteSBzd2FybSFcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGludGVyYWN0UGhhc2VFcnIgPSAgbmV3IEVycm9yKFwiSW50ZXJhY3QgbWV0aG9kIFwiK3N3YXJtU2VyaWFsaXNhdGlvbi5tZXRhLnBoYXNlTmFtZStcIiB3YXMgbm90IGZvdW5kLlwiKTtcbiAgICAgICAgICAgICAgICBpZihkZXNjcmlwdGlvbltcIm9uRXJyb3JcIl0pe1xuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbltcIm9uRXJyb3JcIl0uY2FsbCh2aXJ0dWFsU3dhcm0sIGludGVyYWN0UGhhc2VFcnIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGludGVyYWN0UGhhc2VFcnI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2aXJ0dWFsU3dhcm0uc3dhcm0gPSBmdW5jdGlvbihwaGFzZU5hbWUsIC4uLmFyZ3Mpe1xuICAgICAgICAgICAgICAgIGNvbW11bmljYXRpb25JbnRlcmZhY2UuY29udGludWVTd2FybShzd2FybUhhbmRsZXIsIHN3YXJtU2VyaWFsaXNhdGlvbiwgcGhhc2VOYW1lLCBhcmdzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHBoYXNlLmFwcGx5KHZpcnR1YWxTd2FybSwgc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEuYXJncyk7XG4gICAgICAgICAgICBpZih2aXJ0dWFsU3dhcm0ubWV0YS5jb21tYW5kID09PSBcImFzeW5jUmV0dXJuXCIpe1xuICAgICAgICAgICAgICAgIGNvbW11bmljYXRpb25JbnRlcmZhY2Uub2ZmKHN3YXJtSGFuZGxlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLm9uUmV0dXJuID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgICAgICB0aGlzLm9uKHtcbiAgICAgICAgICAgIF9fcmV0dXJuX186IGNhbGxiYWNrXG4gICAgICAgIH0pO1xuICAgIH07XG59XG5cbnZhciBhYnN0cmFjdEludGVyYWN0aW9uU3BhY2UgPSB7XG4gICAgc3RhcnRTd2FybTogZnVuY3Rpb24gKHN3YXJtTmFtZSwgY3RvciwgYXJncykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgIFN3YXJtSW50ZXJhY3Rpb24ucHJvdG90eXBlLnN0YXJ0U3dhcm1cIik7XG4gICAgfSxcbiAgICByZXNlbmRTd2FybTogZnVuY3Rpb24gKHN3YXJtSW5zdGFuY2UsIHN3YXJtU2VyaWFsaXNhdGlvbiwgY3RvciwgYXJncykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgIFN3YXJtSW50ZXJhY3Rpb24ucHJvdG90eXBlLmNvbnRpbnVlU3dhcm0gXCIpO1xuICAgIH0sXG4gICAgb246IGZ1bmN0aW9uIChzd2FybUluc3RhbmNlLCBwaGFzZU5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk92ZXJ3cml0ZSAgU3dhcm1JbnRlcmFjdGlvbi5wcm90b3R5cGUub25Td2FybVwiKTtcbiAgICB9LFxub2ZmOiBmdW5jdGlvbiAoc3dhcm1JbnN0YW5jZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgIFN3YXJtSW50ZXJhY3Rpb24ucHJvdG90eXBlLm9uU3dhcm1cIik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMubmV3SW50ZXJhY3Rpb25TcGFjZSA9IGZ1bmN0aW9uIChjb21tdW5pY2F0aW9uSW50ZXJmYWNlKSB7XG5cbiAgICBpZighY29tbXVuaWNhdGlvbkludGVyZmFjZSkge1xuICAgICAgICBjb21tdW5pY2F0aW9uSW50ZXJmYWNlID0gYWJzdHJhY3RJbnRlcmFjdGlvblNwYWNlIDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc3RhcnRTd2FybTogZnVuY3Rpb24gKHN3YXJtTmFtZSwgY3RvciwgLi4uYXJncykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBTd2FybUludGVyYWN0aW9uKGNvbW11bmljYXRpb25JbnRlcmZhY2UsIHN3YXJtTmFtZSwgY3RvciwgYXJncyk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuIiwibW9kdWxlLmV4cG9ydHMgPSBQZW5kO1xuXG5mdW5jdGlvbiBQZW5kKCkge1xuICB0aGlzLnBlbmRpbmcgPSAwO1xuICB0aGlzLm1heCA9IEluZmluaXR5O1xuICB0aGlzLmxpc3RlbmVycyA9IFtdO1xuICB0aGlzLndhaXRpbmcgPSBbXTtcbiAgdGhpcy5lcnJvciA9IG51bGw7XG59XG5cblBlbmQucHJvdG90eXBlLmdvID0gZnVuY3Rpb24oZm4pIHtcbiAgaWYgKHRoaXMucGVuZGluZyA8IHRoaXMubWF4KSB7XG4gICAgcGVuZEdvKHRoaXMsIGZuKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLndhaXRpbmcucHVzaChmbik7XG4gIH1cbn07XG5cblBlbmQucHJvdG90eXBlLndhaXQgPSBmdW5jdGlvbihjYikge1xuICBpZiAodGhpcy5wZW5kaW5nID09PSAwKSB7XG4gICAgY2IodGhpcy5lcnJvcik7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5saXN0ZW5lcnMucHVzaChjYik7XG4gIH1cbn07XG5cblBlbmQucHJvdG90eXBlLmhvbGQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHBlbmRIb2xkKHRoaXMpO1xufTtcblxuZnVuY3Rpb24gcGVuZEhvbGQoc2VsZikge1xuICBzZWxmLnBlbmRpbmcgKz0gMTtcbiAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICByZXR1cm4gb25DYjtcbiAgZnVuY3Rpb24gb25DYihlcnIpIHtcbiAgICBpZiAoY2FsbGVkKSB0aHJvdyBuZXcgRXJyb3IoXCJjYWxsYmFjayBjYWxsZWQgdHdpY2VcIik7XG4gICAgY2FsbGVkID0gdHJ1ZTtcbiAgICBzZWxmLmVycm9yID0gc2VsZi5lcnJvciB8fCBlcnI7XG4gICAgc2VsZi5wZW5kaW5nIC09IDE7XG4gICAgaWYgKHNlbGYud2FpdGluZy5sZW5ndGggPiAwICYmIHNlbGYucGVuZGluZyA8IHNlbGYubWF4KSB7XG4gICAgICBwZW5kR28oc2VsZiwgc2VsZi53YWl0aW5nLnNoaWZ0KCkpO1xuICAgIH0gZWxzZSBpZiAoc2VsZi5wZW5kaW5nID09PSAwKSB7XG4gICAgICB2YXIgbGlzdGVuZXJzID0gc2VsZi5saXN0ZW5lcnM7XG4gICAgICBzZWxmLmxpc3RlbmVycyA9IFtdO1xuICAgICAgbGlzdGVuZXJzLmZvckVhY2goY2JMaXN0ZW5lcik7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIGNiTGlzdGVuZXIobGlzdGVuZXIpIHtcbiAgICBsaXN0ZW5lcihzZWxmLmVycm9yKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwZW5kR28oc2VsZiwgZm4pIHtcbiAgZm4ocGVuZEhvbGQoc2VsZikpO1xufVxuIiwiY29uc3QgbXNncGFjayA9IHJlcXVpcmUoJ0Btc2dwYWNrL21zZ3BhY2snKTtcblxuLyoqKioqKioqKioqKioqKioqKioqKiogIHV0aWxpdHkgY2xhc3MgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbmZ1bmN0aW9uIFJlcXVlc3RNYW5hZ2VyKHBvbGxpbmdUaW1lT3V0KXtcbiAgICBpZighcG9sbGluZ1RpbWVPdXQpe1xuICAgICAgICBwb2xsaW5nVGltZU91dCA9IDEwMDA7IC8vMSBzZWNvbmQgYnkgZGVmYXVsdFxuICAgIH1cblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIFJlcXVlc3QoZW5kUG9pbnQsIGluaXRpYWxTd2FybSl7XG4gICAgICAgIHZhciBvblJldHVybkNhbGxiYWNrcyA9IFtdO1xuICAgICAgICB2YXIgb25FcnJvckNhbGxiYWNrcyA9IFtdO1xuICAgICAgICB2YXIgb25DYWxsYmFja3MgPSBbXTtcbiAgICAgICAgdmFyIHJlcXVlc3RJZCA9IGluaXRpYWxTd2FybS5tZXRhLnJlcXVlc3RJZDtcbiAgICAgICAgaW5pdGlhbFN3YXJtID0gbnVsbDtcblxuICAgICAgICB0aGlzLmdldFJlcXVlc3RJZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gcmVxdWVzdElkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMub24gPSBmdW5jdGlvbihwaGFzZU5hbWUsIGNhbGxiYWNrKXtcbiAgICAgICAgICAgIGlmKHR5cGVvZiBwaGFzZU5hbWUgIT0gXCJzdHJpbmdcIiAgJiYgdHlwZW9mIGNhbGxiYWNrICE9IFwiZnVuY3Rpb25cIil7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIGZpcnN0IHBhcmFtZXRlciBzaG91bGQgYmUgYSBzdHJpbmcgYW5kIHRoZSBzZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBvbkNhbGxiYWNrcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjazpjYWxsYmFjayxcbiAgICAgICAgICAgICAgICBwaGFzZTpwaGFzZU5hbWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2VsZi5wb2xsKGVuZFBvaW50LCB0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMub25SZXR1cm4gPSBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgICAgICAgICBvblJldHVybkNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIHNlbGYucG9sbChlbmRQb2ludCwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLm9uRXJyb3IgPSBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgICAgICAgICBpZihvbkVycm9yQ2FsbGJhY2tzLmluZGV4T2YoY2FsbGJhY2spIT09LTEpe1xuICAgICAgICAgICAgICAgIG9uRXJyb3JDYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yIGNhbGxiYWNrIGFscmVhZHkgcmVnaXN0ZXJlZCFcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaCA9IGZ1bmN0aW9uKGVyciwgcmVzdWx0KXtcbiAgICAgICAgICAgIGlmKEFycmF5QnVmZmVyLmlzVmlldyhyZXN1bHQpIHx8IEJ1ZmZlci5pc0J1ZmZlcihyZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbXNncGFjay5kZWNvZGUocmVzdWx0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzdWx0ID0gdHlwZW9mIHJlc3VsdCA9PT0gXCJzdHJpbmdcIiA/IEpTT04ucGFyc2UocmVzdWx0KSA6IHJlc3VsdDtcblxuICAgICAgICAgICAgcmVzdWx0ID0gT3dNLnByb3RvdHlwZS5jb252ZXJ0KHJlc3VsdCk7XG4gICAgICAgICAgICB2YXIgcmVzdWx0UmVxSWQgPSByZXN1bHQuZ2V0TWV0YShcInJlcXVlc3RJZFwiKTtcbiAgICAgICAgICAgIHZhciBwaGFzZU5hbWUgPSByZXN1bHQuZ2V0TWV0YShcInBoYXNlTmFtZVwiKTtcbiAgICAgICAgICAgIHZhciBvblJldHVybiA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZihyZXN1bHRSZXFJZCA9PT0gcmVxdWVzdElkKXtcbiAgICAgICAgICAgICAgICBvblJldHVybkNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGMpe1xuICAgICAgICAgICAgICAgICAgICBjKG51bGwsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIG9uUmV0dXJuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZihvblJldHVybil7XG4gICAgICAgICAgICAgICAgICAgIG9uUmV0dXJuQ2FsbGJhY2tzID0gW107XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3JDYWxsYmFja3MgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvbkNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGkpe1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiWFhYWFhYWFg6XCIsIHBoYXNlTmFtZSAsIGkpO1xuICAgICAgICAgICAgICAgICAgICBpZihwaGFzZU5hbWUgPT09IGkucGhhc2UgfHwgaS5waGFzZSA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpLmNhbGxiYWNrKGVyciwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZihvblJldHVybkNhbGxiYWNrcy5sZW5ndGggPT09IDAgJiYgb25DYWxsYmFja3MubGVuZ3RoID09PSAwKXtcbiAgICAgICAgICAgICAgICBzZWxmLnVucG9sbChlbmRQb2ludCwgdGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaEVycm9yID0gZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpIDwgb25FcnJvckNhbGxiYWNrcy5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAgICAgdmFyIGVyckNiID0gb25FcnJvckNhbGxiYWNrc1tpXTtcbiAgICAgICAgICAgICAgICBlcnJDYihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMub2ZmID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYudW5wb2xsKGVuZFBvaW50LCB0aGlzKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB0aGlzLmNyZWF0ZVJlcXVlc3QgPSBmdW5jdGlvbihyZW1vdGVFbmRQb2ludCwgc3dhcm0pe1xuICAgICAgICBsZXQgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KHJlbW90ZUVuZFBvaW50LCBzd2FybSk7XG4gICAgICAgIHJldHVybiByZXF1ZXN0O1xuICAgIH07XG5cbiAgICAvKiAqKioqKioqKioqKioqKioqKioqKioqKioqKiogcG9sbGluZyB6b25lICoqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICB2YXIgcG9sbFNldCA9IHtcbiAgICB9O1xuXG4gICAgdmFyIGFjdGl2ZUNvbm5lY3Rpb25zID0ge1xuICAgIH07XG5cbiAgICB0aGlzLnBvbGwgPSBmdW5jdGlvbihyZW1vdGVFbmRQb2ludCwgcmVxdWVzdCl7XG4gICAgICAgIHZhciByZXF1ZXN0cyA9IHBvbGxTZXRbcmVtb3RlRW5kUG9pbnRdO1xuICAgICAgICBpZighcmVxdWVzdHMpe1xuICAgICAgICAgICAgcmVxdWVzdHMgPSB7fTtcbiAgICAgICAgICAgIHBvbGxTZXRbcmVtb3RlRW5kUG9pbnRdID0gcmVxdWVzdHM7XG4gICAgICAgIH1cbiAgICAgICAgcmVxdWVzdHNbcmVxdWVzdC5nZXRSZXF1ZXN0SWQoKV0gPSByZXF1ZXN0O1xuICAgICAgICBwb2xsaW5nSGFuZGxlcigpO1xuICAgIH07XG5cbiAgICB0aGlzLnVucG9sbCA9IGZ1bmN0aW9uKHJlbW90ZUVuZFBvaW50LCByZXF1ZXN0KXtcbiAgICAgICAgdmFyIHJlcXVlc3RzID0gcG9sbFNldFtyZW1vdGVFbmRQb2ludF07XG4gICAgICAgIGlmKHJlcXVlc3RzKXtcbiAgICAgICAgICAgIGRlbGV0ZSByZXF1ZXN0c1tyZXF1ZXN0LmdldFJlcXVlc3RJZCgpXTtcbiAgICAgICAgICAgIGlmKE9iamVjdC5rZXlzKHJlcXVlc3RzKS5sZW5ndGggPT09IDApe1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBwb2xsU2V0W3JlbW90ZUVuZFBvaW50XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVW5wb2xsaW5nIHdyb25nIHJlcXVlc3Q6XCIscmVtb3RlRW5kUG9pbnQsIHJlcXVlc3QpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVBvbGxUaHJlYWQocmVtb3RlRW5kUG9pbnQpe1xuICAgICAgICBmdW5jdGlvbiByZUFybSgpe1xuICAgICAgICAgICAgJCQucmVtb3RlLmRvSHR0cEdldChyZW1vdGVFbmRQb2ludCwgZnVuY3Rpb24oZXJyLCByZXMpe1xuICAgICAgICAgICAgICAgIGxldCByZXF1ZXN0cyA9IHBvbGxTZXRbcmVtb3RlRW5kUG9pbnRdO1xuXG4gICAgICAgICAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgZm9yKGxldCByZXFfaWQgaW4gcmVxdWVzdHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVycl9oYW5kbGVyID0gcmVxdWVzdHNbcmVxX2lkXS5kaXNwYXRjaEVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZXJyX2hhbmRsZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycl9oYW5kbGVyKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlQ29ubmVjdGlvbnNbcmVtb3RlRW5kUG9pbnRdID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoQnVmZmVyLmlzQnVmZmVyKHJlcykgfHwgQXJyYXlCdWZmZXIuaXNWaWV3KHJlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcyA9IG1zZ3BhY2suZGVjb2RlKHJlcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGsgaW4gcmVxdWVzdHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdHNba10uZGlzcGF0Y2gobnVsbCwgcmVzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKE9iamVjdC5rZXlzKHJlcXVlc3RzKS5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlQXJtKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgYWN0aXZlQ29ubmVjdGlvbnNbcmVtb3RlRW5kUG9pbnRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFbmRpbmcgcG9sbGluZyBmb3IgXCIsIHJlbW90ZUVuZFBvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJlQXJtKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcG9sbGluZ0hhbmRsZXIoKXtcbiAgICAgICAgbGV0IHNldFRpbWVyID0gZmFsc2U7XG4gICAgICAgIGZvcih2YXIgdiBpbiBwb2xsU2V0KXtcbiAgICAgICAgICAgIGlmKCFhY3RpdmVDb25uZWN0aW9uc1t2XSl7XG4gICAgICAgICAgICAgICAgY3JlYXRlUG9sbFRocmVhZCh2KTtcbiAgICAgICAgICAgICAgICBhY3RpdmVDb25uZWN0aW9uc1t2XSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRUaW1lciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYoc2V0VGltZXIpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQocG9sbGluZ0hhbmRsZXIsIHBvbGxpbmdUaW1lT3V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldFRpbWVvdXQoIHBvbGxpbmdIYW5kbGVyLCBwb2xsaW5nVGltZU91dCk7XG59XG5cblxuZnVuY3Rpb24gZXh0cmFjdERvbWFpbkFnZW50RGV0YWlscyh1cmwpe1xuICAgIGNvbnN0IHZSZWdleCA9IC8oW2EtekEtWjAtOV0qfC4pKlxcL2FnZW50XFwvKFthLXpBLVowLTldKyhcXC8pKikrL2c7XG5cbiAgICBpZighdXJsLm1hdGNoKHZSZWdleCkpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGZvcm1hdC4gKEVnLiBkb21haW5bLnN1YmRvbWFpbl0qL2FnZW50L1tvcmdhbmlzYXRpb24vXSphZ2VudElkKVwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBkZXZpZGVyID0gXCIvYWdlbnQvXCI7XG4gICAgbGV0IGRvbWFpbjtcbiAgICBsZXQgYWdlbnRVcmw7XG5cbiAgICBjb25zdCBzcGxpdFBvaW50ID0gdXJsLmluZGV4T2YoZGV2aWRlcik7XG4gICAgaWYoc3BsaXRQb2ludCAhPT0gLTEpe1xuICAgICAgICBkb21haW4gPSB1cmwuc2xpY2UoMCwgc3BsaXRQb2ludCk7XG4gICAgICAgIGFnZW50VXJsID0gdXJsLnNsaWNlKHNwbGl0UG9pbnQrZGV2aWRlci5sZW5ndGgpO1xuICAgIH1cblxuICAgIHJldHVybiB7ZG9tYWluLCBhZ2VudFVybH07XG59XG5cbmZ1bmN0aW9uIHVybEVuZFdpdGhTbGFzaCh1cmwpe1xuXG4gICAgaWYodXJsW3VybC5sZW5ndGggLSAxXSAhPT0gXCIvXCIpe1xuICAgICAgICB1cmwgKz0gXCIvXCI7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVybDtcbn1cblxuY29uc3QgT3dNID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIikuT3dNO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKiBtYWluIEFQSXMgb24gd29ya2luZyB3aXRoIHJlbW90ZSBlbmQgcG9pbnRzICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5mdW5jdGlvbiBQc2tIdHRwQ2xpZW50KHJlbW90ZUVuZFBvaW50LCBhZ2VudFVpZCwgb3B0aW9ucyl7XG4gICAgdmFyIGJhc2VPZlJlbW90ZUVuZFBvaW50ID0gcmVtb3RlRW5kUG9pbnQ7IC8vcmVtb3ZlIGxhc3QgaWRcblxuICAgIHJlbW90ZUVuZFBvaW50ID0gdXJsRW5kV2l0aFNsYXNoKHJlbW90ZUVuZFBvaW50KTtcblxuICAgIC8vZG9tYWluSW5mbyBjb250YWlucyAyIG1lbWJlcnM6IGRvbWFpbiAocHJpdmF0ZVNreSBkb21haW4pIGFuZCBhZ2VudFVybFxuICAgIGNvbnN0IGRvbWFpbkluZm8gPSBleHRyYWN0RG9tYWluQWdlbnREZXRhaWxzKGFnZW50VWlkKTtcbiAgICBsZXQgaG9tZVNlY3VyaXR5Q29udGV4dCA9IGRvbWFpbkluZm8uYWdlbnRVcmw7XG4gICAgbGV0IHJldHVyblJlbW90ZUVuZFBvaW50ID0gcmVtb3RlRW5kUG9pbnQ7XG5cbiAgICBpZihvcHRpb25zICYmIHR5cGVvZiBvcHRpb25zLnJldHVyblJlbW90ZSAhPSBcInVuZGVmaW5lZFwiKXtcbiAgICAgICAgcmV0dXJuUmVtb3RlRW5kUG9pbnQgPSBvcHRpb25zLnJldHVyblJlbW90ZTtcbiAgICB9XG5cbiAgICBpZighb3B0aW9ucyB8fCBvcHRpb25zICYmICh0eXBlb2Ygb3B0aW9ucy51bmlxdWVJZCA9PSBcInVuZGVmaW5lZFwiIHx8IG9wdGlvbnMudW5pcXVlSWQpKXtcbiAgICAgICAgaG9tZVNlY3VyaXR5Q29udGV4dCArPSBcIl9cIitNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSk7XG4gICAgfVxuXG4gICAgcmV0dXJuUmVtb3RlRW5kUG9pbnQgPSB1cmxFbmRXaXRoU2xhc2gocmV0dXJuUmVtb3RlRW5kUG9pbnQpO1xuXG4gICAgdGhpcy5zdGFydFN3YXJtID0gZnVuY3Rpb24oc3dhcm1OYW1lLCBwaGFzZU5hbWUsIC4uLmFyZ3Mpe1xuICAgICAgICBjb25zdCBzd2FybSA9IG5ldyBPd00oKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInN3YXJtSWRcIiwgJCQudWlkR2VuZXJhdG9yLnNhZmVfdXVpZCgpKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInJlcXVlc3RJZFwiLCBzd2FybS5nZXRNZXRhKFwic3dhcm1JZFwiKSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJzd2FybVR5cGVOYW1lXCIsIHN3YXJtTmFtZSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJwaGFzZU5hbWVcIiwgcGhhc2VOYW1lKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImFyZ3NcIiwgYXJncyk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJjb21tYW5kXCIsIFwiZXhlY3V0ZVN3YXJtUGhhc2VcIik7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJ0YXJnZXRcIiwgZG9tYWluSW5mby5hZ2VudFVybCk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIsIHJldHVyblJlbW90ZUVuZFBvaW50KyQkLnJlbW90ZS5iYXNlNjRFbmNvZGUoaG9tZVNlY3VyaXR5Q29udGV4dCkpO1xuXG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0KGdldFJlbW90ZShyZW1vdGVFbmRQb2ludCwgZG9tYWluSW5mby5kb21haW4pLCBtc2dwYWNrLmVuY29kZShzd2FybSksIGZ1bmN0aW9uKGVyciwgcmVzKXtcbiAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuICQkLnJlbW90ZS5yZXF1ZXN0TWFuYWdlci5jcmVhdGVSZXF1ZXN0KHN3YXJtLmdldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIpLCBzd2FybSk7XG4gICAgfTtcblxuICAgIHRoaXMuY29udGludWVTd2FybSA9IGZ1bmN0aW9uKGV4aXN0aW5nU3dhcm0sIHBoYXNlTmFtZSwgLi4uYXJncyl7XG4gICAgICAgIHZhciBzd2FybSA9IG5ldyBPd00oZXhpc3RpbmdTd2FybSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJwaGFzZU5hbWVcIiwgcGhhc2VOYW1lKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImFyZ3NcIiwgYXJncyk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJjb21tYW5kXCIsIFwiZXhlY3V0ZVN3YXJtUGhhc2VcIik7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJ0YXJnZXRcIiwgZG9tYWluSW5mby5hZ2VudFVybCk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIsIHJldHVyblJlbW90ZUVuZFBvaW50KyQkLnJlbW90ZS5iYXNlNjRFbmNvZGUoaG9tZVNlY3VyaXR5Q29udGV4dCkpO1xuXG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0KGdldFJlbW90ZShyZW1vdGVFbmRQb2ludCwgZG9tYWluSW5mby5kb21haW4pLCBtc2dwYWNrLmVuY29kZShzd2FybSksIGZ1bmN0aW9uKGVyciwgcmVzKXtcbiAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vcmV0dXJuICQkLnJlbW90ZS5yZXF1ZXN0TWFuYWdlci5jcmVhdGVSZXF1ZXN0KHN3YXJtLmdldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIpLCBzd2FybSk7XG4gICAgfTtcblxuICAgIHZhciBhbGxDYXRjaEFsbHMgPSBbXTtcbiAgICB2YXIgcmVxdWVzdHNDb3VudGVyID0gMDtcbiAgICBmdW5jdGlvbiBDYXRjaEFsbChzd2FybU5hbWUsIHBoYXNlTmFtZSwgY2FsbGJhY2speyAvL3NhbWUgaW50ZXJmYWNlIGFzIFJlcXVlc3RcbiAgICAgICAgdmFyIHJlcXVlc3RJZCA9IHJlcXVlc3RzQ291bnRlcisrO1xuICAgICAgICB0aGlzLmdldFJlcXVlc3RJZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBsZXQgcmVxSWQgPSBcInN3YXJtTmFtZVwiICsgXCJwaGFzZU5hbWVcIiArIHJlcXVlc3RJZDtcbiAgICAgICAgICAgIHJldHVybiByZXFJZDtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRpc3BhdGNoID0gZnVuY3Rpb24oZXJyLCByZXN1bHQpe1xuICAgICAgICAgICAgcmVzdWx0ID0gT3dNLnByb3RvdHlwZS5jb252ZXJ0KHJlc3VsdCk7XG4gICAgICAgICAgICB2YXIgY3VycmVudFBoYXNlTmFtZSA9IHJlc3VsdC5nZXRNZXRhKFwicGhhc2VOYW1lXCIpO1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRTd2FybU5hbWUgPSByZXN1bHQuZ2V0TWV0YShcInN3YXJtVHlwZU5hbWVcIik7XG4gICAgICAgICAgICBpZigoY3VycmVudFN3YXJtTmFtZSA9PT0gc3dhcm1OYW1lIHx8IHN3YXJtTmFtZSA9PT0gJyonKSAmJiAoY3VycmVudFBoYXNlTmFtZSA9PT0gcGhhc2VOYW1lIHx8IHBoYXNlTmFtZSA9PT0gJyonKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIsIHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy5vbiA9IGZ1bmN0aW9uKHN3YXJtTmFtZSwgcGhhc2VOYW1lLCBjYWxsYmFjayl7XG4gICAgICAgIHZhciBjID0gbmV3IENhdGNoQWxsKHN3YXJtTmFtZSwgcGhhc2VOYW1lLCBjYWxsYmFjayk7XG4gICAgICAgIGFsbENhdGNoQWxscy5wdXNoKHtcbiAgICAgICAgICAgIHM6c3dhcm1OYW1lLFxuICAgICAgICAgICAgcDpwaGFzZU5hbWUsXG4gICAgICAgICAgICBjOmNcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCQucmVtb3RlLnJlcXVlc3RNYW5hZ2VyLnBvbGwoZ2V0UmVtb3RlKHJlbW90ZUVuZFBvaW50LCBkb21haW5JbmZvLmRvbWFpbikgLCBjKTtcbiAgICB9O1xuXG4gICAgdGhpcy5vZmYgPSBmdW5jdGlvbihzd2FybU5hbWUsIHBoYXNlTmFtZSl7XG4gICAgICAgIGFsbENhdGNoQWxscy5mb3JFYWNoKGZ1bmN0aW9uKGNhKXtcbiAgICAgICAgICAgIGlmKChjYS5zID09PSBzd2FybU5hbWUgfHwgc3dhcm1OYW1lID09PSAnKicpICYmIChwaGFzZU5hbWUgPT09IGNhLnAgfHwgcGhhc2VOYW1lID09PSAnKicpKXtcbiAgICAgICAgICAgICAgICAkJC5yZW1vdGUucmVxdWVzdE1hbmFnZXIudW5wb2xsKGdldFJlbW90ZShyZW1vdGVFbmRQb2ludCwgZG9tYWluSW5mby5kb21haW4pLCBjYS5jKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMudXBsb2FkQ1NCID0gZnVuY3Rpb24oY3J5cHRvVWlkLCBiaW5hcnlEYXRhLCBjYWxsYmFjayl7XG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0KGJhc2VPZlJlbW90ZUVuZFBvaW50ICsgXCIvQ1NCL1wiICsgY3J5cHRvVWlkLCBiaW5hcnlEYXRhLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIHRoaXMuZG93bmxvYWRDU0IgPSBmdW5jdGlvbihjcnlwdG9VaWQsIGNhbGxiYWNrKXtcbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cEdldChiYXNlT2ZSZW1vdGVFbmRQb2ludCArIFwiL0NTQi9cIiArIGNyeXB0b1VpZCwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBnZXRSZW1vdGUoYmFzZVVybCwgZG9tYWluKSB7XG4gICAgICAgIHJldHVybiB1cmxFbmRXaXRoU2xhc2goYmFzZVVybCkgKyAkJC5yZW1vdGUuYmFzZTY0RW5jb2RlKGRvbWFpbik7XG4gICAgfVxufVxuXG4vKioqKioqKioqKioqKioqKioqKioqKiBpbml0aWFsaXNhdGlvbiBzdHVmZiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuaWYgKHR5cGVvZiAkJCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICQkID0ge307XG59XG5cbmlmICh0eXBlb2YgICQkLnJlbW90ZSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICQkLnJlbW90ZSA9IHt9O1xuICAgICQkLnJlbW90ZS5jcmVhdGVSZXF1ZXN0TWFuYWdlciA9IGZ1bmN0aW9uKHRpbWVPdXQpe1xuICAgICAgICAkJC5yZW1vdGUucmVxdWVzdE1hbmFnZXIgPSBuZXcgUmVxdWVzdE1hbmFnZXIodGltZU91dCk7XG4gICAgfTtcblxuXG4gICAgJCQucmVtb3RlLmNyeXB0b1Byb3ZpZGVyID0gbnVsbDtcbiAgICAkJC5yZW1vdGUubmV3RW5kUG9pbnQgPSBmdW5jdGlvbihhbGlhcywgcmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBjcnlwdG9JbmZvKXtcbiAgICAgICAgaWYoYWxpYXMgPT09IFwibmV3UmVtb3RlRW5kUG9pbnRcIiB8fCBhbGlhcyA9PT0gXCJyZXF1ZXN0TWFuYWdlclwiIHx8IGFsaWFzID09PSBcImNyeXB0b1Byb3ZpZGVyXCIpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJQc2tIdHRwQ2xpZW50IFVuc2FmZSBhbGlhcyBuYW1lOlwiLCBhbGlhcyk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCQucmVtb3RlW2FsaWFzXSA9IG5ldyBQc2tIdHRwQ2xpZW50KHJlbW90ZUVuZFBvaW50LCBhZ2VudFVpZCwgY3J5cHRvSW5mbyk7XG4gICAgfTtcblxuXG4gICAgJCQucmVtb3RlLmRvSHR0cFBvc3QgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBjYWxsYmFjayl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk92ZXJ3cml0ZSB0aGlzIVwiKTtcbiAgICB9O1xuXG4gICAgJCQucmVtb3RlLmRvSHR0cEdldCA9IGZ1bmN0aW9uIGRvSHR0cEdldCh1cmwsIGNhbGxiYWNrKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3ZlcndyaXRlIHRoaXMhXCIpO1xuICAgIH07XG5cbiAgICAkJC5yZW1vdGUuYmFzZTY0RW5jb2RlID0gZnVuY3Rpb24gYmFzZTY0RW5jb2RlKHN0cmluZ1RvRW5jb2RlKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3ZlcndyaXRlIHRoaXMhXCIpO1xuICAgIH07XG5cbiAgICAkJC5yZW1vdGUuYmFzZTY0RGVjb2RlID0gZnVuY3Rpb24gYmFzZTY0RGVjb2RlKGVuY29kZWRTdHJpbmcpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgdGhpcyFcIik7XG4gICAgfTtcbn1cblxuXG5cbi8qICBpbnRlcmZhY2VcbmZ1bmN0aW9uIENyeXB0b1Byb3ZpZGVyKCl7XG5cbiAgICB0aGlzLmdlbmVyYXRlU2FmZVVpZCA9IGZ1bmN0aW9uKCl7XG5cbiAgICB9XG5cbiAgICB0aGlzLnNpZ25Td2FybSA9IGZ1bmN0aW9uKHN3YXJtLCBhZ2VudCl7XG5cbiAgICB9XG59ICovXG4iLCIkJC5yZW1vdGUuZG9IdHRwUG9zdCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQgJiYgKHhoci5zdGF0dXMgPj0gMjAwICYmIHhoci5zdGF0dXMgPCAzMDApKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0geGhyLnJlc3BvbnNlO1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZih4aHIuc3RhdHVzPj00MDApe1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihcIkFuIGVycm9yIG9jY3VyZWQuIFN0YXR1c0NvZGU6IFwiICsgeGhyLnN0YXR1cykpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgU3RhdHVzIGNvZGUgJHt4aHIuc3RhdHVzfSByZWNlaXZlZCwgcmVzcG9uc2UgaXMgaWdub3JlZC5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB4aHIub3BlbihcIlBPU1RcIiwgdXJsLCB0cnVlKTtcbiAgICAvL3hoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04XCIpO1xuXG4gICAgaWYoZGF0YSAmJiBkYXRhLnBpcGUgJiYgdHlwZW9mIGRhdGEucGlwZSA9PT0gXCJmdW5jdGlvblwiKXtcbiAgICAgICAgY29uc3QgYnVmZmVycyA9IFtdO1xuICAgICAgICBkYXRhLm9uKFwiZGF0YVwiLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBidWZmZXJzLnB1c2goZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgICBkYXRhLm9uKFwiZW5kXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgYWN0dWFsQ29udGVudHMgPSBCdWZmZXIuY29uY2F0KGJ1ZmZlcnMpO1xuICAgICAgICAgICAgeGhyLnNlbmQoYWN0dWFsQ29udGVudHMpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmKEFycmF5QnVmZmVyLmlzVmlldyhkYXRhKSkge1xuICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHhoci5zZW5kKGRhdGEpO1xuICAgIH1cbn07XG5cblxuJCQucmVtb3RlLmRvSHR0cEdldCA9IGZ1bmN0aW9uIGRvSHR0cEdldCh1cmwsIGNhbGxiYWNrKSB7XG5cbiAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvL2NoZWNrIGlmIGhlYWRlcnMgd2VyZSByZWNlaXZlZCBhbmQgaWYgYW55IGFjdGlvbiBzaG91bGQgYmUgcGVyZm9ybWVkIGJlZm9yZSByZWNlaXZpbmcgZGF0YVxuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDIpIHtcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZSA9IHhoci5nZXRSZXNwb25zZUhlYWRlcihcIkNvbnRlbnQtVHlwZVwiKTtcbiAgICAgICAgICAgIGlmIChjb250ZW50VHlwZSA9PT0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIikge1xuICAgICAgICAgICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT0gNCAmJiB4aHIuc3RhdHVzID09IFwiMjAwXCIpIHtcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZSA9IHhoci5nZXRSZXNwb25zZUhlYWRlcihcIkNvbnRlbnQtVHlwZVwiKTtcblxuICAgICAgICAgICAgaWYoY29udGVudFR5cGU9PT1cImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiKXtcbiAgICAgICAgICAgICAgICBsZXQgcmVzcG9uc2VCdWZmZXIgPSBCdWZmZXIuZnJvbSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZUJ1ZmZlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHhoci5yZXNwb25zZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihcIkFuIGVycm9yIG9jY3VyZWQuIFN0YXR1c0NvZGU6IFwiICsgeGhyLnN0YXR1cykpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHhoci5vcGVuKFwiR0VUXCIsIHVybCk7XG4gICAgeGhyLnNlbmQoKTtcbn07XG5cblxuZnVuY3Rpb24gQ3J5cHRvUHJvdmlkZXIoKXtcblxuICAgIHRoaXMuZ2VuZXJhdGVTYWZlVWlkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgbGV0IHVpZCA9IFwiXCI7XG4gICAgICAgIHZhciBhcnJheSA9IG5ldyBVaW50MzJBcnJheSgxMCk7XG4gICAgICAgIHdpbmRvdy5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKGFycmF5KTtcblxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHVpZCArPSBhcnJheVtpXS50b1N0cmluZygxNik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdWlkO1xuICAgIH1cblxuICAgIHRoaXMuc2lnblN3YXJtID0gZnVuY3Rpb24oc3dhcm0sIGFnZW50KXtcbiAgICAgICAgc3dhcm0ubWV0YS5zaWduYXR1cmUgPSBhZ2VudDtcbiAgICB9XG59XG5cblxuXG4kJC5yZW1vdGUuY3J5cHRvUHJvdmlkZXIgPSBuZXcgQ3J5cHRvUHJvdmlkZXIoKTtcblxuJCQucmVtb3RlLmJhc2U2NEVuY29kZSA9IGZ1bmN0aW9uIGJhc2U2NEVuY29kZShzdHJpbmdUb0VuY29kZSl7XG4gICAgcmV0dXJuIHdpbmRvdy5idG9hKHN0cmluZ1RvRW5jb2RlKTtcbn07XG5cbiQkLnJlbW90ZS5iYXNlNjREZWNvZGUgPSBmdW5jdGlvbiBiYXNlNjREZWNvZGUoZW5jb2RlZFN0cmluZyl7XG4gICAgcmV0dXJuIHdpbmRvdy5hdG9iKGVuY29kZWRTdHJpbmcpO1xufTtcbiIsInJlcXVpcmUoXCIuL3Bzay1hYnN0cmFjdC1jbGllbnRcIik7XG5cbmNvbnN0IGh0dHAgPSByZXF1aXJlKFwiaHR0cFwiKTtcbmNvbnN0IGh0dHBzID0gcmVxdWlyZShcImh0dHBzXCIpO1xuY29uc3QgVVJMID0gcmVxdWlyZShcInVybFwiKTtcbmNvbnN0IHVzZXJBZ2VudCA9ICdQU0sgTm9kZUFnZW50LzAuMC4xJztcblxuY29uc29sZS5sb2coXCJQU0sgbm9kZSBjbGllbnQgbG9hZGluZ1wiKTtcblxuZnVuY3Rpb24gZ2V0TmV0d29ya0Zvck9wdGlvbnMob3B0aW9ucykge1xuXHRpZihvcHRpb25zLnByb3RvY29sID09PSAnaHR0cDonKSB7XG5cdFx0cmV0dXJuIGh0dHA7XG5cdH0gZWxzZSBpZihvcHRpb25zLnByb3RvY29sID09PSAnaHR0cHM6Jykge1xuXHRcdHJldHVybiBodHRwcztcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYENhbid0IGhhbmRsZSBwcm90b2NvbCAke29wdGlvbnMucHJvdG9jb2x9YCk7XG5cdH1cblxufVxuXG4kJC5yZW1vdGUuZG9IdHRwUG9zdCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGNhbGxiYWNrKXtcblx0Y29uc3QgaW5uZXJVcmwgPSBVUkwucGFyc2UodXJsKTtcblxuXHRjb25zdCBvcHRpb25zID0ge1xuXHRcdGhvc3RuYW1lOiBpbm5lclVybC5ob3N0bmFtZSxcblx0XHRwYXRoOiBpbm5lclVybC5wYXRobmFtZSxcblx0XHRwb3J0OiBwYXJzZUludChpbm5lclVybC5wb3J0KSxcblx0XHRoZWFkZXJzOiB7XG5cdFx0XHQnVXNlci1BZ2VudCc6IHVzZXJBZ2VudFxuXHRcdH0sXG5cdFx0bWV0aG9kOiAnUE9TVCdcblx0fTtcblxuXHRjb25zdCBuZXR3b3JrID0gZ2V0TmV0d29ya0Zvck9wdGlvbnMoaW5uZXJVcmwpO1xuXG5cdGlmKEFycmF5QnVmZmVyLmlzVmlldyhkYXRhKSB8fCBCdWZmZXIuaXNCdWZmZXIoZGF0YSkpIHtcblx0XHRpZighQnVmZmVyLmlzQnVmZmVyKGRhdGEpKSB7XG5cdFx0XHRkYXRhID0gQnVmZmVyLmZyb20oZGF0YSk7XG5cdFx0fVxuXG5cdFx0b3B0aW9ucy5oZWFkZXJzWydDb250ZW50LVR5cGUnXSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nO1xuXHRcdG9wdGlvbnMuaGVhZGVyc1snQ29udGVudC1MZW5ndGgnXSA9IGRhdGEubGVuZ3RoO1xuXHR9XG5cblx0Y29uc3QgcmVxID0gbmV0d29yay5yZXF1ZXN0KG9wdGlvbnMsIChyZXMpID0+IHtcblx0XHRjb25zdCB7IHN0YXR1c0NvZGUgfSA9IHJlcztcblxuXHRcdGxldCBlcnJvcjtcblx0XHRpZiAoc3RhdHVzQ29kZSA+PSA0MDApIHtcblx0XHRcdGVycm9yID0gbmV3IEVycm9yKCdSZXF1ZXN0IEZhaWxlZC5cXG4nICtcblx0XHRcdFx0YFN0YXR1cyBDb2RlOiAke3N0YXR1c0NvZGV9YCk7XG5cdFx0fVxuXG5cdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRjYWxsYmFjayhlcnJvcik7XG5cdFx0XHQvLyBmcmVlIHVwIG1lbW9yeVxuXHRcdFx0cmVzLnJlc3VtZSgpO1xuXHRcdFx0cmV0dXJuIDtcblx0XHR9XG5cblx0XHRsZXQgcmF3RGF0YSA9ICcnO1xuXHRcdHJlcy5vbignZGF0YScsIChjaHVuaykgPT4geyByYXdEYXRhICs9IGNodW5rOyB9KTtcblx0XHRyZXMub24oJ2VuZCcsICgpID0+IHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCByYXdEYXRhKTtcblx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSkub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coXCJQT1NUIEVycm9yXCIsIGVycm9yKTtcblx0XHRjYWxsYmFjayhlcnJvcik7XG5cdH0pO1xuXG4gICAgaWYoZGF0YSAmJiBkYXRhLnBpcGUgJiYgdHlwZW9mIGRhdGEucGlwZSA9PT0gXCJmdW5jdGlvblwiKXtcbiAgICAgICAgZGF0YS5waXBlKHJlcSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZih0eXBlb2YgZGF0YSAhPT0gJ3N0cmluZycgJiYgIUJ1ZmZlci5pc0J1ZmZlcihkYXRhKSAmJiAhQXJyYXlCdWZmZXIuaXNWaWV3KGRhdGEpKSB7XG5cdFx0ZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuXHR9XG5cblx0cmVxLndyaXRlKGRhdGEpO1xuXHRyZXEuZW5kKCk7XG59O1xuXG4kJC5yZW1vdGUuZG9IdHRwR2V0ID0gZnVuY3Rpb24gZG9IdHRwR2V0KHVybCwgY2FsbGJhY2spe1xuICAgIGNvbnN0IGlubmVyVXJsID0gVVJMLnBhcnNlKHVybCk7XG5cblx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRob3N0bmFtZTogaW5uZXJVcmwuaG9zdG5hbWUsXG5cdFx0cGF0aDogaW5uZXJVcmwucGF0aG5hbWUgKyAoaW5uZXJVcmwuc2VhcmNoIHx8ICcnKSxcblx0XHRwb3J0OiBwYXJzZUludChpbm5lclVybC5wb3J0KSxcblx0XHRoZWFkZXJzOiB7XG5cdFx0XHQnVXNlci1BZ2VudCc6IHVzZXJBZ2VudFxuXHRcdH0sXG5cdFx0bWV0aG9kOiAnR0VUJ1xuXHR9O1xuXG5cdGNvbnN0IG5ldHdvcmsgPSBnZXROZXR3b3JrRm9yT3B0aW9ucyhpbm5lclVybCk7XG5cblx0Y29uc3QgcmVxID0gbmV0d29yay5yZXF1ZXN0KG9wdGlvbnMsIChyZXMpID0+IHtcblx0XHRjb25zdCB7IHN0YXR1c0NvZGUgfSA9IHJlcztcblxuXHRcdGxldCBlcnJvcjtcblx0XHRpZiAoc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG5cdFx0XHRlcnJvciA9IG5ldyBFcnJvcignUmVxdWVzdCBGYWlsZWQuXFxuJyArXG5cdFx0XHRcdGBTdGF0dXMgQ29kZTogJHtzdGF0dXNDb2RlfWApO1xuXHRcdFx0ZXJyb3IuY29kZSA9IHN0YXR1c0NvZGU7XG5cdFx0fVxuXG5cdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRjYWxsYmFjayhlcnJvcik7XG5cdFx0XHQvLyBmcmVlIHVwIG1lbW9yeVxuXHRcdFx0cmVzLnJlc3VtZSgpO1xuXHRcdFx0cmV0dXJuIDtcblx0XHR9XG5cblx0XHRsZXQgcmF3RGF0YTtcblx0XHRjb25zdCBjb250ZW50VHlwZSA9IHJlcy5oZWFkZXJzWydjb250ZW50LXR5cGUnXTtcblxuXHRcdGlmKGNvbnRlbnRUeXBlID09PSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiKXtcblx0XHRcdHJhd0RhdGEgPSBbXTtcblx0XHR9ZWxzZXtcblx0XHRcdHJhd0RhdGEgPSAnJztcblx0XHR9XG5cblx0XHRyZXMub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcblx0XHRcdGlmKEFycmF5LmlzQXJyYXkocmF3RGF0YSkpe1xuXHRcdFx0XHRyYXdEYXRhLnB1c2goLi4uY2h1bmspO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHJhd0RhdGEgKz0gY2h1bms7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmVzLm9uKCdlbmQnLCAoKSA9PiB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRpZihBcnJheS5pc0FycmF5KHJhd0RhdGEpKXtcblx0XHRcdFx0XHRyYXdEYXRhID0gQnVmZmVyLmZyb20ocmF3RGF0YSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIHJhd0RhdGEpO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiQ2xpZW50IGVycm9yOlwiLCBlcnIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcblxuXHRyZXEub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcblx0XHRpZihlcnJvciAmJiBlcnJvci5jb2RlICE9PSAnRUNPTk5SRVNFVCcpe1xuICAgICAgICBcdGNvbnNvbGUubG9nKFwiR0VUIEVycm9yXCIsIGVycm9yKTtcblx0XHR9XG5cblx0XHRjYWxsYmFjayhlcnJvcik7XG5cdH0pO1xuXG5cdHJlcS5lbmQoKTtcbn07XG5cbiQkLnJlbW90ZS5iYXNlNjRFbmNvZGUgPSBmdW5jdGlvbiBiYXNlNjRFbmNvZGUoc3RyaW5nVG9FbmNvZGUpe1xuICAgIHJldHVybiBCdWZmZXIuZnJvbShzdHJpbmdUb0VuY29kZSkudG9TdHJpbmcoJ2Jhc2U2NCcpO1xufTtcblxuJCQucmVtb3RlLmJhc2U2NERlY29kZSA9IGZ1bmN0aW9uIGJhc2U2NERlY29kZShlbmNvZGVkU3RyaW5nKXtcbiAgICByZXR1cm4gQnVmZmVyLmZyb20oZW5jb2RlZFN0cmluZywgJ2Jhc2U2NCcpLnRvU3RyaW5nKCdhc2NpaScpO1xufTtcbiIsImNvbnN0IGNvbnNVdGlsID0gcmVxdWlyZSgnc2lnbnNlbnN1cycpLmNvbnNVdGlsO1xuY29uc3QgYmVlc0hlYWxlciA9IHJlcXVpcmUoXCJzd2FybXV0aWxzXCIpLmJlZXNIZWFsZXI7XG5cbmZ1bmN0aW9uIEJsb2NrY2hhaW4ocGRzKSB7XG4gICAgbGV0IHN3YXJtID0gbnVsbDtcblxuICAgIHRoaXMuYmVnaW5UcmFuc2FjdGlvbiA9IGZ1bmN0aW9uICh0cmFuc2FjdGlvblN3YXJtKSB7XG4gICAgICAgIGlmICghdHJhbnNhY3Rpb25Td2FybSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHN3YXJtJyk7XG4gICAgICAgIH1cblxuICAgICAgICBzd2FybSA9IHRyYW5zYWN0aW9uU3dhcm07XG4gICAgICAgIHJldHVybiBuZXcgVHJhbnNhY3Rpb24ocGRzLmdldEhhbmRsZXIoKSk7XG4gICAgfTtcblxuICAgIHRoaXMuY29tbWl0ID0gZnVuY3Rpb24gKHRyYW5zYWN0aW9uKSB7XG5cbiAgICAgICAgY29uc3QgZGlmZiA9IHBkcy5jb21wdXRlU3dhcm1UcmFuc2FjdGlvbkRpZmYoc3dhcm0sIHRyYW5zYWN0aW9uLmdldEhhbmRsZXIoKSk7XG4gICAgICAgIGNvbnN0IHQgPSBjb25zVXRpbC5jcmVhdGVUcmFuc2FjdGlvbigwLCBkaWZmKTtcbiAgICAgICAgY29uc3Qgc2V0ID0ge307XG4gICAgICAgIHNldFt0LmRpZ2VzdF0gPSB0O1xuICAgICAgICBwZHMuY29tbWl0KHNldCwgMSk7XG4gICAgfTtcbn1cblxuXG5mdW5jdGlvbiBUcmFuc2FjdGlvbihwZHNIYW5kbGVyKSB7XG4gICAgY29uc3QgQUxJQVNFUyA9ICcvYWxpYXNlcyc7XG5cblxuICAgIHRoaXMuYWRkID0gZnVuY3Rpb24gKGFzc2V0KSB7XG4gICAgICAgIGNvbnN0IHN3YXJtVHlwZU5hbWUgPSBhc3NldC5nZXRNZXRhZGF0YSgnc3dhcm1UeXBlTmFtZScpO1xuICAgICAgICBjb25zdCBzd2FybUlkID0gYXNzZXQuZ2V0TWV0YWRhdGEoJ3N3YXJtSWQnKTtcblxuICAgICAgICBjb25zdCBhbGlhc0luZGV4ID0gbmV3IEFsaWFzSW5kZXgoc3dhcm1UeXBlTmFtZSk7XG4gICAgICAgIGlmIChhc3NldC5hbGlhcyAmJiBhbGlhc0luZGV4LmdldFVpZChhc3NldC5hbGlhcykgIT09IHN3YXJtSWQpIHtcbiAgICAgICAgICAgIGFsaWFzSW5kZXguY3JlYXRlKGFzc2V0LmFsaWFzLCBzd2FybUlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFzc2V0LnNldE1ldGFkYXRhKCdwZXJzaXN0ZWQnLCB0cnVlKTtcbiAgICAgICAgY29uc3Qgc2VyaWFsaXplZFN3YXJtID0gYmVlc0hlYWxlci5hc0pTT04oYXNzZXQsIG51bGwsIG51bGwpO1xuXG4gICAgICAgIHBkc0hhbmRsZXIud3JpdGVLZXkoc3dhcm1UeXBlTmFtZSArICcvJyArIHN3YXJtSWQsIEooc2VyaWFsaXplZFN3YXJtKSk7XG4gICAgfTtcblxuICAgIHRoaXMubG9va3VwID0gZnVuY3Rpb24gKGFzc2V0VHlwZSwgYWlkKSB7IC8vIGFsaWFzIHNhdSBpZFxuICAgICAgICBsZXQgbG9jYWxVaWQgPSBhaWQ7XG5cbiAgICAgICAgaWYgKGhhc0FsaWFzZXMoYXNzZXRUeXBlKSkge1xuICAgICAgICAgICAgY29uc3QgYWxpYXNJbmRleCA9IG5ldyBBbGlhc0luZGV4KGFzc2V0VHlwZSk7XG4gICAgICAgICAgICBsb2NhbFVpZCA9IGFsaWFzSW5kZXguZ2V0VWlkKGFpZCkgfHwgYWlkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdmFsdWUgPSBwZHNIYW5kbGVyLnJlYWRLZXkoYXNzZXRUeXBlICsgJy8nICsgbG9jYWxVaWQpO1xuXG4gICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiAkJC5hc3NldC5zdGFydChhc3NldFR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3Qgc3dhcm0gPSAkJC5hc3NldC5jb250aW51ZShhc3NldFR5cGUsIEpTT04ucGFyc2UodmFsdWUpKTtcbiAgICAgICAgICAgIHN3YXJtLnNldE1ldGFkYXRhKFwicGVyc2lzdGVkXCIsIHRydWUpO1xuICAgICAgICAgICAgcmV0dXJuIHN3YXJtO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMubG9hZEFzc2V0cyA9IGZ1bmN0aW9uIChhc3NldFR5cGUpIHtcbiAgICAgICAgY29uc3QgYXNzZXRzID0gW107XG5cbiAgICAgICAgY29uc3QgYWxpYXNJbmRleCA9IG5ldyBBbGlhc0luZGV4KGFzc2V0VHlwZSk7XG4gICAgICAgIE9iamVjdC5rZXlzKGFsaWFzSW5kZXguZ2V0QWxpYXNlcygpKS5mb3JFYWNoKChhbGlhcykgPT4ge1xuICAgICAgICAgICAgYXNzZXRzLnB1c2godGhpcy5sb29rdXAoYXNzZXRUeXBlLCBhbGlhcykpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gYXNzZXRzO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEhhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBwZHNIYW5kbGVyO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNBbGlhc2VzKHNwYWNlTmFtZSkge1xuICAgICAgICByZXR1cm4gISFwZHNIYW5kbGVyLnJlYWRLZXkoc3BhY2VOYW1lICsgQUxJQVNFUyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gQWxpYXNJbmRleChhc3NldFR5cGUpIHtcbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoYWxpYXMsIHVpZCkge1xuICAgICAgICAgICAgY29uc3QgYXNzZXRBbGlhc2VzID0gdGhpcy5nZXRBbGlhc2VzKCk7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXNzZXRBbGlhc2VzW2FsaWFzXSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICQkLmVycm9ySGFuZGxlci50aHJvd0Vycm9yKG5ldyBFcnJvcihgQWxpYXMgJHthbGlhc30gZm9yIGFzc2V0cyBvZiB0eXBlICR7YXNzZXRUeXBlfSBhbHJlYWR5IGV4aXN0c2ApKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXNzZXRBbGlhc2VzW2FsaWFzXSA9IHVpZDtcblxuICAgICAgICAgICAgcGRzSGFuZGxlci53cml0ZUtleShhc3NldFR5cGUgKyBBTElBU0VTLCBKKGFzc2V0QWxpYXNlcykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0VWlkID0gZnVuY3Rpb24gKGFsaWFzKSB7XG4gICAgICAgICAgICBjb25zdCBhc3NldEFsaWFzZXMgPSB0aGlzLmdldEFsaWFzZXMoKTtcbiAgICAgICAgICAgIHJldHVybiBhc3NldEFsaWFzZXNbYWxpYXNdO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0QWxpYXNlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxldCBhbGlhc2VzID0gcGRzSGFuZGxlci5yZWFkS2V5KGFzc2V0VHlwZSArIEFMSUFTRVMpO1xuICAgICAgICAgICAgcmV0dXJuIGFsaWFzZXMgPyBKU09OLnBhcnNlKGFsaWFzZXMpIDoge307XG4gICAgICAgIH07XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJsb2NrY2hhaW47IiwidmFyIG1lbW9yeVBEUyA9IHJlcXVpcmUoXCIuL0luTWVtb3J5UERTXCIpO1xudmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xudmFyIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcblxuXG5mdW5jdGlvbiBGb2xkZXJQZXJzaXN0ZW50UERTKGZvbGRlcikge1xuICAgIHRoaXMubWVtQ2FjaGUgPSBtZW1vcnlQRFMubmV3UERTKHRoaXMpO1xuXG4gICAgZnVuY3Rpb24gbWtTaW5nbGVMaW5lKHN0cikge1xuICAgICAgICByZXR1cm4gc3RyLnJlcGxhY2UoL1tcXG5cXHJdL2csIFwiXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VDdXJyZW50VmFsdWVGaWxlbmFtZSgpIHtcbiAgICAgICAgcmV0dXJuIHBhdGgubm9ybWFsaXplKGZvbGRlciArICcvY3VycmVudFZlcnNpb24nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRDdXJyZW50VmFsdWUocGF0aCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYoIWZzLmV4aXN0c1N5bmMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhdGgpLnRvU3RyaW5nKCkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZXJyb3IgJywgZSk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucGVyc2lzdCA9IGZ1bmN0aW9uICh0cmFuc2FjdGlvbkxvZywgY3VycmVudFZhbHVlcywgY3VycmVudFB1bHNlKSB7XG5cbiAgICAgICAgdHJhbnNhY3Rpb25Mb2cuY3VycmVudFB1bHNlID0gY3VycmVudFB1bHNlO1xuICAgICAgICB0cmFuc2FjdGlvbkxvZyA9IG1rU2luZ2xlTGluZShKU09OLnN0cmluZ2lmeSh0cmFuc2FjdGlvbkxvZykpICsgXCJcXG5cIjtcblxuICAgICAgICBmcy5ta2Rpcihmb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCBmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAgICAgICAgIGlmIChlcnIgJiYgZXJyLmNvZGUgIT09IFwiRUVYSVNUXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZzLmFwcGVuZEZpbGVTeW5jKGZvbGRlciArICcvdHJhbnNhY3Rpb25zTG9nJywgdHJhbnNhY3Rpb25Mb2csICd1dGY4Jyk7XG4gICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKG1ha2VDdXJyZW50VmFsdWVGaWxlbmFtZSgpLCBKU09OLnN0cmluZ2lmeShjdXJyZW50VmFsdWVzLCBudWxsLCAxKSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBjb25zdCBpbm5lclZhbHVlcyA9IGdldEN1cnJlbnRWYWx1ZShtYWtlQ3VycmVudFZhbHVlRmlsZW5hbWUoKSk7XG4gICAgdGhpcy5tZW1DYWNoZS5pbml0aWFsaXNlKGlubmVyVmFsdWVzKTtcbn1cblxuZXhwb3J0cy5uZXdQRFMgPSBmdW5jdGlvbiAoZm9sZGVyKSB7XG4gICAgY29uc3QgcGRzID0gbmV3IEZvbGRlclBlcnNpc3RlbnRQRFMoZm9sZGVyKTtcbiAgICByZXR1cm4gcGRzLm1lbUNhY2hlO1xufTtcbiIsIlxudmFyIGN1dGlsICAgPSByZXF1aXJlKFwiLi4vLi4vc2lnbnNlbnN1cy9saWIvY29uc1V0aWxcIik7XG52YXIgc3N1dGlsICA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5cblxuZnVuY3Rpb24gU3RvcmFnZShwYXJlbnRTdG9yYWdlKXtcbiAgICB2YXIgY3NldCAgICAgICAgICAgID0ge307ICAvLyBjb250YWluZXMgYWxsIGtleXMgaW4gcGFyZW50IHN0b3JhZ2UsIGNvbnRhaW5zIG9ubHkga2V5cyB0b3VjaGVkIGluIGhhbmRsZXJzXG4gICAgdmFyIHdyaXRlU2V0ICAgICAgICA9ICFwYXJlbnRTdG9yYWdlID8gY3NldCA6IHt9OyAgIC8vY29udGFpbnMgb25seSBrZXlzIG1vZGlmaWVkIGluIGhhbmRsZXJzXG5cbiAgICB2YXIgcmVhZFNldFZlcnNpb25zICA9IHt9OyAvL21lYW5pbmdmdWwgb25seSBpbiBoYW5kbGVyc1xuICAgIHZhciB3cml0ZVNldFZlcnNpb25zID0ge307IC8vd2lsbCBzdG9yZSBhbGwgdmVyc2lvbnMgZ2VuZXJhdGVkIGJ5IHdyaXRlS2V5XG5cbiAgICB2YXIgdnNkICAgICAgICAgICAgID0gXCJlbXB0eVwiOyAvL29ubHkgZm9yIHBhcmVudCBzdG9yYWdlXG4gICAgdmFyIHByZXZpb3VzVlNEICAgICA9IG51bGw7XG5cbiAgICB2YXIgbXlDdXJyZW50UHVsc2UgICAgPSAwO1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuXG4gICAgZnVuY3Rpb24gaGFzTG9jYWxLZXkobmFtZSl7XG4gICAgICAgIHJldHVybiBjc2V0Lmhhc093blByb3BlcnR5KG5hbWUpO1xuICAgIH1cblxuICAgIHRoaXMuaGFzS2V5ID0gZnVuY3Rpb24obmFtZSl7XG4gICAgICAgIHJldHVybiBwYXJlbnRTdG9yYWdlID8gcGFyZW50U3RvcmFnZS5oYXNLZXkobmFtZSkgOiBoYXNMb2NhbEtleShuYW1lKTtcbiAgICB9O1xuXG4gICAgdGhpcy5yZWFkS2V5ID0gZnVuY3Rpb24gcmVhZEtleShuYW1lKXtcbiAgICAgICAgdmFyIHZhbHVlO1xuICAgICAgICBpZihoYXNMb2NhbEtleShuYW1lKSl7XG4gICAgICAgICAgICB2YWx1ZSA9IGNzZXRbbmFtZV07XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgaWYodGhpcy5oYXNLZXkobmFtZSkpe1xuICAgICAgICAgICAgICAgIHZhbHVlID0gcGFyZW50U3RvcmFnZS5yZWFkS2V5KG5hbWUpO1xuICAgICAgICAgICAgICAgIGNzZXRbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICByZWFkU2V0VmVyc2lvbnNbbmFtZV0gPSBwYXJlbnRTdG9yYWdlLmdldFZlcnNpb24obmFtZSk7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICBjc2V0W25hbWVdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJlYWRTZXRWZXJzaW9uc1tuYW1lXSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3cml0ZVNldFZlcnNpb25zW25hbWVdID0gcmVhZFNldFZlcnNpb25zW25hbWVdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRWZXJzaW9uID0gZnVuY3Rpb24obmFtZSwgcmVhbFZlcnNpb24pe1xuICAgICAgICB2YXIgdmVyc2lvbiA9IDA7XG4gICAgICAgIGlmKGhhc0xvY2FsS2V5KG5hbWUpKXtcbiAgICAgICAgICAgIHZlcnNpb24gPSByZWFkU2V0VmVyc2lvbnNbbmFtZV07XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgaWYodGhpcy5oYXNLZXkobmFtZSkpe1xuICAgICAgICAgICAgICAgIGNzZXRbbmFtZV0gPSBwYXJlbnRTdG9yYWdlLnJlYWRLZXkoKTtcbiAgICAgICAgICAgICAgICB2ZXJzaW9uID0gcmVhZFNldFZlcnNpb25zW25hbWVdID0gcGFyZW50U3RvcmFnZS5nZXRWZXJzaW9uKG5hbWUpO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgY3NldFtuYW1lXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZWFkU2V0VmVyc2lvbnNbbmFtZV0gPSB2ZXJzaW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2ZXJzaW9uO1xuICAgIH07XG5cbiAgICB0aGlzLndyaXRlS2V5ID0gZnVuY3Rpb24gbW9kaWZ5S2V5KG5hbWUsIHZhbHVlKXtcbiAgICAgICAgdmFyIGsgPSB0aGlzLnJlYWRLZXkobmFtZSk7IC8vVE9ETzogdW51c2VkIHZhclxuXG4gICAgICAgIGNzZXQgW25hbWVdID0gdmFsdWU7XG4gICAgICAgIHdyaXRlU2V0VmVyc2lvbnNbbmFtZV0rKztcbiAgICAgICAgd3JpdGVTZXRbbmFtZV0gPSB2YWx1ZTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRJbnB1dE91dHB1dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlucHV0OiByZWFkU2V0VmVyc2lvbnMsXG4gICAgICAgICAgICBvdXRwdXQ6IHdyaXRlU2V0XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0SW50ZXJuYWxWYWx1ZXMgPSBmdW5jdGlvbihjdXJyZW50UHVsc2UsIHVwZGF0ZVByZXZpb3VzVlNEKXtcbiAgICAgICAgaWYodXBkYXRlUHJldmlvdXNWU0Qpe1xuICAgICAgICAgICAgbXlDdXJyZW50UHVsc2UgPSBjdXJyZW50UHVsc2U7XG4gICAgICAgICAgICBwcmV2aW91c1ZTRCA9IHZzZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY3NldDpjc2V0LFxuICAgICAgICAgICAgd3JpdGVTZXRWZXJzaW9uczp3cml0ZVNldFZlcnNpb25zLFxuICAgICAgICAgICAgcHJldmlvdXNWU0Q6cHJldmlvdXNWU0QsXG4gICAgICAgICAgICB2c2Q6dnNkLFxuICAgICAgICAgICAgY3VycmVudFB1bHNlOmN1cnJlbnRQdWxzZVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB0aGlzLmluaXRpYWxpc2VJbnRlcm5hbFZhbHVlID0gZnVuY3Rpb24oc3RvcmVkVmFsdWVzKXtcbiAgICAgICAgaWYoIXN0b3JlZFZhbHVlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY3NldCA9IHN0b3JlZFZhbHVlcy5jc2V0O1xuICAgICAgICB3cml0ZVNldFZlcnNpb25zID0gc3RvcmVkVmFsdWVzLndyaXRlU2V0VmVyc2lvbnM7XG4gICAgICAgIHZzZCA9IHN0b3JlZFZhbHVlcy52c2Q7XG4gICAgICAgIHdyaXRlU2V0ID0gY3NldDtcbiAgICAgICAgbXlDdXJyZW50UHVsc2UgPSBzdG9yZWRWYWx1ZXMuY3VycmVudFB1bHNlO1xuICAgICAgICBwcmV2aW91c1ZTRCA9IHN0b3JlZFZhbHVlcy5wcmV2aW91c1ZTRDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gYXBwbHlUcmFuc2FjdGlvbih0KXtcbiAgICAgICAgZm9yKGxldCBrIGluIHQub3V0cHV0KXsgXG4gICAgICAgICAgICBpZighdC5pbnB1dC5oYXNPd25Qcm9wZXJ0eShrKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvcihsZXQgbCBpbiB0LmlucHV0KXtcbiAgICAgICAgICAgIHZhciB0cmFuc2FjdGlvblZlcnNpb24gPSB0LmlucHV0W2xdO1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRWZXJzaW9uID0gc2VsZi5nZXRWZXJzaW9uKGwpO1xuICAgICAgICAgICAgaWYodHJhbnNhY3Rpb25WZXJzaW9uICE9PSBjdXJyZW50VmVyc2lvbil7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhsLCB0cmFuc2FjdGlvblZlcnNpb24gLCBjdXJyZW50VmVyc2lvbik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yKGxldCB2IGluIHQub3V0cHV0KXtcbiAgICAgICAgICAgIHNlbGYud3JpdGVLZXkodiwgdC5vdXRwdXRbdl0pO1xuICAgICAgICB9XG5cblx0XHR2YXIgYXJyID0gcHJvY2Vzcy5ocnRpbWUoKTtcblx0XHR2YXIgY3VycmVudF9zZWNvbmQgPSBhcnJbMF07XG5cdFx0dmFyIGRpZmYgPSBjdXJyZW50X3NlY29uZC10LnNlY29uZDtcblxuXHRcdGdsb2JhbFtcIlRyYW56YWN0aW9uc19UaW1lXCJdKz1kaWZmO1xuXG5cdFx0cmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5jb21wdXRlUFRCbG9jayA9IGZ1bmN0aW9uKG5leHRCbG9ja1NldCl7ICAgLy9tYWtlIGEgdHJhbnNhY3Rpb25zIGJsb2NrIGZyb20gbmV4dEJsb2NrU2V0IGJ5IHJlbW92aW5nIGludmFsaWQgdHJhbnNhY3Rpb25zIGZyb20gdGhlIGtleSB2ZXJzaW9ucyBwb2ludCBvZiB2aWV3XG4gICAgICAgIHZhciB2YWxpZEJsb2NrID0gW107XG4gICAgICAgIHZhciBvcmRlcmVkQnlUaW1lID0gY3V0aWwub3JkZXJUcmFuc2FjdGlvbnMobmV4dEJsb2NrU2V0KTtcbiAgICAgICAgdmFyIGkgPSAwO1xuXG4gICAgICAgIHdoaWxlKGkgPCBvcmRlcmVkQnlUaW1lLmxlbmd0aCl7XG4gICAgICAgICAgICB2YXIgdCA9IG9yZGVyZWRCeVRpbWVbaV07XG4gICAgICAgICAgICBpZihhcHBseVRyYW5zYWN0aW9uKHQpKXtcbiAgICAgICAgICAgICAgICB2YWxpZEJsb2NrLnB1c2godC5kaWdlc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWxpZEJsb2NrO1xuICAgIH07XG5cbiAgICB0aGlzLmNvbW1pdCA9IGZ1bmN0aW9uKGJsb2NrU2V0KXtcbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICB2YXIgb3JkZXJlZEJ5VGltZSA9IGN1dGlsLm9yZGVyVHJhbnNhY3Rpb25zKGJsb2NrU2V0KTtcblxuICAgICAgICB3aGlsZShpIDwgb3JkZXJlZEJ5VGltZS5sZW5ndGgpe1xuICAgICAgICAgICAgdmFyIHQgPSBvcmRlcmVkQnlUaW1lW2ldO1xuICAgICAgICAgICAgaWYoIWFwcGx5VHJhbnNhY3Rpb24odCkpeyAvL3BhcmFub2lkIGNoZWNrLCAgZmFpbCB0byB3b3JrIGlmIGEgbWFqb3JpdHkgaXMgY29ycnVwdGVkXG4gICAgICAgICAgICAgICAgLy9wcmV0dHkgYmFkXG4gICAgICAgICAgICAgICAgLy90aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY29tbWl0IGFuIGludmFsaWQgYmxvY2suIFRoaXMgY291bGQgYmUgYSBuYXN0eSBidWcgb3IgdGhlIHN0YWtlaG9sZGVycyBtYWpvcml0eSBpcyBjb3JydXB0ZWQhIEl0IHNob3VsZCBuZXZlciBoYXBwZW4hXCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRmFpbGVkIHRvIGNvbW1pdCBhbiBpbnZhbGlkIGJsb2NrLiBUaGlzIGNvdWxkIGJlIGEgbmFzdHkgYnVnIG9yIHRoZSBzdGFrZWhvbGRlcnMgbWFqb3JpdHkgaXMgY29ycnVwdGVkISBJdCBzaG91bGQgbmV2ZXIgaGFwcGVuIVwiKTsgLy9UT0RPOiByZXBsYWNlIHdpdGggYmV0dGVyIGVycm9yIGhhbmRsaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5nZXRWU0QodHJ1ZSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VlNEID0gZnVuY3Rpb24oZm9yY2VDYWxjdWxhdGlvbil7XG4gICAgICAgIGlmKGZvcmNlQ2FsY3VsYXRpb24pe1xuICAgICAgICAgICAgdmFyIHRtcCA9IHRoaXMuZ2V0SW50ZXJuYWxWYWx1ZXMobXlDdXJyZW50UHVsc2UsIHRydWUpO1xuICAgICAgICAgICAgdnNkID0gc3N1dGlsLmhhc2hWYWx1ZXModG1wKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdnNkO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIEluTWVtb3J5UERTKHBlcm1hbmVudFBlcnNpc3RlbmNlKXtcblxuICAgIHZhciBtYWluU3RvcmFnZSA9IG5ldyBTdG9yYWdlKG51bGwpO1xuXG5cbiAgICB0aGlzLmdldEhhbmRsZXIgPSBmdW5jdGlvbigpeyAvLyBhIHdheSB0byB3b3JrIHdpdGggUERTXG4gICAgICAgIHZhciB0ZW1wU3RvcmFnZSA9IG5ldyBTdG9yYWdlKG1haW5TdG9yYWdlKTtcbiAgICAgICAgcmV0dXJuIHRlbXBTdG9yYWdlO1xuICAgIH07XG5cbiAgICB0aGlzLmNvbXB1dGVTd2FybVRyYW5zYWN0aW9uRGlmZiA9IGZ1bmN0aW9uKHN3YXJtLCBmb3JrZWRQZHMpe1xuICAgICAgICB2YXIgaW5wT3V0cCAgICAgPSBmb3JrZWRQZHMuZ2V0SW5wdXRPdXRwdXQoKTtcbiAgICAgICAgc3dhcm0uaW5wdXQgICAgID0gaW5wT3V0cC5pbnB1dDtcbiAgICAgICAgc3dhcm0ub3V0cHV0ICAgID0gaW5wT3V0cC5vdXRwdXQ7XG4gICAgICAgIHJldHVybiBzd2FybTtcbiAgICB9O1xuXG4gICAgdGhpcy5jb21wdXRlUFRCbG9jayA9IGZ1bmN0aW9uKG5leHRCbG9ja1NldCl7XG4gICAgICAgIHZhciB0ZW1wU3RvcmFnZSA9IG5ldyBTdG9yYWdlKG1haW5TdG9yYWdlKTtcbiAgICAgICAgcmV0dXJuIHRlbXBTdG9yYWdlLmNvbXB1dGVQVEJsb2NrKG5leHRCbG9ja1NldCk7XG5cbiAgICB9O1xuXG4gICAgdGhpcy5jb21taXQgPSBmdW5jdGlvbihibG9ja1NldCwgY3VycmVudFB1bHNlKXtcbiAgICAgICAgbWFpblN0b3JhZ2UuY29tbWl0KGJsb2NrU2V0KTtcbiAgICAgICAgaWYocGVybWFuZW50UGVyc2lzdGVuY2UpIHtcbiAgICAgICAgICAgIHBlcm1hbmVudFBlcnNpc3RlbmNlLnBlcnNpc3QoYmxvY2tTZXQsIG1haW5TdG9yYWdlLmdldEludGVybmFsVmFsdWVzKGN1cnJlbnRQdWxzZSwgZmFsc2UpLCBjdXJyZW50UHVsc2UpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VlNEID0gZnVuY3Rpb24gKCl7XG4gICAgICAgIHJldHVybiBtYWluU3RvcmFnZS5nZXRWU0QoZmFsc2UpO1xuICAgIH07XG5cbiAgICB0aGlzLmluaXRpYWxpc2UgPSBmdW5jdGlvbihzYXZlZEludGVybmFsVmFsdWVzKXtcbiAgICAgICAgbWFpblN0b3JhZ2UuaW5pdGlhbGlzZUludGVybmFsVmFsdWUoc2F2ZWRJbnRlcm5hbFZhbHVlcyk7XG4gICAgfTtcblxufVxuXG5cbmV4cG9ydHMubmV3UERTID0gZnVuY3Rpb24ocGVyc2lzdGVuY2Upe1xuICAgIHJldHVybiBuZXcgSW5NZW1vcnlQRFMocGVyc2lzdGVuY2UpO1xufTsiLCJjb25zdCBtZW1vcnlQRFMgPSByZXF1aXJlKFwiLi9Jbk1lbW9yeVBEU1wiKTtcblxuZnVuY3Rpb24gUGVyc2lzdGVudFBEUyh7Z2V0SW5pdFZhbHVlcywgcGVyc2lzdH0pIHtcblx0dGhpcy5tZW1DYWNoZSA9IG1lbW9yeVBEUy5uZXdQRFModGhpcyk7XG5cdHRoaXMucGVyc2lzdCA9IHBlcnNpc3Q7XG5cblx0Y29uc3QgaW5uZXJWYWx1ZXMgPSBnZXRJbml0VmFsdWVzKCkgfHwgbnVsbDtcblx0dGhpcy5tZW1DYWNoZS5pbml0aWFsaXNlKGlubmVyVmFsdWVzKTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cy5uZXdQRFMgPSBmdW5jdGlvbiAocmVhZGVyV3JpdGVyKSB7XG5cdGNvbnN0IHBkcyA9IG5ldyBQZXJzaXN0ZW50UERTKHJlYWRlcldyaXRlcik7XG5cdHJldHVybiBwZHMubWVtQ2FjaGU7XG59O1xuIiwiXG4kJC5hc3NldC5kZXNjcmliZShcIkFDTFNjb3BlXCIsIHtcbiAgICBwdWJsaWM6e1xuICAgICAgICBjb25jZXJuOlwic3RyaW5nOmtleVwiLFxuICAgICAgICBkYjpcImpzb25cIlxuICAgIH0sXG4gICAgaW5pdDpmdW5jdGlvbihjb25jZXJuKXtcbiAgICAgICAgdGhpcy5jb25jZXJuID0gY29uY2VybjtcbiAgICB9LFxuICAgIGFkZFJlc291cmNlUGFyZW50IDogZnVuY3Rpb24ocmVzb3VyY2VJZCwgcGFyZW50SWQpe1xuICAgICAgICAvL1RPRE86IGVtcHR5IGZ1bmN0aW9ucyFcbiAgICB9LFxuICAgIGFkZFpvbmVQYXJlbnQgOiBmdW5jdGlvbih6b25lSWQsIHBhcmVudElkKXtcbiAgICAgICAgLy9UT0RPOiBlbXB0eSBmdW5jdGlvbnMhXG4gICAgfSxcbiAgICBncmFudCA6ZnVuY3Rpb24oYWdlbnRJZCwgIHJlc291cmNlSWQpe1xuICAgICAgICAvL1RPRE86IGVtcHR5IGZ1bmN0aW9ucyFcbiAgICB9LFxuICAgIGFsbG93IDpmdW5jdGlvbihhZ2VudElkLCAgcmVzb3VyY2VJZCl7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbn0pOyIsIlxuJCQuYXNzZXQuZGVzY3JpYmUoXCJBZ2VudFwiLCB7XG4gICAgcHVibGljOntcbiAgICAgICAgYWxpYXM6XCJzdHJpbmc6a2V5XCIsXG4gICAgICAgIHB1YmxpY0tleTpcInN0cmluZ1wiXG4gICAgfSxcbiAgICBpbml0OmZ1bmN0aW9uKGFsaWFzLCB2YWx1ZSl7XG4gICAgICAgIHRoaXMuYWxpYXMgICAgICA9IGFsaWFzO1xuICAgICAgICB0aGlzLnB1YmxpY0tleSAgPSB2YWx1ZTtcbiAgICB9LFxuICAgIHVwZGF0ZTpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHRoaXMucHVibGljS2V5ID0gdmFsdWU7XG4gICAgfSxcbiAgICBhZGRBZ2VudDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBJbXBsZW1lbnRlZCcpO1xuICAgIH0sXG4gICAgbGlzdEFnZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IEltcGxlbWVudGVkJyk7XG5cbiAgICB9LFxuICAgIHJlbW92ZUFnZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IEltcGxlbWVudGVkJyk7XG5cbiAgICB9XG59KTsiLCJcbiQkLmFzc2V0LmRlc2NyaWJlKFwiQmFja3VwXCIsIHtcbiAgICBwdWJsaWM6e1xuICAgICAgICBpZDogIFwic3RyaW5nXCIsXG4gICAgICAgIHVybDogXCJzdHJpbmdcIlxuICAgIH0sXG5cbiAgICBpbml0OmZ1bmN0aW9uKGlkLCB1cmwpe1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMudXJsID0gdXJsO1xuICAgIH1cbn0pO1xuIiwiXG4kJC5hc3NldC5kZXNjcmliZShcIkNTQk1ldGFcIiwge1xuXHRwdWJsaWM6e1xuXHRcdGlzTWFzdGVyOlwic3RyaW5nXCIsXG5cdFx0YWxpYXM6XCJzdHJpbmc6a2V5XCIsXG5cdFx0ZGVzY3JpcHRpb246IFwic3RyaW5nXCIsXG5cdFx0Y3JlYXRpb25EYXRlOiBcInN0cmluZ1wiLFxuXHRcdHVwZGF0ZWREYXRlIDogXCJzdHJpbmdcIixcblx0XHRpZDogXCJzdHJpbmdcIixcblx0XHRpY29uOiBcInN0cmluZ1wiXG5cdH0sXG5cdGluaXQ6ZnVuY3Rpb24oaWQpe1xuXHRcdHRoaXMuYWxpYXMgPSBcIm1ldGFcIjtcblx0XHR0aGlzLmlkID0gaWQ7XG5cdH0sXG5cblx0c2V0SXNNYXN0ZXI6IGZ1bmN0aW9uIChpc01hc3Rlcikge1xuXHRcdHRoaXMuaXNNYXN0ZXIgPSBpc01hc3Rlcjtcblx0fVxuXG59KTtcbiIsIlxuJCQuYXNzZXQuZGVzY3JpYmUoXCJDU0JSZWZlcmVuY2VcIiwge1xuICAgIHB1YmxpYzp7XG4gICAgICAgIGFsaWFzOlwic3RyaW5nOmtleVwiLFxuICAgICAgICBzZWVkIDpcInN0cmluZ1wiLFxuICAgICAgICBkc2VlZDpcInN0cmluZ1wiXG4gICAgfSxcbiAgICBpbml0OmZ1bmN0aW9uKGFsaWFzLCBzZWVkLCBkc2VlZCApe1xuICAgICAgICB0aGlzLmFsaWFzID0gYWxpYXM7XG4gICAgICAgIHRoaXMuc2VlZCAgPSBzZWVkO1xuICAgICAgICB0aGlzLmRzZWVkID0gZHNlZWQ7XG4gICAgfSxcbiAgICB1cGRhdGU6ZnVuY3Rpb24oZmluZ2VycHJpbnQpe1xuICAgICAgICB0aGlzLmZpbmdlcnByaW50ID0gZmluZ2VycHJpbnQ7XG4gICAgICAgIHRoaXMudmVyc2lvbisrO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJCYWNrdXBVcmw6ZnVuY3Rpb24oYmFja3VwVXJsKXtcbiAgICAgICAgdGhpcy5iYWNrdXBzLmFkZChiYWNrdXBVcmwpO1xuICAgIH1cbn0pO1xuIiwiXG4kJC5hc3NldC5kZXNjcmliZShcIkRvbWFpblJlZmVyZW5jZVwiLCB7XG4gICAgcHVibGljOntcbiAgICAgICAgcm9sZTpcInN0cmluZzppbmRleFwiLFxuICAgICAgICBhbGlhczpcInN0cmluZzprZXlcIixcbiAgICAgICAgYWRkcmVzc2VzOlwibWFwXCIsXG4gICAgICAgIGNvbnN0aXR1dGlvbjpcInN0cmluZ1wiLFxuICAgICAgICB3b3Jrc3BhY2U6XCJzdHJpbmdcIixcbiAgICAgICAgcmVtb3RlSW50ZXJmYWNlczpcIm1hcFwiLFxuICAgICAgICBsb2NhbEludGVyZmFjZXM6XCJtYXBcIlxuICAgIH0sXG4gICAgaW5pdDpmdW5jdGlvbihyb2xlLCBhbGlhcyl7XG4gICAgICAgIHRoaXMucm9sZSA9IHJvbGU7XG4gICAgICAgIHRoaXMuYWxpYXMgPSBhbGlhcztcbiAgICAgICAgdGhpcy5hZGRyZXNzZXMgPSB7fTtcbiAgICAgICAgdGhpcy5yZW1vdGVJbnRlcmZhY2VzID0ge307XG4gICAgICAgIHRoaXMubG9jYWxJbnRlcmZhY2VzID0ge307XG4gICAgfSxcbiAgICB1cGRhdGVEb21haW5BZGRyZXNzOmZ1bmN0aW9uKHJlcGxpY2F0aW9uQWdlbnQsIGFkZHJlc3Mpe1xuICAgICAgICBpZighdGhpcy5hZGRyZXNzZXMpe1xuICAgICAgICAgICAgdGhpcy5hZGRyZXNzZXMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFkZHJlc3Nlc1tyZXBsaWNhdGlvbkFnZW50XSA9IGFkZHJlc3M7XG4gICAgfSxcbiAgICByZW1vdmVEb21haW5BZGRyZXNzOmZ1bmN0aW9uKHJlcGxpY2F0aW9uQWdlbnQpe1xuICAgICAgICB0aGlzLmFkZHJlc3Nlc1tyZXBsaWNhdGlvbkFnZW50XSA9IHVuZGVmaW5lZDtcbiAgICAgICAgZGVsZXRlIHRoaXMuYWRkcmVzc2VzW3JlcGxpY2F0aW9uQWdlbnRdO1xuICAgIH0sXG4gICAgYWRkUmVtb3RlSW50ZXJmYWNlOmZ1bmN0aW9uKGFsaWFzLCByZW1vdGVFbmRQb2ludCl7XG4gICAgICAgIGlmKCF0aGlzLnJlbW90ZUludGVyZmFjZXMpe1xuICAgICAgICAgICAgdGhpcy5yZW1vdGVJbnRlcmZhY2VzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZW1vdGVJbnRlcmZhY2VzW2FsaWFzXSA9IHJlbW90ZUVuZFBvaW50O1xuICAgIH0sXG4gICAgcmVtb3ZlUmVtb3RlSW50ZXJmYWNlOmZ1bmN0aW9uKGFsaWFzKXtcbiAgICAgICAgaWYodGhpcy5yZW1vdGVJbnRlcmZhY2Upe1xuICAgICAgICAgICAgdGhpcy5yZW1vdGVJbnRlcmZhY2VzW2FsaWFzXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnJlbW90ZUludGVyZmFjZXNbYWxpYXNdO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBhZGRMb2NhbEludGVyZmFjZTpmdW5jdGlvbihhbGlhcywgcGF0aCl7XG4gICAgICAgIGlmKCF0aGlzLmxvY2FsSW50ZXJmYWNlcyl7XG4gICAgICAgICAgICB0aGlzLmxvY2FsSW50ZXJmYWNlcyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubG9jYWxJbnRlcmZhY2VzW2FsaWFzXSA9IHBhdGg7XG4gICAgfSxcbiAgICByZW1vdmVMb2NhbEludGVyZmFjZTpmdW5jdGlvbihhbGlhcyl7XG4gICAgICAgIGlmKHRoaXMubG9jYWxJbnRlcmZhY2VzKXtcbiAgICAgICAgICAgIHRoaXMubG9jYWxJbnRlcmZhY2VzW2FsaWFzXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmxvY2FsSW50ZXJmYWNlc1thbGlhc107XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHNldENvbnN0aXR1dGlvbjpmdW5jdGlvbihwYXRoT3JVcmxPckNTQil7XG4gICAgICAgIHRoaXMuY29uc3RpdHV0aW9uID0gcGF0aE9yVXJsT3JDU0I7XG4gICAgfSxcbiAgICBnZXRDb25zdGl0dXRpb246ZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RpdHV0aW9uO1xuICAgIH0sXG4gICAgc2V0V29ya3NwYWNlOmZ1bmN0aW9uKHBhdGgpe1xuICAgICAgICB0aGlzLndvcmtzcGFjZSA9IHBhdGg7XG4gICAgfSxcbiAgICBnZXRXb3Jrc3BhY2U6ZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHRoaXMud29ya3NwYWNlO1xuICAgIH1cbn0pOyIsIiQkLmFzc2V0LmRlc2NyaWJlKFwiRW1iZWRkZWRGaWxlXCIsIHtcblx0cHVibGljOntcblx0XHRhbGlhczpcInN0cmluZ1wiXG5cdH0sXG5cblx0aW5pdDpmdW5jdGlvbihhbGlhcyl7XG5cdFx0dGhpcy5hbGlhcyA9IGFsaWFzO1xuXHR9XG59KTsiLCIkJC5hc3NldC5kZXNjcmliZShcIkZpbGVSZWZlcmVuY2VcIiwge1xuXHRwdWJsaWM6e1xuXHRcdGFsaWFzOlwic3RyaW5nXCIsXG5cdFx0c2VlZCA6XCJzdHJpbmdcIixcblx0XHRkc2VlZDpcInN0cmluZ1wiXG5cdH0sXG5cdGluaXQ6ZnVuY3Rpb24oYWxpYXMsIHNlZWQsIGRzZWVkKXtcblx0XHR0aGlzLmFsaWFzID0gYWxpYXM7XG5cdFx0dGhpcy5zZWVkICA9IHNlZWQ7XG5cdFx0dGhpcy5kc2VlZCA9IGRzZWVkO1xuXHR9XG59KTsiLCJcbiQkLmFzc2V0LmRlc2NyaWJlKFwia2V5XCIsIHtcbiAgICBwdWJsaWM6e1xuICAgICAgICBhbGlhczpcInN0cmluZ1wiXG4gICAgfSxcbiAgICBpbml0OmZ1bmN0aW9uKGFsaWFzLCB2YWx1ZSl7XG4gICAgICAgIHRoaXMuYWxpYXMgPSBhbGlhcztcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgIH0sXG4gICAgdXBkYXRlOmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgIH1cbn0pOyIsIm1vZHVsZS5leHBvcnRzID0gJCQubGlicmFyeShmdW5jdGlvbigpe1xuICAgIHJlcXVpcmUoXCIuL0RvbWFpblJlZmVyZW5jZVwiKTtcbiAgICByZXF1aXJlKFwiLi9DU0JSZWZlcmVuY2VcIik7XG4gICAgcmVxdWlyZShcIi4vQWdlbnRcIik7XG4gICAgcmVxdWlyZShcIi4vQmFja3VwXCIpO1xuICAgIHJlcXVpcmUoXCIuL0FDTFNjb3BlXCIpO1xuICAgIHJlcXVpcmUoXCIuL0tleVwiKTtcbiAgICByZXF1aXJlKFwiLi90cmFuc2FjdGlvbnNcIik7XG4gICAgcmVxdWlyZShcIi4vRmlsZVJlZmVyZW5jZVwiKTtcbiAgICByZXF1aXJlKFwiLi9FbWJlZGRlZEZpbGVcIik7XG4gICAgcmVxdWlyZSgnLi9DU0JNZXRhJyk7XG59KTsiLCIkJC50cmFuc2FjdGlvbi5kZXNjcmliZShcInRyYW5zYWN0aW9uc1wiLCB7XG4gICAgdXBkYXRlS2V5OiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICB2YXIgdHJhbnNhY3Rpb24gPSAkJC5ibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24odGhpcyk7XG4gICAgICAgIHZhciBrZXkgPSB0cmFuc2FjdGlvbi5sb29rdXAoXCJLZXlcIiwga2V5KTtcbiAgICAgICAgdmFyIGtleVBlcm1pc3Npb25zID0gdHJhbnNhY3Rpb24ubG9va3VwKFwiQUNMU2NvcGVcIiwgXCJLZXlzQ29uY2VyblwiKTtcbiAgICAgICAgaWYgKGtleVBlcm1pc3Npb25zLmFsbG93KHRoaXMuYWdlbnRJZCwga2V5KSkge1xuICAgICAgICAgICAga2V5LnVwZGF0ZSh2YWx1ZSk7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5hZGQoa2V5KTtcbiAgICAgICAgICAgICQkLmJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2VjdXJpdHlFcnJvcihcIkFnZW50IFwiICsgdGhpcy5hZ2VudElkICsgXCIgZGVuaWVkIHRvIGNoYW5nZSBrZXkgXCIgKyBrZXkpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBhZGRDaGlsZDogZnVuY3Rpb24gKGFsaWFzKSB7XG4gICAgICAgIHZhciB0cmFuc2FjdGlvbiA9ICQkLmJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbigpO1xuICAgICAgICB2YXIgcmVmZXJlbmNlID0gJCQuY29udHJhY3Quc3RhcnQoXCJEb21haW5SZWZlcmVuY2VcIiwgXCJpbml0XCIsIFwiY2hpbGRcIiwgYWxpYXMpO1xuICAgICAgICB0cmFuc2FjdGlvbi5hZGQocmVmZXJlbmNlKTtcbiAgICAgICAgJCQuYmxvY2tjaGFpbi5jb21taXQodHJhbnNhY3Rpb24pO1xuICAgIH0sXG4gICAgYWRkUGFyZW50OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHJlZmVyZW5jZSA9ICQkLmNvbnRyYWN0LnN0YXJ0KFwiRG9tYWluUmVmZXJlbmNlXCIsIFwiaW5pdFwiLCBcImNoaWxkXCIsIGFsaWFzKTtcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbi5zYXZlKHJlZmVyZW5jZSk7XG4gICAgICAgICQkLmJsb2NrY2hhaW4ucGVyc2lzdCh0aGlzLnRyYW5zYWN0aW9uKTtcbiAgICB9LFxuICAgIGFkZEFnZW50OiBmdW5jdGlvbiAoYWxpYXMsIHB1YmxpY0tleSkge1xuICAgICAgICB2YXIgcmVmZXJlbmNlID0gJCQuY29udHJhY3Quc3RhcnQoXCJBZ2VudFwiLCBcImluaXRcIiwgYWxpYXMsIHB1YmxpY0tleSk7XG4gICAgICAgIHRoaXMudHJhbnNhY3Rpb24uc2F2ZShyZWZlcmVuY2UpO1xuICAgICAgICAkJC5ibG9ja2NoYWluLnBlcnNpc3QodGhpcy50cmFuc2FjdGlvbik7XG4gICAgfSxcbiAgICB1cGRhdGVBZ2VudDogZnVuY3Rpb24gKGFsaWFzLCBwdWJsaWNLZXkpIHtcbiAgICAgICAgdmFyIGFnZW50ID0gdGhpcy50cmFuc2FjdGlvbi5sb29rdXAoXCJBZ2VudFwiLCBhbGlhcyk7XG4gICAgICAgIGFnZW50LnVwZGF0ZShwdWJsaWNLZXkpO1xuICAgICAgICB0aGlzLnRyYW5zYWN0aW9uLnNhdmUocmVmZXJlbmNlKTtcbiAgICAgICAgJCQuYmxvY2tjaGFpbi5wZXJzaXN0KHRoaXMudHJhbnNhY3Rpb24pO1xuICAgIH1cbn0pO1xuXG5cbiQkLm5ld1RyYW5zYWN0aW9uID0gZnVuY3Rpb24odHJhbnNhY3Rpb25GbG93LGN0b3IsLi4uYXJncyl7XG4gICAgdmFyIHRyYW5zYWN0aW9uID0gJCQuc3dhcm0uc3RhcnQoIHRyYW5zYWN0aW9uRmxvdyk7XG4gICAgdHJhbnNhY3Rpb24ubWV0YShcImFnZW50SWRcIiwgJCQuY3VycmVudEFnZW50SWQpO1xuICAgIHRyYW5zYWN0aW9uLm1ldGEoXCJjb21tYW5kXCIsIFwicnVuRXZlcnlXaGVyZVwiKTtcbiAgICB0cmFuc2FjdGlvbi5tZXRhKFwiY3RvclwiLCBjdG9yKTtcbiAgICB0cmFuc2FjdGlvbi5tZXRhKFwiYXJnc1wiLCBhcmdzKTtcbiAgICB0cmFuc2FjdGlvbi5zaWduKCk7XG4gICAgLy8kJC5ibG9ja2NoYWluLnNlbmRGb3JDb25zZW50KHRyYW5zYWN0aW9uKTtcbiAgICAvL3RlbXBvcmFyeSB1bnRpbCBjb25zZW50IGxheWVyIGlzIGFjdGl2YXRlZFxuICAgIHRyYW5zYWN0aW9uW2N0b3JdLmFwcGx5KHRyYW5zYWN0aW9uLGFyZ3MpO1xufTtcblxuLypcbnVzYWdlczpcbiAgICAkJC5uZXdUcmFuc2FjdGlvbihcImRvbWFpbi50cmFuc2FjdGlvbnNcIiwgXCJ1cGRhdGVLZXlcIiwgXCJrZXlcIiwgXCJ2YWx1ZVwiKVxuXG4gKi9cbiIsIi8vIGNvbnN0IHNoYXJlZFBoYXNlcyA9IHJlcXVpcmUoJy4vc2hhcmVkUGhhc2VzJyk7XG4vLyBjb25zdCBiZWVzSGVhbGVyID0gcmVxdWlyZSgnc3dhcm11dGlscycpLmJlZXNIZWFsZXI7XG5cbiQkLnN3YXJtcy5kZXNjcmliZShcImFnZW50c1wiLCB7XG4gICAgYWRkOiBmdW5jdGlvbiAoYWxpYXMsIHB1YmxpY0tleSkge1xuICAgICAgICBjb25zdCB0cmFuc2FjdGlvbiA9ICQkLmJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG4gICAgICAgIGNvbnN0IGFnZW50QXNzZXQgPSB0cmFuc2FjdGlvbi5sb29rdXAoJ2dsb2JhbC5BZ2VudCcsIGFsaWFzKTtcblxuICAgICAgICBhZ2VudEFzc2V0LmluaXQoYWxpYXMsIHB1YmxpY0tleSk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5hZGQoYWdlbnRBc3NldCk7XG5cbiAgICAgICAgICAgICQkLmJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLnJldHVybihuZXcgRXJyb3IoXCJBZ2VudCBhbHJlYWR5IGV4aXN0c1wiKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJldHVybihudWxsLCBhbGlhcyk7XG4gICAgfSxcbn0pO1xuIiwiY29uc3Qgc2hhcmVkUGhhc2VzID0gcmVxdWlyZSgnLi9zaGFyZWRQaGFzZXMnKTtcbmNvbnN0IGJlZXNIZWFsZXIgPSByZXF1aXJlKCdzd2FybXV0aWxzJykuYmVlc0hlYWxlcjtcblxuJCQuc3dhcm1zLmRlc2NyaWJlKFwiZG9tYWluc1wiLCB7XG4gICAgYWRkOiBmdW5jdGlvbiAocm9sZSwgYWxpYXMpIHtcbiAgICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSAkJC5ibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuICAgICAgICBjb25zdCBkb21haW5zU3dhcm0gPSB0cmFuc2FjdGlvbi5sb29rdXAoJ2dsb2JhbC5Eb21haW5SZWZlcmVuY2UnLCBhbGlhcyk7XG5cbiAgICAgICAgaWYgKCFkb21haW5zU3dhcm0pIHtcbiAgICAgICAgICAgIHRoaXMucmV0dXJuKG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgc3dhcm0gbmFtZWQgXCJnbG9iYWwuRG9tYWluUmVmZXJlbmNlXCInKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBkb21haW5zU3dhcm0uaW5pdChyb2xlLCBhbGlhcyk7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHRyYW5zYWN0aW9uLmFkZChkb21haW5zU3dhcm0pO1xuXG4gICAgICAgICAgICAkJC5ibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG4gICAgICAgIH1jYXRjaChlcnIpe1xuICAgICAgICAgICAgdGhpcy5yZXR1cm4obmV3IEVycm9yKFwiRG9tYWluIGFsbHJlYWR5IGV4aXN0cyFcIikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXR1cm4obnVsbCwgYWxpYXMpO1xuICAgIH0sXG4gICAgZ2V0RG9tYWluRGV0YWlsczpmdW5jdGlvbihhbGlhcyl7XG4gICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gJCQuYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcbiAgICAgICAgY29uc3QgZG9tYWluID0gdHJhbnNhY3Rpb24ubG9va3VwKCdnbG9iYWwuRG9tYWluUmVmZXJlbmNlJywgYWxpYXMpO1xuXG4gICAgICAgIGlmICghZG9tYWluKSB7XG4gICAgICAgICAgICB0aGlzLnJldHVybihuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIHN3YXJtIG5hbWVkIFwiZ2xvYmFsLkRvbWFpblJlZmVyZW5jZVwiJykpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXR1cm4obnVsbCwgYmVlc0hlYWxlci5hc0pTT04oZG9tYWluKS5wdWJsaWNWYXJzKTtcbiAgICB9LFxuICAgIGNvbm5lY3REb21haW5Ub1JlbW90ZShkb21haW5OYW1lLCBhbGlhcywgcmVtb3RlRW5kUG9pbnQpe1xuICAgICAgICBjb25zdCB0cmFuc2FjdGlvbiA9ICQkLmJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG4gICAgICAgIGNvbnN0IGRvbWFpbiA9IHRyYW5zYWN0aW9uLmxvb2t1cCgnZ2xvYmFsLkRvbWFpblJlZmVyZW5jZScsIGRvbWFpbk5hbWUpO1xuXG4gICAgICAgIGlmICghZG9tYWluKSB7XG4gICAgICAgICAgICB0aGlzLnJldHVybihuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIHN3YXJtIG5hbWVkIFwiZ2xvYmFsLkRvbWFpblJlZmVyZW5jZVwiJykpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZG9tYWluLmFkZFJlbW90ZUludGVyZmFjZShhbGlhcywgcmVtb3RlRW5kUG9pbnQpO1xuXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHRyYW5zYWN0aW9uLmFkZChkb21haW4pO1xuXG4gICAgICAgICAgICAkJC5ibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG4gICAgICAgIH1jYXRjaChlcnIpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIHRoaXMucmV0dXJuKG5ldyBFcnJvcihcIkRvbWFpbiB1cGRhdGUgZmFpbGVkIVwiKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJldHVybihudWxsLCBhbGlhcyk7XG4gICAgfSxcbiAgICAvLyBnZXREb21haW5EZXRhaWxzOiBzaGFyZWRQaGFzZXMuZ2V0QXNzZXRGYWN0b3J5KCdnbG9iYWwuRG9tYWluUmVmZXJlbmNlJyksXG4gICAgZ2V0RG9tYWluczogc2hhcmVkUGhhc2VzLmdldEFsbEFzc2V0c0ZhY3RvcnkoJ2dsb2JhbC5Eb21haW5SZWZlcmVuY2UnKVxufSk7XG4iLCJyZXF1aXJlKCcuL2RvbWFpblN3YXJtcycpO1xucmVxdWlyZSgnLi9hZ2VudHNTd2FybScpOyIsImNvbnN0IGJlZXNIZWFsZXIgPSByZXF1aXJlKFwic3dhcm11dGlsc1wiKS5iZWVzSGVhbGVyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBnZXRBc3NldEZhY3Rvcnk6IGZ1bmN0aW9uKGFzc2V0VHlwZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oYWxpYXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gJCQuYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcbiAgICAgICAgICAgIGNvbnN0IGRvbWFpblJlZmVyZW5jZVN3YXJtID0gdHJhbnNhY3Rpb24ubG9va3VwKGFzc2V0VHlwZSwgYWxpYXMpO1xuXG4gICAgICAgICAgICBpZighZG9tYWluUmVmZXJlbmNlU3dhcm0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJldHVybihuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIHN3YXJtIG5hbWVkIFwiJHthc3NldFR5cGV9XCJgKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnJldHVybih1bmRlZmluZWQsIGJlZXNIZWFsZXIuYXNKU09OKGRvbWFpblJlZmVyZW5jZVN3YXJtKSk7XG4gICAgICAgIH07XG4gICAgfSxcbiAgICBnZXRBbGxBc3NldHNGYWN0b3J5OiBmdW5jdGlvbihhc3NldFR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSAkJC5ibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuICAgICAgICAgICAgY29uc3QgZG9tYWlucyA9IHRyYW5zYWN0aW9uLmxvYWRBc3NldHMoYXNzZXRUeXBlKSB8fCBbXTtcblxuICAgICAgICAgICAgdGhpcy5yZXR1cm4odW5kZWZpbmVkLCBkb21haW5zLm1hcCgoZG9tYWluKSA9PiBiZWVzSGVhbGVyLmFzSlNPTihkb21haW4pKSk7XG4gICAgICAgIH07XG4gICAgfVxufTsiLCIgZnVuY3Rpb24gQ1NCQ2FjaGUobWF4U2l6ZSkge1xuXG4gICAgIGxldCBjYWNoZSA9IHt9O1xuICAgIGxldCBzaXplID0gMDtcbiAgICBjb25zdCBjbGVhcmluZ1JhdGlvID0gMC41O1xuXG5cbiAgICB0aGlzLmxvYWQgPSBmdW5jdGlvbiAodWlkKSB7XG4gICAgICAgIC8vIGlmIChjYWNoZVt1aWRdKSB7XG4gICAgICAgIC8vICAgICBjYWNoZVt1aWRdLmNvdW50ICs9IDE7XG4gICAgICAgIC8vICAgICByZXR1cm4gY2FjaGVbdWlkXS5pbnN0YW5jZTtcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfTtcblxuICAgIHRoaXMucHV0ID0gZnVuY3Rpb24gKHVpZCwgb2JqKSB7XG4gICAgICAgIGlmIChzaXplID4gbWF4U2l6ZSkge1xuICAgICAgICAgICAgY2xlYXIoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNpemUrKztcbiAgICAgICAgICAgIGNhY2hlW3VpZF0gPSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2U6IG9iaixcbiAgICAgICAgICAgICAgICBjb3VudDogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLWludGVybmFsIG1ldGhvZHMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgIGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgICAgICBzaXplID0gbWF4U2l6ZSAtIE1hdGgucm91bmQoY2xlYXJpbmdSYXRpbyAqIG1heFNpemUpO1xuXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBPYmplY3QuZW50cmllcyhjYWNoZSk7XG4gICAgICAgIGNhY2hlID0gZW50cmllc1xuICAgICAgICAgICAgLnNvcnQoKGFycjEsIGFycjIpID0+IGFycjJbMV0uY291bnQgLSBhcnIxWzFdLmNvdW50KVxuICAgICAgICAgICAgLnNsaWNlKDAsIHNpemUpXG4gICAgICAgICAgICAucmVkdWNlKChvYmosIFsgaywgdiBdKSA9PiB7XG4gICAgICAgICAgICAgICAgb2JqW2tdID0gdjtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICAgICAgfSwge30pO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDU0JDYWNoZTtcbiIsImNvbnN0IGNyeXB0byA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5cblxuZnVuY3Rpb24gQ1NCSWRlbnRpZmllcihpZCwgYmFja3VwVXJscywga2V5TGVuID0gMzIpIHtcbiAgICBsZXQgc2VlZDtcbiAgICBsZXQgZHNlZWQ7XG4gICAgbGV0IHVpZDtcbiAgICBsZXQgZW5jU2VlZDtcbiAgICAvLyBsZXQgZW5jRHNlZWQ7XG5cbiAgICBpbml0KCk7XG5cbiAgICB0aGlzLmdldFNlZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmKCFzZWVkKXtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZXR1cm4gc2VlZC4gQWNjZXNzIGlzIGRlbmllZC5cIik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZ2VuZXJhdGVDb21wYWN0Rm9ybShzZWVkKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXREc2VlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYoZHNlZWQpe1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlQ29tcGFjdEZvcm0oZHNlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoc2VlZCl7XG4gICAgICAgICAgICBkc2VlZCA9IGRlcml2ZVNlZWQoc2VlZCk7XG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVDb21wYWN0Rm9ybShkc2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgcmV0dXJuIGRlcml2ZWQgc2VlZC4gQWNjZXNzIGlzIGRlbmllZC5cIik7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VWlkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZih1aWQpe1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlQ29tcGFjdEZvcm0odWlkKS50b1N0cmluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoZHNlZWQpe1xuICAgICAgICAgICAgdWlkID0gY29tcHV0ZVVpZChkc2VlZCk7XG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVDb21wYWN0Rm9ybSh1aWQpLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZihzZWVkKXtcbiAgICAgICAgICAgIGRzZWVkID0gZGVyaXZlU2VlZChzZWVkKTtcbiAgICAgICAgICAgIHVpZCA9IGNvbXB1dGVVaWQoZHNlZWQpO1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlQ29tcGFjdEZvcm0odWlkKS50b1N0cmluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJldHVybiB1aWRcIik7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0RW5jU2VlZCA9IGZ1bmN0aW9uIChlbmNyeXB0aW9uS2V5KSB7XG4gICAgICAgIGlmKGVuY1NlZWQpe1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlQ29tcGFjdEZvcm0oZW5jU2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZighc2VlZCl7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgcmV0dXJuIGVuY1NlZWQuIEFjY2VzcyBpcyBkZW5pZWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWVuY3J5cHRpb25LZXkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZXR1cm4gZW5jU2VlZC4gTm8gZW5jcnlwdGlvbiBrZXkgd2FzIHByb3ZpZGVkXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9UT0RPOiBlbmNyeXB0IHNlZWQgdXNpbmcgZW5jcnlwdGlvbktleS4gRW5jcnlwdGlvbiBhbGdvcml0aG0gcmVtYWlucyB0byBiZSBjaG9zZW5cbiAgICB9O1xuXG5cblxuICAgIHRoaXMuZ2V0QmFja3VwVXJscyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYoc2VlZCl7XG4gICAgICAgICAgICByZXR1cm4gc2VlZC5iYWNrdXA7XG4gICAgICAgIH1cblxuICAgICAgICBpZihkc2VlZCl7XG4gICAgICAgICAgICByZXR1cm4gZHNlZWQuYmFja3VwO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQmFja3VwIFVSTHMgY291bGQgbm90IGJlIHJldHJpZXZlZC4gQWNjZXNzIGlzIGRlbmllZFwiKTtcbiAgICB9O1xuXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gaW50ZXJuYWwgbWV0aG9kcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBmdW5jdGlvbiBpbml0KCkge1xuICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgICBpZiAoIWJhY2t1cFVybHMpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBiYWNrdXBzIHByb3ZpZGVkLlwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2VlZCA9IGNyZWF0ZSgpO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGNsYXNzaWZ5SWQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsYXNzaWZ5SWQoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaWQgIT09IFwic3RyaW5nXCIgJiYgIUJ1ZmZlci5pc0J1ZmZlcihpZCkgJiYgISh0eXBlb2YgaWQgPT09IFwib2JqZWN0XCIgJiYgIUJ1ZmZlci5pc0J1ZmZlcihpZCkpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYElkIG11c3QgYmUgYSBzdHJpbmcgb3IgYSBidWZmZXIuIFRoZSB0eXBlIHByb3ZpZGVkIHdhcyAke3R5cGVvZiBpZH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGV4cGFuZGVkSWQgPSBsb2FkKGlkKTtcbiAgICAgICAgc3dpdGNoKGV4cGFuZGVkSWQudGFnKXtcbiAgICAgICAgICAgIGNhc2UgJ3MnOlxuICAgICAgICAgICAgICAgIHNlZWQgPSBleHBhbmRlZElkO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZCc6XG4gICAgICAgICAgICAgICAgZHNlZWQgPSBleHBhbmRlZElkO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndSc6XG4gICAgICAgICAgICAgICAgdWlkID0gZXhwYW5kZWRJZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2VzJzpcbiAgICAgICAgICAgICAgICBlbmNTZWVkID0gZXhwYW5kZWRJZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2VkJzpcbiAgICAgICAgICAgICAgICBlbmNEc2VlZCA9IGV4cGFuZGVkSWQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0YWcnKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbiAgICBmdW5jdGlvbiBjcmVhdGUoKSB7XG4gICAgICAgIGNvbnN0IGxvY2FsU2VlZCA9IHt9O1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoYmFja3VwVXJscykpIHtcbiAgICAgICAgICAgIGJhY2t1cFVybHMgPSBbIGJhY2t1cFVybHMgXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvY2FsU2VlZC50YWcgICAgPSAncyc7XG4gICAgICAgIGxvY2FsU2VlZC5yYW5kb20gPSBjcnlwdG8ucmFuZG9tQnl0ZXMoa2V5TGVuKTtcbiAgICAgICAgbG9jYWxTZWVkLmJhY2t1cCA9IGJhY2t1cFVybHM7XG5cbiAgICAgICAgcmV0dXJuIGxvY2FsU2VlZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXJpdmVTZWVkKHNlZWQpIHtcbiAgICAgICAgbGV0IGNvbXBhY3RTZWVkID0gc2VlZDtcblxuICAgICAgICBpZiAodHlwZW9mIHNlZWQgPT09ICdvYmplY3QnICYmICFCdWZmZXIuaXNCdWZmZXIoc2VlZCkpIHtcbiAgICAgICAgICAgIGNvbXBhY3RTZWVkID0gZ2VuZXJhdGVDb21wYWN0Rm9ybShzZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoc2VlZCkpIHtcbiAgICAgICAgICAgIGNvbXBhY3RTZWVkID0gc2VlZC50b1N0cmluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbXBhY3RTZWVkWzBdID09PSAnZCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVHJpZWQgdG8gZGVyaXZlIGFuIGFscmVhZHkgZGVyaXZlZCBzZWVkLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZGVjb2RlZENvbXBhY3RTZWVkID0gZGVjb2RlVVJJQ29tcG9uZW50KGNvbXBhY3RTZWVkKTtcbiAgICAgICAgY29uc3Qgc3BsaXRDb21wYWN0U2VlZCA9IGRlY29kZWRDb21wYWN0U2VlZC5zdWJzdHJpbmcoMSkuc3BsaXQoJ3wnKTtcblxuICAgICAgICBjb25zdCBzdHJTZWVkID0gQnVmZmVyLmZyb20oc3BsaXRDb21wYWN0U2VlZFswXSwgJ2Jhc2U2NCcpLnRvU3RyaW5nKCdoZXgnKTtcbiAgICAgICAgY29uc3QgYmFja3VwVXJscyA9IEJ1ZmZlci5mcm9tKHNwbGl0Q29tcGFjdFNlZWRbMV0sICdiYXNlNjQnKS50b1N0cmluZygpO1xuICAgICAgICBjb25zdCBkc2VlZCA9IHt9O1xuXG4gICAgICAgIGRzZWVkLnRhZyA9ICdkJztcbiAgICAgICAgZHNlZWQucmFuZG9tID0gY3J5cHRvLmRlcml2ZUtleShzdHJTZWVkLCBudWxsLCBrZXlMZW4pO1xuICAgICAgICBkc2VlZC5iYWNrdXAgPSBKU09OLnBhcnNlKGJhY2t1cFVybHMpO1xuXG4gICAgICAgIHJldHVybiBkc2VlZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb21wdXRlVWlkKGRzZWVkKXtcbiAgICAgICAgaWYoIWRzZWVkKXtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRzZWVkIHdhcyBub3QgcHJvdmlkZWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGRzZWVkID09PSBcIm9iamVjdFwiICYmICFCdWZmZXIuaXNCdWZmZXIoZHNlZWQpKSB7XG4gICAgICAgICAgICBkc2VlZCA9IGdlbmVyYXRlQ29tcGFjdEZvcm0oZHNlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdWlkID0ge307XG4gICAgICAgIHVpZC50YWcgPSAndSc7XG4gICAgICAgIHVpZC5yYW5kb20gPSBCdWZmZXIuZnJvbShjcnlwdG8uZ2VuZXJhdGVTYWZlVWlkKGRzZWVkKSk7XG5cbiAgICAgICAgcmV0dXJuIHVpZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZW5lcmF0ZUNvbXBhY3RGb3JtKHt0YWcsIHJhbmRvbSwgYmFja3VwfSkge1xuICAgICAgICBsZXQgY29tcGFjdElkID0gdGFnICsgcmFuZG9tLnRvU3RyaW5nKCdiYXNlNjQnKTtcbiAgICAgICAgaWYgKGJhY2t1cCkge1xuICAgICAgICAgICAgY29tcGFjdElkICs9ICd8JyArIEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KGJhY2t1cCkpLnRvU3RyaW5nKCdiYXNlNjQnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gQnVmZmVyLmZyb20oZW5jb2RlVVJJQ29tcG9uZW50KGNvbXBhY3RJZCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVuY3J5cHQoaWQsIGVuY3J5cHRpb25LZXkpIHtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCAhPT0gMil7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFdyb25nIG51bWJlciBvZiBhcmd1bWVudHMuIEV4cGVjdGVkOiAyOyBwcm92aWRlZCAke2FyZ3VtZW50cy5sZW5ndGh9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdGFnO1xuICAgICAgICBpZiAodHlwZW9mIGlkID09PSBcIm9iamVjdFwiICYmICFCdWZmZXIuaXNCdWZmZXIoaWQpKSB7XG4gICAgICAgICAgICB0YWcgPSBpZC50YWc7XG4gICAgICAgICAgICBpZCA9IGdlbmVyYXRlQ29tcGFjdEZvcm0oaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRhZyA9PT0gJ3MnKSB7XG4gICAgICAgICAgICAvL1RPRE8gZW5jcnlwdCBzZWVkXG4gICAgICAgIH1lbHNlIGlmICh0YWcgPT09ICdkJykge1xuICAgICAgICAgICAgLy9UT0RPIGVuY3J5cHQgZHNlZWRcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgcHJvdmlkZWQgaWQgY2Fubm90IGJlIGVuY3J5cHRlZFwiKTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9hZChjb21wYWN0SWQpIHtcbiAgICAgICAgaWYodHlwZW9mIGNvbXBhY3RJZCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCB0eXBlIHN0cmluZyBvciBCdWZmZXIuIFJlY2VpdmVkIHVuZGVmaW5lZGApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodHlwZW9mIGNvbXBhY3RJZCAhPT0gXCJzdHJpbmdcIil7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbXBhY3RJZCA9PT0gXCJvYmplY3RcIiAmJiAhQnVmZmVyLmlzQnVmZmVyKGNvbXBhY3RJZCkpIHtcbiAgICAgICAgICAgICAgICBjb21wYWN0SWQgPSBCdWZmZXIuZnJvbShjb21wYWN0SWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb21wYWN0SWQgPSBjb21wYWN0SWQudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRlY29kZWRDb21wYWN0SWQgPSBkZWNvZGVVUklDb21wb25lbnQoY29tcGFjdElkKTtcbiAgICAgICAgY29uc3QgaWQgPSB7fTtcbiAgICAgICAgY29uc3Qgc3BsaXRDb21wYWN0SWQgPSBkZWNvZGVkQ29tcGFjdElkLnN1YnN0cmluZygxKS5zcGxpdCgnfCcpO1xuXG4gICAgICAgIGlkLnRhZyA9IGRlY29kZWRDb21wYWN0SWRbMF07XG4gICAgICAgIGlkLnJhbmRvbSA9IEJ1ZmZlci5mcm9tKHNwbGl0Q29tcGFjdElkWzBdLCAnYmFzZTY0Jyk7XG5cbiAgICAgICAgaWYoc3BsaXRDb21wYWN0SWRbMV0gJiYgc3BsaXRDb21wYWN0SWRbMV0ubGVuZ3RoID4gMCl7XG4gICAgICAgICAgICBpZC5iYWNrdXAgPSBKU09OLnBhcnNlKEJ1ZmZlci5mcm9tKHNwbGl0Q29tcGFjdElkWzFdLCAnYmFzZTY0JykudG9TdHJpbmcoKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaWQ7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENTQklkZW50aWZpZXI7XG4iLCJjb25zdCBPd00gPSByZXF1aXJlKCdzd2FybXV0aWxzJykuT3dNO1xuY29uc3QgcHNrZGIgPSByZXF1aXJlKCdwc2tkYicpO1xuXG5mdW5jdGlvbiBSYXdDU0IoaW5pdERhdGEpIHtcblx0Y29uc3QgZGF0YSA9IG5ldyBPd00oe2Jsb2NrY2hhaW46IGluaXREYXRhfSk7XG5cdGNvbnN0IGJsb2NrY2hhaW4gPSBwc2tkYi5zdGFydERiKHtnZXRJbml0VmFsdWVzLCBwZXJzaXN0fSk7XG5cblx0aWYoIWRhdGEuYmxvY2tjaGFpbikge1xuXHRcdGRhdGEuYmxvY2tjaGFpbiA9IHtcblx0XHRcdHRyYW5zYWN0aW9uTG9nIDogJycsXG5cdFx0XHRlbWJlZGRlZEZpbGVzOiB7fVxuXHRcdH07XG5cdH1cblxuXHRkYXRhLmVtYmVkRmlsZSA9IGZ1bmN0aW9uIChmaWxlQWxpYXMsIGZpbGVEYXRhKSB7XG5cdFx0Y29uc3QgZW1iZWRkZWRBc3NldCA9IGRhdGEuZ2V0QXNzZXQoXCJnbG9iYWwuRW1iZWRkZWRGaWxlXCIsIGZpbGVBbGlhcyk7XG5cdFx0aWYoZW1iZWRkZWRBc3NldC5pc1BlcnNpc3RlZCgpKXtcblx0XHRcdGNvbnNvbGUubG9nKGBGaWxlIHdpdGggYWxpYXMgJHtmaWxlQWxpYXN9IGFscmVhZHkgZXhpc3RzYCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0ZGF0YS5ibG9ja2NoYWluLmVtYmVkZGVkRmlsZXNbZmlsZUFsaWFzXSA9IGZpbGVEYXRhO1xuXHRcdGRhdGEuc2F2ZUFzc2V0KGVtYmVkZGVkQXNzZXQpO1xuXHR9O1xuXG5cdGRhdGEuYXR0YWNoRmlsZSA9IGZ1bmN0aW9uIChmaWxlQWxpYXMsIHBhdGgsIHNlZWQpIHtcblx0XHRkYXRhLm1vZGlmeUFzc2V0KFwiZ2xvYmFsLkZpbGVSZWZlcmVuY2VcIiwgZmlsZUFsaWFzLCAoZmlsZSkgPT4ge1xuXHRcdFx0aWYgKCFmaWxlLmlzRW1wdHkoKSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhgRmlsZSB3aXRoIGFsaWFzICR7ZmlsZUFsaWFzfSBhbHJlYWR5IGV4aXN0c2ApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGZpbGUuaW5pdChmaWxlQWxpYXMsIHBhdGgsIHNlZWQpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGRhdGEuc2F2ZUFzc2V0ID0gZnVuY3Rpb24oYXNzZXQpIHtcblx0XHRjb25zdCB0cmFuc2FjdGlvbiA9IGJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG5cdFx0dHJhbnNhY3Rpb24uYWRkKGFzc2V0KTtcblx0XHRibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG5cdH07XG5cblx0ZGF0YS5tb2RpZnlBc3NldCA9IGZ1bmN0aW9uKGFzc2V0VHlwZSwgYWlkLCBhc3NldE1vZGlmaWVyKSB7XG5cdFx0Y29uc3QgdHJhbnNhY3Rpb24gPSBibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuXHRcdGNvbnN0IGFzc2V0ID0gdHJhbnNhY3Rpb24ubG9va3VwKGFzc2V0VHlwZSwgYWlkKTtcblx0XHRhc3NldE1vZGlmaWVyKGFzc2V0KTtcblxuXHRcdHRyYW5zYWN0aW9uLmFkZChhc3NldCk7XG5cdFx0YmxvY2tjaGFpbi5jb21taXQodHJhbnNhY3Rpb24pO1xuXHR9O1xuXG5cdGRhdGEuZ2V0QXNzZXQgPSBmdW5jdGlvbiAoYXNzZXRUeXBlLCBhaWQpIHtcblx0XHRjb25zdCB0cmFuc2FjdGlvbiA9IGJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG5cdFx0cmV0dXJuIHRyYW5zYWN0aW9uLmxvb2t1cChhc3NldFR5cGUsIGFpZCk7XG5cdH07XG5cblx0ZGF0YS5nZXRBbGxBc3NldHMgPSBmdW5jdGlvbihhc3NldFR5cGUpIHtcblx0XHRjb25zdCB0cmFuc2FjdGlvbiA9IGJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG5cdFx0cmV0dXJuIHRyYW5zYWN0aW9uLmxvYWRBc3NldHMoYXNzZXRUeXBlKTtcblx0fTtcblxuXHQvKiBpbnRlcm5hbCBmdW5jdGlvbnMgKi9cblxuXHRmdW5jdGlvbiBwZXJzaXN0KHRyYW5zYWN0aW9uTG9nLCBjdXJyZW50VmFsdWVzLCBjdXJyZW50UHVsc2UpIHtcblx0XHR0cmFuc2FjdGlvbkxvZy5jdXJyZW50UHVsc2UgPSBjdXJyZW50UHVsc2U7XG5cblx0XHRkYXRhLmJsb2NrY2hhaW4uY3VycmVudFZhbHVlcyA9IGN1cnJlbnRWYWx1ZXM7XG5cdFx0ZGF0YS5ibG9ja2NoYWluLnRyYW5zYWN0aW9uTG9nICs9IG1rU2luZ2xlTGluZShKU09OLnN0cmluZ2lmeSh0cmFuc2FjdGlvbkxvZykpICsgXCJcXG5cIjtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldEluaXRWYWx1ZXMgKCkge1xuXHRcdGlmKCFkYXRhLmJsb2NrY2hhaW4gfHwgIWRhdGEuYmxvY2tjaGFpbi5jdXJyZW50VmFsdWVzKSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0cmV0dXJuIGRhdGEuYmxvY2tjaGFpbi5jdXJyZW50VmFsdWVzO1xuXHR9XG5cblx0ZnVuY3Rpb24gbWtTaW5nbGVMaW5lKHN0cikge1xuXHRcdHJldHVybiBzdHIucmVwbGFjZSgvXFxufFxcci9nLCBcIlwiKTtcblx0fVxuXG5cdHJldHVybiBkYXRhO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJhd0NTQjsiLCJjb25zdCBSYXdDU0IgPSByZXF1aXJlKCcuL1Jhd0NTQicpO1xuY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuY29uc3QgY3J5cHRvID0gcmVxdWlyZSgncHNrY3J5cHRvJyk7XG5jb25zdCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL3V0aWxzJyk7XG5jb25zdCBEc2VlZENhZ2UgPSByZXF1aXJlKCcuLi91dGlscy9Ec2VlZENhZ2UnKTtcbmNvbnN0IEhhc2hDYWdlID0gcmVxdWlyZSgnLi4vdXRpbHMvSGFzaENhZ2UnKTtcbmNvbnN0IENTQkNhY2hlID0gcmVxdWlyZShcIi4vQ1NCQ2FjaGVcIik7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZShcIi4vQ1NCSWRlbnRpZmllclwiKTtcbmNvbnN0IEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpO1xuXG5jb25zdCByYXdDU0JDYWNoZSA9IG5ldyBDU0JDYWNoZSgxMCk7XG5jb25zdCBpbnN0YW5jZXMgPSB7fTtcblxuLyoqXG4gKlxuICogQHBhcmFtIGxvY2FsRm9sZGVyICAgLSByZXF1aXJlZFxuICogQHBhcmFtIGN1cnJlbnRSYXdDU0IgLSBvcHRpb25hbFxuICogQHBhcmFtIGNzYklkZW50aWZpZXIgLSByZXF1aXJlZFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFJvb3RDU0IobG9jYWxGb2xkZXIsIGN1cnJlbnRSYXdDU0IsIGNzYklkZW50aWZpZXIpIHtcbiAgICBpZiAoIWxvY2FsRm9sZGVyIHx8ICFjc2JJZGVudGlmaWVyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyByZXF1aXJlZCBwYXJhbWV0ZXJzJyk7XG4gICAgfVxuXG5cbiAgICBjb25zdCBoYXNoQ2FnZSA9IG5ldyBIYXNoQ2FnZShsb2NhbEZvbGRlcik7XG4gICAgY29uc3QgZXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgdGhpcy5vbiA9IGV2ZW50Lm9uO1xuICAgIHRoaXMub2ZmID0gZXZlbnQucmVtb3ZlTGlzdGVuZXI7XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBldmVudC5yZW1vdmVBbGxMaXN0ZW5lcnM7XG4gICAgdGhpcy5lbWl0ID0gZXZlbnQuZW1pdDtcblxuICAgIHRoaXMuZ2V0TWlkUm9vdCA9IGZ1bmN0aW9uIChDU0JQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH07XG5cbiAgICB0aGlzLmxvYWRSYXdDU0IgPSBmdW5jdGlvbiAoQ1NCUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCFjdXJyZW50UmF3Q1NCKSB7XG4gICAgICAgICAgICBfX2xvYWRSYXdDU0IoY3NiSWRlbnRpZmllciwgKGVyciwgcmF3Q1NCKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjdXJyZW50UmF3Q1NCID0gcmF3Q1NCO1xuXG4gICAgICAgICAgICAgICAgaWYgKENTQlBhdGggfHwgQ1NCUGF0aCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkUmF3Q1NCKENTQlBhdGgsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgY3VycmVudFJhd0NTQik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIUNTQlBhdGggfHwgQ1NCUGF0aCA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBjdXJyZW50UmF3Q1NCKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubG9hZEFzc2V0RnJvbVBhdGgoQ1NCUGF0aCwgKGVyciwgYXNzZXQsIHJhd0NTQikgPT4ge1xuXG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghYXNzZXQgfHwgIWFzc2V0LmRzZWVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihgVGhlIENTQlBhdGggJHtDU0JQYXRofSBpcyBpbnZhbGlkLmApKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgX19sb2FkUmF3Q1NCKG5ldyBDU0JJZGVudGlmaWVyKGFzc2V0LmRzZWVkKSwgY2FsbGJhY2spO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5zYXZlUmF3Q1NCID0gZnVuY3Rpb24gKHJhd0NTQiwgQ1NCUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gc2F2ZSBtYXN0ZXJcbiAgICAgICAgaWYgKCFDU0JQYXRoIHx8IENTQlBhdGggPT09ICcnKSB7XG4gICAgICAgICAgICBpZiAocmF3Q1NCKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFJhd0NTQiA9IHJhd0NTQjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgX19pbml0aWFsaXplQXNzZXRzKGN1cnJlbnRSYXdDU0IpO1xuICAgICAgICAgICAgcmV0dXJuIF9fd3JpdGVSYXdDU0IoY3VycmVudFJhd0NTQiwgY3NiSWRlbnRpZmllciwgY2FsbGJhY2spO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2F2ZSBjc2IgaW4gaGllcmFyY2h5XG4gICAgICAgIGNvbnN0IHNwbGl0UGF0aCA9IF9fc3BsaXRQYXRoKENTQlBhdGgpO1xuICAgICAgICB0aGlzLmxvYWRBc3NldEZyb21QYXRoKENTQlBhdGgsIChlcnIsIGNzYlJlZmVyZW5jZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFjc2JSZWZlcmVuY2UuZHNlZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBiYWNrdXBzID0gY3NiSWRlbnRpZmllci5nZXRCYWNrdXBVcmxzKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Q1NCSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKHVuZGVmaW5lZCwgYmFja3Vwcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgbG9jYWxTZWVkID0gbmV3Q1NCSWRlbnRpZmllci5nZXRTZWVkKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbG9jYWxEc2VlZCA9IG5ld0NTQklkZW50aWZpZXIuZ2V0RHNlZWQoKTtcbiAgICAgICAgICAgICAgICBjc2JSZWZlcmVuY2UuaW5pdChzcGxpdFBhdGguYXNzZXRBaWQsIGxvY2FsU2VlZCwgbG9jYWxEc2VlZCk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLnNhdmVBc3NldFRvUGF0aChDU0JQYXRoLCBjc2JSZWZlcmVuY2UsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRBc3NldEZyb21QYXRoKENTQlBhdGgsIChlcnIsIGNzYlJlZikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBfX2luaXRpYWxpemVBc3NldHMocmF3Q1NCLCBjc2JSZWYsIGJhY2t1cHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgX193cml0ZVJhd0NTQihyYXdDU0IsIG5ldyBDU0JJZGVudGlmaWVyKGNzYlJlZmVyZW5jZS5kc2VlZCksIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnZW5kJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX193cml0ZVJhd0NTQihyYXdDU0IsIG5ldyBDU0JJZGVudGlmaWVyKGNzYlJlZmVyZW5jZS5kc2VlZCksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuc2F2ZUFzc2V0VG9QYXRoID0gZnVuY3Rpb24gKENTQlBhdGgsIGFzc2V0LCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBzcGxpdFBhdGggPSBfX3NwbGl0UGF0aChDU0JQYXRoLCB7a2VlcEFsaWFzZXNBc1N0cmluZzogdHJ1ZX0pO1xuICAgICAgICB0aGlzLmxvYWRSYXdDU0Ioc3BsaXRQYXRoLkNTQkFsaWFzZXMsIChlcnIsIHJhd0NTQikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByYXdDU0Iuc2F2ZUFzc2V0KGFzc2V0KTtcbiAgICAgICAgICAgICAgICB0aGlzLnNhdmVSYXdDU0IocmF3Q1NCLCBzcGxpdFBhdGguQ1NCQWxpYXNlcywgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMubG9hZEFzc2V0RnJvbVBhdGggPSBmdW5jdGlvbiAoQ1NCUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgcHJvY2Vzc2VkUGF0aCA9IF9fc3BsaXRQYXRoKENTQlBhdGgpO1xuICAgICAgICBpZiAoIWN1cnJlbnRSYXdDU0IpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ2N1cnJlbnRSYXdDU0IgZG9lcyBub3QgZXhpc3QnKSk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgQ1NCUmVmZXJlbmNlID0gbnVsbDtcbiAgICAgICAgaWYgKHByb2Nlc3NlZFBhdGguQ1NCQWxpYXNlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBuZXh0QWxpYXMgPSBwcm9jZXNzZWRQYXRoLkNTQkFsaWFzZXNbMF07XG4gICAgICAgICAgICBDU0JSZWZlcmVuY2UgPSBjdXJyZW50UmF3Q1NCLmdldEFzc2V0KCdnbG9iYWwuQ1NCUmVmZXJlbmNlJywgbmV4dEFsaWFzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghcHJvY2Vzc2VkUGF0aC5hc3NldFR5cGUgfHwgIXByb2Nlc3NlZFBhdGguYXNzZXRBaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdOb3QgYXNzZXQgdHlwZSBvciBpZCBzcGVjaWZpZWQgaW4gQ1NCUGF0aCcpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgQ1NCUmVmZXJlbmNlID0gY3VycmVudFJhd0NTQi5nZXRBc3NldChwcm9jZXNzZWRQYXRoLmFzc2V0VHlwZSwgcHJvY2Vzc2VkUGF0aC5hc3NldEFpZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvY2Vzc2VkUGF0aC5DU0JBbGlhc2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIENTQlJlZmVyZW5jZSwgY3VycmVudFJhd0NTQik7XG4gICAgICAgIH1cblxuICAgICAgICBwcm9jZXNzZWRQYXRoLkNTQkFsaWFzZXMuc2hpZnQoKTtcblxuICAgICAgICBpZighQ1NCUmVmZXJlbmNlIHx8ICFDU0JSZWZlcmVuY2UuZHNlZWQpe1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihgVGhlIENTQlBhdGggJHtDU0JQYXRofSBpcyBpbnZhbGlkYCkpO1xuICAgICAgICB9XG4gICAgICAgIF9fbG9hZEFzc2V0RnJvbVBhdGgocHJvY2Vzc2VkUGF0aCwgbmV3IENTQklkZW50aWZpZXIoQ1NCUmVmZXJlbmNlLmRzZWVkKSwgMCwgY2FsbGJhY2spO1xuICAgIH07XG5cblxuICAgIC8qIC0tLS0tLS0tLS0tLS0tLS0tLS0gSU5URVJOQUwgTUVUSE9EUyAtLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbiAgICBmdW5jdGlvbiBfX2xvYWRSYXdDU0IobG9jYWxDU0JJZGVudGlmaWVyLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCB1aWQgPSBsb2NhbENTQklkZW50aWZpZXIuZ2V0VWlkKCk7XG4gICAgICAgIGNvbnN0IGNhY2hlZFJhd0NTQiA9IHJhd0NTQkNhY2hlLmxvYWQodWlkKTtcblxuICAgICAgICBpZiAoY2FjaGVkUmF3Q1NCKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgY2FjaGVkUmF3Q1NCKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJvb3RQYXRoID0gdXRpbHMuZ2VuZXJhdGVQYXRoKGxvY2FsRm9sZGVyLCBsb2NhbENTQklkZW50aWZpZXIpO1xuICAgICAgICBmcy5yZWFkRmlsZShyb290UGF0aCwgKGVyciwgZW5jcnlwdGVkQ3NiKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNyeXB0by5kZWNyeXB0T2JqZWN0KGVuY3J5cHRlZENzYiwgbG9jYWxDU0JJZGVudGlmaWVyLmdldERzZWVkKCksIChlcnIsIGNzYkRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBjc2IgPSBuZXcgUmF3Q1NCKGNzYkRhdGEpO1xuICAgICAgICAgICAgICAgIHJhd0NTQkNhY2hlLnB1dCh1aWQsIGNzYik7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgY3NiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBDU0JQYXRoOiBzdHJpbmcgLSBpbnRlcm5hbCBwYXRoIHRoYXQgbG9va3MgbGlrZSAve0NTQk5hbWUxfS97Q1NCTmFtZTJ9Onthc3NldFR5cGV9Onthc3NldEFsaWFzT3JJZH1cbiAgICAgKiBAcGFyYW0gb3B0aW9uczpvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7e0NTQkFsaWFzZXM6IFtzdHJpbmddLCBhc3NldEFpZDogKCp8dW5kZWZpbmVkKSwgYXNzZXRUeXBlOiAoKnx1bmRlZmluZWQpfX1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9fc3BsaXRQYXRoKENTQlBhdGgsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCBwYXRoU2VwYXJhdG9yID0gJy8nO1xuXG4gICAgICAgIGlmIChDU0JQYXRoLnN0YXJ0c1dpdGgocGF0aFNlcGFyYXRvcikpIHtcbiAgICAgICAgICAgIENTQlBhdGggPSBDU0JQYXRoLnN1YnN0cmluZygxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBDU0JBbGlhc2VzID0gQ1NCUGF0aC5zcGxpdChwYXRoU2VwYXJhdG9yKTtcbiAgICAgICAgaWYgKENTQkFsaWFzZXMubGVuZ3RoIDwgMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDU0JQYXRoIHRvbyBzaG9ydCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbGFzdEluZGV4ID0gQ1NCQWxpYXNlcy5sZW5ndGggLSAxO1xuICAgICAgICBjb25zdCBvcHRpb25hbEFzc2V0U2VsZWN0b3IgPSBDU0JBbGlhc2VzW2xhc3RJbmRleF0uc3BsaXQoJzonKTtcblxuICAgICAgICBpZiAob3B0aW9uYWxBc3NldFNlbGVjdG9yWzBdID09PSAnJykge1xuICAgICAgICAgICAgQ1NCQWxpYXNlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQ1NCQWxpYXNlc1tsYXN0SW5kZXhdID0gb3B0aW9uYWxBc3NldFNlbGVjdG9yWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvcHRpb25hbEFzc2V0U2VsZWN0b3JbMV0gJiYgIW9wdGlvbmFsQXNzZXRTZWxlY3RvclsyXSkge1xuICAgICAgICAgICAgb3B0aW9uYWxBc3NldFNlbGVjdG9yWzFdID0gJ2dsb2JhbC5DU0JSZWZlcmVuY2UnO1xuICAgICAgICAgICAgb3B0aW9uYWxBc3NldFNlbGVjdG9yWzJdID0gQ1NCQWxpYXNlc1tsYXN0SW5kZXhdO1xuICAgICAgICAgICAgQ1NCQWxpYXNlcy5wb3AoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLmtlZXBBbGlhc2VzQXNTdHJpbmcgPT09IHRydWUpIHtcbiAgICAgICAgICAgIENTQkFsaWFzZXMgPSBDU0JBbGlhc2VzLmpvaW4oJy8nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgQ1NCQWxpYXNlczogQ1NCQWxpYXNlcyxcbiAgICAgICAgICAgIGFzc2V0VHlwZTogb3B0aW9uYWxBc3NldFNlbGVjdG9yWzFdLFxuICAgICAgICAgICAgYXNzZXRBaWQ6IG9wdGlvbmFsQXNzZXRTZWxlY3RvclsyXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9fbG9hZEFzc2V0RnJvbVBhdGgocHJvY2Vzc2VkUGF0aCwgbG9jYWxDU0JJZGVudGlmaWVyLCBjdXJyZW50SW5kZXgsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9fbG9hZFJhd0NTQihsb2NhbENTQklkZW50aWZpZXIsIChlcnIsIHJhd0NTQikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY3VycmVudEluZGV4IDwgcHJvY2Vzc2VkUGF0aC5DU0JBbGlhc2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5leHRBbGlhcyA9IHByb2Nlc3NlZFBhdGguQ1NCQWxpYXNlc1tjdXJyZW50SW5kZXhdO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0ID0gcmF3Q1NCLmdldEFzc2V0KFwiZ2xvYmFsLkNTQlJlZmVyZW5jZVwiLCBuZXh0QWxpYXMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0NTQklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihhc3NldC5kc2VlZCk7XG5cbiAgICAgICAgICAgICAgICBfX2xvYWRBc3NldEZyb21QYXRoKHByb2Nlc3NlZFBhdGgsIG5ld0NTQklkZW50aWZpZXIsICsrY3VycmVudEluZGV4LCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBhc3NldCA9IHJhd0NTQi5nZXRBc3NldChwcm9jZXNzZWRQYXRoLmFzc2V0VHlwZSwgcHJvY2Vzc2VkUGF0aC5hc3NldEFpZCk7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCBhc3NldCwgcmF3Q1NCKTtcblxuICAgICAgICB9KTtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9fd3JpdGVSYXdDU0IocmF3Q1NCLCBsb2NhbENTQklkZW50aWZpZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNyeXB0by5lbmNyeXB0T2JqZWN0KHJhd0NTQi5ibG9ja2NoYWluLCBsb2NhbENTQklkZW50aWZpZXIuZ2V0RHNlZWQoKSwgbnVsbCwgKGVyciwgZW5jcnlwdGVkQmxvY2tjaGFpbikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBoYXNoQ2FnZS5sb2FkSGFzaCgoZXJyLCBoYXNoT2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBsb2NhbENTQklkZW50aWZpZXIuZ2V0VWlkKCk7XG4gICAgICAgICAgICAgICAgaGFzaE9ialtrZXldID0gY3J5cHRvLnBza0hhc2goZW5jcnlwdGVkQmxvY2tjaGFpbikudG9TdHJpbmcoJ2hleCcpO1xuXG4gICAgICAgICAgICAgICAgaGFzaENhZ2Uuc2F2ZUhhc2goaGFzaE9iaiwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZSh1dGlscy5nZW5lcmF0ZVBhdGgobG9jYWxGb2xkZXIsIGxvY2FsQ1NCSWRlbnRpZmllciksIGVuY3J5cHRlZEJsb2NrY2hhaW4sIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfX2luaXRpYWxpemVBc3NldHMocmF3Q1NCLCBjc2JSZWYsIGJhY2t1cFVybHMpIHtcblxuICAgICAgICBsZXQgaXNNYXN0ZXI7XG5cbiAgICAgICAgY29uc3QgY3NiTWV0YSA9IHJhd0NTQi5nZXRBc3NldCgnZ2xvYmFsLkNTQk1ldGEnLCAnbWV0YScpO1xuICAgICAgICBpZiAoY3VycmVudFJhd0NTQiA9PT0gcmF3Q1NCKSB7XG4gICAgICAgICAgICBpc01hc3RlciA9IHR5cGVvZiBjc2JNZXRhLmlzTWFzdGVyID09PSAndW5kZWZpbmVkJyA/IHRydWUgOiBjc2JNZXRhLmlzTWFzdGVyO1xuICAgICAgICAgICAgaWYgKCFjc2JNZXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgY3NiTWV0YS5pbml0KCQkLnVpZEdlbmVyYXRvci5zYWZlX3V1aWQoKSk7XG4gICAgICAgICAgICAgICAgY3NiTWV0YS5zZXRJc01hc3Rlcihpc01hc3Rlcik7XG4gICAgICAgICAgICAgICAgcmF3Q1NCLnNhdmVBc3NldChjc2JNZXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJhY2t1cFVybHMuZm9yRWFjaCgodXJsKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdWlkID0gJCQudWlkR2VuZXJhdG9yLnNhZmVfdXVpZCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJhY2t1cCA9IHJhd0NTQi5nZXRBc3NldCgnZ2xvYmFsLkJhY2t1cCcsIHVpZCk7XG4gICAgICAgICAgICAgICAgYmFja3VwLmluaXQodWlkLCB1cmwpO1xuICAgICAgICAgICAgICAgIHJhd0NTQi5zYXZlQXNzZXQoYmFja3VwKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpc01hc3RlciA9IHR5cGVvZiBjc2JNZXRhLmlzTWFzdGVyID09PSAndW5kZWZpbmVkJyA/IGZhbHNlIDogY3NiTWV0YS5pc01hc3RlcjtcbiAgICAgICAgICAgIGNzYk1ldGEuaW5pdChjc2JSZWYuZ2V0TWV0YWRhdGEoJ3N3YXJtSWQnKSk7XG4gICAgICAgICAgICBjc2JNZXRhLnNldElzTWFzdGVyKGlzTWFzdGVyKTtcbiAgICAgICAgICAgIHJhd0NTQi5zYXZlQXNzZXQoY3NiTWV0YSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuZnVuY3Rpb24gY3JlYXRlUm9vdENTQihsb2NhbEZvbGRlciwgbWFzdGVyUmF3Q1NCLCBjc2JJZGVudGlmaWVyLCBwaW4sIGNhbGxiYWNrKSB7XG4gICAgbGV0IG1hc3RlckRzZWVkO1xuXG4gICAgaWYgKGNzYklkZW50aWZpZXIpIHtcbiAgICAgICAgbWFzdGVyRHNlZWQgPSBjc2JJZGVudGlmaWVyLmdldERzZWVkKCk7XG4gICAgICAgIGlmIChtYXN0ZXJSYXdDU0IpIHtcbiAgICAgICAgICAgIGNvbnN0IHJvb3RDU0IgPSBuZXcgUm9vdENTQihsb2NhbEZvbGRlciwgbWFzdGVyUmF3Q1NCLCBtYXN0ZXJEc2VlZCk7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgcm9vdENTQik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbG9hZFdpdGhJZGVudGlmaWVyKGxvY2FsRm9sZGVyLCBtYXN0ZXJEc2VlZCwgY2FsbGJhY2spO1xuICAgIH0gZWxzZSBpZiAocGluKSB7XG5cbiAgICAgICAgcmV0dXJuIGxvYWRXaXRoUGluKGxvY2FsRm9sZGVyLCBwaW4sIGNhbGxiYWNrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdNaXNzaW5nIHNlZWQsIGRzZWVkIGFuZCBwaW4sIGF0IGxlYXN0IG9uZSBpcyByZXF1aXJlZCcpKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGxvYWRXaXRoUGluKGxvY2FsRm9sZGVyLCBwaW4sIGNhbGxiYWNrKSB7XG4gICAgbmV3IERzZWVkQ2FnZShsb2NhbEZvbGRlcikubG9hZERzZWVkQmFja3VwcyhwaW4sIChlcnIsIGNzYklkZW50aWZpZXIsIGJhY2t1cHMpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWNzYklkZW50aWZpZXIgJiYgKCFiYWNrdXBzIHx8IGJhY2t1cHMubGVuZ3RoID09PSAwKSkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWNzYklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayh1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBiYWNrdXBzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRzZWVkID0gY3NiSWRlbnRpZmllci5nZXREc2VlZCgpO1xuICAgICAgICBjb25zdCBrZXkgPSBjcnlwdG8uZ2VuZXJhdGVTYWZlVWlkKGRzZWVkLCBsb2NhbEZvbGRlcik7XG4gICAgICAgIGlmICghaW5zdGFuY2VzW2tleV0pIHtcbiAgICAgICAgICAgIGluc3RhbmNlc1trZXldID0gbmV3IFJvb3RDU0IobG9jYWxGb2xkZXIsIG51bGwsIGNzYklkZW50aWZpZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgcm9vdENTQiA9IGluc3RhbmNlc1trZXldO1xuXG4gICAgICAgIHJvb3RDU0IubG9hZFJhd0NTQignJywgKGVycikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCByb290Q1NCLCBjc2JJZGVudGlmaWVyLCBiYWNrdXBzKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGxvYWRXaXRoSWRlbnRpZmllcihsb2NhbEZvbGRlciwgY3NiSWRlbnRpZmllciwgY2FsbGJhY2spIHtcbiAgICBjb25zdCBtYXN0ZXJEc2VlZCA9IGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKTtcbiAgICBjb25zdCBrZXkgPSBjcnlwdG8uZ2VuZXJhdGVTYWZlVWlkKG1hc3RlckRzZWVkLCBsb2NhbEZvbGRlcik7XG4gICAgaWYgKCFpbnN0YW5jZXNba2V5XSkge1xuICAgICAgICBpbnN0YW5jZXNba2V5XSA9IG5ldyBSb290Q1NCKGxvY2FsRm9sZGVyLCBudWxsLCBjc2JJZGVudGlmaWVyKTtcbiAgICB9XG5cbiAgICBjb25zdCByb290Q1NCID0gaW5zdGFuY2VzW2tleV07XG4gICAgcm9vdENTQi5sb2FkUmF3Q1NCKCcnLCAoZXJyKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJvb3RDU0IpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVOZXcobG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIsIHJhd0NTQikge1xuICAgIGlmICghbG9jYWxGb2xkZXIgfHwgIWNzYklkZW50aWZpZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyByZXF1aXJlZCBhcmd1bWVudHNcIik7XG4gICAgfVxuXG4gICAgcmF3Q1NCID0gcmF3Q1NCIHx8IG5ldyBSYXdDU0IoKTtcbiAgICBjb25zdCBtYXN0ZXJEc2VlZCA9IGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKTtcbiAgICBjb25zdCBrZXkgPSBjcnlwdG8uZ2VuZXJhdGVTYWZlVWlkKG1hc3RlckRzZWVkLCBsb2NhbEZvbGRlcik7XG4gICAgaWYgKCFpbnN0YW5jZXNba2V5XSkge1xuICAgICAgICBpbnN0YW5jZXNba2V5XSA9IG5ldyBSb290Q1NCKGxvY2FsRm9sZGVyLCByYXdDU0IsIGNzYklkZW50aWZpZXIpO1xuICAgIH1cblxuICAgIHJldHVybiBpbnN0YW5jZXNba2V5XTtcbn1cblxuZnVuY3Rpb24gd3JpdGVOZXdNYXN0ZXJDU0IobG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFsb2NhbEZvbGRlciB8fCAhY3NiSWRlbnRpZmllcikge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdNaXNzaW5nIHJlcXVpcmVkIGFyZ3VtZW50cycpKTtcbiAgICB9XG5cbiAgICBjb25zdCBtYXN0ZXJEc2VlZCA9IGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKTtcbiAgICBjb25zdCBrZXkgPSBjcnlwdG8uZ2VuZXJhdGVTYWZlVWlkKG1hc3RlckRzZWVkLCBsb2NhbEZvbGRlcik7XG4gICAgaWYgKCFpbnN0YW5jZXNba2V5XSkge1xuICAgICAgICBpbnN0YW5jZXNba2V5XSA9IG5ldyBSb290Q1NCKGxvY2FsRm9sZGVyLCBudWxsLCBjc2JJZGVudGlmaWVyKTtcbiAgICB9XG5cbiAgICBjb25zdCByb290Q1NCID0gaW5zdGFuY2VzW2tleV07XG4gICAgcm9vdENTQi5zYXZlUmF3Q1NCKG5ldyBSYXdDU0IoKSwgJycsIGNhbGxiYWNrKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY3JlYXRlTmV3LFxuICAgIGNyZWF0ZVJvb3RDU0IsXG4gICAgbG9hZFdpdGhJZGVudGlmaWVyLFxuICAgIGxvYWRXaXRoUGluLFxuICAgIHdyaXRlTmV3TWFzdGVyQ1NCXG59OyIsImNvbnN0IGZsb3dzVXRpbHMgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy92YWxpZGF0b3JcIik7XG5jb25zdCBEc2VlZENhZ2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRHNlZWRDYWdlXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJhZGRCYWNrdXBcIiwge1xuICAgIHN0YXJ0OiBmdW5jdGlvbiAoYmFja3VwVXJsLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgICAgICAgaWYoIWJhY2t1cFVybCl7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgbmV3IEVycm9yKFwiTm8gYmFja3VwIHVybCBwcm92aWRlZFwiKSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuYmFja3VwVXJsID0gYmFja3VwVXJsO1xuICAgICAgICBmcy5zdGF0KHBhdGguam9pbih0aGlzLmxvY2FsRm9sZGVyLCBcIi5wcml2YXRlU2t5XCIsICdkc2VlZCcpLCAoZXJyLCBzdGF0cyk9PntcbiAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiY3JlYXRlUGluXCIsIGZsb3dzVXRpbHMuZGVmYXVsdFBpbiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHZhbGlkYXRlUGluOiBmdW5jdGlvbiAocGluKSB7XG4gICAgICAgIHZhbGlkYXRvci52YWxpZGF0ZVBpbih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLCBcImFkZEJhY2t1cFwiLCBwaW4sIGZsb3dzVXRpbHMubm9Ucmllcyk7XG4gICAgfSxcbiAgICBcbiAgICBhZGRCYWNrdXA6IGZ1bmN0aW9uIChwaW4gPSBmbG93c1V0aWxzLmRlZmF1bHRQaW4sIGJhY2t1cHMpIHtcbiAgICAgICAgYmFja3VwcyA9IGJhY2t1cHMgfHwgW107XG4gICAgICAgIGJhY2t1cHMucHVzaCh0aGlzLmJhY2t1cFVybCk7XG4gICAgICAgIGNvbnN0IGRzZWVkQ2FnZSA9IG5ldyBEc2VlZENhZ2UodGhpcy5sb2NhbEZvbGRlcik7XG4gICAgICAgIGRzZWVkQ2FnZS5zYXZlRHNlZWRCYWNrdXBzKHBpbiwgdGhpcy5jc2JJZGVudGlmaWVyLCBiYWNrdXBzLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAnZmluaXNoJywgXCJGYWlsZWQgdG8gc2F2ZSBiYWNrdXBzXCIpKTtcbiAgICB9LFxuXG4gICAgZmluaXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCAncHJpbnRJbmZvJywgdGhpcy5iYWNrdXBVcmwgKyAnIGhhcyBiZWVuIHN1Y2Nlc3NmdWxseSBhZGRlZCB0byBiYWNrdXBzIGxpc3QuJyk7XG4gICAgfVxufSk7IiwiLy8gdmFyIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcblxuY29uc3QgdXRpbHMgPSByZXF1aXJlKFwiLi8uLi8uLi91dGlscy9mbG93c1V0aWxzXCIpO1xuLy8gY29uc3QgY3J5cHRvID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcbi8vIHZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJhZGRDc2JcIiwge1xuXHRzdGFydDogZnVuY3Rpb24gKGFsaWFzQ3NiLCBhbGlhc0Rlc3RDc2IpIHtcblx0XHR0aGlzLmFsaWFzQ3NiID0gYWxpYXNDc2I7XG5cdFx0dGhpcy5hbGlhc0Rlc3RDc2IgPSBhbGlhc0Rlc3RDc2I7XG5cdFx0dGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFBpblwiLCAzKTtcblx0fSxcblx0dmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dXRpbHMuY2hlY2tQaW5Jc1ZhbGlkKHBpbiwgZnVuY3Rpb24gKGVycikge1xuXHRcdFx0aWYoZXJyKXtcblx0XHRcdFx0c2VsZi5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFBpblwiLCBub1RyaWVzLTEpO1xuXHRcdFx0fWVsc2Uge1xuXHRcdFx0XHRzZWxmLmFkZENzYihwaW4sIHNlbGYuYWxpYXNDc2IpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHRhZGRDc2I6IGZ1bmN0aW9uIChwaW4sIGFsaWFzQ1NiLCBhbGlhc0Rlc3RDc2IsIGNhbGxiYWNrKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHV0aWxzLmdldENzYihwaW4sIGFsaWFzQ1NiLCBmdW5jdGlvbiAoZXJyLCBwYXJlbnRDc2IpIHtcblx0XHRcdGlmKGVycil7XG5cdFx0XHRcdHNlbGYuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImhhbmRsZUVycm9yXCIsIGVyciwgXCJGYWlsZWQgdG8gZ2V0IGNzYlwiKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufSk7IiwiY29uc3QgZmxvd3NVdGlscyA9IHJlcXVpcmUoXCIuLy4uLy4uL3V0aWxzL2Zsb3dzVXRpbHNcIik7XG5jb25zdCB1dGlscyA9IHJlcXVpcmUoXCIuLy4uLy4uL3V0aWxzL3V0aWxzXCIpO1xuY29uc3QgY3J5cHRvID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcbmNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy92YWxpZGF0b3JcIik7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZShcIi4uL0NTQklkZW50aWZpZXJcIik7XG5jb25zdCBIYXNoQ2FnZSA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzL0hhc2hDYWdlJyk7XG5jb25zdCBSb290Q1NCID0gcmVxdWlyZShcIi4uL1Jvb3RDU0JcIik7XG5cbiQkLnN3YXJtLmRlc2NyaWJlKFwiYXR0YWNoRmlsZVwiLCB7IC8vdXJsOiBDU0IxL0NTQjIvYWxpYXNGaWxlXG4gICAgc3RhcnQ6IGZ1bmN0aW9uICh1cmwsIGZpbGVQYXRoLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHsgLy9jc2IxOmFzc2V0VHlwZTphbGlhc1xuICAgICAgICBjb25zdCB7Q1NCUGF0aCwgYWxpYXN9ID0gdXRpbHMucHJvY2Vzc1VybCh1cmwsICdGaWxlUmVmZXJlbmNlJyk7XG4gICAgICAgIHRoaXMuQ1NCUGF0aCA9IENTQlBhdGg7XG4gICAgICAgIHRoaXMuYWxpYXMgPSBhbGlhcztcbiAgICAgICAgdGhpcy5maWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICB9LFxuXG4gICAgdmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcbiAgICAgICAgdmFsaWRhdG9yLnZhbGlkYXRlUGluKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMsICdsb2FkRmlsZVJlZmVyZW5jZScsIHBpbiwgbm9Ucmllcyk7XG4gICAgfSxcblxuICAgIHdpdGhDU0JJZGVudGlmaWVyOiBmdW5jdGlvbiAoaWQsIHVybCwgZmlsZVBhdGgsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICBjb25zdCB7Q1NCUGF0aCwgYWxpYXN9ID0gdXRpbHMucHJvY2Vzc1VybCh1cmwsICdGaWxlUmVmZXJlbmNlJyk7XG4gICAgICAgIHRoaXMuQ1NCUGF0aCA9IENTQlBhdGg7XG4gICAgICAgIHRoaXMuYWxpYXMgPSBhbGlhcztcbiAgICAgICAgdGhpcy5maWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKGlkKTtcbiAgICAgICAgUm9vdENTQi5sb2FkV2l0aElkZW50aWZpZXIodGhpcy5sb2NhbEZvbGRlciwgdGhpcy5jc2JJZGVudGlmaWVyLCAoZXJyLCByb290Q1NCKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgZXJyLCBcIkZhaWxlZCB0byBsb2FkIHJvb3RDU0JcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnJvb3RDU0IgPSByb290Q1NCO1xuICAgICAgICAgICAgdGhpcy5sb2FkRmlsZVJlZmVyZW5jZSgpO1xuXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBsb2FkRmlsZVJlZmVyZW5jZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJvb3RDU0IubG9hZFJhd0NTQignJywgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgJ2xvYWRBc3NldCcsICdGYWlsZWQgdG8gbG9hZCBtYXN0ZXJDU0IuJykpO1xuICAgIH0sXG5cbiAgICBsb2FkQXNzZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5yb290Q1NCLmxvYWRBc3NldEZyb21QYXRoKHRoaXMuQ1NCUGF0aCwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgJ3NhdmVGaWxlVG9EaXNrJywgJ0ZhaWxlZCB0byBsb2FkIGFzc2V0JykpO1xuICAgIH0sXG5cbiAgICBzYXZlRmlsZVRvRGlzazogZnVuY3Rpb24gKGZpbGVSZWZlcmVuY2UpIHtcbiAgICAgICAgaWYgKGZpbGVSZWZlcmVuY2UuaXNQZXJzaXN0ZWQoKSkge1xuICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgbmV3IEVycm9yKFwiRmlsZSBpcyBwZXJzaXN0ZWRcIiksIFwiQSBmaWxlIHdpdGggdGhlIHNhbWUgYWxpYXMgYWxyZWFkeSBleGlzdHMgXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKHVuZGVmaW5lZCwgdGhpcy5jc2JJZGVudGlmaWVyLmdldEJhY2t1cFVybHMoKSk7XG4gICAgICAgIHRoaXMuZmlsZUlEID0gdXRpbHMuZ2VuZXJhdGVQYXRoKHRoaXMubG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIpO1xuICAgICAgICBjcnlwdG8ub24oJ3Byb2dyZXNzJywgKHByb2dyZXNzKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdyZXBvcnRQcm9ncmVzcycsIHByb2dyZXNzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNyeXB0by5lbmNyeXB0U3RyZWFtKHRoaXMuZmlsZVBhdGgsIHRoaXMuZmlsZUlELCBjc2JJZGVudGlmaWVyLmdldERzZWVkKCksIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsICdzYXZlRmlsZVJlZmVyZW5jZScsIFwiRmFpbGVkIGF0IGZpbGUgZW5jcnlwdGlvbi5cIiwgZmlsZVJlZmVyZW5jZSwgY3NiSWRlbnRpZmllcikpO1xuXG4gICAgfSxcblxuXG4gICAgc2F2ZUZpbGVSZWZlcmVuY2U6IGZ1bmN0aW9uIChmaWxlUmVmZXJlbmNlLCBjc2JJZGVudGlmaWVyKSB7XG4gICAgICAgIGNyeXB0by5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3Byb2dyZXNzJyk7XG4gICAgICAgIGZpbGVSZWZlcmVuY2UuaW5pdCh0aGlzLmFsaWFzLCBjc2JJZGVudGlmaWVyLmdldFNlZWQoKSwgY3NiSWRlbnRpZmllci5nZXREc2VlZCgpKTtcbiAgICAgICAgdGhpcy5yb290Q1NCLnNhdmVBc3NldFRvUGF0aCh0aGlzLkNTQlBhdGgsIGZpbGVSZWZlcmVuY2UsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsICdjb21wdXRlSGFzaCcsIFwiRmFpbGVkIHRvIHNhdmUgZmlsZVwiLCB0aGlzLmZpbGVJRCkpO1xuICAgIH0sXG5cblxuICAgIGNvbXB1dGVIYXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnN0IGZpbGVTdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKHRoaXMuZmlsZUlEKTtcbiAgICAgICAgY3J5cHRvLnBza0hhc2hTdHJlYW0oZmlsZVN0cmVhbSwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJsb2FkSGFzaE9ialwiLCBcIkZhaWxlZCB0byBjb21wdXRlIGhhc2hcIikpO1xuICAgIH0sXG5cbiAgICBsb2FkSGFzaE9iajogZnVuY3Rpb24gKGRpZ2VzdCkge1xuICAgICAgICB0aGlzLmhhc2hDYWdlID0gbmV3IEhhc2hDYWdlKHRoaXMubG9jYWxGb2xkZXIpO1xuICAgICAgICB0aGlzLmhhc2hDYWdlLmxvYWRIYXNoKHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwiYWRkVG9IYXNoT2JqXCIsIFwiRmFpbGVkIHRvIGxvYWQgaGFzaE9ialwiLCBkaWdlc3QpKTtcbiAgICB9LFxuXG4gICAgYWRkVG9IYXNoT2JqOiBmdW5jdGlvbiAoaGFzaE9iaiwgZGlnZXN0KSB7XG4gICAgICAgIGhhc2hPYmpbcGF0aC5iYXNlbmFtZSh0aGlzLmZpbGVJRCldID0gZGlnZXN0LnRvU3RyaW5nKFwiaGV4XCIpO1xuICAgICAgICB0aGlzLmhhc2hDYWdlLnNhdmVIYXNoKGhhc2hPYmosIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwicHJpbnRTdWNjZXNzXCIsIFwiRmFpbGVkIHRvIHNhdmUgaGFzaE9ialwiKSk7XG4gICAgfSxcblxuICAgIHByaW50U3VjY2VzczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJwcmludEluZm9cIiwgdGhpcy5maWxlUGF0aCArIFwiIGhhcyBiZWVuIHN1Y2Nlc3NmdWxseSBhZGRlZCB0byBcIiArIHRoaXMuQ1NCUGF0aCk7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcIl9fcmV0dXJuX19cIik7XG4gICAgfVxufSk7XG4iLCJjb25zdCBmbG93c1V0aWxzID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMvZmxvd3NVdGlscycpO1xuY29uc3QgUm9vdENTQiA9IHJlcXVpcmUoXCIuLi9Sb290Q1NCXCIpO1xuY29uc3QgUmF3Q1NCID0gcmVxdWlyZShcIi4uL1Jhd0NTQlwiKTtcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy92YWxpZGF0b3JcIik7XG5jb25zdCBEc2VlZENhZ2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRHNlZWRDYWdlXCIpO1xuY29uc3QgQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoXCIuLi9DU0JJZGVudGlmaWVyXCIpO1xuXG4kJC5zd2FybS5kZXNjcmliZShcImNyZWF0ZUNzYlwiLCB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uIChDU0JQYXRoLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICB0aGlzLkNTQlBhdGggPSBDU0JQYXRoIHx8ICcnO1xuICAgICAgICB2YWxpZGF0b3IuY2hlY2tNYXN0ZXJDU0JFeGlzdHMobG9jYWxGb2xkZXIsIChlcnIsIHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImNyZWF0ZVBpblwiLCBmbG93c1V0aWxzLmRlZmF1bHRQaW4pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkUGluXCIsIGZsb3dzVXRpbHMubm9Ucmllcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICB3aXRob3V0UGluOiBmdW5jdGlvbiAoQ1NCUGF0aCwgYmFja3VwcywgbG9jYWxGb2xkZXIgPSBwcm9jZXNzLmN3ZCgpLCBzZWVkLCBpc01hc3RlciA9IGZhbHNlKSB7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgdGhpcy5DU0JQYXRoID0gQ1NCUGF0aDtcbiAgICAgICAgdGhpcy5pc01hc3RlciA9IGlzTWFzdGVyO1xuICAgICAgICBpZiAodHlwZW9mIGJhY2t1cHMgPT09ICd1bmRlZmluZWQnIHx8IGJhY2t1cHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBiYWNrdXBzID0gWyBmbG93c1V0aWxzLmRlZmF1bHRCYWNrdXAgXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhbGlkYXRvci5jaGVja01hc3RlckNTQkV4aXN0cyhsb2NhbEZvbGRlciwgKGVyciwgc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVNYXN0ZXJDU0IoYmFja3Vwcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihzZWVkKTtcbiAgICAgICAgICAgICAgICB0aGlzLndpdGhDU0JJZGVudGlmaWVyKENTQlBhdGgsIGNzYklkZW50aWZpZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICB3aXRoQ1NCSWRlbnRpZmllcjogZnVuY3Rpb24gKENTQlBhdGgsIGNzYklkZW50aWZpZXIpIHtcbiAgICAgICAgdGhpcy5DU0JQYXRoID0gQ1NCUGF0aDtcbiAgICAgICAgUm9vdENTQi5sb2FkV2l0aElkZW50aWZpZXIodGhpcy5sb2NhbEZvbGRlciwgY3NiSWRlbnRpZmllciwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgJ2NyZWF0ZUNTQicsICdGYWlsZWQgdG8gbG9hZCBtYXN0ZXIgd2l0aCBwcm92aWRlZCBkc2VlZCcpKTtcbiAgICB9LFxuXG4gICAgdmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcbiAgICAgICAgdmFsaWRhdG9yLnZhbGlkYXRlUGluKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMsIFwiY3JlYXRlQ1NCXCIsIHBpbiwgbm9Ucmllcyk7XG4gICAgfSxcblxuICAgIGxvYWRCYWNrdXBzOiBmdW5jdGlvbiAocGluKSB7XG4gICAgICAgIHRoaXMucGluID0gcGluO1xuICAgICAgICB0aGlzLmRzZWVkQ2FnZSA9IG5ldyBEc2VlZENhZ2UodGhpcy5sb2NhbEZvbGRlcik7XG4gICAgICAgIHRoaXMuZHNlZWRDYWdlLmxvYWREc2VlZEJhY2t1cHModGhpcy5waW4sIChlcnIsIGNzYklkZW50aWZpZXIsIGJhY2t1cHMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZU1hc3RlckNTQigpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZU1hc3RlckNTQihiYWNrdXBzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGNyZWF0ZU1hc3RlckNTQjogZnVuY3Rpb24gKGJhY2t1cHMpIHtcbiAgICAgICAgdGhpcy5jc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIodW5kZWZpbmVkLCBiYWNrdXBzIHx8IGZsb3dzVXRpbHMuZGVmYXVsdEJhY2t1cCk7XG5cbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicHJpbnRTZW5zaXRpdmVJbmZvXCIsIHRoaXMuY3NiSWRlbnRpZmllci5nZXRTZWVkKCksIGZsb3dzVXRpbHMuZGVmYXVsdFBpbik7XG5cbiAgICAgICAgY29uc3QgcmF3Q1NCID0gbmV3IFJhd0NTQigpO1xuICAgICAgICBjb25zdCBtZXRhID0gcmF3Q1NCLmdldEFzc2V0KCdnbG9iYWwuQ1NCTWV0YScsICdtZXRhJyk7XG4gICAgICAgIG1ldGEuaW5pdCgpO1xuICAgICAgICBtZXRhLnNldElzTWFzdGVyKHRydWUpO1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMuaXNNYXN0ZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBtZXRhLnNldElzTWFzdGVyKHRoaXMuaXNNYXN0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJhd0NTQi5zYXZlQXNzZXQobWV0YSk7XG4gICAgICAgIHRoaXMucm9vdENTQiA9IFJvb3RDU0IuY3JlYXRlTmV3KHRoaXMubG9jYWxGb2xkZXIsIHRoaXMuY3NiSWRlbnRpZmllciwgcmF3Q1NCKTtcbiAgICAgICAgY29uc3QgbmV4dFBoYXNlID0gKHRoaXMuQ1NCUGF0aCA9PT0gJycgfHwgdHlwZW9mIHRoaXMuQ1NCUGF0aCA9PT0gJ3VuZGVmaW5lZCcpID8gJ3NhdmVSYXdDU0InIDogJ2NyZWF0ZUNTQic7XG4gICAgICAgIGlmICh0aGlzLnBpbikge1xuICAgICAgICAgICAgdGhpcy5kc2VlZENhZ2Uuc2F2ZURzZWVkQmFja3Vwcyh0aGlzLnBpbiwgdGhpcy5jc2JJZGVudGlmaWVyLCBiYWNrdXBzLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBuZXh0UGhhc2UsIFwiRmFpbGVkIHRvIHNhdmUgZHNlZWQgXCIpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXNbbmV4dFBoYXNlXSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZUNTQjogZnVuY3Rpb24gKHJvb3RDU0IpIHtcbiAgICAgICAgdGhpcy5yb290Q1NCID0gdGhpcy5yb290Q1NCIHx8IHJvb3RDU0I7XG4gICAgICAgIGNvbnN0IHJhd0NTQiA9IG5ldyBSYXdDU0IoKTtcbiAgICAgICAgY29uc3QgbWV0YSA9IHJhd0NTQi5nZXRBc3NldChcImdsb2JhbC5DU0JNZXRhXCIsIFwibWV0YVwiKTtcbiAgICAgICAgbWV0YS5pbml0KCk7XG4gICAgICAgIG1ldGEuc2V0SXNNYXN0ZXIoZmFsc2UpO1xuICAgICAgICByYXdDU0Iuc2F2ZUFzc2V0KG1ldGEpO1xuICAgICAgICB0aGlzLnNhdmVSYXdDU0IocmF3Q1NCKTtcbiAgICB9LFxuXG4gICAgc2F2ZVJhd0NTQjogZnVuY3Rpb24gKHJhd0NTQikge1xuICAgICAgICB0aGlzLnJvb3RDU0Iuc2F2ZVJhd0NTQihyYXdDU0IsIHRoaXMuQ1NCUGF0aCwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJwcmludFN1Y2Nlc3NcIiwgXCJGYWlsZWQgdG8gc2F2ZSByYXcgQ1NCXCIpKTtcblxuICAgIH0sXG5cblxuICAgIHByaW50U3VjY2VzczogZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgbWVzc2FnZSA9IFwiU3VjY2Vzc2Z1bGx5IHNhdmVkIENTQiBhdCBwYXRoIFwiICsgdGhpcy5DU0JQYXRoO1xuICAgICAgICBpZiAoIXRoaXMuQ1NCUGF0aCB8fCB0aGlzLkNTQlBhdGggPT09ICcnKSB7XG4gICAgICAgICAgICBtZXNzYWdlID0gJ1N1Y2Nlc3NmdWxseSBzYXZlZCBDU0Igcm9vdCc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicHJpbnRJbmZvXCIsIG1lc3NhZ2UpO1xuICAgICAgICB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdfX3JldHVybl9fJyk7XG4gICAgfVxufSk7XG4iLCJjb25zdCBmbG93c1V0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IHV0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvdXRpbHNcIik7XG5jb25zdCBjcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuY29uc3QgdmFsaWRhdG9yID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL3ZhbGlkYXRvclwiKTtcbmNvbnN0IENTQklkZW50aWZpZXIgPSByZXF1aXJlKFwiLi4vQ1NCSWRlbnRpZmllclwiKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJleHRyYWN0RmlsZVwiLCB7XG5cdHN0YXJ0OiBmdW5jdGlvbiAodXJsLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcblx0XHR0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG5cdFx0Y29uc3Qge0NTQlBhdGgsIGFsaWFzfSA9IHV0aWxzLnByb2Nlc3NVcmwodXJsLCAnZ2xvYmFsLkZpbGVSZWZlcmVuY2UnKTtcblx0XHR0aGlzLkNTQlBhdGggPSBDU0JQYXRoO1xuXHRcdHRoaXMuYWxpYXMgPSBhbGlhcztcblx0XHR0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkUGluXCIsIGZsb3dzVXRpbHMubm9Ucmllcyk7XG5cdH0sXG5cblx0dmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcblx0XHR2YWxpZGF0b3IudmFsaWRhdGVQaW4odGhpcy5sb2NhbEZvbGRlciwgdGhpcywgXCJsb2FkRmlsZUFzc2V0XCIsIHBpbiwgbm9Ucmllcyk7XG5cdH0sXG5cblx0bG9hZEZpbGVBc3NldDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMucm9vdENTQi5sb2FkQXNzZXRGcm9tUGF0aCh0aGlzLkNTQlBhdGgsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwiZGVjcnlwdEZpbGVcIiwgXCJGYWlsZWQgdG8gbG9hZCBmaWxlIGFzc2V0IFwiICsgdGhpcy5hbGlhcykpO1xuXHR9LFxuXHRcblx0ZGVjcnlwdEZpbGU6IGZ1bmN0aW9uIChmaWxlUmVmZXJlbmNlKSB7XG5cdFx0Y29uc3QgY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKGZpbGVSZWZlcmVuY2UuZHNlZWQpO1xuXHRcdGNvbnN0IGZpbGVQYXRoID0gdXRpbHMuZ2VuZXJhdGVQYXRoKHRoaXMubG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIpO1xuXG5cdFx0Y3J5cHRvLm9uKCdwcm9ncmVzcycsIChwcm9ncmVzcykgPT4ge1xuICAgICAgICAgICAgdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAncmVwb3J0UHJvZ3Jlc3MnLCBwcm9ncmVzcyk7XG4gICAgICAgIH0pO1xuXG5cdFx0Y3J5cHRvLmRlY3J5cHRTdHJlYW0oZmlsZVBhdGgsIHRoaXMubG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKSwgKGVyciwgZmlsZU5hbWVzKSA9PiB7XG5cdFx0XHRpZihlcnIpe1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgZXJyLCBcIkZhaWxlZCB0byBkZWNyeXB0IGZpbGVcIiArIGZpbGVQYXRoKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicHJpbnRJbmZvXCIsIHRoaXMuYWxpYXMgKyBcIiB3YXMgc3VjY2Vzc2Z1bGx5IGV4dHJhY3RlZC4gXCIpO1xuXHRcdFx0dGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiX19yZXR1cm5fX1wiLCBmaWxlTmFtZXMpO1xuXHRcdH0pO1xuXHR9XG59KTsiLCJjb25zdCBmbG93c1V0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy92YWxpZGF0b3JcIik7XG4vLyBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IFJvb3RDU0IgPSByZXF1aXJlKFwiLi4vUm9vdENTQlwiKTtcbmNvbnN0IENTQklkZW50aWZpZXIgPSByZXF1aXJlKFwiLi4vQ1NCSWRlbnRpZmllclwiKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJsaXN0Q1NCc1wiLCB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uIChDU0JQYXRoLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICB0aGlzLkNTQlBhdGggPSBDU0JQYXRoIHx8ICcnO1xuICAgICAgICB2YWxpZGF0b3IuY2hlY2tNYXN0ZXJDU0JFeGlzdHMobG9jYWxGb2xkZXIsIChlcnIsIHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcIm5vTWFzdGVyQ1NCRXhpc3RzXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkUGluXCIsIGZsb3dzVXRpbHMubm9Ucmllcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICB3aXRoQ1NCSWRlbnRpZmllcjogZnVuY3Rpb24gKGlkLCBDU0JQYXRoID0gJycsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICB0aGlzLmNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihpZCk7XG4gICAgICAgIHRoaXMuQ1NCUGF0aCA9IENTQlBhdGg7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgdGhpcy5sb2FkTWFzdGVyUmF3Q1NCKCk7XG4gICAgfSxcblxuICAgIGxvYWRNYXN0ZXJSYXdDU0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgUm9vdENTQi5sb2FkV2l0aElkZW50aWZpZXIodGhpcy5sb2NhbEZvbGRlciwgdGhpcy5jc2JJZGVudGlmaWVyLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcImxvYWRSYXdDU0JcIiwgXCJGYWlsZWQgdG8gY3JlYXRlIFJvb3RDU0IuXCIpKTtcbiAgICB9LFxuXG4gICAgdmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcbiAgICAgICAgdmFsaWRhdG9yLnZhbGlkYXRlUGluKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMsICdsb2FkUmF3Q1NCJywgcGluLCBub1RyaWVzKTtcbiAgICB9LFxuXG4gICAgbG9hZFJhd0NTQjogZnVuY3Rpb24gKHJvb3RDU0IpIHtcbiAgICAgICAgaWYodHlwZW9mIHRoaXMucm9vdENTQiA9PT0gXCJ1bmRlZmluZWRcIiAmJiByb290Q1NCKXtcbiAgICAgICAgICAgIHRoaXMucm9vdENTQiA9IHJvb3RDU0I7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yb290Q1NCLmxvYWRSYXdDU0IodGhpcy5DU0JQYXRoLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAnZ2V0Q1NCcycsICdGYWlsZWQgdG8gbG9hZCByYXdDU0InKSk7XG4gICAgfSxcblxuICAgIGdldENTQnM6IGZ1bmN0aW9uIChyYXdDU0IpIHtcbiAgICAgICAgY29uc3QgY3NiUmVmZXJlbmNlcyA9IHJhd0NTQi5nZXRBbGxBc3NldHMoJ2dsb2JhbC5DU0JSZWZlcmVuY2UnKTtcbiAgICAgICAgY29uc3QgY3Nic0FsaWFzZXMgPSBjc2JSZWZlcmVuY2VzLm1hcCgocmVmKSA9PiByZWYuYWxpYXMpO1xuXG4gICAgICAgIGNvbnN0IGZpbGVSZWZlcmVuY2VzID0gcmF3Q1NCLmdldEFsbEFzc2V0cygnZ2xvYmFsLkZpbGVSZWZlcmVuY2UnKTtcbiAgICAgICAgY29uc3QgZmlsZXNBbGlhc2VzID0gZmlsZVJlZmVyZW5jZXMubWFwKChyZWYpID0+IHJlZi5hbGlhcyk7XG5cbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiX19yZXR1cm5fX1wiLCB7XG4gICAgICAgICAgICBjc2JzOiBjc2JzQWxpYXNlcyxcbiAgICAgICAgICAgIGZpbGVzOiBmaWxlc0FsaWFzZXNcbiAgICAgICAgfSk7XG4gICAgfVxuXG59KTtcbiIsImNvbnN0IHV0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IFJvb3RDU0IgPSByZXF1aXJlKFwiLi4vUm9vdENTQlwiKTtcbmNvbnN0IERzZWVkQ2FnZSA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9Ec2VlZENhZ2VcIik7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZShcIi4uL0NTQklkZW50aWZpZXJcIik7XG5cbiQkLnN3YXJtLmRlc2NyaWJlKFwicmVzZXRQaW5cIiwge1xuICAgIHN0YXJ0OiBmdW5jdGlvbiAobG9jYWxGb2xkZXIgPSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFNlZWRcIiwgdXRpbHMubm9Ucmllcyk7XG4gICAgfSxcblxuICAgIHZhbGlkYXRlU2VlZDogZnVuY3Rpb24gKHNlZWQsIG5vVHJpZXMpIHtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgdGhpcy5jc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoc2VlZCk7XG4gICAgICAgICAgICBSb290Q1NCLmxvYWRXaXRoSWRlbnRpZmllcih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLmNzYklkZW50aWZpZXIsIChlcnIsIHJvb3RDU0IpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRTZWVkXCIsIG5vVHJpZXMgLSAxKTtcbiAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaW5zZXJ0UGluXCIsIHV0aWxzLm5vVHJpZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBuZXcgRXJyb3IoJ0ludmFsaWQgc2VlZCcpKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhY3R1YWxpemVQaW46IGZ1bmN0aW9uIChwaW4pIHtcbiAgICAgICAgY29uc3QgZHNlZWRDYWdlID0gbmV3IERzZWVkQ2FnZSh0aGlzLmxvY2FsRm9sZGVyKTtcbiAgICAgICAgZHNlZWRDYWdlLnNhdmVEc2VlZEJhY2t1cHMocGluLCB0aGlzLmNzYklkZW50aWZpZXIsIHVuZGVmaW5lZCwgKGVycik9PntcbiAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImhhbmRsZUVycm9yXCIsIFwiRmFpbGVkIHRvIHNhdmUgZHNlZWQuXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJwcmludEluZm9cIiwgXCJUaGUgcGluIGhhcyBiZWVuIGNoYW5nZWQgc3VjY2Vzc2Z1bGx5LlwiKTtcbiAgICAgICAgfSk7XG4gICAgfVxufSk7XG4iLCJjb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCBmbG93c1V0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IHV0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvdXRpbHNcIik7XG5jb25zdCBjcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5jb25zdCB2YWxpZGF0b3IgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvdmFsaWRhdG9yXCIpO1xuY29uc3QgRHNlZWRDYWdlID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0RzZWVkQ2FnZVwiKTtcbmNvbnN0IFJvb3RDU0IgPSByZXF1aXJlKCcuLi9Sb290Q1NCJyk7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZSgnLi4vQ1NCSWRlbnRpZmllcicpO1xuY29uc3QgQmFja3VwRW5naW5lID0gcmVxdWlyZSgnLi4vQmFja3VwRW5naW5lJyk7XG5jb25zdCBIYXNoQ2FnZSA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzL0hhc2hDYWdlJyk7XG5jb25zdCBBc3luY0Rpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi8uLi91dGlscy9Bc3luY0Rpc3BhdGNoZXInKTtcblxuXG4kJC5zd2FybS5kZXNjcmliZShcInJlc3RvcmVcIiwge1xuICAgIHN0YXJ0OiBmdW5jdGlvbiAodXJsLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICBpZiAodXJsKSB7XG4gICAgICAgICAgICBjb25zdCB7Q1NCUGF0aCwgYWxpYXN9ID0gdXRpbHMucHJvY2Vzc1VybCh1cmwsICdnbG9iYWwuQ1NCUmVmZXJlbmNlJyk7XG4gICAgICAgICAgICB0aGlzLkNTQlBhdGggPSBDU0JQYXRoO1xuICAgICAgICAgICAgdGhpcy5DU0JBbGlhcyA9IGFsaWFzO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFNlZWRcIik7XG4gICAgfSxcblxuICAgIHdpdGhTZWVkOiBmdW5jdGlvbiAodXJsLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCksIHNlZWRSZXN0b3JlLCBsb2NhbFNlZWQpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICBpZiAodXJsKSB7XG4gICAgICAgICAgICBjb25zdCB7Q1NCUGF0aCwgYWxpYXN9ID0gdXRpbHMucHJvY2Vzc1VybCh1cmwsICdnbG9iYWwuQ1NCUmVmZXJlbmNlJyk7XG4gICAgICAgICAgICB0aGlzLkNTQlBhdGggPSBDU0JQYXRoO1xuICAgICAgICAgICAgdGhpcy5DU0JBbGlhcyA9IGFsaWFzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxvY2FsU2VlZCkge1xuICAgICAgICAgICAgdGhpcy5sb2NhbENTQklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihsb2NhbFNlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXN0b3JlQ1NCKHNlZWRSZXN0b3JlKTtcbiAgICB9LFxuXG4gICAgcmVzdG9yZUNTQjogZnVuY3Rpb24gKHJlc3RvcmVTZWVkKSB7XG4gICAgICAgIHRoaXMuaGFzaENhZ2UgPSBuZXcgSGFzaENhZ2UodGhpcy5sb2NhbEZvbGRlcik7XG4gICAgICAgIHRoaXMuaGFzaE9iaiA9IHt9O1xuICAgICAgICB0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIocmVzdG9yZVNlZWQpO1xuICAgICAgICBsZXQgYmFja3VwVXJscztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGJhY2t1cFVybHMgPSB0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyLmdldEJhY2t1cFVybHMoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2hhbmRsZUVycm9yJywgbmV3IEVycm9yKCdJbnZhbGlkIHNlZWQnKSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmJhY2t1cFVybHMgPSBiYWNrdXBVcmxzO1xuICAgICAgICB0aGlzLnJlc3RvcmVEc2VlZENhZ2UgPSBuZXcgRHNlZWRDYWdlKHRoaXMubG9jYWxGb2xkZXIpO1xuICAgICAgICBjb25zdCBiYWNrdXBFbmdpbmUgPSBuZXcgQmFja3VwRW5naW5lLmdldEJhY2t1cEVuZ2luZSh0aGlzLmJhY2t1cFVybHMpO1xuXG4gICAgICAgIGJhY2t1cEVuZ2luZS5sb2FkKHRoaXMuY3NiUmVzdG9yZUlkZW50aWZpZXIsIChlcnIsIGVuY3J5cHRlZENTQikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBlcnIsIFwiRmFpbGVkIHRvIHJlc3RvcmUgQ1NCXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9fYWRkQ1NCSGFzaCh0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyLCBlbmNyeXB0ZWRDU0IpO1xuICAgICAgICAgICAgdGhpcy5lbmNyeXB0ZWRDU0IgPSBlbmNyeXB0ZWRDU0I7XG5cbiAgICAgICAgICAgIHZhbGlkYXRvci5jaGVja01hc3RlckNTQkV4aXN0cyh0aGlzLmxvY2FsRm9sZGVyLCAoZXJyLCBzdGF0dXMpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzdGF0dXMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlQXV4Rm9sZGVyKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmxvY2FsQ1NCSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuQ1NCQWxpYXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0aWxzLmRlbGV0ZVJlY3Vyc2l2ZWx5KHRoaXMubG9jYWxGb2xkZXIsIHRydWUsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBuZXcgRXJyb3IoXCJObyBDU0IgYWxpYXMgd2FzIHNwZWNpZmllZFwiKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVDU0IoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5DU0JBbGlhcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImhhbmRsZUVycm9yXCIsIG5ldyBFcnJvcihcIk5vIENTQiBhbGlhcyB3YXMgc3BlY2lmaWVkXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgdmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcbiAgICAgICAgdmFsaWRhdG9yLnZhbGlkYXRlUGluKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMsIFwid3JpdGVDU0JcIiwgcGluLCBub1RyaWVzKTtcbiAgICB9LFxuXG4gICAgY3JlYXRlQXV4Rm9sZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZzLm1rZGlyKHBhdGguam9pbih0aGlzLmxvY2FsRm9sZGVyLCBcIi5wcml2YXRlU2t5XCIpLCB7cmVjdXJzaXZlOiB0cnVlfSwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJ3cml0ZUNTQlwiLCBcIkZhaWxlZCB0byBjcmVhdGUgZm9sZGVyIC5wcml2YXRlU2t5XCIpKTtcbiAgICB9LFxuXG5cbiAgICB3cml0ZUNTQjogZnVuY3Rpb24gKCkge1xuICAgICAgICBmcy53cml0ZUZpbGUodXRpbHMuZ2VuZXJhdGVQYXRoKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMuY3NiUmVzdG9yZUlkZW50aWZpZXIpLCB0aGlzLmVuY3J5cHRlZENTQiwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJjcmVhdGVSb290Q1NCXCIsIFwiRmFpbGVkIHRvIHdyaXRlIG1hc3RlckNTQiB0byBkaXNrXCIpKTtcbiAgICB9LFxuXG4gICAgY3JlYXRlUm9vdENTQjogZnVuY3Rpb24gKCkge1xuICAgICAgICBSb290Q1NCLmxvYWRXaXRoSWRlbnRpZmllcih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcImxvYWRSYXdDU0JcIiwgXCJGYWlsZWQgdG8gY3JlYXRlIHJvb3RDU0Igd2l0aCBkc2VlZFwiKSk7XG4gICAgfSxcblxuICAgIGxvYWRSYXdDU0I6IGZ1bmN0aW9uIChyb290Q1NCKSB7XG5cbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIgPSBuZXcgQXN5bmNEaXNwYXRjaGVyKCggZXJycywgc3VjY3MpID0+IHtcbiAgICAgICAgICAgIHRoaXMuaGFzaENhZ2Uuc2F2ZUhhc2godGhpcy5oYXNoT2JqLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBlcnIsICdGYWlsZWQgdG8gc2F2ZSBoYXNoT2JqJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ3ByaW50SW5mbycsICdBbGwgQ1NCcyBoYXZlIGJlZW4gcmVzdG9yZWQuJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnX19yZXR1cm5fXycpO1xuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJvb3RDU0IubG9hZFJhd0NTQignJywgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJjaGVja0NTQlN0YXR1c1wiLCBcIkZhaWxlZCB0byBsb2FkIFJhd0NTQlwiLCByb290Q1NCKSk7XG4gICAgfSxcblxuICAgIGNoZWNrQ1NCU3RhdHVzOiBmdW5jdGlvbiAocmF3Q1NCLCByb290Q1NCKSB7XG4gICAgICAgIHRoaXMucmF3Q1NCID0gcmF3Q1NCO1xuICAgICAgICBjb25zdCBtZXRhID0gdGhpcy5yYXdDU0IuZ2V0QXNzZXQoJ2dsb2JhbC5DU0JNZXRhJywgJ21ldGEnKTtcbiAgICAgICAgaWYgKHRoaXMucm9vdENTQikge1xuICAgICAgICAgICAgdGhpcy5hdHRhY2hDU0IodGhpcy5yb290Q1NCLCB0aGlzLkNTQlBhdGgsIHRoaXMuQ1NCQWxpYXMsIHRoaXMuY3NiUmVzdG9yZUlkZW50aWZpZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKG1ldGEuaXNNYXN0ZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJvb3RDU0IgPSByb290Q1NCO1xuICAgICAgICAgICAgICAgIHRoaXMuc2F2ZURzZWVkKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlTWFzdGVyQ1NCKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgc2F2ZURzZWVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucmVzdG9yZURzZWVkQ2FnZS5zYXZlRHNlZWRCYWNrdXBzKGZsb3dzVXRpbHMuZGVmYXVsdFBpbiwgdGhpcy5jc2JSZXN0b3JlSWRlbnRpZmllciwgdW5kZWZpbmVkLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcImNvbGxlY3RGaWxlc1wiLCBcIkZhaWxlZCB0byBzYXZlIGRzZWVkXCIsIHRoaXMucmF3Q1NCLCB0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyLCAnJywgJ21hc3RlcicpKTtcbiAgICB9LFxuXG5cbiAgICBjcmVhdGVNYXN0ZXJDU0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc3QgY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKHVuZGVmaW5lZCwgdGhpcy5iYWNrdXBVcmxzKTtcbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicHJpbnRTZW5zaXRpdmVJbmZvXCIsIGNzYklkZW50aWZpZXIuZ2V0U2VlZCgpLCBmbG93c1V0aWxzLmRlZmF1bHRQaW4pO1xuICAgICAgICB0aGlzLnJvb3RDU0IgPSBSb290Q1NCLmNyZWF0ZU5ldyh0aGlzLmxvY2FsRm9sZGVyLCBjc2JJZGVudGlmaWVyKTtcbiAgICAgICAgdGhpcy5yZXN0b3JlRHNlZWRDYWdlLnNhdmVEc2VlZEJhY2t1cHMoZmxvd3NVdGlscy5kZWZhdWx0UGluLCBjc2JJZGVudGlmaWVyLCB1bmRlZmluZWQsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwiYXR0YWNoQ1NCXCIsIFwiRmFpbGVkIHRvIHNhdmUgbWFzdGVyIGRzZWVkIFwiLCB0aGlzLnJvb3RDU0IsIHRoaXMuQ1NCUGF0aCwgdGhpcy5DU0JBbGlhcywgdGhpcy5jc2JSZXN0b3JlSWRlbnRpZmllcikpO1xuICAgIH0sXG5cblxuICAgIGF0dGFjaENTQjogZnVuY3Rpb24gKHJvb3RDU0IsIENTQlBhdGgsIENTQkFsaWFzLCBjc2JJZGVudGlmaWVyKSB7XG4gICAgICAgIHRoaXMuX19hdHRhY2hDU0Iocm9vdENTQiwgQ1NCUGF0aCwgQ1NCQWxpYXMsIGNzYklkZW50aWZpZXIsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsICdsb2FkUmVzdG9yZWRSYXdDU0InLCAnRmFpbGVkIHRvIGF0dGFjaCByYXdDU0InKSk7XG5cbiAgICB9LFxuXG4gICAgbG9hZFJlc3RvcmVkUmF3Q1NCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuQ1NCUGF0aCA9IHRoaXMuQ1NCUGF0aC5zcGxpdCgnOicpWzBdICsgJy8nICsgdGhpcy5DU0JBbGlhcztcbiAgICAgICAgdGhpcy5yb290Q1NCLmxvYWRSYXdDU0IodGhpcy5DU0JQYXRoLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcImNvbGxlY3RGaWxlc1wiLCBcIkZhaWxlZCB0byBsb2FkIHJlc3RvcmVkIFJhd0NTQlwiLCB0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyLCB0aGlzLkNTQlBhdGgsIHRoaXMuQ1NCQWxpYXMpKTtcbiAgICB9LFxuXG4gICAgY29sbGVjdEZpbGVzOiBmdW5jdGlvbiAocmF3Q1NCLCBjc2JJZGVudGlmaWVyLCBjdXJyZW50UGF0aCwgYWxpYXMsIGNhbGxiYWNrKSB7XG5cbiAgICAgICAgY29uc3QgbGlzdEZpbGVzID0gcmF3Q1NCLmdldEFsbEFzc2V0cygnZ2xvYmFsLkZpbGVSZWZlcmVuY2UnKTtcbiAgICAgICAgY29uc3QgYXN5bmNEaXNwYXRjaGVyID0gbmV3IEFzeW5jRGlzcGF0Y2hlcigoZXJycywgc3VjY3MpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY29sbGVjdENTQnMocmF3Q1NCLCBjc2JJZGVudGlmaWVyLCBjdXJyZW50UGF0aCwgYWxpYXMpO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycnMsIHN1Y2NzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGxpc3RGaWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGlzdEZpbGVzLmZvckVhY2goKGZpbGVSZWZlcmVuY2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihmaWxlUmVmZXJlbmNlLmRzZWVkKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVBbGlhcyA9IGZpbGVSZWZlcmVuY2UuYWxpYXM7XG4gICAgICAgICAgICBjb25zdCB1cmxzID0gY3NiSWRlbnRpZmllci5nZXRCYWNrdXBVcmxzKCk7XG4gICAgICAgICAgICBjb25zdCBiYWNrdXBFbmdpbmUgPSBCYWNrdXBFbmdpbmUuZ2V0QmFja3VwRW5naW5lKHVybHMpO1xuICAgICAgICAgICAgYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkoKTtcbiAgICAgICAgICAgIGJhY2t1cEVuZ2luZS5sb2FkKGNzYklkZW50aWZpZXIsIChlcnIsIGVuY3J5cHRlZEZpbGUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIGVyciwgJ0NvdWxkIG5vdCBkb3dubG9hZCBmaWxlICcgKyBmaWxlQWxpYXMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuX19hZGRDU0JIYXNoKGNzYklkZW50aWZpZXIsIGVuY3J5cHRlZEZpbGUpO1xuXG4gICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlKHV0aWxzLmdlbmVyYXRlUGF0aCh0aGlzLmxvY2FsRm9sZGVyLCBjc2JJZGVudGlmaWVyKSwgZW5jcnlwdGVkRmlsZSwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBlcnIsICdDb3VsZCBub3Qgc2F2ZSBmaWxlICcgKyBmaWxlQWxpYXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKHVuZGVmaW5lZCwgZmlsZUFsaWFzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgY29sbGVjdENTQnM6IGZ1bmN0aW9uIChyYXdDU0IsIGNzYklkZW50aWZpZXIsIGN1cnJlbnRQYXRoLCBhbGlhcykge1xuXG4gICAgICAgIGNvbnN0IGxpc3RDU0JzID0gcmF3Q1NCLmdldEFsbEFzc2V0cygnZ2xvYmFsLkNTQlJlZmVyZW5jZScpO1xuICAgICAgICBjb25zdCBuZXh0QXJndW1lbnRzID0gW107XG4gICAgICAgIGxldCBjb3VudGVyID0gMDtcblxuICAgICAgICBpZiAobGlzdENTQnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KCk7XG4gICAgICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxpc3RDU0JzICYmIGxpc3RDU0JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGxpc3RDU0JzLmZvckVhY2goKENTQlJlZmVyZW5jZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5leHRQYXRoID0gY3VycmVudFBhdGggKyAnLycgKyBDU0JSZWZlcmVuY2UuYWxpYXM7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV4dENTQklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihDU0JSZWZlcmVuY2UuZHNlZWQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5leHRBbGlhcyA9IENTQlJlZmVyZW5jZS5hbGlhcztcbiAgICAgICAgICAgICAgICBjb25zdCBuZXh0VVJMcyA9IGNzYklkZW50aWZpZXIuZ2V0QmFja3VwVXJscygpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJhY2t1cEVuZ2luZSA9IEJhY2t1cEVuZ2luZS5nZXRCYWNrdXBFbmdpbmUobmV4dFVSTHMpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkoKTtcbiAgICAgICAgICAgICAgICBiYWNrdXBFbmdpbmUubG9hZChuZXh0Q1NCSWRlbnRpZmllciwgKGVyciwgZW5jcnlwdGVkQ1NCKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIGVyciwgJ0NvdWxkIG5vdCBkb3dubG9hZCBDU0IgJyArIG5leHRBbGlhcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fYWRkQ1NCSGFzaChuZXh0Q1NCSWRlbnRpZmllciwgZW5jcnlwdGVkQ1NCKTtcblxuICAgICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGUodXRpbHMuZ2VuZXJhdGVQYXRoKHRoaXMubG9jYWxGb2xkZXIsIG5leHRDU0JJZGVudGlmaWVyKSwgZW5jcnlwdGVkQ1NCLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2hhbmRsZUVycm9yJywgZXJyLCAnQ291bGQgbm90IHNhdmUgQ1NCICcgKyBuZXh0QWxpYXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb3RDU0IubG9hZFJhd0NTQihuZXh0UGF0aCwgKGVyciwgbmV4dFJhd0NTQikgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBlcnIsICdGYWlsZWQgdG8gbG9hZCBDU0IgJyArIG5leHRBbGlhcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRBcmd1bWVudHMucHVzaChbIG5leHRSYXdDU0IsIG5leHRDU0JJZGVudGlmaWVyLCBuZXh0UGF0aCwgbmV4dEFsaWFzIF0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCsrY291bnRlciA9PT0gbGlzdENTQnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRBcmd1bWVudHMuZm9yRWFjaCgoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsZWN0RmlsZXMoLi4uYXJncywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKHVuZGVmaW5lZCwgYWxpYXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIF9fdHJ5RG93bmxvYWQodXJscywgY3NiSWRlbnRpZmllciwgaW5kZXgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gdXJscy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ0NvdWxkIG5vdCBkb3dubG9hZCByZXNvdXJjZScpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHVybCA9IHVybHNbaW5kZXhdO1xuICAgICAgICB0aGlzLmJhY2t1cEVuZ2luZS5sb2FkKHVybCwgY3NiSWRlbnRpZmllciwgKGVyciwgcmVzb3VyY2UpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fX3RyeURvd25sb2FkKHVybHMsIGNzYklkZW50aWZpZXIsICsraW5kZXgsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCByZXNvdXJjZSk7XG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIF9fYWRkQ1NCSGFzaDogZnVuY3Rpb24gKGNzYklkZW50aWZpZXIsIGVuY3J5cHRlZENTQikge1xuICAgICAgICBjb25zdCBwc2tIYXNoID0gbmV3IGNyeXB0by5Qc2tIYXNoKCk7XG4gICAgICAgIHBza0hhc2gudXBkYXRlKGVuY3J5cHRlZENTQik7XG4gICAgICAgIHRoaXMuaGFzaE9ialtjc2JJZGVudGlmaWVyLmdldFVpZCgpXSA9IHBza0hhc2guZGlnZXN0KCkudG9TdHJpbmcoJ2hleCcpO1xuXG4gICAgfSxcblxuICAgIF9fYXR0YWNoQ1NCOiBmdW5jdGlvbiAocm9vdENTQiwgQ1NCUGF0aCwgQ1NCQWxpYXMsIGNzYklkZW50aWZpZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghQ1NCQWxpYXMpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJObyBDU0IgYWxpYXMgd2FzIHNwZWNpZmllZFwiKSk7XG4gICAgICAgIH1cblxuICAgICAgICByb290Q1NCLmxvYWRSYXdDU0IoQ1NCUGF0aCwgKGVyciwgcmF3Q1NCKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcm9vdENTQi5sb2FkQXNzZXRGcm9tUGF0aChDU0JQYXRoLCAoZXJyLCBjc2JSZWYpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjc2JSZWYuaW5pdChDU0JBbGlhcywgY3NiSWRlbnRpZmllci5nZXRTZWVkKCksIGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKSk7XG4gICAgICAgICAgICAgICAgICAgIHJvb3RDU0Iuc2F2ZUFzc2V0VG9QYXRoKENTQlBhdGgsIGNzYlJlZiwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKGBBIENTQiBoYXZpbmcgdGhlIGFsaWFzICR7Q1NCQWxpYXN9IGFscmVhZHkgZXhpc3RzLmApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufSk7XG5cbiIsImNvbnN0IHV0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvdXRpbHNcIik7XG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy92YWxpZGF0b3JcIik7XG5jb25zdCBIYXNoQ2FnZSA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzL0hhc2hDYWdlJyk7XG5jb25zdCBBc3luY0Rpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvQXN5bmNEaXNwYXRjaGVyXCIpO1xuY29uc3QgUm9vdENTQiA9IHJlcXVpcmUoJy4uL1Jvb3RDU0InKTtcbmNvbnN0IENTQklkZW50aWZpZXIgPSByZXF1aXJlKCcuLi9DU0JJZGVudGlmaWVyJyk7XG5jb25zdCBCYWNrdXBFbmdpbmUgPSByZXF1aXJlKCcuLi9CYWNrdXBFbmdpbmUnKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJzYXZlQmFja3VwXCIsIHtcbiAgICBzdGFydDogZnVuY3Rpb24gKGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgMyk7XG4gICAgfSxcblxuICAgIHZhbGlkYXRlUGluOiBmdW5jdGlvbiAocGluLCBub1RyaWVzKSB7XG4gICAgICAgIHZhbGlkYXRvci52YWxpZGF0ZVBpbih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLCBcImxvYWRIYXNoRmlsZVwiLCBwaW4sIG5vVHJpZXMpO1xuICAgIH0sXG5cbiAgICB3aXRoQ1NCSWRlbnRpZmllcjogZnVuY3Rpb24gKGlkLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICB0aGlzLmNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihpZCk7XG4gICAgICAgIFJvb3RDU0IubG9hZFdpdGhJZGVudGlmaWVyKGxvY2FsRm9sZGVyLCB0aGlzLmNzYklkZW50aWZpZXIsIChlcnIsIHJvb3RDU0IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIGVyciwgJ0ZhaWxlZCB0byBsb2FkIHJvb3QgQ1NCJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnJvb3RDU0IgPSByb290Q1NCO1xuICAgICAgICAgICAgdGhpcy5sb2FkSGFzaEZpbGUoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGxvYWRIYXNoRmlsZTogZnVuY3Rpb24gKHBpbiwgYmFja3Vwcykge1xuICAgICAgICB0aGlzLmJhY2t1cHMgPSBiYWNrdXBzO1xuICAgICAgICB0aGlzLmhhc2hDYWdlID0gbmV3IEhhc2hDYWdlKHRoaXMubG9jYWxGb2xkZXIpO1xuICAgICAgICB0aGlzLmhhc2hDYWdlLmxvYWRIYXNoKHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsICdyZWFkRW5jcnlwdGVkTWFzdGVyJywgJ0ZhaWxlZCB0byBsb2FkIGhhc2ggZmlsZScpKTtcbiAgICB9LFxuXG4gICAgcmVhZEVuY3J5cHRlZE1hc3RlcjogZnVuY3Rpb24gKGhhc2hGaWxlKSB7XG4gICAgICAgIHRoaXMuaGFzaEZpbGUgPSBoYXNoRmlsZTtcbiAgICAgICAgdGhpcy5tYXN0ZXJJRCA9IHV0aWxzLmdlbmVyYXRlUGF0aCh0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLmNzYklkZW50aWZpZXIpO1xuICAgICAgICBmcy5yZWFkRmlsZSh0aGlzLm1hc3RlcklELCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAnbG9hZE1hc3RlclJhd0NTQicsICdGYWlsZWQgdG8gcmVhZCBtYXN0ZXJDU0IuJykpO1xuICAgIH0sXG5cblxuICAgIGxvYWRNYXN0ZXJSYXdDU0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5yb290Q1NCLmxvYWRSYXdDU0IoJycsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwiZGlzcGF0Y2hlclwiLCBcIkZhaWxlZCB0byBsb2FkIG1hc3RlckNTQlwiKSk7XG4gICAgfSxcblxuICAgIGRpc3BhdGNoZXI6IGZ1bmN0aW9uIChyYXdDU0IpIHtcbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIgPSBuZXcgQXN5bmNEaXNwYXRjaGVyKChlcnJvcnMsIHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcnMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIEpTT04uc3RyaW5naWZ5KGVycm9ycywgbnVsbCwgJ1xcdCcpLCAnRmFpbGVkIHRvIGNvbGxlY3QgYWxsIENTQnMnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbGxlY3RGaWxlcyhyZXN1bHRzKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eSgpO1xuICAgICAgICB0aGlzLmNvbGxlY3RDU0JzKHJhd0NTQiwgdGhpcy5jc2JJZGVudGlmaWVyLCAnJywgJ21hc3RlcicpO1xuICAgIH0sXG5cbiAgICBjb2xsZWN0Q1NCczogZnVuY3Rpb24gKHJhd0NTQiwgY3NiSWRlbnRpZmllciwgY3VycmVudFBhdGgsIGFsaWFzKSB7XG4gICAgICAgIGNvbnN0IGxpc3RDU0JzID0gcmF3Q1NCLmdldEFsbEFzc2V0cygnZ2xvYmFsLkNTQlJlZmVyZW5jZScpO1xuXG4gICAgICAgIGNvbnN0IG5leHRBcmd1bWVudHMgPSBbXTtcbiAgICAgICAgbGV0IGNvdW50ZXIgPSAwO1xuXG4gICAgICAgIGxpc3RDU0JzLmZvckVhY2goKENTQlJlZmVyZW5jZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV4dFBhdGggPSBjdXJyZW50UGF0aCArICcvJyArIENTQlJlZmVyZW5jZS5hbGlhcztcbiAgICAgICAgICAgIGNvbnN0IG5leHRDU0JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoQ1NCUmVmZXJlbmNlLmRzZWVkKTtcbiAgICAgICAgICAgIGNvbnN0IG5leHRBbGlhcyA9IENTQlJlZmVyZW5jZS5hbGlhcztcbiAgICAgICAgICAgIHRoaXMucm9vdENTQi5sb2FkUmF3Q1NCKG5leHRQYXRoLCAoZXJyLCBuZXh0UmF3Q1NCKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBuZXh0QXJndW1lbnRzLnB1c2goWyBuZXh0UmF3Q1NCLCBuZXh0Q1NCSWRlbnRpZmllciwgbmV4dFBhdGgsIG5leHRBbGlhcyBdKTtcbiAgICAgICAgICAgICAgICBpZiAoKytjb3VudGVyID09PSBsaXN0Q1NCcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFyZ3VtZW50cy5mb3JFYWNoKChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxlY3RDU0JzKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQodW5kZWZpbmVkLCB7cmF3Q1NCLCBjc2JJZGVudGlmaWVyLCBhbGlhc30pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAobGlzdENTQnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCh1bmRlZmluZWQsIHtyYXdDU0IsIGNzYklkZW50aWZpZXIsIGFsaWFzfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgY29sbGVjdEZpbGVzOiBmdW5jdGlvbiAoY29sbGVjdGVkQ1NCcykge1xuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlciA9IG5ldyBBc3luY0Rpc3BhdGNoZXIoKGVycm9ycywgbmV3UmVzdWx0cykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9ycykge1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2hhbmRsZUVycm9yJywgSlNPTi5zdHJpbmdpZnkoZXJyb3JzLCBudWxsLCAnXFx0JyksICdGYWlsZWQgdG8gY29sbGVjdCBmaWxlcyBhdHRhY2hlZCB0byBDU0JzJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghbmV3UmVzdWx0cykge1xuICAgICAgICAgICAgICAgIG5ld1Jlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX19jYXRlZ29yaXplKGNvbGxlY3RlZENTQnMuY29uY2F0KG5ld1Jlc3VsdHMpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eShjb2xsZWN0ZWRDU0JzLmxlbmd0aCk7XG4gICAgICAgIGNvbGxlY3RlZENTQnMuZm9yRWFjaCgoe3Jhd0NTQiwgY3NiSWRlbnRpZmllciwgYWxpYXN9KSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9fY29sbGVjdEZpbGVzKHJhd0NTQiwgYWxpYXMpO1xuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICBfX2NhdGVnb3JpemU6IGZ1bmN0aW9uIChmaWxlcykge1xuICAgICAgICBjb25zdCBjYXRlZ29yaWVzID0ge307XG4gICAgICAgIGxldCBiYWNrdXBzO1xuICAgICAgICBmaWxlcy5mb3JFYWNoKCh7Y3NiSWRlbnRpZmllciwgYWxpYXN9KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuYmFja3VwcyB8fCB0aGlzLmJhY2t1cHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYmFja3VwcyA9IGNzYklkZW50aWZpZXIuZ2V0QmFja3VwVXJscygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBiYWNrdXBzID0gdGhpcy5iYWNrdXBzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdWlkID0gY3NiSWRlbnRpZmllci5nZXRVaWQoKTtcbiAgICAgICAgICAgIGNhdGVnb3JpZXNbdWlkXSA9IHtiYWNrdXBzLCBhbGlhc307XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyID0gbmV3IEFzeW5jRGlzcGF0Y2hlcigoZXJyb3JzLCBzdWNjZXNzZXMpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2NzYkJhY2t1cFJlcG9ydCcsIHtlcnJvcnMsIHN1Y2Nlc3Nlc30pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmJhY2t1cEVuZ2luZSA9IEJhY2t1cEVuZ2luZS5nZXRCYWNrdXBFbmdpbmUoYmFja3Vwcyk7XG4gICAgICAgIHRoaXMuZmlsdGVyRmlsZXMoY2F0ZWdvcmllcyk7XG4gICAgICAgIC8vIE9iamVjdC5lbnRyaWVzKGNhdGVnb3JpZXMpLmZvckVhY2goKFt1aWQsIHthbGlhcywgYmFja3Vwc31dKSA9PiB7XG4gICAgICAgIC8vICAgICB0aGlzLmZpbHRlckZpbGVzKHVpZCwgYWxpYXMsIGJhY2t1cHMpO1xuICAgICAgICAvLyB9KTtcbiAgICB9LFxuXG4gICAgZmlsdGVyRmlsZXM6IGZ1bmN0aW9uIChmaWxlc0JhY2t1cHMpIHtcbiAgICAgICAgY29uc3QgZmlsZXNUb1VwZGF0ZSA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLmhhc2hGaWxlKS5mb3JFYWNoKCh1aWQpID0+IHtcbiAgICAgICAgICAgIGlmIChmaWxlc0JhY2t1cHNbdWlkXSkge1xuICAgICAgICAgICAgICAgIGZpbGVzVG9VcGRhdGVbdWlkXSA9IHRoaXMuaGFzaEZpbGVbdWlkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eSgpO1xuICAgICAgICB0aGlzLmJhY2t1cEVuZ2luZS5jb21wYXJlVmVyc2lvbnMoZmlsZXNUb1VwZGF0ZSwgKGVyciwgbW9kaWZpZWRGaWxlcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBlcnIsIFwiRmFpbGVkIHRvIHJldHJpZXZlIGxpc3Qgb2YgbW9kaWZpZWQgZmlsZXNcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX19iYWNrdXBGaWxlcyhKU09OLnBhcnNlKG1vZGlmaWVkRmlsZXMpLCBmaWxlc0JhY2t1cHMpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgX19iYWNrdXBGaWxlczogZnVuY3Rpb24gKGZpbGVzLCBmaWxlc0JhY2t1cHMpIHtcbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eShmaWxlcy5sZW5ndGgpO1xuICAgICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmaWxlU3RyZWFtID0gZnMuY3JlYXRlUmVhZFN0cmVhbShwYXRoLmpvaW4odGhpcy5sb2NhbEZvbGRlciwgZmlsZSkpO1xuICAgICAgICAgICAgY29uc3QgYmFja3VwVXJscyA9IGZpbGVzQmFja3Vwc1tmaWxlXS5iYWNrdXBzO1xuICAgICAgICAgICAgY29uc3QgYmFja3VwRW5naW5lID0gQmFja3VwRW5naW5lLmdldEJhY2t1cEVuZ2luZShiYWNrdXBVcmxzKTtcbiAgICAgICAgICAgIGJhY2t1cEVuZ2luZS5zYXZlKG5ldyBDU0JJZGVudGlmaWVyKGZpbGUpLCBmaWxlU3RyZWFtLCAoZXJyLCB1cmwpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAgdGhpcy5hc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQoe2FsaWFzOiBmaWxlc0JhY2t1cHNbZmlsZV0uYWxpYXMsIGJhY2t1cFVSTDogdXJsfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQodW5kZWZpbmVkLCB7YWxpYXM6IGZpbGVzQmFja3Vwc1tmaWxlXS5hbGlhcywgYmFja3VwVVJMOiB1cmx9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCgpOyAvLyBmb3IgaHR0cCByZXF1ZXN0IHRvIGNvbXBhcmVWZXJzaW9uc1xuICAgIH0sXG5cbiAgICBfX2NvbGxlY3RGaWxlczogZnVuY3Rpb24gKHJhd0NTQiwgY3NiQWxpYXMpIHtcbiAgICAgICAgY29uc3QgZmlsZXMgPSByYXdDU0IuZ2V0QWxsQXNzZXRzKCdnbG9iYWwuRmlsZVJlZmVyZW5jZScpO1xuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KGZpbGVzLmxlbmd0aCk7XG4gICAgICAgIGZpbGVzLmZvckVhY2goKEZpbGVSZWZlcmVuY2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFsaWFzID0gRmlsZVJlZmVyZW5jZS5hbGlhcztcbiAgICAgICAgICAgIGNvbnN0IGNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihGaWxlUmVmZXJlbmNlLmRzZWVkKTtcbiAgICAgICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKHVuZGVmaW5lZCwge2NzYklkZW50aWZpZXIsIGFsaWFzfSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCgpO1xuICAgIH1cbn0pO1xuXG4iLCJjb25zdCB2YWxpZGF0b3IgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvdmFsaWRhdG9yXCIpO1xuY29uc3QgRHNlZWRDYWdlID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMvRHNlZWRDYWdlJyk7XG5cbiQkLnN3YXJtLmRlc2NyaWJlKFwic2V0UGluXCIsIHtcbiAgICBzdGFydDogZnVuY3Rpb24gKGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgMyk7XG4gICAgfSxcblxuICAgIHZhbGlkYXRlUGluOiBmdW5jdGlvbiAob2xkUGluLCBub1RyaWVzKSB7XG4gICAgICAgIHRoaXMub2xkUGluID0gb2xkUGluO1xuICAgICAgICB2YWxpZGF0b3IudmFsaWRhdGVQaW4odGhpcy5sb2NhbEZvbGRlciwgdGhpcywgXCJpbnRlcmFjdGlvbkp1bXBlclwiLCBvbGRQaW4sIG5vVHJpZXMpO1xuICAgIH0sXG5cbiAgICBpbnRlcmFjdGlvbkp1bXBlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJlbnRlck5ld1BpblwiKTtcbiAgICB9LFxuXG4gICAgYWN0dWFsaXplUGluOiBmdW5jdGlvbiAobmV3UGluKSB7XG4gICAgICAgIHRoaXMuZHNlZWRDYWdlID0gbmV3IERzZWVkQ2FnZSh0aGlzLmxvY2FsRm9sZGVyKTtcbiAgICAgICAgdGhpcy5kc2VlZENhZ2UubG9hZERzZWVkQmFja3Vwcyh0aGlzLm9sZFBpbiwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJzYXZlRHNlZWRcIiwgXCJGYWlsZWQgdG8gbG9hZCBkc2VlZC5cIiwgbmV3UGluKSk7XG4gICAgfSxcblxuICAgIHNhdmVEc2VlZDogZnVuY3Rpb24gKGNzYklkZW50aWZpZXIsIGJhY2t1cHMsIHBpbikge1xuICAgICAgICB0aGlzLmRzZWVkQ2FnZS5zYXZlRHNlZWRCYWNrdXBzKHBpbiwgY3NiSWRlbnRpZmllciwgYmFja3VwcywgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJzdWNjZXNzU3RhdGVcIiwgXCJGYWlsZWQgdG8gc2F2ZSBkc2VlZFwiKSk7XG4gICAgfSxcblxuICAgIHN1Y2Nlc3NTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJwcmludEluZm9cIiwgXCJUaGUgcGluIGhhcyBiZWVuIHN1Y2Nlc3NmdWxseSBjaGFuZ2VkLlwiKTtcbiAgICB9XG59KTsiLCJjb25zdCBjcnlwdG8gPSByZXF1aXJlKCdwc2tjcnlwdG8nKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IENTQklkZW50aWZpZXIgPSByZXF1aXJlKFwiLi4vbGlicmFyaWVzL0NTQklkZW50aWZpZXJcIik7XG5cbmZ1bmN0aW9uIERzZWVkQ2FnZShsb2NhbEZvbGRlcikge1xuXHRjb25zdCBkc2VlZEZvbGRlciA9IHBhdGguam9pbihsb2NhbEZvbGRlciwgJy5wcml2YXRlU2t5Jyk7XG5cdGNvbnN0IGRzZWVkUGF0aCA9IHBhdGguam9pbihkc2VlZEZvbGRlciwgJ2RzZWVkJyk7XG5cblx0ZnVuY3Rpb24gbG9hZERzZWVkQmFja3VwcyhwaW4sIGNhbGxiYWNrKSB7XG5cdFx0ZnMubWtkaXIoZHNlZWRGb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCAoZXJyKSA9PiB7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXG5cdFx0XHRjcnlwdG8ubG9hZERhdGEocGluLCBkc2VlZFBhdGgsIChlcnIsIGRzZWVkQmFja3VwcykgPT4ge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHRcdH1cblx0XHRcdFx0dHJ5e1xuXHRcdFx0XHRcdGRzZWVkQmFja3VwcyA9IEpTT04ucGFyc2UoZHNlZWRCYWNrdXBzLnRvU3RyaW5nKCkpO1xuXHRcdFx0XHR9Y2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRsZXQgY3NiSWRlbnRpZmllcjtcblx0XHRcdFx0aWYgKGRzZWVkQmFja3Vwcy5kc2VlZCAmJiAhQnVmZmVyLmlzQnVmZmVyKGRzZWVkQmFja3Vwcy5kc2VlZCkpIHtcblx0XHRcdFx0XHRkc2VlZEJhY2t1cHMuZHNlZWQgPSBCdWZmZXIuZnJvbShkc2VlZEJhY2t1cHMuZHNlZWQpO1xuXHRcdFx0XHRcdGNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihkc2VlZEJhY2t1cHMuZHNlZWQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2FsbGJhY2sodW5kZWZpbmVkLCBjc2JJZGVudGlmaWVyLCBkc2VlZEJhY2t1cHMuYmFja3Vwcyk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNhdmVEc2VlZEJhY2t1cHMocGluLCBjc2JJZGVudGlmaWVyLCBiYWNrdXBzLCBjYWxsYmFjaykge1xuXHRcdGZzLm1rZGlyKGRzZWVkRm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgKGVycikgPT4ge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblxuXHRcdFx0bGV0IGRzZWVkO1xuXHRcdFx0aWYoY3NiSWRlbnRpZmllcil7XG5cdFx0XHRcdGRzZWVkID0gY3NiSWRlbnRpZmllci5nZXREc2VlZCgpO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZHNlZWRCYWNrdXBzID0gSlNPTi5zdHJpbmdpZnkoe1xuXHRcdFx0XHRkc2VlZCxcblx0XHRcdFx0YmFja3Vwc1xuXHRcdFx0fSk7XG5cblx0XHRcdGNyeXB0by5zYXZlRGF0YShCdWZmZXIuZnJvbShkc2VlZEJhY2t1cHMpLCBwaW4sIGRzZWVkUGF0aCwgY2FsbGJhY2spO1xuXHRcdH0pO1xuXHR9XG5cblxuXHRyZXR1cm4ge1xuXHRcdGxvYWREc2VlZEJhY2t1cHMsXG5cdFx0c2F2ZURzZWVkQmFja3Vwcyxcblx0fTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IERzZWVkQ2FnZTsiLCIvLyBjb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5cblxuZXhwb3J0cy5kZWZhdWx0QmFja3VwID0gXCJodHRwOi8vbG9jYWxob3N0OjgwODBcIjtcbmV4cG9ydHMuZGVmYXVsdFBpbiA9IFwiMTIzNDU2NzhcIjtcbmV4cG9ydHMubm9UcmllcyA9IDM7XG5cbiIsImNvbnN0IFJvb3RDU0IgPSByZXF1aXJlKFwiLi4vbGlicmFyaWVzL1Jvb3RDU0JcIik7XG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcblxuXG5tb2R1bGUuZXhwb3J0cy52YWxpZGF0ZVBpbiA9IGZ1bmN0aW9uIChsb2NhbEZvbGRlciwgc3dhcm0sIHBoYXNlTmFtZSwgcGluLCBub1RyaWVzLCAuLi5hcmdzKSB7XG5cdFJvb3RDU0IuY3JlYXRlUm9vdENTQihsb2NhbEZvbGRlciwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHBpbiwgKGVyciwgcm9vdENTQiwgY3NiSWRlbnRpZmllciwgYmFja3VwcykgPT57XG5cdFx0aWYoZXJyKXtcblx0XHRcdHN3YXJtLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkUGluXCIsIG5vVHJpZXMgLSAxKTtcblx0XHR9ZWxzZXtcblx0XHRcdGlmKGNzYklkZW50aWZpZXIpe1xuXHRcdFx0XHRzd2FybS5yb290Q1NCID0gcm9vdENTQjtcblx0XHRcdFx0c3dhcm0uY3NiSWRlbnRpZmllciA9IGNzYklkZW50aWZpZXI7XG5cdFx0XHR9XG5cdFx0XHRhcmdzLnB1c2goYmFja3Vwcyk7XG5cdFx0XHRzd2FybVtwaGFzZU5hbWVdKHBpbiwgLi4uYXJncyk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnJlcG9ydE9yQ29udGludWUgPSBmdW5jdGlvbihzd2FybSwgcGhhc2VOYW1lLCBlcnJvck1lc3NhZ2UsIC4uLmFyZ3Mpe1xuXHRyZXR1cm4gZnVuY3Rpb24oZXJyLC4uLnJlcykge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdHN3YXJtLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBlcnIsIGVycm9yTWVzc2FnZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChwaGFzZU5hbWUpIHtcblx0XHRcdFx0XHRzd2FybVtwaGFzZU5hbWVdKC4uLnJlcywgLi4uYXJncyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufTtcblxubW9kdWxlLmV4cG9ydHMuY2hlY2tNYXN0ZXJDU0JFeGlzdHMgPSBmdW5jdGlvbiAobG9jYWxGb2xkZXIsIGNhbGxiYWNrKSB7XG5cdGZzLnN0YXQocGF0aC5qb2luKGxvY2FsRm9sZGVyLCBcIi5wcml2YXRlU2t5L2hhc2hcIiksIChlcnIsIHN0YXRzKT0+e1xuXHRcdGlmKGVycil7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyLCBmYWxzZSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGNhbGxiYWNrKHVuZGVmaW5lZCwgdHJ1ZSk7XG5cdH0pO1xufTsiLCIvKlxuY29uc2Vuc3VzIGhlbHBlciBmdW5jdGlvbnNcbiovXG5cbnZhciBwc2tjcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuXG5cbmZ1bmN0aW9uIFB1bHNlKHNpZ25lciwgY3VycmVudFB1bHNlTnVtYmVyLCBibG9jaywgbmV3VHJhbnNhY3Rpb25zLCB2c2QsIHRvcCwgbGFzdCkge1xuICAgIHRoaXMuc2lnbmVyICAgICAgICAgPSBzaWduZXI7ICAgICAgICAgICAgICAgLy9hLmsuYS4gZGVsZWdhdGVkQWdlbnROYW1lXG4gICAgdGhpcy5jdXJyZW50UHVsc2UgICA9IGN1cnJlbnRQdWxzZU51bWJlcjtcbiAgICB0aGlzLmxzZXQgICAgICAgICAgID0gbmV3VHJhbnNhY3Rpb25zOyAgICAgIC8vZGlnZXN0IC0+IHRyYW5zYWN0aW9uXG4gICAgdGhpcy5wdEJsb2NrICAgICAgICA9IGJsb2NrOyAgICAgICAgICAgICAgICAvL2FycmF5IG9mIGRpZ2VzdHNcbiAgICB0aGlzLnZzZCAgICAgICAgICAgID0gdnNkO1xuICAgIHRoaXMudG9wICAgICAgICAgICAgPSB0b3A7ICAgICAgICAgICAgICAgICAgLy8gYS5rLmEuIHRvcFB1bHNlQ29uc2Vuc3VzXG4gICAgdGhpcy5sYXN0ICAgICAgICAgICA9IGxhc3Q7ICAgICAgICAgICAgICAgICAvLyBhLmsuYS4gbGFzdFB1bHNlQWNoaWV2ZWRDb25zZW5zdXNcbn1cblxuZnVuY3Rpb24gVHJhbnNhY3Rpb24oY3VycmVudFB1bHNlLCBzd2FybSkge1xuICAgIHRoaXMuaW5wdXQgICAgICA9IHN3YXJtLmlucHV0O1xuICAgIHRoaXMub3V0cHV0ICAgICA9IHN3YXJtLm91dHB1dDtcbiAgICB0aGlzLnN3YXJtICAgICAgPSBzd2FybTtcblxuICAgIHZhciBhcnIgPSBwcm9jZXNzLmhydGltZSgpO1xuICAgIHRoaXMuc2Vjb25kICAgICA9IGFyclswXTtcbiAgICB0aGlzLm5hbm9zZWNvZCAgPSBhcnJbMV07XG5cbiAgICB0aGlzLkNQICAgICAgICAgPSBjdXJyZW50UHVsc2U7XG4gICAgdGhpcy5kaWdlc3QgICAgID0gcHNrY3J5cHRvLmhhc2hWYWx1ZXModGhpcyk7XG59XG5cblxuZXhwb3J0cy5jcmVhdGVUcmFuc2FjdGlvbiA9IGZ1bmN0aW9uIChjdXJyZW50UHVsc2UsIHN3YXJtKSB7XG4gICAgcmV0dXJuIG5ldyBUcmFuc2FjdGlvbihjdXJyZW50UHVsc2UsIHN3YXJtKTtcbn1cblxuZXhwb3J0cy5jcmVhdGVQdWxzZSA9IGZ1bmN0aW9uIChzaWduZXIsIGN1cnJlbnRQdWxzZU51bWJlciwgYmxvY2ssIG5ld1RyYW5zYWN0aW9ucywgdnNkLCB0b3AsIGxhc3QpIHtcbiAgICByZXR1cm4gbmV3IFB1bHNlKHNpZ25lciwgY3VycmVudFB1bHNlTnVtYmVyLCBibG9jaywgbmV3VHJhbnNhY3Rpb25zLCB2c2QsIHRvcCwgbGFzdCk7XG59XG5cbmV4cG9ydHMub3JkZXJUcmFuc2FjdGlvbnMgPSBmdW5jdGlvbiAocHNldCkgeyAvL29yZGVyIGluIHBsYWNlIHRoZSBwc2V0IGFycmF5XG4gICAgdmFyIGFyciA9IFtdO1xuICAgIGZvciAodmFyIGQgaW4gcHNldCkge1xuICAgICAgICBhcnIucHVzaChwc2V0W2RdKTtcbiAgICB9XG5cbiAgICBhcnIuc29ydChmdW5jdGlvbiAodDEsIHQyKSB7XG4gICAgICAgIGlmICh0MS5DUCA8IHQyLkNQKSByZXR1cm4gLTE7XG4gICAgICAgIGlmICh0MS5DUCA+IHQyLkNQKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKHQxLnNlY29uZCA8IHQyLnNlY29uZCkgcmV0dXJuIC0xO1xuICAgICAgICBpZiAodDEuc2Vjb25kID4gdDIuc2Vjb25kKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKHQxLm5hbm9zZWNvZCA8IHQyLm5hbm9zZWNvZCkgcmV0dXJuIC0xO1xuICAgICAgICBpZiAodDEubmFub3NlY29kID4gdDIubmFub3NlY29kKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKHQxLmRpZ2VzdCA8IHQyLmRpZ2VzdCkgcmV0dXJuIC0xO1xuICAgICAgICBpZiAodDEuZGlnZXN0ID4gdDIuZGlnZXN0KSByZXR1cm4gMTtcbiAgICAgICAgcmV0dXJuIDA7IC8vb25seSBmb3IgaWRlbnRpY2FsIHRyYW5zYWN0aW9ucy4uLlxuICAgIH0pXG4gICAgcmV0dXJuIGFycjtcbn1cblxuZnVuY3Rpb24gZ2V0TWFqb3JpdHlGaWVsZEluUHVsc2VzKGFsbFB1bHNlcywgZmllbGROYW1lLCBleHRyYWN0RmllbGROYW1lLCB2b3RpbmdCb3gpIHtcbiAgICB2YXIgY291bnRlckZpZWxkcyA9IHt9O1xuICAgIHZhciBtYWpvcml0eVZhbHVlO1xuICAgIHZhciBwdWxzZTtcblxuICAgIGZvciAodmFyIGFnZW50IGluIGFsbFB1bHNlcykge1xuICAgICAgICBwdWxzZSA9IGFsbFB1bHNlc1thZ2VudF07XG4gICAgICAgIHZhciB2ID0gcHVsc2VbZmllbGROYW1lXTtcbiAgICAgICAgY291bnRlckZpZWxkc1t2XSA9IHZvdGluZ0JveC52b3RlKGNvdW50ZXJGaWVsZHNbdl0pOyAgICAgICAgLy8gKytjb3VudGVyRmllbGRzW3ZdXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSBpbiBjb3VudGVyRmllbGRzKSB7XG4gICAgICAgIGlmICh2b3RpbmdCb3guaXNNYWpvcml0YXJpYW4oY291bnRlckZpZWxkc1tpXSkpIHtcbiAgICAgICAgICAgIG1ham9yaXR5VmFsdWUgPSBpO1xuICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSA9PSBleHRyYWN0RmllbGROYW1lKSB7ICAgICAgICAgICAgICAgICAgICAvLz8/PyBcInZzZFwiLCBcInZzZFwiXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1ham9yaXR5VmFsdWU7XG4gICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFwiYmxvY2tEaWdlc3RcIiwgXCJwdEJsb2NrXCJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBhZ2VudCBpbiBhbGxQdWxzZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcHVsc2UgPSBhbGxQdWxzZXNbYWdlbnRdO1xuICAgICAgICAgICAgICAgICAgICBpZiAocHVsc2VbZmllbGROYW1lXSA9PSBtYWpvcml0eVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHVsc2VbZXh0cmFjdEZpZWxkTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFwibm9uZVwiOyAvL3RoZXJlIGlzIG5vIG1ham9yaXR5XG59XG5cbmV4cG9ydHMuZGV0ZWN0TWFqb3JpdGFyaWFuVlNEID0gZnVuY3Rpb24gKHB1bHNlLCBwdWxzZXNIaXN0b3J5LCB2b3RpbmdCb3gpIHtcbiAgICBpZiAocHVsc2UgPT0gMCkgcmV0dXJuIFwibm9uZVwiO1xuICAgIHZhciBwdWxzZXMgPSBwdWxzZXNIaXN0b3J5W3B1bHNlXTtcbiAgICB2YXIgbWFqb3JpdHlWYWx1ZSA9IGdldE1ham9yaXR5RmllbGRJblB1bHNlcyhwdWxzZXMsIFwidnNkXCIsIFwidnNkXCIsIHZvdGluZ0JveCk7XG4gICAgcmV0dXJuIG1ham9yaXR5VmFsdWU7XG59XG5cbi8qXG4gICAgZGV0ZWN0IGEgY2FuZGlkYXRlIGJsb2NrXG4gKi9cbmV4cG9ydHMuZGV0ZWN0TWFqb3JpdGFyaWFuUFRCbG9jayA9IGZ1bmN0aW9uIChwdWxzZSwgcHVsc2VzSGlzdG9yeSwgdm90aW5nQm94KSB7XG4gICAgaWYgKHB1bHNlID09IDApIHJldHVybiBcIm5vbmVcIjtcbiAgICB2YXIgcHVsc2VzID0gcHVsc2VzSGlzdG9yeVtwdWxzZV07XG4gICAgdmFyIGJ0QmxvY2sgPSBnZXRNYWpvcml0eUZpZWxkSW5QdWxzZXMocHVsc2VzLCBcImJsb2NrRGlnZXN0XCIsIFwicHRCbG9ja1wiLCB2b3RpbmdCb3gpO1xuICAgIHJldHVybiBidEJsb2NrO1xufVxuXG5leHBvcnRzLm1ha2VTZXRGcm9tQmxvY2sgPSBmdW5jdGlvbiAoa25vd25UcmFuc2FjdGlvbnMsIGJsb2NrKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYmxvY2subGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGl0ZW0gPSBibG9ja1tpXTtcbiAgICAgICAgcmVzdWx0W2l0ZW1dID0ga25vd25UcmFuc2FjdGlvbnNbaXRlbV07XG4gICAgICAgIGlmICgha25vd25UcmFuc2FjdGlvbnMuaGFzT3duUHJvcGVydHkoaXRlbSkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG5ldyBFcnJvcihcIkRvIG5vdCBnaXZlIHVua25vd24gdHJhbnNhY3Rpb24gZGlnZXN0cyB0byBtYWtlU2V0RnJvbUJsb2NrIFwiICsgaXRlbSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydHMuc2V0c0NvbmNhdCA9IGZ1bmN0aW9uICh0YXJnZXQsIGZyb20pIHtcbiAgICBmb3IgKHZhciBkIGluIGZyb20pIHtcbiAgICAgICAgdGFyZ2V0W2RdID0gZnJvbVtkXTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuZXhwb3J0cy5zZXRzUmVtb3ZlQXJyYXkgPSBmdW5jdGlvbiAodGFyZ2V0LCBhcnIpIHtcbiAgICBhcnIuZm9yRWFjaChpdGVtID0+IGRlbGV0ZSB0YXJnZXRbaXRlbV0pO1xuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbmV4cG9ydHMuc2V0c1JlbW92ZVB0QmxvY2tBbmRQYXN0VHJhbnNhY3Rpb25zID0gZnVuY3Rpb24gKHRhcmdldCwgYXJyLCBtYXhQdWxzZSkge1xuICAgIHZhciB0b0JlUmVtb3ZlZCA9IFtdO1xuICAgIGZvciAodmFyIGQgaW4gdGFyZ2V0KSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXJyW2ldID09IGQgfHwgdGFyZ2V0W2RdLkNQIDwgbWF4UHVsc2UpIHtcbiAgICAgICAgICAgICAgICB0b0JlUmVtb3ZlZC5wdXNoKGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdG9CZVJlbW92ZWQuZm9yRWFjaChpdGVtID0+IGRlbGV0ZSB0YXJnZXRbaXRlbV0pO1xuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbmV4cG9ydHMuY3JlYXRlRGVtb2NyYXRpY1ZvdGluZ0JveCA9IGZ1bmN0aW9uIChzaGFyZUhvbGRlcnNDb3VudGVyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdm90ZTogZnVuY3Rpb24gKHByZXZpb3NWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKCFwcmV2aW9zVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBwcmV2aW9zVmFsdWUgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByZXZpb3NWYWx1ZSArIDE7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNNYWpvcml0YXJpYW46IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyh2YWx1ZSAsIE1hdGguZmxvb3Ioc2hhcmVIb2xkZXJzQ291bnRlci8yKSArIDEpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlID49IE1hdGguZmxvb3Ioc2hhcmVIb2xkZXJzQ291bnRlciAvIDIpICsgMTtcbiAgICAgICAgfVxuICAgIH07XG59XG4iLCIvKiFcbiAqIERldGVybWluZSBpZiBhbiBvYmplY3QgaXMgYSBCdWZmZXJcbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8aHR0cHM6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbi8vIFRoZSBfaXNCdWZmZXIgY2hlY2sgaXMgZm9yIFNhZmFyaSA1LTcgc3VwcG9ydCwgYmVjYXVzZSBpdCdzIG1pc3Npbmdcbi8vIE9iamVjdC5wcm90b3R5cGUuY29uc3RydWN0b3IuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHlcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gb2JqICE9IG51bGwgJiYgKGlzQnVmZmVyKG9iaikgfHwgaXNTbG93QnVmZmVyKG9iaikgfHwgISFvYmouX2lzQnVmZmVyKVxufVxuXG5mdW5jdGlvbiBpc0J1ZmZlciAob2JqKSB7XG4gIHJldHVybiAhIW9iai5jb25zdHJ1Y3RvciAmJiB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopXG59XG5cbi8vIEZvciBOb2RlIHYwLjEwIHN1cHBvcnQuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHkuXG5mdW5jdGlvbiBpc1Nsb3dCdWZmZXIgKG9iaikge1xuICByZXR1cm4gdHlwZW9mIG9iai5yZWFkRmxvYXRMRSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2Ygb2JqLnNsaWNlID09PSAnZnVuY3Rpb24nICYmIGlzQnVmZmVyKG9iai5zbGljZSgwLCAwKSlcbn1cbiIsInZhciBtcSA9ICQkLnJlcXVpcmUoXCJmb2xkZXJtcVwiKTtcblxuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IGNoaWxkX3Byb2Nlc3MgPSByZXF1aXJlKFwiY2hpbGRfcHJvY2Vzc1wiKTtcbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcblxuY29uc3QgUkVTVEFSVF9USU1FT1VUID0gNTAwO1xuY29uc3QgUkVTVEFSVF9USU1FT1VUX0xJTUlUID0gNTAwMDA7XG5cbnZhciBzYW5kYm94ZXMgPSB7fTtcbnZhciBleGl0SGFuZGxlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9leGl0SGFuZGxlclwiKShzYW5kYm94ZXMpO1xuXG52YXIgYm9vdFNhbmRCb3ggPSAkJC5mbG93LmRlc2NyaWJlKFwiUHJpdmF0ZVNreS5zd2FybS5lbmdpbmUuYm9vdEluTGF1bmNoZXJcIiwge1xuICAgIGJvb3Q6ZnVuY3Rpb24oc2FuZEJveCwgc3BhY2VOYW1lLCBmb2xkZXIsIGNvZGVGb2xkZXIsIGNhbGxiYWNrKXtcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJCb290aW5nIGluIFwiLCBmb2xkZXIsIFwiIGNvbnRleHQgXCIsIHNwYWNlTmFtZSk7XG5cbiAgICAgICAgdGhpcy5jYWxsYmFjayAgID0gY2FsbGJhY2s7XG4gICAgICAgIHRoaXMuZm9sZGVyICAgICA9IGZvbGRlcjtcbiAgICAgICAgdGhpcy5zcGFjZU5hbWUgID0gc3BhY2VOYW1lO1xuICAgICAgICB0aGlzLnNhbmRCb3ggICAgPSBzYW5kQm94O1xuICAgICAgICB0aGlzLmNvZGVGb2xkZXIgICAgPSBjb2RlRm9sZGVyO1xuICAgICAgICB0aGlzLnRpbWVvdXRNdWx0aXBsaWVyID0gMTtcblxuICAgICAgICB2YXIgdGFzayA9IHRoaXMuc2VyaWFsKHRoaXMuZW5zdXJlRm9sZGVyc0V4aXN0cyk7XG5cbiAgICAgICAgdGFzay5mb2xkZXJTaG91bGRFeGlzdChwYXRoLmpvaW4odGhpcy5mb2xkZXIsIFwibXFcIiksICAgIHRhc2sucHJvZ3Jlc3MpO1xuICAgICAgICB0YXNrLmZvbGRlclNob3VsZEV4aXN0KHBhdGguam9pbih0aGlzLmZvbGRlciwgXCJidW5kbGVzXCIpLCAgdGFzay5wcm9ncmVzcyk7XG4gICAgICAgIHRhc2suZm9sZGVyU2hvdWxkRXhpc3QocGF0aC5qb2luKHRoaXMuZm9sZGVyLCBcInRtcFwiKSwgICB0YXNrLnByb2dyZXNzKTtcbiAgICB9LFxuICAgIGZvbGRlclNob3VsZEV4aXN0OiAgZnVuY3Rpb24ocGF0aCwgcHJvZ3Jlc3Mpe1xuICAgICAgICBmcy5ta2RpcihwYXRoLCB7cmVjdXJzaXZlOiB0cnVlfSwgcHJvZ3Jlc3MpO1xuICAgIH0sXG4gICAgY29weUZvbGRlcjogZnVuY3Rpb24oc291cmNlUGF0aCwgdGFyZ2V0UGF0aCwgY2FsbGJhY2spe1xuICAgICAgICBsZXQgZnNFeHQgPSByZXF1aXJlKFwidXRpbHNcIikuZnNFeHQ7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGZzRXh0LmNvcHkoc291cmNlUGF0aCwgdGFyZ2V0UGF0aCwge292ZXJ3cml0ZTogdHJ1ZX0sIGNhbGxiYWNrKTtcbiAgICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkdvdCBzb21ldGhpbmcuLi5cIiwgZXJyKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZW5zdXJlRm9sZGVyc0V4aXN0czogZnVuY3Rpb24oZXJyLCByZXMpe1xuICAgICAgICBpZihlcnIpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciB0YXNrID0gdGhpcy5wYXJhbGxlbCh0aGlzLnJ1bkNvZGUpO1xuICAgICAgICAgICAgdGhpcy5zYW5kQm94LmluYm91bmQgPSBtcS5jcmVhdGVRdWUocGF0aC5qb2luKHRoaXMuZm9sZGVyLCBcIm1xL2luYm91bmRcIiksIHRoaXMucHJvZ3Jlc3MpO1xuICAgICAgICAgICAgdGhpcy5zYW5kQm94Lm91dGJvdW5kID0gbXEuY3JlYXRlUXVlKHBhdGguam9pbih0aGlzLmZvbGRlciwgXCJtcS9vdXRib3VuZFwiKSwgdGhpcy5wcm9ncmVzcyk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUHJlcGFyaW5nIHRvIGNvcHlcIiwgcGF0aC5qb2luKHRoaXMuY29kZUZvbGRlciwgXCJidW5kbGVzXCIpLCBwYXRoLnJlc29sdmUocGF0aC5qb2luKHRoaXMuZm9sZGVyLCBcImJ1bmRsZXNcIikpKTtcbiAgICAgICAgICAgIHRoaXMuY29weUZvbGRlcihwYXRoLmpvaW4odGhpcy5jb2RlRm9sZGVyLCBcImJ1bmRsZXNcIiksIHBhdGgucmVzb2x2ZShwYXRoLmpvaW4odGhpcy5mb2xkZXIsIFwiYnVuZGxlc1wiKSksIHRhc2sucHJvZ3Jlc3MpO1xuICAgICAgICB9XG5cbiAgICB9LFxuICAgIHJ1bkNvZGU6IGZ1bmN0aW9uKGVyciwgcmVzKXtcbiAgICAgICAgaWYoIWVycil7XG4gICAgICAgICAgICB2YXIgbWFpbkZpbGUgPSBwYXRoLmpvaW4ocHJvY2Vzcy5lbnYuUFJJVkFURVNLWV9ST09UX0ZPTERFUiwgXCJjb3JlXCIsIFwic2FuZGJveGVzXCIsIFwiYWdlbnRTYW5kYm94LmpzXCIpO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBbdGhpcy5zcGFjZU5hbWUsIHByb2Nlc3MuZW52LlBSSVZBVEVTS1lfUk9PVF9GT0xERVIsIHBhdGgucmVzb2x2ZShwcm9jZXNzLmVudi5QUklWQVRFU0tZX0RPTUFJTl9CVUlMRCldO1xuICAgICAgICAgICAgdmFyIG9wdHMgPSB7c3RkaW86IFswLCAxLCAyLCBcImlwY1wiXX07XG5cbiAgICAgICAgICAgIHZhciBzdGFydENoaWxkID0gKG1haW5GaWxlLCBhcmdzLCBvcHRzKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiUnVubmluZzogXCIsIG1haW5GaWxlLCBhcmdzLCBvcHRzKTtcblxuXHRcdFx0XHQvLyBwYXNzaW5nIG9wdGlvbnMuZW52IG1pZ2h0IGJyZWFrIHRoZSBhZ2VudFNhbmRib3gsIGl0IHJlbGllcyBvbiBzb21lIGluaGVyaXRlZCBlbnYgdmFyaWFibGVzIGZyb20gZG9tYWluXG5cdFx0XHRcdHZhciBjaGlsZCA9IGNoaWxkX3Byb2Nlc3MuZm9yayhtYWluRmlsZSwgYXJncyk7XG5cdFx0XHRcdHNhbmRib3hlc1t0aGlzLnNwYWNlTmFtZV0gPSBjaGlsZDtcblxuXHRcdFx0XHR0aGlzLnNhbmRCb3guaW5ib3VuZC5zZXRJUENDaGFubmVsKGNoaWxkKTtcblx0XHRcdFx0dGhpcy5zYW5kQm94Lm91dGJvdW5kLnNldElQQ0NoYW5uZWwoY2hpbGQpO1xuXG5cdFx0XHRcdGNoaWxkLm9uKFwiZXhpdFwiLCAoY29kZSwgc2lnbmFsKT0+e1xuXHRcdFx0XHQgICAgaWYoY29kZSA9PT0gMCl7XG5cdFx0XHRcdCAgICAgICAgY29uc29sZS5sb2coYFNhbmRib3ggPCR7dGhpcy5zcGFjZU5hbWV9PiBzaHV0dGluZyBkb3duLmApO1xuXHRcdFx0XHQgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXHRcdFx0XHQgICAgbGV0IHRpbWVvdXQgPSAodGhpcy50aW1lb3V0TXVsdGlwbGllcipSRVNUQVJUX1RJTUVPVVQpICUgUkVTVEFSVF9USU1FT1VUX0xJTUlUO1xuXHRcdFx0XHQgICAgY29uc29sZS5sb2coYFNhbmRib3ggPCR7dGhpcy5zcGFjZU5hbWV9PiBleGl0cyB3aXRoIGNvZGUgJHtjb2RlfS4gUmVzdGFydGluZyBpbiAke3RpbWVvdXR9IG1zLmApO1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdFx0XHRcdHN0YXJ0Q2hpbGQobWFpbkZpbGUsIGFyZ3MsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lb3V0TXVsdGlwbGllciAqPSAxLjU7XG4gICAgICAgICAgICAgICAgICAgIH0sIHRpbWVvdXQpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRyZXR1cm4gY2hpbGQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrKG51bGwsIHN0YXJ0Q2hpbGQobWFpbkZpbGUsIGFyZ3MsIG9wdHMpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgZXhlY3V0aW5nIHNhbmRib3ghOlwiLCBlcnIpO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFjayhlcnIsIG51bGwpO1xuICAgICAgICB9XG4gICAgfVxuXG59KTtcblxuZnVuY3Rpb24gU2FuZEJveEhhbmRsZXIoc3BhY2VOYW1lLCBmb2xkZXIsIGNvZGVGb2xkZXIsIHJlc3VsdENhbGxCYWNrKXtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbXFIYW5kbGVyO1xuXG5cbiAgICBib290U2FuZEJveCgpLmJvb3QodGhpcywgc3BhY2VOYW1lLGZvbGRlciwgY29kZUZvbGRlciwgZnVuY3Rpb24oZXJyLCBjaGlsZFByb2Nlc3Mpe1xuICAgICAgICBpZighZXJyKXtcbiAgICAgICAgICAgIHNlbGYuY2hpbGRQcm9jZXNzID0gY2hpbGRQcm9jZXNzO1xuXG5cbiAgICAgICAgICAgIC8qc2VsZi5vdXRib3VuZC5yZWdpc3RlckNvbnN1bWVyKGZ1bmN0aW9uKGVyciwgc3dhcm0pe1xuICAgICAgICAgICAgICAgICQkLlBTS19QdWJTdWIucHVibGlzaCgkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTiwgc3dhcm0pO1xuICAgICAgICAgICAgfSk7Ki9cblxuICAgICAgICAgICAgc2VsZi5vdXRib3VuZC5yZWdpc3RlckFzSVBDQ29uc3VtZXIoZnVuY3Rpb24oZXJyLCBzd2FybSl7XG4gICAgICAgICAgICAgICAgJCQuUFNLX1B1YlN1Yi5wdWJsaXNoKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBzd2FybSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbXFIYW5kbGVyID0gc2VsZi5pbmJvdW5kLmdldEhhbmRsZXIoKTtcbiAgICAgICAgICAgIGlmKHBlbmRpbmdNZXNzYWdlcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgIHBlbmRpbmdNZXNzYWdlcy5tYXAoZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuc2VuZChpdGVtKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBwZW5kaW5nTWVzc2FnZXMgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgcGVuZGluZ01lc3NhZ2VzID0gW107XG5cbiAgICB0aGlzLnNlbmQgPSBmdW5jdGlvbiAoc3dhcm0sIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmKG1xSGFuZGxlcil7XG4gICAgICAgICAgICBtcUhhbmRsZXIuc2VuZFN3YXJtRm9yRXhlY3V0aW9uKHN3YXJtLCBjYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZW5kaW5nTWVzc2FnZXMucHVzaChzd2FybSk7IC8vVE9ETzogd2VsbCwgYSBkZWVwIGNsb25lIHdpbGwgbm90IGJlIGEgYmV0dGVyIGlkZWE/XG4gICAgICAgIH1cbiAgICB9XG5cbn1cblxuXG5mdW5jdGlvbiBTYW5kQm94TWFuYWdlcihzYW5kYm94ZXNGb2xkZXIsIGNvZGVGb2xkZXIsIGNhbGxiYWNrKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgc2FuZEJveGVzID0ge1xuXG4gICAgfTtcbiAgICBmdW5jdGlvbiBiZWxvbmdzVG9SZXBsaWNhdGVkU3BhY2UoKXtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy9jb25zb2xlLmxvZyhcIlN1YnNjcmliaW5nIHRvOlwiLCAkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTik7XG4gICAgJCQuUFNLX1B1YlN1Yi5zdWJzY3JpYmUoJCQuQ09OU1RBTlRTLlNXQVJNX0ZPUl9FWEVDVVRJT04sIGZ1bmN0aW9uKHN3YXJtKXtcbiAgICAgICAgY29uc29sZS5sb2coXCJFeGVjdXRpbmcgaW4gc2FuZGJveCB0b3dhcmRzOiBcIiwgc3dhcm0ubWV0YS50YXJnZXQpO1xuXG4gICAgICAgIGlmKHN3YXJtLm1ldGEudGFyZ2V0ID09IFwic3lzdGVtXCIgfHwgc3dhcm0ubWV0YS5jb21tYW5kID09IFwiYXN5bmNSZXR1cm5cIil7XG4gICAgICAgICAgICAkJC5zd2FybXNJbnN0YW5jZXNNYW5hZ2VyLnJldml2ZV9zd2FybShzd2FybSk7XG4gICAgICAgICAgICAvLyQkLnN3YXJtcy5yZXN0YXJ0KHN3YXJtLm1ldGEuc3dhcm1UeXBlTmFtZSwgc3dhcm0pO1xuICAgICAgICB9IGVsc2VcbiAgICAgICAgaWYoc3dhcm0ubWV0YS50YXJnZXQgPT0gXCJwZHNcIil7XG4gICAgICAgICAgICAvL1xuICAgICAgICB9IGVsc2VcbiAgICAgICAgaWYoYmVsb25nc1RvUmVwbGljYXRlZFNwYWNlKHN3YXJtLm1ldGEudGFyZ2V0KSl7XG4gICAgICAgICAgICBzZWxmLnB1c2hUb1NwYWNlQVN3YXJtKHN3YXJtLm1ldGEudGFyZ2V0LCBzd2FybSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL1RPRE86IHNlbmQgdG93YXJkcyBuZXR3b3JrXG4gICAgICAgIH1cblxuICAgIH0pO1xuXG5cbiAgICBmdW5jdGlvbiBzdGFydFNhbmRCb3goc3BhY2VOYW1lKXtcbiAgICAgICAgdmFyIHNhbmRCb3ggPSBuZXcgU2FuZEJveEhhbmRsZXIoc3BhY2VOYW1lLCBwYXRoLmpvaW4oc2FuZGJveGVzRm9sZGVyLCBzcGFjZU5hbWUpLCBjb2RlRm9sZGVyKTtcbiAgICAgICAgc2FuZEJveGVzW3NwYWNlTmFtZV0gPSBzYW5kQm94O1xuICAgICAgICByZXR1cm4gc2FuZEJveDtcbiAgICB9XG5cblxuICAgIHRoaXMucHVzaFRvU3BhY2VBU3dhcm0gPSBmdW5jdGlvbihzcGFjZU5hbWUsIHN3YXJtLCBjYWxsYmFjayl7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJwdXNoVG9TcGFjZUFTd2FybSBcIiAsIHNwYWNlTmFtZSk7XG4gICAgICAgIHZhciBzYW5kYm94ID0gc2FuZEJveGVzW3NwYWNlTmFtZV07XG4gICAgICAgIGlmKCFzYW5kYm94KXtcbiAgICAgICAgICAgIHNhbmRib3ggPSBzYW5kQm94ZXNbc3BhY2VOYW1lXSA9IHN0YXJ0U2FuZEJveChzcGFjZU5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHNhbmRib3guc2VuZChzd2FybSwgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIGNhbGxiYWNrKG51bGwsIHRoaXMpO1xufVxuXG5cbmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24oZm9sZGVyLCBjb2RlRm9sZGVyLCBjYWxsYmFjayl7XG4gICAgbmV3IFNhbmRCb3hNYW5hZ2VyKGZvbGRlciwgY29kZUZvbGRlciwgY2FsbGJhY2spO1xufTtcblxuXG4iLCJjb25zdCBldmVudHMgPSBbXCJleGl0XCIsIFwiU0lHSU5UXCIsIFwiU0lHVVNSMVwiLCBcIlNJR1VTUjJcIiwgXCJ1bmNhdWdodEV4Y2VwdGlvblwiLCBcIlNJR1RFUk1cIiwgXCJTSUdIVVBcIl07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbWFuYWdlU2h1dGRvd25Qcm9jZXNzKGNoaWxkcmVuTGlzdCl7XG5cbiAgICBsZXQgc2h1dHRpbmcgPSBmYWxzZTtcbiAgICBmdW5jdGlvbiBoYW5kbGVyKCl7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJIYW5kbGluZyBleGl0IGV2ZW50IG9uXCIsIHByb2Nlc3MucGlkLCBcImFyZ3VtZW50czpcIiwgYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIGNoaWxkcmVuTmFtZXMgPSBPYmplY3Qua2V5cyhjaGlsZHJlbkxpc3QpO1xuICAgICAgICBmb3IobGV0IGo9MDsgajxjaGlsZHJlbk5hbWVzLmxlbmd0aDsgaisrKXtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuTGlzdFtjaGlsZHJlbk5hbWVzW2pdXTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coYFske3Byb2Nlc3MucGlkfV1gLCBcIlNlbmRpbmcga2lsbCBzaWduYWwgdG8gUElEOlwiLCBjaGlsZC5waWQpO1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgIHByb2Nlc3Mua2lsbChjaGlsZC5waWQpO1xuICAgICAgICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgICAgICAgICAgLy8uLi5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCFzaHV0dGluZyl7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7XG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoYFtQSUQ6ICR7cHJvY2Vzcy5waWR9XSBbVGltZXN0YW1wOiAke25ldyBEYXRlKCkuZ2V0VGltZSgpfV0gW1Byb2Nlc3MgYXJndjogJHtwcm9jZXNzLmFyZ3Z9XS0gU2h1dHRpbmcgZG93bi4uLlxcbmApO1xuICAgICAgICAgICAgfWNhdGNoKGVycilcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAvLy4uLlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2h1dHRpbmcgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KDApO1xuICAgICAgICB9LCAwKTtcbiAgICB9XG5cbiAgICBwcm9jZXNzLnN0ZGluLnJlc3VtZSgpO1xuICAgIGZvcihsZXQgaT0wOyBpPGV2ZW50cy5sZW5ndGg7IGkrKyl7XG4gICAgICAgIHZhciBldmVudFR5cGUgPSBldmVudHNbaV07XG4gICAgICAgIHByb2Nlc3Mub24oZXZlbnRUeXBlLCBoYW5kbGVyKTtcbiAgICB9XG4gICAgLy9jb25zb2xlLmxvZyhcIkV4aXQgaGFuZGxlciBzZXR1cCFcIiwgYFske3Byb2Nlc3MucGlkfV1gKTtcbn07IiwibW9kdWxlLmV4cG9ydHMuQnJpY2sgPSByZXF1aXJlKFwiLi9saWIvQnJpY2tcIik7XG5tb2R1bGUuZXhwb3J0cy5BcmNoaXZlID0gcmVxdWlyZShcIi4vbGliL0FyY2hpdmVcIik7XG5tb2R1bGUuZXhwb3J0cy5Gb2xkZXJCYXJNYXAgPSByZXF1aXJlKFwiLi9saWIvRm9sZGVyQmFyTWFwXCIpO1xubW9kdWxlLmV4cG9ydHMuY3JlYXRlRnNCYXJXb3JrZXIgPSByZXF1aXJlKFwiLi9saWIvRnNCYXJXb3JrZXJcIikuY3JlYXRlRnNCYXJXb3JrZXI7XG5jb25zdCBBcmNoaXZlQ29uZmlndXJhdG9yID0gcmVxdWlyZShcIi4vbGliL0FyY2hpdmVDb25maWd1cmF0b3JcIik7XG5jb25zdCBjcmVhdGVGb2xkZXJCcmlja1N0b3JhZ2UgPSByZXF1aXJlKFwiLi9saWIvRm9sZGVyQnJpY2tTdG9yYWdlXCIpLmNyZWF0ZUZvbGRlckJyaWNrU3RvcmFnZTtcbmNvbnN0IGNyZWF0ZUZpbGVCcmlja1N0b3JhZ2UgPSByZXF1aXJlKFwiLi9saWIvRmlsZUJyaWNrU3RvcmFnZVwiKS5jcmVhdGVGaWxlQnJpY2tTdG9yYWdlO1xuQXJjaGl2ZUNvbmZpZ3VyYXRvci5wcm90b3R5cGUucmVnaXN0ZXJTdG9yYWdlUHJvdmlkZXIoXCJGb2xkZXJCcmlja1N0b3JhZ2VcIiwgY3JlYXRlRm9sZGVyQnJpY2tTdG9yYWdlKTtcbkFyY2hpdmVDb25maWd1cmF0b3IucHJvdG90eXBlLnJlZ2lzdGVyU3RvcmFnZVByb3ZpZGVyKFwiRmlsZUJyaWNrU3RvcmFnZVwiLCBjcmVhdGVGaWxlQnJpY2tTdG9yYWdlKTtcbm1vZHVsZS5leHBvcnRzLkFyY2hpdmVDb25maWd1cmF0b3IgPSBBcmNoaXZlQ29uZmlndXJhdG9yO1xuXG4iLCJ2YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuXG52YXIgQ1JDX1RBQkxFID0gW1xuICAweDAwMDAwMDAwLCAweDc3MDczMDk2LCAweGVlMGU2MTJjLCAweDk5MDk1MWJhLCAweDA3NmRjNDE5LFxuICAweDcwNmFmNDhmLCAweGU5NjNhNTM1LCAweDllNjQ5NWEzLCAweDBlZGI4ODMyLCAweDc5ZGNiOGE0LFxuICAweGUwZDVlOTFlLCAweDk3ZDJkOTg4LCAweDA5YjY0YzJiLCAweDdlYjE3Y2JkLCAweGU3YjgyZDA3LFxuICAweDkwYmYxZDkxLCAweDFkYjcxMDY0LCAweDZhYjAyMGYyLCAweGYzYjk3MTQ4LCAweDg0YmU0MWRlLFxuICAweDFhZGFkNDdkLCAweDZkZGRlNGViLCAweGY0ZDRiNTUxLCAweDgzZDM4NWM3LCAweDEzNmM5ODU2LFxuICAweDY0NmJhOGMwLCAweGZkNjJmOTdhLCAweDhhNjVjOWVjLCAweDE0MDE1YzRmLCAweDYzMDY2Y2Q5LFxuICAweGZhMGYzZDYzLCAweDhkMDgwZGY1LCAweDNiNmUyMGM4LCAweDRjNjkxMDVlLCAweGQ1NjA0MWU0LFxuICAweGEyNjc3MTcyLCAweDNjMDNlNGQxLCAweDRiMDRkNDQ3LCAweGQyMGQ4NWZkLCAweGE1MGFiNTZiLFxuICAweDM1YjVhOGZhLCAweDQyYjI5ODZjLCAweGRiYmJjOWQ2LCAweGFjYmNmOTQwLCAweDMyZDg2Y2UzLFxuICAweDQ1ZGY1Yzc1LCAweGRjZDYwZGNmLCAweGFiZDEzZDU5LCAweDI2ZDkzMGFjLCAweDUxZGUwMDNhLFxuICAweGM4ZDc1MTgwLCAweGJmZDA2MTE2LCAweDIxYjRmNGI1LCAweDU2YjNjNDIzLCAweGNmYmE5NTk5LFxuICAweGI4YmRhNTBmLCAweDI4MDJiODllLCAweDVmMDU4ODA4LCAweGM2MGNkOWIyLCAweGIxMGJlOTI0LFxuICAweDJmNmY3Yzg3LCAweDU4Njg0YzExLCAweGMxNjExZGFiLCAweGI2NjYyZDNkLCAweDc2ZGM0MTkwLFxuICAweDAxZGI3MTA2LCAweDk4ZDIyMGJjLCAweGVmZDUxMDJhLCAweDcxYjE4NTg5LCAweDA2YjZiNTFmLFxuICAweDlmYmZlNGE1LCAweGU4YjhkNDMzLCAweDc4MDdjOWEyLCAweDBmMDBmOTM0LCAweDk2MDlhODhlLFxuICAweGUxMGU5ODE4LCAweDdmNmEwZGJiLCAweDA4NmQzZDJkLCAweDkxNjQ2Yzk3LCAweGU2NjM1YzAxLFxuICAweDZiNmI1MWY0LCAweDFjNmM2MTYyLCAweDg1NjUzMGQ4LCAweGYyNjIwMDRlLCAweDZjMDY5NWVkLFxuICAweDFiMDFhNTdiLCAweDgyMDhmNGMxLCAweGY1MGZjNDU3LCAweDY1YjBkOWM2LCAweDEyYjdlOTUwLFxuICAweDhiYmViOGVhLCAweGZjYjk4ODdjLCAweDYyZGQxZGRmLCAweDE1ZGEyZDQ5LCAweDhjZDM3Y2YzLFxuICAweGZiZDQ0YzY1LCAweDRkYjI2MTU4LCAweDNhYjU1MWNlLCAweGEzYmMwMDc0LCAweGQ0YmIzMGUyLFxuICAweDRhZGZhNTQxLCAweDNkZDg5NWQ3LCAweGE0ZDFjNDZkLCAweGQzZDZmNGZiLCAweDQzNjllOTZhLFxuICAweDM0NmVkOWZjLCAweGFkNjc4ODQ2LCAweGRhNjBiOGQwLCAweDQ0MDQyZDczLCAweDMzMDMxZGU1LFxuICAweGFhMGE0YzVmLCAweGRkMGQ3Y2M5LCAweDUwMDU3MTNjLCAweDI3MDI0MWFhLCAweGJlMGIxMDEwLFxuICAweGM5MGMyMDg2LCAweDU3NjhiNTI1LCAweDIwNmY4NWIzLCAweGI5NjZkNDA5LCAweGNlNjFlNDlmLFxuICAweDVlZGVmOTBlLCAweDI5ZDljOTk4LCAweGIwZDA5ODIyLCAweGM3ZDdhOGI0LCAweDU5YjMzZDE3LFxuICAweDJlYjQwZDgxLCAweGI3YmQ1YzNiLCAweGMwYmE2Y2FkLCAweGVkYjg4MzIwLCAweDlhYmZiM2I2LFxuICAweDAzYjZlMjBjLCAweDc0YjFkMjlhLCAweGVhZDU0NzM5LCAweDlkZDI3N2FmLCAweDA0ZGIyNjE1LFxuICAweDczZGMxNjgzLCAweGUzNjMwYjEyLCAweDk0NjQzYjg0LCAweDBkNmQ2YTNlLCAweDdhNmE1YWE4LFxuICAweGU0MGVjZjBiLCAweDkzMDlmZjlkLCAweDBhMDBhZTI3LCAweDdkMDc5ZWIxLCAweGYwMGY5MzQ0LFxuICAweDg3MDhhM2QyLCAweDFlMDFmMjY4LCAweDY5MDZjMmZlLCAweGY3NjI1NzVkLCAweDgwNjU2N2NiLFxuICAweDE5NmMzNjcxLCAweDZlNmIwNmU3LCAweGZlZDQxYjc2LCAweDg5ZDMyYmUwLCAweDEwZGE3YTVhLFxuICAweDY3ZGQ0YWNjLCAweGY5YjlkZjZmLCAweDhlYmVlZmY5LCAweDE3YjdiZTQzLCAweDYwYjA4ZWQ1LFxuICAweGQ2ZDZhM2U4LCAweGExZDE5MzdlLCAweDM4ZDhjMmM0LCAweDRmZGZmMjUyLCAweGQxYmI2N2YxLFxuICAweGE2YmM1NzY3LCAweDNmYjUwNmRkLCAweDQ4YjIzNjRiLCAweGQ4MGQyYmRhLCAweGFmMGExYjRjLFxuICAweDM2MDM0YWY2LCAweDQxMDQ3YTYwLCAweGRmNjBlZmMzLCAweGE4NjdkZjU1LCAweDMxNmU4ZWVmLFxuICAweDQ2NjliZTc5LCAweGNiNjFiMzhjLCAweGJjNjY4MzFhLCAweDI1NmZkMmEwLCAweDUyNjhlMjM2LFxuICAweGNjMGM3Nzk1LCAweGJiMGI0NzAzLCAweDIyMDIxNmI5LCAweDU1MDUyNjJmLCAweGM1YmEzYmJlLFxuICAweGIyYmQwYjI4LCAweDJiYjQ1YTkyLCAweDVjYjM2YTA0LCAweGMyZDdmZmE3LCAweGI1ZDBjZjMxLFxuICAweDJjZDk5ZThiLCAweDViZGVhZTFkLCAweDliNjRjMmIwLCAweGVjNjNmMjI2LCAweDc1NmFhMzljLFxuICAweDAyNmQ5MzBhLCAweDljMDkwNmE5LCAweGViMGUzNjNmLCAweDcyMDc2Nzg1LCAweDA1MDA1NzEzLFxuICAweDk1YmY0YTgyLCAweGUyYjg3YTE0LCAweDdiYjEyYmFlLCAweDBjYjYxYjM4LCAweDkyZDI4ZTliLFxuICAweGU1ZDViZTBkLCAweDdjZGNlZmI3LCAweDBiZGJkZjIxLCAweDg2ZDNkMmQ0LCAweGYxZDRlMjQyLFxuICAweDY4ZGRiM2Y4LCAweDFmZGE4MzZlLCAweDgxYmUxNmNkLCAweGY2YjkyNjViLCAweDZmYjA3N2UxLFxuICAweDE4Yjc0Nzc3LCAweDg4MDg1YWU2LCAweGZmMGY2YTcwLCAweDY2MDYzYmNhLCAweDExMDEwYjVjLFxuICAweDhmNjU5ZWZmLCAweGY4NjJhZTY5LCAweDYxNmJmZmQzLCAweDE2NmNjZjQ1LCAweGEwMGFlMjc4LFxuICAweGQ3MGRkMmVlLCAweDRlMDQ4MzU0LCAweDM5MDNiM2MyLCAweGE3NjcyNjYxLCAweGQwNjAxNmY3LFxuICAweDQ5Njk0NzRkLCAweDNlNmU3N2RiLCAweGFlZDE2YTRhLCAweGQ5ZDY1YWRjLCAweDQwZGYwYjY2LFxuICAweDM3ZDgzYmYwLCAweGE5YmNhZTUzLCAweGRlYmI5ZWM1LCAweDQ3YjJjZjdmLCAweDMwYjVmZmU5LFxuICAweGJkYmRmMjFjLCAweGNhYmFjMjhhLCAweDUzYjM5MzMwLCAweDI0YjRhM2E2LCAweGJhZDAzNjA1LFxuICAweGNkZDcwNjkzLCAweDU0ZGU1NzI5LCAweDIzZDk2N2JmLCAweGIzNjY3YTJlLCAweGM0NjE0YWI4LFxuICAweDVkNjgxYjAyLCAweDJhNmYyYjk0LCAweGI0MGJiZTM3LCAweGMzMGM4ZWExLCAweDVhMDVkZjFiLFxuICAweDJkMDJlZjhkXG5dO1xuXG5pZiAodHlwZW9mIEludDMyQXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gIENSQ19UQUJMRSA9IG5ldyBJbnQzMkFycmF5KENSQ19UQUJMRSk7XG59XG5cbmZ1bmN0aW9uIG5ld0VtcHR5QnVmZmVyKGxlbmd0aCkge1xuICB2YXIgYnVmZmVyID0gbmV3IEJ1ZmZlcihsZW5ndGgpO1xuICBidWZmZXIuZmlsbCgweDAwKTtcbiAgcmV0dXJuIGJ1ZmZlcjtcbn1cblxuZnVuY3Rpb24gZW5zdXJlQnVmZmVyKGlucHV0KSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoaW5wdXQpKSB7XG4gICAgcmV0dXJuIGlucHV0O1xuICB9XG5cbiAgdmFyIGhhc05ld0J1ZmZlckFQSSA9XG4gICAgICB0eXBlb2YgQnVmZmVyLmFsbG9jID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgIHR5cGVvZiBCdWZmZXIuZnJvbSA9PT0gXCJmdW5jdGlvblwiO1xuXG4gIGlmICh0eXBlb2YgaW5wdXQgPT09IFwibnVtYmVyXCIpIHtcbiAgICByZXR1cm4gaGFzTmV3QnVmZmVyQVBJID8gQnVmZmVyLmFsbG9jKGlucHV0KSA6IG5ld0VtcHR5QnVmZmVyKGlucHV0KTtcbiAgfVxuICBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT09IFwic3RyaW5nXCIpIHtcbiAgICByZXR1cm4gaGFzTmV3QnVmZmVyQVBJID8gQnVmZmVyLmZyb20oaW5wdXQpIDogbmV3IEJ1ZmZlcihpbnB1dCk7XG4gIH1cbiAgZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaW5wdXQgbXVzdCBiZSBidWZmZXIsIG51bWJlciwgb3Igc3RyaW5nLCByZWNlaXZlZCBcIiArXG4gICAgICAgICAgICAgICAgICAgIHR5cGVvZiBpbnB1dCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYnVmZmVyaXplSW50KG51bSkge1xuICB2YXIgdG1wID0gZW5zdXJlQnVmZmVyKDQpO1xuICB0bXAud3JpdGVJbnQzMkJFKG51bSwgMCk7XG4gIHJldHVybiB0bXA7XG59XG5cbmZ1bmN0aW9uIF9jcmMzMihidWYsIHByZXZpb3VzKSB7XG4gIGJ1ZiA9IGVuc3VyZUJ1ZmZlcihidWYpO1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHByZXZpb3VzKSkge1xuICAgIHByZXZpb3VzID0gcHJldmlvdXMucmVhZFVJbnQzMkJFKDApO1xuICB9XG4gIHZhciBjcmMgPSB+fnByZXZpb3VzIF4gLTE7XG4gIGZvciAodmFyIG4gPSAwOyBuIDwgYnVmLmxlbmd0aDsgbisrKSB7XG4gICAgY3JjID0gQ1JDX1RBQkxFWyhjcmMgXiBidWZbbl0pICYgMHhmZl0gXiAoY3JjID4+PiA4KTtcbiAgfVxuICByZXR1cm4gKGNyYyBeIC0xKTtcbn1cblxuZnVuY3Rpb24gY3JjMzIoKSB7XG4gIHJldHVybiBidWZmZXJpemVJbnQoX2NyYzMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cykpO1xufVxuY3JjMzIuc2lnbmVkID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gX2NyYzMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG59O1xuY3JjMzIudW5zaWduZWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBfY3JjMzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKSA+Pj4gMDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY3JjMzI7XG4iLCJtb2R1bGUuZXhwb3J0cy5Sb290Q1NCID0gUm9vdENTQjtcbm1vZHVsZS5leHBvcnRzLlJhd0NTQiA9IHJlcXVpcmUoJy4vbGliL1Jhd0NTQicpO1xubW9kdWxlLmV4cG9ydHMuQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoJy4vbGliL0NTQklkZW50aWZpZXInKTtcbiQkLmxvYWRMaWJyYXJ5KFwiY3NiXCIsIHJlcXVpcmUoXCIuL2Zsb3dzL2luZGV4XCIpKTtcblxuXG4iLCJleHBvcnRzLmRvbWFpblB1YlN1YiA9IHJlcXVpcmUoXCIuL2RvbWFpblB1YlN1YlwiKTsiLCJjb25zdCBiYXIgPSByZXF1aXJlKFwiYmFyXCIpO1xuY29uc3QgQXJjaGl2ZUNvbmZpZ3VyYXRvciA9IGJhci5BcmNoaXZlQ29uZmlndXJhdG9yO1xuY29uc3QgY3JlYXRlRURGU0JyaWNrU3RvcmFnZSA9IHJlcXVpcmUoXCIuL0VERlNCcmlja1N0b3JhZ2VcIikuY3JlYXRlRURGU0JyaWNrU3RvcmFnZTtcbkFyY2hpdmVDb25maWd1cmF0b3IucHJvdG90eXBlLnJlZ2lzdGVyU3RvcmFnZVByb3ZpZGVyKFwiRURGU0JyaWNrU3RvcmFnZVwiLCBjcmVhdGVFREZTQnJpY2tTdG9yYWdlKTtcbm1vZHVsZS5leHBvcnRzLmNyZWF0ZUVERlNCcmlja1N0b3JhZ2UgPSBjcmVhdGVFREZTQnJpY2tTdG9yYWdlO1xuIiwibW9kdWxlLmV4cG9ydHMuRURGU01pZGRsZXdhcmUgPSByZXF1aXJlKFwiLi9saWIvRURGU01pZGRsZXdhcmVcIik7XG5cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdFx0XHRcdFx0Y3JlYXRlUXVlOiByZXF1aXJlKFwiLi9saWIvZm9sZGVyTVFcIikuZ2V0Rm9sZGVyUXVldWVcblx0XHRcdFx0XHQvL2ZvbGRlck1ROiByZXF1aXJlKFwiLi9saWIvZm9sZGVyTVFcIilcbn07IiwiLypcbk1vZHVsZSB0aGF0IG9mZmVycyBBUElzIHRvIGludGVyYWN0IHdpdGggUHJpdmF0ZVNreSB3ZWIgc2FuZGJveGVzXG4gKi9cblxuXG5jb25zdCBleHBvcnRCcm93c2VySW50ZXJhY3QgPSB7XG4gICAgZW5hYmxlSWZyYW1lSW50ZXJhY3Rpb25zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmNyZWF0ZVdpbmRvd01RID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL3NwZWNpZmljTVFJbXBsL0NoaWxkV25kTVFcIikuY3JlYXRlTVE7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmNyZWF0ZVdpbmRvd0ludGVyYWN0aW9uU3BhY2UgPSByZXF1aXJlKFwiLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvV2luZG93TVFJbnRlcmFjdGlvblNwYWNlXCIpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2U7XG4gICAgfSxcbiAgICBlbmFibGVSZWFjdEludGVyYWN0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVXaW5kb3dNUSA9IHJlcXVpcmUoXCIuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9zcGVjaWZpY01RSW1wbC9DaGlsZFduZE1RXCIpLmNyZWF0ZU1RO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVXaW5kb3dJbnRlcmFjdGlvblNwYWNlID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1dpbmRvd01RSW50ZXJhY3Rpb25TcGFjZVwiKS5jcmVhdGVJbnRlcmFjdGlvblNwYWNlO1xuICAgIH0sXG4gICAgZW5hYmxlV2ViVmlld0ludGVyYWN0aW9uczpmdW5jdGlvbigpe1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVXaW5kb3dJbnRlcmFjdGlvblNwYWNlID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1dlYlZpZXdNUUludGVyYWN0aW9uU3BhY2VcIikuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZTtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuY3JlYXRlV2luZG93TVEgPSByZXF1aXJlKFwiLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvc3BlY2lmaWNNUUltcGwvQ2hpbGRXZWJWaWV3TVFcIikuY3JlYXRlTVE7XG4gICAgfSxcbiAgICBlbmFibGVMb2NhbEludGVyYWN0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVJbnRlcmFjdGlvblNwYWNlID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1NvdW5kUHViU3ViTVFCYXNlZEludGVyYWN0aW9uU3BhY2VcIikuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZTtcbiAgICB9LFxuICAgIGVuYWJsZVJlbW90ZUludGVyYWN0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVSZW1vdGVJbnRlcmFjdGlvblNwYWNlID0gcmVxdWlyZSgnLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvaHR0cEludGVyYWN0aW9uU3BhY2UnKS5jcmVhdGVJbnRlcmFjdGlvblNwYWNlO1xuICAgIH1cbn07XG5cblxuaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydEJyb3dzZXJJbnRlcmFjdDtcbn1cbmVsc2Uge1xuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICBjcmVhdGVOb2RlSW50ZXJhY3Rpb25TcGFjZTogcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL2ZvbGRlck1RQmFzZWRJbnRlcmFjdGlvblNwYWNlXCIpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UsXG4gICAgICAgIGNyZWF0ZUludGVyYWN0aW9uU3BhY2U6IHJlcXVpcmUoXCIuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9Tb3VuZFB1YlN1Yk1RQmFzZWRJbnRlcmFjdGlvblNwYWNlXCIpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UsXG4gICAgICAgIGNyZWF0ZVJlbW90ZUludGVyYWN0aW9uU3BhY2U6IHJlcXVpcmUoJy4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL2h0dHBJbnRlcmFjdGlvblNwYWNlJykuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZVxuICAgIH07XG59IiwidmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xudmFyIHN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xudmFyIFJlYWRhYmxlID0gc3RyZWFtLlJlYWRhYmxlO1xudmFyIFdyaXRhYmxlID0gc3RyZWFtLldyaXRhYmxlO1xudmFyIFBhc3NUaHJvdWdoID0gc3RyZWFtLlBhc3NUaHJvdWdoO1xudmFyIFBlbmQgPSByZXF1aXJlKCcuL21vZHVsZXMvbm9kZS1wZW5kJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG5leHBvcnRzLmNyZWF0ZUZyb21CdWZmZXIgPSBjcmVhdGVGcm9tQnVmZmVyO1xuZXhwb3J0cy5jcmVhdGVGcm9tRmQgPSBjcmVhdGVGcm9tRmQ7XG5leHBvcnRzLkJ1ZmZlclNsaWNlciA9IEJ1ZmZlclNsaWNlcjtcbmV4cG9ydHMuRmRTbGljZXIgPSBGZFNsaWNlcjtcblxudXRpbC5pbmhlcml0cyhGZFNsaWNlciwgRXZlbnRFbWl0dGVyKTtcbmZ1bmN0aW9uIEZkU2xpY2VyKGZkLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuICB0aGlzLmZkID0gZmQ7XG4gIHRoaXMucGVuZCA9IG5ldyBQZW5kKCk7XG4gIHRoaXMucGVuZC5tYXggPSAxO1xuICB0aGlzLnJlZkNvdW50ID0gMDtcbiAgdGhpcy5hdXRvQ2xvc2UgPSAhIW9wdGlvbnMuYXV0b0Nsb3NlO1xufVxuXG5GZFNsaWNlci5wcm90b3R5cGUucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYucGVuZC5nbyhmdW5jdGlvbihjYikge1xuICAgIGZzLnJlYWQoc2VsZi5mZCwgYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGZ1bmN0aW9uKGVyciwgYnl0ZXNSZWFkLCBidWZmZXIpIHtcbiAgICAgIGNiKCk7XG4gICAgICBjYWxsYmFjayhlcnIsIGJ5dGVzUmVhZCwgYnVmZmVyKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5GZFNsaWNlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLnBlbmQuZ28oZnVuY3Rpb24oY2IpIHtcbiAgICBmcy53cml0ZShzZWxmLmZkLCBidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgZnVuY3Rpb24oZXJyLCB3cml0dGVuLCBidWZmZXIpIHtcbiAgICAgIGNiKCk7XG4gICAgICBjYWxsYmFjayhlcnIsIHdyaXR0ZW4sIGJ1ZmZlcik7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuRmRTbGljZXIucHJvdG90eXBlLmNyZWF0ZVJlYWRTdHJlYW0gPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgUmVhZFN0cmVhbSh0aGlzLCBvcHRpb25zKTtcbn07XG5cbkZkU2xpY2VyLnByb3RvdHlwZS5jcmVhdGVXcml0ZVN0cmVhbSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBXcml0ZVN0cmVhbSh0aGlzLCBvcHRpb25zKTtcbn07XG5cbkZkU2xpY2VyLnByb3RvdHlwZS5yZWYgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5yZWZDb3VudCArPSAxO1xufTtcblxuRmRTbGljZXIucHJvdG90eXBlLnVucmVmID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5yZWZDb3VudCAtPSAxO1xuXG4gIGlmIChzZWxmLnJlZkNvdW50ID4gMCkgcmV0dXJuO1xuICBpZiAoc2VsZi5yZWZDb3VudCA8IDApIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgdW5yZWZcIik7XG5cbiAgaWYgKHNlbGYuYXV0b0Nsb3NlKSB7XG4gICAgZnMuY2xvc2Uoc2VsZi5mZCwgb25DbG9zZURvbmUpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25DbG9zZURvbmUoZXJyKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuZW1pdCgnY2xvc2UnKTtcbiAgICB9XG4gIH1cbn07XG5cbnV0aWwuaW5oZXJpdHMoUmVhZFN0cmVhbSwgUmVhZGFibGUpO1xuZnVuY3Rpb24gUmVhZFN0cmVhbShjb250ZXh0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBSZWFkYWJsZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMuY29udGV4dC5yZWYoKTtcblxuICB0aGlzLnN0YXJ0ID0gb3B0aW9ucy5zdGFydCB8fCAwO1xuICB0aGlzLmVuZE9mZnNldCA9IG9wdGlvbnMuZW5kO1xuICB0aGlzLnBvcyA9IHRoaXMuc3RhcnQ7XG4gIHRoaXMuZGVzdHJveWVkID0gZmFsc2U7XG59XG5cblJlYWRTdHJlYW0ucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24obikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmIChzZWxmLmRlc3Ryb3llZCkgcmV0dXJuO1xuXG4gIHZhciB0b1JlYWQgPSBNYXRoLm1pbihzZWxmLl9yZWFkYWJsZVN0YXRlLmhpZ2hXYXRlck1hcmssIG4pO1xuICBpZiAoc2VsZi5lbmRPZmZzZXQgIT0gbnVsbCkge1xuICAgIHRvUmVhZCA9IE1hdGgubWluKHRvUmVhZCwgc2VsZi5lbmRPZmZzZXQgLSBzZWxmLnBvcyk7XG4gIH1cbiAgaWYgKHRvUmVhZCA8PSAwKSB7XG4gICAgc2VsZi5kZXN0cm95ZWQgPSB0cnVlO1xuICAgIHNlbGYucHVzaChudWxsKTtcbiAgICBzZWxmLmNvbnRleHQudW5yZWYoKTtcbiAgICByZXR1cm47XG4gIH1cbiAgc2VsZi5jb250ZXh0LnBlbmQuZ28oZnVuY3Rpb24oY2IpIHtcbiAgICBpZiAoc2VsZi5kZXN0cm95ZWQpIHJldHVybiBjYigpO1xuICAgIHZhciBidWZmZXIgPSBuZXcgQnVmZmVyKHRvUmVhZCk7XG4gICAgZnMucmVhZChzZWxmLmNvbnRleHQuZmQsIGJ1ZmZlciwgMCwgdG9SZWFkLCBzZWxmLnBvcywgZnVuY3Rpb24oZXJyLCBieXRlc1JlYWQpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgc2VsZi5kZXN0cm95KGVycik7XG4gICAgICB9IGVsc2UgaWYgKGJ5dGVzUmVhZCA9PT0gMCkge1xuICAgICAgICBzZWxmLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgICAgIHNlbGYucHVzaChudWxsKTtcbiAgICAgICAgc2VsZi5jb250ZXh0LnVucmVmKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLnBvcyArPSBieXRlc1JlYWQ7XG4gICAgICAgIHNlbGYucHVzaChidWZmZXIuc2xpY2UoMCwgYnl0ZXNSZWFkKSk7XG4gICAgICB9XG4gICAgICBjYigpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cblJlYWRTdHJlYW0ucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbihlcnIpIHtcbiAgaWYgKHRoaXMuZGVzdHJveWVkKSByZXR1cm47XG4gIGVyciA9IGVyciB8fCBuZXcgRXJyb3IoXCJzdHJlYW0gZGVzdHJveWVkXCIpO1xuICB0aGlzLmRlc3Ryb3llZCA9IHRydWU7XG4gIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpO1xuICB0aGlzLmNvbnRleHQudW5yZWYoKTtcbn07XG5cbnV0aWwuaW5oZXJpdHMoV3JpdGVTdHJlYW0sIFdyaXRhYmxlKTtcbmZ1bmN0aW9uIFdyaXRlU3RyZWFtKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIFdyaXRhYmxlLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5jb250ZXh0LnJlZigpO1xuXG4gIHRoaXMuc3RhcnQgPSBvcHRpb25zLnN0YXJ0IHx8IDA7XG4gIHRoaXMuZW5kT2Zmc2V0ID0gKG9wdGlvbnMuZW5kID09IG51bGwpID8gSW5maW5pdHkgOiArb3B0aW9ucy5lbmQ7XG4gIHRoaXMuYnl0ZXNXcml0dGVuID0gMDtcbiAgdGhpcy5wb3MgPSB0aGlzLnN0YXJ0O1xuICB0aGlzLmRlc3Ryb3llZCA9IGZhbHNlO1xuXG4gIHRoaXMub24oJ2ZpbmlzaCcsIHRoaXMuZGVzdHJveS5iaW5kKHRoaXMpKTtcbn1cblxuV3JpdGVTdHJlYW0ucHJvdG90eXBlLl93cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlciwgZW5jb2RpbmcsIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHNlbGYuZGVzdHJveWVkKSByZXR1cm47XG5cbiAgaWYgKHNlbGYucG9zICsgYnVmZmVyLmxlbmd0aCA+IHNlbGYuZW5kT2Zmc2V0KSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcihcIm1heGltdW0gZmlsZSBsZW5ndGggZXhjZWVkZWRcIik7XG4gICAgZXJyLmNvZGUgPSAnRVRPT0JJRyc7XG4gICAgc2VsZi5kZXN0cm95KCk7XG4gICAgY2FsbGJhY2soZXJyKTtcbiAgICByZXR1cm47XG4gIH1cbiAgc2VsZi5jb250ZXh0LnBlbmQuZ28oZnVuY3Rpb24oY2IpIHtcbiAgICBpZiAoc2VsZi5kZXN0cm95ZWQpIHJldHVybiBjYigpO1xuICAgIGZzLndyaXRlKHNlbGYuY29udGV4dC5mZCwgYnVmZmVyLCAwLCBidWZmZXIubGVuZ3RoLCBzZWxmLnBvcywgZnVuY3Rpb24oZXJyLCBieXRlcykge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgY2IoKTtcbiAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuYnl0ZXNXcml0dGVuICs9IGJ5dGVzO1xuICAgICAgICBzZWxmLnBvcyArPSBieXRlcztcbiAgICAgICAgc2VsZi5lbWl0KCdwcm9ncmVzcycpO1xuICAgICAgICBjYigpO1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbldyaXRlU3RyZWFtLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmRlc3Ryb3llZCkgcmV0dXJuO1xuICB0aGlzLmRlc3Ryb3llZCA9IHRydWU7XG4gIHRoaXMuY29udGV4dC51bnJlZigpO1xufTtcblxudXRpbC5pbmhlcml0cyhCdWZmZXJTbGljZXIsIEV2ZW50RW1pdHRlcik7XG5mdW5jdGlvbiBCdWZmZXJTbGljZXIoYnVmZmVyLCBvcHRpb25zKSB7XG4gIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB0aGlzLnJlZkNvdW50ID0gMDtcbiAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG4gIHRoaXMubWF4Q2h1bmtTaXplID0gb3B0aW9ucy5tYXhDaHVua1NpemUgfHwgTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7XG59XG5cbkJ1ZmZlclNsaWNlci5wcm90b3R5cGUucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFjaykge1xuICB2YXIgZW5kID0gcG9zaXRpb24gKyBsZW5ndGg7XG4gIHZhciBkZWx0YSA9IGVuZCAtIHRoaXMuYnVmZmVyLmxlbmd0aDtcbiAgdmFyIHdyaXR0ZW4gPSAoZGVsdGEgPiAwKSA/IGRlbHRhIDogbGVuZ3RoO1xuICB0aGlzLmJ1ZmZlci5jb3B5KGJ1ZmZlciwgb2Zmc2V0LCBwb3NpdGlvbiwgZW5kKTtcbiAgc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgIGNhbGxiYWNrKG51bGwsIHdyaXR0ZW4pO1xuICB9KTtcbn07XG5cbkJ1ZmZlclNsaWNlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgY2FsbGJhY2spIHtcbiAgYnVmZmVyLmNvcHkodGhpcy5idWZmZXIsIHBvc2l0aW9uLCBvZmZzZXQsIG9mZnNldCArIGxlbmd0aCk7XG4gIHNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcbiAgICBjYWxsYmFjayhudWxsLCBsZW5ndGgsIGJ1ZmZlcik7XG4gIH0pO1xufTtcblxuQnVmZmVyU2xpY2VyLnByb3RvdHlwZS5jcmVhdGVSZWFkU3RyZWFtID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIHJlYWRTdHJlYW0gPSBuZXcgUGFzc1Rocm91Z2gob3B0aW9ucyk7XG4gIHJlYWRTdHJlYW0uZGVzdHJveWVkID0gZmFsc2U7XG4gIHJlYWRTdHJlYW0uc3RhcnQgPSBvcHRpb25zLnN0YXJ0IHx8IDA7XG4gIHJlYWRTdHJlYW0uZW5kT2Zmc2V0ID0gb3B0aW9ucy5lbmQ7XG4gIC8vIGJ5IHRoZSB0aW1lIHRoaXMgZnVuY3Rpb24gcmV0dXJucywgd2UnbGwgYmUgZG9uZS5cbiAgcmVhZFN0cmVhbS5wb3MgPSByZWFkU3RyZWFtLmVuZE9mZnNldCB8fCB0aGlzLmJ1ZmZlci5sZW5ndGg7XG5cbiAgLy8gcmVzcGVjdCB0aGUgbWF4Q2h1bmtTaXplIG9wdGlvbiB0byBzbGljZSB1cCB0aGUgY2h1bmsgaW50byBzbWFsbGVyIHBpZWNlcy5cbiAgdmFyIGVudGlyZVNsaWNlID0gdGhpcy5idWZmZXIuc2xpY2UocmVhZFN0cmVhbS5zdGFydCwgcmVhZFN0cmVhbS5wb3MpO1xuICB2YXIgb2Zmc2V0ID0gMDtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICB2YXIgbmV4dE9mZnNldCA9IG9mZnNldCArIHRoaXMubWF4Q2h1bmtTaXplO1xuICAgIGlmIChuZXh0T2Zmc2V0ID49IGVudGlyZVNsaWNlLmxlbmd0aCkge1xuICAgICAgLy8gbGFzdCBjaHVua1xuICAgICAgaWYgKG9mZnNldCA8IGVudGlyZVNsaWNlLmxlbmd0aCkge1xuICAgICAgICByZWFkU3RyZWFtLndyaXRlKGVudGlyZVNsaWNlLnNsaWNlKG9mZnNldCwgZW50aXJlU2xpY2UubGVuZ3RoKSk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgcmVhZFN0cmVhbS53cml0ZShlbnRpcmVTbGljZS5zbGljZShvZmZzZXQsIG5leHRPZmZzZXQpKTtcbiAgICBvZmZzZXQgPSBuZXh0T2Zmc2V0O1xuICB9XG5cbiAgcmVhZFN0cmVhbS5lbmQoKTtcbiAgcmVhZFN0cmVhbS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgcmVhZFN0cmVhbS5kZXN0cm95ZWQgPSB0cnVlO1xuICB9O1xuICByZXR1cm4gcmVhZFN0cmVhbTtcbn07XG5cbkJ1ZmZlclNsaWNlci5wcm90b3R5cGUuY3JlYXRlV3JpdGVTdHJlYW0gPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIHZhciBidWZmZXJTbGljZXIgPSB0aGlzO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIHdyaXRlU3RyZWFtID0gbmV3IFdyaXRhYmxlKG9wdGlvbnMpO1xuICB3cml0ZVN0cmVhbS5zdGFydCA9IG9wdGlvbnMuc3RhcnQgfHwgMDtcbiAgd3JpdGVTdHJlYW0uZW5kT2Zmc2V0ID0gKG9wdGlvbnMuZW5kID09IG51bGwpID8gdGhpcy5idWZmZXIubGVuZ3RoIDogK29wdGlvbnMuZW5kO1xuICB3cml0ZVN0cmVhbS5ieXRlc1dyaXR0ZW4gPSAwO1xuICB3cml0ZVN0cmVhbS5wb3MgPSB3cml0ZVN0cmVhbS5zdGFydDtcbiAgd3JpdGVTdHJlYW0uZGVzdHJveWVkID0gZmFsc2U7XG4gIHdyaXRlU3RyZWFtLl93cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlciwgZW5jb2RpbmcsIGNhbGxiYWNrKSB7XG4gICAgaWYgKHdyaXRlU3RyZWFtLmRlc3Ryb3llZCkgcmV0dXJuO1xuXG4gICAgdmFyIGVuZCA9IHdyaXRlU3RyZWFtLnBvcyArIGJ1ZmZlci5sZW5ndGg7XG4gICAgaWYgKGVuZCA+IHdyaXRlU3RyZWFtLmVuZE9mZnNldCkge1xuICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihcIm1heGltdW0gZmlsZSBsZW5ndGggZXhjZWVkZWRcIik7XG4gICAgICBlcnIuY29kZSA9ICdFVE9PQklHJztcbiAgICAgIHdyaXRlU3RyZWFtLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBidWZmZXIuY29weShidWZmZXJTbGljZXIuYnVmZmVyLCB3cml0ZVN0cmVhbS5wb3MsIDAsIGJ1ZmZlci5sZW5ndGgpO1xuXG4gICAgd3JpdGVTdHJlYW0uYnl0ZXNXcml0dGVuICs9IGJ1ZmZlci5sZW5ndGg7XG4gICAgd3JpdGVTdHJlYW0ucG9zID0gZW5kO1xuICAgIHdyaXRlU3RyZWFtLmVtaXQoJ3Byb2dyZXNzJyk7XG4gICAgY2FsbGJhY2soKTtcbiAgfTtcbiAgd3JpdGVTdHJlYW0uZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgIHdyaXRlU3RyZWFtLmRlc3Ryb3llZCA9IHRydWU7XG4gIH07XG4gIHJldHVybiB3cml0ZVN0cmVhbTtcbn07XG5cbkJ1ZmZlclNsaWNlci5wcm90b3R5cGUucmVmID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMucmVmQ291bnQgKz0gMTtcbn07XG5cbkJ1ZmZlclNsaWNlci5wcm90b3R5cGUudW5yZWYgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5yZWZDb3VudCAtPSAxO1xuXG4gIGlmICh0aGlzLnJlZkNvdW50IDwgMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgdW5yZWZcIik7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZUZyb21CdWZmZXIoYnVmZmVyLCBvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgQnVmZmVyU2xpY2VyKGJ1ZmZlciwgb3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUZyb21GZChmZCwgb3B0aW9ucykge1xuICByZXR1cm4gbmV3IEZkU2xpY2VyKGZkLCBvcHRpb25zKTtcbn1cbiIsIi8vdG8gbG9vayBuaWNlIHRoZSByZXF1aXJlTW9kdWxlIG9uIE5vZGVcbnJlcXVpcmUoXCIuL2xpYi9wc2stYWJzdHJhY3QtY2xpZW50XCIpO1xuaWYoISQkLmJyb3dzZXJSdW50aW1lKXtcblx0cmVxdWlyZShcIi4vbGliL3Bzay1ub2RlLWNsaWVudFwiKTtcbn1lbHNle1xuXHRyZXF1aXJlKFwiLi9saWIvcHNrLWJyb3dzZXItY2xpZW50XCIpO1xufSIsImNvbnN0IEJsb2NrY2hhaW4gPSByZXF1aXJlKCcuL2xpYi9CbG9ja2NoYWluJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHN0YXJ0REI6IGZ1bmN0aW9uIChmb2xkZXIpIHtcbiAgICAgICAgaWYgKCQkLmJsb2NrY2hhaW4pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignJCQuYmxvY2tjaGFpbiBpcyBhbHJlYWR5IGRlZmluZWQnKTtcbiAgICAgICAgfVxuICAgICAgICAkJC5ibG9ja2NoYWluID0gdGhpcy5jcmVhdGVEQkhhbmRsZXIoZm9sZGVyKTtcbiAgICAgICAgcmV0dXJuICQkLmJsb2NrY2hhaW47XG4gICAgfSxcbiAgICBjcmVhdGVEQkhhbmRsZXI6IGZ1bmN0aW9uKGZvbGRlcil7XG4gICAgICAgIHJlcXVpcmUoJy4vbGliL2RvbWFpbicpO1xuICAgICAgICByZXF1aXJlKCcuL2xpYi9zd2FybXMnKTtcblxuICAgICAgICBjb25zdCBmcGRzID0gcmVxdWlyZShcIi4vbGliL0ZvbGRlclBlcnNpc3RlbnRQRFNcIik7XG4gICAgICAgIGNvbnN0IHBkcyA9IGZwZHMubmV3UERTKGZvbGRlcik7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBCbG9ja2NoYWluKHBkcyk7XG4gICAgfSxcbiAgICBwYXJzZURvbWFpblVybDogZnVuY3Rpb24gKGRvbWFpblVybCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkVtcHR5IGZ1bmN0aW9uXCIpO1xuICAgIH0sXG4gICAgZ2V0RG9tYWluSW5mbzogZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkVtcHR5IGZ1bmN0aW9uXCIpO1xuICAgIH0sXG4gICAgc3RhcnRJbk1lbW9yeURCOiBmdW5jdGlvbigpIHtcblx0XHRyZXF1aXJlKCcuL2xpYi9kb21haW4nKTtcblx0XHRyZXF1aXJlKCcuL2xpYi9zd2FybXMnKTtcblxuXHRcdGNvbnN0IHBkcyA9IHJlcXVpcmUoJy4vbGliL0luTWVtb3J5UERTJyk7XG5cblx0XHRyZXR1cm4gbmV3IEJsb2NrY2hhaW4ocGRzLm5ld1BEUyhudWxsKSk7XG4gICAgfSxcbiAgICBzdGFydERiOiBmdW5jdGlvbihyZWFkZXJXcml0ZXIpIHtcbiAgICAgICAgcmVxdWlyZSgnLi9saWIvZG9tYWluJyk7XG4gICAgICAgIHJlcXVpcmUoJy4vbGliL3N3YXJtcycpO1xuXG4gICAgICAgIGNvbnN0IHBwZHMgPSByZXF1aXJlKFwiLi9saWIvUGVyc2lzdGVudFBEU1wiKTtcbiAgICAgICAgY29uc3QgcGRzID0gcHBkcy5uZXdQRFMocmVhZGVyV3JpdGVyKTtcblxuICAgICAgICByZXR1cm4gbmV3IEJsb2NrY2hhaW4ocGRzKTtcbiAgICB9XG59O1xuIiwibW9kdWxlLmV4cG9ydHMudXRpbHMgID0gcmVxdWlyZShcIi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IFJvb3RDU0IgPSByZXF1aXJlKCcuL2xpYnJhcmllcy9Sb290Q1NCJyk7XG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVSb290Q1NCID0gUm9vdENTQi5jcmVhdGVSb290Q1NCO1xubW9kdWxlLmV4cG9ydHMubG9hZFdpdGhJZGVudGlmaWVyID0gUm9vdENTQi5sb2FkV2l0aElkZW50aWZpZXI7XG5tb2R1bGUuZXhwb3J0cy5sb2FkV2l0aFBpbiAgID0gUm9vdENTQi5sb2FkV2l0aFBpbjtcbm1vZHVsZS5leHBvcnRzLndyaXRlTmV3TWFzdGVyQ1NCID0gUm9vdENTQi53cml0ZU5ld01hc3RlckNTQjtcbm1vZHVsZS5leHBvcnRzLlJvb3RDU0IgPSBSb290Q1NCO1xubW9kdWxlLmV4cG9ydHMuUmF3Q1NCID0gcmVxdWlyZSgnLi9saWJyYXJpZXMvUmF3Q1NCJyk7XG5tb2R1bGUuZXhwb3J0cy5DU0JJZGVudGlmaWVyID0gcmVxdWlyZSgnLi9saWJyYXJpZXMvQ1NCSWRlbnRpZmllcicpO1xubW9kdWxlLmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uICgpIHtcblx0JCQubG9hZExpYnJhcnkoXCJwc2t3YWxsZXRcIiwgcmVxdWlyZShcIi4vbGlicmFyaWVzL2Zsb3dzL2luZGV4XCIpKTtcbn07XG5cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNvbnNVdGlsOiByZXF1aXJlKCcuL2NvbnNVdGlsJylcbn07IiwidmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xudmFyIHpsaWIgPSByZXF1aXJlKFwiemxpYlwiKTtcbmNvbnN0IGZkX3NsaWNlciA9IHJlcXVpcmUoXCJub2RlLWZkLXNsaWNlclwiKTtcbnZhciBjcmMzMiA9IHJlcXVpcmUoXCJidWZmZXItY3JjMzJcIik7XG52YXIgdXRpbCA9IHJlcXVpcmUoXCJ1dGlsXCIpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoXCJzdHJlYW1cIikuVHJhbnNmb3JtO1xudmFyIFBhc3NUaHJvdWdoID0gcmVxdWlyZShcInN0cmVhbVwiKS5QYXNzVGhyb3VnaDtcbnZhciBXcml0YWJsZSA9IHJlcXVpcmUoXCJzdHJlYW1cIikuV3JpdGFibGU7XG5cbmV4cG9ydHMub3BlbiA9IG9wZW47XG5leHBvcnRzLmZyb21GZCA9IGZyb21GZDtcbmV4cG9ydHMuZnJvbUJ1ZmZlciA9IGZyb21CdWZmZXI7XG5leHBvcnRzLmZyb21SYW5kb21BY2Nlc3NSZWFkZXIgPSBmcm9tUmFuZG9tQWNjZXNzUmVhZGVyO1xuZXhwb3J0cy5kb3NEYXRlVGltZVRvRGF0ZSA9IGRvc0RhdGVUaW1lVG9EYXRlO1xuZXhwb3J0cy52YWxpZGF0ZUZpbGVOYW1lID0gdmFsaWRhdGVGaWxlTmFtZTtcbmV4cG9ydHMuWmlwRmlsZSA9IFppcEZpbGU7XG5leHBvcnRzLkVudHJ5ID0gRW50cnk7XG5leHBvcnRzLlJhbmRvbUFjY2Vzc1JlYWRlciA9IFJhbmRvbUFjY2Vzc1JlYWRlcjtcblxuZnVuY3Rpb24gb3BlbihwYXRoLCBvcHRpb25zLCBjYWxsYmFjaykge1xuXHRpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdGNhbGxiYWNrID0gb3B0aW9ucztcblx0XHRvcHRpb25zID0gbnVsbDtcblx0fVxuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdGlmIChvcHRpb25zLmF1dG9DbG9zZSA9PSBudWxsKSBvcHRpb25zLmF1dG9DbG9zZSA9IHRydWU7XG5cdGlmIChvcHRpb25zLmxhenlFbnRyaWVzID09IG51bGwpIG9wdGlvbnMubGF6eUVudHJpZXMgPSBmYWxzZTtcblx0aWYgKG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9PSBudWxsKSBvcHRpb25zLmRlY29kZVN0cmluZ3MgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMgPT0gbnVsbCkgb3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMgPT0gbnVsbCkgb3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMgPSBmYWxzZTtcblx0aWYgKGNhbGxiYWNrID09IG51bGwpIGNhbGxiYWNrID0gZGVmYXVsdENhbGxiYWNrO1xuXHRmcy5vcGVuKHBhdGgsIFwiclwiLCBmdW5jdGlvbiAoZXJyLCBmZCkge1xuXHRcdGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdGZyb21GZChmZCwgb3B0aW9ucywgZnVuY3Rpb24gKGVyciwgemlwZmlsZSkge1xuXHRcdFx0aWYgKGVycikgZnMuY2xvc2UoZmQsIGRlZmF1bHRDYWxsYmFjayk7XG5cdFx0XHRjYWxsYmFjayhlcnIsIHppcGZpbGUpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gZnJvbUZkKGZkLCBvcHRpb25zLCBjYWxsYmFjaykge1xuXHRpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdGNhbGxiYWNrID0gb3B0aW9ucztcblx0XHRvcHRpb25zID0gbnVsbDtcblx0fVxuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdGlmIChvcHRpb25zLmF1dG9DbG9zZSA9PSBudWxsKSBvcHRpb25zLmF1dG9DbG9zZSA9IGZhbHNlO1xuXHRpZiAob3B0aW9ucy5sYXp5RW50cmllcyA9PSBudWxsKSBvcHRpb25zLmxhenlFbnRyaWVzID0gZmFsc2U7XG5cdGlmIChvcHRpb25zLmRlY29kZVN0cmluZ3MgPT0gbnVsbCkgb3B0aW9ucy5kZWNvZGVTdHJpbmdzID0gdHJ1ZTtcblx0aWYgKG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzID09IG51bGwpIG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzID0gdHJ1ZTtcblx0aWYgKG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzID09IG51bGwpIG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzID0gZmFsc2U7XG5cdGlmIChjYWxsYmFjayA9PSBudWxsKSBjYWxsYmFjayA9IGRlZmF1bHRDYWxsYmFjaztcblx0ZnMuZnN0YXQoZmQsIGZ1bmN0aW9uIChlcnIsIHN0YXRzKSB7XG5cdFx0aWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0dmFyIHJlYWRlciA9IGZkX3NsaWNlci5jcmVhdGVGcm9tRmQoZmQsIHthdXRvQ2xvc2U6IHRydWV9KTtcblx0XHRmcm9tUmFuZG9tQWNjZXNzUmVhZGVyKHJlYWRlciwgc3RhdHMuc2l6ZSwgb3B0aW9ucywgY2FsbGJhY2spO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gZnJvbUJ1ZmZlcihidWZmZXIsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG5cdGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0Y2FsbGJhY2sgPSBvcHRpb25zO1xuXHRcdG9wdGlvbnMgPSBudWxsO1xuXHR9XG5cdGlmIChvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblx0b3B0aW9ucy5hdXRvQ2xvc2UgPSBmYWxzZTtcblx0aWYgKG9wdGlvbnMubGF6eUVudHJpZXMgPT0gbnVsbCkgb3B0aW9ucy5sYXp5RW50cmllcyA9IGZhbHNlO1xuXHRpZiAob3B0aW9ucy5kZWNvZGVTdHJpbmdzID09IG51bGwpIG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9IHRydWU7XG5cdGlmIChvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcyA9PSBudWxsKSBvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcyA9IHRydWU7XG5cdGlmIChvcHRpb25zLnN0cmljdEZpbGVOYW1lcyA9PSBudWxsKSBvcHRpb25zLnN0cmljdEZpbGVOYW1lcyA9IGZhbHNlO1xuXHQvLyBsaW1pdCB0aGUgbWF4IGNodW5rIHNpemUuIHNlZSBodHRwczovL2dpdGh1Yi5jb20vdGhlam9zaHdvbGZlL3lhdXpsL2lzc3Vlcy84N1xuXHR2YXIgcmVhZGVyID0gZmRfc2xpY2VyLmNyZWF0ZUZyb21CdWZmZXIoYnVmZmVyLCB7bWF4Q2h1bmtTaXplOiAweDEwMDAwfSk7XG5cdGZyb21SYW5kb21BY2Nlc3NSZWFkZXIocmVhZGVyLCBidWZmZXIubGVuZ3RoLCBvcHRpb25zLCBjYWxsYmFjayk7XG59XG5cbmZ1bmN0aW9uIGZyb21SYW5kb21BY2Nlc3NSZWFkZXIocmVhZGVyLCB0b3RhbFNpemUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG5cdGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0Y2FsbGJhY2sgPSBvcHRpb25zO1xuXHRcdG9wdGlvbnMgPSBudWxsO1xuXHR9XG5cdGlmIChvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblx0aWYgKG9wdGlvbnMuYXV0b0Nsb3NlID09IG51bGwpIG9wdGlvbnMuYXV0b0Nsb3NlID0gdHJ1ZTtcblx0aWYgKG9wdGlvbnMubGF6eUVudHJpZXMgPT0gbnVsbCkgb3B0aW9ucy5sYXp5RW50cmllcyA9IGZhbHNlO1xuXHRpZiAob3B0aW9ucy5kZWNvZGVTdHJpbmdzID09IG51bGwpIG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9IHRydWU7XG5cdHZhciBkZWNvZGVTdHJpbmdzID0gISFvcHRpb25zLmRlY29kZVN0cmluZ3M7XG5cdGlmIChvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcyA9PSBudWxsKSBvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcyA9IHRydWU7XG5cdGlmIChvcHRpb25zLnN0cmljdEZpbGVOYW1lcyA9PSBudWxsKSBvcHRpb25zLnN0cmljdEZpbGVOYW1lcyA9IGZhbHNlO1xuXHRpZiAoY2FsbGJhY2sgPT0gbnVsbCkgY2FsbGJhY2sgPSBkZWZhdWx0Q2FsbGJhY2s7XG5cdGlmICh0eXBlb2YgdG90YWxTaXplICE9PSBcIm51bWJlclwiKSB0aHJvdyBuZXcgRXJyb3IoXCJleHBlY3RlZCB0b3RhbFNpemUgcGFyYW1ldGVyIHRvIGJlIGEgbnVtYmVyXCIpO1xuXHRpZiAodG90YWxTaXplID4gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJ6aXAgZmlsZSB0b28gbGFyZ2UuIG9ubHkgZmlsZSBzaXplcyB1cCB0byAyXjUyIGFyZSBzdXBwb3J0ZWQgZHVlIHRvIEphdmFTY3JpcHQncyBOdW1iZXIgdHlwZSBiZWluZyBhbiBJRUVFIDc1NCBkb3VibGUuXCIpO1xuXHR9XG5cblx0Ly8gdGhlIG1hdGNoaW5nIHVucmVmKCkgY2FsbCBpcyBpbiB6aXBmaWxlLmNsb3NlKClcblx0cmVhZGVyLnJlZigpO1xuXG5cdC8vIGVvY2RyIG1lYW5zIEVuZCBvZiBDZW50cmFsIERpcmVjdG9yeSBSZWNvcmQuXG5cdC8vIHNlYXJjaCBiYWNrd2FyZHMgZm9yIHRoZSBlb2NkciBzaWduYXR1cmUuXG5cdC8vIHRoZSBsYXN0IGZpZWxkIG9mIHRoZSBlb2NkciBpcyBhIHZhcmlhYmxlLWxlbmd0aCBjb21tZW50LlxuXHQvLyB0aGUgY29tbWVudCBzaXplIGlzIGVuY29kZWQgaW4gYSAyLWJ5dGUgZmllbGQgaW4gdGhlIGVvY2RyLCB3aGljaCB3ZSBjYW4ndCBmaW5kIHdpdGhvdXQgdHJ1ZGdpbmcgYmFja3dhcmRzIHRocm91Z2ggdGhlIGNvbW1lbnQgdG8gZmluZCBpdC5cblx0Ly8gYXMgYSBjb25zZXF1ZW5jZSBvZiB0aGlzIGRlc2lnbiBkZWNpc2lvbiwgaXQncyBwb3NzaWJsZSB0byBoYXZlIGFtYmlndW91cyB6aXAgZmlsZSBtZXRhZGF0YSBpZiBhIGNvaGVyZW50IGVvY2RyIHdhcyBpbiB0aGUgY29tbWVudC5cblx0Ly8gd2Ugc2VhcmNoIGJhY2t3YXJkcyBmb3IgYSBlb2NkciBzaWduYXR1cmUsIGFuZCBob3BlIHRoYXQgd2hvZXZlciBtYWRlIHRoZSB6aXAgZmlsZSB3YXMgc21hcnQgZW5vdWdoIHRvIGZvcmJpZCB0aGUgZW9jZHIgc2lnbmF0dXJlIGluIHRoZSBjb21tZW50LlxuXHR2YXIgZW9jZHJXaXRob3V0Q29tbWVudFNpemUgPSAyMjtcblx0dmFyIG1heENvbW1lbnRTaXplID0gMHhmZmZmOyAvLyAyLWJ5dGUgc2l6ZVxuXHR2YXIgYnVmZmVyU2l6ZSA9IE1hdGgubWluKGVvY2RyV2l0aG91dENvbW1lbnRTaXplICsgbWF4Q29tbWVudFNpemUsIHRvdGFsU2l6ZSk7XG5cdHZhciBidWZmZXIgPSBuZXdCdWZmZXIoYnVmZmVyU2l6ZSk7XG5cdHZhciBidWZmZXJSZWFkU3RhcnQgPSB0b3RhbFNpemUgLSBidWZmZXIubGVuZ3RoO1xuXHRyZWFkQW5kQXNzZXJ0Tm9Fb2YocmVhZGVyLCBidWZmZXIsIDAsIGJ1ZmZlclNpemUsIGJ1ZmZlclJlYWRTdGFydCwgZnVuY3Rpb24gKGVycikge1xuXHRcdGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdGZvciAodmFyIGkgPSBidWZmZXJTaXplIC0gZW9jZHJXaXRob3V0Q29tbWVudFNpemU7IGkgPj0gMDsgaSAtPSAxKSB7XG5cdFx0XHRpZiAoYnVmZmVyLnJlYWRVSW50MzJMRShpKSAhPT0gMHgwNjA1NGI1MCkgY29udGludWU7XG5cdFx0XHQvLyBmb3VuZCBlb2NkclxuXHRcdFx0dmFyIGVvY2RyQnVmZmVyID0gYnVmZmVyLnNsaWNlKGkpO1xuXG5cdFx0XHQvLyAwIC0gRW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHNpZ25hdHVyZSA9IDB4MDYwNTRiNTBcblx0XHRcdC8vIDQgLSBOdW1iZXIgb2YgdGhpcyBkaXNrXG5cdFx0XHR2YXIgZGlza051bWJlciA9IGVvY2RyQnVmZmVyLnJlYWRVSW50MTZMRSg0KTtcblx0XHRcdGlmIChkaXNrTnVtYmVyICE9PSAwKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJtdWx0aS1kaXNrIHppcCBmaWxlcyBhcmUgbm90IHN1cHBvcnRlZDogZm91bmQgZGlzayBudW1iZXI6IFwiICsgZGlza051bWJlcikpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gNiAtIERpc2sgd2hlcmUgY2VudHJhbCBkaXJlY3Rvcnkgc3RhcnRzXG5cdFx0XHQvLyA4IC0gTnVtYmVyIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZHMgb24gdGhpcyBkaXNrXG5cdFx0XHQvLyAxMCAtIFRvdGFsIG51bWJlciBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmRzXG5cdFx0XHR2YXIgZW50cnlDb3VudCA9IGVvY2RyQnVmZmVyLnJlYWRVSW50MTZMRSgxMCk7XG5cdFx0XHQvLyAxMiAtIFNpemUgb2YgY2VudHJhbCBkaXJlY3RvcnkgKGJ5dGVzKVxuXHRcdFx0Ly8gMTYgLSBPZmZzZXQgb2Ygc3RhcnQgb2YgY2VudHJhbCBkaXJlY3RvcnksIHJlbGF0aXZlIHRvIHN0YXJ0IG9mIGFyY2hpdmVcblx0XHRcdHZhciBjZW50cmFsRGlyZWN0b3J5T2Zmc2V0ID0gZW9jZHJCdWZmZXIucmVhZFVJbnQzMkxFKDE2KTtcblx0XHRcdC8vIDIwIC0gQ29tbWVudCBsZW5ndGhcblx0XHRcdHZhciBjb21tZW50TGVuZ3RoID0gZW9jZHJCdWZmZXIucmVhZFVJbnQxNkxFKDIwKTtcblx0XHRcdHZhciBleHBlY3RlZENvbW1lbnRMZW5ndGggPSBlb2NkckJ1ZmZlci5sZW5ndGggLSBlb2NkcldpdGhvdXRDb21tZW50U2l6ZTtcblx0XHRcdGlmIChjb21tZW50TGVuZ3RoICE9PSBleHBlY3RlZENvbW1lbnRMZW5ndGgpIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImludmFsaWQgY29tbWVudCBsZW5ndGguIGV4cGVjdGVkOiBcIiArIGV4cGVjdGVkQ29tbWVudExlbmd0aCArIFwiLiBmb3VuZDogXCIgKyBjb21tZW50TGVuZ3RoKSk7XG5cdFx0XHR9XG5cdFx0XHQvLyAyMiAtIENvbW1lbnRcblx0XHRcdC8vIHRoZSBlbmNvZGluZyBpcyBhbHdheXMgY3A0MzcuXG5cdFx0XHR2YXIgY29tbWVudCA9IGRlY29kZVN0cmluZ3MgPyBkZWNvZGVCdWZmZXIoZW9jZHJCdWZmZXIsIDIyLCBlb2NkckJ1ZmZlci5sZW5ndGgsIGZhbHNlKVxuXHRcdFx0XHQ6IGVvY2RyQnVmZmVyLnNsaWNlKDIyKTtcblxuXHRcdFx0aWYgKCEoZW50cnlDb3VudCA9PT0gMHhmZmZmIHx8IGNlbnRyYWxEaXJlY3RvcnlPZmZzZXQgPT09IDB4ZmZmZmZmZmYpKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCBuZXcgWmlwRmlsZShyZWFkZXIsIGNlbnRyYWxEaXJlY3RvcnlPZmZzZXQsIHRvdGFsU2l6ZSwgZW50cnlDb3VudCwgY29tbWVudCwgb3B0aW9ucy5hdXRvQ2xvc2UsIG9wdGlvbnMubGF6eUVudHJpZXMsIGRlY29kZVN0cmluZ3MsIG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzLCBvcHRpb25zLnN0cmljdEZpbGVOYW1lcykpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBaSVA2NCBmb3JtYXRcblxuXHRcdFx0Ly8gWklQNjQgWmlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IGxvY2F0b3Jcblx0XHRcdHZhciB6aXA2NEVvY2RsQnVmZmVyID0gbmV3QnVmZmVyKDIwKTtcblx0XHRcdHZhciB6aXA2NEVvY2RsT2Zmc2V0ID0gYnVmZmVyUmVhZFN0YXJ0ICsgaSAtIHppcDY0RW9jZGxCdWZmZXIubGVuZ3RoO1xuXHRcdFx0cmVhZEFuZEFzc2VydE5vRW9mKHJlYWRlciwgemlwNjRFb2NkbEJ1ZmZlciwgMCwgemlwNjRFb2NkbEJ1ZmZlci5sZW5ndGgsIHppcDY0RW9jZGxPZmZzZXQsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRcdFx0aWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cblx0XHRcdFx0Ly8gMCAtIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpciBsb2NhdG9yIHNpZ25hdHVyZSA9IDB4MDcwNjRiNTBcblx0XHRcdFx0aWYgKHppcDY0RW9jZGxCdWZmZXIucmVhZFVJbnQzMkxFKDApICE9PSAweDA3MDY0YjUwKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImludmFsaWQgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IGxvY2F0b3Igc2lnbmF0dXJlXCIpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyA0IC0gbnVtYmVyIG9mIHRoZSBkaXNrIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3Rvcnlcblx0XHRcdFx0Ly8gOCAtIHJlbGF0aXZlIG9mZnNldCBvZiB0aGUgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZFxuXHRcdFx0XHR2YXIgemlwNjRFb2Nkck9mZnNldCA9IHJlYWRVSW50NjRMRSh6aXA2NEVvY2RsQnVmZmVyLCA4KTtcblx0XHRcdFx0Ly8gMTYgLSB0b3RhbCBudW1iZXIgb2YgZGlza3NcblxuXHRcdFx0XHQvLyBaSVA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgcmVjb3JkXG5cdFx0XHRcdHZhciB6aXA2NEVvY2RyQnVmZmVyID0gbmV3QnVmZmVyKDU2KTtcblx0XHRcdFx0cmVhZEFuZEFzc2VydE5vRW9mKHJlYWRlciwgemlwNjRFb2NkckJ1ZmZlciwgMCwgemlwNjRFb2NkckJ1ZmZlci5sZW5ndGgsIHppcDY0RW9jZHJPZmZzZXQsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRcdFx0XHRpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblxuXHRcdFx0XHRcdC8vIDAgLSB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXIgc2lnbmF0dXJlICAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlcyAgKDB4MDYwNjRiNTApXG5cdFx0XHRcdFx0aWYgKHppcDY0RW9jZHJCdWZmZXIucmVhZFVJbnQzMkxFKDApICE9PSAweDA2MDY0YjUwKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiaW52YWxpZCB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgcmVjb3JkIHNpZ25hdHVyZVwiKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIDQgLSBzaXplIG9mIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmQgICAgICAgICAgICAgICAgOCBieXRlc1xuXHRcdFx0XHRcdC8vIDEyIC0gdmVyc2lvbiBtYWRlIGJ5ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMiBieXRlc1xuXHRcdFx0XHRcdC8vIDE0IC0gdmVyc2lvbiBuZWVkZWQgdG8gZXh0cmFjdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMiBieXRlc1xuXHRcdFx0XHRcdC8vIDE2IC0gbnVtYmVyIG9mIHRoaXMgZGlzayAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRcdFx0XHRcdC8vIDIwIC0gbnVtYmVyIG9mIHRoZSBkaXNrIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgNCBieXRlc1xuXHRcdFx0XHRcdC8vIDI0IC0gdG90YWwgbnVtYmVyIG9mIGVudHJpZXMgaW4gdGhlIGNlbnRyYWwgZGlyZWN0b3J5IG9uIHRoaXMgZGlzayAgICAgICAgIDggYnl0ZXNcblx0XHRcdFx0XHQvLyAzMiAtIHRvdGFsIG51bWJlciBvZiBlbnRyaWVzIGluIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgICAgICAgICAgIDggYnl0ZXNcblx0XHRcdFx0XHRlbnRyeUNvdW50ID0gcmVhZFVJbnQ2NExFKHppcDY0RW9jZHJCdWZmZXIsIDMyKTtcblx0XHRcdFx0XHQvLyA0MCAtIHNpemUgb2YgdGhlIGNlbnRyYWwgZGlyZWN0b3J5ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDggYnl0ZXNcblx0XHRcdFx0XHQvLyA0OCAtIG9mZnNldCBvZiBzdGFydCBvZiBjZW50cmFsIGRpcmVjdG9yeSB3aXRoIHJlc3BlY3QgdG8gdGhlIHN0YXJ0aW5nIGRpc2sgbnVtYmVyICAgICA4IGJ5dGVzXG5cdFx0XHRcdFx0Y2VudHJhbERpcmVjdG9yeU9mZnNldCA9IHJlYWRVSW50NjRMRSh6aXA2NEVvY2RyQnVmZmVyLCA0OCk7XG5cdFx0XHRcdFx0Ly8gNTYgLSB6aXA2NCBleHRlbnNpYmxlIGRhdGEgc2VjdG9yICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodmFyaWFibGUgc2l6ZSlcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgbmV3IFppcEZpbGUocmVhZGVyLCBjZW50cmFsRGlyZWN0b3J5T2Zmc2V0LCB0b3RhbFNpemUsIGVudHJ5Q291bnQsIGNvbW1lbnQsIG9wdGlvbnMuYXV0b0Nsb3NlLCBvcHRpb25zLmxhenlFbnRyaWVzLCBkZWNvZGVTdHJpbmdzLCBvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcywgb3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMpKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y2FsbGJhY2sobmV3IEVycm9yKFwiZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZCBzaWduYXR1cmUgbm90IGZvdW5kXCIpKTtcblx0fSk7XG59XG5cbnV0aWwuaW5oZXJpdHMoWmlwRmlsZSwgRXZlbnRFbWl0dGVyKTtcblxuZnVuY3Rpb24gWmlwRmlsZShyZWFkZXIsIGNlbnRyYWxEaXJlY3RvcnlPZmZzZXQsIGZpbGVTaXplLCBlbnRyeUNvdW50LCBjb21tZW50LCBhdXRvQ2xvc2UsIGxhenlFbnRyaWVzLCBkZWNvZGVTdHJpbmdzLCB2YWxpZGF0ZUVudHJ5U2l6ZXMsIHN0cmljdEZpbGVOYW1lcykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdEV2ZW50RW1pdHRlci5jYWxsKHNlbGYpO1xuXHRzZWxmLnJlYWRlciA9IHJlYWRlcjtcblx0Ly8gZm9yd2FyZCBjbG9zZSBldmVudHNcblx0c2VsZi5yZWFkZXIub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0Ly8gZXJyb3IgY2xvc2luZyB0aGUgZmRcblx0XHRlbWl0RXJyb3Ioc2VsZiwgZXJyKTtcblx0fSk7XG5cdHNlbGYucmVhZGVyLm9uY2UoXCJjbG9zZVwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0c2VsZi5lbWl0KFwiY2xvc2VcIik7XG5cdH0pO1xuXHRzZWxmLnJlYWRFbnRyeUN1cnNvciA9IGNlbnRyYWxEaXJlY3RvcnlPZmZzZXQ7XG5cdHNlbGYuZmlsZVNpemUgPSBmaWxlU2l6ZTtcblx0c2VsZi5lbnRyeUNvdW50ID0gZW50cnlDb3VudDtcblx0c2VsZi5jb21tZW50ID0gY29tbWVudDtcblx0c2VsZi5lbnRyaWVzUmVhZCA9IDA7XG5cdHNlbGYuYXV0b0Nsb3NlID0gISFhdXRvQ2xvc2U7XG5cdHNlbGYubGF6eUVudHJpZXMgPSAhIWxhenlFbnRyaWVzO1xuXHRzZWxmLmRlY29kZVN0cmluZ3MgPSAhIWRlY29kZVN0cmluZ3M7XG5cdHNlbGYudmFsaWRhdGVFbnRyeVNpemVzID0gISF2YWxpZGF0ZUVudHJ5U2l6ZXM7XG5cdHNlbGYuc3RyaWN0RmlsZU5hbWVzID0gISFzdHJpY3RGaWxlTmFtZXM7XG5cdHNlbGYuaXNPcGVuID0gdHJ1ZTtcblx0c2VsZi5lbWl0dGVkRXJyb3IgPSBmYWxzZTtcblxuXHRpZiAoIXNlbGYubGF6eUVudHJpZXMpIHNlbGYuX3JlYWRFbnRyeSgpO1xufVxuXG5aaXBGaWxlLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKCF0aGlzLmlzT3BlbikgcmV0dXJuO1xuXHR0aGlzLmlzT3BlbiA9IGZhbHNlO1xuXHR0aGlzLnJlYWRlci51bnJlZigpO1xufTtcblxuZnVuY3Rpb24gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIGVycikge1xuXHRpZiAoc2VsZi5hdXRvQ2xvc2UpIHNlbGYuY2xvc2UoKTtcblx0ZW1pdEVycm9yKHNlbGYsIGVycik7XG59XG5cbmZ1bmN0aW9uIGVtaXRFcnJvcihzZWxmLCBlcnIpIHtcblx0aWYgKHNlbGYuZW1pdHRlZEVycm9yKSByZXR1cm47XG5cdHNlbGYuZW1pdHRlZEVycm9yID0gdHJ1ZTtcblx0c2VsZi5lbWl0KFwiZXJyb3JcIiwgZXJyKTtcbn1cblxuWmlwRmlsZS5wcm90b3R5cGUucmVhZEVudHJ5ID0gZnVuY3Rpb24gKCkge1xuXHRpZiAoIXRoaXMubGF6eUVudHJpZXMpIHRocm93IG5ldyBFcnJvcihcInJlYWRFbnRyeSgpIGNhbGxlZCB3aXRob3V0IGxhenlFbnRyaWVzOnRydWVcIik7XG5cdHRoaXMuX3JlYWRFbnRyeSgpO1xufTtcblppcEZpbGUucHJvdG90eXBlLl9yZWFkRW50cnkgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0aWYgKHNlbGYuZW50cnlDb3VudCA9PT0gc2VsZi5lbnRyaWVzUmVhZCkge1xuXHRcdC8vIGRvbmUgd2l0aCBtZXRhZGF0YVxuXHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoc2VsZi5hdXRvQ2xvc2UpIHNlbGYuY2xvc2UoKTtcblx0XHRcdGlmIChzZWxmLmVtaXR0ZWRFcnJvcikgcmV0dXJuO1xuXHRcdFx0c2VsZi5lbWl0KFwiZW5kXCIpO1xuXHRcdH0pO1xuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoc2VsZi5lbWl0dGVkRXJyb3IpIHJldHVybjtcblx0dmFyIGJ1ZmZlciA9IG5ld0J1ZmZlcig0Nik7XG5cdHJlYWRBbmRBc3NlcnROb0VvZihzZWxmLnJlYWRlciwgYnVmZmVyLCAwLCBidWZmZXIubGVuZ3RoLCBzZWxmLnJlYWRFbnRyeUN1cnNvciwgZnVuY3Rpb24gKGVycikge1xuXHRcdGlmIChlcnIpIHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgZXJyKTtcblx0XHRpZiAoc2VsZi5lbWl0dGVkRXJyb3IpIHJldHVybjtcblx0XHR2YXIgZW50cnkgPSBuZXcgRW50cnkoKTtcblx0XHQvLyAwIC0gQ2VudHJhbCBkaXJlY3RvcnkgZmlsZSBoZWFkZXIgc2lnbmF0dXJlXG5cdFx0dmFyIHNpZ25hdHVyZSA9IGJ1ZmZlci5yZWFkVUludDMyTEUoMCk7XG5cdFx0aWYgKHNpZ25hdHVyZSAhPT0gMHgwMjAxNGI1MCkgcmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBuZXcgRXJyb3IoXCJpbnZhbGlkIGNlbnRyYWwgZGlyZWN0b3J5IGZpbGUgaGVhZGVyIHNpZ25hdHVyZTogMHhcIiArIHNpZ25hdHVyZS50b1N0cmluZygxNikpKTtcblx0XHQvLyA0IC0gVmVyc2lvbiBtYWRlIGJ5XG5cdFx0ZW50cnkudmVyc2lvbk1hZGVCeSA9IGJ1ZmZlci5yZWFkVUludDE2TEUoNCk7XG5cdFx0Ly8gNiAtIFZlcnNpb24gbmVlZGVkIHRvIGV4dHJhY3QgKG1pbmltdW0pXG5cdFx0ZW50cnkudmVyc2lvbk5lZWRlZFRvRXh0cmFjdCA9IGJ1ZmZlci5yZWFkVUludDE2TEUoNik7XG5cdFx0Ly8gOCAtIEdlbmVyYWwgcHVycG9zZSBiaXQgZmxhZ1xuXHRcdGVudHJ5LmdlbmVyYWxQdXJwb3NlQml0RmxhZyA9IGJ1ZmZlci5yZWFkVUludDE2TEUoOCk7XG5cdFx0Ly8gMTAgLSBDb21wcmVzc2lvbiBtZXRob2Rcblx0XHRlbnRyeS5jb21wcmVzc2lvbk1ldGhvZCA9IGJ1ZmZlci5yZWFkVUludDE2TEUoMTApO1xuXHRcdC8vIDEyIC0gRmlsZSBsYXN0IG1vZGlmaWNhdGlvbiB0aW1lXG5cdFx0ZW50cnkubGFzdE1vZEZpbGVUaW1lID0gYnVmZmVyLnJlYWRVSW50MTZMRSgxMik7XG5cdFx0Ly8gMTQgLSBGaWxlIGxhc3QgbW9kaWZpY2F0aW9uIGRhdGVcblx0XHRlbnRyeS5sYXN0TW9kRmlsZURhdGUgPSBidWZmZXIucmVhZFVJbnQxNkxFKDE0KTtcblx0XHQvLyAxNiAtIENSQy0zMlxuXHRcdGVudHJ5LmNyYzMyID0gYnVmZmVyLnJlYWRVSW50MzJMRSgxNik7XG5cdFx0Ly8gMjAgLSBDb21wcmVzc2VkIHNpemVcblx0XHRlbnRyeS5jb21wcmVzc2VkU2l6ZSA9IGJ1ZmZlci5yZWFkVUludDMyTEUoMjApO1xuXHRcdC8vIDI0IC0gVW5jb21wcmVzc2VkIHNpemVcblx0XHRlbnRyeS51bmNvbXByZXNzZWRTaXplID0gYnVmZmVyLnJlYWRVSW50MzJMRSgyNCk7XG5cdFx0Ly8gMjggLSBGaWxlIG5hbWUgbGVuZ3RoIChuKVxuXHRcdGVudHJ5LmZpbGVOYW1lTGVuZ3RoID0gYnVmZmVyLnJlYWRVSW50MTZMRSgyOCk7XG5cdFx0Ly8gMzAgLSBFeHRyYSBmaWVsZCBsZW5ndGggKG0pXG5cdFx0ZW50cnkuZXh0cmFGaWVsZExlbmd0aCA9IGJ1ZmZlci5yZWFkVUludDE2TEUoMzApO1xuXHRcdC8vIDMyIC0gRmlsZSBjb21tZW50IGxlbmd0aCAoaylcblx0XHRlbnRyeS5maWxlQ29tbWVudExlbmd0aCA9IGJ1ZmZlci5yZWFkVUludDE2TEUoMzIpO1xuXHRcdC8vIDM0IC0gRGlzayBudW1iZXIgd2hlcmUgZmlsZSBzdGFydHNcblx0XHQvLyAzNiAtIEludGVybmFsIGZpbGUgYXR0cmlidXRlc1xuXHRcdGVudHJ5LmludGVybmFsRmlsZUF0dHJpYnV0ZXMgPSBidWZmZXIucmVhZFVJbnQxNkxFKDM2KTtcblx0XHQvLyAzOCAtIEV4dGVybmFsIGZpbGUgYXR0cmlidXRlc1xuXHRcdGVudHJ5LmV4dGVybmFsRmlsZUF0dHJpYnV0ZXMgPSBidWZmZXIucmVhZFVJbnQzMkxFKDM4KTtcblx0XHQvLyA0MiAtIFJlbGF0aXZlIG9mZnNldCBvZiBsb2NhbCBmaWxlIGhlYWRlclxuXHRcdGVudHJ5LnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9IGJ1ZmZlci5yZWFkVUludDMyTEUoNDIpO1xuXG5cdFx0aWYgKGVudHJ5LmdlbmVyYWxQdXJwb3NlQml0RmxhZyAmIDB4NDApIHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKFwic3Ryb25nIGVuY3J5cHRpb24gaXMgbm90IHN1cHBvcnRlZFwiKSk7XG5cblx0XHRzZWxmLnJlYWRFbnRyeUN1cnNvciArPSA0NjtcblxuXHRcdGJ1ZmZlciA9IG5ld0J1ZmZlcihlbnRyeS5maWxlTmFtZUxlbmd0aCArIGVudHJ5LmV4dHJhRmllbGRMZW5ndGggKyBlbnRyeS5maWxlQ29tbWVudExlbmd0aCk7XG5cdFx0cmVhZEFuZEFzc2VydE5vRW9mKHNlbGYucmVhZGVyLCBidWZmZXIsIDAsIGJ1ZmZlci5sZW5ndGgsIHNlbGYucmVhZEVudHJ5Q3Vyc29yLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRpZiAoZXJyKSByZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIGVycik7XG5cdFx0XHRpZiAoc2VsZi5lbWl0dGVkRXJyb3IpIHJldHVybjtcblx0XHRcdC8vIDQ2IC0gRmlsZSBuYW1lXG5cdFx0XHR2YXIgaXNVdGY4ID0gKGVudHJ5LmdlbmVyYWxQdXJwb3NlQml0RmxhZyAmIDB4ODAwKSAhPT0gMDtcblx0XHRcdGVudHJ5LmZpbGVOYW1lID0gc2VsZi5kZWNvZGVTdHJpbmdzID8gZGVjb2RlQnVmZmVyKGJ1ZmZlciwgMCwgZW50cnkuZmlsZU5hbWVMZW5ndGgsIGlzVXRmOClcblx0XHRcdFx0OiBidWZmZXIuc2xpY2UoMCwgZW50cnkuZmlsZU5hbWVMZW5ndGgpO1xuXG5cdFx0XHQvLyA0NituIC0gRXh0cmEgZmllbGRcblx0XHRcdHZhciBmaWxlQ29tbWVudFN0YXJ0ID0gZW50cnkuZmlsZU5hbWVMZW5ndGggKyBlbnRyeS5leHRyYUZpZWxkTGVuZ3RoO1xuXHRcdFx0dmFyIGV4dHJhRmllbGRCdWZmZXIgPSBidWZmZXIuc2xpY2UoZW50cnkuZmlsZU5hbWVMZW5ndGgsIGZpbGVDb21tZW50U3RhcnQpO1xuXHRcdFx0ZW50cnkuZXh0cmFGaWVsZHMgPSBbXTtcblx0XHRcdHZhciBpID0gMDtcblx0XHRcdHdoaWxlIChpIDwgZXh0cmFGaWVsZEJ1ZmZlci5sZW5ndGggLSAzKSB7XG5cdFx0XHRcdHZhciBoZWFkZXJJZCA9IGV4dHJhRmllbGRCdWZmZXIucmVhZFVJbnQxNkxFKGkgKyAwKTtcblx0XHRcdFx0dmFyIGRhdGFTaXplID0gZXh0cmFGaWVsZEJ1ZmZlci5yZWFkVUludDE2TEUoaSArIDIpO1xuXHRcdFx0XHR2YXIgZGF0YVN0YXJ0ID0gaSArIDQ7XG5cdFx0XHRcdHZhciBkYXRhRW5kID0gZGF0YVN0YXJ0ICsgZGF0YVNpemU7XG5cdFx0XHRcdGlmIChkYXRhRW5kID4gZXh0cmFGaWVsZEJ1ZmZlci5sZW5ndGgpIHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKFwiZXh0cmEgZmllbGQgbGVuZ3RoIGV4Y2VlZHMgZXh0cmEgZmllbGQgYnVmZmVyIHNpemVcIikpO1xuXHRcdFx0XHR2YXIgZGF0YUJ1ZmZlciA9IG5ld0J1ZmZlcihkYXRhU2l6ZSk7XG5cdFx0XHRcdGV4dHJhRmllbGRCdWZmZXIuY29weShkYXRhQnVmZmVyLCAwLCBkYXRhU3RhcnQsIGRhdGFFbmQpO1xuXHRcdFx0XHRlbnRyeS5leHRyYUZpZWxkcy5wdXNoKHtcblx0XHRcdFx0XHRpZDogaGVhZGVySWQsXG5cdFx0XHRcdFx0ZGF0YTogZGF0YUJ1ZmZlcixcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGkgPSBkYXRhRW5kO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyA0NituK20gLSBGaWxlIGNvbW1lbnRcblx0XHRcdGVudHJ5LmZpbGVDb21tZW50ID0gc2VsZi5kZWNvZGVTdHJpbmdzID8gZGVjb2RlQnVmZmVyKGJ1ZmZlciwgZmlsZUNvbW1lbnRTdGFydCwgZmlsZUNvbW1lbnRTdGFydCArIGVudHJ5LmZpbGVDb21tZW50TGVuZ3RoLCBpc1V0ZjgpXG5cdFx0XHRcdDogYnVmZmVyLnNsaWNlKGZpbGVDb21tZW50U3RhcnQsIGZpbGVDb21tZW50U3RhcnQgKyBlbnRyeS5maWxlQ29tbWVudExlbmd0aCk7XG5cdFx0XHQvLyBjb21wYXRpYmlsaXR5IGhhY2sgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS90aGVqb3Nod29sZmUveWF1emwvaXNzdWVzLzQ3XG5cdFx0XHRlbnRyeS5jb21tZW50ID0gZW50cnkuZmlsZUNvbW1lbnQ7XG5cblx0XHRcdHNlbGYucmVhZEVudHJ5Q3Vyc29yICs9IGJ1ZmZlci5sZW5ndGg7XG5cdFx0XHRzZWxmLmVudHJpZXNSZWFkICs9IDE7XG5cblx0XHRcdGlmIChlbnRyeS51bmNvbXByZXNzZWRTaXplID09PSAweGZmZmZmZmZmIHx8XG5cdFx0XHRcdGVudHJ5LmNvbXByZXNzZWRTaXplID09PSAweGZmZmZmZmZmIHx8XG5cdFx0XHRcdGVudHJ5LnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9PT0gMHhmZmZmZmZmZikge1xuXHRcdFx0XHQvLyBaSVA2NCBmb3JtYXRcblx0XHRcdFx0Ly8gZmluZCB0aGUgWmlwNjQgRXh0ZW5kZWQgSW5mb3JtYXRpb24gRXh0cmEgRmllbGRcblx0XHRcdFx0dmFyIHppcDY0RWllZkJ1ZmZlciA9IG51bGw7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZW50cnkuZXh0cmFGaWVsZHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHR2YXIgZXh0cmFGaWVsZCA9IGVudHJ5LmV4dHJhRmllbGRzW2ldO1xuXHRcdFx0XHRcdGlmIChleHRyYUZpZWxkLmlkID09PSAweDAwMDEpIHtcblx0XHRcdFx0XHRcdHppcDY0RWllZkJ1ZmZlciA9IGV4dHJhRmllbGQuZGF0YTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoemlwNjRFaWVmQnVmZmVyID09IG51bGwpIHtcblx0XHRcdFx0XHRyZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihcImV4cGVjdGVkIHppcDY0IGV4dGVuZGVkIGluZm9ybWF0aW9uIGV4dHJhIGZpZWxkXCIpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgaW5kZXggPSAwO1xuXHRcdFx0XHQvLyAwIC0gT3JpZ2luYWwgU2l6ZSAgICAgICAgICA4IGJ5dGVzXG5cdFx0XHRcdGlmIChlbnRyeS51bmNvbXByZXNzZWRTaXplID09PSAweGZmZmZmZmZmKSB7XG5cdFx0XHRcdFx0aWYgKGluZGV4ICsgOCA+IHppcDY0RWllZkJ1ZmZlci5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKFwiemlwNjQgZXh0ZW5kZWQgaW5mb3JtYXRpb24gZXh0cmEgZmllbGQgZG9lcyBub3QgaW5jbHVkZSB1bmNvbXByZXNzZWQgc2l6ZVwiKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPSByZWFkVUludDY0TEUoemlwNjRFaWVmQnVmZmVyLCBpbmRleCk7XG5cdFx0XHRcdFx0aW5kZXggKz0gODtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyA4IC0gQ29tcHJlc3NlZCBTaXplICAgICAgICA4IGJ5dGVzXG5cdFx0XHRcdGlmIChlbnRyeS5jb21wcmVzc2VkU2l6ZSA9PT0gMHhmZmZmZmZmZikge1xuXHRcdFx0XHRcdGlmIChpbmRleCArIDggPiB6aXA2NEVpZWZCdWZmZXIubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihcInppcDY0IGV4dGVuZGVkIGluZm9ybWF0aW9uIGV4dHJhIGZpZWxkIGRvZXMgbm90IGluY2x1ZGUgY29tcHJlc3NlZCBzaXplXCIpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZW50cnkuY29tcHJlc3NlZFNpemUgPSByZWFkVUludDY0TEUoemlwNjRFaWVmQnVmZmVyLCBpbmRleCk7XG5cdFx0XHRcdFx0aW5kZXggKz0gODtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyAxNiAtIFJlbGF0aXZlIEhlYWRlciBPZmZzZXQgOCBieXRlc1xuXHRcdFx0XHRpZiAoZW50cnkucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID09PSAweGZmZmZmZmZmKSB7XG5cdFx0XHRcdFx0aWYgKGluZGV4ICsgOCA+IHppcDY0RWllZkJ1ZmZlci5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKFwiemlwNjQgZXh0ZW5kZWQgaW5mb3JtYXRpb24gZXh0cmEgZmllbGQgZG9lcyBub3QgaW5jbHVkZSByZWxhdGl2ZSBoZWFkZXIgb2Zmc2V0XCIpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZW50cnkucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID0gcmVhZFVJbnQ2NExFKHppcDY0RWllZkJ1ZmZlciwgaW5kZXgpO1xuXHRcdFx0XHRcdGluZGV4ICs9IDg7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gMjQgLSBEaXNrIFN0YXJ0IE51bWJlciAgICAgIDQgYnl0ZXNcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2hlY2sgZm9yIEluZm8tWklQIFVuaWNvZGUgUGF0aCBFeHRyYSBGaWVsZCAoMHg3MDc1KVxuXHRcdFx0Ly8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS90aGVqb3Nod29sZmUveWF1emwvaXNzdWVzLzMzXG5cdFx0XHRpZiAoc2VsZi5kZWNvZGVTdHJpbmdzKSB7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZW50cnkuZXh0cmFGaWVsZHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHR2YXIgZXh0cmFGaWVsZCA9IGVudHJ5LmV4dHJhRmllbGRzW2ldO1xuXHRcdFx0XHRcdGlmIChleHRyYUZpZWxkLmlkID09PSAweDcwNzUpIHtcblx0XHRcdFx0XHRcdGlmIChleHRyYUZpZWxkLmRhdGEubGVuZ3RoIDwgNikge1xuXHRcdFx0XHRcdFx0XHQvLyB0b28gc2hvcnQgdG8gYmUgbWVhbmluZ2Z1bFxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIFZlcnNpb24gICAgICAgMSBieXRlICAgICAgdmVyc2lvbiBvZiB0aGlzIGV4dHJhIGZpZWxkLCBjdXJyZW50bHkgMVxuXHRcdFx0XHRcdFx0aWYgKGV4dHJhRmllbGQuZGF0YS5yZWFkVUludDgoMCkgIT09IDEpIHtcblx0XHRcdFx0XHRcdFx0Ly8gPiBDaGFuZ2VzIG1heSBub3QgYmUgYmFja3dhcmQgY29tcGF0aWJsZSBzbyB0aGlzIGV4dHJhXG5cdFx0XHRcdFx0XHRcdC8vID4gZmllbGQgc2hvdWxkIG5vdCBiZSB1c2VkIGlmIHRoZSB2ZXJzaW9uIGlzIG5vdCByZWNvZ25pemVkLlxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIE5hbWVDUkMzMiAgICAgNCBieXRlcyAgICAgRmlsZSBOYW1lIEZpZWxkIENSQzMyIENoZWNrc3VtXG5cdFx0XHRcdFx0XHR2YXIgb2xkTmFtZUNyYzMyID0gZXh0cmFGaWVsZC5kYXRhLnJlYWRVSW50MzJMRSgxKTtcblx0XHRcdFx0XHRcdGlmIChjcmMzMi51bnNpZ25lZChidWZmZXIuc2xpY2UoMCwgZW50cnkuZmlsZU5hbWVMZW5ndGgpKSAhPT0gb2xkTmFtZUNyYzMyKSB7XG5cdFx0XHRcdFx0XHRcdC8vID4gSWYgdGhlIENSQyBjaGVjayBmYWlscywgdGhpcyBVVEYtOCBQYXRoIEV4dHJhIEZpZWxkIHNob3VsZCBiZVxuXHRcdFx0XHRcdFx0XHQvLyA+IGlnbm9yZWQgYW5kIHRoZSBGaWxlIE5hbWUgZmllbGQgaW4gdGhlIGhlYWRlciBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkLlxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIFVuaWNvZGVOYW1lICAgVmFyaWFibGUgICAgVVRGLTggdmVyc2lvbiBvZiB0aGUgZW50cnkgRmlsZSBOYW1lXG5cdFx0XHRcdFx0XHRlbnRyeS5maWxlTmFtZSA9IGRlY29kZUJ1ZmZlcihleHRyYUZpZWxkLmRhdGEsIDUsIGV4dHJhRmllbGQuZGF0YS5sZW5ndGgsIHRydWUpO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIHZhbGlkYXRlIGZpbGUgc2l6ZVxuXHRcdFx0aWYgKHNlbGYudmFsaWRhdGVFbnRyeVNpemVzICYmIGVudHJ5LmNvbXByZXNzaW9uTWV0aG9kID09PSAwKSB7XG5cdFx0XHRcdHZhciBleHBlY3RlZENvbXByZXNzZWRTaXplID0gZW50cnkudW5jb21wcmVzc2VkU2l6ZTtcblx0XHRcdFx0aWYgKGVudHJ5LmlzRW5jcnlwdGVkKCkpIHtcblx0XHRcdFx0XHQvLyB0cmFkaXRpb25hbCBlbmNyeXB0aW9uIHByZWZpeGVzIHRoZSBmaWxlIGRhdGEgd2l0aCBhIGhlYWRlclxuXHRcdFx0XHRcdGV4cGVjdGVkQ29tcHJlc3NlZFNpemUgKz0gMTI7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGVudHJ5LmNvbXByZXNzZWRTaXplICE9PSBleHBlY3RlZENvbXByZXNzZWRTaXplKSB7XG5cdFx0XHRcdFx0dmFyIG1zZyA9IFwiY29tcHJlc3NlZC91bmNvbXByZXNzZWQgc2l6ZSBtaXNtYXRjaCBmb3Igc3RvcmVkIGZpbGU6IFwiICsgZW50cnkuY29tcHJlc3NlZFNpemUgKyBcIiAhPSBcIiArIGVudHJ5LnVuY29tcHJlc3NlZFNpemU7XG5cdFx0XHRcdFx0cmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBuZXcgRXJyb3IobXNnKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKHNlbGYuZGVjb2RlU3RyaW5ncykge1xuXHRcdFx0XHRpZiAoIXNlbGYuc3RyaWN0RmlsZU5hbWVzKSB7XG5cdFx0XHRcdFx0Ly8gYWxsb3cgYmFja3NsYXNoXG5cdFx0XHRcdFx0ZW50cnkuZmlsZU5hbWUgPSBlbnRyeS5maWxlTmFtZS5yZXBsYWNlKC9cXFxcL2csIFwiL1wiKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgZXJyb3JNZXNzYWdlID0gdmFsaWRhdGVGaWxlTmFtZShlbnRyeS5maWxlTmFtZSwgc2VsZi52YWxpZGF0ZUZpbGVOYW1lT3B0aW9ucyk7XG5cdFx0XHRcdGlmIChlcnJvck1lc3NhZ2UgIT0gbnVsbCkgcmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBuZXcgRXJyb3IoZXJyb3JNZXNzYWdlKSk7XG5cdFx0XHR9XG5cdFx0XHRzZWxmLmVtaXQoXCJlbnRyeVwiLCBlbnRyeSk7XG5cblx0XHRcdGlmICghc2VsZi5sYXp5RW50cmllcykgc2VsZi5fcmVhZEVudHJ5KCk7XG5cdFx0fSk7XG5cdH0pO1xufTtcblxuWmlwRmlsZS5wcm90b3R5cGUub3BlblJlYWRTdHJlYW0gPSBmdW5jdGlvbiAoZW50cnksIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0Ly8gcGFyYW1ldGVyIHZhbGlkYXRpb25cblx0dmFyIHJlbGF0aXZlU3RhcnQgPSAwO1xuXHR2YXIgcmVsYXRpdmVFbmQgPSBlbnRyeS5jb21wcmVzc2VkU2l6ZTtcblx0aWYgKGNhbGxiYWNrID09IG51bGwpIHtcblx0XHRjYWxsYmFjayA9IG9wdGlvbnM7XG5cdFx0b3B0aW9ucyA9IHt9O1xuXHR9IGVsc2Uge1xuXHRcdC8vIHZhbGlkYXRlIG9wdGlvbnMgdGhhdCB0aGUgY2FsbGVyIGhhcyBubyBleGN1c2UgdG8gZ2V0IHdyb25nXG5cdFx0aWYgKG9wdGlvbnMuZGVjcnlwdCAhPSBudWxsKSB7XG5cdFx0XHRpZiAoIWVudHJ5LmlzRW5jcnlwdGVkKCkpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5kZWNyeXB0IGNhbiBvbmx5IGJlIHNwZWNpZmllZCBmb3IgZW5jcnlwdGVkIGVudHJpZXNcIik7XG5cdFx0XHR9XG5cdFx0XHRpZiAob3B0aW9ucy5kZWNyeXB0ICE9PSBmYWxzZSkgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCBvcHRpb25zLmRlY3J5cHQgdmFsdWU6IFwiICsgb3B0aW9ucy5kZWNyeXB0KTtcblx0XHRcdGlmIChlbnRyeS5pc0NvbXByZXNzZWQoKSkge1xuXHRcdFx0XHRpZiAob3B0aW9ucy5kZWNvbXByZXNzICE9PSBmYWxzZSkgdGhyb3cgbmV3IEVycm9yKFwiZW50cnkgaXMgZW5jcnlwdGVkIGFuZCBjb21wcmVzc2VkLCBhbmQgb3B0aW9ucy5kZWNvbXByZXNzICE9PSBmYWxzZVwiKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMuZGVjb21wcmVzcyAhPSBudWxsKSB7XG5cdFx0XHRpZiAoIWVudHJ5LmlzQ29tcHJlc3NlZCgpKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuZGVjb21wcmVzcyBjYW4gb25seSBiZSBzcGVjaWZpZWQgZm9yIGNvbXByZXNzZWQgZW50cmllc1wiKTtcblx0XHRcdH1cblx0XHRcdGlmICghKG9wdGlvbnMuZGVjb21wcmVzcyA9PT0gZmFsc2UgfHwgb3B0aW9ucy5kZWNvbXByZXNzID09PSB0cnVlKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIG9wdGlvbnMuZGVjb21wcmVzcyB2YWx1ZTogXCIgKyBvcHRpb25zLmRlY29tcHJlc3MpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAob3B0aW9ucy5zdGFydCAhPSBudWxsIHx8IG9wdGlvbnMuZW5kICE9IG51bGwpIHtcblx0XHRcdGlmIChlbnRyeS5pc0NvbXByZXNzZWQoKSAmJiBvcHRpb25zLmRlY29tcHJlc3MgIT09IGZhbHNlKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcInN0YXJ0L2VuZCByYW5nZSBub3QgYWxsb3dlZCBmb3IgY29tcHJlc3NlZCBlbnRyeSB3aXRob3V0IG9wdGlvbnMuZGVjb21wcmVzcyA9PT0gZmFsc2VcIik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoZW50cnkuaXNFbmNyeXB0ZWQoKSAmJiBvcHRpb25zLmRlY3J5cHQgIT09IGZhbHNlKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcInN0YXJ0L2VuZCByYW5nZSBub3QgYWxsb3dlZCBmb3IgZW5jcnlwdGVkIGVudHJ5IHdpdGhvdXQgb3B0aW9ucy5kZWNyeXB0ID09PSBmYWxzZVwiKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMuc3RhcnQgIT0gbnVsbCkge1xuXHRcdFx0cmVsYXRpdmVTdGFydCA9IG9wdGlvbnMuc3RhcnQ7XG5cdFx0XHRpZiAocmVsYXRpdmVTdGFydCA8IDApIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuc3RhcnQgPCAwXCIpO1xuXHRcdFx0aWYgKHJlbGF0aXZlU3RhcnQgPiBlbnRyeS5jb21wcmVzc2VkU2l6ZSkgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5zdGFydCA+IGVudHJ5LmNvbXByZXNzZWRTaXplXCIpO1xuXHRcdH1cblx0XHRpZiAob3B0aW9ucy5lbmQgIT0gbnVsbCkge1xuXHRcdFx0cmVsYXRpdmVFbmQgPSBvcHRpb25zLmVuZDtcblx0XHRcdGlmIChyZWxhdGl2ZUVuZCA8IDApIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuZW5kIDwgMFwiKTtcblx0XHRcdGlmIChyZWxhdGl2ZUVuZCA+IGVudHJ5LmNvbXByZXNzZWRTaXplKSB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLmVuZCA+IGVudHJ5LmNvbXByZXNzZWRTaXplXCIpO1xuXHRcdFx0aWYgKHJlbGF0aXZlRW5kIDwgcmVsYXRpdmVTdGFydCkgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5lbmQgPCBvcHRpb25zLnN0YXJ0XCIpO1xuXHRcdH1cblx0fVxuXHQvLyBhbnkgZnVydGhlciBlcnJvcnMgY2FuIGVpdGhlciBiZSBjYXVzZWQgYnkgdGhlIHppcGZpbGUsXG5cdC8vIG9yIHdlcmUgaW50cm9kdWNlZCBpbiBhIG1pbm9yIHZlcnNpb24gb2YgeWF1emwsXG5cdC8vIHNvIHNob3VsZCBiZSBwYXNzZWQgdG8gdGhlIGNsaWVudCByYXRoZXIgdGhhbiB0aHJvd24uXG5cdGlmICghc2VsZi5pc09wZW4pIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJjbG9zZWRcIikpO1xuXHRpZiAoZW50cnkuaXNFbmNyeXB0ZWQoKSkge1xuXHRcdGlmIChvcHRpb25zLmRlY3J5cHQgIT09IGZhbHNlKSByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiZW50cnkgaXMgZW5jcnlwdGVkLCBhbmQgb3B0aW9ucy5kZWNyeXB0ICE9PSBmYWxzZVwiKSk7XG5cdH1cblx0Ly8gbWFrZSBzdXJlIHdlIGRvbid0IGxvc2UgdGhlIGZkIGJlZm9yZSB3ZSBvcGVuIHRoZSBhY3R1YWwgcmVhZCBzdHJlYW1cblx0c2VsZi5yZWFkZXIucmVmKCk7XG5cdHZhciBidWZmZXIgPSBuZXdCdWZmZXIoMzApO1xuXHRyZWFkQW5kQXNzZXJ0Tm9Fb2Yoc2VsZi5yZWFkZXIsIGJ1ZmZlciwgMCwgYnVmZmVyLmxlbmd0aCwgZW50cnkucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0Ly8gMCAtIExvY2FsIGZpbGUgaGVhZGVyIHNpZ25hdHVyZSA9IDB4MDQwMzRiNTBcblx0XHRcdHZhciBzaWduYXR1cmUgPSBidWZmZXIucmVhZFVJbnQzMkxFKDApO1xuXHRcdFx0aWYgKHNpZ25hdHVyZSAhPT0gMHgwNDAzNGI1MCkge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiaW52YWxpZCBsb2NhbCBmaWxlIGhlYWRlciBzaWduYXR1cmU6IDB4XCIgKyBzaWduYXR1cmUudG9TdHJpbmcoMTYpKSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBhbGwgdGhpcyBzaG91bGQgYmUgcmVkdW5kYW50XG5cdFx0XHQvLyA0IC0gVmVyc2lvbiBuZWVkZWQgdG8gZXh0cmFjdCAobWluaW11bSlcblx0XHRcdC8vIDYgLSBHZW5lcmFsIHB1cnBvc2UgYml0IGZsYWdcblx0XHRcdC8vIDggLSBDb21wcmVzc2lvbiBtZXRob2Rcblx0XHRcdC8vIDEwIC0gRmlsZSBsYXN0IG1vZGlmaWNhdGlvbiB0aW1lXG5cdFx0XHQvLyAxMiAtIEZpbGUgbGFzdCBtb2RpZmljYXRpb24gZGF0ZVxuXHRcdFx0Ly8gMTQgLSBDUkMtMzJcblx0XHRcdC8vIDE4IC0gQ29tcHJlc3NlZCBzaXplXG5cdFx0XHQvLyAyMiAtIFVuY29tcHJlc3NlZCBzaXplXG5cdFx0XHQvLyAyNiAtIEZpbGUgbmFtZSBsZW5ndGggKG4pXG5cdFx0XHR2YXIgZmlsZU5hbWVMZW5ndGggPSBidWZmZXIucmVhZFVJbnQxNkxFKDI2KTtcblx0XHRcdC8vIDI4IC0gRXh0cmEgZmllbGQgbGVuZ3RoIChtKVxuXHRcdFx0dmFyIGV4dHJhRmllbGRMZW5ndGggPSBidWZmZXIucmVhZFVJbnQxNkxFKDI4KTtcblx0XHRcdC8vIDMwIC0gRmlsZSBuYW1lXG5cdFx0XHQvLyAzMCtuIC0gRXh0cmEgZmllbGRcblx0XHRcdHZhciBsb2NhbEZpbGVIZWFkZXJFbmQgPSBlbnRyeS5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgKyBidWZmZXIubGVuZ3RoICsgZmlsZU5hbWVMZW5ndGggKyBleHRyYUZpZWxkTGVuZ3RoO1xuXHRcdFx0dmFyIGRlY29tcHJlc3M7XG5cdFx0XHRpZiAoZW50cnkuY29tcHJlc3Npb25NZXRob2QgPT09IDApIHtcblx0XHRcdFx0Ly8gMCAtIFRoZSBmaWxlIGlzIHN0b3JlZCAobm8gY29tcHJlc3Npb24pXG5cdFx0XHRcdGRlY29tcHJlc3MgPSBmYWxzZTtcblx0XHRcdH0gZWxzZSBpZiAoZW50cnkuY29tcHJlc3Npb25NZXRob2QgPT09IDgpIHtcblx0XHRcdFx0Ly8gOCAtIFRoZSBmaWxlIGlzIERlZmxhdGVkXG5cdFx0XHRcdGRlY29tcHJlc3MgPSBvcHRpb25zLmRlY29tcHJlc3MgIT0gbnVsbCA/IG9wdGlvbnMuZGVjb21wcmVzcyA6IHRydWU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwidW5zdXBwb3J0ZWQgY29tcHJlc3Npb24gbWV0aG9kOiBcIiArIGVudHJ5LmNvbXByZXNzaW9uTWV0aG9kKSk7XG5cdFx0XHR9XG5cdFx0XHR2YXIgZmlsZURhdGFTdGFydCA9IGxvY2FsRmlsZUhlYWRlckVuZDtcblx0XHRcdHZhciBmaWxlRGF0YUVuZCA9IGZpbGVEYXRhU3RhcnQgKyBlbnRyeS5jb21wcmVzc2VkU2l6ZTtcblx0XHRcdGlmIChlbnRyeS5jb21wcmVzc2VkU2l6ZSAhPT0gMCkge1xuXHRcdFx0XHQvLyBib3VuZHMgY2hlY2sgbm93LCBiZWNhdXNlIHRoZSByZWFkIHN0cmVhbXMgd2lsbCBwcm9iYWJseSBub3QgY29tcGxhaW4gbG91ZCBlbm91Z2guXG5cdFx0XHRcdC8vIHNpbmNlIHdlJ3JlIGRlYWxpbmcgd2l0aCBhbiB1bnNpZ25lZCBvZmZzZXQgcGx1cyBhbiB1bnNpZ25lZCBzaXplLFxuXHRcdFx0XHQvLyB3ZSBvbmx5IGhhdmUgMSB0aGluZyB0byBjaGVjayBmb3IuXG5cdFx0XHRcdGlmIChmaWxlRGF0YUVuZCA+IHNlbGYuZmlsZVNpemUpIHtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiZmlsZSBkYXRhIG92ZXJmbG93cyBmaWxlIGJvdW5kczogXCIgK1xuXHRcdFx0XHRcdFx0ZmlsZURhdGFTdGFydCArIFwiICsgXCIgKyBlbnRyeS5jb21wcmVzc2VkU2l6ZSArIFwiID4gXCIgKyBzZWxmLmZpbGVTaXplKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHZhciByZWFkU3RyZWFtID0gc2VsZi5yZWFkZXIuY3JlYXRlUmVhZFN0cmVhbSh7XG5cdFx0XHRcdHN0YXJ0OiBmaWxlRGF0YVN0YXJ0ICsgcmVsYXRpdmVTdGFydCxcblx0XHRcdFx0ZW5kOiBmaWxlRGF0YVN0YXJ0ICsgcmVsYXRpdmVFbmQsXG5cdFx0XHR9KTtcblx0XHRcdHZhciBlbmRwb2ludFN0cmVhbSA9IHJlYWRTdHJlYW07XG5cdFx0XHRpZiAoZGVjb21wcmVzcykge1xuXHRcdFx0XHR2YXIgZGVzdHJveWVkID0gZmFsc2U7XG5cdFx0XHRcdHZhciBpbmZsYXRlRmlsdGVyID0gemxpYi5jcmVhdGVJbmZsYXRlUmF3KCk7XG5cdFx0XHRcdHJlYWRTdHJlYW0ub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRcdFx0Ly8gc2V0SW1tZWRpYXRlIGhlcmUgYmVjYXVzZSBlcnJvcnMgY2FuIGJlIGVtaXR0ZWQgZHVyaW5nIHRoZSBmaXJzdCBjYWxsIHRvIHBpcGUoKVxuXHRcdFx0XHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpZiAoIWRlc3Ryb3llZCkgaW5mbGF0ZUZpbHRlci5lbWl0KFwiZXJyb3JcIiwgZXJyKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJlYWRTdHJlYW0ucGlwZShpbmZsYXRlRmlsdGVyKTtcblxuXHRcdFx0XHRpZiAoc2VsZi52YWxpZGF0ZUVudHJ5U2l6ZXMpIHtcblx0XHRcdFx0XHRlbmRwb2ludFN0cmVhbSA9IG5ldyBBc3NlcnRCeXRlQ291bnRTdHJlYW0oZW50cnkudW5jb21wcmVzc2VkU2l6ZSk7XG5cdFx0XHRcdFx0aW5mbGF0ZUZpbHRlci5vbihcImVycm9yXCIsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRcdFx0XHRcdC8vIGZvcndhcmQgemxpYiBlcnJvcnMgdG8gdGhlIGNsaWVudC12aXNpYmxlIHN0cmVhbVxuXHRcdFx0XHRcdFx0c2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0aWYgKCFkZXN0cm95ZWQpIGVuZHBvaW50U3RyZWFtLmVtaXQoXCJlcnJvclwiLCBlcnIpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0aW5mbGF0ZUZpbHRlci5waXBlKGVuZHBvaW50U3RyZWFtKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyB0aGUgemxpYiBmaWx0ZXIgaXMgdGhlIGNsaWVudC12aXNpYmxlIHN0cmVhbVxuXHRcdFx0XHRcdGVuZHBvaW50U3RyZWFtID0gaW5mbGF0ZUZpbHRlcjtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyB0aGlzIGlzIHBhcnQgb2YgeWF1emwncyBBUEksIHNvIGltcGxlbWVudCB0aGlzIGZ1bmN0aW9uIG9uIHRoZSBjbGllbnQtdmlzaWJsZSBzdHJlYW1cblx0XHRcdFx0ZW5kcG9pbnRTdHJlYW0uZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRkZXN0cm95ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdGlmIChpbmZsYXRlRmlsdGVyICE9PSBlbmRwb2ludFN0cmVhbSkgaW5mbGF0ZUZpbHRlci51bnBpcGUoZW5kcG9pbnRTdHJlYW0pO1xuXHRcdFx0XHRcdHJlYWRTdHJlYW0udW5waXBlKGluZmxhdGVGaWx0ZXIpO1xuXHRcdFx0XHRcdC8vIFRPRE86IHRoZSBpbmZsYXRlRmlsdGVyIG1heSBjYXVzZSBhIG1lbW9yeSBsZWFrLiBzZWUgSXNzdWUgIzI3LlxuXHRcdFx0XHRcdHJlYWRTdHJlYW0uZGVzdHJveSgpO1xuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdFx0Y2FsbGJhY2sobnVsbCwgZW5kcG9pbnRTdHJlYW0pO1xuXHRcdH0gZmluYWxseSB7XG5cdFx0XHRzZWxmLnJlYWRlci51bnJlZigpO1xuXHRcdH1cblx0fSk7XG59O1xuXG5mdW5jdGlvbiBFbnRyeSgpIHtcbn1cblxuRW50cnkucHJvdG90eXBlLmdldExhc3RNb2REYXRlID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gZG9zRGF0ZVRpbWVUb0RhdGUodGhpcy5sYXN0TW9kRmlsZURhdGUsIHRoaXMubGFzdE1vZEZpbGVUaW1lKTtcbn07XG5FbnRyeS5wcm90b3R5cGUuaXNFbmNyeXB0ZWQgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiAodGhpcy5nZW5lcmFsUHVycG9zZUJpdEZsYWcgJiAweDEpICE9PSAwO1xufTtcbkVudHJ5LnByb3RvdHlwZS5pc0NvbXByZXNzZWQgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLmNvbXByZXNzaW9uTWV0aG9kID09PSA4O1xufTtcblxuZnVuY3Rpb24gZG9zRGF0ZVRpbWVUb0RhdGUoZGF0ZSwgdGltZSkge1xuXHR2YXIgZGF5ID0gZGF0ZSAmIDB4MWY7IC8vIDEtMzFcblx0dmFyIG1vbnRoID0gKGRhdGUgPj4gNSAmIDB4ZikgLSAxOyAvLyAxLTEyLCAwLTExXG5cdHZhciB5ZWFyID0gKGRhdGUgPj4gOSAmIDB4N2YpICsgMTk4MDsgLy8gMC0xMjgsIDE5ODAtMjEwOFxuXG5cdHZhciBtaWxsaXNlY29uZCA9IDA7XG5cdHZhciBzZWNvbmQgPSAodGltZSAmIDB4MWYpICogMjsgLy8gMC0yOSwgMC01OCAoZXZlbiBudW1iZXJzKVxuXHR2YXIgbWludXRlID0gdGltZSA+PiA1ICYgMHgzZjsgLy8gMC01OVxuXHR2YXIgaG91ciA9IHRpbWUgPj4gMTEgJiAweDFmOyAvLyAwLTIzXG5cblx0cmV0dXJuIG5ldyBEYXRlKHllYXIsIG1vbnRoLCBkYXksIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBtaWxsaXNlY29uZCk7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlRmlsZU5hbWUoZmlsZU5hbWUpIHtcblx0aWYgKGZpbGVOYW1lLmluZGV4T2YoXCJcXFxcXCIpICE9PSAtMSkge1xuXHRcdHJldHVybiBcImludmFsaWQgY2hhcmFjdGVycyBpbiBmaWxlTmFtZTogXCIgKyBmaWxlTmFtZTtcblx0fVxuXHRpZiAoL15bYS16QS1aXTovLnRlc3QoZmlsZU5hbWUpIHx8IC9eXFwvLy50ZXN0KGZpbGVOYW1lKSkge1xuXHRcdHJldHVybiBcImFic29sdXRlIHBhdGg6IFwiICsgZmlsZU5hbWU7XG5cdH1cblx0aWYgKGZpbGVOYW1lLnNwbGl0KFwiL1wiKS5pbmRleE9mKFwiLi5cIikgIT09IC0xKSB7XG5cdFx0cmV0dXJuIFwiaW52YWxpZCByZWxhdGl2ZSBwYXRoOiBcIiArIGZpbGVOYW1lO1xuXHR9XG5cdC8vIGFsbCBnb29kXG5cdHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiByZWFkQW5kQXNzZXJ0Tm9Fb2YocmVhZGVyLCBidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgY2FsbGJhY2spIHtcblx0aWYgKGxlbmd0aCA9PT0gMCkge1xuXHRcdC8vIGZzLnJlYWQgd2lsbCB0aHJvdyBhbiBvdXQtb2YtYm91bmRzIGVycm9yIGlmIHlvdSB0cnkgdG8gcmVhZCAwIGJ5dGVzIGZyb20gYSAwIGJ5dGUgZmlsZVxuXHRcdHJldHVybiBzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuXHRcdFx0Y2FsbGJhY2sobnVsbCwgbmV3QnVmZmVyKDApKTtcblx0XHR9KTtcblx0fVxuXHRyZWFkZXIucmVhZChidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgZnVuY3Rpb24gKGVyciwgYnl0ZXNSZWFkKSB7XG5cdFx0aWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0aWYgKGJ5dGVzUmVhZCA8IGxlbmd0aCkge1xuXHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcInVuZXhwZWN0ZWQgRU9GXCIpKTtcblx0XHR9XG5cdFx0Y2FsbGJhY2soKTtcblx0fSk7XG59XG5cbnV0aWwuaW5oZXJpdHMoQXNzZXJ0Qnl0ZUNvdW50U3RyZWFtLCBUcmFuc2Zvcm0pO1xuXG5mdW5jdGlvbiBBc3NlcnRCeXRlQ291bnRTdHJlYW0oYnl0ZUNvdW50KSB7XG5cdFRyYW5zZm9ybS5jYWxsKHRoaXMpO1xuXHR0aGlzLmFjdHVhbEJ5dGVDb3VudCA9IDA7XG5cdHRoaXMuZXhwZWN0ZWRCeXRlQ291bnQgPSBieXRlQ291bnQ7XG59XG5cbkFzc2VydEJ5dGVDb3VudFN0cmVhbS5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uIChjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG5cdHRoaXMuYWN0dWFsQnl0ZUNvdW50ICs9IGNodW5rLmxlbmd0aDtcblx0aWYgKHRoaXMuYWN0dWFsQnl0ZUNvdW50ID4gdGhpcy5leHBlY3RlZEJ5dGVDb3VudCkge1xuXHRcdHZhciBtc2cgPSBcInRvbyBtYW55IGJ5dGVzIGluIHRoZSBzdHJlYW0uIGV4cGVjdGVkIFwiICsgdGhpcy5leHBlY3RlZEJ5dGVDb3VudCArIFwiLiBnb3QgYXQgbGVhc3QgXCIgKyB0aGlzLmFjdHVhbEJ5dGVDb3VudDtcblx0XHRyZXR1cm4gY2IobmV3IEVycm9yKG1zZykpO1xuXHR9XG5cdGNiKG51bGwsIGNodW5rKTtcbn07XG5Bc3NlcnRCeXRlQ291bnRTdHJlYW0ucHJvdG90eXBlLl9mbHVzaCA9IGZ1bmN0aW9uIChjYikge1xuXHRpZiAodGhpcy5hY3R1YWxCeXRlQ291bnQgPCB0aGlzLmV4cGVjdGVkQnl0ZUNvdW50KSB7XG5cdFx0dmFyIG1zZyA9IFwibm90IGVub3VnaCBieXRlcyBpbiB0aGUgc3RyZWFtLiBleHBlY3RlZCBcIiArIHRoaXMuZXhwZWN0ZWRCeXRlQ291bnQgKyBcIi4gZ290IG9ubHkgXCIgKyB0aGlzLmFjdHVhbEJ5dGVDb3VudDtcblx0XHRyZXR1cm4gY2IobmV3IEVycm9yKG1zZykpO1xuXHR9XG5cdGNiKCk7XG59O1xuXG51dGlsLmluaGVyaXRzKFJhbmRvbUFjY2Vzc1JlYWRlciwgRXZlbnRFbWl0dGVyKTtcblxuZnVuY3Rpb24gUmFuZG9tQWNjZXNzUmVhZGVyKCkge1xuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblx0dGhpcy5yZWZDb3VudCA9IDA7XG59XG5cblJhbmRvbUFjY2Vzc1JlYWRlci5wcm90b3R5cGUucmVmID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLnJlZkNvdW50ICs9IDE7XG59O1xuUmFuZG9tQWNjZXNzUmVhZGVyLnByb3RvdHlwZS51bnJlZiA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRzZWxmLnJlZkNvdW50IC09IDE7XG5cblx0aWYgKHNlbGYucmVmQ291bnQgPiAwKSByZXR1cm47XG5cdGlmIChzZWxmLnJlZkNvdW50IDwgMCkgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCB1bnJlZlwiKTtcblxuXHRzZWxmLmNsb3NlKG9uQ2xvc2VEb25lKTtcblxuXHRmdW5jdGlvbiBvbkNsb3NlRG9uZShlcnIpIHtcblx0XHRpZiAoZXJyKSByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG5cdFx0c2VsZi5lbWl0KCdjbG9zZScpO1xuXHR9XG59O1xuUmFuZG9tQWNjZXNzUmVhZGVyLnByb3RvdHlwZS5jcmVhdGVSZWFkU3RyZWFtID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0dmFyIHN0YXJ0ID0gb3B0aW9ucy5zdGFydDtcblx0dmFyIGVuZCA9IG9wdGlvbnMuZW5kO1xuXHRpZiAoc3RhcnQgPT09IGVuZCkge1xuXHRcdHZhciBlbXB0eVN0cmVhbSA9IG5ldyBQYXNzVGhyb3VnaCgpO1xuXHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRlbXB0eVN0cmVhbS5lbmQoKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gZW1wdHlTdHJlYW07XG5cdH1cblx0dmFyIHN0cmVhbSA9IHRoaXMuX3JlYWRTdHJlYW1Gb3JSYW5nZShzdGFydCwgZW5kKTtcblxuXHR2YXIgZGVzdHJveWVkID0gZmFsc2U7XG5cdHZhciByZWZVbnJlZkZpbHRlciA9IG5ldyBSZWZVbnJlZkZpbHRlcih0aGlzKTtcblx0c3RyZWFtLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycikge1xuXHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoIWRlc3Ryb3llZCkgcmVmVW5yZWZGaWx0ZXIuZW1pdChcImVycm9yXCIsIGVycik7XG5cdFx0fSk7XG5cdH0pO1xuXHRyZWZVbnJlZkZpbHRlci5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuXHRcdHN0cmVhbS51bnBpcGUocmVmVW5yZWZGaWx0ZXIpO1xuXHRcdHJlZlVucmVmRmlsdGVyLnVucmVmKCk7XG5cdFx0c3RyZWFtLmRlc3Ryb3koKTtcblx0fTtcblxuXHR2YXIgYnl0ZUNvdW50ZXIgPSBuZXcgQXNzZXJ0Qnl0ZUNvdW50U3RyZWFtKGVuZCAtIHN0YXJ0KTtcblx0cmVmVW5yZWZGaWx0ZXIub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0c2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICghZGVzdHJveWVkKSBieXRlQ291bnRlci5lbWl0KFwiZXJyb3JcIiwgZXJyKTtcblx0XHR9KTtcblx0fSk7XG5cdGJ5dGVDb3VudGVyLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG5cdFx0ZGVzdHJveWVkID0gdHJ1ZTtcblx0XHRyZWZVbnJlZkZpbHRlci51bnBpcGUoYnl0ZUNvdW50ZXIpO1xuXHRcdHJlZlVucmVmRmlsdGVyLmRlc3Ryb3koKTtcblx0fTtcblxuXHRyZXR1cm4gc3RyZWFtLnBpcGUocmVmVW5yZWZGaWx0ZXIpLnBpcGUoYnl0ZUNvdW50ZXIpO1xufTtcblJhbmRvbUFjY2Vzc1JlYWRlci5wcm90b3R5cGUuX3JlYWRTdHJlYW1Gb3JSYW5nZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG5cdHRocm93IG5ldyBFcnJvcihcIm5vdCBpbXBsZW1lbnRlZFwiKTtcbn07XG5SYW5kb21BY2Nlc3NSZWFkZXIucHJvdG90eXBlLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGNhbGxiYWNrKSB7XG5cdHZhciByZWFkU3RyZWFtID0gdGhpcy5jcmVhdGVSZWFkU3RyZWFtKHtzdGFydDogcG9zaXRpb24sIGVuZDogcG9zaXRpb24gKyBsZW5ndGh9KTtcblx0dmFyIHdyaXRlU3RyZWFtID0gbmV3IFdyaXRhYmxlKCk7XG5cdHZhciB3cml0dGVuID0gMDtcblx0d3JpdGVTdHJlYW0uX3dyaXRlID0gZnVuY3Rpb24gKGNodW5rLCBlbmNvZGluZywgY2IpIHtcblx0XHRjaHVuay5jb3B5KGJ1ZmZlciwgb2Zmc2V0ICsgd3JpdHRlbiwgMCwgY2h1bmsubGVuZ3RoKTtcblx0XHR3cml0dGVuICs9IGNodW5rLmxlbmd0aDtcblx0XHRjYigpO1xuXHR9O1xuXHR3cml0ZVN0cmVhbS5vbihcImZpbmlzaFwiLCBjYWxsYmFjayk7XG5cdHJlYWRTdHJlYW0ub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXJyb3IpIHtcblx0XHRjYWxsYmFjayhlcnJvcik7XG5cdH0pO1xuXHRyZWFkU3RyZWFtLnBpcGUod3JpdGVTdHJlYW0pO1xufTtcblJhbmRvbUFjY2Vzc1JlYWRlci5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblx0c2V0SW1tZWRpYXRlKGNhbGxiYWNrKTtcbn07XG5cbnV0aWwuaW5oZXJpdHMoUmVmVW5yZWZGaWx0ZXIsIFBhc3NUaHJvdWdoKTtcblxuZnVuY3Rpb24gUmVmVW5yZWZGaWx0ZXIoY29udGV4dCkge1xuXHRQYXNzVGhyb3VnaC5jYWxsKHRoaXMpO1xuXHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuXHR0aGlzLmNvbnRleHQucmVmKCk7XG5cdHRoaXMudW5yZWZmZWRZZXQgPSBmYWxzZTtcbn1cblxuUmVmVW5yZWZGaWx0ZXIucHJvdG90eXBlLl9mbHVzaCA9IGZ1bmN0aW9uIChjYikge1xuXHR0aGlzLnVucmVmKCk7XG5cdGNiKCk7XG59O1xuUmVmVW5yZWZGaWx0ZXIucHJvdG90eXBlLnVucmVmID0gZnVuY3Rpb24gKGNiKSB7XG5cdGlmICh0aGlzLnVucmVmZmVkWWV0KSByZXR1cm47XG5cdHRoaXMudW5yZWZmZWRZZXQgPSB0cnVlO1xuXHR0aGlzLmNvbnRleHQudW5yZWYoKTtcbn07XG5cbnZhciBjcDQzNyA9ICdcXHUwMDAw4pi64pi74pml4pmm4pmj4pmg4oCi4peY4peL4peZ4pmC4pmA4pmq4pmr4pi84pa64peE4oaV4oC8wrbCp+KWrOKGqOKGkeKGk+KGkuKGkOKIn+KGlOKWsuKWvCAhXCIjJCUmXFwnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xcXFxdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+4oyCw4fDvMOpw6LDpMOgw6XDp8Oqw6vDqMOvw67DrMOEw4XDicOmw4bDtMO2w7LDu8O5w7/DlsOcwqLCo8Kl4oKnxpLDocOtw7PDusOxw5HCqsK6wr/ijJDCrMK9wrzCocKrwrvilpHilpLilpPilILilKTilaHilaLilZbilZXilaPilZHilZfilZ3ilZzilZvilJDilJTilLTilKzilJzilIDilLzilZ7ilZ/ilZrilZTilanilabilaDilZDilazilafilajilaTilaXilZnilZjilZLilZPilavilarilJjilIzilojiloTilozilpDiloDOscOfzpPPgM6jz4PCtc+EzqbOmM6pzrTiiJ7Phs614oip4omhwrHiiaXiiaTijKDijKHDt+KJiMKw4oiZwrfiiJrigb/CsuKWoMKgJztcblxuZnVuY3Rpb24gZGVjb2RlQnVmZmVyKGJ1ZmZlciwgc3RhcnQsIGVuZCwgaXNVdGY4KSB7XG5cdGlmIChpc1V0ZjgpIHtcblx0XHRyZXR1cm4gYnVmZmVyLnRvU3RyaW5nKFwidXRmOFwiLCBzdGFydCwgZW5kKTtcblx0fSBlbHNlIHtcblx0XHR2YXIgcmVzdWx0ID0gXCJcIjtcblx0XHRmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuXHRcdFx0cmVzdWx0ICs9IGNwNDM3W2J1ZmZlcltpXV07XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cbn1cblxuZnVuY3Rpb24gcmVhZFVJbnQ2NExFKGJ1ZmZlciwgb2Zmc2V0KSB7XG5cdC8vIHRoZXJlIGlzIG5vIG5hdGl2ZSBmdW5jdGlvbiBmb3IgdGhpcywgYmVjYXVzZSB3ZSBjYW4ndCBhY3R1YWxseSBzdG9yZSA2NC1iaXQgaW50ZWdlcnMgcHJlY2lzZWx5LlxuXHQvLyBhZnRlciA1MyBiaXRzLCBKYXZhU2NyaXB0J3MgTnVtYmVyIHR5cGUgKElFRUUgNzU0IGRvdWJsZSkgY2FuJ3Qgc3RvcmUgaW5kaXZpZHVhbCBpbnRlZ2VycyBhbnltb3JlLlxuXHQvLyBidXQgc2luY2UgNTMgYml0cyBpcyBhIHdob2xlIGxvdCBtb3JlIHRoYW4gMzIgYml0cywgd2UgZG8gb3VyIGJlc3QgYW55d2F5LlxuXHR2YXIgbG93ZXIzMiA9IGJ1ZmZlci5yZWFkVUludDMyTEUob2Zmc2V0KTtcblx0dmFyIHVwcGVyMzIgPSBidWZmZXIucmVhZFVJbnQzMkxFKG9mZnNldCArIDQpO1xuXHQvLyB3ZSBjYW4ndCB1c2UgYml0c2hpZnRpbmcgaGVyZSwgYmVjYXVzZSBKYXZhU2NyaXB0IGJpdHNoaWZ0aW5nIG9ubHkgd29ya3Mgb24gMzItYml0IGludGVnZXJzLlxuXHRyZXR1cm4gdXBwZXIzMiAqIDB4MTAwMDAwMDAwICsgbG93ZXIzMjtcblx0Ly8gYXMgbG9uZyBhcyB3ZSdyZSBib3VuZHMgY2hlY2tpbmcgdGhlIHJlc3VsdCBvZiB0aGlzIGZ1bmN0aW9uIGFnYWluc3QgdGhlIHRvdGFsIGZpbGUgc2l6ZSxcblx0Ly8gd2UnbGwgY2F0Y2ggYW55IG92ZXJmbG93IGVycm9ycywgYmVjYXVzZSB3ZSBhbHJlYWR5IG1hZGUgc3VyZSB0aGUgdG90YWwgZmlsZSBzaXplIHdhcyB3aXRoaW4gcmVhc29uLlxufVxuXG4vLyBOb2RlIDEwIGRlcHJlY2F0ZWQgbmV3IEJ1ZmZlcigpLlxudmFyIG5ld0J1ZmZlcjtcbmlmICh0eXBlb2YgQnVmZmVyLmFsbG9jVW5zYWZlID09PSBcImZ1bmN0aW9uXCIpIHtcblx0bmV3QnVmZmVyID0gZnVuY3Rpb24gKGxlbikge1xuXHRcdHJldHVybiBCdWZmZXIuYWxsb2NVbnNhZmUobGVuKTtcblx0fTtcbn0gZWxzZSB7XG5cdG5ld0J1ZmZlciA9IGZ1bmN0aW9uIChsZW4pIHtcblx0XHRyZXR1cm4gbmV3IEJ1ZmZlcihsZW4pO1xuXHR9O1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0Q2FsbGJhY2soZXJyKSB7XG5cdGlmIChlcnIpIHRocm93IGVycjtcbn1cbiIsInZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKFwic3RyZWFtXCIpLlRyYW5zZm9ybTtcbnZhciBQYXNzVGhyb3VnaCA9IHJlcXVpcmUoXCJzdHJlYW1cIikuUGFzc1Rocm91Z2g7XG52YXIgemxpYiA9IHJlcXVpcmUoXCJ6bGliXCIpO1xudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcbnZhciBjcmMzMiA9IHJlcXVpcmUoXCJidWZmZXItY3JjMzJcIik7XG5cbmV4cG9ydHMuWmlwRmlsZSA9IFppcEZpbGU7XG5leHBvcnRzLmRhdGVUb0Rvc0RhdGVUaW1lID0gZGF0ZVRvRG9zRGF0ZVRpbWU7XG5cbnV0aWwuaW5oZXJpdHMoWmlwRmlsZSwgRXZlbnRFbWl0dGVyKTtcblxuZnVuY3Rpb24gWmlwRmlsZSgpIHtcblx0dGhpcy5vdXRwdXRTdHJlYW0gPSBuZXcgUGFzc1Rocm91Z2goKTtcblx0dGhpcy5lbnRyaWVzID0gW107XG5cdHRoaXMub3V0cHV0U3RyZWFtQ3Vyc29yID0gMDtcblx0dGhpcy5lbmRlZCA9IGZhbHNlOyAvLyAuZW5kKCkgc2V0cyB0aGlzXG5cdHRoaXMuYWxsRG9uZSA9IGZhbHNlOyAvLyBzZXQgd2hlbiB3ZSd2ZSB3cml0dGVuIHRoZSBsYXN0IGJ5dGVzXG5cdHRoaXMuZm9yY2VaaXA2NEVvY2QgPSBmYWxzZTsgLy8gY29uZmlndXJhYmxlIGluIC5lbmQoKVxufVxuXG5aaXBGaWxlLnByb3RvdHlwZS5hZGRGaWxlID0gZnVuY3Rpb24gKHJlYWxQYXRoLCBtZXRhZGF0YVBhdGgsIG9wdGlvbnMpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRtZXRhZGF0YVBhdGggPSB2YWxpZGF0ZU1ldGFkYXRhUGF0aChtZXRhZGF0YVBhdGgsIGZhbHNlKTtcblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXG5cdHZhciBlbnRyeSA9IG5ldyBFbnRyeShtZXRhZGF0YVBhdGgsIGZhbHNlLCBvcHRpb25zKTtcblx0c2VsZi5lbnRyaWVzLnB1c2goZW50cnkpO1xuXHRmcy5zdGF0KHJlYWxQYXRoLCBmdW5jdGlvbiAoZXJyLCBzdGF0cykge1xuXHRcdGlmIChlcnIpIHJldHVybiBzZWxmLmVtaXQoXCJlcnJvclwiLCBlcnIpO1xuXHRcdGlmICghc3RhdHMuaXNGaWxlKCkpIHJldHVybiBzZWxmLmVtaXQoXCJlcnJvclwiLCBuZXcgRXJyb3IoXCJub3QgYSBmaWxlOiBcIiArIHJlYWxQYXRoKSk7XG5cdFx0ZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9IHN0YXRzLnNpemU7XG5cdFx0aWYgKG9wdGlvbnMubXRpbWUgPT0gbnVsbCkgZW50cnkuc2V0TGFzdE1vZERhdGUoc3RhdHMubXRpbWUpO1xuXHRcdGlmIChvcHRpb25zLm1vZGUgPT0gbnVsbCkgZW50cnkuc2V0RmlsZUF0dHJpYnV0ZXNNb2RlKHN0YXRzLm1vZGUpO1xuXHRcdGVudHJ5LnNldEZpbGVEYXRhUHVtcEZ1bmN0aW9uKGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciByZWFkU3RyZWFtID0gZnMuY3JlYXRlUmVhZFN0cmVhbShyZWFsUGF0aCk7XG5cdFx0XHRlbnRyeS5zdGF0ZSA9IEVudHJ5LkZJTEVfREFUQV9JTl9QUk9HUkVTUztcblx0XHRcdHJlYWRTdHJlYW0ub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRcdHNlbGYuZW1pdChcImVycm9yXCIsIGVycik7XG5cdFx0XHR9KTtcblx0XHRcdHB1bXBGaWxlRGF0YVJlYWRTdHJlYW0oc2VsZiwgZW50cnksIHJlYWRTdHJlYW0pO1xuXHRcdH0pO1xuXHRcdHB1bXBFbnRyaWVzKHNlbGYpO1xuXHR9KTtcbn07XG5cblppcEZpbGUucHJvdG90eXBlLmFkZFJlYWRTdHJlYW0gPSBmdW5jdGlvbiAocmVhZFN0cmVhbSwgbWV0YWRhdGFQYXRoLCBvcHRpb25zKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0bWV0YWRhdGFQYXRoID0gdmFsaWRhdGVNZXRhZGF0YVBhdGgobWV0YWRhdGFQYXRoLCBmYWxzZSk7XG5cdGlmIChvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblx0dmFyIGVudHJ5ID0gbmV3IEVudHJ5KG1ldGFkYXRhUGF0aCwgZmFsc2UsIG9wdGlvbnMpO1xuXHRzZWxmLmVudHJpZXMucHVzaChlbnRyeSk7XG5cdGVudHJ5LnNldEZpbGVEYXRhUHVtcEZ1bmN0aW9uKGZ1bmN0aW9uICgpIHtcblx0XHRlbnRyeS5zdGF0ZSA9IEVudHJ5LkZJTEVfREFUQV9JTl9QUk9HUkVTUztcblx0XHRwdW1wRmlsZURhdGFSZWFkU3RyZWFtKHNlbGYsIGVudHJ5LCByZWFkU3RyZWFtKTtcblx0fSk7XG5cdHB1bXBFbnRyaWVzKHNlbGYpO1xufTtcblxuWmlwRmlsZS5wcm90b3R5cGUuYWRkQnVmZmVyID0gZnVuY3Rpb24gKGJ1ZmZlciwgbWV0YWRhdGFQYXRoLCBvcHRpb25zKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0bWV0YWRhdGFQYXRoID0gdmFsaWRhdGVNZXRhZGF0YVBhdGgobWV0YWRhdGFQYXRoLCBmYWxzZSk7XG5cdGlmIChidWZmZXIubGVuZ3RoID4gMHgzZmZmZmZmZikgdGhyb3cgbmV3IEVycm9yKFwiYnVmZmVyIHRvbyBsYXJnZTogXCIgKyBidWZmZXIubGVuZ3RoICsgXCIgPiBcIiArIDB4M2ZmZmZmZmYpO1xuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdGlmIChvcHRpb25zLnNpemUgIT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5zaXplIG5vdCBhbGxvd2VkXCIpO1xuXHR2YXIgZW50cnkgPSBuZXcgRW50cnkobWV0YWRhdGFQYXRoLCBmYWxzZSwgb3B0aW9ucyk7XG5cdGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPSBidWZmZXIubGVuZ3RoO1xuXHRlbnRyeS5jcmMzMiA9IGNyYzMyLnVuc2lnbmVkKGJ1ZmZlcik7XG5cdGVudHJ5LmNyY0FuZEZpbGVTaXplS25vd24gPSB0cnVlO1xuXHRzZWxmLmVudHJpZXMucHVzaChlbnRyeSk7XG5cdGlmICghZW50cnkuY29tcHJlc3MpIHtcblx0XHRzZXRDb21wcmVzc2VkQnVmZmVyKGJ1ZmZlcik7XG5cdH0gZWxzZSB7XG5cdFx0emxpYi5kZWZsYXRlUmF3KGJ1ZmZlciwgZnVuY3Rpb24gKGVyciwgY29tcHJlc3NlZEJ1ZmZlcikge1xuXHRcdFx0c2V0Q29tcHJlc3NlZEJ1ZmZlcihjb21wcmVzc2VkQnVmZmVyKTtcblx0XHRcdFxuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2V0Q29tcHJlc3NlZEJ1ZmZlcihjb21wcmVzc2VkQnVmZmVyKSB7XG5cdFx0ZW50cnkuY29tcHJlc3NlZFNpemUgPSBjb21wcmVzc2VkQnVmZmVyLmxlbmd0aDtcblx0XHRlbnRyeS5zZXRGaWxlRGF0YVB1bXBGdW5jdGlvbihmdW5jdGlvbiAoKSB7XG5cdFx0XHR3cml0ZVRvT3V0cHV0U3RyZWFtKHNlbGYsIGNvbXByZXNzZWRCdWZmZXIpO1xuXHRcdFx0d3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBlbnRyeS5nZXREYXRhRGVzY3JpcHRvcigpKTtcblx0XHRcdGVudHJ5LnN0YXRlID0gRW50cnkuRklMRV9EQVRBX0RPTkU7XG5cblx0XHRcdC8vIGRvbid0IGNhbGwgcHVtcEVudHJpZXMoKSByZWN1cnNpdmVseS5cblx0XHRcdC8vIChhbHNvLCBkb24ndCBjYWxsIHByb2Nlc3MubmV4dFRpY2sgcmVjdXJzaXZlbHkuKVxuXHRcdFx0c2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cHVtcEVudHJpZXMoc2VsZik7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRwdW1wRW50cmllcyhzZWxmKTtcblx0fVxufTtcblxuXG5aaXBGaWxlLnByb3RvdHlwZS5hZGRFbXB0eURpcmVjdG9yeSA9IGZ1bmN0aW9uIChtZXRhZGF0YVBhdGgsIG9wdGlvbnMpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRtZXRhZGF0YVBhdGggPSB2YWxpZGF0ZU1ldGFkYXRhUGF0aChtZXRhZGF0YVBhdGgsIHRydWUpO1xuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdGlmIChvcHRpb25zLnNpemUgIT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5zaXplIG5vdCBhbGxvd2VkXCIpO1xuXHRpZiAob3B0aW9ucy5jb21wcmVzcyAhPSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLmNvbXByZXNzIG5vdCBhbGxvd2VkXCIpO1xuXHR2YXIgZW50cnkgPSBuZXcgRW50cnkobWV0YWRhdGFQYXRoLCB0cnVlLCBvcHRpb25zKTtcblx0c2VsZi5lbnRyaWVzLnB1c2goZW50cnkpO1xuXHRlbnRyeS5zZXRGaWxlRGF0YVB1bXBGdW5jdGlvbihmdW5jdGlvbiAoKSB7XG5cdFx0d3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBlbnRyeS5nZXREYXRhRGVzY3JpcHRvcigpKTtcblx0XHRlbnRyeS5zdGF0ZSA9IEVudHJ5LkZJTEVfREFUQV9ET05FO1xuXHRcdHB1bXBFbnRyaWVzKHNlbGYpO1xuXHR9KTtcblx0cHVtcEVudHJpZXMoc2VsZik7XG59O1xuXG5aaXBGaWxlLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAob3B0aW9ucywgZmluYWxTaXplQ2FsbGJhY2spIHtcblx0aWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRmaW5hbFNpemVDYWxsYmFjayA9IG9wdGlvbnM7XG5cdFx0b3B0aW9ucyA9IG51bGw7XG5cdH1cblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXHRpZiAodGhpcy5lbmRlZCkgcmV0dXJuO1xuXHR0aGlzLmVuZGVkID0gdHJ1ZTtcblx0dGhpcy5maW5hbFNpemVDYWxsYmFjayA9IGZpbmFsU2l6ZUNhbGxiYWNrO1xuXHR0aGlzLmZvcmNlWmlwNjRFb2NkID0gISFvcHRpb25zLmZvcmNlWmlwNjRGb3JtYXQ7XG5cdHB1bXBFbnRyaWVzKHRoaXMpO1xufTtcblxuZnVuY3Rpb24gd3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBidWZmZXIpIHtcblx0c2VsZi5vdXRwdXRTdHJlYW0ud3JpdGUoYnVmZmVyKTtcblx0c2VsZi5vdXRwdXRTdHJlYW1DdXJzb3IgKz0gYnVmZmVyLmxlbmd0aDtcbn1cblxuZnVuY3Rpb24gcHVtcEZpbGVEYXRhUmVhZFN0cmVhbShzZWxmLCBlbnRyeSwgcmVhZFN0cmVhbSkge1xuXHR2YXIgY3JjMzJXYXRjaGVyID0gbmV3IENyYzMyV2F0Y2hlcigpO1xuXHR2YXIgdW5jb21wcmVzc2VkU2l6ZUNvdW50ZXIgPSBuZXcgQnl0ZUNvdW50ZXIoKTtcblx0dmFyIGNvbXByZXNzb3IgPSBlbnRyeS5jb21wcmVzcyA/IG5ldyB6bGliLkRlZmxhdGVSYXcoKSA6IG5ldyBQYXNzVGhyb3VnaCgpO1xuXHR2YXIgY29tcHJlc3NlZFNpemVDb3VudGVyID0gbmV3IEJ5dGVDb3VudGVyKCk7XG5cdHJlYWRTdHJlYW0ucGlwZShjcmMzMldhdGNoZXIpXG5cdFx0LnBpcGUodW5jb21wcmVzc2VkU2l6ZUNvdW50ZXIpXG5cdFx0LnBpcGUoY29tcHJlc3Nvcilcblx0XHQucGlwZShjb21wcmVzc2VkU2l6ZUNvdW50ZXIpXG5cdFx0LnBpcGUoc2VsZi5vdXRwdXRTdHJlYW0sIHtlbmQ6IGZhbHNlfSk7XG5cdGNvbXByZXNzZWRTaXplQ291bnRlci5vbihcImVuZFwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0ZW50cnkuY3JjMzIgPSBjcmMzMldhdGNoZXIuY3JjMzI7XG5cdFx0aWYgKGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPT0gbnVsbCkge1xuXHRcdFx0ZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9IHVuY29tcHJlc3NlZFNpemVDb3VudGVyLmJ5dGVDb3VudDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKGVudHJ5LnVuY29tcHJlc3NlZFNpemUgIT09IHVuY29tcHJlc3NlZFNpemVDb3VudGVyLmJ5dGVDb3VudCkgcmV0dXJuIHNlbGYuZW1pdChcImVycm9yXCIsIG5ldyBFcnJvcihcImZpbGUgZGF0YSBzdHJlYW0gaGFzIHVuZXhwZWN0ZWQgbnVtYmVyIG9mIGJ5dGVzXCIpKTtcblx0XHR9XG5cdFx0ZW50cnkuY29tcHJlc3NlZFNpemUgPSBjb21wcmVzc2VkU2l6ZUNvdW50ZXIuYnl0ZUNvdW50O1xuXHRcdHNlbGYub3V0cHV0U3RyZWFtQ3Vyc29yICs9IGVudHJ5LmNvbXByZXNzZWRTaXplO1xuXHRcdHdyaXRlVG9PdXRwdXRTdHJlYW0oc2VsZiwgZW50cnkuZ2V0RGF0YURlc2NyaXB0b3IoKSk7XG5cdFx0ZW50cnkuc3RhdGUgPSBFbnRyeS5GSUxFX0RBVEFfRE9ORTtcblx0XHRwdW1wRW50cmllcyhzZWxmKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHB1bXBFbnRyaWVzKHNlbGYpIHtcblx0aWYgKHNlbGYuYWxsRG9uZSkgcmV0dXJuO1xuXHQvLyBmaXJzdCBjaGVjayBpZiBmaW5hbFNpemUgaXMgZmluYWxseSBrbm93blxuXHRpZiAoc2VsZi5lbmRlZCAmJiBzZWxmLmZpbmFsU2l6ZUNhbGxiYWNrICE9IG51bGwpIHtcblx0XHR2YXIgZmluYWxTaXplID0gY2FsY3VsYXRlRmluYWxTaXplKHNlbGYpO1xuXHRcdGlmIChmaW5hbFNpemUgIT0gbnVsbCkge1xuXHRcdFx0Ly8gd2UgaGF2ZSBhbiBhbnN3ZXJcblx0XHRcdHNlbGYuZmluYWxTaXplQ2FsbGJhY2soZmluYWxTaXplKTtcblx0XHRcdHNlbGYuZmluYWxTaXplQ2FsbGJhY2sgPSBudWxsO1xuXHRcdH1cblx0fVxuXG5cdC8vIHB1bXAgZW50cmllc1xuXHR2YXIgZW50cnkgPSBnZXRGaXJzdE5vdERvbmVFbnRyeSgpO1xuXG5cdGZ1bmN0aW9uIGdldEZpcnN0Tm90RG9uZUVudHJ5KCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5lbnRyaWVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgZW50cnkgPSBzZWxmLmVudHJpZXNbaV07XG5cdFx0XHRpZiAoZW50cnkuc3RhdGUgPCBFbnRyeS5GSUxFX0RBVEFfRE9ORSkgcmV0dXJuIGVudHJ5O1xuXHRcdH1cblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXG5cdGlmIChlbnRyeSAhPSBudWxsKSB7XG5cdFx0Ly8gdGhpcyBlbnRyeSBpcyBub3QgZG9uZSB5ZXRcblx0XHRpZiAoZW50cnkuc3RhdGUgPCBFbnRyeS5SRUFEWV9UT19QVU1QX0ZJTEVfREFUQSkgcmV0dXJuOyAvLyBpbnB1dCBmaWxlIG5vdCBvcGVuIHlldFxuXHRcdGlmIChlbnRyeS5zdGF0ZSA9PT0gRW50cnkuRklMRV9EQVRBX0lOX1BST0dSRVNTKSByZXR1cm47IC8vIHdlJ2xsIGdldCB0aGVyZVxuXHRcdC8vIHN0YXJ0IHdpdGggbG9jYWwgZmlsZSBoZWFkZXJcblx0XHRlbnRyeS5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgPSBzZWxmLm91dHB1dFN0cmVhbUN1cnNvcjtcblx0XHR2YXIgbG9jYWxGaWxlSGVhZGVyID0gZW50cnkuZ2V0TG9jYWxGaWxlSGVhZGVyKCk7XG5cdFx0d3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBsb2NhbEZpbGVIZWFkZXIpO1xuXHRcdGVudHJ5LmRvRmlsZURhdGFQdW1wKCk7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gYWxsIGNvdWdodCB1cCBvbiB3cml0aW5nIGVudHJpZXNcblx0XHRpZiAoc2VsZi5lbmRlZCkge1xuXHRcdFx0Ly8gaGVhZCBmb3IgdGhlIGV4aXRcblx0XHRcdHNlbGYub2Zmc2V0T2ZTdGFydE9mQ2VudHJhbERpcmVjdG9yeSA9IHNlbGYub3V0cHV0U3RyZWFtQ3Vyc29yO1xuXHRcdFx0c2VsZi5lbnRyaWVzLmZvckVhY2goZnVuY3Rpb24gKGVudHJ5KSB7XG5cdFx0XHRcdHZhciBjZW50cmFsRGlyZWN0b3J5UmVjb3JkID0gZW50cnkuZ2V0Q2VudHJhbERpcmVjdG9yeVJlY29yZCgpO1xuXHRcdFx0XHR3cml0ZVRvT3V0cHV0U3RyZWFtKHNlbGYsIGNlbnRyYWxEaXJlY3RvcnlSZWNvcmQpO1xuXHRcdFx0fSk7XG5cdFx0XHR3cml0ZVRvT3V0cHV0U3RyZWFtKHNlbGYsIGdldEVuZE9mQ2VudHJhbERpcmVjdG9yeVJlY29yZChzZWxmKSk7XG5cdFx0XHRzZWxmLm91dHB1dFN0cmVhbS5lbmQoKTtcblx0XHRcdHNlbGYuYWxsRG9uZSA9IHRydWU7XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZUZpbmFsU2l6ZShzZWxmKSB7XG5cdHZhciBwcmV0ZW5kT3V0cHV0Q3Vyc29yID0gMDtcblx0dmFyIGNlbnRyYWxEaXJlY3RvcnlTaXplID0gMDtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLmVudHJpZXMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgZW50cnkgPSBzZWxmLmVudHJpZXNbaV07XG5cdFx0Ly8gY29tcHJlc3Npb24gaXMgdG9vIGhhcmQgdG8gcHJlZGljdFxuXHRcdGlmIChlbnRyeS5jb21wcmVzcykgcmV0dXJuIC0xO1xuXHRcdGlmIChlbnRyeS5zdGF0ZSA+PSBFbnRyeS5SRUFEWV9UT19QVU1QX0ZJTEVfREFUQSkge1xuXHRcdFx0Ly8gaWYgYWRkUmVhZFN0cmVhbSB3YXMgY2FsbGVkIHdpdGhvdXQgcHJvdmlkaW5nIHRoZSBzaXplLCB3ZSBjYW4ndCBwcmVkaWN0IHRoZSBmaW5hbCBzaXplXG5cdFx0XHRpZiAoZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9PSBudWxsKSByZXR1cm4gLTE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIGlmIHdlJ3JlIHN0aWxsIHdhaXRpbmcgZm9yIGZzLnN0YXQsIHdlIG1pZ2h0IGxlYXJuIHRoZSBzaXplIHNvbWVkYXlcblx0XHRcdGlmIChlbnRyeS51bmNvbXByZXNzZWRTaXplID09IG51bGwpIHJldHVybiBudWxsO1xuXHRcdH1cblx0XHQvLyB3ZSBrbm93IHRoaXMgZm9yIHN1cmUsIGFuZCB0aGlzIGlzIGltcG9ydGFudCB0byBrbm93IGlmIHdlIG5lZWQgWklQNjQgZm9ybWF0LlxuXHRcdGVudHJ5LnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9IHByZXRlbmRPdXRwdXRDdXJzb3I7XG5cdFx0dmFyIHVzZVppcDY0Rm9ybWF0ID0gZW50cnkudXNlWmlwNjRGb3JtYXQoKTtcblxuXHRcdHByZXRlbmRPdXRwdXRDdXJzb3IgKz0gTE9DQUxfRklMRV9IRUFERVJfRklYRURfU0laRSArIGVudHJ5LnV0ZjhGaWxlTmFtZS5sZW5ndGg7XG5cdFx0cHJldGVuZE91dHB1dEN1cnNvciArPSBlbnRyeS51bmNvbXByZXNzZWRTaXplO1xuXHRcdGlmICghZW50cnkuY3JjQW5kRmlsZVNpemVLbm93bikge1xuXHRcdFx0Ly8gdXNlIGEgZGF0YSBkZXNjcmlwdG9yXG5cdFx0XHRpZiAodXNlWmlwNjRGb3JtYXQpIHtcblx0XHRcdFx0cHJldGVuZE91dHB1dEN1cnNvciArPSBaSVA2NF9EQVRBX0RFU0NSSVBUT1JfU0laRTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHByZXRlbmRPdXRwdXRDdXJzb3IgKz0gREFUQV9ERVNDUklQVE9SX1NJWkU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y2VudHJhbERpcmVjdG9yeVNpemUgKz0gQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX0ZJWEVEX1NJWkUgKyBlbnRyeS51dGY4RmlsZU5hbWUubGVuZ3RoO1xuXHRcdGlmICh1c2VaaXA2NEZvcm1hdCkge1xuXHRcdFx0Y2VudHJhbERpcmVjdG9yeVNpemUgKz0gWklQNjRfRVhURU5ERURfSU5GT1JNQVRJT05fRVhUUkFfRklFTERfU0laRTtcblx0XHR9XG5cdH1cblxuXHR2YXIgZW5kT2ZDZW50cmFsRGlyZWN0b3J5U2l6ZSA9IDA7XG5cdGlmIChzZWxmLmZvcmNlWmlwNjRFb2NkIHx8XG5cdFx0c2VsZi5lbnRyaWVzLmxlbmd0aCA+PSAweGZmZmYgfHxcblx0XHRjZW50cmFsRGlyZWN0b3J5U2l6ZSA+PSAweGZmZmYgfHxcblx0XHRwcmV0ZW5kT3V0cHV0Q3Vyc29yID49IDB4ZmZmZmZmZmYpIHtcblx0XHQvLyB1c2UgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHN0dWZmXG5cdFx0ZW5kT2ZDZW50cmFsRGlyZWN0b3J5U2l6ZSArPSBaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkUgKyBaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfTE9DQVRPUl9TSVpFO1xuXHR9XG5cdGVuZE9mQ2VudHJhbERpcmVjdG9yeVNpemUgKz0gRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFO1xuXHRyZXR1cm4gcHJldGVuZE91dHB1dEN1cnNvciArIGNlbnRyYWxEaXJlY3RvcnlTaXplICsgZW5kT2ZDZW50cmFsRGlyZWN0b3J5U2l6ZTtcbn1cblxudmFyIFpJUDY0X0VORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRSA9IDU2O1xudmFyIFpJUDY0X0VORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9MT0NBVE9SX1NJWkUgPSAyMDtcbnZhciBFTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkUgPSAyMjtcblxuZnVuY3Rpb24gZ2V0RW5kT2ZDZW50cmFsRGlyZWN0b3J5UmVjb3JkKHNlbGYsIGFjdHVhbGx5SnVzdFRlbGxNZUhvd0xvbmdJdFdvdWxkQmUpIHtcblx0dmFyIG5lZWRaaXA2NEZvcm1hdCA9IGZhbHNlO1xuXHR2YXIgbm9ybWFsRW50cmllc0xlbmd0aCA9IHNlbGYuZW50cmllcy5sZW5ndGg7XG5cdGlmIChzZWxmLmZvcmNlWmlwNjRFb2NkIHx8IHNlbGYuZW50cmllcy5sZW5ndGggPj0gMHhmZmZmKSB7XG5cdFx0bm9ybWFsRW50cmllc0xlbmd0aCA9IDB4ZmZmZjtcblx0XHRuZWVkWmlwNjRGb3JtYXQgPSB0cnVlO1xuXHR9XG5cdHZhciBzaXplT2ZDZW50cmFsRGlyZWN0b3J5ID0gc2VsZi5vdXRwdXRTdHJlYW1DdXJzb3IgLSBzZWxmLm9mZnNldE9mU3RhcnRPZkNlbnRyYWxEaXJlY3Rvcnk7XG5cdHZhciBub3JtYWxTaXplT2ZDZW50cmFsRGlyZWN0b3J5ID0gc2l6ZU9mQ2VudHJhbERpcmVjdG9yeTtcblx0aWYgKHNlbGYuZm9yY2VaaXA2NEVvY2QgfHwgc2l6ZU9mQ2VudHJhbERpcmVjdG9yeSA+PSAweGZmZmZmZmZmKSB7XG5cdFx0bm9ybWFsU2l6ZU9mQ2VudHJhbERpcmVjdG9yeSA9IDB4ZmZmZmZmZmY7XG5cdFx0bmVlZFppcDY0Rm9ybWF0ID0gdHJ1ZTtcblx0fVxuXHR2YXIgbm9ybWFsT2Zmc2V0T2ZTdGFydE9mQ2VudHJhbERpcmVjdG9yeSA9IHNlbGYub2Zmc2V0T2ZTdGFydE9mQ2VudHJhbERpcmVjdG9yeTtcblx0aWYgKHNlbGYuZm9yY2VaaXA2NEVvY2QgfHwgc2VsZi5vZmZzZXRPZlN0YXJ0T2ZDZW50cmFsRGlyZWN0b3J5ID49IDB4ZmZmZmZmZmYpIHtcblx0XHRub3JtYWxPZmZzZXRPZlN0YXJ0T2ZDZW50cmFsRGlyZWN0b3J5ID0gMHhmZmZmZmZmZjtcblx0XHRuZWVkWmlwNjRGb3JtYXQgPSB0cnVlO1xuXHR9XG5cdGlmIChhY3R1YWxseUp1c3RUZWxsTWVIb3dMb25nSXRXb3VsZEJlKSB7XG5cdFx0aWYgKG5lZWRaaXA2NEZvcm1hdCkge1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0WklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFICtcblx0XHRcdFx0WklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX0xPQ0FUT1JfU0laRSArXG5cdFx0XHRcdEVORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRVxuXHRcdFx0KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIEVORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRTtcblx0XHR9XG5cdH1cblxuXHR2YXIgZW9jZHJCdWZmZXIgPSBuZXcgQnVmZmVyKEVORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRSk7XG5cdC8vIGVuZCBvZiBjZW50cmFsIGRpciBzaWduYXR1cmUgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXMgICgweDA2MDU0YjUwKVxuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQzMkxFKDB4MDYwNTRiNTAsIDApO1xuXHQvLyBudW1iZXIgb2YgdGhpcyBkaXNrICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGVvY2RyQnVmZmVyLndyaXRlVUludDE2TEUoMCwgNCk7XG5cdC8vIG51bWJlciBvZiB0aGUgZGlzayB3aXRoIHRoZSBzdGFydCBvZiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgIDIgYnl0ZXNcblx0ZW9jZHJCdWZmZXIud3JpdGVVSW50MTZMRSgwLCA2KTtcblx0Ly8gdG90YWwgbnVtYmVyIG9mIGVudHJpZXMgaW4gdGhlIGNlbnRyYWwgZGlyZWN0b3J5IG9uIHRoaXMgZGlzayAgMiBieXRlc1xuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQxNkxFKG5vcm1hbEVudHJpZXNMZW5ndGgsIDgpO1xuXHQvLyB0b3RhbCBudW1iZXIgb2YgZW50cmllcyBpbiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgICAyIGJ5dGVzXG5cdGVvY2RyQnVmZmVyLndyaXRlVUludDE2TEUobm9ybWFsRW50cmllc0xlbmd0aCwgMTApO1xuXHQvLyBzaXplIG9mIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdGVvY2RyQnVmZmVyLndyaXRlVUludDMyTEUobm9ybWFsU2l6ZU9mQ2VudHJhbERpcmVjdG9yeSwgMTIpO1xuXHQvLyBvZmZzZXQgb2Ygc3RhcnQgb2YgY2VudHJhbCBkaXJlY3Rvcnkgd2l0aCByZXNwZWN0IHRvIHRoZSBzdGFydGluZyBkaXNrIG51bWJlciAgNCBieXRlc1xuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQzMkxFKG5vcm1hbE9mZnNldE9mU3RhcnRPZkNlbnRyYWxEaXJlY3RvcnksIDE2KTtcblx0Ly8gLlpJUCBmaWxlIGNvbW1lbnQgbGVuZ3RoICAgICAgICAgICAgICAgICAgICAgICAgICAgMiBieXRlc1xuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQxNkxFKDAsIDIwKTtcblx0Ly8gLlpJUCBmaWxlIGNvbW1lbnQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHZhcmlhYmxlIHNpemUpXG5cdC8vIG5vIGNvbW1lbnRcblxuXHRpZiAoIW5lZWRaaXA2NEZvcm1hdCkgcmV0dXJuIGVvY2RyQnVmZmVyO1xuXG5cdC8vIFpJUDY0IGZvcm1hdFxuXHQvLyBaSVA2NCBFbmQgb2YgQ2VudHJhbCBEaXJlY3RvcnkgUmVjb3JkXG5cdHZhciB6aXA2NEVvY2RyQnVmZmVyID0gbmV3IEJ1ZmZlcihaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkUpO1xuXHQvLyB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXIgc2lnbmF0dXJlICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlcyAgKDB4MDYwNjRiNTApXG5cdHppcDY0RW9jZHJCdWZmZXIud3JpdGVVSW50MzJMRSgweDA2MDY0YjUwLCAwKTtcblx0Ly8gc2l6ZSBvZiB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgcmVjb3JkICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDggYnl0ZXNcblx0d3JpdGVVSW50NjRMRSh6aXA2NEVvY2RyQnVmZmVyLCBaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkUgLSAxMiwgNCk7XG5cdC8vIHZlcnNpb24gbWFkZSBieSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdHppcDY0RW9jZHJCdWZmZXIud3JpdGVVSW50MTZMRShWRVJTSU9OX01BREVfQlksIDEyKTtcblx0Ly8gdmVyc2lvbiBuZWVkZWQgdG8gZXh0cmFjdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0emlwNjRFb2NkckJ1ZmZlci53cml0ZVVJbnQxNkxFKFZFUlNJT05fTkVFREVEX1RPX0VYVFJBQ1RfWklQNjQsIDE0KTtcblx0Ly8gbnVtYmVyIG9mIHRoaXMgZGlzayAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0emlwNjRFb2NkckJ1ZmZlci53cml0ZVVJbnQzMkxFKDAsIDE2KTtcblx0Ly8gbnVtYmVyIG9mIHRoZSBkaXNrIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0emlwNjRFb2NkckJ1ZmZlci53cml0ZVVJbnQzMkxFKDAsIDIwKTtcblx0Ly8gdG90YWwgbnVtYmVyIG9mIGVudHJpZXMgaW4gdGhlIGNlbnRyYWwgZGlyZWN0b3J5IG9uIHRoaXMgZGlzayAgICAgICAgICAgICAgICAgIDggYnl0ZXNcblx0d3JpdGVVSW50NjRMRSh6aXA2NEVvY2RyQnVmZmVyLCBzZWxmLmVudHJpZXMubGVuZ3RoLCAyNCk7XG5cdC8vIHRvdGFsIG51bWJlciBvZiBlbnRyaWVzIGluIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA4IGJ5dGVzXG5cdHdyaXRlVUludDY0TEUoemlwNjRFb2NkckJ1ZmZlciwgc2VsZi5lbnRyaWVzLmxlbmd0aCwgMzIpO1xuXHQvLyBzaXplIG9mIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOCBieXRlc1xuXHR3cml0ZVVJbnQ2NExFKHppcDY0RW9jZHJCdWZmZXIsIHNpemVPZkNlbnRyYWxEaXJlY3RvcnksIDQwKTtcblx0Ly8gb2Zmc2V0IG9mIHN0YXJ0IG9mIGNlbnRyYWwgZGlyZWN0b3J5IHdpdGggcmVzcGVjdCB0byB0aGUgc3RhcnRpbmcgZGlzayBudW1iZXIgIDggYnl0ZXNcblx0d3JpdGVVSW50NjRMRSh6aXA2NEVvY2RyQnVmZmVyLCBzZWxmLm9mZnNldE9mU3RhcnRPZkNlbnRyYWxEaXJlY3RvcnksIDQ4KTtcblx0Ly8gemlwNjQgZXh0ZW5zaWJsZSBkYXRhIHNlY3RvciAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh2YXJpYWJsZSBzaXplKVxuXHQvLyBub3RoaW5nIGluIHRoZSB6aXA2NCBleHRlbnNpYmxlIGRhdGEgc2VjdG9yXG5cblxuXHQvLyBaSVA2NCBFbmQgb2YgQ2VudHJhbCBEaXJlY3RvcnkgTG9jYXRvclxuXHR2YXIgemlwNjRFb2NkbEJ1ZmZlciA9IG5ldyBCdWZmZXIoWklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX0xPQ0FUT1JfU0laRSk7XG5cdC8vIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpciBsb2NhdG9yIHNpZ25hdHVyZSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzICAoMHgwNzA2NGI1MClcblx0emlwNjRFb2NkbEJ1ZmZlci53cml0ZVVJbnQzMkxFKDB4MDcwNjRiNTAsIDApO1xuXHQvLyBudW1iZXIgb2YgdGhlIGRpc2sgd2l0aCB0aGUgc3RhcnQgb2YgdGhlIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSAgNCBieXRlc1xuXHR6aXA2NEVvY2RsQnVmZmVyLndyaXRlVUludDMyTEUoMCwgNCk7XG5cdC8vIHJlbGF0aXZlIG9mZnNldCBvZiB0aGUgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZCAgICAgICAgICAgICA4IGJ5dGVzXG5cdHdyaXRlVUludDY0TEUoemlwNjRFb2NkbEJ1ZmZlciwgc2VsZi5vdXRwdXRTdHJlYW1DdXJzb3IsIDgpO1xuXHQvLyB0b3RhbCBudW1iZXIgb2YgZGlza3MgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHR6aXA2NEVvY2RsQnVmZmVyLndyaXRlVUludDMyTEUoMSwgMTYpO1xuXG5cblx0cmV0dXJuIEJ1ZmZlci5jb25jYXQoW1xuXHRcdHppcDY0RW9jZHJCdWZmZXIsXG5cdFx0emlwNjRFb2NkbEJ1ZmZlcixcblx0XHRlb2NkckJ1ZmZlcixcblx0XSk7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlTWV0YWRhdGFQYXRoKG1ldGFkYXRhUGF0aCwgaXNEaXJlY3RvcnkpIHtcblx0aWYgKG1ldGFkYXRhUGF0aCA9PT0gXCJcIikgdGhyb3cgbmV3IEVycm9yKFwiZW1wdHkgbWV0YWRhdGFQYXRoXCIpO1xuXHRtZXRhZGF0YVBhdGggPSBtZXRhZGF0YVBhdGgucmVwbGFjZSgvXFxcXC9nLCBcIi9cIik7XG5cdGlmICgvXlthLXpBLVpdOi8udGVzdChtZXRhZGF0YVBhdGgpIHx8IC9eXFwvLy50ZXN0KG1ldGFkYXRhUGF0aCkpIHRocm93IG5ldyBFcnJvcihcImFic29sdXRlIHBhdGg6IFwiICsgbWV0YWRhdGFQYXRoKTtcblx0aWYgKG1ldGFkYXRhUGF0aC5zcGxpdChcIi9cIikuaW5kZXhPZihcIi4uXCIpICE9PSAtMSkgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCByZWxhdGl2ZSBwYXRoOiBcIiArIG1ldGFkYXRhUGF0aCk7XG5cdHZhciBsb29rc0xpa2VEaXJlY3RvcnkgPSAvXFwvJC8udGVzdChtZXRhZGF0YVBhdGgpO1xuXHRpZiAoaXNEaXJlY3RvcnkpIHtcblx0XHQvLyBhcHBlbmQgYSB0cmFpbGluZyAnLycgaWYgbmVjZXNzYXJ5LlxuXHRcdGlmICghbG9va3NMaWtlRGlyZWN0b3J5KSBtZXRhZGF0YVBhdGggKz0gXCIvXCI7XG5cdH0gZWxzZSB7XG5cdFx0aWYgKGxvb2tzTGlrZURpcmVjdG9yeSkgdGhyb3cgbmV3IEVycm9yKFwiZmlsZSBwYXRoIGNhbm5vdCBlbmQgd2l0aCAnLyc6IFwiICsgbWV0YWRhdGFQYXRoKTtcblx0fVxuXHRyZXR1cm4gbWV0YWRhdGFQYXRoO1xufVxuXG52YXIgZGVmYXVsdEZpbGVNb2RlID0gcGFyc2VJbnQoXCIwMTAwNjY0XCIsIDgpO1xudmFyIGRlZmF1bHREaXJlY3RvcnlNb2RlID0gcGFyc2VJbnQoXCIwNDA3NzVcIiwgOCk7XG5cbi8vIHRoaXMgY2xhc3MgaXMgbm90IHBhcnQgb2YgdGhlIHB1YmxpYyBBUElcbmZ1bmN0aW9uIEVudHJ5KG1ldGFkYXRhUGF0aCwgaXNEaXJlY3RvcnksIG9wdGlvbnMpIHtcblx0dGhpcy51dGY4RmlsZU5hbWUgPSBuZXcgQnVmZmVyKG1ldGFkYXRhUGF0aCk7XG5cdGlmICh0aGlzLnV0ZjhGaWxlTmFtZS5sZW5ndGggPiAweGZmZmYpIHRocm93IG5ldyBFcnJvcihcInV0ZjggZmlsZSBuYW1lIHRvbyBsb25nLiBcIiArIHV0ZjhGaWxlTmFtZS5sZW5ndGggKyBcIiA+IFwiICsgMHhmZmZmKTtcblx0dGhpcy5pc0RpcmVjdG9yeSA9IGlzRGlyZWN0b3J5O1xuXHR0aGlzLnN0YXRlID0gRW50cnkuV0FJVElOR19GT1JfTUVUQURBVEE7XG5cdHRoaXMuc2V0TGFzdE1vZERhdGUob3B0aW9ucy5tdGltZSAhPSBudWxsID8gb3B0aW9ucy5tdGltZSA6IG5ldyBEYXRlKCkpO1xuXHRpZiAob3B0aW9ucy5tb2RlICE9IG51bGwpIHtcblx0XHR0aGlzLnNldEZpbGVBdHRyaWJ1dGVzTW9kZShvcHRpb25zLm1vZGUpO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuc2V0RmlsZUF0dHJpYnV0ZXNNb2RlKGlzRGlyZWN0b3J5ID8gZGVmYXVsdERpcmVjdG9yeU1vZGUgOiBkZWZhdWx0RmlsZU1vZGUpO1xuXHR9XG5cdGlmIChpc0RpcmVjdG9yeSkge1xuXHRcdHRoaXMuY3JjQW5kRmlsZVNpemVLbm93biA9IHRydWU7XG5cdFx0dGhpcy5jcmMzMiA9IDA7XG5cdFx0dGhpcy51bmNvbXByZXNzZWRTaXplID0gMDtcblx0XHR0aGlzLmNvbXByZXNzZWRTaXplID0gMDtcblx0fSBlbHNlIHtcblx0XHQvLyB1bmtub3duIHNvIGZhclxuXHRcdHRoaXMuY3JjQW5kRmlsZVNpemVLbm93biA9IGZhbHNlO1xuXHRcdHRoaXMuY3JjMzIgPSBudWxsO1xuXHRcdHRoaXMudW5jb21wcmVzc2VkU2l6ZSA9IG51bGw7XG5cdFx0dGhpcy5jb21wcmVzc2VkU2l6ZSA9IG51bGw7XG5cdFx0aWYgKG9wdGlvbnMuc2l6ZSAhPSBudWxsKSB0aGlzLnVuY29tcHJlc3NlZFNpemUgPSBvcHRpb25zLnNpemU7XG5cdH1cblx0aWYgKGlzRGlyZWN0b3J5KSB7XG5cdFx0dGhpcy5jb21wcmVzcyA9IGZhbHNlO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuY29tcHJlc3MgPSB0cnVlOyAvLyBkZWZhdWx0XG5cdFx0aWYgKG9wdGlvbnMuY29tcHJlc3MgIT0gbnVsbCkgdGhpcy5jb21wcmVzcyA9ICEhb3B0aW9ucy5jb21wcmVzcztcblx0fVxuXHR0aGlzLmZvcmNlWmlwNjRGb3JtYXQgPSAhIW9wdGlvbnMuZm9yY2VaaXA2NEZvcm1hdDtcbn1cblxuRW50cnkuV0FJVElOR19GT1JfTUVUQURBVEEgPSAwO1xuRW50cnkuUkVBRFlfVE9fUFVNUF9GSUxFX0RBVEEgPSAxO1xuRW50cnkuRklMRV9EQVRBX0lOX1BST0dSRVNTID0gMjtcbkVudHJ5LkZJTEVfREFUQV9ET05FID0gMztcbkVudHJ5LnByb3RvdHlwZS5zZXRMYXN0TW9kRGF0ZSA9IGZ1bmN0aW9uIChkYXRlKSB7XG5cdHZhciBkb3NEYXRlVGltZSA9IGRhdGVUb0Rvc0RhdGVUaW1lKGRhdGUpO1xuXHR0aGlzLmxhc3RNb2RGaWxlVGltZSA9IGRvc0RhdGVUaW1lLnRpbWU7XG5cdHRoaXMubGFzdE1vZEZpbGVEYXRlID0gZG9zRGF0ZVRpbWUuZGF0ZTtcbn07XG5FbnRyeS5wcm90b3R5cGUuc2V0RmlsZUF0dHJpYnV0ZXNNb2RlID0gZnVuY3Rpb24gKG1vZGUpIHtcblx0aWYgKChtb2RlICYgMHhmZmZmKSAhPT0gbW9kZSkgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCBtb2RlLiBleHBlY3RlZDogMCA8PSBcIiArIG1vZGUgKyBcIiA8PSBcIiArIDB4ZmZmZik7XG5cdC8vIGh0dHA6Ly91bml4LnN0YWNrZXhjaGFuZ2UuY29tL3F1ZXN0aW9ucy8xNDcwNS90aGUtemlwLWZvcm1hdHMtZXh0ZXJuYWwtZmlsZS1hdHRyaWJ1dGUvMTQ3MjcjMTQ3Mjdcblx0dGhpcy5leHRlcm5hbEZpbGVBdHRyaWJ1dGVzID0gKG1vZGUgPDwgMTYpID4+PiAwO1xufTtcbi8vIGRvRmlsZURhdGFQdW1wKCkgc2hvdWxkIG5vdCBjYWxsIHB1bXBFbnRyaWVzKCkgZGlyZWN0bHkuIHNlZSBpc3N1ZSAjOS5cbkVudHJ5LnByb3RvdHlwZS5zZXRGaWxlRGF0YVB1bXBGdW5jdGlvbiA9IGZ1bmN0aW9uIChkb0ZpbGVEYXRhUHVtcCkge1xuXHR0aGlzLmRvRmlsZURhdGFQdW1wID0gZG9GaWxlRGF0YVB1bXA7XG5cdHRoaXMuc3RhdGUgPSBFbnRyeS5SRUFEWV9UT19QVU1QX0ZJTEVfREFUQTtcbn07XG5FbnRyeS5wcm90b3R5cGUudXNlWmlwNjRGb3JtYXQgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiAoXG5cdFx0KHRoaXMuZm9yY2VaaXA2NEZvcm1hdCkgfHxcblx0XHQodGhpcy51bmNvbXByZXNzZWRTaXplICE9IG51bGwgJiYgdGhpcy51bmNvbXByZXNzZWRTaXplID4gMHhmZmZmZmZmZSkgfHxcblx0XHQodGhpcy5jb21wcmVzc2VkU2l6ZSAhPSBudWxsICYmIHRoaXMuY29tcHJlc3NlZFNpemUgPiAweGZmZmZmZmZlKSB8fFxuXHRcdCh0aGlzLnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciAhPSBudWxsICYmIHRoaXMucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID4gMHhmZmZmZmZmZSlcblx0KTtcbn1cbnZhciBMT0NBTF9GSUxFX0hFQURFUl9GSVhFRF9TSVpFID0gMzA7XG52YXIgVkVSU0lPTl9ORUVERURfVE9fRVhUUkFDVF9VVEY4ID0gMjA7XG52YXIgVkVSU0lPTl9ORUVERURfVE9fRVhUUkFDVF9aSVA2NCA9IDQ1O1xuLy8gMyA9IHVuaXguIDYzID0gc3BlYyB2ZXJzaW9uIDYuM1xudmFyIFZFUlNJT05fTUFERV9CWSA9ICgzIDw8IDgpIHwgNjM7XG52YXIgRklMRV9OQU1FX0lTX1VURjggPSAxIDw8IDExO1xudmFyIFVOS05PV05fQ1JDMzJfQU5EX0ZJTEVfU0laRVMgPSAxIDw8IDM7XG5FbnRyeS5wcm90b3R5cGUuZ2V0TG9jYWxGaWxlSGVhZGVyID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgY3JjMzIgPSAwO1xuXHR2YXIgY29tcHJlc3NlZFNpemUgPSAwO1xuXHR2YXIgdW5jb21wcmVzc2VkU2l6ZSA9IDA7XG5cdGlmICh0aGlzLmNyY0FuZEZpbGVTaXplS25vd24pIHtcblx0XHRjcmMzMiA9IHRoaXMuY3JjMzI7XG5cdFx0Y29tcHJlc3NlZFNpemUgPSB0aGlzLmNvbXByZXNzZWRTaXplO1xuXHRcdHVuY29tcHJlc3NlZFNpemUgPSB0aGlzLnVuY29tcHJlc3NlZFNpemU7XG5cdH1cblxuXHR2YXIgZml4ZWRTaXplU3R1ZmYgPSBuZXcgQnVmZmVyKExPQ0FMX0ZJTEVfSEVBREVSX0ZJWEVEX1NJWkUpO1xuXHR2YXIgZ2VuZXJhbFB1cnBvc2VCaXRGbGFnID0gRklMRV9OQU1FX0lTX1VURjg7XG5cdGlmICghdGhpcy5jcmNBbmRGaWxlU2l6ZUtub3duKSBnZW5lcmFsUHVycG9zZUJpdEZsYWcgfD0gVU5LTk9XTl9DUkMzMl9BTkRfRklMRV9TSVpFUztcblxuXHQvLyBsb2NhbCBmaWxlIGhlYWRlciBzaWduYXR1cmUgICAgIDQgYnl0ZXMgICgweDA0MDM0YjUwKVxuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKDB4MDQwMzRiNTAsIDApO1xuXHQvLyB2ZXJzaW9uIG5lZWRlZCB0byBleHRyYWN0ICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRShWRVJTSU9OX05FRURFRF9UT19FWFRSQUNUX1VURjgsIDQpO1xuXHQvLyBnZW5lcmFsIHB1cnBvc2UgYml0IGZsYWcgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRShnZW5lcmFsUHVycG9zZUJpdEZsYWcsIDYpO1xuXHQvLyBjb21wcmVzc2lvbiBtZXRob2QgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLmdldENvbXByZXNzaW9uTWV0aG9kKCksIDgpO1xuXHQvLyBsYXN0IG1vZCBmaWxlIHRpbWUgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLmxhc3RNb2RGaWxlVGltZSwgMTApO1xuXHQvLyBsYXN0IG1vZCBmaWxlIGRhdGUgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLmxhc3RNb2RGaWxlRGF0ZSwgMTIpO1xuXHQvLyBjcmMtMzIgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRShjcmMzMiwgMTQpO1xuXHQvLyBjb21wcmVzc2VkIHNpemUgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRShjb21wcmVzc2VkU2l6ZSwgMTgpO1xuXHQvLyB1bmNvbXByZXNzZWQgc2l6ZSAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRSh1bmNvbXByZXNzZWRTaXplLCAyMik7XG5cdC8vIGZpbGUgbmFtZSBsZW5ndGggICAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHRoaXMudXRmOEZpbGVOYW1lLmxlbmd0aCwgMjYpO1xuXHQvLyBleHRyYSBmaWVsZCBsZW5ndGggICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSgwLCAyOCk7XG5cdHJldHVybiBCdWZmZXIuY29uY2F0KFtcblx0XHRmaXhlZFNpemVTdHVmZixcblx0XHQvLyBmaWxlIG5hbWUgKHZhcmlhYmxlIHNpemUpXG5cdFx0dGhpcy51dGY4RmlsZU5hbWUsXG5cdFx0Ly8gZXh0cmEgZmllbGQgKHZhcmlhYmxlIHNpemUpXG5cdFx0Ly8gbm8gZXh0cmEgZmllbGRzXG5cdF0pO1xufTtcbnZhciBEQVRBX0RFU0NSSVBUT1JfU0laRSA9IDE2O1xudmFyIFpJUDY0X0RBVEFfREVTQ1JJUFRPUl9TSVpFID0gMjQ7XG5FbnRyeS5wcm90b3R5cGUuZ2V0RGF0YURlc2NyaXB0b3IgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0aGlzLmNyY0FuZEZpbGVTaXplS25vd24pIHtcblx0XHQvLyB0aGUgTWFjIEFyY2hpdmUgVXRpbGl0eSByZXF1aXJlcyB0aGlzIG5vdCBiZSBwcmVzZW50IHVubGVzcyB3ZSBzZXQgZ2VuZXJhbCBwdXJwb3NlIGJpdCAzXG5cdFx0cmV0dXJuIG5ldyBCdWZmZXIoMCk7XG5cdH1cblx0aWYgKCF0aGlzLnVzZVppcDY0Rm9ybWF0KCkpIHtcblx0XHR2YXIgYnVmZmVyID0gbmV3IEJ1ZmZlcihEQVRBX0RFU0NSSVBUT1JfU0laRSk7XG5cdFx0Ly8gb3B0aW9uYWwgc2lnbmF0dXJlIChyZXF1aXJlZCBhY2NvcmRpbmcgdG8gQXJjaGl2ZSBVdGlsaXR5KVxuXHRcdGJ1ZmZlci53cml0ZVVJbnQzMkxFKDB4MDgwNzRiNTAsIDApO1xuXHRcdC8vIGNyYy0zMiAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRcdGJ1ZmZlci53cml0ZVVJbnQzMkxFKHRoaXMuY3JjMzIsIDQpO1xuXHRcdC8vIGNvbXByZXNzZWQgc2l6ZSAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRcdGJ1ZmZlci53cml0ZVVJbnQzMkxFKHRoaXMuY29tcHJlc3NlZFNpemUsIDgpO1xuXHRcdC8vIHVuY29tcHJlc3NlZCBzaXplICAgICAgICAgICAgICAgNCBieXRlc1xuXHRcdGJ1ZmZlci53cml0ZVVJbnQzMkxFKHRoaXMudW5jb21wcmVzc2VkU2l6ZSwgMTIpO1xuXHRcdHJldHVybiBidWZmZXI7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gWklQNjQgZm9ybWF0XG5cdFx0dmFyIGJ1ZmZlciA9IG5ldyBCdWZmZXIoWklQNjRfREFUQV9ERVNDUklQVE9SX1NJWkUpO1xuXHRcdC8vIG9wdGlvbmFsIHNpZ25hdHVyZSAodW5rbm93biBpZiBhbnlvbmUgY2FyZXMgYWJvdXQgdGhpcylcblx0XHRidWZmZXIud3JpdGVVSW50MzJMRSgweDA4MDc0YjUwLCAwKTtcblx0XHQvLyBjcmMtMzIgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0XHRidWZmZXIud3JpdGVVSW50MzJMRSh0aGlzLmNyYzMyLCA0KTtcblx0XHQvLyBjb21wcmVzc2VkIHNpemUgICAgICAgICAgICAgICAgIDggYnl0ZXNcblx0XHR3cml0ZVVJbnQ2NExFKGJ1ZmZlciwgdGhpcy5jb21wcmVzc2VkU2l6ZSwgOCk7XG5cdFx0Ly8gdW5jb21wcmVzc2VkIHNpemUgICAgICAgICAgICAgICA4IGJ5dGVzXG5cdFx0d3JpdGVVSW50NjRMRShidWZmZXIsIHRoaXMudW5jb21wcmVzc2VkU2l6ZSwgMTYpO1xuXHRcdHJldHVybiBidWZmZXI7XG5cdH1cbn07XG52YXIgQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX0ZJWEVEX1NJWkUgPSA0NjtcbnZhciBaSVA2NF9FWFRFTkRFRF9JTkZPUk1BVElPTl9FWFRSQV9GSUVMRF9TSVpFID0gMjg7XG5FbnRyeS5wcm90b3R5cGUuZ2V0Q2VudHJhbERpcmVjdG9yeVJlY29yZCA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGZpeGVkU2l6ZVN0dWZmID0gbmV3IEJ1ZmZlcihDRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfRklYRURfU0laRSk7XG5cdHZhciBnZW5lcmFsUHVycG9zZUJpdEZsYWcgPSBGSUxFX05BTUVfSVNfVVRGODtcblx0aWYgKCF0aGlzLmNyY0FuZEZpbGVTaXplS25vd24pIGdlbmVyYWxQdXJwb3NlQml0RmxhZyB8PSBVTktOT1dOX0NSQzMyX0FORF9GSUxFX1NJWkVTO1xuXG5cdHZhciBub3JtYWxDb21wcmVzc2VkU2l6ZSA9IHRoaXMuY29tcHJlc3NlZFNpemU7XG5cdHZhciBub3JtYWxVbmNvbXByZXNzZWRTaXplID0gdGhpcy51bmNvbXByZXNzZWRTaXplO1xuXHR2YXIgbm9ybWFsUmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID0gdGhpcy5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXI7XG5cdHZhciB2ZXJzaW9uTmVlZGVkVG9FeHRyYWN0O1xuXHR2YXIgemVpZWZCdWZmZXI7XG5cdGlmICh0aGlzLnVzZVppcDY0Rm9ybWF0KCkpIHtcblx0XHRub3JtYWxDb21wcmVzc2VkU2l6ZSA9IDB4ZmZmZmZmZmY7XG5cdFx0bm9ybWFsVW5jb21wcmVzc2VkU2l6ZSA9IDB4ZmZmZmZmZmY7XG5cdFx0bm9ybWFsUmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID0gMHhmZmZmZmZmZjtcblx0XHR2ZXJzaW9uTmVlZGVkVG9FeHRyYWN0ID0gVkVSU0lPTl9ORUVERURfVE9fRVhUUkFDVF9aSVA2NDtcblxuXHRcdC8vIFpJUDY0IGV4dGVuZGVkIGluZm9ybWF0aW9uIGV4dHJhIGZpZWxkXG5cdFx0emVpZWZCdWZmZXIgPSBuZXcgQnVmZmVyKFpJUDY0X0VYVEVOREVEX0lORk9STUFUSU9OX0VYVFJBX0ZJRUxEX1NJWkUpO1xuXHRcdC8vIDB4MDAwMSAgICAgICAgICAgICAgICAgIDIgYnl0ZXMgICAgVGFnIGZvciB0aGlzIFwiZXh0cmFcIiBibG9jayB0eXBlXG5cdFx0emVpZWZCdWZmZXIud3JpdGVVSW50MTZMRSgweDAwMDEsIDApO1xuXHRcdC8vIFNpemUgICAgICAgICAgICAgICAgICAgIDIgYnl0ZXMgICAgU2l6ZSBvZiB0aGlzIFwiZXh0cmFcIiBibG9ja1xuXHRcdHplaWVmQnVmZmVyLndyaXRlVUludDE2TEUoWklQNjRfRVhURU5ERURfSU5GT1JNQVRJT05fRVhUUkFfRklFTERfU0laRSAtIDQsIDIpO1xuXHRcdC8vIE9yaWdpbmFsIFNpemUgICAgICAgICAgIDggYnl0ZXMgICAgT3JpZ2luYWwgdW5jb21wcmVzc2VkIGZpbGUgc2l6ZVxuXHRcdHdyaXRlVUludDY0TEUoemVpZWZCdWZmZXIsIHRoaXMudW5jb21wcmVzc2VkU2l6ZSwgNCk7XG5cdFx0Ly8gQ29tcHJlc3NlZCBTaXplICAgICAgICAgOCBieXRlcyAgICBTaXplIG9mIGNvbXByZXNzZWQgZGF0YVxuXHRcdHdyaXRlVUludDY0TEUoemVpZWZCdWZmZXIsIHRoaXMuY29tcHJlc3NlZFNpemUsIDEyKTtcblx0XHQvLyBSZWxhdGl2ZSBIZWFkZXIgT2Zmc2V0ICA4IGJ5dGVzICAgIE9mZnNldCBvZiBsb2NhbCBoZWFkZXIgcmVjb3JkXG5cdFx0d3JpdGVVSW50NjRMRSh6ZWllZkJ1ZmZlciwgdGhpcy5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIsIDIwKTtcblx0XHQvLyBEaXNrIFN0YXJ0IE51bWJlciAgICAgICA0IGJ5dGVzICAgIE51bWJlciBvZiB0aGUgZGlzayBvbiB3aGljaCB0aGlzIGZpbGUgc3RhcnRzXG5cdFx0Ly8gKG9taXQpXG5cdH0gZWxzZSB7XG5cdFx0dmVyc2lvbk5lZWRlZFRvRXh0cmFjdCA9IFZFUlNJT05fTkVFREVEX1RPX0VYVFJBQ1RfVVRGODtcblx0XHR6ZWllZkJ1ZmZlciA9IG5ldyBCdWZmZXIoMCk7XG5cdH1cblxuXHQvLyBjZW50cmFsIGZpbGUgaGVhZGVyIHNpZ25hdHVyZSAgIDQgYnl0ZXMgICgweDAyMDE0YjUwKVxuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKDB4MDIwMTRiNTAsIDApO1xuXHQvLyB2ZXJzaW9uIG1hZGUgYnkgICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRShWRVJTSU9OX01BREVfQlksIDQpO1xuXHQvLyB2ZXJzaW9uIG5lZWRlZCB0byBleHRyYWN0ICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh2ZXJzaW9uTmVlZGVkVG9FeHRyYWN0LCA2KTtcblx0Ly8gZ2VuZXJhbCBwdXJwb3NlIGJpdCBmbGFnICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoZ2VuZXJhbFB1cnBvc2VCaXRGbGFnLCA4KTtcblx0Ly8gY29tcHJlc3Npb24gbWV0aG9kICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodGhpcy5nZXRDb21wcmVzc2lvbk1ldGhvZCgpLCAxMCk7XG5cdC8vIGxhc3QgbW9kIGZpbGUgdGltZSAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHRoaXMubGFzdE1vZEZpbGVUaW1lLCAxMik7XG5cdC8vIGxhc3QgbW9kIGZpbGUgZGF0ZSAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHRoaXMubGFzdE1vZEZpbGVEYXRlLCAxNCk7XG5cdC8vIGNyYy0zMiAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKHRoaXMuY3JjMzIsIDE2KTtcblx0Ly8gY29tcHJlc3NlZCBzaXplICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUobm9ybWFsQ29tcHJlc3NlZFNpemUsIDIwKTtcblx0Ly8gdW5jb21wcmVzc2VkIHNpemUgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUobm9ybWFsVW5jb21wcmVzc2VkU2l6ZSwgMjQpO1xuXHQvLyBmaWxlIG5hbWUgbGVuZ3RoICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLnV0ZjhGaWxlTmFtZS5sZW5ndGgsIDI4KTtcblx0Ly8gZXh0cmEgZmllbGQgbGVuZ3RoICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoemVpZWZCdWZmZXIubGVuZ3RoLCAzMCk7XG5cdC8vIGZpbGUgY29tbWVudCBsZW5ndGggICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKDAsIDMyKTtcblx0Ly8gZGlzayBudW1iZXIgc3RhcnQgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoMCwgMzQpO1xuXHQvLyBpbnRlcm5hbCBmaWxlIGF0dHJpYnV0ZXMgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSgwLCAzNik7XG5cdC8vIGV4dGVybmFsIGZpbGUgYXR0cmlidXRlcyAgICAgICAgNCBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKHRoaXMuZXh0ZXJuYWxGaWxlQXR0cmlidXRlcywgMzgpO1xuXHQvLyByZWxhdGl2ZSBvZmZzZXQgb2YgbG9jYWwgaGVhZGVyIDQgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRShub3JtYWxSZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIsIDQyKTtcblxuXHRyZXR1cm4gQnVmZmVyLmNvbmNhdChbXG5cdFx0Zml4ZWRTaXplU3R1ZmYsXG5cdFx0Ly8gZmlsZSBuYW1lICh2YXJpYWJsZSBzaXplKVxuXHRcdHRoaXMudXRmOEZpbGVOYW1lLFxuXHRcdC8vIGV4dHJhIGZpZWxkICh2YXJpYWJsZSBzaXplKVxuXHRcdHplaWVmQnVmZmVyLFxuXHRcdC8vIGZpbGUgY29tbWVudCAodmFyaWFibGUgc2l6ZSlcblx0XHQvLyBlbXB0eSBjb21tZW50XG5cdF0pO1xufTtcbkVudHJ5LnByb3RvdHlwZS5nZXRDb21wcmVzc2lvbk1ldGhvZCA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIE5PX0NPTVBSRVNTSU9OID0gMDtcblx0dmFyIERFRkxBVEVfQ09NUFJFU1NJT04gPSA4O1xuXHRyZXR1cm4gdGhpcy5jb21wcmVzcyA/IERFRkxBVEVfQ09NUFJFU1NJT04gOiBOT19DT01QUkVTU0lPTjtcbn07XG5cbmZ1bmN0aW9uIGRhdGVUb0Rvc0RhdGVUaW1lKGpzRGF0ZSkge1xuXHR2YXIgZGF0ZSA9IDA7XG5cdGRhdGUgfD0ganNEYXRlLmdldERhdGUoKSAmIDB4MWY7IC8vIDEtMzFcblx0ZGF0ZSB8PSAoKGpzRGF0ZS5nZXRNb250aCgpICsgMSkgJiAweGYpIDw8IDU7IC8vIDAtMTEsIDEtMTJcblx0ZGF0ZSB8PSAoKGpzRGF0ZS5nZXRGdWxsWWVhcigpIC0gMTk4MCkgJiAweDdmKSA8PCA5OyAvLyAwLTEyOCwgMTk4MC0yMTA4XG5cblx0dmFyIHRpbWUgPSAwO1xuXHR0aW1lIHw9IE1hdGguZmxvb3IoanNEYXRlLmdldFNlY29uZHMoKSAvIDIpOyAvLyAwLTU5LCAwLTI5IChsb3NlIG9kZCBudW1iZXJzKVxuXHR0aW1lIHw9IChqc0RhdGUuZ2V0TWludXRlcygpICYgMHgzZikgPDwgNTsgLy8gMC01OVxuXHR0aW1lIHw9IChqc0RhdGUuZ2V0SG91cnMoKSAmIDB4MWYpIDw8IDExOyAvLyAwLTIzXG5cblx0cmV0dXJuIHtkYXRlOiBkYXRlLCB0aW1lOiB0aW1lfTtcbn1cblxuZnVuY3Rpb24gd3JpdGVVSW50NjRMRShidWZmZXIsIG4sIG9mZnNldCkge1xuXHQvLyBjYW4ndCB1c2UgYml0c2hpZnQgaGVyZSwgYmVjYXVzZSBKYXZhU2NyaXB0IG9ubHkgYWxsb3dzIGJpdHNoaXRpbmcgb24gMzItYml0IGludGVnZXJzLlxuXHR2YXIgaGlnaCA9IE1hdGguZmxvb3IobiAvIDB4MTAwMDAwMDAwKTtcblx0dmFyIGxvdyA9IG4gJSAweDEwMDAwMDAwMDtcblx0YnVmZmVyLndyaXRlVUludDMyTEUobG93LCBvZmZzZXQpO1xuXHRidWZmZXIud3JpdGVVSW50MzJMRShoaWdoLCBvZmZzZXQgKyA0KTtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdENhbGxiYWNrKGVycikge1xuXHRpZiAoZXJyKSB0aHJvdyBlcnI7XG59XG5cbnV0aWwuaW5oZXJpdHMoQnl0ZUNvdW50ZXIsIFRyYW5zZm9ybSk7XG5cbmZ1bmN0aW9uIEJ5dGVDb3VudGVyKG9wdGlvbnMpIHtcblx0VHJhbnNmb3JtLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cdHRoaXMuYnl0ZUNvdW50ID0gMDtcbn1cblxuQnl0ZUNvdW50ZXIucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2h1bmssIGVuY29kaW5nLCBjYikge1xuXHR0aGlzLmJ5dGVDb3VudCArPSBjaHVuay5sZW5ndGg7XG5cdGNiKG51bGwsIGNodW5rKTtcbn07XG5cbnV0aWwuaW5oZXJpdHMoQ3JjMzJXYXRjaGVyLCBUcmFuc2Zvcm0pO1xuXG5mdW5jdGlvbiBDcmMzMldhdGNoZXIob3B0aW9ucykge1xuXHRUcmFuc2Zvcm0uY2FsbCh0aGlzLCBvcHRpb25zKTtcblx0dGhpcy5jcmMzMiA9IDA7XG59XG5cbkNyYzMyV2F0Y2hlci5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uIChjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG5cdHRoaXMuY3JjMzIgPSBjcmMzMi51bnNpZ25lZChjaHVuaywgdGhpcy5jcmMzMik7XG5cdGNiKG51bGwsIGNodW5rKTtcbn07Il19
