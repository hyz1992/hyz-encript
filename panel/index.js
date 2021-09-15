
let Fs = require('fs');
let Os = require('os');
let Path = require('path');
require("./helper")

let encriptSign = "";//文件加密签名
let encriptKey = "";//文件加密秘钥
let nameMd5Sign = "";//文件改名时用的签名,每改动一次，文件名全都会变化，热更新要注意

let encript_ignore_extList = ["mp3","ogg","wav"]
let changeName_ignore_extList = ["js","jsc"].map(function (ext) {
  return "."+ext
})

let jsb_linkPath = "";

let recordPath = "";

let encriptFinishNum = 0;

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
    input_encriptSign: "#input_encriptSign",
    input_excludeList: "#input_excludeList",
    input_changeNameSign: "#input_changeNameSign",
  },

  // method executed when template and styles are successfully loaded and initialized
  ready () {
    recordPath = Editor.url('packages://hyz-encript/panel/record.json', 'utf8');
    // Editor.log('--------插件准备好',recordPath);
    if(Fs.existsSync(recordPath)){
      let record = JSON.parse(Fs.readFileSync(recordPath));
      if(record.jsb_linkPath){
        this.$input_buildFloder.value = record.jsb_linkPath;
      }
      if(record.encriptSign){
        this.$input_encriptSign.value = record.encriptSign;
      }
      if(record.encriptKey){
        this.$input_encriptKey.value = record.encriptKey;
      }
      if(record.nameMd5Sign){
        this.$input_changeNameSign.value = record.nameMd5Sign;
      }
      if(record.encript_ignore_extList){
        this.$input_excludeList.value = record.encript_ignore_extList;
      }
      // Editor.log("有记录",record)
    }else{
      assetsPath = Editor.url('db://assets','utf8');
      jsb_linkPath = Path.join(assetsPath,"../build/jsb-link")
      this.$input_buildFloder.value = jsb_linkPath;

      this.$input_encriptSign.value = encriptSign;
      this.$input_encriptKey.value = encriptKey;
      this.$input_changeNameSign.value = nameMd5Sign;
      this.$input_excludeList.value = encript_ignore_extList;
    }
        
    this.$btn.addEventListener('confirm', this.oDoEncrypt.bind(this));
  },

  // register your ipc messages here
  messages: {
    
  },

  oDoEncrypt(){
    jsb_linkPath = this.$input_buildFloder.value;
    encriptSign = this.$input_encriptSign.value;
    encriptKey = this.$input_encriptKey.value;
    let extList_1 = this.$input_excludeList.value.split(",");
    encript_ignore_extList = extList_1.map(function(ext) {
      return "."+ext
    })
    nameMd5Sign = this.$input_changeNameSign.value;
    if(!Fs.existsSync(jsb_linkPath)){
      Editor.error("必须输入有效路径");
      return;
    }
    if(encriptSign==""||encriptKey==""){
      Editor.error("加密签名或者秘钥不可为空");
      return;
    }
    let assetsPath = Path.join(jsb_linkPath,"assets")
    let jsb_adapterPath = Path.join(jsb_linkPath,"jsb-adapter")
    let srcPath = Path.join(jsb_linkPath,"src")
    let mainJsPath = Path.join(jsb_linkPath,"main.js")

    Editor.log("hyz-encript 加密开始",encript_ignore_extList,"nameMd5Sign",nameMd5Sign)

    encriptFinishNum = 0;
    
    copyHelper();
    insertToJsEngineJs();
    insertToFileUtils();
    encriptDir(assetsPath)
    encriptDir(jsb_adapterPath)
    encriptDir(srcPath)
    encodeFile(mainJsPath)

    let record = {
      jsb_linkPath:jsb_linkPath,
      encriptSign:encriptSign,
      encriptKey:encriptKey,
      encript_ignore_extList:extList_1,
      nameMd5Sign:nameMd5Sign,
    }
    Fs.writeFileSync(recordPath,JSON.stringify(record))

    Editor.log(`hyz-encript 加密完成,共${encriptFinishNum}项`)
  }
});

function copyHelper() {
  let jsb_adapterPath = Path.join(jsb_linkPath,"jsb-adapter");
  let fromPath = Editor.url("packages://hyz-encript/panel/helper.js","utf-8");
  let toPath = Path.join(jsb_adapterPath,"helper.js");
  Fs.copyFile(fromPath,toPath,function (err) {
    if(err){
      Editor.error("复制helper.js出错")
    }
  });
  

  let mainJsPath = Path.join(jsb_linkPath,"main.js")
  if(!checkIsEncripted(mainJsPath)){
    let oldStr = Fs.readFileSync(mainJsPath,"utf-8");
    if(oldStr.indexOf("windwo.helper =  require('helper')")<0){
      let newStr = oldStr.replace("var isRuntime = (typeof loadRuntime === 'function');","var isRuntime = (typeof loadRuntime === 'function');\n\trequire('jsb-adapter/helper.js')")
      Fs.writeFileSync(mainJsPath,newStr);
    }
  }
  
}

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
  let ret = filePath.replace(name,helper.str_to_md5(name+nameMd5Sign));

  return ret;
}

///加密
function encodeFile(filePath) {
  let ext = Path.extname(filePath);
  if(encript_ignore_extList.indexOf(ext)>=0){
    return;
  }
  
  if(checkIsEncripted(filePath)){
    // Editor.log("已经加密过",filePath)
    return
  }
  let newPath = changeName(filePath)
  // Editor.log("-------加密",filePath,newPath);
  let sign = Buffer.from(encriptSign)
  let key = strToBytes(encriptKey)
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
  encriptFinishNum = encriptFinishNum + 1
}

function checkIsEncripted(filePath) {
  let sign = Buffer.from(encriptSign)
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
  let sign = Buffer.from(encriptSign)
  let key = strToBytes(encriptKey)
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
      Editor.log(`${dirName} 目录不存在`)
      return
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

/**
 * 将jsb-engine.js插入代码，主要是修改transformUrl，
 * 将assets目录下本地文件名，映射到改名后的真实名称
 * @returns 
 */
function insertToJsEngineJs() {
  let jsb_adapterPath = Path.join(jsb_linkPath,"jsb-adapter");
  let jsEnjinePath = Path.join(jsb_adapterPath,"jsb-engine.js");

  if(checkIsEncripted(jsEnjinePath)){
    return
  }
  let oldStr = Fs.readFileSync(jsEnjinePath,'utf8');
  
  if(oldStr.indexOf("_getRealPath")>=0){
    return;
  }

  let arr_1 = oldStr.split("function transformUrl(url, options) {");
  let arr_2 = oldStr.split("function doNothing(content, options, onComplete) {");

  let arr = []
  arr.push(...encript_ignore_extList)
  arr.push(...changeName_ignore_extList)
  let fillStr = "";
  for(let ext of arr){
    if(fillStr.indexOf(ext)<0){
      fillStr+=`"${ext}",`
    }
  }

  let str = helper.engine_str.replace(`let excludeChangeNameList = [".js",".jsc"];`,`let excludeChangeNameList = [${fillStr}]`)
  str = str.replace("let realName = helper.str_to_md5(name)",`let realName = helper.str_to_md5(name+"${nameMd5Sign}")`)
  let newStr = arr_1[0]+str+arr_2[1];
  Fs.writeFileSync(jsEnjinePath,newStr);
}

function insertToFileUtils() {
  let enginePath = Editor.url("unpack://engine")
  let cocosPlatformPath = Path.join(enginePath,"../cocos2d-x/cocos/platform")
  Editor.log("cocosPlatformPath",cocosPlatformPath)

  let CCFileUtils_h = Path.join(cocosPlatformPath,"CCFileUtils.h")
  let CCFileUtils_cpp = Path.join(cocosPlatformPath,"CCFileUtils.cpp")

  do{
    let hStr = Fs.readFileSync(CCFileUtils_h,'utf8');
    if(hStr.indexOf("setDecriptKeyAndSign")>=0){
      break;
    }
    let arr_1 = hStr.split("virtual void valueVectorCompact(ValueVector& valueVector);");
    let arr_2 = hStr.split("#endif    // __CC_FILEUTILS_H__");

    let newStr = arr_1[0]+helper.h_str+arr_2[1];
    if(!Fs.existsSync(CCFileUtils_h+".bak")){
      Fs.copyFile(CCFileUtils_h,CCFileUtils_h+".bak",function (err) {})
    }
    
    /**直接写会写失败，曲折一下 */
    // Fs.writeFileSync(CCFileUtils_h,newStr);
    Fs.unlinkSync(CCFileUtils_h)
    Fs.writeFileSync(CCFileUtils_h+".temp",newStr);
    Fs.copyFile(CCFileUtils_h+".temp",CCFileUtils_h,function (err) {if(err){Editor.log(err)}})
    Fs.unlinkSync(CCFileUtils_h+".temp")
  }while(false)

  do{
    let keyLine = `setDecriptKeyAndSign("${encriptSign}","${encriptKey}");`
    let cppStr = Fs.readFileSync(CCFileUtils_cpp,'utf8');
    if(cppStr.indexOf(keyLine)>=0){
      break;
    }
    let arr_1 = cppStr.split("bool FileUtils::init()")
    let arr_2 = cppStr.split("FileUtils::Status FileUtils::getContents(const std::string& filename, ResizableBuffer* buffer)")

    helper.cpp_str = helper.cpp_str.replace('setDecriptKeyAndSign("tempEncriptSign","tempEncriptKey");',keyLine)
    let newStr = arr_1[0]+helper.cpp_str+arr_2[1];
    if(!Fs.existsSync(CCFileUtils_cpp+".bak")){
      Fs.copyFile(CCFileUtils_cpp,CCFileUtils_cpp+".bak",function (err) {})
    }

    /**直接写会写失败，曲折一下 */
    // Fs.writeFileSync(CCFileUtils_cpp,newStr);
    Fs.unlinkSync(CCFileUtils_cpp)
    Fs.writeFileSync(CCFileUtils_cpp+".temp",newStr);
    Fs.copyFile(CCFileUtils_cpp+".temp",CCFileUtils_cpp,function (err) {if(err){Editor.log(err)}})
    Fs.unlinkSync(CCFileUtils_cpp+".temp")
  }while(false)
}