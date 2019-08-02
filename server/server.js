process.env.NO_LOGS = true;
require("../psknode/bundles/pskruntime");
require("../psknode/bundles/psknode");
require("../psknode/bundles/virtualMQ");
require("edfs-brick-storage");

let PORT = 9091;
const tempFolder = "./tmp";
const VirtualMQ = require("virtualmq");
function createServer(callback) {
    let server = VirtualMQ.createVirtualMQ(PORT, tempFolder, undefined, (err, res) => {
        if (err) {
            console.log("Failed to create VirtualMQ server on port ", PORT);
            console.log("Trying again...");
            if (PORT > 0 && PORT < 50000) {
                PORT++;
                createServer(callback);
            } else {
                return callback(err);
            }
        } else {
            console.log("Server ready and available on port ", PORT);
            let url = `http://127.0.0.1:${PORT}`;
            callback(undefined, server, url);
        }
    });
}

createServer((err, server, url)=>{
    if(!err){
        console.log("Server started at url ", url);
    }
})
