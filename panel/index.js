window = window || {}
window.packageRoot = "packages://hyz-encrypt/";

let Fs = require('fs');
let Os = require('os');
let Path = require('path');
require("./md5_util")

let encodeSign = 'niu2021rich';//文件加密签名
let encodeKey = 'junlizxpwd';//文件加密秘钥
let nameMd5Sign = "";//文件改名时用的签名,每改动一次，文件名全都会变化，热更新要注意

let encript_ignore_extList = [".mp3",".ogg"]
let changeName_ignore_extList = [".js",".jsc"]

let jsb_linkPath = "D:/work/niuniu/build/jsb-link";
let assetsPath = Path.join(jsb_linkPath,"assets")
let jsb_adapterPath = Path.join(jsb_linkPath,"jsb-adapter")
let srcPath = Path.join(jsb_linkPath,"src")
let mainJsPath = Path.join(jsb_linkPath,"main.js")

// panel/index.js, this filename needs to match the one registered in package.json
Editor.Panel.extend({
  // css style for panel
  style: Fs.readFileSync(Editor.url('packages://hyz-encript/panel/index.css', 'utf8')),

  // html template for panel
  template: Fs.readFileSync(Editor.url('packages://hyz-encript/panel/index.html', 'utf8')),

  // element and variable binding
  $: {
    btn: '#btn',
    input_buildFloder: "#input_buildFloder",
    input_encriptKey: "#input_encriptKey",
    input_excludeList: "#input_excludeList"
  },

  // method executed when template and styles are successfully loaded and initialized
  ready () {
    Editor.log('--------插件准备好');
    Editor.log("jsb_linkPath",jsb_linkPath,assetsPath)
    this.$btn.addEventListener('confirm', this.oDoEncrypt.bind(this));
  },

  // register your ipc messages here
  messages: {
    'hyz-encript:hello' (event) {
      Editor.log('--------111111');
      this.$input_encriptKey.innerText = 'Hello!';
    },

  },

  oDoEncrypt(){
    let buildFloder = this.$input_buildFloder.value;
    let encriptKey = this.$input_encriptKey.value;
    let excludeList = this.$input_excludeList.value;
    Editor.log('--------222',buildFloder,encriptKey,excludeList);
    encriptDir(assetsPath)
  }
});

function strToBytes(str){
    let result = [];
    for(let i=0;i<str.length;i++){
        result.push(str[i].charCodeAt());
    }   
    return result;
}

function changeName(filePath) {
  let ext = Path.extname(filePath);
  if(changeName_ignore_extList.indexOf(ext)>=0){
    return filePath;
  }
  let name = Path.basename(filePath);//文件名
  let ret = filePath.replace(name,str_to_md5(name+nameMd5Sign));
  return ret;
}

///加密
function encodeFile(filePath) {
  let ext = Path.extname(filePath);
  if(encript_ignore_extList.indexOf(ext)>=0){
    Editor.log("已经加密过")
    return;
  }
  let newPath = changeName(filePath)
  
  if(checkIsEncripted(filePath)){
    return
  }
  Editor.log("-------",ext,Path.basename(filePath),newPath);
  let sign = Buffer.from(encodeSign)
  let key = strToBytes(encodeKey)
  let buffer = Buffer.from(Fs.readFileSync(filePath));
  
  let outBuffer = Buffer.alloc(sign.length+buffer.length)
  for(let i=0;i<sign.length;i++){
    outBuffer[i] = sign[i]
  }
  let idx = 0;

  for(let i=0;i<buffer.length;i++){
    let b = buffer[i];
    let eb = b^key[idx]
    if(++idx>=key.length){
        idx = 0
    }
    outBuffer[sign.length+i] = eb
  }
  Fs.unlinkSync(filePath)
  Fs.writeFileSync(newPath,outBuffer)
}

function checkIsEncripted(filePath) {
  let sign = Buffer.from(encodeSign)
  let buffer = Buffer.from(Fs.readFileSync(filePath));
  for(let i=0;i<sign.length;i++){
    if(buffer[i]!=sign[i]){
      return false;
    }
  }
  return true
}

//解密
function decodeFile(filePath){
  if(!checkIsEncripted(filePath)){
    return
  }
  let sign = Buffer.from(encodeSign)
  let key = strToBytes(encodeKey)
  let buffer = Buffer.from(Fs.readFileSync(filePath));

  let size = buffer.length-sign.length;
  let outBuffer = Buffer.alloc(size);
  let idx = 0;
  for(let i=0;i<size;i++){
    let b = buffer[sign.length+i];
    let db = b^key[idx]
    if(++idx>=key.length){
        idx = 0
    }
    outBuffer[i] = db;
  }

  Fs.writeFileSync(filePath,outBuffer);
}

function encriptDir(dirName) {
  if (!Fs.existsSync(dirName)) {
      throw new Error(`${dirName} 目录不存在`);
  }
  let files = Fs.readdirSync(dirName);
  files.forEach((fileName) => {
      // Editor.log("-----aaaa",fileName)
      let filePath = Path.join(dirName, fileName.toString());
      let stat = Fs.statSync(filePath);
      if (stat.isDirectory()) {
          encriptDir(filePath);
      } else {
          encodeFile(filePath)
      }
  });
}