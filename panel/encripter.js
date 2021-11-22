let Fs = require('fs');
let Path = require('path');
require("./md5_util")

/**ArrayBuffer加密解密 */
class EncriptTool{
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
    
    encodeArrayBuffer(arrbuf,sign=this.encriptSign,key=this.encriptKey) {
        if(this.checkIsEncripted(arrbuf,sign)){
            return
        }
        let signBuf = new Uint8Array(this.strToBytes(sign));
        let keyBytes = this.strToBytes(key)
        let buffer = new Uint8Array(arrbuf);
        
        let _outArrBuf = new ArrayBuffer(signBuf.length+buffer.length)
        let outBuffer = new Uint8Array(_outArrBuf)
        for(let i=0;i<signBuf.length;i++){
            outBuffer[i] = signBuf[i]
        }
        let idx = 0;
    
        for(let i=0;i<buffer.length;i++){
            let b = buffer[i];
            let eb = b^keyBytes[idx]
            if(++idx>=keyBytes.length){
                idx = 0
            }
            outBuffer[signBuf.length+i] = eb
        }
        
        return outBuffer;
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

/**构建类型 */
var BuildTypeEnum = {
    web_desktop: 0,
    web_mobile: 1,
    jsb_link: 2,
};


module.exports = class Tools{
    buildType = BuildTypeEnum.web_desktop;
    /**构建目录 */
    buildFloderPath = "";
    /**计数 */
    encriptFinishNum = 0;
    /**加密后缀名排除列表 */
    encript_ignore_extList = ["mp3","ogg","wav"];
    /**是否要混淆文件名 */
    needMixFilename = true;
    /**名称混淆后缀名排除列表 */
    changeName_ignore_extList = ["js","jsc"];

    _encriptTool = new EncriptTool();
    constructor({buildType,buildFloderPath,encriptKey,encriptSign,needMixFilename=true,nameMixSign=""}){
        this.buildType = buildType;
        this.buildFloderPath = buildFloderPath;
        this.needMixFilename = needMixFilename;
        this.nameMixSign = nameMixSign;

        this._encriptTool.setKeySign(encriptKey,encriptSign);
        if(this.buildType==BuildTypeEnum.web_desktop||this.buildType==BuildTypeEnum.web_mobile){
            ///web平台，只加密文本、图片
            this.encript_ignore_extList = [
                "js","jsc",
                "mp3","ogg","wav","m4a",
                "font","eot","ttf","woff","svg","ttc",
                "mp4","avi","mov","mpg","mpeg","rm","rmvb"
            ];
        }else if(this.buildType==BuildTypeEnum.jsb_link){
            ///jsb
            this.encript_ignore_extList = [
                "mp3","ogg","wav","m4a",
            ];
        }


    }

    startBuild(){
        let assetsPath = Path.join(this.buildFloderPath,"assets")
        this.encriptDir_(assetsPath);
        if(this.buildType==BuildTypeEnum.jsb_link){
            require("./apply_jsb")({
                _changeName_ignore_extList:this.changeName_ignore_extList,
                _buildFloderPath:this.buildFloderPath,
                _encriptSign:this._encriptTool.encriptSign,
                _encriptKey:this._encriptTool.encriptKey,
                _needMixFilename:this.needMixFilename,
                _nameMixSign:this.nameMixSign
            });
            let jsb_adapterPath = Path.join(this.buildFloderPath,"jsb-adapter")
            let srcPath = Path.join(this.buildFloderPath,"src")
            let mainJsPath = Path.join(this.buildFloderPath,"main.js")
            this.encriptDir_(jsb_adapterPath)
            this.encriptDir_(srcPath)
            this.encodeFile_(mainJsPath)
        }else if(this.buildType==BuildTypeEnum.web_desktop||this.buildType==BuildTypeEnum.web_mobile){
            // Editor.log("--------加密web")
            require("./apply_web")({
                _buildFloderPath:this.buildFloderPath,
                _encriptSign:this._encriptTool.encriptSign,
                _encriptKey:this._encriptTool.encriptKey,
                _needMixFilename:this.needMixFilename,
                _nameMixSign:this.nameMixSign,
            });
        }
    }

    changeName_(filePath) {
        if(!this.needMixFilename){
            return filePath
        }
        let ext = Path.extname(filePath);
        if(this.changeName_ignore_extList.indexOf(ext.slice(1))>=0){
            return filePath;
        }
        let name = Path.basename(filePath);//文件名
        let ret = filePath;

        if(name[8]=="-"&&name[13]=="-"&&name[18]=="-"&&name[23]=="-"){
            let md5 = hyz.str_to_md5(name+this.nameMixSign)
            let arr = [8,13,18,23]
            for(let i = arr.length-1;i>=0;i--){
            let idx = arr[i];
            md5 = md5.slice(0, idx) + "-" + md5.slice(idx);
            }
            md5+=ext;

            ret = ret.replace(name.slice(0,2)+"/"+name,md5.slice(0,2)+"/"+md5);
            ret = ret.replace(name.slice(0,2)+"\\"+name,md5.slice(0,2)+"\\"+md5);
            let dir = Path.dirname(ret);

            if(!Fs.existsSync(dir)){
              Fs.mkdirSync(dir)
            }
        }
        // Editor.log("--------改名",this.nameMixSign||"nil",filePath,"==>>",ret)
        return ret;
    }

    /**加密文件夹 */
    encriptDir_(dirName){
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
                this.encriptDir_(filePath);
            } else {
                this.encodeFile_(filePath)
            }
        });
    }

    /**加密文件 */
    encodeFile_(filePath) {
        let ext = Path.extname(filePath);
        if(this.encript_ignore_extList.indexOf(ext.slice(1))>=0){
            return;
        }
        
        let newPath = this.changeName_(filePath)
        // Editor.log("-------加密",filePath,newPath);
        let inbuffer = Fs.readFileSync(filePath);

        if(this._encriptTool.checkIsEncripted(inbuffer)){
            // Editor.log("已经加密过",filePath)
            return
        }
        
        let outBuffer = this._encriptTool.encodeArrayBuffer(inbuffer)
        Fs.unlinkSync(filePath)
        Fs.writeFileSync(newPath,outBuffer)
        this.encriptFinishNum = this.encriptFinishNum + 1
    }
}