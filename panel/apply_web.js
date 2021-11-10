let Fs = require('fs');
let Path = require('path');

let web_main_insert_str;
let web_download_img;
let web_download_arrayBuffer;
let web_download_text;
let web_download_json;

////>>>>>>>>>>>>>>>web端修改main.js
{
web_main_insert_str = `if (!window.jsb) {///tag

/**ArrayBuffer加密解密 */
class DecriptTool{
    constructor(encriptKey,encriptSign){
        this.setKeySign(encriptKey,encriptSign);
    }

    encriptSign = "";
    encriptKey = "";
    setKeySign(encriptKey,encriptSign){
        this.encriptKey = encriptKey;
        this.encriptSign = encriptSign;
    }

    strToBytes(str){
        let size = str.length;
        let result = [];
        for(let i=0;i<size;i++){
            result.push(str.charCodeAt(i));
        }
        return result;
    }
    
    checkIsEncripted(arrbuf,sign=this.encriptSign) {
        if(!sign){
            return false;
        }
        
        let signBuf = new Uint8Array(this.strToBytes(sign));
        let buffer = new Uint8Array(arrbuf);
        for(let i=0;i<signBuf.length;i++){
            if(buffer[i]!=signBuf[i]){
                return false;
            }
        }
        return true
    }
    
    decodeArrayBuffer(arrbuf,sign=this.encriptSign,key=this.encriptKey){
        if(!this.checkIsEncripted(arrbuf,sign)){
            return arrbuf;
        }
        let signBuf = new Uint8Array(this.strToBytes(sign));
        let keyBytes = this.strToBytes(key);
        let buffer = new Uint8Array(arrbuf);
    
        let size = buffer.length-signBuf.length;
        let _outArrBuf = new ArrayBuffer(size)
        let outBuffer = new Uint8Array(_outArrBuf)
        let idx = 0;
        for(let i=0;i<size;i++){
            let b = buffer[signBuf.length+i];
            let db = b^keyBytes[idx]
            if(++idx>=keyBytes.length){
                idx = 0
            }
            outBuffer[i] = db;
        }
    
        return outBuffer;
    }
}

function loadScript (moduleName, cb) {
    function scriptLoaded () {
        document.body.removeChild(domScript);
        domScript.removeEventListener('load', scriptLoaded, false);
        cb && cb();
    };
    var domScript = document.createElement('script');
    domScript.async = true;
    domScript.src = moduleName;
    domScript.addEventListener('load', scriptLoaded, false);
    document.body.appendChild(domScript);
}

loadScript("assets/md5_util.js")

window.hyz = window.hyz || {};
let hyz = window.hyz;

hyz._decriptTool = new DecriptTool("tempEncriptKey","tempEncriptSign");

hyz.arrayBuffer2Text = function (buffer,onComplete) {
    var b = new Blob([buffer]);
    var r = new FileReader();
    r.readAsText(b, 'utf-8');
    r.onload = function (){
        onComplete&&onComplete(null,r.result)
    }
    r.onerror = function (e) {
        onComplete&&onComplete(r.error,r.result)
    }
}

hyz.arrayBufferToBase64Img = function(buffer){
    const str = String.fromCharCode(...new Uint8Array(buffer));
    return window.btoa(str);
}

hyz.imgTypes = {
    "png":"image/png",
    "jpg":"image/jpg",
    "jpeg":"image/jpeg",
}

}`

web_download_img = `///修改
var downloadImage = function downloadImage(url, options, onComplete) {
    downloadArrayBuffer(url,options,function(err, data){
    if(err){
        onComplete&&onComplete(null,data);
        return;
    }
    let index = url.lastIndexOf(".");
    let suffix = url.substr(index+1);
    let typeStr = hyz.imgTypes[suffix]||hyz.imgTypes["png"]

    if(cc.sys.capabilities.imageBitmap){
        let blob = new Blob([data],{type:typeStr})
        onComplete&&onComplete(null,blob);
        cc.log(blob)
    }else{
        let base64code = hyz.arrayBufferToBase64Img(data);
        base64code = %s
        downloadDomImage(base64code,options,onComplete)
    }
    })
};`.replace("%s","`data:${typeStr};base64,${base64code}`")

web_download_arrayBuffer = `///修改
var downloadArrayBuffer = function downloadArrayBuffer(url, options, onComplete) {
    options.responseType = "arraybuffer";
    downloadFile(url, options, options.onFileProgress, function (err,data) {
        if(!err){
            ///解密
            data = hyz._decriptTool.decodeArrayBuffer(data);
        }
        onComplete&&onComplete(err,data)
    });
};`
web_download_arrayBuffer = `function _getRealPath(path) {
	let excludeChangeNameList = [".mp3",".ogg",".wav",".js",".jsc",]
	if(path.indexOf("assets")!=0){
		return path
	}
  if(!needMixFilename){//tag
    return path;
  }
	for(let ext of excludeChangeNameList){
	  if(path.endsWith(ext)){
		  return path
	  }
	}
	var ext = path.substr(path.lastIndexOf("."));
	var arr = path.split('/');
	let name = arr[arr.length-1];
	let realPath = path;

	if(name[8]=="-"&&name[13]=="-"&&name[18]=="-"&&name[23]=="-"){
		let md5 = hyz.str_to_md5(name+'tag')
		let arr2 = [8,13,18,23]
		for(let i = arr2.length-1;i>=0;i--){
		  let idx = arr2[i];
		  md5 = md5.slice(0, idx) + "-" + md5.slice(idx);
		}
		md5+=ext;
	
	  realPath = path.replace(name,md5);
	  realPath = realPath.replace("/"+name.slice(0,2)+"/","/"+md5.slice(0,2)+"/");
	  realPath = realPath.replace("\\\\"+name.slice(0,2)+"\\\\","\\\\"+md5.slice(0,2)+"\\\\");
	}

	return realPath
};

 ///修改
var downloadArrayBuffer = function downloadArrayBuffer(url, options, onComplete) {
    options.responseType = "arraybuffer";
    url = _getRealPath(url)
    downloadFile(url, options, options.onFileProgress, function (err,data) {
        if(!err){
            ///解密
            data = hyz._decriptTool.decodeArrayBuffer(data);
        }
        onComplete&&onComplete(err,data)
    });
};`

web_download_text = `///修改
var downloadText = function downloadText (url, options, onComplete) {
    downloadArrayBuffer(url,options,function (err,data) {
    if(err){
        onComplete&&onComplete(err,data)
    }else{
        ///转化成Text
        hyz.arrayBuffer2Text(data,function(err,text) {
        if(err){
            onComplete&&onComplete(err,text)
        }else{
            onComplete&&onComplete(null,text)
        }
        })
    }
    })
};`

web_download_json = `///修改
var downloadJson = function downloadJson(url, options, onComplete) {
    downloadText(url,options,function (err,data) {
    if(err){
        onComplete&&onComplete(err,data)
        return;
    }
    if (!err && typeof data === 'string') {
        try {
            data = JSON.parse(data);
        }
        catch (e) {
            err = e;
        }
    }
    onComplete && onComplete(err, data);
    })
};`
}

function strToBytes(str){
    let size = str.length;
    let result = [];
    for(let i=0;i<size;i++){
        result.push(str.charCodeAt(i));
    }
    return result;
  }
  
  function checkIsEncripted(filePath) {
    if(!encriptSign){
        return false;
    }
    let arrbuf = Fs.readFileSync(filePath);
  
    let signBuf = new Uint8Array(strToBytes(encriptSign));
    let buffer = new Uint8Array(arrbuf);
    for(let i=0;i<signBuf.length;i++){
        if(buffer[i]!=signBuf[i]){
            return false;
        }
    }
    return true
  }

let buildFloderPath = null;
let encriptSign = "";
let encriptKey = "";
let needMixFilename = "";
let nameMixSign = "";

function copyHelper() {
    let fromPath = Editor.url("packages://hyz-encript/panel/md5_util.js","utf-8");
    let toPath = Path.join(buildFloderPath,"assets","md5_util.js");
    Fs.copyFile(fromPath,toPath,function (err) {
        if(err){
            Editor.error("复制md5_util.js出错")
        }
    });
    
}

/**修改MainJs */
function modifyMainJs() {
    let mainJsPath = Path.join(buildFloderPath,"main.js")
    let keyLine = `hyz._decriptTool = new DecriptTool("${encriptKey}","${encriptSign}");`
    web_main_insert_str = web_main_insert_str.replace('hyz._decriptTool = new DecriptTool("tempEncriptKey","tempEncriptSign");',keyLine)

    let mainStr = Fs.readFileSync(mainJsPath,"utf-8");
    if(mainStr.indexOf(keyLine)<0){
        let tagStr = 'if (!window.jsb) {///tag'
        if(mainStr.indexOf(tagStr)<0){
            mainStr = mainStr + web_main_insert_str;
        }else{
            mainStr = mainStr.split(tagStr)[0]
        }
        
        Fs.writeFileSync(mainJsPath,mainStr);
    }
}

/**修改cocos2d-js替换各种下载函数 */
function modifyCocos2d_js() {
    Editor.log("-----modifyCocos2d_js")
    let cocos2dJsPath = Path.join(buildFloderPath,"cocos2d-js.js")
    let jsStr = Fs.readFileSync(cocos2dJsPath,"utf-8");
    if(jsStr.indexOf('hyz._decriptTool.decodeArrayBuffer')>=0){
        return;
    }
    let reg = /var downloadImage = function downloadImage\(url, options, onComplete\) \{[\s\S]*var downloadBlob/g
    let newStr = jsStr.replace(reg,web_download_img+"\n var downloadBlob")

    reg = /var downloadJson = function downloadJson\(url, options, onComplete\) \{[\s\S]*var downloadArrayBuffer/g
    newStr = newStr.replace(reg,web_download_json+"\n var downloadArrayBuffer")

    web_download_arrayBuffer = web_download_arrayBuffer.replace("if(!needMixFilename){//tag",`if(!${needMixFilename}){//tag`)
    web_download_arrayBuffer = web_download_arrayBuffer.replace("let md5 = hyz.str_to_md5(name+'tag')",`let md5 = hyz.str_to_md5(name+"${nameMixSign}")`)
    reg = /var downloadArrayBuffer = function downloadArrayBuffer\(url, options, onComplete\) \{[\s\S]*var downloadText/g
    newStr = newStr.replace(reg,web_download_arrayBuffer+"\n var downloadText")

    reg = /var downloadText = function downloadText\(url, options, onComplete\) \{[\s\S]*var downloadVideo/g
    newStr = newStr.replace(reg,web_download_text+"\n var downloadVideo");

    Fs.writeFileSync(cocos2dJsPath,newStr);
}

module.exports = function applyWeb({_buildFloderPath,_encriptSign,_encriptKey,_needMixFilename,_nameMixSign}) {
    buildFloderPath = _buildFloderPath
    encriptSign = _encriptSign
    encriptKey = _encriptKey
    needMixFilename = _needMixFilename
    nameMixSign = _nameMixSign
    
    copyHelper();
    modifyMainJs();
    modifyCocos2d_js();
}