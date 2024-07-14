import * as net from "net";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
  // socket.write(Buffer.from(`HTTP/1.1 200 OK\r\n\r\n`));
  socket.on("close", () => {
    socket.end();
  });

  socket.on("data", (data) => {
    // convert byte data into 
    const req = data.toString();
    // splitting the string using whitespace since a typical data will look like
    // GET /abcdef HTTP1.1 ...
    const strArr = req.split(" ");
    if (strArr[1] === '/'){
      socket.write(Buffer.from(`HTTP/1.1 200 OK\r\n\r\n`));
    }else{
      socket.write(Buffer.from(`HTTP/1.1 404 Not Found\r\n\r\n`));
    }
    socket.end();
    
  })
});

server.listen(4221, "localhost");
