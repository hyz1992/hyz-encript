let Fs = require('fs');
let Path = require('path');

let cpp_str;
let h_str;
let engine_str;
{
    cpp_str = `bool FileUtils::init()
{
	_searchPathArray.push_back(_defaultResRootPath);
	_searchResolutionsOrderArray.push_back("");
	setDecriptKeyAndSign("tempEncriptSign","tempEncriptKey");
	return true;
}

void FileUtils::setDecriptKeyAndSign(std::string sign, std::string key)
{
	this->decriptSign = sign;
	this->decriptKey = key;
}

void FileUtils::purgeCachedEntries()
{
	_fullPathCache.clear();
}

std::string FileUtils::getStringFromFile(const std::string& filename)
{
	std::string s;
	getContents(filename, &s);
	if (s.length() > decriptSign.size() && s.find(decriptSign.c_str()) == 0) {
		s.erase(0, decriptSign.size());
		int kindex = 0;
		for (int i = 0; i < s.length(); i++) {
			if (kindex >= decriptKey.size()) kindex = 0;
			s[i] ^= decriptKey[kindex];
			kindex++;
		}
	}
	return s;
}

Data FileUtils::getDataFromFile(const std::string& filename)
{
	Data d;
	getContents(filename, &d);
	if (d.getSize() > 4) {
		unsigned char* bytes = d.getBytes();
		if (memcmp(bytes, decriptSign.c_str(), decriptSign.size()) == 0) {
			ssize_t realSize = d.getSize() - decriptSign.size();
			unsigned char* data = (unsigned char*)calloc(1, realSize);
			memcpy(data, bytes + decriptSign.size(), realSize);
			int kindex = 0;
			for (int i = 0; i < realSize; i++) {
				if (kindex >= decriptKey.size()) kindex = 0;
				data[i] ^= decriptKey[kindex];
				kindex++;
			}
			d.fastSet(data, realSize);
		}
	}
	return d;
}


FileUtils::Status FileUtils::getContents(const std::string& filename, ResizableBuffer* buffer)`

h_str = `virtual void valueVectorCompact(ValueVector& valueVector);

	std::string decriptSign = "sign";
	std::string decriptKey = "key";

	public:
	void setDecriptKeyAndSign(std::string sign = "",std::string key = "");
};

// end of support group
/** @} */

NS_CC_END

#endif    // __CC_FILEUTILS_H__`

engine_str = `function _getRealPath(path) {
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


function transformUrl(url, options) {
  var inLocal = false;
  var inCache = false;

  if (REGEX.test(url)) {
	if (options.reload) {
	  return {
		  url: url
	  };
	} else {
	  var cache = cacheManager.getCache(url);

	  if (cache) {
		inCache = true;
		url = cache;
	  }
	}
  } else {
    inLocal = true;
    url = _getRealPath(url)
  }

  return {
    url: url,
    inLocal: inLocal,
    inCache: inCache
  };
}

function doNothing(content, options, onComplete) {`
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
let needMixFilename = true;
let nameMixSign = "";

function copyHelper() {
    let fromPath = Editor.url("packages://hyz-encript/panel/md5_util.js","utf-8");
    let toPath = Path.join(buildFloderPath,"assets","md5_util.js");
    Fs.copyFile(fromPath,toPath,function (err) {
        if(err){
            Editor.error("复制md5_util.js出错")
        }
    });
  
    let mainJsPath = Path.join(buildFloderPath,"main.js")
    if(!checkIsEncripted(mainJsPath)){
        let oldStr = Fs.readFileSync(mainJsPath,"utf-8");
        if(oldStr.indexOf("require('assets/md5_util.js')")<0){
            let newStr = oldStr.replace("var isRuntime = (typeof loadRuntime === 'function');","var isRuntime = (typeof loadRuntime === 'function');\n\trequire('assets/md5_util.js')")
            Fs.writeFileSync(mainJsPath,newStr);
        }
    }
    
}

/**
 * 将jsb-engine.js插入代码，主要是修改transformUrl，
 * 将assets目录下本地文件名，映射到改名后的真实名称
 * @returns 
 */
 function insertToJsEngineJs() {
    let jsb_adapterPath = Path.join(buildFloderPath,"jsb-adapter");
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
  
    let str = engine_str;
    str = str.replace("if(!needMixFilename){//tag",`if(!${needMixFilename}){//tag`)
    str = str.replace("let md5 = hyz.str_to_md5(name+'tag')",`let md5 = hyz.str_to_md5(name+"${nameMixSign}")`)
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

        let newStr = arr_1[0]+h_str+arr_2[1];
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

        cpp_str = cpp_str.replace('setDecriptKeyAndSign("tempEncriptSign","tempEncriptKey");',keyLine)
        let newStr = arr_1[0]+cpp_str+arr_2[1];
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


module.exports = function applyJsb({_buildFloderPath,_encriptSign,_encriptKey,_needMixFilename,_nameMixSign}) {
    buildFloderPath = _buildFloderPath
    encriptSign = _encriptSign
    encriptKey = _encriptKey
    needMixFilename = _needMixFilename
    nameMixSign = _nameMixSign
    Editor.log("=jsbbb========nameMixSign",nameMixSign)
    copyHelper();
    insertToJsEngineJs();
    insertToFileUtils();
}