import * as net from "net";
import fs from "node:fs";
import zlib from "node:zlib";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
  
  socket.on("close", () => {
    socket.end();
  });

  socket.on("data", (data) => {
    // convert byte data into 
    const req = data.toString();
    const [method, path, _] = req.split('\r\n')[0].split(' ');

    if(method === 'GET'){
      // if no resource is requested
      if (path === '/'){
        socket.write(Buffer.from(`HTTP/1.1 200 OK\r\n\r\n`));
      }
      // if the path is echo
      else if(path.startsWith('/echo/')){
        const content = path.split("/")[2];
        const compressionMethods = req.split("Accept-Encoding:")[1]?.split('\r\n')[0]?.split(', ');

        if(compressionMethods?.find((a) => a.trim() === 'gzip') && content?.length){
          // compressing the body
          const buffer = Buffer.from(content, 'utf8');  
          const compressedBody = zlib.gzipSync(buffer);

          // writing the header
          let headers = `Content-Encoding: gzip\r\nContent-Type: text/plain\r\nContent-Length: ${compressedBody.length}\r\n\r\n`;
          
          // writing the status line along with the header to the socket
          socket.write(Buffer.from(`HTTP/1.1 200 OK\r\n` + headers));

          // writing the compressed data in a different socket.write() call
          // because now body is a binary buffer after compression and thus is written separately from other string data.
          socket.write(Buffer.from(compressedBody));

        }else if(content?.length){
          // no compression is required
          let headers = `Content-Type: text/plain\r\nContent-Length: ${content.length}\r\n\r\n${content}`;
          socket.write(Buffer.from(`HTTP/1.1 200 OK\r\n` + headers + '\r\n\r\n'));
        }else{
          // there is no content, but the request is a valid one.
          socket.write(Buffer.from(`HTTP/1.1 200 OK\r\n\r\n`));
        }
      }
      else if(path.startsWith('/user-agent')){
        const uaInfo = req.split("User-Agent:")[1]?.split(' ')[1].trim();
        if(uaInfo){
          const res = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${uaInfo.length}\r\n\r\n${uaInfo}\r\n\r\n`;
          socket.write(Buffer.from(res));
        }else{
          // there is no user agent info
          socket.write(Buffer.from(`HTTP/1.1 200 OK\r\n\r\n`));
        }
      }
      else if(path.startsWith('/files/')){
        const args = process.argv.slice(2);
        const [___, absPath] = args;
        const subpath = path.split("/")[2];
        const filePath = absPath + "/" + subpath;
  
        try{
          const content = fs.readFileSync(filePath);
          const res = `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${content.length}\r\n\r\n${content}`;
          socket.write(Buffer.from(res));
        }catch(error){
          socket.write(Buffer.from(`HTTP/1.1 404 Not Found\r\n\r\n`));
        }
      }
      else{
        socket.write(Buffer.from(`HTTP/1.1 404 Not Found\r\n\r\n`));
      }
    }
    else if(method === 'POST' &&  path.startsWith('/files/')){
        const args = process.argv.slice(2);
        const [___, absPath] = args;
        const subpath = path.split("/")[2];
        const filePath = absPath  + subpath;

        const body = req.split("\r\n\r\n")[1];
        try{
          fs.writeFileSync(filePath, body);
          socket.write(Buffer.from(`HTTP/1.1 201 Created\r\n\r\n`));
        }catch(error){
          socket.write(Buffer.from(`HTTP/1.1 500 Internal Server Error\r\n\r\n`));
        }
    }
    else{
      socket.write(Buffer.from(`HTTP/1.1 404 Not Found\r\n\r\n`));
    }

    socket.end();
  })
});

server.listen(4221, "localhost");
