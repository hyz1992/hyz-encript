let Fs = require('fs');
let Path = require('path');

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

    fromPath = Editor.url("packages://hyz-encript/panel/web_downloader.js","utf-8");
    toPath = Path.join(buildFloderPath,"assets","web_downloader.js");
    Fs.copyFile(fromPath,toPath,function (err) {
        if(err){
            Editor.error("复制web_downloader.js出错")
        }
    });
    
}

let _searthDir = function(dirName,callback){
    if (!Fs.existsSync(dirName)) {
        Editor.log(`${dirName} 目录不存在`)
        return
    }
    let files = Fs.readdirSync(dirName);
    files.forEach((fileName) => {
        let filePath = Path.join(dirName, fileName.toString());
        let stat = Fs.statSync(filePath);
        if (stat.isDirectory()) {
            _searthDir(filePath,callback);
        } else {
            callback(fileName,filePath)
        }
    });
}


/**修改index.html */
function copyHtml() {
    let mainJsName = "main.js"
    let settingJsName = "settings.js"
    let physicsJsName = "physics-min.js"
    let cocos2dJsName = "cocos2d-js-min.js"
    let styleDesktopName = "style-desktop.css"
    let styleMobileName = "style-mobile.css"
    let splashName = "splash.png"
    let icoName = "favicon.ico"
    _searthDir(buildFloderPath,function (fileName,path) {
        if(/main\.([0-9 a-z]|\.)*js/.test(fileName)){
            mainJsName = fileName;
        }else if(/physics(-min)?\.([0-9 a-z]|\.)*js/.test(fileName)){
            physicsJsName = fileName;
        }else if(/settings\.([0-9 a-z]|\.)*js/.test(fileName)){
            settingJsName = fileName;
        }else if(/cocos2d-js(-min)?\.([0-9 a-z]|\.)*js/.test(fileName)){
            cocos2dJsName = fileName;
        }else if(/style-desktop\.([0-9 a-z]|\.)*css/.test(fileName)){
            styleDesktopName = fileName;
        }else if(/style-mobile\.([0-9 a-z]|\.)*css/.test(fileName)){
            styleMobileName = fileName;
        }else if(/favicon\.([0-9 a-z]|\.)*ico/.test(fileName)){
            icoName = fileName;
        }else if(/splash\.([0-9 a-z]|\.)*png/.test(fileName)){
            splashName = fileName;
        }
    })

    let fromPath = Editor.url("packages://hyz-encript/panel/template_web_index.html","utf-8");
    let toPath = Path.join(buildFloderPath,"index.html");

    let htmlStr = Fs.readFileSync(fromPath,"utf-8");
    htmlStr = htmlStr.replace('hyz.register_decripted_downloader(tmp_encriptSign,tmp_encriptKey,tmp_needMixFilename,tmp_nameMixSign);',`hyz.register_decripted_downloader('${encriptSign}','${encriptKey}',${needMixFilename},'${nameMixSign}');`)
    htmlStr = htmlStr.replace("main.js",mainJsName)
    htmlStr = htmlStr.replace("settings.js",settingJsName)
    if(physicsJsName.includes("min")){
        htmlStr = htmlStr.replace("physics-min.js",physicsJsName)
    }else{
        htmlStr = htmlStr.replace("physics.js",physicsJsName)
    }
    if(cocos2dJsName.includes("min")){
        htmlStr = htmlStr.replace("cocos2d-js-min.js",cocos2dJsName)
    }else{
        htmlStr = htmlStr.replace("cocos2d-js.js",cocos2dJsName)
    }
    
    
    htmlStr = htmlStr.replace("style-desktop.css",styleDesktopName)
    htmlStr = htmlStr.replace("favicon.ico",icoName)
    htmlStr = htmlStr.replace("style-mobile.css",styleMobileName)
    htmlStr = htmlStr.replace("splash.png",splashName)
    // Editor.log(htmlStr)
    Fs.writeFileSync(toPath,htmlStr)
}

module.exports = function applyWeb({_buildFloderPath,_encriptSign,_encriptKey,_needMixFilename,_nameMixSign}) {
    buildFloderPath = _buildFloderPath
    encriptSign = _encriptSign
    encriptKey = _encriptKey
    needMixFilename = _needMixFilename
    nameMixSign = _nameMixSign
    
    copyHelper();
    copyHtml();
}