import * as net from "net";
import fs from "node:fs";
import zlib from "node:zlib";
import { gzip } from "zlib";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
  // socket.write(Buffer.from(`HTTP/1.1 200 OK\r\n\r\n`));
  socket.on("close", () => {
    socket.end();
  });

  function changeResponse(response: string){
    socket.write(Buffer.from(response));
    socket.end();
  }

  socket.on("data", (data) => {
    // convert byte data into 
    const req = data.toString();
    
    // splitting the string using whitespace since a typical data will look like
    // GET /abcdef HTTP1.1 ...
    const strArr = req.split(' ');
    const param = strArr[1].split("/")[1];
  
    const compressionMethods = req.split("Accept-Encoding:")[1]?.split('\r\n')[0]?.split(', ');
    
    if(strArr[0] === 'GET'){
      if (strArr[1] === '/'){
        changeResponse(`HTTP/1.1 200 OK\r\n\r\n`);
      }
      else if(param === 'echo'){
        const content = strArr[1].split("/")[2];
        let statusLine = `HTTP/1.1 200 OK\r\n`;
        let headers = '';

        if(content && content.length){
          headers = `Content-Type: text/plain\r\nContent-Length: ${content.length}\r\n\r\n${content}`;
        }

        if(compressionMethods?.find((a) => a.trim() === 'gzip')){
          // compressing the body
          const buffer = Buffer.from(content, 'utf8');  
          const compressedBody = zlib.gzipSync(buffer);

          console.log('compressedData: ', compressedBody);
          headers = `Content-Encoding: gzip\r\nContent-Type: text/plain\r\nContent-Length: ${compressedBody.length}\r\n\r\n${compressedBody}`;
        }

        if(headers){
          changeResponse(statusLine + headers + '\r\n\r\n');
        }else{
          changeResponse(statusLine + '\r\n')
        }

      }
      else if(param === 'user-agent'){
        const uaInfo = req.split("User-Agent:")[1]?.split(' ')[1].trim();
        if(uaInfo){
          const res = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${uaInfo.length}\r\n\r\n${uaInfo}\r\n\r\n`;
          changeResponse(res);
        }else{
          changeResponse(`HTTP/1.1 200 OK\r\n\r\n`);
        }
      }
      else if(param === 'files'){
        const args = process.argv.slice(2);
        const [___, absPath] = args;
        const path = strArr[1].split("/")[2];
        const filePath = absPath + "/" + path;
  
        try{
          const content = fs.readFileSync(filePath);
          const res = `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${content.length}\r\n\r\n${content}`;
          changeResponse(res);
        }catch(error){
          changeResponse(`HTTP/1.1 404 Not Found\r\n\r\n`);
        }
      }
      else{
        changeResponse(`HTTP/1.1 404 Not Found\r\n\r\n`);
      }
    }
    else if(strArr[0] === 'POST'){
      if(param === 'files'){
        const args = process.argv.slice(2);
        const [___, absPath] = args;
        const path = strArr[1].split("/")[2];
        const filePath = absPath  + path;

        const body = req.split("\r\n\r\n")[1];
        try{
          fs.writeFileSync(filePath, body);
          changeResponse(`HTTP/1.1 201 Created\r\n\r\n`);
        }catch(error){
          changeResponse(`HTTP/1.1 500 Internal Server Error\r\n\r\n`);
        }
      }
    }
    socket.end();
    
  })
});

server.listen(4221, "localhost");
